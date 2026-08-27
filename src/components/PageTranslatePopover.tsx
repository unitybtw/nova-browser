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
  anchorRect?: { top: number; left: number; width: number; height: number; bottom: number; right: number } | null;
}

export const PageTranslatePopover: React.FC<PageTranslatePopoverProps> = ({
  isOpen,
  onClose,
  onTranslate,
  onRestoreOriginal,
  isTranslated,
  isLoading,
  currentSourceLang = 'auto',
  currentTargetLang = 'tr',
  error,
  anchorRect
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

  // Position calculation
  const top = anchorRect ? anchorRect.bottom + 8 : 80;
  const left = anchorRect ? Math.max(16, Math.min(anchorRect.left + anchorRect.width / 2 - 160, window.innerWidth - 340)) : window.innerWidth - 360;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.96 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          className="fixed z-[99999] w-80 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 shadow-2xl shadow-black/30 select-none overflow-hidden"
          style={{ top, left }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Languages className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                Sayfa Çevirisi
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-4 space-y-3.5">
            {/* Language Direction Row */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                  {sourceLangObj ? sourceLangObj.nativeName : (currentSourceLang === 'auto' ? 'Otomatik Algıla' : currentSourceLang.toUpperCase())}
                </span>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

              {/* Target Language Dropdown Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold text-cyan-600 dark:text-cyan-400 shadow-xs hover:border-cyan-500 transition-colors"
                >
                  <span>{currentLangObj.nativeName}</span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 max-h-52 overflow-y-auto rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/15 shadow-xl z-50 py-1 scrollbar-thin">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedTargetLang(lang.code);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10 transition-colors ${
                          lang.code === selectedTargetLang ? 'text-cyan-600 dark:text-cyan-400 font-semibold bg-cyan-500/10' : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span>{lang.nativeName} ({lang.name})</span>
                        {lang.code === selectedTargetLang && <Check className="w-3 h-3 text-cyan-500 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error Message if any */}
            {error && (
              <div className="text-[11px] text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
                {error}
              </div>
            )}

            {/* Status Information */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
              <span>Durum:</span>
              <span className={`font-semibold ${isTranslated ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                {isLoading ? 'Çevriliyor...' : isTranslated ? `${currentLangObj.nativeName} diline çevrildi` : 'Orijinal sayfa'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {isTranslated && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={async () => {
                    await onRestoreOriginal();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  <span>Orijinali Göster</span>
                </button>
              )}

              <button
                type="button"
                disabled={isLoading}
                onClick={async () => {
                  await onTranslate(selectedTargetLang, currentSourceLang);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all cursor-pointer ${
                  isLoading
                    ? 'bg-cyan-600/70'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98]'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Çevriliyor...</span>
                  </>
                ) : (
                  <>
                    <Languages className="w-3.5 h-3.5" />
                    <span>{isTranslated ? 'Yeniden Çevir' : 'Sayfayı Çevir'}</span>
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
