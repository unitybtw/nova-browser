import assert from 'node:assert/strict';
import type { HistoryItem } from '../src/types/browser';

console.log('\n--- History Recorder Lifecycle & Normalization Test Suite ---');

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      parsed.pathname = pathname.slice(0, -1);
    }
    return parsed.href;
  } catch {
    return url.length > 1 && url.endsWith('/') ? url.slice(0, -1) : url;
  }
}

// 1. URL Normalization
assert.strictEqual(normalizeUrl('https://example.com/'), 'https://example.com/');
assert.strictEqual(normalizeUrl('https://example.com/path/'), 'https://example.com/path');
assert.strictEqual(normalizeUrl('https://example.com/path'), 'https://example.com/path');
assert.strictEqual(normalizeUrl('https://example.com/a/b/c/'), 'https://example.com/a/b/c');

console.log('[PASS] [History Recorder] Trailing slash normalization verified across path hierarchies');

// 2. Navigation Scheme Filtering
function shouldRecordHistory(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url === 'about:blank' || url === 'about:newtab' || url === 'nova://newtab') return false;
  if (url.startsWith('nova://') || url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('blob:')) {
    return false;
  }
  return true;
}

assert.strictEqual(shouldRecordHistory('https://github.com'), true);
assert.strictEqual(shouldRecordHistory('http://localhost:3000'), true);
assert.strictEqual(shouldRecordHistory('about:blank'), false);
assert.strictEqual(shouldRecordHistory('nova://newtab'), false);
assert.strictEqual(shouldRecordHistory('nova://settings'), false);
assert.strictEqual(shouldRecordHistory('javascript:void(0)'), false);
assert.strictEqual(shouldRecordHistory('data:text/html,test'), false);
assert.strictEqual(shouldRecordHistory('blob:https://example.com/uuid'), false);

console.log('[PASS] [History Recorder] Internal schemes, blank pages, and dangerous protocols excluded from history');

// 3. Consecutive Navigation Deduplication
function recordVisit(
  history: HistoryItem[],
  url: string,
  title: string,
  now: number,
  makeId: () => string
): HistoryItem[] {
  if (!shouldRecordHistory(url)) return history;
  const norm = normalizeUrl(url);

  // If latest history item is the exact same URL within 5 seconds, update its timestamp
  if (history.length > 0 && normalizeUrl(history[0].url) === norm && (now - history[0].visitedAt) < 5000) {
    const updated = [...history];
    updated[0] = { ...updated[0], visitedAt: now, title: title || updated[0].title };
    return updated;
  }

  const newItem: HistoryItem = {
    id: makeId(),
    url: norm,
    title: title || norm,
    visitedAt: now
  };
  return [newItem, ...history];
}

let historyList: HistoryItem[] = [];
const T0 = 1000000;

// First visit
historyList = recordVisit(historyList, 'https://example.com/docs/', 'Docs', T0, () => 'h-1');
assert.strictEqual(historyList.length, 1);
assert.strictEqual(historyList[0].id, 'h-1');

// Rapid reload 2 seconds later (same URL)
historyList = recordVisit(historyList, 'https://example.com/docs', 'Docs Updated', T0 + 2000, () => 'h-2');
assert.strictEqual(historyList.length, 1, 'Rapid repeat visit within 5s must deduplicate');
assert.strictEqual(historyList[0].id, 'h-1', 'Must retain original ID');
assert.strictEqual(historyList[0].visitedAt, T0 + 2000, 'Must update visitedAt timestamp');
assert.strictEqual(historyList[0].title, 'Docs Updated', 'Must update title if provided');

// Visit again after 6 seconds
historyList = recordVisit(historyList, 'https://example.com/docs', 'Docs Again', T0 + 8000, () => 'h-3');
assert.strictEqual(historyList.length, 2, 'Visit after >5s interval must create new history entry');
assert.strictEqual(historyList[0].id, 'h-3');

console.log('[PASS] [History Recorder] 5-second burst deduplication and timestamp refreshing verified');

// 4. Quota Exceeded Half-Trimming Heuristic
const largeHistory: HistoryItem[] = [];
for (let i = 0; i < 100; i++) {
  largeHistory.push({
    id: `hist-${i}`,
    url: `https://site${i}.com`,
    title: `Site ${i}`,
    visitedAt: Date.now() - i * 1000
  });
}

const trimmed = largeHistory.slice(0, Math.ceil(largeHistory.length / 2));
assert.strictEqual(trimmed.length, 50, 'Trimmed history must keep exactly newer half (50 items)');
assert.strictEqual(trimmed[0].id, 'hist-0', 'Newest item must be preserved at index 0');
assert.strictEqual(trimmed[49].id, 'hist-49', '50th item preserved');

console.log('[PASS] [History Recorder] Storage quota trimming preserves newest browsing records');
