# Nova Browser Website Redesign Specification

Date: 2026-11-19
Status: Approved by user
Target Directory: `website/` (standalone React 19 + TypeScript + Vite marketing site)

## 1. Purpose & Product Truth
Nova Browser (`v1.5.2`, MIT license, `https://github.com/unitybtw/nova-browser`) is an open-source desktop browser for macOS, Windows, and Linux. This bilingual (English / Turkish) single-page website introduces the browser, lets visitors live-test its layout and workspace customization without leaving the page, proves core capabilities with authentic interface captures, and provides direct official GitHub Release downloads.

Honesty constraints (from `website/PRODUCT.md`):
- Local WebGPU AI requires an initial model download and compatible graphics hardware/memory.
- Nova Sync encrypts bookmarks and passwords client-side with AES-256-GCM via a Nova Cloud account; pairing via sync code is not available in this build.
- Chrome Web Store extension compatibility varies by extension API usage.
- Zero invented user counts, benchmarks, testimonials, press logos, or privacy guarantees beyond implemented features.

## 2. Art Direction & Visual System
Derived via `design-taste-frontend` (`seed 819112766`, direction `name-as-monument`, redraws logged below):
- **Direction:** The name as a monument (`name-as-monument`)
- **Idea Statement:** On this page, **Nova's customizable browser viewport** becomes **the `O` aperture inside the monumental `NOVA` wordmark and the live layout stage directly beneath it**.
- **Signature Interactive Moment ("One Live Thing"):** Interactive **Live Browser Studio** (`data-ui`) in Section 1 where visitors toggle real Nova tab-bar geometries (`Vertical`, `Top`, `Compact`, `Below`), switch Workspaces (`Personal`, `Work`, `Research`), switch Dark/Light surfaces, and explore the 3 core experiences (`Your space`, `Your assistant`, `Your devices`) live on the page.
- **Type System (Local `@fontsource`, zero external font hosts):**
  - Display: `Red Hat Display` (weight 900, tight tracking `-0.03em` to `-0.05em`, leading `0.88–0.96`).
  - Body: `Red Hat Text` (weights 400 and 500, leading `1.5`, tracking `0`).
  - Five strict type steps; minimum text size `13px`, body text `16px–18px`.
- **Hybrid Contrast Palette (adapted from dealt `Cool grey, cobalt` to satisfy the user's dark cinematic opening + alternating full-bleed dark/light blocks):**
  - Dark Obsidian ground: `--bg-dark: #0b0c0e`, surface `--surface-dark: #15181e`, ink `--ink-dark: #eef0f3`, muted `--muted-dark: #9aa3b2`.
  - Light Cool Stone ground: `--bg-light: #eef0f3`, surface `--surface-light: #e2e5ea`, ink `--ink-light: #0b0c0e`, muted `--muted-light: #525965`.
  - Cobalt Accent & Field: `--accent: #1f2de6`, `--accent-strong: #1521c2`, `--accent-ink: #ffffff`.
- **House Style Rules (enforced by `lint.mjs` & `inspect.mjs`):**
  - Headlines: 2 lines or fewer at 1440px, 768px, and 390px.
  - Zero eyebrow pills, zero `01/02/03` numbering, zero monospace outside code, zero hairline divider lines, zero resting box-shadows, zero gradients, zero glass/backdrop-blur cards, zero icon-topped card grids, zero styled accent words inside headlines.
  - Square corners (`0px`) on page imagery and primary filled rectangular buttons. Product interface fragments carry `data-ui` on their root.
- **Logged Redraws:**
  1. `palette`: Redrawn from `Teal on paper` to `Cool grey, cobalt` (and mapped to hybrid dark opening) to fulfill the user's dark cinematic opening + alternating dark/light blocks requirement.
  2. `section:about`: Redrawn from `about-pinned-title-portraits` to `about-side-facts-wide-paragraph` because Nova Browser is an open-source project without 6 team portrait photos.
  3. `section:cta`: Redrawn from `cta-giant-word-is-the-button` to `cta-first-step-already-open` so the official 3-platform, 6-installer v1.5.2 picker stays directly open and interactive.

## 3. Section Architecture (Alternating Full-Bleed Fields)
1. **Header + Hero (`#0b0c0e` dark):**
   - Plain navigation bar (no glass blur, no hairline border): `nova.` + icon mark left, 4 single-word links (`Studio`, `Capabilities`, `Open Source`, `FAQ`), `EN/TR` language toggle, compact `Get Nova` button right, accessible mobile drawer.
   - Center monument: `N` + square live looping `/images/tour.webm` viewport frame (`poster="/images/tour-poster.jpg"`, shutter `clip-path` entrance, visible WCAG 2.2.2 Pause/Play control, pauses on `prefers-reduced-motion: reduce`) + `V A`.
   - Bottom row: concrete one-sentence description, Cobalt `Download Nova` primary button (`#download`), and plain `Take a closer look` link opening the native `<dialog>` film player.
2. **Section 1 — Live Browser Studio (`#eef0f3` light, `showcase-square-plate-split`):**
   - 50/50 full-height split. Left: live interactive Nova browser frame (`data-ui`) reacting to 4 tab layouts (`Vertical`, `Top`, `Compact`, `Below`), 3 workspaces (`Personal`, `Work`, `Research`), and Dark/Light surface toggle, backed by real Nova screenshots.
   - Right: 3 accessible ARIA tabs (`tour-tab-0..2` with `ArrowLeft/ArrowRight/Home/End`), layout & theme switcher buttons, concise copy, and two full-width `72px` action cells (`Download Nova` and `Watch 36s film`).
3. **Section 2 — Real Interface Proofs (`#0b0c0e` dark, `features-small-proof-beside-text`):**
   - Left-aligned editorial proof column repeated 5 times with authentic Nova visuals:
     1. Live Design Studio & Modular Toolbar (`/images/studio-layout.png`)
     2. Local WebGPU AI Sidebar (`/images/assistant-clean-light.jpg`)
     3. Workspaces, Split View & Sleeping Tabs (`/images/tour-poster.jpg`)
     4. Local MCP Server & Chrome Web Store CRX3 Extensions (true-size `data-ui` fragment + `/images/studio-dark.png`)
     5. Network Shield & AES-256-GCM Sync (`/images/sync-clean-light.jpg`)
4. **Section 3 — Open Source & Architecture (`#eef0f3` light, `about-side-facts-wide-paragraph`):**
   - Shared 34% vertical grid axis. Row 1: 3 facts (`License: MIT`, `Release: v1.5.2`, `Platforms: macOS, Windows, Linux`) + wide editorial paragraph + `Explore on GitHub` button. Row 2: `Architecture` label + 2 balanced specification columns listing real subsystems.
5. **Section 4 — FAQ (`#0b0c0e` dark, `faq-wide-heading-indented`):**
   - Wide left display heading; 6 non-exclusive native `<details>` items indented to columns 5–12 on desktop, full-width on mobile, opening onto a `#15181e` surface tile with smooth `::details-content` intrinsic-height transition.
6. **Section 5 — Official v1.5.2 Download (`#1f2de6` cobalt, `cta-first-step-already-open`):**
   - Left bottom-anchored closing display title + GitHub checksums link. Right vertically centered dark `data-ui` installer dialog with accessible `platform-tab-0..2` (`macOS`, `Windows`, `Linux`) and all 6 official v1.5.2 release links.
7. **Section 6 — Footer (`#0b0c0e` dark, `footer-invitation-cropped-name`):**
   - Upper invitation + GitHub button + stacked links (`Source code`, `Release notes`, `Report an issue`) + `Back to top` returning focus to `#main` + copyright row + monumental bottom-cropped `NOVA.` wordmark with `/images/nova-mark.svg`.

## 4. Accessibility, Modern Web Standards & Testing
- Native `<dialog>` (`showModal()`, `closedby="any"` + pointer-position light-dismiss fallback, `overscroll-behavior: contain` on `dialog:modal` and `dialog::backdrop`, no `role="dialog"`/`aria-modal`, EN/TR WebVTT captions, media error retry).
- Non-exclusive `<details>` FAQ with `::details-content` + `interpolate-size: allow-keywords` progressive animation.
- Motion: shutter `clip-path` entrance on the Hero aperture, scroll-triggered staggered entrances (`IntersectionObserver`, ≥16 animated targets), zero content hidden when JS is absent, full `@media (prefers-reduced-motion: no-preference)` gating.
- Verification gates: `npm --prefix website run build`, `npm --prefix website test`, `lint.mjs` (0 FAIL), `inspect.mjs` (0 FAIL + visual review at 1440px, 768px, 390px).
