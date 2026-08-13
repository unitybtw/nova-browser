# Nova Browser Electron Backend & Security Survey Report

## Executive Summary
This document presents the detailed architectural and security investigation of Nova Browser's Electron main process, IPC layer, Webview sandbox configuration, extension system, MCP server, and privacy safeguards.

Overall, Nova Browser implements a highly conscious security architecture with explicit webview sandboxing, context isolation, permission restriction dialogs, path traversal checks on IPC file operations, and phishing detection heuristics. However, several specific edge cases, memory management concerns, and structural risks were identified.

---

## 1. Electron Main Process & Security Architecture

### 1.1 WebPreferences & Sandbox Configurations
- **Main Window (`electron/main.ts:102-108`)**:
  ```ts
  webPreferences: {
    preload: path.join(__dirname, 'preload.cjs'),
    nodeIntegration: false,
    contextIsolation: true,
    webviewTag: true,
    sandbox: true
  }
  ```
  - `nodeIntegration` disabled, `contextIsolation` enabled, `sandbox` enabled.
  - Drag and drop navigation restricted via `will-navigate` event listener (`main.ts:112-118`).
- **Webviews (`electron/main.ts:453-462`)**:
  ```ts
  contents.on('will-attach-webview', (event, webPreferences, params) => {
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInWorker = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.contextIsolation = true;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.experimentalFeatures = false;
  });
  ```
  - Enforces strict isolation for guest web content. Local `file://` navigation is explicitly blocked in `will-navigate` (`main.ts:475-479`).

### 1.2 Permission Management & Requests
- **Request Handler (`main.ts:273-309`)**:
  - `session.defaultSession.setPermissionRequestHandler` intercepts active permission requests (camera, mic, geolocation, notifications, clipboard).
  - Internal origins (`nova://`, `http://localhost:5173`, `devtools://`) auto-allowed.
  - External origins prompt user via `dialog.showMessageBox` (default button ID set to `1` - Block).
- **Check Handler (`main.ts:311-321`)**:
  - `session.defaultSession.setPermissionCheckHandler` denies silent permission queries from external origins to prevent permission-based browser fingerprinting.

### 1.3 Popup & Navigation Enforcement
- **Window Open Handler (`main.ts:465-470`)**:
  - `contents.setWindowOpenHandler` denies popup windows (`action: 'deny'`) and redirects HTTP/HTTPS requests to `mainWindow.webContents.send('new-tab', url)`.

---

## 2. IPC Communication & Preload Security

### 2.1 Preload Script Design (`electron/preload.ts`)
- `contextBridge.exposeInMainWorld('electronAPI', ...)` securely bridges main and renderer.
- Event listeners return cleanup functions (`return () => ipcRenderer.removeListener(...)`) to prevent listener leaks in React components.

### 2.2 Input Sanitization & Validation in IPC Handlers
- **File System Operations (`store-set`, `store-get`, `secure-store-set`, `secure-store-get`)**:
  - Validated with key regex check `/^[a-zA-Z0-9_-]+$/` to prevent path traversal (`main.ts:775`, `790`, `807`, `819`).
- **Downloads Access (`open-download`, `show-download-in-folder`)**:
  - Checks `pathStr.startsWith(downloadsPath) && fs.existsSync(pathStr)` (`main.ts:710`, `717`).
- **HTML Fetching (`fetch-page-html`)**:
  - SSRF protection: Validates scheme is `http:` or `https:`.
  - Content sanitization: Strips `<script>`, `<style>`, `<svg>`, and HTML comments before returning string across IPC to prevent UI freezes.

---

## 3. Special Features Security & Vulnerability Analysis

### 3.1 Model Context Protocol (MCP) Server (`electron/mcpServer.ts`)
- **Transport**: Express HTTP server running on `127.0.0.1:3020`.
- **Authentication**: Bearer Token stored in `userData/nova-mcp-token`.
- **CORS (`mcpServer.ts:477-482`)**:
  - CORS header `Access-Control-Allow-Origin: *` is set on all routes. Since authentication requires Bearer token, web apps cannot easily access endpoint without token, but `Origin: *` is overly permissive.
- **Sensitive Tool Exposure**:
  - `browser_run_js` allows executing arbitrary JS in renderer. Disabled by default in `DEFAULT_DISABLED_TOOLS = new Set(['browser_run_js'])`.

### 3.2 Webstore Preload & Chrome Extension Injection (`electron/webstore-preload.ts`)
- **Main World JS Execution**: Uses `webFrame.executeJavaScriptInIsolatedWorld(0, ...)` to spoof Chrome Web Store APIs (`window.chrome.webstore`).
- **Password Form Capture**: Intercepts password submissions and logs `NOVA_SAVE_PW::` to console, captured by `console-message` listener in `BrowserView.tsx`.

---

## 4. Identified Reliability & Runtime Issues

| Category | Finding Location | Description & Impact | Recommendation |
|---|---|---|---|
| **Memory Leak / Unbounded Growth** | `electron/main.ts:597-676` | `context-menu` event attaches a new `context-menu` listener on `app.on('web-contents-created')` for every web contents. | Move static context menu construction or clean up listeners on webContents destruction. |
| **Set Memory Leak** | `electron/main.ts:264` | `upgradedUrls` `Set<string>` grows indefinitely across the lifetime of the browser process. | Bound set size or clear periodically. |
| **CORS Policy on Local Server** | `electron/mcpServer.ts:477` | Express MCP server returns `Access-Control-Allow-Origin: *`. | Restrict CORS origin check or validate Host header. |
| **Unhandled Promise Rejection Risk** | `electron/main.ts:76-84` | AdBlocker global initialization handles `on('request-blocked')`, but `ElectronBlocker.fromPrebuiltAdsAndTracking` error handling is absent if network fetch fails on cold boot. | Wrap blocklist fetch in explicit try/catch. |

---

## Conclusion
Nova Browser exhibits strong defensive defaults across Electron process boundaries. Mitigating the identified minor leaks and strengthening local server CORS will further harden the browser process against runtime degradation and unauthorized local access.
