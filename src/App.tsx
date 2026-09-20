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
import { useOnboarding } from './hooks/useOnboarding';
import { useExtensions } from './hooks/useExtensions';
import { useAppSync } from './hooks/useAppSync';
import { useDiskHydrationFallback } from './hooks/useDiskHydrationFallback';
import { useZoom } from './hooks/useZoom';
import { useBrowserAgentBridge } from './hooks/useBrowserAgentBridge';
import { useTabOperations } from './hooks/useTabOperations';
import { useAppIpc, type AppEventHandlers } from './hooks/useAppIpc';
import { useFolders } from './hooks/useFolders';
import { useSplitView } from './hooks/useSplitView';
import { useAppDataBackup } from './hooks/useAppDataBackup';
import { useScreenshots } from './hooks/useScreenshots';
import { useWebviewNavigation } from './hooks/useWebviewNavigation';
import { useDemoShowcase } from './hooks/useDemoShowcase';
import { useSettings } from './hooks/useSettings';
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
import { logger } from './utils/logger';
import {
  EMPTY_ARRAY,
  normalizeAIActionPayload,
  getDemoParams,
  isMac,
  isWindows,
} from './utils/appConstants';



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
  // Extension listesi & operations: useExtensions'a taşındı.
  const { extensions, setExtensions, handleToggleExtension, handleRemoveExtension } = useExtensions();
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
  // (the marketing website passes demo options directly) must stay stable.
  useDemoShowcase({
    isDemo: demoParams.isDemo,
    demoOptions,
    feature: demoParams.feature,
    setTabs,
    setActiveTabId,
    setIsSidePanelOpen,
  });

  // (extensions fetch + subscription useExtensions'a taşındı — yukarıda.)

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

  // Onboarding state + ilk-açılış kontrolü + complete handler useOnboarding'da
  // (aşağıda, settings/bookmarks'tan sonra: callback'ler setSettings/setBookmarks
  // kullanır; hook call order değişimi güvenli — tüm hook'lar koşulsuz).

  // User settings & shortcuts migration (extracted to useSettings)
  const {
    settings,
    setSettings,
    settingsRef,
    handleUpdateSettings,
  } = useSettings({
    isDemo: demoParams.isDemo,
    demoTheme: demoParams.theme,
    showTasksWidget: demoParams.showTasksWidget,
    demoFeature: demoParams.feature,
    demoTabs: demoParams.tabs,
    demoBg: demoParams.bg,
    isMac,
  });



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

  // Onboarding: showOnboarding state + ilk-açılış kontrolü + window.openOnboarding
  // + handleOnboardingComplete hook'ta. Settings/bookmarks yazma gövdeleri
  // App'ten birebir taşındı (sadece yer değişti: callback olarak burada).
  const { showOnboarding, handleOnboardingComplete } = useOnboarding({
    isDemo: demoParams.isDemo,
    onUpdateSettings: (prefs) => setSettings(s => ({
      ...s,
      theme: prefs.theme,
      searchEngine: prefs.searchEngine,
      privacyShield: prefs.privacyShield
    })),
    onImportBookmarks: (imported) => setBookmarks(prev => [...prev, ...imported]),
  });

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
  

  // Disk-backed storage hydration fallback: restore session tabs, folders,
  // workspaces, bookmarks and settings from Electron disk store if localStorage
  // was cleared/corrupted.
  useDiskHydrationFallback({
    isDemo: demoParams.isDemo,
    setSettings,
    setWorkspaces,
    setFolders,
    setBookmarks,
    setTabs,
  });

  // Cloud sync handler + background auto-sync + realtime listener
  const { handlePerformSync } = useAppSync({
    bookmarks,
    folders,
    history,
    settings,
    workspaces,
    setBookmarks,
    setFolders,
    setHistory,
    setSettings,
    setWorkspaces,
  });

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
  const {
    splitTabId,
    handleCloseSplitView,
    handleToggleSplitView,
  } = useSplitView({
    activeTab,
    activeTabId,
    tabs,
    activeWorkspaceId,
    setTabs,
    activeSplitTabIdRef,
    setSplitRatio,
  });

  // Tab CRUD & lifecycle operations (extracted to useTabOperations)
  const {
    handleSelectTab,
    handleSuspendTab,
    handlePurgeMemory,
    handleCloseTab,
    handleReorderTabs,
    handleReorderFullList,
    handleDuplicateTab,
    handleTogglePinTab,
    handleCloseOtherTabs,
    handleCloseTabsToRight,
    handleNewTabRight,
    handlePrintPage,
    handleOpenDevTools,
    handleNewTab,
    handleNewIncognitoTab,
    handleNavigate,
    handleUpdateTab,
    handleToggleMuteTab,
    handleTogglePip,
  } = useTabOperations({
    tabsRef,
    activeTabId,
    activeTabIdRef,
    splitTabId,
    activeWorkspaceId,
    activeWorkspaceIdRef,
    setTabs,
    setActiveTabId,
    pushClosedTab,
    pushClosedTabs,
    recordVisit,
    setIsExtensionsOpen,
  });

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

  // Pop + restore: stack hook'ta, tab oluşturma onReopen callback'inde (yukarıda).
  const handleReopenClosedTab = useCallback(() => {
    reopenLastClosed();
  }, [reopenLastClosed]);



  // Ref holding the LATEST handler identities for the mount-time listeners below.
  // Re-assigned every render (see assignment after all handlers are defined) so
  // listeners registered once with [] deps never invoke stale closures
  // (e.g. ⌘T creating a tab in a stale workspace, ⌘W closing a stale active tab).
  const handlersRef = useRef<AppEventHandlers>(null!);

  // Global IPC and Event Listener Hub (extracted to useAppIpc)
  useAppIpc({
    handlersRef,
    activeTabIdRef,
    setIsSpotlightOpen,
    setIsFindInPageOpen,
    setHelpInitialTab,
    setIsHelpOpen,
    setIsSidePanelOpen,
    setIsWorkspaceManagerOpen,
    setIsAccountModalOpen,
    setSettings,
    queueAIAction,
    setTabs,
  });

  // Folder Management (extracted to useFolders)
  const {
    handleCreateFolder,
    handleToggleFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleMoveTabToFolder,
  } = useFolders({
    folders,
    setFolders,
    activeWorkspaceId,
    tabsRef,
    setTabs,
  });



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



  const { handleZoomIn, handleZoomOut, handleResetZoom } = useZoom({
    activeTabId,
    setTabs,
  });




  // Setup AI Agent Action Context and MCP Action Bridge
  useBrowserAgentBridge({
    activeTabId,
    tabs,
    history,
    bookmarks,
    settingsRef,
    activeWorkspaceIdRef,
    setActiveWorkspaceId,
    setActiveTabId,
    setTabs,
    handleNavigate,
    handleNewTab,
    handleCloseTab,
    handleSelectTab,
  });




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

  // Screenshot capture operations (extracted to useScreenshots)
  const {
    screenshotDataUrl,
    handleTakeScreenshot,
    handleCaptureFullPage,
  } = useScreenshots({
    activeTabId,
    tabs,
    setIsScreenshotOpen,
  });

  const handleOpenFindInPage = useCallback(() => setIsFindInPageOpen(prev => !prev), []);

  // Webview navigation operations (extracted to useWebviewNavigation)
  const {
    handleGoBack,
    handleGoForward,
    handleReload,
  } = useWebviewNavigation({ activeTabId });

  // App data export & import (extracted to useAppDataBackup)
  const { handleExportData, handleImportData } = useAppDataBackup({
    bookmarks,
    history,
    settings,
    setBookmarks,
    setHistory,
    setSettings,
  });

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

  // handleOnboardingComplete useOnboarding'dan gelir (yukarıda); settings merge +
  // importedBookmarks append callback'leri hook'a taşındı, davranış birebir aynı.

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
