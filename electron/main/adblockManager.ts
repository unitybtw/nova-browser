import { app, session } from 'electron';
import path from 'path';
import fs from 'fs';
import fetch from 'cross-fetch';
import { ElectronBlocker, parseFilter } from '@cliqz/adblocker-electron';
import { adsAndTrackingLists } from '@cliqz/adblocker';

let blocker: ElectronBlocker | null = null;
let currentWhitelistFilters: any[] = [];

// Essential CAPTCHA, verification, and critical streaming infrastructure domains that must never be blocked by adblocker
export const CAPTCHA_WHITELIST_RULES = [
  'google.com/recaptcha',
  'gstatic.com/recaptcha',
  'recaptcha.net',
  'challenges.cloudflare.com',
  'hcaptcha.com',
  'newassets.hcaptcha.com',
  'googlevideo.com',
  's.ytimg.com',
  'i.ytimg.com',
  'youtubei.googleapis.com',
  'www.youtube.com',
  'youtube.com',
  'apis.google.com',
  'consent.google.com'
];

export function getBlocker(): ElectronBlocker | null {
  return blocker;
}

// `store-set` accepts a 10 MB string for any non-restricted key, and for
// `adblocker_whitelist` it hands the parsed array straight to this module, which
// runs parseFilter() once per entry plus a WASM matcher rebuild — all
// synchronously, on the main thread, inside the IPC handler. A compromised
// renderer shell (the threat model isTrustedSender already implies) could
// therefore turn one IPC message into a cheap main-thread DoS by shipping a
// million short entries. Bound the list here, before any parseFilter() call.
const MAX_USER_WHITELIST_ENTRIES = 500; // a real user whitelist is < 100
const MAX_WHITELIST_HOST_LENGTH = 253; // RFC 1035 full-name limit

/**
 * A plausible DNS hostname: dot-separated labels of alphanumerics (underscore
 * allowed inside a label, as in service records) that do not start or end with a
 * separator, plus an optional trailing dot. No scheme, no port, no path, no
 * wildcard, no '@'.
 *
 * This has to be strict because the accepted string is pasted into a filter
 * template — `@@||${host}^$document,…` — so a looser pattern would let a
 * renderer-supplied entry rewrite the filter's own syntax rather than merely
 * name a host. It is deliberately applied to USER entries only:
 * CAPTCHA_WHITELIST_RULES is trusted, pre-reviewed data and two of its entries
 * carry a path (`google.com/recaptcha`) that no hostname pattern accepts.
 */
const WHITELIST_HOST_RE =
  /^[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?)*$/;

export function updateAdblockWhitelist(whitelist: string[]): void {
  if (!blocker) return;

  // --- 1. Bound and validate the user list. Nothing below this point can throw
  //        on attacker-controlled input, and no parseFilter() call has happened
  //        yet, so a rejected list costs nothing. ---
  const rawList = Array.isArray(whitelist) ? whitelist : [];
  if (rawList.length > MAX_USER_WHITELIST_ENTRIES) {
    console.warn(
      `[AdBlocker] Whitelist has ${rawList.length} entries; keeping the first ${MAX_USER_WHITELIST_ENTRIES}.`
    );
  }

  const userHosts = new Set<string>();
  let rejected = 0;
  for (const entry of rawList.slice(0, MAX_USER_WHITELIST_ENTRIES)) {
    if (typeof entry !== 'string') { rejected++; continue; }
    // Trim, lowercase and drop a single trailing dot (the FQDN form, which
    // people paste from a URL bar) before testing.
    const host = entry.trim().toLowerCase().replace(/\.$/, '');
    if (!host || host.length > MAX_WHITELIST_HOST_LENGTH || !WHITELIST_HOST_RE.test(host)) {
      rejected++;
      continue;
    }
    userHosts.add(host);
  }
  if (rejected > 0) {
    console.warn(`[AdBlocker] Dropped ${rejected} invalid adblock whitelist entries.`);
  }

  // The built-in CAPTCHA rules are appended AFTER user filtering, never filtered
  // through it. Concatenating trusted rules after a user-supplied list means a
  // malformed or hostile whitelist cannot shrink the set that must never be
  // blocked — filtering the combined list would let a renderer-supplied entry
  // evict `hcaptcha.com` from the blocker's exceptions.
  const combined = Array.from(new Set([...userHosts, ...CAPTCHA_WHITELIST_RULES]));

  // --- 2. Compile the whole replacement set. If this throws, the blocker's
  //        filter state is left exactly as it was (update() is never reached) and
  //        currentWhitelistFilters still describes what is installed, so the next
  //        call removes the same set it thinks it added. ---
  let newFilters: any[];
  try {
    newFilters = combined
      .map(host => parseFilter(`@@||${host}^$document,script,stylesheet,image,subdocument,xmlhttprequest`))
      .filter(Boolean);
  } catch (err) {
    console.warn('[AdBlocker] Failed to compile whitelist filters; keeping the previous filter set:', err);
    return;
  }

  // --- 3. Swap the installed set atomically, and only commit our bookkeeping
  //        once the swap has succeeded — otherwise a throw in update() would
  //        leave us recording filters the blocker no longer holds, and they
  //        could never be removed again. ---
  try {
    blocker.update({
      newNetworkFilters: newFilters as any[],
      removedNetworkFilters: currentWhitelistFilters as any[]
    });
  } catch (err) {
    console.warn('[AdBlocker] Failed to apply whitelist filters; keeping the previous filter set:', err);
    return;
  }

  currentWhitelistFilters = newFilters;
}

export function applyAdBlockerToSession(sess: Electron.Session, enable: boolean): void {
  if (!blocker) return;
  try {
    if (enable) {
      blocker.enableBlockingInSession(sess);
    } else {
      blocker.disableBlockingInSession(sess);
    }
  } catch (e) {
    console.warn(`[AdBlocker] Failed to ${enable ? 'enable' : 'disable'} blocking in session:`, e);
  }
}

export function applyAdBlockerToAllSessions(
  enable: boolean,
  sessions: Electron.Session[]
): void {
  if (!blocker) return;
  for (const sess of sessions) {
    applyAdBlockerToSession(sess, enable);
  }
}

export interface InitAdBlockerOptions {
  userDataPath: string;
  isPrivacyShieldEnabled: () => boolean;
  getAllSessions: () => Electron.Session[];
  onAdBlockedFlush?: (pendingMap: Map<number, number>) => void;
}

export async function initAdBlocker(options: InitAdBlockerOptions): Promise<ElectronBlocker | null> {
  const ADBLOCKER_CACHE_PATH = path.join(options.userDataPath, 'adblocker-engine.cache');
  const ADBLOCKER_CACHE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // refetch filter lists older than 3 days

  try {
    const engine = await ElectronBlocker.fromLists(fetch, adsAndTrackingLists, {
      // Electron 43+ deprecates session.setPreloads/getPreloads which the cosmetic
      // filter injection requires. These deprecated API calls corrupt the renderer's
      // preload startup sequence, causing a completely blank window after update.
      // Disabling cosmetic filters eliminates the deprecated API calls entirely.
      // Network-level ad and tracker blocking (easylist + easyprivacy) is fully preserved.
      loadCosmeticFilters: false,
    }, {
      path: ADBLOCKER_CACHE_PATH,
      read: async (p) => {
        const handle = await fs.promises.open(p, 'r');
        try {
          const stat = await handle.stat();
          if (Date.now() - stat.mtimeMs > ADBLOCKER_CACHE_MAX_AGE_MS) {
            throw new Error('adblocker cache expired');
          }
          return await handle.readFile();
        } finally {
          await handle.close();
        }
      },
      write: async (p, buffer) => {
        try { await fs.promises.writeFile(p, buffer); } catch { /* non-fatal */ }
      },
    });

    // Regardless of whether the engine was loaded from cache or built fresh,
    // force loadCosmeticFilters off. A cached engine serialized with
    // loadCosmeticFilters:true would otherwise still call the deprecated
    // session.setPreloads/getPreloads inside enableBlockingInSession,
    // corrupting the renderer preload sequence and producing a blank window.
    // Use Object.assign to override the readonly typed property at runtime.
    Object.assign(engine.config, { loadCosmeticFilters: false });

    blocker = engine;

    if (options.isPrivacyShieldEnabled()) {
      applyAdBlockerToAllSessions(true, options.getAllSessions());
    }

    const pendingAdBlocks = new Map<number, number>();
    let adBlockFlushTimer: ReturnType<typeof setInterval> | null = null;

    blocker.on('request-blocked', (request: any) => {
      if (request.tabId) {
        pendingAdBlocks.set(request.tabId, (pendingAdBlocks.get(request.tabId) || 0) + 1);

        if (!adBlockFlushTimer) {
          adBlockFlushTimer = setInterval(() => {
            if (pendingAdBlocks.size === 0) {
              if (adBlockFlushTimer) clearInterval(adBlockFlushTimer);
              adBlockFlushTimer = null;
              return;
            }
            if (options.onAdBlockedFlush) {
              try {
                options.onAdBlockedFlush(pendingAdBlocks);
              } catch (e) {
                console.error('[AdBlocker] Error in onAdBlockedFlush:', e);
                pendingAdBlocks.clear();
              }
            } else {
              pendingAdBlocks.clear();
            }
          }, 300);
          adBlockFlushTimer.unref?.();
        }
      }
    });

    console.log('[AdBlocker] Engine initialized successfully');
    return blocker;
  } catch (err) {
    console.error('[AdBlocker] Failed to initialize adblocker engine:', err);
    return null;
  }
}
