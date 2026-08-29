import assert from 'node:assert/strict';

console.log('\n--- Bookmarks & History Search Algorithm Suite ---');

interface SearchableItem {
  id: string;
  title: string;
  url: string;
  type: 'bookmark' | 'history';
  timestamp?: number;
}

function searchHistoryAndBookmarks(query: string, items: SearchableItem[]): SearchableItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored = items.map(item => {
    let score = 0;
    const title = item.title.toLowerCase();
    const url = item.url.toLowerCase();

    // Exact matches
    if (title === q || url === q) score += 100;
    else if (title.startsWith(q)) score += 80;
    else if (url.startsWith(q)) score += 70;
    else if (title.includes(q)) score += 50;
    else if (url.includes(q)) score += 40;

    // Word boundary matches
    const words = q.split(/\s+/);
    if (words.every(w => title.includes(w) || url.includes(w))) {
      score += 30;
    }

    // Bookmark priority bonus only if query matched
    if (score > 0 && item.type === 'bookmark') score += 15;

    return { item, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item);
}

const testCorpus: SearchableItem[] = [
  { id: '1', title: 'GitHub - Nova Browser Repository', url: 'https://github.com/unitybtw/nova-browser', type: 'bookmark' },
  { id: '2', title: 'React Documentation', url: 'https://react.dev', type: 'bookmark' },
  { id: '3', title: 'Hacker News', url: 'https://news.ycombinator.com', type: 'history' },
  { id: '4', title: 'WebGPU Explainer', url: 'https://gpuweb.github.io/gpuweb/', type: 'history' },
  { id: '5', title: 'Electron API Reference', url: 'https://www.electronjs.org/docs/latest/api', type: 'history' }
];

// 1. Search Matching
const resultsNova = searchHistoryAndBookmarks('nova', testCorpus);
assert.equal(resultsNova.length, 1);
assert.equal(resultsNova[0].id, '1');

// 2. Multi-word search
const resultsDoc = searchHistoryAndBookmarks('electron api', testCorpus);
assert.equal(resultsDoc.length, 1);
assert.equal(resultsDoc[0].id, '5');

// 3. Bookmark Priority Scoring
const corpusWithTie: SearchableItem[] = [
  { id: 'hist-react', title: 'React Guide', url: 'https://guide.react.org', type: 'history' },
  { id: 'bm-react', title: 'React Official', url: 'https://react.dev', type: 'bookmark' }
];
const resultsReact = searchHistoryAndBookmarks('react', corpusWithTie);
assert.equal(resultsReact[0].id, 'bm-react', 'Bookmarks should rank higher than history items on equal matches');

// 4. Empty query returns empty list
assert.deepEqual(searchHistoryAndBookmarks('', testCorpus), []);
assert.deepEqual(searchHistoryAndBookmarks('   ', testCorpus), []);

console.log('[PASS] [Bookmarks & History] Relevance scoring, multi-word matching, and bookmark priority ranking verified.');
