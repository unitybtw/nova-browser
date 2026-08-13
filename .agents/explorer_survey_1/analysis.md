# Nova Browser — Codebase & Build System Analysis

**Date:** 2026-08-12  
**Explorer:** Explorer 1 (Codebase & Build Explorer)  
**Working Directory:** `/Users/siracsimsek/Desktop/novabrowser/.agents/explorer_survey_1`  

---

## Executive Summary

- **Primary Project Build (`npm run build`)**: Pass (0 TypeScript errors, 0 Vite build errors, 0 esbuild errors).
- **Subpackage Build (`website`)**: Pass (0 TypeScript errors, 0 Vite build errors).
- **TypeScript Errors (`npx tsc --noEmit`)**:
  - `src/` & `electron/` (covered by root `tsconfig.json`): **0 errors**.
  - `mcp-bridge.ts` (outside `tsconfig.json` include list): **1 TypeScript error** (`TS2339` on `EventSourceLib.default`).
- **Test System (`npm run test`)**: Passes technically, but `tests/runAll.ts` and `tests/e2e/*.ts` are stubbed implementations that do not execute real test suites.

---

## 1. Project Structure & Architecture

Nova Browser is an Electron-based web browser built with React 18, TypeScript, Tailwind CSS v4, Framer Motion, and WebLLM for local AI capabilities.

### Directory Layout

```
novabrowser/
├── electron/                   # Electron Main Process & Preload scripts
│   ├── blocked-domains.json    # Initial phishing / adblock domain list
│   ├── main.ts                 # Main process lifecycle, window creation, IPC handlers
│   ├── mcpServer.ts            # MCP (Model Context Protocol) server implementation
│   ├── preload.ts              # Electron preload script (IPC bridge exposure)
│   └── webstore-preload.ts     # Preload for Chrome Web Store extension installation
├── src/                        # React 18 Renderer Application
│   ├── App.tsx                 # Main UI layout & state orchestration
│   ├── main.tsx                # Entry point
│   ├── vite-env.d.ts           # Vite env types
│   ├── components/             # 24 UI components (omnibox, tabs, modals, preview, etc.)
│   ├── hooks/                  # Custom React hooks (useModalFocusTrap)
│   ├── services/               # Services (agentOrchestrator, aiAgent, aiMemory, aiWorker, tts)
│   ├── types/                  # TypeScript interface definitions (browser.ts)
│   ├── utils/                  # Utility functions (searchEngine, securityUtils)
│   └── workers/                # Web workers (aiWorker.ts)
├── tests/                      # E2E & unit test directory
│   ├── e2e/                    # Tier 1-5 test stub files
│   ├── harness/                # Test harness (browserHarness, domEnv, electronHarness, testRunner)
│   ├── empirical_harness.ts
│   ├── runAll.ts               # Runner script
│   └── sample.ts
├── website/                    # Promotional/Marketing website (React 19, Vite, Tailwind)
├── website-v2/                 # Empty directory
├── mcp-bridge.ts               # Standalone MCP Stdio-to-SSE bridge tool
├── mcp-bridge.mjs              # Compiled/ESM version of mcp-bridge
├── package.json                # Project dependencies, scripts, Electron Builder config
├── tsconfig.json               # Root TypeScript compiler configuration
└── vite.config.ts              # Vite bundling config for renderer process
```

---

## 2. Dependencies & Build Tools

### Package Metadata (`package.json`)
- **Name**: `nova-browser` (v1.0.7)
- **Module Format**: `"type": "module"`
- **Electron Main Entry**: `"main": "dist-electron/main.cjs"`

### Primary Build Pipeline
1. **TypeScript Check**: `tsc --noEmit` (invoked as `tsc` in `"build": "tsc && vite build && npm run build:electron"`).
2. **Renderer Build**: `vite build` using `@vitejs/plugin-react` and `@tailwindcss/vite`. Output goes to `dist/`. Minified via `terser`.
3. **Electron Main/Preload Build**: `esbuild` compiling `electron/main.ts`, `electron/preload.ts`, and `electron/webstore-preload.ts` into CommonJS bundles (`.cjs`) in `dist-electron/`.
4. **Packaging**: `electron-builder` (macOS DMG & Windows NSIS installers).

### Key Dependencies
- `electron` (v33.2.1)
- `@cliqz/adblocker-electron` (v1.34.0)
- `@mlc-ai/web-llm` (v0.2.84)
- `@modelcontextprotocol/sdk` (v1.29.0)
- `@mozilla/readability` (v0.6.0)
- `express` (v5.2.1)
- `framer-motion` (v12.42.2)
- `lucide-react` (v0.469.0)
- `react` / `react-dom` (v18.3.1)
- `typescript` (v5.6.2)
- `vite` (v6.0.5)

---

## 3. TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "electron"]
}
```

### Key Observation on Scope
`tsconfig.json` explicitly limits `"include"` to `["src", "electron"]`. Consequently, files outside these folders (`mcp-bridge.ts`, `tests/**/*.ts`) are ignored during standard `npm run build` / `tsc` checks.

---

## 4. Comprehensive Compilation & Error Analysis

### Category A: Core Application Build (`npm run build`)
- **Status**: **PASS** (Exit code 0)
- **TypeScript Errors in `src/` and `electron/`**: **0**
- **Vite Renderer Build**: Success (generated `dist/index.html` and 6 bundle chunks in 8.38s).
- **Esbuild Main Process Build**: Success (generated `dist-electron/main.cjs` [966KB], `dist-electron/preload.cjs` [6.2KB], `dist-electron/webstore-preload.cjs` [12KB] in 39ms).

### Category B: Subpackage Build (`website/`)
- **Status**: **PASS** (Exit code 0)
- `cd website && npm run build` executes `tsc -b && vite build` without errors.

### Category C: Unindexed Files TypeScript Errors (`mcp-bridge.ts`)
- **Status**: **1 TypeScript Error**

| File Path | Line & Column | Error Code | Error Description | Root Cause |
|---|---|---|---|---|
| `mcp-bridge.ts` | Line 11, Col 46 | `TS2339` | Property 'default' does not exist on type 'typeof import(".../eventsource")' | `eventsource` types under bundler resolution export module directly rather than having a `.default` property on namespace import |

**Code Snippet (`mcp-bridge.ts` line 11):**
```ts
(global as any).EventSource = EventSourceLib.default || EventSourceLib;
```

### Category D: Test Suite Execution (`npm run test`)
- **Status**: Passes technical execution, but test coverage is **incomplete/stubbed**.
- `npm run test` executes `esbuild tests/runAll.ts ... && node dist-test/runAll.cjs`.
- `tests/runAll.ts` contains only: `console.log('Executing all test suites...');`.
- `tests/e2e/tier1_feature_coverage.test.ts` through `tier5_adversarial_stress.test.ts` contain placeholder log messages and are not wired into `runAll.ts`.

---

## Summary Table of Issues Found

| Issue ID | Severity | File / Component | Category | Description |
|---|---|---|---|---|
| ERR-001 | Low | `mcp-bridge.ts:11` | Type Error | `TS2339`: `Property 'default' does not exist on type 'typeof import("eventsource")'`. Uncovered by root `tsconfig.json`. |
| ERR-002 | Low | `tests/runAll.ts` & `tests/e2e/` | Test Infrastructure | Test suites are stubs and not executed by `npm run test`. |
| INF-001 | Info | `website-v2/` | Cleanliness | Empty directory present in project root. |
