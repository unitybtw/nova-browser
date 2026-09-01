import { app, BrowserWindow, dialog, session } from 'electron';
import path from 'path';
import fs from 'fs';
import fetch from 'cross-fetch';
// @ts-ignore
import unzip from 'unzip-crx-3';
import JSZip from 'jszip';

/**
 * Extension permission information extracted from manifest.json
 */
export interface ExtensionPermissions {
  permissions: string[];
  optionalPermissions: string[];
  hostPermissions: string[];
}

/**
 * Parse extension manifest.json for permissions
 * @param extractPath - Path to the extracted extension directory
 * @returns ExtensionPermissions object containing all permission types
 */
export async function parseExtensionPermissions(extractPath: string): Promise<ExtensionPermissions> {
  const manifestPath = path.join(extractPath, 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    return { permissions: [], optionalPermissions: [], hostPermissions: [] };
  }
  
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    const asStringArray = (value: unknown): string[] => (
      Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length <= 512) : []
    );

    return {
      permissions: asStringArray(manifest.permissions),
      optionalPermissions: asStringArray(manifest.optional_permissions),
      hostPermissions: asStringArray(manifest.host_permissions)
    };
  } catch (err) {
    console.error('Failed to parse extension manifest:', err);
    return { permissions: [], optionalPermissions: [], hostPermissions: [] };
  }
}

/**
 * Format permission strings for user-friendly display
 * @param permissions - Array of permission strings from manifest
 * @returns Array of human-readable permission descriptions
 */
export function formatPermissionsForDisplay(permissions: string[]): string[] {
  const permissionDescriptions: Record<string, string> = {
    // Standard permissions
    'activeTab': 'Access the currently active tab when you click the extension',
    'alarms': 'Schedule code to run at specific times or intervals',
    'background': 'Run in the background even when the browser is closed',
    'bookmarks': 'Read and modify your bookmarks',
    'browsingData': 'Clear your browsing data (history, cookies, cache)',
    'certificateProvider': 'Provide client certificates for authentication',
    'clipboardRead': 'Read data from your clipboard',
    'clipboardWrite': 'Write data to your clipboard',
    'contentSettings': 'Change website settings (cookies, JavaScript, plugins)',
    'contextMenus': 'Add items to the right-click context menu',
    'cookies': 'Read and modify cookies on websites you visit',
    'debugger': 'Attach a debugger to web pages',
    'declarativeContent': 'Take actions based on page content without injecting scripts',
    'declarativeNetRequest': 'Block or modify network requests',
    'declarativeNetRequestFeedback': 'Get feedback on blocked/modified network requests',
    'desktopCapture': 'Capture the content of your screen, windows, or tabs',
    'documentScan': 'Access document scanners',
    'downloads': 'Manage your downloads (start, pause, cancel, remove)',
    'downloads.open': 'Open downloaded files',
    'downloads.shelf': 'Show downloads on the download shelf',
    'enterprise.deviceAttributes': 'Read device attributes (managed environments)',
    'enterprise.hardwarePlatform': 'Read hardware platform info (managed environments)',
    'enterprise.networkingAttributes': 'Read network attributes (managed environments)',
    'enterprise.platformKeys': 'Generate and manage platform keys (managed environments)',
    'fileBrowserHandler': 'Handle file browser actions',
    'fileSystem': 'Access files and directories on your device',
    'fileSystem.write': 'Write to files and directories on your device',
    'fileSystem.directory': 'Access directories on your device',
    'fontSettings': 'Read and modify font settings',
    'gcm': 'Use Google Cloud Messaging for push notifications',
    'geolocation': 'Access your physical location',
    'history': 'Read and modify your browsing history',
    'identity': 'Access your email address and identity',
    'idle': 'Detect when the machine is idle',
    'management': 'Manage your installed extensions, apps, and themes',
    'nativeMessaging': 'Communicate with native applications on your device',
    'notifications': 'Show desktop notifications',
    'pageCapture': 'Save web pages as MHTML files',
    'platformKeys': 'Access platform-level cryptographic keys',
    'power': 'Prevent the system from sleeping',
    'printerProvider': 'Provide printing capabilities',
    'printing': 'Submit print jobs and manage printers',
    'printingMetrics': 'Access printing metrics',
    'privacy': 'Read and modify privacy-related settings',
    'processes': 'View and manage browser processes',
    'proxy': 'Manage proxy settings',
    'scripting': 'Execute scripts in web pages',
    'search': 'Manage search engines and perform searches',
    'sessions': 'Manage browsing sessions',
    'sidePanel': 'Show a side panel in the browser',
    'storage': 'Store data on your device',
    'system.cpu': 'Access CPU information',
    'system.display': 'Access display information',
    'system.memory': 'Access memory information',
    'system.storage': 'Access storage information',
    'tabCapture': 'Capture the content of tabs (audio/video)',
    'tabGroups': 'Manage tab groups',
    'tabs': 'Access your tabs (URLs, titles, favicons)',
    'topSites': 'Access your most visited sites',
    'tts': 'Use text-to-speech',
    'ttsEngine': 'Implement a text-to-speech engine',
    'unlimitedStorage': 'Store unlimited data on your device',
    'vpnProvider': 'Provide VPN service',
    'wallpaper': 'Set wallpaper (Chrome OS)',
    'webNavigation': 'Track navigation events (page loads, redirects)',
    'webRequest': 'Observe and analyze network requests',
    'webRequestBlocking': 'Block, redirect, or modify network requests',
    'webRequestFilterResponse': 'Filter response data from network requests',
    'webAuthn': 'Use Web Authentication API (passkeys)',
    'windows': 'Manage browser windows (create, move, resize, close)',
    
    // Host permissions (patterns)
  };
  
  return permissions.map(perm => {
    // Check for host permission patterns (e.g., "*://*.example.com/*")
    if (perm.includes('://') || perm.startsWith('<all_urls>')) {
      return `Access your data on ${perm.replace('<all_urls>', 'all websites')}`;
    }
    return permissionDescriptions[perm] || perm;
  });
}

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
  let isFromWebstore = false;
  try {
    const sender = new URL(senderUrl);
    isFromWebstore = sender.protocol === 'https:' &&
      ((sender.hostname === 'chromewebstore.google.com') ||
       (sender.hostname === 'chrome.google.com' && sender.pathname.startsWith('/webstore/')));
  } catch (_) {}
  if (!isFromMainWindow && !isFromWebstore) {
    return { error: 'Unauthorized: install-from-webstore can only be called from Chrome Web Store or Nova main window.' };
  }

  try {
    if (typeof urlOrId !== 'string' || urlOrId.length > 256) {
      return { error: 'Invalid extension URL or ID' };
    }

    // Extract ID: 32 characters of a-p
    const match = urlOrId.match(/[a-p]{32}/);
    if (!match) return { error: 'Invalid extension URL or ID' };
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

    const platformMap: Record<string, string> = {
      darwin: 'mac',
      win32: 'win',
      linux: 'linux',
    };
    const archMap: Record<string, string> = {
      arm64: 'arm64',
      x64: 'x86-64',
      ia32: 'x86-32',
      arm: 'arm',
    };
    const osParam = platformMap[process.platform] || 'mac';
    const archParam = archMap[process.arch] || 'x86-64';

    const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&os=${osParam}&arch=${archParam}&nacl_arch=${archParam}&prod=chromecrx&prodchannel=unknown&prodversion=126.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;

    const userAgent = process.platform === 'win32'
      ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      : process.platform === 'linux'
      ? 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

    const res = await fetch(crxUrl, {
      headers: {
        'User-Agent': userAgent
      }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Failed to download extension (HTTP ${res.status}): ${errText.substring(0, 100)}`);
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

    // 🔒 Security: Show permission review dialog before installing
    // This is done via IPC to the renderer which shows a native dialog
    const permissions = await parseExtensionPermissions(extractPath);
    const allPermissions = [
      ...permissions.permissions,
      ...permissions.optionalPermissions,
      ...permissions.hostPermissions
    ];
    
    if (allPermissions.length > 0) {
      const formattedPermissions = formatPermissionsForDisplay(allPermissions);
      const parentWin = getMainWindow();
      
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
      
      const { response } = parentWin
        ? await dialog.showMessageBox(parentWin, confirmOptions)
        : await dialog.showMessageBox(confirmOptions);
      
      if (response !== 1) {
        // Clean up extracted files if user cancels
        try { fs.rmSync(extractPath, { recursive: true, force: true }); } catch (e) {}
        try { fs.unlinkSync(crxFilePath); } catch (e) {}
        return { error: 'Installation cancelled by user.' };
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
    return { error: err.message || 'An unknown error occurred.' };
  }
}
