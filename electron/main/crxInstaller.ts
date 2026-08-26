import { app, BrowserWindow, dialog, session } from 'electron';
import path from 'path';
import fs from 'fs';
import fetch from 'cross-fetch';
// @ts-ignore
import unzip from 'unzip-crx-3';
import JSZip from 'jszip';

/**
 * State owned by main.ts's extensions domain, injected so this module stays
 * free of shared mutable state. main.ts (the composition root) passes it on
 * every call alongside the IPC event.
 */
export interface CrxInstallerDeps {
  isTrustedSender: (event: Electron.IpcMainInvokeEvent) => boolean;
  getMainWindow: () => BrowserWindow | undefined;
  isExtensionLoaded: (extensionId: string) => boolean;
  findLoadedExtension: (extensionId: string) => any | undefined;
  addLoadedExtension: (extInfo: any) => void;
  getDisabledExtensionIds: () => string[];
  setDisabledExtensionIds: (ids: string[]) => void;
}

// 🔒 Security: read an HTTP response body while enforcing a hard byte limit.
// Aborts as soon as the limit is exceeded instead of buffering an unbounded payload.
async function readBodyWithLimit(res: any, maxBytes: number): Promise<Buffer> {
  const body = res.body;
  if (body && typeof body.on === 'function') {
    // Node-style stream (cross-fetch in Electron main)
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let received = 0;
      body.on('data', (chunk: Buffer) => {
        received += chunk.length;
        if (received > maxBytes) {
          try { body.destroy(); } catch (_) {}
          reject(new Error(`Extension package exceeds maximum allowed size (${maxBytes} bytes).`));
          return;
        }
        chunks.push(chunk);
      });
      body.on('end', () => resolve(Buffer.concat(chunks)));
      body.on('error', (err: any) => reject(err));
    });
  }
  // Fallback (no streaming body): buffered read, still validated against the cap
  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > maxBytes) {
    throw new Error(`Extension package exceeds maximum allowed size (${maxBytes} bytes).`);
  }
  return Buffer.from(arrayBuffer);
}

// 🔒 Security: mirror unzip-crx-3's CRX unwrapping so the inner zip payload can
// be inspected BEFORE anything is written to disk — unzip-crx-3 joins entry names
// onto the destination with no validation, which allows zip-slip.
function getCrxInnerZip(buffer: Buffer): Buffer {
  // Plain zip packages (PK\x03\x04) are passed through untouched
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return buffer;
  }
  const readU32 = (offset: number) => buffer.readUInt32LE(offset);
  const version = buffer[4];
  if (version === 2) {
    const publicKeyLength = readU32(8);
    const signatureLength = readU32(12);
    return buffer.subarray(16 + publicKeyLength + signatureLength);
  }
  if (version === 3) {
    const headerSize = readU32(8);
    return buffer.subarray(12 + headerSize);
  }
  throw new Error('Unsupported CRX container format.');
}

async function assertCrxEntriesSafe(buffer: Buffer, targetDir: string): Promise<void> {
  const zip = await JSZip.loadAsync(getCrxInnerZip(buffer));
  const resolvedTarget = path.resolve(targetDir);
  for (const entryName of Object.keys(zip.files)) {
    // Reject Windows drive-letter/UNC paths and backslash separators outright
    if (/^[a-zA-Z]:[\\/]/.test(entryName) || entryName.startsWith('\\\\')) {
      throw new Error(`Extension contains an unsafe entry path: ${entryName}`);
    }
    const normalized = entryName.replace(/\\/g, '/');
    if (normalized.split('/').some((segment) => segment === '..')) {
      throw new Error(`Extension contains a parent-directory traversal entry: ${entryName}`);
    }
    if (path.isAbsolute(normalized)) {
      throw new Error(`Extension contains an absolute entry path: ${entryName}`);
    }
    const outPath = path.resolve(resolvedTarget, normalized);
    if (!outPath.startsWith(resolvedTarget + path.sep)) {
      throw new Error(`Extension entry escapes the extraction directory: ${entryName}`);
    }
  }
}

// Defense in depth: after extraction, nothing on disk may resolve outside the
// target dir, and the CRX/zip format cannot legitimately produce symlinks.
function assertExtractionContained(dir: string): void {
  const resolvedDir = path.resolve(dir);
  const stack: string[] = [resolvedDir];
  while (stack.length > 0) {
    const currentDir = stack.pop()!;
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (!path.resolve(entryPath).startsWith(resolvedDir + path.sep)) {
        throw new Error(`Extension extraction escaped the target directory: ${entry.name}`);
      }
      if (entry.isSymbolicLink()) {
        throw new Error(`Extension contains a symbolic link entry: ${entry.name}`);
      }
      if (entry.isDirectory()) stack.push(entryPath);
    }
  }
}

export async function installFromWebstore(deps: CrxInstallerDeps, event: Electron.IpcMainInvokeEvent, urlOrId: string) {
  const { isTrustedSender, getMainWindow } = deps;

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

    // 🔒 Security: installs requested from Chrome Web Store page content are not
    // strictly user-initiated — the webstore preload forwards postMessage install
    // requests, so page scripts can trigger them. Gate those behind a native
    // confirmation; requests from Nova's own window already come from UI interaction.
    if (!isFromMainWindow) {
      const parentWin = getMainWindow();
      const confirmOptions: Electron.MessageBoxOptions = {
        type: 'question',
        buttons: ['Cancel', 'Install'],
        defaultId: 0,
        cancelId: 0,
        title: 'Install extension?',
        message: `Allow this page to install extension "${extensionId}" into Nova?`,
        detail: 'The Chrome Web Store page you are viewing requested this installation. Only allow it if you trust this extension.'
      };
      const { response } = parentWin
        ? await dialog.showMessageBox(parentWin, confirmOptions)
        : await dialog.showMessageBox(confirmOptions);
      if (response !== 1) {
        return { error: 'Installation cancelled by user.' };
      }
    }

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

    // 🔒 Security: enforce a hard 100MB ceiling BEFORE buffering the CRX body.
    // Reject early on a declared Content-Length over the limit; abort mid-stream otherwise.
    const MAX_CRX_BYTES = 100 * 1024 * 1024;
    const declaredLength = Number.parseInt(res.headers.get('content-length') || '', 10);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_CRX_BYTES) {
      throw new Error(`Extension package exceeds maximum allowed size (${MAX_CRX_BYTES} bytes).`);
    }

    const buffer = await readBodyWithLimit(res, MAX_CRX_BYTES);

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

    // 🔒 Security: validate every zip entry against the extraction target BEFORE
    // extracting — rejects absolute paths, '..' segments, and any path that would
    // resolve outside the target dir (zip-slip).
    await assertCrxEntriesSafe(buffer, extractPath);

    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
      await unzip(crxFilePath, extractPath);

      // 🔒 Security: post-extraction containment + symlink sweep.
      assertExtractionContained(extractPath);

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

    // Clear disabled state if extension was previously disabled
    const disabledIds = deps.getDisabledExtensionIds();
    if (disabledIds.includes(extensionId)) {
      deps.setDisabledExtensionIds(disabledIds.filter(id => id !== extensionId));
    }

    // Check if it's already loaded to prevent duplicate loading
    const isAlreadyLoaded = deps.isExtensionLoaded(extensionId);
    let extInfo;
    if (!isAlreadyLoaded) {
      extInfo = await win?.webContents.session.loadExtension(extractPath) || await session.defaultSession.loadExtension(extractPath);
      deps.addLoadedExtension(extInfo);
    } else {
      extInfo = deps.findLoadedExtension(extensionId);
    }

    try { fs.unlinkSync(crxFilePath); } catch (e) {}

    // Notify all frontend windows immediately
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed()) {
        w.webContents.send('extension-changed');
      }
    }

    return { success: true, extension: extInfo };
  } catch (err: any) {
    console.error('Web Store Install Error:', err);
    return { error: err.message || 'Bilinmeyen bir hata oluştu.' };
  }
}
