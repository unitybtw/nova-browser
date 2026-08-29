import assert from 'node:assert/strict';
import { formatSearchUrl, isValidUrlOrDomain, getSearchEngineName } from '../src/utils/searchEngine';

console.log('\n--- Search Engine & Omnibox URL Formatting Suite ---');

// 1. Direct URLs vs Search Queries
assert.equal(isValidUrlOrDomain('https://github.com'), true);
assert.equal(isValidUrlOrDomain('http://localhost:5173'), true);
assert.equal(isValidUrlOrDomain('localhost:3000'), true);
assert.equal(isValidUrlOrDomain('127.0.0.1:8080'), true);
assert.equal(isValidUrlOrDomain('192.168.1.1/admin'), true);
assert.equal(isValidUrlOrDomain('my-site.internal:9000'), true);
assert.equal(isValidUrlOrDomain('app.docker/api'), true);
assert.equal(isValidUrlOrDomain('nova://settings'), true);
assert.equal(isValidUrlOrDomain('about:blank'), true);

// Non-URL search queries
assert.equal(isValidUrlOrDomain('how to install react'), false);
assert.equal(isValidUrlOrDomain('react.js tutorial'), false);
assert.equal(isValidUrlOrDomain('main.py'), false);
assert.equal(isValidUrlOrDomain('styles.css'), false);
assert.equal(isValidUrlOrDomain('999.999.999.999'), false);
assert.equal(isValidUrlOrDomain('javascript:alert(1)'), false);
assert.equal(isValidUrlOrDomain('data:text/html,evil'), false);

// 2. formatSearchUrl engine permutations
const testQuery = 'electron react typescript';
const encoded = encodeURIComponent(testQuery);

assert.equal(formatSearchUrl(testQuery, 'google'), `https://www.google.com/search?q=${encoded}`);
assert.equal(formatSearchUrl(testQuery, 'duckduckgo'), `https://duckduckgo.com/?q=${encoded}`);
assert.equal(formatSearchUrl(testQuery, 'bing'), `https://www.bing.com/search?q=${encoded}`);
assert.equal(formatSearchUrl(testQuery, 'brave'), `https://search.brave.com/search?q=${encoded}`);
assert.equal(formatSearchUrl(testQuery, 'ecosia'), `https://www.ecosia.org/search?q=${encoded}`);
assert.equal(formatSearchUrl(testQuery, 'yahoo'), `https://search.yahoo.com/search?p=${encoded}`);

// 3. Search Engine Names
assert.equal(getSearchEngineName('google'), 'Google');
assert.equal(getSearchEngineName('duckduckgo'), 'DuckDuckGo');
assert.equal(getSearchEngineName('bing'), 'Microsoft Bing');
assert.equal(getSearchEngineName('brave'), 'Brave Search');
assert.equal(getSearchEngineName('ecosia'), 'Ecosia');
assert.equal(getSearchEngineName('yahoo'), 'Yahoo');

// 4. Safe scheme preservation
assert.equal(formatSearchUrl('nova://newtab'), 'nova://newtab');
assert.equal(formatSearchUrl('about:blank'), 'about:blank');
assert.equal(formatSearchUrl('localhost:3000'), 'http://localhost:3000');
assert.equal(formatSearchUrl('github.com/unitybtw'), 'https://github.com/unitybtw');

console.log('[PASS] [Search & Omnibox] 24 URL parsing, search engine formatting and dangerous scheme containment tests passed.');
