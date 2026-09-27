import assert from 'node:assert/strict';
import { isSafeNavigationUrl } from '../src/utils/safeNavigation';
import { sanitizeImportedBookmarks } from '../src/hooks/useAppDataBackup';

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

// 3. REMOVED (was a tautology): "Hex Color Security Regex Verification" ran
// /^#[0-9a-fA-F]{3,8}$/.test(hex) over `validHexes`/`invalidHexes` with the very
// same regex literal pasted into the assertion, so it could not fail. The hex
// allowlist for `customAccentColor` / `customBrowserColor` is still unenforced in
// production terms and can only be covered once
// `useAppDataBackup.ts:129,131` are reached through an export.
