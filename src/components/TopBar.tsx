import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { launchExtensionPopup } from '../services/extensionActions';
import { createPortal } from 'react-dom';
import { DownloadsPopover } from './DownloadsPopover';
import { TabContextMenu, TabContextMenuState } from './TabContextMenu';
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
  Check,
  Compass,
  Cloud,
  Languages,
  PictureInPicture2,
  LayoutGrid,
  SlidersHorizontal
} from 'lucide-react';
import {
  Tab,
  Bookmark,
  Workspace,
  PermissionRequest,
  Extension,
  UserSettings,
  DownloadItem,
  ChromeMode,
  TabBarPosition,
  ToolbarItemKind,
  ToolbarSlotItem,
} from '../types/browser';
import type { ResolvedBrowserDesign } from '../utils/designEngine';
import { ALLOWED_TOOLBAR_KINDS, TOOLBAR_ITEM_ORDER_DEFAULT } from '../utils/designDefaults';
import { CustomizeSlotWrapper, getToolbarItemMeta } from './customization/toolbarRegistry';
import { getWorkspaceIcon, WORKSPACE_COLORS } from '../utils/workspaceIcons';
import { formatSearchUrl, getSearchEngineName, isValidUrlOrDomain } from '../utils/searchEngine';
import { getLanguage, getLocale } from '../services/i18n';
import { AdBlockerPopover } from './AdBlockerPopover';
import {
  normalizeAdblockDomain,
  isDomainWhitelisted,
  toggleDomainInWhitelist,
  sanitizeAdblockWhitelist,
  ADBLOCK_WHITELIST_UPDATED_EVENT,
  notifyAdblockWhitelistUpdated,
} from '../utils/adblockUtils';
import { NovaAssistantIcon } from './ui/NovaAssistantIcon';
import { logger } from '../utils/logger';
import { syncService, SyncStatus } from '../services/syncService';
import { getClientCachedSuggestions, setClientCachedSuggestions } from '../utils/suggestionCache';
import { TabHoverPreview } from './TabHoverPreview';
import { getElectronAPI } from '../utils/electronBridge';
import { OmniboxBar } from './topbar/OmniboxBar';
export { OmniboxBar };

/** Stable identity handed to the downloads popover while it is closed. */
const EMPTY_DOWNLOADS: DownloadItem[] = [];

const POPOVER_SURFACE_STYLE: React.CSSProperties = {
  background: 'var(--nova-popovers-bg, var(--nova-card-bg))',
  color: 'var(--nova-popovers-text, var(--foreground))',
  borderColor: 'var(--nova-popovers-border, var(--nova-border-subtle))',
  borderWidth: 'var(--nova-popovers-border-width, 1px)',
  borderRadius: 'var(--nova-popovers-radius, 12px)',
  backdropFilter: 'blur(var(--nova-popovers-blur, 16px))',
  WebkitBackdropFilter: 'blur(var(--nova-popovers-blur, 16px))',
  boxShadow: 'var(--nova-popovers-shadow, 0 20px 25px -5px rgba(0, 0, 0, 0.2))',
};

/**
 * True when a `click`/`keydown` reaching a container handler came from a
 * nested interactive control rather than from the container's own surface.
 *
 * A split half is a `role="button"` container that wraps a real <button> (the
 * close button). That close button only stopped propagation on `click`, never on `keydown`, so
 * Enter on it ran the half's own handler and selected the tab it was closing.
 * This rejects any event that originated inside a nested form control, on
 * both paths. It is deliberately not a blanket
 * `e.currentTarget !== e.target` test: a click on the title span or favicon is
 * a descendant event too, and it must keep selecting the tab.
 */
const isFromNestedControl = (e: React.SyntheticEvent<HTMLElement>): boolean => {
  const target = e.target as HTMLElement | null;
  if (!target || target === e.currentTarget) return false;
  return !!target.closest('button, a, input, select, textarea');
};

export interface TopBarProps {
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
  onToggleBookmarksBar?: () => void;
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
  privacyShield?: boolean;
  onTogglePrivacyShield?: () => void;
  design?: ResolvedBrowserDesign;
  isCustomizeMode?: boolean;
  onReorderToolbarSlot?: (draggedId: string, targetId: string) => void;
  onMoveToolbarSlotToIndex?: (draggedId: string, targetIndex: number) => void;
  onInsertToolbarSlot?: (kind: ToolbarItemKind, atIndex: number) => void;
  onToggleToolbarSlotVisibility?: (id: string) => void;
  onRemoveToolbarSlot?: (id: string) => void;
  onOpenCustomizeMode?: () => void;
}

export interface TopBarLayoutConfig {
  chromeMode: ChromeMode;
  tabBarPosition: TabBarPosition;
  isVerticalChrome: boolean;
  isCompactSingleRow: boolean;
  toolbarItems: ToolbarSlotItem[];
  toolbarShowLabels: boolean;
  omniboxMaxWidth: 'compact' | 'balanced' | 'full';
  reduceMotion: boolean;
}

export function resolveTopBarLayoutConfig(
  design?: ResolvedBrowserDesign,
  useVerticalTabs = false
): TopBarLayoutConfig {
  const chromeMode: ChromeMode =
    design?.layout?.chromeMode ?? (useVerticalTabs ? 'vertical-left' : 'classic-top');
  const isVerticalChrome =
    Boolean(useVerticalTabs) || chromeMode === 'vertical-left' || chromeMode === 'vertical-right';
  const isCompactSingleRow = !isVerticalChrome && chromeMode === 'compact-single-row';
  const tabBarPosition: TabBarPosition = design?.layout?.tabBarPosition ?? 'above-toolbar';
  const rawItems = design?.layout?.toolbarItems;
  const toolbarItems =
    Array.isArray(rawItems) && rawItems.length > 0 ? rawItems : TOOLBAR_ITEM_ORDER_DEFAULT;
  const toolbarShowLabels = Boolean(design?.layout?.toolbarShowLabels);
  const omniboxMaxWidth = design?.layout?.omniboxMaxWidth ?? 'balanced';
  const reduceMotion = Boolean(design?.effects?.reduceChromeMotion);

  return {
    chromeMode,
    tabBarPosition,
    isVerticalChrome,
    isCompactSingleRow,
    toolbarItems,
    toolbarShowLabels,
    omniboxMaxWidth,
    reduceMotion,
  };
}

export function getOmniboxWidthClass(
  omniboxMaxWidth: 'compact' | 'balanced' | 'full'
): string {
  if (omniboxMaxWidth === 'compact') return 'max-w-md';
  if (omniboxMaxWidth === 'balanced') return 'max-w-2xl';
  return '';
}

export function parseToolbarDropPayload(
  getData: (type: string) => string
): { type: 'slot'; draggedId: string } | { type: 'kind'; kind: ToolbarItemKind } | null {
  const draggedSlotId = (getData('application/x-nova-toolbar-slot') || '').trim();
  if (draggedSlotId) {
    return { type: 'slot', draggedId: draggedSlotId };
  }
  const kindRaw = (getData('application/x-nova-toolbar-kind') || '').trim();
  if (kindRaw && ALLOWED_TOOLBAR_KINDS.includes(kindRaw as ToolbarItemKind)) {
    return { type: 'kind', kind: kindRaw as ToolbarItemKind };
  }
  return null;
}

export function resolveDropInsertionIndex(
  items: ToolbarSlotItem[],
  draggedId: string,
  rawTargetIndex: number
): number {
  const fromIdx = items.findIndex((i) => i.id === draggedId);
  if (fromIdx === -1) return Math.max(0, rawTargetIndex);
  if (fromIdx < rawTargetIndex) {
    return Math.max(0, rawTargetIndex - 1);
  }
  return Math.max(0, rawTargetIndex);
}

export function topBarPropsEqual(prevProps: TopBarProps, nextProps: TopBarProps): boolean {
  // Compare only rendered fields — tabs array identity changes on every webview
  // event. Callback props from App are stable useCallback references (or closed over
  // fields already checked below).
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
  if (prevProps.privacyShield !== nextProps.privacyShield) return false;
  if (prevProps.isVpnEnabled !== nextProps.isVpnEnabled) return false;
  if (prevProps.splitTabId !== nextProps.splitTabId) return false;
  // Drives the AI pill's active state and sparkle; toggling the assistant only
  // flips this prop, so without the check the pill never repainted.
  if (prevProps.isAIAssistantOpen !== nextProps.isAIAssistantOpen) return false;
  if (prevProps.design !== nextProps.design) return false;
  if (prevProps.isCustomizeMode !== nextProps.isCustomizeMode) return false;
  if (prevProps.extensions !== nextProps.extensions) return false;

  // Customization & modular toolbar callbacks
  if (prevProps.onReorderToolbarSlot !== nextProps.onReorderToolbarSlot) return false;
  if (prevProps.onMoveToolbarSlotToIndex !== nextProps.onMoveToolbarSlotToIndex) return false;
  if (prevProps.onInsertToolbarSlot !== nextProps.onInsertToolbarSlot) return false;
  if (prevProps.onToggleToolbarSlotVisibility !== nextProps.onToggleToolbarSlotVisibility) return false;
  if (prevProps.onRemoveToolbarSlot !== nextProps.onRemoveToolbarSlot) return false;
  if (prevProps.onOpenCustomizeMode !== nextProps.onOpenCustomizeMode) return false;
  if (prevProps.onToggleBookmarksBar !== nextProps.onToggleBookmarksBar) return false;

  // Presence checks for conditional toolbar actions
  if (Boolean(prevProps.onOpenAccount) !== Boolean(nextProps.onOpenAccount)) return false;
  if (Boolean(prevProps.onTogglePip) !== Boolean(nextProps.onTogglePip)) return false;
  if (Boolean(prevProps.onTakeScreenshot) !== Boolean(nextProps.onTakeScreenshot)) return false;
  if (Boolean(prevProps.onOpenShare) !== Boolean(nextProps.onOpenShare)) return false;
  if (Boolean(prevProps.onOpenHelp) !== Boolean(nextProps.onOpenHelp)) return false;

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
      a.isInPip !== b.isInPip ||
      a.isSuspended !== b.isSuspended ||
      a.isTranslated !== b.isTranslated ||
      a.splitWith !== b.splitWith
    ) {
      return false;
    }
    if (a.id === nextProps.activeTabId) {
      if (
        a.canGoBack !== b.canGoBack ||
        a.canGoForward !== b.canGoForward ||
        a.zoomFactor !== b.zoomFactor ||
        a.blockedAdsCount !== b.blockedAdsCount ||
        a.webContentsId !== b.webContentsId
      ) {
        return false;
      }
    }
  }
  return true;
}

const MemoizedTabItem = React.memo(
  React.forwardRef<any, any>(({
    tab, activeTabId, index, isActive, splitTab, tabStyle, tabAnimation, isIncognito,
    wasJustUnsplit,
    onTabDragStart, onTabDrag, onTabDragEnd, onDropToSplitScreen,
    onSelectTab, onCloseSplit, onToggleMuteTab, onTogglePip, onCloseTab,
    tabsLength, onUpdateGhost, onOpenContextMenu, onTabHover, onTabLeave
  }: any, ref: any) => {
  // No early return before the first hook. A `isSplitChild` bail-out used to sit
  // here; it is gone because nothing ever passed the prop and `visibleTabs`
  // already drops a split partner, so the branch could only ever have been a
  // conditional hook — the moment it was taken, the hook count dropped 1 -> 0
  // and React tore down the whole tab strip with "Rendered fewer hooks than
  // expected". Split halves are de-duplicated in the parent, not hidden here.
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

  const tabCornerStyle: React.CSSProperties =
    tabStyle === 'square'
      ? { borderRadius: 0 }
      : tabStyle === 'floating'
        ? { borderRadius: isActive ? 'var(--nova-activeTab-radius, 8px)' : 'var(--nova-inactiveTab-radius, 8px)' }
        : {
            borderTopLeftRadius: isActive ? 'var(--nova-activeTab-radius, 12px)' : 'var(--nova-inactiveTab-radius, 12px)',
            borderTopRightRadius: isActive ? 'var(--nova-activeTab-radius, 12px)' : 'var(--nova-inactiveTab-radius, 12px)',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          };
  const tabHeightExpr = tabStyle === 'floating'
    ? 'calc(var(--nova-tab-height, 38px) - 6px)'
    : 'calc(var(--nova-tab-height, 38px) - 4px)';

  return (
    <Reorder.Item
      ref={ref}
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
      onClick={(e) => {
        if (isFromNestedControl(e)) return;
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
        height: tabHeightExpr,
        ...tabCornerStyle,
        ...(!isIncognito
          ? isActive
            ? {
                background: 'var(--nova-activeTab-bg, var(--nova-active-tab-bg))',
                color: 'var(--nova-activeTab-text, inherit)',
                borderColor: 'var(--nova-activeTab-border, var(--nova-border-subtle))',
                borderTopColor: 'var(--nova-accent, #3b82f6)',
                backdropFilter: 'blur(var(--nova-activeTab-blur, 0px))',
                WebkitBackdropFilter: 'blur(var(--nova-activeTab-blur, 0px))',
                boxShadow: 'var(--nova-activeTab-shadow, 0 1px 2px rgba(0, 0, 0, 0.05))',
              }
            : {
                color: 'var(--nova-inactiveTab-text, inherit)',
                borderColor: 'var(--nova-inactiveTab-border, transparent)',
              }
          : {}),
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
            ? 'bg-slate-800 text-slate-100 border-slate-700 font-medium shadow-xs border-t-2 border-t-accent relative z-10'
            : 'bg-white text-slate-900 border-slate-300/80 font-medium shadow-xs border-t-2 border-t-accent relative z-10 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
          : isIncognito
            ? 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border-transparent font-medium'
            : 'bg-slate-200/40 [background:var(--nova-inactiveTab-bg,transparent)] hover:[background:var(--nova-inactive-tab-hover-bg,rgba(148,163,184,0.16))] text-slate-600 hover:text-slate-900 border-transparent font-medium dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      {isPinned ? (
        <div className="flex items-center justify-center w-full h-full relative">
          {tab.isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-accent/50 border-t-transparent rounded-full animate-spin shrink-0" />
          ) : tab.favicon ? (
            <img src={tab.favicon} width={16} height={16} alt="" className="w-4 h-4 rounded-xs shrink-0" />
          ) : (
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          {tab.isPlayingAudio && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleMuteTab(tab.id, e); }}
              className="absolute -top-1 -right-1 p-0.5 bg-accent text-accent-text rounded-full shadow-xs"
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
                ? 'bg-accent/15 text-accent-hover dark:text-accent font-semibold shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-normal'
            }`}
            onClick={(e) => {
              if (isFromNestedControl(e)) return;
              e.stopPropagation();
              onTabLeave?.();
              onSelectTab(tab.id);
            }}
            onKeyDown={(e) => {
              if (isFromNestedControl(e)) return;
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
              <div className="w-3.5 h-3.5 border-2 border-accent/50 border-t-transparent rounded-full animate-spin shrink-0" />
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
              onKeyDown={(e) => { e.stopPropagation(); }}
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
                ? 'bg-accent/15 text-accent-hover dark:text-accent font-semibold shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-normal'
            }`}
            onClick={(e) => {
              if (isFromNestedControl(e)) return;
              e.stopPropagation();
              onTabLeave?.();
              onSelectTab(splitTab.id);
            }}
            onKeyDown={(e) => {
              if (isFromNestedControl(e)) return;
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
              <div className="w-3.5 h-3.5 border-2 border-accent/50 border-t-transparent rounded-full animate-spin shrink-0" />
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
              onKeyDown={(e) => { e.stopPropagation(); }}
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
              <div className="w-3.5 h-3.5 border-2 border-accent/50 border-t-transparent rounded-full animate-spin shrink-0" />
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
            ) : tab.isPlayingAudio || tab.isInPip ? (
              <div className="flex items-center gap-1">
                {onTogglePip && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onTogglePip(tab.id); }}
                    className={`p-0.5 rounded-full transition-colors shrink-0 ${
                      tab.isInPip
                        ? 'text-accent bg-accent/15 hover:bg-accent/25 ring-1 ring-accent/30'
                        : 'text-slate-400 hover:text-accent hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title={tab.isInPip ? "Exit Picture in Picture" : "Picture in Picture"}
                  >
                    <PictureInPicture2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {tab.isPlayingAudio && (
                  <button
                    onClick={(e) => onToggleMuteTab(tab.id, e)}
                    className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 dark:hover:bg-slate-700 transition-colors shrink-0"
                    title="Mute Tab"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-accent animate-pulse" />
                  </button>
                )}
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
                className={`w-6 h-6 flex items-center justify-center rounded-full transition-all duration-150 shrink-0 cursor-pointer hover:scale-110 active:scale-95 ${
                  isActive
                    ? 'hover:bg-slate-200 text-slate-500 hover:text-red-500 dark:hover:bg-slate-700 dark:text-slate-400'
                    : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-slate-300 text-slate-500 hover:text-red-500 dark:hover:bg-slate-700 dark:text-slate-400'
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
          style={!isIncognito ? { background: 'var(--nova-activeTab-bg, var(--nova-active-tab-bg))' } : undefined}
          className={`absolute -bottom-px left-0 right-0 h-px z-20 ${isIncognito ? 'bg-slate-800' : 'bg-white dark:bg-slate-800'}`}
        />
      )}
    </Reorder.Item>
  );
  }), (prevProps: any, nextProps: any) => {
  return (
    prevProps.index === nextProps.index &&
    prevProps.wasJustUnsplit === nextProps.wasJustUnsplit &&
    prevProps.isActive === nextProps.isActive &&
    // For non-split tabs, activeTabId doesn't affect rendering because isActive captures whether this tab is active.
    // For split tabs, we only care whether this tab or the split partner is the active one.
    (
      !prevProps.splitTab && !nextProps.splitTab
        ? true
        : (prevProps.activeTabId === prevProps.tab.id) === (nextProps.activeTabId === nextProps.tab.id) &&
          (prevProps.activeTabId === prevProps.splitTab?.id) === (nextProps.activeTabId === nextProps.splitTab?.id)
    ) &&
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
    prevProps.tab.isInPip === nextProps.tab.isInPip &&
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
  onToggleBookmarksBar,
  onToggleReaderMode,
  onOpenExtensions,
  extensions: propExtensions,
  onOpenAccount,
  onTabDragStart,
  onTabDragEnd,
  onTabDrag,
  onDropToSplitScreen,
  splitTabId,
  onCloseSplit,
  permissionRequests,
  onRespondPermission,
  onDismissPermission,
  privacyShield = true,
  onTogglePrivacyShield,
  design,
  isCustomizeMode = false,
  onReorderToolbarSlot,
  onMoveToolbarSlotToIndex,
  onInsertToolbarSlot,
  onToggleToolbarSlotVisibility,
  onRemoveToolbarSlot,
  onOpenCustomizeMode,
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
  const [topBarContextMenu, setTopBarContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
  });
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const topBarContextMenuRef = useRef<HTMLDivElement>(null);

  const handleOpenContextMenu = useCallback((targetTab: Tab, index: number, e: React.MouseEvent) => {
    setTopBarContextMenu(prev => (prev.isOpen ? { ...prev, isOpen: false } : prev));
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
            setAdblockWhitelist(sanitizeAdblockWhitelist(parsed));
          }
        }
      } catch (e) {
        logger.warn('TopBar:adblockWhitelist', 'Failed to fetch adblocker whitelist from store', e);
      }
    };
    fetchWhitelist();

    const handleWhitelistEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ whitelist?: string[] }>)?.detail;
      if (detail && Array.isArray(detail.whitelist)) {
        setAdblockWhitelist(sanitizeAdblockWhitelist(detail.whitelist));
      } else {
        fetchWhitelist();
      }
    };
    window.addEventListener(ADBLOCK_WHITELIST_UPDATED_EVENT, handleWhitelistEvent);
    return () => {
      window.removeEventListener(ADBLOCK_WHITELIST_UPDATED_EVENT, handleWhitelistEvent);
    };
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
      cleanupStatus = getElectronAPI()?.onMcpStatusChanged((_: any, status: any) => {
        const isRunning = typeof status === 'object' && status !== null ? Boolean(status.running) : Boolean(status);
        setMcpRunning(isRunning);
      });
    }
    return () => {
      if (typeof cleanup === 'function') cleanup();
      if (typeof cleanupStatus === 'function') cleanupStatus();
    };
  }, []);
  const activeTab = React.useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  const handleOpenToolbarExtension = useCallback((ext: Extension, rect: DOMRect) => {
    const page = ext.popupUrl || ext.optionsUrl;
    if (!page) { onOpenExtensions(); return; }
    void launchExtensionPopup(`chrome-extension://${ext.id}/${page.replace(/^\.?\//, '')}`,
      { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      activeTab ? { id: activeTab.id, url: activeTab.url, title: activeTab.title, favIconUrl: activeTab.favicon, webContentsId: activeTab.webContentsId, isIncognito: Boolean(isIncognito || activeTab.isIncognito) } : undefined);
  }, [activeTab, isIncognito, onOpenExtensions]);
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

  const [openWorkspaceMenu, setOpenWorkspaceMenu] = useState<'tabbar' | 'toolbar' | 'compact' | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const tabbarWorkspaceRef = useRef<HTMLDivElement>(null);
  const toolbarWorkspaceRef = useRef<HTMLDivElement>(null);
  const compactWorkspaceRef = useRef<HTMLDivElement>(null);

  const layoutConfig = useMemo(
    () => resolveTopBarLayoutConfig(design, useVerticalTabs),
    [design, useVerticalTabs]
  );

  const effectiveExtensions = useMemo(
    () => (propExtensions ?? extensions).filter((ext) => ext.enabled !== false),
    [propExtensions, extensions]
  );

  const activeTabIdForPip = activeTab?.id;
  const omniboxTogglePip = useMemo(
    () => (onTogglePip && activeTabIdForPip ? () => onTogglePip(activeTabIdForPip) : undefined),
    [onTogglePip, activeTabIdForPip]
  );

  useEffect(() => {
    if (!openWorkspaceMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenWorkspaceMenu(null);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTabbar = tabbarWorkspaceRef.current?.contains(target);
      const inToolbar = toolbarWorkspaceRef.current?.contains(target);
      const inCompact = compactWorkspaceRef.current?.contains(target);
      if (!inTabbar && !inToolbar && !inCompact) {
        setOpenWorkspaceMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openWorkspaceMenu]);

  useEffect(() => {
    if (!topBarContextMenu.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTopBarContextMenu(prev => ({ ...prev, isOpen: false }));
      }
    };
    const handleBlur = () => {
      setTopBarContextMenu(prev => ({ ...prev, isOpen: false }));
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (!topBarContextMenuRef.current?.contains(e.target as Node)) {
        setTopBarContextMenu(prev => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [topBarContextMenu.isOpen]);

  useEffect(() => {
    if (isCustomizeMode) {
      setIsMoreMenuOpen(false);
      setIsDownloadsOpen(false);
      setIsAdBlockerOpen(false);
      setOpenWorkspaceMenu(null);
      setTopBarContextMenu(prev => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    } else {
      setDragOverTarget(null);
    }
  }, [isCustomizeMode]);

  useEffect(() => {
    if (!isCustomizeMode) return;
    const clearDrag = () => setDragOverTarget(null);
    window.addEventListener('dragend', clearDrag);
    return () => window.removeEventListener('dragend', clearDrag);
  }, [isCustomizeMode]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
  const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('win');

  const activeWorkspace = workspaces?.find(w => w.id === activeWorkspaceId) || workspaces?.[0];

  const currentUrl = activeTab?.url || '';
  const currentHostname = normalizeAdblockDomain(currentUrl);
  const isWhitelisted = isDomainWhitelisted(currentHostname, adblockWhitelist);
  const isShieldActiveOnPage = Boolean(privacyShield) && !isWhitelisted;

  const handleToggleWhitelist = async () => {
    if (!currentHostname) return;
    const { nextWhitelist } = toggleDomainInWhitelist(currentHostname, adblockWhitelist);

    setAdblockWhitelist(nextWhitelist);
    notifyAdblockWhitelistUpdated(nextWhitelist);
    if (getElectronAPI()?.storeSet) {
      await getElectronAPI()?.storeSet('adblocker_whitelist', JSON.stringify(nextWhitelist));
    }
    onReload();
  };

  const handleTopBarContextMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!onOpenCustomizeMode && !onToggleBookmarksBar) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, [data-tab-id], [role="menu"]')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsMoreMenuOpen(false);
    setIsDownloadsOpen(false);
    setIsAdBlockerOpen(false);
    setOpenWorkspaceMenu(null);
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    setTopBarContextMenu({
      isOpen: true,
      x: Math.max(8, Math.min(e.clientX, vw - 236)),
      y: Math.max(8, Math.min(e.clientY, vh - 128)),
    });
  }, [onOpenCustomizeMode, onToggleBookmarksBar]);

  const hasToolbarDragTypes = (types: readonly string[] | DOMStringList | undefined): boolean => {
    if (!types) return false;
    const list = Array.from(types as Iterable<string>);
    return (
      list.includes('application/x-nova-toolbar-slot') ||
      list.includes('application/x-nova-toolbar-kind')
    );
  };

  const handleDropAtGap = useCallback(
    (e: React.DragEvent<HTMLElement>, rawIndex: number) => {
      if (!isCustomizeMode) return;
      const payload = parseToolbarDropPayload((type) => e.dataTransfer?.getData(type) || '');
      if (!payload) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOverTarget(null);

      if (payload.type === 'slot') {
        const adjustedIndex = resolveDropInsertionIndex(
          layoutConfig.toolbarItems,
          payload.draggedId,
          rawIndex
        );
        if (onMoveToolbarSlotToIndex) {
          onMoveToolbarSlotToIndex(payload.draggedId, adjustedIndex);
        } else if (onReorderToolbarSlot && layoutConfig.toolbarItems.length > 0) {
          const fallbackTarget =
            layoutConfig.toolbarItems[
              Math.min(layoutConfig.toolbarItems.length - 1, Math.max(0, adjustedIndex))
            ];
          if (fallbackTarget && fallbackTarget.id !== payload.draggedId) {
            onReorderToolbarSlot(payload.draggedId, fallbackTarget.id);
          }
        }
      } else if (payload.type === 'kind') {
        onInsertToolbarSlot?.(payload.kind, rawIndex);
      }
    },
    [
      isCustomizeMode,
      layoutConfig.toolbarItems,
      onInsertToolbarSlot,
      onMoveToolbarSlotToIndex,
      onReorderToolbarSlot,
    ]
  );

  const handleSlotDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetSlot: ToolbarSlotItem, idx: number) => {
      if (!isCustomizeMode) return;
      const payload = parseToolbarDropPayload((type) => e.dataTransfer?.getData(type) || '');
      if (!payload) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOverTarget(null);

      if (payload.type === 'slot') {
        if (payload.draggedId !== targetSlot.id) {
          onReorderToolbarSlot?.(payload.draggedId, targetSlot.id);
        }
      } else if (payload.type === 'kind') {
        onInsertToolbarSlot?.(payload.kind, idx);
      }
    },
    [isCustomizeMode, onInsertToolbarSlot, onReorderToolbarSlot]
  );

  const iconScaleStyle: React.CSSProperties = {
    width: 'calc(1rem * var(--nova-icon-scale, 1))',
    height: 'calc(1rem * var(--nova-icon-scale, 1))',
  };

  const renderWorkspaceSelector = (
    source: 'tabbar' | 'toolbar' | 'compact',
    compact = false
  ) => {
    if (!workspaces || !activeWorkspace || !onSelectWorkspace) return null;
    const isOpen = openWorkspaceMenu === source;
    const refObj =
      source === 'tabbar'
        ? tabbarWorkspaceRef
        : source === 'toolbar'
        ? toolbarWorkspaceRef
        : compactWorkspaceRef;

    return (
      <div
        ref={refObj}
        className={`relative no-drag ${source === 'tabbar' ? 'mb-1' : ''}`}
      >
        <button
          type="button"
          onClick={() => setOpenWorkspaceMenu(isOpen ? null : source)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-label="Switch workspace"
          className={`group flex items-center gap-1.5 h-7 ${
            compact ? 'px-2' : 'px-2.5 mr-1'
          } rounded-lg text-xs font-medium transition-all duration-150 border cursor-pointer select-none ${
            isOpen
              ? 'bg-slate-300/80 dark:bg-white/15 border-accent/40 text-slate-900 dark:text-white shadow-sm ring-2 ring-accent/20'
              : 'bg-slate-200/60 hover:bg-slate-300/70 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-slate-300/60 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white shadow-2xs'
          }`}
        >
          <span
            className="w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{
              backgroundColor: `${WORKSPACE_COLORS[activeWorkspace.color] || '#64748b'}25`,
              color: WORKSPACE_COLORS[activeWorkspace.color] || '#64748b',
            }}
          >
            {React.createElement(getWorkspaceIcon(activeWorkspace.icon, activeWorkspace.name), {
              className: 'w-2.5 h-2.5 stroke-[2.5]',
            })}
          </span>
          <span
            className={`font-semibold truncate tracking-tight ${
              compact ? 'max-w-[72px]' : 'max-w-[110px]'
            }`}
          >
            {activeWorkspace.name}
          </span>
          <ChevronDown
            className={`w-3 h-3 text-slate-400 dark:text-slate-400 transition-transform duration-200 group-hover:text-slate-600 dark:group-hover:text-slate-200 ${
              isOpen ? 'rotate-180 text-accent-hover dark:text-accent' : ''
            }`}
          />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={layoutConfig.reduceMotion ? { duration: 0 } : { duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={!isIncognito ? POPOVER_SURFACE_STYLE : undefined}
              className="absolute top-full left-0 mt-1.5 w-64 bg-white/95 dark:bg-[#1c1c22]/95 border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Workspaces
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/5 text-slate-500 dark:text-slate-400">
                  {workspaces.length}
                </span>
              </div>

              {/* Workspaces List */}
              <div className="max-h-60 overflow-y-auto no-scrollbar space-y-0.5">
                {workspaces.map((w) => {
                  const isCurrent = w.id === activeWorkspaceId;
                  const IconComp = getWorkspaceIcon(w.icon, w.name);
                  const colorHex = WORKSPACE_COLORS[w.color] || '#64748b';
                  const count = tabs.filter((t) => (t.workspaceId || 'default') === w.id).length;

                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        onSelectWorkspace(w.id);
                        setOpenWorkspaceMenu(null);
                      }}
                      className={`w-full group/ws flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-accent/15 font-medium'
                          : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] opacity-85 hover:opacity-100'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover/ws:scale-105"
                        style={{ backgroundColor: `${colorHex}22`, color: colorHex }}
                      >
                        <IconComp className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                          <span>{w.name}</span>
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight">
                          {count} {count === 1 ? 'tab' : 'tabs'}
                        </span>
                      </div>
                      {isCurrent && (
                        <Check className="w-4 h-4 text-accent-hover dark:text-accent shrink-0 stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions Footer */}
              <div className="border-t border-slate-100 dark:border-white/5 mt-1.5 pt-1.5 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpenWorkspaceMenu(null);
                    window.dispatchEvent(new CustomEvent('open-workspace-manager', { detail: { mode: 'create' } }));
                  }}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium opacity-80 hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-accent" />
                  <span>New Space</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenWorkspaceMenu(null);
                    window.dispatchEvent(new CustomEvent('open-workspace-manager'));
                  }}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium opacity-80 hover:opacity-100 hover:bg-black/[0.05] dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Manage</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderTabStrip = (compactMode: boolean) => (
    <div
      className={
        compactMode
          ? 'flex-[1.15] min-w-[160px] relative flex items-center'
          : 'flex-1 relative flex items-center min-w-0'
      }
    >
      <AnimatePresence>
        {canScrollLeft && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={layoutConfig.reduceMotion ? { duration: 0 } : { duration: 0.15 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scrollTabs('left')}
            className={`absolute left-0 z-30 p-1 rounded-r-lg shadow-md no-drag transition-colors ${
              isIncognito
                ? 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
                : 'bg-white/90 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700'
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
                const partner = tabs.find((p) => p.id === t.splitWith);
                if (partner && !seenIds.has(partner.id)) {
                  full.push(partner);
                  seenIds.add(partner.id);
                }
              }
            }
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
        style={{ height: compactMode ? 'var(--nova-tab-height, 36px)' : 'var(--nova-tab-height, 38px)' }}
        className={`flex-1 flex ${
          compactMode ? 'items-center' : 'items-end h-[38px]'
        } gap-1 overflow-x-auto overflow-y-hidden no-scrollbar drag-region relative`}
      >
        <AnimatePresence mode="popLayout" initial={hasMounted}>
          {visibleTabs.map((tab: Tab) => {
            const splitTab = tab.splitWith ? tabs.find((t) => t.id === tab.splitWith) : null;
            const isActive =
              tab.id === activeTabId || (splitTab ? splitTab.id === activeTabId : false);

            return (
              <MemoizedTabItem
                key={tab.id}
                tab={tab}
                activeTabId={activeTabId}
                index={tabs.findIndex((t) => t.id === tab.id)}
                isActive={isActive}
                splitTab={splitTab}
                tabStyle={tabStyle}
                tabAnimation={layoutConfig.reduceMotion ? 'none' : tabAnimation}
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
            layoutConfig.reduceMotion
              ? { duration: 0 }
              : tabAnimation === 'smooth'
              ? { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const }
              : tabAnimation === 'snappy'
              ? { duration: 0.14, ease: [0.2, 0, 0, 1] as const }
              : tabAnimation === 'none'
              ? { duration: 0 }
              : { duration: 0.18, ease: [0.2, 0, 0, 1] as const }
          }
          className={`flex items-center shrink-0 gap-0.5 no-drag z-10 ${compactMode ? '' : 'mb-1'}`}
        >
          {/* New Tab Button */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={{
              duration: layoutConfig.reduceMotion ? 0 : 0.15,
              ease: [0.4, 0, 0.2, 1],
            }}
            onClick={() => onNewTab()}
            className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
              isIncognito
                ? 'text-slate-400 hover:bg-slate-700/80 hover:text-slate-200'
                : 'text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
            }`}
            title={isMac ? 'New Tab (⌘T)' : 'New Tab (Ctrl+T)'}
          >
            <Plus className="w-4 h-4" />
          </motion.button>

          {/* New Incognito Tab Button */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={{
              duration: layoutConfig.reduceMotion ? 0 : 0.15,
              ease: [0.4, 0, 0.2, 1],
            }}
            onClick={onNewIncognitoTab}
            className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
              isIncognito
                ? 'text-slate-300 hover:bg-slate-700/80 hover:text-white'
                : 'text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
            }`}
            title={
              isMac
                ? 'New Private / Incognito Tab (⇧⌘N)'
                : 'New Private / Incognito Tab (Ctrl+Shift+N)'
            }
          >
            <ShieldOff className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </Reorder.Group>

      <AnimatePresence>
        {canScrollRight && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={layoutConfig.reduceMotion ? { duration: 0 } : { duration: 0.15 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scrollTabs('right')}
            className={`absolute right-0 z-30 p-1 rounded-l-lg shadow-md no-drag transition-colors ${
              isIncognito
                ? 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
                : 'bg-white/90 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Scroll Right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );

  const hasVisibleSpacer = useMemo(
    () =>
      layoutConfig.toolbarItems.some(
        (s) => s.kind === 'spacer' && (isCustomizeMode || s.visible)
      ),
    [layoutConfig.toolbarItems, isCustomizeMode]
  );

  const hasVisibleWorkspacesSlot = useMemo(
    () =>
      layoutConfig.toolbarItems.some(
        (s) => s.kind === 'workspaces' && (isCustomizeMode || s.visible)
      ),
    [layoutConfig.toolbarItems, isCustomizeMode]
  );

  const renderMoreMenu = () => {
    const showLabel = layoutConfig.toolbarShowLabels;
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
          className={`rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            showLabel ? 'px-2 py-1 text-[11px] font-medium' : 'p-1.5'
          } ${
            isMoreMenuOpen
              ? 'bg-black/[0.08] dark:bg-white/15 text-accent'
              : isIncognito
              ? 'hover:bg-slate-700 text-slate-300'
              : 'hover:bg-black/[0.06] dark:hover:bg-white/10 opacity-80 hover:opacity-100'
          }`}
          title="More Options"
          aria-label="More Options"
        >
          <Menu className="w-4 h-4 shrink-0" style={iconScaleStyle} />
          {showLabel && <span className="whitespace-nowrap leading-none">Menu</span>}
        </button>

        <AnimatePresence>
          {isMoreMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={layoutConfig.reduceMotion ? { duration: 0 } : { duration: 0.15 }}
                style={!isIncognito ? POPOVER_SURFACE_STYLE : undefined}
                className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/80 dark:border-white/10 z-50 flex flex-col p-1.5 divide-y divide-slate-100 dark:divide-white/5"
              >
                {/* Nova Account Header inside menu */}
                {onOpenAccount && (
                  <div className="p-1">
                    <button
                      onClick={() => {
                        onOpenAccount();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {syncStatus.isLoggedIn && syncStatus.user ? (
                          <div className="w-6 h-6 rounded-full bg-accent text-accent-text font-semibold text-xs flex items-center justify-center shrink-0 uppercase">
                            {syncStatus.user.displayName ? syncStatus.user.displayName.charAt(0) : 'U'}
                          </div>
                        ) : (
                          <div className="p-1 rounded-lg bg-accent/15 text-accent-hover dark:text-accent">
                            <Cloud className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-xs font-semibold block truncate">
                            {syncStatus.isLoggedIn ? syncStatus.syncCode || 'Nova Sync' : 'Nova Sync'}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {syncStatus.isLoggedIn
                              ? 'Encrypted Sync Active'
                              : 'Sign in to sync across devices'}
                          </span>
                        </div>
                      </div>
                      {syncStatus.isLoggedIn ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      ) : (
                        <span className="text-[10px] font-semibold text-accent-hover dark:text-accent bg-accent/10 px-2 py-0.5 rounded-md shrink-0">
                          Sync
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {/* View & Layout Section */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      onToggleSplitView();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-xs font-medium rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Columns className="w-4 h-4 text-accent" />
                      <span>Split View (Side-by-Side)</span>
                    </div>
                    {isSplitView && (
                      <span className="text-[10px] font-bold bg-accent/20 text-accent-hover dark:text-accent px-1.5 py-0.5 rounded">
                        ON
                      </span>
                    )}
                  </button>

                  {onToggleVpn && (
                    <button
                      onClick={() => {
                        onToggleVpn();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-xs font-medium rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Network className="w-4 h-4 text-accent" />
                        <span>VPN (Secure Proxy)</span>
                      </div>
                      {isVpnEnabled ? (
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">OFF</span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onNavigate('nova://settings#mcp');
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-xs font-medium rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Cpu className="w-4 h-4 text-accent" />
                      <span>MCP AI Tools Server</span>
                    </div>
                    {mcpRunning ? (
                      <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        ONLINE
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">OFFLINE</span>
                    )}
                  </button>

                  {onOpenCustomizeMode && (
                    <button
                      onClick={() => {
                        onOpenCustomizeMode();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-xs font-medium rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <SlidersHorizontal className="w-4 h-4 text-accent" />
                        <span>Customize Browser...</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isMac ? '⇧⌘E' : 'Ctrl+Shift+E'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Tools Section */}
                <div className="py-1">
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-xs font-medium opacity-85">Zoom</span>
                    <div className="flex items-center gap-1 bg-black/[0.05] dark:bg-white/[0.08] rounded-lg p-0.5 border border-slate-200/50 dark:border-white/5">
                      <button
                        onClick={onZoomOut}
                        className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-bold px-1.5">
                        {Math.round((activeTab?.zoomFactor || 1) * 100)}%
                      </span>
                      <button
                        onClick={onZoomIn}
                        className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {onTakeScreenshot && (
                    <button
                      onClick={() => {
                        onTakeScreenshot();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-xs font-medium rounded-xl transition-colors text-left"
                    >
                      <Camera className="w-4 h-4 text-slate-400" /> Screenshot
                    </button>
                  )}
                  {onOpenShare && (
                    <button
                      onClick={() => {
                        onOpenShare();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-xs font-medium rounded-xl transition-colors text-left"
                    >
                      <Share2 className="w-4 h-4 text-slate-400" /> Share Link
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onOpenFindInPage();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-xs font-medium rounded-xl transition-colors text-left"
                  >
                    <Search className="w-4 h-4 text-slate-400" /> Find in Page
                  </button>
                </div>

                {/* Navigation / Library */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      onOpenDownloads();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-xs font-medium rounded-xl transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Download className="w-4 h-4 text-slate-400" /> Downloads
                    </div>
                    {(activeDownloadsCount || 0) > 0 && (
                      <span className="bg-accent text-accent-text text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {activeDownloadsCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      onOpenHistory();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-xs font-medium rounded-xl transition-colors text-left"
                  >
                    <Clock className="w-4 h-4 text-slate-400" /> History
                  </button>
                  <button
                    onClick={() => {
                      onOpenSettings();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-xs font-medium rounded-xl transition-colors text-left"
                  >
                    <Settings className="w-4 h-4 text-slate-400" /> Settings
                  </button>
                  {onOpenHelp && (
                    <button
                      onClick={() => {
                        onOpenHelp();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-xs font-medium rounded-xl transition-colors text-left"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400" /> Help & Support
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderToolbarItem = (slot: ToolbarSlotItem, idx: number, compactSingleRow: boolean) => {
    if (!isCustomizeMode && !slot.visible) {
      return null;
    }

    const showLabel = layoutConfig.toolbarShowLabels;
    const btnHover = isIncognito
      ? 'hover:bg-slate-700 text-slate-300'
      : 'hover:bg-black/[0.06] dark:hover:bg-white/10 opacity-80 hover:opacity-100';
    const btnActive =
      'bg-accent/15 text-accent-hover dark:text-accent ring-1 ring-accent/30';
    const iconBtnClass = `rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-default ${
      showLabel ? 'px-2 py-1 text-[11px] font-medium' : 'p-1.5'
    }`;

    let content: React.ReactNode = null;
    let outerClassName = 'relative flex items-center shrink-0';
    let wrapperClassName = '';

    switch (slot.kind) {
      case 'back':
        content = (
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={layoutConfig.reduceMotion ? { duration: 0 } : undefined}
            onClick={onGoBack}
            disabled={!activeTab?.canGoBack}
            className={`${iconBtnClass} ${btnHover}`}
            title="Go Back"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" style={iconScaleStyle} />
            {showLabel && <span className="whitespace-nowrap leading-none">Back</span>}
          </motion.button>
        );
        break;

      case 'forward':
        content = (
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={layoutConfig.reduceMotion ? { duration: 0 } : undefined}
            onClick={onGoForward}
            disabled={!activeTab?.canGoForward}
            className={`${iconBtnClass} ${btnHover}`}
            title="Go Forward"
            aria-label="Go Forward"
          >
            <ArrowRight className="w-4 h-4 shrink-0" style={iconScaleStyle} />
            {showLabel && <span className="whitespace-nowrap leading-none">Forward</span>}
          </motion.button>
        );
        break;

      case 'reload':
        content = (
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={layoutConfig.reduceMotion ? { duration: 0 } : undefined}
            onClick={onReload}
            className={`${iconBtnClass} ${btnHover}`}
            title="Reload Page"
            aria-label="Reload Page"
          >
            <RotateCw
              className={`w-4 h-4 shrink-0 transition-transform duration-500 active:rotate-180 ${
                activeTab?.isLoading ? 'animate-spin' : ''
              }`}
              style={iconScaleStyle}
            />
            {showLabel && <span className="whitespace-nowrap leading-none">Reload</span>}
          </motion.button>
        );
        break;

      case 'home':
        content = (
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={layoutConfig.reduceMotion ? { duration: 0 } : undefined}
            onClick={() => onNavigate('nova://newtab')}
            className={`${iconBtnClass} ${btnHover}`}
            title="New Tab Page"
            aria-label="New Tab Page"
          >
            <Home className="w-4 h-4 shrink-0" style={iconScaleStyle} />
            {showLabel && <span className="whitespace-nowrap leading-none">Home</span>}
          </motion.button>
        );
        break;

      case 'workspaces':
        if (workspaces && activeWorkspace && onSelectWorkspace) {
          content = renderWorkspaceSelector('toolbar', compactSingleRow);
        } else if (isCustomizeMode) {
          content = (
            <button
              type="button"
              disabled
              className="flex items-center gap-1.5 h-7 px-2 rounded-lg text-xs font-medium border border-slate-300/60 dark:border-white/10 opacity-60"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Workspaces</span>
            </button>
          );
        } else {
          return null;
        }
        break;

      case 'omnibox': {
        const widthCap = getOmniboxWidthClass(layoutConfig.omniboxMaxWidth);
        const minW = compactSingleRow ? 'min-w-[120px]' : 'min-w-[160px]';
        if (hasVisibleSpacer) {
          outerClassName = `relative flex-1 ${minW} ${widthCap} flex items-center`;
          wrapperClassName = 'w-full flex items-center';
        } else {
          outerClassName = `relative flex-1 ${minW} flex items-center justify-center`;
          wrapperClassName = `w-full ${widthCap} flex items-center`;
        }
        content = (
          <OmniboxBar
            activeTab={activeTab}
            isIncognito={isIncognito}
            searchEngine={searchEngine}
            bookmarks={bookmarks}
            useVerticalTabs={layoutConfig.isVerticalChrome}
            onNavigate={onNavigate}
            onToggleReaderMode={onToggleReaderMode}
            onTogglePip={omniboxTogglePip}
            onToggleBookmark={onToggleBookmark}
            onResetZoom={onResetZoom}
            isBookmarked={isBookmarked}
            permissionRequests={permissionRequests}
            onRespondPermission={onRespondPermission}
            onDismissPermission={onDismissPermission}
          />
        );
        break;
      }

      case 'ai':
        content = (
          <button
            type="button"
            onClick={onToggleAIAssistant}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors text-xs font-medium cursor-pointer ${
              isAIAssistantOpen
                ? btnActive
                : isIncognito
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'opacity-75 hover:opacity-100 hover:bg-black/[0.06] dark:hover:bg-white/10'
            }`}
            title={isMac ? 'Nova AI Assistant (⌘I)' : 'Nova AI Assistant (Ctrl+I)'}
            aria-label="Nova AI Assistant"
          >
            <NovaAssistantIcon size={14} active={isAIAssistantOpen} />
            <span className="text-[11px] font-medium leading-none">AI</span>
          </button>
        );
        break;

      case 'shield':
        content = (
          <div className="relative">
            <button
              type="button"
              ref={adBlockerBtnRef}
              onClick={() => setIsAdBlockerOpen(!isAdBlockerOpen)}
              className={`${iconBtnClass} relative ${btnHover}`}
              title={
                !privacyShield
                  ? 'Privacy Shield Disabled'
                  : isWhitelisted
                  ? 'Ad Shield Paused on this site'
                  : 'Privacy & Ad Shield'
              }
              aria-label="Privacy & Ad Shield"
            >
              {!isShieldActiveOnPage ? (
                <ShieldOff className="w-4 h-4 text-slate-400 shrink-0" style={iconScaleStyle} />
              ) : (
                <Shield className="w-4 h-4 text-accent shrink-0" style={iconScaleStyle} />
              )}
              {showLabel && <span className="whitespace-nowrap leading-none">Shield</span>}
              {isShieldActiveOnPage && (activeTab?.blockedAdsCount || 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-accent-text text-[9px] font-bold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center">
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
                privacyShieldEnabled={privacyShield}
                onTogglePrivacyShield={onTogglePrivacyShield}
              />
            )}
          </div>
        );
        break;

      case 'downloads':
        content = (
          <div className="relative flex items-center">
            <button
              type="button"
              ref={downloadsBtnRef}
              onClick={() => setIsDownloadsOpen(!isDownloadsOpen)}
              className={`${iconBtnClass} relative ${
                (activeDownloadsCount || 0) > 0
                  ? 'text-accent-hover dark:text-accent bg-accent/10 hover:bg-accent/20 shadow-xs'
                  : btnHover
              }`}
              title="Downloads"
              aria-label="Downloads"
            >
              <Download
                className={`w-4 h-4 shrink-0 ${(activeDownloadsCount || 0) > 0 ? 'text-accent' : ''}`}
                style={iconScaleStyle}
              />
              {showLabel && <span className="whitespace-nowrap leading-none">Downloads</span>}
              {(activeDownloadsCount || 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-accent-text text-[9px] font-bold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center shadow-xs">
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
        );
        break;

      case 'extensions':
        content = (
          <div className="flex items-center gap-1">
            {effectiveExtensions.slice(0, 5).map((ext) => (
              <button
                key={ext.id}
                type="button"
                onClick={(e) =>
                  handleOpenToolbarExtension(ext, e.currentTarget.getBoundingClientRect())
                }
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center relative cursor-pointer ${btnHover}`}
                title={`${ext.name}${ext.popupUrl ? ' (Click to open popup)' : ''}`}
              >
                {ext.iconData ? (
                  <img
                    src={ext.iconData}
                    alt={ext.name}
                    className="w-4 h-4 object-contain rounded-xs"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[10px] font-semibold uppercase">
                    {ext.name ? ext.name.charAt(0) : 'E'}
                  </div>
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={onOpenExtensions}
              className={`${iconBtnClass} ${btnHover}`}
              title="Extensions"
              aria-label="Extensions"
            >
              <Puzzle className="w-4 h-4 shrink-0" style={iconScaleStyle} />
              {showLabel && <span className="whitespace-nowrap leading-none">Extensions</span>}
            </button>
          </div>
        );
        break;

      case 'bookmarksToggle': {
        const isActiveBm = onToggleBookmarksBar ? showBookmarksBar : isBookmarked;
        const handleBmClick = () => {
          if (onToggleBookmarksBar) {
            onToggleBookmarksBar();
          } else {
            onToggleBookmark(activeTab || undefined);
          }
        };
        content = (
          <button
            type="button"
            onClick={handleBmClick}
            className={`${iconBtnClass} ${isActiveBm ? btnActive : btnHover}`}
            title={
              onToggleBookmarksBar
                ? showBookmarksBar
                  ? 'Hide Bookmarks Bar'
                  : 'Show Bookmarks Bar'
                : isBookmarked
                ? 'Remove Bookmark'
                : 'Bookmark Page'
            }
            aria-label="Bookmarks"
            aria-pressed={Boolean(isActiveBm)}
          >
            <Star
              className={`w-4 h-4 shrink-0 ${isActiveBm ? 'fill-accent text-accent' : ''}`}
              style={iconScaleStyle}
            />
            {showLabel && <span className="whitespace-nowrap leading-none">Bookmarks</span>}
          </button>
        );
        break;
      }

      case 'splitView':
        content = (
          <button
            type="button"
            onClick={onToggleSplitView}
            className={`${iconBtnClass} ${isSplitView ? btnActive : btnHover}`}
            title="Split View"
            aria-label="Split View"
            aria-pressed={Boolean(isSplitView)}
          >
            <Columns2 className="w-4 h-4 shrink-0" style={iconScaleStyle} />
            {showLabel && <span className="whitespace-nowrap leading-none">Split</span>}
          </button>
        );
        break;

      case 'pip':
        content = (
          <button
            type="button"
            onClick={() => {
              if (activeTab && onTogglePip) onTogglePip(activeTab.id);
            }}
            disabled={!onTogglePip || !activeTab}
            className={`${iconBtnClass} ${activeTab?.isInPip ? btnActive : btnHover}`}
            title={activeTab?.isInPip ? 'Exit Picture in Picture' : 'Picture in Picture'}
            aria-label="Picture in Picture"
            aria-pressed={Boolean(activeTab?.isInPip)}
          >
            <PictureInPicture2 className="w-4 h-4 shrink-0" style={iconScaleStyle} />
            {showLabel && <span className="whitespace-nowrap leading-none">PiP</span>}
          </button>
        );
        break;

      case 'screenshot':
        content = (
          <button
            type="button"
            onClick={() => onTakeScreenshot?.()}
            disabled={!onTakeScreenshot}
            className={`${iconBtnClass} ${btnHover}`}
            title="Take Screenshot"
            aria-label="Take Screenshot"
          >
            <Camera className="w-4 h-4 shrink-0" style={iconScaleStyle} />
            {showLabel && <span className="whitespace-nowrap leading-none">Screenshot</span>}
          </button>
        );
        break;

      case 'account':
        if (!onOpenAccount && !isCustomizeMode) {
          return null;
        }
        content = (
          <button
            type="button"
            onClick={() => onOpenAccount?.()}
            disabled={!onOpenAccount}
            className={`${iconBtnClass} relative justify-center ${
              isIncognito
                ? 'hover:bg-slate-700 text-slate-300'
                : syncStatus.isLoggedIn
                ? 'hover:bg-accent/10 text-accent-hover dark:text-accent'
                : 'hover:bg-black/[0.06] dark:hover:bg-white/10 opacity-80 hover:opacity-100'
            }`}
            title={
              syncStatus.isLoggedIn
                ? `Nova Account (${syncStatus.user?.displayName || syncStatus.user?.email})`
                : 'Sign In to Nova Sync'
            }
            aria-label="Account & Sync"
          >
            {syncStatus.isLoggedIn && syncStatus.user ? (
              <div className="w-5 h-5 rounded-full bg-accent text-accent-text font-semibold text-[10px] flex items-center justify-center shadow-xs uppercase shrink-0">
                {syncStatus.user.displayName ? syncStatus.user.displayName.charAt(0) : 'U'}
              </div>
            ) : (
              <User className="w-4 h-4 shrink-0" style={iconScaleStyle} />
            )}
            {showLabel && (
              <span className="whitespace-nowrap leading-none max-w-[72px] truncate">
                {syncStatus.isLoggedIn && syncStatus.user?.displayName
                  ? syncStatus.user.displayName
                  : 'Account'}
              </span>
            )}
            {syncStatus.isLoggedIn && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-0.5 right-0.5 border border-white dark:border-slate-900" />
            )}
          </button>
        );
        break;

      case 'customize':
        content = (
          <button
            type="button"
            onClick={() => onOpenCustomizeMode?.()}
            className={`${iconBtnClass} ${isCustomizeMode ? btnActive : btnHover}`}
            title={
              isMac ? 'Customize Browser (⇧⌘E)' : 'Customize Browser (Ctrl+Shift+E)'
            }
            aria-label="Customize Browser"
            aria-pressed={Boolean(isCustomizeMode)}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" style={iconScaleStyle} />
            {showLabel && <span className="whitespace-nowrap leading-none">Customize</span>}
          </button>
        );
        break;

      case 'menu':
        content = renderMoreMenu();
        break;

      case 'spacer':
        outerClassName = 'relative flex-1 min-w-4 flex items-center';
        wrapperClassName = 'w-full h-full flex items-center';
        content = (
          <div
            aria-hidden="true"
            className={
              isCustomizeMode
                ? 'flex-1 min-w-4 h-6 rounded border border-dashed border-slate-300 dark:border-white/25 flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500 italic select-none px-2'
                : 'flex-1 min-w-4 h-6'
            }
          >
            {isCustomizeMode ? 'Space' : null}
          </div>
        );
        break;

      case 'divider':
        content = (
          <div
            aria-hidden="true"
            className={
              isCustomizeMode
                ? 'px-1.5 py-1 flex items-center justify-center'
                : 'flex items-center justify-center'
            }
          >
            <div className="w-px h-4 mx-0.5 shrink-0 bg-slate-200 dark:bg-white/15" />
          </div>
        );
        break;

      default: {
        const meta = getToolbarItemMeta(slot.kind);
        const FallbackIcon = meta.icon;
        content = (
          <button
            type="button"
            disabled
            className={`${iconBtnClass} ${btnHover}`}
            title={meta.label}
          >
            <FallbackIcon className="w-4 h-4 shrink-0" />
          </button>
        );
        break;
      }
    }

    const isDragTarget = isCustomizeMode && dragOverTarget === slot.id;

    return (
      <div
        data-toolbar-slot-id={slot.id}
        data-toolbar-kind={slot.kind}
        className={`${outerClassName} ${
          isDragTarget ? 'ring-2 ring-[var(--nova-accent,#3b82f6)] rounded-md' : ''
        }`}
      >
        <CustomizeSlotWrapper
          item={slot}
          isCustomizeMode={isCustomizeMode}
          controlsAlign={idx >= layoutConfig.toolbarItems.length - 2 ? 'right' : 'center'}
          onToggleVisibility={onToggleToolbarSlotVisibility}
          onRemove={onRemoveToolbarSlot}
          onDragOver={(_, item) => {
            if (isCustomizeMode && dragOverTarget !== item.id) {
              setDragOverTarget(item.id);
            }
          }}
          onDrop={(e, item) => handleSlotDrop(e, item, idx)}
          className={wrapperClassName}
        >
          {content}
        </CustomizeSlotWrapper>
      </div>
    );
  };

  const renderDropZone = (atIndex: number, zoneKey: string, isEnd = false) => {
    const isOver = dragOverTarget === zoneKey;
    return (
      <div
        data-toolbar-dropzone={isEnd ? 'end' : String(atIndex)}
        onDragOver={(e) => {
          if (!isCustomizeMode) return;
          if (hasToolbarDragTypes(e.dataTransfer?.types)) {
            e.preventDefault();
            if (dragOverTarget !== zoneKey) {
              setDragOverTarget(zoneKey);
            }
          }
        }}
        onDragLeave={() => {
          if (dragOverTarget === zoneKey) {
            setDragOverTarget(null);
          }
        }}
        onDrop={(e) => handleDropAtGap(e, atIndex)}
        className={
          isEnd
            ? `min-w-[28px] h-7 px-2 rounded-md border border-dashed shrink-0 flex items-center justify-center text-[10px] font-medium transition-colors select-none ${
                isOver
                  ? 'border-[var(--nova-accent,#3b82f6)] bg-[var(--nova-accent,#3b82f6)]/15 text-[var(--nova-accent,#3b82f6)]'
                  : 'border-slate-300/70 dark:border-white/15 text-slate-400 dark:text-slate-500'
              }`
            : `h-7 shrink-0 rounded-full transition-all ${
                isOver
                  ? 'w-5 mx-0.5 bg-[var(--nova-accent,#3b82f6)]/25 border border-dashed border-[var(--nova-accent,#3b82f6)]'
                  : 'w-1.5 -mx-0.5'
              }`
        }
        title={isEnd ? 'Drop toolbar item here' : undefined}
      >
        {isEnd ? '+' : null}
      </div>
    );
  };

  const renderToolbarSlots = (compactSingleRow: boolean) => (
    <>
      {layoutConfig.toolbarItems.map((slot, idx) => (
        <React.Fragment key={slot.id}>
          {isCustomizeMode && renderDropZone(idx, `gap-${idx}`)}
          {renderToolbarItem(slot, idx, compactSingleRow)}
        </React.Fragment>
      ))}
      {isCustomizeMode && renderDropZone(layoutConfig.toolbarItems.length, 'gap-end', true)}
    </>
  );

  const renderWindowDragSpacer = (side: 'mac' | 'windows') => (
    <div
      className={`relative ${
        side === 'mac' ? 'w-[88px]' : 'w-[140px]'
      } self-stretch min-h-[28px] shrink-0 select-none drag-region`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    />
  );

  const toolbarRowStyle: React.CSSProperties = !isIncognito
    ? {
        background: 'transparent',
        color: 'var(--nova-toolbar-text, inherit)',
        borderColor: 'var(--nova-toolbar-border, var(--nova-border-subtle))',
        borderBottomWidth: 'var(--nova-toolbar-border-width, 1px)',
        minHeight: 'var(--nova-toolbar-height, 44px)',
        paddingTop: 'var(--nova-density-pad-y, 6px)',
        paddingBottom: 'var(--nova-density-pad-y, 6px)',
        paddingLeft: 'var(--nova-density-pad-x, 12px)',
        paddingRight: 'var(--nova-density-pad-x, 12px)',
        boxShadow: 'var(--nova-toolbar-shadow, none)',
      }
    : {
        minHeight: 'var(--nova-toolbar-height, 44px)',
      };

  const renderToolbarBackdropLayer = () =>
    !isIncognito ? (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-white/95 dark:bg-slate-800/95"
        style={{
          background: 'var(--nova-toolbar-bg, var(--nova-card-bg))',
          backdropFilter: 'blur(var(--nova-toolbar-blur, 0px))',
          WebkitBackdropFilter: 'blur(var(--nova-toolbar-blur, 0px))',
        }}
      />
    ) : null;

  const renderTabBarRow = (isTopMostRow: boolean) => (
    <AnimatePresence key="classic-tabbar-presence" initial={false}>
      <motion.div
        key="classic-tabbar-row"
        data-topbar-row="tabbar"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
        exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
        transition={layoutConfig.reduceMotion ? { duration: 0 } : { duration: 0.2 }}
        style={
          !isIncognito
            ? {
                minHeight: 'calc(var(--nova-tab-height, 38px) + 6px)',
                backdropFilter: 'blur(var(--nova-tabBar-blur, 0px))',
                WebkitBackdropFilter: 'blur(var(--nova-tabBar-blur, 0px))',
              }
            : {
                minHeight: 'calc(var(--nova-tab-height, 38px) + 6px)',
              }
        }
        className={`flex items-end px-2 ${isTopMostRow ? 'pt-2.5' : 'pt-1.5'} gap-1`}
      >
        {/* macOS Traffic Lights Spacer when TabBar is top-most */}
        {isMac && isTopMostRow && renderWindowDragSpacer('mac')}

        {/* Workspace Selector */}
        {renderWorkspaceSelector('tabbar', false)}

        {/* Tabs */}
        {renderTabStrip(false)}

        {/* Spacer for Windows controls when TabBar is top-most */}
        {isWindows && isTopMostRow && renderWindowDragSpacer('windows')}
      </motion.div>
    </AnimatePresence>
  );

  const renderToolbarRow = (isTopMostRow: boolean) => (
    <div
      key="classic-toolbar-row"
      data-topbar-row="toolbar"
      onDragOver={(e) => {
        if (!isCustomizeMode) return;
        if (hasToolbarDragTypes(e.dataTransfer?.types)) {
          e.preventDefault();
        }
      }}
      onDrop={(e) => {
        if (!isCustomizeMode || e.defaultPrevented) return;
        handleDropAtGap(e, layoutConfig.toolbarItems.length);
      }}
      style={toolbarRowStyle}
      className={`relative flex items-center px-3 py-1.5 gap-2 no-drag ${
        isIncognito
          ? 'bg-slate-800 border-b border-slate-700'
          : 'bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'
      }`}
    >
      {/* Dedicated backdrop layer keeps backdrop-filter off the toolbar container so fixed popovers stay viewport-anchored */}
      {renderToolbarBackdropLayer()}

      {/* macOS Traffic Lights Spacer when Toolbar is top-most */}
      {isMac && !layoutConfig.isVerticalChrome && isTopMostRow && renderWindowDragSpacer('mac')}

      <div
        className="relative flex-1 min-w-0 flex items-center gap-1.5 no-drag"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {renderToolbarSlots(false)}
      </div>

      {/* Windows controls spacer when Toolbar is top-most or vertical tabs are active */}
      {isWindows &&
        ((isTopMostRow && !layoutConfig.isVerticalChrome) || layoutConfig.isVerticalChrome) &&
        renderWindowDragSpacer('windows')}
    </div>
  );

  const renderCompactSingleRow = () => (
    <div
      key="compact-single-row"
      data-topbar-row="compact"
      onDragOver={(e) => {
        if (!isCustomizeMode) return;
        if (hasToolbarDragTypes(e.dataTransfer?.types)) {
          e.preventDefault();
        }
      }}
      onDrop={(e) => {
        if (!isCustomizeMode || e.defaultPrevented) return;
        handleDropAtGap(e, layoutConfig.toolbarItems.length);
      }}
      style={toolbarRowStyle}
      className={`relative flex items-center px-2.5 py-1 gap-2 no-drag ${
        isIncognito
          ? 'bg-slate-800 border-b border-slate-700'
          : 'bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'
      }`}
    >
      {/* Dedicated backdrop layer keeps backdrop-filter off the container so fixed popovers stay viewport-anchored */}
      {renderToolbarBackdropLayer()}

      {/* macOS Traffic Lights Spacer */}
      {isMac && renderWindowDragSpacer('mac')}

      {/* Compact Workspace Pill (when workspaces slot isn't explicitly placed in toolbar) */}
      {!hasVisibleWorkspacesSlot && workspaces && activeWorkspace && onSelectWorkspace && (
        <div className="relative shrink-0">{renderWorkspaceSelector('compact', true)}</div>
      )}

      {/* Scrollable Compact Tab Strip */}
      {renderTabStrip(true)}

      <div className="relative w-px h-5 bg-slate-200 dark:bg-white/10 shrink-0" />

      {/* Modular Toolbar Slots */}
      <div
        className="relative flex-1 min-w-[200px] flex items-center gap-1 no-drag"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {renderToolbarSlots(true)}
      </div>

      {/* Windows Caption Controls Spacer */}
      {isWindows && renderWindowDragSpacer('windows')}
    </div>
  );

  const headerOwnsBackdrop = !(layoutConfig.isVerticalChrome || layoutConfig.isCompactSingleRow);

  return (
    <>
    <header
      onContextMenu={handleTopBarContextMenu}
      style={!isIncognito ? {
        background: headerOwnsBackdrop ? 'var(--nova-tabBar-bg, var(--nova-header-bg))' : 'transparent',
        color: 'var(--nova-tabBar-text, inherit)',
        borderColor: headerOwnsBackdrop ? 'var(--nova-tabBar-border, var(--nova-border-subtle))' : 'transparent',
        borderBottomWidth: headerOwnsBackdrop ? 'var(--nova-tabBar-border-width, 1px)' : '0px',
        fontFamily: 'var(--nova-font-ui, inherit)',
      } : {
        fontFamily: 'var(--nova-font-ui, inherit)',
      }}
      className={`w-full flex flex-col select-none drag-region relative z-50 ${
        isIncognito
          ? 'bg-slate-900 border-b border-slate-800 text-slate-100 dark'
          : headerOwnsBackdrop
          ? 'bg-slate-100 border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100'
          : 'text-slate-900 dark:text-slate-100'
      }`}
    >
      {layoutConfig.isVerticalChrome ? (
        renderToolbarRow(true)
      ) : layoutConfig.isCompactSingleRow ? (
        renderCompactSingleRow()
      ) : layoutConfig.tabBarPosition === 'below-toolbar' ? (
        <>
          {renderToolbarRow(true)}
          {renderTabBarRow(false)}
        </>
      ) : (
        <>
          {renderTabBarRow(true)}
          {renderToolbarRow(false)}
        </>
      )}

      {/*
        ROW 3: Bookmarks Bar
      */}
      {showBookmarksBar && (
        <div
          style={!isIncognito ? {
            background: 'var(--nova-toolbar-bg)',
            color: 'var(--nova-toolbar-text, inherit)',
            borderColor: 'var(--nova-toolbar-border, var(--nova-border-subtle))',
            borderTopWidth: 'var(--nova-toolbar-border-width, 1px)',
          } : undefined}
          className={`flex items-center px-3 py-1 gap-2 border-t overflow-x-auto no-scrollbar no-drag ${
            isIncognito ? 'bg-slate-800/80 border-slate-700/60 text-slate-300' : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-300'
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
                    : 'hover:bg-black/[0.06] dark:hover:bg-white/10'
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
                  <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent transition-colors" />
                )}
                <span className="truncate font-medium">{bookmark.title}</span>
              </button>
            ))
          ) : (
            <span className="text-[11px] opacity-60 italic px-2 py-0.5 select-none">
              Bookmarks will appear here. Press {isMac ? '⌘D' : 'Ctrl+D'} to bookmark the current page.
            </span>
          )}
        </div>
      )}
    </header>

    {/* TopBar Right-Click Context Menu */}
    {topBarContextMenu.isOpen &&
      typeof document !== 'undefined' &&
      createPortal(
        <div
          ref={topBarContextMenuRef}
          role="menu"
          aria-label="Toolbar context menu"
          style={{
            position: 'fixed',
            left: topBarContextMenu.x,
            top: topBarContextMenu.y,
            zIndex: 99999,
            ...(!isIncognito ? POPOVER_SURFACE_STYLE : {}),
          }}
          className={`min-w-[220px] rounded-xl shadow-xl border p-1.5 flex flex-col gap-0.5 select-none ${
            isIncognito
              ? 'bg-slate-900 border-slate-700 text-slate-100'
              : 'bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-100'
          }`}
        >
          {onOpenCustomizeMode && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setTopBarContextMenu(prev => ({ ...prev, isOpen: false }));
                onOpenCustomizeMode();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors text-left cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Customize Browser...</span>
              <span className="ml-auto text-[10px] opacity-55 font-mono">
                {isMac ? '⇧⌘E' : 'Ctrl+Shift+E'}
              </span>
            </button>
          )}
          {onToggleBookmarksBar && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setTopBarContextMenu(prev => ({ ...prev, isOpen: false }));
                onToggleBookmarksBar();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors text-left cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{showBookmarksBar ? 'Hide Bookmarks Bar' : 'Show Bookmarks Bar'}</span>
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setTopBarContextMenu(prev => ({ ...prev, isOpen: false }));
              onNewTab();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors text-left cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>New Tab</span>
          </button>
        </div>,
        document.body
      )}

    {/* Drag to Split Screen Ghost Tab */}
    {createPortal(
      <div
        ref={ghostElRef}
        className="fixed top-0 left-0 pointer-events-none z-[999999] opacity-90 transition-none"
        style={{ display: 'none', willChange: 'transform' }}
      >
        <div
          style={!isIncognito ? {
            background: 'var(--nova-popovers-bg, var(--nova-card-bg))',
            color: 'var(--nova-popovers-text, var(--foreground))',
            borderRadius: 'var(--nova-popovers-radius, 12px)',
          } : undefined}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-2xl border backdrop-blur-md ${
            isIncognito
              ? 'bg-slate-800/90 border-slate-600 text-slate-200'
              : 'bg-white/90 border-accent/50 text-slate-800 dark:bg-slate-800/90 dark:border-accent/50 dark:text-slate-200'
          }`}
        >
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
}, topBarPropsEqual);
