// ─── Language Context & Hook ───────────────────────────────────────────────
import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations } from './translations';
import type { Language, Translation } from './translations';

interface LangContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: Translation;
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  setLang: () => {},
  t: translations.en,
});

function detectLanguage(): Language {
  const stored = localStorage.getItem('nova_lang') as Language | null;
  if (stored && translations[stored]) return stored;

  const browserLang = navigator.language?.toLowerCase() ?? '';

  if (browserLang.startsWith('tr')) return 'tr';
  if (browserLang.startsWith('ru')) return 'ru';
  if (browserLang.startsWith('de')) return 'de';
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('es')) return 'es';
  return 'en';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    setLangState(detectLanguage());
  }, []);

  const setLang = (l: Language) => {
    localStorage.setItem('nova_lang', l);
    setLangState(l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);
