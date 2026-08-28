# Nova Browser Website — Remediation Report

**Target:** `website/`
**Status:** Implemented and validated
**Original baseline:** `12/20` audit health score; 6 degraded detector findings

## Changes applied

### Accessibility and touch interaction

- Added `role="tablist"`, `role="presentation"` wrappers, `role="tab"`, selected state, Arrow/Home/End keyboard navigation, activation keys, and a labelled `tabpanel` to the embedded BrowserDemo tabs.
- Replaced the tab close `<span>` interaction with a real button and a tab-specific accessible name.
- Added accessible names and focus rings to navigation, bookmark, AI assistant, privacy shield, extensions, settings, search, voice search, and submit controls.
- Added `aria-pressed` to bookmark, AI mode, AI assistant, and privacy shield toggles.
- Added an accessible name to the browser address field and the new-tab search field.
- Increased compact BrowserDemo controls from 28px visual hit areas to approximately 44px interactive targets while retaining small icons.

### Performance

- Converted `GithubStats`, `Benchmarks`, `Downloads`, and `Faq` to lazy-loaded chunks.
- Added an `IntersectionObserver` gate with a `1200px` preload margin so deferred sections do not initialize at first paint.
- Preserved hash navigation: links to `#community`, `#benchmarks`, `#download`, and `#faq` trigger loading; `DeferredContentReady` scrolls after all lazy sections resolve, so the target exists before the post-load scroll runs.
- Converted BrowserDemo from a padded gray card-inside-card treatment to one browser frame: one border, one shadow, one chrome header, and one continuous viewport surface.
- Distilled Hero to its essential hierarchy: headline, supporting copy, two CTAs, and the browser demo. Removed the redundant capability pills, glow backdrop, and scroll-cue decoration.
- Reduced shared card/button polish to restrained border, color, and shadow feedback; removed decorative radial glows, shine sweeps, and lift effects.
- Calmed Navbar logo and CTA interactions and simplified FeatureBento icon hover feedback to color/background changes.
- Main JS changed from the baseline `521.08 kB` minified / `162.43 kB` gzip to `461.03 kB` minified / `149.00 kB` gzip.

### Visual quality, motion, and detector findings

- Removed stale dark-body classes from `website/index.html` so the HTML shell matches the light Nova surface.
- Darkened muted FAQ category/icon text from `neutral-400/500` to `#525252` on neutral surfaces.
- Replaced the generic Inter/Plus Jakarta Sans font stack with IBM Plex Sans and reduced the Google Fonts request to IBM Plex Sans + JetBrains Mono.
- Replaced the gradient hero word treatment with a solid Nova indigo accent.
- Added semantic CSS tokens for canvas, surface, text, accent, border, focus, and terminal colors; connected them to the page shell and shared CSS rules.
- Narrowed the global reduced-motion rule so decorative loops stop without globally forcing meaningful state transitions to `0.01ms`.

## Verification

| Check | Result |
|---|---|
| `cd website && npm run build` | Passed |
| Impeccable detector | 0 findings; regex fallback warning remains |
| `git diff --check` | Passed |
| Production preview smoke test | Passed; HTML, main JS, and all four lazy chunks returned HTTP 200 |
| Browser visual overlay | Not run; browser automation unavailable |

## Remaining manual checks

1. Run a real browser pass at 320px, 375px, 768px, and 1024px widths, including landscape mobile.
2. Verify computed contrast with full Impeccable parser dependencies available.
3. Test keyboard focus order and screen-reader announcements in the built site.
4. Run Lighthouse or equivalent on a throttled mobile profile and record LCP, INP, CLS, and TBT.
5. Consider migrating the remaining repeated component-level arbitrary colors to semantic tokens if additional themes are required.
