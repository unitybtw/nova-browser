import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Search,
  Plus,
  Star,
  Globe,
  X,
  Menu,
  BookOpen,
  Clock,
  Download,
  Columns,
  Pin,
  Volume2,
  VolumeX,
  Share2,
  CopyPlus,
  ShieldOff,
  Shield,
  ZoomIn,
  ZoomOut,
  Settings,
  Camera,
  Sparkles,
  Puzzle
} from 'lucide-react';
import { Tab, Bookmark } from '../types/browser';
import { formatSearchUrl, getSearchEngineName } from '../utils/searchEngine';
import { UserSettings } from '../App';

interface TopBarProps {
  tabs: Tab[];
  workspaces?: import('../types/browser').Workspace[];
  activeWorkspaceId?: string;
  onSelectWorkspace?: (id: string) => void;
  activeTabId: string;
  bookmarks: Bookmark[];
  isSplitView: boolean;
  isIncognito?: boolean;
  useVerticalTabs?: boolean;
  searchEngine?: 'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia';
  onToggleBookmark: () => void;
  onOpenHistory: () => void;
  onOpenDownloads: () => void;
  onOpenSettings: () => void;
  onOpenShare: () => void;
  onTakeScreenshot: () => void;
  onOpenFindInPage: () => void;
  onToggleSplitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onDuplicateTab: (id: string, e: React.MouseEvent) => void;
  onTogglePinTab: (id: string, e: React.MouseEvent) => void;
  onToggleMuteTab: (id: string, e: React.MouseEvent) => void;
  onTogglePip?: (id: string) => void;
  onSelectTab: (id: string) => void;
  onNewTab: (url?: string) => void;
  onNewIncognitoTab: () => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onNavigate: (url: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  isVpnEnabled?: boolean;
  onToggleVpn?: () => void;
  onToggleAIAssistant: () => void;
  activeDownloadsCount?: number;
  showBookmarksBar?: boolean;
  onToggleReaderMode?: () => void;
  onOpenExtensions: () => void;
}

export const TopBar: React.FC<TopBarProps> = React.memo(({
  tabs,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  activeTabId,
  bookmarks,
  activeDownloadsCount,
  isSplitView,
  isIncognito = false,
  useVerticalTabs = false,
  searchEngine = 'google',
  onToggleBookmark,
  onOpenHistory,
  onOpenDownloads,
  onOpenSettings,
  onOpenShare,
  onTakeScreenshot,
  onOpenFindInPage,
  onToggleSplitView,
  onZoomIn,
  onZoomOut,
  onDuplicateTab,
  onTogglePinTab,
  onToggleMuteTab,
  onTogglePip,
  onSelectTab,
  onNewTab,
  onNewIncognitoTab,
  onCloseTab,
  onNavigate,
  onGoBack,
  onGoForward,
  onReload,
  isVpnEnabled = false,
  onToggleVpn,
  onToggleAIAssistant,
  showBookmarksBar = true,
  onToggleReaderMode,
  onOpenExtensions
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null);
  const [hoverPos, setHoverPos] = useState({ left: 0, width: 0 });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const activeTab = React.useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  const isBookmarked = React.useMemo(() => bookmarks.some(b => b.url === activeTab?.url), [bookmarks, activeTab?.url]);

  useEffect(() => {
    if (!searchValue || searchValue.includes('://') || searchValue.includes('.') || activeTab?.url === searchValue) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getSuggestions) {
          const results = await (window as any).electronAPI.getSuggestions(searchValue);
          if (Array.isArray(results)) {
            setSuggestions(results.slice(0, 6));
            return;
          }
        }
        const response = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(searchValue)}&type=list`);
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
  }, [searchValue, activeTab?.url]);

  const handleSearchSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    const url = formatSearchUrl(searchValue, searchEngine);
    onNavigate(url);
    setSearchValue('');
    setShowSuggestions(false);
  }, [searchValue, searchEngine, onNavigate]);

  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const activeWorkspace = workspaces?.find(w => w.id === activeWorkspaceId) || workspaces?.[0];

  return (
    <>
    <header className={`w-full flex flex-col select-none drag-region border-b relative z-50 ${isIncognito ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100'}`}>
      {/* 
        ROW 1: Tabs & Window Controls spacer
      */}
      {!useVerticalTabs && (
        <div className="flex items-end px-2 pt-2.5 h-11 gap-1">
          {/* Spacer for Mac traffic lights (usually ~70px on left) */}
          <div className="w-[70px] shrink-0" />
          
          {/* Workspace Selector */}
          {workspaces && activeWorkspace && onSelectWorkspace && (
            <div className="relative no-drag mb-1">
              <button
                onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-slate-200/50 hover:bg-slate-300/50 text-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 dark:text-slate-300 transition-colors mr-1"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeWorkspace.color === 'slate' ? '#64748b' : activeWorkspace.color === 'blue' ? '#3b82f6' : '#a855f7' }} />
                <span>{activeWorkspace.name}</span>
              </button>
              {isWorkspaceDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsWorkspaceDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
                    {workspaces.map(w => (
                      <button
                        key={w.id}
                        onClick={() => {
                          onSelectWorkspace(w.id);
                          setIsWorkspaceDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: w.color === 'slate' ? '#64748b' : w.color === 'blue' ? '#3b82f6' : w.color === 'emerald' ? '#10b981' : w.color === 'amber' ? '#f59e0b' : '#a855f7' }} />
                        <span className={w.id === activeWorkspaceId ? 'font-medium text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}>{w.name}</span>
                      </button>
                    ))}
                    <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                    <button
                      onClick={() => {
                        setIsWorkspaceDropdownOpen(false);
                        window.dispatchEvent(new CustomEvent('open-workspace-manager'));
                      }}
                      className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Manage Workspaces</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

        {/* Tabs */}
        <div className="flex-1 flex items-end gap-1 overflow-x-auto overflow-y-hidden no-scrollbar drag-region">
          <AnimatePresence mode="popLayout">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, minWidth: 0, width: 0, paddingLeft: 0, paddingRight: 0, margin: 0, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group flex items-center justify-between px-3 py-1.5 flex-1 min-w-[120px] max-w-[240px] rounded-t-xl text-[13px] cursor-pointer transition-colors border-t border-x no-drag ${
                  isActive
                    ? isIncognito
                      ? 'bg-slate-800 text-slate-100 border-slate-700 font-semibold shadow-xs border-t-2 border-t-blue-500 relative z-10'
                      : 'bg-white text-slate-900 border-slate-300/80 font-semibold shadow-xs border-t-2 border-t-blue-500 relative z-10 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                    : isIncognito
                      ? 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border-transparent font-medium'
                      : 'bg-slate-200/40 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border-transparent font-medium dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden"
                     onMouseEnter={(e) => {
                       if (isActive) return;
                       const rect = e.currentTarget.getBoundingClientRect();
                       setHoveredTab(tab);
                       setHoverPos({ left: rect.left, width: rect.width });
                     }}
                     onMouseLeave={() => setHoveredTab(null)}
                >
                  {tab.isLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-blue-500/50 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : tab.favicon ? (
                    <img src={tab.favicon} alt="" className="w-3.5 h-3.5 rounded-sm shrink-0" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">{tab.title || tab.url || 'New Tab'}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {tab.isMuted ? (
                    <button
                      onClick={(e) => onToggleMuteTab(tab.id, e)}
                      className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 dark:hover:bg-slate-700 transition-all shrink-0"
                      title="Unmute Tab"
                    >
                      <VolumeX className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  ) : tab.isPlayingAudio ? (
                    <div className="flex items-center gap-1">
                      {onTogglePip && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onTogglePip(tab.id); }}
                          className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-blue-500 dark:hover:bg-slate-700 transition-all shrink-0"
                          title="Picture in Picture"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-picture-in-picture-2"><path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"/><rect width="10" height="7" x="12" y="13" rx="2"/></svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => onToggleMuteTab(tab.id, e)}
                        className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 dark:hover:bg-slate-700 transition-all shrink-0"
                        title="Mute Tab"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                      </button>
                    </div>
                  ) : null}

                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.id, e);
                      }}
                      className="opacity-50 hover:opacity-100 p-0.5 rounded-full hover:bg-slate-200 hover:text-slate-900 transition-all shrink-0"
                      title="Close Tab"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                
                {/* Active Tab Bottom Cover (to blend with the toolbar below) */}
                {isActive && (
                  <div className={`absolute -bottom-px left-0 right-0 h-px z-20 ${isIncognito ? 'bg-slate-800' : 'bg-white dark:bg-slate-800'}`} />
                )}
              </motion.div>
            );
          })}
          </AnimatePresence>
          
          {/* New Tab Button */}
          <button
            onClick={() => onNewTab()}
            className={`p-1.5 mb-1 ml-1 rounded-lg transition-all shrink-0 no-drag ${isIncognito ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}`}
            title="New Tab"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* New Incognito Tab Button */}
          <button
            onClick={onNewIncognitoTab}
            className={`p-1.5 mb-1 rounded-lg transition-all shrink-0 no-drag ${isIncognito ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-800 hover:text-slate-100'}`}
            title="New Private / Incognito Tab"
          >
            <ShieldOff className="w-4 h-4" />
          </button>
        </div>
      </div>
      )}

      {/* 
        ROW 2: Toolbar (Nav, Omnibox, Extensions)
      */}
      <div 
        className={`flex items-center px-3 py-1.5 gap-3 no-drag ${isIncognito ? 'bg-slate-800 border-b border-slate-700' : 'bg-white dark:bg-slate-800 dark:border-b dark:border-slate-700'}`}
      >
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <button onClick={onGoBack} disabled={!activeTab?.canGoBack} className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`} title="Go Back">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={onGoForward} disabled={!activeTab?.canGoForward} className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`} title="Go Forward">
            <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onReload} className={`p-1.5 rounded-lg transition-colors ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`} title="Reload Page">
            <RotateCw className={`w-4 h-4 ${activeTab?.isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => onNavigate('nova://newtab')} className={`p-1.5 rounded-lg transition-colors ml-0.5 ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`} title="New Tab Page">
            <Home className="w-4 h-4" />
          </button>
        </div>

        {/* Omnibox / Address Bar */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-3xl relative">
            <form onSubmit={handleSearchSubmit} className="relative group w-full">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                <Globe className={`w-3.5 h-3.5 transition-colors ${isIncognito ? 'text-slate-400 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`} />
              </div>
              <input
                type="text"
                value={searchValue || activeTab?.url || ''}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => {
                  setSearchValue(activeTab?.url || '');
                  setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={`Search ${getSearchEngineName(searchEngine)} or type a URL`}
                className={`w-full border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-100/50 rounded-full py-1.5 pl-9 pr-9 text-[13px] outline-none transition-all shadow-2xs ${
                  isIncognito 
                    ? 'bg-slate-900/80 hover:bg-slate-900 focus:bg-slate-900 text-slate-200 placeholder-slate-500' 
                    : 'bg-slate-100/90 hover:bg-slate-200/60 focus:bg-white text-slate-800 placeholder-slate-400 dark:bg-slate-900/80 dark:hover:bg-slate-900 dark:focus:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500'
                }`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {activeTab?.zoomLevel !== undefined && activeTab.zoomLevel !== 0 && (
                  <div 
                    className={`px-1.5 py-0.5 mr-1 rounded-md text-[10px] font-bold cursor-default select-none transition-all ${isIncognito ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
                    title="Zoom Level"
                  >
                    {Math.round(Math.pow(1.2, activeTab.zoomLevel) * 100)}%
                  </div>
                )}
                {onToggleReaderMode && (
                  <button 
                    type="button" 
                    onClick={onToggleReaderMode}
                    className={`p-1 rounded-full transition-all ${isIncognito ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
                    title="Toggle Reader Mode"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={onToggleBookmark}
                  className={`p-1 rounded-full transition-all ${isIncognito ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
                  title="Bookmark Page"
                >
                  <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-blue-500 text-blue-500' : ''}`} />
                </button>
                
                {/* Quick AI Actions Dropdown */}
                <div className="relative group/ai">
                  <button 
                    type="button"
                    className={`p-1 rounded-full transition-all ${isIncognito ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-blue-500 hover:bg-blue-100 dark:hover:bg-slate-700'}`}
                    title="Quick AI Actions"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 opacity-0 invisible group-hover/ai:opacity-100 group-hover/ai:visible transition-all">
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('ai-quick-action', { detail: 'Bu sayfayı benim için özetle.' }))}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      Sayfayı Özetle
                    </button>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('ai-quick-action', { detail: 'Bu sayfadaki metinleri Türkçeye çevir.' }))}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      Türkçeye Çevir
                    </button>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('ai-quick-action', { detail: 'Bu sayfadaki en önemli 3 noktayı maddeler halinde çıkar.' }))}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      Önemli Noktaları Çıkar
                    </button>
                  </div>
                </div>
              </div>
          </form>

            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchValue.trim().length > 0 && (
              <div className={`absolute left-0 right-0 top-full mt-2 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden divide-y ${isIncognito ? 'bg-slate-800 border border-slate-700 divide-slate-700' : 'bg-white border border-slate-200/80 divide-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:divide-slate-700'}`}>
              
              {/* Primary Direct Action */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSuggestions(false);
                    onNavigate(formatSearchUrl(searchValue, searchEngine));
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors group ${isIncognito ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-blue-50/70 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}`}
                >
                {searchValue.includes('.') || searchValue.includes('://') ? (
                  <>
                    <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate font-medium text-blue-600">Siteye Git: <span className="underline">{searchValue}</span></span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
                    <span className="truncate">{getSearchEngineName(searchEngine)} ile Ara: <strong className="text-slate-900">{searchValue}</strong></span>
                  </>
                )}
              </button>

              {/* Suggestions with 'Bunu mu kastettiniz?' badge */}
              {suggestions.length > 0 && (
                <div className="py-1">
                  {suggestions[0] && suggestions[0].toLowerCase() !== searchValue.trim().toLowerCase() && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchValue(suggestions[0]);
                        setShowSuggestions(false);
                        onNavigate(formatSearchUrl(suggestions[0], searchEngine));
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-amber-50/80 text-slate-800 text-sm text-left transition-colors group bg-amber-50/30"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Search className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="truncate font-semibold text-slate-900">{suggestions[0]}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full shrink-0">
                        Bunu mu kastettiniz?
                      </span>
                    </button>
                  )}

                  <div className="px-4 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Arama Önerileri
                  </div>

                  {suggestions
                    .slice(suggestions[0] && suggestions[0].toLowerCase() !== searchValue.trim().toLowerCase() ? 1 : 0)
                    .map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSearchValue(suggestion);
                          setShowSuggestions(false);
                          onNavigate(formatSearchUrl(suggestion, searchEngine));
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm text-left transition-colors"
                      >
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{suggestion}</span>
                      </button>
                    ))}
                </div>
              )}

              {/* Matching Bookmarks */}
              {bookmarks.filter(b => b.title.toLowerCase().includes(searchValue.toLowerCase()) || b.url.toLowerCase().includes(searchValue.toLowerCase())).length > 0 && (
                <div className="py-1">
                  <div className="px-4 pt-1 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Yer İmleri
                  </div>
                  {bookmarks
                    .filter(b => b.title.toLowerCase().includes(searchValue.toLowerCase()) || b.url.toLowerCase().includes(searchValue.toLowerCase()))
                    .slice(0, 3)
                    .map((bookmark) => (
                      <button
                        key={bookmark.id}
                        type="button"
                        onClick={() => {
                          setShowSuggestions(false);
                          onNavigate(bookmark.url);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm text-left transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                          <span className="truncate font-medium">{bookmark.title}</span>
                        </div>
                        <span className="text-xs text-slate-400 truncate max-w-[150px]">{bookmark.url}</span>
                      </button>
                    ))}
                </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Extensions / Split View / Menu */}
        <div className="flex items-center gap-1 ml-auto relative">
          <button 
            onClick={onToggleAIAssistant}
            className={`p-1.5 rounded transition-colors ${
              isIncognito 
                ? 'hover:bg-indigo-900/40 text-indigo-400' 
                : 'hover:bg-indigo-50 text-indigo-500 dark:hover:bg-indigo-900/30 dark:text-indigo-400'
            }`}
            title="AI Browser Assistant"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
          <button 
            onClick={onToggleVpn}
            className={`p-1.5 rounded transition-colors ${
              isVpnEnabled 
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                : isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
            title="VPN (Proxy)"
          >
            <Shield className="w-4 h-4" />
          </button>
          <button 
            onClick={onOpenExtensions}
            className={`p-1.5 rounded transition-colors ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`}
            title="Extensions"
          >
            <Puzzle className="w-4 h-4" />
          </button>
          <button 
            onClick={onToggleSplitView}
            className={`p-1.5 rounded transition-colors ${
              isSplitView ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Toggle Split View (Side-by-Side)"
          >
            <Columns className="w-4 h-4" />
          </button>
          
          <div className="relative group/menu">
            <button className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors" title="More Options">
              <Menu className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-50 flex flex-col py-2 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700">
                <span className="text-sm text-slate-700 dark:text-slate-300">Zoom</span>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
                  <button onClick={onZoomOut} className="p-1 rounded hover:bg-white dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300" title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></button>
                  <button onClick={onZoomIn} className="p-1 rounded hover:bg-white dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300" title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
              <button onClick={onTakeScreenshot} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm text-left">
                <Camera className="w-4 h-4 text-slate-400" /> Screenshot
              </button>
              <button onClick={onOpenShare} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm text-left">
                <Share2 className="w-4 h-4 text-slate-400" /> Share Link
              </button>
              <button onClick={onOpenFindInPage} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm text-left">
                <Search className="w-4 h-4 text-slate-400" /> Find in Page
              </button>
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
              <button onClick={onOpenDownloads} className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm text-left">
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 text-slate-400" /> Downloads
                </div>
                {(activeDownloadsCount || 0) > 0 && <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">{activeDownloadsCount}</span>}
              </button>
              <button onClick={onOpenHistory} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm text-left">
                <Clock className="w-4 h-4 text-slate-400" /> History
              </button>
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
              <button onClick={onOpenSettings} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm text-left">
                <Settings className="w-4 h-4 text-slate-400" /> Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ROW 3: Bookmarks Bar
      */}
      {showBookmarksBar && (
        <div 
          className={`flex items-center px-3 py-1 gap-2 border-t overflow-x-auto no-scrollbar no-drag ${
            isIncognito ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-800'
          }`}
        >
          {(bookmarks.length > 0 ? bookmarks : [
            { id: 'bm_google', title: 'Google', url: 'https://google.com', addedAt: Date.now() },
            { id: 'bm_github', title: 'GitHub', url: 'https://github.com', addedAt: Date.now() },
            { id: 'bm_youtube', title: 'YouTube', url: 'https://youtube.com', addedAt: Date.now() },
            { id: 'bm_wikipedia', title: 'Wikipedia', url: 'https://wikipedia.org', addedAt: Date.now() },
            { id: 'bm_reddit', title: 'Reddit', url: 'https://reddit.com', addedAt: Date.now() }
          ] as unknown as Bookmark[]).map(bookmark => (
            <button
              key={bookmark.id}
              onClick={() => onNavigate(bookmark.url)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-[12px] max-w-[150px] group ${
                isIncognito 
                  ? 'hover:bg-slate-700 text-slate-300' 
                  : 'hover:bg-slate-200/70 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
              title={bookmark.url}
            >
              {bookmark.favicon ? (
                <img src={bookmark.favicon} className="w-3.5 h-3.5 rounded-sm" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
              )}
              <span className="truncate font-medium">{bookmark.title}</span>
            </button>
          ))}
        </div>
      )}
    </header>

    {/* Tab Peek rendered via Portal to escape overflow-hidden */}
    {hoveredTab && hoveredTab.thumbnail && createPortal(
      <AnimatePresence>
        <motion.div
          key="topbar-tab-peek"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -5, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="pointer-events-none"
          style={{
            position: 'fixed',
            top: 50,
            left: Math.max(10, Math.min(hoverPos.left + (hoverPos.width / 2) - (272 / 2), window.innerWidth - 282)),
            zIndex: 999999,
            width: 272,
            borderRadius: 12,
            overflow: 'hidden',
            background: 'white',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {hoveredTab.favicon && (
                <img src={hoveredTab.favicon} style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
              )}
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {hoveredTab.title || 'New Tab'}
              </div>
            </div>
          </div>
          <div style={{ width: '100%', aspectRatio: '16/9', background: '#f1f5f9', position: 'relative' }}>
            <img src={hoveredTab.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body
    )}
    </>
  );
});
