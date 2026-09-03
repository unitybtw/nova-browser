import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Plus, X } from 'lucide-react';
import { Tab } from '../types/browser';
import { formatSearchUrl, getSearchEngineName } from '../utils/searchEngine';
import { UserSettings } from '../App';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { getClientCachedSuggestions, setClientCachedSuggestions } from '../utils/suggestionCache';

interface SpotlightOmniboxProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: Tab[];
  activeTabId: string;
  searchEngine?: UserSettings['searchEngine'];
  onSelectTab: (id: string) => void;
  onNewTab: (url?: string) => void;
  onCloseTab: (id: string) => void;
  onNavigate: (url: string) => void;
}

export const SpotlightOmnibox: React.FC<SpotlightOmniboxProps> = React.memo(({
  isOpen,
  onClose,
  tabs,
  activeTabId,
  searchEngine = 'google',
  onSelectTab,
  onNewTab,
  onCloseTab,
  onNavigate
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAIMode, setIsAIMode] = useState(false);
  const [failedFavicons, setFailedFavicons] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(isOpen, onClose, containerRef);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setSuggestions([]);
      setSelectedIndex(0);
      setIsAIMode(false);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (isAIMode || !trimmed || trimmed.includes('://')) {
      setSuggestions([]);
      return;
    }

    // 1. Instant 0ms cache lookup
    const cacheKey = `${trimmed}_${searchEngine}`;
    const cached = getClientCachedSuggestions(cacheKey);
    if (cached) {
      setSuggestions(cached.slice(0, 5));
    }

    const controller = new AbortController();
    const fetchSuggestions = async () => {
      try {
        const clientLocale = typeof navigator !== 'undefined' ? navigator.language : 'tr-TR';
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getSuggestions) {
          const results = await (window as any).electronAPI.getSuggestions(trimmed, searchEngine, clientLocale);
          if (Array.isArray(results) && !controller.signal.aborted) {
            setClientCachedSuggestions(cacheKey, results);
            setSuggestions(results.slice(0, 5));
            return;
          }
        }
        const lang = clientLocale.split('-')[0] || 'tr';
        const country = clientLocale.split('-')[1] || (lang === 'tr' ? 'TR' : 'US');
        const response = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(trimmed)}&hl=${lang}&gl=${country}`, { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data) && Array.isArray(data[1]) && !controller.signal.aborted) {
            const list = data[1].slice(0, 5);
            setClientCachedSuggestions(cacheKey, list);
            setSuggestions(list);
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        // ignore errors
      }
    };

    const timer = setTimeout(fetchSuggestions, 35);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [inputValue, isAIMode, searchEngine]);

  // Compute matching items for list navigation
  type ActionItem = 
    | { type: 'tab'; tab: Tab }
    | { type: 'suggestion'; text: string };

  const items: ActionItem[] = useMemo(() => {
    const list: ActionItem[] = [];
    const query = inputValue.trim().toLowerCase();

    if (query) {
      // Matching tabs
      const matched = tabs.filter(t => 
        (t.title && t.title.toLowerCase().includes(query)) ||
        (t.url && t.url.toLowerCase().includes(query))
      );
      matched.forEach(t => list.push({ type: 'tab', tab: t }));

      // Suggestions
      suggestions.forEach(s => list.push({ type: 'suggestion', text: s }));
    } else {
      // All open tabs
      tabs.forEach(t => list.push({ type: 'tab', tab: t }));
    }
    return list;
  }, [inputValue, tabs, suggestions]);

  // Keep selected index within range and scroll into view
  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const executeItem = (item?: ActionItem) => {
    if (isAIMode || inputValue.startsWith('@ai ') || inputValue.startsWith('ai:')) {
      let prompt = inputValue;
      if (prompt.startsWith('@ai ')) prompt = prompt.substring(4);
      if (prompt.startsWith('ai:')) prompt = prompt.substring(3);
      window.dispatchEvent(new CustomEvent('ai-quick-action', { detail: prompt.trim() }));
      onClose();
      return;
    }

    if (item && item.type === 'tab') {
      onSelectTab(item.tab.id);
      onClose();
      return;
    }

    const target = item?.type === 'suggestion' ? item.text : inputValue.trim();
    if (!target) {
      onClose();
      return;
    }

    const url = formatSearchUrl(target, searchEngine);
    if (onNavigate) {
      onNavigate(url);
    } else {
      onNewTab(url);
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length > 0 && selectedIndex >= 0 && selectedIndex < items.length) {
      executeItem(items[selectedIndex]);
    } else {
      executeItem();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
        >
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" 
            onClick={onClose}
          />
          
          <motion.div 
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={`relative w-full max-w-2xl backdrop-blur-2xl rounded-2xl shadow-2xl border overflow-hidden outline-none transition-colors duration-300 ${
              isAIMode 
                ? 'bg-purple-950/95 border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.25)]' 
                : 'bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-white/10'
            }`}
            tabIndex={-1}
          >
            <form onSubmit={handleSubmit} className={`flex items-center gap-3 px-5 py-4 border-b transition-colors ${
              isAIMode ? 'border-purple-800/40 bg-purple-900/20' : 'border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30'
            }`}>
              <Search className={`w-5 h-5 transition-colors ${isAIMode ? 'text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <input
                ref={inputRef}
                type="text"
                aria-label="Spotlight search and command bar"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && inputValue.trim().toLowerCase() === '@ai') {
                    e.preventDefault();
                    setIsAIMode(true);
                    setInputValue('');
                  } else if (e.key === 'Tab' && selectedIndex >= 0 && selectedIndex < items.length && items[selectedIndex].type === 'suggestion') {
                    e.preventDefault();
                    setInputValue((items[selectedIndex] as { type: 'suggestion'; text: string }).text);
                    setSelectedIndex(-1);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev > 0 ? prev - 1 : items.length - 1));
                  }
                }}
                placeholder={isAIMode ? "AI: What would you like me to do? (e.g. Find product comparisons on Amazon)" : `Search ${getSearchEngineName(searchEngine)}, enter URL, or switch tabs...`}
                className={`flex-1 bg-transparent border-none outline-none text-base font-sans transition-all duration-300 ${
                  isAIMode 
                    ? 'text-purple-100 placeholder-purple-400/80' 
                    : 'text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500'
                }`}
                autoFocus
              />
              {inputValue.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="flex gap-1.5 items-center">
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10">
                  ESC
                </kbd>
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10">
                  ↵ Enter
                </kbd>
              </div>
            </form>

            <div className="max-h-[50vh] overflow-y-auto p-2 no-scrollbar">
              {items.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  Press Enter to search with {getSearchEngineName(searchEngine)}
                </div>
              ) : (
                <div className="space-y-1">
                  {items.map((item, idx) => {
                    const isSelected = selectedIndex === idx;

                    if (item.type === 'tab') {
                      return (
                        <div
                          key={`tab-${item.tab.id}`}
                          ref={el => { itemRefs.current[idx] = el; }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          onClick={() => executeItem(item)}
                          className={`group flex items-center justify-between p-2.5 px-3 rounded-xl cursor-pointer transition-all duration-150 ${
                            isSelected
                              ? 'bg-cyan-500/15 text-cyan-900 dark:text-cyan-200 border border-cyan-500/30'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/6'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden min-w-0">
                            {item.tab.favicon && !failedFavicons.has(item.tab.id) ? (
                              <img 
                                src={item.tab.favicon} 
                                className="w-4 h-4 rounded-xs object-contain shrink-0" 
                                alt="" 
                                onError={() => setFailedFavicons(prev => new Set(prev).add(item.tab.id))}
                              />
                            ) : (
                              <Globe className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-500' : 'text-slate-400'}`} />
                            )}
                            <span className="truncate text-sm font-medium">{item.tab.title || item.tab.url || 'Tab'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                              Switch
                            </span>
                            {tabs.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCloseTab(item.tab.id);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Close Tab"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`sug-${idx}`}
                        ref={el => { itemRefs.current[idx] = el; }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => executeItem(item)}
                        className={`flex items-center justify-between p-2.5 px-3 rounded-xl cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-cyan-500/15 text-cyan-900 dark:text-cyan-200 border border-cyan-500/30'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/6'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden min-w-0">
                          <Search className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-500' : 'text-slate-400'}`} />
                          <span className="truncate text-sm font-medium">{item.text}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 ml-2">
                          Search
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}, (prevProps, nextProps) => {
  // Stays mounted while closed — bail out early on isOpen to ignore
  // background-tab events entirely.
  if (prevProps.isOpen !== nextProps.isOpen) return false;
  if (!prevProps.isOpen && !nextProps.isOpen) return true;

  if (prevProps.activeTabId !== nextProps.activeTabId) return false;
  if (prevProps.searchEngine !== nextProps.searchEngine) return false;

  const prevTabs = prevProps.tabs;
  const nextTabs = nextProps.tabs;
  if (prevTabs === nextTabs) return true;
  if (!prevTabs || !nextTabs || prevTabs.length !== nextTabs.length) return false;
  for (let i = 0; i < prevTabs.length; i++) {
    const a = prevTabs[i];
    const b = nextTabs[i];
    if (a === b) continue;
    if (
      a.id !== b.id ||
      a.title !== b.title ||
      a.url !== b.url ||
      a.favicon !== b.favicon
    ) {
      return false;
    }
  }
  return true;
});
