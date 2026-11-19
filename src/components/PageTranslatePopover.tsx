import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Check, ArrowRight, RotateCcw, Loader2, X, Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../services/translationService';

export interface PageTranslatePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onTranslate: (targetLang: string, sourceLang?: string) => Promise<void>;
  onRestoreOriginal: () => Promise<void>;
  isTranslated: boolean;
  isLoading: boolean;
  currentSourceLang?: string;
  currentTargetLang?: string;
  error?: string | null;
}

export const PageTranslatePopover: React.FC<PageTranslatePopoverProps> = ({
  isOpen,
  onClose,
  onTranslate,
  onRestoreOriginal,
  isTranslated,
  isLoading,
  currentSourceLang = 'auto',
  currentTargetLang = 'en',
  error
}) => {
  const [selectedTargetLang, setSelectedTargetLang] = useState<string>(currentTargetLang);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedTargetLang(currentTargetLang);
  }, [currentTargetLang]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedTargetLang) || SUPPORTED_LANGUAGES[0];
  const sourceLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentSourceLang);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.96 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-full right-0 mt-2 w-80 rounded-xl bg-white/95 dark:bg-[#141518]/95 backdrop-blur-xl border border-neutral-200/90 dark:border-white/[0.1] shadow-2xl select-none overflow-hidden z-[99999]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-neutral-200/80 dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Languages className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 tracking-[-0.01em]">
                Page Translation
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-white/[0.07] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-3.5 space-y-3">
            {/* Language Direction Row */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-neutral-100/80 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/[0.07]">
              <div className="flex items-center gap-1.5 min-w-0">
                <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 truncate">
                  {sourceLangObj ? sourceLangObj.name : (currentSourceLang === 'auto' ? 'Auto Detect' : currentSourceLang.toUpperCase())}
                </span>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />

              {/* Target Language Dropdown Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-[#141518] border border-neutral-200/90 dark:border-white/[0.1] text-xs font-medium text-neutral-900 dark:text-neutral-100 hover:border-neutral-400 dark:hover:border-white/25 transition-colors cursor-pointer"
                >
                  <span>{currentLangObj.name}</span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 max-h-52 overflow-y-auto rounded-xl bg-white dark:bg-[#16171b] border border-neutral-200/90 dark:border-white/[0.1] shadow-2xl z-50 p-1 scrollbar-thin">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setSelectedTargetLang(lang.code);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          lang.code === selectedTargetLang
                            ? 'text-neutral-950 dark:text-white font-semibold bg-neutral-100 dark:bg-white/[0.08]'
                            : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/70 dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        <span>{lang.name} ({lang.nativeName})</span>
                        {lang.code === selectedTargetLang && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 px-0.5">
              <span>Status</span>
              <span className={`font-medium ${isTranslated ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                {isLoading ? 'Translating...' : isTranslated ? `Translated to ${currentLangObj.name}` : 'Original page'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              {isTranslated && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={async () => {
                    await onRestoreOriginal();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-neutral-200/80 dark:border-white/[0.08] bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Show Original</span>
                </button>
              )}

              <button
                type="button"
                disabled={isLoading}
                onClick={async () => {
                  await onTranslate(selectedTargetLang, currentSourceLang);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Translating...</span>
                  </>
                ) : (
                  <>
                    <Languages className="w-3.5 h-3.5" />
                    <span>{isTranslated ? 'Re-Translate' : 'Translate Page'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
