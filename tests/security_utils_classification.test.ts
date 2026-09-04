import assert from 'node:assert/strict';
import { extractHostname, checkPhishingDomain, getUrlSecurityInfo, setBlocklist } from '../src/utils/securityUtils';

console.log('\n--- Security Utilities & Phishing Classification Suite ---');

// 1. Hostname Extraction
assert.equal(extractHostname('https://WWW.Example.COM/path?query=1'), 'www.example.com');
assert.equal(extractHostname('http://localhost:3000'), 'localhost');
assert.equal(extractHostname('not a url'), '');
assert.equal(extractHostname(''), '');

// 2. Homograph & Structural Phishing Detection (Punycode & Credential Obfuscation)
assert.equal(checkPhishingDomain('https://xn--pple-43d.com/login'), true); // IDN homograph spoofing targeting apple
assert.equal(checkPhishingDomain('https://xn--mnchen-3ya.de'), false); // Legitimate German IDN (münchen.de) must not be blocked
assert.equal(checkPhishingDomain('https://xn--trk-goa2g.org'), false); // Legitimate Turkish IDN (türkçe.org) must not be blocked
assert.equal(checkPhishingDomain('https://paypal.com@evil-phishing.com/signin'), true); // Basic auth credential spoofing
assert.equal(checkPhishingDomain('https://security-alert.cisco.com'), false); // Legitimate domain with security keyword (no false positive)
assert.equal(checkPhishingDomain('https://billing-update.aws.amazon.com'), false); // Legitimate domain with billing keyword (no false positive)
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

const dangerousInfo = getUrlSecurityInfo('https://sub.phishing-hub.org/login');
assert.equal(dangerousInfo.level, 'dangerous');
assert.equal(dangerousInfo.label, 'Dangerous');

console.log('[PASS] [Security Utils] Hostname extraction, structural heuristics, blocklist matching, and security levels validated.');
