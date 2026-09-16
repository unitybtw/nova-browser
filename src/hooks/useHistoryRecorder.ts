import { useState, useEffect, useCallback, useRef } from 'react';
import { Tab, HistoryItem } from '../types/browser';
import { generateId } from '../utils/idGenerator';
import { safeParseArrayWithBackup } from '../utils/safeStorage';
import { logger } from '../utils/logger';
export type { HistoryItem };

export interface UseHistoryRecorderOptions {
  isDemo?: boolean;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      parsed.pathname = pathname.slice(0, -1);
    }
    return parsed.href;
  } catch {
    return url.length > 1 && url.endsWith('/') ? url.slice(0, -1) : url;
  }
}

/**
 * Owns the browsing-history domain: the history list state, its debounced
 * (~2s) localStorage persistence, and the navigation recorder invoked by tab
 * updates. Extracted as pure code motion from App.tsx.
 */
export function useHistoryRecorder(options: UseHistoryRecorderOptions = {}) {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (options.isDemo) return [];
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('browsing_history') : null;
    return safeParseArrayWithBackup<HistoryItem>('browsing_history', raw, []);
  });

  useEffect(() => {
    if (options.isDemo) return;
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      try {
        localStorage.setItem('browsing_history', JSON.stringify(history));
      } catch {
        logger.warn('useHistoryRecorder', 'Persist failed (quota?) — retrying with trimmed snapshot.');
        try {
          // History is newest-first: keep the newer half, drop the older half.
          localStorage.setItem('browsing_history', JSON.stringify(history.slice(0, Math.ceil(history.length / 2))));
        } catch {
          logger.warn('useHistoryRecorder', 'Trimmed persist also failed; keeping in-memory history.');
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [history, options.isDemo]);

  const historyRef = useRef(history);
  historyRef.current = history;

  /** Synchronous persist of the latest history snapshot (for beforeunload). */
  const flushHistory = useCallback(() => {
    if (options.isDemo) return;
    try {
      localStorage.setItem('browsing_history', JSON.stringify(historyRef.current));
    } catch {
      logger.warn('useHistoryRecorder', 'Flush failed (quota?) — retrying with trimmed snapshot.');
      try {
        const snap = historyRef.current;
        localStorage.setItem('browsing_history', JSON.stringify(snap.slice(0, Math.ceil(snap.length / 2))));
      } catch {
        logger.warn('useHistoryRecorder', 'Trimmed flush also failed; keeping in-memory history.');
      }
    }
  }, []);

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
      if (
        targetUrl &&
        !targetUrl.startsWith('nova://') &&
        !targetUrl.startsWith('about:') &&
        !targetUrl.startsWith('chrome://')
      ) {
        const normTarget = normalizeUrl(targetUrl);
        setHistory(hPrev => {
          const now = Date.now();
          const recentThreshold = 10000; // 10 seconds window for interleaved tabs
          const recentIdx = hPrev.slice(0, 10).findIndex(item => {
            const itemTime = typeof item.timestamp === 'number' ? item.timestamp : 0;
            return normalizeUrl(item.url) === normTarget && (now - itemTime) < recentThreshold;
          });

          if (recentIdx !== -1) {
            const existing = hPrev[recentIdx];
            if (updated.title && existing.title !== updated.title) {
              const updatedItem = {
                ...existing,
                title: updated.title,
                favicon: updated.favicon || existing.favicon
              };
              const next = [...hPrev];
              next[recentIdx] = updatedItem;
              return next;
            }
            return hPrev;
          }

          return [{
            id: generateId('hist'),
            url: targetUrl,
            title: updated.title || targetUrl,
            favicon: updated.favicon,
            timestamp: now
          }, ...hPrev.slice(0, 299)]; // keep last 300 (matches sync cap)
        });
      }
    }
  }, []);

  const clearHistory = useCallback((timeframe: string = 'all') => {
    if (timeframe === 'all') {
      setHistory([]);
      if (!options.isDemo) {
        try {
          localStorage.setItem('browsing_history', '[]');
        } catch (err) {
          logger.warn('useHistoryRecorder', 'Clear all history failed', err);
        }
      }
      return;
    }

    const now = Date.now();
    let cutoff = now;
    if (timeframe === 'hour') cutoff = now - 60 * 60 * 1000;
    else if (timeframe === 'day') cutoff = now - 24 * 60 * 60 * 1000;
    else if (timeframe === 'week') cutoff = now - 7 * 24 * 60 * 60 * 1000;
    else if (timeframe === 'month') cutoff = now - 28 * 24 * 60 * 60 * 1000;

    const isNewerThanCutoff = (item: HistoryItem) => {
      const itemTime = typeof item.timestamp === 'number' ? item.timestamp : Number(new Date(item.timestamp).getTime());
      return !isNaN(itemTime) && itemTime >= cutoff;
    };

    setHistory(prev => {
      const next = prev.filter(item => !isNewerThanCutoff(item));
      if (!options.isDemo) {
        try {
          localStorage.setItem('browsing_history', JSON.stringify(next));
        } catch (err) {
          logger.warn('useHistoryRecorder', 'Clear timeframe history failed', err);
        }
      }
      return next;
    });
  }, [options.isDemo]);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory(prev => {
      const next = prev.filter(item => item.id !== id);
      if (!options.isDemo) {
        try {
          localStorage.setItem('browsing_history', JSON.stringify(next));
        } catch (err) {
          logger.warn('useHistoryRecorder', 'Remove history item failed', err);
        }
      }
      return next;
    });
  }, [options.isDemo]);

  return { history, setHistory, recordVisit, flushHistory, clearHistory, removeHistoryItem };
}

