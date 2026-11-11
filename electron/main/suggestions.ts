import { app, ipcMain } from 'electron';
import fetch from 'cross-fetch';

type TrustedSenderCheck = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) => boolean;

// IPC Handler for Autocomplete Suggestions with Regional Intelligence & In-Memory LRU Cache
const SUGGESTIONS_CACHE_TTL_MS = 15 * 60 * 1000; // entries expire after 15 minutes
const SUGGESTIONS_CACHE_MAX_ENTRIES = 400;
interface SuggestionsCacheEntry { list: string[]; cachedAt: number; }
const suggestionsCache = new Map<string, SuggestionsCacheEntry>();

let googleRateLimitUntil = 0;

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

// Script detection regexes to eliminate irrelevant foreign alphabets when not typed
const SCRIPT_CYRILLIC = /[\u0400-\u04FF]/;
const SCRIPT_ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const SCRIPT_CJK = /[\u4E00-\u9FFF\u3040-\u30FF\u31F0-\u31FF\uAC00-\uD7AF]/;
const SCRIPT_THAI = /[\u0E00-\u0E7F]/;
const SCRIPT_HEBREW = /[\u0590-\u05FF]/;
const SCRIPT_DEVANAGARI = /[\u0900-\u097F]/;
const SCRIPT_GREEK = /[\u0370-\u03FF]/;
const TURKISH_CHARS = /[çğışöüÇĞİŞÖÜ]/;

export function isSuggestionScriptCompatible(query: string, suggestion: string): boolean {
  if (!suggestion || typeof suggestion !== 'string') return false;
  const trimmed = suggestion.trim();
  if (!trimmed) return false;

  // Purge incompatible foreign alphabets unless the query explicitly contains them
  if (!SCRIPT_CYRILLIC.test(query) && SCRIPT_CYRILLIC.test(trimmed)) return false;
  if (!SCRIPT_ARABIC.test(query) && SCRIPT_ARABIC.test(trimmed)) return false;
  if (!SCRIPT_CJK.test(query) && SCRIPT_CJK.test(trimmed)) return false;
  if (!SCRIPT_THAI.test(query) && SCRIPT_THAI.test(trimmed)) return false;
  if (!SCRIPT_HEBREW.test(query) && SCRIPT_HEBREW.test(trimmed)) return false;
  if (!SCRIPT_DEVANAGARI.test(query) && SCRIPT_DEVANAGARI.test(trimmed)) return false;
  if (!SCRIPT_GREEK.test(query) && SCRIPT_GREEK.test(trimmed)) return false;

  return true;
}

export function sanitizeSuggestions(query: string, rawList: unknown): string[] {
  if (!Array.isArray(rawList)) return [];
  const seen = new Set<string>();
  const cleanResults: string[] = [];

  for (const item of rawList) {
    if (typeof item !== 'string') continue;
    const stripped = item.replace(/<[^>]*>/g, '').trim();
    if (!stripped) continue;

    if (!isSuggestionScriptCompatible(query, stripped)) continue;

    const lower = stripped.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    cleanResults.push(stripped);
    if (cleanResults.length >= 8) break;
  }
  return cleanResults;
}

// Language -> country mapping for engines that key off a bare country code.
// Without an entry we fall back to the locale's region, then to "tr".
const DEFAULT_COUNTRY_BY_LANG: Record<string, string> = {
  tr: 'tr',
  de: 'de',
  ar: 'sa',
  en: 'us',
  fr: 'fr',
  es: 'es',
  it: 'it',
  nl: 'nl',
  ru: 'ru',
  ja: 'jp',
  ko: 'kr',
  zh: 'cn',
  pt: 'br',
};

/** Normalises a locale into a lowercase ISO-3166 country code. */
function normalizeCountry(raw: string | undefined, lang: string): string {
  const candidate = (raw || '').trim().toLowerCase();
  if (/^[a-z]{2}$/.test(candidate)) return candidate;
  return DEFAULT_COUNTRY_BY_LANG[lang] || 'tr';
}

function braveCountryFor(lang: string, country: string): string {
  return normalizeCountry(country, lang).toUpperCase();
}

function resolveLocaleDetails(clientLocale?: string, query?: string) {
  const hasTurkishChars = query ? TURKISH_CHARS.test(query) : false;

  let rawLocale = (typeof clientLocale === 'string' && clientLocale.trim())
    ? clientLocale.trim()
    : '';

  const sysLocale = (app.getLocale() || '').trim();
  const envLang = (process.env.LANG || '').toLowerCase();
  const isSystemTurkish = sysLocale.toLowerCase().includes('tr') || envLang.includes('tr');

  if (hasTurkishChars) {
    rawLocale = 'tr-TR';
  } else if (!rawLocale || rawLocale === 'en-US') {
    if (isSystemTurkish) {
      rawLocale = 'tr-TR';
    } else if (sysLocale) {
      rawLocale = sysLocale;
    } else {
      rawLocale = 'tr-TR';
    }
  }

  const parts = rawLocale.replace('_', '-').split('-');
  const rawLang = (parts[0] || '').toLowerCase();
  let lang = /^[a-z]{2,3}$/.test(rawLang) ? rawLang : 'tr';
  let country = normalizeCountry(parts[1], lang);

  if (rawLocale.toLowerCase().includes('tr') || isSystemTurkish || hasTurkishChars) {
    country = 'tr';
    if (hasTurkishChars || isSystemTurkish) {
      lang = 'tr';
    }
  }

  const ddgRegion = country === 'tr' ? 'tr-tr' : `${country}-${lang}`;
  const acceptLanguage = country === 'tr'
    ? 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
    : `${lang}-${country.toUpperCase()},${lang};q=0.9,en-US;q=0.8,en;q=0.7`;
  return { lang, country, ddgRegion, acceptLanguage };
}

interface ActiveSuggestionJob {
  sequenceId: number;
  queryAbortController: AbortController;
  staggerTimers: ReturnType<typeof setTimeout>[];
  allSettledResolve: () => void;
}

const activeJobsBySender = new Map<number, ActiveSuggestionJob>();

function cancelSenderJob(senderId: number, sequenceId?: number): void {
  const job = activeJobsBySender.get(senderId);
  if (!job) return;
  if (sequenceId === undefined || job.sequenceId <= sequenceId) {
    job.queryAbortController.abort();
    job.staggerTimers.forEach(clearTimeout);
    job.allSettledResolve();
    activeJobsBySender.delete(senderId);
  }
}

/**
 * Registers the 'get-suggestions' and 'cancel-suggestions' IPC handlers. Called once by main.ts
 * (the composition root) with its trusted-sender validator.
 */
export function initSuggestions(isTrustedSender: TrustedSenderCheck): void {
  ipcMain.on('cancel-suggestions', (event, sequenceId?: number) => {
    if (!isTrustedSender(event)) return;
    cancelSenderJob(event.sender.id, sequenceId);
  });

  ipcMain.handle('get-suggestions', async (event, query: string, engine?: string, clientLocale?: string, sequenceId?: number) => {
    if (!isTrustedSender(event)) return [];
    if (!query || typeof query !== 'string') return [];
    const cleanQ = query.trim().slice(0, 512);
    if (!cleanQ) return [];

    const senderId = event.sender.id;
    // Disarm any previously in-flight query job for this sender
    cancelSenderJob(senderId);

    const allowedEngines = new Set(['google', 'duckduckgo', 'bing', 'brave', 'ecosia', 'yahoo']);
    const cleanEngine = typeof engine === 'string' && allowedEngines.has(engine) ? engine : 'default';
    const boundedLocale = typeof clientLocale === 'string' ? clientLocale.slice(0, 32) : undefined;
    const { lang, country, ddgRegion, acceptLanguage } = resolveLocaleDetails(boundedLocale, cleanQ);
    const normalizedKey = cleanQ.normalize('NFC').toLowerCase();
    const cacheKey = `${normalizedKey}_${cleanEngine}_${lang}_${country}`;

    const cachedList = getSuggestionsFromCache(cacheKey);
    if (cachedList !== null) {
      return cachedList;
    }

    const queryAbortController = new AbortController();
    const querySignal = queryAbortController.signal;

    const chromeVer = process.versions.chrome || '134.0.0.0';
    const userAgent = process.platform === 'win32'
      ? `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`
      : process.platform === 'linux'
      ? `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`
      : `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;

    const PROVIDER_TIMEOUT_MS = 3_000;
    const createProviderFetch = (fetchImpl: (signal: AbortSignal) => Promise<string[]>) => {
      return async (): Promise<string[]> => {
        if (querySignal.aborted) return [];
        const controller = new AbortController();
        const onQueryAbort = () => controller.abort();
        querySignal.addEventListener('abort', onQueryAbort, { once: true });
        const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
        try {
          return await fetchImpl(controller.signal);
        } catch (_) {
          return [];
        } finally {
          clearTimeout(timeout);
          querySignal.removeEventListener('abort', onQueryAbort);
        }
      };
    };

    const fetchGoogle = createProviderFetch(async (signal) => {
      if (Date.now() < googleRateLimitUntil) {
        return [];
      }
      const chromeMajor = chromeVer.split('.')[0] || '134';
      const platformName = process.platform === 'win32' ? '"Windows"' : process.platform === 'linux' ? '"Linux"' : '"macOS"';
      const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(cleanQ)}&hl=${encodeURIComponent(lang)}&gl=${encodeURIComponent(country)}`;
      const res = await fetch(url, {
        signal,
        headers: {
          'User-Agent': userAgent,
          'Accept-Language': acceptLanguage,
          'sec-ch-ua': `"Not/A)Brand";v="8", "Chromium";v="${chromeMajor}", "Google Chrome";v="${chromeMajor}"`,
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': platformName,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site'
        }
      });
      if (res.status === 429 || res.status === 403) {
        googleRateLimitUntil = Date.now() + 60_000;
        return [];
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
          return sanitizeSuggestions(cleanQ, data[1]);
        }
      }
      return [];
    });

    const fetchDuckDuckGo = createProviderFetch(async (signal) => {
      const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(cleanQ)}&type=list&kl=${encodeURIComponent(ddgRegion)}`;
      const res = await fetch(url, {
        signal,
        headers: {
          'User-Agent': userAgent,
          'Accept-Language': acceptLanguage
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
          return sanitizeSuggestions(cleanQ, data[1]);
        }
      }
      return [];
    });

    const fetchBing = createProviderFetch(async (signal) => {
      const market = `${lang}-${country.toUpperCase()}`;
      const url = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(cleanQ)}&setlang=${encodeURIComponent(lang)}&setmkt=${encodeURIComponent(market)}`;
      const res = await fetch(url, {
        signal,
        headers: {
          'User-Agent': userAgent,
          'Accept-Language': acceptLanguage
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
          return sanitizeSuggestions(cleanQ, data[1]);
        }
      }
      return [];
    });

    const fetchBrave = createProviderFetch(async (signal) => {
      const braveCountry = braveCountryFor(lang, country);
      const url = `https://search.brave.com/api/suggest?q=${encodeURIComponent(cleanQ)}&rich=false&country=${encodeURIComponent(braveCountry)}`;
      const res = await fetch(url, {
        signal,
        headers: {
          'User-Agent': userAgent,
          'Accept-Language': acceptLanguage
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
          return sanitizeSuggestions(cleanQ, data[1]);
        }
      }
      return [];
    });

    const fetchEcosia = createProviderFetch(async (signal) => {
      const url = `https://ac.ecosia.org/autocomplete?q=${encodeURIComponent(cleanQ)}&type=list&locale=${encodeURIComponent(`${lang}-${country.toUpperCase()}`)}`;
      const res = await fetch(url, {
        signal,
        headers: {
          'User-Agent': userAgent,
          'Accept-Language': acceptLanguage
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
          return sanitizeSuggestions(cleanQ, data[1]);
        }
      }
      return [];
    });

    const fetchYahoo = createProviderFetch(async (signal) => {
      const url = `https://search.yahoo.com/sugg/os?command=${encodeURIComponent(cleanQ)}&output=fxjson&lc=${encodeURIComponent(`${lang}-${country.toUpperCase()}`)}&vl=lang_${encodeURIComponent(lang)}`;
      const res = await fetch(url, {
        signal,
        headers: {
          'User-Agent': userAgent,
          'Accept-Language': acceptLanguage
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
          return sanitizeSuggestions(cleanQ, data[1]);
        } else if (data && typeof data === 'object' && Array.isArray((data as any).gossip?.results)) {
          const items = (data as any).gossip.results.map((r: any) => r?.key).filter(Boolean);
          return sanitizeSuggestions(cleanQ, items);
        }
      }
      return [];
    });

    let providers = [fetchGoogle, fetchDuckDuckGo, fetchBing];
    if (cleanEngine === 'duckduckgo') {
      providers = [fetchDuckDuckGo, fetchGoogle, fetchBing];
    } else if (cleanEngine === 'bing') {
      providers = [fetchBing, fetchGoogle, fetchDuckDuckGo];
    } else if (cleanEngine === 'brave') {
      providers = [fetchBrave, fetchGoogle, fetchDuckDuckGo];
    } else if (cleanEngine === 'ecosia') {
      providers = [fetchEcosia, fetchDuckDuckGo, fetchGoogle];
    } else if (cleanEngine === 'yahoo') {
      providers = [fetchYahoo, fetchGoogle, fetchBing];
    }

    const FALLBACK_STAGGER_MS = 150;
    const resultsByPriority = new Map<number, string[]>();
    let anyNonEmpty = false;
    let activeRuns = 0;
    let scheduledStarts = providers.length - 1;
    const staggerTimers: ReturnType<typeof setTimeout>[] = [];

    let allSettledResolve!: () => void;
    let settled = false;
    const allSettled = new Promise<void>((resolve) => {
      allSettledResolve = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
    });

    querySignal.addEventListener('abort', () => {
      staggerTimers.forEach(clearTimeout);
      allSettledResolve();
    }, { once: true });

    const maybeAllSettled = () => {
      if (activeRuns > 0) return;
      if (anyNonEmpty || scheduledStarts === 0 || querySignal.aborted) {
        staggerTimers.forEach(clearTimeout);
        scheduledStarts = 0;
        allSettledResolve();
      }
    };

    const runProvider = (idx: number) => {
      if (querySignal.aborted) return;
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

    activeJobsBySender.set(senderId, {
      sequenceId: sequenceId ?? 0,
      queryAbortController,
      staggerTimers,
      allSettledResolve,
    });

    runProvider(0);
    for (let i = 1; i < providers.length; i++) {
      staggerTimers.push(
        setTimeout(() => {
          scheduledStarts--;
          if (!anyNonEmpty && !querySignal.aborted) runProvider(i);
          else maybeAllSettled();
        }, FALLBACK_STAGGER_MS * i)
      );
    }

    try {
      await allSettled;
    } finally {
      staggerTimers.forEach(clearTimeout);
      if (activeJobsBySender.get(senderId)?.queryAbortController === queryAbortController) {
        activeJobsBySender.delete(senderId);
      }
    }

    if (querySignal.aborted) {
      return [];
    }

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
