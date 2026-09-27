/**
 * Download size / transfer speed formatting.
 *
 * There used to be three drifted copies of this formatter plus a hardcoded
 * megabyte in a fourth place:
 *   - DownloadsPopover: `(totalBytes / 1024 / 1024).toFixed(1) + ' MB'`, so a
 *     900 KB file read "0.9 MB" and a 4 KB file read "0.0 MB".
 *   - DownloadToast:  emitted "1.0 KB".
 *   - DownloadsPage:  wrapped the same output in parseFloat, emitting "1 KB".
 * The same list is visible at once in the download toast and the downloads
 * page, so the drift was user-visible, not theoretical.
 *
 * These assertions drive the real exported formatter.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatBytes } from '../src/utils/formatBytes';

console.log('--- Download byte formatting (one shared implementation) ---');
let passed = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { passed++; console.log(`[PASS] [Format-Bytes] ${name}`); }
  else { console.log(`[FAIL] [Format-Bytes] ${name} ${extra}`); process.exitCode = 1; }
}

const KB = 1024;
const MB = 1024 * KB;
const GB = 1024 * MB;

// --- missing / degenerate totals ------------------------------------------
// Download totals stay undefined or 0 until the server sends a Content-Length,
// so these are the values the UI actually sees on most first renders.
for (const [label, input] of [
  ['undefined', undefined],
  ['null', null],
  ['0', 0],
  ['-1', -1],
  ['NaN', NaN],
  ['Infinity', Infinity],
] as Array<[string, number | null | undefined]>) {
  check(`${label} renders as "0 B"`, formatBytes(input) === '0 B', `=> ${formatBytes(input)}`);
}

// --- whole bytes carry no decimal -----------------------------------------
check('1 B', formatBytes(1) === '1 B', `=> ${formatBytes(1)}`);
check('512 B', formatBytes(512) === '512 B', `=> ${formatBytes(512)}`);
check('1023 B stays in bytes', formatBytes(1023) === '1023 B', `=> ${formatBytes(1023)}`);
check('a sub-byte value is not scaled up by 1024', formatBytes(0.4) === '0 B', `=> ${formatBytes(0.4)}`);

// --- the two cases that motivated the fix --------------------------------
check(
  'a 900 KB file is not mislabelled "0.9 MB"',
  formatBytes(900 * KB) === '900 KB',
  `=> ${formatBytes(900 * KB)}`
);
check(
  'a 4 KB file is not "0.0 MB"',
  formatBytes(4 * KB) === '4 KB' && !formatBytes(4 * KB).includes('0.0'),
  `=> ${formatBytes(4 * KB)}`
);

// --- KB / MB / GB ---------------------------------------------------------
check('exactly 1 KB', formatBytes(KB) === '1 KB', `=> ${formatBytes(KB)}`);
check('1.5 KB keeps its decimal', formatBytes(1536) === '1.5 KB', `=> ${formatBytes(1536)}`);
check('exactly 1 MB', formatBytes(MB) === '1 MB', `=> ${formatBytes(MB)}`);
check('1.5 MB', formatBytes(1.5 * MB) === '1.5 MB', `=> ${formatBytes(1.5 * MB)}`);
check('12.3 MB', formatBytes(Math.round(12.3 * MB)) === '12.3 MB', `=> ${formatBytes(Math.round(12.3 * MB))}`);
check('exactly 1 GB', formatBytes(GB) === '1 GB', `=> ${formatBytes(GB)}`);
check('2.5 GB', formatBytes(2.5 * GB) === '2.5 GB', `=> ${formatBytes(2.5 * GB)}`);

// --- unit boundaries are not off by one ----------------------------------
for (const [bytes, expected] of [
  [KB - 1, '1023 B'],
  [KB, '1 KB'],
  [MB - 1, '1024 KB'],
  [MB, '1 MB'],
  [GB - 1, '1024 MB'],
  [GB, '1 GB'],
] as Array<[number, string]>) {
  check(`boundary ${bytes} => ${expected}`, formatBytes(bytes) === expected, `=> ${formatBytes(bytes)}`);
}

// --- unit overflow --------------------------------------------------------
// The toast's own clamp exists because an unbounded index into the unit array
// rendered "1.0 undefined" for a value past the last unit.
check(
  `the last unit itself formats (${formatBytes(1024 ** 4)})`,
  formatBytes(1024 ** 4) === '1 TB',
  `=> ${formatBytes(1024 ** 4)}`
);
check(
  `a value past the last unit clamps (${formatBytes(1024 ** 5)})`,
  formatBytes(1024 ** 5) === '1024 TB',
  `=> ${formatBytes(1024 ** 5)}`
);
check('an absurd value never renders "undefined"', !formatBytes(1e30).includes('undefined'), `=> ${formatBytes(1e30)}`);
check('an absurd value keeps a unit suffix', / (B|KB|MB|GB|TB)$/.test(formatBytes(1e30)), `=> ${formatBytes(1e30)}`);

// --- one implementation, not four -----------------------------------------
// A drifted copy is the original defect, so pin it: none of the three download
// surfaces may declare its own formatter again.
const COMPONENTS = [
  'src/components/DownloadsPopover.tsx',
  'src/components/DownloadToast.tsx',
  'src/components/DownloadsPage.tsx',
];
for (const rel of COMPONENTS) {
  const src = readFileSync(join(process.cwd(), rel), 'utf8');
  check(`${rel} imports the shared formatter`, /from\s+'\.\.\/utils\/formatBytes'/.test(src));
  check(
    `${rel} declares no private formatBytes`,
    !/function\s+formatBytes|(?:const|let|var)\s+formatBytes\s*[:=]/.test(src)
  );
}
// And no surface may hardcode a megabyte again.
const popover = readFileSync(join(process.cwd(), COMPONENTS[0]), 'utf8');
check(
  'DownloadsPopover no longer hardcodes a megabyte',
  !/\/\s*1024\s*\/\s*1024/.test(popover)
);

console.log(`\n${passed} format-bytes checks passed\n`);
