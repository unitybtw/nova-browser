import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  LayoutGrid, 
  Briefcase, 
  User, 
  Code, 
  Sparkles, 
  Gamepad2, 
  GraduationCap, 
  DollarSign, 
  ShoppingCart, 
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
  PanelLeft,
  Package,
  Layers,
  Star,
  ExternalLink
} from 'lucide-react';
import { Tab, Workspace, Folder, Bookmark } from '../types/browser';
import { UserSettings } from '../App';
import { formatSearchUrl } from '../utils/searchEngine';

const WORKSPACE_COLORS: Record<string, string> = {
  slate: '#64748b',
  blue: '#3b82f6',
  emerald: '#10b981',
  purple: '#a855f7',
  rose: '#f43f5e',
  amber: '#f59e0b'
};

const WORKSPACE_ICONS: Record<string, React.ElementType> = {
  LayoutGrid, Briefcase, User, Code, Sparkles, Gamepad2, GraduationCap, DollarSign, ShoppingCart, Folder: FolderIcon
};

// Default Top Favorites (Arc style pinned app tiles)
interface FavoriteApp {
  id: string;
  name: string;
  url: string;
  iconBg: string;
  iconSvg: React.ReactNode;
}

const DEFAULT_FAVORITES: FavoriteApp[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://youtube.com',
    iconBg: '#ef4444',
    iconSvg: (
      <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    )
  },
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com',
    iconBg: '#24292f',
    iconSvg: (
      <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    )
  }
];

export interface SidebarTabsProps {
  tabs: Tab[];
  folders?: Folder[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e?: React.MouseEvent) => void;
  onNewTab: (url?: string) => void;
  onToggleMuteTab: (id: string, e: React.MouseEvent) => void;
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
  // Navigation & Omnibox controls
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
  onOpenExtensions?: () => void;
  bookmarks?: Bookmark[];
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
          className="pointer-events-none bg-slate-900 text-white"
          style={{
            position: 'fixed',
            top: Math.min(pos.top, window.innerHeight - 220),
            left: pos.left,
            zIndex: 99999,
            width: 272,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="px-3 py-2 border-b border-white/10 bg-white/5">
            <div className="text-xs font-semibold text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis">
              {tab.favicon && <img src={tab.favicon} alt="" style={{ width: 12, height: 12, marginRight: 6, display: 'inline', verticalAlign: 'middle', borderRadius: 2 }} />}
              {tab.title || tab.url || 'New Tab'}
            </div>
          </div>
          <div className="bg-slate-950 overflow-hidden" style={{ aspectRatio: '16/9' }}>
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

export const SidebarTabs: React.FC<SidebarTabsProps> = React.memo(({
  tabs,
  folders,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onToggleMuteTab,
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
  onOpenExtensions,
  bookmarks = []
}) => {
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null);
  const [hoverPos, setHoverPos] = useState({ top: 0, left: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getSuggestions) {
          const results = await (window as any).electronAPI.getSuggestions(searchValue);
          if (Array.isArray(results)) {
            setSuggestions(results.slice(0, 5));
            return;
          }
        }
        const res = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(searchValue)}&type=list`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data) && data[1]) {
            setSuggestions(data[1].slice(0, 5));
          }
        }
      } catch (_) {}
    }, 150);

    return () => clearTimeout(timer);
  }, [searchValue, isOmniboxFocused]);

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
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const renderTab = (tab: Tab, isNested: boolean = false) => {
    const isActive = tab.id === activeTabId;
    const isSplitChild = tab.id === splitTabId;

    if (isSplitChild && splitTabId && activeTabId) {
      return null;
    }

    return (
      <motion.div
        draggable
        onDragStart={(e: any) => {
          e.dataTransfer.setData('text/plain', tab.id);
          onTabDragStart?.();
        }}
        onDragEnd={() => {
          setHoverPos({ top: 0, left: 0 });
          onTabDragEnd?.();
        }}
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        key={tab.id}
        onClick={() => onSelectTab(tab.id)}
        onMouseEnter={(e) => handleMouseEnter(tab, e)}
        onMouseLeave={handleMouseLeave}
        className={`relative flex items-center h-9 px-2.5 rounded-xl cursor-pointer transition-all duration-150 group/tab select-none ${
          isNested ? 'ml-4 w-[calc(100%-16px)]' : 'w-full'
        } ${
          isActive
            ? 'bg-white/12 text-white shadow-sm font-medium border border-white/10'
            : 'text-slate-300/80 hover:bg-white/6 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-4 h-4 flex items-center justify-center shrink-0">
            {tab.isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-300/40 border-t-white rounded-full animate-spin" />
            ) : tab.favicon ? (
              <img src={tab.favicon} alt="" className="w-3.5 h-3.5 rounded-sm object-contain" />
            ) : tab.url === 'nova://settings' ? (
              <Settings className="w-3.5 h-3.5 opacity-70" />
            ) : tab.url === 'nova://history' ? (
              <Clock className="w-3.5 h-3.5 opacity-70" />
            ) : tab.url === 'nova://downloads' ? (
              <Download className="w-3.5 h-3.5 opacity-70" />
            ) : (tab.url === 'nova://newtab' || tab.url === 'about:blank' || tab.url === 'https://newtab') ? (
              tab.isIncognito ? <VenetianMask className="w-3.5 h-3.5 opacity-70" /> : <Plus className="w-3.5 h-3.5 opacity-70" />
            ) : (
              <Globe className="w-3.5 h-3.5 opacity-70" />
            )}
          </div>
          <span className="truncate text-[13px] tracking-tight">
            {tab.title || (tab.url === 'nova://newtab' ? 'New Tab' : tab.url) || 'New Tab'}
          </span>
        </div>

        <div className={`flex items-center gap-1 transition-all duration-150 shrink-0 ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-100'
        }`}>
          {tab.isMuted ? (
            <button onClick={(e) => onToggleMuteTab(tab.id, e)} className="p-1 rounded-md hover:bg-white/10 text-red-400">
              <VolumeX className="w-3 h-3" />
            </button>
          ) : tab.isPlayingAudio ? (
            <button onClick={(e) => onToggleMuteTab(tab.id, e)} className="p-1 rounded-md hover:bg-white/10 text-cyan-400">
              <Volume2 className="w-3 h-3 animate-pulse" />
            </button>
          ) : null}
          {tab.isSuspended && (
            <span className="p-0.5 text-indigo-300/70 shrink-0" title="Sleeping Tab">
              <Moon className="w-3 h-3" />
            </span>
          )}
          {tabs.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id, e); }} 
              className="p-1 rounded-md hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full w-[250px] overflow-hidden shrink-0 select-none text-slate-200 z-50 bg-[#161224]/85 backdrop-blur-3xl border-r border-white/[0.07] font-sans">
        
        {/* 1. TOP CONTROL ROW: macOS Traffic Light Space + Sidebar Toggle + Back/Forward/Reload */}
        <div className="h-10 pt-2 px-3 flex items-center justify-between drag-region shrink-0">
          {/* Left: Space reserved for native macOS window traffic lights (red, yellow, green) */}
          <div className="w-[70px] h-full shrink-0" />

          {/* Right: Navigation Controls (Back, Forward, Reload) in clean Arc style */}
          <div className="flex items-center gap-1 no-drag">
            <button
              onClick={onGoBack}
              disabled={!canGoBack}
              className={`p-1.5 rounded-lg transition-colors ${
                canGoBack ? 'hover:bg-white/10 text-slate-300 hover:text-white' : 'text-slate-600 cursor-default'
              }`}
              title="Back (⌘[)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onGoForward}
              disabled={!canGoForward}
              className={`p-1.5 rounded-lg transition-colors ${
                canGoForward ? 'hover:bg-white/10 text-slate-300 hover:text-white' : 'text-slate-600 cursor-default'
              }`}
              title="Forward (⌘])"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onReload}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Reload (⌘R)"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. INTEGRATED ARC OMNIBOX / URL SEARCH PILL */}
        <div className="px-3 pt-2 pb-2.5 no-drag relative">
          <form onSubmit={handleOmniboxSubmit}>
            <div className={`relative flex items-center h-8.5 px-2.5 rounded-xl transition-all duration-200 border ${
              isOmniboxFocused 
                ? 'bg-white/12 border-white/20 shadow-lg ring-1 ring-white/10' 
                : 'bg-white/6 hover:bg-white/8 border-white/[0.08]'
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
                  setTimeout(() => {
                    setIsOmniboxFocused(false);
                    setShowSuggestions(false);
                  }, 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, -1));
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false);
                    omniboxInputRef.current?.blur();
                  }
                }}
                placeholder="Search or Enter URL..."
                className="w-full bg-transparent text-[12.5px] text-white placeholder-slate-400/60 focus:outline-none tracking-tight"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
              />

              {/* Security Shield & Extensions Badges */}
              <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                {privacyShield ? (
                  <span title="Privacy Shield Active" className="text-emerald-400/90">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span title="Privacy Shield Disabled" className="text-slate-500">
                    <Shield className="w-3.5 h-3.5" />
                  </span>
                )}
                {onOpenExtensions && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenExtensions(); }}
                    className="text-slate-400 hover:text-white transition-colors"
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
                className="absolute top-12 left-3 right-3 bg-[#1e1930]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1"
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
                      idx === selectedIndex ? 'bg-white/15 text-white font-medium' : 'text-slate-300 hover:bg-white/8'
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

        {/* 3. PINNED FAVORITES GRID (YouTube, GitHub, etc. Arc style tiles) */}
        <div className="px-3 pb-3 grid grid-cols-2 gap-2 no-drag">
          {DEFAULT_FAVORITES.map((fav) => (
            <button
              key={fav.id}
              onClick={() => {
                if (onNavigate) onNavigate(fav.url);
                else onNewTab(fav.url);
              }}
              className="flex items-center justify-center h-10 rounded-xl bg-white/6 hover:bg-white/10 border border-white/[0.08] hover:border-white/15 transition-all duration-150 group shadow-sm"
              title={fav.name}
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center transition-transform duration-150 group-hover:scale-110">
                {fav.iconSvg}
              </div>
            </button>
          ))}
        </div>

        {/* 4. ACTIVE SPACE / PROFILE HEADER (e.g. 🪐 siraç göktuğ) */}
        <div className="px-3 pb-2 no-drag relative" ref={dropdownRef}>
          <button
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/6 transition-colors text-left group"
          >
            <span className="text-sm shrink-0">🪐</span>
            <span className="text-[13px] font-semibold text-slate-200 truncate flex-1 tracking-tight">
              {activeWorkspace?.name || 'siraç göktuğ'}
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
                className="absolute top-10 left-3 right-3 bg-[#1e1930]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1"
              >
                <div className="max-h-48 overflow-y-auto no-scrollbar py-1">
                  {workspaces.map(w => (
                    <button
                      key={w.id}
                      onClick={() => {
                        onSelectWorkspace(w.id);
                        setIsWorkspaceDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 transition-colors text-left"
                    >
                      <div className="w-4 h-4 rounded-md flex items-center justify-center text-[10px] text-white font-bold"
                           style={{ backgroundColor: WORKSPACE_COLORS[w.color] || '#64748b' }}>
                        {w.name.charAt(0)}
                      </div>
                      <span className={`text-xs flex-1 truncate ${w.id === activeWorkspaceId ? 'font-semibold text-white' : 'text-slate-300'}`}>
                        {w.name}
                      </span>
                      {w.id === activeWorkspaceId && <Check className="w-3 h-3 text-cyan-400" />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/10 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setIsWorkspaceDropdownOpen(false);
                      window.dispatchEvent(new CustomEvent('open-workspace-manager'));
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Manage Spaces
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 5. NEW TAB BUTTON */}
        <div className="px-3 pb-2 no-drag">
          <button
            onClick={() => onOpenSpotlight ? onOpenSpotlight() : onNewTab()}
            className="w-full flex items-center gap-2 px-2.5 h-8.5 rounded-xl hover:bg-white/6 text-slate-300/80 hover:text-white transition-all text-left group"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
            <span className="text-[13px] font-medium tracking-tight">New Tab</span>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">⌘T</span>
          </button>
        </div>

        {/* 6. TAB & FOLDER LIST */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-1 no-scrollbar flex flex-col gap-0.5 no-drag"
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
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-white/10'); }}
                    onDragLeave={(e) => e.currentTarget.classList.remove('bg-white/10')}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-white/10');
                      const tabId = e.dataTransfer.getData('text/plain');
                      if (tabId) onMoveTabToFolder?.(tabId, folder.id);
                    }}
                    className="flex items-center gap-2 h-8 px-2 rounded-lg cursor-pointer text-slate-300 hover:bg-white/6 transition-all group/folder"
                  >
                    <div className="w-4 h-4 flex items-center justify-center shrink-0 opacity-60">
                      {folder.isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                    <FolderIcon className="w-3.5 h-3.5 opacity-70 group-hover/folder:opacity-100 transition-opacity" />
                    <span className="text-xs font-semibold flex-1 truncate">{folder.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteFolder?.(folder.id); }}
                      className="p-1 rounded-md hover:bg-white/10 opacity-0 group-hover/folder:opacity-100 transition-opacity text-slate-400 hover:text-red-400"
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
                          {folderTabs.map(tab => renderTab(tab, true))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Root Tabs */}
            {tabs.filter(t => !t.folderId).map(tab => renderTab(tab, false))}
          </AnimatePresence>
        </div>

        {/* 7. BOTTOM DOCK FOOTER: Library / Drawer Box & Action Plus Button */}
        <div className="p-3 pt-2 border-t border-white/[0.07] flex items-center justify-between no-drag mt-auto relative" ref={libraryRef}>
          {/* Library Drawer Icon */}
          <button
            onClick={() => setIsLibraryDropdownOpen(!isLibraryDropdownOpen)}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Library (Downloads, History, Settings)"
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
                className="absolute bottom-12 left-3 bg-[#1e1930]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1 w-44"
              >
                {onOpenDownloads && (
                  <button
                    onClick={() => { onOpenDownloads(); setIsLibraryDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors text-left"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    Downloads
                  </button>
                )}
                {onOpenHistory && (
                  <button
                    onClick={() => { onOpenHistory(); setIsLibraryDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors text-left"
                  >
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    History
                  </button>
                )}
                {onOpenSettings && (
                  <button
                    onClick={() => { onOpenSettings(); setIsLibraryDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors text-left"
                  >
                    <Settings className="w-3.5 h-3.5 text-purple-400" />
                    Settings
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Plus Button */}
          <div className="flex items-center gap-1">
            {onCreateFolder && (
              <button
                onClick={onCreateFolder}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="New Folder"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onNewTab()}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="New Tab"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Tab Peek Portal */}
      <TabPeekPortal tab={hoveredTab} pos={hoverPos} />
    </>
  );
});
