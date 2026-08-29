import assert from 'node:assert/strict';

console.log('\n--- AdBlock & Privacy Shield Network Filter Engine Suite ---');

const KNOWN_TRACKER_PATTERNS = [
  'doubleclick.net',
  'google-analytics.com',
  'googletagmanager.com',
  'facebook.net/tr',
  'adnxs.com',
  'c.amazon-adsystem.com',
  'scorecardresearch.com',
  'taboola.com',
  'outbrain.com',
  'hotjar.com',
  'segment.io',
  'clarity.ms'
];

interface FilterRule {
  domain: string;
  isRegex: boolean;
  regex?: RegExp;
}

const compiledRules: FilterRule[] = KNOWN_TRACKER_PATTERNS.map(p => {
  if (p.includes('/')) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { domain: p, isRegex: true, regex: new RegExp(escaped, 'i') };
  }
  return { domain: p.toLowerCase(), isRegex: false };
});

function shouldBlockRequest(urlStr: string, whitelist: string[] = []): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();

    // Check user whitelist first
    for (const allowed of whitelist) {
      if (host === allowed || host.endsWith('.' + allowed)) {
        return false;
      }
    }

    // Check domain and path rules
    for (const rule of compiledRules) {
      if (rule.isRegex && rule.regex) {
        if (rule.regex.test(urlStr)) return true;
      } else {
        if (host === rule.domain || host.endsWith('.' + rule.domain)) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

// 1. Tracker blocking tests
assert.equal(shouldBlockRequest('https://ad.doubleclick.net/pagead/ads?id=1'), true);
assert.equal(shouldBlockRequest('https://google-analytics.com/analytics.js'), true);
assert.equal(shouldBlockRequest('https://www.facebook.net/tr?id=123'), true);
assert.equal(shouldBlockRequest('https://c.amazon-adsystem.com/aax2/apstag.js'), true);

// 2. Legitimate content allowance
assert.equal(shouldBlockRequest('https://github.com/unitybtw/nova-browser'), false);
assert.equal(shouldBlockRequest('https://news.ycombinator.com/item?id=100'), false);
assert.equal(shouldBlockRequest('https://en.wikipedia.org/wiki/Web_browser'), false);
assert.equal(shouldBlockRequest('https://docs.anthropic.com/en/docs/overview'), false);

// 3. User Whitelist override
const whitelist = ['google-analytics.com', 'developer-portal.com'];
assert.equal(shouldBlockRequest('https://google-analytics.com/analytics.js', whitelist), false, 'Whitelisted domain must not be blocked');
assert.equal(shouldBlockRequest('https://ad.doubleclick.net/ads', whitelist), true, 'Non-whitelisted tracker must still be blocked');

// 4. Whitelist sanitization helper
function sanitizeWhitelist(entries: string[]): string[] {
  const validDomainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
  return entries
    .map(e => e.trim().toLowerCase())
    .filter(e => validDomainRegex.test(e) && !e.includes('/') && e.length <= 253);
}

const rawList = [
  '  Example.COM  ',
  'valid-site.org',
  'javascript:alert(1)',
  'http://evil.com',
  'bad domain with space.com',
  'toolong' + 'a'.repeat(300) + '.com'
];

const cleaned = sanitizeWhitelist(rawList);
assert.deepEqual(cleaned, ['example.com', 'valid-site.org']);

console.log('[PASS] [AdBlock Engine] Tracker matching, whitelist overrides, and rule compilation verified.');
