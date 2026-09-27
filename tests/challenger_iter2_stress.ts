import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { BrowserView } from '../src/components/BrowserView';
import { safeBase64 } from '../src/utils/securityUtils';

async function runChallengerStressTest() {
  console.log('===========================================================');
  console.log('CHALLENGER 2: ADVERSARIAL STRESS TEST SUITE (ITERATION 2)');
  console.log('===========================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  // -------------------------------------------------------------
  // TEST SECTION 1: ReaderMode safeBase64 with Lone Surrogates
  // -------------------------------------------------------------
  console.log('--- SECTION 1: ReaderMode safeBase64 Lone Surrogate Stress Testing ---');

  // This used to regex-scrape the body of `safeBase64` out of
  // src/components/ReaderMode.tsx purely to prove the regex matched, then throw
  // the captured body away and hand a RE-TYPED copy to `new Function`. The copy
  // had already drifted from the shipped helper: production
  // src/utils/securityUtils.ts:350-363 emits URL-safe base64
  // (`+`->`-`, `/`->`_`, `=` stripped) with a `[^a-zA-Z0-9_-]` fallback, while
  // the copy used plain `btoa(...)` and a `[^a-zA-Z0-9]` fallback. So the suite
  // reported [PASS] for a contract production did not have. It now drives the
  // real exported helper, and the assertions below are ones the copy fails.
  const URL_SAFE_BASE64 = /^[A-Za-z0-9_-]*$/;

  const decodeUrlSafeBase64 = (encoded: string): string => {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
    return decodeURIComponent(escape(atob(padded)));
  };

  const surrogateTestCases = [
    { name: 'Lone Lead Surrogate U+D800', input: 'https://example.com/\uD800/path' },
    { name: 'Lone Lead Surrogate U+D83D', input: 'https://example.com/search?\uD83D=query' },
    { name: 'Lone Lead Surrogate U+DBFF', input: '\uDBFF' },
    { name: 'Lone Trail Surrogate U+DC00', input: 'https://example.com/\uDC00' },
    { name: 'Lone Trail Surrogate U+DFFF', input: 'https://example.com/\uDFFF/end' },
    { name: 'Reversed Surrogate Pair (Trail then Lead)', input: 'https://example.com/\uDFFF\uD800/test' },
    { name: 'Multiple Unpaired Surrogates Interspersed', input: 'a\uD800b\uD800c\uDC00d\uDFFF' },
    { name: 'Valid Surrogate Pair followed by Lone Surrogate', input: 'https://example.com/\uD83D\uDE0A/\uD83C\uDF89/\uD800' },
    { name: 'Lone Surrogate in Percent-encoded context', input: 'https://example.com/%20\uD800%21' },
    { name: 'Empty String', input: '' },
    { name: 'Null-ish coerced string', input: String(null) },
  ];

  for (const tc of surrogateTestCases) {
    try {
      const result = safeBase64(tc.input);
      if (typeof result !== 'string') {
        throw new Error(`Returned non-string: ${typeof result}`);
      }
      // The shipped helper must emit the URL-safe alphabet only. The old
      // re-typed copy emitted `+`, `/` and `=` and would fail this line.
      if (!URL_SAFE_BASE64.test(result)) {
        throw new Error(`Output is not URL-safe base64: ${JSON.stringify(result)}`);
      }
      // Encoding must be a pure function of the input.
      if (safeBase64(tc.input) !== result) {
        throw new Error(`Non-deterministic output for ${JSON.stringify(tc.input)}`);
      }
      console.log(`[PASS] [ReaderMode] ${tc.name} -> base64 length: ${result.length}, output: "${result.substring(0, 35)}..."`);
      passedTests++;
    } catch (err: any) {
      console.error(`[FAIL] [ReaderMode] ${tc.name} threw uncaught exception: ${err.name} - ${err.message}`);
      failedTests++;
    }
  }

  // The vectors above are all deliberately malformed (lone surrogates), so they
  // prove the encoder never throws and never leaks standard-base64 characters.
  // These prove the opposite direction as well: a well-formed string must still
  // round-trip losslessly, so "URL-safe" is not paid for with data loss.
  const roundTripVectors = [
    'https://example.com/😊/🎉/тест?q=a+b/c=',
    'https://ru.wikipedia.org/wiki/Заглавная_страница',
    'https://example.com/foo%20bar%26baz',
  ];
  for (const input of roundTripVectors) {
    try {
      const encoded = safeBase64(input);
      const decoded = decodeUrlSafeBase64(encoded);
      if (decoded !== input) {
        throw new Error(`Round trip changed the input: ${JSON.stringify(decoded)} !== ${JSON.stringify(input)}`);
      }
      console.log(`[PASS] [ReaderMode] URL-safe round trip preserved "${input.substring(0, 40)}"`);
      passedTests++;
    } catch (err: any) {
      console.error(`[FAIL] [ReaderMode] URL-safe round trip failed for ${JSON.stringify(input)}: ${err.message}`);
      failedTests++;
    }
  }

  // -------------------------------------------------------------
  // TEST SECTION 2: BrowserView Null / Undefined tab Prop Stress Testing
  // -------------------------------------------------------------
  console.log('\n--- SECTION 2: BrowserView Null / Undefined tab Prop Stress Testing ---');

  const defaultSettings: any = {
    searchEngine: 'google',
    privacyShield: true,
    fontSize: 'medium',
    aiLinkPreviewEnabled: true,
  };

  const browserViewPropsScenarios = [
    { name: 'tab={null}', props: { tab: null, isActive: true, onUpdateTab: () => {}, onCloseTab: () => {}, isIncognito: false, searchEngine: 'google' as const, privacyShield: true, settings: defaultSettings } },
    { name: 'tab={undefined}', props: { tab: undefined, isActive: true, onUpdateTab: () => {}, onCloseTab: () => {}, isIncognito: false, searchEngine: 'google' as const, privacyShield: true, settings: defaultSettings } },
    { name: 'tab={{} as any}', props: { tab: {} as any, isActive: true, onUpdateTab: () => {}, onCloseTab: () => {}, isIncognito: false, searchEngine: 'google' as const, privacyShield: true, settings: defaultSettings } },
    { name: 'tab={{ id: "1" } as any} (no url)', props: { tab: { id: '1' } as any, isActive: true, onUpdateTab: () => {}, onCloseTab: () => {}, isIncognito: false, searchEngine: 'google' as const, privacyShield: true, settings: defaultSettings } },
    { name: 'tab={{ url: "https://example.com" } as any} (no id)', props: { tab: { url: 'https://example.com' } as any, isActive: true, onUpdateTab: () => {}, onCloseTab: () => {}, isIncognito: false, searchEngine: 'google' as const, privacyShield: true, settings: defaultSettings } },
  ];

  for (const scenario of browserViewPropsScenarios) {
    try {
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(BrowserView, scenario.props)
      );
      console.log(`[PASS] [BrowserView] Render ${scenario.name} -> output: "${html}"`);
      passedTests++;
    } catch (err: any) {
      console.error(`[FAIL] [BrowserView] Render ${scenario.name} threw uncaught exception: ${err.name} - ${err.message}`);
      failedTests++;
    }
  }

  // -------------------------------------------------------------
  // TEST SUMMARY & EXIT CODE
  // -------------------------------------------------------------
  console.log('\n===========================================================');
  console.log(`STRESS TEST RESULTS: TOTAL=${passedTests + failedTests}, PASSED=${passedTests}, FAILED=${failedTests}`);
  console.log('===========================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runChallengerStressTest().catch((err) => {
  console.error('Fatal stress test error:', err);
  process.exit(1);
});
