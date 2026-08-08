import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRight } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { BrowserView } from './components/BrowserView';
export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  timestamp: number;
}

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  receivedBytes: number;
  totalBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  isPaused?: boolean;
  savePath?: string;
}
export interface UserSettings {
  searchEngine: 'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia';
  privacyShield: boolean;
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  accentColor: 'blue' | 'emerald' | 'purple' | 'rose' | 'amber' | 'custom';
  customAccentColor?: string;
  showBookmarksBar: boolean;
  useVerticalTabs: boolean;
  mcpServerEnabled: boolean;
  showTasksWidget?: boolean;
  newTabBackground: 'default' | 'gradient' | 'mesh' | 'glass' | 'unsplash' | 'custom_url';
  backgroundCustomUrl?: string;
  unsplashCategory?: string;
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
}
import { ShareModal } from './components/ShareModal';
import { ExtensionsModal } from './components/ExtensionsModal';
import { ScreenshotModal } from './components/ScreenshotModal';
import { FindInPage } from './components/FindInPage';
import { SpotlightOmnibox } from './components/SpotlightOmnibox';
import { VpnPopover, VpnLocation } from './components/VpnPopover';
import { SidePanel } from './components/SidePanel';
import { WorkspaceManager } from './components/WorkspaceManager';
import { UpdateToast } from './components/UpdateToast';
import { AICursorOverlay } from './components/AICursorOverlay';
import { SidebarTabs } from './components/SidebarTabs';
import { ReaderMode } from './components/ReaderMode';
import { Onboarding } from './components/Onboarding';

import { aiAgent } from './services/aiAgent';
import { Tab, Folder, Bookmark, Extension } from './types/browser';

const DEFAULT_VPN_LOCATIONS: VpnLocation[] = [
  { id: 'us-1', name: 'United States (Public)', url: 'http://198.199.86.11:8080', type: 'free' },
  { id: 'uk-1', name: 'United Kingdom (Public)', url: 'http://188.166.38.163:8080', type: 'free' },
  { id: 'de-1', name: 'Germany (Public)', url: 'http://167.235.215.35:8080', type: 'free' },
];

function App() {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    let startupBehavior = 'newTab';
    try {
      const savedSettings = localStorage.getItem('user_settings');
      if (savedSettings) {
        startupBehavior = JSON.parse(savedSettings).startupBehavior || 'newTab';
      }
    } catch (e) {}

    if (startupBehavior === 'continue') {
      const saved = localStorage.getItem('tabs_session');
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

  const [folders, setFolders] = useState<Folder[]>(() => {
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
    localStorage.setItem('workspaces_session', JSON.stringify(workspaces));
    localStorage.setItem('active_workspace_session', activeWorkspaceId);
  }, [workspaces, activeWorkspaceId]);

  // AI Assistant State
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  const [isReaderModeOpen, setIsReaderModeOpen] = useState(false);
  const [isFindInPageOpen, setIsFindInPageOpen] = useState(false);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [isVpnPopoverOpen, setIsVpnPopoverOpen] = useState(false);
  const [splitTabId, setSplitTabId] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState(50);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [findMatches, setFindMatches] = useState<{ index: number; count: number }>({ index: 0, count: 0 });
  const [isDragOverMain, setIsDragOverMain] = useState(false);
  const [isDraggingTab, setIsDraggingTab] = useState(false);

  const [vpnEnabled, setVpnEnabled] = useState(false);
  const [vpnLocation, setVpnLocation] = useState<VpnLocation>(DEFAULT_VPN_LOCATIONS[0]);
  const [vpnLocations, setVpnLocations] = useState<VpnLocation[]>(DEFAULT_VPN_LOCATIONS);

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
  }, []);

  const openModal = useCallback((modalName: 'share' | 'spotlight' | 'extensions') => {
    closeAllModals();
    if (modalName === 'share') setIsShareOpen(true);
    else if (modalName === 'spotlight') setIsSpotlightOpen(true);
    else if (modalName === 'extensions') setIsExtensionsOpen(true);
  }, [closeAllModals]);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    () => !localStorage.getItem('nova_onboarding_complete')
  );

  // User settings
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('user_settings');
    return saved ? JSON.parse(saved) : {
      searchEngine: 'google',
      privacyShield: true,
      theme: 'system',
      fontSize: 'medium',
      accentColor: 'blue',
      customAccentColor: '#3b82f6',
      showBookmarksBar: false,
      useVerticalTabs: false,
      mcpServerEnabled: false,
      newTabBackground: 'default',
      backgroundCustomUrl: '',
      unsplashCategory: 'nature,architecture',
      startupBehavior: 'newTab',
      tabStyle: 'floating',
      doNotTrack: true,
      clearOnExit: false,
      hardwareAcceleration: true,
      developerMode: false,
      tabHibernationEnabled: true,
      hibernationTimeoutMinutes: 10,
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
  });

  // Sync settings with backend
  useEffect(() => {
    if ((window as any).electronAPI?.storeSet) {
      (window as any).electronAPI.storeSet('settings', JSON.stringify(settings));
    }
  }, [settings]);

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
    localStorage.setItem('user_settings', JSON.stringify(settings));
    if (window.electronAPI?.setPrivacyShield) {
      window.electronAPI.setPrivacyShield(settings.privacyShield);
    }
    if ((window as any).electronAPI?.setDoNotTrack) {
      (window as any).electronAPI.setDoNotTrack(settings.doNotTrack ?? true);
    }
  }, [settings]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onAdBlocked) {
      const removeListener = (window as any).electronAPI.onAdBlocked((event: any, tabId: number) => {
        setTabs(prev => prev.map(t => {
          if (t.webContentsId === tabId) {
            return { ...t, blockedAdsCount: (t.blockedAdsCount || 0) + 1 };
          }
          return t;
        }));
      });
      return () => removeListener();
    }
  }, []);

  // Downloads state
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('browsing_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('browsing_history', JSON.stringify(history));
    }, 150);
    return () => clearTimeout(timer);
  }, [history]);

  // Save session whenever tabs changes (Excluding Incognito Tabs)
  useEffect(() => {
    const sessionTabs = tabs
      .filter(t => !t.isIncognito);
    const timer = setTimeout(() => {
      localStorage.setItem('nova_session_tabs', JSON.stringify(sessionTabs));
    }, 100);

    return () => clearTimeout(timer);
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem('active_tab_session', activeTabId);
  }, [activeTabId]);

  useEffect(() => {
    localStorage.setItem('folders_session', JSON.stringify(folders));
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
      // Use custom hex
      const hex = settings.customAccentColor;
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
    const saved = localStorage.getItem('bookmarks');
    return saved ? JSON.parse(saved) : [];
  });

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);
  const [closedTabsStack, setClosedTabsStack] = useState<Tab[]>([]);

  // Select/focus tab & reset hibernation timer
  const handleSelectTab = useCallback((id: string) => {
    setActiveTabId(id);
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isSuspended: false, lastAccessed: Date.now() } : t));
  }, []);

  // Manual tab suspension
  const handleSuspendTab = useCallback((id: string) => {
    setTabs(prev => prev.map(t => (t.id === id && t.id !== activeTabId && t.id !== splitTabId && !t.isPlayingAudio) ? { ...t, isSuspended: true } : t));
  }, [activeTabId, splitTabId]);

  // Automatic Tab Hibernation (Memory Saver)
  useEffect(() => {
    if (settings.tabHibernationEnabled === false) return;
    const timeoutMs = (settings.hibernationTimeoutMinutes || 10) * 60 * 1000;
    
    const interval = setInterval(() => {
      const now = Date.now();
      setTabs(prevTabs =>
        prevTabs.map(tab => {
          if (
            tab.id === activeTabId ||
            tab.id === splitTabId ||
            tab.isPlayingAudio ||
            tab.isPinned ||
            tab.isSuspended ||
            !tab.lastAccessed
          ) {
            return tab;
          }
          if (now - tab.lastAccessed > timeoutMs) {
            console.log(`[MemorySaver] Auto-hibernating tab ${tab.id} (${tab.title || tab.url})`);
            return { ...tab, isSuspended: true };
          }
          return tab;
        })
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTabId, splitTabId, settings.tabHibernationEnabled, settings.hibernationTimeoutMinutes]);

  // Track closed tabs for Cmd+Shift+T
  const handleCloseTab = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTabs(prevTabs => {
      const targetTab = prevTabs.find(t => t.id === id);
      
      if (prevTabs.length <= 1) {
        if (targetTab && targetTab.url !== 'nova://newtab') {
          return [{
            ...targetTab,
            url: 'nova://newtab',
            title: 'New Tab',
            favicon: undefined,
            isLoading: false,
            canGoBack: false,
            canGoForward: false
          }];
        }
        return prevTabs;
      }
      if (targetTab) {
        setClosedTabsStack(stack => [...stack, targetTab]);
      }
      const newTabs = prevTabs.filter(t => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
      if (splitTabId === id) {
        setSplitTabId(null);
      }
      
      // If closing an incognito tab and no more incognito tabs exist, clear session
      if (targetTab?.isIncognito) {
        const remainingIncognitoTabs = newTabs.some(t => t.isIncognito);
        if (!remainingIncognitoTabs && (window as any).electronAPI?.clearIncognitoSession) {
          (window as any).electronAPI.clearIncognitoSession().catch((e: any) => console.error(e));
        }
      }
      
      return newTabs;
    });
  }, [activeTabId, splitTabId]);

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



  // Listen to IPC events from main process (Shortcuts & Downloads) with cleanups
  useEffect(() => {
    let cleanupShortcut: (() => void) | void;
    let cleanupDownloads: (() => void) | void;
    let cleanupNewTab: (() => void) | void;

    if (window.electronAPI?.onShortcut) {
      cleanupShortcut = window.electronAPI.onShortcut((_event: any, command: string) => {
        if (command === 'search' || command === 'toggle-omnibox') {
          setIsSpotlightOpen(prev => !prev);
        }
        if (command === 'new-tab') {
          handleNewTab();
        }
      });
    }

    if (window.electronAPI?.onNewTab) {
      cleanupNewTab = window.electronAPI.onNewTab((_event: any, url: string) => {
        handleNewTab(url);
      });
    }

    if (window.electronAPI?.onDownloadUpdate) {
      cleanupDownloads = window.electronAPI.onDownloadUpdate((_event: any, data: DownloadItem) => {
        setDownloads(prev => {
          const existingIdx = prev.findIndex(d => d.id === data.id);
          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = { ...updated[existingIdx], ...data };
            return updated;
          } else {
            return [data, ...prev];
          }
        });
      });
    }

    let cleanupExtInstall: (() => void) | void;
    if ((window as any).electronAPI?.onExtensionInstalledSilently) {
      cleanupExtInstall = (window as any).electronAPI.onExtensionInstalledSilently((_event: any, data: any) => {
        if (data.success) {
          alert(`Eklenti başarıyla yüklendi: ${data.name}`);
        }
      });
    }

    const handleOpenSidePanel = () => setIsSidePanelOpen(true);
    const handleOpenWorkspaceManager = () => setIsWorkspaceManagerOpen(true);
    
    window.addEventListener('open-ai-sidepanel', handleOpenSidePanel);
    window.addEventListener('open-workspace-manager', handleOpenWorkspaceManager);

    return () => {
      if (typeof cleanupShortcut === 'function') cleanupShortcut();
      if (typeof cleanupNewTab === 'function') cleanupNewTab();
      if (typeof cleanupDownloads === 'function') cleanupDownloads();
      if (typeof cleanupExtInstall === 'function') cleanupExtInstall();
      window.removeEventListener('open-ai-sidepanel', handleOpenSidePanel);
      window.removeEventListener('open-workspace-manager', handleOpenWorkspaceManager);
    };
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId);

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
    
    // Güvenlik: Kötü niyetli protokolleri engelle
    const lowerUrl = finalUrl.toLowerCase();
    if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('file:') || lowerUrl.startsWith('data:text/html')) {
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
    setTabs(prev => {
      const workspaceTabs = prev.filter(t => t.workspaceId === workspaceId || (!t.workspaceId && workspaceId === 'default'));
      if (workspaceTabs.length > 0) {
        setActiveTabId(workspaceTabs[0].id);
        return prev;
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
        setActiveTabId(newTab.id);
        return [...prev, newTab];
      }
    });
  }, []);

  const handleNewIncognitoTab = useCallback(() => {
    const newTab: Tab = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
      url: 'nova://newtab',
      title: 'Private Tab',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isIncognito: true
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

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


  const handleNavigate = useCallback((url: string) => {
    let newTitle: string | undefined = undefined;
    const isNewTabUrl = url === 'nova://newtab' || url === 'about:blank' || url === 'https://newtab';
    if (isNewTabUrl) newTitle = 'New Tab';
    else if (url.startsWith('nova://settings')) newTitle = 'Settings';
    else if (url.startsWith('nova://history')) newTitle = 'History';
    else if (url.startsWith('nova://downloads')) newTitle = 'Downloads';

    const isInternalPage = !!newTitle;

    setTabs(prev => {
      const activeTab = prev.find(t => t.id === activeTabId);
      if (activeTab && activeTab.url === url) {
        // URL is exactly the same, force a reload if it's a webview
        if (!isInternalPage) {
          const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
          if (webview) webview.reload();
        }
        return prev.map(t => t.id === activeTabId ? { ...t, isLoading: !isInternalPage } : t);
      }
      
      return prev.map(t => t.id === activeTabId ? { 
        ...t, 
        url, 
        isLoading: !isInternalPage,
        ...(newTitle ? { title: newTitle } : {})
      } : t);
    });
  }, [activeTabId]);

  // Setup AI Agent Action Context and MCP Action Bridge
  useEffect(() => {
    // 1. Expose executeMcpAction globally for the main process to call
    (window as any).executeMcpAction = async (toolName: string, args: any) => {
      const activeWebview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
      
      switch (toolName) {
        case 'browser_navigate':
          handleNavigate(args.url);
          return `Navigated to ${args.url}`;

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
            return await activeWebview.executeJavaScript(`
              (() => {
                const el = document.querySelector("${args.selector}");
                if (el) { el.click(); return "Successfully clicked element."; }
                return "Error: Element not found with selector: ${args.selector}";
              })();
            `);
          }
          return "Error: No active webview.";

        case 'browser_type':
          if (activeWebview && activeWebview.executeJavaScript) {
            return await activeWebview.executeJavaScript(`
              (() => {
                const el = document.querySelector("${args.selector}");
                if (el) { 
                  el.value = "${args.text}";
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  if (${args.pressEnter ? 'true' : 'false'}) {
                    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
                    el.dispatchEvent(enterEvent);
                  }
                  return "Successfully typed text."; 
                }
                return "Error: Element not found with selector: ${args.selector}";
              })();
            `);
          }
          return "Error: No active webview.";

        case 'browser_run_js':
          if (activeWebview && activeWebview.executeJavaScript) {
            const result = await activeWebview.executeJavaScript(args.script);
            return typeof result === 'object' ? JSON.stringify(result) : String(result);
          }
          return "Error: No active webview.";

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
          handleCloseTab(args.tabId);
          return `Closed tab ${args.tabId}`;

        case 'browser_screenshot':
          if (activeWebview && activeWebview.capturePage) {
            const image = await activeWebview.capturePage();
            return image.toDataURL();
          }
          return "Error: Could not take screenshot.";

        case 'browser_scroll': {
          const direction = args.direction || 'down';
          const amount = args.amount || 500;
          if (activeWebview && activeWebview.executeJavaScript) {
            if (direction === 'up') await activeWebview.executeJavaScript(`window.scrollBy(0, -${amount})`);
            else if (direction === 'down') await activeWebview.executeJavaScript(`window.scrollBy(0, ${amount})`);
            else if (direction === 'top') await activeWebview.executeJavaScript(`window.scrollTo(0, 0)`);
            else if (direction === 'bottom') await activeWebview.executeJavaScript(`window.scrollTo(0, document.body.scrollHeight)`);
            return `Scrolled ${direction}`;
          }
          return "Error: No active webview.";
        }

        case 'browser_new_tab': {
          const newUrl = args.url || 'nova://newtab';
          handleNewTab(newUrl);
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
            handleNewTab(currentTab.url);
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
        handleNavigate(url);
      },
      onExecuteScript: async (script: string) => {
        const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
        if (webview && webview.executeJavaScript) {
          try {
            return await webview.executeJavaScript(script);
          } catch (e) {
            console.error("AI execution error:", e);
            throw e;
          }
        }
        
        const iframe = document.querySelector(`iframe[data-tab-id="${activeTabId}"]`) as HTMLIFrameElement;
        if (iframe) {
          console.warn("AI scripts cannot be executed in iframes due to cross-origin security. Please run the app in Electron.");
          return "Error: Cannot read page content in web development mode. Please run the desktop app.";
        }
        
        throw new Error("No active webview or iframe found");
      },
      onCreateTab: (url: string) => handleNewTab(url),
      onCloseTab: (id: string) => handleCloseTab(id),
      onSwitchTab: (id: string) => handleSelectTab(id),
      onGetAllTabs: () => tabs.map(t => ({ id: t.id, title: t.title, url: t.url })),
      onScrollPage: (direction, amount) => {
        const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
        if (webview && webview.executeJavaScript) {
          if (direction === 'up') webview.executeJavaScript(`window.scrollBy(0, -${amount || 500})`);
          if (direction === 'down') webview.executeJavaScript(`window.scrollBy(0, ${amount || 500})`);
          if (direction === 'top') webview.executeJavaScript(`window.scrollTo(0, 0)`);
          if (direction === 'bottom') webview.executeJavaScript(`window.scrollTo(0, document.body.scrollHeight)`);
        } else {
          console.warn("Cannot scroll iframes cross-origin.");
        }
      },
      onPressKey: (key: string) => {
        const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
        if (webview) {
          webview.sendInputEvent({ type: 'keyDown', keyCode: key });
          webview.sendInputEvent({ type: 'char', keyCode: key });
          webview.sendInputEvent({ type: 'keyUp', keyCode: key });
        }
      },
      onTakeScreenshot: async () => {
        const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
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
        const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
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
        const q = query.toLowerCase();
        // search history and bookmarks
        const results = [
          ...history.filter(h => h.title.toLowerCase().includes(q) || h.url.toLowerCase().includes(q)),
          ...bookmarks.filter(b => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q))
        ];
        // deduplicate by URL
        const unique = Array.from(new Map(results.map(item => [item.url, item])).values());
        return unique.slice(0, 10).map(u => ({ title: u.title, url: u.url }));
      }
    });
  }, [activeTabId, handleNavigate, handleNewTab, handleCloseTab, tabs, history, bookmarks]);

  const handleUpdateTab = useCallback((id: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => {
      if (t.id === id) {
        // Only apply updates if there are actual changes
        const hasChanges = Object.entries(updates).some(([k, v]) => (t as any)[k] !== v);
        if (!hasChanges) return t;

        const updated = { ...t, ...updates };
        
        // Add to history if title or url loaded and not blank/newtab AND NOT INCOGNITO
        if (!updated.isIncognito && (updates.title || updates.url)) {
          const targetUrl = updated.url;
          if (targetUrl && targetUrl !== 'nova://newtab' && targetUrl !== 'about:blank' && !targetUrl.startsWith('chrome://')) {
            setHistory(hPrev => {
              // Avoid duplicate entry if same url was recorded recently
              if (hPrev[0]?.url === targetUrl) return hPrev;
              return [{
                id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
                url: targetUrl,
                title: updated.title || targetUrl,
                favicon: updated.favicon,
                timestamp: Date.now()
              }, ...hPrev.slice(0, 500)]; // keep last 500
            });
          }
        }
        return updated;
      }
      return t;
    }));
  }, []);

  const handleTogglePinTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t));
  }, []);

  const handleToggleMuteTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleDuplicateTab = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTabs(prev => {
      const tabToDuplicate = prev.find(t => t.id === id);
      if (!tabToDuplicate) return prev;
      const duplicatedTab: Tab = {
        ...tabToDuplicate,
        id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
        title: `${tabToDuplicate.title} (Copy)`
      };
      setActiveTabId(duplicatedTab.id);
      return [...prev, duplicatedTab];
    });
  }, []);

  const handleToggleBookmark = useCallback((tab: Tab) => {
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
    handleNewTab('nova://downloads');
  }, [handleNewTab]);
  const handleOpenSettings = useCallback(() => handleNewTab('nova://settings'), [handleNewTab]);
  const handleOpenExtensions = useCallback(() => openModal('extensions'), [openModal]);
  const handleOpenShare = useCallback(() => openModal('share'), [openModal]);
  const handleTakeScreenshot = useCallback(async () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.capturePage) {
      try {
        const image = await webview.capturePage();
        const dataUrl = image.toDataURL();
        setScreenshotDataUrl(dataUrl);
        setIsScreenshotOpen(true);
      } catch (err) {
        console.error('Screenshot capture failed:', err);
      }
    } else {
      alert("Screenshot feature is only available in the desktop app.");
    }
  }, [activeTabId]);
  const handleOpenFindInPage = useCallback(() => setIsFindInPageOpen(prev => !prev), []);
  
  const handleToggleSplitView = useCallback(() => {
    if (splitTabId) {
      setSplitTabId(null);
    } else {
      const workspaceTabs = tabs.filter(t => t.workspaceId === activeWorkspaceId || (!t.workspaceId && activeWorkspaceId === 'default'));
      const otherTab = workspaceTabs.find(t => t.id !== activeTabId);
      if (otherTab) {
        setSplitTabId(otherTab.id);
      } else {
        const newId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7);
        setTabs(prev => [...prev, {
          id: newId,
          url: 'nova://newtab',
          title: 'New Tab',
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
          workspaceId: activeWorkspaceId
        }]);
        setSplitTabId(newId);
      }
      setSplitRatio(50);
    }
  }, [splitTabId, tabs, activeWorkspaceId, activeTabId]);

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
      return;
    }
    
    const now = Date.now();
    let cutoff = 0;
    if (timeframe === 'hour') cutoff = now - 60 * 60 * 1000;
    else if (timeframe === 'day') cutoff = now - 24 * 60 * 60 * 1000;
    else if (timeframe === 'week') cutoff = now - 7 * 24 * 60 * 60 * 1000;
    else if (timeframe === 'month') cutoff = now - 28 * 24 * 60 * 60 * 1000;

    setHistory(prev => prev.filter(item => item.timestamp < cutoff));
  }, []);
  const handleRemoveHistoryItem = useCallback((id: string) => setHistory(prev => prev.filter(item => item.id !== id)), []);

  const handleClearDownloads = useCallback(() => setDownloads([]), []);


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

  const handleFoundInPage = useCallback((idx: number, count: number) => setFindMatches({ index: idx, count }), []);
  const handleCloseFindInPage = useCallback(() => setIsFindInPageOpen(false), []);

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
          document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus();
        }, 100);
        return;
      }
      
      if (matches('reopenTab')) {
        e.preventDefault();
        setClosedTabsStack(stack => {
          if (stack.length === 0) return stack;
          const lastTab = stack[stack.length - 1];
          setTabs(prev => [...prev, lastTab]);
          setActiveTabId(lastTab.id);
          return stack.slice(0, -1);
        });
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

      if (matches('reload')) {
        e.preventDefault();
        handleReload();
        return;
      }

      if (matches('omnibox')) {
        e.preventDefault();
        setIsSpotlightOpen(prev => !prev);
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

      if (matches('findInPage')) {
        e.preventDefault();
        setIsFindInPageOpen(prev => !prev);
        return;
      }

      // Hardcoded tab switching (Cmd + 1..9)
      if (meta && !shift && /^[1-9]$/.test(key)) {
        e.preventDefault();
        const num = parseInt(key, 10);
        setTabs(currentTabs => {
          if (num === 9 && currentTabs.length > 0) {
            setActiveTabId(currentTabs[currentTabs.length - 1].id);
          } else if (num <= currentTabs.length) {
            setActiveTabId(currentTabs[num - 1].id);
          }
          return currentTabs;
        });
        return;
      }

      // Hardcoded Zoom (Cmd + +, Cmd + -)
      if (meta && (key === '+' || key === '=')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }
      if (meta && key === '-') {
        e.preventDefault();
        handleZoomOut();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, handleNewTab, handleNewIncognitoTab, handleReload, handleToggleBookmarkActive, handleZoomIn, handleZoomOut, handleCloseTab, settings.shortcuts]);



  const activeDownloadsCount = downloads.filter(d => d.state === 'progressing').length;

  // Compute second tab for split view (if available)
  const secondaryTab = splitTabId ? tabs.find(t => t.id === splitTabId) : undefined;
  // If active tab is the same as split tab, reset split view or switch split tab
  if (secondaryTab && activeTabId === secondaryTab.id) {
    setSplitTabId(null);
  }

  const workspaceTabs = tabs.filter(t => t.workspaceId === activeWorkspaceId || (!t.workspaceId && activeWorkspaceId === 'default'));

  if (showOnboarding) {
    return (
      <Onboarding
        onComplete={(prefs) => {
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
        }}
      />
    );
  }

  return (
    <div className={`flex ${settings.useVerticalTabs ? 'flex-row' : 'flex-col'} h-full w-full overflow-hidden text-slate-900 dark:text-slate-100 relative ${
      settings.useVerticalTabs 
        ? activeTab?.isIncognito ? 'bg-slate-950' : 'bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900'
        : 'bg-slate-50 dark:bg-slate-900'
    }`}>
      
      {settings.useVerticalTabs && (
        <div className="h-full flex flex-col shrink-0 drag-region relative z-50">
          <SidebarTabs
            tabs={workspaceTabs}
            folders={folders}
            activeTabId={activeTabId}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
            onNewTab={handleNewTab}
            onToggleMuteTab={handleToggleMuteTab}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSelectWorkspace={handleSelectWorkspace}
            isIncognito={activeTab?.isIncognito}
            onCreateFolder={handleCreateFolder}
            onToggleFolder={handleToggleFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveTabToFolder={handleMoveTabToFolder}
            onOpenSpotlight={() => setIsSpotlightOpen(true)}
            onTabDragStart={() => setIsDraggingTab(true)}
            onTabDragEnd={() => setIsDraggingTab(false)}
            splitTabId={splitTabId}
            onCloseSplit={() => setSplitTabId(null)}
          />
        </div>
      )}

      <div className={`flex flex-col flex-1 min-w-0 relative z-40 bg-white dark:bg-slate-900 overflow-hidden ${settings.useVerticalTabs ? 'rounded-xl shadow-2xl shadow-black/20 m-2' : ''}`}>
        {/* TOP NAVIGATION BAR */}
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
          onToggleReaderMode={() => setIsReaderModeOpen(prev => !prev)}
          isSplitView={!!splitTabId}
          tabStyle={settings.tabStyle}
          isIncognito={activeTab?.isIncognito}
          searchEngine={settings.searchEngine}
          onToggleBookmark={handleToggleBookmarkActive}
          onOpenHistory={handleOpenHistory}
          onOpenDownloads={handleOpenDownloads}
          onOpenSettings={handleOpenSettings}
          onOpenExtensions={handleOpenExtensions}
          onOpenShare={handleOpenShare}
          onTakeScreenshot={handleTakeScreenshot}
          onOpenFindInPage={handleOpenFindInPage}
          onToggleSplitView={handleToggleSplitView}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onDuplicateTab={handleDuplicateTab}
          onTogglePinTab={handleTogglePinTab}
          onToggleMuteTab={handleToggleMuteTab}
          onSuspendTab={handleSuspendTab}
          onReorderTabs={handleReorderTabs}
          onReorderFullList={handleReorderFullList}
          onTogglePip={handleTogglePip}
          onSelectTab={handleSelectTab}
          onNewTab={handleNewTab}
          onNewIncognitoTab={handleNewIncognitoTab}
          onCloseTab={handleCloseTab}
          onNavigate={handleNavigate}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onReload={handleReload}
          isVpnEnabled={vpnEnabled}
          onToggleVpn={() => {
          closeAllModals();
          setIsVpnPopoverOpen(!isVpnPopoverOpen);
        }}
        onToggleAIAssistant={() => {
          setIsSidePanelOpen(!isSidePanelOpen);
        }}
        onTabDragStart={() => setIsDraggingTab(true)}
        onTabDragEnd={() => {
          setIsDraggingTab(false);
          setIsDragOverMain(false);
        }}
        onTabDrag={(y) => setIsDragOverMain(y > 60)}
        onDropToSplitScreen={(tabId) => {
          if (tabId !== activeTabId) {
            setSplitTabId(tabId);
          }
        }}
      />

      {/* MAIN BROWSER CONTENT */}
      <main 
        className="flex-1 relative w-full h-full bg-white dark:bg-slate-900 flex overflow-hidden"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('text/plain')) {
            e.preventDefault();
            setIsDragOverMain(true);
          }
        }}
        onDragLeave={() => setIsDragOverMain(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOverMain(false);
          const tabId = e.dataTransfer.getData('text/plain');
          const draggedTab = tabs.find(t => t.id === tabId);
          if (draggedTab && tabId !== activeTabId) {
            setSplitTabId(tabId);
          }
        }}
      >
        {/* Split Screen Drop Overlay */}
        <AnimatePresence>
          {isDragOverMain && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-y-0 right-0 w-[45%] bg-blue-500/10 border-l-2 border-blue-500/50 backdrop-blur-sm z-[999] flex items-center justify-center pointer-events-none"
            >
              <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex flex-col items-center gap-2 text-sm font-medium">
                <PanelRight className="w-8 h-8" />
                Drop to Split View
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
          {[...tabs].sort((a, b) => a.id.localeCompare(b.id)).map((tab) => {
            if (secondaryTab && tab.id === secondaryTab.id) {
              return null;
            }
            return (
              <div
                key={tab.id}
                className={`w-full h-full absolute inset-0 transition-opacity duration-150 ${
                  tab.id === activeTabId ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <BrowserView 
                  tab={tab} 
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
                  history={history}
                  downloads={downloads}
                  onClearHistory={handleClearHistory}
                  onRemoveHistoryItem={handleRemoveHistoryItem}
                  onClearDownloads={handleClearDownloads}
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
            <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
              <div className="px-2 py-1 bg-slate-800/80 text-white rounded text-[10px] font-medium backdrop-blur-xs shadow-md">
                Split View: {secondaryTab.title || secondaryTab.url}
              </div>
              <button 
                onClick={() => setSplitTabId(null)}
                className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors"
                title="Close Split View"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <BrowserView 
              tab={secondaryTab}
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
              history={history}
              downloads={downloads}
              onClearHistory={handleClearHistory}
              onRemoveHistoryItem={handleRemoveHistoryItem}
              onClearDownloads={handleClearDownloads}
            />
          </div>
        )}

        {/* AI Assistant Side Panel */}
        <SidePanel 
          isOpen={isSidePanelOpen} 
          onClose={() => setIsSidePanelOpen(false)} 
        />
      </main>

      {/* SPOTLIGHT OMNIBOX */}
      <SpotlightOmnibox
        isOpen={isSpotlightOpen}
        onClose={handleCloseSpotlight}
        tabs={tabs}
        activeTabId={activeTabId}
        searchEngine={settings.searchEngine}
        onSelectTab={(tabId) => {
          const t = tabs.find(t => t.id === tabId);
          if (t && t.workspaceId && t.workspaceId !== activeWorkspaceId) {
             setActiveWorkspaceId(t.workspaceId);
          } else if (t && !t.workspaceId && activeWorkspaceId !== 'default') {
             setActiveWorkspaceId('default');
          }
          setActiveTabId(tabId);
        }}
        onNewTab={handleNewTab}
        onCloseTab={handleCloseTab}
        onNavigate={handleNavigate}
      />

      {/* EXTENSIONS MODAL */}
      <ExtensionsModal
        isOpen={isExtensionsOpen}
        onClose={() => setIsExtensionsOpen(false)}
        extensions={extensions}
        onToggleExtension={(id) => {
          setExtensions(prev => prev.map(e => e.id === id ? { ...e, enabled: e.enabled === false ? true : false } : e));
        }}
        onRemoveExtension={(id) => {
          setExtensions(prev => prev.filter(e => e.id !== id));
        }}
        onManageExtensions={() => handleNewTab('nova://settings#extensions')}
      />

      {/* SHARE & QR CODE MODAL */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={handleCloseShare}
        url={activeTab?.url || ''}
        title={activeTab?.title || ''}
      />

      {/* SCREENSHOT MODAL */}
      <ScreenshotModal
        isOpen={isScreenshotOpen}
        onClose={() => setIsScreenshotOpen(false)}
        imageDataUrl={screenshotDataUrl}
        pageTitle={activeTab?.title || ''}
      />



      {/* VPN POPOVER */}
      <VpnPopover
        isOpen={isVpnPopoverOpen}
        onClose={() => setIsVpnPopoverOpen(false)}
        isEnabled={vpnEnabled}
        onToggle={setVpnEnabled}
        selectedLocation={vpnLocation}
        locations={vpnLocations}
        onSelectLocation={setVpnLocation}
        anchorRef={{ current: null } as any}
      />

      </div>

      <ReaderMode 
        url={activeTab?.url || ''} 
        tabId={activeTabId} 
        isActive={isReaderModeOpen} 
        onClose={() => setIsReaderModeOpen(false)} 
      />

      <WorkspaceManager 
        isOpen={isWorkspaceManagerOpen} 
        onClose={() => setIsWorkspaceManagerOpen(false)} 
        workspaces={workspaces} 
        onUpdateWorkspaces={setWorkspaces} 
        activeWorkspaceId={activeWorkspaceId} 
        onSelectWorkspace={handleSelectWorkspace} 
        isIncognito={activeTab?.isIncognito} 
      />

      <UpdateToast />

      <AICursorOverlay />
    </div>
  );
}

export default App;
