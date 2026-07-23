import { app, BrowserWindow, ipcMain, session, globalShortcut, dialog } from 'electron';
import path from 'path';
import fetch from 'cross-fetch';
import fs from 'fs';
// @ts-ignore
import unzip from 'unzip-crx-3';
import { ElectronBlocker } from '@cliqz/adblocker-electron';
import { BrowserMCPServer } from './mcpServer.js';

// Enable WebGPU and hardware acceleration flags
app.commandLine.appendSwitch('enable-unsafe-webgpu');
app.commandLine.appendSwitch('enable-features', 'Vulkan,UseSkiaRenderer,WebAssemblySimd');

// Spoof user agent so Chrome Web Store enables the "Add to Chrome" button
app.userAgentFallback = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let mainWindow: BrowserWindow | null = null;

let isPrivacyShieldEnabled = true;
let blocker: ElectronBlocker | null = null;
const activeDownloads = new Map<string, Electron.DownloadItem>();
let mcpServer: BrowserMCPServer | null = null;

// Initialize AdBlocker globally so IPC can access it
ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((engine) => {
  blocker = engine;
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#f8fafc', // Light mode background (slate-50)
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
      const tempPath = path.join(app.getPath('userData'), 'temp_extensions');
      if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath, { recursive: true });
      const crxFilePath = path.join(tempPath, `${downloadId}_${filename}`);
      item.setSavePath(crxFilePath);
      
      item.once('done', async (event, state) => {
        if (state === 'completed') {
          try {
            const extractPath = path.join(app.getPath('userData'), 'extensions', downloadId);
            if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });
            
            await unzip(crxFilePath, extractPath);
            
            const extInfo = await session.defaultSession.loadExtension(extractPath);
            loadedExtensions.push(extInfo);
            
            // Cleanup the crx file
            try { fs.unlinkSync(crxFilePath); } catch (e) {}
            
            // Notify frontend
            mainWindow?.webContents.send('extension-installed-silently', { success: true, name: extInfo.name });
            
          } catch (err) {
            console.error('Failed to install extension from crx', err);
          }
        }
      });
      return; // Do not show in normal downloads manager
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
        state: state === 'completed' ? 'completed' : 'cancelled'
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
    mainWindow?.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Listen for console messages from the renderer process and log them to the terminal
  mainWindow?.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] [${level}] ${message} (${sourceId}:${line})`);
  });
}

app.whenReady().then(() => {
  createWindow();

  // Initialize MCP Server but don't start it until toggled
  mcpServer = new BrowserMCPServer(3020);
  mcpServer.setMainWindow(mainWindow);

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

// Download Controls
ipcMain.handle('pause-download', (_event, id: string) => {
  const item = activeDownloads.get(id);
  if (item && !item.isPaused()) {
    item.pause();
    return true;
  }
  return false;
});

// MCP Server Controls
ipcMain.handle('start-mcp-server', async () => {
  if (mcpServer) {
    await mcpServer.start();
    return true;
  }
  return false;
});

ipcMain.handle('stop-mcp-server', () => {
  if (mcpServer) {
    mcpServer.stop();
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
  return loadedExtensions.map((e) => ({
    name: e.name,
    id: e.id,
    enabled: true,
    path: e.path,
    version: e.version,
    description: e.description,
    // icon can't be directly accessed, will use placeholder
  }));
});

// Unload / remove an extension by its ID
ipcMain.handle('remove-extension', async (_event, extensionId: string) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return { error: 'No window available' };
  try {
    await win.webContents.session.removeExtension(extensionId);
    loadedExtensions = loadedExtensions.filter((e) => e.id !== extensionId);
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
    
    const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=120.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;
    
    const res = await fetch(crxUrl);
    if (!res.ok) throw new Error('Eklenti indirilemedi (Google sunucuları reddetti).');
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const tempPath = path.join(app.getPath('userData'), 'temp_extensions');
    if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath, { recursive: true });
    
    const crxFilePath = path.join(tempPath, `${extensionId}.crx`);
    fs.writeFileSync(crxFilePath, buffer);
    
    const extractPath = path.join(app.getPath('userData'), 'extensions', extensionId);
    if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });
    
    await unzip(crxFilePath, extractPath);
    
    const win = BrowserWindow.getAllWindows()[0];
    const extInfo = await win?.webContents.session.loadExtension(extractPath) || await session.defaultSession.loadExtension(extractPath);
    
    loadedExtensions.push(extInfo);
    try { fs.unlinkSync(crxFilePath); } catch (e) {}
    
    return { success: true, extension: extInfo };
  } catch (err: any) {
    console.error('Web Store Install Error:', err);
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' };
  }
});
