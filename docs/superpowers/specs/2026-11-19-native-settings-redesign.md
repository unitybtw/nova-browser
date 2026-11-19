# Native macOS / Linear Settings Redesign (`nova://settings`)

## Goal
Unify all 10 Settings tabs (`General`, `Appearance`, `Shortcuts`, `Nova AI`, `Extensions`, `MCP Server`, `Nova Sync`, `Privacy & Security`, `Passwords`, `Advanced`) and the Settings shell under a single **Native macOS / Linear** design system matching the redesigned Design Studio.

## Architecture
1. **Shared Settings Primitives (`src/components/settings/SettingsPrimitives.tsx` & `ToggleSwitch.tsx`):**
   - Neutral surfaces (`#fbfbfc` / `#ffffff` light, `#0e0f12` / `#141518` dark) with `1px` neutral borders (`border-neutral-200` / `dark:border-white/[0.08]`) and `divide-y` row separators.
   - Components: `SettingsPageHeader`, `SettingsGroup`, `SettingsRow`, `SettingsSegment`, `SettingsButton`, `SettingsBadge`, `SETTINGS_INPUT_CLS`, `SETTINGS_SELECT_CLS`, and monochrome native `ToggleSwitch`.
2. **Grouped Sidebar & Instant Search (`src/components/SettingsPage.tsx`):**
   - 3 clear navigation groups: **Browser** (`General`, `Appearance`, `Shortcuts`), **Tools & AI** (`Nova AI`, `Extensions`, `MCP Server`), **Privacy & System** (`Nova Sync`, `Privacy & Security`, `Passwords`, `Advanced`).
   - Top quick-search input indexing all 10 tabs and their individual settings (AdBlock, Whisper, WebGPU, MCP, Wallpaper, Passwords, CRX3, Memory, Backup, Shortcuts, etc.) for 1-click navigation.
3. **Full 10-Tab Refactor:**
   - Every section preserves 100% of existing props, IPC bridges, security boundaries, and test hooks while eliminating legacy `slate-*`, blue-purple gradients, `<Sparkles />` badges, and inconsistent card borders.
