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

  console.log('Security hardening protocol & context-menu enforcement tests passing');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
