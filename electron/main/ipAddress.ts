import { isIP } from 'net';

/**
 * Parses an IPv6 string into 8 16-bit unsigned integer hextets.
 * Returns null if the format is invalid.
 */
function parseIPv6Hextets(ip: string): number[] | null {
  let clean = ip.trim().toLowerCase();
  if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.slice(1, -1);
  }
  // Strip zone index if present (e.g. fe80::1%eth0)
  const zoneIdx = clean.indexOf('%');
  if (zoneIdx !== -1) {
    clean = clean.slice(0, zoneIdx);
  }

  // Check for embedded IPv4 dotted-decimal at the end (e.g., ::ffff:192.168.0.1 or ::127.0.0.1)
  let embeddedV4Hextets: number[] | null = null;
  const lastColon = clean.lastIndexOf(':');
  if (lastColon !== -1) {
    const possibleV4 = clean.slice(lastColon + 1);
    if (possibleV4.includes('.')) {
      const octets = possibleV4.split('.');
      if (octets.length !== 4) return null;
      const nums = octets.map(o => {
        if (!/^\d+$/.test(o)) return -1;
        const n = Number(o);
        return n >= 0 && n <= 255 ? n : -1;
      });
      if (nums.some(n => n === -1)) return null;
      embeddedV4Hextets = [
        (nums[0] << 8) | nums[1],
        (nums[2] << 8) | nums[3]
      ];
      clean = clean.slice(0, lastColon);
    }
  }

  const doubleColonCount = (clean.match(/::/g) || []).length;
  if (doubleColonCount > 1) return null;

  let leftParts: string[] = [];
  let rightParts: string[] = [];

  if (doubleColonCount === 1) {
    const [left, right] = clean.split('::');
    leftParts = left ? left.split(':') : [];
    rightParts = right ? right.split(':') : [];
  } else {
    leftParts = clean.split(':');
  }

  const neededZeros = 8 - (embeddedV4Hextets ? 2 : 0) - (leftParts.length + rightParts.length);
  if (doubleColonCount === 1 && neededZeros < 0) return null;
  if (doubleColonCount === 0 && (leftParts.length + (embeddedV4Hextets ? 2 : 0)) !== 8) return null;

  const hexRegex = /^[0-9a-f]{1,4}$/;
  const hextets: number[] = [];

  for (const part of leftParts) {
    if (!hexRegex.test(part)) return null;
    hextets.push(parseInt(part, 16));
  }

  if (doubleColonCount === 1) {
    for (let i = 0; i < neededZeros; i++) {
      hextets.push(0);
    }
  }

  for (const part of rightParts) {
    if (!hexRegex.test(part)) return null;
    hextets.push(parseInt(part, 16));
  }

  if (embeddedV4Hextets) {
    hextets.push(...embeddedV4Hextets);
  }

  return hextets.length === 8 ? hextets : null;
}

/**
 * Returns true for private, loopback, link-local, documentation, multicast,
 * and otherwise non-public addresses. Unknown or malformed values fail closed.
 */
export function isPrivateIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return true;
  let normalized = ip.trim().toLowerCase();
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    normalized = normalized.slice(1, -1);
  }
  const zoneIdx = normalized.indexOf('%');
  if (zoneIdx !== -1) {
    normalized = normalized.slice(0, zoneIdx);
  }

  const family = isIP(normalized);
  if (family === 0) {
    // Attempt parsing as IPv6 with embedded IPv4 or standard hextets before failing closed
    const v6Parsed = parseIPv6Hextets(normalized);
    if (!v6Parsed) return true; // fail closed
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

  // IPv6 validation:
  const h = parseIPv6Hextets(normalized);
  if (!h) return true; // fail closed on malformed IPv6

  // 1. Unspecified :: (all zeros)
  if (h.every(val => val === 0)) return true;

  // 2. Loopback ::1
  if (h.slice(0, 7).every(val => val === 0) && h[7] === 1) return true;

  // Helper to test embedded 32-bit IPv4 inside IPv6 hextets
  const testEmbeddedIPv4 = (hi: number, lo: number): boolean => {
    const v4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    return isPrivateIP(v4);
  };

  // 3. IPv4-compatible (::/96) (first 6 hextets 0, e.g. ::7f00:1 or ::127.0.0.1)
  if (h[0] === 0 && h[1] === 0 && h[2] === 0 && h[3] === 0 && h[4] === 0 && h[5] === 0) {
    return testEmbeddedIPv4(h[6], h[7]);
  }

  // 4. IPv4-mapped (::ffff:0:0/96) (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (h[0] === 0 && h[1] === 0 && h[2] === 0 && h[3] === 0 && h[4] === 0 && h[5] === 0xffff) {
    return testEmbeddedIPv4(h[6], h[7]);
  }

  // 5. IPv4-translated (SIIT: ::ffff:0:a.b.c.d)
  if (h[0] === 0 && h[1] === 0 && h[2] === 0 && h[3] === 0 && h[4] === 0xffff && h[5] === 0) {
    return testEmbeddedIPv4(h[6], h[7]);
  }

  // 6. NAT64 Well-Known Prefix (64:ff9b::/96, RFC 6052) & Local-Use Prefix (64:ff9b:1::/48, RFC 8215)
  if (h[0] === 0x0064 && h[1] === 0xff9b) {
    // 64:ff9b:1::/48 is reserved exclusively for local-use IPv4/IPv6 translation (RFC 8215)
    if (h[2] === 0x0001) return true;
    // 64:ff9b::/96 Well-Known Prefix with embedded IPv4 in last 32 bits
    if (h[2] === 0 && h[3] === 0 && h[4] === 0 && h[5] === 0) {
      return testEmbeddedIPv4(h[6], h[7]);
    }
  }

  // 7. 6to4 (2002::/16) - embedded IPv4 in hextets 1 and 2
  if (h[0] === 0x2002) {
    return testEmbeddedIPv4(h[1], h[2]);
  }

  // 8. Unique Local Address (ULA: fc00::/7)
  if ((h[0] & 0xfe00) === 0xfc00) return true;

  // 9. Link-Local Unicast (fe80::/10)
  if ((h[0] & 0xffc0) === 0xfe80) return true;

  // 10. Site-Local (fec0::/10, deprecated but blocked)
  if ((h[0] & 0xffc0) === 0xfec0) return true;

  // 11. Multicast (ff00::/8)
  if ((h[0] & 0xff00) === 0xff00) return true;

  // 12. Documentation (2001:db8::/32)
  if (h[0] === 0x2001 && h[1] === 0x0db8) return true;

  // 13. Orchidv2 (2001:20::/28)
  if (h[0] === 0x2001 && (h[1] & 0xfff0) === 0x0020) return true;

  // 14. Benchmarking (2001:2::/48)
  if (h[0] === 0x2001 && h[1] === 0x0002) return true;

  // 15. Teredo (2001:0000::/32) - last 32 bits are inverted client IPv4
  if (h[0] === 0x2001 && h[1] === 0x0000) {
    const invertedHi = (~h[6]) & 0xffff;
    const invertedLo = (~h[7]) & 0xffff;
    return testEmbeddedIPv4(invertedHi, invertedLo);
  }

  // 16. Discard prefix (100::/64)
  if (h[0] === 0x0100 && h[1] === 0 && h[2] === 0 && h[3] === 0) return true;

  return false;
}
