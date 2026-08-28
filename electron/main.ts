console.log('Main process starting...');
import { app, BrowserWindow, ipcMain, session, dialog, webContents, shell, nativeTheme, safeStorage, Menu } from 'electron';
import path from 'path';
import fetch from 'cross-fetch';
import dns from 'dns';
import { promisify } from 'util';
import fs from 'fs';
import child_process from 'child_process';
import crypto from 'crypto';
import { ElectronBlocker, parseFilter } from '@cliqz/adblocker-electron';
import { BrowserMCPServer } from './mcpServer.js';
import { initMcpBridge } from './main/mcpBridge.js';
import { initDownloads, markNextDownloadAsSaveAs, registerDownloadsManager } from './main/downloads.js';
import { initSuggestions } from './main/suggestions.js';
import { installFromWebstore, parseExtensionPermissions, formatPermissionsForDisplay } from './main/crxInstaller.js';
import { autoUpdater } from 'electron-updater';
import { initializeBlocklist, startPeriodicRefresh } from './main/blocklist.js';
import { isPrivateIP } from './main/ipAddress.js';

// Removed global User-Agent spoofing (VULN-24) to prevent cross-site fingerprinting.
// We still spoof User-Agent in onBeforeSendHeaders only for Chrome Web Store domains.

// Hardware acceleration config
try {
  const settingsPath = path.join(app.getPath('userData'), 'store_settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    if (settings.hardwareAcceleration === false) {
      app.disableHardwareAcceleration();
    }
  }
} catch (e) {}

// Advanced GPU Acceleration, Fast Network & Smooth Compositing flags
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-quic');
app.commandLine.appendSwitch('enable-tcp-fast-open');
app.commandLine.appendSwitch('enable-fast-unload');

// Platform-tailored high-performance graphics optimizations
if (process.platform === 'darwin') {
  // Apple Silicon & macOS Metal API for ultra-smooth 120Hz ProMotion compositing
  app.commandLine.appendSwitch('use-metal');
  app.commandLine.appendSwitch('enable-features', [
    'CanvasOopRasterization',
    'SmoothScrolling',
    'ParallelDownloading',
    'BackForwardCache',
    'CSSSubgrid',
    'WebAssemblySimd',
    'OverlayScrollbar',
    'BlinkSchedulerYield'
  ].join(','));
} else {
  // Windows / Linux GPU flags
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('enable-features', [
    'CanvasOopRasterization',
    'SmoothScrolling',
    'ParallelDownloading',
    'BackForwardCache',
    'CSSSubgrid',
    'WebAssemblySimd',
    'OverlayScrollbar',
    'BlinkSchedulerYield'
  ].join(','));
}

// Increase v8 memory limit if doing heavy Local AI tasks in WebWorkers
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

// Prevent Network Service crash on macOS if user cancels Keychain prompt during dev
if (!app.isPackaged) {
  app.commandLine.appendSwitch('password-store', 'basic');
  app.commandLine.appendSwitch('use-mock-keychain');
}

let mainWindow: BrowserWindow | null = null;
let blockedDomains: string[] = [];

// Initialize blocklist asynchronously (will be populated in app.whenReady)
// The initializeBlocklist function handles: local cache -> packaged fallback -> remote refresh
async function loadInitialBlocklist(): Promise<void> {
  blockedDomains = await initializeBlocklist();
  console.log(`[Main] Initial blocklist loaded: ${blockedDomains.length} domains`);
  
  // Start periodic refresh (daily)
  startPeriodicRefresh((updatedDomains) => {
    blockedDomains = updatedDomains;
    console.log(`[Main] Blocklist updated via periodic refresh: ${blockedDomains.length} domains`);
  });
}

// Safely send IPC to the main window; accessing .webContents on a destroyed window throws.
function sendToMainWindow(channel: string, payload?: unknown) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
  } catch (e) { /* window gone */ }
}

const PHISHING_KEYWORDS = [
  'login-secure', 'verify-account', 'account-verify', 'security-alert',
  'billing-update', 'account-suspended', 'at-risk', 'urgent-verify',
  'secure-login', 'identity-verify', 'recovery-team', 'prize-winner',
  'free-robux', 'free-bitcoin', 'nitro-free', 'wallet-recovery',
  'refund-2024', 'gift-card-free', 'survey-winner'
];

// 🔒 Security: Validate that IPC messages originate strictly from our trusted main UI window and main frame
function isTrustedSender(event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent): boolean {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (event.sender.id !== mainWindow.webContents.id) return false;
  // Electron supplies senderFrame for renderer IPC. Treat a missing frame as
  // untrusted instead of accepting an ambiguous sender context.
  if (!event.senderFrame || !mainWindow.webContents.mainFrame || event.senderFrame !== mainWindow.webContents.mainFrame) {
    return false;
  }
  return true;
}

// 🔒 Security: MCP browser_* tools are forwarded to the renderer over an
// 'mcp-action-request' IPC and awaited on a channel gated by isTrustedSender()
// below — never executed as injected JS in the privileged UI context.
initMcpBridge(isTrustedSender);

// 🔒 Security: Validate dev server and app internal page origins strictly
function isTrustedAppOrigin(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol === 'nova:' || parsed.protocol === 'devtools:') return true;
    // 🔒 Security: The Vite dev server is only trusted in unpackaged dev builds.
    if (!app.isPackaged && parsed.origin === 'http://localhost:5173') return true;
    if (parsed.protocol === 'file:') {
      const allowedPath = path.resolve(path.join(__dirname, '../dist/index.html'));
      const navPath = decodeURIComponent(parsed.pathname);
      return path.resolve(navPath) === allowedPath;
    }
    return false;
  } catch {
    return false;
  }
}

function isPhishing(urlStr: string) {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    
    if (PHISHING_KEYWORDS.some(kw => hostname.includes(kw))) return true;
    if (blockedDomains.some(blocked => hostname === blocked || hostname.endsWith('.' + blocked))) return true;
    
    return false;
  } catch {
    return false;
  }
}

let isPrivacyShieldEnabled = true;
let isDoNotTrackEnabled = true;
let blocker: ElectronBlocker | null = null;
let mcpServer: BrowserMCPServer | null = null;

let currentWhitelistFilters: any[] = [];

function updateAdblockWhitelist(whitelist: string[]) {
  if (!blocker || !Array.isArray(whitelist)) return;
  const cleanWhitelist = whitelist
    .filter(host => typeof host === 'string' && /^[a-zA-Z0-9.-]+$/.test(host.trim()))
    .map(host => host.trim().toLowerCase());
  const newFilters = cleanWhitelist.map(host => parseFilter(`@@||${host}^$document,script,stylesheet,image,subdocument,xmlhttprequest`)).filter(Boolean);
  
  blocker.update({
    newNetworkFilters: newFilters as any[],
    removedNetworkFilters: currentWhitelistFilters as any[]
  });
  
  currentWhitelistFilters = newFilters;
}

// Initialize AdBlocker globally so IPC can access it
// ⚡ Perf: cache the serialized engine on disk. Without `caching`, fromCached()
// just runs init() on every launch → re-downloads ~14 filter lists (~5-10MB)
// and re-parses ~80k filters each startup. Shape per @cliqz/adblocker typings:
// interface Caching { path: string; read: (path) => Promise<Uint8Array>; write: (path, buffer) => Promise<void> }
const ADBLOCKER_CACHE_PATH = path.join(app.getPath('userData'), 'adblocker-engine.cache');
const ADBLOCKER_CACHE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // refetch filter lists older than 3 days
ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
  path: ADBLOCKER_CACHE_PATH,
  read: async (p) => {
    // TTL: a stale engine silently decays blocking quality, so treat old
    // caches as missing — the library's .catch() then takes the refetch path.
    const stat = await fs.promises.stat(p);
    if (Date.now() - stat.mtimeMs > ADBLOCKER_CACHE_MAX_AGE_MS) {
      throw new Error('adblocker cache expired');
    }
    return fs.promises.readFile(p);
  },
  // Swallow write failures: if the disk is read-only/full, ad blocking must
  // still come up this session (a rejected write would leave blocker null).
  write: async (p, buffer) => {
    try { await fs.promises.writeFile(p, buffer); } catch { /* non-fatal */ }
  },
}).then((engine) => {
  blocker = engine;

  // Activate blocking immediately if the engine finished loading after window creation
  if (isPrivacyShieldEnabled) {
    try { blocker.enableBlockingInSession(session.defaultSession); } catch (e) { console.error('Failed to enable adblocking in default session:', e); }
    try { blocker.enableBlockingInSession(session.fromPartition('incognito')); } catch (e) { console.error('Failed to enable adblocking in incognito session:', e); }
  }

  // Batch ad-blocked notifications to avoid IPC flooding (can be 50-100+ per page)
  const pendingAdBlocks = new Map<number, number>();
  let adBlockFlushTimer: ReturnType<typeof setInterval> | null = null;
  
  blocker.on('request-blocked', (request: any) => {
    if (request.tabId) {
      pendingAdBlocks.set(request.tabId, (pendingAdBlocks.get(request.tabId) || 0) + 1);
      
      if (!adBlockFlushTimer) {
        adBlockFlushTimer = setInterval(() => {
          if (pendingAdBlocks.size === 0) {
            if (adBlockFlushTimer) clearInterval(adBlockFlushTimer);
            adBlockFlushTimer = null;
            return;
          }
          if (mainWindow && !mainWindow.isDestroyed()) {
            // Send batched counts as a single IPC message
            const batch = Object.fromEntries(pendingAdBlocks);
            mainWindow.webContents.send('ad-blocked-batch', batch);
            pendingAdBlocks.clear();
          }
          // Window temporarily unavailable (destroyed/recreating): keep the
          // pending counts so they are delivered with the next flush instead
          // of silently dropping the user's blocked-ads counters.
        }, 2000);
      }
    }
  });

  try {
    const settingsPath = path.join(app.getPath('userData'), 'store_adblocker_whitelist.json');
    if (fs.existsSync(settingsPath)) {
      const wl = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (Array.isArray(wl)) updateAdblockWhitelist(wl);
    }
  } catch(e) {}
}).catch((e) => console.error('Failed to initialize adblocker:', e));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    titleBarStyle: 'hidden',
    ...(process.platform === 'win32' ? {
      titleBarOverlay: {
        color: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#f8fafc',
        symbolColor: nativeTheme.shouldUseDarkColors ? '#94a3b8' : '#64748b',
        height: 44
      }
    } : {}),
    trafficLightPosition: { x: 14, y: 14 },
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: true
    }
  });

  // ⚡ Perf: don't paint a blank window while content loads — show once the
  // renderer is ready to paint, with a safety timeout in case 'ready-to-show'
  // never fires (e.g. dev-server retry loop failing for a while).
  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show();
  }, 3000);

  // 🔒 Security: Prevent Drag and Drop navigation on the main UI window
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Only allow navigation to localhost dev server origin or the specific dist/index.html in prod
    if (isTrustedAppOrigin(url)) {
      return;
    }
    event.preventDefault();
    console.warn('Blocked main window navigation to non-app path:', url);
  });

  // Webviews do not receive a global preload. The narrowly-scoped Web Store
  // preload is assigned during attachment after the destination is validated.

  // Apply AdBlocker to sessions (default and incognito)
  if (isPrivacyShieldEnabled && blocker) {
    try { blocker.enableBlockingInSession(session.defaultSession); } catch(e) {}
    try { blocker.enableBlockingInSession(session.fromPartition('incognito')); } catch(e) {}
  } else if (blocker) {
    try { blocker.disableBlockingInSession(session.defaultSession); } catch(e) {}
    try { blocker.disableBlockingInSession(session.fromPartition('incognito')); } catch(e) {}
  }

  // Privacy Shield: Reusable helper to attach privacy and security headers to a session
  function applyPrivacyHeadersToSession(targetSession: Electron.Session) {
    // Inject Do Not Track, Global Privacy Control & Chrome Web Store spoofing headers
    targetSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const requestHeaders = { ...details.requestHeaders };
      
      if (details.url.includes('chrome.google.com') || details.url.includes('chromewebstore.google.com')) {
        requestHeaders['sec-ch-ua'] = '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"';
        requestHeaders['sec-ch-ua-mobile'] = '?0';
        requestHeaders['sec-ch-ua-platform'] = '"macOS"';
        requestHeaders['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
      }

      if (isPrivacyShieldEnabled || isDoNotTrackEnabled) {
        requestHeaders['DNT'] = '1';
        requestHeaders['Sec-GPC'] = '1';
      }
      callback({ requestHeaders });
    });

    // Handle headers for WebGPU / WASM SharedArrayBuffer + CSP + X-Content-Type-Options
    targetSession.webRequest.onHeadersReceived((details, callback) => {
      let isDevLocalhost = false;
      let isAppFile = false;
      try {
        const parsed = new URL(details.url);
        // Security: dev-server COOP/COEP headers and dev CSP only apply in
        // unpackaged dev builds; a packaged app must never trust localhost:5173.
        if (!app.isPackaged && parsed.origin === 'http://localhost:5173') {
          isDevLocalhost = true;
        }
        if (parsed.protocol === 'file:') {
          isAppFile = true;
        }
      } catch {}

      // Perf: remote traffic only ever gets X-Content-Type-Options here (and
      // only when Privacy Shield is on) - skip cloning every response header and
      // building the map entirely when nothing would be added anyway.
      if (!isDevLocalhost && !isAppFile && !isPrivacyShieldEnabled) {
        callback({});
        return;
      }

      const responseHeaders: Record<string, string[]> = {};
      if (details.responseHeaders) {
        for (const [key, value] of Object.entries(details.responseHeaders)) {
          if (value) {
            responseHeaders[key] = Array.isArray(value) ? value : [value];
          }
        }
      }

      if (isDevLocalhost) {
        responseHeaders['Cross-Origin-Opener-Policy'] = ['same-origin'];
        responseHeaders['Cross-Origin-Embedder-Policy'] = ['credentialless'];
      }

      // VULN-16: Add Content Security Policy for the app's own pages
      if (isAppFile || isDevLocalhost) {
        const isDev = isDevLocalhost || !app.isPackaged;
        
        // Generate a cryptographically secure nonce for this request
        const nonce = crypto.randomBytes(16).toString('base64');
        const nonceAttr = `'nonce-${nonce}'`;
        
        responseHeaders['Content-Security-Policy'] = [
          isDev
            ? `default-src 'self'; script-src 'self' ${nonceAttr} 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: data: http://localhost:*; style-src 'self' ${nonceAttr} 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https: http:; connect-src 'self' ws: wss: http: https:; font-src 'self' data: https: https://fonts.gstatic.com; worker-src 'self' blob:; base-uri 'self' https: http:; frame-ancestors 'none';`
            : `default-src 'self'; script-src 'self' ${nonceAttr} 'wasm-unsafe-eval' blob:; style-src 'self' ${nonceAttr} 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https: http:; connect-src 'self' ws: wss: http: https:; font-src 'self' data: https: https://fonts.gstatic.com; worker-src 'self' blob:; base-uri 'self' https: http:; frame-ancestors 'none';`
        ];
        
        // Store nonce for potential use in preload/renderer (e.g., for inline scripts)
        responseHeaders['X-Content-Security-Policy-Nonce'] = [nonce];
      }

      if (isPrivacyShieldEnabled) {
        responseHeaders['X-Content-Type-Options'] = ['nosniff'];
      }
      callback({ responseHeaders });
    });
  }

  // Apply privacy and security headers across both standard and incognito sessions
  applyPrivacyHeadersToSession(session.defaultSession);
  applyPrivacyHeadersToSession(session.fromPartition('incognito'));

  // Downloads Manager: Handle file downloads via Electron IPC
  registerDownloadsManager(session.defaultSession);
  registerDownloadsManager(session.fromPartition('incognito'));

  const devUrl = 'http://localhost:5173';
  const distHtmlPath = path.join(__dirname, '../dist/index.html');

  if (app.isPackaged) {
    mainWindow.loadFile(distHtmlPath);
  } else {
    let attempts = 0;
    const maxAttempts = fs.existsSync(distHtmlPath) ? 2 : 20;
    const loadDev = () => {
      attempts++;
      mainWindow?.loadURL(devUrl).catch(() => {
        if (attempts >= maxAttempts) {
          // 🐛 Fix: terminate the retry loop after maxAttempts REGARDLESS of dist existence,
          // otherwise a missing dist/index.html causes infinite retries.
          if (fs.existsSync(distHtmlPath)) {
            console.log('[Main] Loading local dist/index.html build...');
            mainWindow?.loadFile(distHtmlPath);
          } else {
            console.error(`[Main] Dev server unreachable at ${devUrl} after ${maxAttempts} attempts and no dist/index.html build found. Giving up.`);
          }
        } else {
          setTimeout(loadDev, 300);
        }
      });
    };
    loadDev();
  }




  // Listen for console messages from the renderer process and log them safely to the terminal.
  // ⚡ Perf: dev-only value — skip regex-sanitizing/printing every renderer
  // console line entirely in packaged builds.
  if (!app.isPackaged) {
    mainWindow?.webContents.on('console-message', (event: any, ...rest: any[]) => {
      const level = typeof event?.level === 'number' ? event.level : (typeof rest[0] === 'number' ? rest[0] : 0);
      let message = typeof event?.message === 'string' ? event.message : (typeof rest[1] === 'string' ? rest[1] : (typeof event === 'string' ? event : ''));
      const line = typeof event?.lineNumber === 'number' ? event.lineNumber : (typeof rest[2] === 'number' ? rest[2] : 0);
      const sourceId = typeof event?.sourceId === 'string' ? event.sourceId : (typeof rest[3] === 'string' ? rest[3] : '');

      if (!message && typeof event === 'object' && event !== null && 'message' in event) {
        message = String(event.message);
      }

      // Sanitize any sensitive tokens, passwords or credential payloads from terminal logs
      if (message && (message.includes('NOVA_SAVE_PW') || /password|token|secret|apiKey/i.test(message))) {
        console.log(`[Renderer] [${level}] [REDACTED_SENSITIVE_LOG] (${sourceId}:${line})`);
        return;
      }
      if (message) {
        console.log(`[Renderer] [${level}] ${message} (${sourceId}:${line})`);
      }
    });
  }

  // ⌨️ App-local keyboard shortcuts via before-input-event.
  // Replaces the old system-wide globalShortcut hooks which intercepted Cmd+K/Cmd+F
  // even when OTHER apps were focused and shadowed the menu accelerators.
  // Cmd+F is intentionally NOT handled here: the Edit menu accelerator ("Find in Page...",
  // CmdOrCtrl+F) already covers it app-locally and emits the 'find' shortcut the renderer handles.
  mainWindow?.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.isAutoRepeat) return;
    const cmdOrCtrl = process.platform === 'darwin' ? input.meta : input.control;
    if (!cmdOrCtrl || input.alt || input.shift) return;
    if (input.key?.toLowerCase() === 'k') {
      event.preventDefault();
      sendToMainWindow('shortcut', 'toggle-omnibox');
    }
  });

  // Keep the MCP server pointed at the current window (macOS close/reopen creates a new BrowserWindow)
  if (mcpServer && mainWindow && !mainWindow.isDestroyed()) {
    try { mcpServer.setMainWindow(mainWindow); } catch (e) {}
  }
}

// Track URLs that failed HTTPS upgrade to prevent infinite loops with eviction cap (max 1000 items)
const MAX_UPGRADED_URLS = 1000;
const upgradedUrls = new Set<string>();

function addUpgradedUrl(url: string): void {
  if (upgradedUrls.size >= MAX_UPGRADED_URLS) {
    const oldest = upgradedUrls.values().next().value;
    if (oldest !== undefined) {
      upgradedUrls.delete(oldest);
    }
  }
  upgradedUrls.add(url);
}

function setupApplicationMenu() {
  const isMac = process.platform === 'darwin';

  if (isMac) {
    try {
      app.setAboutPanelOptions({
        applicationName: 'Nova Browser',
        applicationVersion: '1.1.0',
        version: '1.1.0',
        copyright: 'Copyright © 2026 Nova Browser. All rights reserved.',
        credits: 'Built with Electron, React, TypeScript, Web-LLM, and Model Context Protocol.',
        website: 'https://github.com/unitybtw/nova-browser'
      });
    } catch {}
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac ? [{
      label: app.name || 'Nova Browser',
      submenu: [
        {
          label: 'About Nova Browser',
          click: () => {
            if (isMac) {
              app.showAboutPanel();
            } else {
              sendToMainWindow('shortcut', 'open-help');
            }
          }
        },
        {
          label: 'Check for Updates...',
          click: () => {
            autoUpdater.checkForUpdatesAndNotify().catch(() => {});
            sendToMainWindow('shortcut', 'check-updates');
          }
        },
        { type: 'separator' as const },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            sendToMainWindow('shortcut', 'settings');
          }
        },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),
    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            sendToMainWindow('shortcut', 'new-tab');
          }
        },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            sendToMainWindow('shortcut', 'new-tab');
          }
        },
        {
          label: 'New Incognito Tab',
          accelerator: 'Shift+CmdOrCtrl+N',
          click: () => {
            sendToMainWindow('shortcut', 'new-incognito');
          }
        },
        {
          label: 'Open Location / Search...',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            sendToMainWindow('shortcut', 'focus-url');
          }
        },
        { type: 'separator' as const },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            sendToMainWindow('shortcut', 'close-tab');
          }
        },
        {
          label: 'Reopen Closed Tab',
          accelerator: 'Shift+CmdOrCtrl+T',
          click: () => {
            sendToMainWindow('shortcut', 'reopen-tab');
          }
        },
        { type: 'separator' as const },
        {
          label: 'Print...',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            sendToMainWindow('shortcut', 'print');
          }
        },
        ...(!isMac ? [{ type: 'separator' as const }, { role: 'quit' as const }] : [])
      ]
    },
    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'pasteAndMatchStyle' as const },
        { role: 'delete' as const },
        { role: 'selectAll' as const },
        { type: 'separator' as const },
        {
          label: 'Find in Page...',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            sendToMainWindow('shortcut', 'find');
          }
        }
      ]
    },
    // View Menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload This Page',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            sendToMainWindow('shortcut', 'reload');
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'Shift+CmdOrCtrl+R',
          click: () => {
            sendToMainWindow('shortcut', 'force-reload');
          }
        },
        { type: 'separator' as const },
        {
          label: 'Actual Size (100%)',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            sendToMainWindow('shortcut', 'zoom-reset');
          }
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            sendToMainWindow('shortcut', 'zoom-in');
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            sendToMainWindow('shortcut', 'zoom-out');
          }
        },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
        {
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => {
            sendToMainWindow('shortcut', 'devtools');
          }
        }
      ]
    },
    // History Menu
    {
      label: 'History',
      submenu: [
        {
          label: 'Back',
          accelerator: 'CmdOrCtrl+[',
          click: () => {
            sendToMainWindow('shortcut', 'go-back');
          }
        },
        {
          label: 'Forward',
          accelerator: 'CmdOrCtrl+]',
          click: () => {
            sendToMainWindow('shortcut', 'go-forward');
          }
        },
        { type: 'separator' as const },
        {
          label: 'Show Full History',
          accelerator: 'CmdOrCtrl+Y',
          click: () => {
            sendToMainWindow('shortcut', 'history');
          }
        },
        {
          label: 'Show Downloads',
          accelerator: 'Shift+CmdOrCtrl+J',
          click: () => {
            sendToMainWindow('shortcut', 'downloads');
          }
        }
      ]
    },
    // Bookmarks Menu
    {
      label: 'Bookmarks',
      submenu: [
        {
          label: 'Bookmark This Tab...',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            sendToMainWindow('shortcut', 'bookmark');
          }
        },
        {
          label: 'Show Bookmarks Bar',
          accelerator: 'Shift+CmdOrCtrl+B',
          click: () => {
            sendToMainWindow('shortcut', 'toggle-bookmarks-bar');
          }
        }
      ]
    },
    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
          { type: 'separator' as const },
          { role: 'window' as const }
        ] : [
          { role: 'close' as const }
        ])
      ]
    },
    // macOS Native Help Menu (with Help search role & items)
    {
      role: 'help' as const,
      label: 'Help',
      submenu: [
        {
          label: 'Nova Browser Help Center',
          accelerator: 'F1',
          click: () => {
            sendToMainWindow('shortcut', 'open-help');
          }
        },
        {
          label: 'Keyboard Shortcuts Guide',
          accelerator: 'CmdOrCtrl+/',
          click: () => {
            sendToMainWindow('shortcut', 'shortcuts-help');
          }
        },
        { type: 'separator' as const },
        {
          label: 'Nova AI Copilot Guide',
          click: () => {
            sendToMainWindow('shortcut', 'ai-help');
          }
        },
        {
          label: 'Privacy Shield & Security Info',
          click: () => {
            sendToMainWindow('shortcut', 'privacy-help');
          }
        },
        { type: 'separator' as const },
        {
          label: 'Report an Issue / Feedback',
          click: async () => {
            await shell.openExternal('https://github.com/unitybtw/nova-browser/issues');
          }
        },
        {
          label: 'Visit Nova Browser GitHub',
          click: async () => {
            await shell.openExternal('https://github.com/unitybtw/nova-browser');
          }
        },
        {
          label: "What's New in This Version",
          click: async () => {
            await shell.openExternal('https://github.com/unitybtw/nova-browser/releases');
          }
        },
        { type: 'separator' as const },
        {
          label: 'Check for Updates...',
          click: () => {
            autoUpdater.checkForUpdatesAndNotify().catch(() => {});
            sendToMainWindow('shortcut', 'check-updates');
          }
        },
        {
          label: 'About Nova Browser',
          click: () => {
            if (isMac) {
              app.showAboutPanel();
            } else {
              sendToMainWindow('shortcut', 'about-help');
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  console.log('App is ready, creating window...');
  createWindow();
  setupApplicationMenu();

  // Initialize phishing blocklist with auto-refresh
  await loadInitialBlocklist();

  // --- CHROME-STYLE PERMISSION SYSTEM (SECURITY) ---
  interface PendingPermission {
    requestId: string;
    permission: string;
    url: string;
    origin: string;
    permissionName: string;
    mediaTypes?: string[];
    callback: (allow: boolean) => void;
    timeoutId: NodeJS.Timeout;
  }

  const pendingPermissions = new Map<string, PendingPermission>();
  // Origin -> (Permission -> Boolean)
  const rememberedPermissions = new Map<string, Map<string, boolean>>();

  ipcMain.handle('permission-response', async (_event, payload: unknown) => {
    // 🔒 Security: only the trusted main window may resolve permission requests
    if (!isTrustedSender(_event)) return { success: false, error: 'Unauthorized' };
    if (!payload || typeof payload !== 'object') return { success: false, error: 'Invalid payload' };
    const { requestId, allow, remember } = payload as Record<string, unknown>;
    if (typeof requestId !== 'string' || requestId.length < 1 || requestId.length > 128 ||
        typeof allow !== 'boolean' || (remember !== undefined && typeof remember !== 'boolean')) {
      return { success: false, error: 'Invalid permission response' };
    }
    const pending = pendingPermissions.get(requestId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pendingPermissions.delete(requestId);
      if (remember && pending.origin) {
        if (!rememberedPermissions.has(pending.origin)) {
          rememberedPermissions.set(pending.origin, new Map());
        }
        rememberedPermissions.get(pending.origin)!.set(pending.permission, allow);
      }
      try {
        pending.callback(allow);
      } catch (err) {
        console.error('[Permission] Error in callback:', err);
      }
      return { success: true };
    }
    return { success: false, error: 'Request not found or timed out' };
  });

  const applyStrictSecurityToSession = (targetSession: Electron.Session) => {
    targetSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const url = details.requestingUrl || webContents.getURL() || '';
      
      // Auto-allow internal app pages
      if (isTrustedAppOrigin(url)) {
        return callback(true);
      }

      let origin = '';
      try {
        origin = new URL(url).origin;
      } catch {
        origin = url;
      }

      // Check remembered permissions for this origin
      if (origin && rememberedPermissions.has(origin)) {
        const originPerms = rememberedPermissions.get(origin)!;
        if (originPerms.has(permission)) {
          return callback(originPerms.get(permission)!);
        }
      }
      
      // Map permission names for Chrome-style UI
      const permissionNames: Record<string, string> = {
        'media': 'Camera and Microphone',
        'geolocation': 'Location (GPS)',
        'notifications': 'Notifications',
        'midi': 'MIDI Devices',
        'midiSysex': 'MIDI Devices (SysEx)',
        'pointerLock': 'Pointer Lock',
        'fullscreen': 'Fullscreen',
        'openExternal': 'Open External App',
        'clipboard-read': 'Read Clipboard',
        'clipboard-sanitized-write': 'Write Clipboard',
        'display-capture': 'Screen Sharing',
        'window-management': 'Window Management'
      };
      
      const permissionName = permissionNames[permission] || permission;

      if (!mainWindow || mainWindow.isDestroyed()) {
        return callback(false);
      }

      const requestId = `perm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const timeoutId = setTimeout(() => {
        const req = pendingPermissions.get(requestId);
        if (req) {
          pendingPermissions.delete(requestId);
          try { req.callback(false); } catch {}
        }
      }, 60000); // 60 seconds timeout

      const mediaTypes = (details as any)?.mediaTypes;

      pendingPermissions.set(requestId, {
        requestId,
        permission,
        url,
        origin,
        permissionName,
        mediaTypes,
        callback,
        timeoutId
      });

      // Send sleek event to renderer TopBar
      mainWindow.webContents.send('permission-request', {
        requestId,
        permission,
        url,
        origin,
        permissionName,
        mediaTypes,
        webContentsId: webContents.id,
        timestamp: Date.now()
      });
    });

    targetSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
      // If it's a silent check from the browser itself, allow it
      if (isTrustedAppOrigin(requestingOrigin)) {
        return true; 
      }
      
      // For external websites, check if permission was previously remembered
      if (requestingOrigin && rememberedPermissions.has(requestingOrigin)) {
        const originPerms = rememberedPermissions.get(requestingOrigin)!;
        if (originPerms.has(permission)) {
          return originPerms.get(permission)!;
        }
      }

      return false;
    });
  };

  applyStrictSecurityToSession(session.defaultSession);
  applyStrictSecurityToSession(session.fromPartition('incognito'));

  // Initialize and auto-start MCP Server (default port 3020 with fallback)
  mcpServer = new BrowserMCPServer(3020);
  mcpServer.setMainWindow(mainWindow);
  // ⚡ Perf: don't block startup (extension loading below) on the MCP bind.
  // Fire-and-forget keeps the rest of the startup order deterministic; a bind
  // failure is logged but must not stall first paint.
  const serverInstance = mcpServer;
  serverInstance.start().then(() => {
    const actualPort = serverInstance.getPort();
    console.log(`[MCP] Server started on port ${actualPort}`);
    // The renderer fetches MCP status once on mount, which can race this
    // async bind — push the corrected state so the UI pill never sticks
    // at OFFLINE while the server is actually listening.
    sendToMainWindow('mcp-status-changed', { running: true, port: actualPort });
  }).catch((err) => {
    console.error('[MCP] Failed to start server:', err);
    sendToMainWindow('mcp-status-changed', { running: false, port: 0 });
  });

  // Auto Updater Configuration
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
    sendToMainWindow('update-checking');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    sendToMainWindow('update-available', { version: info.version, releaseDate: info.releaseDate });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('No update available. Current version is up to date:', info.version);
    sendToMainWindow('update-not-available', { version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${Math.round(progress.percent)}%`);
    sendToMainWindow('update-download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    sendToMainWindow('update-downloaded', { version: info.version, releaseDate: info.releaseDate });
  });

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err);
    sendToMainWindow('update-error', err?.message || 'Unknown update error');
  });

  ipcMain.handle('check-for-updates', async (event) => {
    if (!isTrustedSender(event)) return { success: false, error: 'Unauthorized sender' };
    try {
      const result = await autoUpdater.checkForUpdatesAndNotify();
      return { success: true, version: result?.updateInfo?.version || null };
    } catch (err: any) {
      console.error('Check for updates failed:', err);
      sendToMainWindow('update-error', err?.message || 'Check failed');
      return { success: false, error: err?.message || 'Check failed' };
    }
  });

  ipcMain.handle('install-update', (event) => {
    if (!isTrustedSender(event)) return;
    try {
      autoUpdater.quitAndInstall(false, true);
    } catch (err: any) {
      console.error('Install update failed:', err);
    }
  });

  // Wait 8 seconds before checking on startup to not slow down startup
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(err => console.error("Startup update check failed:", err));
  }, 8000);

  // Periodically check for updates every hour
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(err => console.error("Periodic update check failed:", err));
  }, 1000 * 60 * 60);

  // Load persistent extensions from disk
  const extensionsPath = path.join(app.getPath('userData'), 'extensions');
  const disabledIds = getDisabledExtensionIds();
  if (fs.existsSync(extensionsPath)) {
    try {
      const extensionDirs = fs.readdirSync(extensionsPath);
      for (const dir of extensionDirs) {
        const extPath = path.join(extensionsPath, dir);
        if (fs.statSync(extPath).isDirectory()) {
          // Cleanup old corrupted timestamp folders
          if (dir.match(/^\d+$/) || dir.match(/^\d+_.*\.crx$/)) {
            try { fs.rmSync(extPath, { recursive: true, force: true }); } catch(e) {}
            continue;
          }
          
          if (fs.existsSync(path.join(extPath, 'manifest.json'))) {
            if (disabledIds.includes(dir)) {
              try {
                const manifest = JSON.parse(fs.readFileSync(path.join(extPath, 'manifest.json'), 'utf8'));
                loadedExtensions.push({
                  id: dir,
                  name: manifest.name || dir,
                  path: extPath,
                  version: manifest.version || '1.0',
                  description: manifest.description || '',
                  enabled: false
                });
              } catch (_) {}
            } else {
              session.defaultSession.loadExtension(extPath).then(extInfo => {
                loadedExtensions.push(extInfo);
                console.log(`Loaded extension: ${extInfo.name}`);
              }).catch(err => {
                console.error(`Failed to load extension at ${extPath}:`, err);
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading extensions on startup:', err);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // NOTE: System-wide globalShortcut hooks (Cmd+K / Cmd+F) were removed.
  // Cmd+K is now handled app-locally via before-input-event in createWindow();
  // Cmd+F is covered by the Edit menu accelerator ("Find in Page...").
});

app.on('web-contents-created', (_event, contents) => {
  // 🔒 Security: Force secure webPreferences for any <webview> tags
  contents.on('will-attach-webview', (event, webPreferences, params) => {
    // Force entirely secure environment for webviews
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInWorker = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.contextIsolation = true;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.experimentalFeatures = false;
    webPreferences.sandbox = true;
    webPreferences.backgroundThrottling = true;

    // Preload restriction: only allow authorized webstore preload script
    const authorizedPreloads = [
      path.resolve(path.join(__dirname, 'webstore-preload.cjs')),
      path.resolve(path.join(__dirname, 'webstore-preload.js'))
    ];
    try {
      const host = new URL(params.src || '').hostname.toLowerCase();
      if (host === 'chromewebstore.google.com' || host === 'chrome.google.com') {
        webPreferences.preload = path.join(__dirname, 'webstore-preload.cjs');
      } else {
        delete webPreferences.preload;
      }
    } catch {
      delete webPreferences.preload;
    }
    if (webPreferences.preload) {
      const resolvedPreload = path.resolve(webPreferences.preload);
      if (!authorizedPreloads.includes(resolvedPreload)) {
        delete webPreferences.preload;
      }
    }
  });

  // 🔒 Security: Block arbitrary window popups and route valid HTTP/HTTPS URLs to our secure tab system
  contents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        sendToMainWindow('new-tab', url);
      }
    } catch {}
    return { action: 'deny' };
  });

  if (contents.getType() === 'webview') {
    // Native Audio State Hook
    const audioListener = (_audioEvt: any, audible: boolean) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('tab-audio-changed', {
          webContentsId: contents.id,
          isPlayingAudio: audible
        });
      }
    };
    (contents as any).on('audio-state-changed', audioListener);
    contents.once('destroyed', () => {
      (contents as any).removeListener('audio-state-changed', audioListener);
    });
    contents.on('will-navigate', (e, navigationUrl) => {
      // 0. Prevent dangerous protocols, local file access, and internal
      // about: pages from being loaded inside untrusted webviews.
      try {
        const parsed = new URL(navigationUrl);
        const allowedProtocols = ['http:', 'https:'];
        const isAllowedAboutBlank = parsed.protocol === 'about:' && parsed.pathname === 'blank';
        if ((!allowedProtocols.includes(parsed.protocol) && !isAllowedAboutBlank) ||
            parsed.username || parsed.password) {
          e.preventDefault();
          console.warn('Blocked navigation to forbidden protocol or credential-bearing URL:', navigationUrl);
          return;
        }
      } catch {
        e.preventDefault();
        return;
      }

      // 1. Phishing Check
      if (isPhishing(navigationUrl)) {
        e.preventDefault();
        sendToMainWindow('blocked-site', { url: navigationUrl, reason: 'phishing' });
        // VULN-05: HTML-escape and JSON.stringify to prevent script injection breakout
        const escapedUrl = navigationUrl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
        const safeUrlJson = JSON.stringify(escapedUrl);
        contents.executeJavaScript(`
          document.body.innerHTML = '<div style="font-family:sans-serif;text-align:center;padding:50px;color:#ef4444;background:#fef2f2;height:100vh;display:flex;flex-direction:column;justify-content:center;"><h1 style="font-size:24px;font-weight:700;margin-bottom:12px;">Dangerous Site Blocked</h1><p style="font-size:14px;color:#7f1d1d;">This site (' + ${safeUrlJson} + ') has been identified as containing phishing or malicious software.</p></div>';
        `).catch(() => {});
        return;
      }

      // 2. HTTPS Upgrade
      try {
        const urlObj = new URL(navigationUrl);
        if (urlObj.protocol === 'http:' && urlObj.hostname !== 'localhost' && !urlObj.hostname.startsWith('127.')) {
          if (upgradedUrls.has(navigationUrl)) {
            // Zaten denedik ve patladı (SSL hatası vs.), sonsuz döngüye girmemek için devam et
            return;
          }
          
          e.preventDefault();
          addUpgradedUrl(navigationUrl);
          const httpsUrl = navigationUrl.replace(/^http:/, 'https:');
          
          // 🔒 Security (L-7): never auto-fall back to plain HTTP when the HTTPS
          // upgrade fails — a MITM can force that downgrade. Log and stay put.
          // navigationUrl is now in upgradedUrls, so an EXPLICIT user retry of
          // the http:// URL is still allowed through (see the check above).
          contents.loadURL(httpsUrl).catch((upgradeErr: any) => {
            console.warn('HTTPS upgrade failed, refusing to downgrade to HTTP for:', navigationUrl, upgradeErr?.message || upgradeErr);
          });
        }
      } catch {}
    });
  }
});

app.on('will-quit', () => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'store_settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (settings.clearOnExit) {
        // 🔧 Robustness: attach catch handlers so cleanup rejections can't float;
        // quit is intentionally NOT blocked on these async clears.
        session.defaultSession.clearStorageData().catch((e) => console.warn('[Quit] clearStorageData failed:', e));
        session.defaultSession.clearCache().catch((e) => console.warn('[Quit] clearCache failed:', e));
      }
    }
  } catch (e) {}
});

app.on('before-quit', () => {
  try {
    if (mcpServer && mcpServer.isRunning()) {
      mcpServer.stop();
    }
  } catch (e) {
    console.error('Error stopping MCP server on quit:', e);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler for Privacy Shield Toggle
ipcMain.handle('set-privacy-shield', (event, enabled: boolean) => {
  if (!isTrustedSender(event)) return false;
  isPrivacyShieldEnabled = Boolean(enabled);
  if (blocker) {
    if (isPrivacyShieldEnabled) {
      try { blocker.enableBlockingInSession(session.defaultSession); } catch (e) { console.error('Failed to enable ad blocking in default session:', e); }
      try { blocker.enableBlockingInSession(session.fromPartition('incognito')); } catch (e) { console.error('Failed to enable ad blocking in incognito session:', e); }
    } else {
      try { blocker.disableBlockingInSession(session.defaultSession); } catch(e) {}
      try { blocker.disableBlockingInSession(session.fromPartition('incognito')); } catch(e) {}
    }
  }
  return isPrivacyShieldEnabled;
});

ipcMain.handle('set-do-not-track', (event, enabled: boolean) => {
  if (!isTrustedSender(event)) return;
  isDoNotTrackEnabled = Boolean(enabled);
});

// Daily 4K Ultra HD Wallpaper Engine (Bing 4K UHD Archive + 4K Desktop Masterpieces)
ipcMain.handle('fetch-wallpaper-photos', async (event) => {
  if (!isTrustedSender(event)) return [];
  const results: any[] = [];

  // Provider 1: Bing Official Daily 4K UHD Image Archive (3840x2160 Ultra HD)
  try {
    const bingRes = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=en-US', {
      // 🔧 Robustness: hard 10s cap so a hung provider can't stall the handler
      signal: AbortSignal.timeout(10000)
    });
    if (bingRes.ok) {
      const bingData = await bingRes.json();
      if (bingData.images && Array.isArray(bingData.images)) {
        for (const img of bingData.images) {
          const uhdUrl = img.urlbase ? `https://www.bing.com${img.urlbase}_UHD.jpg` : `https://www.bing.com${img.url}`;
          results.push({
            id: `bing-${img.hsh || img.startdate}`,
            title: img.title || 'Bing Daily 4K Wallpaper',
            author: img.copyright || 'Microsoft Bing Daily',
            authorUrl: 'https://bing.com',
            imageUrl: uhdUrl,
            thumbnailUrl: `https://www.bing.com${img.url}`,
            source: 'Bing 4K UHD Daily',
            resolution: '3840x2160',
            date: img.startdate
          });
        }
      }
    }
  } catch (e) {
    console.warn('Bing daily IPC fetch error:', e);
  }

  // Provider 2: Wallhaven Top 4K Desktop Wallpaper Feed
  try {
    const whUrl = 'https://wallhaven.cc/api/v1/search?sorting=toplist&topRange=1M&ratios=16x9,16x10,21x9&atleast=3840x2160&purity=100';
    const whRes = await fetch(whUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 NovaBrowser/1.0', 'Accept': 'application/json' },
      // 🔧 Robustness: hard 10s cap so a hung provider can't stall the handler
      signal: AbortSignal.timeout(10000)
    });
    if (whRes.ok) {
      const whData = await whRes.json();
      if (whData.data && Array.isArray(whData.data) && whData.data.length > 0) {
        for (const item of whData.data.slice(0, 10)) {
          results.push({
            id: `wh-${item.id}`,
            title: `4K Desktop Wallpaper (${item.category || 'Landscape'})`,
            author: 'Wallhaven 4K Curated',
            authorUrl: item.url || 'https://wallhaven.cc',
            imageUrl: item.path,
            thumbnailUrl: item.thumbs?.large || item.thumbs?.small || item.path,
            source: '4K Ultra HD',
            resolution: item.resolution || '3840x2160'
          });
        }
      }
    }
  } catch (err) {
    console.warn('Wallhaven toplist fetch error:', err);
  }

  return results;
});

// Legacy alias for compatibility
ipcMain.handle('fetch-unsplash-photos', async (event, query: string) => {
  if (!isTrustedSender(event)) return [];
  return [];
});

// Set theme source for dark mode rendering on pages
ipcMain.on('set-theme', (event, theme: 'light' | 'dark' | 'system') => {
  if (!isTrustedSender(event)) return;
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    nativeTheme.themeSource = theme;
  }
});

// Capture thumbnail from a webview via its webContentsId
ipcMain.handle('capture-tab-thumbnail', async (event, webContentsId: number) => {
  if (!isTrustedSender(event)) return null;
  if (typeof webContentsId !== 'number' || !Number.isInteger(webContentsId)) return null;
  try {
    const wc = webContents.fromId(webContentsId);
    if (!wc || wc.isDestroyed()) return null;
    
    // 🔒 Security: Only allow capturing webviews (tabs)
    if (wc.getType() !== 'webview') return null;

    const image = await wc.capturePage();
    if (image.isEmpty()) return null;
    return image.resize({ width: 320, height: 200 }).toDataURL();
  } catch (err) {
    return null;
  }
});

// Capture full page screenshot using CDP
ipcMain.handle('capture-full-page', async (event, webContentsId: number) => {
  if (!isTrustedSender(event)) return null;
  if (typeof webContentsId !== 'number' || !Number.isInteger(webContentsId)) return null;
  try {
    const wc = webContents.fromId(webContentsId);
    if (!wc || wc.isDestroyed() || wc.getType() !== 'webview') return null;

    let attached = false;
    try {
      if (!wc.debugger.isAttached()) {
        wc.debugger.attach('1.3');
        attached = true;
      }
    } catch (err) {
      console.error('Debugger attach failed: ', err);
      return null;
    }

    let dataUrl = null;
    let metricsOverridden = false;
    try {
      const metrics = await wc.debugger.sendCommand('Page.getLayoutMetrics');
      const width = Math.ceil((metrics as any).cssContentSize?.width || (metrics as any).contentSize?.width || 1920);
      const height = Math.ceil((metrics as any).cssContentSize?.height || (metrics as any).contentSize?.height || 1080);

      // Force the viewport to expand to the full height of the page to ensure off-screen content is rendered
      await wc.debugger.sendCommand('Emulation.setDeviceMetricsOverride', {
        mobile: false,
        width,
        height,
        deviceScaleFactor: 1,
        screenOrientation: { angle: 0, type: 'portraitPrimary' }
      });
      metricsOverridden = true;

      // Wait a moment for the page to layout and paint the newly exposed areas
      await new Promise(resolve => setTimeout(resolve, 300));

      const response = await wc.debugger.sendCommand('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        fromSurface: true,
        clip: {
          x: 0,
          y: 0,
          width,
          height,
          scale: 1
        }
      });

      if (response && (response as any).data) {
        dataUrl = `data:image/png;base64,${(response as any).data}`;
      }
    } catch (err) {
      console.error('Screenshot CDP command failed:', err);
    } finally {
      if (metricsOverridden && wc && !wc.isDestroyed() && wc.debugger.isAttached()) {
        try {
          await wc.debugger.sendCommand('Emulation.clearDeviceMetricsOverride');
        } catch (_) {}
      }
      if (attached && wc && !wc.isDestroyed() && wc.debugger.isAttached()) {
        try {
          wc.debugger.detach();
        } catch (_) {}
      }
    }
    
    return dataUrl;
  } catch (err) {
    console.error('Failed to capture full page:', err);
    return null;
  }
});

// Auto-capture thumbnails and Native Chrome-Parity Context Menu for WebViews
app.on('web-contents-created', (_event, wc) => {
  wc.removeAllListeners('context-menu');
  wc.on('context-menu', (e, params) => {
    // Only show for webviews
    if (wc.getType() === 'webview') {
      const { Menu, MenuItem, clipboard, dialog } = require('electron');
      const menu = new Menu();

      const labels = {
        // Spellcheck
        noGuesses: 'No guesses found',
        addToDictionary: 'Add to Dictionary',

        // Links
        openLinkNewTab: 'Open Link in New Tab',
        openLinkNewIncognitoTab: 'Open Link in Incognito Window',
        saveLinkAs: 'Save Link As...',
        copyLinkAddress: 'Copy Link Address',

        // Images
        openImageNewTab: 'Open Image in New Tab',
        saveImageAs: 'Save Image As...',
        copyImage: 'Copy Image',
        copyImageAddress: 'Copy Image Address',
        searchImageLens: 'Search Image with Google Lens',

        // Audio & Video
        play: 'Play',
        pause: 'Pause',
        mute: 'Mute',
        unmute: 'Unmute',
        loop: 'Loop',
        showControls: 'Show Controls',
        pictureInPicture: 'Picture in Picture',
        saveVideoAs: 'Save Video As...',
        copyVideoAddress: 'Copy Video Address',
        saveAudioAs: 'Save Audio As...',
        copyAudioAddress: 'Copy Audio Address',

        // Selection
        copy: 'Copy',
        cut: 'Cut',
        paste: 'Paste',
        pasteAsPlainText: 'Paste as Plain Text',
        selectAll: 'Select All',
        undo: 'Undo',
        redo: 'Redo',
        delete: 'Delete',
        searchFor: (query: string) => `Search Google for "${query}"`,
        aiExplain: 'Explain with Nova AI',

        // Page Navigation
        back: 'Back',
        forward: 'Forward',
        reload: 'Reload',
        translatePage: 'Translate Page',
        savePageAs: 'Save As...',
        print: 'Print...',
        viewSource: 'View Page Source',
        inspect: 'Inspect',
      };

      // 1. Spellcheck Suggestions (if misspelled word)
      if (params.misspelledWord) {
        if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
          for (const suggestion of params.dictionarySuggestions) {
            menu.append(new MenuItem({
              label: suggestion,
              click: () => wc.replaceMisspelling(suggestion)
            }));
          }
        } else {
          menu.append(new MenuItem({
            label: labels.noGuesses,
            enabled: false
          }));
        }
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({
          label: labels.addToDictionary,
          click: () => wc.session.addWordToSpellCheckerDictionary(params.misspelledWord)
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 2. Link Actions
      if (params.linkURL) {
        menu.append(new MenuItem({
          label: labels.openLinkNewTab,
          click: () => sendToMainWindow('new-tab', params.linkURL)
        }));
        menu.append(new MenuItem({
          label: labels.openLinkNewIncognitoTab,
          click: () => sendToMainWindow('new-incognito-tab', params.linkURL)
        }));
        menu.append(new MenuItem({
          label: labels.saveLinkAs,
          click: () => {
            markNextDownloadAsSaveAs();
            wc.downloadURL(params.linkURL);
          }
        }));
        menu.append(new MenuItem({
          label: labels.copyLinkAddress,
          click: () => clipboard.writeText(params.linkURL)
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 3. Image Actions
      if (params.srcURL && params.mediaType === 'image') {
        menu.append(new MenuItem({
          label: labels.openImageNewTab,
          click: () => sendToMainWindow('new-tab', params.srcURL)
        }));
        menu.append(new MenuItem({
          label: labels.saveImageAs,
          click: () => {
            markNextDownloadAsSaveAs();
            wc.downloadURL(params.srcURL);
          }
        }));
        menu.append(new MenuItem({
          label: labels.copyImage,
          click: () => {
            try {
              wc.copyImageAt(params.x, params.y);
            } catch {
              clipboard.writeText(params.srcURL);
            }
          }
        }));
        menu.append(new MenuItem({
          label: labels.copyImageAddress,
          click: () => clipboard.writeText(params.srcURL)
        }));
        menu.append(new MenuItem({
          label: labels.searchImageLens,
          click: () => sendToMainWindow('new-tab', `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(params.srcURL)}`)
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 4. Video & Audio Actions
      if (params.mediaType === 'video' || params.mediaType === 'audio') {
        const isVideo = params.mediaType === 'video';
        const flags = params.mediaFlags as any;
        if (flags) {
          if (flags.canPlay) {
            menu.append(new MenuItem({
              label: flags.isPaused ? labels.play : labels.pause,
              click: () => wc.executeJavaScript(`(() => { const el = document.querySelector('video:hover, audio:hover'); if(el) { if(el.paused) el.play(); else el.pause(); } })()`).catch(() => {})
            }));
          }
          if (flags.canMute) {
            menu.append(new MenuItem({
              label: flags.isMuted ? labels.unmute : labels.mute,
              click: () => wc.executeJavaScript(`(() => { const el = document.querySelector('video:hover, audio:hover'); if(el) el.muted = !el.muted; })()`).catch(() => {})
            }));
          }
          if (flags.canLoop) {
            menu.append(new MenuItem({
              label: labels.loop,
              type: 'checkbox',
              checked: flags.isLooping,
              click: () => wc.executeJavaScript(`(() => { const el = document.querySelector('video:hover, audio:hover'); if(el) el.loop = !el.loop; })()`).catch(() => {})
            }));
          }
          if (flags.canShowControls) {
            menu.append(new MenuItem({
              label: labels.showControls,
              type: 'checkbox',
              checked: flags.isShowingControls,
              click: () => wc.executeJavaScript(`(() => { const el = document.querySelector('video:hover, audio:hover'); if(el) el.controls = !el.controls; })()`).catch(() => {})
            }));
          }
          if (isVideo && flags.canPictureInPicture) {
            menu.append(new MenuItem({
              label: labels.pictureInPicture,
              click: () => wc.executeJavaScript(`(() => { const el = document.querySelector('video:hover'); if(el) { if(document.pictureInPictureElement) document.exitPictureInPicture(); else el.requestPictureInPicture(); } })()`).catch(() => {})
            }));
          }
          menu.append(new MenuItem({ type: 'separator' }));
        }
        if (params.srcURL) {
          menu.append(new MenuItem({
            label: isVideo ? labels.saveVideoAs : labels.saveAudioAs,
            click: () => {
              markNextDownloadAsSaveAs();
              wc.downloadURL(params.srcURL);
            }
          }));
          menu.append(new MenuItem({
            label: isVideo ? labels.copyVideoAddress : labels.copyAudioAddress,
            click: () => clipboard.writeText(params.srcURL)
          }));
          menu.append(new MenuItem({ type: 'separator' }));
        }
      }

      // 5. Selected Text Actions
      if (params.selectionText && !params.isEditable) {
        const queryText = params.selectionText.trim();
        const shortQuery = queryText.length > 24 ? queryText.substring(0, 24) + '...' : queryText;
        menu.append(new MenuItem({ role: 'copy', label: labels.copy, accelerator: 'CmdOrCtrl+C' }));
        menu.append(new MenuItem({
          label: labels.searchFor(shortQuery),
          click: () => sendToMainWindow('new-tab', `https://www.google.com/search?q=${encodeURIComponent(queryText)}`)
        }));
        menu.append(new MenuItem({
          label: labels.aiExplain,
          click: () => sendToMainWindow('quick-ai-action', queryText)
        }));
        menu.append(new MenuItem({
          label: labels.print,
          accelerator: 'CmdOrCtrl+P',
          click: () => wc.print()
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 6. Editable Fields (Inputs, Textareas)
      if (params.isEditable) {
        menu.append(new MenuItem({ role: 'undo', label: labels.undo, accelerator: 'CmdOrCtrl+Z' }));
        menu.append(new MenuItem({ role: 'redo', label: labels.redo, accelerator: process.platform === 'darwin' ? 'Shift+Cmd+Z' : 'CmdOrCtrl+Y' }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({ role: 'cut', label: labels.cut, accelerator: 'CmdOrCtrl+X' }));
        menu.append(new MenuItem({ role: 'copy', label: labels.copy, accelerator: 'CmdOrCtrl+C' }));
        menu.append(new MenuItem({ role: 'paste', label: labels.paste, accelerator: 'CmdOrCtrl+V' }));
        menu.append(new MenuItem({ role: 'pasteAndMatchStyle', label: labels.pasteAsPlainText, accelerator: 'Shift+CmdOrCtrl+V' }));
        menu.append(new MenuItem({ role: 'delete', label: labels.delete }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({ role: 'selectAll', label: labels.selectAll, accelerator: 'CmdOrCtrl+A' }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 7. Standard Page Navigation (when clicking background / empty page area)
      if (!params.linkURL && !params.selectionText && params.mediaType === 'none' && !params.isEditable) {
        menu.append(new MenuItem({
          label: labels.back,
          accelerator: process.platform === 'darwin' ? 'Cmd+[' : 'Alt+Left',
          click: () => wc.goBack(),
          enabled: wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack()
        }));
        menu.append(new MenuItem({
          label: labels.forward,
          accelerator: process.platform === 'darwin' ? 'Cmd+]' : 'Alt+Right',
          click: () => wc.goForward(),
          enabled: wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward()
        }));
        menu.append(new MenuItem({
          label: labels.reload,
          accelerator: 'CmdOrCtrl+R',
          click: () => wc.reload()
        }));
        menu.append(new MenuItem({ type: 'separator' }));

        // Save Page As...
        menu.append(new MenuItem({
          label: labels.savePageAs,
          accelerator: 'CmdOrCtrl+S',
          click: async () => {
            const currentUrl = wc.getURL();
            if (currentUrl && (currentUrl.startsWith('http://') || currentUrl.startsWith('https://'))) {
              const defaultFilename = (wc.getTitle() || 'page').replace(/[/\\?%*:|"<>]/g, '_') + '.html';
              const saveRes = await dialog.showSaveDialog(mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined as any, {
                defaultPath: path.join(app.getPath('downloads'), defaultFilename),
                filters: [{ name: 'HTML Complete Page', extensions: ['html', 'htm'] }]
              });
              if (!saveRes.canceled && saveRes.filePath) {
                try {
                  await wc.savePage(saveRes.filePath, 'HTMLComplete');
                } catch (err) {
                  console.error('savePage error:', err);
                }
              }
            }
          }
        }));

        // Print...
        menu.append(new MenuItem({
          label: labels.print,
          accelerator: 'CmdOrCtrl+P',
          click: () => wc.print()
        }));

        // View Page Source
        menu.append(new MenuItem({
          label: labels.viewSource,
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+U' : 'Ctrl+U',
          click: () => {
            const currentUrl = wc.getURL();
            // 🐛 Fix: internal pages use the `nova:` protocol (rendered as nova://newtab etc.).
            // Block view-source for ANY nova-prefixed protocol, not just the literal 'nova://' prefix.
            let isInternalPage = false;
            let isViewSource = false;
            try {
              const parsed = new URL(currentUrl);
              isInternalPage = parsed.protocol.startsWith('nova');
              isViewSource = parsed.protocol === 'view-source:';
            } catch {
              isInternalPage = currentUrl.toLowerCase().startsWith('nova');
              isViewSource = currentUrl.toLowerCase().startsWith('view-source:');
            }
            if (currentUrl && !isViewSource && !isInternalPage) {
              sendToMainWindow('new-tab', `view-source:${currentUrl}`);
            }
          }
        }));

        const activePageUrl = wc.getURL() || '';
        if (activePageUrl && (activePageUrl.startsWith('http://') || activePageUrl.startsWith('https://'))) {
          menu.append(new MenuItem({
            label: labels.translatePage,
            click: () => {
              sendToMainWindow('trigger-page-translation', { targetLang: 'en', webContentsId: wc.id });
            }
          }));
        }

        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 8. Inspect / DevTools (Always available at bottom just like Chrome)
      menu.append(new MenuItem({
        label: labels.inspect,
        accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
        click: () => {
          if (wc.isDevToolsOpened()) {
            wc.devToolsWebContents?.focus();
          }
          wc.inspectElement(params.x, params.y);
        }
      }));

      menu.popup({ window: mainWindow || undefined });
    }
  });
});

// Download Controls (handlers live in main/downloads.ts)
initDownloads(sendToMainWindow, isTrustedSender);

// MCP Server Controls
ipcMain.handle('start-mcp-server', async (event) => {
  if (!isTrustedSender(event)) return false;
  if (mcpServer && !mcpServer.isRunning()) {
    try {
      await mcpServer.start();
    } catch (err) {
      console.error('[MCP] Failed to start server:', err);
      return false;
    }
    const actualPort = mcpServer.getPort();
    sendToMainWindow('mcp-status-changed', { running: true, port: actualPort });
    return true;
  }
  return false;
});

ipcMain.handle('stop-mcp-server', (event) => {
  if (!isTrustedSender(event)) return false;
  if (mcpServer && mcpServer.isRunning()) {
    mcpServer.stop();
    sendToMainWindow('mcp-status-changed', { running: false, port: 0 });
    return true;
  }
  return false;
});

ipcMain.handle('get-mcp-token', (event) => {
  if (!isTrustedSender(event)) return '';
  return mcpServer?.getToken() || '';
});
ipcMain.handle('rotate-mcp-token', (event) => {
  if (!isTrustedSender(event)) return '';
  return mcpServer?.rotateToken() || '';
});
ipcMain.handle('get-mcp-tool-settings', (event) => {
  if (!isTrustedSender(event)) return [];
  return mcpServer?.getDisabledTools() || [];
});
ipcMain.handle('set-mcp-tool-enabled', (event, toolName: string, enabled: boolean) => {
  if (!isTrustedSender(event)) return false;
  if (!toolName || typeof toolName !== 'string') return false;
  mcpServer?.setToolEnabled(toolName, Boolean(enabled));
  return true;
});

ipcMain.handle('get-mcp-status', (event) => {
  if (!isTrustedSender(event)) return { running: false, port: 0, clients: [], clientCount: 0 };
  if (!mcpServer) return { running: false, port: 0, clients: [], clientCount: 0 };
  return {
    running: mcpServer.isRunning(),
    port: mcpServer.getPort(),
    clientCount: mcpServer.getClientCount(),
    clients: mcpServer.getConnectedClientsInfo()
  };
});

// Clear incognito mode session
ipcMain.handle('clear-incognito-session', async (event) => {
  if (!isTrustedSender(event)) return false;
  try {
    const incogSession = session.fromPartition('incognito');
    await incogSession.clearStorageData(); // cookies, cache, localStorage vs.
    await incogSession.clearCache();
    return true;
  } catch (err) {
    console.error('Error clearing incognito session:', err);
    return false;
  }
});

// Clear AI model cache & Service Worker WebLLM cache
ipcMain.handle('clear-ai-models-cache', async (event) => {
  if (!isTrustedSender(event)) return false;
  try {
    const defaultSess = session.defaultSession;
    await defaultSess.clearStorageData({
      storages: ['serviceworkers', 'cachestorage']
    });
    await defaultSess.clearCache();
    return true;
  } catch (err) {
    console.error('Error clearing AI models cache:', err);
    return false;
  }
});

// Purge inactive RAM, host resolver cache and session cache for maximum performance
ipcMain.handle('purge-system-memory', async (event) => {
  if (!isTrustedSender(event)) return false;
  try {
    const defaultSess = session.defaultSession;
    await defaultSess.clearCache();
    await defaultSess.clearHostResolverCache();
    if (typeof (global as any).gc === 'function') {
      (global as any).gc();
    }
    return true;
  } catch (err) {
    console.error('Error purging system memory:', err);
    return false;
  }
});

// Password Manager: save-password channel (fire-and-forget, validated with isTrustedSender)
ipcMain.on('save-password', (event, data: { hostname: string; username: string; password: string }) => {
  if (!isTrustedSender(event)) return;
  if (!data || typeof data !== 'object') return;
  const { hostname, username, password } = data;
  if (!hostname || !username || !password) return;
  // Call the existing handlePasswordDetected logic from the renderer side
  // We'll emit an event to the main window to trigger the password prompt
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('password-form-submitted', { hostname, username, password });
  }
});

// Generic Secure Storage API (for future password manager, etc.)
ipcMain.handle('secure-store-set', async (event, key: string, value: string) => {
  if (!isTrustedSender(event)) return false;
  try {
    if (!key || typeof key !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid key format');
    if (typeof value !== 'string') throw new Error('Invalid value format');
    // VULN-23 parity: enforce max value size of 5MB (store-set enforces 10MB)
    const MAX_SECURE_STORE_VALUE_SIZE = 5_000_000; // 5MB
    if (Buffer.byteLength(value, 'utf-8') > MAX_SECURE_STORE_VALUE_SIZE) {
      throw new Error('Value exceeds maximum allowed size of 5MB');
    }
    const keyPath = path.join(app.getPath('userData'), `secure_${key}`);
    // VULN-06: Warn and mark when encryption is unavailable
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(value);
      fs.writeFileSync(keyPath, encrypted);
    } else {
      console.warn(`[SECURITY WARNING] safeStorage encryption unavailable. Storing key "${key}" with [UNENCRYPTED] marker.`);
      const markedValue = Buffer.from('[UNENCRYPTED]' + value, 'utf-8');
      fs.writeFileSync(keyPath, markedValue);
    }
    return true;
  } catch (err) {
    console.error('Secure store set error:', err);
    return false;
  }
});

ipcMain.handle('secure-store-get', async (event, key: string) => {
  if (!isTrustedSender(event)) return null;
  try {
    if (!key || typeof key !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(key)) return null;
    const keyPath = path.join(app.getPath('userData'), `secure_${key}`);
    if (fs.existsSync(keyPath)) {
      const raw = fs.readFileSync(keyPath);
      // VULN-06: Handle encrypted vs unencrypted data
      if (safeStorage.isEncryptionAvailable()) {
        try {
          return safeStorage.decryptString(raw);
        } catch (_) {
          const str = raw.toString('utf-8');
          if (str.startsWith('[UNENCRYPTED]')) {
            return str.slice('[UNENCRYPTED]'.length);
          }
          return null;
        }
      } else {
        const str = raw.toString('utf-8');
        console.warn(`[SECURITY WARNING] safeStorage encryption unavailable. Reading key "${key}" as unencrypted.`);
        if (str.startsWith('[UNENCRYPTED]')) {
          return str.slice('[UNENCRYPTED]'.length);
        }
        return str;
      }
    }
  } catch (err) {
    console.error('Secure store get error:', err);
  }
  return null;
});

// Generic JSON Storage API (for highlights, stats, whitelists, etc.)
ipcMain.handle('store-set', async (event, key: string, value: string) => {
  if (!isTrustedSender(event)) return false;
  try {
    if (!key || typeof key !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(key)) {
      return { error: 'Invalid key format' };
    }
    if (typeof value !== 'string') {
      return { error: 'Invalid value format: must be string' };
    }
    // VULN-23: Enforce max value size of 10MB
    const MAX_STORE_VALUE_SIZE = 10 * 1024 * 1024; // 10MB
    if (Buffer.byteLength(value, 'utf-8') > MAX_STORE_VALUE_SIZE) {
      console.error('Store set error: Value exceeds maximum size of 10MB');
      return { error: 'Value exceeds maximum allowed size of 10MB' };
    }
    const keyPath = path.join(app.getPath('userData'), `store_${key}.json`);
    fs.writeFileSync(keyPath, value, 'utf-8');
    
    if (key === 'adblocker_whitelist') {
      try {
        const wl = JSON.parse(value);
        if (Array.isArray(wl)) updateAdblockWhitelist(wl);
      } catch(e) {}
    }
    
    return true;
  } catch (err) {
    console.error('Store set error:', err);
    return false;
  }
});

ipcMain.handle('store-get', async (event, key: string) => {
  if (!isTrustedSender(event)) return null;
  try {
    if (!key || typeof key !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(key)) return null;
    const keyPath = path.join(app.getPath('userData'), `store_${key}.json`);
    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath, 'utf-8');
    }
  } catch (err) {
    console.error('Store get error:', err);
  }
  return null;
});

// IPC Handler for VPN
ipcMain.handle('set-vpn', async (event, config: { enabled: boolean; proxyUrl?: string }) => {
  if (!isTrustedSender(event)) return { error: 'Unauthorized' };
  if (!config || typeof config !== 'object') {
    return { error: 'Invalid VPN config object' };
  }
  const isEnabled = Boolean(config.enabled);
  const rawProxyUrl = typeof config.proxyUrl === 'string' ? config.proxyUrl.trim() : '';
  const proxyRules = (isEnabled && rawProxyUrl) ? rawProxyUrl : 'direct://';
  
  if (isEnabled && rawProxyUrl) {
    // 🔒 Security: Validate proxy URL protocol
    const allowedProxyProtocols = ['http://', 'https://', 'socks4://', 'socks5://'];
    if (!allowedProxyProtocols.some(proto => proxyRules.startsWith(proto))) {
      console.error('Invalid proxy URL format. Must start with http://, https://, socks4://, or socks5://');
      return { error: 'Invalid proxy URL format. Must start with http://, https://, socks4://, or socks5://' };
    }
  }

  await Promise.all([
    session.defaultSession.setProxy({ proxyRules }),
    session.fromPartition('incognito').setProxy({ proxyRules }),
  ]);
  return true;
});

const dnsLookup = promisify(dns.lookup);

async function validatePreviewUrl(rawUrl: string): Promise<URL | { error: string }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { error: 'Only HTTP/HTTPS protocols are allowed for this operation.' };
    }
    if (parsedUrl.username || parsedUrl.password) {
      return { error: 'URLs with embedded credentials are not allowed.' };
    }
  } catch {
    return { error: 'Invalid URL format' };
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    return { error: 'Requests to local hostnames are blocked.' };
  }

  try {
    const addresses = await dnsLookup(hostname, { all: true }) as any;
    const addrList = Array.isArray(addresses) ? addresses : [addresses];
    if (addrList.length === 0 || addrList.some((entry: any) => isPrivateIP(entry?.address))) {
      return { error: 'Requests to private/internal IP addresses are blocked.' };
    }
  } catch {
    return { error: 'DNS resolution failed.' };
  }

  const port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80');
  if (port === '3020') return { error: 'Requests to MCP server port are blocked.' };
  return parsedUrl;
}

const MAX_PREVIEW_HTML_BYTES = 5 * 1024 * 1024;

// Read a response body with a hard byte limit even when the server omits
// Content-Length. This keeps the SSRF-protected preview endpoint bounded for
// chunked/streaming responses as well as normal buffered responses.
async function readResponseTextWithLimit(response: any, maxBytes: number): Promise<string> {
  const body = response?.body;
  if (body && typeof body.on === 'function') {
    return await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let received = 0;
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        try { body.destroy?.(); } catch (_) {}
        reject(error);
      };
      body.on('data', (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        received += buffer.length;
        if (received > maxBytes) {
          fail(new Error(`Response body exceeds ${maxBytes} byte size limit`));
          return;
        }
        chunks.push(buffer);
      });
      body.on('end', () => {
        if (settled) return;
        settled = true;
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
      body.on('error', (error: Error) => fail(error));
    });
  }

  if (body && typeof body.getReader === 'function') {
    const reader = body.getReader();
    const chunks: Buffer[] = [];
    let received = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const buffer = Buffer.from(value);
        received += buffer.length;
        if (received > maxBytes) {
          try { await reader.cancel(); } catch (_) {}
          throw new Error(`Response body exceeds ${maxBytes} byte size limit`);
        }
        chunks.push(buffer);
      }
      return Buffer.concat(chunks).toString('utf8');
    } finally {
      try { reader.releaseLock?.(); } catch (_) {}
    }
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxBytes) {
    throw new Error(`Response body exceeds ${maxBytes} byte size limit`);
  }
  return Buffer.from(arrayBuffer).toString('utf8');
}

// IPC Handler to fetch raw HTML (Bypasses CORS for Link Preview with SSRF protection)
ipcMain.handle('fetch-page-html', async (event, url: string) => {
  if (!isTrustedSender(event)) return { error: 'Unauthorized' };
  if (!url || typeof url !== 'string') return { error: 'Invalid URL' };
  
  let currentUrl = url;
  const MAX_REDIRECTS = 3;
  
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // Validate every hop. Redirects can cross from a public host to localhost,
    // a private IP, a mapped IPv4 address, or the local MCP port.
    const validated = await validatePreviewUrl(currentUrl);
    if (!(validated instanceof URL)) return validated;
    const parsedUrl = validated;
    currentUrl = parsedUrl.href;

    try {
      const res = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(5000)
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) return { error: 'Redirect without Location header' };
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }

      if (res.ok) {
        const contentLength = res.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > MAX_PREVIEW_HTML_BYTES) {
          return { error: 'Response body exceeds 5MB size limit' };
        }
        let html = await readResponseTextWithLimit(res, MAX_PREVIEW_HTML_BYTES);
        html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        html = html.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
        html = html.replace(/<!--[\s\S]*?-->/g, '');
        return { success: true, html };
      }
      return { error: 'HTTP ' + res.status };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  return { error: 'Too many redirects' };
});

async function translateTextWithGoogle(text: string, sourceLang: string = 'auto', targetLang: string = 'tr'): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    }
  });
  if (!res.ok) {
    throw new Error(`Translation failed with status ${res.status}`);
  }
  const data = await res.json();
  if (Array.isArray(data) && Array.isArray(data[0])) {
    return data[0].map((item: any) => item[0] || '').join('');
  }
  return text;
}

async function detectLanguageWithGoogle(sampleText: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=auto&tl=en&dt=t&q=${encodeURIComponent(sampleText.slice(0, 300))}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && typeof data[2] === 'string') {
        return data[2]; // e.g. 'en', 'de', 'es', 'fr', 'tr', 'ru', 'ja'
      }
    }
  } catch (err) {
    console.warn('[Translate] Language detection error:', err);
  }
  return 'auto';
}

function escapeHtmlForTranslation(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function unescapeHtmlForTranslation(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// IPC Handlers for One-Click Page Translation
const MAX_TRANSLATION_ITEMS = 500;
const MAX_TRANSLATION_TEXT_CHARS = 4000;
const MAX_TRANSLATION_TOTAL_CHARS = 100_000;

ipcMain.handle('translate-text-batch', async (event, payload: unknown) => {
  const input = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const rawTexts = Array.isArray(input.texts) ? input.texts : [];
  const safeTexts: string[] = [];
  let remainingChars = MAX_TRANSLATION_TOTAL_CHARS;

  for (const rawText of rawTexts.slice(0, MAX_TRANSLATION_ITEMS)) {
    if (typeof rawText !== 'string' || remainingChars <= 0) {
      safeTexts.push('');
      continue;
    }
    const text = rawText.slice(0, Math.min(MAX_TRANSLATION_TEXT_CHARS, remainingChars));
    safeTexts.push(text);
    remainingChars -= text.length;
  }

  if (!isTrustedSender(event)) return { error: 'Unauthorized', translations: safeTexts };
  if (safeTexts.length === 0) return { translations: [], success: true };

  const validLanguage = (value: unknown, fallback: string): string => {
    if (typeof value !== 'string' || !/^[a-zA-Z]{2,12}(?:[-_][a-zA-Z0-9]{2,12})?$/.test(value)) {
      return fallback;
    }
    return value;
  };
  const sLang = validLanguage(input.sourceLang, 'auto');
  const tLang = validLanguage(input.targetLang, 'tr');
  const texts = safeTexts;

  try {
    const results: string[] = [...texts];
    
    // Group into HTML payload chunks of ~1600 chars or ~35 elements
    const chunks: { indices: number[]; payload: string }[] = [];
    let currentIndices: number[] = [];
    let currentPayload = '';

    for (let i = 0; i < texts.length; i++) {
      const txt = texts[i] || '';
      if (!txt.trim()) continue;
      
      const itemHtml = `<p id="${i}">${escapeHtmlForTranslation(txt)}</p>`;
      if (currentIndices.length >= 35 || (currentPayload.length + itemHtml.length > 1600 && currentIndices.length > 0)) {
        chunks.push({ indices: currentIndices, payload: currentPayload });
        currentIndices = [i];
        currentPayload = itemHtml;
      } else {
        currentIndices.push(i);
        currentPayload += itemHtml;
      }
    }

    if (currentIndices.length > 0) {
      chunks.push({ indices: currentIndices, payload: currentPayload });
    }

    // Process chunks concurrently (up to 3 at a time)
    const CONCURRENCY = 3;
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const batch = chunks.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(async (chunk) => {
        try {
          const rawTranslated = await translateTextWithGoogle(chunk.payload, sLang, tLang);
          const regex = /<p id="?(\d+)"?>([\s\S]*?)<\/p>/gi;
          let match;
          while ((match = regex.exec(rawTranslated)) !== null) {
            const idx = parseInt(match[1], 10);
            const content = unescapeHtmlForTranslation(match[2].trim());
            if (idx >= 0 && idx < results.length && content) {
              results[idx] = content;
            }
          }
        } catch (err: any) {
          console.warn('[Translate] Chunk translation failed:', err.message);
        }
      }));
      if (i + CONCURRENCY < chunks.length) {
        await new Promise(r => setTimeout(r, 60));
      }
    }

    return { translations: results, success: true };
  } catch (err: any) {
    console.error('[Translate] Batch translation error:', err);
    return { error: err.message || 'Translation failed', translations: texts, success: false };
  }
});

ipcMain.handle('detect-language', async (event, sampleText: string) => {
  if (!isTrustedSender(event)) return 'auto';
  if (!sampleText || typeof sampleText !== 'string') return 'auto';
  return await detectLanguageWithGoogle(sampleText);
});

// Autocomplete Suggestions handler (providers + LRU cache + staggered fallback live in main/suggestions.ts)
initSuggestions(isTrustedSender);

// Open dialog to select a folder for unpacked extension
ipcMain.handle('select-extension-folder', async (event) => {
  if (!isTrustedSender(event)) return { canceled: true };
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return { canceled: true };
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Select Extension Folder',
    properties: ['openDirectory']
  });
  return { canceled, folderPath: filePaths[0] };
});

// Extension management (in‑memory list & persistence)
let loadedExtensions: any[] = [];
let activeExtensionPopupWin: BrowserWindow | null = null;
let activeExtensionPopupUrl: string | null = null;

const disabledExtensionsFile = path.join(app.getPath('userData'), 'disabled_extensions.json');

function getDisabledExtensionIds(): string[] {
  try {
    if (fs.existsSync(disabledExtensionsFile)) {
      return JSON.parse(fs.readFileSync(disabledExtensionsFile, 'utf8'));
    }
  } catch (_) {}
  return [];
}

function setDisabledExtensionIds(ids: string[]): void {
  try {
    fs.writeFileSync(disabledExtensionsFile, JSON.stringify(ids), 'utf8');
  } catch (_) {}
}

function getLocalizedManifestString(extPath: string, text: string, fallback: string = ''): string {
  if (!text || typeof text !== 'string') return fallback;
  if (!text.startsWith('__MSG_') || !text.endsWith('__')) return text;
  const key = text.slice(6, -2);
  
  const localesDir = path.join(extPath, '_locales');
  if (!fs.existsSync(localesDir)) return fallback || text;
  
  const candidateLocales = ['en', 'en_US', 'en_GB', 'tr'];
  try {
    const allLocales = fs.readdirSync(localesDir);
    const searchOrder = [...candidateLocales.filter(l => allLocales.includes(l)), ...allLocales];
    
    for (const loc of searchOrder) {
      const msgFile = path.join(localesDir, loc, 'messages.json');
      if (fs.existsSync(msgFile)) {
        try {
          const content = JSON.parse(fs.readFileSync(msgFile, 'utf8'));
          if (content[key]?.message) {
            return content[key].message;
          }
          const lowerKey = key.toLowerCase();
          for (const k of Object.keys(content)) {
            if (k.toLowerCase() === lowerKey && content[k]?.message) {
              return content[k].message;
            }
          }
        } catch (_) {}
      }
    }
  } catch (_) {}
  
  return fallback || text;
}

// Load an unpacked extension from a folder path
ipcMain.handle('install-extension', async (event, folderPath: string) => {
  if (!isTrustedSender(event)) return { error: 'Unauthorized' };
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return { error: 'No window available' };

  if (!folderPath || typeof folderPath !== 'string' || !folderPath.trim()) {
    return { error: 'Invalid extension folder path.' };
  }

  // Guard against directory traversal
  if (folderPath.includes('..')) {
    return { error: 'Invalid extension path: path traversal detected.' };
  }

  const resolvedFolder = path.resolve(folderPath.trim());
  if (!fs.existsSync(resolvedFolder)) {
    return { error: 'Extension directory does not exist.' };
  }

  try {
    const stat = fs.statSync(resolvedFolder);
    if (!stat.isDirectory()) {
      return { error: 'Selected path is not a directory.' };
    }
  } catch {
    return { error: 'Unable to access extension directory.' };
  }

  const manifestPath = path.join(resolvedFolder, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { error: 'No manifest.json found in the selected folder.' };
  }

  try {
    const targetSession = win.webContents?.session || session.defaultSession;
    const extInfo = await targetSession.loadExtension(resolvedFolder);

    const disabledIds = getDisabledExtensionIds();
    if (disabledIds.includes(extInfo.id)) {
      setDisabledExtensionIds(disabledIds.filter(id => id !== extInfo.id));
    }

    if (!loadedExtensions.some(e => e.id === extInfo.id)) {
      loadedExtensions.push(extInfo);
    }

    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed()) {
        w.webContents.send('extension-changed');
      }
    }

    return { success: true, extension: extInfo };
  } catch (err) {
    console.error('Failed to load extension', err);
    return { error: (err as any).message || 'Failed to load extension' };
  }
});

// Toggle Extension enabled/disabled state
ipcMain.handle('toggle-extension', async (event, extensionId: string, enabled: boolean) => {
  if (!isTrustedSender(event)) return { error: 'Unauthorized' };
  if (!extensionId || typeof extensionId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(extensionId)) {
    return { error: 'Invalid extension ID format' };
  }

  const disabledIds = getDisabledExtensionIds();
  const extensionsBaseDir = path.resolve(path.join(app.getPath('userData'), 'extensions'));
  const extPath = path.resolve(path.join(extensionsBaseDir, extensionId));
  const foundExt = loadedExtensions.find(e => e.id === extensionId);
  const targetExtPath = (foundExt?.path && fs.existsSync(foundExt.path)) ? foundExt.path : extPath;

  try {
    if (enabled) {
      const newDisabled = disabledIds.filter(id => id !== extensionId);
      setDisabledExtensionIds(newDisabled);
      
      if (fs.existsSync(targetExtPath)) {
        const isLoaded = loadedExtensions.some(e => e.id === extensionId);
        if (!isLoaded) {
          const extInfo = await session.defaultSession.loadExtension(targetExtPath);
          loadedExtensions.push(extInfo);
        }
      }
    } else {
      if (!disabledIds.includes(extensionId)) {
        disabledIds.push(extensionId);
        setDisabledExtensionIds(disabledIds);
      }
      try {
        await session.defaultSession.removeExtension(extensionId);
      } catch (_) {}
      loadedExtensions = loadedExtensions.filter(e => e.id !== extensionId);
    }

    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.webContents.send('extension-changed');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to toggle extension:', err);
    return { error: err.message || 'Failed to toggle extension' };
  }
});

// Return list of loaded extensions
ipcMain.handle('list-extensions', async (event) => {
  if (!isTrustedSender(event)) return [];
  const disabledIds = getDisabledExtensionIds();
  
  return Promise.all(loadedExtensions.map(async (e) => {
    let iconData = undefined;
    let popupUrl = undefined;
    let optionsUrl = undefined;
    let homepageUrl = undefined;
    let localizedName = e.name;
    let localizedDesc = e.description;
    try {
      const manifestPath = path.join(e.path, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        localizedName = getLocalizedManifestString(e.path, manifest.name, e.name);
        localizedDesc = getLocalizedManifestString(e.path, manifest.description, e.description);

        // Find popup URL (normalize leading slashes)
        const rawPopup = manifest.action?.default_popup || manifest.browser_action?.default_popup || manifest.page_action?.default_popup;
        if (rawPopup) {
          popupUrl = String(rawPopup).replace(/^\.?\//, '');
        }

        // Find options page URL
        const rawOptions = manifest.options_ui?.page || manifest.options_page;
        if (rawOptions) {
          optionsUrl = String(rawOptions).replace(/^\.?\//, '');
        }

        if (manifest.homepage_url) {
          homepageUrl = manifest.homepage_url;
        }

        if (manifest.icons) {
          // Find largest icon
          const sizes = Object.keys(manifest.icons).map(Number).sort((a, b) => b - a);
          if (sizes.length > 0) {
            const iconPath = path.join(e.path, manifest.icons[sizes[0]]);
            if (fs.existsSync(iconPath)) {
              const ext = path.extname(iconPath).toLowerCase().substring(1) || 'png';
              const buffer = fs.readFileSync(iconPath);
              iconData = `data:image/${ext};base64,${buffer.toString('base64')}`;
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load extension icon', err);
    }
    
    return {
      name: localizedName || e.name || e.id,
      id: e.id,
      enabled: !disabledIds.includes(e.id),
      path: e.path,
      version: e.version,
      description: localizedDesc || e.description || '',
      iconData,
      popupUrl,
      optionsUrl,
      homepageUrl
    };
  }));
});

// Open Extension Popup Window
ipcMain.handle('open-extension-popup', async (event, url, bounds, activeTabInfo) => {
  if (!isTrustedSender(event)) return { error: 'Unauthorized' };
  // VULN-14: Validate URL protocol for extension popups
  const blockedProtocols = ['javascript:', 'data:', 'vbscript:'];
  if (typeof url !== 'string' || blockedProtocols.some(proto => url.trim().toLowerCase().startsWith(proto))) {
    return { error: 'Blocked: dangerous URL protocol.' };
  }
  const extensionsDir = path.resolve(path.join(app.getPath('userData'), 'extensions'));
  if (url.startsWith('file://')) {
    try {
      const filePath = path.resolve(decodeURIComponent(new URL(url).pathname));
      if (!filePath.startsWith(extensionsDir + path.sep)) {
        return { error: 'Blocked: file:// URL must be within extensions directory.' };
      }
    } catch {
      return { error: 'Invalid file URL.' };
    }
  } else if (url.startsWith('chrome-extension://')) {
    try {
      const parsedExtensionUrl = new URL(url);
      const extensionId = parsedExtensionUrl.hostname;
      if (!/^[a-zA-Z0-9_-]+$/.test(extensionId) ||
          !loadedExtensions.some(extension => extension.id === extensionId)) {
        return { error: 'Blocked: extension is not installed.' };
      }
    } catch {
      return { error: 'Invalid extension URL.' };
    }
  } else {
    return { error: 'Blocked: only chrome-extension:// and local extension file:// URLs are allowed.' };
  }

  // Toggle behavior: if clicking the same extension popup while open, close it
  if (activeExtensionPopupWin && !activeExtensionPopupWin.isDestroyed()) {
    const isSameUrl = activeExtensionPopupUrl === url;
    try {
      activeExtensionPopupWin.close();
    } catch (_) {}
    activeExtensionPopupWin = null;
    activeExtensionPopupUrl = null;
    if (isSameUrl) {
      return { success: true, toggled: true };
    }
  }

  const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : BrowserWindow.getAllWindows().find(w => w !== activeExtensionPopupWin) || BrowserWindow.getAllWindows()[0];
  if (!win) return { error: 'No main window available' };

  let popupWidth = 380;
  let popupHeight = 520;
  let posX: number | undefined;
  let posY: number | undefined;

  if (bounds && typeof bounds.x === 'number' && typeof bounds.y === 'number') {
    const [winX, winY] = win.getPosition();
    const [winW, winH] = win.getSize();
    
    // Calculate screen coordinate anchored directly under the button
    const btnCenterX = winX + Math.round(bounds.x) + Math.round((bounds.width || 28) / 2);
    const calculatedX = btnCenterX - Math.round(popupWidth / 2);
    
    posX = Math.max(winX + 12, Math.min(calculatedX, winX + winW - popupWidth - 12));
    posY = winY + Math.round(bounds.y) + Math.round(bounds.height || 28) + 6;
  }

  const popupWin = new BrowserWindow({
    width: popupWidth,
    height: popupHeight,
    x: posX,
    y: posY,
    parent: win,
    modal: false,
    frame: false,
    transparent: false,
    backgroundColor: '#151122',
    hasShadow: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // 🔒 Security: extension popup content is untrusted — run it in the
      // Chromium sandbox (the active-tab bridge is injected via executeJavaScript,
      // which does not require an unsandboxed renderer).
      sandbox: true,
      session: session.defaultSession
    }
  });

  activeExtensionPopupWin = popupWin;
  activeExtensionPopupUrl = url;

  // 🔒 Security: Block arbitrary window popups from extension popup content
  popupWin.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'chrome-extension:') {
        sendToMainWindow('new-tab', url);
      }
    } catch {}
    return { action: 'deny' };
  });

  // Inject active tab bridge into the extension popup
  const injectActiveTabBridge = () => {
    if (!activeTabInfo || !popupWin || popupWin.isDestroyed()) return;
    const tabData = {
      id: activeTabInfo.webContentsId || 1,
      index: 0,
      windowId: win.id,
      highlighted: true,
      active: true,
      selected: true,
      pinned: false,
      url: activeTabInfo.url || 'about:blank',
      title: activeTabInfo.title || 'New Tab',
      favIconUrl: activeTabInfo.favIconUrl || '',
      status: 'complete',
      incognito: false,
      width: win.getContentBounds().width,
      height: win.getContentBounds().height
    };

    const bridgeCode = `
      (function() {
        try {
          if (window.chrome && window.chrome.tabs) {
            const realTab = ${JSON.stringify(tabData)};
            const origQuery = window.chrome.tabs.query;
            window.chrome.tabs.query = function(q, cb) {
              if (typeof cb === 'function') {
                if (!q || q.active || q.currentWindow || q.lastFocusedWindow) {
                  cb([realTab]);
                } else if (origQuery) {
                  origQuery.call(window.chrome.tabs, q, function(res) {
                    cb(res && res.length > 0 ? res : [realTab]);
                  });
                } else {
                  cb([realTab]);
                }
              } else {
                return Promise.resolve([realTab]);
              }
            };
            window.chrome.tabs.get = function(id, cb) {
              if (typeof cb === 'function') cb(realTab);
              else return Promise.resolve(realTab);
            };
            window.chrome.tabs.getCurrent = function(cb) {
              if (typeof cb === 'function') cb(realTab);
              else return Promise.resolve(realTab);
            };
          }
        } catch(e) {}
      })();
    `;

    popupWin.webContents.executeJavaScript(bridgeCode).catch(() => {});
  };

  popupWin.webContents.on('dom-ready', async () => {
    injectActiveTabBridge();
    
    // Auto-fit popup dimensions to content
    try {
      const dimensions = await popupWin.webContents.executeJavaScript(`
        ({
          width: Math.max(document.body?.scrollWidth || 0, document.documentElement?.scrollWidth || 0, 320),
          height: Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0, 200)
        })
      `);
      if (dimensions && typeof dimensions.width === 'number' && typeof dimensions.height === 'number') {
        const fitWidth = Math.min(Math.max(dimensions.width, 320), 600);
        const fitHeight = Math.min(Math.max(dimensions.height, 200), 650);
        
        if (!popupWin.isDestroyed()) {
          let newX = posX;
          if (bounds && typeof bounds.x === 'number' && win) {
            const [winX] = win.getPosition();
            const [winW] = win.getSize();
            const btnCenterX = winX + Math.round(bounds.x) + Math.round((bounds.width || 28) / 2);
            const calculatedX = btnCenterX - Math.round(fitWidth / 2);
            newX = Math.max(winX + 12, Math.min(calculatedX, winX + winW - fitWidth - 12));
          }
          popupWin.setBounds({
            x: newX,
            y: posY,
            width: fitWidth,
            height: fitHeight
          });
        }
      }
    } catch (_) {}

    if (!popupWin.isDestroyed() && !popupWin.isVisible()) {
      popupWin.show();
      popupWin.focus();
    }
  });

  // Show only when ready to prevent blank/white flash
  popupWin.once('ready-to-show', () => {
    if (!popupWin.isDestroyed()) {
      popupWin.show();
      popupWin.focus();
    }
  });

  // Close popup when it loses focus
  popupWin.on('blur', () => {
    if (!popupWin.isDestroyed()) popupWin.close();
  });

  popupWin.on('closed', () => {
    if (activeExtensionPopupWin === popupWin) {
      activeExtensionPopupWin = null;
      activeExtensionPopupUrl = null;
    }
  });

  // Close popup when parent window moves or minimizes
  const handleParentChange = () => {
    if (!popupWin.isDestroyed()) popupWin.close();
  };
  win.once('move', handleParentChange);
  win.once('minimize', handleParentChange);
  popupWin.once('closed', () => {
    win.removeListener('move', handleParentChange);
    win.removeListener('minimize', handleParentChange);
  });

  try {
    await popupWin.loadURL(url);
    return { success: true };
  } catch (err: any) {
    if (!popupWin.isDestroyed()) popupWin.close();
    return { error: 'Failed to load extension popup: ' + err.message };
  }
});

// Read Chrome Bookmarks
ipcMain.handle('import-chrome-bookmarks', async (event) => {
  if (!isTrustedSender(event)) return { success: false, error: 'Unauthorized' };
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';
  
  let bookmarksPath = '';
  if (isMac) {
    bookmarksPath = path.join(app.getPath('home'), 'Library/Application Support/Google/Chrome/Default/Bookmarks');
  } else if (isWin) {
    bookmarksPath = path.join(app.getPath('appData'), '..', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Bookmarks');
  }

  if (!fs.existsSync(bookmarksPath)) {
    return { success: false, error: 'Chrome Bookmarks file not found.' };
  }

  // VULN-27: Add user confirmation before reading another app's data
  if (mainWindow && !mainWindow.isDestroyed()) {
    const { response } = await dialog.showMessageBox(mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined as any, {
      type: 'question',
      buttons: ['Import', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'Import Chrome Bookmarks',
      message: 'Nova Browser would like to read your Google Chrome bookmarks to import them.',
      detail: `Path: ${bookmarksPath}`
    });
    if (response !== 0) {
      return { success: false, error: 'Import cancelled by user.' };
    }
  }

  try {
    const data = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
    const importedBookmarks: any[] = [];
    
    // Recursive function to extract URLs safely
    const extractNodes = (node: any, depth = 0) => {
      if (depth > 20 || !node) return;
      if (node.type === 'url' && typeof node.url === 'string') {
        try {
          const parsed = new URL(node.url);
          // 🔒 Security: Only allow http and https protocols in imported bookmarks
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            const domain = parsed.hostname;
            importedBookmarks.push({
              id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              title: String(node.name || node.url).substring(0, 200),
              url: node.url,
              favicon: domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : undefined
            });
          }
        } catch (_) {}
      } else if (node.type === 'folder' && Array.isArray(node.children)) {
        node.children.forEach((child: any) => extractNodes(child, depth + 1));
      }
    };

    if (data.roots?.bookmark_bar) extractNodes(data.roots.bookmark_bar);
    if (data.roots?.other) extractNodes(data.roots.other);
    if (data.roots?.synced) extractNodes(data.roots.synced);

    return { success: true, bookmarks: importedBookmarks };
  } catch (err) {
    console.error('Failed to parse Chrome bookmarks:', err);
    return { success: false, error: 'Failed to read bookmarks file.' };
  }
});

// Remove Extension
ipcMain.handle('remove-extension', async (event, extensionId: string) => {
  if (!isTrustedSender(event)) return { error: 'Unauthorized' };
  if (!extensionId || typeof extensionId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(extensionId)) {
    return { error: 'Invalid extension ID format' };
  }
  
  try {
    const foundExt = loadedExtensions.find((e) => e.id === extensionId);
    
    // 1. Close any active popup windows for this extension
    if (activeExtensionPopupWin && !activeExtensionPopupWin.isDestroyed()) {
      try {
        activeExtensionPopupWin.close();
        activeExtensionPopupWin = null;
      } catch (_) {}
    }

    // 2. Remove from Electron runtime sessions (both default and window sessions)
    try {
      await session.defaultSession.removeExtension(extensionId);
    } catch (_) {}

    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed() && win.webContents?.session && win.webContents.session !== session.defaultSession) {
        try {
          await win.webContents.session.removeExtension(extensionId);
        } catch (_) {}
      }
    }

    // 3. Remove from in-memory state
    loadedExtensions = loadedExtensions.filter((e) => e.id !== extensionId);

    // 4. Remove from disabled extensions list so it doesn't linger
    const disabledIds = getDisabledExtensionIds();
    if (disabledIds.includes(extensionId)) {
      setDisabledExtensionIds(disabledIds.filter((id) => id !== extensionId));
    }

    // 5. Permanently remove extension directory from disk
    const extensionsBaseDir = path.resolve(path.join(app.getPath('userData'), 'extensions'));
    
    // Path 1: Direct ID folder
    const extDir = path.resolve(path.join(extensionsBaseDir, extensionId));
    if (extDir.startsWith(extensionsBaseDir + path.sep) && fs.existsSync(extDir)) {
      try {
        fs.rmSync(extDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } catch (rmErr) {
        console.error(`[Extensions] Error removing directory ${extDir}:`, rmErr);
      }
    }

    // Path 2: Loaded extension recorded path (if different)
    if (foundExt?.path) {
      const recordedPath = path.resolve(foundExt.path);
      if (recordedPath.startsWith(extensionsBaseDir + path.sep) && fs.existsSync(recordedPath)) {
        try {
          fs.rmSync(recordedPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        } catch (_) {}
      }
    }

    // Path 3: Clean up any lingering downloaded .crx files in temp_extensions
    const tempCrx = path.join(app.getPath('userData'), 'temp_extensions', `${extensionId}.crx`);
    if (fs.existsSync(tempCrx)) {
      try { fs.rmSync(tempCrx, { force: true }); } catch (_) {}
    }

    // 6. Notify all browser windows of the change
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('extension-changed');
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to remove extension:', err);
    return { error: err?.message || 'Failed to remove extension' };
  }
});

// Install from Chrome Web Store (CRX download + zip-slip guards live in main/crxInstaller.ts)
ipcMain.handle('install-from-webstore', (event, urlOrId: string) => installFromWebstore({
  isTrustedSender,
  getMainWindow: () => (mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined),
  isExtensionLoaded: (extensionId: string) => loadedExtensions.some(e => e.id === extensionId),
  findLoadedExtension: (extensionId: string) => loadedExtensions.find(e => e.id === extensionId),
  addLoadedExtension: (extInfo) => { loadedExtensions.push(extInfo); },
  getDisabledExtensionIds,
  setDisabledExtensionIds
}, event, urlOrId));

// Show extension permission review dialog before installation
ipcMain.handle('review-extension-permissions', async (event, extensionId: string, extractPath: string) => {
  if (!isTrustedSender(event)) return { error: 'Unauthorized' };
  if (typeof extensionId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(extensionId)) {
    return { error: 'Invalid extension ID format' };
  }
  if (typeof extractPath !== 'string' || !extractPath.trim()) {
    return { error: 'Invalid extension path' };
  }

  const extensionsBaseDir = path.resolve(path.join(app.getPath('userData'), 'extensions'));
  const resolvedExtractPath = path.resolve(extractPath.trim());
  if (!resolvedExtractPath.startsWith(extensionsBaseDir + path.sep)) {
    return { error: 'Extension permission path is outside the extensions directory' };
  }
  try {
    const realBase = fs.realpathSync(extensionsBaseDir);
    const realExtract = fs.realpathSync(resolvedExtractPath);
    if (!realExtract.startsWith(realBase + path.sep) ||
        path.basename(realExtract) !== extensionId) {
      return { error: 'Invalid extension permission path' };
    }
  } catch {
    return { error: 'Extension permission path does not exist' };
  }
  
  const permissions = await parseExtensionPermissions(resolvedExtractPath);
  
  // Combine all permissions for display
  const allPermissions = [
    ...permissions.permissions,
    ...permissions.optionalPermissions,
    ...permissions.hostPermissions
  ];
  
  const formattedPermissions = formatPermissionsForDisplay(allPermissions);
  
  const parentWin = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
  
  const confirmOptions: Electron.MessageBoxOptions = {
    type: 'question',
    buttons: ['Cancel', 'Install'],
    defaultId: 0,
    cancelId: 0,
    title: 'Review Extension Permissions',
    message: `Extension "${extensionId}" requests the following permissions:`,
    detail: formattedPermissions.join('\n\n'),
    checkboxLabel: 'Remember this decision',
    checkboxChecked: false
  };
  
  const { response, checkboxChecked } = parentWin
    ? await dialog.showMessageBox(parentWin, confirmOptions)
    : await dialog.showMessageBox(confirmOptions);
  
  if (response !== 1) {
    return { allowed: false, cancelled: true };
  }
  
  return { allowed: true, remember: checkboxChecked };
});

// --- NATIVE OS TEXT-TO-SPEECH (macOS High Fidelity) ---
let activeTtsProcess: child_process.ChildProcess | null = null;
// Generation counter: each speak request invalidates the previous one so a
// killed request's close-handler can never spawn a fallback that talks over
// the newer request.
let ttsGeneration = 0;

// ⚡ Perf: async execFile so a slow `/usr/bin/say` can never block the Electron main process
const execFileAsync = promisify(child_process.execFile);

ipcMain.handle('native-tts-get-voices', async (event) => {
  if (!isTrustedSender(event)) return [];
  if (process.platform === 'darwin') {
    try {
      const { stdout } = await execFileAsync('/usr/bin/say', ['-v', '?'], { encoding: 'utf8', timeout: 5000 });
      const lines = stdout.split('\n');
      const list: { name: string; lang: string; description: string }[] = [];
      for (const line of lines) {
        const match = line.match(/^([^\t#]+?)\s+([a-zA-Z]{2}_[a-zA-Z0-9]+)\s+#\s*(.*)$/);
        if (match) {
          list.push({
            name: match[1].trim(),
            lang: match[2].replace('_', '-'),
            description: match[3].trim()
          });
        }
      }
      return list;
    } catch (e) {
      console.error('Failed to get macOS native voices:', e);
      return [];
    }
  }
  return [];
});

ipcMain.handle('native-tts-speak', async (event, text: string, voiceName?: string, rate?: number, lang?: string) => {
  if (!isTrustedSender(event)) return { success: false, error: 'Unauthorized' };
  if (!text || typeof text !== 'string') return { success: false, error: 'Invalid text' };

  // Limit text length to 500,000 chars to avoid memory exhaustion
  if (text.length > 500000) {
    text = text.substring(0, 500000);
  }

  // Invalidate any in-flight request BEFORE killing it: its close handler runs
  // on a future tick, so bumping the generation first guarantees it observes
  // the mismatch and never spawns a voice-fallback over this request.
  const myGeneration = ++ttsGeneration;

  if (activeTtsProcess) {
    try {
      activeTtsProcess.kill();
    } catch (_) {}
    activeTtsProcess = null;
  }

  if (process.platform === 'darwin') {
    return new Promise((resolve) => {
      // 🔧 Robustness: hard overall cap so a hung `say` process can never leave this
      // handler pending forever. Single shared deadline across voice-fallback retries.
      let settled = false;
      let sayTimedOut = false;
      const sayTimeout = setTimeout(() => {
        sayTimedOut = true;
        if (activeTtsProcess) {
          try { activeTtsProcess.kill(); } catch (_) {}
          activeTtsProcess = null;
        }
      }, 120000);
      const finish = (result: { success: boolean; error?: string }) => {
        if (settled) return;
        settled = true;
        clearTimeout(sayTimeout);
        resolve(result);
      };

      // 🔒 Security: Sanitize voice name strictly against command flag injection
      let cleanVoice: string | null = null;
      if (voiceName && typeof voiceName === 'string') {
        const rawName = voiceName.split('(')[0].trim();
        if (/^[a-zA-Z0-9\s]+$/.test(rawName) && rawName.length <= 40 && !rawName.startsWith('-')) {
          cleanVoice = rawName;
        }
      }

      // If no voice specified, determine best default by language
      if (!cleanVoice && lang && typeof lang === 'string') {
        const prefix = lang.toLowerCase().split('-')[0];
        if (prefix === 'tr') cleanVoice = 'Yelda';
        else if (prefix === 'de') cleanVoice = 'Anna';
        else if (prefix === 'fr') cleanVoice = 'Thomas';
        else if (prefix === 'es') cleanVoice = 'Mónica';
        else if (prefix === 'it') cleanVoice = 'Alice';
        else if (prefix === 'ja') cleanVoice = 'Kyoko';
        else if (prefix === 'ru') cleanVoice = 'Milena';
        else cleanVoice = 'Samantha';
      }

      const args: string[] = [];
      if (cleanVoice) {
        args.push('-v', cleanVoice);
      }
      
      if (rate && typeof rate === 'number' && Number.isFinite(rate)) {
        const clampedRate = Math.max(0.5, Math.min(2.5, rate));
        const wpm = Math.round(175 * clampedRate);
        args.push('-r', String(wpm));
      }

      const runSay = (commandArgs: string[]) => {
        try {
          const proc = child_process.spawn('/usr/bin/say', commandArgs, {
            stdio: ['pipe', 'ignore', 'pipe']
          });
          activeTtsProcess = proc;

          // 🔧 Robustness: drain stderr so pipe backpressure can never stall the process
          if (proc.stderr) {
            proc.stderr.on('data', () => {});
          }

          if (proc.stdin) {
            proc.stdin.on('error', () => {});
            try {
              proc.stdin.write(text, 'utf8');
              proc.stdin.end();
            } catch (_) {}
          }

          proc.on('close', (code) => {
            if (activeTtsProcess === proc) activeTtsProcess = null;
            if (myGeneration !== ttsGeneration) {
              // A newer speak request or stop request superseded this one.
              finish({ success: false, error: 'Superseded or stopped' });
            } else if (sayTimedOut) {
              finish({ success: false, error: 'Speech synthesis timed out' });
            } else if (code === 0) {
              finish({ success: true });
            } else if (code !== null && commandArgs.includes('-v') && myGeneration === ttsGeneration) {
              // Only fallback if not cancelled/stopped and custom voice failed
              const fallbackArgs = commandArgs.filter((a, i) => a !== '-v' && commandArgs[i - 1] !== '-v');
              runSay(fallbackArgs);
            } else {
              finish({ success: false, error: `Process exited with code ${code}` });
            }
          });

          proc.on('error', (err) => {
            if (activeTtsProcess === proc) activeTtsProcess = null;
            finish({ success: false, error: err.message });
          });
        } catch (err: any) {
          activeTtsProcess = null;
          finish({ success: false, error: err.message });
        }
      };

      runSay(args);
    });
  }

  return { success: false, error: 'Native TTS is only available on macOS' };
});

ipcMain.handle('native-tts-stop', async (event) => {
  if (!isTrustedSender(event)) return false;
  ttsGeneration++; // Increment generation to invalidate any in-flight processes and close handlers
  if (activeTtsProcess) {
    try {
      activeTtsProcess.kill('SIGKILL');
    } catch (_) {}
    activeTtsProcess = null;
    return true;
  }
  return false;
});
