// Only English is bundled. The other three dictionaries cost ~31KB together and
// exactly one is ever active, so they are fetched on demand and the first paint
// waits for the right one (see ensureLanguageLoaded) rather than flashing English.
// English stays static so a missing/failed chunk always has a working fallback.
import en from '../locales/en.json';
import { useState, useEffect } from 'react';
import { safeParseObjectWithBackup } from '../utils/safeStorage';

export type SupportedLanguage = 'en' | 'tr' | 'ar' | 'de';

type Dictionary = Record<string, any>;

const dictionaries: Partial<Record<SupportedLanguage, Dictionary>> = { en };
/** In-flight loads, so N callers asking for `tr` share one chunk request. */
const loading = new Map<SupportedLanguage, Promise<void>>();

const LOADERS: Record<Exclude<SupportedLanguage, 'en'>, () => Promise<Dictionary>> = {
  tr: () => import('../locales/tr.json').then(m => (m.default ?? m) as unknown as Dictionary),
  de: () => import('../locales/de.json').then(m => (m.default ?? m) as unknown as Dictionary),
  ar: () => import('../locales/ar.json').then(m => (m.default ?? m) as unknown as Dictionary),
};

/**
 * Load a dictionary if it is not present yet. Idempotent and safe to call on a
 * language that is already static.
 */
export function ensureLanguageLoaded(lang: SupportedLanguage): Promise<void> {
  if (dictionaries[lang]) return Promise.resolve();
  const existing = loading.get(lang);
  if (existing) return existing;
  const loader = LOADERS[lang as Exclude<SupportedLanguage, 'en'>];
  const task = loader()
    .then((dict: Dictionary) => { dictionaries[lang] = dict; })
    .catch((err: unknown) => {
      // A failed chunk must not wedge the app in English forever: drop the
      // in-flight marker so a later call can retry, and let the caller fall
      // back to English.
      console.warn(`[i18n] Failed to load the "${lang}" dictionary; falling back to English.`, err);
    })
    .finally(() => { loading.delete(lang); });
  loading.set(lang, task);
  return task;
}

/**
 * Install a dictionary that is already in hand.
 *
 * The on-demand path is `ensureLanguageLoaded`, which fetches a chunk. This is
 * for a caller that already holds the JSON - a prefetch that resolved before the
 * first render, or a test that wants the loading policy under test without the
 * timing. It is deliberately synchronous so callers do not have to become async
 * to have strings available.
 */
export function seedDictionary(lang: SupportedLanguage, dict: Dictionary): void {
  dictionaries[lang] = dict;
  loading.delete(lang);
}

/** True when the active language's strings are available right now. */
export function isLanguageReady(lang: SupportedLanguage = activeLanguage): boolean {
  return Boolean(dictionaries[lang]);
}

export const LOCALE_MAP: Record<SupportedLanguage, string> = {
  en: 'en-US',
  tr: 'tr-TR',
  de: 'de-DE',
  ar: 'ar-SA'
};

export function getLocale(lang?: SupportedLanguage): string {
  const current = lang || activeLanguage;
  return LOCALE_MAP[current] || 'en-US';
}

export function formatDate(date: Date | number, lang?: SupportedLanguage, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const locale = getLocale(lang);
  return d.toLocaleDateString(locale, options || { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatTime(date: Date | number, lang?: SupportedLanguage, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const locale = getLocale(lang);
  return d.toLocaleTimeString(locale, options || { hour: '2-digit', minute: '2-digit' });
}

const RTL_LANGUAGES = new Set<string>(['ar']);

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'tr', 'ar', 'de'];

const isSupportedLanguage = (v: unknown): v is SupportedLanguage =>
  typeof v === 'string' && (SUPPORTED_LANGUAGES as string[]).includes(v);

const readSavedLanguage = (): SupportedLanguage => {
  if (typeof localStorage !== 'undefined') {
    // Single source of truth: user_settings.language first.
    try {
      const rawSettings = localStorage.getItem('user_settings');
      if (rawSettings) {
        const parsed = safeParseObjectWithBackup<{ language?: unknown }>('user_settings', rawSettings, {});
        if (parsed && isSupportedLanguage(parsed.language)) {
          return parsed.language;
        }
      }
    } catch (_) {}
    // Legacy fallback: standalone nova_language key.
    try {
      const saved = localStorage.getItem('nova_language');
      if (isSupportedLanguage(saved)) {
        return saved;
      }
    } catch (_) {}
  }
  try {
    const nav = typeof navigator !== 'undefined' ? navigator.language?.slice(0, 2).toLowerCase() : '';
    if (isSupportedLanguage(nav)) {
      return nav;
    }
  } catch (_) {}
  return 'en';
};

let activeLanguage: SupportedLanguage = readSavedLanguage();

if (typeof document !== 'undefined') {
  document.documentElement.lang = activeLanguage;
  document.documentElement.dir = RTL_LANGUAGES.has(activeLanguage) ? 'rtl' : 'ltr';
}

const listeners = new Set<(lang: SupportedLanguage) => void>();

export function isRTL(lang?: string): boolean {
  return RTL_LANGUAGES.has(lang || activeLanguage);
}

export function getLanguage(): SupportedLanguage {
  return activeLanguage;
}

export function setLanguage(lang: SupportedLanguage): void {
  // An unsupported code still falls back, but a supported one whose chunk has
  // not arrived yet must NOT be downgraded: that would show English to a
  // Turkish user and then flip the UI language under them. Keep the language,
  // start the load, and re-notify listeners when it lands.
  if (!isSupportedLanguage(lang)) {
    lang = 'en';
  }
  activeLanguage = lang;
  if (!dictionaries[lang]) {
    void ensureLanguageLoaded(lang).then(() => {
      if (activeLanguage === lang) listeners.forEach(fn => fn(lang));
    });
  }
  if (typeof localStorage !== 'undefined') {
    // Only the standalone key is written from here. `user_settings` is owned by
    // useSessionPersistence, which serialises live React state on a 500ms
    // debounce; read-modify-writing it from here would race that flush and
    // persist a stale on-disk snapshot, discarding any setting changed in the
    // same tick. `settings.language` is the canonical source and the settings
    // owner persists it for us.
    try {
      localStorage.setItem('nova_language', lang);
    } catch (_) {}
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
  }
  listeners.forEach(fn => {
    try {
      fn(lang);
    } catch (_) {}
  });
}

export function onLanguageChange(fn: (lang: SupportedLanguage) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Suffix that marks a CLDR plural form, e.g. `downloads.totalItems_one`. */
const PLURAL_SUFFIX_SEPARATOR = '_';

/**
 * Resolves a dotted key path to a string, or `undefined` when any segment is
 * missing or the final value is not a string.
 */
function lookupString(dict: Record<string, any> | undefined, parts: string[]): string | undefined {
  if (!dict) return undefined;
  let current: any = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

const pluralRulesCache = new Map<string, Intl.PluralRules | null>();

function getPluralRules(locale: string): Intl.PluralRules | null {
  if (pluralRulesCache.has(locale)) {
    return pluralRulesCache.get(locale) ?? null;
  }
  let rules: Intl.PluralRules | null = null;
  try {
    rules = new Intl.PluralRules(locale);
  } catch (_) {
    rules = null;
  }
  pluralRulesCache.set(locale, rules);
  return rules;
}

/**
 * CLDR category (`zero`/`one`/`two`/`few`/`many`/`other`) that `count` falls
 * into for `locale`. Returns `undefined` when the runtime has no usable
 * `Intl.PluralRules`, so callers can fall back to the unsuffixed string.
 */
function selectPluralCategory(locale: string, count: number): string | undefined {
  const rules = getPluralRules(locale);
  if (!rules) return undefined;
  try {
    return rules.select(count);
  } catch (_) {
    return undefined;
  }
}

/** First `number`-typed param, in insertion order. Strings are never counts. */
function firstNumericParam(params: Record<string, string | number>): number | undefined {
  for (const value of Object.values(params)) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

export function t(path: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[activeLanguage] || dictionaries.en;
  const parts = path.split('.');

  // Base string, with the pre-existing whole-key fallback to English.
  let current = lookupString(dict, parts);
  if (current === undefined) {
    current = lookupString(dictionaries.en, parts);
  }
  if (current === undefined) {
    return path;
  }

  if (params) {
    // Plural support: when a numeric param is interpolated, prefer a
    // CLDR-suffixed variant of the resolved key. The suffix goes on the LAST
    // path segment — `downloads.totalItems` -> `downloads.totalItems_one` —
    // because that is where the form lives in the dictionaries, not as a
    // further level of nesting. The category always comes from the *active*
    // locale's rules, and the variant is only ever read from the active
    // dictionary: borrowing another language's inflected form would leak e.g.
    // English "1 total item" into a Turkish UI, which is strictly worse than
    // the uninflected base string. Keys without a suffixed variant render
    // exactly as they always have.
    const count = firstNumericParam(params);
    if (count !== undefined) {
      const category = selectPluralCategory(getLocale(), count);
      if (category) {
        const pluralParts = parts.slice();
        pluralParts[pluralParts.length - 1] =
          `${pluralParts[pluralParts.length - 1]}${PLURAL_SUFFIX_SEPARATOR}${category}`;
        const variant = lookupString(dict, pluralParts);
        if (variant !== undefined) {
          current = variant;
        }
      }
    }

    let text = current;
    Object.entries(params).forEach(([k, v]) => {
      text = text.split(`{${k}}`).join(String(v));
    });
    return text;
  }
  return current;
}

export function useTranslation() {
  const [lang, setLangState] = useState<SupportedLanguage>(activeLanguage);

  useEffect(() => {
    return onLanguageChange(newLang => {
      setLangState(newLang);
    });
  }, []);

  return {
    t,
    language: lang,
    locale: getLocale(lang),
    isRTL: isRTL(lang),
    setLanguage,
    formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => formatDate(date, lang, options),
    formatTime: (date: Date | number, options?: Intl.DateTimeFormatOptions) => formatTime(date, lang, options)
  };
}
