/**
 * Exercises the REAL extension archive reader.
 *
 * Why this file exists: the Chrome Web Store installer was completely broken
 * (every install threw `stream is not async iterable` because jszip 3.x
 * depends on readable-stream@2, which has no `Symbol.asyncIterator`) while the
 * pre-existing security suite reported 12/12 green. It passed because it
 * re-implemented the CRX3 helper locally and never imported the module that
 * actually reads the archive. These tests import the production function, so
 * that class of false assurance cannot recur.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { loadSafeCrxZip, extractSafeCrxZip } from '../electron/main/crxInstaller';

console.log('\n--- Extension Archive Extraction (real loadSafeCrxZip) ---');

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-crx-'));

function makeTarget(name: string): string {
  const dir = path.join(tmpRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function buildZip(
  files: Record<string, string | Buffer>,
  opts: { store?: boolean } = {}
): Promise<Buffer> {
  const zip = new JSZip();
  for (const [entry, content] of Object.entries(files)) {
    zip.file(entry, content, opts.store ? { compression: 'STORE' } : undefined);
  }
  return await zip.generateAsync({ type: 'nodebuffer' });
}

const MANIFEST = JSON.stringify({
  manifest_version: 3,
  name: 'Demo Extension',
  version: '1.2.3'
});

interface Crx2Options {
  magic?: string;
  version?: number;
  /** Lengths as *declared* in the header; defaults to the real key/signature size. */
  publicKeyLength?: number;
  signatureLength?: number;
  /** Bytes actually appended after the fixed header. */
  keyBytes?: number;
  signatureBytes?: number;
  /** Keep only the first N bytes of the finished container. */
  truncateTo?: number;
  /** Last-word edit, for values that can only be known once the file exists. */
  patch?: (crx: Buffer) => void;
}

/**
 * Builds a genuine CRX2 container:
 *   'Cr24' | version(4) | publicKeyLength(4) | signatureLength(4) | key | signature | zip
 * The key/signature bytes are placeholders on purpose: the installer unwraps
 * the container and never verifies the CRX signature (Electron only loads
 * unpacked extensions), so only the header layout and the offsets are in play.
 * `publicKeyLength`/`signatureLength` are separate from `keyBytes`/
 * `signatureBytes` so a test can declare a span the file does not contain.
 */
function buildCrx2(zip: Buffer, opts: Crx2Options = {}): Buffer {
  const key = Buffer.alloc(opts.keyBytes ?? 256, 0x11);
  const signature = Buffer.alloc(opts.signatureBytes ?? 256, 0x22);
  const header = Buffer.alloc(16);
  header.write(opts.magic ?? 'Cr24', 0, 'ascii');
  header.writeUInt32LE(opts.version ?? 2, 4);
  header.writeUInt32LE(opts.publicKeyLength ?? key.length, 8);
  header.writeUInt32LE(opts.signatureLength ?? signature.length, 12);
  let crx = Buffer.concat([header, key, signature, zip]);
  if (opts.truncateTo !== undefined) crx = crx.subarray(0, opts.truncateTo);
  if (opts.patch) opts.patch(crx);
  return crx;
}

interface Crx3Options {
  magic?: string;
  /** Size as *declared* in the header; defaults to the real header size. */
  headerSize?: number;
  /** Bytes actually appended after the fixed header. */
  headerBytes?: number;
  /** Keep only the first N bytes of the finished container. */
  truncateTo?: number;
  patch?: (crx: Buffer) => void;
}

/** 'Cr24' | version=3 | headerSize(4) | header | zip */
function buildCrx3(zip: Buffer, opts: Crx3Options = {}): Buffer {
  const header = Buffer.alloc(12);
  header.write(opts.magic ?? 'Cr24', 0, 'ascii');
  header.writeUInt32LE(3, 4);
  header.writeUInt32LE(opts.headerSize ?? opts.headerBytes ?? 16, 8);
  let crx = Buffer.concat([header, Buffer.alloc(opts.headerBytes ?? 16, 0x33), zip]);
  if (opts.truncateTo !== undefined) crx = crx.subarray(0, opts.truncateTo);
  if (opts.patch) opts.patch(crx);
  return crx;
}

async function main() {
  // --- happy path: a normal extension must actually extract -------------------
  {
    const target = makeTarget('benign');
    const zip = await buildZip({
      'manifest.json': MANIFEST,
      'js/background.js': 'console.log("hi");'.repeat(200),
      'images/icon.png': Buffer.alloc(4096, 7),
      '_locales/tr/messages.json': JSON.stringify({ hello: 'Merhaba' })
    });

    await extractSafeCrxZip(zip, target);

    assert.ok(fs.existsSync(path.join(target, 'manifest.json')), 'manifest.json must be written');
    const manifest = JSON.parse(
      fs.readFileSync(path.join(target, 'manifest.json'), 'utf-8')
    );
    assert.equal(manifest.name, 'Demo Extension');
    assert.ok(fs.existsSync(path.join(target, 'js/background.js')), 'nested dir must be created');
    assert.ok(fs.existsSync(path.join(target, 'images/icon.png')), 'binary entry must be written');
    assert.equal(
      fs.statSync(path.join(target, 'images/icon.png')).size,
      4096,
      'binary content must be byte-exact'
    );
    assert.ok(fs.existsSync(path.join(target, '_locales/tr/messages.json')), 'deep nested entry');
    console.log('[PASS] [CRX-Extract] a normal extension extracts with exact bytes and nested dirs');
  }

  // --- the validator alone still refuses traversal before anything is written --
{
  const target = makeTarget('validate-only');
  const zip = new JSZip();
  zip.file('manifest.json', MANIFEST);
  zip.file('../escape.txt', 'pwned');
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  await assert.rejects(() => loadSafeCrxZip(buffer, target));
  assert.deepEqual(fs.readdirSync(target), [], 'nothing may be written when validation fails');
  console.log('[PASS] [CRX-Extract] validation rejects before writing anything');
}

// --- unicode + empty-ish entries ------------------------------------------
  {
    const target = makeTarget('unicode');
    const zip = await buildZip({
      'manifest.json': MANIFEST,
      'assets/Ünïcode ✨ name.txt': 'değer',
      'assets/emoji-🎉.txt': 'ok'
    });
    await extractSafeCrxZip(zip, target);
    assert.ok(fs.existsSync(path.join(target, 'assets/Ünïcode ✨ name.txt')));
    assert.equal(
      fs.readFileSync(path.join(target, 'assets/Ünïcode ✨ name.txt'), 'utf-8'),
      'değer'
    );
    console.log('[PASS] [CRX-Extract] unicode and spaced entry names survive');
  }

  // --- zip-slip defences must stay in force ---------------------------------
  {
    const payloads = [
      '../../etc/passwd',
      '..\\..\\..\\etc\\passwd',
      '/etc/cron.d/x',
      'a/b/../../../../x',
      'ok/../manifest.json',
      'foo/..'
    ];
    let rejected = 0;
    for (const entry of payloads) {
      const zip = new JSZip();
      zip.file('manifest.json', MANIFEST);
      // zip-slip payloads must bypass JSZip's own path normalisation to be a
      // meaningful test, so write the entry with a literal name.
      zip.file(entry, 'pwned');
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      const target = makeTarget('slip-' + rejected);
      try {
        await extractSafeCrxZip(buffer, target);
      } catch {
        rejected++;
      }
      // Even if it did not throw, nothing may land outside the target dir.
      const escaped = path.resolve(tmpRoot, 'etc');
      assert.ok(
        !fs.existsSync(path.resolve(target, '..', '..', '..', 'etc', 'passwd')),
        `payload escaped the target: ${entry}`
      );
      void escaped;
    }
    assert.equal(rejected, payloads.length, `all ${payloads.length} traversal payloads must be rejected`);
    console.log(`[PASS] [CRX-ZipSlip] all ${payloads.length} traversal payloads rejected, nothing escaped`);
  }

  // --- entry-count bomb ------------------------------------------------------
  {
    const files: Record<string, string> = { 'manifest.json': MANIFEST };
    for (let i = 0; i < 2100; i++) files[`f${i}.txt`] = 'x';
    const target = makeTarget('count');
    const zip = await buildZip(files);
    await assert.rejects(() => extractSafeCrxZip(zip, target), /too many entries/i);
    console.log('[PASS] [CRX-Bomb] >2000 entries rejected');
  }

  // --- per-file size bomb ----------------------------------------------------
  {
    // A single entry far beyond the 50 MB per-file cap, stored so the archive
    // itself stays small while the inflated output is huge.
    const target = makeTarget('perfile');
    const big = Buffer.alloc(60 * 1024 * 1024, 0x41);
    const zip = await buildZip({ 'manifest.json': MANIFEST, 'big.bin': big });
    await assert.rejects(
      () => extractSafeCrxZip(zip, target),
      /exceeds its uncompressed size limit|too many entries/i,
      'a 60 MB entry must be refused by the per-file or total budget'
    );
    console.log('[PASS] [CRX-Bomb] 60 MB single entry refused by the size budget');
  }

  // --- total size budget -----------------------------------------------------
  {
    const target = makeTarget('total');
    const files: Record<string, Buffer> = { 'manifest.json': MANIFEST };
    // 10 × 20 MB = 200 MB, under the per-file cap but over the 150 MB total.
    for (let i = 0; i < 10; i++) files[`chunk${i}.bin`] = Buffer.alloc(20 * 1024 * 1024, 0x42);
    const zip = await buildZip(files, { store: true });
    await assert.rejects(
      () => extractSafeCrxZip(zip, target),
      /exceeds|too many entries|archive/i
    );
    console.log('[PASS] [CRX-Bomb] aggregate over the total budget refused');
  }

  // --- corrupt / non-zip input must fail loudly, not silently ----------------
  {
    const target = makeTarget('corrupt');
    await assert.rejects(() => extractSafeCrxZip(Buffer.from('not a zip at all'), target));
    console.log('[PASS] [CRX-Extract] non-archive input rejected');
  }

  // --- CRX2 / CRX3 container headers ---------------------------------------
  // Every case below goes through the real extractSafeCrxZip, which is the only
  // thing on the production path that turns a CRX into files. The parser itself
  // is deliberately not duplicated here: the previous security suite shipped a
  // local copy of the CRX3 offset logic and stayed green while the real
  // installer was broken.
  const containerZip = await buildZip({
    'manifest.json': MANIFEST,
    'js/background.js': 'console.log("crx2 body");',
    'images/icon.png': Buffer.alloc(2048, 3)
  });

  // A real CRX2 (16-byte header + 256-byte key + 256-byte signature + zip) must
  // still install byte-exact. If any bound below were too tight, this is what
  // would break first.
  {
    const target = makeTarget('crx2-valid');
    const crx = buildCrx2(containerZip);
    assert.equal(
      crx.subarray(16 + 256 + 256, 16 + 256 + 256 + 4).toString('latin1'),
      'PK\u0003\u0004',
      'fixture must be a real CRX2: the zip begins at 16 + key + signature'
    );
    await extractSafeCrxZip(crx, target);
    assert.ok(fs.existsSync(path.join(target, 'manifest.json')), 'CRX2 manifest.json must be written');
    assert.equal(
      fs.readFileSync(path.join(target, 'js/background.js'), 'utf-8'),
      'console.log("crx2 body");',
      'CRX2 entry content must be byte-exact'
    );
    assert.equal(fs.statSync(path.join(target, 'images/icon.png')).size, 2048, 'CRX2 binary entry');
    console.log('[PASS] [CRX2-Header] a valid CRX2 container still extracts byte-exact');
  }

  // Same for CRX3, so the rewritten version dispatch cannot regress silently.
  {
    const target = makeTarget('crx3-valid');
    await extractSafeCrxZip(buildCrx3(containerZip), target);
    assert.ok(fs.existsSync(path.join(target, 'manifest.json')), 'CRX3 manifest.json must be written');
    assert.equal(
      fs.readFileSync(path.join(target, 'js/background.js'), 'utf-8'),
      'console.log("crx2 body");'
    );
    console.log('[PASS] [CRX3-Header] a valid CRX3 container still extracts');
  }

  // Malformed headers. The expected message pins down WHICH rule refused each
  // one, so a test cannot pass because some unrelated layer happened to throw.
  //
  // The length fields are decoded as uint32, so "negative" and "out of range"
  // arrive as the same bits: 0xffffffff is -1 and 0x80000000 is the most negative
  // int32. The production guard is what refuses a signed or fractional decode,
  // so those bit patterns are the on-wire form of the same attack.
  const malformedCrx2: Array<{ label: string; crx: Buffer; expect: RegExp }> = [
    { label: 'bad magic (Cr25)', crx: buildCrx2(containerZip, { magic: 'Cr25' }), expect: /Unsupported CRX container/ },
    { label: 'version 1 is not a CRX layout', crx: buildCrx2(containerZip, { version: 1 }), expect: /Unsupported CRX container/ },
    // 0x00000102 has the same low byte as CRX2 but is not version 2: the parser
    // used to read buffer[4] only, so this header was taken as a CRX2.
    { label: 'version 0x00000102 (low byte is 2)', crx: buildCrx2(containerZip, { version: 0x102 }), expect: /Unsupported CRX container/ },
    { label: 'truncated to 12 bytes (no signature-length field)', crx: buildCrx2(containerZip, { truncateTo: 12 }), expect: /too small to hold a CRX header/ },
    { label: 'truncated to 16 bytes, declares 256+256 of key/signature', crx: buildCrx2(containerZip, { truncateTo: 16 }), expect: /out of bounds/ },
    { label: 'zip offset 8 KiB past EOF', crx: buildCrx2(containerZip, { publicKeyLength: 0x1000, signatureLength: 0x1000 }), expect: /out of bounds/ },
    { label: 'declared length 0xffffffff (-1 signed)', crx: buildCrx2(containerZip, { publicKeyLength: 0xffffffff }), expect: /out of bounds/ },
    { label: 'declared length 0x80000000 (most negative int32)', crx: buildCrx2(containerZip, { publicKeyLength: 0x80000000 }), expect: /out of bounds/ },
    { label: 'declared length 0x7fffffff (2 GiB - 1)', crx: buildCrx2(containerZip, { signatureLength: 0x7fffffff }), expect: /out of bounds/ },
    { label: 'key + signature 64 KB, far past EOF', crx: buildCrx2(containerZip, { publicKeyLength: 64 * 1024, signatureLength: 64 * 1024 }), expect: /out of bounds/ },
    // A 70 KB key span is inside the file (so the in-file bound alone would
    // accept it and the arithmetic would land exactly on the zip) but over the
    // 64 KB ceiling reserved for real CRX2 key material.
    { label: 'public key 70 KB, inside the file but over the ceiling', crx: buildCrx2(containerZip, { publicKeyLength: 70 * 1024, keyBytes: 70 * 1024 }), expect: /out of bounds/ },
    // keyBytes/signatureBytes match the declared zero, so the file is otherwise
    // perfectly consistent: the zero-length span is the only thing wrong with it.
    { label: 'zero-length public key', crx: buildCrx2(containerZip, { publicKeyLength: 0, keyBytes: 0 }), expect: /must be a positive integer/ },
    { label: 'zero-length signature', crx: buildCrx2(containerZip, { signatureLength: 0, signatureBytes: 0 }), expect: /must be a positive integer/ },
    // In bounds, but the offset lands 8 bytes into the key, so there is no zip there.
    { label: 'in-bounds offset that is not a zip', crx: buildCrx2(containerZip, { publicKeyLength: 8 }), expect: /no zip payload/ },
    {
      // Both declared spans fit inside the file on their own, so the per-field
      // checks pass them; only the cumulative offset 16 + key + signature runs
      // off the end. This is the case the zip-offset bound exists for.
      label: 'each span in-file, cumulative offset past EOF',
      crx: buildCrx2(containerZip, {
        patch: crx => {
          const rest = crx.length - 16;
          crx.writeUInt32LE(rest, 8);
          crx.writeUInt32LE(rest, 12);
        }
      }),
      expect: /CRX zip offset .* out of bounds/
    }
  ];

  for (const [i, { label, crx, expect }] of malformedCrx2.entries()) {
    const target = makeTarget(`crx2-bad-${i}`);
    await assert.rejects(
      () => extractSafeCrxZip(crx, target),
      expect,
      `CRX2 ${label} must be rejected`
    );
    assert.deepEqual(fs.readdirSync(target), [], `CRX2 ${label} must write nothing`);
  }
  console.log(`[PASS] [CRX2-Header] all ${malformedCrx2.length} malformed CRX2 headers refused, nothing written`);

  const malformedCrx3: Array<{ label: string; crx: Buffer; expect: RegExp }> = [
    { label: 'bad magic (Cr23)', crx: buildCrx3(containerZip, { magic: 'Cr23' }), expect: /Unsupported CRX container/ },
    { label: 'truncated to 12 bytes', crx: buildCrx3(containerZip, { truncateTo: 12 }), expect: /too small to hold a CRX header/ },
    { label: 'truncated to 20 bytes, declares a 16-byte header', crx: buildCrx3(containerZip, { truncateTo: 20 }), expect: /out of bounds/ },
    { label: 'header size past EOF', crx: buildCrx3(containerZip, { headerSize: 0x1000 }), expect: /out of bounds/ },
    { label: 'header size 0xffffffff', crx: buildCrx3(containerZip, { headerSize: 0xffffffff }), expect: /out of bounds/ },
    { label: 'header size 1 MiB', crx: buildCrx3(containerZip, { headerSize: 1024 * 1024 }), expect: /out of bounds/ },
    // A 70 KB header is inside the file (so the in-file bound alone would accept
    // it and the arithmetic would land exactly on the zip) but over the 64 KB
    // ceiling reserved for real CRX3 signed headers.
    { label: 'header 70 KB, inside the file but over the ceiling', crx: buildCrx3(containerZip, { headerSize: 70 * 1024, headerBytes: 70 * 1024 }), expect: /out of bounds/ },
    { label: 'zero header size', crx: buildCrx3(containerZip, { headerSize: 0 }), expect: /must be a positive integer/ },
    { label: 'in-bounds offset that is not a zip', crx: buildCrx3(containerZip, { headerSize: 8 }), expect: /no zip payload/ },
    {
      // Declared header is in-file, but 12 + headerSize reaches EOF and leaves no
      // room for a zip local file header.
      label: 'header size consuming the rest of the file',
      crx: buildCrx3(containerZip, {
        patch: crx => crx.writeUInt32LE(crx.length - 12, 8)
      }),
      expect: /CRX zip offset .* out of bounds/
    }
  ];

  for (const [i, { label, crx, expect }] of malformedCrx3.entries()) {
    const target = makeTarget(`crx3-bad-${i}`);
    await assert.rejects(
      () => extractSafeCrxZip(crx, target),
      expect,
      `CRX3 ${label} must be rejected`
    );
    assert.deepEqual(fs.readdirSync(target), [], `CRX3 ${label} must write nothing`);
  }
  console.log(`[PASS] [CRX3-Header] all ${malformedCrx3.length} malformed CRX3 headers refused, nothing written`);

  fs.rmSync(tmpRoot, { recursive: true, force: true });
  console.log('--- Extension Archive Extraction: all checks passed ---\n');
}

main().catch(err => {
  console.error('Extension archive extraction suite FAILED:', err);
  process.exit(1);
});
