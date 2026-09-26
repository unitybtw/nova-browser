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
import { Tab, Bookmark, Workspace, PermissionRequest, Extension, UserSettings, DownloadItem } from '../types/browser';
import { formatSearchUrl, getSearchEngineName, isValidUrlOrDomain } from '../utils/searchEngine';
import { getLanguage } from '../services/i18n';
import { getUrlSecurityInfo } from '../utils/securityUtils';
import { AdBlockerPopover } from './AdBlockerPopover';
import { NovaAISparkle } from './ui/NovaAISparkle';
import { PermissionPromptPopover } from './PermissionPromptPopover';
import { logger } from '../utils/logger';
import { PageTranslatePopover } from './PageTranslatePopover';
import { syncService, SyncStatus } from '../services/syncService';
import { getClientCachedSuggestions, setClientCachedSuggestions } from '../utils/suggestionCache';
import { TabHoverPreview } from './TabHoverPreview';
import { getLocale } from '../services/i18n';
import { getElectronAPI } from '../utils/electronBridge';
import { OmniboxBar } from './topbar/OmniboxBar';
export { OmniboxBar };

/** Stable identity handed to the downloads popover while it is closed. */
const EMPTY_DOWNLOADS: DownloadItem[] = [];

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
  tabAnimation?: 'chrome' | 'smooth' | 'snappy' | 'none';
  isIncognito?: boolean;
  searchEngine: UserSettings['searchEngine'];
  onToggleBookmark: (targetTab?: Tab) => void;
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
  onCloseTabsToRight?: (target: number | string) => void;
  onNewTabRight?: (target: number | string) => void;
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
  onExitIncognito?: () => void;
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
  isAIAssistantOpen?: boolean;
  activeDownloadsCount?: number;
  downloads?: DownloadItem[];
  onClearDownloads?: () => void;
  showBookmarksBar?: boolean;
  onToggleReaderMode?: () => void;
  onOpenExtensions: () => void;
  extensions?: Extension[];
  activeTab?: Tab | null;
  onOpenAccount?: () => void;
  onTabDragStart?: () => void;
  onTabDragEnd?: () => void;
  onTabDrag?: (y: number, x?: number) => void;
  onDropToSplitScreen?: (tabId: string, side?: 'left' | 'right') => void;
  splitTabId?: string | null;
  onCloseSplit?: (tab1Id?: string, tab2Id?: string) => void;
  permissionRequests?: PermissionRequest[];
  onRespondPermission?: (requestId: string, allow: boolean, remember: boolean) => void;
  onDismissPermission?: (requestId: string) => void;
}

const MemoizedTabItem = React.memo(({ 
  tab, activeTabId, index, isActive, isSplitChild, splitTab, tabStyle, tabAnimation, isIncognito,
  wasJustUnsplit,
  onTabDragStart, onTabDrag, onTabDragEnd, onDropToSplitScreen,
  onSelectTab, onCloseSplit, onToggleMuteTab, onTogglePip, onCloseTab,
  tabsLength, onUpdateGhost, onOpenContextMenu, onTabHover, onTabLeave
}: any) => {
  if (isSplitChild) return null;

  const isPinned = !!tab.isPinned;
  const unpinnedCount = Math.max(1, tabsLength - (isPinned ? 1 : 0));
  const baseWidth = Math.min(220, Math.max(90, Math.floor(1000 / unpinnedCount)));
  const targetWidth = isPinned ? 38 : splitTab ? Math.min(360, baseWidth * 2) : baseWidth;
  const targetPadding = isPinned ? 6 : splitTab ? 6 : 10;
  const animPreset = tabAnimation || 'chrome';

  const animationConfig = useMemo(() => {
    switch (animPreset) {
      case 'smooth':
        return {
          initial: {
            opacity: 0,
            y: 4,
            scale: 0.96,
            width: 0,
            paddingLeft: 0,
            paddingRight: 0,
            marginRight: -4
          },
          animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            width: targetWidth,
            paddingLeft: targetPadding,
            paddingRight: targetPadding,
            marginRight: 0
          },
          exit: splitTab ? {
            opacity: 0,
            transition: { duration: 0 }
          } : {
            opacity: 0,
            y: 4,
            scale: 0.96,
            width: 0,
            paddingLeft: 0,
            paddingRight: 0,
            marginRight: -4,
            transition: {
              opacity: { duration: 0.08, ease: 'easeOut' },
              y: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
              scale: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
              width: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const },
              paddingLeft: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const },
              paddingRight: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const },
              marginRight: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const }
            }
          },
          transition: {
            duration: 0.20,
            ease: [0.16, 1, 0.3, 1] as const,
            layout: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const }
          }
        };
      case 'snappy':
        return {
          initial: {
            opacity: 0,
            y: 2,
            scale: 0.98,
            width: 0,
            paddingLeft: 0,
            paddingRight: 0,
            marginRight: -4
          },
          animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            width: targetWidth,
            paddingLeft: targetPadding,
            paddingRight: targetPadding,
            marginRight: 0
          },
          exit: splitTab ? {
            opacity: 0,
            transition: { duration: 0 }
          } : {
            opacity: 0,
            scale: 0.98,
            width: 0,
            paddingLeft: 0,
            paddingRight: 0,
            marginRight: -4,
            transition: {
              opacity: { duration: 0.06, ease: 'easeOut' },
              scale: { duration: 0.12, ease: [0.2, 0, 0, 1] as const },
              width: { duration: 0.14, ease: [0.2, 0, 0, 1] as const },
              paddingLeft: { duration: 0.14, ease: [0.2, 0, 0, 1] as const },
              paddingRight: { duration: 0.14, ease: [0.2, 0, 0, 1] as const },
              marginRight: { duration: 0.14, ease: [0.2, 0, 0, 1] as const }
            }
          },
          transition: {
            duration: 0.14,
            ease: [0.2, 0, 0, 1] as const,
            layout: { duration: 0.14, ease: [0.2, 0, 0, 1] as const }
          }
        };
      case 'none':
        return {
          initial: { opacity: 1, width: targetWidth, paddingLeft: targetPadding, paddingRight: targetPadding, scale: 1, y: 0, marginRight: 0 },
          animate: { opacity: 1, width: targetWidth, paddingLeft: targetPadding, paddingRight: targetPadding, scale: 1, y: 0, marginRight: 0 },
          exit: { opacity: 0, transition: { duration: 0 } },
          transition: { duration: 0 }
        };
      case 'chrome':
      default:
        return {
          initial: {
            opacity: 0,
            width: 0,
            paddingLeft: 0,
            paddingRight: 0,
            marginRight: -4,
            scale: 1,
            y: 0
          },
          animate: {
            opacity: 1,
            width: targetWidth,
            paddingLeft: targetPadding,
            paddingRight: targetPadding,
            marginRight: 0,
            scale: 1,
            y: 0
          },
          exit: splitTab ? {
            opacity: 0,
            transition: { duration: 0 }
          } : {
            opacity: 0,
            width: 0,
            paddingLeft: 0,
            paddingRight: 0,
            marginRight: -4,
            transition: {
              opacity: { duration: 0.08, ease: 'easeOut' },
              width: { duration: 0.18, ease: [0.2, 0, 0, 1] as const },
              paddingLeft: { duration: 0.18, ease: [0.2, 0, 0, 1] as const },
              paddingRight: { duration: 0.18, ease: [0.2, 0, 0, 1] as const },
              marginRight: { duration: 0.18, ease: [0.2, 0, 0, 1] as const }
            }
          },
          transition: {
            duration: 0.18,
            ease: [0.2, 0, 0, 1] as const,
            layout: { duration: 0.18, ease: [0.2, 0, 0, 1] as const }
          }
        };
    }
  }, [animPreset, targetWidth, targetPadding, tab.id, !!splitTab]);

  return (
    <Reorder.Item
      key={tab.id}
      value={tab}
      layout="position"
      drag={splitTab ? "x" : true}
      dragDirectionLock={!!splitTab}
      dragConstraints={splitTab ? { top: 0, bottom: 0 } : undefined}
      dragElastic={splitTab ? 0 : 0.2}
      initial={wasJustUnsplit ? false : animationConfig.initial}
      animate={animationConfig.animate}
      exit={animationConfig.exit}
      transition={animationConfig.transition}
      whileDrag={{ scale: 1.02, zIndex: 50, cursor: 'grabbing', opacity: 0.7 }}
      onDragStart={() => {
        onTabLeave?.();
        if (!splitTab) {
          onTabDragStart?.();
        }
      }}
      onDrag={(e, info) => {
        if (splitTab) return;
        onTabDrag?.(info.point.y, info.point.x);
        // Only show ghost indicator if dragged completely clear of the TopBar header (> 110px)
        if (info.point.y > 110) {
          onUpdateGhost?.(tab.title || 'Drop to Split Screen', info.point.x, info.point.y);
        } else {
          onUpdateGhost?.(null);
        }
      }}
      onDragEnd={(e, info) => {
        if (!splitTab) {
          onTabDragEnd?.();
        }
        onUpdateGhost?.(null);
        if (info.point.y > 110 && !splitTab) {
          const side = info.point.x < window.innerWidth / 2 ? 'left' : 'right';
          onDropToSplitScreen?.(tab.id, side);
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
      style={{
        flex: '0 0 auto',
        width: targetWidth,
        ...(isActive && !isIncognito 
          ? { backgroundColor: 'var(--nova-active-tab-bg)', borderColor: 'var(--nova-border-subtle)' } 
          : {})
      }}
      className={`group flex items-center justify-between ${
        isPinned ? 'justify-center' : ''
      } flex-none shrink-0 text-[13px] cursor-grab active:cursor-grabbing transition-colors no-drag relative overflow-hidden ${
        tabStyle === 'floating' ? 'h-[32px] mb-1 rounded-lg border mx-0.5' : 
        tabStyle === 'square' ? 'h-[34px] rounded-none border-t border-x' : 
        'h-[34px] rounded-t-xl border-t border-x'
      } ${
        isActive
          ? isIncognito
            ? 'bg-slate-800 text-slate-100 border-slate-700 font-medium shadow-xs border-t-2 border-t-blue-500 relative z-10'
            : 'bg-white text-slate-900 border-slate-300/80 font-medium shadow-xs border-t-2 border-t-blue-500 relative z-10 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
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
            <img src={tab.favicon} width={16} height={16} alt="" className="w-4 h-4 rounded-xs shrink-0" />
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
            role="button"
            tabIndex={0}
            className={`flex flex-1 items-center gap-1.5 px-2 min-w-0 h-[28px] rounded-md transition-colors cursor-pointer group/split-left relative ${
              activeTabId === tab.id
                ? 'bg-blue-500/15 text-blue-600 dark:text-cyan-300 font-semibold shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-normal'
            }`}
            onClick={(e) => { 
              e.stopPropagation(); 
              onTabLeave?.();
              onSelectTab(tab.id); 
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectTab(tab.id);
              }
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
              <img src={tab.favicon} width={14} height={14} alt="" className="w-3.5 h-3.5 rounded-sm shrink-0 object-contain" />
            ) : (
              <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />
            )}
            <span className="truncate text-[12px] flex-1">{tab.title || tab.url || 'New Tab'}</span>
            
            <button
              aria-label="Close Left Tab"
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
              aria-label="Separate Tabs"
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
            role="button"
            tabIndex={0}
            className={`flex flex-1 items-center gap-1.5 px-2 min-w-0 h-[28px] rounded-md transition-colors cursor-pointer group/split-right relative ${
              activeTabId === splitTab.id
                ? 'bg-blue-500/15 text-blue-600 dark:text-cyan-300 font-semibold shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-normal'
            }`}
            onClick={(e) => { 
              e.stopPropagation(); 
              onTabLeave?.();
              onSelectTab(splitTab.id); 
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectTab(splitTab.id);
              }
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
              <img src={splitTab.favicon} width={14} height={14} alt="" className="w-3.5 h-3.5 rounded-sm shrink-0 object-contain" />
            ) : (
              <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />
            )}
            <span className="truncate text-[12px] flex-1">{splitTab.title || splitTab.url || 'New Tab'}</span>
            
            <button 
              aria-label="Close Right Tab"
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
              <img src={tab.favicon} width={14} height={14} alt="" className="w-3.5 h-3.5 rounded-sm shrink-0" />
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
                className={`w-5 h-5 flex items-center justify-center rounded-full transition-all duration-150 shrink-0 cursor-pointer hover:scale-110 active:scale-95 ${
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
        <div 
          style={!isIncognito ? { backgroundColor: 'var(--nova-active-tab-bg)' } : undefined}
          className={`absolute -bottom-px left-0 right-0 h-px z-20 ${isIncognito ? 'bg-slate-800' : 'bg-white dark:bg-slate-800'}`} 
        />
      )}
    </Reorder.Item>
  );
}, (prevProps: any, nextProps: any) => {
  return (
    prevProps.index === nextProps.index &&
    prevProps.wasJustUnsplit === nextProps.wasJustUnsplit &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.activeTabId === nextProps.activeTabId &&
    prevProps.splitTab?.id === nextProps.splitTab?.id &&
    prevProps.splitTab?.title === nextProps.splitTab?.title &&
    prevProps.splitTab?.url === nextProps.splitTab?.url &&
    prevProps.splitTab?.favicon === nextProps.splitTab?.favicon &&
    prevProps.splitTab?.isLoading === nextProps.splitTab?.isLoading &&
    prevProps.splitTab?.isMuted === nextProps.splitTab?.isMuted &&
    prevProps.splitTab?.isPlayingAudio === nextProps.splitTab?.isPlayingAudio &&
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
    prevProps.tabStyle === nextProps.tabStyle &&
    prevProps.tabAnimation === nextProps.tabAnimation &&
    prevProps.isIncognito === nextProps.isIncognito &&
    prevProps.tab.isIncognito === nextProps.tab.isIncognito
  );
});

// OmniboxBar has been extracted to ./topbar/OmniboxBar.tsx for modularity and performance

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
  tabAnimation = 'chrome',
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
  onExitIncognito,
  onCloseTab,
  onNavigate,
  onGoBack,
  onGoForward,
  onReload,
  isVpnEnabled = false,
  onToggleVpn,
  onToggleAIAssistant,
  isAIAssistantOpen = false,
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

  const handleOpenContextMenu = useCallback((targetTab: Tab, index: number, e: React.MouseEvent) => {
    const wsId = targetTab.workspaceId || activeWorkspaceId || 'default';
    const wsTabs = tabs.filter(t => (t.workspaceId || 'default') === wsId);
    const wsIdx = wsTabs.findIndex(t => t.id === targetTab.id);
    setTabContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      tab: targetTab,
      tabIndex: wsIdx !== -1 ? wsIdx : index
    });
  }, [tabs, activeWorkspaceId]);
  const downloadsBtnRef = useRef<HTMLButtonElement>(null);
  const adBlockerBtnRef = useRef<HTMLButtonElement>(null);
  const [adblockWhitelist, setAdblockWhitelist] = useState<string[]>([]);
  const ghostElRef = useRef<HTMLDivElement>(null);
  const ghostTextRef = useRef<HTMLSpanElement>(null);

  const handleUpdateGhost = useCallback((title: string | null, x?: number, y?: number) => {
    if (!ghostElRef.current) return;
    if (title && x !== undefined && y !== undefined) {
      ghostElRef.current.style.display = 'block';
      ghostElRef.current.style.transform = `translate3d(${x - 100}px, ${y - 20}px, 0)`;
      if (ghostTextRef.current) {
        ghostTextRef.current.textContent = title;
      }
    } else {
      ghostElRef.current.style.display = 'none';
    }
  }, []);
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
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const prevTabsRef = useRef<Tab[]>(tabs);
  const justUnsplitTabIds = useMemo(() => {
    const prev = prevTabsRef.current;
    const currentIds = new Set(tabs.map(t => t.id));
    const set = new Set<string>();
    for (const cur of tabs) {
      if (!cur.splitWith) {
        const prevTab = prev.find(p => p.id === cur.id);
        if (prevTab && prevTab.splitWith && !currentIds.has(prevTab.splitWith)) {
          set.add(cur.id);
        }
      }
    }
    return set;
  }, [tabs]);

  useEffect(() => {
    prevTabsRef.current = tabs;
  }, [tabs]);

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
      if (el.scrollWidth <= el.clientWidth) {
        if (el.scrollLeft !== 0) el.scrollLeft = 0;
        setCanScrollLeft(false);
        setCanScrollRight(false);
        return;
      }
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
    const container = tabsContainerRef.current;
    if (!container) return;

    // When all tabs fit without overflow, strictly lock scroll to 0.
    // This physically prevents any rightward drift or phantom scroll offset.
    if (container.scrollWidth <= container.clientWidth) {
      if (container.scrollLeft !== 0) {
        container.scrollLeft = 0;
      }
      return;
    }

    const timer = setTimeout(() => {
      const currentContainer = tabsContainerRef.current;
      if (!currentContainer) return;
      const activeTabEl = currentContainer.querySelector(`[data-tab-id="${activeTabId}"]`) as HTMLElement | null;
      if (activeTabEl) {
        const tabLeft = activeTabEl.offsetLeft;
        const tabRight = tabLeft + activeTabEl.offsetWidth;
        const scrollLeft = currentContainer.scrollLeft;
        const containerWidth = currentContainer.clientWidth;

        if (tabLeft < scrollLeft) {
          currentContainer.scrollTo({ left: Math.max(0, tabLeft - 12), behavior: 'smooth' });
        } else if (tabRight > scrollLeft + containerWidth) {
          currentContainer.scrollTo({ left: Math.max(0, tabRight - containerWidth + 12), behavior: 'smooth' });
        }
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [activeTabId, tabs.length]);

  const handleWheel = (e: React.WheelEvent<any>) => {
    const container = tabsContainerRef.current;
    if (container) {
      if (container.scrollWidth <= container.clientWidth) return;
      // Trackpad sends native deltaX for horizontal scrolling. Adding deltaY on top
      // causes jarring jitter and scroll jumping. Only translate deltaY to horizontal
      // scrolling when there is zero horizontal delta (i.e. physical vertical mouse wheel).
      if (Math.abs(e.deltaX) === 0 && e.deltaY !== 0) {
        container.scrollLeft += e.deltaY;
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
        if (getElectronAPI()?.storeGet) {
          const val = await getElectronAPI()?.storeGet('adblocker_whitelist');
          if (val) {
            const parsed = JSON.parse(val);
            setAdblockWhitelist(Array.isArray(parsed) ? parsed : []);
          }
        }
      } catch (e) {
        logger.warn('TopBar:adblockWhitelist', 'Failed to fetch adblocker whitelist from store', e);
      }
    };
    fetchWhitelist();
  }, []);
  
  // Fetch MCP status on mount and listen for client changes
  useEffect(() => {
    const fetchMcp = async () => {
      if (getElectronAPI()?.getMcpStatus) {
        const s = await getElectronAPI()?.getMcpStatus();
        setMcpRunning(s?.running || false);
        setMcpClientCount(s?.clientCount || 0);
      }
    };
    fetchMcp();
    let cleanup: (() => void) | void;
    let cleanupStatus: (() => void) | void;
    if (getElectronAPI()?.onMcpClientChanged) {
      cleanup = getElectronAPI()?.onMcpClientChanged((_: any, data: any) => {
        setMcpClientCount(data.count);
      });
    }
    if (getElectronAPI()?.onMcpStatusChanged) {
      cleanupStatus = getElectronAPI()?.onMcpStatusChanged((_: any, isRunning: boolean) => {
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
        if (getElectronAPI()?.listExtensions) {
          const list = await getElectronAPI()?.listExtensions();
          setExtensions(list || []);
        }
      } catch (err) {
        logger.warn('TopBar:fetchExtensions', 'Failed to fetch extensions list', err);
      }
    };
    
    fetchExtensions();
    
    let cleanup: (() => void) | undefined;
    if (getElectronAPI()?.onExtensionChanged) {
      cleanup = getElectronAPI()?.onExtensionChanged(() => {
        fetchExtensions();
      });
    }
    
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
  const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('win');

  const activeWorkspace = workspaces?.find(w => w.id === activeWorkspaceId) || workspaces?.[0];

  const currentUrl = activeTab?.url || '';
  let currentHostname = '';
  try {
    if (currentUrl && !currentUrl.startsWith('nova://')) {
      const urlToParse = currentUrl.includes('://') ? currentUrl : `http://${currentUrl}`;
      currentHostname = new URL(urlToParse).hostname;
    }
  } catch (err) {
    logger.debug('TopBar:hostname', 'Failed to parse hostname from activeTab URL', err);
  }
  const isWhitelisted = Array.isArray(adblockWhitelist) && Boolean(currentHostname) && adblockWhitelist.includes(currentHostname);
  
  const handleToggleWhitelist = async () => {
    if (!currentHostname) return;
    const currentList = Array.isArray(adblockWhitelist) ? adblockWhitelist : [];
    const newWhitelist = isWhitelisted 
      ? currentList.filter(h => h !== currentHostname)
      : [...currentList, currentHostname];
    
    setAdblockWhitelist(newWhitelist);
    if (getElectronAPI()?.storeSet) {
      await getElectronAPI()?.storeSet('adblocker_whitelist', JSON.stringify(newWhitelist));
    }
    onReload();
  };

  return (
    <>
    <header 
      style={!isIncognito ? { backgroundColor: 'var(--nova-header-bg)', borderColor: 'var(--nova-border-subtle)' } : undefined}
      className={`w-full flex flex-col select-none drag-region border-b relative z-50 ${isIncognito ? 'bg-slate-900 border-slate-800 text-slate-100 dark' : 'bg-slate-100 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100'}`}
    >
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
          {/* macOS Traffic Lights Spacer: 78px so native traffic lights never collide with Workspace or Tabs */}
          {isMac && (
            <div 
              className="w-[78px] h-full shrink-0 select-none drag-region" 
              style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} 
            />
          )}

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
          <AnimatePresence>
            {canScrollLeft && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => scrollTabs('left')}
                className={`absolute left-0 z-30 p-1 rounded-r-lg shadow-md no-drag transition-colors ${
                  isIncognito ? 'bg-slate-800/90 text-slate-200 hover:bg-slate-700' : 'bg-white/90 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Scroll Left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>

          <Reorder.Group
            as="div"
            axis="x"
            values={visibleTabs}
            onReorder={(newTabs) => {
              if (visibleTabs.length <= 1) return;
              if (onReorderFullList) {
                const full: Tab[] = [];
                const seenIds = new Set<string>();
                for (const t of newTabs) {
                  if (!seenIds.has(t.id)) {
                    full.push(t);
                    seenIds.add(t.id);
                  }
                  if (t.splitWith) {
                    const partner = tabs.find(p => p.id === t.splitWith);
                    if (partner && !seenIds.has(partner.id)) {
                      full.push(partner);
                      seenIds.add(partner.id);
                    }
                  }
                }
                // Safety guarantee: never lose any tab belonging to this workspace
                for (const t of tabs) {
                  if (!seenIds.has(t.id)) {
                    full.push(t);
                    seenIds.add(t.id);
                  }
                }
                onReorderFullList(full);
              }
            }}
            ref={tabsContainerRef}
            onWheel={handleWheel}
            className="flex-1 flex items-end gap-1 overflow-x-auto overflow-y-hidden no-scrollbar drag-region h-[38px] relative"
          >
            <AnimatePresence mode="popLayout" initial={hasMounted}>
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
                  tabStyle={tabStyle}
                  tabAnimation={tabAnimation}
                  isIncognito={isIncognito}
                  wasJustUnsplit={justUnsplitTabIds.has(tab.id)}
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
                  onUpdateGhost={handleUpdateGhost}
                  onTabHover={handleTabHover}
                  onTabLeave={handleTabLeave}
                  onOpenContextMenu={handleOpenContextMenu}
                />
              );
            })}
            </AnimatePresence>
            
            {/* Action Buttons Container (New Tab & Private Tab) */}
            <motion.div
              layout="position"
              transition={
                tabAnimation === 'smooth'
                  ? { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const }
                  : tabAnimation === 'snappy'
                  ? { duration: 0.14, ease: [0.2, 0, 0, 1] as const }
                  : tabAnimation === 'none'
                  ? { duration: 0 }
                  : { duration: 0.18, ease: [0.2, 0, 0, 1] as const }
              }
              className="flex items-center shrink-0 mb-1 gap-0.5 no-drag z-10"
            >
              {/* New Tab Button */}
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                transition={{
                  duration: 0.15,
                  ease: [0.4, 0, 0.2, 1]
                }}
                onClick={() => onNewTab()}
                className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
                  isIncognito 
                    ? 'text-slate-400 hover:bg-slate-700/80 hover:text-slate-200' 
                    : 'text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
                }`}
                title={isMac ? "New Tab (⌘T)" : "New Tab (Ctrl+T)"}
              >
                <Plus className="w-4 h-4" />
              </motion.button>

              {/* New Incognito Tab Button */}
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                transition={{
                  duration: 0.15,
                  ease: [0.4, 0, 0.2, 1]
                }}
                onClick={onNewIncognitoTab}
                className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
                  isIncognito 
                    ? 'text-slate-300 hover:bg-slate-700/80 hover:text-white' 
                    : 'text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
                }`}
                title={isMac ? "New Private / Incognito Tab (⇧⌘N)" : "New Private / Incognito Tab (Ctrl+Shift+N)"}
              >
                <ShieldOff className="w-4 h-4" />
              </motion.button>

              {/* Exit Incognito / Switch to Normal Tab Button */}
              {isIncognito && onExitIncognito && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{
                    duration: 0.15,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  onClick={onExitIncognito}
                  className="px-2 py-1 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 text-[11px] font-medium bg-cyan-950/40 text-cyan-400 hover:bg-cyan-900/50 hover:text-cyan-300 border border-cyan-500/30 shadow-xs"
                  title="Normal Sekmeye Geç / Switch to Normal Tab"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Normal Sekme</span>
                </motion.button>
              )}
            </motion.div>
          </Reorder.Group>

          <AnimatePresence>
            {canScrollRight && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => scrollTabs('right')}
                className={`absolute right-0 z-30 p-1 rounded-l-lg shadow-md no-drag transition-colors ${
                  isIncognito ? 'bg-slate-800/90 text-slate-200 hover:bg-slate-700' : 'bg-white/90 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Scroll Right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Spacer for Windows controls */}
        {isWindows && (
          <div 
            className="w-[140px] shrink-0 select-none drag-region" 
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} 
          />
        )}
      </motion.div>
      )}
      </AnimatePresence>

      {/* 
        ROW 2: Toolbar (Nav, Omnibox, Extensions)
      */}
      <div 
        style={!isIncognito ? { backgroundColor: 'var(--nova-toolbar-bg)', borderColor: 'var(--nova-border-subtle)' } : undefined}
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
          {/* AI Copilot Pill with Animated SVG */}
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            onClick={onToggleAIAssistant}
            className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300 font-semibold text-xs shrink-0 select-none cursor-pointer overflow-hidden ${
              isAIAssistantOpen
                ? 'bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-blue-600/20 text-cyan-400 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/20'
                : isIncognito 
                ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-400/40' 
                : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 hover:border-cyan-400/40 shadow-xs'
            }`}
            title={isMac ? "Nova AI Assistant (⌘I)" : "Nova AI Assistant (Ctrl+I)"}
          >
            <NovaAISparkle size={15} active={isAIAssistantOpen} />
            <span className="font-bold tracking-wide text-[11px] text-cyan-600 dark:text-cyan-400 group-hover:brightness-110 transition-colors">
              AI
            </span>
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
                  if (getElectronAPI()?.openExtensionPopup) {
                    getElectronAPI()?.openExtensionPopup(
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
              ref={adBlockerBtnRef}
              onClick={() => setIsAdBlockerOpen(!isAdBlockerOpen)}
              className={`p-1.5 rounded-lg transition-colors relative ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'}`}
              title="Privacy & Ad Shield"
            >
              {isWhitelisted ? <ShieldOff className="w-4 h-4 text-slate-400" /> : <Shield className="w-4 h-4 text-cyan-400" />}
              {(!isWhitelisted && (activeTab?.blockedAdsCount || 0) > 0) && (
                <span className="absolute -top-1 -right-1 bg-cyan-500 text-slate-950 text-[9px] font-bold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center">
                  {activeTab?.blockedAdsCount ?? 0}
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
                buttonRef={adBlockerBtnRef}
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
              <Download className={`w-4 h-4 ${(activeDownloadsCount || 0) > 0 ? 'text-cyan-500' : ''}`} />
              {(activeDownloadsCount || 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-cyan-500 text-slate-950 text-[9px] font-bold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {activeDownloadsCount}
                </span>
              )}
            </button>
            <DownloadsPopover
              // Shared empty array so the downloads popover can be handed a stable
  // reference while closed. The main process broadcasts progress every 250ms;
  // passing the live array straight through would invalidate the TopBar memo
  // ~4x/second and repaint the whole (framer-motion animated) tab strip.
  downloads={isDownloadsOpen ? downloads : EMPTY_DOWNLOADS}
              isOpen={isDownloadsOpen}
              onClose={() => setIsDownloadsOpen(false)}
              onClearDownloads={onClearDownloads || (() => {})}
              onOpenDownloadsPage={() => onNavigate('nova://downloads')}
              buttonRef={downloadsBtnRef}
            />
          </div>

          {/* Active Extension Toolbar Buttons */}
          {extensions && extensions.filter(ext => ext.enabled !== false && (ext.popupUrl || ext.optionsUrl)).slice(0, 5).map(ext => (
            <button
              key={ext.id}
              onClick={(e) => {
                if (ext.popupUrl) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const cleanPopup = ext.popupUrl.replace(/^\.?\//, '');
                  const url = `chrome-extension://${ext.id}/${cleanPopup}`;
                  if (getElectronAPI()?.openExtensionPopup) {
                    getElectronAPI()?.openExtensionPopup(
                      url,
                      { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                      activeTab ? {
                        id: activeTab.id,
                        url: activeTab.url,
                        title: activeTab.title,
                        favIconUrl: activeTab.favicon,
                        webContentsId: activeTab.webContentsId
                      } : undefined
                    );
                  } else {
                    onNavigate(url);
                  }
                } else if (ext.optionsUrl) {
                  const cleanOptions = ext.optionsUrl.replace(/^\.?\//, '');
                  onNavigate(`chrome-extension://${ext.id}/${cleanOptions}`);
                }
              }}
              className={`p-1.5 rounded-lg transition-colors flex items-center justify-center relative cursor-pointer ${
                isIncognito 
                  ? 'hover:bg-slate-700 text-slate-300' 
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
              title={`${ext.name}${ext.popupUrl ? ' (Click to open popup)' : ''}`}
            >
              {ext.iconData ? (
                <img src={ext.iconData} alt={ext.name} className="w-4 h-4 object-contain rounded-xs" />
              ) : (
                <div className="w-4 h-4 rounded-xs bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold uppercase">
                  {ext.name ? ext.name.charAt(0) : 'E'}
                </div>
              )}
            </button>
          ))}

          {/* Extensions Manager Button */}
          <button 
            onClick={onOpenExtensions}
            className={`p-1.5 rounded-lg transition-colors ${isIncognito ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'}`}
            title="Extensions (Beta)"
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

          {/* Spacer for Windows controls when vertical tabs are active */}
          {isWindows && useVerticalTabs && (
            <div 
              className="w-[140px] shrink-0 select-none drag-region" 
              style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} 
            />
          )}
        </div>
      </div>

      {/* 
        ROW 3: Bookmarks Bar
      */}
      {showBookmarksBar && (
        <div 
          style={!isIncognito ? { backgroundColor: 'var(--nova-toolbar-bg)', borderColor: 'var(--nova-border-subtle)' } : undefined}
          className={`flex items-center px-3 py-1 gap-2 border-t overflow-x-auto no-scrollbar no-drag ${
            isIncognito ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-800'
          }`}
        >
          {Array.isArray(bookmarks) && bookmarks.length > 0 ? (
            bookmarks.map(bookmark => (
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
                  <img 
                    src={bookmark.favicon} 
                    className="w-3.5 h-3.5 rounded-sm" 
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                )}
                <span className="truncate font-medium">{bookmark.title}</span>
              </button>
            ))
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 italic px-2 py-0.5 select-none">
              Bookmarks will appear here. Press {isMac ? '⌘D' : 'Ctrl+D'} to bookmark the current page.
            </span>
          )}
        </div>
      )}
    </header>

    {/* Drag to Split Screen Ghost Tab */}
    {createPortal(
      <div 
        ref={ghostElRef}
        className="fixed top-0 left-0 pointer-events-none z-[999999] opacity-90 transition-none"
        style={{ display: 'none', willChange: 'transform' }}
      >
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-2xl border backdrop-blur-md ${
          isIncognito 
            ? 'bg-slate-800/90 border-slate-600 text-slate-200' 
            : 'bg-white/90 border-blue-500/50 text-slate-800 dark:bg-slate-800/90 dark:border-blue-500/50 dark:text-slate-200'
        }`}>
          <Globe className="w-4 h-4 opacity-70" />
          <span ref={ghostTextRef} className="text-[13px] font-medium max-w-[160px] truncate">
            Drop to Split Screen
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
        if (onToggleBookmark) onToggleBookmark(targetTab);
      }}
      onCloseTab={(tabId) => onCloseTab(tabId)}
      onCloseOtherTabs={(tabId) => {
        if (onCloseOtherTabs) onCloseOtherTabs(tabId);
      }}
      onCloseTabsToRight={(target) => {
        if (onCloseTabsToRight) onCloseTabsToRight(target);
      }}
      onReopenClosedTab={() => {
        if (onReopenClosedTab) onReopenClosedTab();
      }}
      canReopenClosedTab={canReopenClosedTab}
      isBookmarked={tabContextMenu.tab ? bookmarks.some(b => b.url === tabContextMenu.tab?.url) : false}
      totalTabs={tabs.filter(t => (t.workspaceId || 'default') === (tabContextMenu.tab?.workspaceId || activeWorkspaceId || 'default')).length}
    />

    {/* Tab Hover Preview */}
    <TabHoverPreview
      tab={hoveredTabPreview?.tab || null}
      rect={hoveredTabPreview?.rect || null}
      position="bottom"
      visible={Boolean(hoveredTabPreview && !tabContextMenu.isOpen)}
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
  if (prevProps.tabAnimation !== nextProps.tabAnimation) return false;
  if (prevProps.isIncognito !== nextProps.isIncognito) return false;
  if (prevProps.searchEngine !== nextProps.searchEngine) return false;
  if (prevProps.isVpnEnabled !== nextProps.isVpnEnabled) return false;
  if (prevProps.splitTabId !== nextProps.splitTabId) return false;

  // Array-valued props compared by reference (state arrays from App; stable
  // unless actually changed)
  if (prevProps.workspaces !== nextProps.workspaces) return false;
  if (prevProps.bookmarks !== nextProps.bookmarks) return false;
  // `downloads` now arrives as a stable reference while the popover is closed
  // (see EMPTY_DOWNLOADS), so a plain reference check no longer repaints the
  // strip on every progress broadcast. The badge only needs the count.
  if (prevProps.downloads !== nextProps.downloads) return false;
  if ((prevProps.activeDownloadsCount || 0) !== (nextProps.activeDownloadsCount || 0)) return false;
  if (prevProps.permissionRequests !== nextProps.permissionRequests) return false;
  if (prevProps.onExitIncognito !== nextProps.onExitIncognito) return false;

  // Tabs: length + order-sensitive per-field comparison of every field the
  // strip or the active-tab-derived UI reads:
  //   strip items: id, url, title, favicon, isLoading, isMuted, isPinned,
  //                isPlayingAudio, isSuspended, splitWith, isIncognito
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
      a.isIncognito !== b.isIncognito ||
      a.isPlayingAudio !== b.isPlayingAudio ||
      a.isSuspended !== b.isSuspended ||
      a.isTranslated !== b.isTranslated ||
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
