/**
 * Single source of truth for proxy URL validation (P0 UI stability).
 *
 * Only secure protocols are accepted:
 * - https://
 * - socks5://
 *
 * Plain http:// and socks4:// are rejected (credentials would travel
 * in cleartext / weak handshake). Empty string is NOT a valid proxy —
 * callers treat '' as "Direct Connection" separately.
 *
 * Embedded credentials (user:pass@host) are rejected — they would be
 * persisted to localStorage in cleartext. Case normalization applies
 * to scheme/host only; userinfo and path case is preserved (and then
 * rejected via the credential check).
 */
export const isValidProxyUrl = (url: unknown): url is string => {
  if (typeof url !== 'string') return false;
  const raw = url.trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (!lower.startsWith('https://') && !lower.startsWith('socks5://')) return false;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'socks5:') return false;
    // Hostname check is case-insensitive (URL already normalizes it).
    if (!u.hostname || !u.hostname.toLowerCase()) return false;
    // Reject embedded credentials — never store user:pass@host.
    if (u.username || u.password) return false;
    return true;
  } catch {
    return false;
  }
};

export const SECURE_PROXY_ERROR =
  'Secure proxy required: URL must start with https:// or socks5://';
