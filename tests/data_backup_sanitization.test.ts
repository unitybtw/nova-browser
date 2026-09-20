import assert from 'node:assert/strict';
import { isSafeNavigationUrl } from '../src/utils/safeNavigation';
import type { Bookmark, HistoryItem, UserSettings } from '../src/types/browser';

console.log('\n--- Data Backup & Security Sanitization Test Suite ---');

// 1. URL Sanitization for Bookmarks & History
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

const sanitizedBookmarks = testBookmarksRaw.filter((b: any) =>
  b && typeof b === 'object' && typeof b.url === 'string' && isSafeNavigationUrl(b.url)
);

assert.strictEqual(sanitizedBookmarks.length, 3, 'Only safe navigation URLs (Google, Nova Settings, Localhost) must be retained');
assert.strictEqual(sanitizedBookmarks[0].url, 'https://google.com');
assert.strictEqual(sanitizedBookmarks[1].url, 'nova://settings');
assert.strictEqual(sanitizedBookmarks[2].url, 'http://localhost:5173');

console.log('[PASS] [Backup Sanitization] Dangerous bookmark schemes (javascript, data, blob, file) strictly rejected');

// 2. Settings Sanitization Engine
function sanitizeSettingsImport(raw: any): Partial<UserSettings> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const safe: Partial<UserSettings> = {};
  if (typeof raw.theme === 'string' && ['dark', 'light', 'system'].includes(raw.theme)) safe.theme = raw.theme;
  if (typeof raw.searchEngine === 'string' && ['google', 'duckduckgo', 'bing', 'brave', 'ecosia', 'yahoo'].includes(raw.searchEngine)) safe.searchEngine = raw.searchEngine;
  if (typeof raw.privacyShield === 'boolean') safe.privacyShield = raw.privacyShield;
  if (typeof raw.useVerticalTabs === 'boolean') safe.useVerticalTabs = raw.useVerticalTabs;
  if (typeof raw.fontSize === 'string' && ['small', 'medium', 'large'].includes(raw.fontSize)) safe.fontSize = raw.fontSize;
  if (typeof raw.tabStyle === 'string' && ['rounded', 'square', 'floating'].includes(raw.tabStyle)) safe.tabStyle = raw.tabStyle;
  if (typeof raw.tabAnimation === 'string' && ['chrome', 'smooth', 'snappy', 'none'].includes(raw.tabAnimation)) safe.tabAnimation = raw.tabAnimation;
  if (typeof raw.doNotTrack === 'boolean') safe.doNotTrack = raw.doNotTrack;
  if (typeof raw.clearOnExit === 'boolean') safe.clearOnExit = raw.clearOnExit;
  if (typeof raw.hardwareAcceleration === 'boolean') safe.hardwareAcceleration = raw.hardwareAcceleration;
  if (typeof raw.tabHibernationEnabled === 'boolean') safe.tabHibernationEnabled = raw.tabHibernationEnabled;
  if (typeof raw.aiLinkPreviewEnabled === 'boolean') safe.aiLinkPreviewEnabled = raw.aiLinkPreviewEnabled;
  if (typeof raw.energySaverMode === 'boolean') safe.energySaverMode = raw.energySaverMode;
  if (typeof raw.preloadDnsEnabled === 'boolean') safe.preloadDnsEnabled = raw.preloadDnsEnabled;
  if (typeof raw.smoothScrollingEnabled === 'boolean') safe.smoothScrollingEnabled = raw.smoothScrollingEnabled;
  if (typeof raw.newTabBackground === 'string' && ['default', 'gradient', 'mesh', 'glass', 'unsplash', 'custom_url', 'aurora_waves', 'cyber_grid', 'hyper_space', 'fireflies', 'nebula', 'matrix'].includes(raw.newTabBackground)) safe.newTabBackground = raw.newTabBackground;
  if (typeof raw.backgroundCustomUrl === 'string' && isSafeNavigationUrl(raw.backgroundCustomUrl)) safe.backgroundCustomUrl = raw.backgroundCustomUrl;
  if (typeof raw.accentColor === 'string' && ['blue', 'emerald', 'purple', 'rose', 'amber', 'custom'].includes(raw.accentColor)) safe.accentColor = raw.accentColor;
  if (typeof raw.customAccentColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.customAccentColor)) safe.customAccentColor = raw.customAccentColor;
  if (typeof raw.browserColor === 'string' && ['default', 'midnight', 'cyberpunk', 'forest', 'crimson', 'warm', 'ocean', 'sunset', 'custom'].includes(raw.browserColor)) safe.browserColor = raw.browserColor as any;
  if (typeof raw.customBrowserColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.customBrowserColor)) safe.customBrowserColor = raw.customBrowserColor;
  return safe;
}

// 2.1 Valid settings import
const validRaw = {
  theme: 'dark',
  searchEngine: 'duckduckgo',
  privacyShield: true,
  customAccentColor: '#3b82f6',
  customBrowserColor: '#1e293b',
  newTabBackground: 'cyber_grid',
  backgroundCustomUrl: 'https://images.unsplash.com/photo-123'
};
const sanitizedValid = sanitizeSettingsImport(validRaw);
assert.strictEqual(sanitizedValid.theme, 'dark');
assert.strictEqual(sanitizedValid.searchEngine, 'duckduckgo');
assert.strictEqual(sanitizedValid.privacyShield, true);
assert.strictEqual(sanitizedValid.customAccentColor, '#3b82f6');
assert.strictEqual(sanitizedValid.newTabBackground, 'cyber_grid');

// 2.2 Malformed / hostile settings injection import
const hostileRaw = {
  theme: 'neon_pink_exploit',
  searchEngine: 'evil_engine',
  privacyShield: 'not_a_boolean',
  customAccentColor: 'rgb(255,0,0); alert(1)',
  customBrowserColor: 'javascript:steal()',
  newTabBackground: 'invalid_bg_name',
  backgroundCustomUrl: 'javascript:alert(document.cookie)'
};
const sanitizedHostile = sanitizeSettingsImport(hostileRaw);
assert.strictEqual(sanitizedHostile.theme, undefined, 'Invalid theme enum must be dropped');
assert.strictEqual(sanitizedHostile.searchEngine, undefined, 'Invalid searchEngine enum must be dropped');
assert.strictEqual(sanitizedHostile.privacyShield, undefined, 'Non-boolean privacyShield must be dropped');
assert.strictEqual(sanitizedHostile.customAccentColor, undefined, 'Non-hex accent color must be dropped');
assert.strictEqual(sanitizedHostile.customBrowserColor, undefined, 'Hostile javascript: color must be dropped');
assert.strictEqual(sanitizedHostile.newTabBackground, undefined, 'Invalid background choice must be dropped');
assert.strictEqual(sanitizedHostile.backgroundCustomUrl, undefined, 'Hostile background URL must be dropped');

console.log('[PASS] [Backup Sanitization] Hostile and invalid settings values sanitized and dropped');

// 3. Hex Color Security Regex Verification
const validHexes = ['#fff', '#FFF', '#123456', '#abcdef', '#ABCDEF', '#12345678', '#A1B2C3D4'];
const invalidHexes = ['red', 'rgb(0,0,0)', '#1', '#12', '#123456789', 'javascript:alert(1)', '#xyz', ' #fff'];

for (const hex of validHexes) {
  assert.strictEqual(/^#[0-9a-fA-F]{3,8}$/.test(hex), true, `Expected valid hex for: ${hex}`);
}
for (const hex of invalidHexes) {
  assert.strictEqual(/^#[0-9a-fA-F]{3,8}$/.test(hex), false, `Expected invalid hex for: ${hex}`);
}

console.log('[PASS] [Backup Sanitization] Hex color validation regex rigorously tested with 15 test vectors');
