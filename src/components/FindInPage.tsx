import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

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
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    onStopFind();
    setSearchText('');
    onClose();
  };

  useModalFocusTrap(isOpen, handleClose, containerRef);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      onStopFind();
      setSearchText('');
    }
    return () => {
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
      triggerSearch(searchText, !e.shiftKey);
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;
  const noMatches = searchText.length > 0 && matchCount === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          ref={containerRef}
          initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
          exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
          className="absolute top-12 left-1/2 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl rounded-2xl p-2 flex items-center gap-2 outline-none w-full max-w-lg"
          tabIndex={-1}
        >
          <div className="relative flex-1 flex items-center bg-slate-100/50 dark:bg-slate-800/50 rounded-xl px-3 py-1 border border-transparent focus-within:border-blue-500/50 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
            <Search className={`w-4 h-4 mr-2 ${noMatches ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`} />
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Find in page..."
              className={`flex-1 bg-transparent py-1.5 text-sm outline-none transition-colors placeholder-slate-400 dark:placeholder-slate-500 ${noMatches ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}
              autoFocus
            />
            
            <div className="flex items-center gap-1 shrink-0">
              {searchText && (
                <span className={`text-xs font-medium mr-2 ${noMatches ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                  {matchCount > 0 ? `${matchIndex}/${matchCount}` : '0/0'}
                </span>
              )}
              
              <button
                onClick={() => {
                  setMatchCase(!matchCase);
                  triggerSearch(searchText, true, !matchCase, wholeWord);
                }}
                className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all ${matchCase ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                title="Match Case"
              >
                Aa
              </button>
              <button
                onClick={() => {
                  setWholeWord(!wholeWord);
                  triggerSearch(searchText, true, matchCase, !wholeWord);
                }}
                className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all mr-1 ${wholeWord ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                title="Whole Word"
              >
                W
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 px-1 border-l border-slate-200 dark:border-slate-700">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => triggerSearch(searchText, false)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Previous (Shift+Enter)"
            >
              <ChevronUp className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => triggerSearch(searchText, true)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Next (Enter)"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.button>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleClose}
            className="p-2 ml-1 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
            title="Close (Escape)"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
