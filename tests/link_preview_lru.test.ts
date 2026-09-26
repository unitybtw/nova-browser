import assert from 'node:assert/strict';
import {
  previewCache,
  getCachedPreview,
  setCachedPreview,
  PREVIEW_CACHE_MAX_ENTRIES,
  extractPreviewFallbackSummary,
  PreviewData
} from '../src/components/AILinkPreview';

console.log('\n--- AI Link Preview LRU Cache & Sentence Processing Suite ---');

// Clear cache before test runs to ensure isolation
previewCache.clear();

// 1. Insertion and Retrieval with real production cache
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

// 2. Capacity & LRU eviction verified with production PREVIEW_CACHE_MAX_ENTRIES
assert.equal(PREVIEW_CACHE_MAX_ENTRIES, 100, 'Production link preview cache must cap at 100 entries');

// Fill cache up to capacity (100)
for (let i = 6; i <= 100; i++) {
  setCachedPreview(`https://site${i}.com`, {
    title: `Site ${i}`,
    domain: `site${i}.com`,
    summary: `Summary of site ${i}`,
    readingTimeMinutes: 1,
    isAiGenerated: false
  });
}

assert.equal(previewCache.size, 100, 'Cache must reach exactly 100 items');

// Access site1 to refresh its LRU recency
getCachedPreview('https://site1.com');

// Insert 101st entry: must evict the oldest unaccessed entry (site2, since site1 was accessed)
setCachedPreview('https://site101.com', {
  title: 'Site 101',
  domain: 'site101.com',
  summary: 'Summary 101',
  readingTimeMinutes: 1,
  isAiGenerated: false
});

assert.equal(previewCache.size, 100, 'Cache must not exceed PREVIEW_CACHE_MAX_ENTRIES');
assert.equal(previewCache.has('https://site2.com'), false, 'Oldest unaccessed entry (site2) must be evicted');
assert.equal(previewCache.has('https://site1.com'), true, 'Recently accessed entry (site1) must remain in cache');
assert.equal(previewCache.has('https://site101.com'), true, 'Newly inserted entry must be present');

// 3. Fallback Sentence extraction test using production extractPreviewFallbackSummary
const rawArticle = 'Nova is an ultra-fast on-device AI browser built with WebGPU. It executes local models at 64 tokens per second. Discover blazing fast web performance.';
const extracted = extractPreviewFallbackSummary(rawArticle, null, null);
assert.equal(extracted.includes('Nova is an ultra-fast on-device AI browser built with WebGPU.'), true);
assert.equal(extracted.includes('It executes local models at 64 tokens per second.'), true);

// Meta description takes precedence if provided and > 30 chars
const fromMeta = extractPreviewFallbackSummary(rawArticle, null, 'Curated description from OpenGraph meta tags exceeding 30 characters');
assert.equal(fromMeta, 'Curated description from OpenGraph meta tags exceeding 30 characters');

console.log('[PASS] [Link Preview LRU] Production LRU cache capacity (100), eviction, and summary extraction verified.');
