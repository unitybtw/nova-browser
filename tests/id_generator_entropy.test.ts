import assert from 'node:assert/strict';
import { generateId } from '../src/utils/idGenerator';

console.log('\n--- ID Generator Entropy & Collision Resistance Test Suite ---');

// 1. Prefix and Format Testing
const bareId = generateId();
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
assert(uuidRegex.test(bareId), `Bare ID must match standard UUID format: ${bareId}`);

const tabId = generateId('tab');
assert(tabId.startsWith('tab_'), `Prefixed ID must start with prefix: ${tabId}`);
assert(uuidRegex.test(tabId.replace(/^tab_/, '')), `Prefixed ID body must match UUID format: ${tabId}`);

const folderId = generateId('folder');
assert(folderId.startsWith('folder_'), `Folder ID must start with prefix: ${folderId}`);

console.log('[PASS] [ID Generator] Format and prefix semantics verified for bare and prefixed identifiers');

// 2. High-Entropy Collision Test (10,000 unique IDs)
const ITERATIONS = 10000;
const generatedSet = new Set<string>();

for (let i = 0; i < ITERATIONS; i++) {
  const id = generateId();
  assert(!generatedSet.has(id), `Collision detected at iteration ${i}: ${id}`);
  generatedSet.add(id);
}

assert.strictEqual(generatedSet.size, ITERATIONS, `Expected ${ITERATIONS} unique IDs, got ${generatedSet.size}`);
console.log(`[PASS] [ID Generator] 0 collisions across ${ITERATIONS.toLocaleString()} generated identifiers`);
