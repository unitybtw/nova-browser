import { app, ipcMain } from 'electron';
import fetch from 'cross-fetch';

type TrustedSenderCheck = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) => boolean;

// IPC Handler for Autocomplete Suggestions with Regional Intelligence & In-Memory LRU Cache
const SUGGESTIONS_CACHE_TTL_MS = 15 * 60 * 1000; // entries expire after 15 minutes
const SUGGESTIONS_CACHE_MAX_ENTRIES = 400;
interface SuggestionsCacheEntry { list: string[]; cachedAt: number; }
const suggestionsCache = new Map<string, SuggestionsCacheEntry>();

function getSuggestionsFromCache(cacheKey: string): string[] | null {
  const entry = suggestionsCache.get(cacheKey);
  if (!entry) return null;
  // Expired entries are treated as misses and purged lazily on access
  if (Date.now() - entry.cachedAt > SUGGESTIONS_CACHE_TTL_MS) {
    suggestionsCache.delete(cacheKey);
    return null;
  }
  return entry.list;
}

function cacheSuggestions(cacheKey: string, list: string[]): void {
  // Proper trim: evict oldest-inserted entries until back under the cap
  // (instead of the old drift-prone one-delete-per-insert check)
  while (suggestionsCache.size >= SUGGESTIONS_CACHE_MAX_ENTRIES) {
    const oldestKey = suggestionsCache.keys().next().value;
    if (!oldestKey) break;
    suggestionsCache.delete(oldestKey);
  }
  suggestionsCache.set(cacheKey, { list, cachedAt: Date.now() });
}

function resolveLocaleDetails(clientLocale?: string) {
  const rawLocale = (typeof clientLocale === 'string' && clientLocale.trim())
    ? clientLocale.trim()
    : (app.getLocale() || 'tr-TR');
  const parts = rawLocale.replace('_', '-').split('-');
  const lang = (parts[0] || 'tr').toLowerCase();
  const country = (parts[1] || (lang === 'tr' ? 'tr' : 'us')).toLowerCase();
  const ddgRegion = `${country}-${lang}`;
  const acceptLanguage = `${lang}-${country.toUpperCase()},${lang};q=0.9,en-US;q=0.8,en;q=0.7`;
  return { lang, country, ddgRegion, acceptLanguage };
}

/**
 * Registers the 'get-suggestions' IPC handler. Called once by main.ts
 * (the composition root) with its trusted-sender validator.
 */
export function initSuggestions(isTrustedSender: TrustedSenderCheck): void {
  ipcMain.handle('get-suggestions', async (event, query: string, engine?: string, clientLocale?: string) => {
    if (!isTrustedSender(event)) return [];
    if (!query || typeof query !== 'string') return [];
    const cleanQ = query.trim().slice(0, 512);
    if (!cleanQ) return [];

    const allowedEngines = new Set(['google', 'duckduckgo', 'bing', 'brave', 'ecosia', 'yahoo']);
    const cleanEngine = typeof engine === 'string' && allowedEngines.has(engine) ? engine : 'default';
    const boundedLocale = typeof clientLocale === 'string' ? clientLocale.slice(0, 32) : undefined;
    const { lang, country, ddgRegion, acceptLanguage } = resolveLocaleDetails(boundedLocale);
    const normalizedKey = cleanQ.normalize('NFC').toLowerCase();
    const cacheKey = `${normalizedKey}_${cleanEngine}_${lang}_${country}`;

    const cachedList = getSuggestionsFromCache(cacheKey);
    if (cachedList !== null) {
      return cachedList;
    }

    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

    const fetchGoogle = async (): Promise<string[]> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 650);
      try {
        const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(cleanQ)}&hl=${lang}&gl=${country}`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': userAgent,
            'Accept-Language': acceptLanguage
          }
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
            return data[1].filter((item: any) => typeof item === 'string').slice(0, 8);
          }
        }
      } catch (_) {} finally {
        clearTimeout(timeout);
      }
      return [];
    };

    const fetchDuckDuckGo = async (): Promise<string[]> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 650);
      try {
        const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(cleanQ)}&type=list&kl=${encodeURIComponent(ddgRegion)}`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': userAgent,
            'Accept-Language': acceptLanguage
          }
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
            return data[1].filter((item: any) => typeof item === 'string').slice(0, 8);
          }
        }
      } catch (_) {} finally {
        clearTimeout(timeout);
      }
      return [];
    };

    const fetchBing = async (): Promise<string[]> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 650);
      try {
        const market = `${lang}-${country.toUpperCase()}`;
        const url = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(cleanQ)}&setlang=${lang}&setmkt=${market}`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': userAgent,
            'Accept-Language': acceptLanguage
          }
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
            return data[1].filter((item: any) => typeof item === 'string').slice(0, 8);
          }
        }
      } catch (_) {} finally {
        clearTimeout(timeout);
      }
      return [];
    };

    const fetchBrave = async (): Promise<string[]> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 650);
      try {
        const url = `https://search.brave.com/api/suggest?q=${encodeURIComponent(cleanQ)}&rich=false`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': userAgent,
            'Accept-Language': acceptLanguage
          }
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
            return data[1].filter((item: any) => typeof item === 'string').slice(0, 8);
          }
        }
      } catch (_) {} finally {
        clearTimeout(timeout);
      }
      return [];
    };

    let providers = [fetchGoogle, fetchDuckDuckGo, fetchBing];
    if (cleanEngine === 'duckduckgo') {
      providers = [fetchDuckDuckGo, fetchGoogle, fetchBing];
    } else if (cleanEngine === 'bing') {
      providers = [fetchBing, fetchGoogle, fetchDuckDuckGo];
    } else if (cleanEngine === 'brave') {
      providers = [fetchBrave, fetchGoogle, fetchDuckDuckGo];
    }

    // ⚡ Perf + 🔒 Privacy: Fast staggered fallback to keep latency ultra-low.
    // Resolve as soon as results are usable: if any provider already returned
    // non-empty results and nothing is in flight, cancel pending stagger timers
    // instead of waiting them out (they only exist to probe fallbacks when we
    // have NO answer yet). Keeps the guaranteed ≥300ms floor off the happy path.
    const FALLBACK_STAGGER_MS = 150;
    const resultsByPriority = new Map<number, string[]>();
    let anyNonEmpty = false;
    let activeRuns = 0;
    let scheduledStarts = providers.length - 1;
    const staggerTimers: ReturnType<typeof setTimeout>[] = [];

    let allSettledResolve: () => void;
    let settled = false; // late provider resolutions after settle are ignored
    const allSettled = new Promise<void>((resolve) => {
      allSettledResolve = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
    });
    const maybeAllSettled = () => {
      if (activeRuns > 0) return;
      if (anyNonEmpty || scheduledStarts === 0) {
        staggerTimers.forEach(clearTimeout);
        scheduledStarts = 0;
        allSettledResolve();
      }
    };

    const runProvider = (idx: number) => {
      activeRuns++;
      providers[idx]()
        .then((list) => {
          resultsByPriority.set(idx, Array.isArray(list) ? list : []);
          if (resultsByPriority.get(idx)!.length > 0) anyNonEmpty = true;
        })
        .catch(() => {})
        .finally(() => {
          activeRuns--;
          maybeAllSettled();
        });
    };

    runProvider(0);
    for (let i = 1; i < providers.length; i++) {
      staggerTimers.push(
        setTimeout(() => {
          scheduledStarts--;
          // Privacy: skip lower-priority engines entirely once we have an answer.
          if (!anyNonEmpty) runProvider(i);
          else maybeAllSettled();
        }, FALLBACK_STAGGER_MS * i)
      );
    }

    await allSettled;
    staggerTimers.forEach(clearTimeout);

    for (let i = 0; i < providers.length; i++) {
      const list = resultsByPriority.get(i);
      if (list && list.length > 0) {
        cacheSuggestions(cacheKey, list);
        return list;
      }
    }

    return [];
  });
}
