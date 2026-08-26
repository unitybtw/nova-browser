# Nova Browser Layouts

## App Shell
- Source: `src/App.tsx`
- Description: Root application container orchestrating tabs, workspaces, split-views, modals, and hotkeys.

```tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRight, PanelLeft } from 'lucide-react';
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
        localStorage.setItem('n
```

## SidebarTabs
- Source: `src/components/SidebarTabs.tsx`
- Description: Vertical tab sidebar with pinned favorites, workspaces, tab groups/folders, and quick settings.

```tsx
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
  Compass,
  Cloud
} from 'lucide-react';
import { Tab, Workspace, Folder, Bookmark } from '../types/browser';
import { UserSettings } from '../App';
import { formatSearchUrl } from '../utils/searchEngine';
import { getClientCachedSuggestions, setClientCachedSuggestions } from '../utils/suggestionCache';
import { TabContextMenu, TabContextMenuState } from './TabContextMenu';
import { tabThumbnailCache } from '../services/thumbnailCache';

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
  onCloseSplit?: (tab1Id?: string, tab2Id?: string) => void;
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
  onOpenAccount?: () => void;
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
  const thumbnail = tab ? (tabThumbnailCache.get(tab.id) || tab.thumbnail) : undefined;
  if (!tab || !thumbnail) return null;

  return createPortal(
    <AnimatePresence>
      {tab && thumbnail && (
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
              src={thumbnail}
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
  splitTab?: Tab | null;
  activeTabId?: string;
  isActive: boolean;
  isDragOver: boolean;
  isNested: boolean;
  tabsLength: number;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e?: React.MouseEvent) => void;
  onCloseSplit?: () => void;
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
  splitTab,
  activeTabId,
  isActive,
  isDragOver,
  isNested,
  tabsLength,
  onSelectTab,
  onCloseTab,
  onCloseSplit,
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
      {splitTab ? (
        <div className="flex items-center w-full gap-1">
          {/* Primary Split Subtab */}
          <div 
            className={`flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
              activeTabId === tab.id 
                ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-semibold' 
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
            }`}
            onClick={(e) => { e.stopPropagation(); onSelectTab(tab.id); }}
            title={tab.title}
          >
            {tab.favicon ? (
              <img src={tab.favicon} alt="" className="w-3.5 h-3.5 rounded-xs object-contain shrink-0" />
            ) : (
              <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />
            )}
            <span className="truncate text-[12px]">{tab.title || 'New Tab'}</span>
          </div>

          <div className="w-px h-3.5 bg-slate-300 dark:bg-white/20 shrink-0" />

          {/* Secondary Split Subtab */}
          <div 
            className={`flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
              activeTabId === splitTab.id 
                ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-semibold' 
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
            }`}
            onClick={(e) => { e.stopPropagation(); onSelectTab(splitTab.id); }}
            title={splitTab.title}
          >
            {splitTab.favicon ? (
              <img src={splitTab.favicon} alt="" className="w-3.5 h-3.5 rounded-xs object-contain shrink-0" />
            ) : (
              <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />
            )}
            <span className="truncate text-[12px] flex-1">{splitTab.title || 'New Tab'}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onCloseSplit?.(); }}
              className="p-0.5 rounded-sm hover:bg-red-500/20 text-slate-400 hover:text-red-500 shrink-0"
              title="Close Split View"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              {tab.isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-400/40 border-t-slate-800 dark:border-slate-300/40 dark:border-t-white rounded-full animate-spin" />
              ) : tab.favicon ? (
                <img src={tab.favicon} alt="" className="w-3.5 h-3.5 rounded-xs object-contain" />
              ) : tab.url === 'nova://settings' ? (
                <Settings className="w-3.5 h-3.5 opaci
```
