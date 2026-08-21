class TabThumbnailCache {
  private cache = new Map<string, string>();
  private listeners = new Set<() => void>();

  get(tabId: string): string | undefined {
    return this.cache.get(tabId);
  }

  set(tabId: string, dataUrl: string) {
    if (!tabId || !dataUrl) return;
    if (this.cache.get(tabId) === dataUrl) return;
    this.cache.set(tabId, dataUrl);
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

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const tabThumbnailCache = new TabThumbnailCache();
