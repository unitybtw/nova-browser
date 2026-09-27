/**
 * Controls that are only visible on hover.
 *
 * A `opacity-0 group-hover:opacity-100` control is focusable but invisible to
 * anyone using the keyboard: focus lands on something the user cannot see, and
 * the global `:focus-visible` outline is drawn inside an element with zero
 * opacity, so it is invisible too. This pattern appeared in ten components.
 *
 * The check is static on purpose - it runs in CI without a browser. It is a
 * guard against the pattern coming back, not a replacement for measuring the
 * real rendered result, which was done in the running app.
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('--- Hover-only controls (keyboard invisible) ---');
let passed = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { passed++; console.log(`[PASS] [Hover-Only] ${name}`); }
  else { console.log(`[FAIL] [Hover-Only] ${name} ${extra}`); process.exitCode = 1; }
}

const SRC = path.join(process.cwd(), 'src');
const files: string[] = [];
const walk = (dir: string) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name)) files.push(full);
  }
};
walk(SRC);

const offenders: string[] = [];
let gatedControls = 0;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(process.cwd(), file);
  // Class strings live in JSX attributes and may be split across template
  // literals, so the window around each match is inspected rather than the
  // whole file at once.
  const re = /opacity-0[\s\S]{0,120}?group-hover:opacity-100[\s\S]{0,160}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    gatedControls++;
    const window = m[0];
    const line = text.slice(0, m.index).split('\n').length;
    const revealed =
      /focus-visible:opacity-100/.test(window) ||
      /focus:opacity-100/.test(window) ||
      /group-focus-within:opacity-100/.test(window) ||
      /focus-within:opacity-100/.test(window);
    if (!revealed) offenders.push(`${rel}:${line}`);
  }
}

check('at least one hover-gated control exists, so the scan is live', gatedControls > 0, `found ${gatedControls}`);
check(
  'every hover-gated control is also revealed on focus',
  offenders.length === 0,
  `\n      ${offenders.join('\n      ')}`
);
check('the scan covered the whole src tree', files.length > 40, `scanned ${files.length} files`);

console.log(`\n${passed} hover-only checks passed (${gatedControls} hover-gated controls scanned)\n`);
