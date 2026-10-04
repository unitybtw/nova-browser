import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Languages } from 'lucide-react';
import { useLanguage, type Language } from '../context/LanguageContext';

interface LanguageToggleProps {
  variant?: 'nav' | 'mobile' | 'footer';
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  variant = 'nav',
  className = '',
}) => {
  const { lang, setLang } = useLanguage();
  const prefersReducedMotion = useReducedMotion();

  const options: { id: Language; label: string; full: string }[] = [
    { id: 'en', label: 'EN', full: 'English' },
    { id: 'tr', label: 'TR', full: 'Türkçe' },
  ];

  if (variant === 'footer') {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-xl bg-white/5 p-1 border border-white/10 ${className}`}
        role="group"
        aria-label="Dil seçimi / Language selector"
      >
        <div className="flex items-center gap-1.5 pl-2 pr-1 text-neutral-400">
          <Languages className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
            {lang.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {options.map((opt) => {
            const isActive = lang === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLang(opt.id)}
                aria-pressed={isActive}
                className={`relative px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-footer-lang-pill"
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 500, damping: 35 }
                    }
                    className="absolute inset-0 rounded-lg bg-[#4338ca] shadow-sm -z-10"
                  />
                )}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === 'mobile') {
    return (
      <div
        className={`flex items-center justify-between p-1.5 rounded-xl bg-white/5 border border-white/10 ${className}`}
        role="group"
        aria-label="Dil seçimi / Language selector"
      >
        <div className="flex items-center gap-2 pl-2 text-neutral-300">
          <Languages className="w-4 h-4 text-indigo-400" aria-hidden="true" />
          <span className="font-mono text-xs font-medium text-neutral-300">
            {lang === 'tr' ? 'Site Dili' : 'Language'}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg">
          {options.map((opt) => {
            const isActive = lang === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLang(opt.id)}
                aria-pressed={isActive}
                className={`relative min-h-[36px] min-w-[50px] flex items-center justify-center px-3 py-1.5 rounded-md font-mono text-xs font-bold transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] ${
                  isActive ? 'text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-mobile-lang-pill"
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 500, damping: 35 }
                    }
                    className="absolute inset-0 rounded-md bg-[#4338ca] shadow-xs -z-10"
                  />
                )}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop Floating Nav Variant
  return (
    <div
      className={`relative flex items-center bg-white/5 border border-white/10 rounded-full p-0.5 ${className}`}
      role="group"
      aria-label="Dil seçimi / Language selector"
    >
      {options.map((opt) => {
        const isActive = lang === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLang(opt.id)}
            aria-pressed={isActive}
            title={opt.full}
            className={`relative z-10 px-2.5 py-1 rounded-full font-mono text-[11px] font-bold tracking-wider transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] ${
              isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="active-nav-lang-pill"
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 500, damping: 35 }
                }
                className="absolute inset-0 rounded-full bg-[#4338ca] shadow-sm -z-10"
              />
            )}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default LanguageToggle;
