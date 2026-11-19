# Nova Browser Website — Monumental Editorial Redesign

Direction: `name-as-monument` (`design-taste-frontend` seed `819112766`) with hybrid high-contrast Obsidian (`#0b0c0e`), Cool Stone (`#eef0f3`), and Electric Cobalt (`#1f2de6`) full-bleed color fields.

## Visual & Structural System
- **Idea:** Nova's customizable browser viewport becomes the `O` aperture inside the monumental `N [O] V A` opening wordmark and expands into an interactive Live Browser Studio directly below.
- **Typography:** Local `@fontsource/red-hat-display` (700, 900) and `@fontsource/red-hat-text` (400, 500) supporting both `latin` and `latin-ext` (Turkish). Strictly 5 page type sizes (`14 / 17 / 24 / 68 / 277 px` on desktop).
- **House Rules:** Zero hairline dividers, zero resting box-shadows, zero gradients, zero glass blur, zero icon-topped card grids, zero `01/02/03` numbering. Cropped real product UI fragments carry `data-ui` on their root.
- **Interactive Moments:**
  - Hero `O` looping dark Nova browser preview (`/images/hero-loop.webm`) with shutter `clip-path` entrance, reduced-motion sync, and visible WCAG 2.2.2 Pause/Play control.
  - Interactive Live Browser Studio (`src/components/LiveStudio.tsx`): live switching across 4 tab geometries (`Vertical`, `Top bar`, `Compact`, `Below bar`), 3 workspaces (`Personal`, `Work`, `Research`), Dark/Light surfaces, and 3 accessible ARIA experience tabs.
  - Native `<dialog closedby="any">` 36-second product film player with pointer-position light-dismiss fallback, CSS `overscroll-behavior: contain` scroll containment, EN/TR WebVTT captions, and error retry.
  - Non-exclusive native `<details>` FAQ with `::details-content` intrinsic-height transition.
  - Live official `v1.5.2` 3-platform, 6-installer picker (`src/components/DownloadPicker.tsx`).

## Verification
- `npm --prefix website test` (JSDOM regression suite)
- `npm --prefix website run build` (`tsc -b && vite build`)
- `design-taste-frontend/scripts/lint.mjs`: `0 FAIL, 0 WARN`
- `design-taste-frontend/scripts/inspect.mjs`: `0 FAIL, 0 WARN` across 1440px, 768px, and 390px viewports
