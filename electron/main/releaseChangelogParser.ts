/**
 * Pure GitHub Release & Release Manifest parser for automatic changelog ingestion.
 * Kept free of Electron runtime imports so both Main Process IPC handlers and Node
 * unit tests can execute the exact same parsing and sanitization logic.
 */

export type ReleaseCategory = 'feature' | 'improvement' | 'fix' | 'security' | 'performance';

export interface ParsedReleaseMedia {
  src: string;
  alt: string;
  caption?: string;
  kind?: 'image' | 'video';
  title?: string;
  poster?: string;
  captions?: string;
}

export interface ParsedReleaseStat {
  value: string;
  label: string;
}

export interface ParsedReleaseSection {
  eyebrow: string;
  title: string;
  body: string;
  media?: ParsedReleaseMedia;
  points?: string[];
  stats?: ParsedReleaseStat[];
}

export interface ParsedChangelogItem {
  category: ReleaseCategory;
  text: string;
}

export interface ParsedReleaseVersion {
  version: string;
  date: string;
  title: string;
  badge?: string;
  lede?: string;
  hero?: ParsedReleaseMedia;
  mediaGallery?: ParsedReleaseMedia[];
  highlights: string[];
  changes: ParsedChangelogItem[];
  sections?: ParsedReleaseSection[];
}

export interface GitHubReleaseAssetLike {
  name?: string;
  label?: string | null;
  browser_download_url?: string;
  content_type?: string;
  size?: number;
}

export interface GitHubReleaseLike {
  tag_name?: string;
  name?: string | null;
  body?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string | null;
  assets?: GitHubReleaseAssetLike[];
}

export interface GitHubCommitLike {
  commit?: {
    message?: string;
  };
}

export interface ReleaseManifestLike {
  version?: string;
  date?: string;
  title?: string;
  badge?: string;
  lede?: string;
  hero?: ParsedReleaseMedia;
  mediaGallery?: ParsedReleaseMedia[];
  highlights?: string[];
  sections?: ParsedReleaseSection[];
  changes?: ParsedChangelogItem[];
}

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|avif)(?:$|[?#])/i;
const VIDEO_EXT_RE = /\.(mp4|webm|mov)(?:$|[?#])/i;

const NOISY_URL_FRAGMENTS = [
  'shields.io',
  'badge.svg',
  'codecov.io',
  'travis-ci.',
  'komarev.com',
  'visitor-badge',
  'star-history.com',
  '/actions/workflows/',
  '/badge.svg',
];

const BOILERPLATE_HEADING_RE =
  /^(?:sha-?256\s+checksums?|checksums?|full\s+changelog|new\s+contributors?|installation|downloads?|virustotal|assets?|verify\s+integrity)$/i;

const KNOWN_ACRONYMS = new Set([
  'AI',
  'API',
  'CSS',
  'CSP',
  'DOM',
  'FPS',
  'GPU',
  'HTML',
  'IPC',
  'JSON',
  'LRU',
  'MACOS',
  'MCP',
  'PIP',
  'QR',
  'STT',
  'TLS',
  'UI',
  'URL',
  'UX',
  'VPN',
  'XSS',
]);

/** Validates that a release media URL is a bundled relative asset or trusted GitHub HTTPS asset. */
export function isTrustedReleaseMediaUrl(rawUrl: string): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || /[\u0000-\u001F\s]/.test(trimmed)) return false;

  const lower = trimmed.toLowerCase();
  if (NOISY_URL_FRAGMENTS.some((frag) => lower.includes(frag))) {
    return false;
  }

  // Bundled app-relative screenshots & videos (no path traversal)
  if (trimmed.startsWith('./')) {
    if (trimmed.includes('..') || trimmed.includes('\\')) return false;
    return trimmed.startsWith('./screenshots/') || trimmed.startsWith('./changelog/');
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'github.com' || host.endsWith('.githubusercontent.com');
  } catch {
    return false;
  }
}

function isVideoMedia(src: string, contentType?: string, labelOrAlt?: string): boolean {
  if (contentType && contentType.toLowerCase().startsWith('video/')) return true;
  if (VIDEO_EXT_RE.test(src)) return true;
  if (labelOrAlt && /\.(mp4|webm|mov)\b/i.test(labelOrAlt)) return true;
  return false;
}

/** Converts an uploaded release asset filename such as `01-live-design-studio.png` into a crisp title. */
export function humanizeAssetFilename(name: string): string {
  const base = name.split('/').pop() || name;
  const noExt = base.replace(/\.[a-z0-9]{2,5}$/i, '');
  const noPrefix = noExt.replace(/^\d+[-_\s]+/, '');
  const words = noPrefix
    .split(/[-_\s]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  if (words.length === 0) return 'Release Screenshot';

  return words
    .map((w) => {
      const upper = w.toUpperCase();
      if (KNOWN_ACRONYMS.has(upper)) return upper === 'MACOS' ? 'macOS' : upper;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

/** Strips inline Markdown syntax into clean display text without unsafe HTML rendering. */
function cleanMarkdownInline(raw: string): string {
  return raw
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseHtmlTagAttributes(attrBlock: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(attrBlock)) !== null) {
    attrs[match[1].toLowerCase()] = (match[2] ?? match[3] ?? '').trim();
  }
  return attrs;
}

function pushUniqueMedia(
  list: ParsedReleaseMedia[],
  seen: Set<string>,
  item: ParsedReleaseMedia | null | undefined
): void {
  if (!item || !isTrustedReleaseMediaUrl(item.src)) return;
  const normalizedSrc = item.src.trim();
  if (seen.has(normalizedSrc)) return;
  seen.add(normalizedSrc);

  const clean: ParsedReleaseMedia = {
    src: normalizedSrc,
    alt: item.alt?.trim() || item.title?.trim() || 'Nova Browser release preview',
    kind: item.kind === 'video' || isVideoMedia(normalizedSrc) ? 'video' : 'image',
  };
  if (item.title?.trim()) clean.title = item.title.trim();
  if (item.caption?.trim()) clean.caption = item.caption.trim();
  if (item.poster && isTrustedReleaseMediaUrl(item.poster)) clean.poster = item.poster.trim();
  if (item.captions && isTrustedReleaseMediaUrl(item.captions)) clean.captions = item.captions.trim();
  list.push(clean);
}

/** Extracts screenshots & videos from Markdown syntax, HTML `<img>`/`<video>` tags, and pasted GitHub attachments. */
export function extractMediaFromMarkdown(
  body: string,
  fallbackTitle = 'Release Preview'
): ParsedReleaseMedia[] {
  if (!body || typeof body !== 'string') return [];

  const found: ParsedReleaseMedia[] = [];
  const seen = new Set<string>();
  const lines = body.split('\n');
  let inCodeFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence || !trimmed) continue;

    // 1. Markdown images: ![alt](url "optional caption")
    const mdImgRe = /!\[([^\]]*)\]\((\S+?)(?:\s+["']([^"']+)["'])?\)/g;
    let m: RegExpExecArray | null;
    while ((m = mdImgRe.exec(trimmed)) !== null) {
      const alt = m[1]?.trim() || '';
      const src = m[2]?.trim() || '';
      const caption = m[3]?.trim() || '';
      pushUniqueMedia(found, seen, {
        src,
        kind: isVideoMedia(src, undefined, alt) ? 'video' : 'image',
        title: alt || caption || fallbackTitle,
        alt: alt || fallbackTitle,
        caption: caption || undefined,
      });
    }

    // 2. HTML <img> tags with arbitrary attribute ordering
    const htmlImgRe = /<img\b([^>]*?)\/?>/gi;
    while ((m = htmlImgRe.exec(trimmed)) !== null) {
      const attrs = parseHtmlTagAttributes(m[1] || '');
      if (!attrs.src) continue;
      pushUniqueMedia(found, seen, {
        src: attrs.src,
        kind: isVideoMedia(attrs.src, undefined, attrs.alt || attrs.title) ? 'video' : 'image',
        title: attrs.alt || attrs.title || fallbackTitle,
        alt: attrs.alt || attrs.title || fallbackTitle,
        caption: attrs.title && attrs.title !== attrs.alt ? attrs.title : undefined,
      });
    }

    // 3. HTML <video> or <source> tags
    const htmlVideoRe = /<(?:video|source)\b([^>]*?)\/?>/gi;
    while ((m = htmlVideoRe.exec(trimmed)) !== null) {
      const attrs = parseHtmlTagAttributes(m[1] || '');
      if (!attrs.src) continue;
      pushUniqueMedia(found, seen, {
        src: attrs.src,
        kind: 'video',
        title: attrs.title || attrs['aria-label'] || `${fallbackTitle} Demo`,
        alt: attrs['aria-label'] || attrs.title || fallbackTitle,
        poster: attrs.poster,
      });
    }

    // 4. Bare GitHub drag-and-drop user-attachments lines pasted in release bodies
    const bareUrlMatch = trimmed.match(/^(https:\/\/github\.com\/user-attachments\/assets\/[a-zA-Z0-9-]+|https:\/\/[^\s)]+\.(?:png|jpe?g|webp|gif|avif|mp4|webm))(?:\?[^\s]*)?$/i);
    if (bareUrlMatch) {
      const src = bareUrlMatch[1];
      pushUniqueMedia(found, seen, {
        src,
        kind: isVideoMedia(src) ? 'video' : 'image',
        title: found.length === 0 ? fallbackTitle : `${fallbackTitle} (${found.length + 1})`,
        alt: fallbackTitle,
      });
    }
  }

  return found;
}

/** Extracts visual screenshot & demo video files uploaded directly to GitHub Release assets. */
export function extractMediaFromReleaseAssets(
  assets: GitHubReleaseAssetLike[] | undefined
): ParsedReleaseMedia[] {
  if (!Array.isArray(assets) || assets.length === 0) return [];
  const found: ParsedReleaseMedia[] = [];
  const seen = new Set<string>();

  for (const asset of assets) {
    const src = asset?.browser_download_url || '';
    const name = asset?.name || '';
    const contentType = asset?.content_type || '';
    const isMediaType =
      IMAGE_EXT_RE.test(name) ||
      VIDEO_EXT_RE.test(name) ||
      contentType.toLowerCase().startsWith('image/') ||
      contentType.toLowerCase().startsWith('video/');
    if (!isMediaType) continue;

    const title = asset.label?.trim() || humanizeAssetFilename(name);
    pushUniqueMedia(found, seen, {
      src,
      kind: isVideoMedia(name, contentType) ? 'video' : 'image',
      title,
      alt: title,
    });
  }

  return found;
}

function isKnownCategory(value: unknown): value is ReleaseCategory {
  return (
    value === 'feature' ||
    value === 'improvement' ||
    value === 'fix' ||
    value === 'security' ||
    value === 'performance'
  );
}

/** Categorizes a single release bullet or commit headline deterministically. */
export function categorizeReleaseLine(rawLine: string): ParsedChangelogItem | null {
  let cleaned = rawLine
    .replace(/^\s*[-*]\s+/, '')
    .replace(/\s+by\s+@[a-zA-Z0-9_-]+\s+in\s+https:\/\/github\.com\/\S+/gi, '')
    .trim();

  cleaned = cleanMarkdownInline(cleaned);
  if (!cleaned || cleaned.length < 6) return null;

  const lower = cleaned.toLowerCase();
  if (
    lower.includes('full changelog') ||
    lower.includes('sha256') ||
    lower.startsWith('merge ') ||
    lower.startsWith('release:') ||
    /^[a-f0-9]{64}\b/.test(lower)
  ) {
    return null;
  }

  const conventionalMatch = cleaned.match(/^([a-z]+)(?:\(([^)]+)\))?:\s*(.+)$/i);
  if (conventionalMatch) {
    const type = conventionalMatch[1].toLowerCase();
    const scope = conventionalMatch[2] ? `[${conventionalMatch[2]}] ` : '';
    const desc = conventionalMatch[3].trim();
    if (!desc) return null;

    let category: ReleaseCategory = 'improvement';
    if (type === 'feat' || type === 'feature') category = 'feature';
    else if (type === 'fix' || type === 'bugfix') category = 'fix';
    else if (type === 'perf' || type === 'performance') category = 'performance';
    else if (type === 'security' || type === 'sec' || scope.toLowerCase().includes('security')) {
      category = 'security';
    }

    const formatted = scope + desc.charAt(0).toUpperCase() + desc.slice(1);
    return { category, text: formatted };
  }

  let category: ReleaseCategory = 'improvement';
  if (/\b(security|xss|csrf|csp|codeql|vuln\w*|sanitize\w*|encrypt\w*|rwlock|toctou|sandbox)\b/i.test(cleaned)) {
    category = 'security';
  } else if (/\b(perf|performance|startup|latency|faster|fps|120fps|memory|cache|bundle|throttl\w*)\b/i.test(cleaned)) {
    category = 'performance';
  } else if (/^(fix|fixed|resolve|resolved|repair|repaired|prevent|prevented)\b/i.test(cleaned) || /\bbugfix\b/i.test(cleaned)) {
    category = 'fix';
  } else if (/^(add|added|new|introduce|introduced|redesign|redesigned|launch|launched|support|built|build)\b/i.test(cleaned)) {
    category = 'feature';
  }

  return {
    category,
    text: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
  };
}

function formatPublishedDate(publishedAt?: string | null): string {
  if (!publishedAt) return 'Recent';
  try {
    const parsed = new Date(publishedAt);
    if (Number.isNaN(parsed.getTime())) return 'Recent';
    return parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return 'Recent';
  }
}

function isPureMediaOrRuleLine(trimmed: string): boolean {
  if (/^[-_*]{3,}$/.test(trimmed)) return true;
  if (/^!\[[^\]]*\]\([^)]+\)$/.test(trimmed)) return true;
  if (/^<(?:img|video|source|\/video|picture|\/picture)\b/i.test(trimmed)) return true;
  if (/^https:\/\/github\.com\/user-attachments\/assets\/[a-zA-Z0-9-]+$/i.test(trimmed)) return true;
  return false;
}

function sanitizeManifestMedia(media: unknown): ParsedReleaseMedia | undefined {
  if (!media || typeof media !== 'object' || Array.isArray(media)) return undefined;
  const record = media as Record<string, unknown>;
  if (typeof record.src !== 'string' || !isTrustedReleaseMediaUrl(record.src)) return undefined;

  const out: ParsedReleaseMedia = {
    src: record.src.trim(),
    alt: typeof record.alt === 'string' && record.alt.trim() ? record.alt.trim() : 'Release media',
    kind: record.kind === 'video' || isVideoMedia(record.src) ? 'video' : 'image',
  };
  if (typeof record.title === 'string' && record.title.trim()) out.title = record.title.trim();
  if (typeof record.caption === 'string' && record.caption.trim()) out.caption = record.caption.trim();
  if (typeof record.poster === 'string' && isTrustedReleaseMediaUrl(record.poster)) {
    out.poster = record.poster.trim();
  }
  if (typeof record.captions === 'string' && isTrustedReleaseMediaUrl(record.captions)) {
    out.captions = record.captions.trim();
  }
  return out;
}

function sanitizeManifestSections(sections: unknown): ParsedReleaseSection[] | undefined {
  if (!Array.isArray(sections)) return undefined;
  const out: ParsedReleaseSection[] = [];
  for (const entry of sections) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const s = entry as Record<string, unknown>;
    if (typeof s.title !== 'string' || typeof s.body !== 'string') continue;

    const item: ParsedReleaseSection = {
      eyebrow: typeof s.eyebrow === 'string' ? s.eyebrow : 'Overview',
      title: s.title,
      body: s.body,
    };
    const media = sanitizeManifestMedia(s.media);
    if (media) item.media = media;
    if (Array.isArray(s.points) && s.points.every((p) => typeof p === 'string')) {
      item.points = s.points;
    }
    if (Array.isArray(s.stats)) {
      const validStats = s.stats.filter(
        (st): st is ParsedReleaseStat =>
          Boolean(st) &&
          typeof st === 'object' &&
          !Array.isArray(st) &&
          typeof (st as any).value === 'string' &&
          typeof (st as any).label === 'string'
      );
      if (validStats.length > 0) item.stats = validStats;
    }
    out.push(item);
  }
  return out.length > 0 ? out : undefined;
}

function synthesizeSectionsFromChanges(changes: ParsedChangelogItem[]): ParsedReleaseSection[] | undefined {
  if (changes.length === 0) return undefined;

  const groups: Record<ReleaseCategory, string[]> = {
    feature: [],
    performance: [],
    security: [],
    improvement: [],
    fix: [],
  };
  for (const c of changes) {
    groups[c.category].push(c.text);
  }

  const blueprint: Array<{
    cat: ReleaseCategory;
    eyebrow: string;
    title: string;
    body: string;
  }> = [
    {
      cat: 'feature',
      eyebrow: 'Capabilities',
      title: 'New capabilities & interface refinements',
      body: 'Key user-facing additions and workflow improvements introduced in this release.',
    },
    {
      cat: 'performance',
      eyebrow: 'Performance',
      title: 'Speed, responsiveness & resource efficiency',
      body: 'Optimizations targeting startup time, frame pacing, and background memory usage.',
    },
    {
      cat: 'security',
      eyebrow: 'Security & Fixes',
      title: 'Hardening & stability improvements',
      body: 'Security fixes and reliability improvements landed across this release cycle.',
    },
  ];

  // Combine security + fix when crafting thematic summary chapters
  const securityAndFix = [...groups.security, ...groups.fix];
  const synthesized: ParsedReleaseSection[] = [];

  for (const item of blueprint) {
    const points = item.cat === 'security' ? securityAndFix : groups[item.cat];
    if (points.length >= 2) {
      synthesized.push({
        eyebrow: item.eyebrow,
        title: item.title,
        body: item.body,
        points: points.slice(0, 5),
      });
    }
  }

  if (synthesized.length === 0 && changes.length >= 2) {
    synthesized.push({
      eyebrow: 'Release Overview',
      title: 'Key updates in this release',
      body: 'Automatically aggregated highlights from commits and release notes shipped in this version.',
      points: changes.slice(0, 5).map((c) => c.text),
    });
  }

  return synthesized.length > 0 ? synthesized : undefined;
}

/**
 * Parses a GitHub Release payload (plus optional commit log & release-manifest JSON) into
 * the structured editorial schema consumed by Nova Browser's Changelog UI.
 */
export function parseGitHubRelease(
  release: GitHubReleaseLike,
  options?: {
    commits?: GitHubCommitLike[];
    manifest?: ReleaseManifestLike | null;
  }
): ParsedReleaseVersion | null {
  if (!release || release.draft || !release.tag_name) return null;

  const rawTag = String(release.tag_name).trim();
  const version = rawTag.replace(/^v/i, '');
  if (!version) return null;

  const manifest = options?.manifest || null;
  const fallbackTitle = (release.name || '').trim() || `Nova Browser v${version}`;
  const title = (manifest?.title || '').trim() || fallbackTitle;
  const date = (manifest?.date || '').trim() || formatPublishedDate(release.published_at);
  const body = typeof release.body === 'string' ? release.body : '';

  // 1. Walk markdown body into lede prose, non-boilerplate sections, highlights, and bullet changes
  const lines = body.split('\n');
  let inCodeFence = false;
  let currentHeading: string | null = null;
  let skipSection = false;
  let isHighlightsSection = false;

  const ledeLines: string[] = [];
  const parsedHighlights: string[] = [];
  const parsedChanges: ParsedChangelogItem[] = [];
  const rawSections: Array<{ title: string; prose: string[]; points: string[]; media?: ParsedReleaseMedia }> = [];
  let activeSection: { title: string; prose: string[]; points: string[]; media?: ParsedReleaseMedia } | null = null;

  const sectionTitleFromLine = (heading: string) =>
    cleanMarkdownInline(heading.replace(/^#{1,4}\s+/, '').trim());

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence || !trimmed) continue;

    if (/^#{1,4}\s+/.test(trimmed)) {
      const headingText = sectionTitleFromLine(trimmed);
      currentHeading = headingText;
      skipSection = BOILERPLATE_HEADING_RE.test(headingText);
      isHighlightsSection = !skipSection && /^(?:highlights?|key\s+highlights?|summary)$/i.test(headingText);

      if (!skipSection && !isHighlightsSection && headingText && headingText.toLowerCase() !== "what's changed") {
        activeSection = { title: headingText, prose: [], points: [] };
        rawSections.push(activeSection);
      } else {
        activeSection = null;
      }
      continue;
    }

    if (skipSection) continue;

    // Extract section-level media if inside an active editorial section
    if (activeSection && !activeSection.media) {
      const lineMedia = extractMediaFromMarkdown(trimmed, activeSection.title);
      if (lineMedia.length > 0) {
        activeSection.media = lineMedia[0];
      }
    }

    if (isPureMediaOrRuleLine(trimmed)) continue;

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const item = categorizeReleaseLine(trimmed);
      if (!item) continue;

      if (isHighlightsSection) {
        parsedHighlights.push(item.text);
      } else {
        parsedChanges.push(item);
        if (activeSection) {
          activeSection.points.push(item.text);
        }
      }
      continue;
    }

    // Plain narrative line (ignore raw diff/changelog reference footers)
    if (/^\*\*full changelog\*\*:/i.test(trimmed)) continue;
    const cleanText = cleanMarkdownInline(trimmed);
    if (!cleanText || cleanText.length < 8) continue;

    if (currentHeading === null) {
      ledeLines.push(cleanText);
    } else if (isHighlightsSection) {
      parsedHighlights.push(cleanText);
    } else if (activeSection) {
      activeSection.prose.push(cleanText);
    }
  }

  // 2. Fallback to Compare commits if the release body contained no structured bullet lines
  if (parsedChanges.length === 0 && Array.isArray(options?.commits)) {
    for (const c of options.commits) {
      const firstLine = (c?.commit?.message || '').split('\n')[0].trim();
      if (!firstLine) continue;
      const item = categorizeReleaseLine(firstLine);
      if (item) parsedChanges.push(item);
    }
  }

  // Also check manifest.changes if curated manifest supplied them and GitHub body was sparse
  let finalChanges: ParsedChangelogItem[] =
    Array.isArray(manifest?.changes) && manifest.changes.length > 0
      ? manifest.changes
          .filter((c): c is ParsedChangelogItem => Boolean(c) && typeof c.text === 'string' && c.text.trim() !== '')
          .map((c) => ({ category: isKnownCategory(c.category) ? c.category : 'improvement', text: c.text.trim() }))
      : parsedChanges;

  if (finalChanges.length === 0) {
    const fallbackNote =
      parsedHighlights[0] ||
      ledeLines[0] ||
      'Performance, stability, and security enhancements.';
    finalChanges = [{ category: 'improvement', text: fallbackNote.slice(0, 260) }];
  }

  // 3. Build editorial chapters (`sections`)
  const builtSections: ParsedReleaseSection[] = [];
  for (const s of rawSections) {
    const secBody = s.prose.join(' ').trim();
    if (!secBody && s.points.length === 0) continue;
    builtSections.push({
      eyebrow: s.title.split(/\s+/)[0] || 'Release',
      title: s.title,
      body: secBody || `Key changes shipped under ${s.title}.`,
      ...(s.media ? { media: s.media } : {}),
      ...(s.points.length > 0 ? { points: s.points.slice(0, 6) } : {}),
    });
  }

  const manifestSections = sanitizeManifestSections(manifest?.sections);
  const finalSections =
    manifestSections ||
    (builtSections.length > 0 ? builtSections.slice(0, 5) : synthesizeSectionsFromChanges(finalChanges));

  // 4. Derive lede
  const joinedLede = ledeLines.join(' ').trim();
  const finalLede =
    (manifest?.lede || '').trim() ||
    (joinedLede.length > 0 ? joinedLede.slice(0, 420) : undefined);

  // 5. Merge & deduplicate visual media (manifest -> release markdown/HTML -> uploaded assets -> sections)
  const mergedMedia: ParsedReleaseMedia[] = [];
  const seenMedia = new Set<string>();

  if (manifest?.hero) {
    pushUniqueMedia(mergedMedia, seenMedia, sanitizeManifestMedia(manifest.hero));
  }
  if (Array.isArray(manifest?.mediaGallery)) {
    for (const m of manifest.mediaGallery) {
      pushUniqueMedia(mergedMedia, seenMedia, sanitizeManifestMedia(m));
    }
  }
  for (const m of extractMediaFromMarkdown(body, title)) {
    pushUniqueMedia(mergedMedia, seenMedia, m);
  }
  for (const m of extractMediaFromReleaseAssets(release.assets)) {
    pushUniqueMedia(mergedMedia, seenMedia, m);
  }
  for (const s of builtSections) {
    if (s.media) pushUniqueMedia(mergedMedia, seenMedia, s.media);
  }

  const mediaGallery = mergedMedia.slice(0, 8);
  const hero = sanitizeManifestMedia(manifest?.hero) || mediaGallery[0];

  // 6. Derive highlights
  const finalHighlights: string[] = [];
  if (Array.isArray(manifest?.highlights) && manifest.highlights.length > 0) {
    for (const h of manifest.highlights) {
      if (typeof h === 'string' && h.trim()) finalHighlights.push(h.trim());
    }
  } else if (parsedHighlights.length > 0) {
    finalHighlights.push(...parsedHighlights.slice(0, 6));
  } else {
    for (const ch of finalChanges) {
      if (finalHighlights.length < 4 && (ch.category === 'feature' || ch.category === 'security' || ch.category === 'performance')) {
        finalHighlights.push(ch.text);
      }
    }
    if (finalHighlights.length === 0) {
      finalHighlights.push(...finalChanges.slice(0, 4).map((c) => c.text));
    }
  }

  return {
    version,
    date,
    title,
    badge: (manifest?.badge || '').trim() || 'New Release',
    ...(finalLede ? { lede: finalLede } : {}),
    ...(hero ? { hero } : {}),
    ...(mediaGallery.length > 0 ? { mediaGallery } : {}),
    highlights: finalHighlights.slice(0, 6),
    changes: finalChanges,
    ...(finalSections && finalSections.length > 0 ? { sections: finalSections } : {}),
  };
}
