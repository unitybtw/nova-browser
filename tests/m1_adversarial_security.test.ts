/**
 * Empirical Adversarial Test Harness for Challenger 1 (Main Process Security & IPC Hardening)
 * Nova Browser Milestone 1
 */

import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('STARTING EMPIRICAL ADVERSARIAL VERIFICATION SUITE - MILESTONE 1');
console.log('================================================================\n');

interface TestResult {
  suite: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, details: string) {
  if (condition) {
    results.push({ suite, name, status: 'PASS', details });
    console.log(`[PASS] [${suite}] ${name}`);
  } else {
    results.push({ suite, name, status: 'FAIL', details });
    console.error(`[FAIL] [${suite}] ${name} --> ${details}`);
  }
}

// =========================================================================
// 1. ORIGIN VALIDATION CHALLENGE (isTrustedAppOrigin) — REMOVED
// =========================================================================
// This section declared its own `isTrustedAppOrigin` and ran 37 attack vectors
// against it. It was worse than inert: it had DRIFTED from the shipped
// predicate (electron/main.ts:347) in ways that inverted the verdict.
//
//   shipped (electron/main.ts:347-370)          copy that was asserted against
//   ------------------------------------------   --------------------------------
//   devtools: -> FALSE, always                   devtools: -> TRUE
//   nova: only for 6 allowlisted hostnames,      nova: -> TRUE for any host
//   with no pathname/search/userinfo, and
//   for `settings` only an empty or
//   #extensions/#mcp hash
//   localhost:5173 trusted only when
//   !app.isPackaged
//
// So `devtools://devtools/bundled/inspector.html` and `nova://settings?x=1`
// were asserted TRUE here while production rejects them, and the four
// `http://localhost:5173` "legitimate" vectors only hold in a dev build. The
// vectors are not deleted wholesale: the attack shapes in them are worth
// keeping, so they are moved to a source-level regression guard in section 8
// below that reads the shipped predicate instead of a copy of it.
//
// NEEDED EXPORT: `isTrustedAppOrigin(urlStr: string): boolean` from
// electron/main.ts:347. electron/main.ts is the Electron entry point and
// cannot be imported by a Node test, so the right end state is an extracted
// module (e.g. electron/main/trustedOrigin.ts) that main.ts imports, which a
// test can then import directly.

// =========================================================================
// 2. PATH TRAVERSAL CHALLENGE (extension id & install folder) — REMOVED
// =========================================================================
// Same failure mode: `validateExtensionId`, `resolveAndValidateExtensionDir`
// and `validateInstallExtensionFolder` were all declared here and asserted
// against themselves. They are also re-copied in
// tests/challenger_m1_security_empirical.ts:480 and
// tests/security_regression_audit.test.ts:380, so the same predicate has three
// private implementations plus the inline one it was copied from — four places
// that can disagree.
//
// Note the copy did not match even the code it cited: production applies the
// id regex before resolving, and separately rejects a folder whose raw string
// contains `..`, which a `path.resolve`+prefix check alone does not.
//
// NEEDED EXPORT: `validateExtensionId(id: string): boolean` and
// `resolveAndValidateExtensionDir(userDataDir: string, id: string)` from
// electron/main.ts, again via an extracted electron/main/ module — NOT a
// new module under tests/.
//
// =========================================================================
// 3. IPC PARAMETER FUZZING & CRASH RESISTANCE
// =========================================================================
console.log('\n--- 3. Testing IPC Parameter Fuzzing & Crash Resistance ---');

// 3.1 set-vpn parameter validation — REMOVED (test-local `testSetVpnLogic`).
// The protocol allowlist it asserted is re-derived from the `set-vpn` IPC
// handler in electron/main.ts; the real, already-extracted predicate is
// `isValidSecureProxy` in electron/main/proxySecurity.ts:13, which IS
// importable and is now covered for real in section 9 below.
//
// 3.2 store-set parameter validation — REMOVED (test-local
// `testStoreSetLogic`). NEEDED EXPORT: the store key/value guard from the
// `store-set` IPC handler in electron/main.ts, via an extracted module.
//
// 3.3 set-theme parameter validation — REMOVED (test-local
// `testSetThemeLogic`). NEEDED EXPORT: the `set-theme` handler's validation
// from electron/main.ts, via an extracted module.

// 3.4 open-download / show-download-in-folder path validation
//
// This used to be a test-local `testDownloadPathLogic` asserting its own
// `startsWith(downloadsDir + sep)`. Downloads hardening has since been
// extracted into a real module, so the download surface is now driven through
// the shipped code rather than a copy of it.
import { isSafeDownloadUrl, sanitizeDownloadFilename } from '../electron/main/downloads';

const DOWNLOAD_URL_VECTORS = [
  { url: 'https://example.com/file.pdf', expected: true, desc: 'https download URL' },
  { url: 'http://example.com/file.pdf', expected: true, desc: 'http download URL' },
  { url: 'blob:https://example.com/uuid-1234', expected: true, desc: 'blob: wrapping a legitimate https origin' },
  { url: 'data:image/png;base64,iVBORw0KGgo=', expected: true, desc: 'data: image payload' },
  { url: 'javascript:alert(1)', expected: false, desc: 'javascript: scheme' },
  { url: 'file:///etc/passwd', expected: false, desc: 'file: scheme' },
  { url: 'vbscript:msgbox(1)', expected: false, desc: 'vbscript: scheme' },
  { url: 'blob:file:///etc/passwd', expected: false, desc: 'blob: wrapping a file origin' },
  { url: 'blob:https://user:pass@example.com/uuid', expected: false, desc: 'blob: inner URL with credentials' },
  { url: 'data:text/html,<script>alert(1)</script>', expected: false, desc: 'data: HTML payload' },
  { url: 'data:application/javascript,alert(1)', expected: false, desc: 'data: javascript payload' },
  { url: 'data:application/octet-stream;base64,AAAA', expected: false, desc: 'data: executable payload' },
  { url: 'data:image/svg+xml;base64,AAAA', expected: false, desc: 'data: SVG payload' },
  { url: 'https://user:pass@example.com/file.pdf', expected: false, desc: 'https URL with embedded credentials' },
  { url: '', expected: false, desc: 'empty URL' },
  { url: null as any, expected: false, desc: 'null URL' },
  { url: 'not a url', expected: false, desc: 'malformed URL' },
];

for (const vec of DOWNLOAD_URL_VECTORS) {
  const res = isSafeDownloadUrl(vec.url);
  assert(
    res === vec.expected,
    'open-download URL Confinement',
    vec.desc,
    `URL: ${JSON.stringify(vec.url)} | Expected: ${vec.expected} | Got: ${res}`
  );
}

const DOWNLOAD_FILENAME_VECTORS = [
  { raw: '../../etc/passwd', desc: 'path traversal is reduced to a basename' },
  { raw: 'C:\\Windows\\System32\\cmd.exe', desc: 'backslash separator is normalised' },
  { raw: 'report.pdf', desc: 'an ordinary filename is preserved' },
];

for (const vec of DOWNLOAD_FILENAME_VECTORS) {
  const res = sanitizeDownloadFilename(vec.raw);
  assert(
    !res.includes('/') && !res.includes('\\') && !res.includes('..') && res.length > 0,
    'open-download Filename Sanitization',
    vec.desc,
    `Raw: ${JSON.stringify(vec.raw)} | Got: ${JSON.stringify(res)}`
  );
}

assert(
  sanitizeDownloadFilename('  ').length > 0,
  'open-download Filename Sanitization',
  'a filename that sanitises down to nothing must still yield a usable name',
  `Got: ${JSON.stringify(sanitizeDownloadFilename('  '))}`
);
assert(
  /^download_/.test(sanitizeDownloadFilename('CON.tar.gz')),
  'open-download Filename Sanitization',
  'Windows reserved device names (incl. compound extensions) must be prefixed, not passed through',
  `Got: ${JSON.stringify(sanitizeDownloadFilename('CON.tar.gz'))}`
);

// 3.5 capture-tab-thumbnail & capture-full-page webContentsId validation —
// REMOVED (test-local `testWebContentsIdValidation`). The nearest real,
// importable guard is `markNextDownloadAsSaveAs` in electron/main/downloads.ts:161,
// which requires a finite number id; the capture-* handler's own guard is
// inline in electron/main.ts and needs an export to be reachable.

// 3.6 Native TTS default-voice selection by language
//
// This used to be a test-local `sanitizeTtsVoice` that asserted itself. Two
// separate false assurances lived in it:
//
//   1. It hardcoded a single `'Yelda'` fallback. The shipped logic picks a
//      default voice by language prefix (electron/main.ts:6342-6352, and the
//      same table exported as `getMacDefaultVoice` in src/services/tts.ts:92):
//      de->Anna, fr->Thomas, es->Monica, it->Alice, ja->Kyoko, ru->Milena,
//      tr->Yelda, everything else->Samantha. The test never reached that
//      branch, so it could not have detected a wrong or missing mapping.
//   2. The flag-injection guard it also copied (`/[a-zA-Z0-9\s]+/`, <=40 chars,
//      no leading `-`) is still inline in electron/main.ts and is not exported,
//      so it cannot be asserted against at all today.
//
// The language mapping is now driven through the real exported helper, and the
// language branch is genuinely exercised.
import { getMacDefaultVoice } from '../src/services/tts';

const TTS_DEFAULT_VOICE_VECTORS = [
  { lang: 'tr', expected: 'Yelda', desc: 'tr-TR -> Yelda' },
  { lang: 'tr-TR', expected: 'Yelda', desc: 'region-qualified tr-TR -> Yelda' },
  { lang: 'de', expected: 'Anna', desc: 'de-DE -> Anna' },
  { lang: 'de-AT', expected: 'Anna', desc: 'region-qualified de-AT -> Anna' },
  { lang: 'fr', expected: 'Thomas', desc: 'fr-FR -> Thomas' },
  { lang: 'es', expected: 'Mónica', desc: 'es-ES -> Mónica' },
  { lang: 'it', expected: 'Alice', desc: 'it-IT -> Alice' },
  { lang: 'ja', expected: 'Kyoko', desc: 'ja-JP -> Kyoko' },
  { lang: 'ru', expected: 'Milena', desc: 'ru-RU -> Milena' },
  { lang: 'en', expected: 'Samantha', desc: 'en -> Samantha' },
  { lang: 'EN-us', expected: 'Samantha', desc: 'uppercase en-US -> Samantha' },
  { lang: 'pt-BR', expected: 'Samantha', desc: 'an unmapped language falls back to Samantha' },
  { lang: 'xx', expected: 'Samantha', desc: 'an unknown prefix falls back to Samantha' },
  { lang: '', expected: 'Samantha', desc: 'an empty language falls back to Samantha' },
];

for (const vec of TTS_DEFAULT_VOICE_VECTORS) {
  let res: string | null = null;
  let threw: string | null = null;
  try {
    res = getMacDefaultVoice(vec.lang);
  } catch (err: any) {
    threw = `${err.name}: ${err.message}`;
  }
  assert(
    threw === null && res === vec.expected,
    'TTS Default Voice Selection',
    vec.desc,
    `lang: ${JSON.stringify(vec.lang)} | Expected: ${vec.expected} | Got: ${threw ?? res}`
  );
}

// =========================================================================
// 4. CHROME WEB STORE HOSTNAME VALIDATION & ISOLATION — REMOVED
// =========================================================================
// The 15 host vectors were run against a test-local `isChromeWebStoreHost`
// that asserted itself. The real check is inline in electron/main.ts:3373 (and
// a second, slightly different form in electron/webstore-preload.ts), so there
// is nothing importable to drive. The vectors are worth keeping and are moved
// to the source-level guard in section 8.
//
// NEEDED EXPORT: `isChromeWebStoreHost(hostname: string): boolean` from an
// extracted electron/main/ module that both electron/main.ts and
// electron/webstore-preload.ts import — one shared predicate, so the main
// process and the webstore preload cannot disagree about what the Web Store is.

// =========================================================================
// 5. IPC SENDER ORIGIN & FRAME HARDENING — REMOVED
// =========================================================================
// `simulateIsTrustedSender` was a test-local copy of `isTrustedSender`
// (electron/main.ts:330) asserting itself, over mocks of a BrowserWindow. The
// shipped function closes over the module-level `mainWindow`, so a test can
// never drive it without refactoring the dependency away from the closure.
//
// NEEDED EXPORT: an extracted module exposing
// `isTrustedSenderEvent(senderId, senderFrame, trustedWebContentsId, trustedMainFrame, isWindowDestroyed): boolean`
// (or the same predicate with the window passed in), leaving
// electron/main.ts:330 to call it with the real `mainWindow`.
//
// =========================================================================
// 6. WEBVIEW SANDBOX & PRELOAD RESTRICTION — REMOVED
// =========================================================================
// `simulateWillAttachWebview` re-declared the `will-attach-webview` handler's
// preference forcing and then asserted its own assignments back at itself. It
// mutates a plain object and reads it back, so it could not fail.
//
// NEEDED EXPORT: the hardened preference builder from an extracted
// electron/main/ module, e.g.
// `hardenWebviewPreferences(webPreferences, appDir): WebPreferences`, used by
// the real `will-attach-webview` listener in electron/main.ts.

// =========================================================================
// 7. TERMINAL LOG SANITIZATION — REMOVED
// =========================================================================
// `sanitizeConsoleLogMessage` was a test-local copy of the redaction branch at
// electron/main.ts:763 asserting itself. src/utils/logger.ts is the natural
// home but exports no redaction predicate today.
//
// NEEDED EXPORT: `redactSensitiveLog(message: string): { redacted: boolean; output: string }`
// from src/utils/logger.ts, with electron/main.ts:763 calling it.

// =========================================================================
// 8. SOURCE-LEVEL GUARDS FOR THE PREDICATES THAT CANNOT BE IMPORTED
// =========================================================================
// electron/main.ts is the Electron entry point: importing it from a Node test
// would boot an app. Until the extraction described in sections 1, 2, 4, 5, 6
// and 7 above happens, the only way to assert anything true about those
// predicates is to read the shipped source.
//
// This is deliberately NOT the anti-pattern this suite was failing on. Every
// assertion below is falsifiable against production: delete or weaken the guard
// in electron/main.ts and the assertion fails. That is the opposite of asserting
// a private copy against itself, which no edit to production can ever break.
//
// Each entry names the exact hardening the older test *claimed* to cover, so
// the guarantee is not lost — it is just attached to the real code now.
console.log('\n--- 8. Testing Shipped Main-Process Guards Are Still Present ---');

const mainSource = fs.readFileSync(
  path.resolve(process.cwd(), 'electron/main.ts'),
  'utf-8'
).replace(/\r\n/g, '\n');

const MAIN_SOURCE_GUARDS: Array<{ needle: string; desc: string }> = [
  // Section 1: isTrustedAppOrigin (electron/main.ts:347). The old copy trusted
  // devtools: unconditionally; production must keep refusing it.
  {
    needle: "if (parsed.protocol === 'devtools:') return false;",
    desc: 'isTrustedAppOrigin refuses devtools: origins (the old test copy trusted them)',
  },
  {
    needle: "const allowedHost = ['newtab', 'settings', 'history', 'downloads', 'changelog', 'whats-new'].includes(parsed.hostname);",
    desc: 'isTrustedAppOrigin restricts nova: to a six-host allowlist (the old copy trusted any nova: URL)',
  },
  {
    needle: "if (!app.isPackaged && parsed.origin === 'http://localhost:5173') return true;",
    desc: 'isTrustedAppOrigin trusts the Vite dev server only in unpackaged builds',
  },
  // Section 4: Web Store host (electron/main.ts:3373).
  {
    needle: "parsed.protocol === 'https:' && (parsed.hostname === 'chromewebstore.google.com' || parsed.hostname === 'chrome.google.com')",
    desc: 'the Web Store popup handler requires https and an exact host match, not a suffix',
  },
  // Section 5: isTrustedSender (electron/main.ts:330).
  {
    needle: 'if (!event.senderFrame || !mainWindow.webContents.mainFrame || event.senderFrame !== mainWindow.webContents.mainFrame) {',
    desc: 'isTrustedSender treats a missing senderFrame as untrusted',
  },
  // Section 2: extension id / install folder confinement.
  {
    needle: "const isExtension = parsed.protocol === 'chrome-extension:' && /^[a-zA-Z0-9_-]+$/.test(parsed.hostname) && !parsed.username && !parsed.password;",
    desc: 'chrome-extension: hostnames are constrained to the id character set and carry no credentials',
  },
  // Section 3.2: store-set key guard.
  {
    needle: "if (!key || typeof key !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid key format');",
    desc: 'store-set rejects keys outside the id character set',
  },
  // Section 7: console redaction (electron/main.ts:763).
  {
    needle: "message.includes('NOVA_SAVE_PW') || /password|token|secret|apiKey/i.test(message)",
    desc: 'renderer console output is redacted for the password dump marker and credential keywords',
  },
  // Section 3.6: the language table the old test could never reach.
  { needle: "if (prefix === 'tr') cleanVoice = 'Yelda';", desc: 'TTS default voice maps tr to Yelda' },
  { needle: "else if (prefix === 'de') cleanVoice = 'Anna';", desc: 'TTS default voice maps de to Anna' },
  { needle: "else if (prefix === 'fr') cleanVoice = 'Thomas';", desc: 'TTS default voice maps fr to Thomas' },
  { needle: "else if (prefix === 'es') cleanVoice = 'Mónica';", desc: 'TTS default voice maps es to Mónica' },
  { needle: "else if (prefix === 'it') cleanVoice = 'Alice';", desc: 'TTS default voice maps it to Alice' },
  { needle: "else if (prefix === 'ja') cleanVoice = 'Kyoko';", desc: 'TTS default voice maps ja to Kyoko' },
  { needle: "else if (prefix === 'ru') cleanVoice = 'Milena';", desc: 'TTS default voice maps ru to Milena' },
  { needle: "else cleanVoice = 'Samantha';", desc: 'TTS falls back to Samantha for unmapped languages' },
  // Section 3.6: the flag-injection guard that is not exported.
  {
    needle: "if (/^[a-zA-Z0-9\\s]+$/.test(rawName) && rawName.length <= 40 && !rawName.startsWith('-')) {",
    desc: 'TTS voice names are restricted to alphanumerics, length-capped and may not start with a CLI flag dash',
  },
  // Section 3.1 / 5: MCP SSRF port block.
  {
    needle: "if (port === '3020' || port === activeMcpPort) {",
    desc: 'requests to the default and the live MCP port are blocked',
  },
];

for (const guard of MAIN_SOURCE_GUARDS) {
  assert(
    mainSource.includes(guard.needle),
    'Shipped Guard Present',
    guard.desc,
    `electron/main.ts no longer contains: ${guard.needle.slice(0, 90)}`
  );
}

// =========================================================================
// 9. VPN PROXY VALIDATION (real, extracted module)
// =========================================================================
// Replaces the removed test-local `testSetVpnLogic`. The set-vpn handler's
// protocol allowlist now lives in electron/main/proxySecurity.ts, which is
// importable, so it is driven for real instead of restated.
console.log('\n--- 9. Testing VPN Proxy Scheme Validation ---');

import { isValidSecureProxy, normalizeProxyForChromium } from '../electron/main/proxySecurity';

const PROXY_VECTORS = [
  { proxy: 'https://secure-proxy.org:8443', expected: true, desc: 'https proxy' },
  { proxy: 'socks5://127.0.0.1:1080', expected: true, desc: 'socks5 proxy' },
  { proxy: 'socks5h://127.0.0.1:1080', expected: true, desc: 'socks5h proxy' },
  { proxy: 'http://insecure-cleartext:8080', expected: false, desc: 'cleartext http proxy' },
  { proxy: 'socks4://proxy:1080', expected: false, desc: 'socks4 proxy' },
  { proxy: 'pac-script://data:text/javascript;alert(1)', expected: false, desc: 'PAC script proxy' },
  { proxy: 'https://admin:pass@proxy.com:8443', expected: false, desc: 'proxy with embedded credentials' },
  { proxy: 'javascript:alert(1)', expected: false, desc: 'javascript: proxy' },
  { proxy: 'file:///etc/passwd', expected: false, desc: 'file: proxy' },
  { proxy: 'ftp://proxy.com', expected: false, desc: 'ftp: proxy' },
  { proxy: 'data:text/plain,foo', expected: false, desc: 'data: proxy' },
  { proxy: '', expected: false, desc: 'empty proxy' },
  { proxy: null, expected: false, desc: 'null proxy' },
  { proxy: '   ', expected: false, desc: 'whitespace-only proxy' },
];

for (const vec of PROXY_VECTORS) {
  const res = isValidSecureProxy(vec.proxy as any);
  assert(
    res === vec.expected,
    'set-vpn Proxy Scheme Validation',
    vec.desc,
    `proxy: ${JSON.stringify(vec.proxy)} | Expected: ${vec.expected} | Got: ${res}`
  );
}

assert(
  normalizeProxyForChromium('socks5h://127.0.0.1:1080') === 'socks5://127.0.0.1:1080',
  'set-vpn Chromium Proxy Normalisation',
  'socks5h is mapped to socks5 so Chromium cannot fall back to direct://',
  `Got: ${normalizeProxyForChromium('socks5h://127.0.0.1:1080')}`
);

// =========================================================================
// SUMMARY & VERDICT
// =========================================================================
console.log('\n================================================================');
console.log('ADVERSARIAL VERIFICATION SUITE SUMMARY');
console.log('================================================================');

const totalTests = results.length;
const passCount = results.filter(r => r.status === 'PASS').length;
const failCount = results.filter(r => r.status === 'FAIL').length;

console.log(`TOTAL ADVERSARIAL TESTS : ${totalTests}`);
console.log(`PASSED                  : ${passCount}`);
console.log(`FAILED                  : ${failCount}\n`);

if (failCount > 0) {
  console.error('ADVERSARIAL TEST SUITE FAILED!');
  for (const r of results.filter(r => r.status === 'FAIL')) {
    console.error(`  - [FAIL] [${r.suite}] ${r.name}: ${r.details}`);
  }
  process.exit(1);
} else {
  console.log('ALL ADVERSARIAL EMPIRICAL TESTS PASSED CLEANLY (0 VULNERABILITIES DETECTED).');
}
