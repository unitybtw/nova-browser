# Project: Nova Browser Comprehensive Security & Bug Audit

## Architecture
Nova Browser is an Electron + React + TypeScript web browser featuring:
- **Main Process (`electron/main.ts`, `electron/main/*`, `electron/preload.ts`)**:
  - Privileged IPC dispatch with `isTrustedSender` sender frame validation.
  - Session privacy pipelines (Adblocker engine via `@cliqz/adblocker-electron`, DNT/Sec-GPC header injection, CSP nosniff headers) across default and incognito sessions.
  - Webview lifecycle management with `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, and strict sandbox settings.
  - Safe extension loading and native TTS execution.
- **Renderer Process (`src/*`)**:
  - React UI (React 18.3 in Electron client, React 19 in landing website) with vertical tabs, omnibox (`TopBar.tsx`, `SpotlightOmnibox.tsx`), split views, and side panel AI integrations.
  - Safe URL parsing and search query formatting (`src/utils/searchEngine.ts`, `src/utils/safeNavigation.ts`).
  - Memory-safe component lifecycles and sanitized rendering (`ReaderMode.tsx`, `BrowserView.tsx`).
- **Test Infrastructure (`tests/*`, `dist-test/runAll.cjs`)**:
  - Custom Node test runner compiled via `esbuild` executing empirical security, performance, lifecycle, and component assertions.

## Feature Inventory
Every audited feature and requirement mapped to concrete milestones:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | IPC Sender Origin Check | Add missing `isTrustedSender` check to `fetch-unsplash-photos` in `electron/main.ts` | M1 | R1 / Survey |
| 2 | Incognito Session Privacy | Enable Adblocker and inject DNT/Sec-GPC/nosniff headers on `session.fromPartition('incognito')` | M1 | R1, R3 / Survey |
| 3 | Full Page Capture Metrics Cleanup | Place `Emulation.clearDeviceMetricsOverride` in a `finally` block in `electron/main.ts` | M1 | R1 / Survey |
| 4 | Adblock Whitelist Sanitization | Validate hostnames with regex `/^[a-zA-Z0-9.-]+$/` before creating filter rules | M1 | R3 / Survey |
| 5 | Unpacked Extension Loading | Ensure valid path resolution for unpacked developer extensions in `electron/main.ts` | M1 | R1 / Survey |
| 6 | Case-Insensitive URL Parsing | Support uppercase and mixed-case URL protocols (`HTTPS://`, `HTTP://`) in `searchEngine.ts` | M2 | R2 / Survey |
| 7 | Dangerous Scheme Sterilization | Explicitly block `blob:`, `view-source:`, `javascript:`, `vbscript:`, and unsafe `data:` in `safeNavigation.ts` | M2 | R2 / Survey |
| 8 | Favorite & SpeedDial Sanitization | Validate URLs against `isSafeNavigationUrl` before storing in `SidebarTabs.tsx` and `NewTabPage.tsx` | M2 | R2 / Survey |
| 9 | AILinkPreview Typewriter Race Fix | Remove duplicate `useEffect` interval in `src/components/AILinkPreview.tsx` to eliminate jitter | M3 | R4 / Survey |
| 10 | Omnibox Submit Fallback | Add `else if (onNewTab) onNewTab(url)` fallback in `SidebarTabs.tsx` `handleOmniboxSubmit` | M3 | R4 / Survey |
| 11 | Website Navbar Audit Verification | Verify `website/src/components/Navbar.tsx` contains no `isScrolled` or conditional white bg | M3 | Constraint / Survey |
| 12 | Security & Bug Regression Tests | Add regression test suite covering all fixes in M1, M2, M3, maintaining 23 existing tests | M4 | R5 / Survey |
| 13 | Build & Typecheck Verification | Verify `npm test`, `npm run build`, and `npx tsc --noEmit` pass with zero errors | M4 | R5 / Acceptance |
| 14 | Security Policy Documentation | Produce `SECURITY.md` documenting policy, supported versions, and responsible disclosure | M5 | R5 / Acceptance |
| 15 | Semantic Commits & Git Push | Commit each fix with `type(scope): description` and push to `origin/main` | M5 | R5 / Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Electron IPC & Session Security | IPC validation, Incognito privacy/adblock parity, CDP metrics cleanup, whitelist sanitization | none | DONE |
| 2 | M2: URL Validation & Navigation Security | Case-insensitive protocol matching, dangerous scheme blocks, favorite URL sanitization | none | DONE |
| 3 | M3: React Frontend Bugs & Navbar Check | AILinkPreview duplicate interval fix, SidebarTabs fallback, Website navbar check | none | DONE |
| 4 | M4: Regression Tests & Build Verification | Regression test suite in tests/, runAll.ts integration, npm test 23+, build & tsc checks | M1, M2, M3 | DONE |
| 5 | M5: Documentation, Commits & Push | SECURITY.md generation, semantic git commits per fix, push to origin/main | M4 | DONE |

## Interface Contracts
### Electron IPC Contract
- All IPC handlers in `electron/main.ts` must call `isTrustedSender(event)` at line 1 of handler.
- Incognito partition sessions must share identical privacy header injections and adblocker filtering as `defaultSession`.
- `updateAdblockWhitelist(whitelist: string[])`: Only processes strings passing `/^[a-zA-Z0-9.-]+$/`.

### URL Validation Contract
- `isValidUrlOrDomain(input: string)`: Matches `http://` or `https://` case-insensitively.
- `formatSearchUrl(input: string, engine: string)`: Preserves case-insensitive `http://` / `https://` protocols without wrapping in search engine URLs.
- `isSafeNavigationUrl(url: string)`: Returns `false` for `javascript:`, `file:`, `vbscript:`, `blob:`, `view-source:`, and non-image `data:` schemes.

## Code Layout
- `electron/main.ts`: Main process IPC handlers, session privacy configuration, window management.
- `src/utils/searchEngine.ts`: URL parsing and search engine query construction.
- `src/utils/safeNavigation.ts`: Dangerous protocol filtration.
- `src/components/AILinkPreview.tsx`: Sanitized typewriter rendering with clean interval teardown.
- `src/components/SidebarTabs.tsx`: Tab management and omnibox submit fallback handling.
- `src/components/NewTabPage.tsx`: Speed dial and new tab background widgets.
- `website/src/components/Navbar.tsx`: Transparent/glass navbar without conditional white styling.
- `tests/security_regression_audit.test.ts`: Security and bug regression unit tests.
- `SECURITY.md`: GitHub Security Policy and vulnerability reporting guidelines.
