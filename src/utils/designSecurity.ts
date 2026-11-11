import type {
  BrowserDesignProfile,
  ChromeMode,
  NewTabLayoutConfig,
  PartialBrowserDesignProfile,
  SurfaceZoneId,
  SurfaceZoneStyle,
  TabBarPosition,
  ThemePackDocument,
  ToolbarItemKind,
  ToolbarSlotItem,
  UiDensity,
  UiFontFamily,
  WindowMaterial,
} from '../types/browser';
import {
  ALLOWED_TOOLBAR_KINDS,
  SURFACE_ZONE_IDS,
  createDefaultDesignProfile,
} from './designDefaults';

const MAX_THEME_PACK_BYTES = 131_072;
const MAX_CUSTOM_CSS_CHARS = 32_768;

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_FUNC_RE = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*[,/]\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/;
const HSL_FUNC_RE = /^hsla?\(\s*\d{1,3}(?:deg)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*[,/]\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i;
const GRADIENT_RE = /^(?:linear|radial|conic)-gradient\([^{};<>]+?\)$/i;
const SAFE_SLOT_ID_RE = /^[a-zA-Z0-9_-]{1,48}$/;

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function isSafeSurfaceColor(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed || trimmed.length > 240) return false;
  if (/url\s*\(/i.test(trimmed) || /expression\s*\(/i.test(trimmed) || /javascript:/i.test(trimmed)) {
    return false;
  }
  if (trimmed === 'inherit' || trimmed === 'transparent') return true;
  return (
    HEX_COLOR_RE.test(trimmed) ||
    RGB_FUNC_RE.test(trimmed) ||
    HSL_FUNC_RE.test(trimmed) ||
    GRADIENT_RE.test(trimmed)
  );
}

export function sanitizeCustomCss(rawCss: string): { css: string; warnings: string[] } {
  const warnings: string[] = [];
  if (typeof rawCss !== 'string' || !rawCss.trim()) {
    return { css: '', warnings };
  }

  let css = rawCss;
  if (css.length > MAX_CUSTOM_CSS_CHARS) {
    css = css.slice(0, MAX_CUSTOM_CSS_CHARS);
    warnings.push(`Custom CSS truncated to ${MAX_CUSTOM_CSS_CHARS} characters.`);
  }

  const rules: Array<{ pattern: RegExp; replacement: string; message: string }> = [
    {
      pattern: /<\/?\s*(?:style|script)(?:[^>]*>|[^>]*$)/gi,
      replacement: '',
      message: 'Stripped HTML style/script tag markup.',
    },
    {
      pattern: /@(?:import|charset|namespace)\b[^;]*(?:;|$)/gi,
      replacement: '',
      message: 'Stripped @import/@charset/@namespace directive.',
    },
    {
      pattern: /expression\s*\([^{};]*\)/gi,
      replacement: 'none',
      message: 'Stripped CSS expression() call.',
    },
    {
      pattern: /url\s*\(\s*(?:(['"])\s*(?:[a-z][a-z0-9+.-]*:|\/\/|\\\\|[^\n\r'"]*\\)[\s\S]*?\1|(?:\s*(?:[a-z][a-z0-9+.-]*:|\/\/|\\\\|[^\n\r);]*\\)[^);]*))\s*\)/gi,
      replacement: 'none',
      message: 'Stripped external or protocol url() reference.',
    },
    {
      pattern: /(^|[;\s{])(?:behavior|-moz-binding)\s*:[^;]*(?:;|$)/gi,
      replacement: '$1',
      message: 'Stripped unsafe behavior/-moz-binding property.',
    },
    {
      pattern: /(?:javascript|vbscript)\s*:/gi,
      replacement: '',
      message: 'Stripped script protocol string.',
    },
  ];

  let iterations = 0;
  let changed = true;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;
    for (const rule of rules) {
      const nextCss = css.replace(rule.pattern, rule.replacement);
      if (nextCss !== css) {
        css = nextCss;
        if (!warnings.includes(rule.message)) {
          warnings.push(rule.message);
        }
        changed = true;
      }
    }
  }

  return { css: css.trim(), warnings };
}

function isPlainRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function hasOwnProp<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return isPlainRecord(obj) && Object.prototype.hasOwnProperty.call(obj, key);
}

function sanitizeToolbarItems(raw: unknown, fallback: ToolbarSlotItem[]): ToolbarSlotItem[] {
  if (!Array.isArray(raw)) return fallback;
  const seenIds = new Set<string>();
  const result: ToolbarSlotItem[] = [];
  for (let i = 0; i < raw.length && result.length < 40; i++) {
    const entry = raw[i];
    if (!isPlainRecord(entry)) continue;
    if (!hasOwnProp(entry, 'kind')) continue;
    const kind = entry.kind as ToolbarItemKind;
    if (!ALLOWED_TOOLBAR_KINDS.includes(kind)) continue;
    const rawId =
      hasOwnProp(entry, 'id') && typeof entry.id === 'string' && SAFE_SLOT_ID_RE.test(entry.id)
        ? entry.id
        : `slot-${kind}-${i}`;
    if (seenIds.has(rawId)) continue;
    seenIds.add(rawId);
    result.push({
      id: rawId,
      kind,
      visible: hasOwnProp(entry, 'visible') && typeof entry.visible === 'boolean' ? entry.visible : true,
    });
  }
  return result.length > 0 ? result : fallback;
}

function sanitizeSurfaceZone(raw: unknown): SurfaceZoneStyle | undefined {
  if (!isPlainRecord(raw)) return undefined;
  const zone: SurfaceZoneStyle = {};
  if (hasOwnProp(raw, 'bg') && isSafeSurfaceColor(raw.bg)) zone.bg = raw.bg.trim();
  if (hasOwnProp(raw, 'textColor') && isSafeSurfaceColor(raw.textColor)) zone.textColor = raw.textColor.trim();
  if (hasOwnProp(raw, 'mutedColor') && isSafeSurfaceColor(raw.mutedColor)) zone.mutedColor = raw.mutedColor.trim();
  if (hasOwnProp(raw, 'borderColor') && isSafeSurfaceColor(raw.borderColor)) zone.borderColor = raw.borderColor.trim();
  if (hasOwnProp(raw, 'opacity') && typeof raw.opacity === 'number') zone.opacity = clampNumber(raw.opacity, 0.2, 1, 1);
  if (hasOwnProp(raw, 'blur') && typeof raw.blur === 'number') zone.blur = Math.round(clampNumber(raw.blur, 0, 32, 0));
  if (hasOwnProp(raw, 'borderWidth') && typeof raw.borderWidth === 'number') {
    zone.borderWidth = Math.round(clampNumber(raw.borderWidth, 0, 2, 1));
  }
  if (hasOwnProp(raw, 'radius') && typeof raw.radius === 'number') {
    zone.radius = Math.round(clampNumber(raw.radius, 0, 24, 10));
  }
  if (
    hasOwnProp(raw, 'shadow') &&
    typeof raw.shadow === 'string' &&
    ['none', 'soft', 'elevated', 'glow'].includes(raw.shadow)
  ) {
    zone.shadow = raw.shadow as SurfaceZoneStyle['shadow'];
  }
  return Object.keys(zone).length > 0 ? zone : undefined;
}

function sanitizeNewTabLayout(raw: unknown, fallback: NewTabLayoutConfig): NewTabLayoutConfig {
  if (!isPlainRecord(raw)) return fallback;
  const clockRaw = hasOwnProp(raw, 'clock') && isPlainRecord(raw.clock) ? raw.clock : {};
  const greetingRaw = hasOwnProp(raw, 'greeting') && isPlainRecord(raw.greeting) ? raw.greeting : {};
  const searchRaw = hasOwnProp(raw, 'searchBox') && isPlainRecord(raw.searchBox) ? raw.searchBox : {};
  const shortcutsRaw = hasOwnProp(raw, 'shortcuts') && isPlainRecord(raw.shortcuts) ? raw.shortcuts : {};
  const tasksRaw = hasOwnProp(raw, 'tasksWidget') && isPlainRecord(raw.tasksWidget) ? raw.tasksWidget : {};

  return {
    clock: {
      visible: typeof clockRaw.visible === 'boolean' ? clockRaw.visible : fallback.clock.visible,
      format: clockRaw.format === '12h' || clockRaw.format === '24h' ? clockRaw.format : fallback.clock.format,
      style:
        typeof clockRaw.style === 'string' && ['minimal', 'editorial', 'mono', 'pill'].includes(clockRaw.style)
          ? (clockRaw.style as NewTabLayoutConfig['clock']['style'])
          : fallback.clock.style,
      align: clockRaw.align === 'left' || clockRaw.align === 'center' ? clockRaw.align : fallback.clock.align,
    },
    greeting: {
      visible: typeof greetingRaw.visible === 'boolean' ? greetingRaw.visible : fallback.greeting.visible,
      customText:
        typeof greetingRaw.customText === 'string'
          ? greetingRaw.customText.slice(0, 80)
          : fallback.greeting.customText,
    },
    searchBox: {
      visible: typeof searchRaw.visible === 'boolean' ? searchRaw.visible : fallback.searchBox.visible,
      style:
        typeof searchRaw.style === 'string' && ['glass', 'solid', 'minimal', 'pill'].includes(searchRaw.style)
          ? (searchRaw.style as NewTabLayoutConfig['searchBox']['style'])
          : fallback.searchBox.style,
      width:
        typeof searchRaw.width === 'string' && ['narrow', 'medium', 'wide'].includes(searchRaw.width)
          ? (searchRaw.width as NewTabLayoutConfig['searchBox']['width'])
          : fallback.searchBox.width,
    },
    shortcuts: {
      visible: typeof shortcutsRaw.visible === 'boolean' ? shortcutsRaw.visible : fallback.shortcuts.visible,
      columns: Math.round(
        clampNumber(shortcutsRaw.columns, 4, 8, fallback.shortcuts.columns)
      ) as 4 | 5 | 6 | 7 | 8,
      cardStyle:
        typeof shortcutsRaw.cardStyle === 'string' &&
        ['tile', 'pill', 'icon-only', 'compact'].includes(shortcutsRaw.cardStyle)
          ? (shortcutsRaw.cardStyle as NewTabLayoutConfig['shortcuts']['cardStyle'])
          : fallback.shortcuts.cardStyle,
    },
    tasksWidget: {
      visible: typeof tasksRaw.visible === 'boolean' ? tasksRaw.visible : fallback.tasksWidget.visible,
      placement:
        typeof tasksRaw.placement === 'string' &&
        ['bottom', 'left', 'right', 'floating'].includes(tasksRaw.placement)
          ? (tasksRaw.placement as NewTabLayoutConfig['tasksWidget']['placement'])
          : fallback.tasksWidget.placement,
    },
  };
}

export function sanitizeDesignProfile(input: unknown, baseProfile?: BrowserDesignProfile): BrowserDesignProfile {
  const base = baseProfile
    ? (JSON.parse(JSON.stringify(baseProfile)) as BrowserDesignProfile)
    : createDefaultDesignProfile();
  if (!isPlainRecord(input)) return base;

  const metaRaw = hasOwnProp(input, 'meta') && isPlainRecord(input.meta) ? input.meta : {};
  const layoutRaw = hasOwnProp(input, 'layout') && isPlainRecord(input.layout) ? input.layout : {};
  const secRaw =
    hasOwnProp(layoutRaw, 'sidebarSections') && isPlainRecord(layoutRaw.sidebarSections)
      ? layoutRaw.sidebarSections
      : {};
  const surfacesRaw = hasOwnProp(input, 'surfaces') && isPlainRecord(input.surfaces) ? input.surfaces : {};
  const typoRaw = hasOwnProp(input, 'typography') && isPlainRecord(input.typography) ? input.typography : {};
  const effectsRaw = hasOwnProp(input, 'effects') && isPlainRecord(input.effects) ? input.effects : {};
  const cssRaw = hasOwnProp(input, 'customCss') && isPlainRecord(input.customCss) ? input.customCss : {};

  const surfaces: Partial<Record<SurfaceZoneId, SurfaceZoneStyle>> = {};
  for (const zoneId of SURFACE_ZONE_IDS) {
    if (hasOwnProp(surfacesRaw, zoneId)) {
      const sanitizedZone = sanitizeSurfaceZone(surfacesRaw[zoneId]);
      if (sanitizedZone) surfaces[zoneId] = sanitizedZone;
    }
  }

  const rawCssString = hasOwnProp(cssRaw, 'css') && typeof cssRaw.css === 'string' ? cssRaw.css : base.customCss.css;
  const sanitizedCss = sanitizeCustomCss(rawCssString);

  return {
    meta: {
      version: 1,
      name:
        typeof metaRaw.name === 'string' && metaRaw.name.trim()
          ? metaRaw.name.trim().slice(0, 64)
          : base.meta.name,
      author: typeof metaRaw.author === 'string' ? metaRaw.author.trim().slice(0, 64) : base.meta.author,
      baseTemplateId:
        typeof metaRaw.baseTemplateId === 'string'
          ? metaRaw.baseTemplateId.slice(0, 48)
          : base.meta.baseTemplateId,
    },
    layout: {
      chromeMode:
        typeof layoutRaw.chromeMode === 'string' &&
        ['classic-top', 'compact-single-row', 'vertical-left', 'vertical-right'].includes(layoutRaw.chromeMode)
          ? (layoutRaw.chromeMode as ChromeMode)
          : base.layout.chromeMode,
      tabBarPosition:
        layoutRaw.tabBarPosition === 'above-toolbar' || layoutRaw.tabBarPosition === 'below-toolbar'
          ? (layoutRaw.tabBarPosition as TabBarPosition)
          : base.layout.tabBarPosition,
      sidebarWidth: Math.round(clampNumber(layoutRaw.sidebarWidth, 200, 360, base.layout.sidebarWidth)),
      sidebarCollapsedShowRail:
        typeof layoutRaw.sidebarCollapsedShowRail === 'boolean'
          ? layoutRaw.sidebarCollapsedShowRail
          : base.layout.sidebarCollapsedShowRail,
      sidebarSections: {
        favorites:
          typeof secRaw.favorites === 'boolean' ? secRaw.favorites : base.layout.sidebarSections.favorites,
        pinned: typeof secRaw.pinned === 'boolean' ? secRaw.pinned : base.layout.sidebarSections.pinned,
        folders: typeof secRaw.folders === 'boolean' ? secRaw.folders : base.layout.sidebarSections.folders,
        workspaces:
          typeof secRaw.workspaces === 'boolean' ? secRaw.workspaces : base.layout.sidebarSections.workspaces,
        dockFooter:
          typeof secRaw.dockFooter === 'boolean' ? secRaw.dockFooter : base.layout.sidebarSections.dockFooter,
      },
      toolbarItems: sanitizeToolbarItems(layoutRaw.toolbarItems, base.layout.toolbarItems),
      toolbarShowLabels:
        typeof layoutRaw.toolbarShowLabels === 'boolean'
          ? layoutRaw.toolbarShowLabels
          : base.layout.toolbarShowLabels,
      omniboxMaxWidth:
        typeof layoutRaw.omniboxMaxWidth === 'string' &&
        ['compact', 'balanced', 'full'].includes(layoutRaw.omniboxMaxWidth)
          ? (layoutRaw.omniboxMaxWidth as BrowserDesignProfile['layout']['omniboxMaxWidth'])
          : base.layout.omniboxMaxWidth,
    },
    surfaces,
    typography: {
      fontFamily:
        typeof typoRaw.fontFamily === 'string' &&
        ['system', 'inter', 'geist', 'mono', 'serif', 'rounded'].includes(typoRaw.fontFamily)
          ? (typoRaw.fontFamily as UiFontFamily)
          : base.typography.fontFamily,
      uiScale: Number(clampNumber(typoRaw.uiScale, 0.85, 1.25, base.typography.uiScale).toFixed(2)),
      iconScale: Number(clampNumber(typoRaw.iconScale, 0.85, 1.25, base.typography.iconScale).toFixed(2)),
    },
    density:
      typeof input.density === 'string' && ['compact', 'normal', 'comfortable'].includes(input.density)
        ? (input.density as UiDensity)
        : base.density,
    effects: {
      windowMaterial:
        effectsRaw.windowMaterial === 'glass-vibrancy' || effectsRaw.windowMaterial === 'opaque'
          ? (effectsRaw.windowMaterial as WindowMaterial)
          : base.effects.windowMaterial,
      reduceChromeMotion:
        typeof effectsRaw.reduceChromeMotion === 'boolean'
          ? effectsRaw.reduceChromeMotion
          : base.effects.reduceChromeMotion,
    },
    newTabLayout: sanitizeNewTabLayout(input.newTabLayout, base.newTabLayout),
    customCss: {
      enabled: typeof cssRaw.enabled === 'boolean' ? cssRaw.enabled : base.customCss.enabled,
      css: sanitizedCss.css,
    },
  };
}

export function sanitizePartialDesignProfile(input: unknown): PartialBrowserDesignProfile {
  if (!isPlainRecord(input)) return {};
  const out: PartialBrowserDesignProfile = {};

  if (hasOwnProp(input, 'meta') && isPlainRecord(input.meta)) {
    const meta: PartialBrowserDesignProfile['meta'] = {};
    if (typeof input.meta.name === 'string' && input.meta.name.trim()) {
      meta.name = input.meta.name.trim().slice(0, 64);
    }
    if (typeof input.meta.author === 'string') {
      meta.author = input.meta.author.trim().slice(0, 64);
    }
    if (typeof input.meta.baseTemplateId === 'string') {
      meta.baseTemplateId = input.meta.baseTemplateId.slice(0, 48);
    }
    if (Object.keys(meta).length > 0) out.meta = meta;
  }

  if (hasOwnProp(input, 'layout') && isPlainRecord(input.layout)) {
    const l = input.layout;
    const layout: NonNullable<PartialBrowserDesignProfile['layout']> = {};
    if (
      typeof l.chromeMode === 'string' &&
      ['classic-top', 'compact-single-row', 'vertical-left', 'vertical-right'].includes(l.chromeMode)
    ) {
      layout.chromeMode = l.chromeMode as ChromeMode;
    }
    if (l.tabBarPosition === 'above-toolbar' || l.tabBarPosition === 'below-toolbar') {
      layout.tabBarPosition = l.tabBarPosition as TabBarPosition;
    }
    if (typeof l.sidebarWidth === 'number') {
      layout.sidebarWidth = Math.round(clampNumber(l.sidebarWidth, 200, 360, 250));
    }
    if (typeof l.sidebarCollapsedShowRail === 'boolean') {
      layout.sidebarCollapsedShowRail = l.sidebarCollapsedShowRail;
    }
    if (hasOwnProp(l, 'sidebarSections') && isPlainRecord(l.sidebarSections)) {
      const s = l.sidebarSections;
      const sections: NonNullable<NonNullable<PartialBrowserDesignProfile['layout']>['sidebarSections']> = {};
      if (typeof s.favorites === 'boolean') sections.favorites = s.favorites;
      if (typeof s.pinned === 'boolean') sections.pinned = s.pinned;
      if (typeof s.folders === 'boolean') sections.folders = s.folders;
      if (typeof s.workspaces === 'boolean') sections.workspaces = s.workspaces;
      if (typeof s.dockFooter === 'boolean') sections.dockFooter = s.dockFooter;
      if (Object.keys(sections).length > 0) layout.sidebarSections = sections;
    }
    if (Array.isArray(l.toolbarItems)) {
      const items = sanitizeToolbarItems(l.toolbarItems, []);
      if (items.length > 0) layout.toolbarItems = items;
    }
    if (typeof l.toolbarShowLabels === 'boolean') {
      layout.toolbarShowLabels = l.toolbarShowLabels;
    }
    if (
      typeof l.omniboxMaxWidth === 'string' &&
      ['compact', 'balanced', 'full'].includes(l.omniboxMaxWidth)
    ) {
      layout.omniboxMaxWidth = l.omniboxMaxWidth as BrowserDesignProfile['layout']['omniboxMaxWidth'];
    }
    if (Object.keys(layout).length > 0) out.layout = layout;
  }

  if (hasOwnProp(input, 'surfaces') && isPlainRecord(input.surfaces)) {
    const surfaces: Partial<Record<SurfaceZoneId, SurfaceZoneStyle>> = {};
    for (const zoneId of SURFACE_ZONE_IDS) {
      if (hasOwnProp(input.surfaces, zoneId)) {
        const z = sanitizeSurfaceZone(input.surfaces[zoneId]);
        if (z) surfaces[zoneId] = z;
      }
    }
    if (Object.keys(surfaces).length > 0) out.surfaces = surfaces;
  }

  if (hasOwnProp(input, 'typography') && isPlainRecord(input.typography)) {
    const t = input.typography;
    const typography: NonNullable<PartialBrowserDesignProfile['typography']> = {};
    if (
      typeof t.fontFamily === 'string' &&
      ['system', 'inter', 'geist', 'mono', 'serif', 'rounded'].includes(t.fontFamily)
    ) {
      typography.fontFamily = t.fontFamily as UiFontFamily;
    }
    if (typeof t.uiScale === 'number') {
      typography.uiScale = Number(clampNumber(t.uiScale, 0.85, 1.25, 1).toFixed(2));
    }
    if (typeof t.iconScale === 'number') {
      typography.iconScale = Number(clampNumber(t.iconScale, 0.85, 1.25, 1).toFixed(2));
    }
    if (Object.keys(typography).length > 0) out.typography = typography;
  }

  if (
    hasOwnProp(input, 'density') &&
    typeof input.density === 'string' &&
    ['compact', 'normal', 'comfortable'].includes(input.density)
  ) {
    out.density = input.density as UiDensity;
  }

  if (hasOwnProp(input, 'effects') && isPlainRecord(input.effects)) {
    const effects: NonNullable<PartialBrowserDesignProfile['effects']> = {};
    if (input.effects.windowMaterial === 'glass-vibrancy' || input.effects.windowMaterial === 'opaque') {
      effects.windowMaterial = input.effects.windowMaterial as WindowMaterial;
    }
    if (typeof input.effects.reduceChromeMotion === 'boolean') {
      effects.reduceChromeMotion = input.effects.reduceChromeMotion;
    }
    if (Object.keys(effects).length > 0) out.effects = effects;
  }

  if (hasOwnProp(input, 'newTabLayout') && isPlainRecord(input.newTabLayout)) {
    const nt = input.newTabLayout;
    const newTab: NonNullable<PartialBrowserDesignProfile['newTabLayout']> = {};

    if (hasOwnProp(nt, 'clock') && isPlainRecord(nt.clock)) {
      const c: Partial<NewTabLayoutConfig['clock']> = {};
      if (typeof nt.clock.visible === 'boolean') c.visible = nt.clock.visible;
      if (nt.clock.format === '12h' || nt.clock.format === '24h') c.format = nt.clock.format;
      if (
        typeof nt.clock.style === 'string' &&
        ['minimal', 'editorial', 'mono', 'pill'].includes(nt.clock.style)
      ) {
        c.style = nt.clock.style as NewTabLayoutConfig['clock']['style'];
      }
      if (nt.clock.align === 'left' || nt.clock.align === 'center') c.align = nt.clock.align;
      if (Object.keys(c).length > 0) newTab.clock = c;
    }

    if (hasOwnProp(nt, 'greeting') && isPlainRecord(nt.greeting)) {
      const g: Partial<NewTabLayoutConfig['greeting']> = {};
      if (typeof nt.greeting.visible === 'boolean') g.visible = nt.greeting.visible;
      if (typeof nt.greeting.customText === 'string') g.customText = nt.greeting.customText.slice(0, 80);
      if (Object.keys(g).length > 0) newTab.greeting = g;
    }

    if (hasOwnProp(nt, 'searchBox') && isPlainRecord(nt.searchBox)) {
      const sb: Partial<NewTabLayoutConfig['searchBox']> = {};
      if (typeof nt.searchBox.visible === 'boolean') sb.visible = nt.searchBox.visible;
      if (
        typeof nt.searchBox.style === 'string' &&
        ['glass', 'solid', 'minimal', 'pill'].includes(nt.searchBox.style)
      ) {
        sb.style = nt.searchBox.style as NewTabLayoutConfig['searchBox']['style'];
      }
      if (
        typeof nt.searchBox.width === 'string' &&
        ['narrow', 'medium', 'wide'].includes(nt.searchBox.width)
      ) {
        sb.width = nt.searchBox.width as NewTabLayoutConfig['searchBox']['width'];
      }
      if (Object.keys(sb).length > 0) newTab.searchBox = sb;
    }

    if (hasOwnProp(nt, 'shortcuts') && isPlainRecord(nt.shortcuts)) {
      const sc: Partial<NewTabLayoutConfig['shortcuts']> = {};
      if (typeof nt.shortcuts.visible === 'boolean') sc.visible = nt.shortcuts.visible;
      if (typeof nt.shortcuts.columns === 'number') {
        sc.columns = Math.round(clampNumber(nt.shortcuts.columns, 4, 8, 6)) as 4 | 5 | 6 | 7 | 8;
      }
      if (
        typeof nt.shortcuts.cardStyle === 'string' &&
        ['tile', 'pill', 'icon-only', 'compact'].includes(nt.shortcuts.cardStyle)
      ) {
        sc.cardStyle = nt.shortcuts.cardStyle as NewTabLayoutConfig['shortcuts']['cardStyle'];
      }
      if (Object.keys(sc).length > 0) newTab.shortcuts = sc;
    }

    if (hasOwnProp(nt, 'tasksWidget') && isPlainRecord(nt.tasksWidget)) {
      const tw: Partial<NewTabLayoutConfig['tasksWidget']> = {};
      if (typeof nt.tasksWidget.visible === 'boolean') tw.visible = nt.tasksWidget.visible;
      if (
        typeof nt.tasksWidget.placement === 'string' &&
        ['bottom', 'left', 'right', 'floating'].includes(nt.tasksWidget.placement)
      ) {
        tw.placement = nt.tasksWidget.placement as NewTabLayoutConfig['tasksWidget']['placement'];
      }
      if (Object.keys(tw).length > 0) newTab.tasksWidget = tw;
    }

    if (Object.keys(newTab).length > 0) out.newTabLayout = newTab;
  }

  if (hasOwnProp(input, 'customCss') && isPlainRecord(input.customCss)) {
    const customCss: Partial<BrowserDesignProfile['customCss']> = {};
    if (typeof input.customCss.enabled === 'boolean') customCss.enabled = input.customCss.enabled;
    if (typeof input.customCss.css === 'string') {
      customCss.css = sanitizeCustomCss(input.customCss.css).css;
    }
    if (Object.keys(customCss).length > 0) out.customCss = customCss;
  }

  return out;
}

export function exportThemePack(profile: BrowserDesignProfile): string {
  const safe = sanitizeDesignProfile(profile);
  const doc: ThemePackDocument = {
    format: 'nova-theme-pack',
    schemaVersion: 1,
    exportedAt: Date.now(),
    profile: safe,
  };
  return JSON.stringify(doc, null, 2);
}

export function importThemePack(
  rawJson: string
): { ok: true; profile: BrowserDesignProfile } | { ok: false; error: string } {
  if (typeof rawJson !== 'string' || !rawJson.trim()) {
    return { ok: false, error: 'Empty theme pack data.' };
  }
  if (rawJson.length > MAX_THEME_PACK_BYTES) {
    return { ok: false, error: 'Theme pack file exceeds 128 KB limit.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: 'Invalid JSON syntax in theme pack.' };
  }
  if (
    !isPlainRecord(parsed) ||
    !hasOwnProp(parsed, 'format') ||
    parsed.format !== 'nova-theme-pack' ||
    !hasOwnProp(parsed, 'schemaVersion') ||
    parsed.schemaVersion !== 1 ||
    !hasOwnProp(parsed, 'profile') ||
    !isPlainRecord(parsed.profile)
  ) {
    return { ok: false, error: 'Unsupported or malformed Nova theme pack header.' };
  }
  return { ok: true, profile: sanitizeDesignProfile(parsed.profile) };
}
