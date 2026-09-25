import { app, session } from 'electron';
import path from 'path';
import fs from 'fs';
import fetch from 'cross-fetch';
import { ElectronBlocker, parseFilter } from '@cliqz/adblocker-electron';

let blocker: ElectronBlocker | null = null;
let currentWhitelistFilters: any[] = [];

// Essential CAPTCHA & verification domains that must never be blocked by adblocker
export const CAPTCHA_WHITELIST_RULES = [
  'google.com/recaptcha',
  'gstatic.com/recaptcha',
  'recaptcha.net',
  'challenges.cloudflare.com',
  'hcaptcha.com',
  'newassets.hcaptcha.com'
];

export function getBlocker(): ElectronBlocker | null {
  return blocker;
}

export function updateAdblockWhitelist(whitelist: string[]): void {
  if (!blocker) return;
  const userList = Array.isArray(whitelist) ? whitelist : [];
  const combined = Array.from(new Set([...userList, ...CAPTCHA_WHITELIST_RULES]));
  const cleanWhitelist = combined
    .filter(host => typeof host === 'string' && /^[a-zA-Z0-9.\-_/]+$/.test(host.trim()))
    .map(host => host.trim().toLowerCase());
  const newFilters = cleanWhitelist
    .map(host => parseFilter(`@@||${host}^$document,script,stylesheet,image,subdocument,xmlhttprequest`))
    .filter(Boolean);

  blocker.update({
    newNetworkFilters: newFilters as any[],
    removedNetworkFilters: currentWhitelistFilters as any[]
  });

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
    const engine = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
      path: ADBLOCKER_CACHE_PATH,
      read: async (p) => {
        const stat = await fs.promises.stat(p);
        if (Date.now() - stat.mtimeMs > ADBLOCKER_CACHE_MAX_AGE_MS) {
          throw new Error('adblocker cache expired');
        }
        return fs.promises.readFile(p);
      },
      write: async (p, buffer) => {
        try { await fs.promises.writeFile(p, buffer); } catch { /* non-fatal */ }
      },
    });

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
              options.onAdBlockedFlush(pendingAdBlocks);
            }
          }, 300);
        }
      }
    });

    console.log('[AdBlocker] Engine initialized successfully with offline cache');
    return blocker;
  } catch (err) {
    console.error('[AdBlocker] Failed to initialize adblocker engine:', err);
    return null;
  }
}
