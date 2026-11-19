# Nova Browser Website — Monumental Editorial Redesign

Direction: `name-as-monument` (`design-taste-frontend` seed `819112766`) with hybrid high-contrast Obsidian (`#0b0c0e`), Cool Stone (`#eef0f3`), and Electric Cobalt (`#1f2de6`) full-bleed color fields.

## Visual & Structural System
- **Idea:** Nova's **Orbital Eclipse Ring** emblem (`#eef0f3` eccentric ring + `#1f2de6` Cobalt Nova flare) replaces the `O` inside the monumental `N [O] V A` opening wordmark, followed immediately by a full-width embedded live Nova Browser v1.5.2 interactive demo.
- **Typography:** Local `@fontsource/red-hat-display` (700, 900) and `@fontsource/red-hat-text` (400, 500) supporting both `latin` and `latin-ext` (Turkish). Strictly 5 page type sizes (`14 / 17 / 24 / 68 / 277 px` on desktop).
- **House Rules:** Zero hairline dividers, zero resting box-shadows, zero gradients, zero glass blur, zero icon-topped card grids, zero `01/02/03` numbering. Real product UI embeds and fragments carry `data-ui` on their root.
- **Interactive Moments:**
  - Monumental `N [Orbital Eclipse Ring] V A` hero with `shutter` clip-path reveal.
  - Real Embedded Interactive Nova Browser Demo (`src/components/LiveStudio.tsx`): loads the actual compiled Nova v1.5.2 React application (`/browser-demo/index.html`) inside a full-width interactive iframe with 4 live scenarios (`Live Design Studio`, `Vertical Tabs`, `Local AI`, `Split View`), instant Dark/Light theme syncing via `postMessage` (`NOVA_THEME_CHANGE`), fullscreen link, and accessible ARIA tablist keyboard navigation.
  - Five uniform dark-theme 1440×900 interface proofs captured fresh from Nova v1.5.2 (`shot-studio.jpg`, `shot-ai.jpg`, `shot-split.jpg`, `shot-extensions.jpg`, `shot-sync.jpg`).
  - Native `<dialog closedby="any">` 42-second Monumental Editorial launch film player with pointer-position light-dismiss fallback, CSS `overscroll-behavior: contain` scroll containment, EN/TR WebVTT captions, and error retry.
  - Non-exclusive native `<details>` FAQ with `::details-content` intrinsic-height transition.
  - Live official `v1.5.2` 3-platform, 6-installer picker (`src/components/DownloadPicker.tsx`).

## Verification
- `npm --prefix website test` (JSDOM regression suite)
- `npm --prefix website run build` (`tsc -b && vite build`)
- `design-taste-frontend/scripts/lint.mjs`: `0 FAIL, 0 WARN`
- `design-taste-frontend/scripts/inspect.mjs`: `0 FAIL, 0 WARN` across 1440px, 768px, and 390px viewports
