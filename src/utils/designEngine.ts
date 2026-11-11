import type {
  BrowserDesignProfile,
  SurfaceZoneId,
  SurfaceZoneStyle,
  UiDensity,
  UiFontFamily,
  UserSettings,
} from '../types/browser';
import { SURFACE_ZONE_IDS, createDefaultDesignProfile } from './designDefaults';
import { sanitizeDesignProfile } from './designSecurity';

export interface ResolvedBrowserDesign extends BrowserDesignProfile {
  isIncognitoLocked: boolean;
  effectiveAccentHex: string;
}

const FONT_FAMILY_STACKS: Record<UiFontFamily, string> = {
  system: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  geist: '"Geist", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace',
  serif: 'Georgia, "Iowan Old Style", "Times New Roman", Times, serif',
  rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", -apple-system, sans-serif',
};

const DENSITY_METRICS: Record<UiDensity, { padY: string; padX: string; toolbarH: string; tabH: string }> = {
  compact: { padY: '3px', padX: '8px', toolbarH: '38px', tabH: '32px' },
  normal: { padY: '6px', padX: '12px', toolbarH: '44px', tabH: '38px' },
  comfortable: { padY: '9px', padX: '14px', toolbarH: '50px', tabH: '42px' },
};

const SHADOW_MAP: Record<NonNullable<SurfaceZoneStyle['shadow']>, string> = {
  none: 'none',
  soft: '0 2px 8px rgba(0, 0, 0, 0.12)',
  elevated: '0 10px 28px rgba(0, 0, 0, 0.24)',
  glow: '0 0 18px color-mix(in srgb, var(--nova-accent, #3b82f6) 28%, transparent)',
};

const ACCENT_MAP: Record<string, string> = {
  blue: '#3b82f6',
  emerald: '#10b981',
  purple: '#a855f7',
  rose: '#f43f5e',
  amber: '#f59e0b',
};

function mergeZoneMaps(
  base: Partial<Record<SurfaceZoneId, SurfaceZoneStyle>>,
  override?: Partial<Record<SurfaceZoneId, SurfaceZoneStyle>>
): Partial<Record<SurfaceZoneId, SurfaceZoneStyle>> {
  const merged: Partial<Record<SurfaceZoneId, SurfaceZoneStyle>> = {};
  for (const id of SURFACE_ZONE_IDS) {
    if (base[id] || override?.[id]) {
      merged[id] = { ...(base[id] || {}), ...(override?.[id] || {}) };
    }
  }
  return merged;
}

export function resolveEffectiveDesign(
  settings: UserSettings,
  activeWorkspaceId?: string,
  isIncognito = false
): ResolvedBrowserDesign {
  const baseProfile = sanitizeDesignProfile(settings.designProfile, createDefaultDesignProfile());

  // Sync legacy useVerticalTabs and showTasksWidget seamlessly when global overrides haven't specified them
  if (settings.useVerticalTabs && baseProfile.layout.chromeMode !== 'vertical-left' && baseProfile.layout.chromeMode !== 'vertical-right') {
    baseProfile.layout.chromeMode = 'vertical-left';
  }
  if (typeof settings.showTasksWidget === 'boolean' && settings.designProfile?.newTabLayout?.tasksWidget?.visible === undefined) {
    baseProfile.newTabLayout.tasksWidget.visible = settings.showTasksWidget;
  }

  let effective: BrowserDesignProfile = baseProfile;
  const wsOverride = activeWorkspaceId && settings.workspaceDesigns
    ? settings.workspaceDesigns[activeWorkspaceId]
    : undefined;

  if (wsOverride && typeof wsOverride === 'object') {
    effective = sanitizeDesignProfile(
      {
        ...baseProfile,
        ...wsOverride,
        meta: { ...baseProfile.meta, ...(wsOverride.meta || {}) },
        layout: {
          ...baseProfile.layout,
          ...(wsOverride.layout || {}),
          sidebarSections: {
            ...baseProfile.layout.sidebarSections,
            ...(wsOverride.layout?.sidebarSections || {}),
          },
          toolbarItems: wsOverride.layout?.toolbarItems ?? baseProfile.layout.toolbarItems,
        },
        surfaces: mergeZoneMaps(baseProfile.surfaces, wsOverride.surfaces),
        typography: { ...baseProfile.typography, ...(wsOverride.typography || {}) },
        effects: { ...baseProfile.effects, ...(wsOverride.effects || {}) },
        newTabLayout: {
          clock: { ...baseProfile.newTabLayout.clock, ...(wsOverride.newTabLayout?.clock || {}) },
          greeting: { ...baseProfile.newTabLayout.greeting, ...(wsOverride.newTabLayout?.greeting || {}) },
          searchBox: { ...baseProfile.newTabLayout.searchBox, ...(wsOverride.newTabLayout?.searchBox || {}) },
          shortcuts: { ...baseProfile.newTabLayout.shortcuts, ...(wsOverride.newTabLayout?.shortcuts || {}) },
          tasksWidget: { ...baseProfile.newTabLayout.tasksWidget, ...(wsOverride.newTabLayout?.tasksWidget || {}) },
        },
        customCss: { ...baseProfile.customCss, ...(wsOverride.customCss || {}) },
      },
      baseProfile
    );
  }

  const effectiveAccentHex =
    settings.accentColor === 'custom' &&
    settings.customAccentColor &&
    /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(settings.customAccentColor)
      ? settings.customAccentColor
      : ACCENT_MAP[settings.accentColor] || '#3b82f6';

  if (isIncognito) {
    effective = {
      ...effective,
      surfaces: {
        ...effective.surfaces,
        frame: { bg: '#090710', borderColor: 'rgba(148,163,184,0.16)', opacity: 1 },
        toolbar: { bg: '#110e1c', textColor: '#f1f5f9', borderColor: 'rgba(148,163,184,0.16)', opacity: 1 },
        sidebar: { bg: '#0c0a14', textColor: '#e2e8f0', borderColor: 'rgba(148,163,184,0.16)', opacity: 1 },
      },
    };
  }

  return {
    ...effective,
    isIncognitoLocked: isIncognito,
    effectiveAccentHex,
  };
}

export function designToCssVariables(
  design: ResolvedBrowserDesign,
  isDark: boolean,
  baseVars: Record<string, string> = {}
): Record<string, string> {
  const vars: Record<string, string> = {};
  const density = DENSITY_METRICS[design.density] || DENSITY_METRICS.normal;

  vars['--nova-font-ui'] = FONT_FAMILY_STACKS[design.typography.fontFamily] || FONT_FAMILY_STACKS.system;
  vars['--nova-ui-scale'] = String(design.typography.uiScale);
  vars['--nova-icon-scale'] = String(design.typography.iconScale);
  vars['--nova-density-pad-y'] = density.padY;
  vars['--nova-density-pad-x'] = density.padX;
  vars['--nova-toolbar-height'] = density.toolbarH;
  vars['--nova-tab-height'] = density.tabH;
  vars['--nova-sidebar-width'] = `${design.layout.sidebarWidth}px`;

  const fallbackBg: Record<SurfaceZoneId, string> = {
    frame: baseVars['--nova-frame-bg'] || (isDark ? '#020617' : '#f1f5f9'),
    tabBar: baseVars['--nova-header-bg'] || (isDark ? '#0f172a' : '#e2e8f0'),
    activeTab: baseVars['--nova-active-tab-bg'] || (isDark ? '#1e293b' : '#ffffff'),
    inactiveTab: 'transparent',
    toolbar: baseVars['--nova-toolbar-bg'] || (isDark ? '#1e293b' : '#ffffff'),
    omnibox: isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(241, 245, 249, 0.92)',
    sidebar: baseVars['--nova-sidebar-bg'] || (isDark ? '#0f172a' : '#f1f5f9'),
    aiPanel: baseVars['--nova-card-bg'] || (isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.95)'),
    popovers: baseVars['--nova-card-bg'] || (isDark ? '#1e293b' : '#ffffff'),
  };

  for (const zone of SURFACE_ZONE_IDS) {
    const z = design.surfaces[zone];
    const baseBg = z?.bg && z.bg !== 'inherit' ? z.bg : fallbackBg[zone];
    const opacity = z?.opacity ?? 1;
    vars[`--nova-${zone}-bg`] = opacity < 1 && baseBg !== 'transparent'
      ? `color-mix(in srgb, ${baseBg} ${Math.round(opacity * 100)}%, transparent)`
      : baseBg;
    if (z?.textColor && z.textColor !== 'inherit') {
      vars[`--nova-${zone}-text`] = z.textColor;
    } else {
      vars[`--nova-${zone}-text`] = isDark ? '#f8fafc' : '#0f172a';
    }
    vars[`--nova-${zone}-muted`] = z?.mutedColor && z.mutedColor !== 'inherit'
      ? z.mutedColor
      : isDark ? '#94a3b8' : '#64748b';
    vars[`--nova-${zone}-border`] = z?.borderColor && z.borderColor !== 'inherit'
      ? z.borderColor
      : baseVars['--nova-border-subtle'] || (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0');
    vars[`--nova-${zone}-border-width`] = `${z?.borderWidth ?? 1}px`;
    vars[`--nova-${zone}-blur`] = `${z?.blur ?? 0}px`;
    vars[`--nova-${zone}-radius`] = `${z?.radius ?? (zone === 'activeTab' || zone === 'inactiveTab' ? 10 : 12)}px`;
    vars[`--nova-${zone}-shadow`] = z?.shadow ? SHADOW_MAP[z.shadow] : 'none';
  }

  // Keep existing core tokens synchronized with per-zone overrides so legacy selectors inherit immediately
  vars['--nova-frame-bg'] = vars['--nova-frame-bg'];
  vars['--nova-header-bg'] = vars['--nova-tabBar-bg'];
  vars['--nova-toolbar-bg'] = vars['--nova-toolbar-bg'];
  vars['--nova-sidebar-bg'] = vars['--nova-sidebar-bg'];
  vars['--nova-active-tab-bg'] = vars['--nova-activeTab-bg'];
  vars['--nova-card-bg'] = vars['--nova-popovers-bg'];

  return vars;
}
