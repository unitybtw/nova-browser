import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

interface FindInPageProps {
  isOpen: boolean;
  onClose: () => void;
  onFind: (text: string, forward?: boolean) => void;
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

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchText(val);
    if (val.trim()) {
      onFind(val.trim(), true);
    } else {
      onStopFind();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onFind(searchText, !e.shiftKey);
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          ref={containerRef}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
          className="absolute top-3 right-6 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-1.5 flex items-center gap-2 outline-none"
          tabIndex={-1}
        >
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5" />
        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Find in page..."
          className="w-48 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg py-1.5 pl-8 pr-4 text-xs text-slate-800 dark:text-slate-200 outline-none transition-colors placeholder-slate-400 dark:placeholder-slate-500"
          autoFocus
        />
      </div>

      {searchText && (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {matchCount > 0 ? `${matchIndex}/${matchCount}` : 'No results'}
        </span>
      )}

      <div className="flex items-center gap-0.5 border-l border-slate-100 dark:border-slate-700 pl-1">
        <button
          onClick={() => onFind(searchText, false)}
          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Previous"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => onFind(searchText, true)}
          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Next"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
      )}
    </AnimatePresence>
  );
});
