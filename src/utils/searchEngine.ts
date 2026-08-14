import { UserSettings } from '../App';

export function formatSearchUrl(query: string, engine: UserSettings['searchEngine'] = 'google'): string {
  const trimmed = query.trim();
  if (!trimmed) return '';

  // Internal schemes and protocols
  const internalSchemes = ['nova://', 'about:', 'chrome://', 'edge://', 'file://', 'view-source:', 'data:'];
  if (internalSchemes.some(scheme => trimmed.toLowerCase().startsWith(scheme))) {
    return trimmed;
  }

  // Already has HTTP or HTTPS protocol
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Localhost or 127.0.0.1 with optional port and path
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed) || /^127\.0\.0\.1(:\d+)?(\/.*)?$/.test(trimmed)) {
    return 'http://' + trimmed;
  }

  // Check if query is a valid domain or IP address URL
  const isDomain = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed);
  const isIpUrl = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed);

  if (isDomain || isIpUrl) {
    return 'https://' + trimmed;
  }

  // Otherwise treat as search engine query
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
    case 'yahoo':
      return `https://search.yahoo.com/search?p=${q}`;
    case 'google':
    default:
      return `https://www.google.com/search?q=${q}`;
  }
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
    case 'yahoo':
      return 'Yahoo';
    case 'google':
    default:
      return 'Google';
  }
}
