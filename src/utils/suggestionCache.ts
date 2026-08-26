// Ultra-fast in-memory client-side cache for instant 0ms search suggestions
const MAX_CACHE_SIZE = 600;
const clientCache = new Map<string, { list: string[]; timestamp: number }>();
const TTL_MS = 15 * 60 * 1000; // 15 minutes

export function getClientCachedSuggestions(key: string): string[] | null {
  const clean = key.toLowerCase().trim();
  const entry = clientCache.get(clean);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL_MS) {
    clientCache.delete(clean);
    return null;
  }
  return entry.list;
}

export function setClientCachedSuggestions(key: string, list: string[]): void {
  const clean = key.toLowerCase().trim();
  if (!clean || !Array.isArray(list)) return;
  
  if (clientCache.size >= MAX_CACHE_SIZE) {
    const oldest = clientCache.keys().next().value;
    if (oldest) clientCache.delete(oldest);
  }
  clientCache.set(clean, { list, timestamp: Date.now() });
}
