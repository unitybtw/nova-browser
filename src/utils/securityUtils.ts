/**
 * Nova Browser Security Utilities
 * Provides URL security classification, phishing detection, and HTTPS enforcement helpers.
 */

export type SecurityLevel = 'secure' | 'http' | 'dangerous' | 'internal' | 'unknown';

export interface SecurityInfo {
  level: SecurityLevel;
  label: string;
  color: string;        // Tailwind color class
  bgColor: string;      // Tailwind bg class
  icon: string;         // emoji icon
  tooltip: string;
}

// Internal nova:// pages are always safe
const INTERNAL_PROTOCOLS = ['nova:', 'about:', 'chrome-extension:'];

// Common phishing indicators in domain names
const PHISHING_KEYWORDS = [
  'login-secure', 'verify-account', 'account-verify', 'security-alert',
  'billing-update', 'account-suspended', 'at-risk', 'urgent-verify',
  'secure-login', 'identity-verify', 'recovery-team', 'prize-winner',
  'free-robux', 'free-bitcoin', 'nitro-free', 'wallet-recovery',
  'refund-2024', 'gift-card-free', 'survey-winner'
];

/**
 * Extract the hostname from a URL string safely.
 */
export function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Check if a domain matches the local blocklist.
 * Also checks for heuristic phishing patterns.
 */
let cachedBlocklist: string[] | null = null;

export function checkPhishingDomain(url: string): boolean {
  const hostname = extractHostname(url);
  if (!hostname) return false;

  // Check heuristic keyword patterns
  const hasPhishingKeyword = PHISHING_KEYWORDS.some(kw => hostname.includes(kw));
  if (hasPhishingKeyword) return true;

  // Check against cached blocklist (populated by loadBlocklist())
  if (cachedBlocklist) {
    return cachedBlocklist.some(blocked => {
      // Exact match or subdomain match
      return hostname === blocked || hostname.endsWith('.' + blocked);
    });
  }

  return false;
}

/**
 * Load the local blocked-domains list. Call this once at startup from the renderer.
 * The list is fetched via a custom protocol or passed via IPC from main.
 */
export function setBlocklist(domains: string[]) {
  cachedBlocklist = domains.map(d => d.toLowerCase().trim());
}

/**
 * Classify a URL's security level.
 */
export function getUrlSecurityInfo(url: string): SecurityInfo {
  if (!url || url === 'nova://newtab' || url === '') {
    return {
      level: 'internal',
      label: 'Nova',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-500/10',
      icon: 'Home',
      tooltip: 'Nova internal page'
    };
  }

  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol;

    // Internal pages
    if (INTERNAL_PROTOCOLS.includes(protocol)) {
      return {
        level: 'internal',
        label: 'Nova',
        color: 'text-purple-500',
        bgColor: 'bg-purple-50 dark:bg-purple-500/10',
        icon: 'Home',
        tooltip: 'Nova internal page'
      };
    }

    // Check phishing first (applies to both HTTP and HTTPS)
    if (checkPhishingDomain(url)) {
      return {
        level: 'dangerous',
        label: 'Tehlikeli',
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-500/10',
        icon: 'ShieldAlert',
        tooltip: 'Potansiyel kimlik avı veya tehlikeli site'
      };
    }

    // HTTPS
    if (protocol === 'https:') {
      return {
        level: 'secure',
        label: 'Güvenli',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
        icon: 'Lock',
        tooltip: 'Bağlantı şifrelenmiş ve güvenli'
      };
    } else {
      return {
        level: 'http',
        label: 'Güvenli Değil',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-500/10',
        icon: 'Unlock',
        tooltip: 'Bağlantı şifrelenmemiş (HTTP)'
      };
    }
  } catch {
    return {
      level: 'unknown',
      label: 'Bilinmiyor',
      color: 'text-slate-500',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      icon: 'Globe',
      tooltip: 'Geçersiz veya bilinmeyen bağlantı'
    };
  }
}

/**
 * Attempt HTTPS upgrade: if url is HTTP, try HTTPS equivalent.
 * Returns the HTTPS url if it should be tried, or null if already HTTPS/internal.
 */
export function getHttpsUpgradeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
      return parsed.toString();
    }
  } catch {}
  return null;
}

/**
 * Format a URL for display in the address bar (strip trailing slash, protocol for common sites)
 */
export function formatDisplayUrl(url: string): string {
  if (!url || url.startsWith('nova://')) return url;
  try {
    const parsed = new URL(url);
    let display = parsed.hostname + parsed.pathname;
    if (display.endsWith('/')) display = display.slice(0, -1);
    if (parsed.search) display += parsed.search;
    return display;
  } catch {
    return url;
  }
}
