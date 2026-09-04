import { useState, useEffect, useCallback, useRef } from 'react';
import { Tab, HistoryItem } from '../types/browser';
import { generateId } from '../utils/idGenerator';
import { safeParseArrayWithBackup } from '../utils/safeStorage';
export type { HistoryItem };

/**
 * Owns the browsing-history domain: the history list state, its debounced
 * (~2s) localStorage persistence, and the navigation recorder invoked by tab
 * updates. Extracted as pure code motion from App.tsx.
 */
export function useHistoryRecorder() {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('browsing_history') : null;
    return safeParseArrayWithBackup<HistoryItem>('browsing_history', raw, []);
  });

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      try {
        localStorage.setItem('browsing_history', JSON.stringify(history));
      } catch {
        console.warn('[History] Persist failed (quota?) — retrying with trimmed snapshot.');
        try {
          // History is newest-first: keep the newer half, drop the older half.
          localStorage.setItem('browsing_history', JSON.stringify(history.slice(0, Math.ceil(history.length / 2))));
        } catch {
          console.warn('[History] Trimmed persist also failed; keeping in-memory history.');
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [history]);

  const historyRef = useRef(history);
  historyRef.current = history;

  /** Synchronous persist of the latest history snapshot (for beforeunload). */
  const flushHistory = useCallback(() => {
    try {
      localStorage.setItem('browsing_history', JSON.stringify(historyRef.current));
    } catch {
      console.warn('[History] Flush failed (quota?) — retrying with trimmed snapshot.');
      try {
        const snap = historyRef.current;
        localStorage.setItem('browsing_history', JSON.stringify(snap.slice(0, Math.ceil(snap.length / 2))));
      } catch {
        console.warn('[History] Trimmed flush also failed; keeping in-memory history.');
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
            id: generateId('hist'),
            url: targetUrl,
            title: updated.title || targetUrl,
            favicon: updated.favicon,
            timestamp: Date.now()
          }, ...hPrev.slice(0, 299)]; // keep last 300 (matches sync cap)
        });
      }
    }
  }, []);

  return { history, setHistory, recordVisit, flushHistory };
}
