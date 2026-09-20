import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRight, PanelLeft, Columns2, ArrowLeftRight, X, Globe } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { BrowserView } from './components/BrowserView';
// Downloads / history / permission domains were extracted into hooks under
// src/hooks. The item types moved with them and are re-exported here so the
// existing `from '../App'` import paths (DownloadToast, DownloadsPopover,
// HistoryPage, BrowserView, syncService) keep resolving unchanged.
import { useDownloads } from './hooks/useDownloads';
import { useHistoryRecorder } from './hooks/useHistoryRecorder';
import { usePermissionRequests } from './hooks/usePermissionRequests';
import { useTabHibernation } from './hooks/useTabHibernation';
import type { 
  DownloadItem, 
  HistoryItem, 
  UserSettings, 
  BrowserDemoOptions, 
  VpnLocation, 
  Tab, 
  Folder, 
  Bookmark, 
  Extension, 
  Workspace, 
  ShortcutConfig,
  SavedPassword 
} from './types/browser';
import { defaultSettings } from './types/browser';
export type { DownloadItem, HistoryItem, UserSettings, BrowserDemoOptions, VpnLocation };
import { FindInPage } from './components/FindInPage';
import { DownloadToast } from './components/DownloadToast';
import { UpdateToast } from './components/UpdateToast';
import { AICursorOverlay } from './components/AICursorOverlay';
import { SidebarTabs } from './components/SidebarTabs';
import { isSafeNavigationUrl } from './utils/safeNavigation';
import { canMoveTabToFolder, repairTabFolderAssignments, reorderTabsWithinGroup } from './utils/verticalTabs';
import { generateId } from './utils/idGenerator';
import { safeParseArrayWithBackup, safeParseObjectWithBackup } from './utils/safeStorage';
import { showConfirm, showAlert } from './utils/confirmDialog';
import { matchesShortcut } from './utils/keyboardShortcuts';
import { useBookmarks } from './hooks/useBookmarks';
import { useVpn } from './hooks/useVpn';
import { useWorkspaces } from './hooks/useWorkspaces';
import { useSessionPersistence } from './hooks/useSessionPersistence';
import { useClosedTabs } from './hooks/useClosedTabs';
import { usePanels } from './hooks/usePanels';
import { useThemeLanguage } from './hooks/useThemeLanguage';
import { getElectronAPI } from './utils/electronBridge';

// Performance: Lazy load heavy modals and panels with resilient retry mechanism
const lazyWithRetry = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) => {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      console.warn('[LazyLoader] Dynamic import failed, attempting recovery...', err);
      await new Promise(r => setTimeout(r, 120));
      try {
        return await factory();
      } catch (retryErr) {
        if (typeof window !== 'undefined' && !sessionStorage.getItem('chunk_retry_triggered')) {
          sessionStorage.setItem('chunk_retry_triggered', 'true');
          window.location.reload();
        }
        throw retryErr;
      }
    }
  });
};

const ShareModal = lazyWithRetry(() => import('./components/ShareModal').then(m => ({ default: m.ShareModal })));
const ExtensionsModal = lazyWithRetry(() => import('./components/ExtensionsModal').then(m => ({ default: m.ExtensionsModal })));
const ScreenshotModal = lazyWithRetry(() => import('./components/ScreenshotModal').then(m => ({ default: m.ScreenshotModal })));
const ReaderMode = lazyWithRetry(() => import('./components/ReaderMode').then(m => ({ default: m.ReaderMode })));
const SidePanel = lazyWithRetry(() => import('./components/SidePanel').then(m => ({ default: m.SidePanel })));
const WorkspaceManager = lazyWithRetry(() => import('./components/WorkspaceManager').then(m => ({ default: m.WorkspaceManager })));
const HelpModal = lazyWithRetry(() => import('./components/HelpModal').then(m => ({ default: m.HelpModal })));
const AccountModal = lazyWithRetry(() => import('./components/AccountModal').then(m => ({ default: m.AccountModal })));
const Onboarding = lazyWithRetry(() => import('./components/Onboarding').then(m => ({ default: m.Onboarding })));
const SpotlightOmnibox = lazyWithRetry(() => import('./components/SpotlightOmnibox').then(m => ({ default: m.SpotlightOmnibox })));
const VpnPopover = lazyWithRetry(() => import('./components/VpnPopover').then(m => ({ default: m.VpnPopover })));

// VpnPopover requires an anchorRef prop, but no element ever attaches to it
// (the VPN toggle lives inside TopBar's more-menu, which is unmounted while
// closed), so the popover has always used its fallback positioning
// (top: 50, right: 80). This shared empty ref keeps that exact behavior
// without allocating a new object per render.
const VPN_ANCHOR_REF: React.RefObject<HTMLButtonElement> = { current: null };

import { aiAgent } from './services/aiAgent';
import { tabThumbnailCache } from './services/thumbnailCache';
import { syncService } from './services/syncService';
import { orchestrator } from './services/agentOrchestrator';
import { searchHistoryAndBookmarks, SearchableItem } from './utils/searchHistoryBookmarks';
import { logger } from './utils/logger';
import {
  EMPTY_ARRAY,
  normalizeAIActionPayload,
  getDemoParams,
  isMac,
  isWindows,
} from './utils/appConstants';

// Bag of latest event handler identities for mount-time IPC listeners.
// Listeners registered once with [] deps would otherwise capture stale
// mount-time closures; they read handlersRef.current instead (see below).
type AppEventHandlers = {
  handleNewTab: (url?: string | any, sourceTabId?: string, opts?: { reuseBlank?: boolean }) => void;
  handleNewIncognitoTab: (url?: string) => void;
  handleCloseTab: (id: string, e?: React.MouseEvent) => void;
  handleReopenClosedTab: () => void;
  closeAllModals: () => void;
  handleOpenSettings: () => void;
  handlePrintPage: () => void;
  handleOpenDevTools: () => void;
  handleReload: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleOpenHistory: () => void;
  handleOpenDownloads: () => void;
  handleToggleBookmarkActive: () => void;
  handleGoBack: () => void;
  handleGoForward: () => void;
};

function App({ demo: demoOptions }: { demo?: BrowserDemoOptions } = {}) {
  const demoParams = useMemo(() => {
    const queryParams = getDemoParams();
    if (!demoOptions) return queryParams;
    return {
      ...queryParams,
      ...demoOptions,
      isDemo: demoOptions.isDemo ?? queryParams.isDemo,
      feature: demoOptions.feature ?? queryParams.feature,
      bg: demoOptions.bg ?? queryParams.bg,
      theme: demoOptions.theme ?? queryParams.theme,
      tabs: demoOptions.tabs ?? queryParams.tabs,
      showTasksWidget: demoOptions.showTasksWidget ?? queryParams.showTasksWidget,
    };
  }, [demoOptions]);

  // Sync theme dynamically when running in an embedded demo iframe
  useEffect(() => {
    if (demoParams.isDemo) {
      const handleMessage = (e: MessageEvent) => {
        // Security: Validate message origin to prevent cross-origin state tampering
        if (e.origin) {
          try {
            const originUrl = new URL(e.origin);
            const isSameOrigin = e.origin === window.location.origin;
            const isOfficialPages = originUrl.protocol === 'https:' && (originUrl.hostname === 'unitybtw.github.io' || originUrl.hostname === 'novabrowser.pages.dev');
            const isLocal = (originUrl.protocol === 'http:' || originUrl.protocol === 'https:') && (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1');
            if (!isSameOrigin && !isOfficialPages && !isLocal) {
              return;
            }
          } catch (_) {
            return;
          }
        }
        if (e.data && e.data.type === 'NOVA_THEME_CHANGE') {
          const newTheme = e.data.theme === 'light' ? 'light' : 'dark';
          setSettings(s => ({ ...s, theme: newTheme }));
        }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [demoParams.isDemo]);



  const [tabs, setTabs] = useState<Tab[]>(() => {
    if (demoParams.isDemo) {
      if (demoParams.feature === 'ai') {
        return [
          { id: '1', url: 'https://github.com/unitybtw/nova-browser', title: 'Nova Browser - GitHub', isLoading: false, canGoBack: false, canGoForward: false },
          { id: '2', url: 'nova://newtab', title: 'New Tab', isLoading: false, canGoBack: false, canGoForward: false }
        ];
      }
      if (demoParams.feature === 'website') {
        return [
          { id: '1', url: 'nova://newtab', title: 'New Tab', isLoading: false, canGoBack: false, canGoForward: false },
          { id: '2', url: 'https://github.com/unitybtw/nova-browser', title: 'Nova Browser - GitHub', isLoading: false, canGoBack: false, canGoForward: false },
          { id: '3', url: 'https://react.dev', title: 'React Documentation', isLoading: false, canGoBack: false, canGoForward: false }
        ];
      }
      if (demoParams.feature === 'vertical_tabs') {
        return [
          { id: '1', url: 'https://react.dev', title: 'React 19 Docs', workspaceId: 'default', folderId: 'f1', isLoading: false, canGoBack: false, canGoForward: false },
          { id: '2', url: 'https://tailwindcss.com', title: 'Tailwind CSS v4', workspaceId: 'default', folderId: 'f1', isLoading: false, canGoBack: false, canGoForward: false },
          { id: '3', url: 'https://spotify.com', title: 'Spotify Web (Playing)', isMuted: false, workspaceId: 'default', isLoading: false, canGoBack: false, canGoForward: false },
          { id: '4', url: 'https://arxiv.org', title: 'ArXiv AI Papers', workspaceId: 'default', folderId: 'f2', isLoading: false, canGoBack: false, canGoForward: false }
        ];
      }
      if (demoParams.feature === 'split') {
        return [
          { id: '1', url: 'https://react.dev/reference/react', title: 'React Documentation', isLoading: false, splitWith: '2', canGoBack: false, canGoForward: false },
          { id: '2', url: 'https://tailwindcss.com/docs', title: 'Tailwind CSS Docs', isLoading: false, splitWith: '1', canGoBack: false, canGoForward: false }
        ];
      }
      if (demoParams.feature === 'shield') {
        return [
          { id: '1', url: 'https://techinsider.io/ai-revolution', title: 'Tech News & Privacy', blockedAdsCount: 148, isLoading: false, canGoBack: false, canGoForward: false },
          { id: '2', url: 'nova://newtab', title: 'New Tab', isLoading: false, canGoBack: false, canGoForward: false }
        ];
      }
    }

    const rawSettings = localStorage.getItem('user_settings');
    const parsedSettings = safeParseObjectWithBackup<Partial<UserSettings>>('user_settings', rawSettings, {});
    const startupBehavior = parsedSettings.startupBehavior || 'newTab';

    if (startupBehavior === 'continue') {
      const saved = localStorage.getItem('nova_session_tabs');
      const parsedTabs = safeParseArrayWithBackup<Tab>('nova_session_tabs', saved, []);
      if (parsedTabs.length > 0) {
        return parsedTabs.map((t, idx) => ({
          ...t,
          lastAccessed: t.lastAccessed || (Date.now() - (parsedTabs.length - idx) * 1000)
        }));
      }
    }

    return [
      {
        id: '1',
        url: 'nova://newtab',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        lastAccessed: Date.now()
      }
    ];
  });
  
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (demoParams.isDemo) return tabs[0]?.id || '1';
    const saved = localStorage.getItem('active_tab_session');
    if (saved && tabs.some(t => t.id === saved)) {
      return saved;
    }
    return tabs[0]?.id || '1';
  });
  const activeTabIdRef = useRef(activeTabId);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

  // Latest-tabs ref: lets handlers compute new arrays OUTSIDE setState updaters,
  // keeping every updater pure (React StrictMode double-invokes updater functions
  // in dev, so any side effect inside them would run twice).
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeSplitTabIdRef = useRef<string | null>(null);

  const {
    folders,
    setFolders,
    workspaces,
    setWorkspaces,
    workspacesRef,
    activeWorkspaceId,
    setActiveWorkspaceId,
    activeWorkspaceIdRef
  } = useWorkspaces({ isDemo: demoParams.isDemo, demoFeature: demoParams.feature });

  // Panel/modal visibility booleans live in usePanels; names are destructured
  // 1:1 so every reader below (IPC, shortcuts, handlers, JSX) is untouched.
  // screenshotDataUrl + helpInitialTab stay here: they are payload state, not
  // visibility booleans, owned by the screenshot capture / help openers below.
  const {
    isShareOpen,
    setIsShareOpen,
    isScreenshotOpen,
    setIsScreenshotOpen,
    isWorkspaceManagerOpen,
    setIsWorkspaceManagerOpen,
    isHelpOpen,
    setIsHelpOpen,
    isAccountModalOpen,
    setIsAccountModalOpen,
    isSidePanelOpen,
    setIsSidePanelOpen,
    isReaderModeOpen,
    setIsReaderModeOpen,
    isFindInPageOpen,
    setIsFindInPageOpen,
    isSpotlightOpen,
    setIsSpotlightOpen,
    isExtensionsOpen,
    setIsExtensionsOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    closeAllModals: closePanelModals,
  } = usePanels({ initialSidePanelOpen: demoParams.isDemo && demoParams.feature === 'ai' });
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [helpInitialTab, setHelpInitialTab] = useState<'help' | 'shortcuts' | 'ai' | 'privacy' | 'about'>('help');

  useEffect(() => {
    const visibleWorkspaceTabs = tabs.filter(tab =>
      (tab.workspaceId || 'default') === activeWorkspaceId
    );
    if (visibleWorkspaceTabs.length === 0 && !demoParams.isDemo) {
      const newTabId = generateId('tab');
      const initialWorkspaceTab: Tab = {
        id: newTabId,
        url: 'nova://newtab',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        workspaceId: activeWorkspaceId
      };
      setTabs(prev => [...prev, initialWorkspaceTab]);
      setActiveTabId(newTabId);
    } else if (visibleWorkspaceTabs.length > 0 && !visibleWorkspaceTabs.some(tab => tab.id === activeTabId)) {
      setActiveTabId(visibleWorkspaceTabs[0].id);
    }
  }, [tabs, activeTabId, activeWorkspaceId]);

  useEffect(() => {
    setTabs(prevTabs => repairTabFolderAssignments(prevTabs, folders));
  }, [folders]);

  // AI Assistant State (isSidePanelOpen lives in usePanels above)
  const [pendingAIActions, setPendingAIActions] = useState<Array<{ id: number; text: string }>>([]);
  const pendingAIActionIdRef = useRef(0);
  const queueAIAction = useCallback((detail: unknown) => {
    const text = normalizeAIActionPayload(detail);
    if (!text) return;
    setPendingAIActions(current => [
      ...current,
      { id: ++pendingAIActionIdRef.current, text }
    ]);
    setIsSidePanelOpen(true);
  }, []);
  const consumeAIAction = useCallback((id: number) => {
    setPendingAIActions(current => current.filter(action => action.id !== id));
  }, []);

  // isReaderModeOpen / isFindInPageOpen / isSpotlightOpen / isExtensionsOpen
  // live in usePanels above. isVpnPopoverOpen stays local: it is closed by
  // closeAllModals below, so the composed closer keeps the original set.
  const [isVpnPopoverOpen, setIsVpnPopoverOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [findMatches, setFindMatches] = useState<{ index: number; count: number }>({ index: 0, count: 0 });
  const [isDragOverMain, setIsDragOverMain] = useState(false);
  const [splitDragSide, setSplitDragSide] = useState<'left' | 'right'>('right');
  const [isDraggingTab, setIsDraggingTab] = useState(false);
  // isSidebarCollapsed lives in usePanels above.
  const [isHoverRevealing, setIsHoverRevealing] = useState(false);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHoverSidebarOpen = useCallback(() => {
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    setIsHoverRevealing(true);
  }, []);

  const handleHoverSidebarClose = useCallback(() => {
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = setTimeout(() => {
      setIsHoverRevealing(false);
    }, 280);
  }, []);

  const {
    vpnEnabled,
    setVpnEnabled,
    vpnLocations,
    vpnLocation,
    setVpnLocation,
    handleAddVpnLocation,
    handleRemoveVpnLocation,
  } = useVpn({ isDemo: demoParams.isDemo });

  // The standalone demo URL can run the animated showcase. Embedded demos
  // (the marketing website passes demo options directly) must stay stable so
  // visitors can interact with the real browser UI without tabs changing
  // underneath them.
  useEffect(() => {
    if (!demoParams.isDemo || demoOptions || (demoParams.feature !== 'default' && demoParams.feature !== 'tour')) return;

    let cycle = 0;
    const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    const schedule = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        pendingTimers.delete(timer);
        callback();
      }, delay);
      pendingTimers.add(timer);
    };

    const runCycle = () => {
      if (cycle === 0) {
        // Scene 1: arXiv AI Research + AI Sidepanel + Glowing Cursor
        setTabs([
          { id: '1', url: 'https://arxiv.org/list/cs.AI/recent', title: 'arXiv / cs.AI Research', isLoading: false, canGoBack: false, canGoForward: false },
          { id: '2', url: 'nova://newtab', title: 'New Tab', isLoading: false, canGoBack: false, canGoForward: false }
        ]);
        setActiveTabId('1');
        setIsSidePanelOpen(true);

        schedule(() => {
          window.dispatchEvent(new CustomEvent('ai-cursor', {
            detail: { x: Math.round(window.innerWidth * 0.35), y: 160, action: 'move' }
          }));
        }, 800);

        schedule(() => {
          window.dispatchEvent(new CustomEvent('ai-cursor', {
            detail: { x: Math.round(window.innerWidth * 0.35), y: 160, action: 'click' }
          }));
        }, 2200);
      } else if (cycle === 1) {
        // Scene 2: New Tab Page with Clock, Tasks, Speed Dials
        setIsSidePanelOpen(false);
        setActiveTabId('2');

        schedule(() => {
          window.dispatchEvent(new CustomEvent('ai-cursor', {
            detail: { x: Math.round(window.innerWidth * 0.5), y: 230, action: 'move' }
          }));
        }, 800);

        schedule(() => {
          window.dispatchEvent(new CustomEvent('ai-cursor', {
            detail: { x: Math.round(window.innerWidth * 0.5), y: 230, action: 'click' }
          }));
        }, 2000);
      } else if (cycle === 2) {
        // Scene 3: Dual Split Screen Multitasking (React 19 & Tailwind CSS)
        setIsSidePanelOpen(false);
        setTabs([
          { id: '1', url: 'https://react.dev/reference/react', title: 'React 19 Docs', isLoading: false, canGoBack: false, canGoForward: false, splitWith: '2' },
          { id: '2', url: 'https://tailwindcss.com/docs', title: 'Tailwind CSS Docs', isLoading: false, canGoBack: false, canGoForward: false, splitWith: '1' }
        ]);
        setActiveTabId('1');
      }

      cycle = (cycle + 1) % 3;
    };

    runCycle();
    const interval = setInterval(runCycle, 6500);

    return () => {
      clearInterval(interval);
      pendingTimers.forEach(timer => clearTimeout(timer));
      pendingTimers.clear();
    };
  }, [demoParams.isDemo]);

  // Load extensions on mount
  useEffect(() => {
    const fetchExtensions = async () => {
      try {
        if (window.electronAPI?.listExtensions) {
          const loaded = await window.electronAPI.listExtensions();
          setExtensions(loaded || []);
        }
      } catch (err) {
        console.error('Failed to load extensions', err);
      }
    };
    fetchExtensions();
    
    let cleanup: (() => void) | undefined;
    if (window.electronAPI?.onExtensionChanged) {
      cleanup = window.electronAPI.onExtensionChanged(() => {
        fetchExtensions();
      });
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Composed closer: hook-owned panels first (original relative order kept
  // inside usePanels: share → screenshot → spotlight → extensions → help →
  // account), then the App-local VPN popover. The pre-refactor order was
  // share → screenshot → spotlight → vpnPopover → extensions → help → account;
  // all are independent batched setState(false) calls so the rendered result
  // is identical.
  const closeAllModals = useCallback(() => {
    closePanelModals();
    setIsVpnPopoverOpen(false);
  }, [closePanelModals]);

  // Stays in App (not in usePanels): it must close the App-local vpnPopover
  // through closeAllModals above, so moving it would change behavior.
  const openModal = useCallback((modalName: 'share' | 'spotlight' | 'extensions') => {
    closeAllModals();
    if (modalName === 'share') setIsShareOpen(true);
    else if (modalName === 'spotlight') setIsSpotlightOpen(true);
    else if (modalName === 'extensions') setIsExtensionsOpen(true);
  }, [closeAllModals]);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    if (demoParams.isDemo) return false;
    const isCompleted = localStorage.getItem('nova_onboarding_complete') === 'true';
    const hasUserSettings = localStorage.getItem('user_settings') !== null;
    if (!hasUserSettings) {
      return true;
    }
    return !isCompleted;
  });

  useEffect(() => {
    (window as any).openOnboarding = () => setShowOnboarding(true);
    return () => {
      delete (window as any).openOnboarding;
    };
  }, []);

  // User settings
  const [settings, setSettings] = useState<UserSettings>(() => {
    const initialSettings: UserSettings = {
      ...defaultSettings,
      theme: demoParams.isDemo ? demoParams.theme : defaultSettings.theme,
      showTasksWidget: demoParams.showTasksWidget ?? (demoParams.feature === 'website' ? false : defaultSettings.showTasksWidget ?? true),
      useVerticalTabs: demoParams.isDemo
        ? demoParams.feature === 'website'
          ? false
          : demoParams.tabs === 'vertical'
        : defaultSettings.useVerticalTabs,
      newTabBackground: (demoParams.bg as any) || (demoParams.feature === 'vertical_tabs' ? 'cyber_grid' : demoParams.feature === 'ai' ? 'nebula' : defaultSettings.newTabBackground),
      shortcuts: {
        ...defaultSettings.shortcuts,
        downloads: { key: 'j', shift: isMac, meta: true },
        findInPage: { key: 'f', shift: false, meta: true },
      }
    };

    if (demoParams.isDemo) {
      return initialSettings;
    }

    const saved = localStorage.getItem('user_settings');
    const parsed = safeParseObjectWithBackup<Partial<UserSettings>>('user_settings', saved, {});
    const merged = { ...initialSettings, ...parsed };
    // Migration: ensure macOS users have shift: true for downloads shortcut if they had the legacy default shift: false
    // Preserve custom user settings: do NOT overwrite if the user has explicitly customized their shortcuts
    const isCustomized = localStorage.getItem('shortcuts_customized') === 'true';
    if (!isCustomized && isMac && merged.shortcuts?.downloads && merged.shortcuts.downloads.key === 'j' && merged.shortcuts.downloads.shift === false) {
      const migrated = localStorage.getItem('shortcuts_v2_migrated');
      if (!migrated) {
        merged.shortcuts = {
          ...merged.shortcuts,
          downloads: { key: 'j', shift: true, meta: true }
        };
        try {
          localStorage.setItem('shortcuts_v2_migrated', 'true');
        } catch (_) {}
      }
    }
    return merged;
  });
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    if (typeof window !== 'undefined' && getElectronAPI()?.onAdBlockedBatch) {
      const removeListener = getElectronAPI()?.onAdBlockedBatch((_event: any, batch: Record<number, number>) => {
        setTabs(prev => {
          let changed = false;
          const updated = prev.map(t => {
            const count = t.webContentsId !== undefined ? batch[t.webContentsId] : undefined;
            if (count) {
              changed = true;
              return { ...t, blockedAdsCount: (t.blockedAdsCount || 0) + count };
            }
            return t;
          });
          // Identity guard: batches that don't hit any mounted tab (e.g. this
          // fires every 2s per ad-blocking tab, including background ones)
          // must not allocate a new array — returning prev lets React bail
          // out of the re-render entirely.
          return changed ? updated : prev;
        });
      });
      return () => removeListener?.();
    }
  }, []);

  // Listen for native Chromium webview audio state updates from Electron main process
  useEffect(() => {
    if (typeof window !== 'undefined' && getElectronAPI()?.onTabAudioChanged) {
      const removeListener = getElectronAPI()?.onTabAudioChanged((_event: any, { webContentsId, isPlayingAudio }: { webContentsId: number; isPlayingAudio: boolean }) => {
        setTabs(prevTabs => {
          let changed = false;
          const updated = prevTabs.map(tab => {
            if (tab.webContentsId === webContentsId) {
              // Same-value events (duplicate media notifications) must not
              // rebuild the tabs array — return prev so React bails out.
              if (tab.isPlayingAudio === isPlayingAudio) return tab;
              changed = true;
              return { ...tab, isPlayingAudio };
            }
            return tab;
          });
          return changed ? updated : prevTabs;
        });
      });
      return () => {
        try {
          removeListener?.();
        } catch (_) {}
      };
    }
  }, []);

  // Permission requests state (Chrome-style top bar prompts) + onPermissionRequest
  // IPC listener + respond/dismiss handlers (extracted to usePermissionRequests)
  const { permissionRequests, handleRespondPermission, handleDismissPermission } = usePermissionRequests();

  // Downloads state + onDownloadUpdate IPC listener with ~100ms progress batching
  // + clear handler (extracted to useDownloads)
  const { downloads, handleClearDownloads } = useDownloads();

  // History state + debounced (~2s) localStorage persistence + navigation
  // recorder that handleUpdateTab calls OUTSIDE the tabs updater
  // (extracted to useHistoryRecorder)
  const { history, setHistory, recordVisit, flushHistory, clearHistory: handleClearHistory, removeHistoryItem: handleRemoveHistoryItem } = useHistoryRecorder({ isDemo: demoParams.isDemo });

  const foldersRef = useRef(folders);
  useEffect(() => { foldersRef.current = folders; }, [folders]);
  const {
    bookmarks,
    setBookmarks,
    bookmarksRef,
    handleToggleBookmark,
    flushBookmarks
  } = useBookmarks({ isDemo: demoParams.isDemo });

  // Session persistence writes (debounced settings/tabs/active-tab + beforeunload
  // flush-all) extracted to useSessionPersistence — order/timing/keys preserved 1:1.
  useSessionPersistence({
    tabs,
    settings,
    activeTabId,
    tabsRef,
    activeTabIdRef,
    foldersRef,
    settingsRef,
    bookmarksRef,
    workspacesRef,
    activeWorkspaceIdRef,
    flushHistory,
    flushBookmarks,
    isDemo: demoParams.isDemo,
  });

  // Tab list reconciliation: ensure at least one tab exists and activeTabId is valid
  useEffect(() => {
    if (tabs.length === 0) {
      const fallbackId = generateId('tab');
      setTabs([{
        id: fallbackId,
        url: 'nova://newtab',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        lastAccessed: Date.now()
      }]);
      setActiveTabId(fallbackId);
    } else if (!tabs.some(t => t.id === activeTabId)) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  // Tema + dil yan etkileri useThemeLanguage hookunda (birebir tasindi; ayni committe calisir, flash yok).
  useThemeLanguage({ settings });
  

  // Disk-backed storage hydration fallback: if localStorage was cleared, corrupted,
  // or exceeded quota, restore session tabs, folders, workspaces, bookmarks and user settings
  // from Electron disk store.
  useEffect(() => {
    if (demoParams.isDemo) return;
    const restoreFromDisk = async () => {
      try {
        const electronStore = getElectronAPI();
        if (!electronStore?.storeGet) return;

        // Restore settings if missing from localStorage
        if (!localStorage.getItem('user_settings')) {
          const diskSettings = await electronStore.storeGet('user_settings');
          if (diskSettings) {
            try {
              const parsed = JSON.parse(diskSettings);
              if (parsed && typeof parsed === 'object') {
                setSettings(prev => ({ ...prev, ...parsed }));
                localStorage.setItem('user_settings', diskSettings);
              }
            } catch (err) {
              logger.warn('App:Storage', 'Failed to parse diskSettings from storage', err);
            }
          }
        }

        // Restore workspaces if missing
        if (!localStorage.getItem('workspaces_session')) {
          const diskWorkspaces = await electronStore.storeGet('workspaces_session');
          if (diskWorkspaces) {
            try {
              const parsed = JSON.parse(diskWorkspaces);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setWorkspaces(parsed);
                localStorage.setItem('workspaces_session', diskWorkspaces);
              }
            } catch (err) {
              logger.warn('App:Storage', 'Failed to parse diskWorkspaces from storage', err);
            }
          }
        }

        // Restore folders if missing
        if (!localStorage.getItem('folders_session')) {
          const diskFolders = await electronStore.storeGet('folders_session');
          if (diskFolders) {
            try {
              const parsed = JSON.parse(diskFolders);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setFolders(parsed);
                localStorage.setItem('folders_session', diskFolders);
              }
            } catch (err) {
              logger.warn('App:Storage', 'Failed to parse diskFolders from storage', err);
            }
          }
        }

        // Restore bookmarks if missing
        if (!localStorage.getItem('bookmarks')) {
          const diskBookmarks = await electronStore.storeGet('bookmarks');
          if (diskBookmarks) {
            try {
              const parsed = JSON.parse(diskBookmarks);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setBookmarks(parsed);
                localStorage.setItem('bookmarks', diskBookmarks);
              }
            } catch (err) {
              logger.warn('App:Storage', 'Failed to parse diskBookmarks from storage', err);
            }
          }
        }

        // Restore tabs if missing
        if (!localStorage.getItem('nova_session_tabs')) {
          const diskTabs = await electronStore.storeGet('session_tabs');
          if (diskTabs) {
            try {
              const parsed = JSON.parse(diskTabs);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setTabs(parsed);
                localStorage.setItem('nova_session_tabs', diskTabs);
              }
            } catch (err) {
              logger.warn('App:Storage', 'Failed to parse diskTabs from storage', err);
            }
          }
        }
      } catch (err) {
        logger.warn('App:Storage', 'Fallback restore from disk encountered an error', err);
      }
    };

    restoreFromDisk();
  }, []);

  // Cloud Sync Handler
  const handlePerformSync = useCallback(async (providedMergedData?: any) => {
    try {
      if (providedMergedData) {
        if (providedMergedData.bookmarks && Array.isArray(providedMergedData.bookmarks)) {
          setBookmarks(providedMergedData.bookmarks);
        }
        if (providedMergedData.folders && Array.isArray(providedMergedData.folders)) {
          setFolders(providedMergedData.folders);
        }
        if (providedMergedData.history && Array.isArray(providedMergedData.history)) {
          setHistory(providedMergedData.history);
        }
        if (providedMergedData.settings && typeof providedMergedData.settings === 'object') {
          setSettings(prev => ({ ...prev, ...providedMergedData.settings }));
        }
        if (providedMergedData.workspaces && Array.isArray(providedMergedData.workspaces)) {
          setWorkspaces(providedMergedData.workspaces);
        }
        return;
      }

      let localPasswords: SavedPassword[] = [];
      try {
        const rawP = await getElectronAPI()?.secureStoreGet?.('passwords');
        if (rawP) localPasswords = JSON.parse(rawP);
      } catch (err) {
        logger.warn('App:Sync', 'Failed to retrieve or parse secure passwords for sync', err);
      }

      const syncResult = await syncService.syncData({
        bookmarks,
        folders,
        history,
        passwords: localPasswords,
        settings,
        workspaces
      });

      if (syncResult && syncResult.mergedData) {
        const { mergedData } = syncResult;
        setBookmarks(mergedData.bookmarks);
        setFolders(mergedData.folders);
        setHistory(mergedData.history);
        setSettings(mergedData.settings);
        setWorkspaces(mergedData.workspaces);

        if (mergedData.passwords && getElectronAPI()?.secureStoreSet) {
          await getElectronAPI()?.secureStoreSet('passwords', JSON.stringify(mergedData.passwords));
        }
      }
    } catch (err) {
      console.error('[NovaSync] Sync execution failed:', err);
      throw err;
    }
  }, [bookmarks, folders, history, settings, workspaces]);

  // Background auto-sync on initial app load if already authenticated
  useEffect(() => {
    const status = syncService.getStatus();
    if (status.isLoggedIn) {
      const timer = setTimeout(() => {
        handlePerformSync().catch(() => {});
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [handlePerformSync]);

  // Realtime Supabase change listener across other active devices
  useEffect(() => {
    const unsubscribe = syncService.onRemoteChange(() => {
      console.log('[NovaSync] Triggering background pull for remote changes');
      handlePerformSync().catch(() => {});
    });
    return () => { unsubscribe(); };
  }, [handlePerformSync]);

  // Kapalı-sekme-geri-al (undo close) stack'i — hook'a taşındı, davranış aynen korunur.
  // Tab oluşturma (id-collision/workspace switch/setTabs) hook'a taşınmadı;
  // onReopen callback'i olarak burada kalır.
  const {
    closedTabsStack,
    pushClosedTab,
    pushClosedTabs,
    reopenLastClosed,
  } = useClosedTabs({
    onReopen: (lastTab) => {
      let tabToRestore = lastTab;
      if (tabsRef.current.some(t => t.id === lastTab.id)) {
        tabToRestore = { ...lastTab, id: generateId('tab') };
      }
      const tabWs = tabToRestore.workspaceId || 'default';
      if (tabWs !== (activeWorkspaceIdRef.current || 'default')) {
        setActiveWorkspaceId(tabWs);
      }
      setTabs(prev => [...prev, tabToRestore]);
      setActiveTabId(tabToRestore.id);
    },
  });

  // Active Tab & Derived Split Partner Tab
  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId) || tabs[0], [tabs, activeTabId]);
  const splitTabId = useMemo(() => {
    if (!activeTab || !activeTab.splitWith) return null;
    const partner = tabs.find(t => t.id === activeTab.splitWith);
    return partner ? partner.id : null;
  }, [activeTab, tabs]);
  activeSplitTabIdRef.current = splitTabId;

  // Select/focus tab & reset hibernation timer
  const handleSelectTab = useCallback((id: string) => {
    // Performance: skip the setTabs cascade when re-selecting the active tab
    // unless it needs waking from hibernation.
    if (id === activeTabIdRef.current && !tabsRef.current.find(t => t.id === id)?.isSuspended) {
      return;
    }
    if (!tabsRef.current.some(t => t.id === id)) return;
    setActiveTabId(id);
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isSuspended: false, lastAccessed: Date.now() } : t));
  }, []);

  // Manual tab suspension
  const handleSuspendTab = useCallback((id: string) => {
    setTabs(prev => prev.map(t => (t.id === id && t.id !== activeTabId && t.id !== splitTabId && !t.isPlayingAudio) ? { ...t, isSuspended: true } : t));
  }, [activeTabId, splitTabId]);

  // Instant RAM & Cache Purge Engine
  const handlePurgeMemory = useCallback(async () => {
    // 1. Suspend all background inactive tabs immediately
    setTabs(prev => prev.map(t => (t.id !== activeTabId && t.id !== splitTabId && !t.isPlayingAudio && !t.isPinned) ? { ...t, isSuspended: true } : t));
    // 2. Clear thumbnail memory cache
    tabThumbnailCache.clear();
    // 3. Terminate background AI worker and release GPU VRAM
    try {
      await aiAgent.unload();
    } catch (err) {
      console.warn('Purge AI worker error:', err);
    }
    // 4. Invoke native Electron session cache purge & host resolver trim
    try {
      if (getElectronAPI()?.purgeSystemMemory) {
        await getElectronAPI()?.purgeSystemMemory();
      }
    } catch (err) {
      console.error('Purge system memory error:', err);
    }
  }, [activeTabId, splitTabId]);

  // Tab hibernation motoru (idle-30sn timer + LRU-6 / staggered-wake) — hook'a taşındı, davranış aynen korunur.
  useTabHibernation({
    tabs,
    tabsRef,
    setTabs,
    activeTabId,
    activeTabIdRef,
    splitTabId,
    splitRef: activeSplitTabIdRef,
    settings,
    isDemo: demoParams.isDemo,
  });

  // Tab Close Handler (Graceful Navigation & Multi-Process Cleanup)
  // All side effects (closed-tabs stack, active-tab selection, incognito session
  // cleanup) are computed from tabsRef OUTSIDE the setState updater so every
  // updater stays pure (StrictMode double-invokes updater functions in dev).
  const handleCloseTab = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    tabThumbnailCache.remove(id);
    const prevTabs = tabsRef.current;
    const targetTab = prevTabs.find(t => t.id === id);
    const activeWs = activeWorkspaceIdRef.current || 'default';
    const workspaceTabs = prevTabs.filter(t => (t.workspaceId || 'default') === activeWs);
    if (workspaceTabs.length <= 1 && workspaceTabs.some(t => t.id === id)) {
      if (targetTab?.isIncognito && getElectronAPI()?.clearIncognitoSession) {
        getElectronAPI()?.clearIncognitoSession(targetTab.id)?.catch((e: any) => console.error(e));
        const remainingIncognitoTabs = prevTabs.some(t => t.isIncognito && t.id !== id);
        if (!remainingIncognitoTabs) {
          getElectronAPI()?.clearIncognitoSession()?.catch((e: any) => console.error(e));
        }
      }
      if (targetTab && (targetTab.url !== 'nova://newtab' || targetTab.canGoBack)) {
        pushClosedTab(targetTab);
      }
      // Reset sole tab in place without unmounting or regenerating tab ID.
      // This prevents animation glitching, unmount/remount churn, and rightward drift.
      setTabs(prev => prev.map(t => {
        if (t.id === id) {
          return {
            ...t,
            url: 'nova://newtab',
            title: 'New Tab',
            isLoading: false,
            canGoBack: false,
            canGoForward: false,
            favicon: undefined,
            splitWith: undefined,
            isPinned: false,
            folderId: undefined,
            zoomFactor: undefined,
            isMuted: false,
            lastAccessed: Date.now()
          };
        }
        return t.splitWith === id ? { ...t, splitWith: undefined } : t;
      }));
      setActiveTabId(id);
      return;
    }

    if (prevTabs.length <= 1) {
      if (targetTab?.isIncognito && getElectronAPI()?.clearIncognitoSession) {
        getElectronAPI()?.clearIncognitoSession(targetTab.id)?.catch((e: any) => console.error(e));
        const remainingIncognitoTabs = prevTabs.some(t => t.isIncognito && t.id !== id);
        if (!remainingIncognitoTabs) {
          getElectronAPI()?.clearIncognitoSession()?.catch((e: any) => console.error(e));
        }
      }
      if (targetTab && (targetTab.url !== 'nova://newtab' || targetTab.canGoBack)) {
        pushClosedTab(targetTab);
      }
      setTabs(prev => prev.map(t => ({
        ...t,
        url: 'nova://newtab',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        favicon: undefined,
        splitWith: undefined,
        isPinned: false,
        folderId: undefined,
        zoomFactor: undefined,
        isMuted: false,
        lastAccessed: Date.now()
      })));
      return;
    }

    const targetIdx = prevTabs.findIndex(t => t.id === id);
    const newTabs = prevTabs
      .filter(t => t.id !== id)
      .map(t => t.splitWith === id ? { ...t, splitWith: undefined } : t);

    if (targetTab) {
      pushClosedTab(targetTab);
    }

    if (activeTabIdRef.current === id && newTabs.length > 0) {
      const partnerTab = targetTab?.splitWith ? newTabs.find(t => t.id === targetTab.splitWith) : null;
      if (partnerTab) {
        setActiveTabId(partnerTab.id);
      } else {
        const targetWs = targetTab?.workspaceId || activeWs;
        const remainingWsTabs = newTabs.filter(t => (t.workspaceId || 'default') === targetWs);
        if (remainingWsTabs.length > 0) {
          const wsTargetIdx = workspaceTabs.findIndex(t => t.id === id);
          const nextWsIdx = Math.min(Math.max(0, wsTargetIdx), remainingWsTabs.length - 1);
          setActiveTabId(remainingWsTabs[nextWsIdx].id);
        } else {
          const nextActiveIdx = Math.min(Math.max(0, targetIdx), newTabs.length - 1);
          setActiveTabId(newTabs[nextActiveIdx].id);
        }
      }
    }

    // If closing an incognito tab, always clear that tab's specific partition immediately.
    // If no more incognito tabs remain, also clear the legacy shared partition for safety.
    if (targetTab?.isIncognito) {
      if (getElectronAPI()?.clearIncognitoSession) {
        getElectronAPI()?.clearIncognitoSession(targetTab.id)?.catch((e: any) => console.error(e));
      }
      const remainingIncognitoTabs = newTabs.some(t => t.isIncognito);
      if (!remainingIncognitoTabs && getElectronAPI()?.clearIncognitoSession) {
        getElectronAPI()?.clearIncognitoSession()?.catch((e: any) => console.error(e));
      }
    }

    setTabs(newTabs);
  }, [activeWorkspaceId, pushClosedTab]);

  // Tab Reordering (Drag and Drop)
  const handleReorderTabs = useCallback((draggedId: string, targetId: string) => {
    const nextTabs = reorderTabsWithinGroup(tabsRef.current, draggedId, targetId);
    if (nextTabs !== tabsRef.current) setTabs(nextTabs);
  }, []);

  const handleReorderFullList = useCallback((reorderedWorkspaceTabs: Tab[]) => {
    setTabs(prevTabs => {
      const activeWs = activeWorkspaceId || 'default';
      const workspaceIds = new Set(reorderedWorkspaceTabs.map(t => t.id));
      const nonWorkspaceTabs = prevTabs.filter(t => !workspaceIds.has(t.id) && (t.workspaceId || 'default') !== activeWs);
      // Guarantee any tab from the current workspace that was omitted is preserved
      const missingWorkspaceTabs = prevTabs.filter(t => (t.workspaceId || 'default') === activeWs && !workspaceIds.has(t.id));
      return [...reorderedWorkspaceTabs, ...missingWorkspaceTabs, ...nonWorkspaceTabs];
    });
  }, [activeWorkspaceId]);

  const handleDuplicateTab = useCallback((tabId: string) => {
    // Compute from tabsRef OUTSIDE the updater (StrictMode-safe)
    const prev = tabsRef.current;
    const idx = prev.findIndex(t => t.id === tabId);
    if (idx === -1) return;
    const original = prev[idx];
    const newTab: Tab = {
      ...original,
      id: generateId('tab'),
      title: original.title,
      url: original.url,
      favicon: original.favicon,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isPinned: false,
      splitWith: undefined
    };
    const newTabs = [...prev];
    newTabs.splice(idx + 1, 0, newTab);
    setTabs(newTabs);
    setActiveTabId(newTab.id);
  }, []);

  const handleTogglePinTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const target = prev.find(t => t.id === tabId);
      if (!target) return prev;
      const willPin = !target.isPinned;
      const targetWs = target.workspaceId || 'default';
      const updated = prev.map(t => t.id === tabId ? { ...t, isPinned: willPin } : t);
      // Re-sort only within the target workspace, preserving workspace boundaries
      const wsTabs = updated.filter(t => (t.workspaceId || 'default') === targetWs);
      const wsPinned = wsTabs.filter(t => t.isPinned);
      const wsUnpinned = wsTabs.filter(t => !t.isPinned);
      const sortedWsTabs = [...wsPinned, ...wsUnpinned];

      let wsIdx = 0;
      return updated.map(t => {
        if ((t.workspaceId || 'default') === targetWs) {
          return sortedWsTabs[wsIdx++];
        }
        return t;
      });
    });
  }, []);

  const handleCloseOtherTabs = useCallback((tabId: string) => {
    // Compute from tabsRef OUTSIDE the updater (StrictMode-safe)
    const prev = tabsRef.current;
    const target = prev.find(t => t.id === tabId);
    if (!target) return;
    const targetWs = target.workspaceId || 'default';
    const toClose = prev.filter(t => (t.workspaceId || 'default') === targetWs && t.id !== tabId && !t.isPinned);
    toClose.forEach(t => tabThumbnailCache.remove(t.id));
    pushClosedTabs(toClose);
    const toKeep = prev.filter(t => !toClose.some(c => c.id === t.id));
    setActiveTabId(tabId);
    setTabs(toKeep);
  }, [pushClosedTabs]);

  const handleCloseTabsToRight = useCallback((index: number) => {
    // Compute from tabsRef OUTSIDE the updater (StrictMode-safe)
    const prev = tabsRef.current;
    const activeWs = activeWorkspaceIdRef.current || 'default';
    const wsTabs = prev.filter(t => (t.workspaceId || 'default') === activeWs);
    if (index < 0 || index >= wsTabs.length - 1) return;
    const targetTab = wsTabs[index];
    const tabsToClose = wsTabs.slice(index + 1).filter(t => !t.isPinned);
    const closeIds = new Set(tabsToClose.map(t => t.id));
    closeIds.forEach(id => tabThumbnailCache.remove(id));
    pushClosedTabs(tabsToClose);
    const nextTabs = prev.filter(t => !closeIds.has(t.id));
    if (!nextTabs.some(t => t.id === activeTabIdRef.current)) {
      setActiveTabId(targetTab.id);
    }
    setTabs(nextTabs);
  }, [pushClosedTabs]);

  const handleNewTabRight = useCallback((index: number) => {
    const prev = tabsRef.current;
    const activeWs = activeWorkspaceIdRef.current || 'default';
    const wsTabs = prev.filter(t => (t.workspaceId || 'default') === activeWs);
    const targetTab = (index >= 0 && index < wsTabs.length) ? wsTabs[index] : (index >= 0 && index < prev.length ? prev[index] : undefined);
    const targetWs = targetTab?.workspaceId || activeWs;

    const newId = generateId('tab');
    const newTab: Tab = {
      id: newId,
      url: 'nova://newtab',
      title: 'New Tab',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      lastAccessed: Date.now(),
      workspaceId: targetWs
    };
    setTabs(prevTabs => {
      const newTabs = [...prevTabs];
      if (targetTab) {
        const globalIdx = newTabs.findIndex(t => t.id === targetTab.id);
        if (globalIdx !== -1) {
          newTabs.splice(globalIdx + 1, 0, newTab);
          return newTabs;
        }
      }
      newTabs.push(newTab);
      return newTabs;
    });
    setActiveTabId(newId);
  }, []);

  const handlePrintPage = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.print) {
      try {
        webview.print();
      } catch (err) {
        console.error('Print error:', err);
      }
    } else {
      window.print();
    }
  }, [activeTabId]);

  const handleOpenDevTools = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.openDevTools) {
      try {
        if (webview.isDevToolsOpened?.()) {
          webview.closeDevTools();
        } else {
          webview.openDevTools({ mode: 'right' });
        }
      } catch (err) {
        console.error('DevTools error:', err);
      }
    }
  }, [activeTabId]);

  // Pop + restore: stack hook'ta, tab oluşturma onReopen callback'inde (yukarıda).
  const handleReopenClosedTab = useCallback(() => {
    reopenLastClosed();
  }, [reopenLastClosed]);



  // Ref holding the LATEST handler identities for the mount-time listeners below.
  // Re-assigned every render (see assignment after all handlers are defined) so
  // listeners registered once with [] deps never invoke stale closures
  // (e.g. ⌘T creating a tab in a stale workspace, ⌘W closing a stale active tab).
  const handlersRef = useRef<AppEventHandlers>(null!);

  // Listen to IPC events from main process (Shortcuts; downloads moved to
  // useDownloads) with cleanups
  useEffect(() => {
    let cleanupShortcut: (() => void) | void;
    let cleanupNewTab: (() => void) | void;

    if (window.electronAPI?.onShortcut) {
      cleanupShortcut = window.electronAPI.onShortcut((_event: any, command: string) => {
        if (command === 'search' || command === 'toggle-omnibox') {
          setIsSpotlightOpen(prev => !prev);
        } else if (command === 'new-tab') {
          handlersRef.current.handleNewTab();
        } else if (command === 'new-incognito') {
          handlersRef.current.handleNewIncognitoTab();
        } else if (command === 'close-tab') {
          if (activeTabIdRef.current) handlersRef.current.handleCloseTab(activeTabIdRef.current);
        } else if (command === 'reopen-tab') {
          handlersRef.current.handleReopenClosedTab();
        } else if (command === 'open-help') {
          handlersRef.current.closeAllModals();
          setHelpInitialTab('help');
          setIsHelpOpen(true);
        } else if (command === 'shortcuts-help') {
          handlersRef.current.closeAllModals();
          setHelpInitialTab('shortcuts');
          setIsHelpOpen(true);
        } else if (command === 'ai-help') {
          handlersRef.current.closeAllModals();
          setHelpInitialTab('ai');
          setIsHelpOpen(true);
        } else if (command === 'privacy-help') {
          handlersRef.current.closeAllModals();
          setHelpInitialTab('privacy');
          setIsHelpOpen(true);
        } else if (command === 'about-help') {
          handlersRef.current.closeAllModals();
          setHelpInitialTab('about');
          setIsHelpOpen(true);
        } else if (command === 'settings') {
          handlersRef.current.handleOpenSettings();
        } else if (command === 'focus-url') {
          const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        } else if (command === 'print') {
          handlersRef.current.handlePrintPage();
        } else if (command === 'devtools') {
          handlersRef.current.handleOpenDevTools();
        } else if (command === 'reload' || command === 'force-reload') {
          handlersRef.current.handleReload();
        } else if (command === 'zoom-in') {
          handlersRef.current.handleZoomIn();
        } else if (command === 'zoom-out') {
          handlersRef.current.handleZoomOut();
        } else if (command === 'zoom-reset') {
          handlersRef.current.handleResetZoom();
        } else if (command === 'history') {
          handlersRef.current.handleOpenHistory();
        } else if (command === 'downloads') {
          handlersRef.current.handleOpenDownloads();
        } else if (command === 'whats-new' || command === 'changelog') {
          handlersRef.current.handleNewTab('nova://changelog', undefined, { reuseBlank: false });
        } else if (command === 'bookmark') {
          handlersRef.current.handleToggleBookmarkActive();
        } else if (command === 'toggle-bookmarks-bar') {
          setSettings(s => ({ ...s, showBookmarksBar: !s.showBookmarksBar }));
        } else if (command === 'find') {
          setIsFindInPageOpen(prev => !prev);
        } else if (command === 'go-back') {
          handlersRef.current.handleGoBack();
        } else if (command === 'go-forward') {
          handlersRef.current.handleGoForward();
        }
      });
    }

    let cleanupNewIncognitoTab: any = null;
    let cleanupQuickAI: any = null;

    if (window.electronAPI?.onNewTab) {
      cleanupNewTab = window.electronAPI.onNewTab((_event: any, url: string) => {
        handlersRef.current.handleNewTab(url, undefined, { reuseBlank: false });
      });
    }

    if (getElectronAPI()?.onNewIncognitoTab) {
      cleanupNewIncognitoTab = getElectronAPI()?.onNewIncognitoTab((_event: any, url?: string) => {
        handlersRef.current.handleNewIncognitoTab(url);
      });
    }

    if (getElectronAPI()?.onQuickAIAction) {
      cleanupQuickAI = getElectronAPI()?.onQuickAIAction((_event: any, text: string) => {
        queueAIAction(`Explain or summarize this selection:\n\n"${typeof text === 'string' ? text : ''}"`);
      });
    }

    const handleQuickAIAction = (event: Event) => {
      queueAIAction((event as CustomEvent).detail);
    };
    let cleanupExtInstall: (() => void) | void;
    if (getElectronAPI()?.onExtensionInstalledSilently) {
      cleanupExtInstall = getElectronAPI()?.onExtensionInstalledSilently((_event: any, data: any) => {
        if (data.success) {
          void showAlert({ title: 'Extensions', message: `Extension successfully installed: ${data.name}` });
        }
      });
    }

    const handleOpenSidePanel = () => setIsSidePanelOpen(true);
    const handleOpenWorkspaceManager = () => setIsWorkspaceManagerOpen(true);
    const handleOpenAccountModal = () => setIsAccountModalOpen(true);
    const handleOpenChangelog = () => handlersRef.current.handleNewTab('nova://changelog', undefined, { reuseBlank: false });
    
    window.addEventListener('ai-quick-action', handleQuickAIAction);
    window.addEventListener('open-ai-sidepanel', handleOpenSidePanel);
    window.addEventListener('open-workspace-manager', handleOpenWorkspaceManager);
    window.addEventListener('open-account-modal', handleOpenAccountModal);
    window.addEventListener('open-changelog', handleOpenChangelog);

    return () => {
      if (typeof cleanupShortcut === 'function') cleanupShortcut();
      if (typeof cleanupNewTab === 'function') cleanupNewTab();
      if (typeof cleanupNewIncognitoTab === 'function') cleanupNewIncognitoTab();
      if (typeof cleanupQuickAI === 'function') cleanupQuickAI();
      if (typeof cleanupExtInstall === 'function') cleanupExtInstall();
      window.removeEventListener('ai-quick-action', handleQuickAIAction);
      window.removeEventListener('open-ai-sidepanel', handleOpenSidePanel);
      window.removeEventListener('open-workspace-manager', handleOpenWorkspaceManager);
      window.removeEventListener('open-account-modal', handleOpenAccountModal);
      window.removeEventListener('open-changelog', handleOpenChangelog);
    };
  }, []);

  // Folder Management
  const handleCreateFolder = useCallback(() => {
    const newFolder: Folder = {
      id: generateId('folder'),
      name: 'New Folder',
      isExpanded: true,
      workspaceId: activeWorkspaceId
    };
    setFolders(prev => [...prev, newFolder]);
  }, [activeWorkspaceId]);

  const handleToggleFolder = useCallback((folderId: string) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f));
  }, []);

  const handleRenameFolder = useCallback((folderId: string, name: string) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name } : f));
  }, []);

  const handleDeleteFolder = useCallback((folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    // Remove folderId from all tabs that were in this folder
    setTabs(prev => prev.map(t => t.folderId === folderId ? { ...t, folderId: undefined } : t));
  }, []);

  const handleMoveTabToFolder = useCallback((tabId: string, folderId?: string) => {
    const targetTab = tabsRef.current.find(tab => tab.id === tabId);
    if (!targetTab) return;

    if (!canMoveTabToFolder(targetTab, folderId, folders)) return;

    setTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, folderId } : tab));
  }, [folders]);

  const handleNewTab = useCallback((url?: string | any, sourceTabId?: string, opts?: { reuseBlank?: boolean }) => {
    let finalUrl = typeof url === 'string' ? url : 'nova://newtab';
    
    // Security: Block malicious protocols (shared blocklist — see safeNavigation.ts)
    if (!isSafeNavigationUrl(finalUrl)) {
      finalUrl = 'nova://newtab';
    }
    
    // Extensions page handling: open extensions modal directly
    if (finalUrl === 'nova://extensions' || finalUrl === 'chrome://extensions') {
      setIsExtensionsOpen(true);
      return;
    }
    
    let initialTitle = 'New Tab';
    if (finalUrl.startsWith('nova://settings')) initialTitle = 'Settings';
    else if (finalUrl.startsWith('nova://history')) initialTitle = 'History';
    else if (finalUrl.startsWith('nova://downloads')) initialTitle = 'Downloads';
    else if (finalUrl.startsWith('nova://changelog') || finalUrl.startsWith('nova://whats-new')) initialTitle = "What's New";

    // If target/current tab is an unnavigated empty "New Tab" and url is specific (e.g. settings, history),
    // navigate current tab instead of spawning a redundant new tab
    const targetSourceId = sourceTabId || activeTabIdRef.current;
    const currentTarget = tabsRef.current.find(t => t.id === targetSourceId);
    const isCurrentBlank = currentTarget && 
      (currentTarget.url === 'nova://newtab' || currentTarget.url === 'about:blank' || !currentTarget.url) &&
      !currentTarget.isLoading &&
      !currentTarget.canGoBack;

    if (isCurrentBlank && finalUrl !== 'nova://newtab' && (opts?.reuseBlank ?? true)) {
      setTabs(prev => prev.map(tab => tab.id === currentTarget.id ? {
        ...tab,
        url: finalUrl,
        title: initialTitle
      } : tab));
      setActiveTabId(currentTarget.id);
      return;
    }
    
    const newTab: Tab = {
      id: generateId('tab'),
      url: finalUrl,
      title: initialTitle,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      workspaceId: activeWorkspaceId,
      // intentional: matches Chrome (new tabs inherit incognito mode)
      isIncognito: currentTarget?.isIncognito || false,
      lastAccessed: Date.now()
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [activeWorkspaceId]);

  const handleSelectWorkspace = useCallback((workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    // Compute from tabsRef OUTSIDE the updater (StrictMode-safe)
    const workspaceTabs = tabsRef.current.filter(t => t.workspaceId === workspaceId || (!t.workspaceId && workspaceId === 'default'));
    if (workspaceTabs.length > 0) {
      setActiveTabId(workspaceTabs[0].id);
    } else {
      // Create a new tab if empty workspace
      const newTab: Tab = {
        id: generateId('tab'),
        url: 'nova://newtab',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        workspaceId: workspaceId,
        lastAccessed: Date.now()
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
  }, []);

  const handleUpdateWorkspaces = useCallback((newWorkspaces: Workspace[]) => {
    const validIds = new Set(newWorkspaces.map(w => w.id));
    setWorkspaces(newWorkspaces);
    setTabs(prev => prev.map(t => {
      if (t.workspaceId && !validIds.has(t.workspaceId)) {
        return { ...t, workspaceId: newWorkspaces[0]?.id || 'default' };
      }
      return t;
    }));
  }, []);

  const handleNewIncognitoTab = useCallback((url?: string | any) => {
    let targetUrl = typeof url === 'string' ? url : 'nova://newtab';

    // Security: Block malicious protocols (shared blocklist — see safeNavigation.ts)
    if (!isSafeNavigationUrl(targetUrl)) {
      targetUrl = 'nova://newtab';
    }

    const newTab: Tab = {
      id: generateId('tab'),
      url: targetUrl,
      title: targetUrl !== 'nova://newtab' ? targetUrl : 'Private Tab',
      isLoading: targetUrl !== 'nova://newtab',
      canGoBack: false,
      canGoForward: false,
      isIncognito: true,
      workspaceId: activeWorkspaceId,
      lastAccessed: Date.now()
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [activeWorkspaceId]);

  const ZOOM_FACTORS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0];

  const handleZoomIn = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.getZoomFactor) {
      try {
        const result = webview.getZoomFactor();
        if (typeof result === 'number') {
          const nextFactor = ZOOM_FACTORS.find(f => f > result + 0.01) || ZOOM_FACTORS[ZOOM_FACTORS.length - 1];
          webview.setZoomFactor(nextFactor);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomFactor: nextFactor } : t));
        } else if (result && typeof result.then === 'function') {
          result.then((currentFactor: number) => {
            const nextFactor = ZOOM_FACTORS.find(f => f > currentFactor + 0.01) || ZOOM_FACTORS[ZOOM_FACTORS.length - 1];
            webview.setZoomFactor(nextFactor);
            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomFactor: nextFactor } : t));
          });
        }
      } catch (e) {
        console.error("Zoom in error:", e);
      }
    }
  }, [activeTabId]);

  const handleZoomOut = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.getZoomFactor) {
      try {
        const result = webview.getZoomFactor();
        if (typeof result === 'number') {
          const nextFactor = [...ZOOM_FACTORS].reverse().find(f => f < result - 0.01) || ZOOM_FACTORS[0];
          webview.setZoomFactor(nextFactor);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomFactor: nextFactor } : t));
        } else if (result && typeof result.then === 'function') {
          result.then((currentFactor: number) => {
            const nextFactor = [...ZOOM_FACTORS].reverse().find(f => f < currentFactor - 0.01) || ZOOM_FACTORS[0];
            webview.setZoomFactor(nextFactor);
            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomFactor: nextFactor } : t));
          });
        }
      } catch (e) {
        console.error("Zoom out error:", e);
      }
    }
  }, [activeTabId]);

  const handleResetZoom = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.setZoomFactor) {
      try {
        webview.setZoomFactor(1.0);
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomFactor: 1.0 } : t));
      } catch (e) {
        console.error("Zoom reset error:", e);
      }
    }
  }, [activeTabId]);


  const handleNavigate = useCallback((url: string, explicitTabId?: string) => {
    if (!url || typeof url !== 'string') return;
    
    // Security: Block malicious protocols (shared blocklist — see safeNavigation.ts)
    if (!isSafeNavigationUrl(url)) {
      console.warn('Blocked malicious navigation protocol:', url);
      return;
    }

    if (url === 'nova://extensions' || url === 'chrome://extensions') {
      setIsExtensionsOpen(true);
      return;
    }

    const prev = tabsRef.current;

    if (prev.length === 0) {
      const newTabId = generateId('tab');
      setTabs([{
        id: newTabId,
        url,
        title: 'New Tab',
        isLoading: true,
        canGoBack: false,
        canGoForward: false,
        workspaceId: activeWorkspaceIdRef.current
      }]);
      setActiveTabId(newTabId);
      return;
    }

    if (explicitTabId && !prev.some(t => t.id === explicitTabId)) {
      logger.warn('App:Navigation', 'handleNavigate: unknown explicitTabId, ignoring', explicitTabId);
      return;
    }

    const currentActiveId = activeTabIdRef.current;
    const targetTab = explicitTabId 
      ? (prev.find(t => t.id === explicitTabId) || prev.find(t => t.id === currentActiveId) || prev[0])
      : (prev.find(t => t.id === currentActiveId) || prev[0]);
    const targetId = targetTab ? targetTab.id : (prev.find(t => t.id === currentActiveId)?.id || prev[0].id);

    tabThumbnailCache.remove(targetId);

    let newTitle: string | undefined = undefined;
    const isNewTabUrl = url === 'nova://newtab' || url === 'about:blank' || url === 'https://newtab';
    if (isNewTabUrl) newTitle = 'New Tab';
    else if (url.startsWith('nova://settings')) newTitle = 'Settings';
    else if (url.startsWith('nova://history')) newTitle = 'History';
    else if (url.startsWith('nova://downloads')) newTitle = 'Downloads';
    else if (url.startsWith('nova://changelog') || url.startsWith('nova://whats-new')) newTitle = "What's New";

    const isInternalPage = !!newTitle;

    if (targetId !== currentActiveId) {
      setActiveTabId(targetId);
    }

    if (targetTab && targetTab.url === url) {
      // URL is exactly the same, force a reload if it's a webview
      if (!isInternalPage) {
        const webview = document.querySelector(`webview[data-tab-id="${targetId}"]`) as any;
        if (webview) webview.reload();
      }
      setTabs(p => p.map(t => t.id === targetId ? { ...t, isLoading: !isInternalPage } : t));
      return;
    }

    setTabs(p => p.map(t => t.id === targetId ? {
      ...t,
      url,
      isLoading: !isInternalPage,
      ...(newTitle ? { title: newTitle } : {})
    } : t));
  }, []);

  // Latest-data & latest-handler refs: let the MCP/AI-context effect below keep
  // a stable [] dependency list (instead of rebuilding executeMcpAction and
  // re-registering the AI action context on EVERY tabs/history/bookmarks
  // change) while still reading fresh values at call time. Same
  // render-time-assignment pattern as tabsRef above.
  const browserDataRef = useRef({ activeTabId, tabs, history, bookmarks });
  browserDataRef.current = { activeTabId, tabs, history, bookmarks };
  const mcpHandlersRef = useRef({ handleNavigate, handleNewTab, handleCloseTab, handleSelectTab });
  mcpHandlersRef.current = { handleNavigate, handleNewTab, handleCloseTab, handleSelectTab };

  // Setup AI Agent Action Context and MCP Action Bridge
  useEffect(() => {
    // 1. Define executeMcpAction as a local function (not exposed on window)
    // VULN-11 FIX: Removed global window assignment to prevent any webpage or extension
    // from invoking browser control APIs. The MCP server in the main process can invoke
    // this function via webContents.executeJavaScript() instead of relying on a global.
    const executeMcpAction = async (toolName: string, args: any) => {
      if (!toolName || typeof toolName !== 'string') {
        return "Error: Invalid toolName parameter";
      }
      const safeArgs = (args && typeof args === 'object') ? args : {};
      // Read fresh data at call time via refs (see browserDataRef above)
      const { activeTabId, tabs } = browserDataRef.current;
      const activeWebview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;

      switch (toolName) {
        case 'browser_navigate':
          if (!safeArgs.url || typeof safeArgs.url !== 'string') return "Error: Missing or invalid 'url' parameter";
          if (!isSafeNavigationUrl(safeArgs.url)) return "Error: Navigation to this destination is blocked for security.";
          mcpHandlersRef.current.handleNavigate(safeArgs.url);
          return `Navigated to ${safeArgs.url}`;

        case 'browser_read_page':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                let text = (document.body?.innerText || document.documentElement?.innerText || '');
                const links = Array.from(document.querySelectorAll('a')).map(a => a.href).filter(Boolean);
                return JSON.stringify({ text: text.substring(0, 10000), links: links.slice(0, 50) });
              })();
            `);
          }
          return "Error: No active webview available.";

        case 'browser_click':
          if (activeWebview && activeWebview.executeJavaScript) {
            const result = await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el) { 
                    const rect = el.getBoundingClientRect();
                    el.click(); 
                    return { success: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                  }
                  return { success: false, error: "Element not found with selector: " + ${JSON.stringify(safeArgs.selector)} };
                } catch (err) {
                  return { success: false, error: "Invalid selector or DOM error: " + String(err) };
                }
              })();
            `);
            if (result && result.success) {
              const bounds = activeWebview.getBoundingClientRect();
              window.dispatchEvent(new CustomEvent('ai-cursor', {
                detail: { x: bounds.left + result.x, y: bounds.top + result.y, action: 'click' }
              }));
              return "Successfully clicked element.";
            }
            return result.error || "Error";
          }
          return "Error: No active webview.";

        case 'browser_type':
          if (activeWebview && activeWebview.executeJavaScript) {
            const result = await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el) { 
                    const rect = el.getBoundingClientRect();
                    el.value = ${JSON.stringify(safeArgs.text)};
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    if (${safeArgs.pressEnter === true ? 'true' : 'false'}) {
                      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
                      el.dispatchEvent(enterEvent);
                    }
                    return { success: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                  }
                  return { success: false, error: "Element not found with selector: " + ${JSON.stringify(safeArgs.selector)} };
                } catch (err) {
                  return { success: false, error: "Invalid selector or DOM error: " + String(err) };
                }
              })();
            `);
            if (result && result.success) {
              const bounds = activeWebview.getBoundingClientRect();
              window.dispatchEvent(new CustomEvent('ai-cursor', {
                detail: { x: bounds.left + result.x, y: bounds.top + result.y, action: 'type', text: safeArgs.text }
              }));
              return "Successfully typed text."; 
            }
            return result.error || "Error";
          }
          return "Error: No active webview.";

        case 'browser_run_js':
          return "Error: browser_run_js has been removed for security reasons (VULN-01).";

        case 'browser_list_tabs':
          return JSON.stringify(tabs.map(t => ({ id: t.id, title: t.title, url: t.url, isActive: t.id === activeTabId })));

        case 'browser_switch_tab': {
          const target = tabs.find(t => t.id === safeArgs.tabId);
          if (target) {
            const targetWs = target.workspaceId || 'default';
            if (targetWs !== (activeWorkspaceIdRef.current || 'default')) {
              setActiveWorkspaceId(targetWs);
            }
            setActiveTabId(safeArgs.tabId);
            return `Switched to tab ${safeArgs.tabId}`;
          }
          return `Error: Tab ${safeArgs.tabId} not found.`;
        }

        case 'browser_close_tab':
          mcpHandlersRef.current.handleCloseTab(safeArgs.tabId);
          return `Closed tab ${safeArgs.tabId}`;

        case 'browser_screenshot':
          if (activeWebview && activeWebview.capturePage) {
            const image = await activeWebview.capturePage();
            return image.toDataURL();
          }
          return "Error: Could not take screenshot.";

        case 'browser_scroll': {
          const direction = String(safeArgs.direction || 'down');
          const cleanAmount = Math.min(10000, Math.max(0, Math.abs(Number(safeArgs.amount) || 500)));
          if (activeWebview && activeWebview.executeJavaScript) {
            if (direction === 'up') await activeWebview.executeJavaScript(`window.scrollBy(0, -${cleanAmount})`);
            else if (direction === 'down') await activeWebview.executeJavaScript(`window.scrollBy(0, ${cleanAmount})`);
            else if (direction === 'top') await activeWebview.executeJavaScript(`window.scrollTo(0, 0)`);
            else if (direction === 'bottom') await activeWebview.executeJavaScript(`window.scrollTo(0, document.body.scrollHeight)`);
            return `Scrolled ${direction}`;
          }
          return "Error: No active webview.";
        }

        case 'browser_new_tab': {
          const newUrl = safeArgs.url || 'nova://newtab';
          if (!isSafeNavigationUrl(newUrl)) {
            return `Error: Navigation blocked for unsafe URL scheme: ${newUrl}`;
          }
          mcpHandlersRef.current.handleNewTab(newUrl);
          return `Opened new tab: ${newUrl}`;
        }

        case 'browser_go_back':
          if (activeWebview && activeWebview.goBack) {
            activeWebview.goBack();
            return "Navigated back";
          }
          return "Error: No active webview.";

        case 'browser_go_forward':
          if (activeWebview && activeWebview.goForward) {
            activeWebview.goForward();
            return "Navigated forward";
          }
          return "Error: No active webview.";

        case 'browser_reload':
          if (activeWebview && activeWebview.reload) {
            activeWebview.reload();
            return "Page reloaded";
          }
          return "Error: No active webview.";

        case 'browser_get_url': {
          const activeTab = tabs.find(t => t.id === activeTabId);
          return activeTab?.url || "Error: Could not get URL";
        }

        case 'browser_hover':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el) {
                    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                    return "Hovered over element";
                  }
                  return "Error: Element not found: " + ${JSON.stringify(safeArgs.selector)};
                } catch (err) {
                  return "Error: Invalid selector or DOM error: " + String(err);
                }
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_focus':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el) { el.focus(); return "Focused element"; }
                  return "Error: Element not found: " + ${JSON.stringify(safeArgs.selector)};
                } catch (err) {
                  return "Error: Invalid selector or DOM error: " + String(err);
                }
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_select_option':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el && el.tagName === 'SELECT') {
                    el.value = ${JSON.stringify(safeArgs.value)};
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    return "Selected option: " + ${JSON.stringify(safeArgs.value)};
                  }
                  return "Error: Select element not found: " + ${JSON.stringify(safeArgs.selector)};
                } catch (err) {
                  return "Error: Invalid selector or DOM error: " + String(err);
                }
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_press_key':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const selector = ${JSON.stringify(safeArgs.selector || null)};
                  let target = null;
                  if (selector) {
                    try {
                      target = document.querySelector(selector);
                      if (target && target.focus) target.focus();
                    } catch (_) {}
                  }
                  if (!target) target = document.activeElement || document.body;
                  const key = ${JSON.stringify(safeArgs.key)};
                  const keyMap = { 'Enter': 13, 'Tab': 9, 'Escape': 27, 'Space': 32, 'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39, 'Backspace': 8, 'Delete': 46 };
                  const keyCode = keyMap[key] || (key && key.charCodeAt ? key.charCodeAt(0) : 0);
                  ['keydown','keypress','keyup'].forEach(t => {
                    target.dispatchEvent(new KeyboardEvent(t, { key, keyCode, which: keyCode, bubbles: true }));
                  });
                  return "Pressed key: " + key;
                } catch (err) {
                  return "Error: Failed to press key: " + String(err);
                }
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_get_element_text':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el) return el.innerText || el.textContent || '';
                  return "Error: Element not found: " + ${JSON.stringify(safeArgs.selector)};
                } catch (err) {
                  return "Error: Invalid selector or DOM error: " + String(err);
                }
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_scroll_to_element':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                try {
                  const el = document.querySelector(${JSON.stringify(safeArgs.selector)});
                  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return "Scrolled to element"; }
                  return "Error: Element not found: " + ${JSON.stringify(safeArgs.selector)};
                } catch (err) {
                  return "Error: Invalid selector or DOM error: " + String(err);
                }
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_zoom':
          if (activeWebview && activeWebview.setZoomLevel) {
            activeWebview.setZoomLevel(args.level || 0);
            return `Zoom level set to ${args.level}`;
          }
          return "Error: No active webview.";

        case 'browser_mute_tab': {
          const mute = Boolean(args.mute);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isMuted: mute } : t));
          return mute ? "Tab muted" : "Tab unmuted";
        }

        case 'browser_pin_tab': {
          const pin = Boolean(args.pin);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isPinned: pin } : t));
          return pin ? "Tab pinned" : "Tab unpinned";
        }

        case 'browser_duplicate_tab': {
          const currentTab = tabs.find(t => t.id === activeTabId);
          if (currentTab) {
            mcpHandlersRef.current.handleNewTab(currentTab.url);
            return `Duplicated tab: ${currentTab.url}`;
          }
          return "Error: No active tab to duplicate";
        }

        default:
          return `Error: Unknown tool ${toolName}`;
      }
    };

    // 2. Original aiAgent context setup
    aiAgent.setActionContext({
      onNavigate: (url: string) => {
        mcpHandlersRef.current.handleNavigate(url);
      },
      onExecuteScript: async (script: string) => {
        const webview = document.querySelector(`webview[data-tab-id="${browserDataRef.current.activeTabId}"]`) as any;
        if (webview && webview.executeJavaScript) {
          try {
            return await webview.executeJavaScript(script);
          } catch (e) {
            console.error("AI execution error:", e);
            throw e;
          }
        }

        const iframe = document.querySelector(`iframe[data-tab-id="${browserDataRef.current.activeTabId}"]`) as HTMLIFrameElement;
        if (iframe) {
          console.warn("AI scripts cannot be executed in iframes due to cross-origin security. Please run the app in Electron.");
          return "Error: Cannot read page content in web development mode. Please run the desktop app.";
        }

        throw new Error("No active webview or iframe found");
      },
      onCreateTab: (url: string) => mcpHandlersRef.current.handleNewTab(url),
      onCloseTab: (id: string) => mcpHandlersRef.current.handleCloseTab(id),
      onSwitchTab: (id: string) => mcpHandlersRef.current.handleSelectTab(id),
      onGetAllTabs: () => browserDataRef.current.tabs.map(t => ({ id: t.id, title: t.title, url: t.url })),
      onScrollPage: (direction, amount) => {
        const webview = document.querySelector(`webview[data-tab-id="${browserDataRef.current.activeTabId}"]`) as any;
        const cleanAmount = Math.min(10000, Math.max(0, Math.abs(Number(amount) || 500)));
        if (webview && webview.executeJavaScript) {
          if (direction === 'up') webview.executeJavaScript(`window.scrollBy(0, -${cleanAmount})`);
          if (direction === 'down') webview.executeJavaScript(`window.scrollBy(0, ${cleanAmount})`);
          if (direction === 'top') webview.executeJavaScript(`window.scrollTo(0, 0)`);
          if (direction === 'bottom') webview.executeJavaScript(`window.scrollTo(0, document.body.scrollHeight)`);
        } else {
          console.warn("Cannot scroll iframes cross-origin.");
        }
      },
      onPressKey: (key: string) => {
        const webview = document.querySelector(`webview[data-tab-id="${browserDataRef.current.activeTabId}"]`) as any;
        if (webview) {
          webview.sendInputEvent({ type: 'keyDown', keyCode: key });
          webview.sendInputEvent({ type: 'char', keyCode: key });
          webview.sendInputEvent({ type: 'keyUp', keyCode: key });
        }
      },
      onTakeScreenshot: async () => {
        const webview = document.querySelector(`webview[data-tab-id="${browserDataRef.current.activeTabId}"]`) as any;
        if (webview) {
          const image = await webview.capturePage();
          return image.toDataURL();
        }
        throw new Error("No active webview found");
      },
      onWait: (ms: number) => {
        return new Promise(resolve => setTimeout(resolve, ms));
      },
      onGetPageLinks: async () => {
        const webview = document.querySelector(`webview[data-tab-id="${browserDataRef.current.activeTabId}"]`) as any;
        if (webview) {
          return await webview.executeJavaScript(`
            Array.from(document.querySelectorAll('a')).map(a => ({
              text: a.innerText.trim(),
              href: a.href
            })).filter(l => l.text && l.href)
          `);
        }
        return [];
      },
      onSearchHistory: (query: string) => {
        const q = (query || '').trim();
        if (!q) return [];
        const { history, bookmarks } = browserDataRef.current;
        const searchPool: SearchableItem[] = [
          ...(Array.isArray(bookmarks) ? bookmarks.map(b => ({ id: b.id, title: b.title, url: b.url, type: 'bookmark' as const })) : []),
          ...(Array.isArray(history) ? history.map(h => ({ id: h.id, title: h.title, url: h.url, type: 'history' as const, timestamp: h.timestamp })) : [])
        ];
        const matches = searchHistoryAndBookmarks(q, searchPool);
        const unique = Array.from(new Map(matches.map(item => [item.url, item])).values());
        return unique.slice(0, 10).map(u => ({ title: u.title, url: u.url }));
      }
    });

    // 3. MCP action bridge over IPC: the main process delivers 'mcp-action-request'
    // events that only this trusted app page receives via the contextBridge, and
    // results go back through a sender-validated channel. Never expose this as a
    // window global — that would give any UI-context XSS one-call browser control.
    const electronAPI = window.electronAPI;
    let unsubscribeMcpBridge: (() => void) | undefined;
    if (electronAPI?.onMcpActionRequest && electronAPI.respondMcpAction) {
      unsubscribeMcpBridge = electronAPI.onMcpActionRequest((id, toolName, args) => {
        if (!settingsRef.current?.mcpServerEnabled) {
          electronAPI.respondMcpAction?.(id, { error: 'MCP tool execution rejected: MCP server is disabled in settings.' });
          return;
        }
        // Security (G-2): Harmless metadata tools execute directly.
        // Sensitive content inspection tools (read_page, screenshot, get_element_text) require user approval.
        const safeMetadataTools = new Set([
          'nova_browser_info',
          'browser_list_tabs',
          'browser_get_url',
          'browser_wait'
        ]);

        const runAction = () => {
          executeMcpAction(toolName, args)
            .then(result => electronAPI.respondMcpAction?.(id, result))
            .catch(err => electronAPI.respondMcpAction?.(id, { error: String(err) }));
        };

        if (safeMetadataTools.has(toolName)) {
          runAction();
        } else {
          const { done } = orchestrator.enqueueAction(toolName, args);
          done.then(approved => {
            if (approved) {
              runAction();
            } else {
              electronAPI.respondMcpAction?.(id, { error: 'MCP tool execution denied by user approval policy.' });
            }
          }).catch(err => {
            electronAPI.respondMcpAction?.(id, { error: String(err) });
          });
        }
      });
    }
    return () => {
      unsubscribeMcpBridge?.();
    };
  // Data and handlers are read through browserDataRef/mcpHandlersRef at call
  // time, so this setup only needs to run once per mount.
  }, []);

  const handleUpdateTab = useCallback((id: string, updates: Partial<Tab>) => {
    const current = tabsRef.current.find(t => t.id === id);
    if (!current) return;

    // Read the current tab once. Webview events often repeat the same payload;
    // avoid scheduling a React update when every field already matches.
    const hasChanges = Object.entries(updates).some(([key, value]) => (current as any)[key] !== value);
    if (!hasChanges) return;

    // Pure tabs update only — no side effects inside the updater (StrictMode-safe)
    setTabs(prev => {
      let changed = false;
      const updated = prev.map(t => {
        if (t.id !== id) return t;
        const actualChanges = Object.entries(updates).some(([key, value]) => (t as any)[key] !== value);
        if (!actualChanges) return t;
        changed = true;
        return { ...t, ...updates };
      });
      // Identity guard: when a newer queued update already applied the same
      // values, return prev so React skips the App subtree render.
      return changed ? updated : prev;
    });

    // History recording is derived from the pre-update tab state OUTSIDE the
    // tabs updater so setHistory is never called from within another updater.
    const updated = { ...current, ...updates };

    // Add to history if title or url loaded and not blank/newtab AND NOT INCOGNITO
    // (gating + dedupe rules live in useHistoryRecorder.recordVisit)
    recordVisit(updated, updates);
  }, []);

  const handleToggleMuteTab = useCallback((id: string, e?: React.MouseEvent) => {
    if (e?.stopPropagation) e.stopPropagation();
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isMuted: !t.isMuted } : t));
  }, []);

  const handleTogglePip = useCallback((tabId: string) => {
    const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`) as any;
    if (webview && webview.executeJavaScript) {
      webview.executeJavaScript(`
        (() => {
          const videos = Array.from(document.querySelectorAll('video'));
          const target = videos.find(v => !v.paused) || videos[0];
          if (!target) {
            throw new Error("No video found on page!");
          }
          if (document.pictureInPictureElement) {
            return document.exitPictureInPicture();
          } else {
            return target.requestPictureInPicture();
          }
        })();
      `, true).catch((e: any) => {
        void showAlert({ title: 'Picture-in-Picture', message: "Picture-in-Picture Error: " + (e.message || e) });
      });
    }
  }, []);


  const handleToggleBookmarkActive = useCallback(() => {
    if (activeTab) handleToggleBookmark(activeTab);
  }, [activeTab, handleToggleBookmark]);

  const handleOpenHistory = useCallback(() => {
    handleNewTab('nova://history');
  }, [handleNewTab]);

  const handleOpenDownloads = useCallback(() => {
    closeAllModals();
    const existing = tabsRef.current.find(t => t.url === 'nova://downloads');
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      handleNewTab('nova://downloads');
    }
  }, [handleNewTab, closeAllModals]);
  const handleOpenSettings = useCallback(() => handleNewTab('nova://settings'), [handleNewTab]);
  const handleOpenExtensions = useCallback(() => openModal('extensions'), [openModal]);

  // Stable chrome-modal openers: inline arrows passed to memoized SidebarTabs /
  // TopBar defeat React.memo and re-render the whole tab strip on every App render.
  const handleOpenAccount = useCallback(() => {
    closeAllModals();
    setIsAccountModalOpen(true);
  }, [closeAllModals]);

  const handleOpenHelp = useCallback(() => {
    closeAllModals();
    setHelpInitialTab('help');
    setIsHelpOpen(true);
  }, [closeAllModals]);

  const handleOpenShare = useCallback(() => openModal('share'), [openModal]);
  const handleTakeScreenshot = useCallback(async () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview) {
      try {
        let dataUrl: string | null = null;
        if (typeof webview.getWebContentsId === 'function' && getElectronAPI()?.captureTabThumbnail) {
           const wcId = webview.getWebContentsId();
           dataUrl = await getElectronAPI()?.captureTabThumbnail(wcId) ?? null;
        } else if (typeof webview.capturePage === 'function') {
           const image = await webview.capturePage();
           dataUrl = image.toDataURL();
        }
        
        if (dataUrl) {
          setScreenshotDataUrl(dataUrl);
          setIsScreenshotOpen(true);
        } else {
          void showAlert({ title: 'Screenshot', message: "Failed to capture screenshot. The page might not be fully loaded." });
        }
      } catch (err) {
        console.error('Screenshot capture failed:', err);
      }
    } else {
      // Check if it's an internal page by looking at activeTab url
      const tab = tabs.find(t => t.id === activeTabId);
      if (tab?.url?.startsWith('nova://')) {
         void showAlert({ title: 'Screenshot', message: "Screenshots cannot be taken on internal pages (Settings, New Tab, etc.)." });
      } else {
         void showAlert({ title: 'Screenshot', message: "Screenshot feature is only available in the desktop app." });
      }
    }
  }, [activeTabId, tabs]);

  const handleCaptureFullPage = useCallback(async () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && typeof webview.getWebContentsId === 'function' && getElectronAPI()?.captureFullPage) {
      try {
        const wcId = webview.getWebContentsId();
        const dataUrl = await getElectronAPI()?.captureFullPage(wcId) ?? null;
        return dataUrl;
      } catch (err) {
        console.error('Full page screenshot failed:', err);
        return null;
      }
    }
    return null;
  }, [activeTabId]);
  const handleOpenFindInPage = useCallback(() => setIsFindInPageOpen(prev => !prev), []);
  
  const handleCloseSplitView = useCallback((tab1Id?: string, tab2Id?: string) => {
    setTabs(prev => prev.map(t => {
      if (tab1Id || tab2Id) {
        if (
          t.id === tab1Id || 
          t.id === tab2Id || 
          (tab1Id && t.splitWith === tab1Id) || 
          (tab2Id && t.splitWith === tab2Id)
        ) {
          return { ...t, splitWith: undefined };
        }
      } else if (t.id === activeTabId || (splitTabId && t.id === splitTabId) || t.splitWith === activeTabId) {
        return { ...t, splitWith: undefined };
      }
      return t;
    }));
  }, [activeTabId, splitTabId]);

  const handleToggleSplitView = useCallback(() => {
    if (splitTabId) {
      handleCloseSplitView();
    } else {
      const workspaceTabs = tabs.filter(t => t.workspaceId === activeWorkspaceId || (!t.workspaceId && activeWorkspaceId === 'default'));
      const otherTab = workspaceTabs.find(t => t.id !== activeTabId && !t.splitWith);
      if (otherTab) {
        setTabs(prev => prev.map(t => {
          if (t.id === activeTabId) return { ...t, splitWith: otherTab.id };
          if (t.id === otherTab.id) return { ...t, splitWith: activeTabId };
          return t;
        }));
      } else {
        const newId = generateId('tab');
        const newTab: Tab = {
          id: newId,
          url: 'nova://newtab',
          title: 'New Tab',
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
          workspaceId: activeWorkspaceId,
          splitWith: activeTabId
        };
        setTabs(prev => [...prev.map(t => t.id === activeTabId ? { ...t, splitWith: newId } : t), newTab]);
      }
      setSplitRatio(50);
    }
  }, [splitTabId, tabs, activeWorkspaceId, activeTabId, handleCloseSplitView]);

  const handleGoBack = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.canGoBack && webview.canGoBack()) {
      webview.goBack();
    } else {
      const iframe = document.querySelector(`iframe[data-tab-id="${activeTabId}"]`) as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.history.back();
        } catch (err) {
          logger.debug('App:Navigation', 'iframe history.back blocked or failed', err);
        }
      }
    }
  }, [activeTabId]);

  const handleGoForward = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.canGoForward && webview.canGoForward()) {
      webview.goForward();
    } else {
      const iframe = document.querySelector(`iframe[data-tab-id="${activeTabId}"]`) as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.history.forward();
        } catch (err) {
          logger.debug('App:Navigation', 'iframe history.forward blocked or failed', err);
        }
      }
    }
  }, [activeTabId]);

  const handleReload = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.reload) {
      webview.reload();
    } else {
      const iframe = document.querySelector(`iframe[data-tab-id="${activeTabId}"]`) as HTMLIFrameElement;
      if (iframe) {
        const currentSrc = iframe.src;
        iframe.src = 'about:blank';
        setTimeout(() => { if (iframe) iframe.src = currentSrc; }, 50);
      }
    }
  }, [activeTabId]);

  const handleUpdateSettings = useCallback((newSettings: Partial<UserSettings>) => setSettings(prev => ({ ...prev, ...newSettings })), []);

  const handleExportData = useCallback(() => {
    const backup = {
      version: '1.0',
      timestamp: Date.now(),
      bookmarks,
      history,
      settings
    };
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nova_browser_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [bookmarks, history, settings]);

  const handleImportData = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.bookmarks && Array.isArray(data.bookmarks)) {
          const sanitizedBookmarks = data.bookmarks.filter((b: any) =>
            b && typeof b === 'object' && typeof b.url === 'string' && isSafeNavigationUrl(b.url)
          );
          setBookmarks(sanitizedBookmarks);
        }
        if (data.history && Array.isArray(data.history)) {
          const sanitizedHistory = data.history.filter((h: any) =>
            h && typeof h === 'object' && typeof h.url === 'string' && isSafeNavigationUrl(h.url)
          );
          setHistory(sanitizedHistory);
        }
        if (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
          const raw = data.settings;
          const safeSettings: Partial<UserSettings> = {};
          if (typeof raw.theme === 'string' && ['dark', 'light', 'system'].includes(raw.theme)) safeSettings.theme = raw.theme;
          if (typeof raw.searchEngine === 'string' && ['google', 'duckduckgo', 'bing', 'brave', 'ecosia', 'yahoo'].includes(raw.searchEngine)) safeSettings.searchEngine = raw.searchEngine;
          if (typeof raw.privacyShield === 'boolean') safeSettings.privacyShield = raw.privacyShield;
          if (typeof raw.useVerticalTabs === 'boolean') safeSettings.useVerticalTabs = raw.useVerticalTabs;
          if (typeof raw.fontSize === 'string' && ['small', 'medium', 'large'].includes(raw.fontSize)) safeSettings.fontSize = raw.fontSize;
          if (typeof raw.tabStyle === 'string' && ['rounded', 'square', 'floating'].includes(raw.tabStyle)) safeSettings.tabStyle = raw.tabStyle;
          if (typeof raw.tabAnimation === 'string' && ['chrome', 'smooth', 'snappy', 'none'].includes(raw.tabAnimation)) safeSettings.tabAnimation = raw.tabAnimation;
          if (typeof raw.doNotTrack === 'boolean') safeSettings.doNotTrack = raw.doNotTrack;
          if (typeof raw.clearOnExit === 'boolean') safeSettings.clearOnExit = raw.clearOnExit;
          if (typeof raw.hardwareAcceleration === 'boolean') safeSettings.hardwareAcceleration = raw.hardwareAcceleration;
          if (typeof raw.tabHibernationEnabled === 'boolean') safeSettings.tabHibernationEnabled = raw.tabHibernationEnabled;
          if (typeof raw.aiLinkPreviewEnabled === 'boolean') safeSettings.aiLinkPreviewEnabled = raw.aiLinkPreviewEnabled;
          if (typeof raw.energySaverMode === 'boolean') safeSettings.energySaverMode = raw.energySaverMode;
          if (typeof raw.preloadDnsEnabled === 'boolean') safeSettings.preloadDnsEnabled = raw.preloadDnsEnabled;
          if (typeof raw.smoothScrollingEnabled === 'boolean') safeSettings.smoothScrollingEnabled = raw.smoothScrollingEnabled;
          if (typeof raw.newTabBackground === 'string' && ['default', 'gradient', 'mesh', 'glass', 'unsplash', 'custom_url', 'aurora_waves', 'cyber_grid', 'hyper_space', 'fireflies', 'nebula', 'matrix'].includes(raw.newTabBackground)) safeSettings.newTabBackground = raw.newTabBackground;
          if (typeof raw.backgroundCustomUrl === 'string' && isSafeNavigationUrl(raw.backgroundCustomUrl)) safeSettings.backgroundCustomUrl = raw.backgroundCustomUrl;
          if (typeof raw.accentColor === 'string' && ['blue', 'emerald', 'purple', 'rose', 'amber', 'custom'].includes(raw.accentColor)) safeSettings.accentColor = raw.accentColor;
          if (typeof raw.customAccentColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.customAccentColor)) safeSettings.customAccentColor = raw.customAccentColor;
          if (typeof raw.browserColor === 'string' && ['default', 'midnight', 'cyberpunk', 'forest', 'crimson', 'warm', 'ocean', 'sunset', 'custom'].includes(raw.browserColor)) safeSettings.browserColor = raw.browserColor as any;
          if (typeof raw.customBrowserColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.customBrowserColor)) safeSettings.customBrowserColor = raw.customBrowserColor;
          setSettings(prev => ({ ...prev, ...safeSettings }));
        }
      } catch (err) {
        console.error('Backup import error:', err);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleCloseShare = useCallback(() => setIsShareOpen(false), []);
  const handleCloseSpotlight = useCallback(() => setIsSpotlightOpen(false), []);
  const handleCloseReaderMode = useCallback(() => setIsReaderModeOpen(false), []);
  const handleCloseWorkspaceManager = useCallback(() => setIsWorkspaceManagerOpen(false), []);
  const handleCloseExtensions = useCallback(() => setIsExtensionsOpen(false), []);
  const handleCloseScreenshot = useCallback(() => setIsScreenshotOpen(false), []);
  const handleCloseVpnPopover = useCallback(() => setIsVpnPopoverOpen(false), []);

  const handleCollapseSidebar = useCallback(() => {
    setIsSidebarCollapsed(true);
    setIsHoverRevealing(false);
  }, []);

  const handleExpandSidebar = useCallback(() => {
    setIsSidebarCollapsed(false);
    setIsHoverRevealing(false);
  }, []);

  const handleToggleExtension = useCallback(async (id: string) => {
    const ext = extensions.find(e => e.id === id);
    const nextEnabled = ext?.enabled === false ? true : false;
    setExtensions(prev => prev.map(e => e.id === id ? { ...e, enabled: nextEnabled } : e));
    try {
      if (getElectronAPI()?.toggleExtension) {
        await getElectronAPI()?.toggleExtension(id, nextEnabled);
      }
    } catch (e) {
      console.error('Failed to toggle extension:', e);
    }
  }, [extensions]);

  const handleRemoveExtension = useCallback(async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Remove Extension',
      message: 'Are you sure you want to remove this extension?',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel'
    });
    if (confirmed) {
      try {
        const res = await getElectronAPI()?.removeExtension?.(id);
        if (res?.error) {
          console.error('Failed to remove extension:', res.error);
          return;
        }
        setExtensions(prev => prev.filter(e => e.id !== id));
      } catch (e) {
        console.error('Failed to remove extension:', e);
      }
    }
  }, []);

  const handleManageExtensions = useCallback(() => handleNewTab('nova://settings#extensions'), [handleNewTab]);

  const handleSpotlightSelectTab = useCallback((tabId: string) => {
    // Compute from tabsRef OUTSIDE the updater (StrictMode-safe)
    const t = tabsRef.current.find(tab => tab.id === tabId);
    if (t && t.workspaceId) {
      setActiveWorkspaceId(t.workspaceId);
    } else if (t && !t.workspaceId) {
      setActiveWorkspaceId('default');
    }
    setActiveTabId(tabId);
  }, []);

  const handleOnboardingComplete = useCallback((prefs: any) => {
    setShowOnboarding(false);
    setSettings(s => ({
      ...s,
      theme: prefs.theme,
      searchEngine: prefs.searchEngine,
      privacyShield: prefs.privacyShield
    }));
    if (prefs.importedBookmarks && prefs.importedBookmarks.length > 0) {
      setBookmarks(prev => {
        const newBookmarks = [...prev, ...prefs.importedBookmarks!];
        return newBookmarks;
      });
    }
  }, []);

  const handleFoundInPage = useCallback((idx: number, count: number) => setFindMatches({ index: idx, count }), []);
  const handleCloseFindInPage = useCallback(() => setIsFindInPageOpen(false), []);

  // Stable callbacks for TopBar (prevents re-renders from inline arrows)
  const handleToggleVpn = useCallback(() => {
    closeAllModals();
    setIsVpnPopoverOpen(prev => !prev);
  }, [closeAllModals]);

  const handleToggleAIAssistant = useCallback(() => {
    setIsSidePanelOpen(prev => !prev);
  }, []);

  const handleTabDragStart = useCallback(() => setIsDraggingTab(true), []);
  const handleTabDragEnd = useCallback(() => {
    setIsDraggingTab(false);
    setIsDragOverMain(false);
  }, []);
  const handleTabDrag = useCallback((y: number, x?: number) => {
    setIsDragOverMain(y > 60);
    if (typeof x === 'number') {
      setSplitDragSide(x < window.innerWidth / 2 ? 'left' : 'right');
    }
  }, []);
  const handleDropToSplitScreen = useCallback((droppedTabId: string, side: 'left' | 'right' = 'right') => {
    if (!droppedTabId) return;

    // Disallow splitting if the dropped tab is already in split view
    const alreadySplit = tabs.find(t => t.id === droppedTabId && t.splitWith);
    if (alreadySplit) return;

    let targetTabId = droppedTabId;
    let partnerTabId = activeTabId;

    if (droppedTabId === activeTabId) {
      const currentActive = tabs.find(t => t.id === activeTabId);
      if (currentActive?.splitWith) return;

      const workspaceTabs = tabs.filter(t => t.workspaceId === activeWorkspaceId || (!t.workspaceId && activeWorkspaceId === 'default'));
      const candidate = workspaceTabs.find(t => t.id !== activeTabId && !t.splitWith);
      if (!candidate) return;
      targetTabId = candidate.id;
      partnerTabId = activeTabId;
    }

    setTabs(prev => {
      const activeT = prev.find(t => t.id === partnerTabId);
      const droppedT = prev.find(t => t.id === targetTabId);
      if (!activeT || !droppedT) return prev;

      let updated = prev.map(t => {
        if (t.id === partnerTabId) return { ...t, splitWith: targetTabId };
        if (t.id === targetTabId) return { ...t, splitWith: partnerTabId };
        if (t.splitWith === partnerTabId || t.splitWith === targetTabId) return { ...t, splitWith: undefined };
        return t;
      });

      const pIdx = updated.findIndex(t => t.id === partnerTabId);
      const tIdx = updated.findIndex(t => t.id === targetTabId);
      if (side === 'left' && tIdx > pIdx) {
        const item = updated.splice(tIdx, 1)[0];
        const newPIdx = updated.findIndex(t => t.id === partnerTabId);
        updated.splice(newPIdx, 0, item);
      } else if (side === 'right' && tIdx < pIdx) {
        const item = updated.splice(tIdx, 1)[0];
        const newPIdx = updated.findIndex(t => t.id === partnerTabId);
        updated.splice(newPIdx + 1, 0, item);
      }
      return updated;
    });

    if (side === 'left') {
      setActiveTabId(targetTabId);
    } else {
      setActiveTabId(partnerTabId);
    }
  }, [activeTabId, tabs, activeWorkspaceId]);
  const handleToggleReaderMode = useCallback(() => setIsReaderModeOpen(prev => !prev), []);
  const handleCloseSidePanel = useCallback(() => setIsSidePanelOpen(false), []);
  const handleOpenSpotlight = useCallback(() => setIsSpotlightOpen(true), []);

  const handleFind = useCallback((text: string, forward?: boolean, matchCase?: boolean, wholeWord?: boolean) => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.findInPage) {
      try {
        webview.findInPage(text, { forward, findNext: true, matchCase, wordStart: wholeWord });
      } catch (err) {
        logger.warn('App:FindInPage', 'Failed to findInPage in webview', err);
      }
    } else {
      // Basic fallback for standard browser
      try {
        (window as any).find(text, matchCase, !forward, true, wholeWord, false, false);
      } catch (err) {
        logger.debug('App:FindInPage', 'window.find fallback failed', err);
      }
    }
  }, [activeTabId]);

  const handleStopFind = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.stopFindInPage) {
      try {
        webview.stopFindInPage('clearSelection');
      } catch (err) {
        logger.warn('App:FindInPage', 'Failed to stopFindInPage in webview', err);
      }
    } else {
      // Basic fallback for standard browser
      try {
        window.getSelection()?.removeAllRanges();
      } catch (err) {
        logger.debug('App:FindInPage', 'Failed to clearSelection fallback', err);
      }
    }
  }, [activeTabId]);

  // Keep the latest handler identities for the mount-time IPC listeners above.
  // Assigned during render AFTER all handlers are defined; listeners read
  // handlersRef.current at event time so they always invoke fresh closures.
  handlersRef.current = {
    handleNewTab,
    handleNewIncognitoTab,
    handleCloseTab,
    handleReopenClosedTab,
    closeAllModals,
    handleOpenSettings,
    handlePrintPage,
    handleOpenDevTools,
    handleReload,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleOpenHistory,
    handleOpenDownloads,
    handleToggleBookmarkActive,
    handleGoBack,
    handleGoForward
  };

  // Post-update startup check: Automatically open What's New changelog tab when browser is updated
  useEffect(() => {
    if (demoParams.isDemo) return;
    const LAST_VERSION_KEY = 'nova_last_seen_version';
    let isCancelled = false;

    const checkVersionAndOpenChangelog = async () => {
      try {
        let currentVer = '';
        if (window.electronAPI?.getAppVersion) {
          currentVer = await window.electronAPI.getAppVersion();
        }
        if (!currentVer && typeof __APP_VERSION__ !== 'undefined') {
          currentVer = __APP_VERSION__;
        }
        if (!currentVer || isCancelled) return;

        const lastSeen = localStorage.getItem(LAST_VERSION_KEY);
        // If lastSeen exists and differs from current version, browser was just updated!
        if (lastSeen && lastSeen !== currentVer) {
          handleNewTab('nova://changelog', undefined, { reuseBlank: false });
        }
        localStorage.setItem(LAST_VERSION_KEY, currentVer);
      } catch (e) {
        console.warn('[Changelog] Error checking version on startup:', e);
      }
    };

    checkVersionAndOpenChangelog();
    return () => { isCancelled = true; };
  }, [handleNewTab, demoParams.isDemo]);

  // Global Chrome Keyboard Shortcuts Listener
  useEffect(() => {
    // When embedded as a website demo, do not hijack global window keyboard shortcuts
    // (e.g. Cmd+W, Cmd+T, Cmd+R) from the user's real browser!
    if (demoParams.isDemo && demoParams.feature === 'website') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs/textareas
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        // Allow Cmd/Ctrl combinations to pass through if they are specific browser shortcuts,
        // but it's safer to just ignore unless metaKey is pressed.
        if (!e.metaKey && !e.ctrlKey) return;
      }

      const s = settings.shortcuts;
      if (!s) return;

      const key = e.key.toLowerCase();
      const shift = e.shiftKey;
      const meta = e.metaKey || e.ctrlKey; // Accept either Meta (Mac) or Ctrl (Windows)

      const matches = (shortcutName: keyof typeof s) => {
        return matchesShortcut(s[shortcutName], e, isMac);
      };

      if (matches('newTab')) {
        e.preventDefault();
        handleNewTab();
        setTimeout(() => {
          const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }, 100);
        return;
      }
      
      if (matches('reopenTab')) {
        e.preventDefault();
        handleReopenClosedTab();
        return;
      }

      if (matches('closeTab')) {
        e.preventDefault();
        if (activeTabId) handleCloseTab(activeTabId);
        return;
      }

      if (matches('newIncognito')) {
        e.preventDefault();
        handleNewIncognitoTab();
        return;
      }

      if (matches('reload') || key === 'f5') {
        e.preventDefault();
        handleReload();
        return;
      }

      if (matches('omnibox')) {
        e.preventDefault();
        setIsSpotlightOpen(prev => !prev);
        return;
      }

      // Focus Address / Search bar (⌘L / Ctrl+L)
      if (meta && key === 'l') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Next / Previous Tab (Ctrl+Tab / Ctrl+Shift+Tab)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault();
        // Compute from refs OUTSIDE the updater (StrictMode-safe). Tabs are
        // unchanged here — only the selection moves.
        const currentTabs = tabsRef.current;
        if (currentTabs.length > 1) {
          const currentIndex = currentTabs.findIndex(t => t.id === activeTabIdRef.current);
          let nextIndex = 0;
          if (e.shiftKey) {
            nextIndex = currentIndex <= 0 ? currentTabs.length - 1 : currentIndex - 1;
          } else {
            nextIndex = currentIndex >= currentTabs.length - 1 ? 0 : currentIndex + 1;
          }
          setActiveTabId(currentTabs[nextIndex].id);
        }
        return;
      }

      // Capture Screenshot (Cmd + Shift + S / Ctrl + Shift + S)
      if (meta && shift && key === 's') {
        e.preventDefault();
        void handleTakeScreenshot();
        return;
      }

      // Toggle Sidebar in Vertical Tabs Mode (⌘B / ⌘S / Ctrl+B / Ctrl+S)
      if (matches('toggleSidebar') || ((e.metaKey || e.ctrlKey) && !shift && (key === 'b' || key === 's'))) {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
        return;
      }

      if (matches('bookmark')) {
        e.preventDefault();
        handleToggleBookmarkActive();
        return;
      }

      if (matches('history')) {
        // Protect macOS Hide Application (⌘H) — never hijack Cmd+H on macOS
        if (isMac && meta && key === 'h') {
          return;
        }
        e.preventDefault();
        closeAllModals();
        handleOpenHistory();
        return;
      }

      if (matches('downloads')) {
        e.preventDefault();
        closeAllModals();
        handleOpenDownloads();
        return;
      }

      // Toggle AI Assistant (Cmd + I / Cmd + Shift + A)
      if ((meta && key === 'i' && !e.altKey && !shift) || (meta && shift && key === 'a')) {
        e.preventDefault();
        handleToggleAIAssistant();
        return;
      }

      if (matches('findInPage')) {
        e.preventDefault();
        setIsFindInPageOpen(prev => !prev);
        return;
      }

      // Hardcoded tab switching (Cmd + 1..9)
      if (meta && !shift && /^[1-9]$/.test(key)) {
        e.preventDefault();
        const num = parseInt(key, 10);
        // Compute from tabsRef OUTSIDE the updater (StrictMode-safe). Tabs are
        // unchanged here — only the selection moves.
        const currentTabs = tabsRef.current;
        if (num === 9 && currentTabs.length > 0) {
          setActiveTabId(currentTabs[currentTabs.length - 1].id);
        } else if (num <= currentTabs.length) {
          setActiveTabId(currentTabs[num - 1].id);
        }
        return;
      }

      // Zoom In (Cmd + + / Cmd + =)
      if (meta && (key === '+' || key === '=')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }

      // Zoom Out (Cmd + -)
      if (meta && key === '-') {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      // Reset Zoom (Cmd + 0)
      if (meta && key === '0') {
        e.preventDefault();
        handleResetZoom();
        return;
      }

      // History navigation (Cmd + [ / Cmd + ], Alt + Left / Alt + Right)
      if ((meta && key === '[') || (e.altKey && key === 'ArrowLeft')) {
        e.preventDefault();
        handleGoBack();
        return;
      }
      if ((meta && key === ']') || (e.altKey && key === 'ArrowRight')) {
        e.preventDefault();
        handleGoForward();
        return;
      }

      // Print Page (Cmd + P / Ctrl + P)
      if (meta && key === 'p') {
        e.preventDefault();
        handlePrintPage();
        return;
      }

      // Open DevTools (F12 or Cmd+Option+I / Ctrl+Shift+I)
      if (key === 'f12' || (meta && e.altKey && key === 'i') || (e.ctrlKey && e.shiftKey && key === 'i')) {
        e.preventDefault();
        handleOpenDevTools();
        return;
      }

      // Help Center / Shortcuts Guide (F1 or Cmd+? / Cmd+/)
      if (key === 'f1' || (meta && (key === '?' || key === '/'))) {
        e.preventDefault();
        closeAllModals();
        setHelpInitialTab(key === '?' || key === '/' ? 'shortcuts' : 'help');
        setIsHelpOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, handleNewTab, handleNewIncognitoTab, handleReload, handleToggleBookmarkActive, handleZoomIn, handleZoomOut, handleResetZoom, handleGoBack, handleGoForward, handleCloseTab, handleReopenClosedTab, handlePrintPage, handleOpenDevTools, handleTakeScreenshot, handleOpenDownloads, closeAllModals, settings.shortcuts, demoParams.isDemo, demoParams.feature]);

  const activeDownloadsCount = useMemo(() => downloads.filter(d => d.state === 'progressing').length, [downloads]);
  const isWebsiteDemo = demoParams.isDemo && demoParams.feature === 'website';
  const useVerticalTabs = isWebsiteDemo ? false : settings.useVerticalTabs;
  // Keep the settings object identity stable between unrelated App renders so
  // memoized BrowserViews do not re-render just because tab/sidebar state changed.
  const browserViewSettings = useMemo(() => ({
    ...settings,
    showTasksWidget: isWebsiteDemo ? false : settings.showTasksWidget,
  }), [settings, isWebsiteDemo]);

  // Compute stable primary (left) and secondary (right) tabs for split view.
  // Their physical positions remain stable based on tab order, even when activeTabId changes upon focus.
  const { primarySplitTab, secondarySplitTab } = useMemo(() => {
    if (!activeTab || !activeTab.splitWith) return { primarySplitTab: activeTab, secondarySplitTab: null };
    const partner = tabs.find(t => t.id === activeTab.splitWith);
    if (!partner) return { primarySplitTab: activeTab, secondarySplitTab: null };
    const activeIdx = tabs.findIndex(t => t.id === activeTab.id);
    const partnerIdx = tabs.findIndex(t => t.id === partner.id);
    return activeIdx <= partnerIdx
      ? { primarySplitTab: activeTab, secondarySplitTab: partner }
      : { primarySplitTab: partner, secondarySplitTab: activeTab };
  }, [activeTab, tabs]);

  const workspaceTabs = useMemo(() => tabs.filter(t => t.workspaceId === activeWorkspaceId || (!t.workspaceId && activeWorkspaceId === 'default')), [tabs, activeWorkspaceId]);

  // Numeric-aware compare: tab ids are timestamp strings, so a plain
  // localeCompare would sort "10" before "9" and scramble render order.
  // Keep all BrowserViews mounted so switching workspaces preserves native
  // webview state, scroll position, and page sessions.
  const sortedTabs = useMemo(() => [...tabs].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })), [tabs]);

  if (showOnboarding) {
    return (
      <React.Suspense fallback={<div className="h-screen w-screen bg-[#07050d]" />}>
        <Onboarding
          onComplete={handleOnboardingComplete}
        />
      </React.Suspense>
    );
  }

  return (
    <div 
      style={!activeTab?.isIncognito ? { backgroundColor: 'var(--nova-frame-bg)' } : undefined}
      className={`flex flex-row h-full w-full overflow-hidden text-slate-900 dark:text-slate-100 relative ${
        activeTab?.isIncognito
          ? 'bg-slate-950 dark:bg-[#0a0812]'
          : 'bg-slate-100 dark:bg-slate-950'
      } transition-colors duration-300`}>
      
      {/* Pinned Vertical Sidebar with smooth slide animation */}
      <AnimatePresence initial={false}>
        {useVerticalTabs && !isSidebarCollapsed && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 250, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="h-full flex flex-col shrink-0 relative z-50 overflow-hidden"
          >
            <SidebarTabs
              tabs={workspaceTabs}
              folders={folders}
              activeTabId={activeTabId}
              onSelectTab={handleSelectTab}
              onCloseTab={handleCloseTab}
              onNewTab={handleNewTab}
              onToggleMuteTab={handleToggleMuteTab}
              onDuplicateTab={handleDuplicateTab}
              onTogglePinTab={handleTogglePinTab}
              onCloseOtherTabs={handleCloseOtherTabs}
              onCloseTabsToRight={handleCloseTabsToRight}
              onNewTabRight={handleNewTabRight}
              onReopenClosedTab={handleReopenClosedTab}
              canReopenClosedTab={closedTabsStack.length > 0}
              onToggleBookmark={handleToggleBookmarkActive}
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              onSelectWorkspace={handleSelectWorkspace}
              isIncognito={activeTab?.isIncognito}
              onCreateFolder={handleCreateFolder}
              onToggleFolder={handleToggleFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
              onMoveTabToFolder={handleMoveTabToFolder}
              onOpenSpotlight={handleOpenSpotlight}
              onTabDragStart={handleTabDragStart}
              onTabDragEnd={handleTabDragEnd}
              onCloseSplit={handleCloseSplitView}
              onNavigate={handleNavigate}
              onGoBack={handleGoBack}
              onGoForward={handleGoForward}
              onReload={handleReload}
              canGoBack={activeTab?.canGoBack}
              canGoForward={activeTab?.canGoForward}
              isLoading={activeTab?.isLoading}
              searchEngine={settings.searchEngine}
              privacyShield={settings.privacyShield}
              onOpenDownloads={handleOpenDownloads}
              onOpenHistory={handleOpenHistory}
              onOpenSettings={handleOpenSettings}
              onOpenAccount={handleOpenAccount}
              onOpenHelp={handleOpenHelp}
              onOpenExtensions={handleOpenExtensions}
              onToggleAIAssistant={handleToggleAIAssistant}
              isAIAssistantOpen={isSidePanelOpen}
              bookmarks={bookmarks}
              isCollapsed={false}
              onReorderTabs={handleReorderTabs}
              onToggleCollapse={handleCollapseSidebar}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover Edge Trigger & Auto-Revealing Drawer when Collapsed */}
      {useVerticalTabs && isSidebarCollapsed && (
        <>
          {/* Left Edge Mouse Sensor for Instant Hover Reveal */}
          <div 
            className="fixed top-0 left-0 bottom-0 w-8 z-40 no-drag"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onMouseEnter={handleHoverSidebarOpen}
          />

          {/* Floating Expand Sidebar Button when Collapsed */}
          <div 
            className={`fixed top-2.5 ${isMac ? 'left-[82px]' : 'left-2.5'} z-45 flex items-center no-drag`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={handleExpandSidebar}
              onMouseEnter={handleHoverSidebarOpen}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              className="p-1.5 px-2 rounded-xl bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200/80 dark:border-white/10 transition-colors hover:scale-105 active:scale-95 flex items-center gap-1.5 text-xs font-medium cursor-pointer no-drag select-none"
              title="Expand Sidebar (⌘S)"
            >
              <PanelLeft className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">⌘S</span>
            </button>
          </div>

          {/* Smooth Sliding Overlay Sidebar on Hover */}
          <AnimatePresence>
            {isHoverRevealing && (
              <motion.div
                initial={{ x: -250, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -250, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                onMouseEnter={handleHoverSidebarOpen}
                onMouseLeave={handleHoverSidebarClose}
                style={{ backgroundColor: 'var(--nova-sidebar-bg)', borderColor: 'var(--nova-border-subtle)' }}
                className="fixed top-0 left-0 bottom-0 z-50 w-[240px] shadow-2xl overflow-hidden bg-white/95 dark:bg-slate-900/98 border-r border-slate-200 dark:border-white/10"
              >
                <SidebarTabs
                  tabs={workspaceTabs}
                  folders={folders}
                  activeTabId={activeTabId}
                  onSelectTab={handleSelectTab}
                  onCloseTab={handleCloseTab}
                  onNewTab={handleNewTab}
                  onToggleMuteTab={handleToggleMuteTab}
                  onDuplicateTab={handleDuplicateTab}
                  onTogglePinTab={handleTogglePinTab}
                  onCloseOtherTabs={handleCloseOtherTabs}
                  onCloseTabsToRight={handleCloseTabsToRight}
                  onNewTabRight={handleNewTabRight}
                  onReopenClosedTab={handleReopenClosedTab}
                  canReopenClosedTab={closedTabsStack.length > 0}
                  onToggleBookmark={handleToggleBookmarkActive}
                  workspaces={workspaces}
                  activeWorkspaceId={activeWorkspaceId}
                  onSelectWorkspace={handleSelectWorkspace}
                  isIncognito={activeTab?.isIncognito}
                  onCreateFolder={handleCreateFolder}
                  onToggleFolder={handleToggleFolder}
                  onRenameFolder={handleRenameFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onMoveTabToFolder={handleMoveTabToFolder}
                  onOpenSpotlight={handleOpenSpotlight}
                  onTabDragStart={handleTabDragStart}
                  onTabDragEnd={handleTabDragEnd}
                  onCloseSplit={handleCloseSplitView}
                  onNavigate={handleNavigate}
                  onGoBack={handleGoBack}
                  onGoForward={handleGoForward}
                  onReload={handleReload}
                  canGoBack={activeTab?.canGoBack}
                  canGoForward={activeTab?.canGoForward}
                  isLoading={activeTab?.isLoading}
                  searchEngine={settings.searchEngine}
                  privacyShield={settings.privacyShield}
                  onOpenDownloads={handleOpenDownloads}
                  onOpenHistory={handleOpenHistory}
                  onOpenSettings={handleOpenSettings}
                  onOpenAccount={handleOpenAccount}
                  onOpenHelp={handleOpenHelp}
                  onOpenExtensions={handleOpenExtensions}
                  onToggleAIAssistant={handleToggleAIAssistant}
                  isAIAssistantOpen={isSidePanelOpen}
                  bookmarks={bookmarks}
                  isCollapsed={true}
                  onReorderTabs={handleReorderTabs}
                  onToggleCollapse={handleExpandSidebar}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Main Viewport Card with fluid margin & border radius transition.
          PERF: transition is scoped to the properties that actually change on
          sidebar toggle (margin/radius/shadow) — a blanket transition-all makes
          the compositor watch every property of this full-size container. */}
      <div 
        style={!activeTab?.isIncognito ? { backgroundColor: 'var(--nova-frame-bg)' } : undefined}
        className={`flex flex-col flex-1 min-w-0 h-full relative z-40 ${useVerticalTabs ? 'overflow-hidden' : 'overflow-visible'} transition-[margin,border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        useVerticalTabs
          ? isSidebarCollapsed
            ? 'bg-white dark:bg-slate-900 m-0 rounded-none border-0'
            : 'rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-slate-900 m-2 ml-1.5' 
          : 'bg-white dark:bg-slate-900 rounded-none m-0 border-0'
      }`}>
        {/* TOP NAVIGATION BAR with fluid accordion fold transition */}
        <AnimatePresence initial={false}>
          {!useVerticalTabs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="w-full shrink-0 relative z-50 overflow-visible"
            >
              <TopBar 
                tabs={workspaceTabs}
                workspaces={workspaces}
                activeWorkspaceId={activeWorkspaceId}
                onSelectWorkspace={handleSelectWorkspace}
                activeTabId={activeTabId}
                bookmarks={bookmarks}
                activeDownloadsCount={activeDownloadsCount}
                downloads={downloads}
                onClearDownloads={handleClearDownloads}
                showBookmarksBar={settings.showBookmarksBar}
                useVerticalTabs={useVerticalTabs}
                onToggleReaderMode={handleToggleReaderMode}
                isSplitView={!!splitTabId}
                tabStyle={settings.tabStyle}
                tabAnimation={settings.tabAnimation}
                isIncognito={activeTab?.isIncognito}
                searchEngine={settings.searchEngine}
                onToggleBookmark={handleToggleBookmarkActive}
                onOpenHistory={handleOpenHistory}
                onOpenDownloads={handleOpenDownloads}
                onOpenSettings={handleOpenSettings}
                onOpenAccount={handleOpenAccount}
                onOpenHelp={handleOpenHelp}
                onOpenExtensions={handleOpenExtensions}
                onOpenShare={handleOpenShare}
                onTakeScreenshot={handleTakeScreenshot}
                onOpenFindInPage={handleOpenFindInPage}
                onToggleSplitView={handleToggleSplitView}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetZoom={handleResetZoom}
                onDuplicateTab={handleDuplicateTab}
                onTogglePinTab={handleTogglePinTab}
                onToggleMuteTab={handleToggleMuteTab}
                onCloseOtherTabs={handleCloseOtherTabs}
                onCloseTabsToRight={handleCloseTabsToRight}
                onNewTabRight={handleNewTabRight}
                onReopenClosedTab={handleReopenClosedTab}
                canReopenClosedTab={closedTabsStack.length > 0}
                onSuspendTab={handleSuspendTab}
                onReorderTabs={handleReorderTabs}
                onReorderFullList={handleReorderFullList}
                onTogglePip={handleTogglePip}
                onSelectTab={handleSelectTab}
                onCloseTab={handleCloseTab}
                onNewTab={handleNewTab}
                onNewIncognitoTab={handleNewIncognitoTab}
                onNavigate={handleNavigate}
                onGoBack={handleGoBack}
                onGoForward={handleGoForward}
                onReload={handleReload}
                isVpnEnabled={vpnEnabled}
                onToggleVpn={handleToggleVpn}
                onToggleAIAssistant={handleToggleAIAssistant}
                onTabDragStart={handleTabDragStart}
                onTabDragEnd={handleTabDragEnd}
                onTabDrag={handleTabDrag}
                onDropToSplitScreen={handleDropToSplitScreen}
                splitTabId={splitTabId}
                onCloseSplit={handleCloseSplitView}
                permissionRequests={permissionRequests}
                onRespondPermission={handleRespondPermission}
                onDismissPermission={handleDismissPermission}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Windows Controls Overlay Spacer & Drag Bar when Vertical Tabs is active */}
        {useVerticalTabs && isWindows && (
          <div 
            className="w-full h-8 shrink-0 flex items-center justify-between drag-region select-none px-3 bg-slate-100/60 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-white/5"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium truncate no-drag">
              <span className="truncate max-w-sm text-[11px]">{activeTab?.title || 'Nova Browser'}</span>
            </div>
            {/* 140px reserved spacer so Windows native titlebar controls don't overlap web content */}
            <div 
              className="w-[140px] h-full shrink-0 select-none drag-region" 
              style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} 
            />
          </div>
        )}

      {/* MAIN BROWSER CONTENT */}
      <main 
        id="browser-content-main"
        style={!activeTab?.isIncognito ? { backgroundColor: 'var(--nova-frame-bg)' } : undefined}
        className="flex-1 relative w-full h-full bg-white dark:bg-slate-900 flex overflow-hidden min-h-0"
        onDragOver={(e) => {
          const types = Array.from(e.dataTransfer?.types || []);
          if (types.includes('text/plain')) {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            const isLeft = (e.clientX - rect.left) < rect.width / 2;
            setSplitDragSide(isLeft ? 'left' : 'right');
            setIsDragOverMain(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOverMain(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOverMain(false);
          const tabId = e.dataTransfer.getData('text/plain');
          const draggedTab = tabs.find(t => t.id === tabId);
          if (draggedTab && tabId !== activeTabId && !draggedTab.splitWith) {
            const rect = e.currentTarget.getBoundingClientRect();
            const isLeft = (e.clientX - rect.left) < rect.width / 2;
            handleDropToSplitScreen(tabId, isLeft ? 'left' : 'right');
          }
        }}
      >
        {/* Split Screen Drop Overlay (Left or Right) */}
        <AnimatePresence>
          {isDragOverMain && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className={`absolute inset-y-0 ${
                splitDragSide === 'left' ? 'left-0 border-r-2' : 'right-0 border-l-2'
              } w-[48%] bg-blue-500/15 border-blue-500/60 backdrop-blur-sm z-[999] flex items-center justify-center pointer-events-none`}
            >
              <div className="bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2.5 text-sm font-semibold">
                {splitDragSide === 'left' ? (
                  <PanelLeft className="w-8 h-8" />
                ) : (
                  <PanelRight className="w-8 h-8" />
                )}
                <span>{splitDragSide === 'left' ? 'Split Left' : 'Split Right'}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prevent Webview from swallowing drag events during tab drag */}
        {isDraggingTab && (
          <div className="absolute inset-0 z-[990] pointer-events-auto" />
        )}

        {/* Find in page widget */}
        <FindInPage
          isOpen={isFindInPageOpen}
          onClose={handleCloseFindInPage}
          matchIndex={findMatches.index}
          matchCount={findMatches.count}
          onFind={handleFind}
          onStopFind={handleStopFind}
        />

        {/* Unified Browser Views Container (Single persistent container for primary, secondary split, and background tabs) */}
        <div 
          id="browser-views-container" 
          className="h-full relative flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden"
        >
          {sortedTabs.map((tab) => {
            const isPrimary = secondarySplitTab ? tab.id === primarySplitTab?.id : tab.id === activeTabId;
            const isSecondary = secondarySplitTab ? tab.id === secondarySplitTab?.id : false;
            const isTabVisible = isPrimary || isSecondary;

            let tabStyle: React.CSSProperties = {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '100%',
            };

            if (secondarySplitTab) {
              if (isPrimary) {
                tabStyle = {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: `${splitRatio}%`,
                  ...(!tab.isIncognito ? { backgroundColor: 'var(--nova-frame-bg)' } : {}),
                };
              } else if (isSecondary) {
                tabStyle = {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${splitRatio}%`,
                  width: `${100 - splitRatio}%`,
                  ...(!tab.isIncognito ? { backgroundColor: 'var(--nova-frame-bg)' } : {}),
                };
              }
            }

            return (
              <div
                key={tab.id}
                id={`tab-view-${tab.id}`}
                style={tabStyle}
                className={`h-full flex flex-col transition-none ${
                  isTabVisible
                    ? 'opacity-100 z-10 pointer-events-auto visible'
                    : 'opacity-0 z-0 pointer-events-none invisible'
                }`}
                onMouseDownCapture={() => {
                  if (secondarySplitTab) {
                    if (isSecondary && activeTabId !== secondarySplitTab.id) {
                      setActiveTabId(secondarySplitTab.id);
                    } else if (isPrimary && primarySplitTab && activeTabId !== primarySplitTab.id) {
                      setActiveTabId(primarySplitTab.id);
                    }
                  }
                }}
              >
                {/* Split Pane Header Bar (Positioned ABOVE webview so 0% of web content is obstructed) */}
                {Boolean(secondarySplitTab) && (isPrimary || isSecondary) && (
                  <div
                    onClick={() => {
                      if (activeTabId !== tab.id) setActiveTabId(tab.id);
                    }}
                    className={`h-8 min-h-[32px] px-3 flex items-center justify-between border-b select-none transition-all shrink-0 z-20 cursor-pointer ${
                      activeTabId === tab.id
                        ? 'bg-slate-100/95 dark:bg-slate-800/95 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                        : 'bg-slate-50/80 dark:bg-slate-900/80 border-slate-200/70 dark:border-slate-800/70 text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Left side: Pane Indicator + Favicon + Page Title + Hostname */}
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-colors shrink-0 ${
                        activeTabId === tab.id
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25'
                          : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-transparent'
                      }`}>
                        {isPrimary ? 'Left' : 'Right'}
                      </span>

                      {tab.favicon ? (
                        <img 
                          src={tab.favicon} 
                          alt="" 
                          className="w-3.5 h-3.5 rounded-xs object-contain shrink-0" 
                          onError={(e) => { (e.target as any).style.display = 'none'; }}
                        />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}

                      <span className="text-xs font-medium truncate max-w-[180px] sm:max-w-[240px]">
                        {tab.title || tab.url || 'New Tab'}
                      </span>

                      {/* Clean domain info */}
                      {(() => {
                        try {
                          if (tab.url && !tab.url.startsWith('nova://') && !tab.url.startsWith('about:')) {
                            const domain = new URL(tab.url).hostname.replace(/^www\./, '');
                            if (domain && domain !== tab.title) {
                              return (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate hidden md:inline max-w-[120px]">
                                  • {domain}
                                </span>
                              );
                            }
                          }
                        } catch {}
                        return null;
                      })()}
                    </div>

                    {/* Right side: Split Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Swap Left/Right */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (primarySplitTab && secondarySplitTab) {
                            handleReorderTabs(primarySplitTab.id, secondarySplitTab.id);
                          }
                        }}
                        className="p-1 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title={isPrimary ? "Swap with Right Pane" : "Swap with Left Pane"}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Exit Split View / Separate Tabs */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (primarySplitTab && secondarySplitTab) {
                            handleCloseSplitView(primarySplitTab.id, secondarySplitTab.id);
                          } else {
                            handleCloseSplitView();
                          }
                        }}
                        className="p-1 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Exit Split View"
                      >
                        <Columns2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Close Tab */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseTab(tab.id);
                        }}
                        className="p-1 hover:bg-red-500/15 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                        title="Close Tab"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Webview Container: Flex-1 ensures webview occupies 100% of remaining height beneath header */}
                <div className="flex-1 min-h-0 w-full relative">
                  <BrowserView 
                    tab={tab} 
                    onNavigate={handleNavigate}
                    onUpdateTab={handleUpdateTab}
                    onNewTab={handleNewTab}
                    onActivate={handleSelectTab}
                    onFoundInPage={handleFoundInPage}
                    searchEngine={settings.searchEngine}
                    privacyShield={settings.privacyShield}
                    newTabBackground={settings.newTabBackground}
                    disableTasksWidget={demoParams.feature === 'website'}
                    settings={browserViewSettings}
                    onUpdateSettings={handleUpdateSettings}
                    onExportData={handleExportData}
                    onImportData={handleImportData}
                    isActive={tab.id === activeTabId || tab.id === splitTabId}
                    onCloseTab={handleCloseTab}
                    isIncognito={tab.isIncognito || false}
                    history={typeof tab?.url === 'string' && tab.url.includes('nova://history') ? history : EMPTY_ARRAY}
                    downloads={typeof tab?.url === 'string' && tab.url.includes('nova://downloads') ? downloads : EMPTY_ARRAY}
                    onClearHistory={handleClearHistory}
                    onRemoveHistoryItem={handleRemoveHistoryItem}
                    onClearDownloads={handleClearDownloads}
                    onPurgeMemory={handlePurgeMemory}
                    onPerformSync={handlePerformSync}
                    isDemo={demoParams.isDemo}
                  />
                </div>
              </div>
            );
          })}

          {/* Split Screen Resizer Handle */}
          {secondarySplitTab && (
            <div 
              id="split-resizer-handle"
              style={{ left: `${splitRatio}%` }}
              className="absolute top-0 bottom-0 w-1.5 -ml-[3px] cursor-col-resize hover:bg-blue-500 active:bg-blue-600 bg-slate-300/60 dark:bg-slate-700/60 z-30 transition-colors flex items-center justify-center select-none"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.pageX;
                const startRatio = splitRatio;
                const container = document.getElementById('browser-views-container');
                const cachedContainerWidth = Math.max(1, container ? container.clientWidth : document.body.clientWidth);
                let rafId: number | null = null;
                let latestPageX = startX;

                const updateDOM = () => {
                  rafId = null;
                  const deltaX = latestPageX - startX;
                  let newRatio = startRatio + (deltaX / cachedContainerWidth) * 100;
                  newRatio = Math.max(20, Math.min(80, newRatio));
                  
                  if (primarySplitTab) {
                    const primEl = document.getElementById(`tab-view-${primarySplitTab.id}`);
                    if (primEl) primEl.style.width = `${newRatio}%`;
                  }
                  if (secondarySplitTab) {
                    const secEl = document.getElementById(`tab-view-${secondarySplitTab.id}`);
                    if (secEl) {
                      secEl.style.left = `${newRatio}%`;
                      secEl.style.width = `${100 - newRatio}%`;
                    }
                  }
                  const handleEl = document.getElementById('split-resizer-handle');
                  if (handleEl) {
                    handleEl.style.left = `${newRatio}%`;
                  }
                };

                const handleMouseMove = (moveEvent: MouseEvent) => {
                  latestPageX = moveEvent.pageX;
                  if (rafId === null) {
                    rafId = requestAnimationFrame(updateDOM);
                  }
                };
                
                const handleMouseUp = (upEvent: MouseEvent) => {
                  if (rafId !== null) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                  }
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                  
                  const deltaX = upEvent.pageX - startX;
                  let finalRatio = startRatio + (deltaX / cachedContainerWidth) * 100;
                  finalRatio = Math.max(20, Math.min(80, finalRatio));
                  setSplitRatio(finalRatio);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          )}
        </div>

        {/* AI Assistant Side Panel */}
        <React.Suspense fallback={null}>
          <SidePanel 
            isOpen={isSidePanelOpen} 
            onClose={handleCloseSidePanel}
            pendingActions={pendingAIActions}
            onPendingActionConsumed={consumeAIAction}
            isDemo={demoParams.isDemo && demoParams.feature === 'ai'}
          />
        </React.Suspense>
      </main>
      {/* SPOTLIGHT OMNIBOX */}
      <React.Suspense fallback={null}>
        {isSpotlightOpen && (
          <SpotlightOmnibox
            isOpen={isSpotlightOpen}
            onClose={handleCloseSpotlight}
            tabs={tabs}
            activeTabId={activeTabId}
            searchEngine={settings.searchEngine}
            onSelectTab={handleSpotlightSelectTab}
            onNewTab={handleNewTab}
            onCloseTab={handleCloseTab}
            onNavigate={handleNavigate}
          />
        )}
      </React.Suspense>

      {/* EXTENSIONS MODAL */}
      <React.Suspense fallback={null}>
        {isExtensionsOpen && (
          <ExtensionsModal
            isOpen={isExtensionsOpen}
            onClose={handleCloseExtensions}
            extensions={extensions}
            activeTab={activeTab}
            onToggleExtension={handleToggleExtension}
            onRemoveExtension={handleRemoveExtension}
            onManageExtensions={handleManageExtensions}
            onOpenUrl={handleNewTab}
          />
        )}
      </React.Suspense>

      {/* SHARE & QR CODE MODAL */}
      <React.Suspense fallback={null}>
        {isShareOpen && (
          <ShareModal
            isOpen={isShareOpen}
            onClose={handleCloseShare}
            url={activeTab?.url || ''}
            title={activeTab?.title || ''}
          />
        )}
      </React.Suspense>

      {/* SCREENSHOT MODAL */}
      <React.Suspense fallback={null}>
        {isScreenshotOpen && (
          <ScreenshotModal
            isOpen={isScreenshotOpen}
            onClose={handleCloseScreenshot}
            imageDataUrl={screenshotDataUrl}
            pageTitle={activeTab?.title || ''}
            onCaptureFullPage={handleCaptureFullPage}
          />
        )}
      </React.Suspense>

      {/* VPN POPOVER */}
      <React.Suspense fallback={null}>
        {isVpnPopoverOpen && (
          <VpnPopover
            isOpen={isVpnPopoverOpen}
            onClose={handleCloseVpnPopover}
            isEnabled={vpnEnabled}
            onToggle={setVpnEnabled}
            selectedLocation={vpnLocation}
            locations={vpnLocations}
            onSelectLocation={setVpnLocation}
            onAddLocation={handleAddVpnLocation}
            onRemoveLocation={handleRemoveVpnLocation}
            anchorRef={VPN_ANCHOR_REF}
          />
        )}
      </React.Suspense>

      </div>

      <React.Suspense fallback={null}>
        {isReaderModeOpen && (
          <ReaderMode 
            url={activeTab?.url || ''} 
            tabId={activeTabId} 
            isActive={isReaderModeOpen} 
            onClose={handleCloseReaderMode} 
          />
        )}
      </React.Suspense>

      <React.Suspense fallback={null}>
        {isWorkspaceManagerOpen && (
          <WorkspaceManager 
            isOpen={isWorkspaceManagerOpen} 
            onClose={handleCloseWorkspaceManager} 
            workspaces={workspaces} 
            onUpdateWorkspaces={handleUpdateWorkspaces} 
            activeWorkspaceId={activeWorkspaceId} 
            onSelectWorkspace={handleSelectWorkspace} 
            isIncognito={activeTab?.isIncognito} 
          />
        )}
      </React.Suspense>

      <React.Suspense fallback={null}>
        {isHelpOpen && (
          <HelpModal
            isOpen={isHelpOpen}
            onClose={() => setIsHelpOpen(false)}
            initialTab={helpInitialTab}
          />
        )}
      </React.Suspense>

      {/* NOVA ACCOUNT & CLOUD SYNC MODAL */}
      <React.Suspense fallback={null}>
        {isAccountModalOpen && (
          <AccountModal
            isOpen={isAccountModalOpen}
            onClose={() => setIsAccountModalOpen(false)}
            onPerformSync={handlePerformSync}
          />
        )}
      </React.Suspense>

      <DownloadToast downloads={downloads} />
      <UpdateToast />

      <AICursorOverlay />
    </div>
  );
}

export default App;
