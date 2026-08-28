/**
 * Shared URL validation for every navigation entry point (handleNavigate,
 * handleNewTab, handleNewIncognitoTab, AI/MCP-driven navigation).
 *
 * Security: blocks dangerous schemes and payloads before they reach a
 * webview. All entry points MUST route through this single helper so the
 * blocklist can't be bypassed by calling a less-defended handler.
 */
export function isSafeNavigationUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  // Helper to sanitize C0 control characters (0x00-0x1F, 0x7F) and whitespace
  const sanitize = (str: string) => str.trim().replace(/[\x00-\x1f\x7f]/g, '').toLowerCase();

  const rawNormalized = sanitize(url);

  // Attempt URL decoding iteratively to prevent percent-encoded evasion (e.g. %6a%61%76%61%73%63%72%69%70%74%3a)
  let decoded = url;
  try {
    let prev = '';
    let iterations = 0;
    while (decoded !== prev && iterations < 3) {
      prev = decoded;
      decoded = decodeURIComponent(decoded);
      iterations++;
    }
  } catch (_) {
    // Malformed percent encoding - proceed with best-effort decoded string
  }

  const decodedNormalized = sanitize(decoded);

  // Navigation is intentionally stricter than image rendering. Data URLs are
  // never navigable here, including raster images; callers that render an
  // image (for example a favicon) must use their own image-only validator.
  const blockedSchemes = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'blob:',
    'view-source:',
    'chrome:',
    'edge:'
  ];

  for (const scheme of blockedSchemes) {
    if (rawNormalized.startsWith(scheme) || decodedNormalized.startsWith(scheme)) {
      return false;
    }
  }

  // Only the browser's known internal pages and network URLs are navigable.
  // Unknown about: pages must not become a protocol bypass (for example
  // about:config or about:srcdoc).
  const protocolMatch = decodedNormalized.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!protocolMatch) return true;

  const protocol = `${protocolMatch[1].toLowerCase()}:`;
  if (protocol === 'http:' || protocol === 'https:') return true;
  if (protocol === 'nova:') {
    return ['nova://newtab', 'nova://settings', 'nova://history', 'nova://downloads']
      .some(page => decodedNormalized === page);
  }
  if (protocol === 'about:') {
    return ['about:blank', 'about:settings', 'about:history', 'about:downloads', 'about:newtab']
      .some(page => decodedNormalized === page);
  }

  return false;
}
