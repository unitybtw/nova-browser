# Project: Nova Browser Scan, Bug Fixing, Audit & Release

## Architecture & AI Context
- **AI Agent Summary**: See [`AI_SUMMARY.md`](AI_SUMMARY.md) for comprehensive architecture, state flow, and rules.
- **Framework**: Electron + React 18 + TypeScript + Vite + Tailwind CSS.
- **Backend / Main Process**: `electron/main.ts`, `electron/preload.ts`, `electron/webstore-preload.ts`, `electron/mcpServer.ts`.
- **Frontend / Renderer Process**: `src/main.tsx`, `src/App.tsx`, `src/components/`, `src/services/`.
- **Standalone Tools**: `mcp-bridge.ts`, `tests/runAll.ts`.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Main Process Security & Leaks | Fix unbounded `upgradedUrls` Set memory leak in `electron/main.ts`, fix redundant `context-menu` listeners, tighten MCP CORS headers | M1 | survey | DONE |
| 2 | Renderer Crash Guarding | Add global React `<ErrorBoundary>` in `src/main.tsx`, fix `btoa` Unicode URL crash in `ReaderMode.tsx`, add safe null-guards for `tab.url` in `BrowserView.tsx`, wrap startup `JSON.parse` in try/catch in `App.tsx` | M1 | survey | DONE |
| 3 | MCP Bridge & TS Alignment | Fix TS2339 error in `mcp-bridge.ts` (`eventsource` import), add null-guards for MCP tool arguments in `App.tsx` and `aiAgent.ts` | M1 | survey | DONE |
| 4 | E2E Test Suite Harness | Wire `tests/runAll.ts` to execute tests in `tests/e2e/` so `npm test` runs full automated verification | M2 | survey | DONE |
| 5 | Build & Compilation Verification | Ensure `npm run build` succeeds with 0 TypeScript compilation errors | M2 | survey | DONE |
| 6 | Runtime Stability & Forensic Audit | Verify Electron main process runtime stability and perform Lead Forensic Integrity Audit | M3 | survey | DONE |
| 7 | Git Commit & Push Release | Commit all verified changes to local `main` branch and push to `origin/main` on GitHub | M4 | survey | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend & Renderer Bug Fixes | Fix main process leaks, security headers, renderer crash vectors, and TS error in mcp-bridge.ts | none | DONE |
| M2 | Test Harness & Build Verification | Wire `tests/runAll.ts` to run E2E test suite, verify `npm run build` passes with 0 TS errors and `npm test` passes 100% | M1 | DONE |
| M3 | Runtime Stability & Forensic Audit | Perform main process runtime stability check and Forensic Integrity Audit (verdict CLEAN) | M2 | DONE |
| M4 | Git Commit & Push Release | Commit verified changes to `main` branch and push to `origin/main` | M3 | DONE |

## Interface Contracts
### Main Process ↔ Renderer Process
- IPC Channels: `mcp:action`, `reader:toggle`, `url:upgrade`, `store:get`, `store:set`, `app:get-path`
- Validation: All IPC arguments must be validated for type and non-null prior to processing.

## Code Layout
- `electron/`: Main process entry point, preloads, MCP server.
- `src/`: Renderer React application, UI components, state, services.
- `tests/`: End-to-end test cases and test runner.
- `mcp-bridge.ts`: Standalone script for MCP communication.
