// Nova has a single, bundled English interface.
import en from '../locales/en.json';
import { useState, useEffect } from 'react';

export type SupportedLanguage = 'en' | 'tr' | 'ar' | 'de';

// Retain legacy codes at the API boundary so old backups and callers remain
// readable. They cannot select another interface language.
type Dictionary = Record<string, any>;
const dictionaries: Record<string, Dictionary> = { en };
const activeLanguage: SupportedLanguage = 'en';

export function ensureLanguageLoaded(_lang?: SupportedLanguage): Promise<void> {
  return Promise.resolve();
}

/** Compatibility with older callers; the bundled English dictionary is fixed. */
export function seedDictionary(_lang: SupportedLanguage, _dict: Dictionary): void {}

export function isLanguageReady(_lang?: SupportedLanguage): boolean {
  return true;
}

export const LOCALE_MAP: Record<SupportedLanguage, string> = {
  en: 'en-US', tr: 'en-US', de: 'en-US', ar: 'en-US'
};

export function getLocale(_lang?: SupportedLanguage): string {
  return 'en-US';
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

if (typeof document !== 'undefined') {
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
}

const listeners = new Set<(lang: SupportedLanguage) => void>();

export function isRTL(_lang?: string): boolean {
  return false;
}

export function getLanguage(): SupportedLanguage {
  return 'en';
}

export function setLanguage(_lang: SupportedLanguage): void {
  // Do not rewrite user_settings here: its persistence owner holds live state.
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem('nova_language', 'en');
  } catch (_) {}
  if (typeof document !== 'undefined') {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  }
  listeners.forEach(fn => {
    try { fn('en'); } catch (_) {}
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
