import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, Plus, X } from 'lucide-react';
import { Tab } from '../types/browser';
import { formatSearchUrl, getSearchEngineName } from '../utils/searchEngine';
import { UserSettings } from '../App';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

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
  const [isAIMode, setIsAIMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useModalFocusTrap(isOpen, onClose, containerRef);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setSuggestions([]);
      setIsAIMode(false);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isAIMode || !inputValue || inputValue.includes('://') || inputValue.includes('.')) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getSuggestions) {
          const results = await (window as any).electronAPI.getSuggestions(inputValue);
          if (Array.isArray(results)) {
            setSuggestions(results.slice(0, 6));
            return;
          }
        }
        const response = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(inputValue)}&type=list`);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data) && data.length > 1) {
            setSuggestions(data[1].slice(0, 6));
          }
        }
      } catch (err) {
        // ignore errors
      }
    };

    const timer = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(timer);
  }, [inputValue, isAIMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      onClose();
      return;
    }

    if (isAIMode || inputValue.startsWith('@ai ') || inputValue.startsWith('ai:')) {
      let prompt = inputValue;
      if (prompt.startsWith('@ai ')) prompt = prompt.substring(4);
      if (prompt.startsWith('ai:')) prompt = prompt.substring(3);
      
      window.dispatchEvent(new CustomEvent('ai-quick-action', { detail: prompt.trim() }));
      setInputValue('');
      setIsAIMode(false);
      onClose();
      return;
    }

    const url = formatSearchUrl(inputValue, searchEngine);
    onNewTab(url);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />
      
      <div 
        ref={containerRef}
        className={`relative w-full max-w-2xl backdrop-blur-2xl rounded-2xl shadow-2xl border overflow-hidden animate-float outline-none transition-all duration-500 ${isAIMode ? 'bg-purple-50/95 dark:bg-purple-900/40 border-purple-400/50 dark:border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.4)]' : 'bg-white/95 dark:bg-slate-900/95 border-[var(--glass-border)] dark:border-slate-700/50'}`}
        tabIndex={-1}
      >
        
        <form onSubmit={handleSubmit} className={`flex items-center gap-3 px-5 py-4 border-b transition-colors ${isAIMode ? 'border-purple-200 dark:border-purple-800/50' : 'border-gray-100 dark:border-slate-800/80'}`}>
          <Search className={`w-5 h-5 transition-colors ${isAIMode ? 'text-purple-500' : 'text-gray-400 dark:text-slate-500'}`} />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && inputValue.trim().toLowerCase() === '@ai') {
                e.preventDefault();
                setIsAIMode(true);
                setInputValue('');
              }
            }}
            placeholder={isAIMode ? "AI: Ne yapmamı istersiniz? (Örn: Trendyol'dan mavi tişört bul)" : `Search ${getSearchEngineName(searchEngine)}, type URL or @ai for AI Agent...`}
            className={`flex-1 bg-transparent border-none outline-none text-lg font-sans transition-all duration-300 ${isAIMode ? 'text-purple-900 dark:text-purple-100 placeholder-purple-400 dark:placeholder-purple-300' : 'text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500'}`}
            autoFocus
          />
          <div className="flex gap-2">
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
              ESC
            </kbd>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
              Enter
            </kbd>
          </div>
        </form>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          <div className="px-3 py-2 text-xs font-serif italic text-gray-400 dark:text-slate-500 flex items-center justify-between">
            <span>Açık Sekmeler</span>
          </div>

          <div className="space-y-1">
            {suggestions.length > 0 ? (
              suggestions.map((suggestion, idx) => (
                <div
                  key={`sug-${idx}`}
                  onClick={() => {
                    setInputValue(suggestion);
                    onNewTab(formatSearchUrl(suggestion, searchEngine));
                    onClose();
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:text-gray-800 dark:hover:text-slate-200"
                >
                  <Search className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <span className="truncate text-sm font-medium">{suggestion}</span>
                </div>
              ))
            ) : (
              tabs.map(tab => (
                <div 
                  key={tab.id}
                  onClick={() => { onSelectTab(tab.id); onClose(); }}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    tab.id === activeTabId 
                      ? 'bg-gray-50 dark:bg-slate-800/80 text-gray-800 dark:text-slate-200' 
                      : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/50 hover:text-gray-800 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {tab.favicon ? (
                      <img src={tab.favicon} className="w-4 h-4 rounded-sm" alt="" />
                    ) : (
                      <Globe className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                    )}
                    <span className="truncate text-sm font-medium">{tab.title || tab.url || 'Yeni Sekme'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
});
