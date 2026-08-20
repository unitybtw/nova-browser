import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DownloadsPopover } from './DownloadsPopover';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
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
  Puzzle,
  ShieldCheck,
  Cpu,
  Lock,
  Unlock,
  ShieldAlert,
  HelpCircle,
  Network,
  MonitorSmartphone,
  ScanSearch,
  VenetianMask,
  Moon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Tab, Bookmark } from '../types/browser';
import { formatSearchUrl, getSearchEngineName } from '../utils/searchEngine';
import { getUrlSecurityInfo } from '../utils/securityUtils';
import { AdBlockerPopover } from './AdBlockerPopover';
import { UserSettings } from '../App';

const WORKSPACE_COLORS: Record<string, string> = {
  slate: '#64748b',
  blue: '#3b82f6',
  emerald: '#10b981',
  purple: '#a855f7',
  rose: '#f43f5e',
  amber: '#f59e0b'
};

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
  tabStyle?: 'rounded' | 'square' | 'floating';
  searchEngine?: UserSettings['searchEngine'];
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
  onSuspendTab?: (id: string) => void;
  onReorderTabs?: (draggedId: string, targetId: string) => void;
  onReorderFullList?: (newTabs: Tab[]) => void;
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
  downloads?: any[];
  onClearDownloads?: () => void;
  showBookmarksBar?: boolean;
  onToggleReaderMode?: () => void;
  onOpenExtensions: () => void;
  onTabDragStart?: () => void;
  onTabDragEnd?: () => void;
  onTabDrag?: (y: number) => void;
  onDropToSplitScreen?: (tabId: string) => void;
  splitTabId?: string | null;
  onCloseSplit?: () => void;
}

const MemoizedTabItem = React.memo(({ 
  tab, isActive, isSplitChild, splitTab, ghostTab, tabStyle, isIncognito,
  onTabDragStart, onTabDrag, onTabDragEnd, onDropToSplitScreen,
  onSelectTab, onCloseSplit, onToggleMuteTab, onTogglePip, onCloseTab,
  tabsLength, setGhostTab
}: any) => {
  if (isSplitChild) return null;

  return (
    <Reorder.Item
      key={tab.id}
      value={tab}
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: ghostTab?.id === tab.id ? 0 : 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }}
      whileDrag={{ scale: 1.04, zIndex: 50, cursor: 'grabbing' }}
      onDragStart={() => onTabDragStart?.()}
      onDrag={(e, info) => {
        onTabDrag?.(info.point.y);
        if (info.point.y > 60) {
          setGhostTab({ id: tab.id, x: info.point.x, y: info.point.y });
        } else {
          setGhostTab(null);
        }
      }}
      onDragEnd={(e, info) => {
        onTabDragEnd?.();
        setGhostTab(null);
        if (info.point.y > 60) {
          onDropToSplitScreen?.(tab.id);
        }
      }}
      onClick={() => onSelectTab(tab.id)}
      data-tab-id={tab.id}
      className={`group flex items-center justify-between ${splitTab ? 'px-1.5' : 'px-3'} flex-1 min-w-[120px] ${splitTab ? 'max-w-[320px]' : 'max-w-[240px]'} text-[13px] cursor-grab active:cursor-grabbing transition-colors no-drag ${
        tabStyle === 'floating' ? 'h-[32px] mb-1 rounded-lg border mx-0.5' : 
        tabStyle === 'square' ? 'h-[34px] rounded-none border-t border-x' : 
        'h-[34px] rounded-t-xl border-t border-x'
      } ${
        isActive
          ? isIncognito
            ? 'bg-slate-800 text-slate-100 border-slate-700 font-semibold shadow-xs border-t-2 border-t-blue-500 relative z-10'
            : 'bg-white text-slate-900 border-slate-300/80 font-semibold shadow-xs border-t-2 border-t-blue-500 relative z-10 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
          : isIncognito
            ? 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border-transparent font-medium'
            : 'bg-slate-200/40 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border-transparent font-medium dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
      }`}
    >
      {splitTab ? (
        <div className="flex w-full items-center h-full">
          {/* Primary Tab Half */}
          <div 
            className="flex flex-1 items-center gap-1.5 px-1.5 min-w-0 h-full rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectTab(tab.id); }}
            title={tab.title}
          >
            {tab.isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-blue-500/50 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : tab.favicon ? (
              <img src={tab.favicon} className="w-3.5 h-3.5 rounded-sm shrink-0" />
            ) : (
              <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />
            )}
            <span className="truncate text-[12px] font-semibold">{tab.title || tab.url || 'New Tab'}</span>
          </div>

          <div className="w-[1px] h-4 bg-slate-300/80 dark:bg-slate-600/80 shrink-0 mx-0.5" />

          {/* Secondary Tab Half */}
          <div 
            className="flex flex-1 items-center gap-1.5 px-1.5 min-w-0 h-full rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectTab(splitTab.id); }}
            title={splitTab.title}
          >
            {splitTab.favicon ? <img src={splitTab.favicon} className="w-3.5 h-3.5 rounded-sm shrink-0" /> : <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />}
            <span className="truncate text-[12px] font-semibold flex-1">{splitTab.title || splitTab.url || 'New Tab'}</span>
            
            <button onClick={(e) => { e.stopPropagation(); onCloseSplit?.(); }} className="ml-auto p-0.5 rounded-sm hover:bg-red-500/20 text-slate-400 hover:text-red-500 shrink-0 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden px-1">
            {tab.isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-blue-500/50 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : tab.favicon ? (
              <img src={tab.favicon} alt="" className="w-3.5 h-3.5 rounded-sm shrink-0" />
            ) : tab.url === 'nova://settings' ? (
              <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : tab.url === 'nova://history' ? (
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : tab.url === 'nova://downloads' ? (
              <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (tab.url === 'nova://newtab' || tab.url === 'about:blank' || tab.url === 'https://newtab') ? (
              tab.isIncognito ? <VenetianMask className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="truncate">{tab.title || tab.url || 'New Tab'}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1">
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

            {tab.isSuspended && (
              <span className="p-0.5 text-indigo-400 shrink-0" title="Suspended Tab (Memory Saver)">
                <Moon className="w-3.5 h-3.5 opacity-80" />
              </span>
            )}

            {tabsLength > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id, e);
                }}
                className={`p-0.5 rounded-full transition-all shrink-0 ${
                  isActive
                    ? 'hover:bg-slate-200 text-slate-500 hover:text-red-500 dark:hover:bg-slate-700 dark:text-slate-400'
                    : 'opacity-0 group-hover:opacity-100 hover:bg-slate-300 text-slate-500 hover:text-red-500 dark:hover:bg-slate-700 dark:text-slate-400'
                }`}
                title="Close Tab"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </>
      )}

      {/* Active Tab Bottom Cover (to blend with the toolbar below) */}
      {isActive && (
        <div className={`absolute -bottom-px left-0 right-0 h-px z-20 ${isIncognito ? 'bg-slate-800' : 'bg-white dark:bg-slate-800'}`} />
      )}
    </Reorder.Item>
  );
}, (prevProps: any, nextProps: any) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.isSplitChild === nextProps.isSplitChild &&
    prevProps.splitTab?.id === nextProps.splitTab?.id &&
    prevProps.splitTab?.title === nextProps.splitTab?.title &&
    prevProps.splitTab?.url === nextProps.splitTab?.url &&
    prevProps.splitTab?.favicon === nextProps.splitTab?.favicon &&
    prevProps.ghostTab?.id === nextProps.ghostTab?.id &&
    prevProps.tab.id === nextProps.tab.id &&
    prevProps.tab.url === nextProps.tab.url &&
    prevProps.tab.title === nextProps.tab.title &&
    prevProps.tab.favicon === nextProps.tab.favicon &&
    prevProps.tab.isLoading === nextProps.tab.isLoading &&
    prevProps.tab.isMuted === nextProps.tab.isMuted &&
    prevProps.tab.isPlayingAudio === nextProps.tab.isPlayingAudio &&
    prevProps.tab.isSuspended === nextProps.tab.isSuspended &&
    prevProps.tabsLength === nextProps.tabsLength &&
    prevProps.tabStyle === nextProps.tabStyle
  );
});

interface OmniboxBarProps {
  activeTab?: Tab;
  isIncognito?: boolean;
  searchEngine: UserSettings['searchEngine'];
  bookmarks: Bookmark[];
  useVerticalTabs?: boolean;
  onNavigate: (url: string) => void;
  onToggleReaderMode?: () => void;
  onToggleBookmark?: () => void;
  isBookmarked: boolean;
}

export const OmniboxBar: React.FC<OmniboxBarProps> = React.memo(({
  activeTab,
  isIncognito,
  searchEngine,
  bookmarks,
  useVerticalTabs,
  onNavigate,
  onToggleReaderMode,
  onToggleBookmark,
  isBookmarked,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isFocused) {
      setSearchValue(activeTab?.url || '');
    }
  }, [activeTab?.url, isFocused]);

  useEffect(() => {
    if (isAIMode || !searchValue || searchValue.includes('://') || searchValue.includes('.')) {
      setSuggestions([]);
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchSuggestions = async () => {
      try {
        const clientLocale = typeof navigator !== 'undefined' ? navigator.language : 'tr-TR';
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getSuggestions) {
          const results = await (window as any).electronAPI.getSuggestions(searchValue, searchEngine, clientLocale);
          if (!abortController.signal.aborted && Array.isArray(results)) {
            setSuggestions(results.slice(0, 6));
            return;
          }
        }
        const lang = clientLocale.split('-')[0] || 'tr';
        const country = clientLocale.split('-')[1] || (lang === 'tr' ? 'TR' : 'US');
        const response = await fetch(
          `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(searchValue)}&hl=${lang}&gl=${country}`,
          { signal: abortController.signal }
        );
        if (!abortController.signal.aborted && response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data) && Array.isArray(data[1])) {
            setSuggestions(data[1].slice(0, 6));
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // ignore network errors
        }
      }
    };

    const timer = setTimeout(fetchSuggestions, 150);
    setSelectedIndex(-1);
    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [searchValue, isAIMode]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    let targetValue = searchValue;
    const matchedBookmarks = bookmarks
      .filter(b => b.title.toLowerCase().includes(searchValue.toLowerCase()) || b.url.toLowerCase().includes(searchValue.toLowerCase()))
      .slice(0, 3);

    if (selectedIndex > -1 && selectedIndex < suggestions.length) {
      targetValue = suggestions[selectedIndex];
    } else if (selectedIndex >= suggestions.length && selectedIndex < suggestions.length + matchedBookmarks.length) {
      targetValue = matchedBookmarks[selectedIndex - suggestions.length].url;
    }

    if (isAIMode || targetValue.startsWith('@ai ') || targetValue.startsWith('ai:')) {
      let prompt = targetValue;
      if (prompt.startsWith('@ai ')) prompt = prompt.substring(4);
      if (prompt.startsWith('ai:')) prompt = prompt.substring(3);
      
      window.dispatchEvent(new CustomEvent('ai-quick-action', { detail: prompt.trim() }));
      setSearchValue('');
      setIsAIMode(false);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      return;
    }

    const url = formatSearchUrl(targetValue, searchEngine);
    onNavigate(url);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    // Blur the active element to drop focus
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [searchValue, searchEngine, onNavigate, isAIMode, selectedIndex, suggestions, bookmarks]);

  return (
    <div className="flex-1 flex w-full mx-1 transition-all duration-200 ease-out" style={{ transform: isFocused ? 'scale(1.005)' : 'scale(1)' }}>
      <div className="w-full relative">
        <form onSubmit={handleSearchSubmit} className="relative group w-full">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none z-10">
            {isIncognito ? (
              <div className="flex items-center gap-1.5 text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-lg shadow-xs" title="Private & Incognito Mode">
                <VenetianMask className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Incognito</span>
              </div>
            ) : (
              (() => {
                const sec = getUrlSecurityInfo(activeTab?.url || '');
                return (
                  <div className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-md transition-colors ${sec.bgColor} ${sec.color}`} title={sec.tooltip}>
                    {sec.level === 'internal' && <Home className="w-3.5 h-3.5" />}
                    {sec.level === 'secure' && <Lock className="w-3.5 h-3.5" />}
                    {sec.level === 'http' && <Unlock className="w-3.5 h-3.5" />}
                    {sec.level === 'dangerous' && <ShieldAlert className="w-3.5 h-3.5" />}
                    {sec.level === 'unknown' && <HelpCircle className="w-3.5 h-3.5" />}
                  </div>
                );
              })()
            )}
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && searchValue.trim().toLowerCase() === '@ai') {
                e.preventDefault();
                setIsAIMode(true);
                setSearchValue('');
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const matchedBookmarksCount = bookmarks.filter(b => b.title.toLowerCase().includes(searchValue.toLowerCase()) || b.url.toLowerCase().includes(searchValue.toLowerCase())).slice(0, 3).length;
                const maxIndex = suggestions.length + matchedBookmarksCount - 1;
                setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : prev));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > -1 ? prev - 1 : -1));
              }
            }}
            onFocus={(e) => {
              setIsFocused(true);
              setShowSuggestions(true);
              e.target.select();
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder={isAIMode ? "AI: What would you like me to do? (e.g. Open YouTube and search for Tarkan)" : `Search ${getSearchEngineName(searchEngine)} or type a URL`}
            className={`w-full border border-slate-200/60 dark:border-white/10 focus:border-cyan-500 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl py-1.5 pr-24 text-[13px] outline-none transition-all duration-300 shadow-2xs ${
              isIncognito 
                ? 'pl-28 bg-slate-900/80 hover:bg-slate-900 focus:bg-slate-900 text-slate-200 placeholder-slate-500' 
                : 'pl-11 bg-slate-100/90 hover:bg-slate-200/60 focus:bg-white text-slate-800 placeholder-slate-400 dark:bg-slate-900/70 dark:hover:bg-slate-900 dark:focus:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500'
            } ${isAIMode ? 'border-cyan-400/50 ring-4 ring-cyan-500/20 bg-cyan-950/30 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : ''} ${
              (useVerticalTabs && !isFocused && !isAIMode) ? '!text-transparent !placeholder-transparent' : ''
            }`}
          />

          {/* Title & URL Overlay for Vertical Tabs Mode */}
          {useVerticalTabs && !isFocused && !isAIMode && (
            <div className={`absolute inset-0 pointer-events-none flex flex-col justify-center pr-24 ${isIncognito ? 'pl-28' : 'pl-11'}`}>
              <span className="text-[12px] font-semibold truncate text-slate-800 dark:text-slate-200 leading-[14px]">
                {activeTab?.title || 'New Tab'}
              </span>
              {activeTab?.url && activeTab.url !== 'nova://newtab' && (
                <span className="text-[10px] truncate text-slate-500 dark:text-slate-400 leading-[12px]">
                  {formatSearchUrl(activeTab.url)}
                </span>
              )}
            </div>
          )}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
            {activeTab?.zoomFactor !== undefined && activeTab.zoomFactor !== 1.0 && (
              <div 
                className={`px-1.5 py-0.5 mr-1 rounded-md text-[10px] font-bold cursor-default select-none transition-all ${isIncognito ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
                title="Zoom Level"
              >
                {Math.round(activeTab.zoomFactor * 100)}%
              </div>
            )}

            {onToggleReaderMode && (
              <button 
                type="button" 
                onClick={onToggleReaderMode}
                className={`p-1 rounded-lg transition-all ${isIncognito ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
                title="Toggle Reader Mode"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
            )}

            <button 
              type="button" 
              onClick={onToggleBookmark}
              className={`p-1 rounded-lg transition-all ${isIncognito ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
              title="Bookmark Page"
            >
              <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-cyan-500 text-cyan-500' : ''}`} />
            </button>
          </div>
        </form>

        {/* Search Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && searchValue.trim().length > 0 && (() => {
            const matchedBookmarks = bookmarks
              .filter(b => b.title.toLowerCase().includes(searchValue.toLowerCase()) || b.url.toLowerCase().includes(searchValue.toLowerCase()))
              .slice(0, 3);
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`absolute left-0 right-0 top-full mt-2 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden divide-y ${isIncognito ? 'bg-slate-800 border border-slate-700 divide-slate-700' : 'bg-white/95 backdrop-blur-xl border border-slate-200/80 divide-slate-100 dark:bg-slate-900/95 dark:border-white/10 dark:divide-white/5'}`}
                onMouseDown={(e) => e.preventDefault()}
              >
              
              {/* Primary Direct Action (Index -1) */}
                <button
                  type="button"
                  onMouseEnter={() => setSelectedIndex(-1)}
                  onClick={() => {
                    setShowSuggestions(false);
                    onNavigate(formatSearchUrl(searchValue, searchEngine));
                    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors group ${
                    selectedIndex === -1 
                      ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold' 
                      : isIncognito 
                        ? 'hover:bg-slate-700 text-slate-200' 
                        : 'hover:bg-slate-100 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                {searchValue.includes('.') || searchValue.includes('://') ? (
                  <>
                    <Globe className="w-4 h-4 shrink-0 text-cyan-500" />
                    <span className="truncate font-medium text-cyan-600 dark:text-cyan-400">Go to: <span className="underline">{searchValue}</span></span>
                  </>
                ) : (
                  <>
                    <Search className={`w-4 h-4 shrink-0 ${selectedIndex === -1 ? 'text-cyan-500' : 'text-slate-400 group-hover:text-cyan-500'}`} />
                    <span className="truncate text-slate-700 dark:text-slate-200">Search with {getSearchEngineName(searchEngine)}: <strong className="text-slate-900 dark:text-white">{searchValue}</strong></span>
                  </>
                )}
              </button>

              {/* Search Suggestions (Index 0 to suggestions.length - 1) */}
              {suggestions.length > 0 && (
                <div className="py-1">
                  <div className="px-4 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Search Suggestions
                  </div>

                  {suggestions.map((suggestion, idx) => (
                      <button
                        key={`sug-${idx}`}
                        type="button"
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          setSearchValue(suggestion);
                          setShowSuggestions(false);
                          onNavigate(formatSearchUrl(suggestion, searchEngine));
                          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                          selectedIndex === idx 
                            ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <Search className={`w-3.5 h-3.5 shrink-0 ${selectedIndex === idx ? 'text-cyan-500' : 'text-slate-400'}`} />
                        <span className="truncate">{suggestion}</span>
                      </button>
                    ))}
                </div>
              )}

              {/* Matching Bookmarks (Index suggestions.length to ...) */}
              {matchedBookmarks.length > 0 && (
                <div className="py-1">
                  <div className="px-4 pt-1 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Bookmarks
                  </div>
                  {matchedBookmarks
                    .map((bookmark, idx) => {
                      const bookmarkIdx = suggestions.length + idx;
                      return (
                        <button
                          key={`bm-${bookmark.id}`}
                          type="button"
                          onMouseEnter={() => setSelectedIndex(bookmarkIdx)}
                          onClick={() => {
                            setSearchValue(bookmark.url);
                            setShowSuggestions(false);
                            onNavigate(bookmark.url);
                            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors ${
                            selectedIndex === bookmarkIdx
                              ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Star className={`w-3.5 h-3.5 shrink-0 ${selectedIndex === bookmarkIdx ? 'text-cyan-500 fill-cyan-500' : 'text-amber-400 fill-amber-400'}`} />
                            <span className="truncate font-medium">{bookmark.title}</span>
                          </div>
                          <span className="text-xs text-slate-400 truncate max-w-[150px]">{bookmark.url}</span>
                        </button>
                      );
                    })}
                </div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </div>
  );
});

export const TopBar: React.FC<TopBarProps> = React.memo(({
  tabs,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  activeTabId,
  bookmarks,
  activeDownloadsCount,
  downloads = [],
  onClearDownloads,
  isSplitView,
  isIncognito = false,
  useVerticalTabs = false,
  tabStyle = 'floating',
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
  onSuspendTab,
  onReorderTabs,
  onReorderFullList,
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
  showBookmarksBar = false,
  onToggleReaderMode,
  onOpenExtensions,
  onTabDragStart,
  onTabDragEnd,
  onTabDrag,
  onDropToSplitScreen,
  splitTabId,
  onCloseSplit
}) => {
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null);
  const [hoverPos, setHoverPos] = useState({ left: 0, width: 0 });
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [extensions, setExtensions] = useState<any[]>([]);
  const [mcpClientCount, setMcpClientCount] = useState(0);
  const [mcpRunning, setMcpRunning] = useState(false);
  const [isAdBlockerOpen, setIsAdBlockerOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const downloadsBtnRef = useRef<HTMLButtonElement>(null);
  const [adblockWhitelist, setAdblockWhitelist] = useState<string[]>([]);
  const [, setForceUpdate] = useState(0);
  const [ghostTab, setGhostTab] = useState<{ id: string; x: number; y: number } | null>(null);

  const tabsContainerRef = useRef<any>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = tabsContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [tabs, checkScroll]);

  useEffect(() => {
    if (!tabsContainerRef.current) return;
    const activeTabEl = tabsContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    if (activeTabEl) {
      setTimeout(() => {
        activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }, 150);
    }
  }, [activeTabId, tabs.length]);

  const handleWheel = (e: React.WheelEvent<any>) => {
    if (tabsContainerRef.current) {
      if (e.deltaY !== 0) {
        tabsContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      tabsContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  useEffect(() => {
    let cleanup: (() => void) | void;
    if ((window as any).electronAPI?.onAdBlocked) {
      cleanup = (window as any).electronAPI.onAdBlocked((_: any, data: { tabId: string }) => {
        const tab = tabsRef.current.find(t => t.id === data.tabId);
        if (tab) {
          tab.blockedAdsCount = (tab.blockedAdsCount || 0) + 1;
          setForceUpdate(v => v + 1);
        }
      });
    }
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  useEffect(() => {
    const fetchWhitelist = async () => {
      try {
        if ((window as any).electronAPI?.storeGet) {
          const val = await (window as any).electronAPI.storeGet('adblocker_whitelist');
          if (val) {
            setAdblockWhitelist(JSON.parse(val));
          }
        }
      } catch (e) {}
    };
    fetchWhitelist();
  }, []);
  
  // Fetch MCP status on mount and listen for client changes
  useEffect(() => {
    const fetchMcp = async () => {
      if ((window as any).electronAPI?.getMcpStatus) {
        const s = await (window as any).electronAPI.getMcpStatus();
        setMcpRunning(s?.running || false);
        setMcpClientCount(s?.clientCount || 0);
      }
    };
    fetchMcp();
    let cleanup: (() => void) | void;
    let cleanupStatus: (() => void) | void;
    if ((window as any).electronAPI?.onMcpClientChanged) {
      cleanup = (window as any).electronAPI.onMcpClientChanged((_: any, data: any) => {
        setMcpClientCount(data.count);
      });
    }
    if ((window as any).electronAPI?.onMcpStatusChanged) {
      cleanupStatus = (window as any).electronAPI.onMcpStatusChanged((_: any, isRunning: boolean) => {
        setMcpRunning(isRunning);
      });
    }
    return () => { 
      if (typeof cleanup === 'function') cleanup();
      if (typeof cleanupStatus === 'function') cleanupStatus();
    };
  }, []);
  const activeTab = React.useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  const isBookmarked = React.useMemo(() => bookmarks.some(b => b.url === activeTab?.url), [bookmarks, activeTab?.url]);

  useEffect(() => {
    const fetchExtensions = async () => {
      try {
        if ((window as any).electronAPI?.listExtensions) {
          const list = await (window as any).electronAPI.listExtensions();
          setExtensions(list || []);
        }
      } catch (err) {}
    };
    
    fetchExtensions();
    
    let cleanup: (() => void) | undefined;
    if ((window as any).electronAPI?.onExtensionChanged) {
      cleanup = (window as any).electronAPI.onExtensionChanged(() => {
        fetchExtensions();
      });
    }
    
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const activeWorkspace = workspaces?.find(w => w.id === activeWorkspaceId) || workspaces?.[0];

  const currentUrl = activeTab?.url || '';
  let currentHostname = '';
  try {
    if (currentUrl && !currentUrl.startsWith('nova://')) {
      const urlToParse = currentUrl.includes('://') ? currentUrl : `http://${currentUrl}`;
      currentHostname = new URL(urlToParse).hostname;
    }
  } catch(e) {}
  const isWhitelisted = adblockWhitelist.includes(currentHostname);
  
  const handleToggleWhitelist = async () => {
    if (!currentHostname) return;
    const newWhitelist = isWhitelisted 
      ? adblockWhitelist.filter(h => h !== currentHostname)
      : [...adblockWhitelist, currentHostname];
    
    setAdblockWhitelist(newWhitelist);
    if ((window as any).electronAPI?.storeSet) {
      await (window as any).electronAPI.storeSet('adblocker_whitelist', JSON.stringify(newWhitelist));
    }
    onReload();
  };

  return (
    <>
    <header className={`w-full flex flex-col select-none drag-region border-b relative z-50 ${isIncognito ? 'bg-slate-900 border-slate-800 text-slate-100 dark' : 'bg-slate-100 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100'}`}>
      {/* 
        ROW 1: Tabs & Window Controls spacer
      */}
      <AnimatePresence initial={false}>
      {!useVerticalTabs && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 44, opacity: 1, transitionEnd: { overflow: 'visible' } }}
          exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
          transition={{ duration: 0.2 }}
          className="flex items-end px-2 pt-2.5 gap-1"
        >
          {/* Spacer for Mac traffic lights (usually ~70px on left) */}
          <div className="w-[70px] shrink-0" />
          
          {/* Workspace Selector */}
          {workspaces && activeWorkspace && onSelectWorkspace && (
            <div className="relative no-drag mb-1">
              <button
                onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-slate-200/50 hover:bg-slate-300/50 text-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 dark:text-slate-300 transition-colors mr-1"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: WORKSPACE_COLORS[activeWorkspace.color] || '#64748b' }} />
                <span>{activeWorkspace.name}</span>
              </button>
              <AnimatePresence>
              {isWorkspaceDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsWorkspaceDropdownOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
                    {workspaces.map(w => (
                      <button
                        key={w.id}
                        onClick={() => {
                          onSelectWorkspace(w.id);
                          setIsWorkspaceDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: WORKSPACE_COLORS[w.color] || '#64748b' }} />
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
                  </motion.div>
                </>
              )}
              </AnimatePresence>
            </div>
          )}

        {/* Tabs */}
        <div className="flex-1 relative flex items-center min-w-0">
          {canScrollLeft && (
            <button
              onClick={() => scrollTabs('left')}
              className={`absolute left-0 z-30 p-1 rounded-r-lg shadow-md no-drag transition-colors ${
                isIncognito ? 'bg-slate-800/90 text-slate-200 hover:bg-slate-700' : 'bg-white/90 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Scroll Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <Reorder.Group
            axis="x"
            values={tabs}
            onReorder={(newTabs) => {
              if (ghostTab) return;
              if (onReorderFullList) {
                onReorderFullList(newTabs);
              }
            }}
            ref={tabsContainerRef}
            onWheel={handleWheel}
            className="flex-1 flex items-end gap-1 overflow-x-auto overflow-y-hidden no-scrollbar drag-region h-[38px]"
          >
            <AnimatePresence>
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const isSplitChild = tab.id === splitTabId;
              
              if (isSplitChild && splitTabId && activeTabId) return null;

              const splitTab = isActive && splitTabId ? tabs.find(t => t.id === splitTabId) : null;

              return (
                <MemoizedTabItem
                  key={tab.id}
                  tab={tab}
                  isActive={isActive}
                  isSplitChild={isSplitChild}
                  splitTab={splitTab}
                  ghostTab={ghostTab}
                  tabStyle={tabStyle}
                  isIncognito={isIncognito}
                  onTabDragStart={onTabDragStart}
                  onTabDrag={onTabDrag}
                  onTabDragEnd={onTabDragEnd}
                  onDropToSplitScreen={onDropToSplitScreen}
                  onSelectTab={onSelectTab}
                  onCloseSplit={onCloseSplit}
                  onToggleMuteTab={onToggleMuteTab}
                  onTogglePip={onTogglePip}
                  onCloseTab={onCloseTab}
                  tabsLength={tabs.length}
                  setGhostTab={setGhostTab}
                />
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
              className={`p-1.5 mb-1 rounded-lg transition-all shrink-0 no-drag ${isIncognito ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}`}
              title="New Private / Incognito Tab"
            >
              <ShieldOff className="w-4 h-4" />
            </button>
          </Reorder.Group>

          {canScrollRight && (
            <button
              onClick={() => scrollTabs('right')}
              className={`absolute right-0 z-30 p-1 rounded-l-lg shadow-md no-drag transition-colors ${
                isIncognito ? 'bg-slate-800/90 text-slate-200 hover:bg-slate-700' : 'bg-white/90 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Scroll Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        {/* Spacer for Windows controls */}
        {window.navigator.userAgent.toLowerCase().includes('win') && (
          <div className="w-[140px] shrink-0" />
        )}
      </motion.div>
      )}
      </AnimatePresence>

      {/* 
        ROW 2: Toolbar (Nav, Omnibox, Extensions)
      */}
      <div 
        className={`flex items-center px-3 py-1.5 gap-3 no-drag ${isIncognito ? 'bg-slate-800 border-b border-slate-700' : 'bg-white dark:bg-slate-800 dark:border-b dark:border-slate-700'}`}
      >
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onGoBack} disabled={!activeTab?.canGoBack} className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`} title="Go Back">
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onGoForward} disabled={!activeTab?.canGoForward} className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`} title="Go Forward">
            <ArrowRight className="w-4 h-4" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onReload} className={`p-1.5 rounded-lg transition-colors ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`} title="Reload Page">
            <RotateCw className={`w-4 h-4 transition-transform duration-500 active:rotate-180 ${activeTab?.isLoading ? 'animate-spin' : ''}`} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onNavigate('nova://newtab')} className={`p-1.5 rounded-lg transition-colors ml-0.5 ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`} title="New Tab Page">
            <Home className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Omnibox / Address Bar */}
        <OmniboxBar
          activeTab={activeTab}
          isIncognito={isIncognito}
          searchEngine={searchEngine}
          bookmarks={bookmarks}
          useVerticalTabs={useVerticalTabs}
          onNavigate={onNavigate}
          onToggleReaderMode={onToggleReaderMode}
          onToggleBookmark={onToggleBookmark}
          isBookmarked={isBookmarked}
        />

        {/* Extensions / Action Controls / More Menu */}
        <div className="flex items-center gap-1.5 ml-auto relative shrink-0">
          {/* AI Copilot Pill */}
          <motion.button 
            whileHover={{ scale: 1.04 }} 
            whileTap={{ scale: 0.96 }}
            onClick={onToggleAIAssistant}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all font-semibold text-xs shrink-0 ${
              isIncognito 
                ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20' 
                : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 shadow-xs'
            }`}
            title="Nova AI Copilot (Side Panel)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI</span>
          </motion.button>

          <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-0.5" />

          {/* Active Pinned Extensions */}
          {extensions.filter(ext => ext.enabled !== false).slice(0, 4).map(ext => (
            <button
              key={ext.id}
              className={`p-1 rounded-lg transition-colors flex items-center justify-center font-bold text-[11px] w-[28px] h-[28px] shrink-0 ${isIncognito ? 'hover:bg-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              title={ext.name}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (ext.popupUrl) {
                  const cleanPopup = ext.popupUrl.replace(/^\.?\//, '');
                  const url = `chrome-extension://${ext.id}/${cleanPopup}`;
                  if ((window as any).electronAPI?.openExtensionPopup) {
                    (window as any).electronAPI.openExtensionPopup(
                      url,
                      { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                      {
                        id: activeTab?.id,
                        url: activeTab?.url,
                        title: activeTab?.title,
                        favIconUrl: activeTab?.favicon,
                        webContentsId: activeTab?.webContentsId
                      }
                    );
                  } else {
                    onNewTab(url);
                  }
                } else if (ext.optionsUrl) {
                  const cleanOptions = ext.optionsUrl.replace(/^\.?\//, '');
                  onNewTab(`chrome-extension://${ext.id}/${cleanOptions}`);
                } else {
                  onOpenExtensions();
                }
              }}
            >
              {ext.iconData ? (
                <img src={ext.iconData} alt={ext.name} className="w-4 h-4 rounded-xs object-contain" />
              ) : (
                <div className="w-4 h-4 rounded-xs bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] uppercase font-bold">
                  {ext.name ? ext.name.charAt(0) : <Puzzle className="w-3.5 h-3.5" />}
                </div>
              )}
            </button>
          ))}

          {/* Ad Blocker Shield */}
          <div className="relative">
            <button 
              onClick={() => setIsAdBlockerOpen(!isAdBlockerOpen)}
              className={`p-1.5 rounded-lg transition-colors relative ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'}`}
              title="Privacy & Ad Shield"
            >
              {isWhitelisted ? <ShieldOff className="w-4 h-4 text-slate-400" /> : <Shield className="w-4 h-4 text-cyan-400" />}
              {(!isWhitelisted && (activeTab?.blockedAdsCount || 0) > 0) && (
                <span className="absolute -top-1 -right-1 bg-cyan-500 text-slate-950 text-[9px] font-bold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center">
                  {activeTab!.blockedAdsCount}
                </span>
              )}
            </button>
            {isAdBlockerOpen && (
              <AdBlockerPopover 
                blockedCount={activeTab?.blockedAdsCount || 0}
                isWhitelisted={isWhitelisted}
                onToggleWhitelist={handleToggleWhitelist}
                onClose={() => setIsAdBlockerOpen(false)}
                hostname={currentHostname}
              />
            )}
          </div>

          {/* Downloads Button & Popover */}
          <div className="relative flex items-center">
            <button
              ref={downloadsBtnRef}
              onClick={() => setIsDownloadsOpen(!isDownloadsOpen)}
              className={`p-1.5 rounded-lg transition-colors relative ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'}`}
              title="Downloads"
            >
              <Download className="w-4 h-4" />
              {(activeDownloadsCount || 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-cyan-500 text-slate-950 text-[9px] font-bold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center">
                  {activeDownloadsCount}
                </span>
              )}
            </button>
            <DownloadsPopover
              downloads={downloads}
              isOpen={isDownloadsOpen}
              onClose={() => setIsDownloadsOpen(false)}
              onClearDownloads={onClearDownloads || (() => {})}
              onOpenDownloadsPage={() => onNavigate('nova://downloads')}
              buttonRef={downloadsBtnRef}
            />
          </div>

          {/* Extensions Manager Button */}
          <button 
            onClick={onOpenExtensions}
            className={`p-1.5 rounded-lg transition-colors ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'}`}
            title="Extensions"
          >
            <Puzzle className="w-4 h-4" />
          </button>
          
          {/* More Menu */}
          <div className="relative">
            <button 
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`p-1.5 rounded-lg transition-colors ${
                isMoreMenuOpen 
                  ? 'bg-slate-200 dark:bg-slate-700 text-cyan-500' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="More Options"
            >
              <Menu className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {isMoreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 z-50 flex flex-col p-1.5 divide-y divide-slate-100 dark:divide-white/5"
                  >
                    {/* View & Layout Section */}
                    <div className="py-1">
                      <button 
                        onClick={() => { onToggleSplitView(); setIsMoreMenuOpen(false); }} 
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Columns className="w-4 h-4 text-cyan-400" />
                          <span>Split View (Side-by-Side)</span>
                        </div>
                        {isSplitView && <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">ON</span>}
                      </button>

                      {onToggleVpn && (
                        <button 
                          onClick={() => { onToggleVpn(); setIsMoreMenuOpen(false); }} 
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Network className="w-4 h-4 text-cyan-400" />
                            <span>VPN (Secure Proxy)</span>
                          </div>
                          {isVpnEnabled ? (
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">ACTIVE</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">OFF</span>
                          )}
                        </button>
                      )}

                      <button 
                        onClick={() => { onNavigate('nova://settings#mcp'); setIsMoreMenuOpen(false); }} 
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Cpu className="w-4 h-4 text-cyan-400" />
                          <span>MCP AI Tools Server</span>
                        </div>
                        {mcpRunning ? (
                          <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ONLINE
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">OFFLINE</span>
                        )}
                      </button>
                    </div>

                    {/* Tools Section */}
                    <div className="py-1">
                      <div className="flex items-center justify-between px-3 py-1.5">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Zoom</span>
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/50 dark:border-white/5">
                          <button onClick={onZoomOut} className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300" title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></button>
                          <span className="text-[11px] font-bold px-1.5 text-slate-700 dark:text-slate-200">{Math.round((activeTab?.zoomFactor || 1) * 100)}%</span>
                          <button onClick={onZoomIn} className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300" title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <button onClick={() => { onTakeScreenshot(); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors text-left">
                        <Camera className="w-4 h-4 text-slate-400" /> Screenshot
                      </button>
                      <button onClick={() => { onOpenShare(); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors text-left">
                        <Share2 className="w-4 h-4 text-slate-400" /> Share Link
                      </button>
                      <button onClick={() => { onOpenFindInPage(); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors text-left">
                        <Search className="w-4 h-4 text-slate-400" /> Find in Page
                      </button>
                    </div>

                    {/* Navigation / Library */}
                    <div className="py-1">
                      <button onClick={() => { onOpenDownloads(); setIsMoreMenuOpen(false); }} className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors text-left">
                        <div className="flex items-center gap-2.5">
                          <Download className="w-4 h-4 text-slate-400" /> Downloads
                        </div>
                        {(activeDownloadsCount || 0) > 0 && <span className="bg-cyan-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{activeDownloadsCount}</span>}
                      </button>
                      <button onClick={() => { onOpenHistory(); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors text-left">
                        <Clock className="w-4 h-4 text-slate-400" /> History
                      </button>
                      <button onClick={() => { onOpenSettings(); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors text-left">
                        <Settings className="w-4 h-4 text-slate-400" /> Settings
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
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
          className="pointer-events-none bg-white dark:bg-slate-800"
          style={{
            position: 'fixed',
            top: 50,
            left: Math.max(10, Math.min(hoverPos.left + (hoverPos.width / 2) - (272 / 2), window.innerWidth - 282)),
            zIndex: 999999,
            width: 272,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              {hoveredTab.favicon && (
                <img src={hoveredTab.favicon} style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
              )}
              <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis">
                {hoveredTab.title || 'New Tab'}
              </div>
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-900 w-full relative" style={{ aspectRatio: '16/9' }}>
            <img src={hoveredTab.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body
    )}

    {/* Drag to Split Screen Ghost Tab */}
    {ghostTab && createPortal(
      <div 
        className="fixed pointer-events-none z-[999999] opacity-90 transition-none"
        style={{ left: ghostTab.x - 100, top: ghostTab.y - 20 }}
      >
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-2xl border backdrop-blur-md ${
          isIncognito 
            ? 'bg-slate-800/90 border-slate-600 text-slate-200' 
            : 'bg-white/90 border-blue-500/50 text-slate-800 dark:bg-slate-800/90 dark:border-blue-500/50 dark:text-slate-200'
        }`}>
          <Globe className="w-4 h-4 opacity-70" />
          <span className="text-[13px] font-medium max-w-[160px] truncate">
            {tabs.find(t => t.id === ghostTab.id)?.title || 'Drop to Split Screen'}
          </span>
        </div>
      </div>,
      document.body
    )}
    </>
  );
});
