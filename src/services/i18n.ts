import en from '../locales/en.json';
import tr from '../locales/tr.json';
import ar from '../locales/ar.json';
import de from '../locales/de.json';
import { useState, useEffect } from 'react';
import { safeParseObjectWithBackup } from '../utils/safeStorage';

export type SupportedLanguage = 'en' | 'tr' | 'ar' | 'de';

const dictionaries: Record<SupportedLanguage, Record<string, any>> = {
  en,
  tr,
  ar,
  de
};

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
  if (!dictionaries[lang]) {
    lang = 'en';
  }
  activeLanguage = lang;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('nova_language', lang);
    } catch (_) {}
    // Keep single source in sync: user_settings.language is canonical.
    try {
      const raw = localStorage.getItem('user_settings');
      // Guarded parse: corrupt or non-object payloads (e.g. a JSON string,
      // number, or array left by an older build) fall back to {} instead of
      // corrupting the stored settings on spread. Corrupt input is preserved
      // under a user_settings_corrupt_backup_* key for forensics.
      const parsed = safeParseObjectWithBackup<Record<string, unknown>>('user_settings', raw, {});
      if (parsed.language !== lang) {
        localStorage.setItem('user_settings', JSON.stringify({ ...parsed, language: lang }));
      }
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

export function t(path: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[activeLanguage] || dictionaries.en;
  const parts = path.split('.');
  let current: any = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to English dictionary
      let fallback: any = dictionaries.en;
      for (const fPart of parts) {
        if (fallback && typeof fallback === 'object' && fPart in fallback) {
          fallback = fallback[fPart];
        } else {
          return path;
        }
      }
      current = fallback;
      break;
    }
  }

  if (typeof current !== 'string') {
    return path;
  }

  let text = current;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.split(`{${k}}`).join(String(v));
    });
  }
  return text;
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
    isRTL: isRTL(lang),
    setLanguage
  };
}
