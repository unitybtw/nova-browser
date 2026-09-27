import assert from "assert";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loadSafeCrxZip } from "../electron/main/crxInstaller";
import JSZip from "jszip";

console.log("\n--- Adversarial Hacker Security & Vulnerability Remediation Suite ---");

// 1. Command-Line Argument Sanitization for Second-Instance — REMOVED
//
// `sanitizeCommandLineUrl` re-declared `isValidDeepLinkUrl`
// (electron/main.ts:1181) and was asserted against itself, and the copy had
// drifted from the shipped predicate: the real one also rejects anything over
// 2048 characters, rejects embedded credentials, and ACCEPTS `nova:` deep links
// from an allowlist of pages. The copy only accepted http/https, so it would
// have reported a rejection for a URL production routes to a new tab, and it
// applied no length bound at all.
//
// NEEDED EXPORT: `isValidDeepLinkUrl(targetUrl: unknown): boolean` from
// electron/main.ts:1181. As with the other main-process predicates this cannot
// be imported directly, so the right end state is an extracted module (e.g.
// electron/main/deepLink.ts) that electron/main.ts imports and a test can too.
// Note that the `app.on('second-instance')` handler at electron/main.ts:1209
// also does `possibleUrl.trim()` after the predicate, so an extracted helper
// should return the trimmed URL rather than a boolean if it is to replace the
// whole expression.

// 2. openExternal Permission Rejection — REMOVED (tautology)
//
// The body was `if (permission === "openExternal") return false; return true;`
// and the suite asserted that it returns false for "openExternal" and true for
// "media". No production code was involved; it could not fail.
//
// NEEDED EXPORT: the permission gate from the `setPermissionRequestHandler` in
// electron/main.ts (the `openExternal` branch that unconditionally denies) as a
// pure `shouldGrantPermission(permission, requestingOrigin, details): boolean`
// in an extracted electron/main/ module, so the deny decision and the origin
// check that accompanies it can be driven for real.

// 3. Popup Burst Rate Limiter — REMOVED
//
// `PopupRateLimiter` was a class written in this file re-implementing the
// `popupHistory` closure inside the real `setWindowOpenHandler`
// (electron/main.ts:3393-3420) — same 2s window, same threshold of 3 — and was
// asserted against itself. Two further details of the shipped handler had no
// counterpart here at all: the history is deleted on the webContents'
// `destroyed` event, and a permitted URL is only routed to a new tab when it is
// http/https without credentials, or a `chrome-extension:` URL whose hostname
// matches the id character set without credentials.
//
// NEEDED EXPORT: an extracted module exposing the sliding-window state as a
// pure value, e.g. `createPopupRateLimiter({ windowMs, max })` with
// `limiter.check(id, now): boolean` and `limiter.forget(id)`, plus
// `classifyPopupUrl(url): { action: 'allow-tab' } | { action: 'deny' }`, used
// by the real handler. A timer-free pure limiter is directly testable.

// 4. Dynamic MCP Port SSRF Filter — REMOVED
//
// `isMcpPortBlocked` restated the two-line check at electron/main.ts:4943-4946
// and asserted itself. The surrounding SSRF policy is substantial — private IP
// rejection, DNS pinning, scheme checks — and none of it was covered.
//
// NEEDED EXPORT: the SSRF guard from electron/main.ts (~4900-4950) as an
// extracted `electron/main/ssrfGuard.ts` exporting something like
// `resolveExternalUrl(candidate, { activeMcpPort }): { url: URL; pinnedIp: string } | { error: string }`.
// The private-IP classifier is already extracted and importable today as
// `isPrivateIP` (electron/main/ipAddress.ts:88).

// 5. IPv6 Loopback Host Header Verification — REMOVED
//
// `isAllowedHostHeader` was a local allowlist asserted against itself.
//
// NEEDED EXPORT: the host-header allowlist from the MCP server's HTTP request
// handler (electron/mcpServer.ts) as a pure `isAllowedMcpHostHeader(host, port)`
// that the handler calls, so the real allowlist — not a copy of it — is checked.

// 6. Webstore Subframe Isolation — REMOVED
//
// `isAuthorizedWebstoreSender` restated the host/path condition and was
// asserted against itself. The shipped form is at electron/main.ts:3476.
//
// NEEDED EXPORT: the Web Store sender authorisation predicate shared by
// electron/main.ts and electron/webstore-preload.ts, e.g.
// `isAuthorizedWebstoreFrame({ isMainWindow, isMainFrame, frameUrl }): boolean`.
// Both files should import the one function so the main process and the preload
// cannot disagree.

// 7. fileURLToPath Safety — KEPT
//
// This one is not a production copy: it imports Node's own `fileURLToPath` and
// asserts this suite's own file-URL handling, so it is a harness guard rather
// than a false assurance about Nova code.
const testFileUrl = process.platform === "win32"
  ? "file:///C:/path/to/my%20file.txt"
  : "file:///path/to/my%20file.txt";
const resolvedPath = fileURLToPath(testFileUrl);
assert.ok(resolvedPath.includes("my file.txt"), "fileURLToPath decodes percent encoding safely");

console.log("[PASS] [Hacker-Defense-7] Standard fileURLToPath cross-platform resolution verified.");

// 8. Test CRX3 Inner Zip Offset Calculation
// This used to be a LOCAL re-implementation of the CRX3 offset parser, which
// checked only the version byte, never validated the "Cr24" magic, and applied
// no bound to headerSize. It drifted away from the real parser while still
// reporting "offset accurately isolates zip payload" - a false assurance that
// let the real installer ship 100% broken for an entire audit round. It now
// drives the shipped parser instead.
(async () => {
  // A real zip with one entry. The shipped parser requires a local file header
  // at the declared offset and then loads the archive, so neither a 4-byte fake
  // nor an empty zip would do.
  const REAL_ZIP: Buffer = await JSZip()
    .file("manifest.json", '{"name":"t","version":"1.0.0","manifest_version":3}')
    .generateAsync({ type: "nodebuffer" });
  const buildCrx3 = (headerSize: number, magic = "Cr24", version = 3): Buffer => {
    const buf = Buffer.concat([
      Buffer.from(magic, "ascii"),
      (() => { const v = Buffer.alloc(4); v.writeUInt32LE(version, 0); return v; })(),
      (() => { const h = Buffer.alloc(4); h.writeUInt32LE(headerSize >>> 0, 0); return h; })(),
      Buffer.alloc(headerSize),
      REAL_ZIP
    ]);
    return buf;
  };

  // A well-formed CRX3 must be accepted and must yield the zip payload.
  // loadSafeCrxZip returns the LOADED archive, so proving the offset is right
  // means reading an entry back out of it - a stronger check than comparing bytes.
  const good = await loadSafeCrxZip(buildCrx3(16), fs.mkdtempSync(path.join(os.tmpdir(), "adv-crx3-")));
  const entry = await good.file("manifest.json")?.async("string");
  assert.strictEqual(entry, '{"name":"t","version":"1.0.0","manifest_version":3}',
    "a well-formed CRX3 must isolate exactly the zip payload at the declared offset");

  // The exact cases the local copy waved through.
  await assert.rejects(
    () => loadSafeCrxZip(buildCrx3(16, "Cr25"), fs.mkdtempSync(path.join(os.tmpdir(), "adv-crx3-"))),
    /magic|Unsupported|CRX/i,
    "a CRX3 with the wrong magic must be refused, not sliced"
  );
  await assert.rejects(
    () => loadSafeCrxZip(buildCrx3(16, "Cr24", 9), fs.mkdtempSync(path.join(os.tmpdir(), "adv-crx3-"))),
    /version|Unsupported|CRX/i,
    "an unknown CRX version must be refused"
  );
  await assert.rejects(
    () => loadSafeCrxZip(buildCrx3(0xffffff00), fs.mkdtempSync(path.join(os.tmpdir(), "adv-crx3-"))),
    /offset|out of bounds|CRX|zip/i,
    "an out-of-range CRX3 headerSize must be refused before any slicing"
  );

  console.log("[PASS] [Hacker-Defense-8] CRX3 container header extraction validated against the shipped parser.");
})();

// 8b. Extension Popup Blur Grace Period — REMOVED
//
// `PopupLifecycle` was a class in this file with a 50ms timer, asserted against
// its own `isClosed` field one tick later. It modelled the grace period rather
// than exercising it, and the async assertion could not observe the transition
// it claimed to test (handleBlur ran before the timer that grants the grace
// period had any chance to fire).
//
// NEEDED EXPORT: the grace-period gate from the extension-popup window handling
// in src/components/ExtensionsModal.tsx (or the Electron side that owns the
// window), as a pure `createBlurGracePeriod(delayMs)` with `grant()` and
// `shouldCloseOnBlur()`, so the real timer is the one under test.

// 9. Shipped source guards for the predicates that cannot be imported
//
// electron/main.ts is the Electron entry point and electron/webstore-preload.ts
// is a preload script; neither can be imported by a Node test. Until the
// extractions described in sections 1-6 and 9 above are done, reading the
// shipped source is the only way to assert anything true about them.
//
// Unlike the copies these guards replace, each one is falsifiable against
// production: weaken or delete the guard in the source and the assertion fails.
// The exact strings named are the ones the deleted local reimplementations
// claimed to cover, so the guarantee is reattached to the real code.
const mainSource = fs.readFileSync(
  path.join(process.cwd(), "electron", "main.ts"),
  "utf-8"
).replace(/\r\n/g, "\n");
const webstorePreloadSource = fs.readFileSync(
  path.join(process.cwd(), "electron", "webstore-preload.ts"),
  "utf-8"
).replace(/\r\n/g, "\n");

const SHIPPED_GUARDS: Array<{ source: "main" | "preload"; needle: string; desc: string }> = [
  // Section 1: deep link validation (electron/main.ts:1181).
  {
    source: "main",
    needle: "if (typeof targetUrl !== 'string' || !targetUrl.trim() || targetUrl.length > 2048) return false;",
    desc: "isValidDeepLinkUrl bounds deep link length and rejects non-strings (the local copy had no length bound)",
  },
  {
    source: "main",
    needle: "const allowedPages = new Set(['newtab', 'settings', 'history', 'downloads', 'changelog', 'whats-new', 'extensions']);",
    desc: "nova: deep links are restricted to the allowlisted pages (the local copy rejected nova: outright)",
  },
  {
    source: "main",
    needle: "if (u.username || u.password) return false;",
    desc: "deep links carrying embedded credentials are refused",
  },
  // Section 2: openExternal (electron/main.ts:1592).
  {
    source: "main",
    needle: "if (permission === 'openExternal') {",
    desc: "openExternal is gated in the real setPermissionRequestHandler",
  },
  {
    source: "main",
    needle: "return callback(false);",
    desc: "the openExternal branch denies unconditionally rather than falling through",
  },
  // Section 3: popup rate limiter (electron/main.ts:3393-3420).
  {
    source: "main",
    needle: "const popupHistory = new Map<number, number[]>();",
    desc: "popup bursts are tracked per webContents",
  },
  {
    source: "main",
    needle: "popupHistory.delete(contents.id);",
    desc: "popup history is released when the webContents is destroyed, so ids cannot leak",
  },
  {
    source: "main",
    needle: "const history = (popupHistory.get(id) || []).filter(ts => now - ts < 2000);",
    desc: "the popup limiter uses the 2s sliding window",
  },
  {
    source: "main",
    needle: "if (history.length >= 3) {",
    desc: "the popup limiter denies the fourth request inside the window",
  },
  {
    source: "main",
    needle: "const isExtension = parsed.protocol === 'chrome-extension:' && /^[a-zA-Z0-9_-]+$/.test(parsed.hostname) && !parsed.username && !parsed.password;",
    desc: "only http(s) and credential-free, id-shaped chrome-extension: popups are routed to a tab",
  },
  // Section 4: MCP port SSRF block (electron/main.ts:4945).
  {
    source: "main",
    needle: "return { error: 'Requests to MCP server port are blocked.' };",
    desc: "requests to the default and live MCP port are refused",
  },
  {
    source: "main",
    needle: "if (port === '3020' || port === activeMcpPort) {",
    desc: "both the hardcoded default port and the live port are blocked",
  },
  // Section 6: Web Store subframe isolation (electron/webstore-preload.ts:15).
  {
    source: "preload",
    needle: "const WEBSTORE_HOSTS: readonly string[] = ['chromewebstore.google.com', 'chrome.google.com'];",
    desc: "the preload authorises exactly two Web Store hosts",
  },
  {
    source: "preload",
    needle: "const isWebStoreOrigin = (origin: string): boolean =>",
    desc: "preload Web Store authorisation is origin-exact, not a suffix match",
  },
  {
    source: "preload",
    needle: "const EXTENSION_ID_SOURCE = '^[a-p]{32}$';",
    desc: "extension ids stay anchored to 32 a-p characters, shared by the page-side check and the injected shim",
  },
];

for (const guard of SHIPPED_GUARDS) {
  const haystack = guard.source === "main" ? mainSource : webstorePreloadSource;
  assert.ok(
    haystack.includes(guard.needle),
    `[Hacker-Defense-9] shipped ${guard.source === "main" ? "electron/main.ts" : "electron/webstore-preload.ts"} guard: ${guard.desc}`,
    `expected to find: ${guard.needle.slice(0, 90)}`
  );
}

console.log(`[PASS] [Hacker-Defense-9] ${SHIPPED_GUARDS.length} shipped main-process/preload security guards are still present in source.`);

// 10. Test Genuine VPN Proxy Security Validation and Chromium Normalization
import { isValidSecureProxy, normalizeProxyForChromium, getMachineSalt } from "../electron/main/proxySecurity";

assert.strictEqual(isValidSecureProxy('https://secure-proxy.org:8443'), true, 'HTTPS proxy must be accepted');
assert.strictEqual(isValidSecureProxy('socks5://127.0.0.1:1080'), true, 'SOCKS5 proxy must be accepted');
assert.strictEqual(isValidSecureProxy('socks5h://127.0.0.1:1080'), true, 'SOCKS5H proxy must be accepted');
assert.strictEqual(isValidSecureProxy('http://insecure-cleartext:8080'), false, 'HTTP cleartext proxy must be rejected');
assert.strictEqual(isValidSecureProxy('socks4://proxy:1080'), false, 'SOCKS4 proxy must be rejected');
assert.strictEqual(isValidSecureProxy('pac-script://data:text/javascript;alert(1)'), false, 'PAC script proxy must be rejected');
assert.strictEqual(isValidSecureProxy('https://admin:pass@proxy.com:8443'), false, 'Proxy with embedded credentials must be rejected');
assert.strictEqual(isValidSecureProxy(''), false, 'Empty proxy string must be rejected');
assert.strictEqual(isValidSecureProxy(null), false, 'Non-string proxy input must be rejected');

// Test that URL components preserve casing without destructive lowercasing across the whole string
assert.strictEqual(isValidSecureProxy('https://Secure-Proxy.org:8443/SecureEndpoint?AuthKey=SecretToken'), true, 'Valid HTTPS proxy with mixed-case path/query must be accepted');

// Test that socks5h is safely mapped to socks5 for Chromium setProxy to prevent fallback to direct://
assert.strictEqual(normalizeProxyForChromium('socks5h://127.0.0.1:1080'), 'socks5://127.0.0.1:1080', 'Chromium proxy normalizer must map socks5h:// to socks5://');
assert.strictEqual(normalizeProxyForChromium('SOCKS5H://10.0.0.1:9050'), 'socks5://10.0.0.1:9050', 'Case-insensitive socks5h mapping verified');

console.log("[PASS] [Hacker-Defense-10] Strict VPN proxy scheme validation rejects cleartext and malicious payloads.");

// 11. Test Sync Code Human-Friendly Normalization and Formatting
import { normalizeSyncCode, formatSyncCode } from "../src/utils/syncCodeUtils";

const rawHex = 'A1B2C3D4E5F60123456789AB';
const formatted = formatSyncCode(rawHex);
assert.strictEqual(formatted, 'nova-a1b2-c3d4-e5f6-0123-4567-89ab', 'Sync code formatting must match human-friendly nova-xxxx pattern');
assert.strictEqual(normalizeSyncCode('nova-a1b2-c3d4-e5f6-0123-4567-89ab'), rawHex, 'Hyphenated nova- prefix code must normalize to raw hex');
assert.strictEqual(normalizeSyncCode('NOVA-A1B2-C3D4-E5F6-0123-4567-89AB'), rawHex, 'Uppercase code must normalize correctly');
assert.strictEqual(normalizeSyncCode(rawHex), rawHex, 'Raw hex code must normalize to itself');
assert.strictEqual(normalizeSyncCode('  nova:a1b2 c3d4 e5f6 0123 4567 89ab  '), rawHex, 'Spaced code must normalize correctly');

console.log("[PASS] [Hacker-Defense-11] Sync chain pairing code normalization safely accepts both human-friendly and raw formats.");

// 12. Test Genuine Machine Salt Resiliency against os.userInfo throws
const normalSalt = getMachineSalt('test-context', false);
assert.strictEqual(normalSalt.length, 32, 'Normal machine salt must produce 32 bytes SHA-256');
const fallbackSalt = getMachineSalt('test-context', true);
assert.strictEqual(fallbackSalt.length, 32, 'Machine salt must survive os.userInfo() exceptions and produce 32 bytes');

console.log("[PASS] [Hacker-Defense-12] Resilient machine salt handles system environment exceptions gracefully.");


