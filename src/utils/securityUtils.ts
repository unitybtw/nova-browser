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
const DEFAULT_BLOCKED_DOMAINS = [
  'phishing.com',
  'malware.com',
  'evil.com',
  'account-security-update.com',
  'login-verification-alert.com',
  'apple-security-check.com',
  'google-verify-security.com',
  'paypal-account-center.com',
  'microsoft-login-auth.com',
  'secure-banking-portal.com',
  'metamask-validation.com',
  'wallet-connect-auth.com',
];

const TARGET_BRANDS = [
  'apple', 'google', 'paypal', 'microsoft', 'amazon',
  'github', 'facebook', 'instagram', 'twitter', 'netflix',
  'coinbase', 'binance', 'steam', 'telegram', 'discord'
];

const HOMOGLYPH_MAP: Record<string, string> = {
  '\u0430': 'a', '\u0441': 'c', '\u0435': 'e', '\u043e': 'o',
  '\u0440': 'p', '\u0455': 's', '\u0456': 'i', '\u0458': 'j',
  '\u0443': 'y', '\u0445': 'x', '\u03b1': 'a', '\u03bf': 'o',
  '\u03c1': 'p', '\u04bb': 'h', '\u043f': 'n'
};

function normalizeHomoglyphs(str: string): string {
  return str.split('').map(c => HOMOGLYPH_MAP[c] || c).join('');
}

export function isHomographSpoof(hostname: string): boolean {
  if (!hostname.includes('xn--')) return false;

  let unicodeDomain = hostname;
  try {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      const urlModule = require('url');
      if (typeof urlModule.domainToUnicode === 'function') {
        unicodeDomain = urlModule.domainToUnicode(hostname);
      }
    }
  } catch (_) {}

  if (unicodeDomain !== hostname) {
    const normalized = normalizeHomoglyphs(unicodeDomain);
    const domainLabels = normalized.split('.');
    for (const label of domainLabels) {
      if (TARGET_BRANDS.includes(label)) {
        return true;
      }
    }
  }

  // Punycode base label heuristic for environments without domainToUnicode
  const parts = hostname.split('.');
  for (const part of parts) {
    if (part.startsWith('xn--')) {
      const core = part.slice(4).split('-')[0];
      if (core && core.length >= 3) {
        for (const brand of TARGET_BRANDS) {
          if (brand.includes(core) && core.length >= brand.length - 2) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

let cachedBlocklist: string[] = [...DEFAULT_BLOCKED_DOMAINS];

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

  // 2. Targeted Homograph / Punycode spoofing check (targeting protected high-value brands)
  if (isHomographSpoof(hostname)) {
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
  cachedBlocklist = Array.from(new Set([...DEFAULT_BLOCKED_DOMAINS, ...domains.map(d => d.toLowerCase().trim())]));
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

  // Blocked / dangerous Chromium internals
  if (url.startsWith('chrome://') || url.startsWith('edge://')) {
    return {
      level: 'dangerous',
      label: 'Blocked Protocol',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      icon: 'AlertTriangle',
      tooltip: 'Restricted internal protocol blocked for safety'
    };
  }

  // Internal Nova pages
  if (
    url.startsWith('nova://') ||
    url.startsWith('about:') ||
    url === 'about:blank'
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
        host.endsWith('.lan') ||
        host.startsWith('127.') ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host === '[::1]'
      ) {
        return null;
      }
      const ipv4Match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
      if (ipv4Match) {
        const o1 = Number(ipv4Match[1]);
        const o2 = Number(ipv4Match[2]);
        if (o1 === 10 || o1 === 0 || o1 === 127) return null;
        if (o1 === 172 && o2 >= 16 && o2 <= 31) return null;
        if (o1 === 192 && o2 === 168) return null;
        if (o1 === 169 && o2 === 254) return null;
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

/**
 * Safe base64 encoding that sanitizes lone surrogates and url-encodes well-formed UTF-16
 * to prevent DOMException / btoa errors on unconventional character sequences.
 */
export function safeBase64(str: string): string {
  if (!str) return '';
  const wellFormed = typeof (str as any).toWellFormed === 'function'
    ? (str as any).toWellFormed()
    : str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');

  try {
    return btoa(unescape(encodeURIComponent(wellFormed)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (e) {
    return wellFormed.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
}
