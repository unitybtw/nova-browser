import { normalizeNavigationUrl, getCleanDomain } from '../src/components/SpeedDialIcon';
import { isSafeNavigationUrl } from '../src/utils/safeNavigation';

console.log('--- Speed Dial Icons & Navigation Links Test Suite ---');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
}

// 1. URL Normalization
assert(normalizeNavigationUrl('wikipedia.org') === 'https://wikipedia.org', 'Failed to normalize naked wikipedia domain');
assert(normalizeNavigationUrl('github.com') === 'https://github.com', 'Failed to normalize naked github domain');
assert(normalizeNavigationUrl('https://google.com') === 'https://google.com', 'Mutated already valid https URL');
assert(normalizeNavigationUrl('http://localhost:3000') === 'http://localhost:3000', 'Mutated valid http URL');
assert(normalizeNavigationUrl('nova://settings') === 'nova://settings', 'Altered internal nova scheme');
assert(normalizeNavigationUrl('nova://history') === 'nova://history', 'Altered internal nova history scheme');
assert(normalizeNavigationUrl('  https://youtube.com  ') === 'https://youtube.com', 'Failed to trim whitespace');
assert(normalizeNavigationUrl('') === '', 'Empty string normalization failed');
console.log('[PASS] [SpeedDial-1] URL normalization preserves schemes and safely prepends https.');

// 2. Domain Extraction
assert(getCleanDomain('https://www.wikipedia.org/wiki/Main_Page') === 'wikipedia.org', 'Domain extraction failed for full wikipedia URL');
assert(getCleanDomain('github.com') === 'github.com', 'Domain extraction failed for naked domain');
assert(getCleanDomain('https://www.google.com?q=test') === 'google.com', 'Domain extraction failed for query parameter URL');
assert(getCleanDomain('www.reddit.com') === 'reddit.com', 'Domain extraction failed for www prefix');
assert(getCleanDomain('nova://settings') === 'settings', 'Domain extraction failed for internal nova URL');
console.log('[PASS] [SpeedDial-2] Domain extraction correctly parses hostnames and strips www.');

// 3. Security Guarantee
assert(isSafeNavigationUrl(normalizeNavigationUrl('wikipedia.org')), 'Normalized wikipedia URL rejected by safe navigation');
assert(isSafeNavigationUrl(normalizeNavigationUrl('github.com')), 'Normalized github URL rejected by safe navigation');
assert(!isSafeNavigationUrl(normalizeNavigationUrl('javascript:alert(1)')), 'Dangerous javascript: URL accepted');
assert(!isSafeNavigationUrl(normalizeNavigationUrl('data:text/html,evil')), 'Dangerous data: URL accepted');
assert(!isSafeNavigationUrl(normalizeNavigationUrl('blob:https://evil.com')), 'Dangerous blob: URL accepted');
console.log('[PASS] [SpeedDial-3] Safe navigation verified for normalized URLs.');

console.log('[PASS] All speed dial icon and link tests passed cleanly.');
