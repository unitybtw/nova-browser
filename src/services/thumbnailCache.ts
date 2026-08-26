class TabThumbnailCache {
  private cache = new Map<string, string>();
  private listeners = new Set<() => void>();

  get(tabId: string): string | undefined {
    const value = this.cache.get(tabId);
    if (value !== undefined) {
      // LRU touch: re-insert so the read entry moves to the end of the Map's
      // insertion order and survives eviction.
      this.cache.delete(tabId);
      this.cache.set(tabId, value);
    }
    return value;
  }

  set(tabId: string, dataUrl: string) {
    if (!tabId || !dataUrl) return;
    const unchanged = this.cache.get(tabId) === dataUrl;
    // LRU touch: deleting before setting re-inserts the key at the end of the
    // Map's iteration order, so eviction below targets the least-recently-used
    // entry instead of merely the least-recently-written one.
    this.cache.delete(tabId);
    this.cache.set(tabId, dataUrl);
    if (unchanged) {
      // Same value: order was refreshed but nothing observable changed,
      // so skip eviction checks and listener notification (previous behavior).
      return;
    }
    // Cap memory usage to last 30 thumbnails
    if (this.cache.size > 30) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.listeners.forEach(fn => fn());
  }

  remove(tabId: string) {
    if (this.cache.delete(tabId)) {
      this.listeners.forEach(fn => fn());
    }
  }

  clear() {
    this.cache.clear();
    this.listeners.forEach(fn => fn());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const tabThumbnailCache = new TabThumbnailCache();
