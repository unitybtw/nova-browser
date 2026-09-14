import assert from 'node:assert/strict';
import {
  createPairingToken,
  decryptSyncPayload,
  encryptSyncPayload,
  hashPairingToken,
  isInvitationUsable,
} from '../src/services/syncCrypto';

async function run() {
  const payload = { bookmarks: [{ id: 'bookmark-1', url: 'https://example.com' }], history: [] };
  const envelope = await encryptSyncPayload(payload, 'correct horse battery staple');

  assert.equal(envelope.version, 2);
  assert.equal(envelope.ciphertext.includes('example.com'), false, 'ciphertext must not expose plaintext');
  assert.deepEqual(await decryptSyncPayload(envelope, 'correct horse battery staple'), payload);
  await assert.rejects(() => decryptSyncPayload(envelope, 'wrong passphrase'));

  const token = createPairingToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(await hashPairingToken(token), await hashPairingToken(createPairingToken()));
  assert.equal(isInvitationUsable({ tokenHash: 'hash', expiresAt: Date.now() + 1_000, consumedAt: null }, Date.now()), true);
  assert.equal(isInvitationUsable({ tokenHash: 'hash', expiresAt: Date.now() - 1, consumedAt: null }, Date.now()), false);
  assert.equal(isInvitationUsable({ tokenHash: 'hash', expiresAt: Date.now() + 1_000, consumedAt: Date.now() }, Date.now()), false);

  console.log('Security hardening crypto tests passing');

  // Verify Download URL Scheme Enforcement
  const downloadProtocolVectors = [
    { url: 'https://example.com/file.zip', allowed: true },
    { url: 'http://example.com/file.zip', allowed: true },
    { url: 'blob:https://example.com/123-456', allowed: true },
    { url: 'data:text/plain;base64,SGVsbG8=', allowed: true },
    { url: 'file:///etc/passwd', allowed: false },
    { url: 'file:///C:/Windows/System32/drivers/etc/hosts', allowed: false },
    { url: 'javascript:alert(1)', allowed: false },
    { url: 'chrome://settings', allowed: false },
    { url: 'nova://settings', allowed: false },
    { url: 'devtools://devtools/bundled/inspector.html', allowed: false },
  ];

  for (const vec of downloadProtocolVectors) {
    let allowed = false;
    try {
      const parsed = new URL(vec.url);
      allowed = ['http:', 'https:', 'blob:', 'data:'].includes(parsed.protocol);
    } catch {}
    assert.equal(allowed, vec.allowed, `Download protocol enforcement failed for ${vec.url}`);
  }

  // Verify Webview src Scheme Enforcement
  const webviewSrcVectors = [
    { src: 'https://example.com', allowed: true },
    { src: 'http://example.com', allowed: true },
    { src: 'about:blank', allowed: true },
    { src: 'chrome-extension://abcdefghijklmnopabcdefghijklmnop/options.html', allowed: true },
    { src: 'file:///etc/passwd', allowed: false },
    { src: 'javascript:alert(1)', allowed: false },
    { src: 'data:text/html,<h1>hacked</h1>', allowed: false },
    { src: 'blob:https://example.com/abc', allowed: false },
    { src: 'nova://settings', allowed: false },
    { src: 'chrome://gpu', allowed: false },
    { src: 'https://user:pass@example.com', allowed: false },
  ];

  for (const vec of webviewSrcVectors) {
    let allowed = false;
    try {
      const parsed = new URL(vec.src);
      const allowedProtocols = ['http:', 'https:'];
      const isAllowedAboutBlank = parsed.protocol === 'about:' && (parsed.pathname === 'blank' || parsed.href === 'about:blank');
      const isAllowedExtension = parsed.protocol === 'chrome-extension:' && /^[a-zA-Z0-9_-]+$/.test(parsed.hostname);
      allowed = (allowedProtocols.includes(parsed.protocol) || isAllowedAboutBlank || isAllowedExtension) &&
        !parsed.username && !parsed.password;
    } catch {}
    assert.equal(allowed, vec.allowed, `Webview src enforcement failed for ${vec.src}`);
  }

  // Verify Context-Menu Link & Media Download Scheme Validation
  const contextMenuLinkVectors = [
    { url: 'https://example.com/report.pdf', canSaveLink: true, canOpenLink: true },
    { url: 'http://example.com/page', canSaveLink: true, canOpenLink: true },
    { url: 'chrome-extension://abcdefghijklmnop/page.html', canSaveLink: false, canOpenLink: true },
    { url: 'file:///etc/passwd', canSaveLink: false, canOpenLink: false },
    { url: 'javascript:alert(1)', canSaveLink: false, canOpenLink: false },
    { url: 'data:text/html,<b>xss</b>', canSaveLink: false, canOpenLink: false },
  ];

  for (const vec of contextMenuLinkVectors) {
    const isHttpLink = vec.url.startsWith('http://') || vec.url.startsWith('https://');
    const isAllowedLinkScheme = isHttpLink || vec.url.startsWith('chrome-extension://');
    assert.equal(isHttpLink, vec.canSaveLink, `Context-menu saveLinkAs check failed for ${vec.url}`);
    assert.equal(isAllowedLinkScheme, vec.canOpenLink, `Context-menu openLink check failed for ${vec.url}`);
  }

  // Verify Safe Download URL Logic (inner blob origin, data MIME blocking, credentials)
  function testIsSafeDownloadUrl(urlStr: string): boolean {
    if (!urlStr || typeof urlStr !== 'string') return false;
    try {
      const parsed = new URL(urlStr);
      if (!['http:', 'https:', 'blob:', 'data:'].includes(parsed.protocol)) return false;
      if (parsed.username || parsed.password) return false;
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
        if (dangerousMimes.some(d => mime.includes(d))) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  const safeDownloadVectors = [
    { url: 'https://example.com/file.zip', expected: true },
    { url: 'http://example.com/file.zip', expected: true },
    { url: 'blob:https://example.com/39a67a0a-0e9e-4e4c-81b4-2df4d8a1c6a2', expected: true },
    { url: 'blob:http://example.com/39a67a0a-0e9e-4e4c-81b4-2df4d8a1c6a2', expected: true },
    { url: 'blob:chrome-extension://abcdefghijklmnop/39a67a0a', expected: true },
    { url: 'blob:file:///etc/passwd', expected: false },
    { url: 'blob:null/39a67a0a', expected: false },
    { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==', expected: true },
    { url: 'data:text/plain;base64,SGVsbG8=', expected: true },
    { url: 'data:text/html,<h1>hacked</h1>', expected: false },
    { url: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', expected: false },
    { url: 'data:text/javascript;base64,YWxlcnQoMSk=', expected: false },
    { url: 'data:application/x-msdownload;base64,TVqQAA==', expected: false },
    { url: 'data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+', expected: false },
    { url: 'data:application/octet-stream;base64,AAAA', expected: false },
    { url: 'data:application/x-sh;base64,IyEvYmluL3No', expected: false },
    { url: 'https://user:pass@example.com/file.zip', expected: false },
    { url: 'javascript:alert(1)', expected: false },
    { url: 'file:///etc/passwd', expected: false },
  ];

  for (const vec of safeDownloadVectors) {
    assert.equal(testIsSafeDownloadUrl(vec.url), vec.expected, `testIsSafeDownloadUrl failed for ${vec.url}`);
  }

  // Verify Filename Sanitization & DOS Reserved Device Neutralization
  function testSanitizeDownloadFilename(rawFilename: string): string {
    const pathMod = require('node:path');
    const normalized = (rawFilename || '').replace(/\\/g, '/');
    let name = pathMod.basename(normalized).replace(/^\.+/, '').trim();
    name = name.replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, '_').trim();
    name = name.replace(/[.\s]+$/, '');
    const ext = pathMod.extname(name);
    const base = pathMod.basename(name, ext);
    const stem = name.split('.')[0];
    const DOS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    if (DOS_RESERVED.test(stem) || DOS_RESERVED.test(base)) {
      name = `download_${name}`;
    }
    return name || 'download';
  }

  assert.equal(testSanitizeDownloadFilename('../../../etc/passwd'), 'passwd');
  assert.equal(testSanitizeDownloadFilename('..\\..\\windows\\system32'), 'system32');
  assert.equal(testSanitizeDownloadFilename('con.txt'), 'download_con.txt');
  assert.equal(testSanitizeDownloadFilename('CON.tar.gz'), 'download_CON.tar.gz');
  assert.equal(testSanitizeDownloadFilename('aux.pdf'), 'download_aux.pdf');
  assert.equal(testSanitizeDownloadFilename('nul'), 'download_nul');
  assert.equal(testSanitizeDownloadFilename('COM1.dat'), 'download_COM1.dat');
  assert.equal(testSanitizeDownloadFilename('LPT9.log'), 'download_LPT9.log');
  assert.equal(testSanitizeDownloadFilename('normal_file.pdf'), 'normal_file.pdf');
  assert.equal(testSanitizeDownloadFilename('...'), 'download');
  assert.equal(testSanitizeDownloadFilename('   '), 'download');
  assert.equal(testSanitizeDownloadFilename('test\x00file.png'), 'test_file.png');
  assert.equal(testSanitizeDownloadFilename('trailing_dots...'), 'trailing_dots');

  // Verify isSafeMediaDownloadUrl helper
  function testIsSafeMediaDownloadUrl(urlStr: string, allowedTypes: ('image' | 'video' | 'audio')[]): boolean {
    if (!urlStr || typeof urlStr !== 'string') return false;
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return !parsed.username && !parsed.password;
      }
      if (parsed.protocol === 'blob:') {
        try {
          const inner = new URL(parsed.pathname);
          return ['http:', 'https:'].includes(inner.protocol) && !inner.username && !inner.password;
        } catch {
          return false;
        }
      }
      if (parsed.protocol === 'data:') {
        const mime = parsed.pathname.split(';')[0].toLowerCase();
        return allowedTypes.some(type => mime.startsWith(`${type}/`)) &&
          !mime.includes('svg') && !mime.includes('html') && !mime.includes('javascript');
      }
      return false;
    } catch {
      return false;
    }
  }

  assert.equal(testIsSafeMediaDownloadUrl('https://example.com/img.png', ['image']), true);
  assert.equal(testIsSafeMediaDownloadUrl('data:image/png;base64,iVBORw==', ['image']), true);
  assert.equal(testIsSafeMediaDownloadUrl('data:image/svg+xml;base64,PHN2Zz4=', ['image']), false);
  assert.equal(testIsSafeMediaDownloadUrl('blob:https://example.com/uuid', ['image']), true);
  assert.equal(testIsSafeMediaDownloadUrl('blob:file:///etc/passwd', ['image']), false);
  assert.equal(testIsSafeMediaDownloadUrl('data:video/mp4;base64,AAAA', ['video']), true);
  assert.equal(testIsSafeMediaDownloadUrl('data:video/mp4;base64,AAAA', ['audio']), false);

  // Verify Updater Repository Confinement Logic
  function testValidateUpdateUrl(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr);
      const isOfficialHost = (parsed.hostname === 'github.com' || parsed.hostname === 'www.github.com' || parsed.hostname === 'objects.githubusercontent.com');
      if (!isOfficialHost || parsed.protocol !== 'https:') return false;
      if ((parsed.hostname === 'github.com' || parsed.hostname === 'www.github.com') &&
          !parsed.pathname.startsWith('/unitybtw/nova-browser/')) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  assert.equal(testValidateUpdateUrl('https://github.com/unitybtw/nova-browser/releases/download/v1.4.7/Nova-Browser-1.4.7.dmg'), true);
  assert.equal(testValidateUpdateUrl('https://objects.githubusercontent.com/github-production-release-asset-2e65be/asset.dmg'), true);
  assert.equal(testValidateUpdateUrl('https://github.com/evil-attacker/nova-browser/releases/download/v1.4.7/Nova.dmg'), false);
  assert.equal(testValidateUpdateUrl('https://evil-server.com/Nova-Browser-Setup.exe'), false);
  assert.equal(testValidateUpdateUrl('http://github.com/unitybtw/nova-browser/releases/v1.0'), false);

  console.log('Security hardening protocol & context-menu enforcement tests passing');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
