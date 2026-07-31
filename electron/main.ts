console.log('Main process starting...');
import { app, BrowserWindow, ipcMain, session, globalShortcut, dialog, webContents, shell, nativeTheme, safeStorage } from 'electron';
import path from 'path';
import fetch from 'cross-fetch';
import fs from 'fs';
// @ts-ignore
import unzip from 'unzip-crx-3';
import { ElectronBlocker } from '@cliqz/adblocker-electron';
import { BrowserMCPServer } from './mcpServer.js';

// Spoof user agent so Chrome Web Store enables the "Add to Chrome" button
app.userAgentFallback = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Performance and GPU flags
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
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
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: false
    }
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
      // Chrome Web Store extensions are usually named like "extension_1_2_3.crx"
      // or "cjpalhdlnbpafiamejdnhcphjbkeiagm.crx"
      // Since it's hard to get the ID from here, we will just let install-from-webstore IPC handle it
      // and we CANCEL the native download to prevent duplicate installation!
      item.cancel();
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

app.whenReady().then(async () => {
  console.log('App is ready, creating window...');
  createWindow();

  // Initialize and auto-start MCP Server
  mcpServer = new BrowserMCPServer(3020);
  mcpServer.setMainWindow(mainWindow);
  try {
    await mcpServer.start();
    console.log('[MCP] Server started on port 3020');
  } catch (err) {
    console.error('[MCP] Failed to start server:', err);
  }

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
  if (contents.getType() === 'webview') {
    contents.on('will-navigate', (e, navigationUrl) => {
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
          e.preventDefault();
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
    // Only show for webviews, not the main browser UI
    if (wc.getType() === 'webview') {
      const { Menu, MenuItem, clipboard } = require('electron');
      const menu = new Menu();

      if (params.linkURL) {
        menu.append(new MenuItem({
          label: 'Bağlantı Adresini Kopyala',
          click: () => clipboard.writeText(params.linkURL)
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      if (params.srcURL && params.mediaType === 'image') {
        menu.append(new MenuItem({
          label: 'Resim Adresini Kopyala',
          click: () => clipboard.writeText(params.srcURL)
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      menu.append(new MenuItem({ label: 'Geri', click: () => wc.goBack(), enabled: wc.canGoBack() }));
      menu.append(new MenuItem({ label: 'İleri', click: () => wc.goForward(), enabled: wc.canGoForward() }));
      menu.append(new MenuItem({ label: 'Yenile', click: () => wc.reload() }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Öğeyi İncele (DevTools)', click: () => wc.inspectElement(params.x, params.y) }));

      menu.popup();
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
  if (pathStr && fs.existsSync(pathStr)) {
    shell.openPath(pathStr);
  }
});

ipcMain.handle('show-download-in-folder', (_event, pathStr: string) => {
  if (pathStr && fs.existsSync(pathStr)) {
    shell.showItemInFolder(pathStr);
  }
});

// MCP Server Controls
ipcMain.handle('start-mcp-server', async () => {
  if (mcpServer && !mcpServer.isRunning()) {
    await mcpServer.start();
    return true;
  }
  return false;
});

ipcMain.handle('stop-mcp-server', () => {
  if (mcpServer && mcpServer.isRunning()) {
    mcpServer.stop();
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

// Unload / remove an extension by its ID
ipcMain.handle('remove-extension', async (_event, extensionId: string) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return { error: 'No window available' };
  try {
    await win.webContents.session.removeExtension(extensionId);
    loadedExtensions = loadedExtensions.filter((e) => e.id !== extensionId);
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
