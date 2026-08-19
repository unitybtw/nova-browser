console.log('Main process starting...');
import { app, BrowserWindow, ipcMain, session, globalShortcut, dialog, webContents, shell, nativeTheme, safeStorage } from 'electron';
import path from 'path';
import fetch from 'cross-fetch';
import dns from 'dns';
import { promisify } from 'util';
import fs from 'fs';
import child_process from 'child_process';
// @ts-ignore
import unzip from 'unzip-crx-3';
import { ElectronBlocker, parseFilter } from '@cliqz/adblocker-electron';
import { BrowserMCPServer } from './mcpServer.js';
import { autoUpdater } from 'electron-updater';

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
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-quic');
app.commandLine.appendSwitch('enable-tcp-fast-open');
app.commandLine.appendSwitch('enable-fast-unload');
app.commandLine.appendSwitch('enable-features', [
  'VaapiVideoDecoder',
  'CanvasOopRasterization',
  'SmoothScrolling',
  'ParallelDownloading',
  'BackForwardCache',
  'CSSSubgrid',
  'WebAssemblySimd',
  'OverlayScrollbar',
  'BlinkSchedulerYield'
].join(','));

// Increase v8 memory limit if doing heavy Local AI tasks in WebWorkers
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

let mainWindow: BrowserWindow | null = null;
let blockedDomains: string[] = [];

try {
  const blocklistPath = path.join(__dirname, '..', 'electron', 'blocked-domains.json');
  if (fs.existsSync(blocklistPath)) {
    blockedDomains = JSON.parse(fs.readFileSync(blocklistPath, 'utf8'));
  }
} catch (err) {
  console.error('Failed to load blocked domains:', err);
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
  if (event.senderFrame && mainWindow.webContents.mainFrame && event.senderFrame !== mainWindow.webContents.mainFrame) {
    return false;
  }
  return true;
}

// 🔒 Security: Validate dev server and app internal page origins strictly
function isTrustedAppOrigin(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol === 'nova:' || parsed.protocol === 'devtools:') return true;
    if (parsed.origin === 'http://localhost:5173') return true;
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
const activeDownloads = new Map<string, Electron.DownloadItem>();
let mcpServer: BrowserMCPServer | null = null;

let currentWhitelistFilters: any[] = [];

function updateAdblockWhitelist(whitelist: string[]) {
  if (!blocker) return;
  const newFilters = whitelist.map(host => parseFilter(`@@||${host}^$document,script,stylesheet,image,subdocument,xmlhttprequest`)).filter(Boolean);
  
  blocker.update({
    newNetworkFilters: newFilters as any[],
    removedNetworkFilters: currentWhitelistFilters as any[]
  });
  
  currentWhitelistFilters = newFilters;
}

// Initialize AdBlocker globally so IPC can access it
ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((engine) => {
  blocker = engine;
  
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
          }
          pendingAdBlocks.clear();
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
});

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
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: true
    }
  });

  // 🔒 Security: Prevent Drag and Drop navigation on the main UI window
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Only allow navigation to localhost dev server origin or the specific dist/index.html in prod
    if (isTrustedAppOrigin(url)) {
      return;
    }
    event.preventDefault();
    console.warn('Blocked main window navigation to non-app path:', url);
  });

  // Inject webstore API into all webviews
  session.defaultSession.setPreloads([
    path.join(__dirname, 'webstore-preload.cjs')
  ]);

  // Apply AdBlocker to session
  if (isPrivacyShieldEnabled && blocker) {
    blocker.enableBlockingInSession(session.defaultSession);
  } else if (blocker) {
    try { blocker.disableBlockingInSession(session.defaultSession); } catch(e) {}
  }

// Privacy Shield: Inject Do Not Track & Global Privacy Control headers
session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
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

  // Downloads Manager: Handle file downloads via Electron IPC
  session.defaultSession.on('will-download', (event, item, webContents) => {
    const downloadId = Date.now().toString();
    const filename = item.getFilename();
    const totalBytes = item.getTotalBytes();
    activeDownloads.set(downloadId, item);

    // Auto-install CRX extensions from Chrome Web Store
    if (filename.endsWith('.crx')) {
      item.cancel();
    } else if (nextDownloadAsSaveAs) {
      nextDownloadAsSaveAs = false;
      // Do not set save path so Electron shows the Save Dialog automatically
      item.once('done', (_event, state) => {
        if (state === 'completed') activeDownloads.delete(downloadId);
      });
    } else {
      item.setSavePath(path.join(app.getPath('downloads'), filename));
      item.once('done', (_event, state) => {
        if (state === 'completed') {
          activeDownloads.delete(downloadId);
        }
      });
    }

    mainWindow?.webContents.send('download-update', {
      id: downloadId,
      filename,
      url: item.getURL(),
      receivedBytes: 0,
      totalBytes,
      state: 'progressing'
    });

    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        mainWindow?.webContents.send('download-update', {
          id: downloadId,
          filename,
          receivedBytes: item.getReceivedBytes(),
          totalBytes,
          state: 'cancelled'
        });
      } else if (state === 'progressing') {
        mainWindow?.webContents.send('download-update', {
          id: downloadId,
          filename,
          receivedBytes: item.getReceivedBytes(),
          totalBytes,
          state: 'progressing',
          isPaused: item.isPaused()
        });
      }
    });

    item.once('done', (event, state) => {
      activeDownloads.delete(downloadId);
      mainWindow?.webContents.send('download-update', {
        id: downloadId,
        filename,
        receivedBytes: item.getReceivedBytes(),
        totalBytes,
        state: state === 'completed' ? 'completed' : 'cancelled',
        savePath: item.getSavePath()
      });
    });
  });

  // Handle headers for WebGPU / WASM SharedArrayBuffer + CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders: Record<string, string[]> = {};
    if (details.responseHeaders) {
      for (const [key, value] of Object.entries(details.responseHeaders)) {
        if (value) {
          responseHeaders[key] = Array.isArray(value) ? value : [value];
        }
      }
    }

    let isDevLocalhost = false;
    let isAppFile = false;
    try {
      const parsed = new URL(details.url);
      if (parsed.origin === 'http://localhost:5173') {
        isDevLocalhost = true;
      }
      if (parsed.protocol === 'file:') {
        isAppFile = true;
      }
    } catch {}

    if (isDevLocalhost) {
      responseHeaders['Cross-Origin-Opener-Policy'] = ['same-origin'];
      responseHeaders['Cross-Origin-Embedder-Policy'] = ['credentialless'];
    }

    // VULN-16: Add Content Security Policy for the app's own pages
    if (isAppFile || isDevLocalhost) {
      const isDev = isDevLocalhost || !app.isPackaged;
      responseHeaders['Content-Security-Policy'] = [
        isDev
          ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: http://localhost:*; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https: http:; connect-src 'self' ws: wss: http: https:; font-src 'self' data: https: https://fonts.gstatic.com; worker-src 'self' blob:; base-uri 'self' https: http:;"
          : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https: http:; connect-src 'self' ws: wss: http: https:; font-src 'self' data: https: https://fonts.gstatic.com; worker-src 'self' blob:; base-uri 'self' https: http:;"
      ];
    }

    if (isPrivacyShieldEnabled) {
      responseHeaders['X-Content-Type-Options'] = ['nosniff'];
    }
    callback({ responseHeaders });
  });

  const devUrl = 'http://localhost:5173';
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    const loadDev = () => {
      mainWindow?.loadURL(devUrl).catch(() => {
        setTimeout(loadDev, 500);
      });
    };
    loadDev();
    // mainWindow?.webContents.openDevTools({ mode: 'bottom' });

  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }




  // Listen for console messages from the renderer process and log them safely to the terminal
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

let nextDownloadAsSaveAs = false;

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

app.whenReady().then(async () => {
  console.log('App is ready, creating window...');
  createWindow();

  // --- STRICT PERMISSION SYSTEM (SECURITY) ---
  const applyStrictSecurityToSession = (targetSession: Electron.Session) => {
    targetSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const url = details.requestingUrl || webContents.getURL() || '';
      
      // Auto-allow internal app pages
      if (isTrustedAppOrigin(url)) {
        return callback(true);
      }
      
      // Map permission names for the user dialog
      const permissionNames: Record<string, string> = {
        'media': 'Camera and Microphone',
        'geolocation': 'Location (GPS)',
        'notifications': 'Notifications',
        'midiSysex': 'Music Devices (MIDI)',
        'pointerLock': 'Pointer Lock',
        'fullscreen': 'Fullscreen',
        'openExternal': 'Open External App',
        'clipboard-read': 'Read Clipboard'
      };
      
      const permissionName = permissionNames[permission] || permission;

      if (!mainWindow || mainWindow.isDestroyed()) {
        return callback(false);
      }

      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['Allow', 'Block'],
        defaultId: 1, // Default to Block
        cancelId: 1,
        title: 'Security Warning: Permission Request',
        message: 'A site wants to access your device!',
        detail: `Site: ${url}\n\nThis site is requesting "${permissionName}" permission.\nWhat would you like to do?`
      }).then(({ response }) => {
        // response === 0 means "Allow"
        callback(response === 0);
      }).catch(() => {
        callback(false);
      });
    });

    targetSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
      // If it's a silent check from the browser itself, allow it
      if (isTrustedAppOrigin(requestingOrigin)) {
        return true; 
      }
      
      // For external websites, deny by default for silent checks.
      // This prevents silent fingerprinting based on permission status.
      return false;
    });
  };

  applyStrictSecurityToSession(session.defaultSession);
  applyStrictSecurityToSession(session.fromPartition('incognito'));

  // Initialize and auto-start MCP Server
  mcpServer = new BrowserMCPServer(3020);
  mcpServer.setMainWindow(mainWindow);
  try {
    await mcpServer.start();
    console.log('[MCP] Server started on port 3020');
  } catch (err) {
    console.error('[MCP] Failed to start server:', err);
  }

  // Auto Updater Configuration
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
    mainWindow?.webContents.send('update-checking');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    mainWindow?.webContents.send('update-available', { version: info.version, releaseDate: info.releaseDate });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('No update available. Current version is up to date:', info.version);
    mainWindow?.webContents.send('update-not-available', { version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${Math.round(progress.percent)}%`);
    mainWindow?.webContents.send('update-download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    mainWindow?.webContents.send('update-downloaded', { version: info.version, releaseDate: info.releaseDate });
  });

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err);
    mainWindow?.webContents.send('update-error', err?.message || 'Unknown update error');
  });

  ipcMain.handle('check-for-updates', async (event) => {
    if (!isTrustedSender(event)) return { success: false, error: 'Unauthorized sender' };
    try {
      const result = await autoUpdater.checkForUpdatesAndNotify();
      return { success: true, version: result?.updateInfo?.version || null };
    } catch (err: any) {
      console.error('Check for updates failed:', err);
      mainWindow?.webContents.send('update-error', err?.message || 'Check failed');
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
            session.defaultSession.loadExtension(extPath).then(extInfo => {
              loadedExtensions.push(extInfo);
              console.log(`Loaded extension: ${extInfo.name}`);
            }).catch(err => {
              console.error(`Failed to load extension at ${extPath}:`, err);
            });
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

  app.on('browser-window-focus', () => {
    globalShortcut.register('CommandOrControl+K', () => {
      mainWindow?.webContents.send('shortcut', 'toggle-omnibox');
    });

    globalShortcut.register('CommandOrControl+F', () => {
      if (mainWindow?.isFocused()) {
        mainWindow?.webContents.send('shortcut', 'find-in-page');
      }
    });
  });

  app.on('browser-window-blur', () => {
    globalShortcut.unregisterAll();
  });
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
        mainWindow?.webContents.send('new-tab', url);
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
      // 0. Prevent dangerous protocols & local file access on webviews
      const dangerousProtocols = ['file:', 'javascript:', 'data:', 'vbscript:', 'chrome:', 'edge:', 'about:config'];
      try {
        const parsed = new URL(navigationUrl);
        if (dangerousProtocols.includes(parsed.protocol) || (!['http:', 'https:', 'about:'].includes(parsed.protocol))) {
          e.preventDefault();
          console.warn('Blocked navigation to forbidden protocol:', navigationUrl);
          return;
        }
      } catch {
        e.preventDefault();
        return;
      }

      // 1. Phishing Check
      if (isPhishing(navigationUrl)) {
        e.preventDefault();
        mainWindow?.webContents.send('blocked-site', { url: navigationUrl, reason: 'phishing' });
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
          
          // Try loading HTTPS. If it fails, fallback to HTTP.
          contents.loadURL(httpsUrl).catch(() => {
            // If HTTPS fails (e.g. SSL error), fallback to HTTP
            contents.loadURL(navigationUrl);
          });
        }
      } catch {}
    });
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  
  try {
    const settingsPath = path.join(app.getPath('userData'), 'store_settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (settings.clearOnExit) {
        session.defaultSession.clearStorageData();
        session.defaultSession.clearCache();
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
      blocker.enableBlockingInSession(session.defaultSession);
    } else {
      try { blocker.disableBlockingInSession(session.defaultSession); } catch(e) {}
    }
  }
  return isPrivacyShieldEnabled;
});

ipcMain.handle('set-do-not-track', (event, enabled: boolean) => {
  if (!isTrustedSender(event)) return;
  isDoNotTrackEnabled = Boolean(enabled);
});

// Dynamic window traffic light visibility on macOS
ipcMain.handle('set-window-button-visibility', (event, visible: boolean) => {
  if (!isTrustedSender(event)) return;
  if (mainWindow && !mainWindow.isDestroyed() && process.platform === 'darwin') {
    try {
      mainWindow.setWindowButtonVisibility(Boolean(visible));
    } catch (_) {}
  }
});

// Daily 4K Ultra HD Wallpaper Engine (Bing 4K UHD Archive + 4K Desktop Masterpieces)
ipcMain.handle('fetch-wallpaper-photos', async (event) => {
  if (!isTrustedSender(event)) return [];
  const results: any[] = [];

  // Provider 1: Bing Official Daily 4K UHD Image Archive (3840x2160 Ultra HD)
  try {
    const bingRes = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=en-US');
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
      headers: { 'User-Agent': 'Mozilla/5.0 NovaBrowser/1.0', 'Accept': 'application/json' }
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

      // Restore original device metrics
      await wc.debugger.sendCommand('Emulation.clearDeviceMetricsOverride');

      if (response && (response as any).data) {
        dataUrl = `data:image/png;base64,${(response as any).data}`;
      }
    } catch (err) {
      console.error('Screenshot CDP command failed:', err);
    } finally {
      if (attached) {
        wc.debugger.detach();
      }
    }
    
    return dataUrl;
  } catch (err) {
    console.error('Failed to capture full page:', err);
    return null;
  }
});

// Auto-capture thumbnails when any webview finishes loading and push to renderer
app.on('web-contents-created', (_event, wc) => {
  // Native Context Menu for webviews (ensure single listener attachment / clean removal)
  wc.removeAllListeners('context-menu');
  wc.on('context-menu', (e, params) => {
    // Only show for webviews
    if (wc.getType() === 'webview') {
      const { Menu, MenuItem, clipboard } = require('electron');
      const menu = new Menu();

      // 1. Link Actions
      if (params.linkURL) {
        menu.append(new MenuItem({
          label: 'Open Link in New Tab',
          click: () => mainWindow?.webContents.send('new-tab', params.linkURL)
        }));
        menu.append(new MenuItem({
          label: 'Copy Link Address',
          click: () => clipboard.writeText(params.linkURL)
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 2. Image Actions
      if (params.srcURL && params.mediaType === 'image') {
        menu.append(new MenuItem({
          label: 'Open Image in New Tab',
          click: () => mainWindow?.webContents.send('new-tab', params.srcURL)
        }));
        menu.append(new MenuItem({
          label: 'Save Image As...',
          click: () => {
            nextDownloadAsSaveAs = true;
            wc.downloadURL(params.srcURL);
          }
        }));
        menu.append(new MenuItem({
          label: 'Copy Image Address',
          click: () => clipboard.writeText(params.srcURL)
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 3. Text Selection Actions (Non-editable)
      if (params.selectionText && !params.isEditable) {
        menu.append(new MenuItem({ role: 'copy', label: 'Copy', accelerator: 'CmdOrCtrl+C' }));
        menu.append(new MenuItem({
          label: `Search Google for: "${params.selectionText.length > 20 ? params.selectionText.substring(0, 20) + '...' : params.selectionText}"`,
          click: () => mainWindow?.webContents.send('new-tab', `https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`)
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 4. Editable Field Actions (Inputs, Textareas)
      if (params.isEditable) {
        menu.append(new MenuItem({ role: 'undo', label: 'Undo' }));
        menu.append(new MenuItem({ role: 'redo', label: 'Redo' }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({ role: 'cut', label: 'Cut' }));
        menu.append(new MenuItem({ role: 'copy', label: 'Copy' }));
        menu.append(new MenuItem({ role: 'paste', label: 'Paste' }));
        menu.append(new MenuItem({ role: 'pasteAndMatchStyle', label: 'Paste and Match Style' }));
        menu.append(new MenuItem({ role: 'delete', label: 'Delete' }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({ role: 'selectAll', label: 'Select All' }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 5. Standard Navigation (if clicking on empty space)
      if (!params.linkURL && !params.selectionText && params.mediaType === 'none' && !params.isEditable) {
        menu.append(new MenuItem({ label: 'Back', click: () => wc.goBack(), enabled: wc.navigationHistory.canGoBack() }));
        menu.append(new MenuItem({ label: 'Forward', click: () => wc.goForward(), enabled: wc.navigationHistory.canGoForward() }));
        menu.append(new MenuItem({ label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => wc.reload() }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 6. Developer Tools
      try {
        const settingsPath = path.join(app.getPath('userData'), 'store_settings.json');
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
          if (settings.developerMode) {
            menu.append(new MenuItem({ label: 'Inspect Element', click: () => wc.inspectElement(params.x, params.y) }));
          }
        }
      } catch (e) {}
      
      menu.popup({ window: mainWindow || undefined });
    }
  });
});

// Download Controls
ipcMain.handle('pause-download', (event, id: string) => {
  if (!isTrustedSender(event)) return false;
  if (!id || typeof id !== 'string') return false;
  const item = activeDownloads.get(id);
  if (item && !item.isPaused()) {
    item.pause();
    return true;
  }
  return false;
});

ipcMain.handle('resume-download', (event, id: string) => {
  if (!isTrustedSender(event)) return false;
  if (!id || typeof id !== 'string') return false;
  const item = activeDownloads.get(id);
  if (item && item.canResume()) {
    item.resume();
    return true;
  }
  return false;
});

ipcMain.handle('cancel-download', (event, id: string) => {
  if (!isTrustedSender(event)) return false;
  if (!id || typeof id !== 'string') return false;
  const item = activeDownloads.get(id);
  if (item) {
    item.cancel();
    activeDownloads.delete(id);
    return true;
  }
  return false;
});

ipcMain.handle('open-download', (event, pathStr: string) => {
  if (!isTrustedSender(event)) return false;
  if (!pathStr || typeof pathStr !== 'string') return false;
  const downloadsPath = app.getPath('downloads');
  try {
    const resolvedPath = path.resolve(pathStr);
    const realPath = fs.realpathSync(resolvedPath);
    const realDownloads = fs.realpathSync(downloadsPath);
    if (realPath && realPath.startsWith(realDownloads + path.sep) && fs.existsSync(realPath)) {
      shell.openPath(realPath);
      return true;
    }
  } catch (err) {
    console.error('Error opening download:', err);
  }
  return false;
});

ipcMain.handle('show-download-in-folder', (event, pathStr: string) => {
  if (!isTrustedSender(event)) return false;
  if (!pathStr || typeof pathStr !== 'string') return false;
  const downloadsPath = app.getPath('downloads');
  try {
    const resolvedPath = path.resolve(pathStr);
    const realPath = fs.realpathSync(resolvedPath);
    const realDownloads = fs.realpathSync(downloadsPath);
    if (realPath && realPath.startsWith(realDownloads + path.sep) && fs.existsSync(realPath)) {
      shell.showItemInFolder(realPath);
      return true;
    }
  } catch (err) {
    console.error('Error showing download in folder:', err);
  }
  return false;
});

// MCP Server Controls
ipcMain.handle('start-mcp-server', async (event) => {
  if (!isTrustedSender(event)) return false;
  if (mcpServer && !mcpServer.isRunning()) {
    await mcpServer.start();
    mainWindow?.webContents.send('mcp-status-changed', true);
    return true;
  }
  return false;
});

ipcMain.handle('stop-mcp-server', (event) => {
  if (!isTrustedSender(event)) return false;
  if (mcpServer && mcpServer.isRunning()) {
    mcpServer.stop();
    mainWindow?.webContents.send('mcp-status-changed', false);
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
  if (!isTrustedSender(event)) return { running: false, port: 3020, clients: [], clientCount: 0 };
  if (!mcpServer) return { running: false, port: 3020, clients: [], clientCount: 0 };
  return {
    running: mcpServer.isRunning(),
    port: 3020,
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

// Generic Secure Storage API (for future password manager, etc.)
ipcMain.handle('secure-store-set', async (event, key: string, value: string) => {
  if (!isTrustedSender(event)) return false;
  try {
    if (!key || typeof key !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid key format');
    if (typeof value !== 'string') throw new Error('Invalid value format');
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
        return safeStorage.decryptString(raw);
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

// VULN-18: Helper to check if an IP is in a private/reserved range
function isPrivateIP(ip: string): boolean {
  if (!ip) return true;
  // IPv4-mapped IPv6
  if (ip.startsWith('::ffff:')) {
    return isPrivateIP(ip.substring(7));
  }
  // IPv4 private & reserved ranges
  if (/^127\./.test(ip)) return true; // Loopback
  if (/^10\./.test(ip)) return true; // Class A private
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true; // Class B private
  if (/^192\.168\./.test(ip)) return true; // Class C private
  if (/^169\.254\./.test(ip)) return true; // Link-local / Cloud Metadata
  if (/^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(ip)) return true; // CGNAT RFC 6598
  if (/^0\./.test(ip) || ip === '0.0.0.0') return true;
  if (/^192\.0\.2\./.test(ip) || /^198\.51\.100\./.test(ip) || /^203\.0\.113\./.test(ip)) return true; // Documentation RFC 5737
  if (/^192\.0\.0\./.test(ip) || /^192\.88\.99\./.test(ip)) return true; // IETF Protocol Assignments / 6to4 relay
  if (/^198\.(1[89])\./.test(ip)) return true; // Benchmarking RFC 2544
  if (/^(22[4-9]|23[0-9])\./.test(ip)) return true; // Multicast RFC 5771
  if (/^(24[0-9]|25[0-5])\./.test(ip)) return true; // Reserved / Broadcast
  if (/^255\.255\.255\.255$/.test(ip)) return true;
  // IPv6 loopback / local / documentation
  if (ip === '::1' || ip === '::' || ip === '0:0:0:0:0:0:0:1' || ip === '0:0:0:0:0:0:0:0') return true;
  if (/^(fe80|fc00|fd00|2001:db8):/i.test(ip)) return true;
  return false;
}

const dnsLookup = promisify(dns.lookup);

// IPC Handler to fetch raw HTML (Bypasses CORS for Link Preview with SSRF protection)
ipcMain.handle('fetch-page-html', async (event, url: string) => {
  if (!isTrustedSender(event)) return { error: 'Unauthorized' };
  if (!url || typeof url !== 'string') return { error: 'Invalid URL' };
  
  let currentUrl = url;
  const MAX_REDIRECTS = 3;
  
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(currentUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return { error: 'Only HTTP/HTTPS protocols are allowed for this operation.' };
      }
    } catch (err) {
      return { error: 'Invalid URL format' };
    }

    try {
      const hostname = parsedUrl.hostname.toLowerCase();
      if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
        return { error: 'Requests to local hostnames are blocked.' };
      }
      const addresses = await dnsLookup(hostname, { all: true }) as any;
      const addrList = Array.isArray(addresses) ? addresses : [addresses];
      for (const entry of addrList) {
        if (isPrivateIP(entry.address)) {
          return { error: 'Requests to private/internal IP addresses are blocked.' };
        }
      }
      const port = parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80');
      if (port === '3020') {
        return { error: 'Requests to MCP server port are blocked.' };
      }
    } catch (err: any) {
      return { error: 'DNS resolution failed: ' + err.message };
    }

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
        if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
          return { error: 'Response body exceeds 5MB size limit' };
        }
        let html = await res.text();
        if (html.length > 5 * 1024 * 1024) {
          html = html.substring(0, 5 * 1024 * 1024);
        }
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

// IPC Handler for Autocomplete Suggestions with In-Memory LRU Cache
const suggestionsCache = new Map<string, string[]>();
ipcMain.handle('get-suggestions', async (event, query: string) => {
  if (!isTrustedSender(event)) return [];
  if (!query || typeof query !== 'string') return [];
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return [];

  if (suggestionsCache.has(cleanQ)) {
    return suggestionsCache.get(cleanQ)!;
  }

  try {
    const res = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(cleanQ)}&type=list`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 1) {
        const list = data[1].slice(0, 8);
        if (suggestionsCache.size > 200) {
          const firstKey = suggestionsCache.keys().next().value;
          if (firstKey) suggestionsCache.delete(firstKey);
        }
        suggestionsCache.set(cleanQ, list);
        return list;
      }
    }
  } catch (err) {
    // ignore
  }
  return [];
});

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

// Extension management (in‑memory list)
let loadedExtensions: any[] = [];

// Load an unpacked extension from a folder path
ipcMain.handle('install-extension', async (event, folderPath: string) => {
  if (!isTrustedSender(event)) return { error: 'Unauthorized' };
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return { error: 'No window available' };
  // VULN-15: Validate that folderPath is within userData/extensions and has no traversal
  if (folderPath.includes('..')) {
    return { error: 'Invalid extension path: path traversal detected.' };
  }
  const extensionsDir = path.resolve(path.join(app.getPath('userData'), 'extensions'));
  const resolvedFolder = path.resolve(folderPath);
  if (!resolvedFolder.startsWith(extensionsDir + path.sep) && resolvedFolder !== extensionsDir) {
    return { error: 'Extension must be within the app extensions directory.' };
  }
  try {
    const extInfo = await win.webContents.session.loadExtension(resolvedFolder);
    loadedExtensions.push(extInfo);
    return { success: true, extension: extInfo };
  } catch (err) {
    console.error('Failed to load extension', err);
    return { error: (err as any).message || 'Failed to load extension' };
  }
});

// Return list of loaded extensions
ipcMain.handle('list-extensions', async (event) => {
  if (!isTrustedSender(event)) return [];
  return Promise.all(loadedExtensions.map(async (e) => {
    let iconData = undefined;
    let popupUrl = undefined;
    try {
      const manifestPath = path.join(e.path, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Find popup URL
        if (manifest.action?.default_popup) {
          popupUrl = manifest.action.default_popup;
        } else if (manifest.browser_action?.default_popup) {
          popupUrl = manifest.browser_action.default_popup;
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
      name: e.name,
      id: e.id,
      enabled: true,
      path: e.path,
      version: e.version,
      description: e.description,
      iconData,
      popupUrl
    };
  }));
});

// Open Extension Popup Window
ipcMain.handle('open-extension-popup', async (event, url, bounds) => {
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
  } else if (!url.startsWith('chrome-extension://')) {
    return { error: 'Blocked: only chrome-extension:// and local extension file:// URLs are allowed.' };
  }

  const popupWin = new BrowserWindow({
    width: 380,
    height: 500,
    x: bounds?.x ? Math.round(bounds.x) - 340 : undefined,
    y: bounds?.y ? Math.round(bounds.y) + 40 : undefined,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      session: session.defaultSession
    }
  });

  // 🔒 Security: Block arbitrary window popups from extension popup content
  popupWin.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        mainWindow?.webContents.send('new-tab', url);
      }
    } catch {}
    return { action: 'deny' };
  });

  // Close popup when it loses focus
  popupWin.on('blur', () => {
    if (!popupWin.isDestroyed()) popupWin.close();
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
  if (mainWindow) {
    const { response } = await dialog.showMessageBox(mainWindow, {
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
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return { error: 'No window available' };
  try {
    await win.webContents.session.removeExtension(extensionId);
    loadedExtensions = loadedExtensions.filter((e) => e.id !== extensionId);
    
    // Also delete it from disk so it doesn't load on next startup
    const extensionsBaseDir = path.resolve(path.join(app.getPath('userData'), 'extensions'));
    const extDir = path.resolve(path.join(extensionsBaseDir, extensionId));
    if (extDir.startsWith(extensionsBaseDir + path.sep) && fs.existsSync(extDir)) {
      fs.rmSync(extDir, { recursive: true, force: true });
    }
    
    if (win) win.webContents.send('extension-changed');
    return { success: true };
  } catch (err) {
    console.error('Failed to remove extension', err);
    return { error: (err as any).message || 'Failed to remove extension' };
  }
});

// Install from Chrome Web Store
ipcMain.handle('install-from-webstore', async (event, urlOrId: string) => {
  // 🔒 Security: Allow only trusted main window OR Chrome Web Store origin
  const senderUrl = event.sender?.getURL() || '';
  const isFromMainWindow = isTrustedSender(event);
  const isFromWebstore = senderUrl.startsWith('https://chromewebstore.google.com/') || senderUrl.startsWith('https://chrome.google.com/webstore/');
  if (!isFromMainWindow && !isFromWebstore) {
    return { error: 'Unauthorized: install-from-webstore can only be called from Chrome Web Store or Nova main window.' };
  }

  try {
    // Extract ID: 32 characters of a-p
    const match = urlOrId.match(/[a-p]{32}/);
    if (!match) return { error: 'Geçersiz eklenti URL\'si veya ID\'si' };
    const extensionId = match[0];
    
    const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&os=mac&arch=x86-64&nacl_arch=x86-64&prod=chromecrx&prodchannel=unknown&prodversion=126.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;
    
    const res = await fetch(crxUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      }
    });
    
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Eklenti indirilemedi (HTTP ${res.status}): ${errText.substring(0, 100)}`);
    }
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 🔒 Security: Validate CRX magic header (Cr24: 0x43 0x72 0x32 0x34) or PK zip header (0x50 0x4B)
    if (buffer.length < 4 || ((buffer[0] !== 0x43 || buffer[1] !== 0x72 || buffer[2] !== 0x32 || buffer[3] !== 0x34) && (buffer[0] !== 0x50 || buffer[1] !== 0x4B))) {
      throw new Error('Downloaded file is not a valid extension package format.');
    }
    
    const tempPath = path.join(app.getPath('userData'), 'temp_extensions');
    if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath, { recursive: true });
    
    const crxFilePath = path.join(tempPath, `${extensionId}.crx`);
    fs.writeFileSync(crxFilePath, buffer);
    
    const extensionsBaseDir = path.join(app.getPath('userData'), 'extensions');
    const extractPath = path.join(extensionsBaseDir, extensionId);
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
      await unzip(crxFilePath, extractPath);

      // Verify realpath of extractPath to prevent directory escaping
      try {
        const realExtract = fs.realpathSync(extractPath);
        const realBase = fs.realpathSync(extensionsBaseDir);
        if (!realExtract.startsWith(realBase + path.sep)) {
          fs.rmSync(extractPath, { recursive: true, force: true });
          throw new Error('Extension extraction path escaped target directory.');
        }
      } catch (err) {
        fs.rmSync(extractPath, { recursive: true, force: true });
        throw err;
      }
    }
    
    const win = BrowserWindow.getAllWindows()[0];
    
    // Check if it's already loaded to prevent duplicate loading
    const isAlreadyLoaded = loadedExtensions.some(e => e.id === extensionId);
    let extInfo;
    if (!isAlreadyLoaded) {
      extInfo = await win?.webContents.session.loadExtension(extractPath) || await session.defaultSession.loadExtension(extractPath);
      loadedExtensions.push(extInfo);
    } else {
      extInfo = loadedExtensions.find(e => e.id === extensionId);
    }
    
    try { fs.unlinkSync(crxFilePath); } catch (e) {}
    
    // Notify the frontend immediately so it doesn't wait for polling
    if (win) win.webContents.send('extension-changed');
    
    return { success: true, extension: extInfo };
  } catch (err: any) {
    console.error('Web Store Install Error:', err);
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' };
  }
});

// --- NATIVE OS TEXT-TO-SPEECH (macOS High Fidelity) ---
let activeTtsProcess: child_process.ChildProcess | null = null;

ipcMain.handle('native-tts-get-voices', async (event) => {
  if (!isTrustedSender(event)) return [];
  if (process.platform === 'darwin') {
    try {
      const output = child_process.execFileSync('/usr/bin/say', ['-v', '?'], { encoding: 'utf8', timeout: 5000 });
      const lines = output.split('\n');
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

ipcMain.handle('native-tts-speak', async (event, text: string, voiceName?: string, rate?: number) => {
  if (!isTrustedSender(event)) return { success: false, error: 'Unauthorized' };
  if (!text || typeof text !== 'string') return { success: false, error: 'Invalid text' };

  // Limit text length to 500,000 chars to avoid memory exhaustion
  if (text.length > 500000) {
    text = text.substring(0, 500000);
  }

  if (activeTtsProcess) {
    try {
      activeTtsProcess.kill();
    } catch (_) {}
    activeTtsProcess = null;
  }

  if (process.platform === 'darwin') {
    return new Promise((resolve) => {
      // 🔒 Security: Sanitize voice name strictly against command flag injection
      let cleanVoice = 'Yelda';
      if (voiceName && typeof voiceName === 'string') {
        const rawName = voiceName.split('(')[0].trim();
        if (/^[a-zA-Z0-9\s]+$/.test(rawName) && rawName.length <= 40 && !rawName.startsWith('-')) {
          cleanVoice = rawName;
        }
      }

      const args: string[] = ['-v', cleanVoice];
      
      if (rate && typeof rate === 'number' && Number.isFinite(rate)) {
        const clampedRate = Math.max(0.5, Math.min(2.5, rate));
        const wpm = Math.round(175 * clampedRate);
        args.push('-r', String(wpm));
      }

      try {
        // 🔒 Security: Pipe text via stdin instead of CLI arguments to prevent argument length limits (E2BIG)
        const proc = child_process.spawn('/usr/bin/say', args, {
          stdio: ['pipe', 'ignore', 'pipe']
        });
        activeTtsProcess = proc;

        proc.stdin.write(text, 'utf8');
        proc.stdin.end();

        proc.on('close', (code) => {
          if (activeTtsProcess === proc) activeTtsProcess = null;
          resolve({ success: code === 0 });
        });

        proc.on('error', (err) => {
          if (activeTtsProcess === proc) activeTtsProcess = null;
          resolve({ success: false, error: err.message });
        });
      } catch (err: any) {
        activeTtsProcess = null;
        resolve({ success: false, error: err.message });
      }
    });
  }

  return { success: false, error: 'Native TTS is only available on macOS' };
});

ipcMain.handle('native-tts-stop', async (event) => {
  if (!isTrustedSender(event)) return false;
  if (activeTtsProcess) {
    try {
      activeTtsProcess.kill();
    } catch (_) {}
    activeTtsProcess = null;
    return true;
  }
  return false;
});

