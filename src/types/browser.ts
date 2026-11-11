import { createDefaultDesignProfile } from '../utils/designDefaults';

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
  isInPip?: boolean;
  blockedAdsCount?: number;
  webContentsId?: number;
  isSuspended?: boolean;
  lastAccessed?: number;
  splitWith?: string;
  isTranslated?: boolean;
  translatedLang?: string;
}

/**
 * Soft-delete column carried by every synced collection.
 *
 * `deletedAt` is the wall-clock time the row was deleted; absent (rows written
 * before tombstones existed) or null means the row is live. A tombstoned row
 * stays in the store and in the sync payload so the deletion can be replayed
 * on the user's other devices — see `mergeSyncedCollection()` in syncService.
 */
export interface Tombstoneable {
  deletedAt?: number | null;
}

export interface Folder extends Tombstoneable {
  id: string;
  name: string;
  isExpanded: boolean;
  workspaceId: string;
}

export interface Workspace extends Tombstoneable {
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

export interface Bookmark extends Tombstoneable {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  timestamp: number;
}

export interface SavedPassword {
  hostname: string;
  username: string;
  password?: string;
  createdAt?: number;
}

export interface TabOpenRequest {
  url: string;
  sourceWebContentsId: number;
  isIncognito: boolean;
}

export interface DownloadItem {
  /** Assigned by the main process, never by downloaded content. */
  isPrivate?: boolean;
  privateSessionId?: string;
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

export type ChromeMode = 'classic-top' | 'compact-single-row' | 'vertical-left' | 'vertical-right';
export type TabBarPosition = 'above-toolbar' | 'below-toolbar';

export type ToolbarItemKind =
  | 'back'
  | 'forward'
  | 'reload'
  | 'home'
  | 'workspaces'
  | 'omnibox'
  | 'ai'
  | 'shield'
  | 'downloads'
  | 'extensions'
  | 'bookmarksToggle'
  | 'splitView'
  | 'pip'
  | 'screenshot'
  | 'account'
  | 'customize'
  | 'menu'
  | 'spacer'
  | 'divider';

export interface ToolbarSlotItem {
  id: string;
  kind: ToolbarItemKind;
  visible: boolean;
}

export type SurfaceZoneId =
  | 'frame'
  | 'tabBar'
  | 'activeTab'
  | 'inactiveTab'
  | 'toolbar'
  | 'omnibox'
  | 'sidebar'
  | 'aiPanel'
  | 'popovers';

export interface SurfaceZoneStyle {
  bg?: string;
  textColor?: string;
  mutedColor?: string;
  opacity?: number;
  blur?: number;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  shadow?: 'none' | 'soft' | 'elevated' | 'glow';
}

export type UiFontFamily = 'system' | 'inter' | 'geist' | 'mono' | 'serif' | 'rounded';
export type UiDensity = 'compact' | 'normal' | 'comfortable';
export type WindowMaterial = 'opaque' | 'glass-vibrancy';

export interface NewTabLayoutConfig {
  clock: {
    visible: boolean;
    format: '24h' | '12h';
    style: 'minimal' | 'editorial' | 'mono' | 'pill';
    align: 'center' | 'left';
  };
  greeting: {
    visible: boolean;
    customText?: string;
  };
  searchBox: {
    visible: boolean;
    style: 'glass' | 'solid' | 'minimal' | 'pill';
    width: 'narrow' | 'medium' | 'wide';
  };
  shortcuts: {
    visible: boolean;
    columns: 4 | 5 | 6 | 7 | 8;
    cardStyle: 'tile' | 'pill' | 'icon-only' | 'compact';
  };
  tasksWidget: {
    visible: boolean;
    placement: 'bottom' | 'left' | 'right' | 'floating';
  };
}

export interface BrowserDesignProfile {
  meta: {
    version: 1;
    name: string;
    author?: string;
    baseTemplateId?: string;
  };
  layout: {
    chromeMode: ChromeMode;
    tabBarPosition: TabBarPosition;
    sidebarWidth: number;
    sidebarCollapsedShowRail: boolean;
    sidebarSections: {
      favorites: boolean;
      pinned: boolean;
      folders: boolean;
      workspaces: boolean;
      dockFooter: boolean;
    };
    toolbarItems: ToolbarSlotItem[];
    toolbarShowLabels: boolean;
    omniboxMaxWidth: 'compact' | 'balanced' | 'full';
  };
  surfaces: Partial<Record<SurfaceZoneId, SurfaceZoneStyle>>;
  typography: {
    fontFamily: UiFontFamily;
    uiScale: number;
    iconScale: number;
  };
  density: UiDensity;
  effects: {
    windowMaterial: WindowMaterial;
    reduceChromeMotion: boolean;
  };
  newTabLayout: NewTabLayoutConfig;
  customCss: {
    enabled: boolean;
    css: string;
  };
}

export interface PartialBrowserDesignProfile {
  meta?: Partial<BrowserDesignProfile['meta']>;
  layout?: Partial<Omit<BrowserDesignProfile['layout'], 'sidebarSections'>> & {
    sidebarSections?: Partial<BrowserDesignProfile['layout']['sidebarSections']>;
  };
  surfaces?: BrowserDesignProfile['surfaces'];
  typography?: Partial<BrowserDesignProfile['typography']>;
  density?: UiDensity;
  effects?: Partial<BrowserDesignProfile['effects']>;
  newTabLayout?: {
    clock?: Partial<NewTabLayoutConfig['clock']>;
    greeting?: Partial<NewTabLayoutConfig['greeting']>;
    searchBox?: Partial<NewTabLayoutConfig['searchBox']>;
    shortcuts?: Partial<NewTabLayoutConfig['shortcuts']>;
    tasksWidget?: Partial<NewTabLayoutConfig['tasksWidget']>;
  };
  customCss?: Partial<BrowserDesignProfile['customCss']>;
}

export interface ThemePackDocument {
  format: 'nova-theme-pack';
  schemaVersion: 1;
  exportedAt: number;
  profile: BrowserDesignProfile;
}

export interface UserSettings {
  searchEngine: 'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia' | 'yahoo';
  privacyShield: boolean;
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  accentColor: 'blue' | 'emerald' | 'purple' | 'rose' | 'amber' | 'custom';
  customAccentColor?: string;
  browserColor?: 'default' | 'midnight' | 'cyberpunk' | 'forest' | 'crimson' | 'warm' | 'ocean' | 'sunset' | 'custom';
  customBrowserColor?: string;
  showBookmarksBar: boolean;
  useVerticalTabs: boolean;
  mcpServerEnabled: boolean;
  showTasksWidget?: boolean;
  newTabBackground: 'default' | 'gradient' | 'mesh' | 'glass' | 'unsplash' | 'custom_url' | 'aurora_waves' | 'cyber_grid' | 'hyper_space' | 'fireflies' | 'nebula' | 'matrix';
  backgroundCustomUrl?: string;
  startupBehavior: 'newTab' | 'continue' | 'specificPages';
  tabStyle: 'rounded' | 'square' | 'floating';
  tabAnimation?: 'chrome' | 'smooth' | 'snappy' | 'none';
  doNotTrack: boolean;
  clearOnExit: boolean;
  hardwareAcceleration: boolean;
  developerMode: boolean;
  tabHibernationEnabled?: boolean;
  hibernationTimeoutMinutes?: number;
  shortcuts?: Record<string, ShortcutConfig>;
  aiLinkPreviewEnabled?: boolean;
  aiProvider?: 'webgpu' | 'custom';
  aiProviderPreset?: 'ollama' | 'litellm' | 'lmstudio' | 'vllm' | 'openrouter' | 'groq' | 'openai' | 'deepseek' | 'custom';
  aiCustomEndpoint?: string;
  aiCustomModel?: string;
  aiCustomApiKey?: string;
  aiTemperature?: number;
  aiSystemPersonality?: 'balanced' | 'creative' | 'code' | 'concise';
  energySaverMode?: boolean;
  preloadDnsEnabled?: boolean;
  smoothScrollingEnabled?: boolean;
  passwordManagerEnabled?: boolean;
  autoPictureInPicture?: boolean;
  autoCheckUpdates?: boolean;
  autoDownloadUpdates?: boolean;
  defaultTranslationLanguage?: string;
  language?: 'en' | 'tr' | 'ar' | 'de';
  designProfile?: BrowserDesignProfile;
  workspaceDesigns?: Record<string, PartialBrowserDesignProfile>;
}

export function detectSystemLanguage(): 'en' | 'tr' | 'ar' | 'de' {
  return 'en';
}

export const defaultSettings: UserSettings = {
  searchEngine: 'google',
  privacyShield: true,
  theme: 'dark',
  fontSize: 'medium',
  accentColor: 'blue',
  customAccentColor: '#3b82f6',
  browserColor: 'default',
  customBrowserColor: '#6366f1',
  showBookmarksBar: false,
  showTasksWidget: false,
  useVerticalTabs: false,
  mcpServerEnabled: false,
  newTabBackground: 'default',
  backgroundCustomUrl: '',
  startupBehavior: 'newTab',
  tabStyle: 'floating',
  tabAnimation: 'chrome',
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
  autoPictureInPicture: true,
  autoCheckUpdates: true,
  autoDownloadUpdates: false,
  aiProvider: 'webgpu',
  aiProviderPreset: 'ollama',
  aiCustomEndpoint: 'http://localhost:11434/v1',
  aiCustomModel: '',
  aiCustomApiKey: '',
  aiTemperature: 0.2,
  aiSystemPersonality: 'balanced',
  defaultTranslationLanguage: 'en',
  language: detectSystemLanguage(),
  designProfile: createDefaultDesignProfile(),
  workspaceDesigns: {},
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
    downloads: { key: 'j', shift: (typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string' && navigator.userAgent.includes('Mac')), meta: true },
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

