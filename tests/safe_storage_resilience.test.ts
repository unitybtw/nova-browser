import assert from 'node:assert/strict';
import {
  safeParseWithBackup,
  safeParseObjectWithBackup,
  safeParseArrayWithBackup,
  backupCorruptData
} from '../src/utils/safeStorage';

console.log('\n--- Safe Storage Resilience & Data Preservation Test Suite ---');

// Mock in-memory localStorage for Node testing environment
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => { storageMap.set(k, String(v)); },
  removeItem: (k: string) => { storageMap.delete(k); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] || null
};

(globalThis as any).localStorage = mockLocalStorage;

// 1. Parsing Valid Payloads
const validObj = safeParseObjectWithBackup('test_key', '{"theme":"dark","version":1}', { theme: 'light' });
assert.deepStrictEqual(validObj, { theme: 'dark', version: 1 }, 'Valid JSON object must be parsed');

const validArr = safeParseArrayWithBackup('test_arr', '[1, 2, 3]', []);
assert.deepStrictEqual(validArr, [1, 2, 3], 'Valid JSON array must be parsed');

console.log('[PASS] [Safe Storage] Valid JSON objects and arrays parse without error');

// 2. Corrupted JSON Recovery & Backup Creation
storageMap.clear();
const corruptRaw = '{ "theme": "dark", unclosed_syntax';
const fallbackObj = { theme: 'fallback' };

const recovered = safeParseObjectWithBackup('test_settings', corruptRaw, fallbackObj);
assert.deepStrictEqual(recovered, fallbackObj, 'Corrupted JSON must return fallback without crashing');

// Check that a corrupt backup was created
const backupKeys = Array.from(storageMap.keys()).filter(k => k.startsWith('test_settings_corrupt_backup_'));
assert.strictEqual(backupKeys.length, 1, 'Exactly one corrupt backup key must be created');
assert.strictEqual(storageMap.get(backupKeys[0]), corruptRaw, 'Corrupt backup must preserve original raw payload');

console.log('[PASS] [Safe Storage] Corrupt JSON syntax triggers non-destructive backup and fallback');

// 3. Type-Mismatch Defense (Object vs Array)
storageMap.clear();
// Expected object, but got array
const arrInsteadOfObj = '[1, 2, 3]';
const resObj = safeParseObjectWithBackup('settings_key', arrInsteadOfObj, { default: true });
assert.deepStrictEqual(resObj, { default: true }, 'Array received when Object expected must return fallback');

// Expected array, but got object
const objInsteadOfArr = '{"id":"one"}';
const resArr = safeParseArrayWithBackup('tabs_key', objInsteadOfArr, ['fallback']);
assert.deepStrictEqual(resArr, ['fallback'], 'Object received when Array expected must return fallback');

console.log('[PASS] [Safe Storage] Structure type mismatches rejected and fallbacks preserved');

// 4. Backup Rotation & Quota Protection (MAX_BACKUPS_PER_KEY = 3)
storageMap.clear();
for (let i = 0; i < 5; i++) {
  backupCorruptData('quota_test', `corrupt_${i}`);
}

const quotaBackups = Array.from(storageMap.keys()).filter(k => k.startsWith('quota_test_corrupt_backup_'));
assert(quotaBackups.length <= 3, `Backups must be capped at 3 to prevent quota exhaustion, got ${quotaBackups.length}`);

console.log('[PASS] [Safe Storage] Corrupt backup rotation enforces maximum 3 entries per key');
