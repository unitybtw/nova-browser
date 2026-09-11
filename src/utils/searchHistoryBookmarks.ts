/**
 * Nova Browser Centralized History & Bookmarks Search Engine
 * Provides scored, fuzzy and prefix matching for omnibox and AI search tools.
 */

export interface SearchableItem {
  id: string;
  title: string;
  url: string;
  type: 'bookmark' | 'history';
  timestamp?: number;
}

export function searchHistoryAndBookmarks(query: string, items: SearchableItem[]): SearchableItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const words = q.split(/\s+/).filter(Boolean);

  const scored = items.map(item => {
    let score = 0;
    const title = (item.title || '').toLowerCase();
    const url = (item.url || '').toLowerCase();

    // Exact matches
    if (title === q || url === q) {
      score += 100;
    } else if (title.startsWith(q)) {
      score += 80;
    } else if (url.startsWith(q)) {
      score += 70;
    } else if (title.includes(q)) {
      score += 50;
    } else if (url.includes(q)) {
      score += 40;
    }

    // Word boundary matches
    if (words.length > 0 && words.every(w => title.includes(w) || url.includes(w))) {
      score += 30;
    }

    // Bookmark priority bonus only if query matched
    if (score > 0 && item.type === 'bookmark') {
      score += 15;
    }

    return { item, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item);
}
