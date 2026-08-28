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
  Columns2,
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
  Compass,
  Cloud,
  Languages
} from 'lucide-react';
import { Tab, Bookmark, Workspace, PermissionRequest } from '../types/browser';
import { formatSearchUrl, getSearchEngineName, isValidUrlOrDomain } from '../utils/searchEngine';
import { getUrlSecurityInfo } from '../utils/securityUtils';
import { AdBlockerPopover } from './AdBlockerPopover';
import { PermissionPromptPopover } from './PermissionPromptPopover';
import { PageTranslatePopover } from './PageTranslatePopover';
import { UserSettings } from '../App';
import { syncService, SyncStatus } from '../services/syncService';
import { getClientCachedSuggestions, setClientCachedSuggestions } from '../utils/suggestionCache';
import { TabHoverPreview } from './TabHoverPreview';

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
  tabsLength, setGhostTab, onOpenContextMenu, onTabHover, onTabLeave
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
      onDragStart={() => {
        onTabLeave?.();
        onTabDragStart?.();
      }}
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
      onClick={() => {
        onTabLeave?.();
        onSelectTab(tab.id);
      }}
      onMouseEnter={(e) => {
        if (!splitTab) {
          onTabHover?.(tab, e.currentTarget);
        }
      }}
      onMouseLeave={() => {
        if (!splitTab) {
          onTabLeave?.();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onTabLeave?.();
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
        <div className="flex w-full items-center h-full gap-0.5">
          {/* Primary Tab Half */}
          <div 
            className={`flex flex-1 items-center gap-1.5 px-2 min-w-0 h-[28px] rounded-md transition-all cursor-pointer group/split-left relative ${
              activeTabId === tab.id
                ? 'bg-blue-500/15 text-blue-600 dark:text-cyan-300 font-semibold shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-normal'
            }`}
            onClick={(e) => { 
              e.stopPropagation(); 
              onTabLeave?.();
              onSelectTab(tab.id); 
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              onTabHover?.(tab, e.currentTarget);
            }}
            onMouseLeave={() => {
              onTabLeave?.();
            }}
            title={tab.title}
          >
            {tab.isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-blue-500/50 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : tab.favicon ? (
              <img src={tab.favicon} className="w-3.5 h-3.5 rounded-sm shrink-0 object-contain" />
            ) : (
              <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />
            )}
            <span className="truncate text-[12px] flex-1">{tab.title || tab.url || 'New Tab'}</span>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabLeave?.();
                onCloseTab(tab.id);
              }}
              className="opacity-0 group-hover/split-left:opacity-100 p-0.5 rounded-sm hover:bg-red-500/20 text-slate-400 hover:text-red-500 shrink-0 transition-opacity cursor-pointer"
              title="Close Left Tab"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Unsplit / Separate Tabs Button */}
          <div className="flex items-center px-0.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabLeave?.();
                onCloseSplit?.(tab.id, splitTab.id);
              }}
              className="p-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer group/unsplit"
              title="Separate Tabs"
            >
              <div className="w-[1px] h-3.5 bg-slate-300/80 dark:bg-slate-600/80 group-hover/unsplit:hidden" />
              <Columns2 className="w-3 h-3 hidden group-hover/unsplit:block text-slate-500 dark:text-slate-300" />
            </button>
          </div>

          {/* Secondary Tab Half */}
          <div 
            className={`flex flex-1 items-center gap-1.5 px-2 min-w-0 h-[28px] rounded-md transition-all cursor-pointer group/split-right relative ${
              activeTabId === splitTab.id
                ? 'bg-blue-500/15 text-blue-600 dark:text-cyan-300 font-semibold shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-normal'
            }`}
            onClick={(e) => { 
              e.stopPropagation(); 
              onTabLeave?.();
              onSelectTab(splitTab.id); 
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              onTabHover?.(splitTab, e.currentTarget);
            }}
            onMouseLeave={() => {
              onTabLeave?.();
            }}
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
              onClick={(e) => { 
                e.stopPropagation(); 
                onTabLeave?.();
                onCloseTab(splitTab.id); 
              }} 
              className="opacity-0 group-hover/split-right:opacity-100 p-0.5 rounded-sm hover:bg-red-500/20 text-slate-400 hover:text-red-500 shrink-0 transition-opacity cursor-pointer"
              title="Close Right Tab"
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
              tab.isIncognito ? <VenetianMask className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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

            {!tab.isPinned && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabLeave?.();
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
    prevProps.splitTab?.url === nextProps.splitTab?.url &&
    prevProps.splitTab?.favicon === nextProps.splitTab?.favicon &&
    prevProps.splitTab?.isLoading === nextProps.splitTab?.isLoading &&
    prevProps.splitTab?.isMuted === nextProps.splitTab?.isMuted &&
    prevProps.splitTab?.isPlayingAudio === nextProps.splitTab?.isPlayingAudio &&
    prevProps.ghostTab?.id === nextProps.ghostTab?.id &&
    prevProps.tab.id === nextProps.tab.id &&
    prevProps.tab.url === nextProps.tab.url &&
    prevProps.tab.title === nextProps.tab.title &&
    prevProps.tab.splitWith === nextProps.tab.splitWith &&
    prevProps.tab.favicon === nextProps.tab.favicon &&
    prevProps.tab.isLoading === nextProps.tab.isLoading &&
    prevProps.tab.isMuted === nextProps.tab.isMuted &&
    prevProps.tab.isPinned === nextProps.tab.isPinned &&
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
  onResetZoom?: () => void;
  isBookmarked: boolean;
  permissionRequests?: PermissionRequest[];
  onRespondPermission?: (requestId: string, allow: boolean, remember: boolean) => void;
  onDismissPermission?: (requestId: string) => void;
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
  onResetZoom,
  isBookmarked,
  permissionRequests,
  onRespondPermission,
  onDismissPermission,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSiteInfoOpen, setIsSiteInfoOpen] = useState(false);
  const siteInfoBtnRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const blurTimerRef = useRef<NodeJS.Timeout | null>(null);

  const relevantPermissionRequests = useMemo(() => {
    if (!permissionRequests || !activeTab?.url) return [];
    let currentOrigin = '';
    try {
      currentOrigin = new URL(activeTab.url).origin;
    } catch {
      currentOrigin = activeTab.url;
    }
    return permissionRequests.filter(req => {
      let reqOrigin = '';
      try {
        reqOrigin = new URL(req.url || req.origin).origin;
      } catch {
        reqOrigin = req.origin || req.url;
      }
      return reqOrigin === currentOrigin || (req.webContentsId && req.webContentsId === activeTab.webContentsId);
    });
  }, [permissionRequests, activeTab?.url, activeTab?.webContentsId]);

  const [isPermissionPromptDismissed, setIsPermissionPromptDismissed] = useState(false);

  // Translation State
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string>('tr');
  const [sourceLang, setSourceLang] = useState<string>('auto');

  const handleTranslatePage = async (tLang: string, sLang?: string) => {
    if (!activeTab?.id) return;
    setIsTranslating(true);
    setTranslationError(null);
    setTargetLang(tLang);
    if (sLang) setSourceLang(sLang);
    try {
      window.dispatchEvent(new CustomEvent('nova:translate-tab', {
        detail: { tabId: activeTab.id, targetLang: tLang, sourceLang: sLang || 'auto' }
      }));
    } catch (err: any) {
      setTranslationError(err.message || 'Translation failed');
      setIsTranslating(false);
    }
  };

  const handleRestoreOriginal = async () => {
    if (!activeTab?.id) return;
    setIsTranslating(true);
    try {
      window.dispatchEvent(new CustomEvent('nova:restore-tab', {
        detail: { tabId: activeTab.id }
      }));
    } catch (err: any) {
      setIsTranslating(false);
    }
  };

  // Listen for translation completion events
  useEffect(() => {
    const handleDone = (e: any) => {
      if (e.detail?.tabId === activeTab?.id) {
        setIsTranslating(false);
        if (e.detail?.error) {
          setTranslationError(e.detail.error);
        }
      }
    };
    window.addEventListener('nova:translate-tab-done', handleDone);
    return () => window.removeEventListener('nova:translate-tab-done', handleDone);
  }, [activeTab?.id]);

  // Listen to main process context-menu trigger
  useEffect(() => {
    if (typeof (window as any).electronAPI?.onTriggerPageTranslation === 'function') {
      const unsub = (window as any).electronAPI.onTriggerPageTranslation((data: any) => {
        if (activeTab?.id) {
          setIsTranslateOpen(true);
          handleTranslatePage(data?.targetLang || 'tr', 'auto');
        }
      });
      return () => unsub?.();
    }
  }, [activeTab?.id]);

  useEffect(() => {
    if (relevantPermissionRequests.length > 0) {
      setIsPermissionPromptDismissed(false);
    }
  }, [relevantPermissionRequests.length]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isFocused) {
      const url = activeTab?.url || '';
      if (url === 'nova://newtab' || url === 'about:blank' || url === 'https://newtab') {
        setSearchValue('');
      } else {
        setSearchValue(url);
      }
    }
  }, [activeTab?.url, isFocused]);

  useEffect(() => {
    const trimmed = searchValue.trim();
    if (isAIMode || !trimmed || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('nova://') || trimmed.startsWith('about:')) {
      setSuggestions([]);
      return;
    }

    // 1. Instant 0ms cache lookup
    const cacheKey = `${trimmed}_${searchEngine}`;
    const cached = getClientCachedSuggestions(cacheKey);
    if (cached) {
      setSuggestions(cached.slice(0, 6));
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchSuggestions = async () => {
      try {
        const clientLocale = typeof navigator !== 'undefined' ? navigator.language : 'tr-TR';
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getSuggestions) {
          const results = await (window as any).electronAPI.getSuggestions(trimmed, searchEngine, clientLocale);
          if (!abortController.signal.aborted && Array.isArray(results)) {
            setClientCachedSuggestions(cacheKey, results);
            setSuggestions(results.slice(0, 6));
            return;
          }
        }
        const lang = clientLocale.split('-')[0] || 'tr';
        const country = clientLocale.split('-')[1] || (lang === 'tr' ? 'TR' : 'US');
        const response = await fetch(
          `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(trimmed)}&hl=${lang}&gl=${country}`,
          { signal: abortController.signal }
        );
        if (!abortController.signal.aborted && response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data) && Array.isArray(data[1])) {
            const list = data[1].slice(0, 6);
            setClientCachedSuggestions(cacheKey, list);
            setSuggestions(list);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // ignore network errors
        }
      }
    };

    const timer = setTimeout(fetchSuggestions, 35);
    setSelectedIndex(-1);
    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [searchValue, isAIMode, searchEngine]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    let targetValue = searchValue;
    const searchLower = searchValue.toLowerCase();
    const matchedBookmarks = Array.isArray(bookmarks)
      ? bookmarks
          .filter(b => (b?.title && typeof b.title === 'string' && b.title.toLowerCase().includes(searchLower)) || 
                       (b?.url && typeof b.url === 'string' && b.url.toLowerCase().includes(searchLower)))
          .slice(0, 3)
      : [];

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
    <div className="flex-1 flex w-full mx-1 duration-200 ease-out" style={{ transform: isFocused ? 'scale(1.005)' : 'scale(1)' }}>
      <div className="w-full relative">
        <form
          onSubmit={handleSearchSubmit}
          className="nova-omnibox-form relative group w-full"
          style={{ position: 'relative' }}
        >
          <div 
            ref={siteInfoBtnRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsSiteInfoOpen(prev => !prev);
            }}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10 cursor-pointer"
          >
            {isIncognito ? (
              <div className="flex items-center gap-1.5 text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-lg shadow-xs hover:bg-cyan-500/25 transition-colors" title="Private & Incognito Mode (Click for Site Info)">
                <VenetianMask className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Incognito</span>
              </div>
            ) : (
              (() => {
                const sec = getUrlSecurityInfo(activeTab?.url || '');
                return (
                  <div className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-md transition-all hover:scale-105 active:scale-95 ${sec.bgColor} ${sec.color}`} title={`${sec.tooltip} (Click for site info & permissions)`}>
                    {sec.level === 'internal' && (
                      (activeTab?.url === 'nova://settings' || activeTab?.url?.includes('settings')) ? <Settings className="w-3.5 h-3.5" /> :
                      (activeTab?.url === 'nova://history' || activeTab?.url?.includes('history')) ? <Clock className="w-3.5 h-3.5" /> :
                      (activeTab?.url === 'nova://downloads' || activeTab?.url?.includes('downloads')) ? <Download className="w-3.5 h-3.5" /> :
                      <Search className="w-3.5 h-3.5" />
                    )}
                    {sec.level === 'secure' && <Lock className="w-3.5 h-3.5" />}
                    {sec.level === 'http' && <Unlock className="w-3.5 h-3.5" />}
                    {sec.level === 'dangerous' && <ShieldAlert className="w-3.5 h-3.5" />}
                    {sec.level === 'unknown' && <HelpCircle className="w-3.5 h-3.5" />}
                  </div>
                );
              })()
            )}
          </div>

          <SiteInfoPopover
            isOpen={isSiteInfoOpen}
            onClose={() => setIsSiteInfoOpen(false)}
            url={activeTab?.url || ''}
            blockedAdsCount={activeTab?.blockedAdsCount || 0}
            buttonRef={siteInfoBtnRef}
          />

          {/* Chrome-Style Permission Prompt Bubble */}
          {!isPermissionPromptDismissed && relevantPermissionRequests.length > 0 && onRespondPermission && (
            <PermissionPromptPopover
              requests={relevantPermissionRequests}
              onRespond={(requestId, allow, remember) => {
                onRespondPermission(requestId, allow, remember);
              }}
              onDismiss={(requestId) => {
                if (onDismissPermission) {
                  onDismissPermission(requestId);
                }
                setIsPermissionPromptDismissed(true);
              }}
            />
          )}

          {/* Chrome-Style Omnibox Permission Chip */}
          {relevantPermissionRequests.length > 0 && (
            <div 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsPermissionPromptDismissed(prev => !prev);
              }}              className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10 cursor-pointer bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg text-xs font-semibold shadow-xs ${
                isIncognito ? 'left-28' : 'left-10'
              }`}
              title="Site Permissions (Click to toggle)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping shrink-0" />
              <span className="text-[11px] font-semibold whitespace-nowrap">Permissions</span>
            </div>
          )}

          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && searchValue.trim().toLowerCase() === '@ai') {
                e.preventDefault();
                setIsAIMode(true);
                setSearchValue('');
              } else if (e.key === 'Tab' && selectedIndex >= 0 && selectedIndex < suggestions.length) {
                e.preventDefault();
                setSearchValue(suggestions[selectedIndex]);
                setSelectedIndex(-1);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const searchLower = searchValue.toLowerCase();
                const matchedBookmarksCount = Array.isArray(bookmarks)
                  ? bookmarks.filter(b => (b?.title && typeof b.title === 'string' && b.title.toLowerCase().includes(searchLower)) || 
                                          (b?.url && typeof b.url === 'string' && b.url.toLowerCase().includes(searchLower))).slice(0, 3).length
                  : 0;
                const maxIndex = suggestions.length + matchedBookmarksCount - 1;
                setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : prev));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > -1 ? prev - 1 : -1));
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
                setSelectedIndex(-1);
                if (activeTab?.url) {
                  setSearchValue(activeTab.url);
                }
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }
            }}
            onFocus={(e) => {
              setIsFocused(true);
              setShowSuggestions(true);
              e.target.select();
            }}
            onBlur={() => {
              setIsFocused(false);
              if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
              blurTimerRef.current = setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder={isAIMode ? "AI: What would you like me to do? (e.g. Open YouTube and search for music)" : `Search ${getSearchEngineName(searchEngine)} or type a URL`}
            className={`w-full border border-slate-200/60 dark:border-white/10 focus:border-cyan-500 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl py-1.5 pr-24 text-[13px] outline-none transition-colors duration-300 shadow-2xs ${
              relevantPermissionRequests.length > 0
                ? isIncognito ? 'pl-52' : 'pl-34'
                : isIncognito ? 'pl-28' : 'pl-11'
            } ${
              isIncognito 
                ? 'bg-slate-900/80 hover:bg-slate-900 focus:bg-slate-900 text-slate-200 placeholder-slate-500' 
                : 'bg-slate-100/90 hover:bg-slate-200/60 focus:bg-white text-slate-800 placeholder-slate-400 dark:bg-slate-900/70 dark:hover:bg-slate-900 dark:focus:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500'
            } ${isAIMode ? 'border-cyan-400/50 ring-4 ring-cyan-500/20 bg-cyan-950/30 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : ''} ${
              (useVerticalTabs && !isFocused && !isAIMode) ? '!text-transparent !placeholder-transparent' : ''
            }`}
          />

          {/* Title & URL Overlay for Vertical Tabs Mode */}
          {useVerticalTabs && !isFocused && !isAIMode && (
            <div className={`absolute inset-0 pointer-events-none flex flex-col justify-center pr-24 ${
              relevantPermissionRequests.length > 0
                ? isIncognito ? 'pl-52' : 'pl-34'
                : isIncognito ? 'pl-28' : 'pl-11'
            }`}>
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
          <div
            className="nova-omnibox-actions absolute inset-y-0 right-2 flex items-center gap-1 z-10"
            style={{
              position: 'absolute',
              top: 0,
              right: '0.5rem',
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              zIndex: 10,
            }}
          >
            {activeTab?.zoomFactor !== undefined && activeTab.zoomFactor !== 1.0 && (
              <button 
                type="button" 
                onClick={onResetZoom}
                className={`px-1.5 py-0.5 mr-1 rounded-md text-[10px] font-bold cursor-pointer select-none transition-colors hover:scale-105 active:scale-95 ${isIncognito ? 'bg-slate-700 hover:bg-slate-600 text-cyan-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-cyan-400'}`}
                title="Zoom Level (Click to reset 100%)"
              >
                {Math.round(activeTab.zoomFactor * 100)}%
              </button>
            )}

            {onToggleReaderMode && (
              <button 
                type="button" 
                onClick={onToggleReaderMode}
                className={`p-1 rounded-lg transition-colors ${isIncognito ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
                title="Toggle Reader Mode"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Page Translation Button & Popover */}
            {activeTab?.url && (activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://')) && (
              <div className="relative flex items-center">
                <button 
                  type="button" 
                  onClick={() => setIsTranslateOpen(!isTranslateOpen)}
                  className={`p-1 rounded-lg transition-colors relative ${
                    activeTab.isTranslated
                      ? 'text-cyan-500 bg-cyan-500/15 hover:bg-cyan-500/25'
                      : isIncognito 
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title="Translate Page"
                >
                  <Languages className="w-3.5 h-3.5" />
                  {activeTab.isTranslated && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-500 ring-1 ring-white dark:ring-slate-900" />
                  )}
                </button>

                <PageTranslatePopover
                  isOpen={isTranslateOpen}
                  onClose={() => setIsTranslateOpen(false)}
                  onTranslate={handleTranslatePage}
                  onRestoreOriginal={handleRestoreOriginal}
                  isTranslated={!!activeTab?.isTranslated}
                  isLoading={isTranslating}
                  currentSourceLang={sourceLang}
                  currentTargetLang={targetLang}
                  error={translationError}
                />
              </div>
            )}

            <button 
              type="button" 
              onClick={onToggleBookmark}
              className={`p-1 rounded-lg transition-colors ${isIncognito ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
              title="Bookmark Page"
            >
              <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-cyan-500 text-cyan-500' : ''}`} />
            </button>
          </div>
        </form>

        {/* Search Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && searchValue.trim().length > 0 && (() => {
            const searchLower = searchValue.toLowerCase();
            const matchedBookmarks = Array.isArray(bookmarks)
              ? bookmarks
                  .filter(b => (b?.title && typeof b.title === 'string' && b.title.toLowerCase().includes(searchLower)) || 
                               (b?.url && typeof b.url === 'string' && b.url.toLowerCase().includes(searchLower)))
                  .slice(0, 3)
              : [];
            
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
                {isValidUrlOrDomain(searchValue) ? (
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
  onOpenHelp,
  onOpenShare,
  onTakeScreenshot,
  onOpenFindInPage,
  onToggleSplitView,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onDuplicateTab,
  onTogglePinTab,
  onToggleMuteTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onNewTabRight,
  onReopenClosedTab,
  canReopenClosedTab = false,
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
  onOpenAccount,
  onTabDragStart,
  onTabDragEnd,
  onTabDrag,
  onDropToSplitScreen,
  splitTabId,
  onCloseSplit,
  permissionRequests,
  onRespondPermission,
  onDismissPermission
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());

  useEffect(() => {
    const unsubscribe = syncService.subscribe((status: SyncStatus) => {
      setSyncStatus(status);
    });
    return () => { unsubscribe(); };
  }, []);

  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [extensions, setExtensions] = useState<any[]>([]);
  const [mcpClientCount, setMcpClientCount] = useState(0);
  const [mcpRunning, setMcpRunning] = useState(false);
  const [isAdBlockerOpen, setIsAdBlockerOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const [tabContextMenu, setTabContextMenu] = useState<TabContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    tab: null,
    tabIndex: -1
  });
  const downloadsBtnRef = useRef<HTMLButtonElement>(null);
  const [adblockWhitelist, setAdblockWhitelist] = useState<string[]>([]);
  const [ghostTab, setGhostTab] = useState<{ id: string; x: number; y: number } | null>(null);
  const [hoveredTabPreview, setHoveredTabPreview] = useState<{
    tab: Tab;
    rect: { top: number; left: number; width: number; height: number; right: number; bottom: number };
  } | null>(null);
  const hoverTimeoutRef = useRef<any>(null);

  const handleTabHover = useCallback((tab: Tab, target: HTMLElement) => {
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      if (target) {
        const r = target.getBoundingClientRect();
        setHoveredTabPreview({
          tab,
          rect: {
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
            right: r.right,
            bottom: r.bottom
          }
        });
      }
    }, 200);
  }, []);

  const handleTabLeave = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
    setHoveredTabPreview(null);
  }, []);

  // Auto-dismiss preview immediately if the hovered tab was closed or removed
  useEffect(() => {
    if (hoveredTabPreview && !tabs.some(t => t.id === hoveredTabPreview.tab.id)) {
      clearTimeout(hoverTimeoutRef.current);
      setHoveredTabPreview(null);
    }
  }, [tabs, hoveredTabPreview]);

  // Global dismiss listeners on scroll, click, or window blur
  useEffect(() => {
    const dismiss = () => {
      clearTimeout(hoverTimeoutRef.current);
      setHoveredTabPreview(null);
    };

    window.addEventListener('pointerdown', dismiss);
    window.addEventListener('wheel', dismiss, { passive: true });
    window.addEventListener('blur', dismiss);
    window.addEventListener('keydown', dismiss);

    return () => {
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('wheel', dismiss);
      window.removeEventListener('blur', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
  }, []);

  const tabsContainerRef = useRef<any>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const visibleTabs = useMemo(() => {
    const renderedSplitIds = new Set<string>();
    const result: Tab[] = [];
    for (const tab of tabs) {
      if (tab.splitWith) {
        if (renderedSplitIds.has(tab.id)) continue;
        const other = tabs.find(t => t.id === tab.splitWith);
        if (other) {
          renderedSplitIds.add(other.id);
        }
        result.push(tab);
      } else {
        result.push(tab);
      }
    }
    return result;
  }, [tabs]);

  // PERF: coalesce high-frequency scroll/resize layout reads to one batch per frame.
  const checkScrollRafRef = useRef<number | null>(null);
  const checkScroll = useCallback(() => {
    if (checkScrollRafRef.current !== null) return;
    checkScrollRafRef.current = requestAnimationFrame(() => {
      checkScrollRafRef.current = null;
      const el = tabsContainerRef.current;
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    });
  }, []);

  useEffect(() => {
    checkScroll();
    const el = tabsContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      if (checkScrollRafRef.current !== null) {
        cancelAnimationFrame(checkScrollRafRef.current);
        checkScrollRafRef.current = null;
      }
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [tabs, checkScroll]);

  useEffect(() => {
    if (!tabsContainerRef.current) return;
    const activeTabEl = tabsContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    // PERF: instant scroll — switching tabs should feel immediate.
    activeTabEl?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
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



  useEffect(() => {
    const fetchWhitelist = async () => {
      try {
        if ((window as any).electronAPI?.storeGet) {
          const val = await (window as any).electronAPI.storeGet('adblocker_whitelist');
          if (val) {
            const parsed = JSON.parse(val);
            setAdblockWhitelist(Array.isArray(parsed) ? parsed : []);
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
  const isWhitelisted = Array.isArray(adblockWhitelist) && Boolean(currentHostname) && adblockWhitelist.includes(currentHostname);
  
  const handleToggleWhitelist = async () => {
    if (!currentHostname) return;
    const currentList = Array.isArray(adblockWhitelist) ? adblockWhitelist : [];
    const newWhitelist = isWhitelisted 
      ? currentList.filter(h => h !== currentHostname)
      : [...currentList, currentHostname];
    
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
            values={visibleTabs}
            onReorder={(newTabs) => {
              if (ghostTab) return;
              if (onReorderFullList) {
                const full: Tab[] = [];
                for (const t of newTabs) {
                  full.push(t);
                  if (t.splitWith) {
                    const partner = tabs.find(p => p.id === t.splitWith);
                    if (partner && !full.some(x => x.id === partner.id)) {
                      full.push(partner);
                    }
                  }
                }
                onReorderFullList(full);
              }
            }}
            ref={tabsContainerRef}
            onWheel={handleWheel}
            className="flex-1 flex items-end gap-1 overflow-x-auto overflow-y-hidden no-scrollbar drag-region h-[38px]"
          >
            <AnimatePresence>
            {visibleTabs.map((tab: Tab) => {
              const splitTab = tab.splitWith ? tabs.find(t => t.id === tab.splitWith) : null;
              const isActive = tab.id === activeTabId || (splitTab ? splitTab.id === activeTabId : false);

              return (
                <MemoizedTabItem
                  key={tab.id}
                  tab={tab}
                  activeTabId={activeTabId}
                  index={tabs.findIndex(t => t.id === tab.id)}
                  isActive={isActive}
                  splitTab={splitTab}
                  ghostTab={ghostTab}
                  tabStyle={tabStyle}
                  isIncognito={isIncognito}
                  onTabDragStart={onTabDragStart}
                  onTabDrag={onTabDrag}
                  onTabDragEnd={onTabDragEnd}
                  onDropToSplitScreen={onDropToSplitScreen}
                  onSelectTab={onSelectTab}
                  onCloseSplit={() => onCloseSplit?.(tab.id, splitTab?.id)}
                  onToggleMuteTab={onToggleMuteTab}
                  onTogglePip={onTogglePip}
                  onCloseTab={onCloseTab}
                  tabsLength={tabs.length}
                  setGhostTab={setGhostTab}
                  onTabHover={handleTabHover}
                  onTabLeave={handleTabLeave}
                  onOpenContextMenu={(targetTab: Tab, index: number, e: React.MouseEvent) => {
                    setTabContextMenu({
                      isOpen: true,
                      x: e.clientX,
                      y: e.clientY,
                      tab: targetTab,
                      tabIndex: index
                    });
                  }}
                />
              );
            })}
            </AnimatePresence>
            
            {/* New Tab Button */}
            <motion.button
              layout="position"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.6 }}
              onClick={() => onNewTab()}
              className={`p-1.5 mb-1 ml-1 rounded-lg transition-colors shrink-0 no-drag cursor-pointer ${
                isIncognito 
                  ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' 
                  : 'text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
              title="New Tab (⌘T)"
            >
              <Plus className="w-4 h-4" />
            </motion.button>

            {/* New Incognito Tab Button */}
            <motion.button
              layout="position"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.6 }}
              onClick={onNewIncognitoTab}
              className={`p-1.5 mb-1 rounded-lg transition-colors shrink-0 no-drag cursor-pointer ${
                isIncognito 
                  ? 'text-slate-300 hover:bg-slate-700 hover:text-white' 
                  : 'text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
              title="New Private / Incognito Tab (⇧⌘N)"
            >
              <ShieldOff className="w-4 h-4" />
            </motion.button>
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
          onResetZoom={onResetZoom}
          isBookmarked={isBookmarked}
          permissionRequests={permissionRequests}
          onRespondPermission={onRespondPermission}
          onDismissPermission={onDismissPermission}
        />

        {/* Extensions / Action Controls / More Menu */}
        <div className="flex items-center gap-1.5 ml-auto relative shrink-0">
          {/* AI Copilot Pill */}
          <motion.button 
            whileHover={{ scale: 1.04 }} 
            whileTap={{ scale: 0.96 }}
            onClick={onToggleAIAssistant}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-colors font-semibold text-xs shrink-0 ${
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
              className={`p-1.5 rounded-lg transition-colors relative cursor-pointer ${
                (activeDownloadsCount || 0) > 0
                  ? 'text-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20 shadow-xs'
                  : isIncognito 
                    ? 'hover:bg-slate-700 text-slate-300' 
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
              title="Downloads"
            >
              <Download className={`w-4 h-4 ${(activeDownloadsCount || 0) > 0 ? 'animate-bounce' : ''}`} />
              {(activeDownloadsCount || 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-cyan-500 text-slate-950 text-[9px] font-bold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center shadow-xs animate-pulse">
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

          {/* Nova Account & Sync Button */}
          {onOpenAccount && (
            <button
              onClick={onOpenAccount}
              className={`p-1.5 rounded-lg transition-colors relative flex items-center justify-center ${
                isIncognito 
                  ? 'hover:bg-slate-700 text-slate-300' 
                  : syncStatus.isLoggedIn
                    ? 'hover:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
              title={syncStatus.isLoggedIn ? `Nova Account (${syncStatus.user?.displayName || syncStatus.user?.email})` : 'Sign In to Nova Sync'}
            >
              {syncStatus.isLoggedIn && syncStatus.user ? (
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold text-[10px] flex items-center justify-center shadow-xs uppercase">
                  {syncStatus.user.displayName ? syncStatus.user.displayName.charAt(0) : 'U'}
                </div>
              ) : (
                <User className="w-4 h-4" />
              )}
              {syncStatus.isLoggedIn && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-0.5 right-0.5 border border-white dark:border-slate-900" />
              )}
            </button>
          )}
          
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
                    {/* Nova Account Header inside menu */}
                    {onOpenAccount && (
                      <div className="p-1">
                        <button
                          onClick={() => { onOpenAccount(); setIsMoreMenuOpen(false); }}
                          className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/15 hover:to-blue-500/15 text-slate-800 dark:text-slate-100 rounded-xl transition-colors text-left"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {syncStatus.isLoggedIn && syncStatus.user ? (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                                {syncStatus.user.displayName ? syncStatus.user.displayName.charAt(0) : 'U'}
                              </div>
                            ) : (
                              <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                                <Cloud className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="text-xs font-bold block truncate">
                                {syncStatus.isLoggedIn ? (syncStatus.syncCode || 'Nova Sync') : 'Nova Sync'}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {syncStatus.isLoggedIn ? 'Sync Chain Active' : 'Pair & sync across devices'}
                              </span>
                            </div>
                          </div>
                          {syncStatus.isLoggedIn ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          ) : (
                            <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full shrink-0">Pair</span>
                          )}
                        </button>
                      </div>
                    )}

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
                      {onTakeScreenshot && (
                        <button onClick={() => { onTakeScreenshot(); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors text-left">
                          <Camera className="w-4 h-4 text-slate-400" /> Screenshot
                        </button>
                      )}
                      {onOpenShare && (
                        <button onClick={() => { onOpenShare(); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors text-left">
                          <Share2 className="w-4 h-4 text-slate-400" /> Share Link
                        </button>
                      )}
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
                      {onOpenHelp && (
                        <button onClick={() => { onOpenHelp(); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors text-left">
                          <HelpCircle className="w-4 h-4 text-slate-400" /> Help & Support
                        </button>
                      )}
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
          {(Array.isArray(bookmarks) && bookmarks.length > 0 ? bookmarks : [
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

    {/* Chrome-Style Tab Context Menu */}
    <TabContextMenu
      menuState={tabContextMenu}
      onClose={() => setTabContextMenu(prev => ({ ...prev, isOpen: false, tab: null }))}
      onNewTabRight={(idx) => {
        if (onNewTabRight) onNewTabRight(idx);
        else onNewTab();
      }}
      onReloadTab={(tabId) => {
        const wv = document.querySelector(`webview[data-tab-id="${tabId}"]`) as any;
        if (wv && wv.reload) wv.reload();
        else if (tabId === activeTabId && onReload) onReload();
      }}
      onDuplicateTab={(tabId) => onDuplicateTab(tabId)}
      onTogglePinTab={(tabId) => onTogglePinTab(tabId)}
      onToggleMuteTab={(tabId) => onToggleMuteTab(tabId)}
      onBookmarkTab={(targetTab) => {
        if (onSelectTab) onSelectTab(targetTab.id);
        if (onToggleBookmark) onToggleBookmark();
      }}
      onCloseTab={(tabId) => onCloseTab(tabId)}
      onCloseOtherTabs={(tabId) => {
        if (onCloseOtherTabs) onCloseOtherTabs(tabId);
      }}
      onCloseTabsToRight={(idx) => {
        if (onCloseTabsToRight) onCloseTabsToRight(idx);
      }}
      onReopenClosedTab={() => {
        if (onReopenClosedTab) onReopenClosedTab();
      }}
      canReopenClosedTab={canReopenClosedTab}
      isBookmarked={tabContextMenu.tab ? bookmarks.some(b => b.url === tabContextMenu.tab?.url) : false}
      totalTabs={tabs.length}
    />

    {/* Tab Hover Preview */}
    <TabHoverPreview
      tab={hoveredTabPreview?.tab || null}
      rect={hoveredTabPreview?.rect || null}
      position="bottom"
      visible={Boolean(hoveredTabPreview && !ghostTab && !tabContextMenu.isOpen)}
    />
    </>
  );
}, (prevProps, nextProps) => {
  // Compare only rendered fields — tabs array identity changes on every webview
  // event. Callback props are stable useCallback references from App.

  if (prevProps.activeTabId !== nextProps.activeTabId) return false;
  if (prevProps.activeWorkspaceId !== nextProps.activeWorkspaceId) return false;
  if (prevProps.activeDownloadsCount !== nextProps.activeDownloadsCount) return false;
  if (prevProps.canReopenClosedTab !== nextProps.canReopenClosedTab) return false;
  if (prevProps.showBookmarksBar !== nextProps.showBookmarksBar) return false;
  if (prevProps.useVerticalTabs !== nextProps.useVerticalTabs) return false;
  if (prevProps.isSplitView !== nextProps.isSplitView) return false;
  if (prevProps.tabStyle !== nextProps.tabStyle) return false;
  if (prevProps.isIncognito !== nextProps.isIncognito) return false;
  if (prevProps.searchEngine !== nextProps.searchEngine) return false;
  if (prevProps.isVpnEnabled !== nextProps.isVpnEnabled) return false;
  if (prevProps.splitTabId !== nextProps.splitTabId) return false;

  // Array-valued props compared by reference (state arrays from App; stable
  // unless actually changed)
  if (prevProps.workspaces !== nextProps.workspaces) return false;
  if (prevProps.bookmarks !== nextProps.bookmarks) return false;
  if (prevProps.downloads !== nextProps.downloads) return false;
  if (prevProps.permissionRequests !== nextProps.permissionRequests) return false;

  // Tabs: length + order-sensitive per-field comparison of every field the
  // strip or the active-tab-derived UI reads:
  //   strip items: id, url, title, favicon, isLoading, isMuted, isPinned,
  //                isPlayingAudio, isSuspended, splitWith
  //   active tab:  canGoBack, canGoForward, zoomFactor, blockedAdsCount,
  //                webContentsId (+ url/title/favicon/id above)
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
      a.url !== b.url ||
      a.title !== b.title ||
      a.favicon !== b.favicon ||
      a.isLoading !== b.isLoading ||
      a.isMuted !== b.isMuted ||
      a.isPinned !== b.isPinned ||
      a.isPlayingAudio !== b.isPlayingAudio ||
      a.isSuspended !== b.isSuspended ||
      a.splitWith !== b.splitWith ||
      a.canGoBack !== b.canGoBack ||
      a.canGoForward !== b.canGoForward ||
      a.zoomFactor !== b.zoomFactor ||
      a.blockedAdsCount !== b.blockedAdsCount ||
      a.webContentsId !== b.webContentsId
    ) {
      return false;
    }
  }
  return true;
});
