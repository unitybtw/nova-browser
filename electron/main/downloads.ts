import { app, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

type SendToMainWindow = (channel: string, payload?: unknown) => void;
type TrustedSenderCheck = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) => boolean;

const activeDownloads = new Map<string, Electron.DownloadItem>();
const knownDownloadPaths = new Set<string>();
// Tracks sessions that already have a 'will-download' handler so window recreation
// doesn't stack duplicate listeners (which would duplicate download handling).
const downloadsRegistered = new WeakSet<Electron.Session>();

let nextDownloadAsSaveAs = false;

let sendToMainWindow: SendToMainWindow = () => {};
let isTrustedSender: TrustedSenderCheck = () => false;

/**
 * Registers the download control IPC handlers. Called once by main.ts
 * (the composition root) with its main-window sender helper and
 * trusted-sender validator.
 */
export function initDownloads(send: SendToMainWindow, trustedSenderCheck: TrustedSenderCheck): void {
  sendToMainWindow = send;
  isTrustedSender = trustedSenderCheck;

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
      const normPath = process.platform === 'win32' ? realPath.toLowerCase() : realPath;
      const normDownloads = process.platform === 'win32' ? (realDownloads + path.sep).toLowerCase() : (realDownloads + path.sep);
      const isUnderDownloads = normPath.startsWith(normDownloads);
      const isKnown = knownDownloadPaths.has(realPath) || (process.platform === 'win32' && Array.from(knownDownloadPaths).some(p => p.toLowerCase() === normPath));
      if ((isUnderDownloads || isKnown) && fs.existsSync(realPath)) {
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
      const normPath = process.platform === 'win32' ? realPath.toLowerCase() : realPath;
      const normDownloads = process.platform === 'win32' ? (realDownloads + path.sep).toLowerCase() : (realDownloads + path.sep);
      const isUnderDownloads = normPath.startsWith(normDownloads);
      const isKnown = knownDownloadPaths.has(realPath) || (process.platform === 'win32' && Array.from(knownDownloadPaths).some(p => p.toLowerCase() === normPath));
      if ((isUnderDownloads || isKnown) && fs.existsSync(realPath)) {
        shell.showItemInFolder(realPath);
        return true;
      }
    } catch (err) {
      console.error('Error showing download in folder:', err);
    }
    return false;
  });
}

/** Flags that the next download should pop the Save-As dialog (context-menu "Save ... As"). */
export function markNextDownloadAsSaveAs(): void {
  nextDownloadAsSaveAs = true;
}

// Downloads Manager: Handle file downloads via Electron IPC
export function registerDownloadsManager(targetSession: Electron.Session) {
  if (downloadsRegistered.has(targetSession)) return;
  downloadsRegistered.add(targetSession);
  targetSession.on('will-download', (event, item, webContents) => {
    const downloadId = `dl_${crypto.randomUUID()}`;
    const filename = item.getFilename();
    const totalBytes = item.getTotalBytes();
    activeDownloads.set(downloadId, item);

    // Auto-install CRX extensions from Chrome Web Store
    if (filename.endsWith('.crx')) {
      item.cancel();
      activeDownloads.delete(downloadId);
      return;
    }

    const recordCompletedPath = () => {
      activeDownloads.delete(downloadId);
      const finalPath = item.getSavePath();
      if (finalPath) {
        try {
          knownDownloadPaths.add(fs.realpathSync(path.resolve(finalPath)));
        } catch {
          knownDownloadPaths.add(path.resolve(finalPath));
        }
      }
    };

    if (nextDownloadAsSaveAs) {
      nextDownloadAsSaveAs = false;
      // Do not set save path so Electron shows the Save Dialog automatically
      item.once('done', (_event, state) => {
        if (state === 'completed') recordCompletedPath();
      });
    } else {
      const defaultDir = app.getPath('downloads');
      // Security: item.getFilename() is server-controlled (Content-Disposition) —
      // strip directory components, separators, and leading dots before it touches disk.
      const safeName = path.basename(filename).replace(/[/\\]/g, '_').replace(/^\.+/, '').trim() || 'download';
      let targetPath = path.join(defaultDir, safeName);
      // Auto-increment filename if already exists to avoid silent overwrite
      try {
        if (fs.existsSync(targetPath)) {
          const ext = path.extname(safeName);
          const base = path.basename(safeName, ext);
          let counter = 1;
          while (fs.existsSync(path.join(defaultDir, `${base} (${counter})${ext}`))) {
            counter++;
          }
          targetPath = path.join(defaultDir, `${base} (${counter})${ext}`);
        }
      } catch {}
      // Security: final containment check — the resolved save path must stay
      // inside the downloads directory. Fall back to a fixed name otherwise.
      if (!path.resolve(targetPath).startsWith(path.resolve(defaultDir) + path.sep)) {
        targetPath = path.join(defaultDir, 'download');
      }
      item.setSavePath(targetPath);
      item.once('done', (_event, state) => {
        if (state === 'completed') recordCompletedPath();
      });
    }

    sendToMainWindow('download-update', {
      id: downloadId,
      filename: path.basename(item.getSavePath() || filename),
      url: item.getURL(),
      receivedBytes: 0,
      totalBytes,
      state: 'progressing',
      startTime: Date.now(),
      savePath: item.getSavePath() || undefined
    });

    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        sendToMainWindow('download-update', {
          id: downloadId,
          filename: path.basename(item.getSavePath() || filename),
          url: item.getURL(),
          receivedBytes: item.getReceivedBytes(),
          totalBytes,
          state: 'cancelled',
          savePath: item.getSavePath() || undefined
        });
      } else if (state === 'progressing') {
        sendToMainWindow('download-update', {
          id: downloadId,
          filename: path.basename(item.getSavePath() || filename),
          url: item.getURL(),
          receivedBytes: item.getReceivedBytes(),
          totalBytes,
          state: 'progressing',
          isPaused: item.isPaused(),
          savePath: item.getSavePath() || undefined
        });
      }
    });

    item.once('done', (event, state) => {
      activeDownloads.delete(downloadId);
      sendToMainWindow('download-update', {
        id: downloadId,
        filename: path.basename(item.getSavePath() || filename),
        url: item.getURL(),
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
        state: state === 'completed' ? 'completed' : 'cancelled',
        savePath: item.getSavePath() || undefined,
        isPaused: false
      });
    });
  });
}
