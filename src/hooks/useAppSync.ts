import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type {
  Bookmark,
  Folder,
  HistoryItem,
  UserSettings,
  Workspace,
  SavedPassword,
} from '../types/browser';
import {
  mergeSyncedHistory,
  mergeSyncedSettings,
  remergeSyncedCollection,
  remergeSyncedCollectionOf,
  syncService,
} from '../services/syncService';
import { getElectronAPI } from '../utils/electronBridge';
import { logger } from '../utils/logger';

export interface UseAppSyncOptions {
  /**
   * Raw row sets, tombstones included. The live views the UI renders are
   * derived from these in useBookmarks/useWorkspaces; sync needs the rows
   * themselves, otherwise a delete held only as a tombstone would be dropped
   * from the push and come back from the other devices.
   */
  bookmarkRows: Bookmark[];
  folderRows: Folder[];
  history: HistoryItem[];
  settings: UserSettings;
  workspaceRows: Workspace[];
  setBookmarks: Dispatch<SetStateAction<Bookmark[]>>;
  setFolders: Dispatch<SetStateAction<Folder[]>>;
  setHistory: Dispatch<SetStateAction<HistoryItem[]>>;
  setSettings: Dispatch<SetStateAction<UserSettings>>;
  setWorkspaces: Dispatch<SetStateAction<Workspace[]>>;
}

/** The merged collections a completed sync hands back. */
export interface SyncedCollections {
  bookmarks: Bookmark[];
  folders: Folder[];
  history: HistoryItem[];
  settings: UserSettings;
  workspaces: Workspace[];
}

type SyncedCollectionSetters = Pick<
  UseAppSyncOptions,
  'setBookmarks' | 'setFolders' | 'setHistory' | 'setSettings' | 'setWorkspaces'
>;

/**
 * Apply a completed sync to the live app state.
 *
 * Every write is a functional updater that merges against the CURRENT value, never
 * a full replacement. A round-trip takes 0.5-3s (two PBKDF2 derivations, a read
 * and an upsert) and the result was computed from the rows as they were when the
 * request went out, so replacing state with it destroys anything the user did in
 * that window — a bookmark added, a folder deleted, a setting flipped — and since
 * the pushed bundle was built from the same stale snapshot, that change was never
 * uploaded either. It is lost locally and remotely, silently.
 *
 * Re-merging keeps the in-flight change (the current rows are the local side, the
 * same side the sync merge gave them) while remote-only rows, remote tombstones
 * and retention purges still land, and the tombstone precedence stays the one
 * `mergeSyncedCollection` defines.
 *
 * `settingsAtRequest` is the settings that were pushed: it is what lets the
 * settings merge distinguish a field the user changed mid-sync from one they
 * left alone. Exported so the rule is driven by the real function, not restated.
 */
export function applySyncedData(
  synced: SyncedCollections,
  setters: SyncedCollectionSetters,
  settingsAtRequest: UserSettings
): void {
  const { setBookmarks, setFolders, setHistory, setSettings, setWorkspaces } = setters;
  setBookmarks(current => remergeSyncedCollection('bookmarks', current, synced.bookmarks));
  setFolders(current => remergeSyncedCollection('folders', current, synced.folders));
  setHistory(current => mergeSyncedHistory(current, synced.history));
  setSettings(current => mergeSyncedSettings(current, synced.settings, settingsAtRequest));
  setWorkspaces(current => remergeSyncedCollection('workspaces', current, synced.workspaces));
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
 *   → `applySyncedData` (5 setter, her biri mevcut state ile BİRLEŞTİRİR —
 *   snapshot'ın üstüne yazmaz, bkz. applySyncedData) + secureStore yazma.
 * - Sıralama aynen korunur: background auto-sync (2500ms) → realtime
 *   `onRemoteChange` listener. Cleanup'lar aynen korunur
 *   (clearTimeout / unsubscribe).
 * - Deps notu: orijinal App deps'i [bookmarks, folders, history, settings,
 *   workspaces] idi; setter Dispatch identity'leri stabil olduğu için dep
 *   listesine eklenmeleri re-subscribe zamanlamasını değiştirmez.
 */
export function useAppSync({
  bookmarkRows,
  folderRows,
  history,
  settings,
  workspaceRows,
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
        bookmarks: bookmarkRows,
        folders: folderRows,
        history,
        passwords: localPasswords,
        settings,
        workspaces: workspaceRows
      });

      if (syncResult && syncResult.mergedData) {
        const { mergedData } = syncResult;
        // `settings` is the snapshot the pushed bundle was built from, so the
        // settings merge can tell an untouched field from a mid-sync change.
        applySyncedData(
          mergedData,
          { setBookmarks, setFolders, setHistory, setSettings, setWorkspaces },
          settings
        );

        if (mergedData.passwords && getElectronAPI()?.secureStoreSet) {
          // Re-merge, do not replace. The vault read happened at t0 and this write
          // lands 0.5-3s later; a password deleted in between was never in the
          // pushed bundle, so a full replacement resurrects it locally AND the
          // next push index records it as present, losing the delete for good.
          const secureStoreGet = getElectronAPI()?.secureStoreGet;
          let currentPasswords: any[] = [];
          try {
            const raw = await secureStoreGet?.('passwords');
            if (raw) currentPasswords = JSON.parse(raw);
          } catch (e) {
            logger.warn('App:Sync', 'Could not read current credentials for re-merge', e);
          }
          await getElectronAPI()?.secureStoreSet(
            'passwords',
            JSON.stringify(
              Array.isArray(currentPasswords)
                ? remergeSyncedCollectionOf('passwords', currentPasswords, mergedData.passwords)
                : mergedData.passwords
            )
          );
        }
      }
    } catch (err) {
      console.error('[NovaSync] Sync execution failed:', err);
      throw err;
    }
  }, [bookmarkRows, folderRows, history, settings, workspaceRows, setBookmarks, setFolders, setHistory, setSettings, setWorkspaces]);

  const handlePerformSyncRef = useRef(handlePerformSync);
  handlePerformSyncRef.current = handlePerformSync;

  // Background auto-sync on initial app load or as soon as login/session resolves
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let didInitialSyncForSession = false;

    const unsubscribe = syncService.subscribe((status) => {
      if (status.isLoggedIn) {
        if (!didInitialSyncForSession) {
          didInitialSyncForSession = true;
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            handlePerformSyncRef.current().catch(() => {});
          }, 2500);
        }
      } else {
        didInitialSyncForSession = false;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Realtime Supabase change listener across other active devices
  useEffect(() => {
    const unsubscribe = syncService.onRemoteChange(() => {
      if (syncService.getStatus().isSyncing) {
        logger.debug('NovaSync', 'Skipping remote change pull: sync already in progress');
        return;
      }
      logger.debug('NovaSync', 'Triggering background pull for remote changes');
      handlePerformSyncRef.current().catch(() => {});
    });
    return () => { unsubscribe(); };
  }, []);

  return { handlePerformSync };
}
