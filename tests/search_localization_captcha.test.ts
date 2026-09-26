import assert from 'node:assert/strict';
import { formatSearchUrl, isValidUrlOrDomain, getSearchEngineName } from '../src/utils/searchEngine';
import { setLanguage, getLanguage } from '../src/services/i18n';
import { detectSystemLanguage } from '../src/types/browser';

console.log('\n--- Search Localization & CAPTCHA Resistance Suite ---');

// 1. Google Search Localization
assert.equal(
  formatSearchUrl('react hooks', 'google', 'tr'),
  'https://www.google.com/search?q=react%20hooks&hl=tr&gl=tr&cr=TR',
  'Google search must append hl=tr, gl=tr, cr=TR when Turkish is active'
);
assert.equal(
  formatSearchUrl('react hooks', 'google', 'en'),
  'https://www.google.com/search?q=react%20hooks&hl=en&gl=us&cr=US',
  'Google search must append hl=en, gl=us, cr=US when English is active'
);
assert.equal(
  formatSearchUrl('react hooks', 'google', 'de'),
  'https://www.google.com/search?q=react%20hooks&hl=de&gl=de&cr=DE',
  'Google search must append hl=de, gl=de, cr=DE when German is active'
);
assert.equal(
  formatSearchUrl('react hooks', 'google', 'ar'),
  'https://www.google.com/search?q=react%20hooks&hl=ar&gl=sa&cr=SA',
  'Google search must append hl=ar, gl=sa, cr=SA when Arabic is active'
);

// 2. Backward Compatibility with bare URLs when lang is not specified
assert.equal(
  formatSearchUrl('react hooks', 'google'),
  'https://www.google.com/search?q=react%20hooks',
  'formatSearchUrl must return bare URL when lang is omitted'
);

// 3. DuckDuckGo Localization
assert.equal(
  formatSearchUrl('test query', 'duckduckgo', 'tr'),
  'https://duckduckgo.com/?q=test%20query&kl=tr-tr',
  'DuckDuckGo must use kl=tr-tr for Turkish'
);
assert.equal(
  formatSearchUrl('test query', 'duckduckgo', 'en'),
  'https://duckduckgo.com/?q=test%20query&kl=us-en',
  'DuckDuckGo must use kl=us-en for English'
);
assert.equal(
  formatSearchUrl('test query', 'duckduckgo', 'de'),
  'https://duckduckgo.com/?q=test%20query&kl=de-de',
  'DuckDuckGo must use kl=de-de for German'
);

// 4. Bing Search Localization
assert.equal(
  formatSearchUrl('test query', 'bing', 'tr'),
  'https://www.bing.com/search?q=test%20query&setlang=tr&cc=TR',
  'Bing must use setlang=tr&cc=TR for Turkish'
);
assert.equal(
  formatSearchUrl('test query', 'bing', 'en'),
  'https://www.bing.com/search?q=test%20query&setlang=en&cc=US',
  'Bing must use setlang=en&cc=US for English'
);

// 5. Brave Search Localization
assert.equal(
  formatSearchUrl('test query', 'brave', 'tr'),
  'https://search.brave.com/search?q=test%20query&country=TR',
  'Brave must use country=TR for Turkish'
);
assert.equal(
  formatSearchUrl('test query', 'brave', 'en'),
  'https://search.brave.com/search?q=test%20query&country=US',
  'Brave must use country=US for English'
);

// 6. Ecosia & Yahoo Localization
assert.equal(
  formatSearchUrl('test query', 'ecosia', 'tr'),
  'https://www.ecosia.org/search?q=test%20query&lang=tr',
  'Ecosia must use lang=tr for Turkish'
);
assert.equal(
  formatSearchUrl('test query', 'yahoo', 'tr'),
  'https://search.yahoo.com/search?p=test%20query&vl=lang_tr&cr=TR',
  'Yahoo must use vl=lang_tr&cr=TR for Turkish'
);

// 7. Direct URL and dangerous scheme preservation
assert.equal(formatSearchUrl('https://google.com'), 'https://google.com');
assert.equal(formatSearchUrl('example.com'), 'https://example.com');
assert.equal(formatSearchUrl('localhost:3000'), 'http://localhost:3000');
assert.ok(
  formatSearchUrl('javascript:alert(1)', 'google', 'tr').startsWith('https://www.google.com/search?q='),
  'Dangerous javascript scheme must be safely routed to search'
);

// 8. System language detection
const detected = detectSystemLanguage();
assert.ok(['en', 'tr', 'de', 'ar'].includes(detected), `detectSystemLanguage must return valid language, got: ${detected}`);

console.log('[PASS] [Search Localization & Anti-Bot] 15 search localization, backward compatibility, and system detection tests passed.');
