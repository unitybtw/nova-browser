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

  // Block dangerous schemes outright
  const blockedSchemes = [
    'javascript:',
    'vbscript:',
    'file:',
    'blob:',
    'view-source:'
  ];

  for (const scheme of blockedSchemes) {
    if (rawNormalized.startsWith(scheme) || decodedNormalized.startsWith(scheme)) {
      return false;
    }
  }

  // data: URLs - strictly restrict to permitted raster image MIME types (base64 encoded).
  // Everything else (text/html, application/xhtml+xml, text/xml, image/svg+xml which can carry scripts)
  // is blocked.
  const dataRasterRegex = /^data:image\/(png|jpeg|jpg|gif|webp|bmp|ico);base64,/i;
  if (rawNormalized.startsWith('data:') || decodedNormalized.startsWith('data:')) {
    return dataRasterRegex.test(rawNormalized) || dataRasterRegex.test(decodedNormalized);
  }

  return true;
}
