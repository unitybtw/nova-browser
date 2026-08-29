import assert from 'node:assert/strict';

console.log('\n--- AI Link Preview LRU Cache & Sentence Processing Suite ---');

interface PreviewData {
  title: string;
  domain: string;
  summary: string;
  readingTimeMinutes: number;
  ogImage?: string;
  isAiGenerated: boolean;
}

const PREVIEW_CACHE_MAX_ENTRIES = 5;
const previewCache = new Map<string, PreviewData>();

function getCachedPreview(url: string): PreviewData | undefined {
  const cached = previewCache.get(url);
  if (!cached) return undefined;
  previewCache.delete(url);
  previewCache.set(url, cached);
  return cached;
}

function setCachedPreview(url: string, preview: PreviewData): void {
  previewCache.delete(url);
  previewCache.set(url, preview);
  while (previewCache.size > PREVIEW_CACHE_MAX_ENTRIES) {
    const oldestKey = previewCache.keys().next().value;
    if (oldestKey === undefined) break;
    previewCache.delete(oldestKey);
  }
}

// 1. Insertion and Retrieval
for (let i = 1; i <= 5; i++) {
  setCachedPreview(`https://site${i}.com`, {
    title: `Site ${i}`,
    domain: `site${i}.com`,
    summary: `Summary of site ${i}`,
    readingTimeMinutes: 2,
    isAiGenerated: true
  });
}

assert.equal(previewCache.size, 5);
assert.equal(Boolean(getCachedPreview('https://site1.com')), true);

// 2. LRU Eviction: Inserting 6th item should evict site2 (since site1 was just accessed)
setCachedPreview('https://site6.com', {
  title: 'Site 6',
  domain: 'site6.com',
  summary: 'Summary 6',
  readingTimeMinutes: 1,
  isAiGenerated: false
});

assert.equal(previewCache.size, 5);
assert.equal(previewCache.has('https://site2.com'), false, 'Oldest unaccessed entry (site2) should be evicted');
assert.equal(previewCache.has('https://site1.com'), true, 'Recently accessed entry (site1) must remain in cache');
assert.equal(previewCache.has('https://site6.com'), true, 'Newly inserted entry must be present');

// 3. Sentence extraction test
function extractCompleteSentences(text: string, maxChars = 280): string {
  if (!text) return '';
  let clean = text
    .replace(/cookie policy|çerez politikası|all rights reserved|privacy policy/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [];
  let result = '';
  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed || trimmed.length < 15) continue;
    if (/^(menu|home|search|share)/i.test(trimmed)) continue;
    if ((result + ' ' + trimmed).length > maxChars && result.length > 50) break;
    result = result ? `${result} ${trimmed}` : trimmed;
  }
  return result || clean.slice(0, maxChars);
}

const rawArticle = 'Cookie policy. Nova is an ultra-fast on-device AI browser built with WebGPU. It executes local models at 64 tokens per second. All rights reserved.';
const extracted = extractCompleteSentences(rawArticle);
assert.equal(extracted.includes('Cookie policy'), false);
assert.equal(extracted.includes('All rights reserved'), false);
assert.equal(extracted.includes('Nova is an ultra-fast on-device AI browser built with WebGPU.'), true);

console.log('[PASS] [Link Preview LRU] Bounded capacity eviction, re-ordering, and sentence sanitation verified.');
