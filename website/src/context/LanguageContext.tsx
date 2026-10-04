import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { TRANSLATIONS, type Translations } from '../i18n/translations';

export type Language = 'en' | 'tr';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: Translations;
  isTransitioning: boolean;
}

const STORAGE_KEY = 'nova_website_lang';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryLang = urlParams.get('lang')?.toLowerCase();
      if (queryLang === 'en' || queryLang === 'tr') {
        localStorage.setItem(STORAGE_KEY, queryLang);
        return queryLang;
      }
    } catch {
      // Ignore URL parsing errors
    }
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved === 'en' || saved === 'tr') return saved;
    const navLangs = Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language || ''];
    const hasTr = navLangs.some((l) => typeof l === 'string' && l.toLowerCase().startsWith('tr'));
    return hasTr ? 'tr' : 'en';
  });

  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // Ignore storage errors in restrictive environments
    }
  }, [lang]);

  const setLang = useCallback((newLang: Language) => {
    if (newLang === lang) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Use modern Document View Transitions API for buttery smooth morphing
    if ('startViewTransition' in document && !prefersReducedMotion) {
      setIsTransitioning(true);
      const transition = (document as unknown as { startViewTransition: (cb: () => void) => { finished: Promise<void> } }).startViewTransition(() => {
        setLangState(newLang);
      });
      transition.finished.finally(() => {
        setIsTransitioning(false);
      });
    } else {
      // Fallback with brief smooth state transition
      setIsTransitioning(true);
      setLangState(newLang);
      const timer = setTimeout(() => setIsTransitioning(false), 260);
      return () => clearTimeout(timer);
    }
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'tr' : 'en');
  }, [lang, setLang]);

  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      t,
      isTransitioning,
    }),
    [lang, setLang, toggleLang, t, isTransitioning]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
