import { UserSettings } from '../App';

export function isValidUrlOrDomain(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  // Security: reject all dangerous and non-navigable protocols immediately,
  // before any other pattern matching. This prevents javascript:3000 or
  // data:text/html from being treated as a valid "domain:port" URL.
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'blob:', 'chrome:', 'edge:', 'about:config'];
  if (dangerousProtocols.some(p => trimmed.toLowerCase().startsWith(p))) return false;

  // Query with spaces is a search query (e.g. "google.com is down", "node.js tutorial")
  if (/\s/.test(trimmed)) return false;

  // Safe internal schemes
  if (['nova://', 'about:'].some(scheme => trimmed.toLowerCase().startsWith(scheme))) {
    return true;
  }

  // Explicit protocols (case-insensitive)
  if (/^https?:\/\//i.test(trimmed)) {
    return true;
  }

  // Localhost, 0.0.0.0, or loopback IP with optional port and path
  if (/^(localhost|0\.0\.0\.0|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return true;
  }

  // IPv4 address with optional port and path.
  // Each octet must be 0-255 (canonical range check), so e.g. 999.1.1.1 is
  // correctly rejected instead of being treated as a navigable IP.
  if (/^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(:\d+)?(\/.*)?$/.test(trimmed)) {
    return true;
  }

  // Intranet and developer local domain names (.local, .test, .internal, .lan, .home, .docker)
  if (/^[a-zA-Z0-9-]+\.(local|test|internal|lan|home|docker|localhost)(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return true;
  }

  // Domain with port (e.g. dev-server:3000, mysite.com:8080)
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*:\d+(\/.*)?$/.test(trimmed)) {
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
  if (nonTldExtensions.includes(lastPart)) {
    return false;
  }

  // Valid domain format with standard TLD
  const isDomain = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}(:\d+)?(\/.*)?$/i.test(trimmed);
  return isDomain;
}

export function formatSearchUrl(query: string, engine: UserSettings['searchEngine'] = 'google'): string {
  const trimmed = query.trim();
  if (!trimmed) return '';

  // Security: reject all dangerous and non-navigable protocols immediately.
  // Prevents javascript:alert(1) from being navigated to if it somehow reaches here.
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'blob:', 'chrome:', 'edge:'];
  if (dangerousProtocols.some(p => trimmed.toLowerCase().startsWith(p))) {
    // Treat as a search query instead of navigating to dangerous URL
    const q = encodeURIComponent(trimmed);
    return `https://www.google.com/search?q=${q}`;
  }

  // Safe internal browser schemes
  const safeInternalSchemes = ['nova://', 'about:'];
  if (safeInternalSchemes.some(scheme => trimmed.toLowerCase().startsWith(scheme))) {
    return trimmed;
  }

  // Already has HTTP or HTTPS protocol (case-insensitive)
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Localhost, 0.0.0.0, or 127.0.0.1 with optional port and path
  if (/^(localhost|0\.0\.0\.0|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return 'http://' + trimmed;
  }

  // Intranet / local domains (.local, .test, .internal, .lan, .home, .docker)
  if (/^[a-zA-Z0-9-]+\.(local|test|internal|lan|home|docker)(:\d+)?(\/.*)?$/i.test(trimmed)) {
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
