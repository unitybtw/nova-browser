import { useState, useEffect, useCallback, useRef } from 'react';
import { DownloadItem } from '../types/browser';
import { safeParseArrayWithBackup } from '../utils/safeStorage';
export type { DownloadItem };

const STORAGE_KEY = 'nova_downloads_history';

function persistDownloadsToStorage(items: DownloadItem[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 150)));
    }
  } catch (err) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
    } catch (_) {}
  }
}

/**
 * Owns the downloads domain: the downloads list state, the onDownloadUpdate
 * IPC listener with its ~100ms progress batching, and the clear handler.
 * Extracted as pure code motion from App.tsx — batching timing, flush
 * conditions, and toast-facing state semantics are unchanged.
 */
export function useDownloads() {
  const [downloads, setDownloads] = useState<DownloadItem[]>(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      const parsed = safeParseArrayWithBackup<DownloadItem>(STORAGE_KEY, saved, []);
      // Rehydrated downloads cannot be resumed/cancelled because electron's in-memory
      // activeDownloads map is empty upon browser restart. Ensure terminal/interrupted
      // state and clear isPaused to avoid dead UI controls.
      return parsed.map(d => ({
        ...d,
        state: d.state === 'progressing' ? 'interrupted' : d.state,
        isPaused: false
      }));
    } catch {
      return [];
    }
  });

  const lastProgressPersistRef = useRef<number>(0);

  // Listen for download progress events from main process with cleanups
  useEffect(() => {
    if (!window.electronAPI?.onDownloadUpdate) return;

    let pendingUpdates: Record<string, DownloadItem> = {};
    let throttleTimer: any = null;

    const flushUpdates = () => {
      if (throttleTimer) {
        clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      // Capture and clear the pending bag OUTSIDE the updater
      // (StrictMode-safe): mutating it inside the updater would empty the
      // bag on the first double-invoke pass and silently drop updates on
      // the second.
      const captured = pendingUpdates;
      pendingUpdates = {};
      setDownloads(prev => {
        const updated = [...prev];
        let hasChanges = false;
        let hasTerminalChange = false;

        Object.values(captured).forEach(pendingData => {
          const existingIdx = updated.findIndex(d => d.id === pendingData.id);
          if (existingIdx !== -1) {
            updated[existingIdx] = { ...updated[existingIdx], ...pendingData };
            hasChanges = true;
          } else {
            updated.unshift(pendingData);
            hasChanges = true;
          }
          if (
            pendingData.state === 'completed' ||
            pendingData.state === 'cancelled' ||
            pendingData.state === 'interrupted'
          ) {
            hasTerminalChange = true;
          }
        });

        if (hasTerminalChange) {
          persistDownloadsToStorage(updated);
        } else if (hasChanges) {
          const now = Date.now();
          if (now - lastProgressPersistRef.current > 3000) {
            lastProgressPersistRef.current = now;
            persistDownloadsToStorage(updated);
          }
        }

        return hasChanges ? updated : prev;
      });
    };

    const removeDownloadListener = window.electronAPI.onDownloadUpdate((_event: any, data: DownloadItem) => {
      pendingUpdates[data.id] = data;

      // Immediate update for new downloads or completion/cancellation/interruption
      if (data.receivedBytes === 0 || data.state === 'completed' || data.state === 'cancelled' || data.state === 'interrupted') {
        flushUpdates();
      } else if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          flushUpdates();
        }, 100); // Fast 100ms UI progress update
      }
    });

    return () => {
      if (throttleTimer) {
        clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      if (typeof removeDownloadListener === 'function') removeDownloadListener();
    };
  }, []);

  const handleClearDownloads = useCallback(() => {
    setDownloads([]);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (_) {}
  }, []);

  return { downloads, handleClearDownloads };
}
