import type { BrowserDesignProfile } from '../types/browser';
import { createDefaultDesignProfile, TOOLBAR_ITEM_ORDER_DEFAULT } from './designDefaults';

export interface StarterDesignTemplate {
  id: string;
  name: string;
  description: string;
  previewAccent: string;
  previewBg: string;
  profile: BrowserDesignProfile;
}

const cloneBase = (): BrowserDesignProfile => createDefaultDesignProfile();

export const STARTER_DESIGN_TEMPLATES: StarterDesignTemplate[] = [
  {
    id: 'nova-default',
    name: 'Nova Default',
    description: 'Two-row top navigation with balanced floating tabs and clean toolbar.',
    previewAccent: '#3b82f6',
    previewBg: '#0f172a',
    profile: cloneBase(),
  },
  {
    id: 'zen-compact',
    name: 'Zen Single-Row',
    description: 'Ultra-compact single unified bar combining tabs, URL pill, and essential controls.',
    previewAccent: '#06b6d4',
    previewBg: '#090d16',
    profile: {
      ...cloneBase(),
      meta: { version: 1, name: 'Zen Single-Row', baseTemplateId: 'zen-compact' },
      layout: {
        ...cloneBase().layout,
        chromeMode: 'compact-single-row',
        omniboxMaxWidth: 'compact',
        toolbarItems: [
          { id: 'slot-back', kind: 'back', visible: true },
          { id: 'slot-forward', kind: 'forward', visible: true },
          { id: 'slot-reload', kind: 'reload', visible: true },
          { id: 'slot-omnibox', kind: 'omnibox', visible: true },
          { id: 'slot-ai', kind: 'ai', visible: true },
          { id: 'slot-customize', kind: 'customize', visible: true },
          { id: 'slot-menu', kind: 'menu', visible: true },
        ],
      },
      density: 'compact',
      surfaces: {
        omnibox: { radius: 999 },
        activeTab: { radius: 12 },
      },
    },
  },
  {
    id: 'arc-studio',
    name: 'Arc Sidebar Studio',
    description: 'Left spatial vertical sidebar with wide workspaces dock and soft rounded window frame.',
    previewAccent: '#8b5cf6',
    previewBg: '#161326',
    profile: {
      ...cloneBase(),
      meta: { version: 1, name: 'Arc Sidebar Studio', baseTemplateId: 'arc-studio' },
      layout: {
        ...cloneBase().layout,
        chromeMode: 'vertical-left',
        sidebarWidth: 268,
        toolbarItems: TOOLBAR_ITEM_ORDER_DEFAULT,
      },
      density: 'comfortable',
      surfaces: {
        sidebar: { radius: 12 },
        activeTab: { radius: 10, shadow: 'soft' },
      },
    },
  },
  {
    id: 'right-dock-pro',
    name: 'Right Engineer Dock',
    description: 'Right-aligned vertical tabs, monospaced UI chrome, crisp borders, and compact metrics.',
    previewAccent: '#10b981',
    previewBg: '#081512',
    profile: {
      ...cloneBase(),
      meta: { version: 1, name: 'Right Engineer Dock', baseTemplateId: 'right-dock-pro' },
      layout: {
        ...cloneBase().layout,
        chromeMode: 'vertical-right',
        sidebarWidth: 248,
      },
      typography: { fontFamily: 'mono', uiScale: 0.96, iconScale: 0.95 },
      density: 'compact',
      surfaces: {
        toolbar: { radius: 6, borderWidth: 1 },
        omnibox: { radius: 6 },
        activeTab: { radius: 6 },
        sidebar: { radius: 6 },
      },
      newTabLayout: {
        ...cloneBase().newTabLayout,
        clock: { visible: true, format: '24h', style: 'mono', align: 'left' },
        shortcuts: { visible: true, columns: 6, cardStyle: 'compact' },
      },
    },
  },
  {
    id: 'frosted-glass',
    name: 'Frosted Translucent Glass',
    description: 'Native OS window vibrancy paired with frosted backdrop blur across chrome surfaces.',
    previewAccent: '#ec4899',
    previewBg: '#1d1024',
    profile: {
      ...cloneBase(),
      meta: { version: 1, name: 'Frosted Translucent Glass', baseTemplateId: 'frosted-glass' },
      effects: { windowMaterial: 'glass-vibrancy', reduceChromeMotion: false },
      surfaces: {
        frame: { opacity: 0.72, blur: 24 },
        toolbar: { opacity: 0.78, blur: 20, radius: 12 },
        sidebar: { opacity: 0.72, blur: 24 },
        activeTab: { opacity: 0.88, blur: 16, radius: 12, shadow: 'glow' },
        popovers: { opacity: 0.85, blur: 28, radius: 16, shadow: 'elevated' },
      },
    },
  },
  {
    id: 'minimal-paper',
    name: 'Minimal Editorial',
    description: 'Tab strip tucked neatly below the address bar, serif New Tab typography, distraction-free chrome.',
    previewAccent: '#f59e0b',
    previewBg: '#1c1917',
    profile: {
      ...cloneBase(),
      meta: { version: 1, name: 'Minimal Editorial', baseTemplateId: 'minimal-paper' },
      layout: {
        ...cloneBase().layout,
        chromeMode: 'classic-top',
        tabBarPosition: 'below-toolbar',
        omniboxMaxWidth: 'compact',
      },
      typography: { fontFamily: 'serif', uiScale: 1, iconScale: 0.95 },
      newTabLayout: {
        clock: { visible: true, format: '24h', style: 'editorial', align: 'center' },
        greeting: { visible: false, customText: '' },
        searchBox: { visible: true, style: 'minimal', width: 'narrow' },
        shortcuts: { visible: true, columns: 5, cardStyle: 'pill' },
        tasksWidget: { visible: false, placement: 'bottom' },
      },
    },
  },
];

export function getStarterTemplateById(id: string): StarterDesignTemplate | undefined {
  return STARTER_DESIGN_TEMPLATES.find(t => t.id === id);
}
