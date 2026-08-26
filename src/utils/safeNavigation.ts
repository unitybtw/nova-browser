/**
 * Shared URL validation for every navigation entry point (handleNavigate,
 * handleNewTab, handleNewIncognitoTab, AI/MCP-driven navigation).
 *
 * 🔒 Security: blocks dangerous schemes and payloads before they reach a
 * webview. All entry points MUST route through this single helper so the
 * blocklist can't be bypassed by calling a less-defended handler.
 */
export function isSafeNavigationUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  // Chromium strips tab/LF/CR before scheme parsing, so "ja\tascript:" would
  // otherwise execute as javascript:. Strip all C0 control chars first.
  const lowerUrl = url.trim().replace(/[\x00-\x1f\x7f]/g, '').toLowerCase();

  // Block dangerous schemes outright.
  if (
    lowerUrl.startsWith('javascript:') ||
    lowerUrl.startsWith('file:') ||
    lowerUrl.startsWith('vbscript:')
  ) {
    return false;
  }

  // data: URLs — allowlist raster images only. Everything else (text/html,
  // application/xhtml+xml, text/xml, image/svg+xml which can carry scripts)
  // is blocked.
  if (lowerUrl.startsWith('data:')) {
    return /^data:image\/(png|jpeg|jpg|gif|webp|bmp|ico)[;,]/.test(lowerUrl);
  }

  return true;
}
