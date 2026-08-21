import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  X, 
  Globe, 
  VolumeX, 
  Volume2, 
  ChevronDown, 
  ChevronRight, 
  Folder as FolderIcon, 
  FolderPlus, 
  Check, 
  Settings, 
  Clock, 
  Download, 
  VenetianMask, 
  Moon,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Search,
  Shield,
  ShieldCheck,
  Puzzle,
  Package,
  Orbit,
  Layers,
  LayoutGrid,
  Trash2,
  PanelLeft,
  Pin,
  HelpCircle,
  Compass
} from 'lucide-react';
import { Tab, Workspace, Folder, Bookmark } from '../types/browser';
import { UserSettings } from '../App';
import { formatSearchUrl } from '../utils/searchEngine';
import { TabContextMenu, TabContextMenuState } from './TabContextMenu';

const WORKSPACE_COLORS: Record<string, string> = {
  slate: '#64748b',
  blue: '#3b82f6',
  emerald: '#10b981',
  purple: '#a855f7',
  rose: '#f43f5e',
  amber: '#f59e0b'
};

export interface FavoriteApp {
  id: string;
  name: string;
  url: string;
  iconType: 'youtube' | 'github' | 'x' | 'chatgpt' | 'google' | 'custom';
  iconBg?: string;
}

const DEFAULT_FAVORITE_APPS: FavoriteApp[] = [
  { id: 'fav_yt', name: 'YouTube', url: 'https://youtube.com', iconType: 'youtube', iconBg: '#ef4444' },
  { id: 'fav_gh', name: 'GitHub', url: 'https://github.com', iconType: 'github', iconBg: '#24292f' },
  { id: 'fav_x', name: 'X', url: 'https://x.com', iconType: 'x', iconBg: '#0f1419' },
  { id: 'fav_ai', name: 'ChatGPT', url: 'https://chatgpt.com', iconType: 'chatgpt', iconBg: '#10a37f' },
];

function renderFavoriteIcon(fav: FavoriteApp) {
  switch (fav.iconType) {
    case 'youtube':
      return (
        <svg className="w-4 h-4 fill-red-500" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    case 'github':
      return (
        <svg className="w-4 h-4 fill-slate-200" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
      );
    case 'x':
      return (
        <svg className="w-3.5 h-3.5 fill-slate-200" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case 'chatgpt':
      return (
        <svg className="w-4 h-4 fill-emerald-400" viewBox="0 0 24 24">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.597 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.6669zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813v6.7226zm1.093-2.2243L12 9.116l2.6005 1.5228v3.0455L12 15.207l-2.6005-1.5227v-3.0456z"/>
        </svg>
      );
    default:
      return <Globe className="w-4 h-4 text-cyan-400" />;
  }
}

export interface SidebarTabsProps {
  tabs: Tab[];
  folders?: Folder[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e?: React.MouseEvent) => void;
  onNewTab: (url?: string) => void;
  onToggleMuteTab: (id: string, e: React.MouseEvent) => void;
  onDuplicateTab?: (id: string) => void;
  onTogglePinTab?: (id: string) => void;
  onCloseOtherTabs?: (id: string) => void;
  onCloseTabsToRight?: (index: number) => void;
  onNewTabRight?: (index: number) => void;
  onReopenClosedTab?: () => void;
  canReopenClosedTab?: boolean;
  onToggleBookmark?: () => void;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  isIncognito?: boolean;
  onCreateFolder?: () => void;
  onToggleFolder?: (id: string) => void;
  onRenameFolder?: (id: string, name: string) => void;
  onDeleteFolder?: (id: string) => void;
  onMoveTabToFolder?: (tabId: string, folderId?: string) => void;
  onOpenSpotlight?: () => void;
  onTabDragStart?: () => void;
  onTabDragEnd?: () => void;
  splitTabId?: string | null;
  onCloseSplit?: () => void;
  onNavigate?: (url: string) => void;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onReload?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  isLoading?: boolean;
  searchEngine?: UserSettings['searchEngine'];
  privacyShield?: boolean;
  onOpenDownloads?: () => void;
  onOpenHistory?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  onOpenExtensions?: () => void;
  bookmarks?: Bookmark[];
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  onReorderTabs?: (draggedId: string, targetId: string) => void;
}

// Tab Peek Popover rendered via Portal
const TabPeekPortal: React.FC<{
  tab: Tab | null;
  pos: { top: number; left: number };
}> = ({ tab, pos }) => {
  if (!tab || !tab.thumbnail) return null;

  return createPortal(
    <AnimatePresence>
      {tab && tab.thumbnail && (
        <motion.div
          key="tab-peek"
          initial={{ opacity: 0, x: -12, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -8, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="pointer-events-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
          style={{
            position: 'fixed',
            top: Math.min(pos.top, window.innerHeight - 220),
            left: pos.left,
            zIndex: 99999,
            width: 272,
          }}
        >
          <div className="px-3 py-2 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis">
              {tab.favicon && <img src={tab.favicon} alt="" style={{ width: 12, height: 12, marginRight: 6, display: 'inline', verticalAlign: 'middle', borderRadius: 2 }} />}
              {tab.title || tab.url || 'New Tab'}
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-950 overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <img
              src={tab.thumbnail}
              alt="Tab preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

interface SidebarTabItemProps {
  tab: Tab;
  isActive: boolean;
  isDragOver: boolean;
  isNested: boolean;
  tabsLength: number;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e?: React.MouseEvent) => void;
  onToggleMuteTab: (id: string, e: React.MouseEvent) => void;
  onTabDragStart?: () => void;
  onTabDragEnd?: () => void;
  onReorderTabs?: (draggedId: string, targetId: string) => void;
  onOpenContextMenu: (tab: Tab, e: React.MouseEvent) => void;
  onMouseEnter: (tab: Tab, e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  setDragOverTabId: (id: string | null) => void;
}

const SidebarTabItem: React.FC<SidebarTabItemProps> = React.memo(({
  tab,
  isActive,
  isDragOver,
  isNested,
  tabsLength,
  onSelectTab,
  onCloseTab,
  onToggleMuteTab,
  onTabDragStart,
  onTabDragEnd,
  onReorderTabs,
  onOpenContextMenu,
  onMouseEnter,
  onMouseLeave,
  setDragOverTabId
}) => {
  const isNewTabUrl = !tab.url || tab.url === 'nova://newtab' || tab.url === 'about:blank' || tab.url === 'https://newtab';

  return (
    <motion.div
      draggable
      onDragStart={(e: any) => {
        e.dataTransfer.setData('text/plain', tab.id);
        onTabDragStart?.();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (!isDragOver) {
          setDragOverTabId(tab.id);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          if (isDragOver) setDragOverTabId(null);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverTabId(null);
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId && draggedId !== tab.id && onReorderTabs) {
          onReorderTabs(draggedId, tab.id);
        }
      }}
      onDragEnd={() => {
        setDragOverTabId(null);
        onTabDragEnd?.();
      }}
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      key={tab.id}
      onClick={() => onSelectTab(tab.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenContextMenu(tab, e);
      }}
      onMouseEnter={(e) => onMouseEnter(tab, e)}
      onMouseLeave={onMouseLeave}
      className={`relative flex items-center h-8.5 px-2.5 rounded-xl cursor-pointer transition-colors duration-150 group/tab select-none ${
        isNested ? 'ml-3.5 w-[calc(100%-14px)]' : 'w-full'
      } ${
        isDragOver
          ? 'ring-2 ring-cyan-500 bg-cyan-500/15 text-slate-900 dark:text-white shadow-md'
          : isActive
            ? 'bg-white text-slate-900 shadow-xs font-semibold border border-slate-200/80 dark:bg-white/12 dark:text-white dark:shadow-sm dark:font-medium dark:border-white/10'
            : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-300/80 dark:hover:bg-white/6 dark:hover:text-white'
      }`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {tab.isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-slate-400/40 border-t-slate-800 dark:border-slate-300/40 dark:border-t-white rounded-full animate-spin" />
          ) : tab.favicon ? (
            <img src={tab.favicon} alt="" className="w-3.5 h-3.5 rounded-xs object-contain" />
          ) : tab.url === 'nova://settings' ? (
            <Settings className="w-3.5 h-3.5 opacity-70" />
          ) : tab.url === 'nova://history' ? (
            <Clock className="w-3.5 h-3.5 opacity-70" />
          ) : tab.url === 'nova://downloads' ? (
            <Download className="w-3.5 h-3.5 opacity-70" />
          ) : isNewTabUrl ? (
            <Compass className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-500 dark:text-cyan-400' : 'opacity-70'}`} />
          ) : (
            <Globe className="w-3.5 h-3.5 opacity-70" />
          )}
        </div>
        <span className="truncate text-[13px] tracking-tight flex-1">
          {tab.title || (isNewTabUrl ? 'New Tab' : tab.url) || 'New Tab'}
        </span>
        {tab.isPinned && (
          <Pin className="w-2.5 h-2.5 text-cyan-500 shrink-0 opacity-80" />
        )}
      </div>

      <div className={`flex items-center gap-1 transition-opacity duration-150 shrink-0 ${
        isActive || tab.isPlayingAudio || tab.isMuted || tab.isSuspended ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-100'
      }`}>
        {tab.isMuted ? (
          <button onClick={(e) => onToggleMuteTab(tab.id, e)} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-red-500 dark:text-red-400">
            <VolumeX className="w-3 h-3" />
          </button>
        ) : tab.isPlayingAudio ? (
          <button onClick={(e) => onToggleMuteTab(tab.id, e)} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-cyan-600 dark:text-cyan-400">
            <Volume2 className="w-3 h-3 animate-pulse" />
          </button>
        ) : null}
        {tab.isSuspended && (
          <span className="p-0.5 text-indigo-500/70 dark:text-indigo-300/70 shrink-0" title="Sleeping Tab">
            <Moon className="w-3 h-3" />
          </span>
        )}
        {tabsLength > 1 && !tab.isPinned && (
          <button 
            onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id, e); }} 
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/15 text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
});

export const SidebarTabs: React.FC<SidebarTabsProps> = React.memo(({
  tabs,
  folders,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onToggleMuteTab,
  onDuplicateTab,
  onTogglePinTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onNewTabRight,
  onReopenClosedTab,
  canReopenClosedTab = false,
  onToggleBookmark,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  isIncognito,
  onCreateFolder,
  onToggleFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveTabToFolder,
  onOpenSpotlight,
  onTabDragStart,
  onTabDragEnd,
  splitTabId,
  onCloseSplit,
  onNavigate,
  onGoBack,
  onGoForward,
  onReload,
  canGoBack = false,
  canGoForward = false,
  isLoading = false,
  searchEngine = 'google',
  privacyShield = true,
  onOpenDownloads,
  onOpenHistory,
  onOpenSettings,
  onOpenHelp,
  onOpenExtensions,
  bookmarks = [],
  onToggleCollapse,
  isCollapsed = false,
  onReorderTabs
}) => {
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null);
  const [hoverPos, setHoverPos] = useState({ top: 0, left: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  const [tabContextMenu, setTabContextMenu] = useState<TabContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    tab: null,
    tabIndex: -1
  });

  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isLibraryDropdownOpen, setIsLibraryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const libraryRef = useRef<HTMLDivElement>(null);

  // Omnibox state
  const [searchValue, setSearchValue] = useState('');
  const [isOmniboxFocused, setIsOmniboxFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const omniboxInputRef = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Top Favorites state
  const [favorites, setFavorites] = useState<FavoriteApp[]>(() => {
    try {
      const saved = localStorage.getItem('nova_top_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_FAVORITE_APPS;
  });

  const [isAddFavOpen, setIsAddFavOpen] = useState(false);
  const [newFavName, setNewFavName] = useState('');
  const [newFavUrl, setNewFavUrl] = useState('');

  const saveFavorites = (newFavs: FavoriteApp[]) => {
    setFavorites(newFavs);
    try {
      localStorage.setItem('nova_top_favorites', JSON.stringify(newFavs));
    } catch (_) {}
  };

  const handleAddFavorite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFavName.trim() || !newFavUrl.trim()) return;

    let finalUrl = newFavUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    let iconType: FavoriteApp['iconType'] = 'custom';
    if (finalUrl.includes('youtube.com')) iconType = 'youtube';
    else if (finalUrl.includes('github.com')) iconType = 'github';
    else if (finalUrl.includes('x.com') || finalUrl.includes('twitter.com')) iconType = 'x';
    else if (finalUrl.includes('chatgpt.com') || finalUrl.includes('openai.com')) iconType = 'chatgpt';
    else if (finalUrl.includes('google.com')) iconType = 'google';

    const newFav: FavoriteApp = {
      id: 'fav_' + Date.now(),
      name: newFavName.trim(),
      url: finalUrl,
      iconType,
      iconBg: '#1e293b'
    };

    saveFavorites([...favorites, newFav]);
    setNewFavName('');
    setNewFavUrl('');
    setIsAddFavOpen(false);
  };

  const handleRemoveFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveFavorites(favorites.filter(f => f.id !== id));
  };

  // Sync active tab URL into omnibox when not focused
  useEffect(() => {
    if (!isOmniboxFocused) {
      const url = activeTab?.url || '';
      if (url === 'nova://newtab' || url === 'about:blank' || url === 'https://newtab') {
        setSearchValue('');
      } else {
        setSearchValue(url);
      }
    }
  }, [activeTab?.url, isOmniboxFocused]);

  // Fetch suggestions
  useEffect(() => {
    if (!isOmniboxFocused || !searchValue.trim() || searchValue.includes('://')) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const clientLocale = typeof navigator !== 'undefined' ? navigator.language : 'tr-TR';
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getSuggestions) {
          const results = await (window as any).electronAPI.getSuggestions(searchValue, searchEngine, clientLocale);
          if (Array.isArray(results)) {
            setSuggestions(results.slice(0, 5));
            return;
          }
        }
        const lang = clientLocale.split('-')[0] || 'tr';
        const country = clientLocale.split('-')[1] || (lang === 'tr' ? 'TR' : 'US');
        const res = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(searchValue)}&hl=${lang}&gl=${country}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data) && Array.isArray(data[1])) {
            setSuggestions(data[1].slice(0, 5));
          }
        }
      } catch (_) {}
    }, 150);

    return () => clearTimeout(timer);
  }, [searchValue, isOmniboxFocused, searchEngine]);

  // Handle Omnibox Submit
  const handleOmniboxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    let targetValue = searchValue.trim();
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      targetValue = suggestions[selectedIndex];
    }

    const formattedUrl = formatSearchUrl(targetValue, searchEngine);
    if (onNavigate) {
      onNavigate(formattedUrl);
    } else {
      onNewTab(formattedUrl);
    }

    setShowSuggestions(false);
    setIsOmniboxFocused(false);
    omniboxInputRef.current?.blur();
  };

  const handleMouseEnter = (tab: Tab, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoverPos({ top: rect.top, left: rect.right + 10 });

    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTab(tab);
    }, 350);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredTab(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWorkspaceDropdownOpen(false);
      }
      if (libraryRef.current && !libraryRef.current.contains(event.target as Node)) {
        setIsLibraryDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOpenContextMenu = useCallback((tab: Tab, e: React.MouseEvent) => {
    setTabContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      tab,
      tabIndex: tabs.findIndex(t => t.id === tab.id)
    });
  }, [tabs]);

  const isCurrentNewTab = !activeTab?.url || activeTab.url === 'nova://newtab' || activeTab.url === 'about:blank' || activeTab.url === 'https://newtab';

  return (
    <>
      <div className="flex flex-col h-full w-[240px] overflow-hidden shrink-0 select-none text-slate-700 dark:text-slate-200 z-50 bg-slate-100/90 dark:bg-[#151122]/95 backdrop-blur-3xl border-r border-slate-200/80 dark:border-white/[0.06] font-sans">
        
        {/* 1. TOP CONTROL ROW: macOS Traffic Light Space + Sidebar Toggle + Back/Forward/Reload */}
        <div 
          className="h-10 pt-1 px-3 flex items-center justify-between drag-region shrink-0 select-none"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="flex items-center gap-1">
            <div 
              className="w-[72px] h-full shrink-0 drag-region" 
              style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} 
            />
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors no-drag cursor-pointer flex items-center justify-center"
                title={isCollapsed ? "Pin Sidebar (⌘S)" : "Hide Sidebar (⌘S)"}
              >
                {isCollapsed ? (
                  <Pin className="w-3.5 h-3.5 rotate-45 text-cyan-500 dark:text-cyan-400" />
                ) : (
                  <PanelLeft className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Navigation Controls in Arc style */}
          <div 
            className="flex items-center gap-0.5 no-drag"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={onGoBack}
              disabled={!canGoBack}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              className={`p-1.5 rounded-lg transition-colors no-drag cursor-pointer ${
                canGoBack ? 'hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white' : 'text-slate-400 dark:text-slate-600 cursor-default'
              }`}
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onGoForward}
              disabled={!canGoForward}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              className={`p-1.5 rounded-lg transition-colors no-drag cursor-pointer ${
                canGoForward ? 'hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white' : 'text-slate-400 dark:text-slate-600 cursor-default'
              }`}
              title="Forward"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onReload}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors no-drag cursor-pointer"
              title="Reload"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. INTEGRATED OMNIBOX / URL SEARCH PILL */}
        <div 
          className="px-3 pt-1 pb-2.5 no-drag relative"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <form onSubmit={handleOmniboxSubmit}>
            <div className={`relative flex items-center h-8 px-2.5 rounded-xl transition-colors duration-200 border ${
              isOmniboxFocused 
                ? 'bg-white border-cyan-500/50 shadow-md ring-1 ring-cyan-500/20 dark:bg-white/12 dark:border-white/20 dark:shadow-lg dark:ring-white/10' 
                : 'bg-white/80 hover:bg-white border-slate-300/80 dark:bg-white/6 dark:hover:bg-white/8 dark:border-white/[0.08]'
            }`}>
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2 opacity-70" />
              
              <input
                ref={omniboxInputRef}
                type="text"
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setShowSuggestions(true);
                  setSelectedIndex(-1);
                }}
                onFocus={() => {
                  setIsOmniboxFocused(true);
                  setShowSuggestions(true);
                  if (activeTab?.url && activeTab.url !== 'nova://newtab') {
                    setSearchValue(activeTab.url);
                  }
                }}
                onBlur={() => {
                  if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                  blurTimerRef.current = setTimeout(() => {
                    setIsOmniboxFocused(false);
                    setShowSuggestions(false);
                  }, 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    e.preventDefault();
                    setSearchValue(suggestions[selectedIndex]);
                    setSelectedIndex(-1);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, -1));
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false);
                    setSelectedIndex(-1);
                    if (activeTab?.url && activeTab.url !== 'nova://newtab') {
                      setSearchValue(activeTab.url);
                    }
                    omniboxInputRef.current?.blur();
                  }
                }}
                placeholder="Search or Enter URL..."
                className="w-full bg-transparent text-[12px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400/60 focus:outline-none tracking-tight"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
              />

              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                {privacyShield ? (
                  <span title="Privacy Shield Active" className="text-emerald-500 dark:text-emerald-400/90">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span title="Privacy Shield Disabled" className="text-slate-400 dark:text-slate-500">
                    <Shield className="w-3.5 h-3.5" />
                  </span>
                )}
                {onOpenExtensions && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenExtensions(); }}
                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                    title="Extensions"
                  >
                    <Puzzle className="w-3.5 h-3.5 opacity-70" />
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-11 left-3 right-3 bg-white dark:bg-[#1e1930]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1"
              >
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onMouseDown={() => {
                      const formatted = formatSearchUrl(s, searchEngine);
                      if (onNavigate) onNavigate(formatted);
                      else onNewTab(formatted);
                      setShowSuggestions(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                      idx === selectedIndex ? 'bg-slate-100 text-slate-900 font-medium dark:bg-white/15 dark:text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/8'
                    }`}
                  >
                    <Search className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. CUSTOMIZABLE TOP FAVORITES GRID (Arc 2-column or 4-column glass tiles) */}
        <div 
          className="px-3 pb-2.5 no-drag"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <div className="grid grid-cols-2 gap-1.5">
            {favorites.slice(0, 4).map((fav) => (
              <div key={fav.id} className="relative group/fav">
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate(fav.url);
                    else onNewTab(fav.url);
                  }}
                  className="w-full flex items-center justify-center h-9 rounded-xl bg-white/80 hover:bg-white border border-slate-200/90 hover:border-slate-300 dark:bg-white/6 dark:hover:bg-white/10 dark:border-white/[0.08] dark:hover:border-white/15 transition-colors duration-150 shadow-xs cursor-pointer"
                  title={`${fav.name} (${fav.url})`}
                >
                  <div className="w-4 h-4 flex items-center justify-center transition-transform duration-150 group-hover/fav:scale-110">
                    {renderFavoriteIcon(fav)}
                  </div>
                </button>

                {/* Delete Shortcut */}
                <button
                  onClick={(e) => handleRemoveFavorite(fav.id, e)}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-500 flex items-center justify-center opacity-0 group-hover/fav:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
                >
                  <X className="w-2 h-2" />
                </button>
              </div>
            ))}

            {/* Add Favorite Tile */}
            {favorites.length < 4 && (
              <button
                onClick={() => setIsAddFavOpen(true)}
                className="flex items-center justify-center h-9 rounded-xl bg-slate-200/40 hover:bg-slate-200/80 border border-dashed border-slate-300 dark:bg-white/3 dark:hover:bg-white/8 dark:border-white/15 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Add Favorite"
              >
                <Plus className="w-3.5 h-3.5 opacity-60" />
              </button>
            )}
          </div>
        </div>

        {/* Add Favorite Inline Form */}
        <AnimatePresence>
          {isAddFavOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="px-3 pb-2.5 no-drag"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <form onSubmit={handleAddFavorite} className="p-2 rounded-xl bg-white dark:bg-[#1e1930] border border-slate-200 dark:border-white/15 shadow-xl flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder="Name (e.g. Reddit)"
                  value={newFavName}
                  onChange={(e) => setNewFavName(e.target.value)}
                  className="w-full h-6 px-2 bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10 rounded-md text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="URL (e.g. reddit.com)"
                  value={newFavUrl}
                  onChange={(e) => setNewFavUrl(e.target.value)}
                  className="w-full h-6 px-2 bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10 rounded-md text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
                <div className="flex items-center justify-end gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsAddFavOpen(false)}
                    className="px-2 py-0.5 text-[10px] text-slate-500 dark:text-slate-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-0.5 text-[10px] bg-cyan-600 rounded-md text-white font-medium hover:bg-cyan-500 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. ACTIVE SPACE / PROFILE HEADER (Zero Emoji, Clean Lucide Orbit) */}
        <div 
          className="px-3 pb-2 no-drag relative" 
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          ref={dropdownRef}
        >
          <button
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/6 transition-colors text-left group cursor-pointer"
          >
            <Orbit className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate flex-1 tracking-tight">
              {activeWorkspace?.name || 'Personal'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 opacity-60 group-hover:opacity-100 ${
              isWorkspaceDropdownOpen ? 'rotate-180' : ''
            }`} />
          </button>

          {/* Workspace Dropdown */}
          <AnimatePresence>
            {isWorkspaceDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute top-9 left-3 right-3 bg-white dark:bg-[#1e1930]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1"
              >
                <div className="max-h-48 overflow-y-auto no-scrollbar py-1">
                  {workspaces.map(w => (
                    <button
                      key={w.id}
                      onClick={() => {
                        onSelectWorkspace(w.id);
                        setIsWorkspaceDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <div className="w-4 h-4 rounded-md flex items-center justify-center text-[10px] text-white font-bold"
                           style={{ backgroundColor: WORKSPACE_COLORS[w.color] || '#64748b' }}>
                        {w.name.charAt(0)}
                      </div>
                      <span className={`text-xs flex-1 truncate ${w.id === activeWorkspaceId ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                        {w.name}
                      </span>
                      {w.id === activeWorkspaceId && <Check className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 dark:border-white/10 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setIsWorkspaceDropdownOpen(false);
                      window.dispatchEvent(new CustomEvent('open-workspace-manager'));
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Manage Spaces
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 5. NEW TAB ACTION BUTTON */}
        <div 
          className="px-3 pb-1.5 no-drag"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={() => onNewTab()}
            className="w-full flex items-center gap-2 px-2.5 h-8.5 rounded-xl transition-colors text-left group cursor-pointer hover:bg-slate-200/60 text-slate-600 hover:text-slate-900 dark:hover:bg-white/6 dark:text-slate-300/80 dark:hover:text-white"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
            <span className="text-[13px] tracking-tight flex-1">New Tab</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">⌘T</span>
          </motion.button>
        </div>

        {/* 6. TAB & FOLDER LIST (Only renders visited/open web pages, NO duplicate '+ New Tab'!) */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-1 no-scrollbar flex flex-col gap-0.5 no-drag"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const tabId = e.dataTransfer.getData('text/plain');
            if (tabId && (e.target as HTMLElement).tagName === 'DIV' && (e.target === e.currentTarget)) {
              onMoveTabToFolder?.(tabId, undefined);
            }
          }}
        >
          <AnimatePresence>
            {/* Folders */}
            {folders?.filter(f => f.workspaceId === activeWorkspaceId).map(folder => {
              const folderTabs = tabs.filter(t => t.folderId === folder.id);
              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  key={folder.id}
                  className="flex flex-col gap-0.5"
                >
                  <div
                    onClick={() => onToggleFolder?.(folder.id)}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-slate-200/60', 'dark:bg-white/10'); }}
                    onDragLeave={(e) => e.currentTarget.classList.remove('bg-slate-200/60', 'dark:bg-white/10')}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-slate-200/60', 'dark:bg-white/10');
                      const tabId = e.dataTransfer.getData('text/plain');
                      if (tabId) onMoveTabToFolder?.(tabId, folder.id);
                    }}
                    className="flex items-center gap-2 h-8 px-2 rounded-lg cursor-pointer text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-white/6 transition-colors group/folder"
                  >
                    <div className="w-4 h-4 flex items-center justify-center shrink-0 opacity-60">
                      {folder.isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                    <FolderIcon className="w-3.5 h-3.5 opacity-70 group-hover/folder:opacity-100 transition-opacity" />
                    <span className="text-xs font-semibold flex-1 truncate">{folder.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteFolder?.(folder.id); }}
                      className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 opacity-0 group-hover/folder:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <AnimatePresence>
                    {folder.isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative"
                      >
                        <div className="flex flex-col gap-0.5 pb-1">
                          {folderTabs.map(tab => {
                            if (tab.id === splitTabId && splitTabId && activeTabId) return null;
                            return (
                              <SidebarTabItem
                                key={tab.id}
                                tab={tab}
                                isActive={tab.id === activeTabId}
                                isDragOver={dragOverTabId === tab.id}
                                isNested={true}
                                tabsLength={tabs.length}
                                onSelectTab={onSelectTab}
                                onCloseTab={onCloseTab}
                                onToggleMuteTab={onToggleMuteTab}
                                onTabDragStart={onTabDragStart}
                                onTabDragEnd={onTabDragEnd}
                                onReorderTabs={onReorderTabs}
                                onOpenContextMenu={handleOpenContextMenu}
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                                setDragOverTabId={setDragOverTabId}
                              />
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Root Tabs */}
            {tabs.filter(t => !t.folderId).map(tab => {
              if (tab.id === splitTabId && splitTabId && activeTabId) return null;
              return (
                <SidebarTabItem
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTabId}
                  isDragOver={dragOverTabId === tab.id}
                  isNested={false}
                  tabsLength={tabs.length}
                  onSelectTab={onSelectTab}
                  onCloseTab={onCloseTab}
                  onToggleMuteTab={onToggleMuteTab}
                  onTabDragStart={onTabDragStart}
                  onTabDragEnd={onTabDragEnd}
                  onReorderTabs={onReorderTabs}
                  onOpenContextMenu={handleOpenContextMenu}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  setDragOverTabId={setDragOverTabId}
                />
              );
            })}
          </AnimatePresence>
        </div>

        {/* 7. BOTTOM DOCK FOOTER */}
        <div 
          className="h-11 px-3.5 pb-2 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between no-drag mt-auto relative" 
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          ref={libraryRef}
        >
          <button
            onClick={() => setIsLibraryDropdownOpen(!isLibraryDropdownOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            title="Library"
          >
            <Package className="w-4 h-4" />
          </button>

          {/* Library Dropdown */}
          <AnimatePresence>
            {isLibraryDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-12 left-3 bg-white dark:bg-[#1e1930]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1 w-44"
              >
                {onOpenDownloads && (
                  <button
                    onClick={() => { onOpenDownloads(); setIsLibraryDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    Downloads
                  </button>
                )}
                {onOpenHistory && (
                  <button
                    onClick={() => { onOpenHistory(); setIsLibraryDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    History
                  </button>
                )}
                {onOpenSettings && (
                  <button
                    onClick={() => { onOpenSettings(); setIsLibraryDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                    Settings
                  </button>
                )}
                {onOpenHelp && (
                  <button
                    onClick={() => { onOpenHelp(); setIsLibraryDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                    Help & Support
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-1">
            {onCreateFolder && (
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={onCreateFolder}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                title="New Folder"
              >
                <FolderPlus className="w-4 h-4" />
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onNewTab()}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              title="New Tab"
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

      </div>

      {/* Tab Peek Portal */}
      <TabPeekPortal tab={hoveredTab} pos={hoverPos} />

      {/* Chrome-Style Tab Context Menu */}
      <TabContextMenu
        menuState={tabContextMenu}
        onClose={() => setTabContextMenu(prev => ({ ...prev, isOpen: false, tab: null }))}
        onNewTabRight={(idx) => {
          if (onNewTabRight) onNewTabRight(idx);
          else onNewTab();
        }}
        onReloadTab={(tabId) => {
          if (tabId === activeTabId && onReload) onReload();
        }}
        onDuplicateTab={(tabId) => {
          if (onDuplicateTab) onDuplicateTab(tabId);
        }}
        onTogglePinTab={(tabId) => {
          if (onTogglePinTab) onTogglePinTab(tabId);
        }}
        onToggleMuteTab={(tabId) => {
          onToggleMuteTab(tabId, { stopPropagation: () => {} } as any);
        }}
        onBookmarkTab={(targetTab) => {
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
    </>
  );
});
