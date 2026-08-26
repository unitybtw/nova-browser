# Nova Browser Components

## TopBar
- Source: `src/components/TopBar.tsx`
- Description: Primary chrome bar containing horizontal tabs, navigation controls, omnibox, and extension/quick action buttons.

```tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DownloadsPopover } from './DownloadsPopover';
import { TabContextMenu, TabContextMenuState } from './TabContextMenu';
import { SiteInfoPopover } from './SiteInfoPopover';
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
  PinOff,
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Cloud
} from 'lucide-react';
import { Tab, Bookmark, Workspace, PermissionRequest } from '../types/browser';
import { formatSearchUrl, getSearchEngineName, isValidUrlOrDomain } from '../utils/searchEngine';
import { getUrlSecurityInfo } from '../utils/securityUtils';
import { AdBlockerPopover } from './AdBlockerPopover';
import { PermissionPromptPopover } from './PermissionPromptPopover';
import { UserSettings } from '../App';
import { syncService, SyncStatus } from '../services/syncService';
import { getClientCachedSuggestions, setClientCachedSuggestions } from '../utils/suggestionCache';

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
  workspaces?: Workspace[];
  activeWorkspaceId?: string;
  onSelectWorkspace?: (id: string) => void;
  activeTabId: string;
  bookmarks: Bookmark[];
  isSplitView?: boolean;
  tabStyle?: 'rounded' | 'square' | 'floating';
  isIncognito?: boolean;
  searchEngine: UserSettings['searchEngine'];
  onToggleBookmark: () => void;
  onOpenHistory: () => void;
  onOpenDownloads: () => void;
  onOpenSettings: () => void;
  onOpenHelp?: () => void;
  onOpenFindInPage: () => void;
  onToggleSplitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom?: () => void;
  onDuplicateTab: (id: string, e?: React.MouseEvent) => void;
  onTogglePinTab: (id: string, e?: React.MouseEvent) => void;
  onToggleMuteTab: (id: string, e?: React.MouseEvent) => void;
  onCloseOtherTabs?: (id: string) => void;
  onCloseTabsToRight?: (index: number) => void;
  onNewTabRight?: (index: number) => void;
  onReopenClosedTab?: () => void;
  canReopenClosedTab?: boolean;
  onSuspendTab?: (id: string) => void;
  onReorderTabs?: (draggedId: string, targetId: string) => void;
  onReorderFullList?: (newTabs: Tab[]) => void;
  onTogglePip?: (id: string) => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e?: React.MouseEvent) => void;
  onNewTab: (url?: string) => void;
  onNewIncognitoTab?: () => void;
  onOpenShare?: () => void;
  onTakeScreenshot?: () => void;
  useVerticalTabs?: boolean;
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
  onOpenAccount?: () => void;
  onTabDragStart?: () => void;
  onTabDragEnd?: () => void;
  onTabDrag?: (y: number) => void;
  onDropToSplitScreen?: (tabId: string) => void;
  splitTabId?: string | null;
  onCloseSplit?: (tab1Id?: string, tab2Id?: string) => void;
  permissionRequests?: PermissionRequest[];
  onRespondPermission?: (requestId: string, allow: boolean, remember: boolean) => void;
  onDismissPermission?: (requestId: string) => void;
}

const MemoizedTabItem = React.memo(({ 
  tab, activeTabId, index, isActive, isSplitChild, splitTab, ghostTab, tabStyle, isIncognito,
  onTabDragStart, onTabDrag, onTabDragEnd, onDropToSplitScreen,
  onSelectTab, onCloseSplit, onToggleMuteTab, onTogglePip, onCloseTab,
  tabsLength, setGhostTab, onOpenContextMenu
}: any) => {
  if (isSplitChild) return null;

  const isPinned = !!tab.isPinned;

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
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenContextMenu?.(tab, index, e);
      }}
      data-tab-id={tab.id}
      title={isPinned ? `${tab.title || 'Pinned Tab'} (Pinned)` : tab.title}
      className={`group flex items-center justify-between ${
        isPinned ? 'px-2 min-w-[38px] max-w-[38px] justify-center' : splitTab ? 'px-1.5 min-w-[260px] max-w-[420px]' : 'px-3 min-w-[120px] max-w-[240px]'
      } flex-1 text-[13px] cursor-grab active:cursor-grabbing transition-colors no-drag relative ${
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
      {isPinned ? (
        <div className="flex items-center justify-center w-full h-full relative">
          {tab.isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-blue-500/50 border-t-transparent rounded-full animate-spin shrink-0" />
          ) : tab.favicon ? (
            <img src={tab.favicon} alt="" className="w-4 h-4 rounded-xs shrink-0" />
          ) : (
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          {tab.isPlayingAudio && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleMuteTab(tab.id, e); }}
              className="absolute -top-1 -right-1 p-0.5 bg-blue-500 text-white rounded-full shadow-xs"
              title="Mute Tab"
            >
              <Volume2 className="w-2.5 h-2.5 animate-pulse" />
            </button>
          )}
        </div>
      ) : splitTab ? (
        <div className="flex w-full items-center h-full gap-1">
          {/* Primary Tab Half */}
          <div 
            className={`flex flex-1 items-center gap-1.5 px-2 min-w-0 h-[28px] rounded-md transition-all cursor-pointer ${
              activeTabId === tab.id
                ? 'bg-blue-500/15 text-blue-600 dark:text-cyan-300 font-semibold shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-normal'
            }`}
            onClick={(e) => { e.stopPropagation(); onSelectTab(tab.id); }}
            title={tab.title}
          >
            {tab.isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-blue-500/50 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : tab.favicon ? (
              <img src={tab.favicon} className="w-3.5 h-3.5 rounded-sm shrink-0 object-contain" />
            ) : (
              <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />
            )}
            <span className="truncate text-[12px]">{tab.title || tab.url || 'New Tab'}</span>
          </div>

          <div className="flex items-center px-0.5 shrink-0" title="Split Screen Mode">
            <div className="w-[1px] h-3.5 bg-slate-300/80 dark:bg-slate-600/80" />
          </div>

          {/* Secondary Tab Half */}
          <div 
            className={`flex flex-1 items-center gap-1.5 px-2 min-w-0 h-[28px] rounded-md transition-all cursor-pointer ${
              activeTabId === splitTab.id
                ? 'bg-blue-500/15 text-blue-600 dark:text-cyan-300 font-semibold shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-normal'
            }`}
            onClick={(e) => { e.stopPropagation(); onSelectTab(splitTab.id); }}
            title={splitTab.title}
          >
            {splitTab.isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-blue-500/50 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : splitTab.favicon ? (
              <img src={splitTab.favicon} className="w-3.5 h-3.5 rounded-sm shrink-0 object-contain" />
            ) : (
              <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />
            )}
            <span className="truncate text-[12px] flex-1">{splitTab.title || splitTab.url || 'New Tab'}</span>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onCloseSplit?.(); }} 
              className="ml-auto p-0.5 rounded-sm hover:bg-red-500/20 text-slate-400 hover:text-red-500 shrink-0 transition-colors cursor-pointer"
              title="Close Split View"
            >
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
                className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 dark:hover:bg-slate-700 transition-colors shrink-0"
                title="Unmute Tab"
              >
                <VolumeX className="w-3.5 h-3.5 text-red-500" />
              </button>
            ) : tab.isPlayingAudio ? (
              <div className="flex items-center gap-1">
                {onTogglePip && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onTogglePip(tab.id); }}
                    className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-blue-500 dark:hover:bg-slate-700 transition-colors shrink-0"
                    title="Picture in Picture"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-picture-in-picture-2"><path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"/><rect width="10" height="7" x="12" y="13" rx="2"/></svg>
                  </button>
                )}
                <button
                  onClick={(e) => onToggleMuteTab(tab.id, e)}
                  className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 dark:hover:bg-slate-700 transition-colors shrink-0"
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
                className={`p-0.5 rounded-full transition-colors shrink-0 ${
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
    prevProps.activeTabId === nextProps.activeTabId &&
    prevProps.splitTab?.id === nextProps.splitTab?.id &&
    prevProps.splitTab?.title === nextProps.splitTab?.title &&
    prevProps.s
```

## NewTabPage
- Source: `src/components/NewTabPage.tsx`
- Description: Default home page with live greeting, interactive search input, speed dials, and wallpaper customization.

```tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, ArrowRight, ShieldCheck, ShieldAlert, Plus, X, Edit2, Check, CheckSquare, Square, Trash2, ListTodo, VenetianMask, Camera, Shuffle } from 'lucide-react';
import { formatSearchUrl, getSearchEngineName } from '../utils/searchEngine';
import { useLiveUnsplashPhoto } from '../utils/unsplash';
import { UserSettings } from '../App';
import { getClientCachedSuggestions, setClientCachedSuggestions } from '../utils/suggestionCache';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface NewTabPageProps {
  onNavigate: (url: string) => void;
  searchEngine?: UserSettings['searchEngine'];
  privacyShield?: boolean;
  newTabBackground?: string;
  backgroundCustomUrl?: string;
  showTasksWidget?: boolean;
  isIncognito?: boolean;
  theme?: UserSettings['theme'];
  isActive?: boolean;
  energySaverMode?: boolean;
}

interface ClockProps {
  variants?: any;
  isActive?: boolean;
}

const getInitialTimeAndGreeting = () => {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const hour = now.getHours();
  let greet = 'Good Evening';
  if (hour < 12) greet = 'Good Morning';
  else if (hour < 18) greet = 'Good Afternoon';
  return { time, greet };
};

export const Clock: React.FC<ClockProps> = React.memo(({ variants, isActive = true }) => {
  const initial = useMemo(() => getInitialTimeAndGreeting(), []);
  const [timeStr, setTimeStr] = useState(initial.time);
  const [greeting, setGreeting] = useState(initial.greet);

  useEffect(() => {
    if (!isActive) return;
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const hour = now.getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
    };
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <motion.div variants={variants} className="text-center mb-4">
      <h1 className="text-6xl md:text-7xl font-light tracking-tight text-slate-900 dark:text-white mb-2 font-sans tabular-nums transition-colors">{timeStr}</h1>
      <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 font-medium transition-colors">{greeting}</p>
    </motion.div>
  );
});

const DEFAULT_SPEED_DIALS = [
  { name: 'Google', url: 'https://www.google.com', domain: 'google.com' },
  { name: 'GitHub', url: 'https://github.com', domain: 'github.com' },
  { name: 'YouTube', url: 'https://www.youtube.com', domain: 'youtube.com' },
  { name: 'Reddit', url: 'https://www.reddit.com', domain: 'reddit.com' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', domain: 'wikipedia.org' }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.04, delayChildren: 0.01 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
  }
};

export const NewTabPage: React.FC<NewTabPageProps> = React.memo(({ 
  onNavigate,
  searchEngine = 'google',
  privacyShield = true,
  newTabBackground = 'default',
  backgroundCustomUrl = '',
  showTasksWidget = true,
  isIncognito = false,
  theme = 'dark',
  isActive = true,
  energySaverMode = false,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [speedDials, setSpeedDials] = useState(() => {
    // Incognito: never read persistent storage
    if (isIncognito) return DEFAULT_SPEED_DIALS;
    try {
      const saved = localStorage.getItem('nova_speed_dials');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SPEED_DIALS;
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDial, setEditingDial] = useState<{name: string, url: string, index: number | null}>({ name: '', url: '', index: null });

  const [todos, setTodos] = useState<Todo[]>(() => {
    // Incognito: never read persistent storage
    if (isIncognito) return [];
    try {
      const saved = localStorage.getItem('nova_todos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch(e) {}
    return [];
  });
  const [newTodo, setNewTodo] = useState('');

  // Resolved Daily 4K Ultra HD Wallpaper
  const { photo: unsplashPhoto, photoUrl: unsplashUrl, shuffleNext: shuffleWallpaper } = useLiveUnsplashPhoto();

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions
  useEffect(() => {
    const trimmed = (typeof query === 'string' ? query : '').trim();
    if (!isFocused || !trimmed || trimmed.includes('://')) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // 1. Instant 0ms cache lookup
    const cacheKey = `${trimmed}_${searchEngine}`;
    const cached = getClientCachedSuggestions(cacheKey);
    if (cached) {
      setSuggestions(cached.slice(0, 6));
      setShowSuggestions(cached.length > 0);
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const timer = setTimeout(async () => {
      try {
        const clientLocale = typeof navigator !== 'undefined' ? navigator.language : 'tr-TR';
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getSuggestions) {
          const results = await (window as any).electronAPI.getSuggestions(trimmed, searchEngine, clientLocale);
          if (!abortController.signal.aborted && Array.isArray(results)) {
            setClientCachedSuggestions(cacheKey, results);
            setSuggestions(results.slice(0, 6));
            setShowSuggestions(results.length > 0);
            return;
          }
        }
        const lang = clientLocale.split('-')[0] || 'tr';
        const country = clientLocale.split('-')[1] || (lang === 'tr' ? 'TR' : 'US');
        const res = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(trimmed)}&hl=${lang}&gl=${country}`, {
          signal: abortController.signal
        });
        if (!abortController.signal.aborted && res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data) && Array.isArray(data[1])) {
            const list = data[1].slice(0, 6);
            setClientCachedSuggestions(cacheKey, list);
            setSuggestions(list);
            setShowSuggestions(list.length > 0);
          }
        }
      } catch (err) {
        // ignore aborted or network errors
      }
    }, 35);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [query, isFocused, searchEngine]);

  useEffect(() => {
    if (isIncognito) return; // Incognito: never persist
    try {
      localStorage.setItem('nova_todos', JSON.stringify(todos));
    } catch (e) {}
  }, [todos]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    setTodos([...todos, { id: Date.now().toString(), text: newTodo.trim(), completed: false }]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const clearCompletedTodos = () => {
    setTodos(todos.filter(t => !t.completed));
  };

  useEffect(() => {
    if (isIncognito) return; // Incognito: never persist
    try {
      localStorage.setItem('nova_speed_dials', JSON.stringify(speedDials));
    } catch (e) {}
  }, [speedDials]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && selectedIndex >= 0 && selectedIndex < suggestions.length) {
      e.preventDefault();
      setQuery(suggestions[selectedIndex]);
      setSelectedIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    let target = query.trim();
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      target = suggestions[selectedIndex];
    }
    if (!target) return;
    setShowSuggestions(false);
    onNavigate(formatSearchUrl(target, searchEngine));
  };

  const handleAddSpeedDial = () => {
    if (!editingDial.name || !editingDial.url) return;
    let url = editingDial.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    try {
      const domain = new URL(url).hostname;
      if (editingDial.index !== null) {
        const updated = [...speedDials];
        updated[editingDial.index] = { name: editingDial.name, url, domain };
        setSpeedDials(updated);
      } else {
        setSpeedDials([...speedDials, { name: editingDial.name, url, domain }]);
      }
    } catch(e) {}

    setIsEditModalOpen(false);
    setEditingDial({ name: '', url: '', index: null });
  };

  const handleDeleteSpeedDial = (index: number) => {
    setSpeedDials(speedDials.filter((_: any, i: number) => i !== index));
  };


  // Memoize particle arrays to prevent jitter/regeneration on keystrokes
  const starParticles = React.useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      size: (i % 3 === 0 ? 2.5 : i % 2 === 0 ? 2 : 1.5),
      top: `${(i * 17 + 7) % 96}%`,
      left: `${(i * 23 + 13) % 98}%`,
      duration: 3 + (i % 4) * 1.5,
      delay: (i % 5) * 0.8,
    }));
  }, []);

  const fireflyParticles = React.useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: 3 + (i % 3) * 1.5,
      top: `${(i * 19 + 5) % 92}%`,
      left: `${(i * 29 + 11) % 94}%`,
      driftX: ((i % 5) - 2) * 20,
      driftY: -35 - (i % 4) * 15,
      duration: 5 + (i % 4) * 2,
      delay: (i % 6) * 0.7,
    }));
  }, []);

  const matrixColumns = React.useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: `${(i / 24) * 100 + 1}%`,
      height: `${30 + (i % 5) * 10}%`,
      speed: 2.2 + (i % 4) * 0.8,
      delay: (i % 7) * 0.4,
      opacity: 0.35 + (i % 3) * 0.25,
    }));
  }, []);

  const isDarkTheme = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const getBackgroundStyle = () => {
    if (newTabBackground === 'unsplash' || newTabBackground === 'custom_url') {
      return 'text-white';
    }
    if (!isDarkTheme) {
      return 'bg-white text-slate-900';
    }
    switch (newTabBackground) {
      case 'gradient':
        return 'bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white';
      case 'mesh':
      case 'aurora_waves':
      case 'cyber_grid':
      case 'hyper_space':
      case 'fireflies':
      case 'nebula':
      case 'matrix':
        return 'bg-[#0B0F19] text-white';
      case 'glass':
        return 'bg-slate-900/90 text-white backdrop-blur-xl';
      default:
        return 'bg-[#0B0F19] text-white';
    }
  };

  const isVideoBg = newTabBackground === 'custom_url' && backgroundCustomUrl && (backgroundCustomUrl.toLowerCase().endsWith('.mp4') || backgroundCustomUrl.toLowerCase().endsWith('.webm'));

  if (isIncognito) {
    return (
      <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center p-6 select-none bg-slate-950 text-slate-100">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-2xl flex flex-col items-center gap-10 z-10"
        >
          <motion.div variants={itemVariants} className="flex flex-col items-center text-center">
            <div className="w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center mb-8 border border-slate-800 shadow-2xl shadow-black/50">
              <VenetianMask className="w-16 h-16 text-slate-300" strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-4">You are in Incognito Tab</h1>
            <p className="text-lg text-slate-400 max-w-lg">
              Your browsing history, cookies, site data, and information entered in forms will not be saved.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="w-full relative group">
            <form onSubmit={handleSearch} className="w-full">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or type URL in incognito mode..."
                className="w-full block pl-14 pr-12 py-4.5 bg-slate-900/50 border border-slate-800 rounded-2xl text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:bg-slate-900 focus:border-slate-700 transition-colors duration-200 shadow-xl backdrop-blur-xl"
              />
              <button 
                type="submit"
                className="abs
```

## SidePanel
- Source: `src/components/SidePanel.tsx`
- Description: AI conversational assistant with memory vault, status pill, file attachments, and prompt controls.

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, Brain, Trash2, Plus, Loader2, RefreshCw, Volume2, VolumeX, Mic, MicOff, Square, ShieldAlert, Check, Paperclip, FileText, Wrench, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiAgent, AVAILABLE_AI_MODELS, AiError, AgentStatus, ChatAttachments } from '../services/aiAgent';
import { aiMemory, MemoryItem, TaskSummary } from '../services/aiMemory';
import { tts } from '../services/tts';
import { orchestrator, QueuedAction } from '../services/agentOrchestrator';
import { ChatCompletionMessageParam } from '@mlc-ai/web-llm';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Image waiting to be sent with the next chat turn (data URL form). */
interface PendingImageAttachment {
  id: string;
  name: string;
  dataUrl: string;
}

/** Text file waiting to be sent with the next chat turn. */
interface PendingFileAttachment {
  id: string;
  name: string;
  text: string;
}

const MAX_PENDING_IMAGES = 4;
const MAX_PENDING_FILES = 4;
/** Text files larger than this are rejected outright. */
const MAX_TEXT_FILE_BYTES = 256 * 1024;
/** Read-time truncation budget; the engine truncates further per file. */
const TEXT_FILE_READ_CAP_CHARS = 200 * 1024;

const ATTACH_INPUT_ACCEPT = 'image/*,.txt,.md,.json,.csv,.js,.ts,.html,.css,.xml,.yml,.yaml';

const isImageFile = (file: File) =>
  file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);

const isTextFile = (file: File) =>
  file.type.startsWith('text/') || /\.(txt|md|json|csv|js|ts|html|css|xml|yml|yaml)$/i.test(file.name);

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Dosya okunamadı'));
    reader.readAsText(file);
  });

export const SidePanel = React.memo(({ 
  isOpen, 
  onClose
}: SidePanelProps) => {
  const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>(() => {
    if (isDemo) {
      return [
        { role: 'user', content: 'Can you summarize what makes Nova Browser special?' },
        { role: 'assistant', content: '**Nova Browser** yapay zeka tabanli bir tarayicidir:\n\n- **Otonom Ajanlar**: Gorsel imlec ile tam tarayici kontrolu.\n- **Sifir Bilgili Senkronizasyon**: AES-256-GCM sifreleme ile 1 tikla cihaz eslestirme.\n- **Gizlilik Kalkani**: Yerlesik reklam ve takipci engelleme.\n- **Dual-View Bolunmus Ekran** ve ozellestirilebilir calisma alanlari.' }
      ];
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string>(() => aiAgent.getModel());
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(isDemo);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showMemoryVault, setShowMemoryVault] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [vaultTab, setVaultTab] = useState<'memory' | 'tasks'>('memory');
  const [newFact, setNewFact] = useState('');
  const [initError, setInitError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({ state: 'idle' });
  const [pendingImages, setPendingImages] = useState<PendingImageAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFileAttachment[]>([]);
  const [attachmentHint, setAttachmentHint] = useState('');
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentIdRef = useRef(0);
  const attachmentHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpeechRecognition = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    const unsubscribe = orchestrator.subscribe(actions => {
      setQueuedActions(actions);
      
      // Auto-clear completed/failed/denied actions after 3 seconds to prevent memory leak
      const completedActions = actions.filter(a => a.state === 'completed' || a.state === 'failed' || a.state === 'denied');
      if (completedActions.length > 50) {
        // Remove only terminal actions — clearQueue() would also wipe executing
        // actions, making their subsequent updateActionState calls no-ops.
        orchestrator.pruneCompleted();
      }
    });
    return () => { unsubscribe(); };
  }, []);

  // Global agent lifecycle status; onStatus() emits the current state
  // immediately on subscribe and returns the unsubscribe function.
  useEffect(() => {
    return aiAgent.onStatus(setAgentStatus);
  }, []);

  // Initialize SpeechRecognition with proper lifecycle cleanup
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      try {
        const rec = new SpeechRecognitionClass();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInput(prev => (prev ? prev + ' ' : '') + finalTranscript);
          }
        };
        rec.onerror = () => setIsListening(false);
        rec.onend = () => setIsListening(false);

        recognitionRef.current = rec;
      } catch (err) {
        console.error('Failed to initialize SpeechRecognition:', err);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current = null;
      }
    };
  }, []);

  // Push-to-Talk Handlers
  const handleMouseDownMic = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) { console.error(e); }
  }, []);

  const handleMouseUpMic = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (e) { console.error(e); }
  }, []);

  // Subscribe to TTS state changes
  useEffect(() => {
    return tts.subscribe(setIsSpeaking);
  }, []);

  // -----------------------------------------------------------------------
  // Attachments: picker / drag & drop / paste share one processing path.
  // -----------------------------------------------------------------------

  // Transient inline hint (panel has no global toast system)
  const showAttachmentHint = useCallback((message: string) => {
    setAttachmentHint(message);
    if (attachmentHintTimerRef.current) clearTimeout(attachmentHintTimerRef.current);
    attachmentHintTimerRef.current = setTimeout(() => {
      attachmentHintTimerRef.current = null;
      setAttachmentHint('');
    }, 3000);
  }, []);

  useEffect(() => () => {
    if (attachmentHintTimerRef.current) clearTimeout(attachmentHintTimerRef.current);
  }, []);

  const addFilesToAttachments = useCallback(async (incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    if (files.length === 0) return;
    const skipped: string[] = [];

    const imageCandidates = files.filter(isImageFile);
    const textCandidates = files.filter(f => !imageCandidates.includes(f) && isTextFile(f));
    const unsupported = files.filter(f => !imageCandidates.includes(f) && !textCandidates.includes(f));
    if (unsupported.length > 0) {
      skipped.push(`Desteklenmeyen dosya türü: ${unsupported[0].name}`);
    }

    // Enforce pending caps; accept what fits and tell the user about the rest
    const imageSlots = Math.max(0, MAX_PENDING_IMAGES - pendingImages.length);
    const acceptedImages = imageCandidates.slice(0, imageSlots);
    if (imageCandidates.length > acceptedImages.length) {
      skipped.push(`En fazla ${MAX_PENDING_IMAGES} görsel eklenebilir`);
    }

    const sizedTextFiles = textCandidates.filter(f => f.size <= MAX_TEXT_FILE_BYTES);
    if (sizedTextFiles.length < textCandidates.length) {
      skipped.push('256 KB üzerindeki dosyalar atlandı');
    }
    const fileSlots = Math.max(0, MAX_PENDING_FILES - pendingFiles.length);
    const acceptedFiles = sizedTextFiles.slice(0, fileSlots);
    if (sizedTextFiles.length > acceptedFiles.length) {
      skipped.push(`En fazla ${MAX_PENDING_FILES} dosya eklenebilir`);
    }

    let readFailures = 0;
    const newImages: PendingImageAttachment[] = [];
    for (const file of acceptedImages) {
      try {
        newImages.push({
          id: `img-${attachmentIdRef.current++}`,
          name: file.name,
          dataUrl: await readFileAsDataUrl(file),
        });
      } catch (err) {
        console.error('[SidePanel] Image read failed:', file.name, err);
        readFailures++;
      }
    }

    const newFiles: PendingFileAttachment[] = [];
    for (const file of acceptedFiles) {
      try {
        newFiles.push({
          id: `file-${attachmentIdRef.current++}`,
          name: file.name,
          text: (await readFileAsText(file)).slice(0, TEXT_FILE_READ_CAP_CHARS),
        });
      } catch (err) {
        console.error('[SidePanel] File read failed:', file.name, err);
        readFailures++;
      }
    }
    if (readFailures > 0) skipped.push('Bazı dosyalar okunamadı');

    if (newImages.length > 0) setPendingImages(prev => [...prev, ...newImages]);
    if (newFiles.length > 0) setPendingFiles(prev => [...prev, ...newFiles]);
    if (skipped.length > 0) showAttachmentHint(skipped.slice(0, 2).join(' · '));
  }, [pendingImages.length, pendingFiles.length, showAttachmentHint]);

  // Ref mirror so the window-level paste listener always calls the latest
  // closure without re-registering on every attachment change.
  const addFilesRef = useRef(addFilesToAttachments);
  addFilesRef.current = addFilesToAttachments;

  // Paste images from the clipboard; plain text paste stays untouched.
  useEffect(() => {
    if (!isOpen || !isReady) return;
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (!files || files.length === 0) return;
      if (!Array.from(files).some(f => f.type.startsWith('image/'))) return;
      e.preventDefault();
      addFilesRef.current(files);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, isReady]);

  const removePendingImage = useCallback((id: string) => {
    setPendingImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const removePendingFile = useCallback((id: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Only scroll into view when messages change, or when streaming chunk arrives
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingText]);

  useEffect(() => {
    if (showMemoryVault) {
      setMemories(aiMemory.getMemories());
      setTasks(aiMemory.getTaskHistory());
    }
  }, [showMemoryVault]);

  const handleInit = useCallback(async () => {
    if (isReady || isInitializing) return;
    setIsInitializing(true);
    setInitError('');
    try {
      await aiAgent.init((p, text) => {
        setProgress(p);
        setProgressText(text);
      });
      setIsReady(true);
      setMessages([{ role: 'assistant', content: 'Hello! I am ready to control your browser, analyze pages, or answer your questions. What would you like me to do?' }]);
    } catch (err: any) {
      console.error(err);
      setInitError('Failed to initialize AI engine. Please try again.');
      setProgressText('Initialization failed.');
    } finally {
      setIsInitializing(false);
    }
  }, [isReady, isInitializing]);

  const handleClearAICache = async () => {
    if (!window.confirm('Clear downloaded AI models and temporary cache to free up disk space?')) return;
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await window.caches.keys();
        for (const k of keys) {
          await window.caches.delete(k);
        }
      }
      if ((window as any).electronAPI?.clearAiModelsCache) {
        await (window as any).electronAPI.clearAiModelsCache();
      }
      setMessages([{ role: 'assistant', content: 'AI model cache and temporary files were successfully deleted from your computer.' }]);
      setIsReady(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAIAction = async (text: string, attachments?: ChatAttachments) => {
    const hasAttachments = Boolean(
      attachments && ((attachments.images?.length ?? 0) > 0 || (attachments.files?.length ?? 0) > 0)
    );
    if ((!text.trim() && !hasAttachments) || isLoading) return;

    // Attachment-only turns still need visible content in the user bubble
    let userContent = text;
    if (!userContent.trim() && hasAttachments) {
      const kinds = [
        ...((attachments!.images?.length ?? 0) > 0 ? ['görsel'] : []),
        ...((attachments!.files?.length ?? 0) > 0 ? ['dosya'] : []),
      ];
      userContent = `(eklenen ${kinds.join(' ve ')})`;
    }

    const userMsg: ChatCompletionMessageParam = { role: 'user', content: userContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

```
