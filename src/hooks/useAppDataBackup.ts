import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { Bookmark, HistoryItem, UserSettings } from '../types/browser';
import { isSafeNavigationUrl } from '../utils/safeNavigation';
import { generateId } from '../utils/idGenerator';
import { showAlert } from '../utils/confirmDialog';
import { mergeSyncedCollection, normalizeBookmarkUrl } from '../services/syncService';

export interface UseAppDataBackupOptions {
  /**
   * The RAW store, tombstoned rows included. This is deliberately not the live
   * view the UI renders: exporting only live rows would bake a backup that
   * cannot represent a deletion, so restoring it would resurrect every item the
   * user had deleted.
   */
  bookmarkRows: Bookmark[];
  history: HistoryItem[];
  settings: UserSettings;
  setBookmarks: Dispatch<SetStateAction<Bookmark[]>>;
  setHistory: Dispatch<SetStateAction<HistoryItem[]>>;
  setSettings: Dispatch<SetStateAction<UserSettings>>;
}

export function useAppDataBackup({
  bookmarkRows,
  history,
  settings,
  setBookmarks,
  setHistory,
  setSettings,
}: UseAppDataBackupOptions) {
  const handleExportData = useCallback(() => {
    const backup = {
      version: '1.0',
      timestamp: Date.now(),
      bookmarks: bookmarkRows,
      history,
      settings
    };
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nova_browser_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [bookmarkRows, history, settings]);

  const handleImportData = useCallback((file: File) => {
    const reader = new FileReader();
    // Only onload was wired, so an unreadable file (permissions, moved/deleted
    // meanwhile, a directory) or a cancelled read was completely silent: the
    // user clicked Import and nothing at all happened. Route both through the
    // same alert the success/failure paths already use.
    const reportReadFailure = (reason: string, detail?: string) => {
      console.error('Backup import read error:', detail || reason);
      void showAlert({ title: 'Import Data', message: `Failed to import backup: ${reason}` });
    };
    reader.onerror = () => reportReadFailure('the selected file could not be read.', reader.error?.message);
    reader.onabort = () => reportReadFailure('the import was cancelled.');
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        let importedSomething = false;

        if (data.bookmarks && Array.isArray(data.bookmarks)) {
          const sanitizedBookmarks = sanitizeImportedBookmarks(data.bookmarks);
          if (sanitizedBookmarks.length > 0) {
            // Union merge, not replace. Replacing the store dropped every local
            // tombstone, so a restore brought deleted bookmarks back AND this
            // device then pushed them as live rows, undoing the delete on every
            // other signed-in device. Reusing the sync merge keeps ONE policy for
            // "which row wins" instead of a second, subtly different one here:
            // a local tombstone outranks an older live row from the backup, and a
            // tombstone inside the backup suppresses the matching local row.
            //
            // No cap here on purpose: capSyncedCollection exists to bound the
            // UPLOAD payload, and the local store has no size limit of its own
            // (its "keep newest 100" is only a fallback after a storage-quota
            // failure). Applying an upload cap to the store would silently drop
            // the user's oldest bookmarks on every import.
            setBookmarks(current => mergeImportedBookmarks(current, sanitizedBookmarks));
            importedSomething = true;
          }
        }

        if (data.history && Array.isArray(data.history)) {
          const sanitizedHistory: HistoryItem[] = data.history
            .filter((h: any) =>
              h && typeof h === 'object' && typeof h.url === 'string' && isSafeNavigationUrl(h.url)
            )
            .map((h: any) => ({
              id: typeof h.id === 'string' && h.id ? h.id : generateId('hist'),
              title: typeof h.title === 'string' ? h.title.slice(0, 500) : 'Visited Page',
              url: h.url,
              timestamp: typeof h.timestamp === 'number' ? h.timestamp : Date.now(),
              visitCount: typeof h.visitCount === 'number' ? h.visitCount : 1,
              typedCount: typeof h.typedCount === 'number' ? h.typedCount : 0,
            }));
          if (sanitizedHistory.length > 0) {
            setHistory(sanitizedHistory);
            importedSomething = true;
          }
        }

        if (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
          const raw = data.settings;
          const safeSettings: Partial<UserSettings> = {};
          if (typeof raw.theme === 'string' && ['dark', 'light', 'system'].includes(raw.theme)) safeSettings.theme = raw.theme;
          if (typeof raw.searchEngine === 'string' && ['google', 'duckduckgo', 'bing', 'brave', 'ecosia', 'yahoo'].includes(raw.searchEngine)) safeSettings.searchEngine = raw.searchEngine;
          if (typeof raw.privacyShield === 'boolean') safeSettings.privacyShield = raw.privacyShield;
          if (typeof raw.useVerticalTabs === 'boolean') safeSettings.useVerticalTabs = raw.useVerticalTabs;
          if (typeof raw.fontSize === 'string' && ['small', 'medium', 'large'].includes(raw.fontSize)) safeSettings.fontSize = raw.fontSize;
          if (typeof raw.tabStyle === 'string' && ['rounded', 'square', 'floating'].includes(raw.tabStyle)) safeSettings.tabStyle = raw.tabStyle;
          if (typeof raw.tabAnimation === 'string' && ['chrome', 'smooth', 'snappy', 'none'].includes(raw.tabAnimation)) safeSettings.tabAnimation = raw.tabAnimation;
          if (typeof raw.doNotTrack === 'boolean') safeSettings.doNotTrack = raw.doNotTrack;
          if (typeof raw.clearOnExit === 'boolean') safeSettings.clearOnExit = raw.clearOnExit;
          if (typeof raw.hardwareAcceleration === 'boolean') safeSettings.hardwareAcceleration = raw.hardwareAcceleration;
          if (typeof raw.tabHibernationEnabled === 'boolean') safeSettings.tabHibernationEnabled = raw.tabHibernationEnabled;
          if (typeof raw.aiLinkPreviewEnabled === 'boolean') safeSettings.aiLinkPreviewEnabled = raw.aiLinkPreviewEnabled;
          if (typeof raw.energySaverMode === 'boolean') safeSettings.energySaverMode = raw.energySaverMode;
          if (typeof raw.preloadDnsEnabled === 'boolean') safeSettings.preloadDnsEnabled = raw.preloadDnsEnabled;
          if (typeof raw.smoothScrollingEnabled === 'boolean') safeSettings.smoothScrollingEnabled = raw.smoothScrollingEnabled;
          if (typeof raw.newTabBackground === 'string' && ['default', 'gradient', 'mesh', 'glass', 'unsplash', 'custom_url', 'aurora_waves', 'cyber_grid', 'hyper_space', 'fireflies', 'nebula', 'matrix'].includes(raw.newTabBackground)) safeSettings.newTabBackground = raw.newTabBackground;
          if (typeof raw.backgroundCustomUrl === 'string' && isSafeNavigationUrl(raw.backgroundCustomUrl)) safeSettings.backgroundCustomUrl = raw.backgroundCustomUrl;
          if (typeof raw.accentColor === 'string' && ['blue', 'emerald', 'purple', 'rose', 'amber', 'custom'].includes(raw.accentColor)) safeSettings.accentColor = raw.accentColor;
          if (typeof raw.customAccentColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.customAccentColor)) safeSettings.customAccentColor = raw.customAccentColor;
          if (typeof raw.browserColor === 'string' && ['default', 'midnight', 'cyberpunk', 'forest', 'crimson', 'warm', 'ocean', 'sunset', 'custom'].includes(raw.browserColor)) safeSettings.browserColor = raw.browserColor as any;
          if (typeof raw.customBrowserColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.customBrowserColor)) safeSettings.customBrowserColor = raw.customBrowserColor;
          setSettings(prev => ({ ...prev, ...safeSettings }));
          importedSomething = true;
        }

        if (importedSomething) {
          void showAlert({
            title: 'Import Data',
            message: 'Backup merged in. Existing bookmarks were kept, and anything you deleted stays deleted.'
          });
        } else {
          void showAlert({ title: 'Import Data', message: 'No valid data found in backup file.' });
        }
      } catch (err) {
        console.error('Backup import error:', err);
        void showAlert({ title: 'Import Data', message: 'Failed to import backup: Invalid JSON or corrupted file.' });
      }
    };
    reader.readAsText(file);
  }, [setBookmarks, setHistory, setSettings]);

  return {
    handleExportData,
    handleImportData,
  };
}

/**
 * Validate and normalise bookmark rows coming out of a backup file.
 *
 * Exported so the import path can be tested without a FileReader. It rebuilds
 * each row field by field, which is exactly why `deletedAt` had to be carried
 * over explicitly: a sanitiser that forgets one field silently drops it, and a
 * dropped `deletedAt` turns a backup row back into a live one.
 */
export function sanitizeImportedBookmarks(raw: unknown): Bookmark[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b: any) =>
      b && typeof b === 'object' && typeof b.url === 'string' && isSafeNavigationUrl(b.url)
    )
    .map((b: any) => ({
      id: typeof b.id === 'string' && b.id ? b.id : generateId('bm'),
      title: typeof b.title === 'string' ? b.title.slice(0, 500) : 'Bookmark',
      url: b.url,
      timestamp: typeof b.timestamp === 'number' ? b.timestamp : (typeof b.createdAt === 'number' ? b.createdAt : Date.now()),
      favicon: typeof b.favicon === 'string' && (b.favicon.startsWith('https://') || b.favicon.startsWith('data:image/')) ? b.favicon : undefined,
      deletedAt: typeof b.deletedAt === 'number' && Number.isFinite(b.deletedAt) && b.deletedAt > 0
        ? b.deletedAt
        : undefined,
    }));
}

/**
 * Fold a backup's bookmarks into the local store.
 *
 * Delegates to the sync merge so the tombstone rules are defined once. Exported
 * for the same reason as {@link sanitizeImportedBookmarks}: the policy that
 * decides whether a restore may resurrect a deleted bookmark must be testable
 * without driving a file input.
 */
export function mergeImportedBookmarks(current: Bookmark[], imported: Bookmark[]): Bookmark[] {
  return mergeSyncedCollection(current, imported, {
    keyOf: (b: Bookmark) => b.id,
    // A bookmark is identified by its URL too: ids are minted per device, so a
    // backup imported on a second machine would otherwise re-add rows the user
    // deleted there.
    aliasKeyOf: (b: Bookmark) => normalizeBookmarkUrl(b.url),
    now: Date.now(),
  });
}
