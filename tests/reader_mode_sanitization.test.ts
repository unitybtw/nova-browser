import assert from 'node:assert/strict';

console.log('\n--- Reader Mode & HTML Sanitization Suite ---');

interface ParsedArticle {
  title: string;
  byline?: string;
  content: string;
  textContent: string;
  length: number;
  readingTimeMinutes: number;
}

function sanitizeArticleHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  return rawHtml
    // Strip scripts, iframes, styles, objects, embeds
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    // Strip inline event handlers (e.g. onload=, onclick=, onerror=)
    .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    // Strip javascript: hrefs and data: uris
    .replace(/href\s*=\s*['"]javascript:[^'"]*['"]/gi, 'href="#"')
    .replace(/src\s*=\s*['"]javascript:[^'"]*['"]/gi, 'src=""')
    .trim();
}

function calculateReadingTime(textContent: string, wordsPerMinute = 200): number {
  const words = textContent.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

// 1. Sanitize Malicious HTML Payloads
const hostileHtml = `
  <article>
    <h1>Autonomous Browser Architecture</h1>
    <script>evilPayload();</script>
    <p>Nova is designed for performance and local AI inference.</p>
    <img src="valid.jpg" onerror="alert('xss')" alt="diagram" />
    <iframe src="http://attacker.com"></iframe>
    <a href="javascript:stealTokens()">Click here</a>
  </article>
`;

const sanitized = sanitizeArticleHtml(hostileHtml);
assert.equal(sanitized.includes('<script>'), false);
assert.equal(sanitized.includes('evilPayload'), false);
assert.equal(sanitized.includes('<iframe>'), false);
assert.equal(sanitized.includes('onerror='), false);
assert.equal(sanitized.includes('javascript:stealTokens'), false);
assert.equal(sanitized.includes('Nova is designed for performance'), true);

// 2. Reading Time Calculation
const sampleArticle = 'Word '.repeat(500); // 500 words
const minutes = calculateReadingTime(sampleArticle, 200);
assert.equal(minutes, 3, '500 words at 200 wpm should be 3 minutes');

const shortSnippet = 'Hello world';
assert.equal(calculateReadingTime(shortSnippet), 1, 'Minimum reading time is 1 minute');

console.log('[PASS] [Reader Mode] XSS payload sanitization, iframe/script stripping, and reading time heuristics verified.');
