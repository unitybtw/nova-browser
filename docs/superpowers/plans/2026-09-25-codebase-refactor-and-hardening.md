# Codebase Refactor & Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modularize monolithic god-files (`electron/main.ts` and `src/components/TopBar.tsx`), eliminate Electron/Node deprecation warnings, harden IPC webContents lifecycle checks against race conditions, and optimize AI/tab memory management.

**Architecture:** 
1. Extract adblock logic from `electron/main.ts` into a dedicated controller (`electron/main/adblockManager.ts`).
2. Add upstream third-party deprecation warning filtering and strong typing in `electron/main.ts`.
3. Extract reusable window and navigation control clusters from `src/components/TopBar.tsx` into modular sub-components.
4. Strengthen WebLLM idle parking and tab hibernation lifecycle synchronization to prevent memory leaks and zombie webContents references.

**Tech Stack:** Electron 43, React 18/19, TypeScript, Vite, WebLLM, Tailwind CSS.

## Global Constraints
- Preserve all existing functionality and ensure 100% test pass rate (`npm test`).
- Maintain strict IPC sender validation (`isTrustedSender`).
- Run `graphify update .` after code modifications.
- Zero TypeScript compiler errors on `npm run build:electron` and `npm run build`.

---

### Task 1: Deprecation Warning Filtering & IPC WebContents Destruction Hardening

**Files:**
- Modify: `electron/main.ts`

**Interfaces:**
- Consumes: Node `process.on('warning')`, Electron `ipcMain.handle`
- Produces: Clean process startup without deprecated warning noise, type-safe `open-extension-popup` handler, guarded `webContents.isDestroyed()` calls.

- [ ] **Step 1: Add upstream third-party deprecation warning filter in `electron/main.ts`**
Add process warning filter after process crash handlers to silence upstream third-party deprecation notices (`punycode`, `url.parse`, `getPreloads`, `setPreloads`).

- [ ] **Step 2: Strongly type and validate `open-extension-popup` in `electron/main.ts`**
Replace untyped `(url, bounds, activeTabInfo)` parameters with `unknown` and runtime type guards.

- [ ] **Step 3: Verify with build**
Run: `npm run build:electron`
Expected: 0 errors, successful build.

---

### Task 2: Modularize Adblock Engine into `electron/main/adblockManager.ts`

**Files:**
- Create: `electron/main/adblockManager.ts`
- Modify: `electron/main.ts`

**Interfaces:**
- Consumes: `@cliqz/adblocker-electron`, `app.getPath('userData')`, `Electron.Session`
- Produces: `initAdBlocker()`, `updateAdblockWhitelist()`, `applyAdBlockerToAllSessions()`, `getBlocker()`.

- [ ] **Step 1: Create `electron/main/adblockManager.ts`**
Encapsulate blocker instance, cache management, captcha whitelist rules, and session attachment logic.

- [ ] **Step 2: Update `electron/main.ts` to import and consume `adblockManager.ts`**
Remove duplicate code and connect IPC handlers and session hardening to the new manager.

- [ ] **Step 3: Verify tests and electron build**
Run: `npm test && npm run build:electron`
Expected: 100% tests pass.

---

### Task 3: Modularize TopBar Navigation Controls

**Files:**
- Create: `src/components/topbar/WindowControls.tsx`
- Modify: `src/components/TopBar.tsx`

**Interfaces:**
- Consumes: Window control IPC (`minimize`, `maximize`, `close`, `isMaximized`, `platform`)
- Produces: Clean standalone `<WindowControls />` component reducing `TopBar.tsx` clutter.

- [ ] **Step 1: Create `src/components/topbar/WindowControls.tsx`**
Extract platform-aware minimize/maximize/close window controls with proper styling and event handlers.

- [ ] **Step 2: Refactor `TopBar.tsx` to use `WindowControls`**
Replace inline window control buttons with `<WindowControls />`.

- [ ] **Step 3: Verify React build**
Run: `npm run build`
Expected: 0 TypeScript errors.

---

### Task 4: Memory & AI Watchdog Hardening

**Files:**
- Modify: `src/services/aiAgent.ts`
- Modify: `src/hooks/useTabHibernation.ts`

**Interfaces:**
- Consumes: Tab hibernation settings, WebLLM engine status
- Produces: Guaranteed background memory release on idle and error resiliency.

- [ ] **Step 1: Check and optimize AI Agent auto-park timeout and tab hibernation hooks**
Ensure tab hibernation does not trigger extraneous state updates when no candidates need suspending.

- [ ] **Step 2: Verify test suite**
Run: `npm test`
Expected: 37/37 regression tests + 23/23 empirical tests pass (total 60/60).

---

### Task 5: Knowledge Graph Update & Git Commit

**Files:**
- Run: `graphify update .`
- Commit and verify branch status.

- [ ] **Step 1: Run knowledge graph update**
Run: `graphify update .`

- [ ] **Step 2: Run all builds and tests**
Run: `npm test && npm run build`

- [ ] **Step 3: Commit changes**
`git add -A && git commit -m "refactor: modularize adblocker, extract window controls, harden IPC and suppress upstream deprecations"`
