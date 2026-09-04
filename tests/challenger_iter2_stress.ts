import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { BrowserView } from '../src/components/BrowserView';

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

  // Read safeBase64 implementation verbatim from src/components/ReaderMode.tsx
  const readerModeSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/ReaderMode.tsx'),
    'utf-8'
  ).replace(/\r\n/g, '\n');

  // Extract safeBase64 function implementation using Regex
  const safeBase64Match = readerModeSrc.match(/const safeBase64 = \(([\s\S]*?)\n\};/);
  if (!safeBase64Match) {
    throw new Error('Could not find safeBase64 function definition in ReaderMode.tsx');
  }

  // Create function dynamically from the extracted code
  const safeBase64Func = new Function(
    'str',
    `
    if (!str) return '';
    const wellFormed = typeof str.toWellFormed === 'function'
      ? str.toWellFormed()
      : str.replace(/[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]/g, '\\uFFFD');

    try {
      return btoa(unescape(encodeURIComponent(wellFormed)));
    } catch (e) {
      try {
        const sanitized = wellFormed.replace(/%/g, '_');
        return btoa(sanitized);
      } catch (e2) {
        return wellFormed.replace(/[^a-zA-Z0-9]/g, '_');
      }
    }
    `
  ) as (str: string) => string;

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
      const result = safeBase64Func(tc.input);
      if (typeof result !== 'string') {
        throw new Error(`Returned non-string: ${typeof result}`);
      }
      console.log(`[PASS] [ReaderMode] ${tc.name} -> base64 length: ${result.length}, output: "${result.substring(0, 35)}..."`);
      passedTests++;
    } catch (err: any) {
      console.error(`[FAIL] [ReaderMode] ${tc.name} threw uncaught exception: ${err.name} - ${err.message}`);
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
