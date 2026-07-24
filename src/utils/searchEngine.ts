import { UserSettings } from '../App';

export function formatSearchUrl(query: string, engine: UserSettings['searchEngine'] = 'google'): string {
  const trimmed = query.trim();
  if (!trimmed) return '';

  // Check if query is a direct domain or URL
  const isUrl = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/i.test(trimmed);
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    if (isUrl) {
      return 'https://' + trimmed;
    } else {
      const q = encodeURIComponent(trimmed);
      switch (engine) {
        case 'duckduckgo':
          return `https://duckduckgo.com/?q=${q}`;
        case 'brave':
          return `https://search.brave.com/search?q=${q}`;
        case 'bing':
          return `https://www.bing.com/search?q=${q}`;
        case 'ecosia':
          return `https://www.ecosia.org/search?q=${q}`;
        case 'google':
        default:
          return `https://www.google.com/search?q=${q}`;
      }
    }
  }
  return trimmed;
}

export function getSearchEngineName(engine: UserSettings['searchEngine'] = 'google'): string {
  switch (engine) {
    case 'duckduckgo':
      return 'DuckDuckGo';
    case 'brave':
      return 'Brave Search';
    case 'bing':
      return 'Microsoft Bing';
    case 'ecosia':
      return 'Ecosia';
    case 'google':
    default:
      return 'Google';
  }
}
