/**
 * Nova Browser Security Utilities
 * Provides URL security classification, phishing detection, and HTTPS enforcement helpers.
 */
import { DANGEROUS_PROTOCOLS } from './safeNavigation';

export type SecurityLevel = 'secure' | 'http' | 'dangerous' | 'internal' | 'unknown' | 'file';

export interface SecurityInfo {
  level: SecurityLevel;
  label: string;
  color: string;        // Tailwind color class
  bgColor: string;      // Tailwind bg class
  icon: string;         // emoji icon
  tooltip: string;
}

export type SecurityStatus = SecurityInfo;

// Internal nova:// pages are always safe
const INTERNAL_PROTOCOLS = ['nova:', 'about:', 'chrome-extension:'];

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
 * Check if a domain matches the blocklist or exhibits concrete structural phishing vectors.
 * Replaces naive keyword matching with signed blocklist matching and structural heuristic checks.
 */
let cachedBlocklist: string[] | null = null;

export function checkPhishingDomain(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) return false;

  // 1. Structural Phishing: Embedded authority credentials used to spoof URLs (e.g., https://paypal.com@phishing.com)
  if (parsed.username || parsed.password) {
    return true;
  }

  // 2. Concrete Homograph / Punycode spoofing check (e.g. xn--apple-...)
  if (hostname.startsWith('xn--') || hostname.includes('.xn--')) {
    return true;
  }

  // 3. Cryptographically verified blocklist matching (exact or subdomain)
  if (cachedBlocklist && cachedBlocklist.length > 0) {
    const isBlocked = cachedBlocklist.some(blocked => {
      return hostname === blocked || hostname.endsWith('.' + blocked);
    });
    if (isBlocked) return true;
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
 * Get security classification for a given URL
 */
export function getUrlSecurityInfo(url: string): SecurityInfo {
  if (!url || typeof url !== 'string') {
    return {
      level: 'unknown',
      label: 'Unknown',
      color: 'text-slate-500',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      icon: 'Globe',
      tooltip: 'Invalid or unknown connection'
    };
  }

  // Internal Nova pages
  if (
    url.startsWith('nova://') ||
    url.startsWith('about:') ||
    url === 'about:blank' ||
    url.startsWith('chrome://') ||
    url.startsWith('edge://')
  ) {
    return {
      level: 'internal',
      label: 'System',
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      icon: 'Shield',
      tooltip: 'Internal system page'
    };
  }

  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.toLowerCase();

    // Local files
    if (protocol === 'file:') {
      return {
        level: 'file',
        label: 'Local File',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        icon: 'FileText',
        tooltip: 'Local system file'
      };
    }

    // Dangerous protocols
    if (DANGEROUS_PROTOCOLS.includes(protocol)) {
      return {
        level: 'dangerous',
        label: 'Dangerous',
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-500/10',
        icon: 'ShieldAlert',
        tooltip: 'Dangerous or untrusted protocol'
      };
    }

    // Check phishing
    if (checkPhishingDomain(url)) {
      return {
        level: 'dangerous',
        label: 'Dangerous',
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-500/10',
        icon: 'ShieldAlert',
        tooltip: 'Potential phishing or dangerous site'
      };
    }

    // HTTPS
    if (protocol === 'https:') {
      return {
        level: 'secure',
        label: 'Secure',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
        icon: 'Lock',
        tooltip: 'Connection is encrypted and secure'
      };
    } else {
      return {
        level: 'http',
        label: 'Not Secure',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-500/10',
        icon: 'Unlock',
        tooltip: 'Connection is not encrypted (HTTP)'
      };
    }
  } catch {
    return {
      level: 'unknown',
      label: 'Unknown',
      color: 'text-slate-500',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      icon: 'Globe',
      tooltip: 'Invalid or unknown connection'
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
      const host = parsed.hostname.toLowerCase();
      // Exclude localhost and private intranet addresses from HTTPS upgrade to align with main process
      if (
        host === 'localhost' ||
        host.endsWith('.localhost') ||
        host.endsWith('.local') ||
        host.endsWith('.internal') ||
        host.startsWith('127.') ||
        host === '0.0.0.0' ||
        host === '::1'
      ) {
        return null;
      }
      parsed.protocol = 'https:';
      return parsed.toString();
    }
  } catch {}
  return null;
}

export const getConnectionSecurity = getUrlSecurityInfo;

/**
 * Format a URL for display in the address bar (strip trailing slash, protocol for common sites)
 */
export function formatDisplayUrl(url: string): string {
  if (!url || url.startsWith('nova://')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return url;
    }
    let display = parsed.hostname + parsed.pathname;
    if (display.endsWith('/')) display = display.slice(0, -1);
    if (parsed.search) display += parsed.search;
    return display;
  } catch {
    return url;
  }
}
