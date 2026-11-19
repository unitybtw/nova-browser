import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Plus, X } from 'lucide-react';
import { Tab, UserSettings } from '../types/browser';
import { formatSearchUrl, getSearchEngineName, getSearchLocale, getSearchLanguage } from '../utils/searchEngine';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { getClientCachedSuggestions, setClientCachedSuggestions } from '../utils/suggestionCache';
import { getLocale, getLanguage, useTranslation } from '../services/i18n';
import { useDialogA11y } from '../hooks/useDialogA11y';

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
  // Reactive: the placeholder is localised, so it repaints on language change.
  const { t } = useTranslation();

  const containerRef = useRef<HTMLDivElement>(null);

  useDialogA11y({ isOpen, onClose, containerRef });
  useModalFocusTrap(isOpen, onClose, containerRef);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const suggestionRequestIdRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setSuggestions([]);
      setSelectedIndex(0);
      setIsAIMode(false);
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
      return () => clearTimeout(focusTimer);
    }
  }, [isOpen]);

  // Re-render on language change so suggestions refetch in the new locale.
  const clientLanguage = getLanguage();

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (isAIMode || !trimmed || trimmed.includes('://')) {
      setSuggestions([]);
      return;
    }

    // 1. Instant 0ms cache lookup
    const clientLocale = getSearchLocale();
    const cacheKey = `${trimmed}_${searchEngine}`;
    const cached = getClientCachedSuggestions(cacheKey, clientLocale);
    if (cached) {
      setSuggestions(cached.slice(0, 5));
    } else {
      setSuggestions([]);
    }

    const controller = new AbortController();
    const currentReqId = ++suggestionRequestIdRef.current;
    const fetchSuggestions = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getSuggestions) {
          const results = await (window as any).electronAPI.getSuggestions(trimmed, searchEngine, clientLocale);
          if (!controller.signal.aborted && suggestionRequestIdRef.current === currentReqId) {
            if (Array.isArray(results)) {
              setClientCachedSuggestions(cacheKey, results, clientLocale);
              setSuggestions(results.slice(0, 5));
            } else {
              setSuggestions([]);
            }
          }
          return;
        }

        // Without electron IPC, do not leak user typing to external domains from renderer
        setSuggestions([]);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        // ignore errors
      }
    };

    const timer = setTimeout(fetchSuggestions, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [inputValue, isAIMode, searchEngine, clientLanguage]);

  // Compute matching items for list navigation
  type ActionItem =
    | { type: 'tab'; tab: Tab }
    | { type: 'suggestion'; text: string };

  const items: ActionItem[] = useMemo(() => {
    if (isAIMode) {
      return [];
    }
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
  }, [inputValue, isAIMode, tabs, suggestions]);

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

    const url = formatSearchUrl(target, searchEngine, getSearchLanguage());
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
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={onClose}
          />

          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="relative w-full max-w-xl rounded-xl shadow-2xl border overflow-hidden outline-none bg-white/95 dark:bg-[#141518]/95 backdrop-blur-xl border-neutral-200/90 dark:border-white/[0.1]"
            tabIndex={-1}
          >
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-200/80 dark:border-white/[0.08]"
            >
              {isAIMode ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shrink-0">
                  AI
                </span>
              ) : (
                <Search className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
              )}
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
                placeholder={isAIMode ? t('nav.aiPlaceholder') : t('nav.searchPlaceholder', { engine: getSearchEngineName(searchEngine) })}
                className="flex-1 bg-transparent border-none outline-none text-sm font-sans text-neutral-950 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                autoFocus
              />
              {inputValue.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="flex gap-1 items-center">
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-white/[0.07] border border-neutral-200/80 dark:border-white/[0.08]">
                  ESC
                </kbd>
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-white/[0.07] border border-neutral-200/80 dark:border-white/[0.08]">
                  ↵
                </kbd>
              </div>
            </form>

            <div className="max-h-[50vh] overflow-y-auto p-1.5 no-scrollbar">
              {items.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-400 dark:text-neutral-500">
                  Press Enter to search with {getSearchEngineName(searchEngine)}
                </div>
              ) : (
                <div className="space-y-0.5" role="listbox" aria-label="Omnibox results">
                  {items.map((item, idx) => {
                    const isSelected = selectedIndex === idx;

                    if (item.type === 'tab') {
                      return (
                        <div
                          key={`tab-${item.tab.id}`}
                          role="option"
                          aria-selected={isSelected}
                          ref={el => { itemRefs.current[idx] = el; }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          onClick={() => executeItem(item)}
                          className={`group flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-neutral-100 dark:bg-white/[0.09] text-neutral-950 dark:text-white'
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/70 dark:hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                            {item.tab.favicon && !failedFavicons.has(item.tab.id) ? (
                              <img
                                src={item.tab.favicon}
                                className="w-4 h-4 rounded-xs object-contain shrink-0"
                                alt=""
                                onError={() => setFailedFavicons(prev => new Set(prev).add(item.tab.id))}
                              />
                            ) : (
                              <Globe className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-400 dark:text-neutral-500'}`} />
                            )}
                            <span className="truncate text-[13px] font-medium">{item.tab.title || item.tab.url || 'Tab'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-neutral-100 dark:bg-white/[0.07] text-neutral-500 dark:text-neutral-400 border border-neutral-200/80 dark:border-white/[0.08]">
                              Switch
                            </span>
                            {tabs.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCloseTab(item.tab.id);
                                }}
                                className="p-1 rounded-md text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
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
                        role="option"
                        aria-selected={isSelected}
                        ref={el => { itemRefs.current[idx] = el; }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => executeItem(item)}
                        className={`flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-neutral-100 dark:bg-white/[0.09] text-neutral-950 dark:text-white'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/70 dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                          <Search className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-400 dark:text-neutral-500'}`} />
                          <span className="truncate text-[13px] font-medium">{item.text}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0 ml-2">
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

  if (
    prevProps.activeTabId !== nextProps.activeTabId ||
    prevProps.searchEngine !== nextProps.searchEngine ||
    prevProps.onSelectTab !== nextProps.onSelectTab ||
    prevProps.onNewTab !== nextProps.onNewTab ||
    prevProps.onCloseTab !== nextProps.onCloseTab ||
    prevProps.onNavigate !== nextProps.onNavigate ||
    prevProps.onClose !== nextProps.onClose
  ) {
    return false;
  }

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
