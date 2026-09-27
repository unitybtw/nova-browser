/**
 * Update-package integrity expectations.
 *
 * The previous implementation scraped a 64-hex string out of the GitHub
 * release BODY. When no hash was found it computed the download's SHA-256,
 * logged it, and then ignored it — so the update was reported exactly like a
 * verified one while nothing had been checked. And because a Nova release
 * carries ~18 assets plus a checksums block, a loose scrape could also pick up
 * a DIFFERENT asset's hash and reject a perfectly good download.
 *
 * These tests pin the new order of trust (GitHub's per-asset `digest` first,
 * the body only as a strict fallback) and the "unverified" outcome. The digest
 * shapes below are copied from real `unitybtw/nova-browser` release payloads.
 */

const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

// Mirrors electron/main.ts. Kept in sync deliberately: the function is nested
// inside the main-process module and cannot be imported, and the previous
// security suite's problem was a copy that drifted from the original.
export function extractExpectedSha256(release: any, assetName: string): string | undefined {
  if (!release) return undefined;

  if (assetName && Array.isArray(release.assets)) {
    const asset = release.assets.find(
      (a: any) => a && typeof a.name === 'string' && a.name === assetName
    );
    const digest = asset?.digest;
    if (typeof digest === 'string') {
      const match = /^sha256:([a-fA-F0-9]{64})$/.exec(digest.trim());
      if (match) return match[1].toLowerCase();
    }
  }

  if (typeof release.body === 'string' && assetName) {
    const escapedName = assetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const p1 = new RegExp(`([a-fA-F0-9]{64})\\s+[*]?${escapedName}(?![^\\n]*[a-fA-F0-9])`, 'i');
    const m1 = release.body.match(p1);
    if (m1 && SHA256_HEX_RE.test(m1[1].toLowerCase())) return m1[1].toLowerCase();

    const p2 = new RegExp(`${escapedName}[^a-fA-F0-9\\n]*([a-fA-F0-9]{64})`, 'i');
    const m2 = release.body.match(p2);
    if (m2 && SHA256_HEX_RE.test(m2[1].toLowerCase())) return m2[1].toLowerCase();
  }
  return undefined;
}

console.log('\n--- Update Integrity (expected SHA-256 resolution) ---');

const EXE = 'Nova-Browser-1.4.8-x64.exe';
const EXE_SHA = 'fca1051bf784c48090970ef6b3049d93cf0843b325c6ae038f3356baa2702931';
const DMG_SHA = 'b'.repeat(64);
const OTHER_SHA = 'c'.repeat(64);

// A real-shaped release: 18 assets, each with GitHub's `digest`.
const realRelease = {
  tag_name: 'v1.4.8',
  body: `## Checksums\n${'d'.repeat(64)}  Nova-Browser-1.4.8-arm64.dmg\n${EXE_SHA}  ${EXE}\n`,
  assets: [
    { name: 'latest-mac.yml', digest: `sha256:${'a'.repeat(64)}` },
    { name: EXE, digest: `sha256:${EXE_SHA}` },
    { name: 'Nova-Browser-1.4.8-arm64.dmg', digest: `sha256:${DMG_SHA}` }
  ]
};

let passed = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) {
    passed++;
    console.log(`[PASS] [Update-Integrity] ${name}`);
  } else {
    console.log(`[FAIL] [Update-Integrity] ${name} ${extra}`);
    process.exitCode = 1;
  }
}

// 1. the API digest wins over whatever the body claims
check(
  'asset.digest is preferred over the release body',
  extractExpectedSha256(realRelease, EXE) === EXE_SHA,
  `got ${extractExpectedSha256(realRelease, EXE)}`
);
check(
  'each asset resolves to its own digest',
  extractExpectedSha256(realRelease, 'Nova-Browser-1.4.8-arm64.dmg') === DMG_SHA
);

// 2. no digest anywhere -> explicitly unverified, never a guess
check(
  'no digest and no body hash -> undefined (caller must mark it unverified)',
  extractExpectedSha256({ tag_name: 'v1', body: 'no hashes here', assets: [{ name: EXE }] }, EXE) === undefined
);
check(
  'absent digest field is not treated as a digest',
  extractExpectedSha256({ assets: [{ name: EXE }] }, EXE) === undefined
);
check(
  'unknown asset name resolves to undefined, not another asset\'s hash',
  extractExpectedSha256(realRelease, 'Nova-Browser-1.4.9-x64.exe') === undefined
);

// 3. a malformed digest must not be silently accepted or coerced
for (const bad of [
  'sha256:tooshort',
  `sha256:${'z'.repeat(64)}`,
  'md5:' + 'a'.repeat(32),
  `sha256:${'a'.repeat(63)}`,
  `sha256:${'a'.repeat(64)}extra`
]) {
  check(
    `malformed digest rejected: ${bad.slice(0, 24)}`,
    extractExpectedSha256({ assets: [{ name: EXE, digest: bad }] }, EXE) === undefined
  );
}

// 4. body fallback still works for old releases, exact name only
const legacyRelease = {
  body: `## Checksums\n${'d'.repeat(64)}  Nova-Browser-1.4.8-arm64.dmg\n${EXE_SHA}  ${EXE}\n`,
  assets: [{ name: EXE }]
};
check('legacy release falls back to an exact body match', extractExpectedSha256(legacyRelease, EXE) === EXE_SHA);
check(
  'body fallback does not leak another asset\'s hash',
  extractExpectedSha256(legacyRelease, 'Nova-Browser-1.4.8-arm64.dmg') === 'd'.repeat(64),
  'arm64 name is legitimately listed in that body, so this is the correct hash'
);

// 5. the old single-asset loose fallback is gone: a bare hex elsewhere in the
//    body must not be adopted for an unrelated asset
check(
  'bare hex in the body is NOT adopted for an unrelated asset',
  extractExpectedSha256({ body: `${OTHER_SHA}\n\nunrelated notes\n`, assets: [] }, EXE) === undefined
);

// 6. every returned value is a well-formed sha-256
for (const name of [EXE, 'Nova-Browser-1.4.8-arm64.dmg', 'latest-mac.yml']) {
  const v = extractExpectedSha256(realRelease, name);
  check(`returned value for ${name} is 64 lowercase hex`, typeof v === 'string' && SHA256_HEX_RE.test(v));
}

console.log(`\n${passed} update-integrity checks passed\n`);

// ---------------------------------------------------------------------------
// Model cache disk budget
// ---------------------------------------------------------------------------
import { planEviction, enforceModelCacheBudget, MAX_MODEL_CACHE_TOTAL_BYTES } from '../electron/main/modelCacheQuota';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

console.log('--- Model Cache Budget ---');

(async () => {
let budgetPassed = 0;
function bcheck(name: string, cond: boolean, extra = '') {
  if (cond) { budgetPassed++; console.log(`[PASS] [ModelCache-Budget] ${name}`); }
  else { console.log(`[FAIL] [ModelCache-Budget] ${name} ${extra}`); process.exitCode = 1; }
}

const BUDGET = 1000;
const files = (sizes: number[], base = 1000) => sizes.map((size, i) => ({ name: `f${i}`, size, mtimeMs: base + i }));

bcheck('well under budget -> no eviction', planEviction(files([10, 10, 10]), 10, BUDGET).evict.length === 0);
bcheck('exactly at budget -> no eviction', planEviction(files([10, 10]), 10, BUDGET).evict.length === 0);

{
  // 400+300+200 = 900; +100 lands exactly on the 1000 budget, so nothing to drop.
  const plan = planEviction(files([400, 300, 200]), 100, BUDGET);
  bcheck('a write that lands exactly on the budget causes no eviction', plan.evict.length === 0, plan.evict.join(','));
  const plan2 = planEviction(files([400, 300, 200]), 600, BUDGET);
  bcheck('over budget evicts oldest first', plan2.evict.join(',') === 'f0,f1', plan2.evict.join(','));
  bcheck('projected total lands within budget', plan2.projectedTotal <= BUDGET, String(plan2.projectedTotal));
  bcheck('never evicts more than needed', plan2.evict.length === 2, `evicted ${plan2.evict.length}`);
}
{
  // Newest-first order must NOT be chosen: a full disk should drop the coldest data.
  const plan = planEviction(files([100, 100, 100, 100, 100]), 800, BUDGET);
  bcheck('eviction is least-recently-modified first', plan.evict.join(',') === 'f0,f1,f2', plan.evict.join(','));
}
{
  // Re-caching an already-cached model must not double count its own bytes.
  const entries = files([500, 400]);
  const plan = planEviction(entries, 500, BUDGET, 'f0');
  bcheck('replacing a cached file does not count its old size', plan.projectedTotal === 900, String(plan.projectedTotal));
  bcheck('replacing a file never evicts that same file', !plan.evict.includes('f0'), plan.evict.join(','));
}
{
  const plan = planEviction(files([100]), 2000, BUDGET);
  bcheck('a single file larger than the whole budget is impossible', plan.impossible === true);
}
{
  const plan = planEviction(files([100]), 2000, BUDGET, 'f0');
  bcheck('impossible stays impossible when replacing the only file', plan.impossible === true, plan.evict.join(','));
}
bcheck('empty cache + oversized write is impossible', planEviction([], 5000, BUDGET).impossible === true);
bcheck('real default budget is a sane ceiling', MAX_MODEL_CACHE_TOTAL_BYTES === 1024 * 1024 * 1024);
{
  // Ties on mtime must be broken deterministically, not by readdir order.
  const tied = [{ name: 'b', size: 500, mtimeMs: 5 }, { name: 'a', size: 500, mtimeMs: 5 }];
  const p1 = planEviction(tied, 600, BUDGET);
  const p2 = planEviction([...tied].reverse(), 600, BUDGET);
  bcheck('mtime ties are broken deterministically', p1.evict.join(',') === p2.evict.join(','), `${p1.evict} vs ${p2.evict}`);
}
bcheck('negative/NaN sizes cannot produce a negative projection',
  planEviction([{ name: 'x', size: NaN, mtimeMs: 1 }], 10, BUDGET).projectedTotal >= 0);

// The filesystem layer, against a real directory. The pure policy above cannot
// catch a broken scan, a bad unlink, or the .tmp skip.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novacache-'));
  const write = (name: string, size: number, mtimeMs: number) => {
    const f = path.join(dir, name);
    fs.writeFileSync(f, Buffer.alloc(size, 1));
    fs.utimesSync(f, mtimeMs / 1000, mtimeMs / 1000);
    return f;
  };
  const names = () => fs.readdirSync(dir).sort();
  const sizeOf = (n: string) => fs.statSync(path.join(dir, n)).size;

  try {
    const a = write('old.bin', 600, 1000);
    const b = write('new.bin', 300, 9000);
    // A crashed write: ancient .tmp, must be reclaimed.
    const crashed = path.join(dir, 'crashed.tmp');
    fs.writeFileSync(crashed, Buffer.alloc(999));
    const ancient = Date.now() - 10 * 60 * 60 * 1000;
    fs.utimesSync(crashed, ancient / 1000, ancient / 1000);
    // An in-flight write: fresh .tmp, must be left alone.
    const inflight = path.join(dir, 'inflight.bin.123.tmp');
    fs.writeFileSync(inflight, Buffer.alloc(999));

    // 600 + 300 = 900; a 400-byte write needs 1300, so the 600-byte file must go.
    const ok = await enforceModelCacheBudget(dir, 400, path.join(dir, 'incoming.bin'), 1000);
    bcheck('fs: write is allowed after making room', ok === true);
    bcheck('fs: the oldest file was actually deleted', !fs.existsSync(a));
    bcheck('fs: the newer file was kept', fs.existsSync(b));
    bcheck('fs: a crashed .tmp is reclaimed', !fs.existsSync(crashed), names().join(','));
    bcheck('fs: an in-flight .tmp is NOT deleted', fs.existsSync(inflight), names().join(','));
    bcheck('fs: neither .tmp counts toward the budget', sizeOf('new.bin') + 400 <= 1000);
    bcheck('fs: remaining total is within budget', sizeOf('new.bin') + 400 <= 1000);

    // Re-caching new.bin must not evict new.bin itself.
    const ok2 = await enforceModelCacheBudget(dir, 250, b, 1000);
    bcheck('fs: re-caching a file does not evict that file', ok2 === true && fs.existsSync(b));

    // A file bigger than the entire budget is refused rather than thrashing.
    const ok3 = await enforceModelCacheBudget(dir, 5000, path.join(dir, 'huge.bin'), 1000);
    bcheck('fs: a file larger than the whole budget is refused', ok3 === false);
    bcheck('fs: refusing does not delete the existing cache', fs.existsSync(b), names().join(','));

    // A missing directory is not an error: nothing is cached yet.
    const ok4 = await enforceModelCacheBudget(path.join(dir, 'nope'), 10, path.join(dir, 'x.bin'), 1000);
    bcheck('fs: a missing cache directory is not a failure', ok4 === true);

    // Evicting everything still must not fail when the incoming file fits alone.
    const ok5 = await enforceModelCacheBudget(dir, 900, path.join(dir, 'solo.bin'), 1000);
    bcheck('fs: frees the whole cache when that is what it takes', ok5 === true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

  console.log(`\n${budgetPassed} model-cache-budget checks passed\n`);
})();
