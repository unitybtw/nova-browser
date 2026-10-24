export const ADBLOCK_WHITELIST_UPDATED_EVENT = 'nova:adblocker-whitelist-updated';

// Essential CAPTCHA, bot-challenge, and OAuth/consent verification endpoints
// that must never be blocked by the network filter engine.
export const CAPTCHA_WHITELIST_RULES = [
  'google.com/recaptcha',
  'www.google.com/recaptcha',
  'gstatic.com/recaptcha',
  'www.gstatic.com/recaptcha',
  'recaptcha.net',
  'challenges.cloudflare.com',
  'hcaptcha.com',
  'newassets.hcaptcha.com',
  'apis.google.com',
  'accounts.google.com',
  'consent.google.com'
];

export const MAX_USER_WHITELIST_ENTRIES = 500;
export const MAX_WHITELIST_HOST_LENGTH = 253;

/**
 * Strict DNS hostname validator: dot-separated labels of alphanumerics
 * (hyphens/underscores allowed inside labels) with at least one dot and a
 * valid TLD, or `localhost`. No scheme, port, no path, no query, no wildcard, or `@`.
 */
const WHITELIST_HOST_RE =
  /^(?:localhost|(?:[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})$/;

/**
 * Normalizes a URL or hostname into a canonical adblock whitelist domain.
 * - Rejects internal browser schemes (`nova://`, `about:`, `chrome://`, `file://`, `javascript:`, `data:`).
 * - Strips leading `www.` and trailing `.` so `www.example.com` and `example.com` match consistently.
 * - Returns `''` if the input does not resolve to a valid hostname.
 */
export function normalizeAdblockDomain(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('nova://') ||
    lower.startsWith('about:') ||
    lower.startsWith('chrome://') ||
    lower.startsWith('chrome-extension://') ||
    lower.startsWith('file://') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('blob:') ||
    lower === 'newtab' ||
    lower === 'https://newtab'
  ) {
    return '';
  }

  let candidate = lower;
  if (candidate.includes('://')) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return '';
      }
      if (parsed.username || parsed.password) {
        return '';
      }
      candidate = parsed.hostname.toLowerCase();
    } catch {
      return '';
    }
  } else {
    // Reject strings containing path/query/userinfo/port separators when passed as raw hostnames
    if (/[/?#@:\s]/.test(candidate)) {
      return '';
    }
  }

  candidate = candidate.replace(/\.$/, '').replace(/^www\./, '');
  if (!candidate || candidate.length > MAX_WHITELIST_HOST_LENGTH) {
    return '';
  }
  if (!WHITELIST_HOST_RE.test(candidate)) {
    return '';
  }
  return candidate;
}

/**
 * Sanitizes and deduplicates an untrusted whitelist array into a Set of canonical domains.
 */
export function sanitizeUserWhitelistHosts(whitelist: unknown): Set<string> {
  const rawList = Array.isArray(whitelist) ? whitelist : [];
  if (rawList.length > MAX_USER_WHITELIST_ENTRIES) {
    console.warn(
      `[AdBlocker] Whitelist has ${rawList.length} entries; keeping the first ${MAX_USER_WHITELIST_ENTRIES}.`
    );
  }

  const sanitized = new Set<string>();
  let rejected = 0;
  for (const entry of rawList.slice(0, MAX_USER_WHITELIST_ENTRIES)) {
    if (typeof entry !== 'string') {
      rejected++;
      continue;
    }
    const host = normalizeAdblockDomain(entry);
    if (!host) {
      rejected++;
      continue;
    }
    sanitized.add(host);
  }
  if (rejected > 0) {
    console.warn(`[AdBlocker] Dropped ${rejected} invalid adblock whitelist entries.`);
  }
  return sanitized;
}

/**
 * Sanitizes and deduplicates an untrusted whitelist array into canonical domains.
 */
export function sanitizeAdblockWhitelist(entries: unknown): string[] {
  return Array.from(sanitizeUserWhitelistHosts(entries));
}

export function isHostInUserWhitelist(hostname: string, whitelistSet: ReadonlySet<string>): boolean {
  if (!hostname || whitelistSet.size === 0) return false;
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  if (!normalized) return false;
  if (whitelistSet.has(normalized)) return true;
  for (const allowed of whitelistSet) {
    if (normalized === allowed || normalized.endsWith('.' + allowed)) {
      return true;
    }
  }
  return false;
}

export function isUrlInUserWhitelist(urlStr: string | undefined | null, whitelistSet: ReadonlySet<string>): boolean {
  if (!urlStr || typeof urlStr !== 'string' || whitelistSet.size === 0) return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return isHostInUserWhitelist(parsed.hostname, whitelistSet);
  } catch {
    return false;
  }
}

/**
 * Returns true if `urlOrHost` matches any domain (or subdomain of a domain) in `whitelist`.
 */
export function isDomainWhitelisted(
  urlOrHost: string | null | undefined,
  whitelist: readonly string[] | null | undefined
): boolean {
  if (!urlOrHost || !Array.isArray(whitelist) || whitelist.length === 0) return false;
  const host = normalizeAdblockDomain(urlOrHost);
  if (!host) return false;

  for (const rawEntry of whitelist) {
    const entry = normalizeAdblockDomain(rawEntry);
    if (!entry) continue;
    if (host === entry || host.endsWith('.' + entry)) {
      return true;
    }
  }
  return false;
}

/**
 * Toggles `urlOrHost` inside `whitelist`, returning a sanitized new list and new status.
 */
export function toggleDomainInWhitelist(
  urlOrHost: string | null | undefined,
  whitelist: readonly string[] | null | undefined
): { nextWhitelist: string[]; isWhitelisted: boolean; normalizedDomain: string } {
  const sanitized = sanitizeAdblockWhitelist(whitelist ? Array.from(whitelist) : []);
  const domain = normalizeAdblockDomain(urlOrHost);
  if (!domain) {
    return { nextWhitelist: sanitized, isWhitelisted: false, normalizedDomain: '' };
  }

  const currentlyWhitelisted = isDomainWhitelisted(domain, sanitized);
  if (currentlyWhitelisted) {
    const nextWhitelist = sanitized.filter(
      entry => entry !== domain && !domain.endsWith('.' + entry) && !entry.endsWith('.' + domain)
    );
    return { nextWhitelist, isWhitelisted: false, normalizedDomain: domain };
  }

  return {
    nextWhitelist: [...sanitized, domain],
    isWhitelisted: true,
    normalizedDomain: domain,
  };
}

/**
 * Broadcasts an in-window custom event so TopBar, SidebarTabs, SiteInfoPopover,
 * and PrivacySection stay synchronized without polling when the whitelist changes.
 */
export function notifyAdblockWhitelistUpdated(whitelist: string[]): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent(ADBLOCK_WHITELIST_UPDATED_EVENT, { detail: { whitelist } })
      );
    } catch {
      // Ignore in non-DOM test environments
    }
  }
}
