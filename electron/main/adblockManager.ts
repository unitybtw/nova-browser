import electron from 'electron';
import path from 'path';
import fs from 'fs';
import fetch from 'cross-fetch';
import { ElectronBlocker, parseFilter } from '@cliqz/adblocker-electron';
import { adsAndTrackingLists } from '@cliqz/adblocker';
import {
  CAPTCHA_WHITELIST_RULES,
  sanitizeUserWhitelistHosts,
  isHostInUserWhitelist,
  isUrlInUserWhitelist,
} from '../../src/utils/adblockUtils.js';

export {
  CAPTCHA_WHITELIST_RULES,
  sanitizeUserWhitelistHosts,
  isHostInUserWhitelist,
  isUrlInUserWhitelist,
};

let blocker: ElectronBlocker | null = null;
let currentWhitelistFilterIds = new Set<number>();
let userWhitelistHosts = new Set<string>();
let pendingWhitelist: string[] | null = null;

export function getBlocker(): ElectronBlocker | null {
  return blocker;
}

export function getUserWhitelistHosts(): ReadonlySet<string> {
  return userWhitelistHosts;
}

export function updateAdblockWhitelist(whitelist: string[]): void {
  const sanitizedHosts = sanitizeUserWhitelistHosts(whitelist);
  userWhitelistHosts = sanitizedHosts;

  if (!blocker) {
    pendingWhitelist = Array.from(sanitizedHosts);
    return;
  }
  pendingWhitelist = null;

  // --- 2. Compile the replacement set:
  //        - For each user-whitelisted domain `host`:
  //          a) `@@||*$domain=${host}` allows third-party and first-party requests
  //             initiated when the page/source domain is `${host}` or its subdomains.
  //          b) `@@||${host}^` allows direct requests targeting `${host}` or its subdomains.
  //        - For each built-in CAPTCHA/verification rule:
  //          `@@||${rule}^$script,stylesheet,image,subdocument,xmlhttprequest`
  let compiledFilters: any[];
  try {
    const rawFilters: any[] = [];
    for (const host of sanitizedHosts) {
      const domainFilter = parseFilter(`@@||*$domain=${host}`);
      const hostFilter = parseFilter(`@@||${host}^`);
      if (domainFilter) rawFilters.push(domainFilter);
      if (hostFilter) rawFilters.push(hostFilter);
    }
    for (const rule of CAPTCHA_WHITELIST_RULES) {
      const captchaFilter = parseFilter(`@@||${rule}^$script,stylesheet,image,subdocument,xmlhttprequest`);
      if (captchaFilter) rawFilters.push(captchaFilter);
    }

    const byId = new Map<number, any>();
    for (const f of rawFilters) {
      if (f && typeof f.getId === 'function') {
        byId.set(f.getId(), f);
      }
    }
    compiledFilters = Array.from(byId.values());
  } catch (err) {
    console.warn('[AdBlocker] Failed to compile whitelist filters; keeping the previous filter set:', err);
    return;
  }

  // --- 3. Diff against `currentWhitelistFilterIds` using numeric `filter.getId()`
  //        values. `@cliqz/adblocker` expects `removedNetworkFilters: number[]`
  //        (not NetworkFilter objects) and evicts any filter ID passed in
  //        `removedNetworkFilters` even if also present in `newNetworkFilters`.
  const nextFilterIds = new Set<number>(compiledFilters.map(f => f.getId()));
  const toAdd = compiledFilters.filter(f => !currentWhitelistFilterIds.has(f.getId()));
  const toRemove = Array.from(currentWhitelistFilterIds).filter(id => !nextFilterIds.has(id));

  if (toAdd.length === 0 && toRemove.length === 0) {
    return;
  }

  try {
    blocker.update({
      newNetworkFilters: toAdd,
      removedNetworkFilters: toRemove
    });
  } catch (err) {
    console.warn('[AdBlocker] Failed to apply whitelist filters; keeping the previous filter set:', err);
    return;
  }

  currentWhitelistFilterIds = nextFilterIds;
}

export function applyAdBlockerToSession(
  sess: Electron.Session,
  enable: boolean,
  onAfterChange?: (sess: Electron.Session) => void
): void {
  if (!blocker) return;
  try {
    const isCurrentlyEnabled = blocker.isBlockingEnabled(sess);
    if (enable && !isCurrentlyEnabled) {
      blocker.enableBlockingInSession(sess);
      onAfterChange?.(sess);
    } else if (!enable && isCurrentlyEnabled) {
      blocker.disableBlockingInSession(sess);
      onAfterChange?.(sess);
    }
  } catch (e) {
    console.warn(`[AdBlocker] Failed to ${enable ? 'enable' : 'disable'} blocking in session:`, e);
  }
}

export function applyAdBlockerToAllSessions(
  enable: boolean,
  sessions: Electron.Session[],
  onAfterChange?: (sess: Electron.Session) => void
): void {
  if (!blocker) return;
  for (const sess of sessions) {
    applyAdBlockerToSession(sess, enable, onAfterChange);
  }
}

export interface InitAdBlockerOptions {
  userDataPath: string;
  isPrivacyShieldEnabled: () => boolean;
  getAllSessions: () => Electron.Session[];
  onAdBlockedFlush?: (pendingMap: Map<number, number>) => void;
  onAfterSessionStateChange?: (sess: Electron.Session) => void;
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

    // Wrap onBeforeRequest / onHeadersReceived so that when a tab's top-level
    // page URL (or referrer/destination URL) is on a user-whitelisted domain,
    // every subrequest in that tab (including nested 3rd-party iframes and
    // Referrer-Policy: no-referrer requests) is bypassed without firing
    // request-blocked.
    const isDetailsWhitelistedByUser = (details: any): boolean => {
      if (userWhitelistHosts.size === 0) return false;
      if (isUrlInUserWhitelist(details?.referrer, userWhitelistHosts) || isUrlInUserWhitelist(details?.url, userWhitelistHosts)) {
        return true;
      }
      try {
        const wcModule = (electron as any)?.webContents;
        const wc = details?.webContents || (typeof details?.webContentsId === 'number' && typeof wcModule?.fromId === 'function' ? wcModule.fromId(details.webContentsId) : null);
        if (wc && typeof wc.isDestroyed === 'function' && !wc.isDestroyed() && typeof wc.getURL === 'function') {
          const topUrl = wc.getURL();
          if (isUrlInUserWhitelist(topUrl, userWhitelistHosts)) return true;
        }
      } catch {
        // Ignore destroyed webContents lookup
      }
      return false;
    };

    const originalOnBeforeRequest = engine.onBeforeRequest;
    engine.onBeforeRequest = (details: any, callback: any) => {
      if (isDetailsWhitelistedByUser(details)) {
        callback({});
        return;
      }
      return originalOnBeforeRequest(details, callback);
    };

    const originalOnHeadersReceived = engine.onHeadersReceived;
    engine.onHeadersReceived = (details: any, callback: any) => {
      if (isDetailsWhitelistedByUser(details)) {
        callback({});
        return;
      }
      return originalOnHeadersReceived(details, callback);
    };

    blocker = engine;
    currentWhitelistFilterIds = new Set<number>();
    updateAdblockWhitelist(pendingWhitelist ?? Array.from(userWhitelistHosts));

    if (options.isPrivacyShieldEnabled()) {
      applyAdBlockerToAllSessions(true, options.getAllSessions(), options.onAfterSessionStateChange);
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
