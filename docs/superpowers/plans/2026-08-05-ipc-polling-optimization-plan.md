# Optimize React/Electron IPC Polling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate redundant `setInterval` polling in core React components by relying on existing IPC event listeners.

**Architecture:** Remove `setInterval` loops inside `useEffect` hooks across React components (`App.tsx`, `TopBar.tsx`, `SettingsPage.tsx`, `BrowserView.tsx`, `SidePanel.tsx`), ensuring they fetch state once on mount and subsequently rely solely on Electron IPC events for updates.

**Tech Stack:** React, Electron IPC, TypeScript, Vite

## Global Constraints

- No `setInterval` should be used for fetching IPC data.
- Ensure the application still builds successfully with `npm run build` after modifications.

---

### Task 1: Remove Polling in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: N/A
- Produces: N/A

- [ ] **Step 1: Write the failing test**

We don't have unit tests for this specific hook, but we can verify build failure if we break syntax.
```bash
# We will rely on TypeScript compiler to catch syntax errors
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build` (This passes initially, we are doing a refactor)
Expected: PASS

- [ ] **Step 3: Write minimal implementation**

Modify `src/App.tsx`. Locate the `setInterval` calls inside `useEffect` (around lines 180 and 478).
Remove `const interval = setInterval(fetchExtensions, 3000);` and `clearInterval(interval);`. Keep the `fetchExtensions();` initial call and the `cleanup` function for `onExtensionChanged`.
Remove any other `setInterval` fetching IPC data.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "perf: remove setInterval polling from App.tsx"
```

---

### Task 2: Remove Polling in TopBar.tsx

**Files:**
- Modify: `src/components/TopBar.tsx`

**Interfaces:**
- Consumes: N/A
- Produces: N/A

- [ ] **Step 1: Write the failing test**

```bash
# Rely on TypeScript build
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Write minimal implementation**

Modify `src/components/TopBar.tsx`. Locate `const iv = setInterval(fetchMcp, 3000);` inside the `useEffect`.
Remove the `setInterval` and `clearInterval(iv)`. Ensure `fetchMcp()` is still called once on mount and the `onMcpClientChanged` listener remains intact.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/TopBar.tsx
git commit -m "perf: remove setInterval polling from TopBar.tsx"
```

---

### Task 3: Remove Polling in SettingsPage.tsx

**Files:**
- Modify: `src/components/SettingsPage.tsx`

**Interfaces:**
- Consumes: N/A
- Produces: N/A

- [ ] **Step 1: Write the failing test**

```bash
# Rely on TypeScript build
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Write minimal implementation**

Modify `src/components/SettingsPage.tsx`. Locate `setInterval(fetchMcpStatus, 2000)` and remove it along with its `clearInterval`. Keep the initial fetch and any event listeners.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/SettingsPage.tsx
git commit -m "perf: remove setInterval polling from SettingsPage.tsx"
```

---

### Task 4: Remove Polling in BrowserView.tsx & SidePanel.tsx

**Files:**
- Modify: `src/components/BrowserView.tsx`
- Modify: `src/components/SidePanel.tsx`

**Interfaces:**
- Consumes: N/A
- Produces: N/A

- [ ] **Step 1: Write the failing test**

```bash
# Rely on TypeScript build
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Write minimal implementation**

Modify `src/components/BrowserView.tsx` and remove any `setInterval` that polls IPC data.
Modify `src/components/SidePanel.tsx` and remove any `setInterval` that polls IPC data.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/BrowserView.tsx src/components/SidePanel.tsx
git commit -m "perf: remove setInterval polling from BrowserView and SidePanel"
```
