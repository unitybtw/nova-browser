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
  const ALLOWED_TAGS = new Set(['article', '/article', 'h1', '/h1', 'p', '/p', 'img', 'a', '/a']);
  const tokens = rawHtml.split(/(<[^>]*>)/g);
  const result: string[] = [];
  let inDisallowedBlock = false;
  let disallowedBlockTag = '';

  for (const token of tokens) {
    if (!token) continue;
    if (token.startsWith('<') && token.endsWith('>')) {
      const tagContent = token.slice(1, -1).trim();
      const tagNameMatch = tagContent.match(/^(\/?[a-zA-Z0-9]+)/);
      const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';

      if (inDisallowedBlock) {
        if (tagName === `/${disallowedBlockTag}`) {
          inDisallowedBlock = false;
          disallowedBlockTag = '';
        }
        continue;
      }

      if (['script', 'iframe', 'style', 'object', 'embed'].includes(tagName)) {
        inDisallowedBlock = true;
        disallowedBlockTag = tagName;
        continue;
      }

      if (!ALLOWED_TAGS.has(tagName)) {
        continue;
      }

      let safeTag = token;
      while (/\son\w+=(?:'[^']*'|"[^"]*"|[^\s>]+)/i.test(safeTag)) {
        safeTag = safeTag.replace(/\son\w+=(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
      }
      safeTag = safeTag.replace(/(href|src)=(?:'javascript:[^']*'|"javascript:[^"]*")/gi, '$1="#"');
      result.push(safeTag);
    } else {
      if (!inDisallowedBlock) {
        result.push(token);
      }
    }
  }

  return result.join('').trim();
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
