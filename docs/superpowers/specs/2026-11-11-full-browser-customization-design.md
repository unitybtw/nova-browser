# Design Spec: Full Modular Browser Customization & Live Design Studio

**Date:** 2026-11-11  
**Status:** Approved for Implementation Planning  
**Target Area:** Theme Engine, Layout Shell, TopBar, SidebarTabs, SidePanel, NewTabPage, Electron Window Material, Live Customize Mode, Settings & E2EE Sync

---

## 1. Problem Statement & Goals

Nova Browser currently provides basic visual settings (`theme`, `accentColor`, 8 derived `browserColor` presets, `tabStyle`, `useVerticalTabs`, `newTabBackground`, and webview-only `fontSize` zoom). Several core chrome areas remain hardcoded:
- `.nova-vertical-sidebar` in `src/index.css` overrides theme tokens with static olive/sage colors and fixes sidebar width at `250px`.
- `TopBar.tsx`, `SidebarTabs.tsx`, `SidePanel.tsx`, and `NewTabPage.tsx` still mix hardcoded Tailwind `slate`, `cyan`, and `blue` utility classes with `--nova-*` CSS custom properties.
- Toolbar items cannot be reordered, hidden, removed, or separated with spacers/dividers.
- Chrome shell structure cannot switch to compact single-row or right-aligned vertical sidebar layouts.
- Users have no way to customize individual chrome surface zones (colors, opacity, blur, borders, corner radius), UI typography/density, New Tab widgets, or export/share complete designs with others.

### Primary Goals
1. **Modular Layout & Controls**: Allow users to reorder, hide (`visible: false`), remove (to a palette), re-add, and space out (`spacer`, `divider`) toolbar items directly on the browser UI.
2. **Architectural Shell Flexibility**: Support `classic-top` (tab bar above or below toolbar), `compact-single-row` (single unified bar), `vertical-left`, and `vertical-right`, plus resizable sidebar width (`200–360px`) and toggleable sidebar sections.
3. **Per-Zone Surface & Typography Engine**: Independent surface styling across 9 semantic chrome zones (`frame`, `tabBar`, `activeTab`, `inactiveTab`, `toolbar`, `omnibox`, `sidebar`, `aiPanel`, `popovers`), UI font family/scale, icon scale, density, shadows, and native OS window vibrancy (`opaque` / `glass-vibrancy`).
4. **Modular New Tab Page**: Configure clock style/format/alignment/visibility, greeting text/visibility, search box appearance/width/visibility, shortcut columns (`4–8`) and card style, and tasks widget visibility/placement.
5. **Live Customize Mode UX**: Real-time draft editing directly on the live browser UI with a docked/floating 5-tab `DesignStudioDrawer`, instant Commit/Discard/Reset controls, and `<webview>` drag isolation.
6. **Design Ecosystem & Scope**: Starter architectural templates, shareable `.novatheme.json` import/export, sanitized Custom CSS editor, global default profile with optional per-Workspace design overrides, E2EE sync compatibility, and safe emergency recovery.

---

## 2. Data Model & Persistence (`src/types/browser.ts`)

### 2.1 Core Types
Extend `src/types/browser.ts` while preserving every existing `UserSettings` property for full backwards compatibility (`fontSize` continues controlling `BrowserView` web page zoom).

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
  id: string;           // unique instance id (allows multiple spacers/dividers)
  kind: ToolbarItemKind;
  visible: boolean;     // hidden in normal mode, shown dimmed in Customize Mode
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
  bg?: string;           // hex color, rgba(), safe linear-gradient(), or 'inherit'
  textColor?: string;    // hex color or 'inherit'
  mutedColor?: string;   // hex color or 'inherit'
  opacity?: number;      // 0.20 .. 1.00
  blur?: number;         // 0 .. 32 px
  borderColor?: string;  // hex/rgba or 'inherit'
  borderWidth?: number;  // 0 .. 2 px
  radius?: number;       // 0 .. 24 px
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
    sidebarWidth: number; // clamped 200..360
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
    uiScale: number;   // clamped 0.85..1.25
    iconScale: number; // clamped 0.85..1.25
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
```

### 2.2 Integration with `UserSettings` & Workspaces
- Add two keys to `UserSettings` and `defaultSettings`:
  - `designProfile?: BrowserDesignProfile` (populated in `defaultSettings` via `DEFAULT_DESIGN_PROFILE`)
  - `workspaceDesigns?: Record<string, Partial<BrowserDesignProfile>>` (optional per-workspace overrides keyed by `Workspace.id`)
- Add sync-clean helper: when a `Workspace` is permanently deleted or tombstoned, clean up stale entries in `workspaceDesigns` lazily or on workspace deletion.
- Keep `useVerticalTabs`, `showTasksWidget`, `browserColor`, `accentColor`, `tabStyle`, `tabAnimation` synchronized cleanly:
  - Toggling legacy `useVerticalTabs` or `showTasksWidget` in Settings/shortcuts updates the corresponding `designProfile` setting seamlessly (and vice-versa) so existing keyboard shortcuts (`toggleSidebar`) and Settings toggles continue to behave predictably.
- **Persistence & Sync**:
  - `defaultSettings` ownership ensures `syncService.ts` (`mergeSettingsLastWriteWins` & `stampPersistedSettings`) syncs both `designProfile` and `workspaceDesigns` cleanly via E2EE without code changes to crypto/vault logic.
  - `useAppDataBackup.ts` validates imported `designProfile` and `workspaceDesigns` through the unified strict sanitizer before merging into state.

---

## 3. Resolution, Token Engine & Component Refactor

### 3.1 Effective Design Resolver (`src/utils/designEngine.ts`)
- `resolveEffectiveDesign(settings: UserSettings, activeWorkspaceId?: string, isIncognito?: boolean): ResolvedBrowserDesign`
  1. Starts from `DEFAULT_DESIGN_PROFILE`.
  2. Derives base surface palette from `settings.theme`, `settings.browserColor`, `settings.customBrowserColor`, `settings.accentColor`, `settings.customAccentColor`.
  3. Deep-merges `settings.designProfile` (clamping all numbers and stripping invalid fields).
  4. If `activeWorkspaceId` has an entry in `settings.workspaceDesigns`, deep-merges that workspace override on top.
  5. If `isIncognito` is true, forces privacy-distinguishing incognito frame/surface dark chrome protection while preserving structural layout (`chromeMode`, `toolbarItems`, typography, density).

### 3.2 CSS Custom Property Engine (`src/hooks/useThemeLanguage.ts` & `src/index.css`)
- **Expanded CSS Tokens**: `useThemeLanguage.ts` computes resolved zone styles for light and dark contexts and injects into `#nova-accent-style` and `document.documentElement.style`:
  - Zone variables for each of the 9 `SurfaceZoneId` zones: `--nova-<zone>-bg`, `--nova-<zone>-text`, `--nova-<zone>-muted`, `--nova-<zone>-border`, `--nova-<zone>-border-width`, `--nova-<zone>-blur`, `--nova-<zone>-radius`, `--nova-<zone>-shadow`.
  - Global chrome typography & layout variables: `--nova-font-ui`, `--nova-ui-scale`, `--nova-icon-scale`, `--nova-density-pad-y`, `--nova-density-pad-x`, `--nova-toolbar-height`, `--nova-tab-height`, `--nova-sidebar-width`.
- **`.nova-vertical-sidebar` Unification (`src/index.css`)**: Replace hardcoded olive/sage `--sidebar-*` hex values (`#eeefe9`, `#262823`, etc.) with references to `--nova-sidebar-bg`, `--nova-sidebar-text`, `--nova-sidebar-muted`, `--nova-sidebar-border`, `--nova-active-tab-bg`, `--nova-inactive-tab-hover-bg`, `--nova-accent`.
- **Hardcoded Class Cleanup**: Audit and migrate fixed `cyan-*`, `blue-*`, `slate-*`, and static `rounded-*` utility styling on chrome surfaces in:
  - `src/components/TopBar.tsx`
  - `src/components/topbar/OmniboxBar.tsx`
  - `src/components/SidebarTabs.tsx`
  - `src/components/SidePanel.tsx`
  - `src/components/NewTabPage.tsx`
  So active tab indicators, AI toggles, focus rings, popovers, and cards respond faithfully to custom accent/surface/radius choices.
- **Sanitized Custom CSS Element**: A dedicated `<style id="nova-custom-user-style">` mounted immediately after `#nova-accent-style`, updated only with the sanitized CSS string (`customCss.enabled ? sanitizeCustomCss(customCss.css).css : ''`). Webviews do not inherit host document stylesheets, preserving complete isolation from web page DOMs.

---

## 4. Security & Validation (`src/utils/designSecurity.ts`)

### 4.1 `.novatheme.json` Theme Pack Schema & Sanitizer
- File format:
  ```json
  {
    "format": "nova-theme-pack",
    "schemaVersion": 1,
    "exportedAt": 1794412800000,
    "profile": { ... }
  }
  ```
- Export strips sensitive/irrelevant user data (history, bookmarks, URLs, credentials, sync ids).
- Import runs `sanitizeDesignProfile(input)`:
  - Rejects non-objects, arrays, oversized payloads (`> 128 KB`).
  - Strips `__proto__`, `constructor`, `prototype` keys recursively.
  - Validates color values (hex `#RGB`/`#RGBA`/`#RRGGBB`/`#RRGGBBAA`, `rgb(...)`, `rgba(...)`, `'inherit'`, or safe CSS `linear-gradient(...)` / `radial-gradient(...)` without `url()`).
  - Validates every `ToolbarItemKind` against an explicit allowlist and deduplicates invalid slot ids.
  - Clamps numerical ranges (`opacity: 0.2..1`, `blur: 0..32`, `radius: 0..24`, `borderWidth: 0..2`, `sidebarWidth: 200..360`, `uiScale: 0.85..1.25`, `iconScale: 0.85..1.25`, `columns: 4..8`).
  - Runs `sanitizeCustomCss()` on `customCss.css`.

### 4.2 Custom CSS Sanitizer (`sanitizeCustomCss`)
Strict regex/token sanitization preserving CSP parity (`script-src 'self' 'wasm-unsafe-eval'`):
- Blocks and reports warnings for:
  - `@import`, `@charset`, `@namespace`
  - `expression(...)`, `javascript:`, `vbscript:`, `-moz-binding`, `behavior:`
  - Any `url(...)` value referencing external protocols or data payloads (`url(http...)`, `url(https...)`, `url(file:...)`, `url(//...)`, `url(data:...)`) to prevent CSS-based network exfiltration probes.
  - Unbalanced HTML tag sequences (`</style`, `<script`) to avoid markup breakouts.
- Length capped at `32_768` characters.

### 4.3 Lockout Prevention & Emergency Recovery
- Always-available keyboard shortcut: `Shift+CmdOrCtrl+0` (`Shift+CmdOrCtrl+0`, chosen to avoid Windows/Linux `AltGr` conflicts per `src/utils/keyboardShortcuts.ts`) triggers a confirmation prompt (or immediate safe reset if Customize Mode is stuck) to restore `DEFAULT_DESIGN_PROFILE` and clear `customCss.enabled`.
- Native Electron View menu entries: `"Customize Browser..."` (`Shift+CmdOrCtrl+E`) and `"Reset Appearance to Default"` (`Shift+CmdOrCtrl+0`) so recovery never depends on visible DOM buttons.

---

## 5. Electron Window Material & IPC (`electron/main.ts`, `electron/preload.ts`)

- Expose `setWindowMaterial(material: 'opaque' | 'glass-vibrancy')` in `electron/preload.ts` -> sends IPC `'set-window-material'`.
- In `electron/main.ts`:
  - Guarded with `isTrustedSender(event)`.
  - On macOS (`darwin`): calls `mainWindow.setVibrancy('under-window')` and transparent background `#00000000` when `'glass-vibrancy'`; clears vibrancy (`null`) and restores theme backgroundColor when `'opaque'`.
  - On Windows (`win32`): attempts `mainWindow.setBackgroundMaterial('acrylic')` / `'none'` inside a `try/catch` (for pre-Win11 compatibility), while updating `setTitleBarOverlay` colors smoothly.
  - Registers Electron `View` menu shortcuts and sends `'toggle-customize-mode'` and `'reset-appearance-default'` events to trusted main window webContents.

---

## 6. Modular Shell, Toolbar Registry & Live Customize Mode UX

### 6.1 Modular Toolbar Item Registry (`src/components/customization/toolbarRegistry.tsx`)
- Replaces static button layout in `TopBar.tsx` with a registry mapping every `ToolbarItemKind` to metadata (`id`, `label`, `category`, `supportsCompact`, `isCritical`) and a renderer factory.
- Supports arbitrary ordering around `omnibox` (left, center, right), multiple independent `spacer` (`flex-1 min-w-4`) and `divider` (`w-px h-4`) instances, visibility toggling (`visible: false`), and removal to the Studio Palette.
- `Compact Single Row` mode merges visible tabs, compact omnibox, and selected toolbar actions into one `44px–50px` bar while preserving macOS `88px` traffic lights drag region and Windows `140px` caption controls drag spacer.

### 6.2 Shell Positioning & Resizable Sidebar (`src/App.tsx`, `src/components/SidebarTabs.tsx`)
- `App.tsx` renders according to `effectiveDesign.layout`:
  - `classic-top` (`tabBarPosition: 'above-toolbar'` default, or `'below-toolbar'` swaps Row 1 & Row 2 in `TopBar.tsx`)
  - `compact-single-row`
  - `vertical-left` (sidebar on left, drag-resizable right border `200–360px`)
  - `vertical-right` (sidebar on right, drag-resizable left border `200–360px`, top drag spacer preserved when `isMac`)
- `SidebarTabs.tsx` reads `sidebarWidth` and `sidebarSections` (`favorites`, `pinned`, `folders`, `workspaces`, `dockFooter`) to toggle each block cleanly, and exposes subtle Customize Mode overlays for toggling sections directly.

### 6.3 New Tab Modular Layout (`src/components/NewTabPage.tsx`)
- Consumes `effectiveDesign.newTabLayout`:
  - `Clock`: toggles visibility, 12h/24h, style (`minimal`, `editorial`, `mono`, `pill`), and alignment (`center`, `left`).
  - `Greeting`: toggles visibility or displays user-defined `customText`.
  - `SearchBox`: toggles visibility, style (`glass`, `solid`, `minimal`, `pill`), and max-width (`narrow`, `medium`, `wide`).
  - `Shortcuts`: toggles visibility, grid columns (`4..8`), and card presentation (`tile`, `pill`, `icon-only`, `compact`).
  - `TasksWidget`: toggles visibility and placement (`bottom`, `left`, `right`, `floating`).

### 6.4 Live Customize Mode & `DesignStudioDrawer` (`src/components/customization/`)
- **`CustomizeContext`**: Holds live draft state (`draftProfile`, `draftWorkspaceOverride`, `editingScope: 'global' | 'workspace'`), triggers instant live preview by feeding the draft profile directly into `useThemeLanguage` + `App` layout, and exposes `saveAndExit()`, `discardAndExit()`, `resetToDefault()`, `applyStarterTemplate(id)`, and `exportThemePack()` / `importThemePack(json)`.
- **Customize Top Bar**: Fixed compact header banner shown while Customize Mode is active (`Editing: Global Design` or `Editing: [Workspace Name]`, with `Save & Exit`, `Cancel`, `Reset`, and Undo stack).
- **Webview Protection Layer**: While `isCustomizeMode` is true, renders a non-destructive interaction shield over `#browser-views-container` (same pattern as `isDraggingTab` in `App.tsx`) so Electron `<webview>` instances never swallow drag-and-drop events, and highlights customizable zones on hover.
- **Direct On-Chrome Controls**:
  - Every `ToolbarSlotItem` shows a crisp outline, drag handle (HTML5 drag + pointer reorder), Eye button (Hide/Show), and Remove (`X`) button on hover/focus.
  - Empty drop slots appear between toolbar items for exact placement from the Palette.
  - When `NewTabPage` is active during Customize Mode, hovering Clock/Greeting/Search/Shortcuts/Tasks shows inline hide/style quick-pills.
- **5-Tab `DesignStudioDrawer`** (dockable right/left or floating draggable panel):
  1. **Templates & Packs**: 6 built-in starter architectural presets (*Nova Default*, *Zen Compact*, *Arc Sidebar Studio*, *Classic Browser*, *Frosted Glass*, *Minimal Paper*), Workspace Override toggle + reset-to-global, Import/Export `.novatheme.json`.
  2. **Layout & Toolbar**: `chromeMode`, `tabBarPosition`, sidebar width slider, sidebar section switches, and **Unused Items + Spacer + Divider Palette** (click `+` or drag straight onto toolbar).
  3. **Zones & Surfaces**: Visual zone picker across all 9 `SurfaceZoneId` regions -> Background/Gradient picker, Text/Muted colors, Opacity slider, Blur slider, Border width/color, Corner radius slider, Shadow selector.
  4. **Typography, Density & Effects**: UI font selector, UI scale slider, Icon scale slider, Density (`compact`/`normal`/`comfortable`), Tab Style/Animation, Window Material (`opaque`/`glass-vibrancy`).
  5. **New Tab & Custom CSS**: Visual controls for every `newTabLayout` widget + Custom CSS code editor with live sanitization status and blocked-rule diagnostics.
- **`AppearanceSection.tsx`**: Displays compact "Open Live Design Studio" CTA + Quick Architectural Preset strip + Workspace design status + Import/Export shortcut + Emergency Reset button alongside existing wallpaper/theme controls.

---

## 7. Verification & Testing Strategy

1. **Schema & Security Tests (`tests/design_customization_security.test.ts`)**:
   - `.novatheme.json` import validation: blocks prototype pollution, strips unknown fields, rejects external CSS `url(https://...)`, `@import`, `expression()`, caps CSS size, clamps out-of-range numbers.
   - Verify backwards compatibility with legacy `UserSettings` fields (`english_settings_migration.test.ts`, `sync_deletion_and_conflict.test.ts`).
2. **Design Engine & Token Resolution Tests (`tests/design_engine.test.ts`)**:
   - `resolveEffectiveDesign`: global vs workspace override priority, incognito surface protection, legacy `browserColor` + `customBrowserColor` fallback merging.
   - CSS variable generation contains valid values across all 9 zones, font family, density, and sidebar bindings.
3. **Toolbar Registry & Layout Tests (`tests/toolbar_customization.test.ts`)**:
   - Reordering items, hiding (`visible: false`), removing to palette, inserting multiple `spacer`/`divider` instances, safe reset restoration.
4. **Build, Typecheck & Full Suite**:
   - `npx tsc --noEmit`
   - `npm run build`
   - `npm test` (`test:e2e` + `test:sidebar`)
   - Update knowledge graph (`graphify update .`) after implementation.
