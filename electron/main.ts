console.log('Main process starting...');
import { app, BrowserWindow, ipcMain, session, globalShortcut, dialog, webContents, shell, nativeTheme, safeStorage } from 'electron';
import path from 'path';
import fetch from 'cross-fetch';
import fs from 'fs';
// @ts-ignore
import unzip from 'unzip-crx-3';
import { ElectronBlocker } from '@cliqz/adblocker-electron';
import { BrowserMCPServer } from './mcpServer.js';
import { autoUpdater } from 'electron-updater';

// Spoof user agent so Chrome Web Store enables the "Add to Chrome" button
app.userAgentFallback = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Aggressive GPU Acceleration flags for buttery smooth scrolling
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('disable-software-rasterizer');

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
let blocker: ElectronBlocker | null = null;
const activeDownloads = new Map<string, Electron.DownloadItem>();
let mcpServer: BrowserMCPServer | null = null;

// Initialize AdBlocker globally so IPC can access it
ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((engine) => {
  blocker = engine;
  blocker.on('request-blocked', (request: any) => {
    if (request.tabId && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ad-blocked', request.tabId);
    }
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    titleBarStyle: 'hiddenInset',
    ...(process.platform === 'win32' ? {
      titleBarOverlay: {
        color: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#f8fafc',
        symbolColor: nativeTheme.shouldUseDarkColors ? '#94a3b8' : '#64748b',
        height: 44
      }
    } : {}),
    trafficLightPosition: { x: 16, y: 16 },
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
    // Only allow navigation to localhost dev server or local file in prod
    if (url.startsWith('http://localhost:5173') || url.startsWith('file://')) {
      return;
    }
    event.preventDefault();
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

  if (isPrivacyShieldEnabled) {
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

  // Handle headers for WebGPU / WASM SharedArrayBuffer
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders: Record<string, string[]> = {};
    if (details.responseHeaders) {
      for (const [key, value] of Object.entries(details.responseHeaders)) {
        if (value) {
          responseHeaders[key] = Array.isArray(value) ? value : [value];
        }
      }
    }

    if (details.url.includes('localhost:5173')) {
      responseHeaders['Cross-Origin-Opener-Policy'] = ['same-origin'];
      responseHeaders['Cross-Origin-Embedder-Policy'] = ['credentialless'];
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




  // Listen for console messages from the renderer process and log them to the terminal
  mainWindow?.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] [${level}] ${message} (${sourceId}:${line})`);
  });
}

let nextDownloadAsSaveAs = false;

// Track URLs that failed HTTPS upgrade to prevent infinite loops
const upgradedUrls = new Set<string>();

app.whenReady().then(async () => {
  console.log('App is ready, creating window...');
  createWindow();

  // --- STRICT PERMISSION SYSTEM (SECURITY) ---
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const url = details.requestingUrl || webContents.getURL();
    
    // Auto-allow internal app pages
    if (url.startsWith('nova://') || url.startsWith('http://localhost:5173') || url.startsWith('devtools://')) {
      return callback(true);
    }
    
    // Map permission names to Turkish for the user dialog
    const permissionNames: Record<string, string> = {
      'media': 'Kamera ve Mikrofon',
      'geolocation': 'Konum (GPS)',
      'notifications': 'Bildirimler',
      'midiSysex': 'Müzik Cihazları (MIDI)',
      'pointerLock': 'Fare Kilidi',
      'fullscreen': 'Tam Ekran',
      'openExternal': 'Dış Uygulama Açma',
      'clipboard-read': 'Panoyu Okuma'
    };
    
    const permissionName = permissionNames[permission] || permission;

    dialog.showMessageBox(mainWindow!, {
      type: 'warning',
      buttons: ['İzin Ver', 'Engelle'],
      defaultId: 1, // Default to Block
      cancelId: 1,
      title: 'Güvenlik Uyarısı: İzin İsteği',
      message: 'Bir site donanımınıza erişmek istiyor!',
      detail: `Site: ${url}\n\nBu site "${permissionName}" izni istiyor.\nNe yapmak istersiniz?`
    }).then(({ response }) => {
      // response === 0 means "İzin Ver"
      callback(response === 0);
    }).catch(() => {
      callback(false);
    });
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    // If it's a silent check from the browser itself, allow it
    if (requestingOrigin.startsWith('nova://') || requestingOrigin.startsWith('http://localhost:5173')) {
      return true; 
    }
    
    // For external websites, deny by default for silent checks.
    // If they actually need it, they will trigger setPermissionRequestHandler via an active API call (like getUserMedia).
    // This prevents silent fingerprinting based on permission status.
    return false;
  });

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

  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdatesAndNotify();
      return { success: true, version: result?.updateInfo?.version || null };
    } catch (err: any) {
      console.error('Check for updates failed:', err);
      mainWindow?.webContents.send('update-error', err?.message || 'Check failed');
      return { success: false, error: err?.message || 'Check failed' };
    }
  });

  ipcMain.handle('install-update', () => {
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
  });

  // 🔒 Security: Block arbitrary window popups and route them to our secure tab system
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      mainWindow?.webContents.send('new-tab', url);
    }
    return { action: 'deny' };
  });

  if (contents.getType() === 'webview') {
    contents.on('will-navigate', (e, navigationUrl) => {
      // 0. Prevent Local File Access
      if (navigationUrl.startsWith('file://')) {
        e.preventDefault();
        console.warn('Blocked navigation to local file:', navigationUrl);
        return;
      }

      // 1. Phishing Check
      if (isPhishing(navigationUrl)) {
        e.preventDefault();
        mainWindow?.webContents.send('blocked-site', { url: navigationUrl, reason: 'phishing' });
        // Optional: you can inject a warning HTML directly or navigate to a local warning page
        contents.executeJavaScript(`
          document.body.innerHTML = '<div style="font-family:sans-serif;text-align:center;padding:50px;color:#ef4444;background:#fef2f2;height:100vh;display:flex;flex-direction:column;justify-content:center;"><h1>🚨 Tehlikeli Site Engellendi</h1><p>Bu sitenin (${navigationUrl}) oltalama (phishing) veya zararlı yazılım içerdiği tespit edildi.</p></div>';
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
          upgradedUrls.add(navigationUrl);
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
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler for Privacy Shield Toggle
ipcMain.handle('set-privacy-shield', (_event, enabled: boolean) => {
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

// Set theme source for dark mode rendering on pages
ipcMain.on('set-theme', (_event, theme: 'light' | 'dark' | 'system') => {
  nativeTheme.themeSource = theme;
});

// Capture thumbnail from a webview via its webContentsId
ipcMain.handle('capture-tab-thumbnail', async (_event, webContentsId: number) => {
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

// Auto-capture thumbnails when any webview finishes loading and push to renderer
app.on('web-contents-created', (_event, wc) => {
  wc.on('did-stop-loading', async () => {
    if (!mainWindow || wc.isDestroyed()) return;
    const wcId = wc.id;
    try {
      await new Promise(r => setTimeout(r, 800)); // Wait for render
      if (wc.isDestroyed()) return;
      const image = await wc.capturePage();
      if (image.isEmpty()) return;
      const dataUrl = image.resize({ width: 320, height: 200 }).toDataURL();
      mainWindow.webContents.send('tab-thumbnail-update', { webContentsId: wcId, dataUrl });
    } catch (_) {}
  });

  // Native Context Menu for webviews
  wc.on('context-menu', (e, params) => {
    // Sadece webview'ler için göster
    if (wc.getType() === 'webview') {
      const { Menu, MenuItem, clipboard } = require('electron');
      const menu = new Menu();

      // 1. Link Actions
      if (params.linkURL) {
        menu.append(new MenuItem({
          label: 'Bağlantıyı Yeni Sekmede Aç',
          click: () => mainWindow?.webContents.send('new-tab', params.linkURL)
        }));
        menu.append(new MenuItem({
          label: 'Bağlantı Adresini Kopyala',
          click: () => clipboard.writeText(params.linkURL)
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 2. Image Actions
      if (params.srcURL && params.mediaType === 'image') {
        menu.append(new MenuItem({
          label: 'Resmi Yeni Sekmede Aç',
          click: () => mainWindow?.webContents.send('new-tab', params.srcURL)
        }));
        menu.append(new MenuItem({
          label: 'Resmi Farklı Kaydet...',
          click: () => {
            nextDownloadAsSaveAs = true;
            wc.downloadURL(params.srcURL);
          }
        }));
        menu.append(new MenuItem({
          label: 'Resim Adresini Kopyala',
          click: () => clipboard.writeText(params.srcURL)
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 3. Text Selection Actions (Non-editable)
      if (params.selectionText && !params.isEditable) {
        menu.append(new MenuItem({ role: 'copy', label: 'Kopyala', accelerator: 'CmdOrCtrl+C' }));
        menu.append(new MenuItem({
          label: `Google'da Ara: "${params.selectionText.length > 20 ? params.selectionText.substring(0, 20) + '...' : params.selectionText}"`,
          click: () => mainWindow?.webContents.send('new-tab', `https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`)
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 4. Editable Field Actions (Inputs, Textareas)
      if (params.isEditable) {
        menu.append(new MenuItem({ role: 'undo', label: 'Geri Al' }));
        menu.append(new MenuItem({ role: 'redo', label: 'Yeniden Yap' }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({ role: 'cut', label: 'Kes' }));
        menu.append(new MenuItem({ role: 'copy', label: 'Kopyala' }));
        menu.append(new MenuItem({ role: 'paste', label: 'Yapıştır' }));
        menu.append(new MenuItem({ role: 'pasteAndMatchStyle', label: 'Stilsiz Yapıştır' }));
        menu.append(new MenuItem({ role: 'delete', label: 'Sil' }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({ role: 'selectAll', label: 'Tümünü Seç' }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 5. Standard Navigation (if clicking on empty space)
      if (!params.linkURL && !params.selectionText && params.mediaType === 'none' && !params.isEditable) {
        menu.append(new MenuItem({ label: 'Geri', click: () => wc.goBack(), enabled: wc.navigationHistory.canGoBack() }));
        menu.append(new MenuItem({ label: 'İleri', click: () => wc.goForward(), enabled: wc.navigationHistory.canGoForward() }));
        menu.append(new MenuItem({ label: 'Yeniden Yükle', accelerator: 'CmdOrCtrl+R', click: () => wc.reload() }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      // 6. Developer Tools
      menu.append(new MenuItem({ label: 'Öğeyi İncele (DevTools)', click: () => wc.inspectElement(params.x, params.y) }));
      
      menu.popup({ window: mainWindow || undefined });
    }
  });
});

// Download Controls
ipcMain.handle('pause-download', (_event, id: string) => {
  const item = activeDownloads.get(id);
  if (item && !item.isPaused()) {
    item.pause();
    return true;
  }
  return false;
});

ipcMain.handle('resume-download', (_event, id: string) => {
  const item = activeDownloads.get(id);
  if (item && item.canResume()) {
    item.resume();
    return true;
  }
  return false;
});

ipcMain.handle('cancel-download', (_event, id: string) => {
  const item = activeDownloads.get(id);
  if (item) {
    item.cancel();
    activeDownloads.delete(id);
    return true;
  }
  return false;
});

ipcMain.handle('open-download', (_event, pathStr: string) => {
  const downloadsPath = app.getPath('downloads');
  // 🔒 Security: Ensure path actually exists inside the Downloads folder
  if (pathStr && pathStr.startsWith(downloadsPath) && fs.existsSync(pathStr)) {
    shell.openPath(pathStr);
  }
});

ipcMain.handle('show-download-in-folder', (_event, pathStr: string) => {
  const downloadsPath = app.getPath('downloads');
  if (pathStr && pathStr.startsWith(downloadsPath) && fs.existsSync(pathStr)) {
    shell.showItemInFolder(pathStr);
  }
});

// MCP Server Controls
ipcMain.handle('start-mcp-server', async () => {
  if (mcpServer && !mcpServer.isRunning()) {
    await mcpServer.start();
    mainWindow?.webContents.send('mcp-status-changed', true);
    return true;
  }
  return false;
});

ipcMain.handle('stop-mcp-server', () => {
  if (mcpServer && mcpServer.isRunning()) {
    mcpServer.stop();
    mainWindow?.webContents.send('mcp-status-changed', false);
    return true;
  }
  return false;
});

ipcMain.handle('get-mcp-token', () => mcpServer?.getToken() || '');
ipcMain.handle('rotate-mcp-token', () => mcpServer?.rotateToken() || '');
ipcMain.handle('get-mcp-tool-settings', () => mcpServer?.getDisabledTools() || []);
ipcMain.handle('set-mcp-tool-enabled', (_event, toolName: string, enabled: boolean) => {
  mcpServer?.setToolEnabled(toolName, enabled);
  return true;
});

ipcMain.handle('get-mcp-status', () => {
  if (!mcpServer) return { running: false, port: 3020, clients: [], clientCount: 0 };
  return {
    running: mcpServer.isRunning(),
    port: 3020,
    clientCount: mcpServer.getClientCount(),
    clients: mcpServer.getConnectedClientsInfo()
  };
});

// Gizli mod session temizleme
ipcMain.handle('clear-incognito-session', async () => {
  try {
    const incogSession = session.fromPartition('incognito');
    await incogSession.clearStorageData(); // cookies, cache, localStorage vs.
    await incogSession.clearCache();
    return true;
  } catch (err) {
    console.error('Gizli mod temizlenirken hata:', err);
    return false;
  }
});

// Generic Secure Storage API (for future password manager, etc.)
ipcMain.handle('secure-store-set', async (_event, key: string, value: string) => {
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid key format');
    const keyPath = path.join(app.getPath('userData'), `secure_${key}`);
    const encrypted = safeStorage.isEncryptionAvailable() 
      ? safeStorage.encryptString(value) 
      : Buffer.from(value, 'utf-8');
    fs.writeFileSync(keyPath, encrypted);
    return true;
  } catch (err) {
    console.error('Secure store set error:', err);
    return false;
  }
});

ipcMain.handle('secure-store-get', async (_event, key: string) => {
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid key format');
    const keyPath = path.join(app.getPath('userData'), `secure_${key}`);
    if (fs.existsSync(keyPath)) {
      const encrypted = fs.readFileSync(keyPath);
      return safeStorage.isEncryptionAvailable() 
        ? safeStorage.decryptString(encrypted) 
        : encrypted.toString('utf-8');
    }
  } catch (err) {
    console.error('Secure store get error:', err);
  }
  return null;
});

// Generic JSON Storage API (for highlights, stats, whitelists, etc.)
ipcMain.handle('store-set', async (_event, key: string, value: string) => {
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid key format');
    const keyPath = path.join(app.getPath('userData'), `store_${key}.json`);
    fs.writeFileSync(keyPath, value, 'utf-8');
    return true;
  } catch (err) {
    console.error('Store set error:', err);
    return false;
  }
});

ipcMain.handle('store-get', async (_event, key: string) => {
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid key format');
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
ipcMain.handle('set-vpn', async (_event, config: { enabled: boolean; proxyUrl?: string }) => {
  if (config.enabled && config.proxyUrl) {
    await session.defaultSession.setProxy({ proxyRules: config.proxyUrl });
  } else {
    await session.defaultSession.setProxy({ proxyRules: 'direct://' });
  }
  return true;
});

// IPC Handler to fetch raw HTML (Bypasses CORS for Link Preview)
ipcMain.handle('fetch-page-html', async (_event, url: string) => {
  if (!url || typeof url !== 'string') return { error: 'Invalid URL' };
  
  // 🔒 Security: Prevent SSRF and local file reads (e.g. file://, ftp://)
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { error: 'Only HTTP/HTTPS protocols are allowed for this operation.' };
    }
  } catch (err) {
    return { error: 'Invalid URL format' };
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000) // 5s timeout
    });
    if (res.ok) {
      let html = await res.text();
      // Strip massive non-content tags before IPC transfer to prevent UI freezes
      html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      html = html.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
      html = html.replace(/<!--[\s\S]*?-->/g, ''); // strip comments
      return { success: true, html };
    }
    return { error: 'HTTP ' + res.status };
  } catch (err: any) {
    return { error: err.message };
  }
});

// IPC Handler for Autocomplete Suggestions (Bypasses CORS)
ipcMain.handle('get-suggestions', async (_event, query: string) => {
  if (!query || typeof query !== 'string') return [];
  try {
    const res = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 1) {
        return data[1];
      }
    }
  } catch (err) {
    // ignore
  }
  return [];
});

// Open dialog to select a folder for unpacked extension
ipcMain.handle('select-extension-folder', async () => {
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
ipcMain.handle('install-extension', async (_event, folderPath: string) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return { error: 'No window available' };
  try {
    const extInfo = await win.webContents.session.loadExtension(folderPath);
    loadedExtensions.push(extInfo);
    return { success: true, extension: extInfo };
  } catch (err) {
    console.error('Failed to load extension', err);
    return { error: (err as any).message || 'Failed to load extension' };
  }
});

// Return list of loaded extensions
ipcMain.handle('list-extensions', async () => {
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

  // Close popup when it loses focus
  popupWin.on('blur', () => {
    if (!popupWin.isDestroyed()) popupWin.close();
  });

  await popupWin.loadURL(url);
  return { success: true };
});

// Read Chrome Bookmarks
ipcMain.handle('import-chrome-bookmarks', async () => {
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

  try {
    const data = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
    const importedBookmarks: any[] = [];
    
    // Recursive function to extract URLs
    const extractNodes = (node: any) => {
      if (node.type === 'url') {
        importedBookmarks.push({
          id: `imported-${Date.now()}-${Math.random()}`,
          title: node.name,
          url: node.url,
          favicon: `https://www.google.com/s2/favicons?domain=${new URL(node.url).hostname}&sz=32`
        });
      } else if (node.type === 'folder' && node.children) {
        node.children.forEach(extractNodes);
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
ipcMain.handle('remove-extension', async (_event, extensionId: string) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return { error: 'No window available' };
  try {
    await win.webContents.session.removeExtension(extensionId);
    loadedExtensions = loadedExtensions.filter((e) => e.id !== extensionId);
    
    // Also delete it from disk so it doesn't load on next startup
    const extDir = path.join(app.getPath('userData'), 'extensions', extensionId);
    if (fs.existsSync(extDir)) {
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
ipcMain.handle('install-from-webstore', async (_event, urlOrId: string) => {
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
    
    const tempPath = path.join(app.getPath('userData'), 'temp_extensions');
    if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath, { recursive: true });
    
    const crxFilePath = path.join(tempPath, `${extensionId}.crx`);
    fs.writeFileSync(crxFilePath, buffer);
    
    const extractPath = path.join(app.getPath('userData'), 'extensions', extensionId);
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
      await unzip(crxFilePath, extractPath);
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
