import { isIP } from 'net';

/**
 * Returns true for private, loopback, link-local, documentation, multicast,
 * and otherwise non-public addresses. Unknown or malformed values fail closed.
 */
export function isPrivateIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return true;
  const normalized = ip.trim().toLowerCase();
  const family = isIP(normalized);
  if (family === 0) return true;

  // IPv4-mapped IPv6 addresses must use the IPv4 policy as well. Unknown
  // mapped forms fail closed instead of being treated as public IPv6.
  if (normalized.startsWith('::ffff:')) {
    const mappedV4 = normalized.slice('::ffff:'.length);
    return isIP(mappedV4) === 4 ? isPrivateIP(mappedV4) : true;
  }

  if (family === 4) {
    const octets = normalized.split('.').map(Number);
    const [a, b, c] = octets;
    if (octets.length !== 4 || octets.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // IPv4 link-local / metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) || // IETF protocol assignments
      (a === 192 && b === 2) || // TEST-NET-1
      (a === 192 && b === 88 && c === 99) || // 6to4 relay anycast
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || // benchmarking / TEST-NET-2
      (a === 203 && b === 0 && c === 113) || // TEST-NET-3
      a >= 224 // multicast and reserved
    );
  }

  // IPv6 loopback, unspecified, unique-local, link-local, multicast and
  // documentation ranges are not valid public preview targets.
  return normalized === '::' || normalized === '::1' ||
    /^f[cd][0-9a-f]{2}:/i.test(normalized) ||
    /^fe[89ab][0-9a-f]:/i.test(normalized) ||
    /^ff[0-9a-f]{2}:/i.test(normalized) ||
    /^2001:db8:/i.test(normalized);
}
