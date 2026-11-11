import type {
  BrowserDesignProfile,
  SurfaceZoneId,
  ToolbarItemKind,
  ToolbarSlotItem,
} from '../types/browser';

export const SURFACE_ZONE_IDS: readonly SurfaceZoneId[] = [
  'frame',
  'tabBar',
  'activeTab',
  'inactiveTab',
  'toolbar',
  'omnibox',
  'sidebar',
  'aiPanel',
  'popovers',
] as const;

export const ALLOWED_TOOLBAR_KINDS: readonly ToolbarItemKind[] = [
  'back',
  'forward',
  'reload',
  'home',
  'workspaces',
  'omnibox',
  'ai',
  'shield',
  'downloads',
  'extensions',
  'bookmarksToggle',
  'splitView',
  'pip',
  'screenshot',
  'account',
  'customize',
  'menu',
  'spacer',
  'divider',
] as const;

export const TOOLBAR_ITEM_ORDER_DEFAULT: ToolbarSlotItem[] = [
  { id: 'slot-back', kind: 'back', visible: true },
  { id: 'slot-forward', kind: 'forward', visible: true },
  { id: 'slot-reload', kind: 'reload', visible: true },
  { id: 'slot-home', kind: 'home', visible: true },
  { id: 'slot-omnibox', kind: 'omnibox', visible: true },
  { id: 'slot-ai', kind: 'ai', visible: true },
  { id: 'slot-divider-1', kind: 'divider', visible: true },
  { id: 'slot-shield', kind: 'shield', visible: true },
  { id: 'slot-downloads', kind: 'downloads', visible: true },
  { id: 'slot-extensions', kind: 'extensions', visible: true },
  { id: 'slot-account', kind: 'account', visible: true },
  { id: 'slot-customize', kind: 'customize', visible: true },
  { id: 'slot-menu', kind: 'menu', visible: true },
];

export const DEFAULT_DESIGN_PROFILE: BrowserDesignProfile = {
  meta: {
    version: 1,
    name: 'Nova Default',
    baseTemplateId: 'nova-default',
  },
  layout: {
    chromeMode: 'classic-top',
    tabBarPosition: 'above-toolbar',
    sidebarWidth: 250,
    sidebarCollapsedShowRail: false,
    sidebarSections: {
      favorites: true,
      pinned: true,
      folders: true,
      workspaces: true,
      dockFooter: true,
    },
    toolbarItems: TOOLBAR_ITEM_ORDER_DEFAULT,
    toolbarShowLabels: false,
    omniboxMaxWidth: 'balanced',
  },
  surfaces: {},
  typography: {
    fontFamily: 'system',
    uiScale: 1,
    iconScale: 1,
  },
  density: 'normal',
  effects: {
    windowMaterial: 'opaque',
    reduceChromeMotion: false,
  },
  newTabLayout: {
    clock: {
      visible: true,
      format: '24h',
      style: 'minimal',
      align: 'center',
    },
    greeting: {
      visible: true,
      customText: '',
    },
    searchBox: {
      visible: true,
      style: 'glass',
      width: 'medium',
    },
    shortcuts: {
      visible: true,
      columns: 4,
      cardStyle: 'tile',
    },
    tasksWidget: {
      visible: false,
      placement: 'bottom',
    },
  },
  customCss: {
    enabled: false,
    css: '',
  },
};

export function createDefaultDesignProfile(): BrowserDesignProfile {
  return JSON.parse(JSON.stringify(DEFAULT_DESIGN_PROFILE)) as BrowserDesignProfile;
}
