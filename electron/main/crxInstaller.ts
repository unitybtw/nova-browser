import { app, BrowserWindow, dialog, session } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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

// Fixed CRX header prefixes:
//   CRX2: 'Cr24' | version(4) | publicKeyLength(4) | signatureLength(4) | key | signature | zip
//   CRX3: 'Cr24' | version(4) | headerSize(4)        | header                   | zip
// The widest fixed prefix (CRX2, 16 bytes) is the floor for any file that is
// going to be parsed as a CRX at all.
const CRX2_HEADER_BYTES = 16;
const CRX3_HEADER_BYTES = 12;
const MIN_CRX_HEADER_BYTES = CRX2_HEADER_BYTES;
// Real CRX2 keys/signatures are a few hundred bytes and real CRX3 signed headers
// are well under 1 KB, so 64 KB is three orders of magnitude of headroom. The
// ceiling keeps the offset arithmetic from depending on a header region far
// larger than any genuine one, independently of how big the file itself is.
const MAX_CRX2_KEY_BYTES = 64 * 1024;
const MAX_CRX3_HEADER_BYTES = 64 * 1024;

/**
 * Every offset this module derives is computed from attacker-controlled 32-bit
 * header fields, and `Buffer.subarray` does not fail on a bad start offset: it
 * clamps an out-of-range offset to the buffer length (handing JSZip a silently
 * empty payload) and, for a negative offset, wraps from the end of the file. So
 * no slice happens until the arithmetic has proved the span is a real, in-bounds
 * region. Reject — never clamp: a clamped offset hides a malformed header and
 * extracts the wrong bytes.
 */
function assertCrxSpan(value: number, limit: number, what: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Malformed extension package: ${what} must be a positive integer (got ${String(value)}).`);
  }
  if (value > limit) {
    throw new Error(`Malformed extension package: ${what} of ${value} bytes is out of bounds (limit ${limit}).`);
  }
  return value;
}

// Security: mirror unzip-crx-3's CRX unwrapping so the inner zip payload can
// be inspected BEFORE anything is written to disk — unzip-crx-3 joins entry names
// onto the destination with no validation, which allows zip-slip.
function getCrxInnerZip(buffer: Buffer): Buffer {
  // Plain zip packages (PK\x03\x04) are passed through untouched
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return buffer;
  }
  // Read the fixed prefix before trusting any field inside it. Buffer.readUInt32LE
  // throws a bare RangeError past the end, and a short subarray instead yields a
  // payload sliced from wherever the arithmetic happened to land, so a file too
  // small to hold a header is rejected as a format error here.
  if (buffer.length < MIN_CRX_HEADER_BYTES) {
    throw new Error(`Malformed extension package: too small to hold a CRX header (${buffer.length} bytes).`);
  }
  if (!(buffer[0] === 0x43 && buffer[1] === 0x72 && buffer[2] === 0x32 && buffer[3] === 0x34)) {
    throw new Error('Unsupported CRX container format.');
  }

  const readU32 = (offset: number) => buffer.readUInt32LE(offset);
  // The whole 32-bit version, not just buffer[4]: a header declaring 0x00000102
  // is not a CRX2, and matching the low byte alone silently treated it as one.
  const version = readU32(4);
  let zipStart: number;
  if (version === 2) {
    const publicKeyLength = assertCrxSpan(readU32(8), Math.min(MAX_CRX2_KEY_BYTES, buffer.length), 'CRX2 public key length');
    const signatureLength = assertCrxSpan(readU32(12), Math.min(MAX_CRX2_KEY_BYTES, buffer.length), 'CRX2 signature length');
    zipStart = CRX2_HEADER_BYTES + publicKeyLength + signatureLength;
  } else if (version === 3) {
    const headerSize = assertCrxSpan(readU32(8), Math.min(MAX_CRX3_HEADER_BYTES, buffer.length), 'CRX3 header length');
    zipStart = CRX3_HEADER_BYTES + headerSize;
  } else {
    throw new Error('Unsupported CRX container format.');
  }

  // The offset must land strictly inside the file — the zip needs at least its
  // own local file header after it, which is also what keeps a declared offset
  // equal to the file length from becoming an empty payload.
  assertCrxSpan(zipStart, buffer.length - 1, 'CRX zip offset');
  // In bounds is not the same as correct: an offset one byte into the signature
  // is perfectly in bounds but slices the payload from the wrong place. Require
  // an actual zip local file header where the arithmetic says the zip begins.
  if (!(buffer[zipStart] === 0x50 && buffer[zipStart + 1] === 0x4b && buffer[zipStart + 2] === 0x03 && buffer[zipStart + 3] === 0x04)) {
    throw new Error('Malformed extension package: no zip payload at the declared CRX offset.');
  }
  return buffer.subarray(zipStart);
}

// Security (lightweight, no full CRX3 protobuf verify): extract the claimed
// crx_id from the CRX3 header when present, so it can be cross-checked
// against the expected extension folder ID. Returns the 32-char (a-p)
// extension ID, or null when absent/unparseable (plain zip, CRX2, etc.).
function getCrxHeaderClaimedExtensionId(buffer: Buffer): string | null {
  try {
    if (buffer.length < 12) return null;
    if (!(buffer[0] === 0x43 && buffer[1] === 0x72 && buffer[2] === 0x32 && buffer[3] === 0x34)) return null;
    if (buffer[4] !== 3) return null;
    const headerSize = buffer.readUInt32LE(8);
    if (headerSize <= 0 || headerSize > MAX_CRX3_HEADER_BYTES) return null;
    if (buffer.length < 12 + headerSize) return null;
    const header = buffer.subarray(12, 12 + headerSize);
    // CrxFileHeader.signed_header_data: field 10000, wire type 2 -> tag 0x82 0xF1 0x04
    const tagIdx = header.indexOf(Buffer.from([0x82, 0xf1, 0x04]));
    if (tagIdx === -1) return null;
    let off = tagIdx + 3;
    let len = 0;
    let shift = 0;
    let lenOk = false;
    while (off < header.length) {
      const b = header[off++];
      len |= (b & 0x7f) << shift;
      shift += 7;
      if ((b & 0x80) === 0) { lenOk = true; break; }
      if (shift > 28) return null;
    }
    if (!lenOk || len <= 0 || off + len > header.length) return null;
    const signedData = header.subarray(off, off + len);
    // CrxSignedHeaderData.crx_id: field 1, wire type 2 -> tag 0x0A, 16 bytes
    const idTagIdx = signedData.indexOf(0x0a);
    if (idTagIdx === -1) return null;
    let o = idTagIdx + 1;
    let idLen = 0;
    let s = 0;
    let idLenOk = false;
    while (o < signedData.length) {
      const b = signedData[o++];
      idLen |= (b & 0x7f) << s;
      s += 7;
      if ((b & 0x80) === 0) { idLenOk = true; break; }
      if (s > 28) return null;
    }
    if (!idLenOk || idLen !== 16 || o + 16 > signedData.length) return null;
    const idBytes = signedData.subarray(o, o + 16);
    let extId = '';
    for (const byte of idBytes) {
      extId += String.fromCharCode(97 + (byte >> 4), 97 + (byte & 0x0f));
    }
    if (!/^[a-p]{32}$/.test(extId)) return null;
    return extId;
  } catch {
    return null;
  }
}

// Zip bomb defense limits
const MAX_TOTAL_UNCOMPRESSED_BYTES = 150 * 1024 * 1024; // 150 MB max uncompressed
const MAX_SINGLE_FILE_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50 MB max single file
const MAX_TOTAL_ENTRIES = 2000; // 2000 files max

// JSZip's `async('nodebuffer')` inflates the complete entry before returning,
// so checking its size afterward still permits a zip bomb to exhaust memory.
// Read each entry incrementally and stop decompression as soon as its actual
// output crosses the remaining per-file or archive budget.
//
// The stream must be consumed with event handlers, NOT `for await`: jszip 3.x
// depends on readable-stream@2, which has no `Symbol.asyncIterator` (it arrived
// in v3), so `for await` threw "stream is not async iterable" on the first
// entry of every real extension and the whole installer was dead.
async function readZipEntryWithLimit(file: any, maxBytes: number, filename: string): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const stream = file.nodeStream('nodebuffer') as any;
    const chunks: Buffer[] = [];
    let received = 0;
    let settled = false;

    const finish = (err: Error | null, value?: Buffer) => {
      if (settled) return;
      settled = true;
      if (err) {
        try { stream.destroy(); } catch (_) {}
        reject(err);
      } else {
        resolve(value as Buffer);
      }
    };

    stream.on('data', (rawChunk: unknown) => {
      if (settled) return;
      const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk as any);
      received += chunk.length;
      if (received > maxBytes) {
        finish(new Error(`Extension file '${filename}' exceeds its uncompressed size limit (${maxBytes} bytes).`));
        return;
      }
      chunks.push(chunk);
    });
    stream.on('end', () => finish(null, Buffer.concat(chunks, received)));
    stream.on('error', (err: Error) => finish(err));
  });
}

/**
 * Exported for tests. This is the only place the CRX/zip is turned into files
 * on disk, and it carries the entry-count, per-file, total-size and zip-slip
 * controls. The audit note that matters: this logic was previously unreachable
 * in practice (a `for await` over a readable-stream@2 object threw before the
 * first entry), and the existing suite still passed 12/12 because it
 * re-implemented the CRX3 helper locally instead of importing this module.
 * Drive the real function from a test, not a copy of it.
 */
export async function loadSafeCrxZip(buffer: Buffer, targetDir: string) {
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
  return zip;
}

/**
 * Validates the archive and then writes it to `stagingPath`, with a cumulative
 * and a per-entry streaming byte budget.
 *
 * Exported, and the single place extraction happens, so tests drive the real
 * code. The reason this matters: the previous implementation read each entry
 * with `for await` over a jszip stream, which throws on readable-stream@2, so
 * nothing was ever written while the security suite still reported 12/12 green
 * (it re-implemented the CRX3 helper instead of importing this module).
 */
export async function extractSafeCrxZip(buffer: Buffer, stagingPath: string): Promise<void> {
  const zipPayload = await loadSafeCrxZip(buffer, stagingPath);
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
      const remainingArchiveBytes = MAX_TOTAL_UNCOMPRESSED_BYTES - totalUncompressedBytes;
      const entryLimit = Math.min(MAX_SINGLE_FILE_UNCOMPRESSED_BYTES, remainingArchiveBytes);
      const content = await readZipEntryWithLimit(file, entryLimit, filename);
      totalUncompressedBytes += content.length;
      fs.mkdirSync(path.dirname(destFile), { recursive: true });
      fs.writeFileSync(destFile, content);
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
  if (!isFromMainWindow && event.sender && event.senderFrame) {
    try {
      const isMainFrame = Boolean(event.sender.mainFrame && event.senderFrame === event.sender.mainFrame);
      const frameUrlStr = (typeof event.senderFrame.url === 'string') ? event.senderFrame.url : '';
      if (frameUrlStr) {
        const sender = new URL(frameUrlStr);
        const isWebstoreHost = sender.protocol === 'https:' &&
          ((sender.hostname === 'chromewebstore.google.com') ||
           (sender.hostname === 'chrome.google.com' && sender.pathname.startsWith('/webstore/')));
        isFromWebstore = isMainFrame && isWebstoreHost;
      }
    } catch (_) {}
  }
  if (!isFromMainWindow && !isFromWebstore) {
    return { error: 'Unauthorized: install-from-webstore can only be called from Chrome Web Store or Nova main window.' };
  }

  let crxFilePath = '';
  let stagingPath = '';

  try {
    if (typeof urlOrId !== 'string' || urlOrId.length > 256) {
      return { error: 'Invalid extension URL or ID' };
    }

    // Extract ID: exact 32 characters [a-p] or from validated Chrome Web Store URL path segment
    let extensionId = '';
    const trimmed = urlOrId.trim();
    if (/^[a-p]{32}$/i.test(trimmed)) {
      extensionId = trimmed.toLowerCase();
    } else {
      try {
        const parsed = new URL(trimmed);
        if (
          parsed.protocol === 'https:' &&
          (parsed.hostname === 'chromewebstore.google.com' || parsed.hostname === 'chrome.google.com')
        ) {
          const segments = parsed.pathname.split('/').filter(Boolean);
          const lastSeg = segments[segments.length - 1];
          if (lastSeg && /^[a-p]{32}$/i.test(lastSeg)) {
            extensionId = lastSeg.toLowerCase();
          }
        }
      } catch (_) {}
      if (!extensionId) {
        const match = trimmed.match(/(?:^|[\/=])([a-p]{32})(?:[\/?#]|$)/i);
        if (match && match[1]) {
          extensionId = match[1].toLowerCase();
        }
      }
    }
    if (!extensionId) return { error: 'Invalid extension URL or ID' };

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

    // Follow the store's redirect chain manually. cross-fetch/node-fetch follows
    // up to 20 hops by default with no https->http downgrade guard and no host
    // check on the destination, so a hostile or misconfigured hop could serve
    // the payload over plaintext from an arbitrary origin. Electron cannot
    // verify a CRX signature (it only loads unpacked extensions, and the
    // signature covers the container we deliberately strip), so transport is the
    // only real lever: every hop must stay https and stay on a Google host.
    const ALLOWED_DOWNLOAD_HOSTS = /(^|\.)(google\.com|googleusercontent\.com|ggpht\.com)$/i;
    const MAX_REDIRECTS = 5;
    let currentUrl = crxUrl;
    let res: any = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      res = await fetch(currentUrl, {
        redirect: 'manual',
        signal: AbortSignal.timeout(30000),
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/x-chrome-extension,application/octet-stream,*/*'
        }
      });
      if (!res.status || (res.status < 300 || res.status >= 400)) break;
      if (res.status === 204) break;
      const location = res.headers.get('location');
      if (!location) break;
      let next: URL;
      try {
        next = new URL(location, currentUrl);
      } catch {
        throw new Error('Extension download returned an invalid redirect target.');
      }
      if (next.protocol !== 'https:') {
        throw new Error('Refusing an extension download that downgrades to a non-HTTPS URL.');
      }
      if (!ALLOWED_DOWNLOAD_HOSTS.test(next.hostname)) {
        throw new Error(`Refusing an extension download redirected off a Google host (${next.hostname}).`);
      }
      currentUrl = next.toString();
    }

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

    // Security: cross-check CRX3 header crx_id (when present) against the expected folder ID
    const claimedId = getCrxHeaderClaimedExtensionId(buffer);
    if (claimedId && claimedId !== extensionId) {
      console.warn(`[Security] Rejected extension: CRX header crx_id mismatch (header=${claimedId}, expected=${extensionId}).`);
      throw new Error('Extension package identity mismatch (CRX header ID does not match expected extension ID).');
    }

    // In-memory buffer is extracted directly into stagingPath without writing intermediate archive to disk.

    const extensionsBaseDir = path.join(app.getPath('userData'), 'extensions');
    if (!fs.existsSync(extensionsBaseDir)) fs.mkdirSync(extensionsBaseDir, { recursive: true });
    const extractPath = path.join(extensionsBaseDir, extensionId);

    // Staging directory for atomic extraction: prevents corrupting extractPath on failure
    // mkdtemp, not a Date.now() suffix: two installs of the same id that land in
    // the same millisecond collided, and the loser's rmSync deleted the tree the
    // winner was extracting into, producing a mixed/partial extension.
    stagingPath = fs.mkdtempSync(path.join(extensionsBaseDir, `${extensionId}_staging_`));

    try {
      // Security: validate every zip entry against the staging target BEFORE extracting (zip-slip)
      // Parse the archive once, validate every path before writing anything,
      // then extract with cumulative and per-file streaming byte limits.
      await extractSafeCrxZip(buffer, stagingPath);

      // Security: post-extraction containment + symlink sweep
      assertExtractionContained(stagingPath);

      // Verify manifest.json exists
      const manifestPath = path.join(stagingPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('Extension package is missing manifest.json.');
      }

      // Security: manifest update_url must be https when present; http/plain is rejected.
      // Non-WebStore update hosts are sideload candidates — warn only, no block.
      try {
        const rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const updateUrl = (rawManifest as any)?.update_url;
        if (typeof updateUrl === 'string' && updateUrl.length > 0) {
          let parsedUpdate: URL;
          try {
            parsedUpdate = new URL(updateUrl);
          } catch {
            throw new Error('Extension manifest contains an invalid update_url.');
          }
          if (parsedUpdate.protocol !== 'https:') {
            throw new Error('Extension manifest update_url must use HTTPS.');
          }
          if (parsedUpdate.hostname.toLowerCase() !== 'clients2.google.com') {
            console.warn(`[Security] Sideload warning: extension ${extensionId} update_url host is ${parsedUpdate.hostname} (expected clients2.google.com).`);
          }
        }
      } catch (manifestErr: any) {
        if (manifestErr?.message === 'Extension manifest update_url must use HTTPS.' ||
            manifestErr?.message === 'Extension manifest contains an invalid update_url.') {
          throw manifestErr;
        }
        // Unparseable manifest for this pre-check only: the dialog-stage parse
        // below handles naming gracefully, so don't fail open/closed here.
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
        // manifest.name is attacker-controlled and goes straight into a native
        // dialog. Left unbounded it can be megabytes long or carry control
        // characters, either of which makes the permission list unreadable or
        // wedges the modal. Native dialogs render plain text, so there is no
        // markup injection here - this is about keeping the review legible.
        extensionName = manifest.name.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 64) || extensionId;
      }
    } catch (_) {}

    const allPermissions = [
      ...permissions.permissions,
      ...permissions.optionalPermissions,
      ...permissions.hostPermissions
    ];

    const formattedPermissions = formatPermissionsForDisplay(allPermissions);
    const parentWin = getMainWindow();

    // Info-only identity line. The id here is what the STORE CLAIMS: it is
    // taken from the request and cross-checked against an unsigned CRX3 header
    // field, and only verified for real after loadExtension, by comparing
    // extInfo.id (Chromium's own key-derived id) — see the assert below. Do not
    // present it as authenticated identity.
    let identityLine = `Extension ID: ${extensionId}`;
    try {
      identityLine += `\nSHA256: ${crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16)}`;
    } catch (_) {}

    const confirmOptions: Electron.MessageBoxOptions = {
      type: 'question',
      buttons: ['Cancel', 'Add Extension'],
      defaultId: 0,
      cancelId: 0,
      title: 'Install Extension',
      message: `Add "${extensionName}" to Nova Browser?`,
      detail: formattedPermissions.length > 0
        ? `${identityLine}\n\nIt can:\n\n${formattedPermissions.join('\n\n')}`
        : `${identityLine}\n\nThis extension does not request special browser permissions.`
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

      // Bind the requested id to the extension Chromium actually loaded.
      // Chromium derives an unpacked extension's runtime id from its public key
      // (or its path), and nothing here reads `manifest.key`, so a package
      // carrying a key loads under a DIFFERENT id. Consequences if unchecked:
      // the pre-load `getExtension(extensionId)` misses, so a second copy loads
      // alongside (duplicate background page and content scripts); the copy
      // is dropped from loadedExtensions while still running, leaving an
      // extension with no UI to remove it; and any package can claim any id,
      // which the permission dialog then displays as though it were verified.
      // This is the same fail-closed assertion toggle-extension already makes.
      if (extInfo?.id && extInfo.id !== extensionId) {
        const actualId = extInfo.id;
        try { await session.defaultSession.removeExtension(actualId); } catch (_) {}
        try { fs.rmSync(extractPath, { recursive: true, force: true }); } catch (_) {}
        if (crxFilePath && fs.existsSync(crxFilePath)) {
          try { fs.unlinkSync(crxFilePath); } catch (_) {}
        }
        console.warn(`[WebStore] Refused extension ${extensionId}: manifest key resolves to ${actualId}.`);
        return { error: 'The extension\'s manifest key does not match its store ID, so it was not installed.' };
      }

      if (!deps.isExtensionLoaded(extensionId)) {
        deps.addLoadedExtension(extInfo);
      }
    } catch (loadErr: any) {
      console.error('Failed to load extension into session:', loadErr);
      if (crxFilePath && fs.existsSync(crxFilePath)) {
        try { fs.unlinkSync(crxFilePath); } catch (_) {}
      }
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
    if (stagingPath && fs.existsSync(stagingPath)) {
      try { fs.rmSync(stagingPath, { recursive: true, force: true }); } catch (_) {}
    }
    if (crxFilePath && fs.existsSync(crxFilePath)) {
      try { fs.unlinkSync(crxFilePath); } catch (_) {}
    }
    return { error: err.message || 'An unknown error occurred.' };
  }
}
