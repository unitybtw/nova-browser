import assert from 'node:assert/strict';
import { generateId } from '../../src/utils/idGenerator';
import { safeParseArrayWithBackup, safeParseObjectWithBackup } from '../../src/utils/safeStorage';
import { isSafeNavigationUrl } from '../../src/utils/safeNavigation';

async function runTier1Tests() {
  // Test 1: ID generation collision resistance
  const generatedIds = new Set<string>();
  const ITERATIONS = 10000;
  for (let i = 0; i < ITERATIONS; i++) {
    const id = generateId('tab');
    assert.equal(typeof id, 'string');
    assert.equal(generatedIds.has(id), false, `Collision detected at iteration ${i} for ID ${id}`);
    generatedIds.add(id);
  }
  assert.equal(generatedIds.size, ITERATIONS);

  // Test 2: safeParse data preservation & recovery backup
  const memStorage = new Map<string, string>();
  const originalGetItem = globalThis.localStorage?.getItem;
  const originalSetItem = globalThis.localStorage?.setItem;

  // Polyfill localStorage in test node environment
  (globalThis as any).localStorage = {
    getItem: (k: string) => memStorage.get(k) || null,
    setItem: (k: string, v: string) => memStorage.set(k, String(v)),
    removeItem: (k: string) => memStorage.delete(k),
    clear: () => memStorage.clear()
  };

  // Valid parse
  const validArray = safeParseArrayWithBackup('test_key', JSON.stringify([{ id: 1 }, { id: 2 }]), []);
  assert.equal(validArray.length, 2);

  // Corrupt data preservation
  const corruptRaw = '{"broken": [unfinished json';
  const recovered = safeParseArrayWithBackup('corrupt_test_key', corruptRaw, [{ fallback: true }]);
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].fallback, true);

  // Verify backup key was created
  let backupKeyFound = false;
  for (const k of memStorage.keys()) {
    if (k.startsWith('corrupt_test_key_corrupt_backup_')) {
      backupKeyFound = true;
      assert.equal(memStorage.get(k), corruptRaw);
    }
  }
  assert.equal(backupKeyFound, true, 'Corrupt data must be saved to timestamped backup key');

  // Test 3: Safe Navigation URL validation
  assert.equal(isSafeNavigationUrl('https://example.com'), true);
  assert.equal(isSafeNavigationUrl('http://example.com'), true);
  assert.equal(isSafeNavigationUrl('nova://settings'), true);
  assert.equal(isSafeNavigationUrl('javascript:alert(1)'), false);
  assert.equal(isSafeNavigationUrl('data:text/html,<script>'), false);
  assert.equal(isSafeNavigationUrl('file:///etc/passwd'), false);
  assert.equal(isSafeNavigationUrl('chrome://settings'), false);
  assert.equal(isSafeNavigationUrl('edge://flags'), false);

  console.log('Tier 1 feature coverage tests passed successfully');
}

runTier1Tests().catch(err => {
  console.error('Tier 1 test failure:', err);
  process.exit(1);
});
