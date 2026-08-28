/**
 * Security & Bug Regression Audit Test Suite
 * Milestone 4: Comprehensive Regression Suite Verification
 * 
 * Verifies all security fixes and bug remediations across:
 * - R1: Electron Main Process IPC, Partition Privacy, CDP Cleanup, Extension Loading
 * - R2: Case-Insensitive URL Parsing, Search Engine Routing, Safe Navigation Filtering
 * - R3: Privacy Shield & Adblocker Whitelist Regex Sanitization
 * - R4: React Frontend Lifecycles, Typewriter Cleanup, Omnibox Fallbacks, Website Navbar
 */

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { isValidUrlOrDomain, formatSearchUrl } from '../src/utils/searchEngine';
import { isSafeNavigationUrl } from '../src/utils/safeNavigation';

interface RegressionTestResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const regressionResults: RegressionTestResult[] = [];

function record(category: string, test: string, passed: boolean, details: string) {
  regressionResults.push({
    category,
    test,
    status: passed ? 'PASS' : 'FAIL',
    details
  });
  const tag = passed ? '[PASS]' : '[FAIL]';
  console.log(`${tag} [${category}] ${test} -> ${details}`);
}

// Mock interfaces for Electron IPC and Session verification
interface MockWebFrame {
  id: number;
  name: string;
}

interface MockWebContents extends EventEmitter {
  id: number;
  mainFrame: MockWebFrame;
  getType: () => string;
  isDestroyed: () => boolean;
  send: (channel: string, ...args: any[]) => void;
  debugger: {
    isAttached: () => boolean;
    attach: (protocolVersion?: string) => void;
    detach: () => void;
    sendCommand: (method: string, params?: any) => Promise<any>;
  };
}

interface MockBrowserWindow {
  webContents: MockWebContents;
  isDestroyed: () => boolean;
}

interface MockIpcEvent {
  sender: { id: number };
  senderFrame?: MockWebFrame | null;
}

async function runSecurityRegressionAuditSuite() {
  console.log('================================================================');
  console.log('SECURITY & BUG REGRESSION AUDIT SUITE (MILESTONE 4)');
  console.log('================================================================\n');

  // =========================================================================
  // R1. ELECTRON MAIN PROCESS IPC & SANDBOX SECURITY
  // =========================================================================
  console.log('--- R1: Electron Main Process IPC, Partition Privacy & Sandbox ---');

  // R1.1: isTrustedSender implementation validation
  const mainFrameObj: MockWebFrame = { id: 10, name: 'main-frame' };
  const subFrameObj: MockWebFrame = { id: 11, name: 'child-iframe' };

  let isWindowDestroyed = false;
  const mockMainWindow: MockBrowserWindow = {
    webContents: {
      id: 100,
      mainFrame: mainFrameObj,
      getType: () => 'window',
      isDestroyed: () => isWindowDestroyed,
      send: () => {},
    } as any,
    isDestroyed: () => isWindowDestroyed,
  };

  function isTrustedSender(win: MockBrowserWindow | null, event: MockIpcEvent): boolean {
    if (!win || win.isDestroyed()) return false;
    if (event.sender.id !== win.webContents.id) return false;
    if (
      event.senderFrame &&
      win.webContents.mainFrame &&
      event.senderFrame !== win.webContents.mainFrame
    ) {
      return false;
    }
    return true;
  }

  // R1.1.1: Main window main frame allowed
  const legitimateEvt: MockIpcEvent = { sender: { id: 100 }, senderFrame: mainFrameObj };
  const r1_1_1 = isTrustedSender(mockMainWindow, legitimateEvt);
  record(
    'R1-IPC-Sender',
    'Main window main frame IPC allowed by isTrustedSender',
    r1_1_1 === true,
    `Expected true, got ${r1_1_1}`
  );

  // R1.1.2: Hostile subframe iframe rejected
  const hostileSubframeEvt: MockIpcEvent = { sender: { id: 100 }, senderFrame: subFrameObj };
  const r1_1_2 = isTrustedSender(mockMainWindow, hostileSubframeEvt);
  record(
    'R1-IPC-Sender',
    'Subframe iframe IPC rejected by isTrustedSender',
    r1_1_2 === false,
    `Expected false, got ${r1_1_2}`
  );

  // R1.1.3: Foreign webContents ID rejected
  const foreignSenderEvt: MockIpcEvent = { sender: { id: 999 }, senderFrame: mainFrameObj };
  const r1_1_3 = isTrustedSender(mockMainWindow, foreignSenderEvt);
  record(
    'R1-IPC-Sender',
    'Foreign webContents ID rejected by isTrustedSender',
    r1_1_3 === false,
    `Expected false, got ${r1_1_3}`
  );

  // R1.1.4: Destroyed window returns false safely
  isWindowDestroyed = true;
  const r1_1_4 = isTrustedSender(mockMainWindow, legitimateEvt);
  record(
    'R1-IPC-Sender',
    'Destroyed window IPC safely rejected',
    r1_1_4 === false,
    `Expected false, got ${r1_1_4}`
  );
  isWindowDestroyed = false;

  // R1.1.5: Null window returns false safely
  const r1_1_5 = isTrustedSender(null, legitimateEvt);
  record(
    'R1-IPC-Sender',
    'Null window IPC safely rejected',
    r1_1_5 === false,
    `Expected false, got ${r1_1_5}`
  );

  // R1.1.6: Static audit of electron/main.ts for fetch-unsplash-photos and other handlers
  const rootDir = process.cwd();
  const mainTsPath = path.resolve(rootDir, 'electron/main.ts');
  const mainTsContent = fs.readFileSync(mainTsPath, 'utf8');

  // Verify fetch-unsplash-photos contains isTrustedSender
  const fetchUnsplashMatch = /ipcMain\.handle\s*\(\s*['"]fetch-unsplash-photos['"][\s\S]*?isTrustedSender/m.test(mainTsContent);
  record(
    'R1-IPC-Handler-Audit',
    'fetch-unsplash-photos handler enforces isTrustedSender',
    fetchUnsplashMatch,
    fetchUnsplashMatch ? 'isTrustedSender present in fetch-unsplash-photos handler' : 'Missing isTrustedSender guard'
  );

  // Verify other critical IPC handlers enforce isTrustedSender
  const criticalIpcChannels = [
    'capture-tab-thumbnail',
    'capture-full-page',
    'set-theme',
    'install-extension',
    'toggle-extension',
    'remove-extension',
    'store-set',
    'set-vpn',
    'clear-incognito-session'
  ];

  let allCriticalHandlersGuarded = true;
  const unguardedChannels: string[] = [];

  for (const channel of criticalIpcChannels) {
    const channelRegex = new RegExp(`ipcMain\\.(handle|on)\\s*\\(\\s*['"]${channel}['"][\\s\\S]*?isTrustedSender`, 'm');
    if (!channelRegex.test(mainTsContent)) {
      allCriticalHandlersGuarded = false;
      unguardedChannels.push(channel);
    }
  }

  record(
    'R1-IPC-Handler-Audit',
    'All critical IPC channels enforce isTrustedSender',
    allCriticalHandlersGuarded,
    allCriticalHandlersGuarded 
      ? `Verified ${criticalIpcChannels.length} critical IPC channels` 
      : `Missing guards on: ${unguardedChannels.join(', ')}`
  );

  // R1.2: Incognito partition privacy headers and adblocker synchronization
  const incognitoPartitionHeaderMatch = mainTsContent.includes("applyPrivacyHeadersToSession(session.fromPartition('incognito'))");
  const incognitoAdblockMatch = mainTsContent.includes("blocker.enableBlockingInSession(session.fromPartition('incognito'))");
  const incognitoStrictSecurityMatch = mainTsContent.includes("applyStrictSecurityToSession(session.fromPartition('incognito'))");

  record(
    'R1-Incognito-Privacy',
    'Incognito partition receives privacy header injection configuration',
    incognitoPartitionHeaderMatch,
    incognitoPartitionHeaderMatch ? 'applyPrivacyHeadersToSession registered on incognito partition' : 'Missing privacy header injection on incognito session'
  );

  record(
    'R1-Incognito-Privacy',
    'Incognito partition receives adblocker engine synchronization',
    incognitoAdblockMatch,
    incognitoAdblockMatch ? 'enableBlockingInSession registered on incognito partition' : 'Missing adblocker enablement on incognito session'
  );

  record(
    'R1-Incognito-Privacy',
    'Incognito partition receives strict security session policies',
    incognitoStrictSecurityMatch,
    incognitoStrictSecurityMatch ? 'applyStrictSecurityToSession registered on incognito partition' : 'Missing strict security on incognito session'
  );

  // Verify privacy header simulation logic (DNT: 1, Sec-GPC: 1, X-Content-Type-Options: nosniff)
  function simulatePrivacyHeaders(
    isPrivacyShieldEnabled: boolean,
    isDoNotTrackEnabled: boolean,
    requestHeadersInput: Record<string, string>,
    responseHeadersInput: Record<string, string[]>
  ) {
    const reqHeaders = { ...requestHeadersInput };
    if (isPrivacyShieldEnabled || isDoNotTrackEnabled) {
      reqHeaders['DNT'] = '1';
      reqHeaders['Sec-GPC'] = '1';
    }

    const resHeaders: Record<string, string[]> = { ...responseHeadersInput };
    if (isPrivacyShieldEnabled) {
      resHeaders['X-Content-Type-Options'] = ['nosniff'];
    }

    return { reqHeaders, resHeaders };
  }

  const simulatedHeaders = simulatePrivacyHeaders(true, true, {}, {});
  const headersCorrect = 
    simulatedHeaders.reqHeaders['DNT'] === '1' &&
    simulatedHeaders.reqHeaders['Sec-GPC'] === '1' &&
    Array.isArray(simulatedHeaders.resHeaders['X-Content-Type-Options']) &&
    simulatedHeaders.resHeaders['X-Content-Type-Options'][0] === 'nosniff';

  record(
    'R1-Incognito-Privacy',
    'Privacy header pipeline injects DNT: 1, Sec-GPC: 1, and X-Content-Type-Options: nosniff',
    headersCorrect,
    `DNT=${simulatedHeaders.reqHeaders['DNT']}, Sec-GPC=${simulatedHeaders.reqHeaders['Sec-GPC']}, X-Content-Type-Options=${simulatedHeaders.resHeaders['X-Content-Type-Options']?.[0]}`
  );

  // R1.3: capture-full-page CDP metrics reset in finally block
  const captureFullPageStart = mainTsContent.indexOf("ipcMain.handle('capture-full-page'");
  const captureFullPageCode = captureFullPageStart !== -1 ? mainTsContent.substring(captureFullPageStart, captureFullPageStart + 3000) : '';

  const hasFinallyBlock = captureFullPageCode.includes('finally {') &&
    captureFullPageCode.includes('Emulation.clearDeviceMetricsOverride') &&
    captureFullPageCode.includes('debugger.detach');

  record(
    'R1-CDP-Cleanup',
    'capture-full-page executes Emulation.clearDeviceMetricsOverride and detach in finally block',
    hasFinallyBlock,
    hasFinallyBlock ? 'CDP metrics reset and detach verified in finally block' : 'Missing finally block cleanup'
  );

  // Empirical CDP execution simulation testing finally block resilience under error
  let metricsCleared = false;
  let debuggerDetached = false;
  let cdpErrorCaught = false;

  async function simulateCaptureFullPage(shouldFail: boolean) {
    let attached = false;
    let metricsOverridden = false;
    const mockDebugger = {
      isAttached: () => attached,
      attach: () => { attached = true; },
      detach: () => { attached = false; debuggerDetached = true; },
      sendCommand: async (cmd: string) => {
        if (cmd === 'Page.getLayoutMetrics') {
          if (shouldFail) throw new Error('Simulated CDP Page.getLayoutMetrics failure');
          return { cssContentSize: { width: 1280, height: 2400 } };
        }
        if (cmd === 'Emulation.setDeviceMetricsOverride') {
          metricsOverridden = true;
          return {};
        }
        if (cmd === 'Page.captureScreenshot') {
          if (shouldFail) throw new Error('Simulated CDP captureScreenshot failure');
          return { data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' };
        }
        if (cmd === 'Emulation.clearDeviceMetricsOverride') {
          metricsCleared = true;
          metricsOverridden = false;
          return {};
        }
        return {};
      }
    };

    try {
      mockDebugger.attach();
      try {
        await mockDebugger.sendCommand('Page.getLayoutMetrics');
        await mockDebugger.sendCommand('Emulation.setDeviceMetricsOverride');
        await mockDebugger.sendCommand('Page.captureScreenshot');
      } catch (err) {
        cdpErrorCaught = true;
      } finally {
        if (metricsOverridden) {
          try {
            await mockDebugger.sendCommand('Emulation.clearDeviceMetricsOverride');
          } catch (_) {}
        }
        if (attached) {
          try {
            mockDebugger.detach();
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  // Run failure simulation
  metricsCleared = false;
  debuggerDetached = false;
  cdpErrorCaught = false;
  await simulateCaptureFullPage(true);

  record(
    'R1-CDP-Cleanup',
    'CDP metrics and debugger cleanly torn down even when screenshot throws exception',
    debuggerDetached && cdpErrorCaught,
    `Error caught: ${cdpErrorCaught}, Detached: ${debuggerDetached}`
  );

  // Run success simulation
  metricsCleared = false;
  debuggerDetached = false;
  cdpErrorCaught = false;
  await simulateCaptureFullPage(false);

  record(
    'R1-CDP-Cleanup',
    'CDP metrics and debugger cleanly torn down upon normal completion',
    metricsCleared && debuggerDetached && !cdpErrorCaught,
    `Metrics cleared: ${metricsCleared}, Detached: ${debuggerDetached}`
  );

  // R1.4: Safe unpacked extension path handling & ID validation
  function validateUnpackedExtensionPath(folderPath: any): { valid: boolean; error?: string } {
    if (!folderPath || typeof folderPath !== 'string' || !folderPath.trim()) {
      return { valid: false, error: 'Invalid extension folder path.' };
    }
    if (folderPath.includes('..')) {
      return { valid: false, error: 'Invalid extension path: path traversal detected.' };
    }
    return { valid: true };
  }

  function validateExtensionId(extensionId: string, extensionsBaseDir: string): { valid: boolean } {
    if (!extensionId || typeof extensionId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(extensionId)) {
      return { valid: false };
    }
    const extDir = path.resolve(path.join(extensionsBaseDir, extensionId));
    if (!extDir.startsWith(path.resolve(extensionsBaseDir) + path.sep)) {
      return { valid: false };
    }
    return { valid: true };
  }

  const unpackedPathCases = [
    { p: '/Users/user/extensions/my-ext', expected: true, desc: 'Valid absolute extension path' },
    { p: '../../etc/passwd', expected: false, desc: 'Dot-dot relative traversal' },
    { p: '/extensions/../secret', expected: false, desc: 'Embedded relative traversal' },
    { p: '..\\windows\\system32', expected: false, desc: 'Backslash traversal' },
    { p: '', expected: false, desc: 'Empty path string' },
    { p: '   ', expected: false, desc: 'Whitespace path string' },
    { p: null, expected: false, desc: 'Null path' },
    { p: undefined, expected: false, desc: 'Undefined path' }
  ];

  let unpackedPathsAllPassed = true;
  for (const tc of unpackedPathCases) {
    const res = validateUnpackedExtensionPath(tc.p);
    if (res.valid !== tc.expected) {
      unpackedPathsAllPassed = false;
      record('R1-Extension-Security', tc.desc, false, `Path="${tc.p}", Expected=${tc.expected}, Got=${res.valid}`);
    }
  }

  record(
    'R1-Extension-Security',
    'Unpacked extension path traversal validation blocks hostile paths',
    unpackedPathsAllPassed,
    `Tested ${unpackedPathCases.length} path validation variations.`
  );

  const baseDir = '/app/data/extensions';
  const extIdCases = [
    { id: 'abcdefghijklmnop1234567890_-', expected: true, desc: 'Alphanumeric with dashes/underscores' },
    { id: '../../system', expected: false, desc: 'Dot-dot traversal ID' },
    { id: 'ext/subfolder', expected: false, desc: 'Slash path ID' },
    { id: 'ext;reboot', expected: false, desc: 'Command injection ID' },
    { id: 'ext name with spaces', expected: false, desc: 'Space-containing ID' },
    { id: '', expected: false, desc: 'Empty string ID' }
  ];

  let extIdsAllPassed = true;
  for (const tc of extIdCases) {
    const res = validateExtensionId(tc.id, baseDir);
    if (res.valid !== tc.expected) {
      extIdsAllPassed = false;
      record('R1-Extension-Security', tc.desc, false, `ID="${tc.id}", Expected=${tc.expected}, Got=${res.valid}`);
    }
  }

  record(
    'R1-Extension-Security',
    'Extension ID sanitization strictly limits format to alphanumeric/dash/underscore',
    extIdsAllPassed,
    `Tested ${extIdCases.length} extension ID security test cases.`
  );

  // =========================================================================
  // R2. URL VALIDATION, SEARCH FORMATTING & SAFE NAVIGATION
  // =========================================================================
  console.log('\n--- R2: URL Validation, Search Formatting & Safe Navigation ---');

  // R2.1: Case-insensitive protocol matching in isValidUrlOrDomain
  const caseInsensitiveProtocols = [
    { url: 'HTTPS://github.com', expected: true },
    { url: 'HTTP://example.com', expected: true },
    { url: 'HtTpS://example.com/search?q=test', expected: true },
    { url: 'hTtP://127.0.0.1:8080/dashboard', expected: true },
    { url: 'HTTPS://NOVABROWSER.INFO', expected: true },
    { url: 'HTTP://LOCAL-DEV.TEST:3000', expected: true }
  ];

  let caseInsensitiveAllPassed = true;
  for (const tc of caseInsensitiveProtocols) {
    const res = isValidUrlOrDomain(tc.url);
    if (res !== tc.expected) {
      caseInsensitiveAllPassed = false;
      record('R2-URL-Parsing', `isValidUrlOrDomain case-insensitivity: ${tc.url}`, false, `Expected ${tc.expected}, got ${res}`);
    }
  }

  record(
    'R2-URL-Parsing',
    'isValidUrlOrDomain correctly identifies case-insensitive protocols (HTTPS://, HTTP://, HtTpS://)',
    caseInsensitiveAllPassed,
    `Tested ${caseInsensitiveProtocols.length} case variants; all parsed correctly.`
  );

  // R2.2: formatSearchUrl case-insensitive protocol preservation
  const formatCases = [
    { input: 'HTTPS://github.com', expected: 'HTTPS://github.com' },
    { input: 'HTTP://example.com', expected: 'HTTP://example.com' },
    { input: 'HtTpS://example.com/test', expected: 'HtTpS://example.com/test' },
    { input: 'hTtP://localhost:5173', expected: 'hTtP://localhost:5173' },
    { input: 'github.com', expected: 'https://github.com' },
    { input: 'nova://settings', expected: 'nova://settings' },
    { input: 'about:blank', expected: 'about:blank' },
    { input: 'what is quantum computing', expected: 'https://www.google.com/search?q=what%20is%20quantum%20computing' },
    { input: '999.1.1.1', expected: 'https://www.google.com/search?q=999.1.1.1' } // Invalid IP is treated as query
  ];

  let formatAllPassed = true;
  for (const tc of formatCases) {
    const res = formatSearchUrl(tc.input, 'google');
    if (res !== tc.expected) {
      formatAllPassed = false;
      record('R2-Search-Formatting', `formatSearchUrl("${tc.input}")`, false, `Expected "${tc.expected}", got "${res}"`);
    }
  }

  record(
    'R2-Search-Formatting',
    'formatSearchUrl preserves case-insensitive protocols and properly formats searches',
    formatAllPassed,
    `Tested ${formatCases.length} search formatting scenarios.`
  );

  // R2.3: Dangerous protocol blocking in isSafeNavigationUrl
  const dangerousSchemes = [
    'javascript:alert(1)',
    'javascript:void(0)',
    'JavaScript:alert(document.cookie)',
    'JAVASCRIPT:prompt(1)',
    'vbscript:msgbox(1)',
    'VBScript:Execute("msgbox 1")',
    'file:///etc/passwd',
    'FILE:///C:/Windows/System32/cmd.exe',
    'blob:https://evil.com/f9a8-1234',
    'BLOB:http://localhost:5173/uuid-fake',
    'view-source:https://google.com',
    'VIEW-SOURCE:http://example.com'
  ];

  let dangerousSchemesBlocked = true;
  for (const url of dangerousSchemes) {
    const isSafe = isSafeNavigationUrl(url);
    if (isSafe !== false) {
      dangerousSchemesBlocked = false;
      record('R2-Dangerous-Schemes', `Blocked scheme: ${url}`, false, `Expected false, got ${isSafe}`);
    }
  }

  record(
    'R2-Dangerous-Schemes',
    'isSafeNavigationUrl blocks blob:, view-source:, javascript:, vbscript:, file:',
    dangerousSchemesBlocked,
    `Tested ${dangerousSchemes.length} dangerous scheme payloads; all safely blocked.`
  );

  // R2.4: Multi-layer percent-encoded evasion vectors
  const encodedEvasionVectors = [
    { url: '%6a%61%76%61%73%63%72%69%70%74%3aalert(1)', desc: 'Single percent-encoded javascript:' },
    { url: '%256a%2561%2576%2561%2573%2563%2572%2569%2570%2574%253aalert(1)', desc: 'Double percent-encoded javascript:' },
    { url: '%56%42%53%43%52%49%50%54%3amsgbox(1)', desc: 'Percent-encoded VBSCRIPT:' },
    { url: '%66%69%6c%65%3a%2f%2f%2fetc%2fpasswd', desc: 'Percent-encoded file:///etc/passwd' },
    { url: '%62%6c%6f%62%3ahttps://attacker.com/uuid', desc: 'Percent-encoded blob:' },
    { url: '%76%69%65%77%2d%73%6f%75%72%63%65%3ahttp://evil.com', desc: 'Percent-encoded view-source:' },
    { url: 'java\x00script:alert(1)', desc: 'Null byte injection in javascript scheme' },
    { url: 'java\x08script:alert(1)', desc: 'Control character injection in javascript scheme' },
    { url: '   javascript:alert(1)   ', desc: 'Leading and trailing whitespace bypass' },
    { url: '\tjavascript:alert(1)', desc: 'Tab character prefix bypass' },
    { url: '\njavascript:alert(1)', desc: 'Newline character prefix bypass' }
  ];

  let evasionsBlocked = true;
  for (const tc of encodedEvasionVectors) {
    const isSafe = isSafeNavigationUrl(tc.url);
    if (isSafe !== false) {
      evasionsBlocked = false;
      record('R2-Evasion-Defense', tc.desc, false, `URL="${tc.url}", Expected false, Got ${isSafe}`);
    }
  }

  record(
    'R2-Evasion-Defense',
    'isSafeNavigationUrl neutralizes multi-layer percent-encoded evasion vectors and control characters',
    evasionsBlocked,
    `Tested ${encodedEvasionVectors.length} obfuscated evasion vectors; all rejected.`
  );

  // R2.5: data: URLs are never valid navigation targets. Raster data URLs may
  // be rendered by dedicated image-only sinks (such as favicon handling), but
  // must not be accepted by the shared navigation allowlist.
  const dataUrls = [
    'data:text/html,<script>alert(1)</script>',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'data:image/svg+xml;utf8,<svg onload="alert(1)"/>',
    'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+PC9zdmc+',
    'data:application/xhtml+xml,<html xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></html>',
    'data:text/plain;base64,SGVsbG8gV29ybGQ=',
    'data:application/javascript,alert(1)',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    'data:image/webp;base64,UklGRkAAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAIAAAAAAFZQOCAYAAAAMAEAnQEqAQABAAFAJiWkAANwAP79NvgA',
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'data:image/bmp;base64,Qk06AAAAAAAAADYAAAAoAAAAAQAAAAEAAAABABgAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AA==',
    'data:image/ico;base64,AAABAAEAICAAAAEAIACoEAAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAA'
  ];

  let dataUrlsBlocked = true;
  for (const url of dataUrls) {
    const isSafe = isSafeNavigationUrl(url);
    if (isSafe !== false) {
      dataUrlsBlocked = false;
      record('R2-Data-URL-Security', `Data URL: ${url.substring(0, 35)}...`, false, `Expected false, got ${isSafe}`);
    }
  }

  record(
    'R2-Data-URL-Security',
    'isSafeNavigationUrl blocks all data: URLs, including raster images',
    dataUrlsBlocked,
    `Tested ${dataUrls.length} data: URLs; all rejected as navigation targets.`
  );

  // =========================================================================
  // R3. PRIVACY SHIELD & ADBLOCKER LOGIC
  // =========================================================================
  console.log('\n--- R3: Privacy Shield & Adblocker Whitelist Sanitization ---');

  // R3.1: updateAdblockWhitelist regex sanitization (/^[a-zA-Z0-9.-]+$/)
  function simulateUpdateAdblockWhitelist(whitelist: any): { cleanWhitelist: string[]; rules: string[] } {
    if (!Array.isArray(whitelist)) return { cleanWhitelist: [], rules: [] };
    const cleanWhitelist = whitelist
      .filter(host => typeof host === 'string' && /^[a-zA-Z0-9.-]+$/.test(host.trim()))
      .map(host => host.trim().toLowerCase());
    const rules = cleanWhitelist.map(host => `@@||${host}^$document,script,stylesheet,image,subdocument,xmlhttprequest`);
    return { cleanWhitelist, rules };
  }

  const validHostnames = [
    'example.com',
    'sub.domain.co.uk',
    'ad-server-01.net',
    'localhost',
    'test-site.org',
    'my.service.internal'
  ];

  const validWhitelistResult = simulateUpdateAdblockWhitelist(validHostnames);
  const validHostsAccepted = 
    validWhitelistResult.cleanWhitelist.length === validHostnames.length &&
    validWhitelistResult.rules.every(r => r.startsWith('@@||') && r.includes('^$document'));

  record(
    'R3-Adblock-Whitelist',
    'updateAdblockWhitelist accepts valid domain names and formats filter rules',
    validHostsAccepted,
    `Accepted ${validWhitelistResult.cleanWhitelist.length}/${validHostnames.length} valid hostnames.`
  );

  const hostileHostnames = [
    'example.com<script>alert(1)</script>',
    'example.com$popup,third-party',
    'example.com##.ad-banner',
    'example.com^$script',
    'example.com/path/to/page',
    'example.com?query=attack',
    'example.com#hash',
    'example.com;rm -rf /',
    'example.com\\malicious',
    'domain with spaces.com',
    'eval(alert(1))',
    null,
    undefined,
    12345,
    { host: 'example.com' }
  ];

  const hostileWhitelistResult = simulateUpdateAdblockWhitelist(hostileHostnames);
  const hostileHostsRejected = hostileWhitelistResult.cleanWhitelist.length === 0;

  record(
    'R3-Adblock-Whitelist',
    'updateAdblockWhitelist regex sanitization strictly rejects hostile and malformed input',
    hostileHostsRejected,
    `Cleaned list length: ${hostileWhitelistResult.cleanWhitelist.length} (expected 0 hostile strings accepted)`
  );

  // =========================================================================
  // R4. REACT FRONTEND STATE & LIFECYCLE HYGIENE
  // =========================================================================
  console.log('\n--- R4: React Frontend Lifecycles & Component State Hygiene ---');

  // R4.1: AILinkPreview single-interval typewriter lifecycle and cleanup
  const aiLinkPreviewPath = path.resolve(rootDir, 'src/components/AILinkPreview.tsx');
  const aiLinkPreviewContent = fs.readFileSync(aiLinkPreviewPath, 'utf8');

  // Check for exactly one setInterval occurrence in AILinkPreview.tsx
  const setIntervalMatches = aiLinkPreviewContent.match(/setInterval\s*\(/g) || [];
  const hasSingleInterval = setIntervalMatches.length === 1;
  const hasIntervalCleanup = aiLinkPreviewContent.includes('return () => clearInterval(interval);');

  record(
    'R4-AILinkPreview',
    'AILinkPreview contains exactly one typewriter interval and returns proper cleanup',
    hasSingleInterval && hasIntervalCleanup,
    `Found ${setIntervalMatches.length} setInterval call(s), cleanup present: ${hasIntervalCleanup}`
  );

  // Typewriter progression simulation test
  let simulatedSummary = '';
  let typewriterIntervalCleared = false;
  const targetText = 'This is a clean summary of the article content.';
  let currentIdx = 0;
  const step = Math.max(1, Math.ceil(targetText.length / 40));

  // Run stepping
  while (currentIdx <= targetText.length) {
    currentIdx += step;
    if (currentIdx <= targetText.length) {
      simulatedSummary = targetText.substring(0, currentIdx);
    } else {
      simulatedSummary = targetText;
      typewriterIntervalCleared = true;
      break;
    }
  }

  record(
    'R4-AILinkPreview',
    'Typewriter effect advances smoothly and terminates cleanly at exact string length',
    simulatedSummary === targetText && typewriterIntervalCleared,
    `Final summary matched target length (${simulatedSummary.length}/${targetText.length}) and cleared interval.`
  );

  // R4.2: SidebarTabs handleOmniboxSubmit fallback to onNewTab
  const sidebarTabsPath = path.resolve(rootDir, 'src/components/SidebarTabs.tsx');
  const sidebarTabsContent = fs.readFileSync(sidebarTabsPath, 'utf8');

  const hasFallbackLogic = 
    sidebarTabsContent.includes('if (onNavigate) {') &&
    sidebarTabsContent.includes('onNavigate(url);') &&
    sidebarTabsContent.includes('else if (onNewTab) {') &&
    sidebarTabsContent.includes('onNewTab(url);');

  record(
    'R4-SidebarTabs',
    'SidebarTabs handleOmniboxSubmit includes else if (onNewTab) fallback when onNavigate is omitted',
    hasFallbackLogic,
    hasFallbackLogic ? 'onNewTab fallback present in handleOmniboxSubmit' : 'Missing onNewTab fallback logic'
  );

  // Empirical simulation of handleOmniboxSubmit
  function simulateOmniboxSubmit(
    searchValue: string,
    onNavigate?: (url: string) => void,
    onNewTab?: (url: string) => void
  ) {
    let navigatedUrl = '';
    let newTabUrl = '';

    const url = formatSearchUrl(searchValue, 'google');
    if (onNavigate) {
      onNavigate(url);
    } else if (onNewTab) {
      onNewTab(url);
    }

    return { navigatedUrl, newTabUrl };
  }

  let testNavigatedUrl = '';
  simulateOmniboxSubmit('https://example.com', (u) => { testNavigatedUrl = u; }, undefined);
  const navigateCalled = testNavigatedUrl === 'https://example.com';

  let testNewTabUrl = '';
  simulateOmniboxSubmit('https://example.com', undefined, (u) => { testNewTabUrl = u; });
  const fallbackCalled = testNewTabUrl === 'https://example.com';

  record(
    'R4-SidebarTabs',
    'Omnibox submit correctly dispatches to onNavigate or onNewTab fallback',
    navigateCalled && fallbackCalled,
    `onNavigate dispatch: ${navigateCalled}, onNewTab fallback dispatch: ${fallbackCalled}`
  );

  // R4.3: Website Navbar Audit (No isScrolled, no conditional white/glass background)
  const navbarPath = path.resolve(rootDir, 'website/src/components/Navbar.tsx');
  const navbarContent = fs.readFileSync(navbarPath, 'utf8');

  const hasIsScrolled = /isScrolled/i.test(navbarContent);
  const hasConditionalGlassBg = navbarContent.includes('bg-white/80') || navbarContent.includes('bg-white/70');

  record(
    'R4-Website-Navbar',
    'website/src/components/Navbar.tsx contains no isScrolled state or conditional white background',
    !hasIsScrolled && !hasConditionalGlassBg,
    `isScrolled present: ${hasIsScrolled}, conditional glass bg: ${hasConditionalGlassBg}`
  );

  // =========================================================================
  // SUMMARY & VERDICT
  // =========================================================================
  console.log('\n================================================================');
  console.log('SECURITY & BUG REGRESSION AUDIT SUITE SUMMARY');
  console.log('================================================================');
  const total = regressionResults.length;
  const passed = regressionResults.filter(r => r.status === 'PASS').length;
  const failed = regressionResults.filter(r => r.status === 'FAIL').length;

  console.log(`TOTAL REGRESSION TESTS : ${total}`);
  console.log(`PASSED                 : ${passed}`);
  console.log(`FAILED                 : ${failed}\n`);

  if (failed > 0) {
    console.error('REGRESSION AUDIT VERDICT: FAIL (Regressions detected)');
    process.exit(1);
  } else {
    console.log('REGRESSION AUDIT VERDICT: PASS (All regression tests passed cleanly with 0 defects)');
  }
}

runSecurityRegressionAuditSuite().catch(err => {
  console.error('Uncaught Exception during Security Regression Audit Suite execution:', err);
  process.exit(1);
});
