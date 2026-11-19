# Browser-Wide Native macOS / Linear Anti-Slop Redesign

## Goal
Eliminate all remaining AI-slop aesthetics across Nova Browser (outside the already-redesigned Live Design Studio and Settings) and unify the entire application onto the same crisp **Native macOS / Linear** visual language.

## Shared Visual Tokens
- **Canvas**: `#fbfbfc` (light) / `#0e0f12` (dark)
- **Elevated Surface (Modals, Popovers, Cards)**: `#ffffff` (light) / `#141518` (dark)
- **Inset / Control Surface**: `bg-neutral-100/90 dark:bg-white/[0.06]`
- **Borders & Hairlines**: `border-neutral-200/90 dark:border-white/[0.08]`, dividers `divide-neutral-200/80 dark:divide-white/[0.07]`
- **Primary Button**: `bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950`
- **Secondary Button**: `bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-neutral-200/80 dark:border-white/[0.08]`
- **Destructive Action**: `bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20`
- **Semantic Status Only**: Emerald for active protection/connected, Amber for warnings, Red for errors/destructive. Zero decorative cyan/indigo/purple/violet gradients, zero `<Sparkles />` icons, zero neon `shadow-*-500/25` glows, zero `animate-bounce` / decorative `animate-pulse`.

## Execution Waves

### Wave 1 — Shared Overlay Primitives & Core Entry Surfaces
- `src/components/Onboarding.tsx`: Monochrome Native macOS welcome wizard (neutral canvas, crisp Orbital Eclipse emblem, neutral typography & buttons, clean theme/search/privacy setup cards).
- `src/components/SpotlightOmnibox.tsx`: Linear/Raycast-grade `Cmd+K` command bar (`bg-white/95 dark:bg-[#141518]/95`, crisp `1px` border, monochrome active row, clean `<kbd>` hints).
- `src/components/SidePanel.tsx` & `src/components/ui/ai-chat-input.tsx`: Clean Native AI assistant panel & composer (neutral surfaces, remove `<Sparkles />`, remove cyan/indigo/purple borders/glows and pulse bloat; keep all WebGPU/custom LLM/voice/agent features intact).
- `src/components/AICursorOverlay.tsx` & `src/components/AILinkPreview.tsx`: Minimal monochrome agent indicator & crisp link preview card without `<Sparkles />` or neon cyan glow.

### Wave 2 — Tab & Micro-Chrome Overlays
- `src/components/TabContextMenu.tsx`: Native macOS context menu (`bg-white/95 dark:bg-[#16171b]/95`, neutral hover rows, crisp shortcuts, preserve `resolveMenuFocusIndex` export).
- `src/components/TabHoverPreview.tsx`: Neutral elevated preview card without cyan/purple accents.
- `src/components/FindInPage.tsx`: Compact native floating find bar (`bg-white dark:bg-[#141518]`, neutral match badge & nav buttons).
- `src/components/DownloadToast.tsx` & `src/components/UpdateToast.tsx`: Monochrome native notification toasts with crisp hairline progress bar.
- `src/components/ErrorBoundary.tsx` & `src/components/BlockedSiteModal.tsx`: Clean monochrome error & security warning surfaces.

### Wave 3 — Toolbar Popovers & Modals
- `src/components/WorkspaceManager.tsx`: Remove `<Sparkles />` and cyan/purple styling; crisp monochrome workspace list and icon/color picker.
- `src/components/AdBlockerPopover.tsx`, `src/components/SiteInfoPopover.tsx`, `src/components/PermissionPromptPopover.tsx`: Unified popover shell (`rounded-xl`, `1px` hairline, semantic emerald/amber/red status only).
- `src/components/DownloadsPopover.tsx`, `src/components/PageTranslatePopover.tsx`, `src/components/VpnPopover.tsx`: Unified popover shell & monochrome controls.
- `src/components/AccountModal.tsx`: Monochrome modal; strictly preserve all `tests/sync_pairing_ui.test.ts` copy invariants (`Sign in with your Nova Cloud account to sync`, no `1-click code`, no `Sync Chain`).
- `src/components/ExtensionsModal.tsx`: Monochrome modal; strictly preserve `tests/sidebar_tabs_ui.test.ts` attributes (`title="Load unpacked extension folder"`, `title="Open Popup"`, alerts).
- `src/components/ScreenshotModal.tsx`, `src/components/ShareModal.tsx`, `src/components/PasswordPromptModal.tsx`: Unified monochrome modals (preserve `ScreenshotModal` test button labels `"Copy"`, `"Full Page"`, etc.).

### Wave 4 — Internal `nova://` Pages & Reader Mode
- `src/components/HistoryPage.tsx`: Native macOS / Linear grouped timeline (`nova://history`) matching Settings aesthetics.
- `src/components/DownloadsPage.tsx`: Native grouped downloads manager (`nova://downloads`) matching Settings aesthetics.
- `src/components/HelpModal.tsx`: Clean monochrome documentation/shortcuts modal (remove all `<Sparkles />`, cyan/purple badges; preserve all `tests/component_correctness_regressions.test.ts` exports).
- `src/components/ReaderMode.tsx`: Editorial typography reader toolbar & settings drawer (clean neutral chrome + sepia/light/dark reading themes; remove 51 cyan/purple classes; preserve all `tests/component_correctness_regressions.test.ts` exports).

### Wave 5 — New Tab Page Polish (`NewTabPage.tsx`)
- Refine default search box (monochrome submit button instead of bright blue square, crisp neutral borders), speed dial shortcut tiles, tasks widget, and customize toolbar pills so the default New Tab feels cohesive with Native macOS / Linear while preserving all user wallpapers, themes, and all `tests/newtab_*.test.ts` invariants.

## Verification Strategy
1. `npm run build:electron` (TypeScript + Electron bundle check).
2. `npm test` (100% pass across `test:e2e`, `test:sidebar`, `test:customization`, including `sync_pairing_ui`, `component_correctness_regressions`, `link_preview_lru`, `newtab_*`).
3. Real 2x headless Chrome visual inspection (`read_file`) of Onboarding, New Tab, AI SidePanel, Spotlight (`Cmd+K`), History, Downloads, and Reader Mode in Dark & Light themes.
4. `graphify update .` after code changes.
