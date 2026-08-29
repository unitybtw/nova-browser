import assert from 'node:assert/strict';
import { isSafeNavigationUrl } from '../src/utils/safeNavigation';

console.log('\n--- Safe Navigation Comprehensive Suite ---');

const VALID_HTTP_URLS = [
  'https://google.com',
  'https://www.github.com/unitybtw/nova-browser',
  'http://localhost:3000/dashboard',
  'http://127.0.0.1:8080',
  'https://sub.domain.co.uk:8443/path?query=1&item=test#section',
  'https://en.wikipedia.org/wiki/Web_browser#History'
];

const BLOCKED_DANGEROUS_PAYLOADS = [
  // Dangerous schemes
  'javascript:alert(1)',
  'JavaScript:alert(document.cookie)',
  'JAVASCRIPT:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'data:image/svg+xml,<svg onload=alert(1)>',
  'data:application/json,{"evil":true}',
  'vbscript:msgbox("hello")',
  'file:///etc/passwd',
  'file:///C:/Windows/System32/drivers/etc/hosts',
  'blob:https://example.com/uuid-here',
  'view-source:https://google.com',
  'devtools://devtools/bundled/inspector.html',
  'chrome://settings',
  'edge://flags',
  
  // Embedded credentials (CVE-like phishing vectors)
  'https://admin:password@google.com',
  'http://user:pass@192.168.1.1',
  'https://victim:secret@attacker.com/login',

  // Control characters and CRLF injection
  'https://google.com\r\nSet-Cookie: session=evil',
  'https://google.com\x00/evil',
  'https://google.com\x1b[31m',
  'https://google.com\t',
  ' https://google.com',
  'https://google.com ',

  // Obfuscated and percent-encoded evasion vectors
  '%6a%61%76%61%73%63%72%69%70%74%3aalert(1)',
  '%64%61%74%61%3atext/html,alert(1)',
  '%66%69%6c%65%3a///etc/passwd',
  'j\x00avascript:alert(1)',
  'java\x0ascript:alert(1)',

  // Invalid or spoofed internal pages
  'nova://evil',
  'nova://settings/malicious',
  'nova://settings?user=admin',
  'nova://settings#invalid-fragment',
  'nova://newtab#random',
  'nova://history#anchor',
  'nova://downloads/file',
  'about:config',
  'about:srcdoc',
  'about:memory'
];

const VALID_INTERNAL_PAGES = [
  'nova://newtab',
  'nova://settings',
  'nova://settings#extensions',
  'nova://settings#mcp',
  'nova://history',
  'nova://downloads',
  'about:blank',
  'about:settings',
  'about:history',
  'about:downloads',
  'about:newtab'
];

let validCount = 0;
for (const url of VALID_HTTP_URLS) {
  assert.equal(isSafeNavigationUrl(url), true, `Expected valid HTTP(S) URL to pass: ${url}`);
  validCount++;
}

let internalCount = 0;
for (const url of VALID_INTERNAL_PAGES) {
  assert.equal(isSafeNavigationUrl(url), true, `Expected valid internal page to pass: ${url}`);
  internalCount++;
}

let blockedCount = 0;
for (const payload of BLOCKED_DANGEROUS_PAYLOADS) {
  assert.equal(isSafeNavigationUrl(payload), false, `Expected dangerous payload to be blocked: ${payload}`);
  blockedCount++;
}

console.log(`[PASS] [Safe Navigation] Validated ${validCount} HTTP(S) targets, ${internalCount} internal pages, and strictly blocked ${blockedCount} hostile evasion vectors.`);
