import { lookup as dnsLookup } from 'dns/promises';
import { isPrivateIP } from './ipAddress';

/**
 * Connect-time destination check for AI/MCP agent navigation.
 *
 * The renderer-side `isSafeAgentNavigationUrl` in `src/utils/safeNavigation.ts`
 * closes IP literals in every non-public range, but a public DNS name can still
 * resolve to a private address — the classic DNS-rebinding / "attacker domain
 * points at 127.0.0.1" case. Only the main process can resolve a name, so the
 * second layer lives here and mirrors the existing `open-external` DNS pin.
 *
 * The resolver is injected so the policy is testable without touching real DNS.
 */

export type LookupFn = (
  host: string
) => Promise<Array<{ address: string; family?: number }>>;

export interface HostVerdict {
  allowed: boolean;
  reason: string;
}

const LOOKUP_TIMEOUT_MS = 3000;

/** Normalise a URL host for lookup: strips brackets, IPv6 zones and the root dot. */
export function normaliseLookupHost(rawHost: string): string | null {
  if (!rawHost || typeof rawHost !== 'string') return null;
  let host = rawHost.trim().toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  const zone = host.indexOf('%');
  if (zone !== -1) host = host.slice(0, zone);
  while (host.endsWith('.')) host = host.slice(0, -1);
  return host || null;
}

/**
 * Every resolved address must be public. A single private answer rejects the
 * host: an attacker who controls a name can publish one public and one private
 * address, and which one Chromium picks is not ours to decide.
 */
export function classifyResolvedAddresses(entries: Array<{ address?: string } | string>): HostVerdict {
  const list = Array.isArray(entries) ? entries : [];
  if (list.length === 0) {
    return { allowed: false, reason: 'the hostname did not resolve to any address' };
  }
  for (const entry of list) {
    const address = typeof entry === 'string' ? entry : entry?.address;
    if (typeof address !== 'string' || address.length === 0) {
      return { allowed: false, reason: 'a DNS answer had no address' };
    }
    // `isPrivateIP` fails closed for anything it cannot parse, so an exotic
    // answer shape is treated as non-public rather than waved through.
    if (isPrivateIP(address)) {
      return { allowed: false, reason: `it resolves to the non-public address ${address}` };
    }
  }
  return { allowed: true, reason: '' };
}

/**
 * Resolve `host` and report whether the agent may be pointed at it.
 * Fails closed: a timeout, an empty answer, or a resolver error all refuse.
 */
export async function isAgentNavigationHostPublic(
  rawUrl: string,
  lookup: LookupFn = async (host) => (await dnsLookup(host, { all: true })) as unknown as Array<{ address: string; family?: number }>
): Promise<HostVerdict> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: 'the destination is not a valid URL' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { allowed: false, reason: `the scheme ${parsed.protocol} is not navigable` };
  }

  const host = normaliseLookupHost(parsed.hostname);
  if (!host) return { allowed: false, reason: 'the destination has no hostname' };

  // An IP literal needs no resolution; the renderer already refused the
  // non-public ones, and re-checking here keeps the decision in one place.
  if (/^[0-9.]+$/.test(host) || host.includes(':')) {
    return isPrivateIP(host)
      ? { allowed: false, reason: `${host} is a non-public address` }
      : { allowed: true, reason: '' };
  }

  let entries: Array<{ address: string; family?: number }>;
  let timer: NodeJS.Timeout | undefined;
  try {
    const lookupPromise = lookup(host);
    lookupPromise.catch(() => {});
    entries = await Promise.race([
      lookupPromise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('DNS lookup timeout')), LOOKUP_TIMEOUT_MS);
      }),
    ]);
  } catch (err: any) {
    return {
      allowed: false,
      reason: `DNS resolution failed (${err?.message || 'unknown error'})`
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
  return classifyResolvedAddresses(entries);
}
