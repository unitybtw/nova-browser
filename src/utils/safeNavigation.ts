/**
 * Shared URL validation for every navigation entry point.
 *
 * Navigation is intentionally strict: only HTTP(S) URLs and the browser's
 * exact internal pages are accepted. Callers that accept user text must run it
 * through the search formatter before calling this helper.
 */
export function isSafeNavigationUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  // Do not normalize control characters into a different URL. A URL containing
  // them must be rejected rather than having its security-relevant prefix
  // silently changed.
  if (/[^\x20-\x7e\u00a0-\uffff]/.test(url)) return false;

  const candidate = url.trim();
  if (!candidate || candidate !== url) return false;

  // Decode only for scheme inspection so encoded dangerous schemes cannot
  // bypass the checks below. Malformed encoding is not a valid navigation URL.
  let decoded = candidate;
  try {
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return false;
  }

  const normalized = decoded.toLowerCase();
  const blockedSchemes = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'blob:',
    'view-source:', 'chrome:', 'edge:', 'devtools:'
  ];
  if (blockedSchemes.some(scheme => normalized.startsWith(scheme))) return false;

  const protocolMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/);
  if (!protocolMatch) return false;

  const protocol = `${protocolMatch[1]}:`;
  if (protocol === 'http:' || protocol === 'https:') {
    try {
      const parsed = new URL(candidate);
      return Boolean(parsed.hostname) && !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  }

  if (protocol === 'nova:') {
    try {
      const parsed = new URL(candidate);
      if (!['newtab', 'settings', 'history', 'downloads'].includes(parsed.hostname) ||
          parsed.pathname || parsed.search || parsed.username || parsed.password) {
        return false;
      }
      // Settings uses fragments for its internal sections (for example
      // #extensions and #mcp). Fragments never leave the trusted app shell.
      return parsed.hostname !== 'settings' ? !parsed.hash : (
        !parsed.hash || ['#extensions', '#mcp'].includes(parsed.hash)
      );
    } catch {
      return false;
    }
  }

  if (protocol === 'about:') {
    return [
      'about:blank',
      'about:settings',
      'about:history',
      'about:downloads',
      'about:newtab'
    ].includes(normalized);
  }

  if (protocol === 'chrome-extension:') {
    try {
      const parsed = new URL(candidate);
      return /^[a-zA-Z0-9_-]+$/.test(parsed.hostname) && !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  }

  return false;
}
