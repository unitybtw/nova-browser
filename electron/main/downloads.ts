import { app, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Mirrors the open-external check in main.ts. Duplicated rather than imported
// because main.ts is the composition root and importing it back would be
// circular. Keep the two lists in step.
const DANGEROUS_EXT_REGEX = /\.(exe|msi|bat|cmd|sh|app|bin|vbs|ps1|command|dmg|deb|pkg|rpm|iso)($|\?|#)/i;

/**
 * Document types the OS opens by EXECUTING script rather than displaying it.
 *
 * A page can serve `Content-Disposition: attachment; filename="invoice.html"`
 * with no compromise of the app at all, and a single click then hands that file
 * to the default browser, which runs its script from a file:// origin. Nothing
 * in the dangerous-extension list above covers this, because none of these are
 * executables. They are not blocked either - opening a downloaded HTML file is
 * legitimate - but the user is asked first.
 */
const SCRIPT_CAPABLE_EXT_REGEX = /\.(html?|xhtml|mhtml|xml|svg|svgz|hta|js|mjs|jar|url|lnk|reg|chm|wsf|ps1|vbs|xbl|xsl|xslt)(\?|#|$)/i;

/**
 * A filename the user may reasonably double-click to open. Used only to decide
 * whether confirmation is required, never to grant access - a file outside the
 * allowlist is still refused.
 */
export function requiresOpenConfirmation(filePath: string): boolean {
  return DANGEROUS_EXT_REGEX.test(filePath) || SCRIPT_CAPABLE_EXT_REGEX.test(filePath);
}

/** Strips credentials, query and fragment before a URL reaches a log sink. */
export function redactUrlForLog(raw: string): string {
  try {
    const parsed = new URL(raw);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return '<unparseable-url>';
  }
}

type SendToMainWindow = (channel: string, payload?: unknown) => void;
type TrustedSenderCheck = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) => boolean;

const activeDownloads = new Map<string, Electron.DownloadItem>();
const MAX_KNOWN_DOWNLOAD_PATHS = 500;
const knownDownloadPaths = new Set<string>();

/**
 * Inserts path into knownDownloadPaths using LRU eviction capped at MAX_KNOWN_DOWNLOAD_PATHS.
 */
function addKnownDownloadPath(targetPath: string): void {
  if (knownDownloadPaths.has(targetPath)) {
    // Re-insert to refresh LRU recency
    knownDownloadPaths.delete(targetPath);
  } else if (knownDownloadPaths.size >= MAX_KNOWN_DOWNLOAD_PATHS) {
    const oldest = knownDownloadPaths.values().next().value;
    if (oldest) knownDownloadPaths.delete(oldest);
  }
  knownDownloadPaths.add(targetPath);
}

// Tracks sessions that already have a 'will-download' handler so window recreation
// doesn't stack duplicate listeners (which would duplicate download handling).
const downloadsRegistered = new WeakSet<Electron.Session>();

// WebContents ids that asked for a Save-As dialog on their next download.
// `will-download` fires asynchronously, so a single module-level boolean could
// be consumed by an unrelated download that happened to arrive first (another
// tab, a subresource) and hand that one the dialog instead. Keyed per
// webContents, and consumed with delete() so each request fires exactly once.
// Bounded in case a sender asks but never downloads.
const MAX_PENDING_SAVE_AS = 100;
const nextDownloadAsSaveAsIds = new Set<number>();

let sendToMainWindow: SendToMainWindow = () => {};
let isTrustedSender: TrustedSenderCheck = () => false;

/**
 * Registers an externally downloaded file path (such as an in-app updater package)
 * so open-download and show-download-in-folder permit opening it.
 */
export function registerKnownDownloadPath(filePath: string): void {
  try {
    addKnownDownloadPath(fs.realpathSync(path.resolve(filePath)));
  } catch {
    addKnownDownloadPath(path.resolve(filePath));
  }
}

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

  /**
   * Resolves a renderer-supplied path to a real file inside the Downloads
   * directory (or one this app recorded as its own download), or null.
   *
   * realpathSync runs BEFORE the prefix test, so both `~/Downloads/../x` and a
   * symlink inside ~/Downloads pointing elsewhere are rejected. Previously this
   * block was duplicated verbatim across two handlers, so a fix to one did not
   * reach the other.
   */
  const resolveContainedDownloadPath = (pathStr: string): string | null => {
    try {
      if (!pathStr || typeof pathStr !== 'string') return null;
      const resolvedTarget = path.resolve(pathStr);
      if (!fs.existsSync(resolvedTarget)) return null;
      const downloadsPath = app.getPath('downloads');
      if (!fs.existsSync(downloadsPath)) {
        try { fs.mkdirSync(downloadsPath, { recursive: true }); } catch (_) {}
      }
      const realPath = fs.realpathSync(resolvedTarget);
      const realDownloads = fs.realpathSync(downloadsPath);
      const win = process.platform === 'win32';
      const normPath = win ? realPath.toLowerCase() : realPath;
      const normDownloads = win ? (realDownloads + path.sep).toLowerCase() : (realDownloads + path.sep);
      const isUnderDownloads = normPath.startsWith(normDownloads);
      const isKnown = win
        ? Array.from(knownDownloadPaths).some(p => p.toLowerCase() === normPath)
        : knownDownloadPaths.has(realPath);
      if (!isUnderDownloads && !isKnown) return null;
      return fs.existsSync(realPath) ? realPath : null;
    } catch {
      return null;
    }
  };

  ipcMain.handle('open-download', async (event, pathStr: string) => {
    if (!isTrustedSender(event)) return false;
    if (!pathStr || typeof pathStr !== 'string') return false;
    let confirmedPath: string | null = null;
    try {
      confirmedPath = resolveContainedDownloadPath(pathStr);
      if (!confirmedPath) return false;
      if (requiresOpenConfirmation(confirmedPath)) {
        const { response } = await dialog.showMessageBox({
          type: 'warning',
          buttons: ['Cancel', 'Open'],
          defaultId: 0,
          cancelId: 0,
          title: 'Potentially dangerous file',
          message: `This file (${path.basename(confirmedPath)}) could harm your computer. Do you want to open it?`,
          detail: confirmedPath,
        });
        if (response !== 1) return false;
      }
      // The dialog can stay open for an unbounded time, so a symlink planted
      // while it is up would be followed by the next resolve. Re-validate
      // immediately before handing the path to the OS.
      const revalidated = resolveContainedDownloadPath(confirmedPath);
      if (!revalidated) return false;
      await shell.openPath(revalidated);
      return true;
    } catch (err) {
      console.error('Error opening download:', err);
    }
    return false;
  });

  ipcMain.handle('show-download-in-folder', (event, pathStr: string) => {
    if (!isTrustedSender(event)) return false;
    if (!pathStr || typeof pathStr !== 'string') return false;
    try {
      const realPath = resolveContainedDownloadPath(pathStr);
      if (realPath) {
        shell.showItemInFolder(realPath);
        return true;
      }
    } catch (err) {
      console.error('Error showing download in folder:', err);
    }
    return false;
  });
}

/** Flags that the next download from this webContents should pop the Save-As dialog (context-menu "Save ... As"). */
export function markNextDownloadAsSaveAs(webContentsId: number): void {
  if (typeof webContentsId !== 'number' || !Number.isFinite(webContentsId)) return;
  // Re-insert to refresh recency, so the eviction below drops the stalest request.
  nextDownloadAsSaveAsIds.delete(webContentsId);
  if (nextDownloadAsSaveAsIds.size >= MAX_PENDING_SAVE_AS) {
    const oldest = nextDownloadAsSaveAsIds.values().next().value;
    if (oldest !== undefined) nextDownloadAsSaveAsIds.delete(oldest);
  }
  nextDownloadAsSaveAsIds.add(webContentsId);
}

/**
 * Validates download URLs for safe protocols (http, https, blob, data),
 * strictly verifying that blob: URLs wrap legitimate http(s) origins (blocking blob:file:/// etc.)
 * and that data: URLs do not deliver executable or script MIME types.
 */
export function isSafeDownloadUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:', 'blob:', 'data:'].includes(parsed.protocol)) {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    if (parsed.protocol === 'blob:') {
      try {
        const inner = new URL(parsed.pathname);
        const allowedInner = ['http:', 'https:', 'chrome-extension:'];
        if (!allowedInner.includes(inner.protocol) || inner.username || inner.password) {
          return false;
        }
        if (inner.protocol === 'chrome-extension:' && !/^[a-zA-Z0-9_-]+$/.test(inner.hostname)) {
          return false;
        }
      } catch {
        return false;
      }
    }
    if (parsed.protocol === 'data:') {
      const mime = parsed.pathname.split(';')[0].split(',')[0].toLowerCase().trim();
      const dangerousMimes = [
        'javascript', 'ecmascript', 'html', 'htm', 'xml', 'svg', 'msdownload', 'executable', 'octet-stream',
        'x-sh', 'x-bat', 'x-cmd', 'x-csh', 'x-powershell', 'x-msdos-program', 'x-apple-diskimage',
        'x-ms-shortcut', 'hta', 'jar', 'appimage', 'application/x-pie-executable', 'application/x-sharedlib',
        'application/vnd.microsoft.portable-executable'
      ];
      if (dangerousMimes.some(d => mime.includes(d))) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes download filenames, stripping control characters, directory components,
 * trailing spaces/dots, and preventing collisions with Windows DOS device names
 * (including compound extensions such as CON.tar.gz).
 */
export function sanitizeDownloadFilename(rawFilename: string): string {
  const normalized = (rawFilename || '').replace(/\\/g, '/');
  let name = path.basename(normalized).replace(/^\.+/, '').trim();
  name = name.replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, '_').trim();
  name = name.replace(/[.\s]+$/, '');
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  const stem = name.split('.')[0];
  const DOS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (DOS_RESERVED.test(stem) || DOS_RESERVED.test(base)) {
    name = `download_${name}`;
  }
  return name || 'download';
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

    // Security: Enforce allowed download schemes across the entire redirect chain (http, https, blob, data).
    // Disallow file:, javascript:, and internal browser schemes (including blob:file:/// evasions).
    const itemUrl = item.getURL();
    const urlChain = typeof (item as any).getURLChain === 'function' ? (item as any).getURLChain() : [itemUrl];
    const isSafeInitial = isSafeDownloadUrl(itemUrl);
    const isSafeChain = Array.isArray(urlChain) && urlChain.every(u => isSafeDownloadUrl(u));
    if (!isSafeInitial || !isSafeChain) {
      // Redacted: the checker treats userinfo as sensitive enough to reject, and
      // query strings carry bearer tokens and presigned-URL signatures, so
      // logging the chain verbatim would put credentials in the system log.
      console.warn(
        '[Security] Blocked download with disallowed protocol or unsafe chain:',
        urlChain.map(redactUrlForLog)
      );
      item.cancel();
      activeDownloads.delete(downloadId);
      return;
    }

    // Auto-install CRX extensions from Chrome Web Store
    if (filename.toLowerCase().endsWith('.crx')) {
      item.cancel();
      activeDownloads.delete(downloadId);
      return;
    }

    const recordCompletedPath = () => {
      activeDownloads.delete(downloadId);
      const finalPath = item.getSavePath();
      if (finalPath) {
        try {
          addKnownDownloadPath(fs.realpathSync(path.resolve(finalPath)));
        } catch {
          addKnownDownloadPath(path.resolve(finalPath));
        }
      }
    };

    // Consume-and-delete, and only for the webContents that actually asked:
    // a download from any other tab must never pop this dialog.
    const requesterId = webContents?.id;
    const wantsSaveAsDialog = typeof requesterId === 'number' && nextDownloadAsSaveAsIds.delete(requesterId);
    if (wantsSaveAsDialog) {
      // Do not set save path so Electron shows the Save Dialog automatically
      item.once('done', (_event, state) => {
        if (state === 'completed') recordCompletedPath();
      });
    } else {
      const defaultDir = app.getPath('downloads');
      // Security: item.getFilename() is server-controlled (Content-Disposition) —
      // strip directory components, separators, illegal characters, and Windows device names.
      const safeName = sanitizeDownloadFilename(filename);
      let targetPath = path.join(defaultDir, safeName);
      // Auto-increment filename if already exists to avoid silent overwrite and TOCTOU races
      try {
        const ext = path.extname(safeName);
        const base = path.basename(safeName, ext);
        let candidatePath = targetPath;
        let counter = 1;
        while (true) {
          try {
            // Atomic creation test via O_CREAT | O_EXCL
            const fd = fs.openSync(candidatePath, 'wx');
            fs.closeSync(fd);
            targetPath = candidatePath;
            break;
          } catch (err: any) {
            if (err && err.code === 'EEXIST') {
              candidatePath = path.join(defaultDir, `${base} (${counter})${ext}`);
              counter++;
              if (counter > 1000) {
                targetPath = path.join(defaultDir, `${base}_${crypto.randomUUID().slice(0, 8)}${ext}`);
                break;
              }
            } else {
              break;
            }
          }
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

    let lastProgressBroadcastTime = 0;
    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        sendToMainWindow('download-update', {
          id: downloadId,
          filename: path.basename(item.getSavePath() || filename),
          url: item.getURL(),
          receivedBytes: item.getReceivedBytes(),
          totalBytes,
          state: 'interrupted',
          isPaused: item.isPaused(),
          savePath: item.getSavePath() || undefined
        });
      } else if (state === 'progressing') {
        const now = Date.now();
        // Throttle frequent byte updates to at most once every 250ms, unless pause status changed
        if (item.isPaused() || now - lastProgressBroadcastTime >= 250) {
          lastProgressBroadcastTime = now;
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
        state: state === 'completed' ? 'completed' : (state === 'interrupted' ? 'interrupted' : 'cancelled'),
        savePath: item.getSavePath() || undefined,
        isPaused: false
      });
    });
  });
}
