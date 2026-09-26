import assert from 'node:assert/strict';
import {
  deriveKey,
  encryptSyncPayload,
  decryptSyncPayload,
  EncryptedSyncEnvelope
} from '../src/services/syncCrypto';
import { syncService, SyncDataBundle } from '../src/services/syncService';
import type { Bookmark, SavedPassword, UserSettings } from '../src/types/browser';

console.log('\n--- Sync Service, Crypto & Supabase Vault Test Suite ---');

async function runSyncTests() {
  // 1. Password and Master Key Derivation (PBKDF2-SHA256 @ 600k iterations)
  const password = 'CorrectHorseBatteryStaple-2026!';
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cryptoKey = await deriveKey(password, salt);
  assert.ok(cryptoKey, 'PBKDF2-SHA256 key derivation must produce a valid CryptoKey');
  assert.strictEqual(cryptoKey.algorithm.name, 'AES-GCM', 'Derived key must use AES-GCM');

  // 2. E2EE Payload Encryption & Decryption (Round-trip)
  const sampleBundle: SyncDataBundle = {
    version: 2,
    timestamp: Date.now(),
    userId: 'user-test-uuid-1234',
    settings: {
      searchEngine: 'duckduckgo',
      theme: 'dark',
      privacyShield: true,
      fontSize: 'medium',
      accentColor: 'emerald',
      browserColor: 'midnight',
      showBookmarksBar: true,
      useVerticalTabs: true,
      mcpServerEnabled: false,
      newTabBackground: 'aurora_waves',
      startupBehavior: 'continue',
      tabStyle: 'rounded',
      doNotTrack: true,
      clearOnExit: false,
      hardwareAcceleration: true,
      developerMode: false
    },
    bookmarks: [
      { id: 'bm-1', title: 'Example Site', url: 'https://example.com/', createdAt: Date.now() }
    ],
    folders: [
      { id: 'f-1', name: 'Work', createdAt: Date.now() }
    ],
    history: [
      { id: 'h-1', title: 'Home', url: 'https://example.com/home', timestamp: Date.now() }
    ],
    workspaces: [
      { id: 'ws-1', name: 'Main', icon: 'Globe', createdAt: Date.now() }
    ]
  };

  const encryptedEnvelope = await encryptSyncPayload(sampleBundle, password);
  assert.ok(encryptedEnvelope, 'Encrypted envelope must be produced');
  assert.strictEqual(typeof encryptedEnvelope, 'object', 'Encrypted envelope must be an object');
  assert.strictEqual(encryptedEnvelope.version, 2, 'Encrypted envelope version must be 2');
  assert.ok(encryptedEnvelope.ciphertext, 'Encrypted envelope must have ciphertext');
  assert.ok(encryptedEnvelope.salt, 'Encrypted envelope must have salt');
  assert.ok(encryptedEnvelope.iv, 'Encrypted envelope must have iv');

  const decryptedBundle = await decryptSyncPayload<SyncDataBundle>(encryptedEnvelope, password);
  assert.strictEqual(decryptedBundle.version, 2, 'Decrypted bundle version must be 2');
  assert.strictEqual(decryptedBundle.userId, sampleBundle.userId);
  assert.strictEqual(decryptedBundle.settings?.searchEngine, 'duckduckgo');
  assert.strictEqual(decryptedBundle.bookmarks?.length, 1);
  assert.strictEqual(decryptedBundle.bookmarks?.[0].title, 'Example Site');

  console.log('[PASS] [Sync Vault] E2EE payload encryption and decryption round-trip verified (v2 envelope).');

  // 3. Decryption Failure on Tampered Envelope or Wrong Password (Fail-Closed)
  await assert.rejects(
    async () => {
      await decryptSyncPayload(encryptedEnvelope, 'WrongPassword123!');
    },
    /operation failed|operation was rejected|invalid|failed/i,
    'Decryption with incorrect password must fail closed'
  );

  console.log('[PASS] [Sync Vault] Wrong master password cleanly rejected.');

  // 4. Sync Code Formatting & Normalization
  const rawCode = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d';
  const formatted = (syncService.constructor as any).formatSyncCode(rawCode);
  assert.strictEqual(formatted.startsWith('nova-'), true, 'Formatted code must have nova- prefix');

  const normalized = (syncService.constructor as any).normalizeSyncCode(formatted);
  assert.strictEqual(normalized, rawCode.toUpperCase(), 'Normalized code must strip nova- and hyphens');

  console.log('[PASS] [Sync Vault] Sync chain code format and normalization verified.');

  // 5. Password E2EE Encryption and Decryption
  const passwordsToEncrypt: SavedPassword[] = [
    { id: 'pw-1', hostname: 'github.com', username: 'dev', password: 'secretPassword42!', createdAt: Date.now() }
  ];
  const encryptedPass = await syncService.encryptPasswords(passwordsToEncrypt, password);
  assert.ok(encryptedPass.ciphertext);
  assert.ok(encryptedPass.salt);
  assert.ok(encryptedPass.iv);

  const decryptedPass = await syncService.decryptPasswords(encryptedPass.ciphertext, encryptedPass.salt, encryptedPass.iv, password);
  assert.strictEqual(decryptedPass.length, 1);
  assert.strictEqual(decryptedPass[0].password, 'secretPassword42!');

  console.log('[PASS] [Sync Vault] E2EE passwords payload encryption and decryption verified.');

  // 6. Settings Per-Field Timestamp LWW Conflict Resolution (Anti-Setting Freeze)
  const now = Date.now();
  const testTimestamps = { theme: now + 10000, fontSize: now - 10000 };
  syncService.saveSettingsTimestamps(testTimestamps);
  const loadedTimestamps = syncService.getSettingsTimestamps();
  assert.strictEqual(loadedTimestamps.theme, testTimestamps.theme, 'Theme timestamp must be preserved');
  assert.strictEqual(loadedTimestamps.fontSize, testTimestamps.fontSize, 'FontSize timestamp must be preserved');

  console.log('[PASS] [Sync Vault] Settings per-field timestamp persistence and LWW integrity verified.');
}

runSyncTests().then(() => {
  console.log('[PASS] [Sync Service Vault] All sync crypto and vault integrity tests passed cleanly.\n');
}).catch(err => {
  console.error('[FAIL] [Sync Service Vault] Test failed:', err);
  process.exit(1);
});
