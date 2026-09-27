/**
 * Download-open safety policy.
 *
 * The dangerous-extension denylist covers executables, so a page could serve
 * `Content-Disposition: attachment; filename="invoice.html"` with no compromise
 * of the app at all; one click handed it to the OS default browser, which runs
 * its script from a file:// origin. Nothing in the denylist covered that.
 *
 * These assertions drive the real exported helpers.
 */

import { requiresOpenConfirmation, redactUrlForLog } from '../electron/main/downloads';

console.log('--- Download open policy ---');
let passed = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { passed++; console.log(`[PASS] [Download-Open] ${name}`); }
  else { console.log(`[FAIL] [Download-Open] ${name} ${extra}`); process.exitCode = 1; }
}

// The original denylist must still gate.
for (const name of ['a.exe', 'a.msi', 'a.bat', 'a.dmg', 'a.deb', 'a.pkg', 'a.iso', 'a.app']) {
  check(`executable still asks first: ${name}`, requiresOpenConfirmation(`/tmp/${name}`) === true);
}

// The hole: script-capable documents.
for (const name of ['invoice.html', 'page.htm', 'a.xhtml', 'a.mhtml', 'a.svg', 'a.svgz', 'a.hta', 'a.js', 'a.mjs', 'a.jar', 'a.url', 'a.lnk', 'a.reg', 'a.chm', 'a.wsf', 'a.xsl']) {
  check(`script-capable document asks first: ${name}`, requiresOpenConfirmation(`/tmp/${name}`) === true);
}

// Inert types must NOT prompt - prompting on everything is its own regression.
for (const name of ['notes.txt', 'a.pdf', 'a.png', 'a.jpg', 'a.jpeg', 'a.gif', 'a.webp', 'a.mp4', 'a.mp3', 'a.m4a', 'a.webm', 'a.zip', 'a.csv', 'a.docx', 'a.pptx']) {
  check(`inert file opens without prompting: ${name}`, requiresOpenConfirmation(`/tmp/${name}`) === false);
}

// A query string must not smuggle a dangerous-looking extension past the test.
check('an executable name behind a query is still gated', requiresOpenConfirmation('/tmp/ok.txt?x=a.exe') === true);
check('a dangerous name with a fragment is still gated', requiresOpenConfirmation('/tmp/a.exe#x') === true);
// '#' is a legal filename character on APFS, so `a.txt#a.exe` really does end
// in .exe and must be gated. The fragment is not a URL fragment here.
check('a name whose real extension is dangerous is gated even behind a #', requiresOpenConfirmation('/tmp/a.txt#a.exe') === true);
check('a name ending in an inert type is not gated', requiresOpenConfirmation('/tmp/a.txt#notes') === false);

// Log redaction: the chain is only logged because the check rejects userinfo, and
// query strings carry bearer tokens and presigned signatures.
check('userinfo is stripped', redactUrlForLog('https://user:pw@example.com/a') === 'https://example.com/a');
check('query is stripped', redactUrlForLog('https://example.com/a?access_token=SECRET&x=1') === 'https://example.com/a');
check('fragment is stripped', redactUrlForLog('https://example.com/a#SECRET') === 'https://example.com/a');
check('origin and path are kept', redactUrlForLog('https://example.com/deep/path') === 'https://example.com/deep/path');
check('an unparseable value is marked, not echoed', redactUrlForLog('not a url') === '<unparseable-url>');
check('redaction never returns a password', !redactUrlForLog('https://u:p@example.com/').includes('p@'));
check('redaction never returns a token', !redactUrlForLog('https://example.com/?token=abc123').includes('abc123'));

console.log(`\n${passed} download-open checks passed\n`);
