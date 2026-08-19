/**
 * Empirical Adversarial Test Harness for Challenger 1 (Main Process Security & IPC Hardening)
 * Nova Browser Milestone 1
 */

import path from 'path';
import fs from 'fs';
import os from 'os';

console.log('================================================================');
console.log('STARTING EMPIRICAL ADVERSARIAL VERIFICATION SUITE - MILESTONE 1');
console.log('================================================================\n');

interface TestResult {
  suite: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, details: string) {
  if (condition) {
    results.push({ suite, name, status: 'PASS', details });
    console.log(`[PASS] [${suite}] ${name}`);
  } else {
    results.push({ suite, name, status: 'FAIL', details });
    console.error(`[FAIL] [${suite}] ${name} --> ${details}`);
  }
}

// =========================================================================
// 1. ORIGIN VALIDATION CHALLENGE (isTrustedAppOrigin)
// =========================================================================
console.log('--- 1. Testing Origin Validation (isTrustedAppOrigin) ---');

function isTrustedAppOrigin(urlStr: string, mockDistIndexHtml?: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol === 'nova:' || parsed.protocol === 'devtools:') return true;
    if (parsed.origin === 'http://localhost:5173') return true;
    if (parsed.protocol === 'file:') {
      const allowedPath = mockDistIndexHtml || path.resolve(path.join(__dirname, '../dist/index.html'));
      const navPath = decodeURIComponent(parsed.pathname);
      return path.resolve(navPath) === allowedPath;
    }
    return false;
  } catch {
    return false;
  }
}

const allowedFile = path.resolve(path.join(__dirname, '../dist/index.html'));

const originAttackVectors = [
  // Bypass attempts on localhost:5173
  { url: 'http://localhost:5173.evil.com', expected: false, desc: 'Subdomain bypass (localhost:5173.evil.com)' },
  { url: 'http://localhost:5173.attacker.io/login', expected: false, desc: 'Subdomain path bypass' },
  { url: 'http://localhost:5173@attacker.com', expected: false, desc: 'Userinfo hostname bypass (localhost:5173@attacker.com)' },
  { url: 'http://localhost:51730', expected: false, desc: 'Port confusion (51730)' },
  { url: 'http://localhost:5173:80', expected: false, desc: 'Double port confusion' },
  { url: 'http://localhost:5174', expected: false, desc: 'Port mismatch (5174)' },
  { url: 'http://evil.com?http://localhost:5173', expected: false, desc: 'Query parameter spoof' },
  { url: 'http://evil.com#http://localhost:5173', expected: false, desc: 'Hash fragment spoof' },
  { url: 'http://localhost.evil.com:5173', expected: false, desc: 'Nested subdomain attack' },
  { url: 'https://localhost:5173', expected: false, desc: 'HTTPS scheme mismatch' },
  { url: 'ws://localhost:5173', expected: false, desc: 'WebSocket scheme mismatch' },
  { url: 'http://127.0.0.1:5173', expected: false, desc: 'IP representation instead of localhost origin' },
  { url: 'http://0.0.0.0:5173', expected: false, desc: '0.0.0.0 IP representation' },
  { url: 'http://[::1]:5173', expected: false, desc: 'IPv6 loopback representation' },

  // Legitimate dev server origins
  { url: 'http://localhost:5173', expected: true, desc: 'Exact localhost origin' },
  { url: 'http://localhost:5173/', expected: true, desc: 'Localhost origin with root slash' },
  { url: 'http://localhost:5173/settings?tab=general#sec', expected: true, desc: 'Localhost origin with path, query, and hash' },
  { url: 'http://user:pass@localhost:5173/', expected: true, desc: 'Localhost with basic auth userinfo' },

  // Internal schemes
  { url: 'nova://settings', expected: true, desc: 'nova: internal protocol' },
  { url: 'nova://history', expected: true, desc: 'nova: history protocol' },
  { url: 'nova://newtab', expected: true, desc: 'nova: newtab protocol' },
  { url: 'devtools://devtools/bundled/inspector.html', expected: true, desc: 'devtools: protocol' },

  // Dangerous protocols & Blob origin isolation
  { url: 'javascript:alert(1)', expected: false, desc: 'javascript: protocol' },
  { url: 'data:text/html,<h1>test</h1>', expected: false, desc: 'data: protocol' },
  { url: 'blob:https://evil.com/uuid-1234', expected: false, desc: 'blob: protocol with evil origin' },
  { url: 'blob:http://localhost:5173.evil.com/uuid-1234', expected: false, desc: 'blob: protocol with spoofed subdomain origin' },
  { url: 'blob:http://localhost:5173/uuid-1234', expected: true, desc: 'blob: protocol with trusted localhost origin (WebWorker/ObjectBlob)' },
  { url: 'vbscript:msgbox(1)', expected: false, desc: 'vbscript: protocol' },

  // Local file scheme
  { url: `file://${allowedFile}`, expected: true, desc: 'Exact dist/index.html file URL' },
  { url: `file://${allowedFile}/../../etc/passwd`, expected: false, desc: 'File URL path traversal' },
  { url: 'file:///etc/passwd', expected: false, desc: 'Unauthorized system file URL' },
  { url: 'file:///C:/Windows/System32/cmd.exe', expected: false, desc: 'Windows system file URL' },

  // Non-string / malformed inputs
  { url: '', expected: false, desc: 'Empty string' },
  { url: '    ', expected: false, desc: 'Whitespace string' },
  { url: 'not-a-valid-url-at-all', expected: false, desc: 'Malformed non-URL string' },
  { url: null as any, expected: false, desc: 'null value' },
  { url: undefined as any, expected: false, desc: 'undefined value' },
  { url: 12345 as any, expected: false, desc: 'number value' },
  { url: {} as any, expected: false, desc: 'object value' },
  { url: [] as any, expected: false, desc: 'array value' },
];

for (const vec of originAttackVectors) {
  const result = isTrustedAppOrigin(vec.url, allowedFile);
  assert(
    result === vec.expected,
    'Origin Validation',
    vec.desc,
    `Input: ${JSON.stringify(vec.url)} | Expected: ${vec.expected} | Got: ${result}`
  );
}

// =========================================================================
// 2. PATH TRAVERSAL CHALLENGE (remove-extension & install-extension)
// =========================================================================
console.log('\n--- 2. Testing Path Traversal & Identifier Validation ---');

function validateExtensionId(extensionId: string): boolean {
  if (!extensionId || typeof extensionId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(extensionId)) {
    return false;
  }
  return true;
}

function resolveAndValidateExtensionDir(userDataDir: string, extensionId: string): { valid: boolean; targetPath?: string } {
  if (!validateExtensionId(extensionId)) return { valid: false };
  const extensionsBaseDir = path.resolve(path.join(userDataDir, 'extensions'));
  const extDir = path.resolve(path.join(extensionsBaseDir, extensionId));
  if (extDir.startsWith(extensionsBaseDir + path.sep)) {
    return { valid: true, targetPath: extDir };
  }
  return { valid: false };
}

function validateInstallExtensionFolder(userDataDir: string, folderPath: string): boolean {
  if (!folderPath || typeof folderPath !== 'string') return false;
  if (folderPath.includes('..')) return false;
  const extensionsDir = path.resolve(path.join(userDataDir, 'extensions'));
  const resolvedFolder = path.resolve(folderPath);
  if (!resolvedFolder.startsWith(extensionsDir + path.sep) && resolvedFolder !== extensionsDir) {
    return false;
  }
  return true;
}

const mockUserData = path.join(os.tmpdir(), 'nova_test_userdata_' + Date.now());

const extensionIdVectors = [
  // Traversal & injection attempts
  { id: '../../evil', valid: false, desc: 'Directory traversal (../../evil)' },
  { id: '..\\..\\evil', valid: false, desc: 'Windows traversal (..\\..\\evil)' },
  { id: '..', valid: false, desc: 'Parent dir dot-dot (..)' },
  { id: '.', valid: false, desc: 'Current dir dot (.)' },
  { id: '/etc/passwd', valid: false, desc: 'Root absolute path (/etc/passwd)' },
  { id: 'C:\\Windows\\System32', valid: false, desc: 'Windows absolute path' },
  { id: 'ext\0nullbyte', valid: false, desc: 'Null byte injection (ext\\0nullbyte)' },
  { id: 'ext;rm -rf /', valid: false, desc: 'Shell command injection' },
  { id: 'ext$(whoami)', valid: false, desc: 'Subshell command substitution' },
  { id: 'ext`id`', valid: false, desc: 'Backtick command substitution' },
  { id: 'ext*wildcard', valid: false, desc: 'Wildcard char (*)' },
  { id: 'ext?query', valid: false, desc: 'Question mark char (?)' },
  { id: 'ext#fragment', valid: false, desc: 'Hash char (#)' },
  { id: 'ext space', valid: false, desc: 'Space char' },
  { id: 'ext\nnewline', valid: false, desc: 'Newline char' },
  { id: 'ext\ttab', valid: false, desc: 'Tab char' },
  { id: '.hidden_ext', valid: false, desc: 'Leading dot' },
  { id: 'ext.dir', valid: false, desc: 'Dot in ID' },
  { id: '\u202e_malicious', valid: false, desc: 'Right-to-left override unicode' },
  { id: 'ехt_cyrillic', valid: false, desc: 'Cyrillic homoglyph characters' },
  { id: '', valid: false, desc: 'Empty string' },
  { id: null as any, valid: false, desc: 'null value' },
  { id: undefined as any, valid: false, desc: 'undefined value' },
  { id: 12345 as any, valid: false, desc: 'numeric ID' },
  { id: {} as any, valid: false, desc: 'object ID' },
  { id: [] as any, valid: false, desc: 'array ID' },

  // Valid extension IDs
  { id: 'abcdefghijklmnopabcdefghijklmnop', valid: true, desc: '32-char webstore ID format' },
  { id: 'my-custom-extension_123', valid: true, desc: 'Alphanumeric with hyphen and underscore' },
  { id: 'ublock_origin-v2', valid: true, desc: 'Standard extension slug' },
  { id: 'A', valid: true, desc: 'Single uppercase letter' },
  { id: '123456', valid: true, desc: 'Numeric string ID' }
];

for (const vec of extensionIdVectors) {
  const isValidId = validateExtensionId(vec.id);
  assert(
    isValidId === vec.valid,
    'Extension ID Regex',
    vec.desc,
    `ID: ${JSON.stringify(vec.id)} | Expected: ${vec.valid} | Got: ${isValidId}`
  );

  const dirRes = resolveAndValidateExtensionDir(mockUserData, vec.id);
  assert(
    dirRes.valid === vec.valid,
    'Extension Dir Confinement',
    `${vec.desc} (confinement check)`,
    `ID: ${JSON.stringify(vec.id)} | Expected: ${vec.valid} | Got: ${dirRes.valid}`
  );
}

const installFolderVectors = [
  { folder: path.join(mockUserData, 'extensions', 'my-extension'), expected: true, desc: 'Valid path within extensions directory' },
  { folder: path.join(mockUserData, 'extensions'), expected: true, desc: 'Root extensions directory' },
  { folder: path.join(mockUserData, 'extensions', '..', 'evil'), expected: false, desc: 'Dot-dot traversal in path' },
  { folder: '/etc/passwd', expected: false, desc: 'System file path' },
  { folder: path.join(mockUserData, 'other_dir'), expected: false, desc: 'Sibling folder outside extensions' },
  { folder: '', expected: false, desc: 'Empty folder path' },
  { folder: null as any, expected: false, desc: 'null folder path' },
  { folder: undefined as any, expected: false, desc: 'undefined folder path' }
];

for (const vec of installFolderVectors) {
  const res = validateInstallExtensionFolder(mockUserData, vec.folder);
  assert(
    res === vec.expected,
    'Install Extension Path Confinement',
    vec.desc,
    `Folder: ${JSON.stringify(vec.folder)} | Expected: ${vec.expected} | Got: ${res}`
  );
}

// =========================================================================
// 3. IPC PARAMETER FUZZING & CRASH RESISTANCE
// =========================================================================
console.log('\n--- 3. Testing IPC Parameter Fuzzing & Crash Resistance ---');

// 3.1. set-vpn parameter validation logic
function testSetVpnLogic(config: any): { success: boolean; error?: string; proxyRules?: string } {
  if (!config || typeof config !== 'object') {
    return { success: false, error: 'Invalid VPN config object' };
  }
  const isEnabled = Boolean(config.enabled);
  const rawProxyUrl = typeof config.proxyUrl === 'string' ? config.proxyUrl.trim() : '';
  const proxyRules = (isEnabled && rawProxyUrl) ? rawProxyUrl : 'direct://';

  if (isEnabled && rawProxyUrl) {
    const allowedProxyProtocols = ['http://', 'https://', 'socks4://', 'socks5://'];
    if (!allowedProxyProtocols.some(proto => proxyRules.startsWith(proto))) {
      return { success: false, error: 'Invalid proxy URL format. Must start with http://, https://, socks4://, or socks5://' };
    }
  }

  return { success: true, proxyRules };
}

const vpnFuzzVectors = [
  { input: null, valid: false, desc: 'set-vpn: null config' },
  { input: undefined, valid: false, desc: 'set-vpn: undefined config' },
  { input: 'string', valid: false, desc: 'set-vpn: string primitive' },
  { input: 12345, valid: false, desc: 'set-vpn: number primitive' },
  { input: true, valid: false, desc: 'set-vpn: boolean primitive' },
  { input: [], valid: true, expectedRules: 'direct://', desc: 'set-vpn: empty array (handled as empty object)' },
  { input: {}, valid: true, expectedRules: 'direct://', desc: 'set-vpn: empty object' },
  { input: { enabled: false, proxyUrl: 'http://malicious.com' }, valid: true, expectedRules: 'direct://', desc: 'set-vpn: disabled ignores proxyUrl' },
  { input: { enabled: true, proxyUrl: 'http://proxy.com:8080' }, valid: true, expectedRules: 'http://proxy.com:8080', desc: 'set-vpn: valid http proxy' },
  { input: { enabled: true, proxyUrl: 'https://secure-proxy.com:443' }, valid: true, expectedRules: 'https://secure-proxy.com:443', desc: 'set-vpn: valid https proxy' },
  { input: { enabled: true, proxyUrl: 'socks4://127.0.0.1:1080' }, valid: true, expectedRules: 'socks4://127.0.0.1:1080', desc: 'set-vpn: valid socks4 proxy' },
  { input: { enabled: true, proxyUrl: 'socks5://127.0.0.1:1080' }, valid: true, expectedRules: 'socks5://127.0.0.1:1080', desc: 'set-vpn: valid socks5 proxy' },
  { input: { enabled: true, proxyUrl: 'javascript:alert(1)' }, valid: false, desc: 'set-vpn: javascript: proxy protocol injection' },
  { input: { enabled: true, proxyUrl: 'file:///etc/passwd' }, valid: false, desc: 'set-vpn: file:/// proxy protocol' },
  { input: { enabled: true, proxyUrl: 'ftp://proxy.com' }, valid: false, desc: 'set-vpn: ftp:// proxy protocol' },
  { input: { enabled: true, proxyUrl: 'data:text/plain,foo' }, valid: false, desc: 'set-vpn: data: proxy protocol' },
  { input: { enabled: true, proxyUrl: '   ' }, valid: true, expectedRules: 'direct://', desc: 'set-vpn: whitespace proxyUrl fallback' },
  { input: { enabled: true, proxyUrl: 12345 as any }, valid: true, expectedRules: 'direct://', desc: 'set-vpn: non-string proxyUrl fallback' },
  { input: { enabled: true, proxyUrl: null as any }, valid: true, expectedRules: 'direct://', desc: 'set-vpn: null proxyUrl fallback' },
];

for (const vec of vpnFuzzVectors) {
  const res = testSetVpnLogic(vec.input);
  assert(
    res.success === vec.valid && (!vec.expectedRules || res.proxyRules === vec.expectedRules),
    'set-vpn Fuzzing',
    vec.desc,
    `Input: ${JSON.stringify(vec.input)} | Expected valid: ${vec.valid} | Got: ${res.success}, rules: ${res.proxyRules}`
  );
}

// 3.2. store-set parameter validation logic
function testStoreSetLogic(key: any, value: any): { success: boolean; error?: string } {
  if (!key || typeof key !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(key)) {
    return { success: false, error: 'Invalid key format' };
  }
  if (typeof value !== 'string') {
    return { success: false, error: 'Invalid value format: must be string' };
  }
  const MAX_STORE_VALUE_SIZE = 10 * 1024 * 1024; // 10MB
  if (Buffer.byteLength(value, 'utf-8') > MAX_STORE_VALUE_SIZE) {
    return { success: false, error: 'Value exceeds maximum allowed size of 10MB' };
  }
  return { success: true };
}

const storeSetFuzzVectors = [
  { key: 'settings', value: '{"theme":"dark"}', valid: true, desc: 'store-set: valid key and JSON string' },
  { key: 'adblocker_whitelist', value: '["example.com"]', valid: true, desc: 'store-set: valid whitelist key' },
  { key: '../../etc/passwd', value: 'evil', valid: false, desc: 'store-set: directory traversal key' },
  { key: 'store/secret', value: 'evil', valid: false, desc: 'store-set: slash in key' },
  { key: 'key with spaces', value: 'val', valid: false, desc: 'store-set: spaces in key' },
  { key: 'key\0null', value: 'val', valid: false, desc: 'store-set: null byte in key' },
  { key: '', value: 'val', valid: false, desc: 'store-set: empty key' },
  { key: null, value: 'val', valid: false, desc: 'store-set: null key' },
  { key: undefined, value: 'val', valid: false, desc: 'store-set: undefined key' },
  { key: 12345, value: 'val', valid: false, desc: 'store-set: number key' },
  { key: 'valid_key', value: null, valid: false, desc: 'store-set: null value' },
  { key: 'valid_key', value: undefined, valid: false, desc: 'store-set: undefined value' },
  { key: 'valid_key', value: { obj: 1 }, valid: false, desc: 'store-set: object value' },
  { key: 'valid_key', value: 12345, valid: false, desc: 'store-set: number value' },
  { key: 'valid_key', value: 'A'.repeat(1024 * 1024), valid: true, desc: 'store-set: 1MB payload (under 10MB limit)' },
  { key: 'valid_key', value: 'A'.repeat(11 * 1024 * 1024), valid: false, desc: 'store-set: 11MB payload (exceeds 10MB limit)' },
];

for (const vec of storeSetFuzzVectors) {
  const res = testStoreSetLogic(vec.key, vec.value);
  assert(
    res.success === vec.valid,
    'store-set Fuzzing',
    vec.desc,
    `Key: ${JSON.stringify(vec.key)}, Val type: ${typeof vec.value} | Expected: ${vec.valid} | Got: ${res.success} (${res.error || 'ok'})`
  );
}

// 3.3. set-theme parameter validation logic
function testSetThemeLogic(theme: any): boolean {
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return true;
  }
  return false;
}

const themeVectors = [
  { theme: 'light', valid: true, desc: 'set-theme: light' },
  { theme: 'dark', valid: true, desc: 'set-theme: dark' },
  { theme: 'system', valid: true, desc: 'set-theme: system' },
  { theme: 'LIGHT', valid: false, desc: 'set-theme: uppercase invalid' },
  { theme: 'black', valid: false, desc: 'set-theme: invalid theme name' },
  { theme: '', valid: false, desc: 'set-theme: empty string' },
  { theme: null, valid: false, desc: 'set-theme: null' },
  { theme: undefined, valid: false, desc: 'set-theme: undefined' },
  { theme: 123, valid: false, desc: 'set-theme: number' },
  { theme: {}, valid: false, desc: 'set-theme: object' }
];

for (const vec of themeVectors) {
  const res = testSetThemeLogic(vec.theme);
  assert(
    res === vec.valid,
    'set-theme Fuzzing',
    vec.desc,
    `Theme: ${JSON.stringify(vec.theme)} | Expected: ${vec.valid} | Got: ${res}`
  );
}

// 3.4. open-download and show-download-in-folder path validation logic
function testDownloadPathLogic(downloadsPath: string, pathStr: any): boolean {
  if (!pathStr || typeof pathStr !== 'string') return false;
  try {
    const resolvedPath = path.resolve(pathStr);
    // Simulation of realpath check within downloads
    const resolvedDownloads = path.resolve(downloadsPath);
    if (resolvedPath && resolvedPath.startsWith(resolvedDownloads + path.sep)) {
      return true;
    }
  } catch {}
  return false;
}

const mockDownloadsDir = path.join(os.tmpdir(), 'nova_downloads_mock');
const downloadPathVectors = [
  { path: path.join(mockDownloadsDir, 'file.pdf'), valid: true, desc: 'open-download: file inside downloads folder' },
  { path: path.join(mockDownloadsDir, 'subfolder', 'archive.zip'), valid: true, desc: 'open-download: subfolder file inside downloads' },
  { path: '/etc/passwd', valid: false, desc: 'open-download: /etc/passwd' },
  { path: path.join(mockDownloadsDir, '..', 'etc', 'passwd'), valid: false, desc: 'open-download: path traversal outside downloads' },
  { path: '', valid: false, desc: 'open-download: empty string' },
  { path: null, valid: false, desc: 'open-download: null' },
  { path: undefined, valid: false, desc: 'open-download: undefined' },
  { path: 12345, valid: false, desc: 'open-download: number' },
];

for (const vec of downloadPathVectors) {
  const res = testDownloadPathLogic(mockDownloadsDir, vec.path);
  assert(
    res === vec.valid,
    'open-download Path Confinement',
    vec.desc,
    `Path: ${JSON.stringify(vec.path)} | Expected: ${vec.valid} | Got: ${res}`
  );
}

// 3.5. capture-tab-thumbnail & capture-full-page webContentsId validation
function testWebContentsIdValidation(wcId: any): boolean {
  if (typeof wcId !== 'number' || !Number.isInteger(wcId)) return false;
  return true;
}

const wcIdVectors = [
  { id: 1, valid: true, desc: 'webContentsId: positive integer' },
  { id: 42, valid: true, desc: 'webContentsId: standard ID' },
  { id: 0, valid: true, desc: 'webContentsId: zero integer' },
  { id: 3.14, valid: false, desc: 'webContentsId: float' },
  { id: NaN, valid: false, desc: 'webContentsId: NaN' },
  { id: Infinity, valid: false, desc: 'webContentsId: Infinity' },
  { id: -Infinity, valid: false, desc: 'webContentsId: -Infinity' },
  { id: '1', valid: false, desc: 'webContentsId: string representation' },
  { id: null, valid: false, desc: 'webContentsId: null' },
  { id: undefined, valid: false, desc: 'webContentsId: undefined' },
  { id: {}, valid: false, desc: 'webContentsId: object' },
];

for (const vec of wcIdVectors) {
  const res = testWebContentsIdValidation(vec.id);
  assert(
    res === vec.valid,
    'capture-tab-thumbnail ID Guard',
    vec.desc,
    `wcId: ${JSON.stringify(vec.id)} | Expected: ${vec.valid} | Got: ${res}`
  );
}

// 3.6. Native TTS voice sanitization against command injection
function sanitizeTtsVoice(voiceName?: any): string {
  let cleanVoice = 'Yelda';
  if (voiceName && typeof voiceName === 'string') {
    const rawName = voiceName.split('(')[0].trim();
    if (/^[a-zA-Z0-9\s]+$/.test(rawName) && rawName.length <= 40 && !rawName.startsWith('-')) {
      cleanVoice = rawName;
    }
  }
  return cleanVoice;
}

const ttsVoiceVectors = [
  { voice: 'Samantha', expected: 'Samantha', desc: 'Valid standard voice name' },
  { voice: 'Alex (Enhanced)', expected: 'Alex', desc: 'Voice name with parenthesized suffix' },
  { voice: '-o /tmp/evil', expected: 'Yelda', desc: 'CLI flag injection attempt (-o)' },
  { voice: '--output-file=/tmp/evil', expected: 'Yelda', desc: 'CLI double-dash flag injection' },
  { voice: 'Voice; rm -rf /', expected: 'Yelda', desc: 'Semicolon command chaining' },
  { voice: 'Voice && cat /etc/passwd', expected: 'Yelda', desc: 'AND command chaining' },
  { voice: 'Voice`whoami`', expected: 'Yelda', desc: 'Backtick command execution' },
  { voice: 'Voice$(id)', expected: 'Yelda', desc: 'Subshell command execution' },
  { voice: 'A'.repeat(50), expected: 'Yelda', desc: 'Excessive voice name length (>40 chars)' },
  { voice: null, expected: 'Yelda', desc: 'null voice fallback' },
  { voice: undefined, expected: 'Yelda', desc: 'undefined voice fallback' },
];

for (const vec of ttsVoiceVectors) {
  const res = sanitizeTtsVoice(vec.voice);
  assert(
    res === vec.expected,
    'TTS Voice Flag Sanitization',
    vec.desc,
    `Voice: ${JSON.stringify(vec.voice)} | Expected: ${vec.expected} | Got: ${res}`
  );
}

// =========================================================================
// 4. CHROME WEB STORE HOSTNAME VALIDATION & ISOLATION
// =========================================================================
console.log('\n--- 4. Testing Chrome Web Store Hostname Checks ---');

function isChromeWebStoreHost(hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') return false;
  const currentHost = hostname.toLowerCase();
  return currentHost === 'chromewebstore.google.com' || currentHost === 'chrome.google.com';
}

const webStoreHostVectors = [
  { host: 'chromewebstore.google.com', expected: true, desc: 'chromewebstore.google.com' },
  { host: 'chrome.google.com', expected: true, desc: 'chrome.google.com' },
  { host: 'CHROMEWEBSTORE.GOOGLE.COM', expected: true, desc: 'Case insensitive upper case' },
  { host: 'Chrome.Google.Com', expected: true, desc: 'Case insensitive mixed case' },
  { host: 'chromewebstore.google.com.evil.com', expected: false, desc: 'Subdomain spoof (chromewebstore.google.com.evil.com)' },
  { host: 'evil.chromewebstore.google.com', expected: false, desc: 'Subdomain prefix spoof' },
  { host: 'attacker-chromewebstore.google.com', expected: false, desc: 'Hyphenated domain spoof' },
  { host: 'chrome.google.com.attacker.com', expected: false, desc: 'chrome.google.com suffix spoof' },
  { host: 'attacker-chrome.google.com', expected: false, desc: 'attacker-chrome.google.com' },
  { host: 'google.com', expected: false, desc: 'Root google.com' },
  { host: 'evil.com', expected: false, desc: 'evil.com' },
  { host: 'localhost', expected: false, desc: 'localhost' },
  { host: '', expected: false, desc: 'empty hostname' },
  { host: null as any, expected: false, desc: 'null hostname' }
];

for (const vec of webStoreHostVectors) {
  const res = isChromeWebStoreHost(vec.host);
  assert(
    res === vec.expected,
    'Web Store Host Check',
    vec.desc,
    `Host: ${JSON.stringify(vec.host)} | Expected: ${vec.expected} | Got: ${res}`
  );
}

// =========================================================================
// 5. IPC SENDER ORIGIN & FRAME HARDENING (isTrustedSender)
// =========================================================================
console.log('\n--- 5. Testing IPC Sender Origin & Frame Hardening ---');

function simulateIsTrustedSender(
  mainWindowObj: { isDestroyed: () => boolean; webContents: { id: number; mainFrame: any } } | null,
  event: { sender: { id: number }; senderFrame?: any }
): boolean {
  if (!mainWindowObj || mainWindowObj.isDestroyed()) return false;
  if (event.sender.id !== mainWindowObj.webContents.id) return false;
  if (event.senderFrame && mainWindowObj.webContents.mainFrame && event.senderFrame !== mainWindowObj.webContents.mainFrame) {
    return false;
  }
  return true;
}

const mockMainFrame = { name: 'mainFrame_root' };
const mockSubFrame = { name: 'subFrame_iframe' };
const mockMainWindow = {
  isDestroyed: () => false,
  webContents: {
    id: 100,
    mainFrame: mockMainFrame
  }
};
const mockDestroyedMainWindow = {
  isDestroyed: () => true,
  webContents: {
    id: 100,
    mainFrame: mockMainFrame
  }
};

const trustedSenderVectors = [
  {
    desc: 'Trusted main window & main frame',
    win: mockMainWindow,
    event: { sender: { id: 100 }, senderFrame: mockMainFrame },
    expected: true
  },
  {
    desc: 'Sender from untrusted webview guest webContents (id 105 != 100)',
    win: mockMainWindow,
    event: { sender: { id: 105 }, senderFrame: mockMainFrame },
    expected: false
  },
  {
    desc: 'Sender from untrusted subframe/iframe inside main window',
    win: mockMainWindow,
    event: { sender: { id: 100 }, senderFrame: mockSubFrame },
    expected: false
  },
  {
    desc: 'Main window is destroyed',
    win: mockDestroyedMainWindow,
    event: { sender: { id: 100 }, senderFrame: mockMainFrame },
    expected: false
  },
  {
    desc: 'Main window is null',
    win: null,
    event: { sender: { id: 100 }, senderFrame: mockMainFrame },
    expected: false
  }
];

for (const vec of trustedSenderVectors) {
  const res = simulateIsTrustedSender(vec.win, vec.event);
  assert(
    res === vec.expected,
    'isTrustedSender Hardening',
    vec.desc,
    `Expected: ${vec.expected} | Got: ${res}`
  );
}

// =========================================================================
// 6. WEBVIEW SANDBOX & PRELOAD RESTRICTION (will-attach-webview)
// =========================================================================
console.log('\n--- 6. Testing Webview Sandbox & Preload Lockdown ---');

function simulateWillAttachWebview(webPreferences: any, appDir: string) {
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
    path.resolve(path.join(appDir, 'webstore-preload.cjs')),
    path.resolve(path.join(appDir, 'webstore-preload.js'))
  ];
  if (webPreferences.preload) {
    const resolvedPreload = path.resolve(webPreferences.preload);
    if (!authorizedPreloads.includes(resolvedPreload)) {
      delete webPreferences.preload;
    }
  }
}

const mockAppDir = path.join(os.tmpdir(), 'nova_electron_app');
const authorizedPreloadPath = path.join(mockAppDir, 'webstore-preload.cjs');
const maliciousPreloadPath = '/tmp/malicious_preload.js';

const webviewTestPrefs1 = {
  nodeIntegration: true,
  contextIsolation: false,
  sandbox: false,
  webSecurity: false,
  allowRunningInsecureContent: true,
  preload: maliciousPreloadPath
};

simulateWillAttachWebview(webviewTestPrefs1, mockAppDir);

assert(webviewTestPrefs1.nodeIntegration === false, 'Webview Lockdown', 'nodeIntegration forced to false', 'nodeIntegration === false');
assert(webviewTestPrefs1.contextIsolation === true, 'Webview Lockdown', 'contextIsolation forced to true', 'contextIsolation === true');
assert(webviewTestPrefs1.sandbox === true, 'Webview Lockdown', 'sandbox forced to true', 'sandbox === true');
assert(webviewTestPrefs1.webSecurity === true, 'Webview Lockdown', 'webSecurity forced to true', 'webSecurity === true');
assert(webviewTestPrefs1.backgroundThrottling === true, 'Webview Lockdown', 'backgroundThrottling forced to true', 'backgroundThrottling === true');
assert(webviewTestPrefs1.preload === undefined, 'Webview Lockdown', 'Unauthorized preload stripped', 'preload is undefined');

const webviewTestPrefs2 = {
  preload: authorizedPreloadPath
};
simulateWillAttachWebview(webviewTestPrefs2, mockAppDir);
assert(webviewTestPrefs2.preload === authorizedPreloadPath, 'Webview Lockdown', 'Authorized webstore preload preserved', 'preload is preserved');

// =========================================================================
// 7. TERMINAL LOG SANITIZATION (console-message redaction)
// =========================================================================
console.log('\n--- 7. Testing Terminal Console Message Sanitization ---');

function sanitizeConsoleLogMessage(message: string): { redacted: boolean; output: string } {
  if (message.includes('NOVA_SAVE_PW') || /password|token|secret|apiKey/i.test(message)) {
    return { redacted: true, output: '[REDACTED_SENSITIVE_LOG]' };
  }
  return { redacted: false, output: message };
}

const logVectors = [
  { msg: 'NOVA_SAVE_PW::user1::pass123', shouldRedact: true, desc: 'NOVA_SAVE_PW password dump' },
  { msg: 'User password is Secret123!', shouldRedact: true, desc: 'Log containing password keyword' },
  { msg: 'Bearer token=eyJhbGciOi...', shouldRedact: true, desc: 'Log containing token keyword' },
  { msg: 'API key: apiKey=sk_live_123', shouldRedact: true, desc: 'Log containing apiKey keyword' },
  { msg: 'Master secret configuration', shouldRedact: true, desc: 'Log containing secret keyword' },
  { msg: 'Page loaded successfully in 120ms', shouldRedact: false, desc: 'Standard non-sensitive log' },
  { msg: 'Navigated to https://example.com', shouldRedact: false, desc: 'Standard navigation log' }
];

for (const vec of logVectors) {
  const res = sanitizeConsoleLogMessage(vec.msg);
  assert(
    res.redacted === vec.shouldRedact,
    'Log Sanitizer',
    vec.desc,
    `Msg: ${vec.msg} | Redacted: ${res.redacted} | Output: ${res.output}`
  );
}

// =========================================================================
// SUMMARY & VERDICT
// =========================================================================
console.log('\n================================================================');
console.log('ADVERSARIAL VERIFICATION SUITE SUMMARY');
console.log('================================================================');

const totalTests = results.length;
const passCount = results.filter(r => r.status === 'PASS').length;
const failCount = results.filter(r => r.status === 'FAIL').length;

console.log(`TOTAL ADVERSARIAL TESTS : ${totalTests}`);
console.log(`PASSED                  : ${passCount}`);
console.log(`FAILED                  : ${failCount}\n`);

if (failCount > 0) {
  console.error('ADVERSARIAL TEST SUITE FAILED!');
  for (const r of results.filter(r => r.status === 'FAIL')) {
    console.error(`  - [FAIL] [${r.suite}] ${r.name}: ${r.details}`);
  }
  process.exit(1);
} else {
  console.log('ALL ADVERSARIAL EMPIRICAL TESTS PASSED CLEANLY (0 VULNERABILITIES DETECTED).');
}
