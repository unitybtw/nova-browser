import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Bookmark, Tab } from '../types/browser';
import { generateId } from '../utils/idGenerator';
import { safeParseArrayWithBackup } from '../utils/safeStorage';
import { getElectronAPI } from '../utils/electronBridge';
import { isTombstonedRow } from '../services/syncService';
import { logger } from '../utils/logger';

export interface UseBookmarksOptions {
  isDemo?: boolean;
}

/** Web Storage key the bookmark rows live under. */
export const BOOKMARKS_STORAGE_KEY = 'bookmarks';

/**
 * Where a trimmed copy goes when the full snapshot does not fit.
 *
 * NEVER the main key: the existing value there is intact when a write throws
 * QuotaExceededError, and overwriting a 4 900-row store with the newest 100 to
 * "recover" from a failed write is how a quota error turns into silent,
 * unrecoverable data loss (useDiskHydrationFallback only restores when the key
 * is absent, so a truncated value there is final).
 */
const TRIMMED_BOOKMARKS_STORAGE_KEY = 'bookmarks_quota_recovery_trimmed';

/**
 * Persist the bookmark rows to Web Storage and to the Electron disk store.
 *
 * Returns whether the full snapshot reached Web Storage. The disk-store write is
 * attempted unconditionally: it has no Web Storage quota, and it is what the
 * disk-hydration fallback restores from, so a failed localStorage write must not
 * skip it.
 */
export function persistBookmarks(
  rows: Bookmark[],
  api: Pick<NonNullable<ReturnType<typeof getElectronAPI>>, 'storeSet'> | undefined = getElectronAPI()
): boolean {
  const serialized = JSON.stringify(rows);
  let stored = false;
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, serialized);
    stored = true;
  } catch (err) {
    // The value already under the key is the good one; keep it and say so loudly
    // rather than trading a full store for a truncated one.
    logger.error(
      'useBookmarks',
      `Could not persist ${rows.length} bookmarks to localStorage (quota?) — the previous value is left untouched and was NOT replaced by a trimmed snapshot.`,
      err
    );
    try {
      // A small copy under its own key can still fit, and keeps the newest rows
      // reachable even if the quota frees up before the next write.
      localStorage.setItem(TRIMMED_BOOKMARKS_STORAGE_KEY, JSON.stringify(rows.slice(-100)));
    } catch (recoveryErr) {
      logger.error('useBookmarks', 'Trimmed recovery snapshot could not be written either', recoveryErr);
    }
  }
  try {
    api?.storeSet?.(BOOKMARKS_STORAGE_KEY, serialized);
  } catch (err) {
    logger.error('useBookmarks', 'Could not persist bookmarks to the disk store', err);
  }
  return stored;
}

export function useBookmarks(options: UseBookmarksOptions = {}) {
  // The store keeps tombstoned rows (see `bookmarks` below); `bookmarkRows` is
  // that raw row set and the only thing that is persisted and sent to sync.
  const [bookmarkRows, setBookmarks] = useState<Bookmark[]>(() => {
    if (options.isDemo) return [];
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('bookmarks') : null;
    return safeParseArrayWithBackup<Bookmark>('bookmarks', saved, []);
  });

  // Live view for the UI: a deleted bookmark leaves the store as a tombstone
  // row (so the delete can be pushed to the other devices) and disappears from
  // the list here.
  const bookmarks = useMemo(() => bookmarkRows.filter(row => !isTombstonedRow(row)), [bookmarkRows]);

  const bookmarksRef = useRef(bookmarkRows);
  bookmarksRef.current = bookmarkRows;

  // Save bookmarks to localStorage and Electron store (debounced 500ms)
  useEffect(() => {
    if (options.isDemo) return;
    const timer = setTimeout(() => {
      persistBookmarks(bookmarkRows);
    }, 500);
    return () => clearTimeout(timer);
  }, [bookmarkRows, options.isDemo]);

  const handleToggleBookmark = useCallback((tab: Tab) => {
    if (!tab.url || tab.url === 'nova://newtab' || tab.url === 'about:blank') return;
    const now = Date.now();
    setBookmarks(prev => {
      const bookmarked = prev.filter(b => b.url === tab.url && !isTombstonedRow(b));
      if (bookmarked.length > 0) {
        // Soft delete: the rows stay in the store carrying `deletedAt` so the
        // next push propagates the delete (and the merge can suppress the
        // pre-delete copy other devices still hold). The purge removes them later.
        const deleted = new Set(bookmarked);
        return prev.map(b => deleted.has(b) ? { ...b, deletedAt: now } : b);
      }
      return [...prev, {
        id: generateId('bm'),
        url: tab.url,
        title: tab.title || tab.url,
        favicon: tab.favicon,
        timestamp: now
      }];
    });
  }, []);

  /** Synchronous persist of the latest bookmarks snapshot (matching flushHistory). */
  const flushBookmarks = useCallback(() => {
    if (options.isDemo) return;
    persistBookmarks(bookmarksRef.current);
  }, [options.isDemo]);

  return {
    bookmarks,
    bookmarkRows,
    setBookmarks,
    bookmarksRef,
    handleToggleBookmark,
    flushBookmarks
  };
}
