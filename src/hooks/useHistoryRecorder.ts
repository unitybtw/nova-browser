import { useState, useEffect, useCallback } from 'react';
import { Tab } from '../types/browser';

// Moved verbatim from App.tsx so the history domain is self-contained;
// App.tsx re-exports this type to keep existing `from '../App'` imports
// (HistoryPage, BrowserView, syncService) resolving unchanged.
export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  timestamp: number;
}

/**
 * Owns the browsing-history domain: the history list state, its debounced
 * (~2s) localStorage persistence, and the navigation recorder invoked by tab
 * updates. Extracted as pure code motion from App.tsx.
 */
export function useHistoryRecorder() {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('browsing_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load browsing_history from localStorage:', e);
    }
    return [];
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('browsing_history', JSON.stringify(history));
      } catch (e) {}
    }, 2000);
    return () => clearTimeout(timer);
  }, [history]);

  /**
   * Records a navigation visit derived from a merged tab snapshot. Callers
   * must invoke this OUTSIDE any setState updater (StrictMode-safe) so
   * setHistory is never called from within another updater.
   *
   * Stable identity ([] deps) so callers can keep their own callback deps
   * unchanged.
   */
  const recordVisit = useCallback((updated: Tab, updates: Partial<Tab>) => {
    // Add to history if title or url loaded and not blank/newtab AND NOT INCOGNITO
    if (!updated.isIncognito && (updates.title || updates.url)) {
      const targetUrl = updated.url;
      if (targetUrl && targetUrl !== 'nova://newtab' && targetUrl !== 'about:blank' && !targetUrl.startsWith('chrome://')) {
        setHistory(hPrev => {
          // If same URL was just recorded, update title/favicon if improved
          if (hPrev.length > 0 && hPrev[0]?.url === targetUrl) {
            if (updated.title && hPrev[0].title !== updated.title) {
              return [{ ...hPrev[0], title: updated.title, favicon: updated.favicon || hPrev[0].favicon }, ...hPrev.slice(1)];
            }
            return hPrev;
          }
          return [{
            id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
            url: targetUrl,
            title: updated.title || targetUrl,
            favicon: updated.favicon,
            timestamp: Date.now()
          }, ...hPrev.slice(0, 500)]; // keep last 500
        });
      }
    }
  }, []);

  return { history, setHistory, recordVisit };
}
