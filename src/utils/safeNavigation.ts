/**
 * Shared URL validation for every navigation entry point.
 *
 * Navigation is intentionally strict: only HTTP(S) URLs and the browser's
 * exact internal pages are accepted. Callers that accept user text must run it
 * through the search formatter before calling this helper.
 */
export const DANGEROUS_PROTOCOLS = [
  'javascript:', 'data:', 'vbscript:', 'file:', 'blob:',
  'view-source:', 'chrome:', 'edge:', 'devtools:', 'about:config'
];

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
  if (DANGEROUS_PROTOCOLS.some(scheme => normalized.startsWith(scheme))) return false;

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
      if (!['newtab', 'settings', 'history', 'downloads', 'changelog', 'whats-new'].includes(parsed.hostname) ||
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
      'about:newtab',
      'about:changelog',
      'about:whats-new'
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

/* ------------------------------------------------------------------------- *
 * Agent-only destination policy
 * ------------------------------------------------------------------------- */

/**
 * Host suffixes that can only ever mean "this machine" or "this LAN": they are
 * reserved by RFC 6761 / the mDNS spec, or are conventionally resolved to a
 * loopback or link-local address. A public site cannot own one, so refusing them
 * costs the agent nothing and closes a name-based route to the host.
 */
const LOCAL_ONLY_HOST_SUFFIXES = ['.localhost', '.localdomain', '.local'];

/**
 * Strictly canonical dotted quad only. Leading zeros are rejected on purpose:
 * "0177.0.0.1" is an *octal* address (127.0.0.1) to the WHATWG host parser, so
 * reading it as decimal 177.0.0.1 would report a private address as public.
 * WHATWG always hands back canonical decimal, so nothing legitimate is lost.
 */
function parseIPv4Octets(host: string): number[] | null {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^(?:0|[1-9]\d{0,2})$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets;
}

/**
 * Decodes the legacy numeric host forms — decimal (`http://2130706433/`), hex
 * (`http://0x7f000001/`) and octal (`http://0177.0.0.1/`) — that every naive
 * string comparison walks straight past. The WHATWG URL parser already folds
 * these into a dotted quad before we ever see `parsed.hostname`, so this is
 * defence in depth rather than the primary defence: it keeps the policy correct
 * even for a host string that arrives un-normalised.
 */
function parseLegacyNumericHost(host: string): number[] | null {
  const parts = host.split('.');
  if (parts.length < 1 || parts.length > 4) return null;
  const values: number[] = [];
  for (const part of parts) {
    let value: number;
    if (/^0[xX][0-9a-fA-F]+$/.test(part)) value = parseInt(part.slice(2), 16);
    else if (/^0[0-7]+$/.test(part)) value = parseInt(part, 8);
    else if (/^\d+$/.test(part)) value = Number(part);
    else return null;
    if (!Number.isSafeInteger(value) || value < 0) return null;
    values.push(value);
  }

  const asQuad = (quad: number[]): number[] | null => (quad.every(octet => octet <= 255) ? quad : null);

  if (values.length === 1) {
    const combined = values[0];
    if (combined > 0xffffffff) return null;
    return [(combined >>> 24) & 0xff, (combined >>> 16) & 0xff, (combined >>> 8) & 0xff, combined & 0xff];
  }
  // The two- and three-part forms are zero-filled in the *middle*, not the
  // right: the WHATWG host parser reads "127.1" as 127.0.0.1 and "1.2.3" as
  // 1.2.0.3.
  if (values.length === 2) return asQuad([values[0], 0, 0, values[1]]);
  if (values.length === 3) return asQuad([values[0], values[1], 0, values[2]]);
  return asQuad([values[0], values[1], values[2], values[3]]);
}

/** Expands an IPv6 literal into 8 hextets, or null when it is malformed. */
function parseIPv6Hextets(input: string): number[] | null {
  let host = input.trim().toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  const zoneIndex = host.indexOf('%');
  if (zoneIndex !== -1) host = host.slice(0, zoneIndex);

  // A trailing dotted quad (::ffff:192.168.0.1) collapses into the last two hextets.
  const tail: number[] = [];
  const lastColon = host.lastIndexOf(':');
  if (lastColon !== -1 && host.slice(lastColon + 1).includes('.')) {
    const quad = parseIPv4Octets(host.slice(lastColon + 1));
    if (!quad) return null;
    tail.push(((quad[0] << 8) | quad[1]) & 0xffff, ((quad[2] << 8) | quad[3]) & 0xffff);
    host = host.slice(0, lastColon);
  }

  const halves = host.split('::');
  if (halves.length > 2) return null;

  const readGroups = (text: string): number[] | null => {
    if (text === '') return [];
    const groups: number[] = [];
    for (const part of text.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
      groups.push(parseInt(part, 16));
    }
    return groups;
  };

  const head = readGroups(halves[0]);
  if (!head) return null;

  if (halves.length === 1) {
    if (head.length + tail.length !== 8) return null;
    return head.concat(tail);
  }

  const rear = readGroups(halves[1]);
  if (!rear) return null;
  if (head.length + rear.length + tail.length > 7) return null;
  const zeros = new Array<number>(8 - head.length - rear.length - tail.length).fill(0);
  return head.concat(zeros, rear, tail);
}

function isNonPublicIPv4(quad: number[]): boolean {
  const [a, b, c] = quad;
  return (
    a === 0 ||                                    // 0.0.0.0/8 — "this host"
    a === 10 ||                                   // 10.0.0.0/8 private
    a === 127 ||                                  // 127.0.0.0/8 loopback
    (a === 100 && b >= 64 && b <= 127) ||         // 100.64.0.0/10 CGNAT
    (a === 169 && b === 254) ||                   // 169.254.0.0/16 link-local, incl. 169.254.169.254 cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||          // 172.16.0.0/12 private
    (a === 192 && b === 0) ||                     // 192.0.0.0/24 IETF protocol assignments
    (a === 192 && b === 2) ||                     // TEST-NET-1
    (a === 192 && b === 88 && c === 99) ||        // 6to4 relay anycast
    (a === 192 && b === 168) ||                   // 192.168.0.0/16 private
    (a === 198 && (b === 18 || b === 19)) ||      // 198.18.0.0/15 benchmarking
    (a === 198 && b === 51 && c === 100) ||       // TEST-NET-2
    (a === 203 && b === 0 && c === 113) ||        // TEST-NET-3
    a >= 224                                      // multicast, reserved, broadcast
  );
}

function isNonPublicIPv6(hextets: number[]): boolean {
  // Re-enter the IPv4 policy for every prefix that tunnels an IPv4 address, so
  // an IPv6 spelling of 127.0.0.1 / 169.254.169.254 is refused too.
  const embedded = (hi: number, lo: number) => isNonPublicIPv4([(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff]);

  if (hextets.every(value => value === 0)) return true;                 // ::
  if (hextets.slice(0, 7).every(value => value === 0) && hextets[7] === 1) return true; // ::1
  const leadingZero = hextets[0] === 0 && hextets[1] === 0 && hextets[2] === 0
    && hextets[3] === 0 && hextets[4] === 0 && hextets[5] === 0;
  if (leadingZero) return embedded(hextets[6], hextets[7]);              // ::a.b.c.d (IPv4-compatible)
  if (hextets[0] === 0 && hextets[1] === 0 && hextets[2] === 0 && hextets[3] === 0
      && hextets[4] === 0 && hextets[5] === 0xffff) {
    return embedded(hextets[6], hextets[7]);                            // ::ffff:a.b.c.d (IPv4-mapped)
  }
  if (hextets[0] === 0 && hextets[1] === 0 && hextets[2] === 0 && hextets[3] === 0
      && hextets[4] === 0xffff && hextets[5] === 0) {
    return embedded(hextets[6], hextets[7]);                            // ::ffff:0:a.b.c.d (SIIT)
  }
  if (hextets[0] === 0x0064 && hextets[1] === 0xff9b) {                 // NAT64
    if (hextets[2] === 0x0001) return true;                              // 64:ff9b:1::/48 local-use
    if (hextets[2] === 0 && hextets[3] === 0 && hextets[4] === 0 && hextets[5] === 0) {
      return embedded(hextets[6], hextets[7]);                          // 64:ff9b::/96
    }
  }
  if (hextets[0] === 0x2002) return embedded(hextets[1], hextets[2]);   // 2002::/16 6to4
  if ((hextets[0] & 0xfe00) === 0xfc00) return true;                     // fc00::/7 unique-local
  if ((hextets[0] & 0xffc0) === 0xfe80) return true;                     // fe80::/10 link-local
  if ((hextets[0] & 0xffc0) === 0xfec0) return true;                     // fec0::/10 site-local
  if ((hextets[0] & 0xff00) === 0xff00) return true;                     // ff00::/8 multicast
  if (hextets[0] === 0x2001 && hextets[1] === 0x0db8) return true;        // 2001:db8::/32 documentation
  if (hextets[0] === 0x2001 && (hextets[1] & 0xfff0) === 0x0020) return true; // 2001:20::/28 Orchidv2
  if (hextets[0] === 0x2001 && hextets[1] === 0x0002) return true;        // 2001:2::/48 benchmarking
  if (hextets[0] === 0x2001 && hextets[1] === 0x0000) {                  // 2001::/32 Teredo
    return embedded((~hextets[6]) & 0xffff, (~hextets[7]) & 0xffff);
  }
  if (hextets[0] === 0x0100 && hextets[1] === 0 && hextets[2] === 0 && hextets[3] === 0) {
    return true;                                                          // 100::/64 discard-only
  }
  return false;
}

/**
 * True when a hostname cannot be reached over the public internet: an IP
 * literal in a non-public range, or a name reserved for this host/LAN.
 * A DNS name returns false — see the caveat in {@link isSafeAgentNavigationUrl}.
 */
export function isNonPublicHost(rawHost: string): boolean {
  if (!rawHost || typeof rawHost !== 'string') return true;
  let host = rawHost.trim().toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  const zoneIndex = host.indexOf('%');
  if (zoneIndex !== -1) host = host.slice(0, zoneIndex);
  // A fully-qualified name keeps its root dot ("127.0.0.1.").
  while (host.endsWith('.')) host = host.slice(0, -1);
  if (!host) return true; // fail closed

  if (host.includes(':')) {
    const hextets = parseIPv6Hextets(host);
    return hextets ? isNonPublicIPv6(hextets) : true; // fail closed
  }

  const quad = parseIPv4Octets(host) || parseLegacyNumericHost(host);
  if (quad) return isNonPublicIPv4(quad);

  // A host built only from digits and dots was clearly meant as an address, so
  // one that still failed to parse must not fall through to the name branch and
  // be reported as a public site. A real domain name can never be all-numeric
  // (TLDs are alphabetic), so this cannot reject a legitimate target.
  if (/^[0-9.]+$/.test(host)) return true;

  return host === 'localhost' || LOCAL_ONLY_HOST_SUFFIXES.some(suffix => host.endsWith(suffix));
}

/**
 * Stricter navigation check for the AI/MCP agent boundary.
 *
 * WHY THIS IS NOT FOLDED INTO {@link isSafeNavigationUrl}: that predicate guards
 * every user-driven navigation path — omnibox, link clicks, session hydration,
 * restored/persisted tabs, speed dials, bookmark import, the search formatter.
 * Refusing private ranges there would break self-hosted development
 * (http://localhost:3000), intranet browsing, and any private service a real user
 * bookmarked. The agent has no such entitlement: it is driven by text that a web
 * page can author, so "where the human was already going" is not a valid
 * justification for "where the agent is allowed to go".
 *
 * COVERED: loopback, link-local including 169.254.169.254 (cloud metadata),
 * RFC1918 and the other reserved IPv4 ranges, the IPv6 equivalents (::1, ::,
 * fc00::/7, fe80::/10, ff00::/8, and every IPv4-tunnelling prefix such as
 * ::ffff:, NAT64, 6to4 and Teredo), localhost-family names, and the
 * integer/hex/octal host spellings.
 *
 * NOT COVERED: a public name that resolves to a private address — DNS rebinding
 * (and the plain "attacker-controlled domain points at 127.0.0.1" case) can only
 * be closed by resolving the name and checking every returned address at connect
 * time, which needs a main-process resolver hook this renderer-side predicate
 * cannot provide. Treat this as a mitigation, not a complete fix.
 */
export function isSafeAgentNavigationUrl(url: string): boolean {
  if (!isSafeNavigationUrl(url)) return false;

  let parsed: URL;
  try {
    // Re-parsing is deliberate: isSafeNavigationUrl is left untouched so the
    // general policy cannot drift, and WHATWG host normalisation is what turns
    // "2130706433" / "0x7f000001" / "0177.0.0.1" into 127.0.0.1 — the same
    // normalisation the network stack uses when it dials the address.
    parsed = new URL(url);
  } catch {
    return false;
  }

  // Only http(s) is a network destination. The nova:/about: pages the general
  // predicate already blessed are renderer routes with no host to check.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;

  return !isNonPublicHost(parsed.hostname);
}
