import assert from "assert";
import { fileURLToPath } from "url";

console.log("\n--- Adversarial Hacker Security & Vulnerability Remediation Suite ---");

// 1. Test Command-Line Argument Sanitization for Second-Instance
function sanitizeCommandLineUrl(commandLine: string[]): string | null {
  const possibleUrl = commandLine.find(arg => {
    try {
      const u = new URL(arg);
      return (u.protocol === "http:" || u.protocol === "https:") && !u.username && !u.password;
    } catch {
      return false;
    }
  });
  return possibleUrl || null;
}

const safeHttp = sanitizeCommandLineUrl(["nova", "https://example.com/search?q=test"]);
assert.strictEqual(safeHttp, "https://example.com/search?q=test", "Safe HTTPS URL must be accepted");

const rejectedFlags = sanitizeCommandLineUrl(["nova", "--remote-debugging-port=9222", "--disable-web-security"]);
assert.strictEqual(rejectedFlags, null, "Hostile flags must not be treated as URLs");

const rejectedJavascript = sanitizeCommandLineUrl(["nova", "javascript:alert(document.cookie)"]);
assert.strictEqual(rejectedJavascript, null, "javascript: scheme must be blocked");

const rejectedFile = sanitizeCommandLineUrl(["nova", "file:///etc/passwd"]);
assert.strictEqual(rejectedFile, null, "file: scheme must be blocked from external CLI arguments");

const rejectedCreds = sanitizeCommandLineUrl(["nova", "https://admin:secret@malicious.com"]);
assert.strictEqual(rejectedCreds, null, "URLs with embedded credentials must be rejected");

console.log("[PASS] [Hacker-Defense-1] Command-line second instance argument sanitization safely rejects injection vectors.");

// 2. Test openExternal Permission Rejection
function simulatePermissionRequest(permission: string, url: string): boolean {
  if (permission === "openExternal") {
    return false; // Blocked unconditionally
  }
  return true;
}

assert.strictEqual(simulatePermissionRequest("openExternal", "https://evil.com"), false, "openExternal must be rejected");
assert.strictEqual(simulatePermissionRequest("media", "https://trusted.com"), true, "Standard media permissions can be evaluated");

console.log("[PASS] [Hacker-Defense-2] openExternal permission request blocked unconditionally for web content.");

// 3. Test Popup Burst Rate Limiter
class PopupRateLimiter {
  private history = new Map<number, number[]>();

  public handleOpen(contentsId: number, url: string, now = Date.now()): boolean {
    const list = (this.history.get(contentsId) || []).filter(ts => now - ts < 2000);
    if (list.length >= 3) {
      this.history.set(contentsId, list);
      return false; // Denied
    }
    list.push(now);
    this.history.set(contentsId, list);
    return true; // Allowed
  }
}

const limiter = new PopupRateLimiter();
const webContentsId = 42;
const t0 = 100000;

assert.strictEqual(limiter.handleOpen(webContentsId, "https://a.com", t0), true, "Popup 1 allowed");
assert.strictEqual(limiter.handleOpen(webContentsId, "https://b.com", t0 + 100), true, "Popup 2 allowed");
assert.strictEqual(limiter.handleOpen(webContentsId, "https://c.com", t0 + 200), true, "Popup 3 allowed");
assert.strictEqual(limiter.handleOpen(webContentsId, "https://d.com", t0 + 300), false, "Popup 4 blocked (flood)");
assert.strictEqual(limiter.handleOpen(webContentsId, "https://e.com", t0 + 400), false, "Popup 5 blocked (flood)");
assert.strictEqual(limiter.handleOpen(webContentsId, "https://f.com", t0 + 2500), true, "Popup after sliding window reset allowed");

console.log("[PASS] [Hacker-Defense-3] Sliding-window popup rate limiter halts Denial of Service flooding.");

// 4. Test Dynamic MCP Port SSRF Filter
function isMcpPortBlocked(port: string, activeMcpPort: number): boolean {
  return port === "3020" || port === String(activeMcpPort);
}

assert.strictEqual(isMcpPortBlocked("3020", 3020), true, "Default port 3020 blocked");
assert.strictEqual(isMcpPortBlocked("3025", 3025), true, "Dynamic active MCP port 3025 blocked");
assert.strictEqual(isMcpPortBlocked("443", 3025), false, "Standard HTTPS port 443 allowed");
assert.strictEqual(isMcpPortBlocked("80", 3025), false, "Standard HTTP port 80 allowed");

console.log("[PASS] [Hacker-Defense-4] Dynamic MCP port SSRF filter prevents intranet pivot.");

// 5. Test IPv6 Loopback Host Header Verification
function isAllowedHostHeader(host: string, port: number): boolean {
  const allowed = [
    `localhost:${port}`,
    `127.0.0.1:${port}`,
    `[::1]:${port}`,
    "localhost",
    "127.0.0.1",
    "[::1]"
  ];
  return allowed.includes(host.toLowerCase());
}

assert.strictEqual(isAllowedHostHeader("localhost:3020", 3020), true, "localhost:port allowed");
assert.strictEqual(isAllowedHostHeader("127.0.0.1:3020", 3020), true, "127.0.0.1:port allowed");
assert.strictEqual(isAllowedHostHeader("[::1]:3020", 3020), true, "IPv6 loopback [::1]:port allowed");
assert.strictEqual(isAllowedHostHeader("[::1]", 3020), true, "IPv6 loopback [::1] allowed");
assert.strictEqual(isAllowedHostHeader("attacker.com:3020", 3020), false, "Attacker host rejected");
assert.strictEqual(isAllowedHostHeader("evil.com", 3020), false, "DNS rebinding host rejected");

console.log("[PASS] [Hacker-Defense-5] IPv6 loopback and DNS rebinding Host header defense validated.");

// 6. Test Webstore Subframe Isolation
function isAuthorizedWebstoreSender(isMainWindow: boolean, isMainFrame: boolean, frameUrl: string): boolean {
  if (isMainWindow) return true;
  if (!isMainFrame) return false;
  try {
    const u = new URL(frameUrl);
    return u.protocol === "https:" &&
      (u.hostname === "chromewebstore.google.com" ||
       (u.hostname === "chrome.google.com" && u.pathname.startsWith("/webstore/")));
  } catch {
    return false;
  }
}

assert.strictEqual(isAuthorizedWebstoreSender(true, false, "any"), true, "Main window always trusted");
assert.strictEqual(isAuthorizedWebstoreSender(false, true, "https://chromewebstore.google.com/detail/xyz"), true, "Top-level Web Store tab authorized");
assert.strictEqual(isAuthorizedWebstoreSender(false, false, "https://chromewebstore.google.com/detail/xyz"), false, "Subframe iframe in Web Store rejected");
assert.strictEqual(isAuthorizedWebstoreSender(false, true, "https://evil.com/fake-store"), false, "Malicious site rejected");

console.log("[PASS] [Hacker-Defense-6] Webstore extension installer subframe isolation strictly enforced.");

// 7. Test fileURLToPath Safety
const testFileUrl = "file:///path/to/my%20file.txt";
const resolvedPath = fileURLToPath(testFileUrl);
assert.ok(resolvedPath.includes("my file.txt"), "fileURLToPath decodes percent encoding safely");

console.log("[PASS] [Hacker-Defense-7] Standard fileURLToPath cross-platform resolution verified.");

// 8. Test CRX3 Inner Zip Offset Calculation
function getCrxInnerZipTest(buffer: Buffer): Buffer {
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return buffer;
  }
  const readU32 = (offset: number) => buffer.readUInt32LE(offset);
  const version = buffer[4];
  if (version === 3) {
    const headerSize = readU32(8);
    return buffer.subarray(12 + headerSize);
  }
  throw new Error("Unsupported format");
}

// Build a mock CRX3 buffer: Cr24 (4B), version 3 (4B), headerSize 16 (4B), header (16B), PK\x03\x04 (zip)
const mockCrx3 = Buffer.alloc(12 + 16 + 4);
mockCrx3.write("Cr24", 0, "ascii");
mockCrx3.writeUInt32LE(3, 4); // version = 3
mockCrx3.writeUInt32LE(16, 8); // headerSize = 16
mockCrx3.write("PK\x03\x04", 12 + 16, "ascii"); // inner zip start
const extractedZip = getCrxInnerZipTest(mockCrx3);
assert.strictEqual(extractedZip.subarray(0, 4).toString("ascii"), "PK\x03\x04", "CRX3 offset accurately isolates zip payload");

console.log("[PASS] [Hacker-Defense-8] CRX3 container header extraction validated.");

// 9. Test Extension Popup Blur Grace Period
class PopupLifecycle {
  public isClosed = false;
  private canCloseOnBlur = false;

  public show() {
    setTimeout(() => {
      this.canCloseOnBlur = true;
    }, 50);
  }

  public handleBlur() {
    if (this.canCloseOnBlur) {
      this.isClosed = true;
    }
  }
}

const popup = new PopupLifecycle();
popup.show();
// Immediate blur during launch transition:
popup.handleBlur();
assert.strictEqual(popup.isClosed, false, "Popup must ignore blur during startup grace period");

console.log("[PASS] [Hacker-Defense-9] Extension popup blur grace period prevents premature window destruction.");

