## 2026-08-12T20:56:22Z
You are Worker M1 (Backend & Renderer Bug Fixer) for Nova Browser.

Working directory: /Users/siracsimsek/Desktop/novabrowser/.agents/worker_m1
Original Request: /Users/siracsimsek/Desktop/novabrowser/.agents/ORIGINAL_REQUEST.md
Project Scope: /Users/siracsimsek/Desktop/novabrowser/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks for Milestone 1:
1. `electron/main.ts`:
   - Implement an eviction cap / bounding logic on the `upgradedUrls` `Set<string>` (e.g. max 1000 items or eviction strategy) to prevent unbounded memory growth during long browsing sessions.
   - Fix dynamic listener accumulation on `web-contents-created` for `context-menu` (ensure single listener attachment or clean removal).
2. `electron/mcpServer.ts`:
   - Restrict CORS origin header from wildcard `*` to local origins (`http://localhost:*`, `http://127.0.0.1:*`) or check request origin header.
3. `src/main.tsx` & Error Boundary:
   - Create `src/components/ErrorBoundary.tsx` (or update existing) and wrap `<App />` in `<ErrorBoundary>` within `src/main.tsx` so unhandled React component exceptions render a fallback error view instead of a white screen app crash.
4. `src/components/ReaderMode.tsx`:
   - Fix `btoa(url)` crash on Unicode URLs (lines 78, 206) by safely encoding UTF-8 characters prior to base64 encoding (e.g., `btoa(unescape(encodeURIComponent(url)))` or `Buffer.from(url).toString('base64')`).
5. `src/components/BrowserView.tsx`:
   - Add safe optional chaining and null-checks on `tab.url` before calling `.startsWith()` or string methods (lines 91, 95, 99, 718).
6. `src/App.tsx`:
   - Wrap `localStorage` `JSON.parse` startup loaders (lines 220, 323, 465 for `user_settings`, `browsing_history`, `bookmarks`) in `try...catch` blocks with safe fallback default values (`{}`, `[]`) to prevent crashes on corrupted storage.
   - Add null and type checks for MCP bridge tool call parameters in `App.tsx` (`executeMcpAction`) and `src/services/aiAgent.ts`.
7. `mcp-bridge.ts`:
   - Fix TypeScript compilation error TS2339 on `eventsource` import (use proper import or type handling for EventSource).

Verification Requirements:
- Run `npm run build` and ensure the main project compiles cleanly with **0 TypeScript errors**.
- Document all file modifications, line numbers, build command output, and verification results in your report.
- Write your findings to `/Users/siracsimsek/Desktop/novabrowser/.agents/worker_m1/changes.md` and handoff report to `/Users/siracsimsek/Desktop/novabrowser/.agents/worker_m1/handoff.md`.
- Send a message to caller with a summary of changes and the path to your handoff report.
