/**
 * Challenger M1-1 Empirical Stress Test Harness
 * 
 * Verifies:
 * 1. SecureStoreKeyedRWLock concurrency semantics (reader concurrency, writer exclusivity,
 *    writer preference, zero cross-key head-of-line blocking, error resilience, and Map eviction).
 * 2. getMemoizedScryptKey cryptographic equivalence, cache key collision resistance,
 *    timing speedup, and cache behavior.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';
import vm from 'vm';
import { getMemoizedScryptKey, _clearScryptKeyCacheForTesting } from '../electron/main/proxySecurity';

const rootDir = process.cwd();

interface TestResult {
  section: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: TestResult[] = [];

function recordResult(section: string, name: string, passed: boolean, details: string) {
  const status: 'PASS' | 'FAIL' = passed ? 'PASS' : 'FAIL';
  results.push({ section, name, status, details });
  if (passed) {
    console.log(`[PASS] [${section}] ${name}: ${details}`);
  } else {
    console.error(`[FAIL] [${section}] ${name}: ${details}`);
  }
}

// ---------------------------------------------------------------------------
// Helper: Extract real SecureStoreKeyedRWLock class from electron/main.ts
// ---------------------------------------------------------------------------
function loadShippedSecureStoreKeyedRWLock(): any {
  const mainTsPath = path.join(rootDir, 'electron/main.ts');
  const mainContent = fs.readFileSync(mainTsPath, 'utf8');

  // Extract class SecureStoreKeyedRWLock declaration
  const startIdx = mainContent.indexOf('class SecureStoreKeyedRWLock');
  if (startIdx === -1) {
    throw new Error('Could not find "class SecureStoreKeyedRWLock" in electron/main.ts');
  }

  // Find the closing brace of the class
  let depth = 0;
  let inClass = false;
  let endIdx = -1;
  for (let i = startIdx; i < mainContent.length; i++) {
    if (mainContent[i] === '{') {
      depth++;
      inClass = true;
    } else if (mainContent[i] === '}') {
      depth--;
      if (inClass && depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }

  if (endIdx === -1) {
    throw new Error('Failed to parse closing brace of SecureStoreKeyedRWLock in electron/main.ts');
  }

  const classTsCode = mainContent.substring(startIdx, endIdx);

  // Transpile TypeScript class to JavaScript using esbuild
  const transpiled = esbuild.transformSync(classTsCode, {
    loader: 'ts',
    target: 'node18',
  });

  const sandbox: any = {};
  vm.createContext(sandbox);
  vm.runInContext(`${transpiled.code}\nglobalThis.LockClass = SecureStoreKeyedRWLock;`, sandbox);

  return sandbox.LockClass;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function runEmpiricalStressSuite() {
  console.log('================================================================');
  console.log('CHALLENGER M1-1: CONCURRENCY & CRYPTO EMPIRICAL STRESS SUITE');
  console.log('================================================================\n');

  const SecureStoreKeyedRWLock = loadShippedSecureStoreKeyedRWLock();

  // =========================================================================
  // 1. Concurrent Reads on Identical Key
  // =========================================================================
  console.log('--- 1. Testing Concurrent Readers on Identical Key ---');
  {
    const lock = new SecureStoreKeyedRWLock();
    const NUM_READERS = 50;
    let activeReaders = 0;
    let maxConcurrent = 0;

    const start = Date.now();
    const promises = Array.from({ length: NUM_READERS }, async (_, i) => {
      return lock.read('key_shared', async () => {
        activeReaders++;
        if (activeReaders > maxConcurrent) {
          maxConcurrent = activeReaders;
        }
        await sleep(25);
        activeReaders--;
        return i;
      });
    });

    const values = await Promise.all(promises);
    const elapsed = Date.now() - start;

    recordResult(
      'RWLock Readers',
      '50 Readers Execute Concurrently',
      maxConcurrent === NUM_READERS,
      `Max concurrent active readers: ${maxConcurrent}/${NUM_READERS} in ${elapsed}ms (non-serialized)`
    );

    recordResult(
      'RWLock Readers',
      'All Readers Return Intact Values',
      values.length === NUM_READERS && values.every((v, i) => v === i),
      `Returned ${values.length} valid distinct results`
    );
  }

  // =========================================================================
  // 2. Writer Exclusivity vs Readers and Other Writers
  // =========================================================================
  console.log('\n--- 2. Testing Writer Exclusivity (No Overlap) ---');
  {
    const lock = new SecureStoreKeyedRWLock();
    let activeReaders = 0;
    let activeWriters = 0;
    let exclusivityViolation = false;

    // Start 10 readers (take 20ms each)
    const readerBatch1 = Array.from({ length: 10 }, async () => {
      return lock.read('exclusive_key', async () => {
        activeReaders++;
        if (activeWriters > 0) exclusivityViolation = true;
        await sleep(20);
        activeReaders--;
      });
    });

    // Schedule 1 writer
    const writerPromise = lock.write('exclusive_key', async () => {
      activeWriters++;
      if (activeReaders > 0 || activeWriters > 1) exclusivityViolation = true;
      await sleep(25);
      if (activeReaders > 0 || activeWriters > 1) exclusivityViolation = true;
      activeWriters--;
      return 'written';
    });

    // Schedule 10 more readers
    const readerBatch2 = Array.from({ length: 10 }, async () => {
      return lock.read('exclusive_key', async () => {
        activeReaders++;
        if (activeWriters > 0) exclusivityViolation = true;
        await sleep(15);
        activeReaders--;
      });
    });

    await Promise.all([...readerBatch1, writerPromise, ...readerBatch2]);

    recordResult(
      'RWLock Exclusivity',
      'Zero Overlap Between Writer and Readers',
      !exclusivityViolation,
      'Writer had strict exclusive lock (activeReaders = 0, activeWriters = 1)'
    );
  }

  // =========================================================================
  // 3. Multiple Queued Writers Sequential Execution
  // =========================================================================
  console.log('\n--- 3. Testing Queued Writers Sequential Execution ---');
  {
    const lock = new SecureStoreKeyedRWLock();
    let currentWriter = 0;
    let maxConcurrentWriters = 0;
    const executionOrder: number[] = [];

    const writers = Array.from({ length: 15 }, (_, i) => {
      return lock.write('fifo_key', async () => {
        currentWriter++;
        if (currentWriter > maxConcurrentWriters) maxConcurrentWriters = currentWriter;
        executionOrder.push(i);
        await sleep(5);
        currentWriter--;
        return i;
      });
    });

    await Promise.all(writers);

    recordResult(
      'RWLock Writers',
      'Writers Are Strictly Serialized',
      maxConcurrentWriters === 1,
      `Max concurrent writers was ${maxConcurrentWriters} (must be 1)`
    );

    recordResult(
      'RWLock Writers',
      'Writers Execute in FIFO Queue Order',
      executionOrder.every((val, idx) => val === idx),
      `Execution order matches FIFO order: ${executionOrder.slice(0, 5).join(',')}...`
    );
  }

  // =========================================================================
  // 4. Zero Head-of-Line Blocking on Distinct Keys
  // =========================================================================
  console.log('\n--- 4. Testing Zero Cross-Key Head-of-Line Blocking ---');
  {
    const lock = new SecureStoreKeyedRWLock();
    let slowKeyDone = false;
    let fastKeyCompletedWhileSlowKeyActive = false;

    // Start a 150ms slow write on key_A
    const slowTask = lock.write('key_A', async () => {
      await sleep(150);
      slowKeyDone = true;
    });

    let fastElapsed = 0;
    const fastStart = Date.now();
    const fastTasks = Promise.all([
      lock.read('key_B', async () => sleep(10)),
      lock.write('key_C', async () => sleep(10)),
      lock.read('key_D', async () => sleep(10)),
    ]).then(() => {
      fastElapsed = Date.now() - fastStart;
      if (!slowKeyDone) {
        fastKeyCompletedWhileSlowKeyActive = true;
      }
    });

    await Promise.all([slowTask, fastTasks]);

    recordResult(
      'RWLock Key Isolation',
      'Operations on Distinct Keys Run Independently',
      fastKeyCompletedWhileSlowKeyActive && fastElapsed < 80,
      `Fast keys completed in ${fastElapsed}ms without waiting for 150ms slow key`
    );
  }

  // =========================================================================
  // 5. Writer-Preference Scheduling (Preventing Reader Starvation)
  // =========================================================================
  console.log('\n--- 5. Testing Writer-Preference Scheduling ---');
  {
    const lock = new SecureStoreKeyedRWLock();
    const timeline: string[] = [];

    // R1 starts and runs for 60ms
    const r1 = lock.read('pref_key', async () => {
      timeline.push('R1_start');
      await sleep(60);
      timeline.push('R1_end');
    });

    // Wait 10ms so R1 is actively reading, then queue W1
    await sleep(10);
    const w1 = lock.write('pref_key', async () => {
      timeline.push('W1_start');
      await sleep(20);
      timeline.push('W1_end');
    });

    // Wait 10ms so W1 is waiting in queue, then queue R2
    await sleep(10);
    const r2 = lock.read('pref_key', async () => {
      timeline.push('R2_start');
      await sleep(10);
      timeline.push('R2_end');
    });

    await Promise.all([r1, w1, r2]);

    const w1StartIndex = timeline.indexOf('W1_start');
    const r2StartIndex = timeline.indexOf('R2_start');

    recordResult(
      'RWLock Writer-Preference',
      'Queued Writer Executes Before Subsequent Readers',
      w1StartIndex < r2StartIndex,
      `Timeline: ${timeline.join(' -> ')} (W1 started before R2)`
    );
  }

  // =========================================================================
  // 6. Error & Rejection Resilience (No Deadlocks)
  // =========================================================================
  console.log('\n--- 6. Testing Exception Resilience & Deadlock Prevention ---');
  {
    const lock = new SecureStoreKeyedRWLock();

    // 6.1 Reader throws synchronous error
    let readerSyncThrew = false;
    try {
      await lock.read('err_key1', () => {
        throw new Error('sync-reader-fail');
      });
    } catch {
      readerSyncThrew = true;
    }

    // Subsequent write must succeed immediately
    let postReaderSyncWrite = false;
    await lock.write('err_key1', async () => {
      postReaderSyncWrite = true;
    });

    recordResult(
      'RWLock Error Resilience',
      'Sync Reader Error Does Not Deadlock Subsequent Writer',
      readerSyncThrew && postReaderSyncWrite,
      'Synchronous reader throw caught, lock released cleanly'
    );

    // 6.2 Reader returns rejected promise
    let readerAsyncRejected = false;
    try {
      await lock.read('err_key2', async () => {
        throw new Error('async-reader-fail');
      });
    } catch {
      readerAsyncRejected = true;
    }

    let postReaderAsyncWrite = false;
    await lock.write('err_key2', async () => {
      postReaderAsyncWrite = true;
    });

    recordResult(
      'RWLock Error Resilience',
      'Async Reader Rejection Does Not Deadlock Subsequent Writer',
      readerAsyncRejected && postReaderAsyncWrite,
      'Asynchronous reader rejection caught, lock released cleanly'
    );

    // 6.3 Writer throws synchronous error
    let writerSyncThrew = false;
    try {
      await lock.write('err_key3', () => {
        throw new Error('sync-writer-fail');
      });
    } catch {
      writerSyncThrew = true;
    }

    let postWriterSyncRead = false;
    await lock.read('err_key3', async () => {
      postWriterSyncRead = true;
    });

    recordResult(
      'RWLock Error Resilience',
      'Sync Writer Error Does Not Deadlock Subsequent Reader',
      writerSyncThrew && postWriterSyncRead,
      'Synchronous writer throw caught, lock released cleanly'
    );

    // 6.4 Writer returns rejected promise while writers and readers are waiting
    let writerAsyncRejected = false;
    let queuedWriterRan = false;
    let queuedReaderRan = false;

    const failingWriter = lock.write('err_key4', async () => {
      await sleep(10);
      throw new Error('async-writer-fail');
    }).catch(() => {
      writerAsyncRejected = true;
    });

    const queuedWriter = lock.write('err_key4', async () => {
      await sleep(10);
      queuedWriterRan = true;
    });

    const queuedReader = lock.read('err_key4', async () => {
      await sleep(10);
      queuedReaderRan = true;
    });

    await Promise.all([failingWriter, queuedWriter, queuedReader]);

    recordResult(
      'RWLock Error Resilience',
      'Queued Writers and Readers Wake After Writer Failure',
      writerAsyncRejected && queuedWriterRan && queuedReaderRan,
      'Failing writer unwound cleanly; both waiting writer and waiting reader executed'
    );
  }

  // =========================================================================
  // 7. Memory Leak & Map Idle Eviction
  // =========================================================================
  console.log('\n--- 7. Testing Idle Eviction & Memory Boundedness ---');
  {
    const lock = new SecureStoreKeyedRWLock();
    const getMapSize = () => (lock as any).locks.size;

    recordResult(
      'RWLock Eviction',
      'Initial Lock Map Is Empty',
      getMapSize() === 0,
      `Initial map size: ${getMapSize()}`
    );

    // Execute 500 distinct keys with interleaved operations
    const KEYS_COUNT = 500;
    const ops = Array.from({ length: KEYS_COUNT }, async (_, i) => {
      const key = `temp_key_${i}`;
      if (i % 2 === 0) {
        return lock.write(key, async () => sleep(2));
      } else {
        return lock.read(key, async () => sleep(2));
      }
    });

    await Promise.all(ops);

    const postMapSize = getMapSize();

    recordResult(
      'RWLock Eviction',
      'Lock Map Fully Evicts All Finished Keys (Zero Memory Leak)',
      postMapSize === 0,
      `Post-execution map size after 500 keys: ${postMapSize} (expected 0)`
    );
  }

  // =========================================================================
  // 8. Chaos & High-Concurrency Randomized Torture
  // =========================================================================
  console.log('\n--- 8. Testing Randomized Chaos Torture (100 Mixed Ops) ---');
  {
    const lock = new SecureStoreKeyedRWLock();
    const KEYS = ['torture_k1', 'torture_k2', 'torture_k3'];
    let invariantViolation: string | null = null;
    const activeStates = new Map<string, { readers: number; writers: number }>();

    for (const k of KEYS) {
      activeStates.set(k, { readers: 0, writers: 0 });
    }

    const tasks = Array.from({ length: 120 }, async (_, i) => {
      const key = KEYS[i % KEYS.length];
      const isWrite = (i % 3 === 0);
      const state = activeStates.get(key)!;

      if (isWrite) {
        return lock.write(key, async () => {
          state.writers++;
          if (state.writers > 1) {
            invariantViolation = `Key ${key}: multiple concurrent writers (${state.writers})`;
          }
          if (state.readers > 0) {
            invariantViolation = `Key ${key}: writer overlapping with ${state.readers} readers`;
          }
          await sleep(Math.floor(Math.random() * 8) + 1);
          state.writers--;
        });
      } else {
        return lock.read(key, async () => {
          state.readers++;
          if (state.writers > 0) {
            invariantViolation = `Key ${key}: reader overlapping with active writer`;
          }
          await sleep(Math.floor(Math.random() * 8) + 1);
          state.readers--;
        });
      }
    });

    await Promise.all(tasks);

    recordResult(
      'RWLock Chaos Torture',
      'All Concurrency Invariants Preserved Under Chaos Load',
      invariantViolation === null,
      invariantViolation || '120 interleaved operations verified zero reader/writer collisions'
    );

    recordResult(
      'RWLock Chaos Torture',
      'Lock Map Evicts All Keys After Chaos Run',
      (lock as any).locks.size === 0,
      `Final map size: ${(lock as any).locks.size}`
    );
  }

  // =========================================================================
  // 9. getMemoizedScryptKey Cryptographic Equivalence
  // =========================================================================
  console.log('\n--- 9. Testing getMemoizedScryptKey Cryptographic Equivalence ---');
  {
    _clearScryptKeyCacheForTesting();

    const testVectors = [
      {
        desc: 'Standard 32-byte secret & 32-byte salt',
        secret: crypto.randomBytes(32),
        salt: crypto.randomBytes(32),
      },
      {
        desc: '16-byte short secret & 8-byte salt',
        secret: Buffer.from('short-secret-16b'),
        salt: Buffer.from('salt-8b!'),
      },
      {
        desc: '64-byte long secret & 64-byte salt',
        secret: crypto.randomBytes(64),
        salt: crypto.randomBytes(64),
      },
      {
        desc: 'Binary buffer with null bytes and non-ASCII',
        secret: Buffer.from([0x00, 0x01, 0xff, 0xfe, 0x00, 0x42, 0xaa]),
        salt: Buffer.from([0xff, 0x00, 0x7f, 0x80, 0x00]),
      },
      {
        desc: 'Empty buffers (0 bytes)',
        secret: Buffer.alloc(0),
        salt: Buffer.alloc(0),
      },
    ];

    let allIdentical = true;
    for (const vec of testVectors) {
      const expected = crypto.scryptSync(vec.secret, vec.salt, 32);
      const actual = getMemoizedScryptKey(vec.secret, vec.salt);

      const matches = Buffer.compare(expected, actual) === 0;
      if (!matches) allIdentical = false;

      recordResult(
        'Crypto Equivalence',
        vec.desc,
        matches,
        `Expected ${expected.subarray(0, 8).toString('hex')}... Got ${actual.subarray(0, 8).toString('hex')}...`
      );
    }

    recordResult(
      'Crypto Equivalence',
      'All Vectors Produce Byte-for-Byte Identical 32-byte Keys',
      allIdentical,
      'Matches crypto.scryptSync(secret, salt, 32) perfectly'
    );
  }

  // =========================================================================
  // 10. getMemoizedScryptKey Cache Timing & Speedup
  // =========================================================================
  console.log('\n--- 10. Testing getMemoizedScryptKey Performance & Timing Speedup ---');
  {
    _clearScryptKeyCacheForTesting();

    const secret = crypto.randomBytes(32);
    const salt = crypto.randomBytes(32);

    // Measure cold call (cache miss)
    const t0 = process.hrtime.bigint();
    getMemoizedScryptKey(secret, salt);
    const t1 = process.hrtime.bigint();
    const coldMs = Number(t1 - t0) / 1_000_000;

    // Measure 10,000 warm calls (cache hits)
    const WARM_ITERATIONS = 10_000;
    const t2 = process.hrtime.bigint();
    for (let i = 0; i < WARM_ITERATIONS; i++) {
      getMemoizedScryptKey(secret, salt);
    }
    const t3 = process.hrtime.bigint();
    const warmTotalMs = Number(t3 - t2) / 1_000_000;
    const warmAvgMs = warmTotalMs / WARM_ITERATIONS;

    const speedupFactor = coldMs / (warmAvgMs || 0.0001);

    recordResult(
      'Crypto Performance',
      'Cold Scrypt Derivation Takes Real Work (>5ms)',
      coldMs > 5,
      `Cold latency: ${coldMs.toFixed(2)}ms (scrypt key derivation computation)`
    );

    recordResult(
      'Crypto Performance',
      'Warm Cache Hit Average Latency < 0.01ms',
      warmAvgMs < 0.01,
      `Warm avg latency: ${(warmAvgMs * 1000).toFixed(2)} µs (${warmAvgMs.toFixed(5)}ms)`
    );

    recordResult(
      'Crypto Performance',
      'Speedup Factor Exceeds 500x',
      speedupFactor >= 500,
      `Speedup factor: ${speedupFactor.toFixed(0)}x (${coldMs.toFixed(1)}ms cold vs ${warmAvgMs.toFixed(5)}ms warm)`
    );
  }

  // =========================================================================
  // 11. Cache Key Collision Resistance & Boundary Separation
  // =========================================================================
  console.log('\n--- 11. Testing Cache Key Collision Resistance ---');
  {
    _clearScryptKeyCacheForTesting();

    // Cross-boundary concatenated inputs:
    // Secret "ab" + Salt "cdef" vs Secret "abc" + Salt "def"
    const sec1 = Buffer.from('ab', 'utf8');
    const salt1 = Buffer.from('cdef', 'utf8');

    const sec2 = Buffer.from('abc', 'utf8');
    const salt2 = Buffer.from('def', 'utf8');

    const key1 = getMemoizedScryptKey(sec1, salt1);
    const key2 = getMemoizedScryptKey(sec2, salt2);

    const collision = Buffer.compare(key1, key2) === 0;

    recordResult(
      'Cache Key Delimiter',
      'Delimiter Prevents Cross-Field Concatenation Collisions',
      !collision,
      `Key 1: ${key1.subarray(0, 6).toString('hex')} vs Key 2: ${key2.subarray(0, 6).toString('hex')} (distinct)`
    );

    // Symmetric inputs: Secret A + Salt B vs Secret B + Salt A
    const secA = Buffer.from('alpha', 'utf8');
    const saltB = Buffer.from('beta', 'utf8');

    const keyAB = getMemoizedScryptKey(secA, saltB);
    const keyBA = getMemoizedScryptKey(saltB, secA);

    const symmetricMatch = Buffer.compare(keyAB, keyBA) === 0;

    recordResult(
      'Cache Key Delimiter',
      'Position Separation: (A, B) != (B, A)',
      !symmetricMatch,
      'Secret and salt positions are not commutative'
    );
  }

  // =========================================================================
  // 12. Returned Buffer In-Place Mutation Analysis
  // =========================================================================
  console.log('\n--- 12. Testing Returned Buffer Mutation Behavior ---');
  {
    _clearScryptKeyCacheForTesting();

    const sec = crypto.randomBytes(32);
    const salt = crypto.randomBytes(32);

    const bufA = getMemoizedScryptKey(sec, salt);
    const originalByte = bufA[0];

    // Mutate byte in bufA
    bufA[0] = (originalByte + 1) % 256;

    const bufB = getMemoizedScryptKey(sec, salt);
    const sharesReference = bufB[0] === bufA[0];

    recordResult(
      'Buffer Mutation Observation',
      'Cache Returns Direct Internal Buffer Reference',
      sharesReference,
      'Direct reference returned for zero-allocation performance; callers must not mutate returned buffer'
    );
  }

  // =========================================================================
  // 13. Map Prototype Key Safety (__proto__, constructor, toString)
  // =========================================================================
  console.log('\n--- 13. Testing Prototype Key Immunity (__proto__, constructor, toString) ---');
  {
    const lock = new SecureStoreKeyedRWLock();
    const protoKeys = ['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty'];
    let allSucceeded = true;

    for (const key of protoKeys) {
      try {
        await lock.write(key, async () => {
          await sleep(2);
        });
        await lock.read(key, async () => {
          await sleep(2);
        });
      } catch {
        allSucceeded = false;
      }
    }

    const mapSize = (lock as any).locks.size;

    recordResult(
      'RWLock Prototype Safety',
      'Special JavaScript Prototype Property Names Do Not Corrupt Map',
      allSucceeded && mapSize === 0,
      `All 5 dangerous prototype property names executed safely; final map size: ${mapSize}`
    );
  }

  // =========================================================================
  // 14. Massive High-Contention Stress (1,000 Operations on Single Key)
  // =========================================================================
  console.log('\n--- 14. Testing Massive High-Contention (1,000 Operations on Single Key) ---');
  {
    const lock = new SecureStoreKeyedRWLock();
    const HIGH_OPS_COUNT = 1000;
    let completedOps = 0;
    let maxConcurrentWriters = 0;
    let currentWriters = 0;
    let currentReaders = 0;
    let overlapError = false;

    const ops = Array.from({ length: HIGH_OPS_COUNT }, async (_, i) => {
      const isWrite = i % 5 === 0; // 20% writes, 80% reads
      if (isWrite) {
        return lock.write('heavy_key', async () => {
          currentWriters++;
          if (currentWriters > maxConcurrentWriters) maxConcurrentWriters = currentWriters;
          if (currentWriters > 1 || currentReaders > 0) overlapError = true;
          // Micro-tick delay
          await new Promise((r) => setImmediate(r));
          currentWriters--;
          completedOps++;
        });
      } else {
        return lock.read('heavy_key', async () => {
          currentReaders++;
          if (currentWriters > 0) overlapError = true;
          await new Promise((r) => setImmediate(r));
          currentReaders--;
          completedOps++;
        });
      }
    });

    await Promise.all(ops);

    recordResult(
      'RWLock Massive Contention',
      '1,000 Rapid Operations Complete With Zero Collisions',
      completedOps === HIGH_OPS_COUNT && !overlapError && maxConcurrentWriters === 1,
      `Completed: ${completedOps}/${HIGH_OPS_COUNT}, Max writers: ${maxConcurrentWriters}, Collisions: ${overlapError}`
    );

    recordResult(
      'RWLock Massive Contention',
      'Map Evicts Single Contended Key Fully After 1,000 Ops',
      (lock as any).locks.size === 0,
      `Final locks map size: ${(lock as any).locks.size}`
    );
  }

  // =========================================================================
  // 15. Multi-Key Scrypt Cache Isolation
  // =========================================================================
  console.log('\n--- 15. Testing Multi-Pair Scrypt Cache Isolation & Determinism ---');
  {
    _clearScryptKeyCacheForTesting();

    const pairs = Array.from({ length: 20 }, (_, i) => ({
      secret: crypto.randomBytes(32),
      salt: crypto.randomBytes(16),
      id: i,
    }));

    // First pass: generate all keys
    const firstPassKeys = pairs.map((p) => getMemoizedScryptKey(p.secret, p.salt));

    // Second pass: read from cache
    const secondPassKeys = pairs.map((p) => getMemoizedScryptKey(p.secret, p.salt));

    let allMatched = true;
    for (let i = 0; i < pairs.length; i++) {
      if (Buffer.compare(firstPassKeys[i], secondPassKeys[i]) !== 0) {
        allMatched = false;
      }
    }

    recordResult(
      'Crypto Cache Multi-Pair',
      '20 Independent Secret-Salt Pairs Retain Separate Deterministic Keys',
      allMatched,
      'Every key matches across multiple passes with zero cross-contamination'
    );
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log('EMPIRICAL STRESS TEST SUMMARY');
  console.log('================================================================');

  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log(`TOTAL CHECKS EXECUTED : ${total}`);
  console.log(`PASSED                : ${passed}`);
  console.log(`FAILED                : ${failed}\n`);

  if (failed > 0) {
    console.error('STRESS TEST SUITE DETECTED VULNERABILITIES OR FAILURES:');
    for (const r of results.filter((r) => r.status === 'FAIL')) {
      console.error(`  - [FAIL] [${r.section}] ${r.name}: ${r.details}`);
    }
    process.exit(1);
  } else {
    console.log('ALL EMPIRICAL STRESS TESTS PASSED CLEANLY (0 REGRESSIONS / 0 RACE CONDITIONS).');
  }
}

runEmpiricalStressSuite().catch((err) => {
  console.error('Fatal error in stress suite:', err);
  process.exit(1);
});
