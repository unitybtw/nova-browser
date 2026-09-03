import { app, BrowserWindow, dialog, session } from 'electron';
import path from 'path';
import fs from 'fs';
import fetch from 'cross-fetch';
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

// Security: read an HTTP response body while enforcing a hard byte limit.
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

// Security: mirror unzip-crx-3's CRX unwrapping so the inner zip payload can
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

// Zip bomb defense limits
const MAX_TOTAL_UNCOMPRESSED_BYTES = 150 * 1024 * 1024; // 150 MB max uncompressed
const MAX_SINGLE_FILE_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50 MB max single file
const MAX_TOTAL_ENTRIES = 2000; // 2000 files max

async function assertCrxEntriesSafe(buffer: Buffer, targetDir: string): Promise<void> {
  const zip = await JSZip.loadAsync(getCrxInnerZip(buffer));
  const resolvedTarget = path.resolve(targetDir);
  const entryKeys = Object.keys(zip.files);
  if (entryKeys.length > MAX_TOTAL_ENTRIES) {
    throw new Error(`Extension contains too many entries (${entryKeys.length} > ${MAX_TOTAL_ENTRIES}), potential zip bomb.`);
  }

  for (const entryName of entryKeys) {
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

  // Security: Allow only trusted main window OR Chrome Web Store top-level main frame
  const isFromMainWindow = isTrustedSender(event);
  let isFromWebstore = false;
  if (!isFromMainWindow && event.sender) {
    try {
      const isMainFrame = !event.senderFrame || event.senderFrame === event.sender.mainFrame;
      const frameUrlStr = (event.senderFrame && typeof event.senderFrame.url === 'string')
        ? event.senderFrame.url
        : event.sender.getURL() || '';
      const sender = new URL(frameUrlStr);
      const isWebstoreHost = sender.protocol === 'https:' &&
        ((sender.hostname === 'chromewebstore.google.com') ||
         (sender.hostname === 'chrome.google.com' && sender.pathname.startsWith('/webstore/')));
      isFromWebstore = isMainFrame && isWebstoreHost;
    } catch (_) {}
  }
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

    const chromeVer = process.versions.chrome || '150.0.0.0';
    // Security & Compatibility: Include installsource=ondemand so Google Web Store update server serves CRX3 directly
    const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&os=${osParam}&arch=${archParam}&os_arch=${archParam}&nacl_arch=${archParam}&prod=chromecrx&prodchannel=unknown&prodversion=${chromeVer}&lang=en-US&acceptformat=crx2,crx3&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`;

    const userAgent = process.platform === 'win32'
      ? `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`
      : process.platform === 'linux'
      ? `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`
      : `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;

    const res = await fetch(crxUrl, {
      signal: AbortSignal.timeout(30000),
      headers: {
        'User-Agent': userAgent,
        'Accept': 'application/x-chrome-extension,application/octet-stream,*/*'
      }
    });

    if (res.status === 204) {
      throw new Error('This extension is no longer available on the Chrome Web Store (HTTP 204, e.g. deprecated Manifest V2). Please choose a Manifest V3 alternative.');
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Failed to download extension (HTTP ${res.status}): ${errText.substring(0, 100)}`);
    }

    // Security: enforce a hard 100MB ceiling BEFORE buffering the CRX body.
    const MAX_CRX_BYTES = 100 * 1024 * 1024;
    const declaredLength = Number.parseInt(res.headers.get('content-length') || '', 10);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_CRX_BYTES) {
      throw new Error(`Extension package exceeds maximum allowed size (${MAX_CRX_BYTES} bytes).`);
    }

    const buffer = await readBodyWithLimit(res, MAX_CRX_BYTES);

    if (buffer.length === 0) {
      throw new Error('Downloaded extension package is empty (0 bytes received).');
    }

    // Security: Validate CRX magic header (Cr24: 0x43 0x72 0x32 0x34) or PK zip header (0x50 0x4B)
    if (buffer.length < 4 || ((buffer[0] !== 0x43 || buffer[1] !== 0x72 || buffer[2] !== 0x32 || buffer[3] !== 0x34) && (buffer[0] !== 0x50 || buffer[1] !== 0x4B))) {
      throw new Error('Downloaded file is not a valid extension package format.');
    }

    const tempPath = path.join(app.getPath('userData'), 'temp_extensions');
    if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath, { recursive: true });

    const crxFilePath = path.join(tempPath, `${extensionId}.crx`);
    fs.writeFileSync(crxFilePath, buffer);

    const extensionsBaseDir = path.join(app.getPath('userData'), 'extensions');
    if (!fs.existsSync(extensionsBaseDir)) fs.mkdirSync(extensionsBaseDir, { recursive: true });
    const extractPath = path.join(extensionsBaseDir, extensionId);

    // Staging directory for atomic extraction: prevents corrupting extractPath on failure
    const stagingPath = path.join(extensionsBaseDir, `${extensionId}_staging_${Date.now()}`);
    if (fs.existsSync(stagingPath)) fs.rmSync(stagingPath, { recursive: true, force: true });
    fs.mkdirSync(stagingPath, { recursive: true });

    try {
      // Security: validate every zip entry against the staging target BEFORE extracting (zip-slip)
      await assertCrxEntriesSafe(buffer, stagingPath);

      // Extract cleanly with JSZip with cumulative and per-file byte limits
      const zipPayload = await JSZip.loadAsync(getCrxInnerZip(buffer));
      let totalUncompressedBytes = 0;
      for (const [filename, file] of Object.entries(zipPayload.files)) {
        const normalized = filename.replace(/\\/g, '/');
        const destFile = path.resolve(stagingPath, normalized);
        if (!destFile.startsWith(path.resolve(stagingPath) + path.sep) && destFile !== path.resolve(stagingPath)) {
          continue;
        }
        if (file.dir) {
          fs.mkdirSync(destFile, { recursive: true });
        } else {
          const content = await file.async('nodebuffer');
          if (content.length > MAX_SINGLE_FILE_UNCOMPRESSED_BYTES) {
            throw new Error(`Extension file '${filename}' exceeds maximum single file limit (${content.length} > ${MAX_SINGLE_FILE_UNCOMPRESSED_BYTES} bytes).`);
          }
          totalUncompressedBytes += content.length;
          if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
            throw new Error(`Extension total uncompressed size exceeds limit (${totalUncompressedBytes} > ${MAX_TOTAL_UNCOMPRESSED_BYTES} bytes), potential zip bomb.`);
          }
          fs.mkdirSync(path.dirname(destFile), { recursive: true });
          fs.writeFileSync(destFile, content);
        }
      }

      // Security: post-extraction containment + symlink sweep
      assertExtractionContained(stagingPath);

      // Verify manifest.json exists
      const manifestPath = path.join(stagingPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('Extension package is missing manifest.json.');
      }
    } catch (extractErr) {
      try { fs.rmSync(stagingPath, { recursive: true, force: true }); } catch (_) {}
      try { fs.unlinkSync(crxFilePath); } catch (_) {}
      throw extractErr;
    }

    // Single unified permission review dialog
    const permissions = await parseExtensionPermissions(stagingPath);
    let extensionName = extensionId;
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(stagingPath, 'manifest.json'), 'utf8'));
      if (manifest.name && typeof manifest.name === 'string') {
        extensionName = manifest.name;
      }
    } catch (_) {}

    const allPermissions = [
      ...permissions.permissions,
      ...permissions.optionalPermissions,
      ...permissions.hostPermissions
    ];
    
    const formattedPermissions = formatPermissionsForDisplay(allPermissions);
    const parentWin = getMainWindow();
    
    const confirmOptions: Electron.MessageBoxOptions = {
      type: 'question',
      buttons: ['Cancel', 'Add Extension'],
      defaultId: 0,
      cancelId: 0,
      title: 'Install Extension',
      message: `Add "${extensionName}" to Nova Browser?`,
      detail: formattedPermissions.length > 0
        ? `It can:\n\n${formattedPermissions.join('\n\n')}`
        : 'This extension does not request special browser permissions.'
    };
    
    const { response } = parentWin
      ? await dialog.showMessageBox(parentWin, confirmOptions)
      : await dialog.showMessageBox(confirmOptions);
    
    if (response !== 1) {
      try { fs.rmSync(stagingPath, { recursive: true, force: true }); } catch (_) {}
      try { fs.unlinkSync(crxFilePath); } catch (_) {}
      return { error: 'Installation cancelled by user.' };
    }

    // Atomic promotion: remove existing extractPath if present, and rename staging to extractPath
    if (fs.existsSync(extractPath)) {
      try { fs.rmSync(extractPath, { recursive: true, force: true }); } catch (_) {}
    }
    fs.renameSync(stagingPath, extractPath);

    // If extension is already loaded in defaultSession, unload it first to prevent duplicate loading crash
    try {
      if (session.defaultSession.getExtension(extensionId)) {
        await session.defaultSession.removeExtension(extensionId);
      }
    } catch (_) {}

    // Clear disabled state if extension was previously disabled
    const disabledIds = deps.getDisabledExtensionIds();
    if (disabledIds.includes(extensionId)) {
      deps.setDisabledExtensionIds(disabledIds.filter(id => id !== extensionId));
    }

    let extInfo;
    try {
      extInfo = await session.defaultSession.loadExtension(extractPath, { allowFileAccess: false });
      if (!deps.isExtensionLoaded(extensionId)) {
        deps.addLoadedExtension(extInfo);
      }
    } catch (loadErr: any) {
      console.error('Failed to load extension into session:', loadErr);
      return { error: `Failed to load extension: ${loadErr?.message || 'Unsupported or invalid extension'}` };
    }

    try { fs.unlinkSync(crxFilePath); } catch (_) {}

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
