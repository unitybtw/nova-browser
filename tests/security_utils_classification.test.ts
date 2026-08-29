import assert from 'node:assert/strict';
import { extractHostname, checkPhishingDomain, getUrlSecurityInfo, setBlocklist } from '../src/utils/securityUtils';

console.log('\n--- Security Utilities & Phishing Classification Suite ---');

// 1. Hostname Extraction
assert.equal(extractHostname('https://WWW.Example.COM/path?query=1'), 'www.example.com');
assert.equal(extractHostname('http://localhost:3000'), 'localhost');
assert.equal(extractHostname('not a url'), '');
assert.equal(extractHostname(''), '');

// 2. Phishing Keyword Detection
assert.equal(checkPhishingDomain('https://paypal-verify-account.com/login'), true);
assert.equal(checkPhishingDomain('http://bank-security-alert.net'), true);
assert.equal(checkPhishingDomain('https://free-robux-generator.xyz'), true);
assert.equal(checkPhishingDomain('https://github.com'), false);
assert.equal(checkPhishingDomain('https://google.com'), false);

// 3. Blocklist matching
setBlocklist(['malware-site.com', 'phishing-hub.org']);
assert.equal(checkPhishingDomain('https://malware-site.com/payload.exe'), true);
assert.equal(checkPhishingDomain('https://sub.phishing-hub.org/login'), true);
assert.equal(checkPhishingDomain('https://safe-site.com'), false);

// 4. Security Level Classification
const secureInfo = getUrlSecurityInfo('https://github.com/unitybtw');
assert.equal(secureInfo.level, 'secure');
assert.equal(secureInfo.label, 'Secure');

const httpInfo = getUrlSecurityInfo('http://insecure-http-site.com');
assert.equal(httpInfo.level, 'http');
assert.equal(httpInfo.label, 'Not Secure');

const internalInfo = getUrlSecurityInfo('nova://settings');
assert.equal(internalInfo.level, 'internal');

const dangerousInfo = getUrlSecurityInfo('https://paypal-verify-account.com');
assert.equal(dangerousInfo.level, 'dangerous');
assert.equal(dangerousInfo.label, 'Dangerous');

console.log('[PASS] [Security Utils] Hostname extraction, phishing heuristics, blocklist matching, and security levels validated.');
