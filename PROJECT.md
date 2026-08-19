# Project: Nova Browser Security Hardening, Performance Optimization & Delivery

## Architecture
- **Main Process (`electron/main.ts`)**: Electron runtime host managing window creation, webview attachment security (`will-attach-webview`), permission request handlers (`setPermissionRequestHandler`), IPC handler registry (`ipcMain.handle`, `ipcMain.on`), native audio state tracking (`audio-state-changed`), and MCP server integration (`mcpServer.ts`).
- **Preload Bridges (`electron/preload.ts`, `electron/webstore-preload.ts`)**: Secure context-isolated bridges exposing sanitized APIs via `contextBridge.exposeInMainWorld('electronAPI', ...)`.
- **Renderer Frontend (`src/`)**: React 18 single-page application orchestrating browser shell UI:
  - `src/App.tsx`: Root layout, tab lifecycle controller, modal dialogs, global keyboard shortcuts.
  - `src/components/TopBar.tsx`: Omnibox, navigation buttons, tab strip (horizontal mode), shield, extensions.
  - `src/components/SidebarTabs.tsx`: Vertical tab strip (vertical mode), workspace selector, pinned tabs, audio/mute controls.
  - `src/components/BrowserView.tsx`: Webview guest container, SSR safety, context menu, password prompt, hibernation placeholder.
  - `src/components/NewTabPage.tsx`: Speed dials, search widget, clock/greeting, todo list, animated backgrounds.
  - `src/components/SidePanel.tsx`: AI assistant interface, WebLLM / Gemini integration, TTS.
- **Workers & Services (`src/services/`, `src/workers/`)**: On-device AI inference (`aiAgent.ts`, `aiWorker.ts`), adblocker, VPN, TTS, reader mode.

---

## Feature Inventory
| # | Feature / Issue | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Strict Dev URL & Permission Origin Validation | Replace `startsWith('http://localhost:5173')` with strict origin matching using `new URL()`; prevent subdomain bypass (`localhost:5173.attacker.com`). | M1 | Survey (Explorer 1) |
| 2 | Enforce Webview Sandbox & Preload Restrictions | Add `webPreferences.sandbox = true` and strip/validate `preload` in `will-attach-webview`. | M1 | Survey (Explorer 1) |
| 3 | Extension Path Traversal Mitigation | Validate `extensionId` with regex `/^[a-zA-Z0-9_-]+$/` and ensure resolved path stays within extensions directory in `remove-extension`. | M1 | Survey (Explorer 1) |
| 4 | Web Store Hostname Strict Validation | Replace `.includes('chrome.google.com')` with exact hostname equality in `webstore-preload.ts`. | M1 | Survey (Explorer 1) |
| 5 | IPC Sender Origin & Frame Hardening | Upgrade `isTrustedSender` to check `event.senderFrame === mainWindow.webContents.mainFrame` and origin matching. | M1 | Survey (Explorer 1) |
| 6 | IPC Parameter Sanitization & Null Guards | Add strict type assertions and null guards in `set-vpn`, `store-set`, `set-theme`, and sanitize inputs against injection. | M1 | Survey (Explorer 1) |
| 7 | Main Process Console Log Sanitization | Prevent terminal stdout dumping of sensitive data and credentials. | M1 | Survey (Explorer 1) |
| 8 | Native Webview Audio State IPC | Hook `wc.on('audio-state-changed')` in `main.ts` and dispatch `tab-audio-changed` to frontend. | M1 | Survey (Explorer 1, 3) |
| 9 | Webview Incognito Session Partition Isolation | Add `partition={isIncognito ? 'incognito' : undefined}` to `<webview>` in `BrowserView.tsx` to prevent private browsing storage leaks. | M2 | Survey (Explorer 1) |
| 10 | Credential Exposure & Spoofing Fix | Remove plaintext `console.log('NOVA_SAVE_PW::...')` in `BrowserView.tsx` and validate hostname against `tab.url` in `handleIpcMessage`. | M2 | Survey (Explorer 1) |
| 11 | Sidebar Audio Badge CSS Visibility Fix | Fix `SidebarTabs.tsx:484` CSS so audio/mute indicators are visible (`opacity-100`) on background tabs. | M2 | Survey (Explorer 3) |
| 12 | Background Tab Lifecycle & Audio Retention | Connect `tab-audio-changed` in frontend to retain audio-playing background tabs and prevent premature hibernation; fix wakeup `tab.url` race condition. | M2 | Survey (Explorer 2, 3) |
| 13 | Root State Monolith & Callback Memoization | Wrap inline handlers in `useCallback` / `useMemo` in `App.tsx` and avoid re-sorting arrays on every render. | M3 | Survey (Explorer 2) |
| 14 | Omnibox Keystroke Optimization & AbortController | Isolate omnibox input state in `TopBar.tsx` to prevent re-rendering the horizontal tab strip on every keystroke; add `AbortController` to debounced search suggestions. | M3 | Survey (Explorer 2) |
| 15 | `BrowserView.tsx` Custom Memo Comparator Gaps | Include missing properties (`isPlayingAudio`, `zoomFactor`, `canGoBack`, `canGoForward`, `newTabBackground`, `searchEngine`) in `BrowserView` memo comparator. | M3 | Survey (Explorer 2) |
| 16 | NewTabPage 1-Second Interval Loop Fix | Extract clock into a dedicated memoized `<Clock />` component to stop 1-second full-page re-renders; pause particle animations when tab is inactive. | M3 | Survey (Explorer 2) |
| 17 | Event Listener & Subscription Churn Cleanup | Fix `TopBar.tsx` IPC re-subscription on `[tabs]`; clean up `setTimeout` in `BrowserView.tsx`; clean up `SidePanel.tsx` speech recognition singleton. | M3 | Survey (Explorer 2) |
| 18 | Bundle Size & `@mlc-ai/web-llm` Startup Tree-Shaking | Convert `import { MLCEngine }` to `import type { MLCEngine }` in `aiAgent.ts`; eliminate 6.03MB startup bundle bloat. | M4 | Survey (Explorer 3) |
| 19 | Redundant Worker File Deletion | Remove duplicate `src/services/aiWorker.ts` and clean up unused imports. | M4 | Survey (Explorer 3) |
| 20 | Vite Bundle Config & Warning Threshold | Lower `chunkSizeWarningLimit` to 1000KB in `vite.config.ts` and verify build chunk splitting. | M4 | Survey (Explorer 3) |
| 21 | E2E Verification Test Suite & Adversarial Integrity | Implement comprehensive test suite covering security, performance, audio retention, and build integrity. | M5 | Requirements R5 |
| 22 | Git Delivery to `origin/main` | Verify clean working tree, commit changes with semantic commit conventions, and push to `origin/main`. | M6 | Requirements R5 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Main Process Security & IPC Hardening | Fix dev URL validation, webview sandbox in `will-attach-webview`, path traversal in `remove-extension`, webstore host check, `isTrustedSender` origin/frame check, IPC parameter guards, native audio hook | none | DONE |
| M2 | Webview Sandbox, Incognito & Audio UI | Incognito partition on `<webview>`, credential exposure fix, sidebar audio badge visibility, audio-state IPC integration, wakeup URL fix | M1 | DONE |
| M3 | Frontend Performance & Memory Optimization | Memoization in `App.tsx`, `TopBar.tsx` omnibox re-render decoupling + AbortController, `BrowserView.tsx` memo comparator, `NewTabPage.tsx` clock extraction, listener cleanups | M2 | DONE |
| M4 | Asset & Bundle Size Optimization | `aiAgent.ts` type-only import, duplicate `aiWorker.ts` deletion, Vite build config optimization | M3 | DONE |
| M5 | Test Suite Execution & Integrity Audit | Comprehensive verification tests, `npm test` & `npm run build` verification, Reviewer, Challenger & Forensic Auditor gates | M1, M2, M3, M4 | DONE |
| M6 | Version Control & Git Delivery | Review git diff, create semantic commits, push to `origin/main` | M5 | IN_PROGRESS |

---

## Interface Contracts
### Main Process ↔ Renderer IPC
- `tab-audio-changed`: Main process sends `{ webContentsId: number, isPlayingAudio: boolean }` to `mainWindow.webContents`. Renderer updates corresponding tab's `isPlayingAudio` state.
- `remove-extension`: Renderer sends `extensionId: string` (matching `/^[a-zA-Z0-9_-]+$/`). Main process resolves within `userData/extensions` only.
- `store-set`: Key must be a non-empty string, value must be a valid JSON-serializable string/object with length limits.
- `set-vpn`: Config must be `{ enabled: boolean, location?: string }`.

---

## Code Layout
- `electron/main.ts` — Electron main process entry point & IPC handlers (Owned by M1)
- `electron/preload.ts` — Main preload script (Owned by M1)
- `electron/webstore-preload.ts` — Chrome webstore integration preload (Owned by M1)
- `src/components/BrowserView.tsx` — Webview container & hibernation UI (Owned by M2, M3)
- `src/components/SidebarTabs.tsx` — Vertical tab list & audio indicators (Owned by M2, M3)
- `src/App.tsx` — Root application component (Owned by M3)
- `src/components/TopBar.tsx` — Top bar & omnibox search (Owned by M3)
- `src/components/NewTabPage.tsx` — New tab dashboard & clock (Owned by M3)
- `src/components/SidePanel.tsx` — AI assistant side panel (Owned by M3)
- `src/services/aiAgent.ts` — WebLLM AI service (Owned by M4)
- `src/services/aiWorker.ts` — Redundant worker file (Deleted in M4)
- `vite.config.ts` — Vite bundler configuration (Owned by M4)
- `tests/` — Test suites and verification harnesses (Owned by M5)
