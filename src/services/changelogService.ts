import { CHANGELOG_DATA, ReleaseVersion, ChangelogItem, ReleaseMedia, ReleaseSection } from '../data/changelog';

const LOCAL_STORAGE_CACHE_KEY = 'nova_dynamic_changelog_cache_v2';

/**
 * How old the cache must be before a background refresh is worth an API call.
 * `api.github.com` is hit unauthenticated with a 60 req/hr/IP budget that the
 * update checker shares, so the refresh has to be age-gated rather than fired
 * on every mount.
 */
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/** Grace period before the background refresh starts, so it never competes with first paint. */
const BACKGROUND_REFRESH_DELAY_MS = 1000;

/** Window event carrying the result of a completed background refresh. */
const CHANGELOG_REFRESH_EVENT = 'nova-changelog-refreshed';

export interface ChangelogResult {
  releases: ReleaseVersion[];
  isLive: boolean;
}

/** Shape persisted under LOCAL_STORAGE_CACHE_KEY. */
interface CachedChangelog {
  releases: ReleaseVersion[];
  fetchedAt: number;
  /**
   * Whether `releases` came from the live GitHub path. Persisted because the
   * cached array *is* the merged live payload — hard-coding `false` on a cache
   * hit made the "GitHub Live Sync" badge inversely correlated with freshness:
   * it appeared only once the 15-minute age gate let a background refresh land.
   */
  isLive: boolean;
}

/**
 * The one refresh allowed to be in flight per renderer. Concurrent callers
 * share it instead of each opening their own `get-changelog-releases` IPC —
 * the changelog renders once per tab, and the page can mount while a refresh
 * is already running.
 */
let inflightRefresh: Promise<ChangelogResult> | null = null;

/**
 * Pending background-refresh timer, plus the number of attached
 * `subscribeToRefresh` listeners that own it.
 *
 * The timer used to be a free-floating module singleton that any tab's unmount
 * cleared: ChangelogPage renders once per tab in one document, so tab B closing
 * cancelled the refresh tab A was waiting for and A showed a stale list under a
 * "GitHub Live Sync" badge, silently, until it was remounted. It is now armed
 * with the first subscriber and dropped with the last, so it is still shared —
 * one timer, one refresh, no cross-tab cancellation.
 */
let backgroundTimer: ReturnType<typeof setTimeout> | null = null;
let refreshSubscribers = 0;

export async function fetchAutomatedChangelog(forceRefresh = false): Promise<ChangelogResult> {
  // 1. Check local storage cache first if not forcing refresh
  const cached = forceRefresh ? null : readCachedChangelog();

  if (cached) {
    scheduleBackgroundRefresh(cached.fetchedAt);
    return { releases: cached.releases, isLive: cached.isLive };
  }

  // 2. Fetch fresh live releases from Main Process via GitHub API
  return await fetchLiveFromMain(forceRefresh);
}

/** Clear the scheduled-but-not-yet-fired refresh. Only the last listener may do this. */
function cancelPendingRefresh(): void {
  if (backgroundTimer === null) return;
  clearTimeout(backgroundTimer);
  backgroundTimer = null;
}

/**
 * Listen for background refreshes that land after the page has already
 * rendered. Without this the refreshed releases only ever reached
 * localStorage, so the user had to navigate away and back to see them.
 *
 * Attaching also joins the set that owns the background-refresh timer; the
 * returned unsubscribe leaves it, and the timer is cleared only when the last
 * subscriber goes. Returns an unsubscribe function.
 */
export function subscribeToRefresh(listener: (result: ChangelogResult) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ChangelogResult>).detail;
    if (!detail || !Array.isArray(detail.releases) || detail.releases.length === 0) return;
    try {
      listener(detail);
    } catch (_) {}
  };
  window.addEventListener(CHANGELOG_REFRESH_EVENT, handler);

  refreshSubscribers += 1;
  let released = false;
  return () => {
    window.removeEventListener(CHANGELOG_REFRESH_EVENT, handler);
    // A cleanup can run more than once (StrictMode remounts, a retried effect);
    // the count must not go negative and arm a phantom teardown.
    if (released) return;
    released = true;
    refreshSubscribers -= 1;
    if (refreshSubscribers === 0) cancelPendingRefresh();
  };
}

/**
 * Schedule a background refresh, but only if the cache is actually stale and
 * nothing is already scheduled. The gate is the real fix for the rate-limit
 * burn; the in-flight guard in fetchLiveFromMain makes a redundant schedule a
 * no-op rather than a duplicate request.
 */
function scheduleBackgroundRefresh(fetchedAt: number): void {
  if (backgroundTimer !== null || inflightRefresh !== null) return;
  if (fetchedAt > 0 && Date.now() - fetchedAt < REFRESH_INTERVAL_MS) return;

  backgroundTimer = setTimeout(() => {
    backgroundTimer = null;
    void runBackgroundRefresh();
  }, BACKGROUND_REFRESH_DELAY_MS);
}

async function runBackgroundRefresh(): Promise<void> {
  if (inflightRefresh !== null) return;
  try {
    const result = await fetchLiveFromMain(false);
    if (result.isLive) emitRefresh(result);
  } catch (_) {
    // Background refresh is best-effort: the cached copy is already on screen.
  }
}

function emitRefresh(result: ChangelogResult): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent<ChangelogResult>(CHANGELOG_REFRESH_EVENT, { detail: result }));
  } catch (_) {}
}

/**
 * Single-flight wrapper around the main-process fetch. A forced refresh that
 * lands on an in-flight request shares it instead of opening a second one;
 * the data is at most seconds old and the API budget is not.
 */
function fetchLiveFromMain(forceRefresh = false): Promise<ChangelogResult> {
  if (inflightRefresh !== null) return inflightRefresh;

  const run = requestLiveFromMain(forceRefresh).finally(() => {
    if (inflightRefresh === run) inflightRefresh = null;
  });
  inflightRefresh = run;
  return run;
}

async function requestLiveFromMain(forceRefresh: boolean): Promise<ChangelogResult> {
  try {
    const api = (window as any).electronAPI;
    if (api?.getChangelogReleases) {
      const remoteReleases = await api.getChangelogReleases(forceRefresh);
      if (Array.isArray(remoteReleases) && remoteReleases.length > 0) {
        // GitHub's payload is untrusted in exactly the same way a hand-edited
        // cache is, and the sanitiser used to run on the read path only — so
        // the freshest data was the one path that skipped it. ChangelogPage
        // calls `item.text.toLowerCase()` over every change and renders
        // `highlights.slice(1)` as a React child, so one non-string in either
        // field is a white screen that survives every re-render and every
        // keystroke in the search box. Sanitise before the value reaches the
        // cache *and* the caller, so what is persisted is what is rendered.
        const releases = sanitizeReleases(mergeReleases(remoteReleases, CHANGELOG_DATA));
        if (releases.length > 0) {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(
                LOCAL_STORAGE_CACHE_KEY,
                JSON.stringify({ releases, fetchedAt: Date.now(), isLive: true } satisfies CachedChangelog)
              );
            } catch (_) {}
          }
          return { releases, isLive: true };
        }
      }
    }
  } catch (err) {
    console.warn('[ChangelogService] Failed to load remote changelog:', err);
  }

  // 3. Fallback to bundled static data
  return { releases: CHANGELOG_DATA, isLive: false };
}

function readCachedChangelog(): CachedChangelog | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Tolerates the pre-{releases,fetchedAt} layout stored under this same key
    // by an earlier build: a bare array has no `.releases`, so it misses here
    // and is rewritten in the new shape by the next successful fetch.
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.releases)) return null;

    const releases = sanitizeReleases(parsed.releases);
    if (releases.length === 0) return null;

    // A missing or nonsensical timestamp is treated as "infinitely old": it
    // schedules exactly one refresh, which then persists a real timestamp.
    const fetchedAt =
      typeof parsed.fetchedAt === 'number' && Number.isFinite(parsed.fetchedAt) ? parsed.fetchedAt : 0;

    // The cache is only ever written by the live path, so a cache from a build
    // that predates the flag still holds merged GitHub data: an absent or
    // non-boolean flag means "unknown", which is treated as live rather than
    // throwing or claiming the bundled fallback. It self-corrects on the next
    // fetch, which rewrites the envelope with an explicit `isLive`.
    const isLive = typeof parsed.isLive === 'boolean' ? parsed.isLive : true;

    return { releases, fetchedAt, isLive };
  } catch (_) {
    return null;
  }
}

/**
 * Drops cached entries the page could not render. The cache used to be trusted
 * on `Array.isArray(parsed) && parsed.length > 0` alone, but ChangelogPage runs
 * `item.text.toLowerCase()` over every change and `.map()` over `highlights`
 * and `section.points` — so a single malformed cached release threw on every
 * keystroke in the search box, with no way to recover short of clearing it.
 */
function sanitizeReleases(input: unknown[]): ReleaseVersion[] {
  const out: ReleaseVersion[] = [];
  for (const entry of input) {
    const release = sanitizeRelease(entry);
    if (release) out.push(release);
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeRelease(value: unknown): ReleaseVersion | null {
  if (!isPlainObject(value)) return null;
  if (typeof value.version !== 'string' || value.version.trim() === '') return null;
  if (!Array.isArray(value.changes)) return null;

  // Malformed individual changes are dropped rather than the whole release,
  // but a release is only kept when at least one change survives — an entry
  // with no usable text would render as an empty chapter.
  const changes = sanitizeChanges(value.changes);
  if (changes.length === 0) return null;

  const version = value.version;
  const release: ReleaseVersion = {
    version,
    date: typeof value.date === 'string' ? value.date : 'Recent',
    title: typeof value.title === 'string' ? value.title : `Nova Browser v${version}`,
    highlights: Array.isArray(value.highlights)
      ? value.highlights.filter((h): h is string => typeof h === 'string')
      : changes.slice(0, 3).map(c => c.text),
    changes,
  };

  if (typeof value.badge === 'string') release.badge = value.badge;
  if (typeof value.lede === 'string') release.lede = value.lede;

  // Editorial media is bundled-authored and is dropped wholesale when it does
  // not match the shape the renderers assume; the page falls back gracefully.
  const hero = sanitizeMedia(value.hero);
  if (hero) release.hero = hero;

  const sections = sanitizeSections(value.sections);
  if (sections) release.sections = sections;

  return release;
}

function sanitizeChanges(input: unknown[]): ChangelogItem[] {
  const out: ChangelogItem[] = [];
  for (const entry of input) {
    if (!isPlainObject(entry) || typeof entry.text !== 'string' || entry.text === '') continue;
    out.push({
      category: isKnownCategory(entry.category) ? entry.category : 'improvement',
      text: entry.text,
    });
  }
  return out;
}

function isKnownCategory(value: unknown): value is ChangelogItem['category'] {
  return (
    value === 'feature' ||
    value === 'improvement' ||
    value === 'fix' ||
    value === 'security' ||
    value === 'performance'
  );
}

function sanitizeMedia(value: unknown): ReleaseMedia | undefined {
  if (!isPlainObject(value) || typeof value.src !== 'string' || value.src === '') return undefined;
  const media: ReleaseMedia = {
    src: value.src,
    alt: typeof value.alt === 'string' ? value.alt : '',
  };
  if (typeof value.caption === 'string') media.caption = value.caption;
  return media;
}

function sanitizeSections(value: unknown): ReleaseSection[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: ReleaseSection[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) return undefined;
    if (typeof entry.title !== 'string' || typeof entry.body !== 'string') return undefined;
    // `points` is rendered with .map() and `highlights.slice(1)` is assigned
    // straight into it, so a non-array here is exactly the crash we are
    // filtering out. Reject the whole list rather than half-render a chapter.
    if (entry.points !== undefined && !isStringArray(entry.points)) return undefined;

    const section: ReleaseSection = {
      eyebrow: typeof entry.eyebrow === 'string' ? entry.eyebrow : '',
      title: entry.title,
      body: entry.body,
    };
    const media = sanitizeMedia(entry.media);
    if (media) section.media = media;
    if (isStringArray(entry.points)) section.points = entry.points;
    if (Array.isArray(entry.stats)) {
      const stats = entry.stats.filter(
        (s): s is { value: string; label: string } =>
          isPlainObject(s) && typeof s.value === 'string' && typeof s.label === 'string'
      );
      if (stats.length > 0) section.stats = stats;
    }
    out.push(section);
  }
  return out.length > 0 ? out : undefined;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === 'string');
}

function mergeReleases(remote: any[], bundled: ReleaseVersion[]): ReleaseVersion[] {
  const map = new Map<string, ReleaseVersion>();

  // Add bundled first (has curated highlights and verified descriptions)
  for (const b of bundled) {
    map.set(b.version, { ...b });
  }

  // Merge or prepend remote releases from GitHub
  for (const r of remote) {
    const ver = String(r.version || '').replace(/^v/, '');
    if (!ver) continue;

    const existing = map.get(ver);
    if (existing) {
      // Curated release: the bundled entry is the reviewed, user-facing copy.
      // Raw commit subjects from GitHub are not merged in — they would bury
      // the curated notes under noisy `[website] ...` lines. GitHub is only
      // used to surface versions that have not been curated yet.
      map.set(ver, {
        ...existing,
        date: existing.date || r.date || 'Recent',
      });
    } else {
      // New version from GitHub that is not yet in bundled data.
      // Type-checked instead of defaulted with `||`: `||` only rejects falsy
      // values, so a number, an object or `[]` in `category`/`text` survives
      // into a field the renderer treats as a string (`item.text.toLowerCase()`,
      // `highlights.slice(1)` as a React child). Unknown categories fall back to
      // 'improvement' because that is a bounded, known value — not a coercion.
      const changes: ChangelogItem[] =
        Array.isArray(r.changes) && r.changes.length > 0
          ? r.changes
              .filter(isPlainObject)
              .filter((c: any) => typeof c.text === 'string' && c.text.trim() !== '')
              .map((c: any) => ({
                category: isKnownCategory(c.category) ? c.category : 'improvement',
                text: c.text,
              }))
          : [
              { category: 'improvement', text: 'Performance, stability, and security enhancements.' }
            ];

      // Every change was dropped as malformed: an entry with no renderable
      // note would show up as an empty chapter, so the release is skipped.
      if (changes.length === 0) continue;

      const highlights: string[] = isStringArray(r.highlights) && r.highlights.length > 0
        ? r.highlights
        : changes.slice(0, 3).map(c => c.text);

      map.set(ver, {
        version: ver,
        date: r.date || 'Recent',
        title: r.title || `Nova Browser v${ver}`,
        badge: 'New Release',
        highlights,
        changes
      });
    }
  }

  // Return sorted descending by version number
  return Array.from(map.values()).sort((a, b) => {
    return compareVersionsDesc(a.version, b.version);
  });
}

function compareVersionsDesc(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return nb - na;
  }
  return 0;
}
