import { CHANGELOG_DATA, ReleaseVersion, ChangelogItem } from '../data/changelog';

const LOCAL_STORAGE_CACHE_KEY = 'nova_dynamic_changelog_cache';

export async function fetchAutomatedChangelog(forceRefresh = false): Promise<{
  releases: ReleaseVersion[];
  isLive: boolean;
}> {
  // 1. Check local storage cache first if not forcing refresh
  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Trigger silent background update check if older than 15 mins
          setTimeout(() => {
            fetchLiveFromMain(false).catch(() => {});
          }, 1000);
          return { releases: parsed, isLive: false };
        }
      }
    } catch (_) {}
  }

  // 2. Fetch fresh live releases from Main Process via GitHub API
  return await fetchLiveFromMain(forceRefresh);
}

async function fetchLiveFromMain(forceRefresh = false): Promise<{
  releases: ReleaseVersion[];
  isLive: boolean;
}> {
  try {
    const api = (window as any).electronAPI;
    if (api?.getChangelogReleases) {
      const remoteReleases = await api.getChangelogReleases(forceRefresh);
      if (Array.isArray(remoteReleases) && remoteReleases.length > 0) {
        const merged = mergeReleases(remoteReleases, CHANGELOG_DATA);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(merged));
          } catch (_) {}
        }
        return { releases: merged, isLive: true };
      }
    }
  } catch (err) {
    console.warn('[ChangelogService] Failed to load remote changelog:', err);
  }

  // 3. Fallback to bundled static data
  return { releases: CHANGELOG_DATA, isLive: false };
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
      // Merge changes if remote has more specific or additional commit notes
      const existingTexts = new Set(existing.changes.map(c => c.text.toLowerCase()));
      const combinedChanges: ChangelogItem[] = [...existing.changes];

      if (Array.isArray(r.changes)) {
        for (const ch of r.changes) {
          if (ch.text && !existingTexts.has(ch.text.toLowerCase())) {
            combinedChanges.push({
              category: ch.category || 'improvement',
              text: ch.text
            });
            existingTexts.add(ch.text.toLowerCase());
          }
        }
      }

      map.set(ver, {
        ...existing,
        date: existing.date || r.date || 'Recent',
        changes: combinedChanges,
        highlights: existing.highlights?.length ? existing.highlights : (r.highlights || [])
      });
    } else {
      // New version from GitHub that is not yet in bundled data
      const changes: ChangelogItem[] = Array.isArray(r.changes) && r.changes.length > 0
        ? r.changes.map((c: any) => ({
            category: c.category || 'improvement',
            text: c.text || 'Performance and stability improvements.'
          }))
        : [
            { category: 'improvement', text: 'Performance, stability, and security enhancements.' }
          ];

      const highlights: string[] = Array.isArray(r.highlights) && r.highlights.length > 0
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
