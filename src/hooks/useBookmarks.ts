import { useState, useEffect, useCallback, useRef } from 'react';
import { Bookmark, Tab } from '../types/browser';
import { generateId } from '../utils/idGenerator';
import { safeParseArrayWithBackup } from '../utils/safeStorage';
import { getElectronAPI } from '../utils/electronBridge';
import { logger } from '../utils/logger';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('bookmarks') : null;
    return safeParseArrayWithBackup<Bookmark>('bookmarks', saved, []);
  });

  const bookmarksRef = useRef(bookmarks);
  bookmarksRef.current = bookmarks;

  // Save bookmarks to localStorage and Electron store (debounced 500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const serialized = JSON.stringify(bookmarks);
        localStorage.setItem('bookmarks', serialized);
        getElectronAPI()?.storeSet?.('bookmarks', serialized);
      } catch (err) {
        logger.warn('useBookmarks', 'Persist failed (quota?) — retrying with trimmed snapshot', err);
        try {
          // Keep newest 100 bookmarks if storage limit reached
          const trimmed = JSON.stringify(bookmarks.slice(-100));
          localStorage.setItem('bookmarks', trimmed);
        } catch (retryErr) {
          logger.error('useBookmarks', 'Trimmed persist also failed', retryErr);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [bookmarks]);

  const handleToggleBookmark = useCallback((tab: Tab) => {
    if (!tab.url || tab.url === 'nova://newtab' || tab.url === 'about:blank') return;
    setBookmarks(prev => {
      const isBookmarked = prev.some(b => b.url === tab.url);
      if (isBookmarked) {
        return prev.filter(b => b.url !== tab.url);
      } else {
        return [...prev, {
          id: generateId('bm'),
          url: tab.url,
          title: tab.title || tab.url,
          favicon: tab.favicon,
          timestamp: Date.now()
        }];
      }
    });
  }, []);

  return {
    bookmarks,
    setBookmarks,
    bookmarksRef,
    handleToggleBookmark
  };
}
