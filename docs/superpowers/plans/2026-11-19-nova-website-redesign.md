# Nova Browser Website Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the standalone Nova Browser bilingual marketing website in `website/` from scratch using the `name-as-monument` editorial direction, hybrid Obsidian/Cool-Stone/Cobalt color rhythm, live interactive Browser Studio (`data-ui`), real Nova captures, and modern web platform APIs.

**Architecture:** Modular React 19 + TypeScript + Vite SPA inside `website/` with local `@fontsource/red-hat-display` and `@fontsource/red-hat-text` typography, layered zero-ornament CSS (`styles.css`), focused interactive components (`LiveStudio.tsx`, `FeatureProofs.tsx`, `DownloadPicker.tsx`, `VideoDialog.tsx`), IntersectionObserver + reduced-motion choreography (`useSiteMotion.ts`), and JSDOM regression tests (`tests/regressions.tsx`).

**Tech Stack:** React 19, TypeScript, Vite 6, `@fontsource/red-hat-display`, `@fontsource/red-hat-text`, `lucide-react`, native `<dialog>`, `<details>`, CSS Layers.

## Global Constraints
- Local assets only: zero external font or image CDNs.
- Bilingual `en` and `tr` copy persisted via `localStorage` (`nova-language`) with synced `document.documentElement.lang` and `document.title`.
- Zero `FAIL`s on `design-taste-frontend/scripts/lint.mjs` and `inspect.mjs` across 1440px, 768px, and 390px viewports.
- All headlines <= 2 lines at every viewport; minimum font size `13px`, body text >= `16px`.
- Official release assets point exclusively to `https://github.com/unitybtw/nova-browser/releases/download/v1.5.2/`.
- Honest product facts per `website/PRODUCT.md` (no invented metrics, testimonials, or sync-code claims).

---

### Task 1: Dependencies & Real Studio Assets
**Files:**
- Modify: `website/package.json`
- Create: `website/public/images/studio-layout.png`
- Create: `website/public/images/studio-dark.png`
- Modify: `website/index.html`

- [ ] Install `@fontsource/red-hat-display` and `@fontsource/red-hat-text` in `website/`.
- [ ] Copy authentic Live Design Studio captures into `website/public/images/`.
- [ ] Update `website/index.html` with dark obsidian `theme-color` (`#0b0c0e`), inline `html.js` motion gate script, updated meta/OG copy, and hero poster preload (`/images/tour-poster.jpg`).

### Task 2: Bilingual Copy Deck & Data Model
**Files:**
- Modify: `website/src/content.ts`

- [ ] Author full bilingual (`en` and `tr`) copy deck matching the two-line headline budget (<= 32–42 chars), zero em-dashes, zero generated-copy clichés, and all 6 FAQ items, 5 feature proofs, Live Studio states, Open Source facts, and v1.5.2 download strings.

### Task 3: Modular UI Components
**Files:**
- Create: `website/src/components/LiveStudio.tsx`
- Create: `website/src/components/FeatureProofs.tsx`
- Create: `website/src/components/DownloadPicker.tsx`
- Create: `website/src/components/VideoDialog.tsx`
- Modify: `website/src/App.tsx`
- Modify: `website/src/main.tsx`
- Modify: `website/src/useSiteMotion.ts`

- [ ] Build `LiveStudio.tsx` with `data-ui` live Nova Browser shell supporting 4 tab layouts (`vertical`, `top`, `compact`, `below`), 3 workspaces (`personal`, `work`, `research`), Dark/Light toggle, and accessible `tour-tab-0..2` ARIA tablist.
- [ ] Build `FeatureProofs.tsx` with 5 left-aligned proof modules showing real Nova captures + true-size `data-ui` MCP/CRX3 interface fragment.
- [ ] Build `DownloadPicker.tsx` with `data-ui` obsidian installer panel, `platform-tab-0..2` ARIA tablist, keyboard navigation, and 6 official `v1.5.2` release links.
- [ ] Build `VideoDialog.tsx` using native `<dialog closedby="any">`, pointer-position light-dismiss fallback, EN/TR WebVTT captions, error recovery retry, and focus return without `body` overflow lock hacks.
- [ ] Compose `App.tsx` with monumental `N [live video] V A` hero (with visible WCAG 2.2.2 Pause/Play control), alternating dark/light/cobalt sections, architectural `about` table, indented `<details>` FAQ, and cropped monumental `NOVA.` footer with `/images/nova-mark.svg`.
- [ ] Implement `useSiteMotion.ts` driving one-shot IntersectionObserver reveals, shutter entry, and reduced-motion video sync.

### Task 4: Architectural Layered CSS
**Files:**
- Modify: `website/src/styles.css`

- [ ] Write layered CSS (`@layer reset, tokens, base, layout, components, ui-fragments, motion, responsive`) strictly obeying house rules: zero hairline rules, zero resting shadows, zero gradients, zero glass blur, square corners, 5 type steps, `dialog:modal` + `dialog::backdrop` scroll containment, `details::details-content` intrinsic height animation, and custom mobile compositions at <= 768px and <= 480px.

### Task 5: Regression Tests, Build, Lint & Real-Browser Visual Critique
**Files:**
- Modify: `website/tests/regressions.tsx`
- Modify: `website/DESIGN.md`
- Modify: `website/ASSETS.md`

- [ ] Update `website/tests/regressions.tsx` to cover navigation, keyboard ARIA tablists (`tour-tab-*`, `platform-tab-*`), Live Studio layout/workspace/theme toggles, mobile menu dismissal, hero video pause control, native `<dialog>` captions/retry, and footer focus return.
- [ ] Run `npm --prefix website test` and `npm --prefix website run build`.
- [ ] Run `design-taste-frontend/scripts/lint.mjs` on `website/src website/index.html` and fix any FAIL/WARN.
- [ ] Serve `website/dist` and run `design-taste-frontend/scripts/inspect.mjs` at 1440px, 768px, 390px; inspect all rendered screenshots with `read_file`, critique per `references/critique.md`, polish any defects, and re-verify.
- [ ] Update `website/DESIGN.md` and `website/ASSETS.md`, run `graphify update .`, and commit + push to `origin/main`.
