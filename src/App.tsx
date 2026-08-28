import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRight, PanelLeft, Columns2, ArrowLeftRight, X } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { BrowserView } from './components/BrowserView';
// Downloads / history / permission domains were extracted into hooks under
// src/hooks. The item types moved with them and are re-exported here so the
// existing `from '../App'` import paths (DownloadToast, DownloadsPopover,
// HistoryPage, BrowserView, syncService) keep resolving unchanged.
import { useDownloads } from './hooks/useDownloads';
export type { DownloadItem } from './hooks/useDownloads';
import { useHistoryRecorder, type HistoryItem } from './hooks/useHistoryRecorder';
export type { HistoryItem };
import { usePermissionRequests } from './hooks/usePermissionRequests';
export interface UserSettings {
  searchEngine: 'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia' | 'yahoo';
  privacyShield: boolean;
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  accentColor: 'blue' | 'emerald' | 'purple' | 'rose' | 'amber' | 'custom';
  customAccentColor?: string;
  showBookmarksBar: boolean;
  useVerticalTabs: boolean;
  mcpServerEnabled: boolean;
  showTasksWidget?: boolean;
  newTabBackground: 'default' | 'gradient' | 'mesh' | 'glass' | 'unsplash' | 'custom_url' | 'aurora_waves' | 'cyber_grid' | 'hyper_space' | 'fireflies' | 'nebula' | 'matrix';
  backgroundCustomUrl?: string;
  startupBehavior: 'newTab' | 'continue' | 'specificPages';
  tabStyle: 'rounded' | 'square' | 'floating';
  doNotTrack: boolean;
  clearOnExit: boolean;
  hardwareAcceleration: boolean;
  developerMode: boolean;
  tabHibernationEnabled?: boolean;
  hibernationTimeoutMinutes?: number;
  shortcuts?: Record<string, { key: string; shift?: boolean; meta?: boolean }>;
  aiLinkPreviewEnabled?: boolean;
  energySaverMode?: boolean;
  preloadDnsEnabled?: boolean;
  smoothScrollingEnabled?: boolean;
  passwordManagerEnabled?: boolean;
  defaultTranslationLanguage?: string;
}
import { FindInPage } from './components/FindInPage';
import { SpotlightOmnibox } from './components/SpotlightOmnibox';
import { VpnPopover, VpnLocation } from './components/VpnPopover';
import { DownloadToast } from './components/DownloadToast';
import { UpdateToast } from './components/UpdateToast';
import { AICursorOverlay } from './components/AICursorOverlay';
import { SidebarTabs } from './components/SidebarTabs';
import { isSafeNavigationUrl } from './utils/safeNavigation';

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

// VpnPopover requires an anchorRef prop, but no element ever attaches to it
// (the VPN toggle lives inside TopBar's more-menu, which is unmounted while
// closed), so the popover has always used its fallback positioning
// (top: 50, right: 80). This shared empty ref keeps that exact behavior
// without allocating a new object per render.
const VPN_ANCHOR_REF: React.RefObject<HTMLButtonElement> = { current: null };

import { aiAgent } from './services/aiAgent';
import { Tab, Folder, Bookmark, Extension, Workspace } from './types/browser';
import { tabThumbnailCache } from './services/thumbnailCache';
import { syncService } from './services/syncService';

const DEFAULT_VPN_LOCATIONS: VpnLocation[] = [
  { id: 'us-1', name: 'United States (Public)', url: 'http://198.199.86.11:8080', type: 'free' },
  { id: 'uk-1', name: 'United Kingdom (Public)', url: 'http://188.166.38.163:8080', type: 'free' },
  { id: 'de-1', name: 'Germany (Public)', url: 'http://167.235.215.35:8080', type: 'free' },
];

const EMPTY_ARRAY: any[] = [];

// Bag of latest event handler identities for mount-time IPC listeners.
// Listeners registered once with [] deps would otherwise capture stale
// mount-time closures; they read handlersRef.current instead (see below).
type AppEventHandlers = {
  handleNewTab: (url?: string | any) => void;
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

// Demo mode query parameter inspection
const getDemoParams = () => {
  if (typeof window === 'undefined') return { isDemo: false, feature: 'default', bg: 'default', theme: 'dark' as const, tabs: 'horizontal' };
  const params = new URLSearchParams(window.location.search);
  return {
    isDemo: params.get('demo') === 'true',
    feature: params.get('feature') || 'default',
    bg: params.get('bg') || 'default',
    theme: ((params.get('theme') === 'light' ? 'light' : 'dark') as 'dark' | 'light'),
    tabs: params.get('tabs') || 'horizontal'
  };
};

function App() {
  const demoParams = useMemo(() => getDemoParams(), []);

  // Sync theme dynamically when running in an embedded demo iframe
  useEffect(() => {
    if (demoParams.isDemo) {
      const handleMessage = (e: MessageEvent) => {
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
          { id: '1', url: 'https://github.com/unitybtw/nova-browser', title: 'Nova Browser - GitHub', isLoading: false },
          { id: '2', url: 'nova://newtab', title: 'New Tab', isLoading: false }
        ];
      }
      if (demoParams.feature === 'vertical_tabs') {
        return [
          { id: '1', url: 'https://react.dev', title: 'React 19 Docs', workspaceId: 'default', isLoading: false },
          { id: '2', url: 'https://tailwindcss.com', title: 'Tailwind CSS v4', workspaceId: 'default', isLoading: false },
          { id: '3', url: 'https://spotify.com', title: 'Spotify Web (Playing)', isMuted: false, workspaceId: 'default', isLoading: false },
          { id: '4', url: 'https://arxiv.org', title: 'ArXiv AI Papers', workspaceId: 'default', isLoading: false }
        ];
      }
      if (demoParams.feature === 'split') {
        return [
          { id: '1', url: 'https://react.dev/reference/react', title: 'React Documentation', isLoading: false, splitWith: '2' },
          { id: '2', url: 'https://tailwindcss.com/docs', title: 'Tailwind CSS Docs', isLoading: false, splitWith: '1' }
        ];
      }
      if (demoParams.feature === 'shield') {
        return [
          { id: '1', url: 'https://techinsider.io/ai-revolution', title: 'Tech News & Privacy', blockedAdsCount: 148, isLoading: false },
          { id: '2', url: 'nova://newtab', title: 'New Tab', isLoading: false }
        ];
      }
    }

    let startupBehavior = 'newTab';
    try {
      const savedSettings = localStorage.getItem('user_settings');
      if (savedSettings) {
        startupBehavior = JSON.parse(savedSettings).startupBehavior || 'newTab';
      }
    } catch (e) {}

    if (startupBehavior === 'continue') {
      const saved = localStorage.getItem('nova_session_tabs');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }

    return [
      {
        id: '1',
        url: 'nova://newtab',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false
      }
    ];
  });
  
  const [activeTabId, setActiveTabId] = useState<string>(() => {
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

  const [folders, setFolders] = useState<Folder[]>(() => {
    if (demoParams.isDemo && demoParams.feature === 'vertical_tabs') {
      return [
        { id: 'f1', name: 'Frontend Stack', color: '#3b82f6', isOpen: true, tabIds: ['1', '2'] },
        { id: 'f2', name: 'Research Papers', color: '#a855f7', isOpen: false, tabIds: ['4'] }
      ];
    }
    const saved = localStorage.getItem('folders_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [helpInitialTab, setHelpInitialTab] = useState<'help' | 'shortcuts' | 'ai' | 'privacy' | 'about'>('help');
  
  // Workspaces State
  const [workspaces, setWorkspaces] = useState<import('./types/browser').Workspace[]>(() => {
    const saved = localStorage.getItem('workspaces_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      { id: 'default', name: 'Personal', color: 'slate' },
      { id: 'work', name: 'Work', color: 'blue' },
      { id: 'research', name: 'Research', color: 'purple' }
    ];
  });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    return localStorage.getItem('active_workspace_session') || 'default';
  });

  useEffect(() => {
    try {
      localStorage.setItem('workspaces_session', JSON.stringify(workspaces));
    } catch (e) {}
    try {
      localStorage.setItem('active_workspace_session', activeWorkspaceId);
    } catch (e) {}
  }, [workspaces, activeWorkspaceId]);

  // AI Assistant State
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(() => {
    return demoParams.isDemo && demoParams.feature === 'ai';
  });

  const [isReaderModeOpen, setIsReaderModeOpen] = useState(false);
  const [isFindInPageOpen, setIsFindInPageOpen] = useState(false);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [isVpnPopoverOpen, setIsVpnPopoverOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [findMatches, setFindMatches] = useState<{ index: number; count: number }>({ index: 0, count: 0 });
  const [isDragOverMain, setIsDragOverMain] = useState(false);
  const [splitDragSide, setSplitDragSide] = useState<'left' | 'right'>('right');
  const [isDraggingTab, setIsDraggingTab] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHoverRevealing, setIsHoverRevealing] = useState(false);
  const hoverCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const [vpnEnabled, setVpnEnabled] = useState(false);
  const [vpnLocation, setVpnLocation] = useState<VpnLocation>(DEFAULT_VPN_LOCATIONS[0]);
  const [vpnLocations, setVpnLocations] = useState<VpnLocation[]>(() => {
    try {
      const saved = localStorage.getItem('nova_vpn_locations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return [...DEFAULT_VPN_LOCATIONS, ...parsed];
        }
      }
    } catch (e) {}
    return DEFAULT_VPN_LOCATIONS;
  });

  const handleAddVpnLocation = useCallback((newLoc: VpnLocation) => {
    setVpnLocations(prev => {
      const updated = [...prev, newLoc];
      try {
        localStorage.setItem('nova_vpn_locations', JSON.stringify(updated.filter(l => l.type === 'custom')));
      } catch (e) {}
      return updated;
    });
  }, []);

  const handleRemoveVpnLocation = useCallback((id: string) => {
    setVpnLocations(prev => {
      const updated = prev.filter(l => l.id !== id);
      try {
        localStorage.setItem('nova_vpn_locations', JSON.stringify(updated.filter(l => l.type === 'custom')));
      } catch (e) {}
      return updated;
    });
  }, []);

  // Automated Real Browser Demo Showcase for Website
  useEffect(() => {
    if (!demoParams.isDemo) return;

    let cycle = 0;
    const runCycle = () => {
      if (cycle === 0) {
        // Scene 1: arXiv AI Research + AI Sidepanel + Glowing Cursor
        setTabs([
          { id: '1', url: 'https://arxiv.org/list/cs.AI/recent', title: 'arXiv / cs.AI Research', isLoading: false, canGoBack: false, canGoForward: false },
          { id: '2', url: 'nova://newtab', title: 'New Tab', isLoading: false, canGoBack: false, canGoForward: false }
        ]);
        setActiveTabId('1');
        setIsSidePanelOpen(true);

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ai-cursor', {
            detail: { x: Math.round(window.innerWidth * 0.35), y: 160, action: 'move' }
          }));
        }, 800);

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ai-cursor', {
            detail: { x: Math.round(window.innerWidth * 0.35), y: 160, action: 'click' }
          }));
        }, 2200);
      } else if (cycle === 1) {
        // Scene 2: New Tab Page with Clock, Tasks, Speed Dials
        setIsSidePanelOpen(false);
        setActiveTabId('2');

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ai-cursor', {
            detail: { x: Math.round(window.innerWidth * 0.5), y: 230, action: 'move' }
          }));
        }, 800);

        setTimeout(() => {
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

    return () => clearInterval(interval);
  }, [demoParams.isDemo]);

  // Load extensions on mount
  useEffect(() => {
    const fetchExtensions = async () => {
      try {
        if ((window as any).electronAPI?.listExtensions) {
          const loaded = await (window as any).electronAPI.listExtensions();
          setExtensions(loaded || []);
        }
      } catch (err) {
        console.error('Failed to load extensions', err);
      }
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

  const closeAllModals = useCallback(() => {
    setIsShareOpen(false);
    setIsScreenshotOpen(false);
    setIsSpotlightOpen(false);
    setIsVpnPopoverOpen(false);
    setIsExtensionsOpen(false);
    setIsHelpOpen(false);
    setIsAccountModalOpen(false);
  }, []);

  const openModal = useCallback((modalName: 'share' | 'spotlight' | 'extensions') => {
    closeAllModals();
    if (modalName === 'share') setIsShareOpen(true);
    else if (modalName === 'spotlight') setIsSpotlightOpen(true);
    else if (modalName === 'extensions') setIsExtensionsOpen(true);
  }, [closeAllModals]);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    if (demoParams.isDemo) return false;
    return localStorage.getItem('nova_onboarding_complete') !== 'true';
  });

  useEffect(() => {
    (window as any).openOnboarding = () => setShowOnboarding(true);
  }, []);

  // User settings
  const [settings, setSettings] = useState<UserSettings>(() => {
    const defaultSettings: UserSettings = {
      searchEngine: 'google',
      privacyShield: true,
      theme: demoParams.isDemo ? demoParams.theme : 'dark',
      fontSize: 'medium',
      accentColor: 'blue',
      customAccentColor: '#3b82f6',
      showBookmarksBar: false,
      useVerticalTabs: demoParams.isDemo ? (demoParams.tabs === 'vertical') : true,
      mcpServerEnabled: false,
      newTabBackground: (demoParams.bg as any) || (demoParams.feature === 'vertical_tabs' ? 'cyber_grid' : demoParams.feature === 'ai' ? 'nebula' : 'default'),
      backgroundCustomUrl: '',
      startupBehavior: 'newTab',
      tabStyle: 'floating',
      doNotTrack: true,
      clearOnExit: false,
      hardwareAcceleration: true,
      developerMode: false,
      tabHibernationEnabled: true,
      hibernationTimeoutMinutes: 10,
      energySaverMode: false,
      preloadDnsEnabled: true,
      smoothScrollingEnabled: true,
      passwordManagerEnabled: false,
      shortcuts: {
        newTab: { key: 't', shift: false, meta: true },
        reopenTab: { key: 't', shift: true, meta: true },
        closeTab: { key: 'w', shift: false, meta: true },
        newIncognito: { key: 'n', shift: true, meta: true },
        reload: { key: 'r', shift: false, meta: true },
        omnibox: { key: 'l', shift: false, meta: true },
        bookmark: { key: 'd', shift: false, meta: true },
        history: { key: 'h', shift: false, meta: true },
        downloads: { key: 'j', shift: false, meta: true },
        findInPage: { key: 'f', shift: false, meta: true },
      }
    };

    if (demoParams.isDemo) {
      return defaultSettings;
    }

    try {
      const saved = localStorage.getItem('user_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...defaultSettings, ...parsed };
        }
      }
    } catch (e) {
      console.error('Failed to load user_settings from localStorage:', e);
    }
    return defaultSettings;
  });

  // Sync settings with local storage and backend
  useEffect(() => {
    try {
      localStorage.setItem('user_settings', JSON.stringify(settings));
    } catch (e) {}
    if ((window as any).electronAPI?.storeSet) {
      (window as any).electronAPI.storeSet('settings', JSON.stringify(settings));
    }
    if (window.electronAPI?.setPrivacyShield) {
      window.electronAPI.setPrivacyShield(settings.privacyShield);
    }
    if ((window as any).electronAPI?.setDoNotTrack) {
      (window as any).electronAPI.setDoNotTrack(settings.doNotTrack ?? true);
    }
  }, [settings]);

  // Control native macOS traffic lights (3 dots) visibility when vertical tabs sidebar is collapsed
  useEffect(() => {
    if (!settings.useVerticalTabs) {
      (window as any).electronAPI?.setWindowButtonVisibility?.(true);
      return;
    }
    const shouldShowButtons = !isSidebarCollapsed || isHoverRevealing;
    (window as any).electronAPI?.setWindowButtonVisibility?.(shouldShowButtons);
  }, [settings.useVerticalTabs, isSidebarCollapsed, isHoverRevealing]);

  useEffect(() => {
    const savedVpn = localStorage.getItem('nova_vpn');
    if (savedVpn) {
      try {
        const { enabled, location, customLocations } = JSON.parse(savedVpn);
        setVpnEnabled(enabled);
        if (location) setVpnLocation(location);
        if (customLocations && Array.isArray(customLocations)) {
          setVpnLocations([...DEFAULT_VPN_LOCATIONS, ...customLocations]);
        }
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    const customLocations = vpnLocations.filter(loc => loc.type === 'custom');
    localStorage.setItem('nova_vpn', JSON.stringify({ enabled: vpnEnabled, location: vpnLocation, customLocations }));
    
    if (typeof window !== 'undefined' && (window as any).electronAPI?.setVpn) {
      (window as any).electronAPI.setVpn({ 
        enabled: vpnEnabled, 
        proxyUrl: vpnLocation.url 
      }).then((success: boolean) => {
        if (!success && vpnEnabled) {
          console.error("Failed to set proxy via electron");
        }
      });
    }
  }, [vpnEnabled, vpnLocation, vpnLocations]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onAdBlockedBatch) {
      const removeListener = (window as any).electronAPI.onAdBlockedBatch((_event: any, batch: Record<number, number>) => {
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
      return () => removeListener();
    }
  }, []);

  // Listen for native Chromium webview audio state updates from Electron main process
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onTabAudioChanged) {
      const removeListener = (window as any).electronAPI.onTabAudioChanged((_event: any, { webContentsId, isPlayingAudio }: { webContentsId: number; isPlayingAudio: boolean }) => {
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
  const { history, setHistory, recordVisit } = useHistoryRecorder();

  // Save session whenever tabs changes (Excluding Incognito Tabs)
  useEffect(() => {
    const sessionTabs = tabs
      .filter(t => !t.isIncognito);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('nova_session_tabs', JSON.stringify(sessionTabs));
      } catch (e) {}
    }, 2000);

    return () => clearTimeout(timer);
  }, [tabs]);

  // Tab list reconciliation: ensure at least one tab exists and activeTabId is valid
  useEffect(() => {
    if (tabs.length === 0) {
      const fallbackId = Date.now().toString();
      setTabs([{
        id: fallbackId,
        url: 'nova://newtab',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false
      }]);
      setActiveTabId(fallbackId);
    } else if (!tabs.some(t => t.id === activeTabId)) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    try {
      localStorage.setItem('active_tab_session', activeTabId);
    } catch (e) {}
  }, [activeTabId]);

  useEffect(() => {
    try {
      localStorage.setItem('folders_session', JSON.stringify(folders));
    } catch (e) {}
  }, [folders]);

  // Apply Theme Mode & Custom Accent
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    
    // Apply custom accent colors via style injection
    let accentStyleEl = document.getElementById('nova-accent-style');
    if (!accentStyleEl) {
      accentStyleEl = document.createElement('style');
      accentStyleEl.id = 'nova-accent-style';
      document.head.appendChild(accentStyleEl);
    }
    
    if (settings.accentColor === 'custom' && settings.customAccentColor) {
      // VULN-26 FIX: Validate hex color to prevent CSS injection
      const isValidHex = /^#[0-9a-fA-F]{3,8}$/.test(settings.customAccentColor);
      const hex = isValidHex ? settings.customAccentColor : '#3b82f6';
      accentStyleEl.innerHTML = `
        :root {
          --color-blue-50: color-mix(in oklab, ${hex} 10%, white) !important;
          --color-blue-100: color-mix(in oklab, ${hex} 20%, white) !important;
          --color-blue-200: color-mix(in oklab, ${hex} 40%, white) !important;
          --color-blue-300: color-mix(in oklab, ${hex} 60%, white) !important;
          --color-blue-400: color-mix(in oklab, ${hex} 80%, white) !important;
          --color-blue-500: ${hex} !important;
          --color-blue-600: color-mix(in oklab, ${hex} 80%, black) !important;
          --color-blue-700: color-mix(in oklab, ${hex} 60%, black) !important;
          --color-blue-800: color-mix(in oklab, ${hex} 40%, black) !important;
          --color-blue-900: color-mix(in oklab, ${hex} 20%, black) !important;
          --color-blue-950: color-mix(in oklab, ${hex} 10%, black) !important;
          --nova-accent: ${hex};
          --nova-accent-hover: color-mix(in oklab, ${hex} 80%, black);
          --nova-accent-light: color-mix(in oklab, ${hex} 20%, white);
          --nova-accent-dark: color-mix(in oklab, ${hex} 60%, black);
          --nova-accent-text: #ffffff;
        }
      `;
    } else {
      // Map standard colors
      const defaultColorMap: Record<string, string> = {
        'blue': '#3b82f6',
        'emerald': '#10b981',
        'purple': '#a855f7',
        'rose': '#f43f5e',
        'amber': '#f59e0b'
      };
      const hex = defaultColorMap[settings.accentColor] || defaultColorMap['blue'];
      
      // If it's standard blue, we can either clear or just set it
      if (settings.accentColor === 'blue') {
        accentStyleEl.innerHTML = `
          :root {
            --nova-accent: ${hex};
            --nova-accent-hover: color-mix(in oklab, ${hex} 80%, black);
            --nova-accent-light: color-mix(in oklab, ${hex} 20%, white);
            --nova-accent-dark: color-mix(in oklab, ${hex} 60%, black);
            --nova-accent-text: #ffffff;
          }
        `;
      } else {
        accentStyleEl.innerHTML = `
          :root {
            --color-blue-50: color-mix(in oklab, ${hex} 10%, white) !important;
            --color-blue-100: color-mix(in oklab, ${hex} 20%, white) !important;
            --color-blue-200: color-mix(in oklab, ${hex} 40%, white) !important;
            --color-blue-300: color-mix(in oklab, ${hex} 60%, white) !important;
            --color-blue-400: color-mix(in oklab, ${hex} 80%, white) !important;
            --color-blue-500: ${hex} !important;
            --color-blue-600: color-mix(in oklab, ${hex} 80%, black) !important;
            --color-blue-700: color-mix(in oklab, ${hex} 60%, black) !important;
            --color-blue-800: color-mix(in oklab, ${hex} 40%, black) !important;
            --color-blue-900: color-mix(in oklab, ${hex} 20%, black) !important;
            --color-blue-950: color-mix(in oklab, ${hex} 10%, black) !important;
            --nova-accent: ${hex};
            --nova-accent-hover: color-mix(in oklab, ${hex} 80%, black);
            --nova-accent-light: color-mix(in oklab, ${hex} 20%, white);
            --nova-accent-dark: color-mix(in oklab, ${hex} 60%, black);
            --nova-accent-text: #ffffff;
          }
        `;
      }
    }

    // Apply to Electron nativeTheme for webviews
    if ((window as any).electronAPI?.setTheme) {
      (window as any).electronAPI.setTheme(settings.theme || 'system');
    }

    // Listen for system theme changes if using system
    if (settings.theme === 'system' || !settings.theme) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme, settings.accentColor, settings.customAccentColor]);
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const saved = localStorage.getItem('bookmarks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load bookmarks from localStorage:', e);
    }
    return [];
  });

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    } catch (e) {}
  }, [bookmarks]);

  // Cloud Sync Handler
  const handlePerformSync = useCallback(async () => {
    try {
      let localPasswords: any[] = [];
      try {
        const rawP = await (window as any).electronAPI?.secureStoreGet?.('passwords');
        if (rawP) localPasswords = JSON.parse(rawP);
      } catch (e) {}

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

        if (mergedData.passwords && (window as any).electronAPI?.secureStoreSet) {
          await (window as any).electronAPI.secureStoreSet('passwords', JSON.stringify(mergedData.passwords));
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

  const [closedTabsStack, setClosedTabsStack] = useState<Tab[]>([]);
  const closedTabsStackRef = useRef(closedTabsStack);
  closedTabsStackRef.current = closedTabsStack;

  // Active Tab & Derived Split Partner Tab
  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId) || tabs[0], [tabs, activeTabId]);
  const splitTabId = useMemo(() => {
    if (!activeTab || !activeTab.splitWith) return null;
    const partner = tabs.find(t => t.id === activeTab.splitWith);
    return partner ? partner.id : null;
  }, [activeTab, tabs]);

  // Select/focus tab & reset hibernation timer
  const handleSelectTab = useCallback((id: string) => {
    // Performance: skip the setTabs cascade when re-selecting the active tab
    // unless it needs waking from hibernation.
    if (id === activeTabIdRef.current && !tabsRef.current.find(t => t.id === id)?.isSuspended) {
      return;
    }
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
    // 3. Invoke native Electron session cache purge & host resolver trim
    try {
      if ((window as any).electronAPI?.purgeSystemMemory) {
        await (window as any).electronAPI.purgeSystemMemory();
      }
    } catch (err) {
      console.error('Purge system memory error:', err);
    }
  }, [activeTabId, splitTabId]);

  // Tab Hibernation Checker Engine (Idle Timer)
  useEffect(() => {
    if (!settings.tabHibernationEnabled) return;
    const timeoutMs = (settings.hibernationTimeoutMinutes || 10) * 60 * 1000;
    
    const interval = setInterval(() => {
      const now = Date.now();
      setTabs(prevTabs => {
        let changed = false;
        const updated = prevTabs.map(tab => {
          if (
            tab.id === activeTabId ||
            (splitTabId && tab.id === splitTabId) ||
            tab.isPinned ||
            tab.isPlayingAudio ||
            tab.isSuspended ||
            tab.isLoading
          ) {
            return tab;
          }
          const idleTime = now - (tab.lastAccessed || now);
          if (idleTime > timeoutMs) {
            changed = true;
            return { ...tab, isSuspended: true };
          }
          return tab;
        });
        return changed ? updated : prevTabs;
      });
    }, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [settings.tabHibernationEnabled, settings.hibernationTimeoutMinutes, activeTabId, splitTabId]);

  // Tab Close Handler (Graceful Navigation & Multi-Process Cleanup)
  // All side effects (closed-tabs stack, active-tab selection, incognito session
  // cleanup) are computed from tabsRef OUTSIDE the setState updater so every
  // updater stays pure (StrictMode double-invokes updater functions in dev).
  const handleCloseTab = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const prevTabs = tabsRef.current;
    const targetTab = prevTabs.find(t => t.id === id);

    if (prevTabs.length <= 1) {
      setTabs([{
        id: Date.now().toString(),
        url: 'nova://newtab',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false
      }]);
      return;
    }

    const targetIdx = prevTabs.findIndex(t => t.id === id);
    const newTabs = prevTabs
      .filter(t => t.id !== id)
      .map(t => t.splitWith === id ? { ...t, splitWith: undefined } : t);

    if (targetTab) {
      setClosedTabsStack(stack => [...stack, targetTab]);
    }

    if (activeTabIdRef.current === id && newTabs.length > 0) {
      const partnerTab = targetTab?.splitWith ? newTabs.find(t => t.id === targetTab.splitWith) : null;
      if (partnerTab) {
        setActiveTabId(partnerTab.id);
      } else {
        const nextActiveIdx = Math.min(Math.max(0, targetIdx), newTabs.length - 1);
        setActiveTabId(newTabs[nextActiveIdx].id);
      }
    }

    // If closing an incognito tab and no more incognito tabs exist, clear session
    if (targetTab?.isIncognito) {
      const remainingIncognitoTabs = newTabs.some(t => t.isIncognito);
      if (!remainingIncognitoTabs && (window as any).electronAPI?.clearIncognitoSession) {
        (window as any).electronAPI.clearIncognitoSession().catch((e: any) => console.error(e));
      }
    }

    setTabs(newTabs);
  }, []);

  // Tab Reordering (Drag and Drop)
  const handleReorderTabs = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setTabs(prevTabs => {
      const draggedIdx = prevTabs.findIndex(t => t.id === draggedId);
      const targetIdx = prevTabs.findIndex(t => t.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return prevTabs;

      const newTabs = [...prevTabs];
      const [removed] = newTabs.splice(draggedIdx, 1);
      newTabs.splice(targetIdx, 0, removed);
      return newTabs;
    });
  }, []);

  const handleReorderFullList = useCallback((reorderedWorkspaceTabs: Tab[]) => {
    setTabs(prevTabs => {
      const workspaceIds = new Set(reorderedWorkspaceTabs.map(t => t.id));
      const nonWorkspaceTabs = prevTabs.filter(t => !workspaceIds.has(t.id));
      return [...reorderedWorkspaceTabs, ...nonWorkspaceTabs];
    });
  }, []);

  const handleDuplicateTab = useCallback((tabId: string) => {
    // Compute from tabsRef OUTSIDE the updater (StrictMode-safe)
    const prev = tabsRef.current;
    const idx = prev.findIndex(t => t.id === tabId);
    if (idx === -1) return;
    const original = prev[idx];
    const newTab: Tab = {
      ...original,
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6),
      title: original.title,
      url: original.url,
      favicon: original.favicon,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isPinned: false
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
      const updated = prev.map(t => t.id === tabId ? { ...t, isPinned: willPin } : t);
      // Re-sort: pinned tabs at the start
      const pinned = updated.filter(t => t.isPinned);
      const unpinned = updated.filter(t => !t.isPinned);
      return [...pinned, ...unpinned];
    });
  }, []);

  const handleCloseOtherTabs = useCallback((tabId: string) => {
    // Compute from tabsRef OUTSIDE the updater (StrictMode-safe)
    const prev = tabsRef.current;
    const target = prev.find(t => t.id === tabId);
    if (!target) return;
    // Preserve pinned tabs and target tab
    const toKeep = prev.filter(t => t.id === tabId || t.isPinned);
    const toClose = prev.filter(t => t.id !== tabId && !t.isPinned);
    setClosedTabsStack(stack => [...stack, ...toClose]);
    setActiveTabId(tabId);
    setTabs(toKeep);
  }, []);

  const handleCloseTabsToRight = useCallback((index: number) => {
    // Compute from tabsRef OUTSIDE the updater (StrictMode-safe)
    const prev = tabsRef.current;
    if (index < 0 || index >= prev.length - 1) return;
    const toKeep = prev.slice(0, index + 1);
    const toClose = prev.slice(index + 1).filter(t => !t.isPinned);
    const pinnedToRight = prev.slice(index + 1).filter(t => t.isPinned);
    setClosedTabsStack(stack => [...stack, ...toClose]);
    const nextTabs = [...toKeep, ...pinnedToRight];
    if (!nextTabs.some(t => t.id === activeTabIdRef.current)) {
      setActiveTabId(prev[index].id);
    }
    setTabs(nextTabs);
  }, []);

  const handleNewTabRight = useCallback((index: number) => {
    const newId = Date.now().toString();
    const newTab: Tab = {
      id: newId,
      url: 'nova://newtab',
      title: 'New Tab',
      isLoading: false,
      canGoBack: false,
      canGoForward: false
    };
    setTabs(prev => {
      const newTabs = [...prev];
      const targetIndex = index >= 0 && index < prev.length ? index + 1 : prev.length;
      newTabs.splice(targetIndex, 0, newTab);
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

  const handleReopenClosedTab = useCallback(() => {
    // Read the stack from the ref OUTSIDE any updater (StrictMode-safe)
    const stack = closedTabsStackRef.current;
    if (stack.length === 0) return;
    const lastTab = stack[stack.length - 1];
    setTabs(prev => [...prev, lastTab]);
    setActiveTabId(lastTab.id);
    setClosedTabsStack(stack.slice(0, -1));
  }, []);



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
        handlersRef.current.handleNewTab(url);
      });
    }

    if ((window as any).electronAPI?.onNewIncognitoTab) {
      cleanupNewIncognitoTab = (window as any).electronAPI.onNewIncognitoTab((_event: any, url: string) => {
        handlersRef.current.handleNewIncognitoTab(url);
      });
    }

    if ((window as any).electronAPI?.onQuickAIAction) {
      cleanupQuickAI = (window as any).electronAPI.onQuickAIAction((_event: any, text: string) => {
        setIsSidePanelOpen(true);
        window.dispatchEvent(new CustomEvent('ai-quick-action', { detail: { action: `Explain or summarize this selection:\n\n"${text}"` } }));
      });
    }

    let cleanupExtInstall: (() => void) | void;
    if ((window as any).electronAPI?.onExtensionInstalledSilently) {
      cleanupExtInstall = (window as any).electronAPI.onExtensionInstalledSilently((_event: any, data: any) => {
        if (data.success) {
          alert(`Extension successfully installed: ${data.name}`);
        }
      });
    }

    const handleOpenSidePanel = () => setIsSidePanelOpen(true);
    const handleOpenWorkspaceManager = () => setIsWorkspaceManagerOpen(true);
    const handleOpenAccountModal = () => setIsAccountModalOpen(true);
    
    window.addEventListener('open-ai-sidepanel', handleOpenSidePanel);
    window.addEventListener('open-workspace-manager', handleOpenWorkspaceManager);
    window.addEventListener('open-account-modal', handleOpenAccountModal);

    return () => {
      if (typeof cleanupShortcut === 'function') cleanupShortcut();
      if (typeof cleanupNewTab === 'function') cleanupNewTab();
      if (typeof cleanupNewIncognitoTab === 'function') cleanupNewIncognitoTab();
      if (typeof cleanupQuickAI === 'function') cleanupQuickAI();
      if (typeof cleanupExtInstall === 'function') cleanupExtInstall();
      window.removeEventListener('open-ai-sidepanel', handleOpenSidePanel);
      window.removeEventListener('open-workspace-manager', handleOpenWorkspaceManager);
      window.removeEventListener('open-account-modal', handleOpenAccountModal);
    };
  }, []);

  // Folder Management
  const handleCreateFolder = useCallback(() => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
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
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, folderId } : t));
  }, []);

  const handleNewTab = useCallback((url?: string | any) => {
    let finalUrl = typeof url === 'string' ? url : 'nova://newtab';
    
    // Security: Block malicious protocols (shared blocklist — see safeNavigation.ts)
    if (!isSafeNavigationUrl(finalUrl)) {
      finalUrl = 'nova://newtab';
    }
    
    let initialTitle = 'New Tab';
    if (finalUrl.startsWith('nova://settings')) initialTitle = 'Settings';
    else if (finalUrl.startsWith('nova://history')) initialTitle = 'History';
    else if (finalUrl.startsWith('nova://downloads')) initialTitle = 'Downloads';
    
    const newTab: Tab = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
      url: finalUrl,
      title: initialTitle,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      workspaceId: activeWorkspaceId
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
        id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
        url: 'nova://newtab',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        workspaceId: workspaceId
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
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
      url: targetUrl,
      title: targetUrl !== 'nova://newtab' ? targetUrl : 'Private Tab',
      isLoading: targetUrl !== 'nova://newtab',
      canGoBack: false,
      canGoForward: false,
      isIncognito: true,
      workspaceId: activeWorkspaceId
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


  const handleNavigate = useCallback((url: string) => {
    if (!url || typeof url !== 'string') return;
    
    // Security: Block malicious protocols (shared blocklist — see safeNavigation.ts)
    if (!isSafeNavigationUrl(url)) {
      console.warn('Blocked malicious navigation protocol:', url);
      return;
    }

    let newTitle: string | undefined = undefined;
    const isNewTabUrl = url === 'nova://newtab' || url === 'about:blank' || url === 'https://newtab';
    if (isNewTabUrl) newTitle = 'New Tab';
    else if (url.startsWith('nova://settings')) newTitle = 'Settings';
    else if (url.startsWith('nova://history')) newTitle = 'History';
    else if (url.startsWith('nova://downloads')) newTitle = 'Downloads';

    const isInternalPage = !!newTitle;

    setTabs(prev => {
      if (prev.length === 0) {
        const newTabId = Date.now().toString();
        setActiveTabId(newTabId);
        return [{
          id: newTabId,
          url,
          title: newTitle || 'New Tab',
          isLoading: !isInternalPage,
          canGoBack: false,
          canGoForward: false
        }];
      }

      const activeTab = prev.find(t => t.id === activeTabId) || prev[0];
      const targetId = activeTab ? activeTab.id : prev[0].id;
      if (targetId !== activeTabId) {
        setActiveTabId(targetId);
      }

      if (activeTab && activeTab.url === url) {
        // URL is exactly the same, force a reload if it's a webview
        if (!isInternalPage) {
          const webview = document.querySelector(`webview[data-tab-id="${targetId}"]`) as any;
          if (webview) webview.reload();
        }
        return prev.map(t => t.id === targetId ? { ...t, isLoading: !isInternalPage } : t);
      }
      
      return prev.map(t => t.id === targetId ? {
        ...t,
        url,
        isLoading: !isInternalPage,
        ...(newTitle ? { title: newTitle } : {})
      } : t);
    });
  }, [activeTabId]);

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
          mcpHandlersRef.current.handleNavigate(safeArgs.url);
          return `Navigated to ${safeArgs.url}`;

        case 'browser_read_page':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                let text = document.body.innerText;
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
                const el = document.querySelector(${JSON.stringify(args.selector)});
                if (el) { 
                  const rect = el.getBoundingClientRect();
                  el.click(); 
                  return { success: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                }
                return { success: false, error: "Element not found with selector: " + ${JSON.stringify(args.selector)} };
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
                const el = document.querySelector(${JSON.stringify(args.selector)});
                if (el) { 
                  const rect = el.getBoundingClientRect();
                  el.value = ${JSON.stringify(args.text)};
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  if (${args.pressEnter ? 'true' : 'false'}) {
                    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
                    el.dispatchEvent(enterEvent);
                  }
                  return { success: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                }
                return { success: false, error: "Element not found with selector: " + ${JSON.stringify(args.selector)} };
              })();
            `);
            if (result && result.success) {
              const bounds = activeWebview.getBoundingClientRect();
              window.dispatchEvent(new CustomEvent('ai-cursor', {
                detail: { x: bounds.left + result.x, y: bounds.top + result.y, action: 'type', text: args.text }
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

        case 'browser_switch_tab':
          const tabExists = tabs.some(t => t.id === args.tabId);
          if (tabExists) {
            setActiveTabId(args.tabId);
            return `Switched to tab ${args.tabId}`;
          }
          return `Error: Tab ${args.tabId} not found.`;

        case 'browser_close_tab':
          mcpHandlersRef.current.handleCloseTab(args.tabId);
          return `Closed tab ${args.tabId}`;

        case 'browser_screenshot':
          if (activeWebview && activeWebview.capturePage) {
            const image = await activeWebview.capturePage();
            return image.toDataURL();
          }
          return "Error: Could not take screenshot.";

        case 'browser_scroll': {
          const direction = String(args.direction || 'down');
          const cleanAmount = Math.abs(Number(args.amount) || 500);
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
          const newUrl = args.url || 'nova://newtab';
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
                const el = document.querySelector(${JSON.stringify(args.selector)});
                if (el) {
                  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                  return "Hovered over element";
                }
                return "Error: Element not found: " + ${JSON.stringify(args.selector)};
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_focus':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                const el = document.querySelector(${JSON.stringify(args.selector)});
                if (el) { el.focus(); return "Focused element"; }
                return "Error: Element not found: " + ${JSON.stringify(args.selector)};
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_select_option':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                const el = document.querySelector(${JSON.stringify(args.selector)});
                if (el && el.tagName === 'SELECT') {
                  el.value = ${JSON.stringify(args.value)};
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  return "Selected option: " + ${JSON.stringify(args.value)};
                }
                return "Error: Select element not found: " + ${JSON.stringify(args.selector)};
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_press_key':
          if (activeWebview && activeWebview.executeJavaScript) {
            const focusSelector = args.selector ? `document.querySelector(${JSON.stringify(args.selector)})?.focus();` : '';
            return await activeWebview.executeJavaScript(`
              (() => {
                ${focusSelector}
                const target = ${args.selector ? `document.querySelector(${JSON.stringify(args.selector)}) || document.activeElement` : 'document.activeElement || document.body'};
                const key = ${JSON.stringify(args.key)};
                const keyMap = { 'Enter': 13, 'Tab': 9, 'Escape': 27, 'Space': 32, 'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39, 'Backspace': 8, 'Delete': 46 };
                const keyCode = keyMap[key] || key.charCodeAt(0);
                ['keydown','keypress','keyup'].forEach(t => {
                  target.dispatchEvent(new KeyboardEvent(t, { key, keyCode, which: keyCode, bubbles: true }));
                });
                return "Pressed key: " + key;
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_get_element_text':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                const el = document.querySelector(${JSON.stringify(args.selector)});
                if (el) return el.innerText || el.textContent || '';
                return "Error: Element not found: " + ${JSON.stringify(args.selector)};
              })()
            `);
          }
          return "Error: No active webview.";

        case 'browser_scroll_to_element':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                const el = document.querySelector(${JSON.stringify(args.selector)});
                if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return "Scrolled to element"; }
                return "Error: Element not found: " + ${JSON.stringify(args.selector)};
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
        const cleanAmount = Math.abs(Number(amount) || 500);
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
        const q = (query || '').toLowerCase();
        // search history and bookmarks
        const { history, bookmarks } = browserDataRef.current;
        const results = [
          ...(Array.isArray(history) ? history.filter(h => (h?.title && typeof h.title === 'string' && h.title.toLowerCase().includes(q)) || (h?.url && typeof h.url === 'string' && h.url.toLowerCase().includes(q))) : []),
          ...(Array.isArray(bookmarks) ? bookmarks.filter(b => (b?.title && typeof b.title === 'string' && b.title.toLowerCase().includes(q)) || (b?.url && typeof b.url === 'string' && b.url.toLowerCase().includes(q))) : [])
        ];
        // deduplicate by URL
        const unique = Array.from(new Map(results.map(item => [item.url, item])).values());
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
        executeMcpAction(toolName, args)
          .then(result => electronAPI.respondMcpAction?.(id, result))
          .catch(err => electronAPI.respondMcpAction?.(id, { error: String(err) }));
      });
    }
    return () => {
      unsubscribeMcpBridge?.();
    };
  // Data and handlers are read through browserDataRef/mcpHandlersRef at call
  // time, so this setup only needs to run once per mount.
  }, []);

  const handleUpdateTab = useCallback((id: string, updates: Partial<Tab>) => {
    // Pure tabs update only — no side effects inside the updater (StrictMode-safe)
    setTabs(prev => {
      let changed = false;
      const updated = prev.map(t => {
        if (t.id === id) {
          // Only apply updates if there are actual changes
          const hasChanges = Object.entries(updates).some(([k, v]) => (t as any)[k] !== v);
          if (!hasChanges) return t;
          changed = true;
          return { ...t, ...updates };
        }
        return t;
      });
      // Identity guard: when nothing actually changed, return prev so React
      // bails out instead of re-rendering the whole App subtree off a fresh
      // array allocation (webview events fire constantly on background tabs).
      return changed ? updated : prev;
    });

    // History recording is derived from the pre-update tab state OUTSIDE the
    // tabs updater so setHistory is never called from within another updater.
    const current = tabsRef.current.find(t => t.id === id);
    if (!current) return;
    const hasChanges = Object.entries(updates).some(([k, v]) => (current as any)[k] !== v);
    if (!hasChanges) return;

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
        alert("Picture-in-Picture Error: " + (e.message || e));
      });
    }
  }, []);

  const handleToggleBookmark = useCallback((tab: Tab) => {
    if (!tab.url || tab.url === 'nova://newtab' || tab.url === 'about:blank') return;
    setBookmarks(prev => {
      const isBookmarked = prev.some(b => b.url === tab.url);
      if (isBookmarked) {
        return prev.filter(b => b.url !== tab.url);
      } else {
        return [...prev, {
          id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
          url: tab.url,
          title: tab.title || tab.url,
          favicon: tab.favicon,
          timestamp: Date.now()
        }];
      }
    });
  }, []);

  const handleToggleBookmarkActive = useCallback(() => {
    if (activeTab) handleToggleBookmark(activeTab);
  }, [activeTab, handleToggleBookmark]);

  const handleOpenHistory = useCallback(() => {
    handleNewTab('nova://history');
  }, [handleNewTab]);

  const handleOpenDownloads = useCallback(() => {
    closeAllModals();
    const existing = tabs.find(t => t.url === 'nova://downloads');
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      handleNewTab('nova://downloads');
    }
  }, [tabs, handleNewTab, closeAllModals]);
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
        if (typeof webview.getWebContentsId === 'function' && (window as any).electronAPI?.captureTabThumbnail) {
           const wcId = webview.getWebContentsId();
           dataUrl = await (window as any).electronAPI.captureTabThumbnail(wcId);
        } else if (typeof webview.capturePage === 'function') {
           const image = await webview.capturePage();
           dataUrl = image.toDataURL();
        }
        
        if (dataUrl) {
          setScreenshotDataUrl(dataUrl);
          setIsScreenshotOpen(true);
        } else {
          alert("Failed to capture screenshot. The page might not be fully loaded.");
        }
      } catch (err) {
        console.error('Screenshot capture failed:', err);
      }
    } else {
      // Check if it's an internal page by looking at activeTab url
      const tab = tabs.find(t => t.id === activeTabId);
      if (tab?.url?.startsWith('nova://')) {
         alert("Screenshots cannot be taken on internal pages (Settings, New Tab, etc.).");
      } else {
         alert("Screenshot feature is only available in the desktop app.");
      }
    }
  }, [activeTabId, tabs]);

  const handleCaptureFullPage = useCallback(async () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && typeof webview.getWebContentsId === 'function' && (window as any).electronAPI?.captureFullPage) {
      try {
        const wcId = webview.getWebContentsId();
        const dataUrl = await (window as any).electronAPI.captureFullPage(wcId);
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
      if (tab1Id && tab2Id) {
        if (t.id === tab1Id || t.id === tab2Id) return { ...t, splitWith: undefined };
      } else if (t.id === activeTabId || (splitTabId && t.id === splitTabId)) {
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
        const newId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7);
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
        try { iframe.contentWindow.history.back(); } catch(e) {}
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
        try { iframe.contentWindow.history.forward(); } catch(e) {}
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

  const handleClearHistory = useCallback((timeframe: string = 'all') => {
    if (timeframe === 'all') {
      setHistory([]);
      try { localStorage.setItem('browsing_history', '[]'); } catch (e) {}
      return;
    }
    
    const now = Date.now();
    let cutoff = now;
    if (timeframe === 'hour') cutoff = now - 60 * 60 * 1000;
    else if (timeframe === 'day') cutoff = now - 24 * 60 * 60 * 1000;
    else if (timeframe === 'week') cutoff = now - 7 * 24 * 60 * 60 * 1000;
    else if (timeframe === 'month') cutoff = now - 28 * 24 * 60 * 60 * 1000;

    // Persistence happens OUTSIDE the updater (StrictMode-safe): the updater
    // stays pure and the same filtered snapshot is written to localStorage
    // right after the setHistory call.
    const isOlderThanCutoff = (item: HistoryItem) => {
      const itemTime = typeof item.timestamp === 'number' ? item.timestamp : Number(new Date(item.timestamp).getTime());
      return !isNaN(itemTime) && itemTime < cutoff;
    };

    setHistory(prev => prev.filter(isOlderThanCutoff));
    try { localStorage.setItem('browsing_history', JSON.stringify(history.filter(isOlderThanCutoff))); } catch (e) {}
  }, [history]);
  const handleRemoveHistoryItem = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    try { localStorage.setItem('browsing_history', JSON.stringify(history.filter(item => item.id !== id))); } catch (e) {}
  }, [history]);

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
        if (data.bookmarks && Array.isArray(data.bookmarks)) setBookmarks(data.bookmarks);
        if (data.history && Array.isArray(data.history)) setHistory(data.history);
        if (data.settings && typeof data.settings === 'object') setSettings(prev => ({ ...prev, ...data.settings }));
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
      if ((window as any).electronAPI?.toggleExtension) {
        await (window as any).electronAPI.toggleExtension(id, nextEnabled);
      }
    } catch (e) {
      console.error('Failed to toggle extension:', e);
    }
  }, [extensions]);

  const handleRemoveExtension = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to remove this extension?')) {
      try {
        const res = await (window as any).electronAPI?.removeExtension?.(id);
        if (res?.error) {
          alert('Failed to remove extension: ' + res.error);
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
  const handleTabDrag = useCallback((y: number) => setIsDragOverMain(y > 60), []);
  const handleDropToSplitScreen = useCallback((droppedTabId: string, side: 'left' | 'right' = 'right') => {
    if (!droppedTabId || droppedTabId === activeTabId) return;
    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId) return { ...t, splitWith: droppedTabId };
      if (t.id === droppedTabId) return { ...t, splitWith: activeTabId };
      if (t.splitWith === activeTabId || t.splitWith === droppedTabId) return { ...t, splitWith: undefined };
      return t;
    }));
    if (side === 'left') {
      setActiveTabId(droppedTabId);
    }
  }, [activeTabId]);
  const handleToggleReaderMode = useCallback(() => setIsReaderModeOpen(prev => !prev), []);
  const handleCloseSidePanel = useCallback(() => setIsSidePanelOpen(false), []);
  const handleOpenSpotlight = useCallback(() => setIsSpotlightOpen(true), []);

  const handleFind = useCallback((text: string, forward?: boolean, matchCase?: boolean, wholeWord?: boolean) => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.findInPage) {
      try {
        webview.findInPage(text, { forward, findNext: true, matchCase, wordStart: wholeWord });
      } catch (e) {}
    } else {
      // Basic fallback for standard browser
      try { (window as any).find(text, matchCase, !forward, true, wholeWord, false, false); } catch(e) {}
    }
  }, [activeTabId]);

  const handleStopFind = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.stopFindInPage) {
      try {
        webview.stopFindInPage('clearSelection');
      } catch (e) {}
    } else {
      // Basic fallback for standard browser
      try { window.getSelection()?.removeAllRanges(); } catch(e) {}
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

  // Global Chrome Keyboard Shortcuts Listener
  useEffect(() => {
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
        const binding = s[shortcutName];
        if (!binding) return false;
        return key === binding.key.toLowerCase() && 
               shift === !!binding.shift && 
               meta === !!binding.meta;
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

      // Toggle Sidebar in Vertical Tabs Mode (⌘S / Ctrl+S)
      if ((e.metaKey || e.ctrlKey) && key === 's') {
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
  }, [activeTabId, handleNewTab, handleNewIncognitoTab, handleReload, handleToggleBookmarkActive, handleZoomIn, handleZoomOut, handleResetZoom, handleGoBack, handleGoForward, handleCloseTab, handleReopenClosedTab, handlePrintPage, handleOpenDevTools, closeAllModals, settings.shortcuts]);

  const activeDownloadsCount = useMemo(() => downloads.filter(d => d.state === 'progressing').length, [downloads]);

  // Compute second tab for split view (if available)
  const secondaryTab = useMemo(() => splitTabId ? tabs.find(t => t.id === splitTabId) : undefined, [splitTabId, tabs]);

  const workspaceTabs = useMemo(() => tabs.filter(t => t.workspaceId === activeWorkspaceId || (!t.workspaceId && activeWorkspaceId === 'default')), [tabs, activeWorkspaceId]);

  const sortedTabs = useMemo(() => [...tabs].sort((a, b) => a.id.localeCompare(b.id)), [tabs]);

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
    <div className={`flex flex-row h-full w-full overflow-hidden text-slate-900 dark:text-slate-100 relative ${
      activeTab?.isIncognito
        ? 'bg-slate-950 dark:bg-[#0a0812]'
        : 'bg-slate-100 dark:bg-[#151122]'
    } transition-colors duration-300`}>
      
      {/* Pinned Vertical Sidebar with smooth slide animation */}
      <AnimatePresence initial={false}>
        {settings.useVerticalTabs && !isSidebarCollapsed && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
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
              splitTabId={splitTabId}
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
      {settings.useVerticalTabs && isSidebarCollapsed && (
        <>
          {/* Left Edge Mouse Sensor for Instant Hover Reveal */}
          <div 
            className="fixed top-0 left-0 bottom-0 w-8 z-40 no-drag"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onMouseEnter={handleHoverSidebarOpen}
          />

          {/* Floating Expand Sidebar Button when Collapsed */}
          <div 
            className="fixed top-2.5 left-2.5 z-45 flex items-center no-drag"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={handleExpandSidebar}
              onMouseEnter={handleHoverSidebarOpen}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              className="p-1.5 px-2 rounded-xl bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200/80 dark:border-white/10 backdrop-blur-md transition-colors hover:scale-105 active:scale-95 flex items-center gap-1.5 text-xs font-medium cursor-pointer no-drag select-none"
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
                className="fixed top-0 left-0 bottom-0 z-50 w-[240px] shadow-2xl overflow-hidden bg-white/95 dark:bg-[#151122]/98 backdrop-blur-md border-r border-slate-200 dark:border-white/10"
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
                  splitTabId={splitTabId}
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

      {/* Main Viewport Card with fluid margin & border radius transition */}
      <div className={`flex flex-col flex-1 min-w-0 relative z-40 ${settings.useVerticalTabs ? 'overflow-hidden' : 'overflow-visible'} transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        settings.useVerticalTabs 
          ? isSidebarCollapsed
            ? 'bg-white dark:bg-slate-900 m-0 rounded-none border-0'
            : 'rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-slate-900 m-2 ml-1.5' 
          : 'bg-white dark:bg-slate-900 rounded-none m-0 border-0'
      }`}>
        {/* TOP NAVIGATION BAR with fluid accordion fold transition */}
        <AnimatePresence initial={false}>
          {!settings.useVerticalTabs && (
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
                useVerticalTabs={settings.useVerticalTabs}
                onToggleReaderMode={handleToggleReaderMode}
                isSplitView={!!splitTabId}
                tabStyle={settings.tabStyle}
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

      {/* MAIN BROWSER CONTENT */}
      <main 
        className="flex-1 relative w-full h-full bg-white dark:bg-slate-900 flex overflow-hidden"
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
          if (draggedTab && tabId !== activeTabId) {
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

        {/* Primary View */}
        <div id="primary-view-container" style={{ width: secondaryTab ? `${splitRatio}%` : '100%' }} className="h-full relative transition-none">
          {sortedTabs.map((tab) => {
            if (secondaryTab && tab.id === secondaryTab.id) {
              return null;
            }
            return (
              <div
                key={tab.id}
                className={`w-full h-full absolute inset-0 ${
                  tab.id === activeTabId ? 'opacity-100 z-10 pointer-events-auto visible' : 'opacity-0 z-0 pointer-events-none invisible'
                }`}
              >
                <BrowserView 
                  tab={tab} 
                  onNavigate={handleNavigate}
                  onUpdateTab={handleUpdateTab}
                  onNewTab={handleNewTab}
                  onFoundInPage={handleFoundInPage}
                  searchEngine={settings.searchEngine}
                  privacyShield={settings.privacyShield}
                  newTabBackground={settings.newTabBackground}
                  settings={settings}
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
                />
              </div>
            );
          })}
        </div>

        {/* Resizer Handle */}
        {secondaryTab && (
          <div 
            className="w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 bg-slate-200 dark:bg-slate-700 z-30 transition-colors flex items-center justify-center"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.pageX;
              const startRatio = splitRatio;
              
              const handleMouseMove = (moveEvent: MouseEvent) => {
                const deltaX = moveEvent.pageX - startX;
                const containerWidth = document.body.clientWidth;
                let newRatio = startRatio + (deltaX / containerWidth) * 100;
                newRatio = Math.max(20, Math.min(80, newRatio)); // Limit to 20%-80%
                
                const primary = document.getElementById('primary-view-container');
                const secondary = document.getElementById('secondary-view-container');
                if (primary && secondary) {
                  primary.style.width = `${newRatio}%`;
                  secondary.style.width = `${100 - newRatio}%`;
                }
              };
              
              const handleMouseUp = (upEvent: MouseEvent) => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                
                const deltaX = upEvent.pageX - startX;
                const containerWidth = document.body.clientWidth;
                let finalRatio = startRatio + (deltaX / containerWidth) * 100;
                finalRatio = Math.max(20, Math.min(80, finalRatio));
                setSplitRatio(finalRatio);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        )}

        {/* Secondary View (Split Screen) */}
        {secondaryTab && (
          <div id="secondary-view-container" style={{ width: `${100 - splitRatio}%` }} className="h-full relative bg-white dark:bg-slate-900 transition-none">
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-2 py-1 rounded-xl shadow-xl border border-white/10 text-white">
              <span className="text-[11px] font-medium max-w-[160px] truncate text-slate-200">
                {secondaryTab.title || secondaryTab.url}
              </span>

              {/* Swap Left/Right */}
              <button
                onClick={() => {
                  if (activeTabId && secondaryTab) {
                    setActiveTabId(secondaryTab.id);
                  }
                }}
                className="p-1 hover:bg-white/15 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Swap Left & Right"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>

              {/* Unsplit / Separate Tabs */}
              <button
                onClick={() => handleCloseSplitView()}
                className="p-1 hover:bg-white/15 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Separate Tabs"
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>

              {/* Close Tab */}
              <button 
                onClick={() => handleCloseTab(secondaryTab.id)}
                className="p-1 hover:bg-red-500/80 rounded text-red-400 hover:text-white transition-colors cursor-pointer"
                title="Close Tab"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <BrowserView 
              tab={secondaryTab}
              onNavigate={handleNavigate}
              onUpdateTab={handleUpdateTab}
              onNewTab={handleNewTab}
              onFoundInPage={handleFoundInPage}
              searchEngine={settings.searchEngine}
              privacyShield={settings.privacyShield}
              newTabBackground={settings.newTabBackground}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onExportData={handleExportData}
              onImportData={handleImportData}
              isActive={true}
              onCloseTab={handleCloseTab}
              isIncognito={secondaryTab.isIncognito || false}
              history={typeof secondaryTab?.url === 'string' && secondaryTab.url.includes('nova://history') ? history : EMPTY_ARRAY}
              downloads={typeof secondaryTab?.url === 'string' && secondaryTab.url.includes('nova://downloads') ? downloads : EMPTY_ARRAY}
              onClearHistory={handleClearHistory}
              onRemoveHistoryItem={handleRemoveHistoryItem}
              onClearDownloads={handleClearDownloads}
              onPurgeMemory={handlePurgeMemory}
            />
          </div>
        )}

        {/* AI Assistant Side Panel */}
        <React.Suspense fallback={null}>
          <SidePanel 
            isOpen={isSidePanelOpen} 
            onClose={handleCloseSidePanel} 
          />
        </React.Suspense>
      </main>
      {/* SPOTLIGHT OMNIBOX */}
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
