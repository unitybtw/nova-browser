import assert from 'node:assert/strict';
import {
  normalizeAdblockDomain,
  sanitizeAdblockWhitelist,
  isDomainWhitelisted,
  toggleDomainInWhitelist,
  CAPTCHA_WHITELIST_RULES,
  isHostInUserWhitelist,
  isUrlInUserWhitelist,
  sanitizeUserWhitelistHosts,
} from '../src/utils/adblockUtils';

console.log('\n--- AdBlock & Privacy Shield Network Filter Engine Suite ---');

const KNOWN_TRACKER_PATTERNS = [
  'doubleclick.net',
  'google-analytics.com',
  'googletagmanager.com',
  'facebook.net/tr',
  'adnxs.com',
  'amazon-adsystem.com',
  'scorecardresearch.com',
  'taboola.com',
  'outbrain.com',
  'hotjar.com',
  'segment.io',
  'clarity.ms'
];

interface TrackerRule {
  domain: string;
  pathPrefix?: string;
}

const compiledRules: TrackerRule[] = KNOWN_TRACKER_PATTERNS.map(p => {
  const parts = p.split('/');
  return {
    domain: parts[0].toLowerCase(),
    pathPrefix: parts.length > 1 ? '/' + parts.slice(1).join('/') : undefined
  };
});

function shouldBlockRequest(urlStr: string, whitelist: string[] = [], sourceUrlStr?: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    // Check if the requesting page or destination is in user whitelist
    if (isDomainWhitelisted(urlStr, whitelist) || (sourceUrlStr && isDomainWhitelisted(sourceUrlStr, whitelist))) {
      return false;
    }

    // Check domain and path rules
    for (const rule of compiledRules) {
      if (host === rule.domain || host.endsWith('.' + rule.domain)) {
        if (!rule.pathPrefix || pathname.startsWith(rule.pathPrefix)) {
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

// 3. User Whitelist override (both direct target and page sourceUrl)
const whitelist = ['google-analytics.com', 'developer-portal.com'];
assert.equal(shouldBlockRequest('https://google-analytics.com/analytics.js', whitelist), false, 'Whitelisted domain must not be blocked');
assert.equal(shouldBlockRequest('https://ad.doubleclick.net/ads', whitelist), true, 'Non-whitelisted tracker must still be blocked');
assert.equal(
  shouldBlockRequest('https://ad.doubleclick.net/ads', whitelist, 'https://www.developer-portal.com/dashboard'),
  false,
  'Third-party requests initiated by a whitelisted site must be allowed'
);
assert.equal(
  shouldBlockRequest('https://ad.doubleclick.net/ads', whitelist, 'https://other-site.com/dashboard'),
  true,
  'Third-party requests initiated by a non-whitelisted site must still be blocked'
);

// 4. Whitelist normalization, www-stripping, and sanitization
const rawList = [
  '  www.Example.COM.  ',
  'https://www.valid-site.org/some/path',
  'javascript:alert(1)',
  'nova://settings',
  'about:blank',
  'bad domain with space.com',
  'toolong' + 'a'.repeat(300) + '.com'
];

const cleaned = sanitizeAdblockWhitelist(rawList);
assert.deepEqual(cleaned, ['example.com', 'valid-site.org']);

const mainSanitized = Array.from(sanitizeUserWhitelistHosts(rawList));
assert.deepEqual(mainSanitized, ['example.com', 'valid-site.org']);
assert.equal(isHostInUserWhitelist('www.example.com', new Set(mainSanitized)), true);
assert.equal(isHostInUserWhitelist('sub.example.com', new Set(mainSanitized)), true);
assert.equal(isUrlInUserWhitelist('https://www.valid-site.org/article', new Set(mainSanitized)), true);
assert.equal(isUrlInUserWhitelist('https://unlisted.org/article', new Set(mainSanitized)), false);

// 5. Domain toggle lifecycle (www. equivalence and subdomain removal)
assert.equal(normalizeAdblockDomain('https://www.nytimes.com/section/tech'), 'nytimes.com');
assert.equal(normalizeAdblockDomain('nova://newtab'), '');
// Exercise the production enforcement boundary: only HTTP(S) URLs and plain
// hostnames may contribute domains to the adblock exception list.
for (const input of [
  'javascript:alert(1)', 'javascript://example.com', 'JaVaScRiPt://example.com',
  'java\tscript://example.com', 'java\nscript://example.com', 'java\rscript://example.com',
  'vbscript://example.com', 'VBScript:msgbox(1)',
  'data:text/html,<script>alert(1)</script>', 'data://example.com',
  'blob:https://example.com/id', 'file://example.com/path', 'ftp://example.com',
  'chrome://example.com', 'chrome-extension://example.com', 'about:blank',
  'nova://example.com', 'custom://example.com',
  'javascript%3A%2F%2Fexample.com', '//example.com/path',
  'https://example.com@evil.test', 'https://user:password@example.com',
  'example.com/path', 'example.com?x=1', 'example.com#fragment',
  'example.com:443', 'newtab', 'https://newtab',
]) {
  assert.equal(normalizeAdblockDomain(input), '', `unsafe whitelist input: ${JSON.stringify(input)}`);
  assert.equal(toggleDomainInWhitelist(input, []).isWhitelisted, false);
}
for (const [input, expected] of [
  ['  www.Example.COM.  ', 'example.com'],
  ['https://www.Example.com.:8443/path?q=1#section', 'example.com'],
  ['http://sub.example.com/path', 'sub.example.com'],
  ['localhost', 'localhost'], ['http://localhost:5176/', 'localhost'],
] as const) {
  assert.equal(normalizeAdblockDomain(input), expected);
}
for (const input of [
  'https://example.com.evil.test/', 'https://evil-example.com/',
  'https://evil.test/example.com', 'https://evil.test/?redirect=example.com',
]) {
  assert.equal(isDomainWhitelisted(input, ['example.com']), false, `domain confusion: ${input}`);
}
const step1 = toggleDomainInWhitelist('https://www.nytimes.com/2026/news', []);
assert.equal(step1.isWhitelisted, true);
assert.deepEqual(step1.nextWhitelist, ['nytimes.com']);
assert.equal(isDomainWhitelisted('https://nytimes.com', step1.nextWhitelist), true);
assert.equal(isDomainWhitelisted('https://cooking.nytimes.com', step1.nextWhitelist), true);

const step2 = toggleDomainInWhitelist('https://nytimes.com/', step1.nextWhitelist);
assert.equal(step2.isWhitelisted, false);
assert.deepEqual(step2.nextWhitelist, []);

// 6. CAPTCHA whitelist rules must not blanket-whitelist YouTube domains
const captchaRuleSet = new Set(CAPTCHA_WHITELIST_RULES);
assert.equal(captchaRuleSet.has('youtube.com'), false, 'youtube.com must not be in CAPTCHA_WHITELIST_RULES');
assert.equal(captchaRuleSet.has('www.youtube.com'), false, 'www.youtube.com must not be in CAPTCHA_WHITELIST_RULES');
assert.equal(captchaRuleSet.has('googlevideo.com'), false, 'googlevideo.com must not be in CAPTCHA_WHITELIST_RULES');
assert.equal(captchaRuleSet.has('recaptcha.net'), true, 'recaptcha.net must remain protected in CAPTCHA_WHITELIST_RULES');
assert.equal(captchaRuleSet.has('challenges.cloudflare.com'), true, 'Cloudflare Turnstile must remain protected in CAPTCHA_WHITELIST_RULES');

console.log('[PASS] [AdBlock Engine] Tracker matching, whitelist overrides, and rule compilation verified.');
