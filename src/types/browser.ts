export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
  isIncognito?: boolean;
  thumbnail?: string;
  workspaceId?: string;
  folderId?: string;
  zoomFactor?: number;
  isPlayingAudio?: boolean;
  blockedAdsCount?: number;
  webContentsId?: number;
  isSuspended?: boolean;
  lastAccessed?: number;
  splitWith?: string;
  isTranslated?: boolean;
  translatedLang?: string;
}

export interface Folder {
  id: string;
  name: string;
  isExpanded: boolean;
  workspaceId: string;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface Extension {
  id: string;
  name: string;
  description?: string;
  version?: string;
  enabled?: boolean;
  iconData?: string;
  popupUrl?: string;
  optionsUrl?: string;
  homepageUrl?: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  timestamp: number;
}

export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  receivedBytes: number;
  totalBytes: number;
  startTime?: number;
  savePath?: string;
  isPaused?: boolean;
}

export interface ShortcutConfig {
  key: string;
  shift?: boolean;
  meta?: boolean;
}

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
  shortcuts?: Record<string, ShortcutConfig>;
  aiLinkPreviewEnabled?: boolean;
  energySaverMode?: boolean;
  preloadDnsEnabled?: boolean;
  smoothScrollingEnabled?: boolean;
  passwordManagerEnabled?: boolean;
  defaultTranslationLanguage?: string;
  language?: 'en' | 'tr' | 'ar' | 'de';
}

export const defaultSettings: UserSettings = {
  searchEngine: 'google',
  privacyShield: true,
  theme: 'dark',
  fontSize: 'medium',
  accentColor: 'blue',
  customAccentColor: '#3b82f6',
  showBookmarksBar: false,
  showTasksWidget: true,
  useVerticalTabs: false,
  mcpServerEnabled: false,
  newTabBackground: 'default',
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
  defaultTranslationLanguage: 'tr',
  language: 'en',
  shortcuts: {
    newTab: { key: 't', shift: false, meta: true },
    reopenTab: { key: 't', shift: true, meta: true },
    closeTab: { key: 'w', shift: false, meta: true },
    newIncognito: { key: 'n', shift: true, meta: true },
    reload: { key: 'r', shift: false, meta: true },
    omnibox: { key: 'k', shift: false, meta: true },
    bookmark: { key: 'd', shift: false, meta: true },
    history: { key: (typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string' && navigator.userAgent.includes('Mac')) ? 'y' : 'h', shift: false, meta: true },
    settings: { key: ',', shift: false, meta: true },
    toggleSidebar: { key: 's', shift: false, meta: true },
    downloads: { key: 'j', shift: false, meta: true },
  }
};

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  timestamp: number;
}

export interface BrowserDemoOptions {
  isDemo?: boolean;
  feature?: string;
  bg?: string;
  theme?: 'dark' | 'light';
  tabs?: string;
  showTasksWidget?: boolean;
}

export interface VpnLocation {
  id: string;
  name: string;
  url: string;
  type: 'free' | 'custom';
}

export interface PermissionRequest {
  requestId: string;
  permission: string;
  url: string;
  origin: string;
  permissionName: string;
  mediaTypes?: string[];
  webContentsId?: number;
  timestamp: number;
}

