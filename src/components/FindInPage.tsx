import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { useTranslation } from '../services/i18n';

interface FindInPageProps {
  isOpen: boolean;
  onClose: () => void;
  onFind: (text: string, forward?: boolean, matchCase?: boolean, wholeWord?: boolean) => void;
  onStopFind: () => void;
  matchIndex?: number;
  matchCount?: number;
}

export const FindInPage: React.FC<FindInPageProps> = React.memo(({
  isOpen,
  onClose,
  onFind,
  onStopFind,
  matchIndex = 0,
  matchCount = 0
}) => {
  const [searchText, setSearchText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const { t } = useTranslation();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = () => {
    onStopFind();
    onClose();
  };

  useModalFocusTrap(isOpen, handleClose, containerRef);

  useEffect(() => {
    if (isOpen) {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      focusTimerRef.current = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      if (searchText.trim()) {
        triggerSearch(searchText, true, matchCase, wholeWord);
      }
    } else {
      onStopFind();
    }
    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      onStopFind();
    };
  }, [isOpen]);

  const triggerSearch = (text: string, forward = true, isCase = matchCase, isWord = wholeWord) => {
    if (text.trim()) {
      onFind(text.trim(), forward, isCase, isWord);
    } else {
      onStopFind();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchText(val);
    triggerSearch(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerSearch(searchText, !e.shiftKey);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  const noMatches = searchText.length > 0 && matchCount === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          ref={containerRef}
          initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
          exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          className="absolute top-12 left-1/2 z-50 bg-white/95 dark:bg-[#141518]/95 backdrop-blur-xl border border-neutral-200/90 dark:border-white/[0.1] shadow-2xl rounded-xl p-1.5 flex items-center gap-1.5 outline-none w-full max-w-md"
          tabIndex={-1}
        >
          <div className="relative flex-1 flex items-center bg-neutral-100/90 dark:bg-white/[0.06] rounded-lg px-2.5 py-1 border border-neutral-200/80 dark:border-white/[0.08] focus-within:border-neutral-400 dark:focus-within:border-white/30 transition-colors">
            <Search className={`w-3.5 h-3.5 mr-2 shrink-0 ${noMatches ? 'text-red-500' : 'text-neutral-400 dark:text-neutral-500'}`} />
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={t('find.placeholder')}
              className={`flex-1 bg-transparent py-1 text-xs outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 ${noMatches ? 'text-red-500' : 'text-neutral-900 dark:text-neutral-100'}`}
              autoFocus
            />

            <div className="flex items-center gap-1 shrink-0">
              {searchText && (
                <span className={`text-[11px] font-mono tabular-nums mr-1.5 ${noMatches ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {matchCount > 0 ? `${matchIndex}/${matchCount}` : '0/0'}
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  setMatchCase(!matchCase);
                  triggerSearch(searchText, true, !matchCase, wholeWord);
                }}
                className={`w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  matchCase
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/70 dark:hover:bg-white/[0.08]'
                }`}
                title={t('find.matchCase')}
              >
                Aa
              </button>
              <button
                type="button"
                onClick={() => {
                  setWholeWord(!wholeWord);
                  triggerSearch(searchText, true, matchCase, !wholeWord);
                }}
                className={`w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  wholeWord
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/70 dark:hover:bg-white/[0.08]'
                }`}
                title={t('find.wholeWord')}
              >
                W
              </button>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-neutral-200/80 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => triggerSearch(searchText, false)}
              className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
              title={t('find.previous')}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => triggerSearch(searchText, true)}
              className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
              title={t('find.next')}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors shrink-0 cursor-pointer"
            title={t('find.close')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
