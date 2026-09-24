import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  Bookmark,
  Folder,
  HistoryItem,
  UserSettings,
  Workspace,
  SavedPassword,
} from '../types/browser';
import { syncService } from '../services/syncService';
import { getElectronAPI } from '../utils/electronBridge';
import { logger } from '../utils/logger';

export interface UseAppSyncOptions {
  bookmarks: Bookmark[];
  folders: Folder[];
  history: HistoryItem[];
  settings: UserSettings;
  workspaces: Workspace[];
  setBookmarks: Dispatch<SetStateAction<Bookmark[]>>;
  setFolders: Dispatch<SetStateAction<Folder[]>>;
  setHistory: Dispatch<SetStateAction<HistoryItem[]>>;
  setSettings: Dispatch<SetStateAction<UserSettings>>;
  setWorkspaces: Dispatch<SetStateAction<Workspace[]>>;
}

/**
 * Cloud sync handler + background auto-sync + realtime listener.
 * App.tsx'ten birebir taşıma (pure code motion).
 *
 * - Hook state YAZMAZ (kendi useState'i yok); sadece App'in setter'larını
 *   çağırır (tek yönlü veri akışı korunur).
 * - `handlePerformSync` gövdesi aynen korunur: providedMergedData yolu
 *   (SyncSection/AccountModal'dan gelen merge) 5 App state'ine yazar
 *   (bookmarks/folders/history/settings/workspaces) + secureStore
 *   password yazma; tam sync yolu secureStore okuma → syncService.syncData
 *   → 5 setter + secureStore yazma.
 * - Sıralama aynen korunur: background auto-sync (2500ms) → realtime
 *   `onRemoteChange` listener. Cleanup'lar aynen korunur
 *   (clearTimeout / unsubscribe).
 * - Deps notu: orijinal App deps'i [bookmarks, folders, history, settings,
 *   workspaces] idi; setter Dispatch identity'leri stabil olduğu için dep
 *   listesine eklenmeleri re-subscribe zamanlamasını değiştirmez.
 */
export function useAppSync({
  bookmarks,
  folders,
  history,
  settings,
  workspaces,
  setBookmarks,
  setFolders,
  setHistory,
  setSettings,
  setWorkspaces,
}: UseAppSyncOptions): {
  handlePerformSync: (providedMergedData?: any) => Promise<void>;
} {
  // Cloud Sync Handler
  const handlePerformSync = useCallback(async (providedMergedData?: any) => {
    try {
      if (providedMergedData) {
        if (providedMergedData.bookmarks && Array.isArray(providedMergedData.bookmarks)) {
          setBookmarks(providedMergedData.bookmarks);
        }
        if (providedMergedData.folders && Array.isArray(providedMergedData.folders)) {
          setFolders(providedMergedData.folders);
        }
        if (providedMergedData.history && Array.isArray(providedMergedData.history)) {
          setHistory(providedMergedData.history);
        }
        if (providedMergedData.settings && typeof providedMergedData.settings === 'object') {
          setSettings(prev => ({ ...prev, ...providedMergedData.settings }));
        }
        if (providedMergedData.workspaces && Array.isArray(providedMergedData.workspaces)) {
          setWorkspaces(providedMergedData.workspaces);
        }
        return;
      }

      let localPasswords: SavedPassword[] = [];
      try {
        const rawP = await getElectronAPI()?.secureStoreGet?.('passwords');
        if (rawP) localPasswords = JSON.parse(rawP);
      } catch (err) {
        logger.warn('App:Sync', 'Failed to retrieve or parse secure passwords for sync', err);
      }

      const syncResult = await syncService.syncData({
        bookmarks,
        folders,
        history,
        passwords: localPasswords,
        settings,
        workspaces
      });

      if (syncResult && syncResult.mergedData) {
        const { mergedData } = syncResult;
        setBookmarks(mergedData.bookmarks);
        setFolders(mergedData.folders);
        setHistory(mergedData.history);
        setSettings(mergedData.settings);
        setWorkspaces(mergedData.workspaces);

        if (mergedData.passwords && getElectronAPI()?.secureStoreSet) {
          await getElectronAPI()?.secureStoreSet('passwords', JSON.stringify(mergedData.passwords));
        }
      }
    } catch (err) {
      console.error('[NovaSync] Sync execution failed:', err);
      throw err;
    }
  }, [bookmarks, folders, history, settings, workspaces, setBookmarks, setFolders, setHistory, setSettings, setWorkspaces]);

  const handlePerformSyncRef = useRef(handlePerformSync);
  handlePerformSyncRef.current = handlePerformSync;

  // Background auto-sync on initial app load if already authenticated
  useEffect(() => {
    const status = syncService.getStatus();
    if (status.isLoggedIn) {
      const timer = setTimeout(() => {
        handlePerformSyncRef.current().catch(() => {});
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Realtime Supabase change listener across other active devices
  useEffect(() => {
    const unsubscribe = syncService.onRemoteChange(() => {
      logger.debug('NovaSync', 'Triggering background pull for remote changes');
      handlePerformSyncRef.current().catch(() => {});
    });
    return () => { unsubscribe(); };
  }, []);

  return { handlePerformSync };
}
