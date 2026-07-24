import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { BrowserView } from './components/BrowserView';
import { HistoryModal, HistoryItem } from './components/HistoryModal';
import { DownloadsModal, DownloadItem } from './components/DownloadsModal';
export interface UserSettings {
  searchEngine: 'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia';
  privacyShield: boolean;
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  accentColor: 'blue' | 'emerald' | 'purple' | 'rose' | 'amber';
  showBookmarksBar: boolean;
  useVerticalTabs: boolean;
  mcpServerEnabled: boolean;
  newTabBackground: 'default' | 'gradient' | 'mesh' | 'glass';
  startupBehavior: 'newTab' | 'continue' | 'specificPages';
  tabStyle: 'rounded' | 'square' | 'floating';
  doNotTrack: boolean;
  clearOnExit: boolean;
  hardwareAcceleration: boolean;
  developerMode: boolean;
}
import { ShareModal } from './components/ShareModal';
import { ScreenshotModal } from './components/ScreenshotModal';
import { FindInPage } from './components/FindInPage';
import { SpotlightOmnibox } from './components/SpotlightOmnibox';
import { VpnPopover, VpnLocation } from './components/VpnPopover';
import { SidePanel } from './components/SidePanel';
import { WorkspaceManager } from './components/WorkspaceManager';
import { AICursorOverlay } from './components/AICursorOverlay';
import { SidebarTabs } from './components/SidebarTabs';
import { ReaderMode } from './components/ReaderMode';
import { ExtensionsModal } from './components/ExtensionsModal';
import { aiAgent } from './services/aiAgent';
import { Tab, Bookmark } from './types/browser';

const DEFAULT_VPN_LOCATIONS: VpnLocation[] = [
  { id: 'us-1', name: 'United States (Public)', url: 'http://198.199.86.11:8080', type: 'free' },
  { id: 'uk-1', name: 'United Kingdom (Public)', url: 'http://188.166.38.163:8080', type: 'free' },
  { id: 'de-1', name: 'Germany (Public)', url: 'http://167.235.215.35:8080', type: 'free' },
];

function App() {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const saved = localStorage.getItem('tabs_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      {
        id: '1',
        url: 'https://www.google.com',
        title: 'Google',
        isLoading: false,
        canGoBack: false,
        canGoForward: false
      }
    ];
  });
  
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const saved = localStorage.getItem('active_tab_session');
    return saved || (tabs[0]?.id || '1');
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  // Removed isSettingsOpen
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
  const [findMatches, setFindMatches] = useState<{ index: number; count: number }>({ index: 0, count: 0 });

  const [vpnEnabled, setVpnEnabled] = useState(false);
  const [vpnLocation, setVpnLocation] = useState<VpnLocation>(DEFAULT_VPN_LOCATIONS[0]);
  const [vpnLocations, setVpnLocations] = useState<VpnLocation[]>(DEFAULT_VPN_LOCATIONS);

  const closeAllModals = useCallback(() => {
    setIsHistoryOpen(false);
    setIsDownloadsOpen(false);

    setIsShareOpen(false);
    setIsSpotlightOpen(false);
    setIsVpnPopoverOpen(false);
    setIsExtensionsOpen(false);
  }, []);


  const openModal = useCallback((modalName: 'history' | 'downloads' | 'settings' | 'share' | 'spotlight' | 'extensions') => {
    closeAllModals();
    if (modalName === 'history') setIsHistoryOpen(true);
    else if (modalName === 'downloads') setIsDownloadsOpen(true);

    else if (modalName === 'share') setIsShareOpen(true);
    else if (modalName === 'spotlight') setIsSpotlightOpen(true);
    else if (modalName === 'extensions') setIsExtensionsOpen(true);
  }, [closeAllModals]);

  // User settings
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('user_settings');
    return saved ? JSON.parse(saved) : {
      searchEngine: 'google',
      privacyShield: true,
      theme: 'system',
      fontSize: 'medium',
      accentColor: 'blue',
      showBookmarksBar: false,
      useVerticalTabs: false,
      mcpServerEnabled: false,
      newTabBackground: 'default',
      startupBehavior: 'newTab',
      tabStyle: 'floating',
      doNotTrack: true,
      clearOnExit: false,
      hardwareAcceleration: true,
      developerMode: false
    };
  });

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
  }, [settings]);

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

  // Apply User Accent Color to CSS Root Variable
  useEffect(() => {
    const colorMap: Record<string, string> = {
      blue: '#3b82f6',
      emerald: '#10b981',
      purple: '#a855f7',
      rose: '#f43f5e',
      amber: '#f59e0b'
    };
    const accentHex = colorMap[settings.accentColor] || '#3b82f6';
    document.documentElement.style.setProperty('--accent-color', accentHex);
  }, [settings.accentColor]);
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const saved = localStorage.getItem('bookmarks');
    return saved ? JSON.parse(saved) : [];
  });

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const [closedTabsStack, setClosedTabsStack] = useState<Tab[]>([]);

  // Track closed tabs for Cmd+Shift+T
  const handleCloseTab = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTabs(prevTabs => {
      if (prevTabs.length <= 1) return prevTabs;
      const targetTab = prevTabs.find(t => t.id === id);
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
      return newTabs;
    });
  }, [activeTabId, splitTabId]);



  // Listen to IPC events from main process (Shortcuts & Downloads) with cleanups
  useEffect(() => {
    let cleanupShortcut: (() => void) | void;
    let cleanupDownloads: (() => void) | void;

    if (window.electronAPI?.onShortcut) {
      cleanupShortcut = window.electronAPI.onShortcut((_event: any, command: string) => {
        console.log('Shortcut received in React:', command);
        if (command === 'search' || command === 'toggle-omnibox') {
          setIsSpotlightOpen(prev => !prev);
        }
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
      if (typeof cleanupDownloads === 'function') cleanupDownloads();
      if (typeof cleanupExtInstall === 'function') cleanupExtInstall();
      window.removeEventListener('open-ai-sidepanel', handleOpenSidePanel);
      window.removeEventListener('open-workspace-manager', handleOpenWorkspaceManager);
    };
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const handleNewTab = useCallback((url?: string | any) => {
    const finalUrl = typeof url === 'string' ? url : 'nova://newtab';
    const newTab: Tab = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
      url: finalUrl,
      title: 'New Tab',
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

  const handleZoomIn = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.getZoomLevel) {
      try {
        const result = webview.getZoomLevel();
        if (typeof result === 'number') {
          const newLevel = result + 0.5;
          webview.setZoomLevel(newLevel);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomLevel: newLevel } : t));
        } else if (result && typeof result.then === 'function') {
          result.then((level: number) => {
            const newLevel = level + 0.5;
            webview.setZoomLevel(newLevel);
            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomLevel: newLevel } : t));
          });
        }
      } catch (e) {
        console.error("Zoom in error:", e);
      }
    }
  }, [activeTabId]);

  const handleZoomOut = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.getZoomLevel) {
      try {
        const result = webview.getZoomLevel();
        if (typeof result === 'number') {
          const newLevel = result - 0.5;
          webview.setZoomLevel(newLevel);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomLevel: newLevel } : t));
        } else if (result && typeof result.then === 'function') {
          result.then((level: number) => {
            const newLevel = level - 0.5;
            webview.setZoomLevel(newLevel);
            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomLevel: newLevel } : t));
          });
        }
      } catch (e) {
        console.error("Zoom out error:", e);
      }
    }
  }, [activeTabId]);


  const handleNavigate = useCallback((url: string) => {
    const isNewTabUrl = url === 'nova://newtab' || url === 'about:blank' || url === 'https://newtab';
    setTabs(prev => {
      const activeTab = prev.find(t => t.id === activeTabId);
      if (activeTab && activeTab.url === url) {
        // URL is exactly the same, force a reload
        const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
        if (webview) webview.reload();
        return prev.map(t => t.id === activeTabId ? { ...t, isLoading: true } : t);
      }
      // Update the tab URL — BrowserView's useEffect will call webview.loadURL()
      // DO NOT call loadURL here directly to avoid double-load race conditions
      return prev.map(t => t.id === activeTabId ? { ...t, url, isLoading: !isNewTabUrl } : t);
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
      onSwitchTab: (id: string) => setActiveTabId(id),
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

  const handleOpenHistory = useCallback(() => openModal('history'), [openModal]);
  const handleOpenDownloads = useCallback(() => openModal('downloads'), [openModal]);
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

  const handleCloseHistory = useCallback(() => setIsHistoryOpen(false), []);
  const handleClearHistory = useCallback(() => setHistory([]), []);
  const handleRemoveHistoryItem = useCallback((id: string) => setHistory(prev => prev.filter(item => item.id !== id)), []);

  const handleCloseDownloads = useCallback(() => setIsDownloadsOpen(false), []);
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

  const handleFind = useCallback((text: string, forward?: boolean) => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.findInPage) {
      try {
        webview.findInPage(text, { forward, findNext: true });
      } catch (e) {}
    } else {
      // Basic fallback for standard browser
      try { (window as any).find(text, false, !forward, true, false, false, false); } catch(e) {}
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
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      const key = e.key.toLowerCase();

      // Cmd + T: New Tab
      if (key === 't' && !e.shiftKey) {
        e.preventDefault();
        handleNewTab();
        return;
      }

      // Cmd + Shift + T: Reopen Closed Tab
      if (key === 't' && e.shiftKey) {
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

      // Cmd + W: Close Active Tab
      if (key === 'w' && !e.shiftKey) {
        e.preventDefault();
        if (activeTabId) {
          handleCloseTab(activeTabId);
        }
        return;
      }

      // Cmd + Shift + N: New Incognito Tab
      if (key === 'n' && e.shiftKey) {
        e.preventDefault();
        handleNewIncognitoTab();
        return;
      }

      // Cmd + R: Reload
      if (key === 'r') {
        e.preventDefault();
        handleReload();
        return;
      }

      // Cmd + L or Cmd + K: Focus Omnibox / Spotlight
      if (key === 'l' || key === 'k') {
        e.preventDefault();
        setIsSpotlightOpen(prev => !prev);
        return;
      }

      // Cmd + D: Bookmark Active Page
      if (key === 'd') {
        e.preventDefault();
        handleToggleBookmarkActive();
        return;
      }

      // Cmd + H: History
      if (key === 'h' && !e.shiftKey) {
        e.preventDefault();
        setIsHistoryOpen(prev => !prev);
        return;
      }

      // Cmd + J: Downloads
      if (key === 'j') {
        e.preventDefault();
        setIsDownloadsOpen(prev => !prev);
        return;
      }

      // Cmd + F: Find in Page
      if (key === 'f' && !e.shiftKey) {
        e.preventDefault();
        setIsFindInPageOpen(prev => !prev);
        return;
      }

      // Cmd + 1..8: Switch to tab N, Cmd + 9: Switch to last tab
      if (/^[1-9]$/.test(key)) {
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

      // Cmd + Zoom Shortcuts (+, -, 0)
      if (key === '+' || key === '=') {
        e.preventDefault();
        handleZoomIn();
        return;
      }
      if (key === '-') {
        e.preventDefault();
        handleZoomOut();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, handleNewTab, handleNewIncognitoTab, handleReload, handleToggleBookmarkActive, handleZoomIn, handleZoomOut, handleCloseTab]);



  const activeDownloadsCount = downloads.filter(d => d.state === 'progressing').length;

  // Compute second tab for split view (if available)
  const secondaryTab = splitTabId ? tabs.find(t => t.id === splitTabId) : undefined;
  // If active tab is the same as split tab, reset split view or switch split tab
  if (secondaryTab && activeTabId === secondaryTab.id) {
    setSplitTabId(null);
  }

  const workspaceTabs = tabs.filter(t => t.workspaceId === activeWorkspaceId || (!t.workspaceId && activeWorkspaceId === 'default'));

  return (
    <div className={`flex ${settings.useVerticalTabs ? 'flex-row' : 'flex-col'} h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100`}>
      
      {settings.useVerticalTabs && (
        <div className="pt-8 bg-slate-50 dark:bg-slate-900 h-full flex flex-col shrink-0 drag-region">
          <SidebarTabs
            tabs={workspaceTabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onNewTab={handleNewTab}
            onToggleMuteTab={handleToggleMuteTab}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSelectWorkspace={handleSelectWorkspace}
            isIncognito={activeTab?.isIncognito}
          />
        </div>
      )}

      <div className={`flex flex-col flex-1 min-w-0 ${settings.useVerticalTabs ? 'pt-8' : ''}`}>
        {/* TOP NAVIGATION BAR */}
        <TopBar 
          tabs={workspaceTabs}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={handleSelectWorkspace}
          activeTabId={activeTabId}
          bookmarks={bookmarks}
          activeDownloadsCount={activeDownloadsCount}
          showBookmarksBar={settings.showBookmarksBar}
          useVerticalTabs={settings.useVerticalTabs}
          onToggleReaderMode={() => setIsReaderModeOpen(prev => !prev)}
          isSplitView={!!splitTabId}
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
          onTogglePip={handleTogglePip}
          onSelectTab={setActiveTabId}
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
      />

      {/* MAIN BROWSER CONTENT */}
      <main className="flex-1 relative w-full h-full bg-white dark:bg-slate-900 flex overflow-hidden">
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
        <div style={{ width: secondaryTab ? `${splitRatio}%` : '100%' }} className="h-full relative transition-all duration-150">
          {tabs.map((tab) => {
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
                setSplitRatio(newRatio);
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        )}

        {/* Secondary View (Split Screen) */}
        {secondaryTab && (
          <div style={{ width: `${100 - splitRatio}%` }} className="h-full relative bg-white dark:bg-slate-900 transition-all duration-150">
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

      {/* HISTORY MODAL */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={handleCloseHistory}
        history={history}
        onNavigate={handleNavigate}
        onClearHistory={handleClearHistory}
        onRemoveHistoryItem={handleRemoveHistoryItem}
      />

      {/* DOWNLOADS MODAL */}
      <DownloadsModal
        isOpen={isDownloadsOpen}
        onClose={handleCloseDownloads}
        downloads={downloads}
        onClearDownloads={handleClearDownloads}
      />

    // Deleted SettingsModal

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

      {/* EXTENSIONS MODAL */}
      <ExtensionsModal
        isOpen={isExtensionsOpen}
        onClose={() => setIsExtensionsOpen(false)}
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

      <AICursorOverlay />

      </div>
    </div>
  );
}

export default App;
