import { UserSettings } from '../App';

export function isValidUrlOrDomain(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  // Query with spaces is a search query (e.g. "google.com is down", "node.js tutorial")
  if (/\s/.test(trimmed)) return false;

  // Safe internal schemes
  if (['nova://', 'about:'].some(scheme => trimmed.toLowerCase().startsWith(scheme))) {
    return true;
  }

  // Explicit protocols
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://')) {
    return true;
  }

  // Localhost or loopback IP
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed) || /^127\.0\.0\.1(:\d+)?(\/.*)?$/.test(trimmed)) {
    return true;
  }

  // IPv4 address
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed)) {
    return true;
  }

  // If it contains a slash after domain (e.g. github.com/user, youtube.com/watch)
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\/[^\s]*$/.test(trimmed)) {
    return true;
  }

  // Exclude common file extensions and tech terms with dots when no path or protocol is present
  const nonTldExtensions = [
    'js', 'ts', 'jsx', 'tsx', 'py', 'json', 'css', 'scss', 'html', 'htm', 'cpp', 'c', 'h', 
    'java', 'rs', 'go', 'rb', 'php', 'xml', 'yml', 'yaml', 'md', 'txt', 'pdf', 'zip', 'tar', 
    'gz', 'rar', 'png', 'jpg', 'jpeg', 'svg', 'webp', 'mp4', 'mp3', 'exe', 'bin', 'sh'
  ];
  const parts = trimmed.split('.');
  const lastPart = parts[parts.length - 1]?.toLowerCase()?.split(/[:/?#]/)[0];
  if (parts.length === 2 && nonTldExtensions.includes(lastPart)) {
    return false;
  }

  // Valid domain format with standard TLD
  const isDomain = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}(:\d+)?(\/.*)?$/i.test(trimmed);
  return isDomain;
}

export function formatSearchUrl(query: string, engine: UserSettings['searchEngine'] = 'google'): string {
  const trimmed = query.trim();
  if (!trimmed) return '';

  // Safe internal browser schemes
  const safeInternalSchemes = ['nova://', 'about:'];
  if (safeInternalSchemes.some(scheme => trimmed.toLowerCase().startsWith(scheme))) {
    return trimmed;
  }

  // Already has HTTP or HTTPS protocol
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://')) {
    return trimmed;
  }

  // Localhost or 127.0.0.1 with optional port and path
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed) || /^127\.0\.0\.1(:\d+)?(\/.*)?$/.test(trimmed)) {
    return 'http://' + trimmed;
  }

  // Check if query is a valid domain or IP address URL
  if (isValidUrlOrDomain(trimmed)) {
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
