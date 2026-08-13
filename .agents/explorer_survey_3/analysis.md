# Detailed Survey & Analysis Report — Explorer 3 (Renderer Process & Git Repository State)

**Date**: 2026-08-12  
**Explorer**: Explorer 3 (Renderer & Git State Explorer)  
**Target Project**: Nova Browser (`/Users/siracsimsek/Desktop/novabrowser`)  

---

## 1. Executive Summary

This report presents a thorough survey of the frontend/renderer process logic, React UI components, state management stores, custom hooks, IPC interaction handlers, and Git repository state for Nova Browser.

**Key Discoveries**:
1. **Git State**: Clean workspace with respect to source files. Currently on `main` branch, fully synced with `origin/main` (`5e4e9ae17f2cb399842f7749f31b36734b3883fc`). Uncommitted changes are limited to project metadata files (`.agents/`, `.codex/`, `.github/`, `PRODUCT.md`, `docs/`, `update-mockups.js`).
2. **Renderer Architecture**: Modular React 18 SPA built with Vite, TypeScript, Framer Motion, and Tailwind CSS. Tab and session state is managed via React hooks in `App.tsx` and persisted to `localStorage`.
3. **Runtime Crash Risks Identified**:
   - **Missing React Error Boundaries**: No `<ErrorBoundary>` wrapping `<App />` in `main.tsx` or key UI sections; component render errors cause an immediate unrecoverable white screen.
   - **Unicode URL Crash in Reader Mode**: `btoa(url)` in `src/components/ReaderMode.tsx` throws a fatal `DOMException` on URLs containing non-ASCII / Unicode characters.
   - **Unsafe Property Access on `tab.url`**: Direct `.startsWith()` calls in `src/components/BrowserView.tsx` without null/undefined checks.
   - **Unguarded `JSON.parse` on Startup**: Direct `JSON.parse()` calls on `localStorage` values in `App.tsx` (`user_settings`, `browsing_history`, `bookmarks`) cause startup crashes if storage is corrupted.
   - **Unhandled Rejections in MCP Bridge & AI Agent**: Missing null-checks on tool call arguments in `executeMcpAction` and unguarded `JSON.parse` on error strings in `aiAgent.ts`.

---

## 2. Git Repository State Audit

| Audit Aspect | Findings / Observations |
| :--- | :--- |
| **Current Branch** | `main` (`* main`) |
| **Remote Branches** | `origin/main`, `origin/HEAD` |
| **Remote URL** | `https://x-access-token:ghp_***@github.com/unitybtw/nova-browser.git` |
| **Latest Commit** | `5e4e9ae17f2cb399842f7749f31b36734b3883fc` — *Docs: change logo border-radius to 50% for a perfect circle* |
| **Sync Status** | Up-to-date with `origin/main` (`## main...origin/main`) |
| **Working Tree Cleanliness** | Source code (`src/`, `package.json`, `tsconfig.json`) is **100% clean**. Untracked/modified files are agent metadata and docs (`.agents/`, `.codex/`, `.github/`, `PRODUCT.md`, `docs/superpowers/specs/`, `update-mockups.js`). |

---

## 3. Renderer Architecture Survey

### 3.1 Component Hierarchy & Layout Structure
- **Entry point**: `src/main.tsx` -> renders `<App />` inside `<React.StrictMode>`.
- **Root Component**: `src/App.tsx` (~1985 lines) manages global state and top-level layout:
  - **Top Bar / Navigation**: `src/components/TopBar.tsx` (horizontal tab bar, omnibox, navigation buttons, action icons).
  - **Vertical Sidebar**: `src/components/SidebarTabs.tsx` (alternative tab bar with workspace switching and folder support).
  - **Browser View Container**: `src/components/BrowserView.tsx` (renders `<webview>` tags for external web content, or internal React views for internal pages `nova://*`).
  - **AI Assistant Side Panel**: `src/components/SidePanel.tsx` (WebGPU AI agent chat interface).
  - **Modals & Popovers**:
    - `SpotlightOmnibox.tsx` (quick switcher / command palette)
    - `WorkspaceManager.tsx` (workspace creation & switching)
    - `ReaderMode.tsx` (distraction-free reader view with Web Speech TTS and highlights)
    - `SettingsPage.tsx` (`nova://settings` tab view)
    - `HistoryPage.tsx` (`nova://history` tab view)
    - `DownloadsPage.tsx` (`nova://downloads` tab view) & `DownloadsPopover.tsx`
    - `ExtensionsModal.tsx` & `PasswordPromptModal.tsx`
    - `ShareModal.tsx` & `ScreenshotModal.tsx`
    - `VpnPopover.tsx` & `AdBlockerPopover.tsx`
    - `UpdateToast.tsx` & `AICursorOverlay.tsx`

### 3.2 State Management & Persistence
- Global state resides in `App.tsx` using `useState` hooks:
  - `tabs: Tab[]`
  - `activeTabId: string`
  - `folders: Folder[]`
  - `workspaces: Workspace[]`
  - `settings: UserSettings`
  - `bookmarks: Bookmark[]`
  - `history: HistoryItem[]`
  - `downloads: DownloadItem[]`
- Persistence layer: `localStorage` is used for saving and loading state across sessions:
  - `user_settings`
  - `browsing_history`
  - `bookmarks`
  - `tabs_session`
  - `folders_session`
  - `workspaces_session`
  - `active_tab_session`
  - `active_workspace_session`
  - `nova_vpn`
  - `nova_onboarding_complete`

---

## 4. In-Depth Identification of Renderer Crash Risks & Bugs

### Risk 1: Missing React Error Boundaries (High Severity)
- **Files**: `src/main.tsx:6-10`, `src/App.tsx`
- **Mechanism**: React 18 unmounts the entire component tree if an unhandled JS error occurs during render. Since `<App />` is rendered directly in `main.tsx` without an `<ErrorBoundary>` component, any unhandled exception in any component (or child tab) results in a blank white screen in Electron.
- **Evidence**:
  ```tsx
  // src/main.tsx
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  ```

### Risk 2: `btoa(url)` Character Encoding Crash in Reader Mode (High Severity)
- **Files**: `src/components/ReaderMode.tsx` (lines 78 & 206)
- **Mechanism**: Reader Mode constructs a storage key for highlights using `btoa(url)`:
  ```tsx
  const storageKey = 'reader_highlights_' + btoa(url);
  ```
  In JavaScript, `btoa()` only accepts Latin1 characters (ASCII up to 0xFF). If the URL contains non-ASCII characters (e.g. Unicode search queries, non-English URLs, Turkish/German/Japanese path names), `btoa()` throws: `DOMException: Failed to execute 'btoa' on 'Window': The string to be encoded contains characters outside of the Latin1 range.`
- **Impact**: Instant crash of the ReaderMode component whenever opened on Unicode URLs.

### Risk 3: Unsafe Direct Property Access on `tab.url` (High Severity)
- **Files**: `src/components/BrowserView.tsx` (lines 91, 95, 99, line 718)
- **Mechanism**:
  ```tsx
  const isSettingsTab = React.useMemo(() => (
    tab.url.startsWith('nova://settings') || tab.url.startsWith('about:settings')
  ), [tab.url]);
  ```
  Line 62 uses `getSafeUrl(tab.url)` for webview src, but lines 91, 95, 99 and the `React.memo` comparator at line 718 access `tab.url.startsWith(...)` directly. If a `tab` object has `url` as `undefined` or `null` (e.g. dynamically generated tab or blank state), calling `.startsWith()` throws `TypeError: Cannot read properties of undefined (reading 'startsWith')`.

### Risk 4: Unguarded `JSON.parse` in Startup State Loaders (Medium-High Severity)
- **Files**: `src/App.tsx` (line 220, line 323, line 465)
- **Mechanism**: Initial state values for `settings`, `history`, and `bookmarks` are parsed from `localStorage` directly:
  ```tsx
  // line 220:
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('user_settings');
    return saved ? JSON.parse(saved) : { ... };
  });
  ```
  If `user_settings`, `browsing_history`, or `bookmarks` in `localStorage` contains invalid or corrupted JSON, `JSON.parse(saved)` throws an unhandled `SyntaxError` during initial `App` render, causing the application to fail at startup with a white screen.

### Risk 5: Nullability & Type Errors in MCP Action Bridge (`executeMcpAction`) (Medium Severity)
- **Files**: `src/App.tsx` (lines 823-1089)
- **Mechanism**: `(window as any).executeMcpAction` dispatches tool calls from main process to renderer handlers. In tools such as `browser_navigate`:
  ```tsx
  case 'browser_navigate':
    handleNavigate(args.url);
    return `Navigated to ${args.url}`;
  ```
  `handleNavigate` (line 790) immediately calls `url.startsWith(...)`. If `args` or `args.url` is `undefined`, this throws `TypeError: Cannot read properties of undefined (reading 'startsWith')` in the promise chain. Similar missing null checks exist for `args.selector`, `args.text`, `args.key`, `args.tabId` across all MCP cases.

### Risk 6: Unhandled `JSON.parse` on Script Result Error Strings in AI Agent (Medium Severity)
- **Files**: `src/services/aiAgent.ts` (lines 440, 491, 498, 503)
- **Mechanism**:
  In `handleToolCall`:
  ```tsx
  const data = await this.actionContext.onExecuteScript(DOM_SCAN_SCRIPT);
  result = { success: true, pageData: JSON.parse(data) };
  ```
  If `onExecuteScript` returns an error message string (e.g. `"Error: Cannot read page content in web development mode..."`), `JSON.parse(data)` throws an unhandled `SyntaxError`, interrupting the AI agent loop.

### Risk 7: Re-entrant State Clear in `agentOrchestrator` (Low-Medium Severity)
- **Files**: `src/components/SidePanel.tsx` (lines 55-60)
- **Mechanism**: `SidePanel.tsx` listens to orchestrator updates and calls `orchestrator.clearQueue()` directly inside the subscriber callback if `completedActions.length > 5`. Calling `clearQueue()` wipes all resolvers and queued actions (including pending/executing ones) for concurrent actions and triggers recursive subscriber notifications.

---

## 5. Summary of Recommended Fixes

1. **Add React ErrorBoundary**: Wrap `<App />` in `src/main.tsx` with a top-level `ErrorBoundary` component that displays a graceful error fallback UI with a reload button.
2. **Fix `btoa(url)` in Reader Mode**: Replace `btoa(url)` in `ReaderMode.tsx` with safe base64 encoding (e.g. `btoa(encodeURIComponent(url))` or SHA-256 hash).
3. **Safe Access on `tab.url`**: Change `tab.url.startsWith(...)` to `(tab.url || '').startsWith(...)` in `BrowserView.tsx`.
4. **Guard `JSON.parse` on LocalStorage**: Wrap all `localStorage` state initializers in `App.tsx` in `try...catch` blocks with safe fallback defaults.
5. **Sanitize MCP Tool Arguments**: Add default object/string guards for `args` and `args.url` / `args.selector` in `executeMcpAction`.
6. **Guard AI Agent `JSON.parse`**: Use helper functions to safely parse script outputs and tool arguments in `aiAgent.ts`.

---

*Report prepared by Explorer 3 (Renderer & Git State Explorer).*
