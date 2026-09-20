import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Bookmark, Folder, Tab, UserSettings, Workspace } from '../types/browser';
import { getElectronAPI } from '../utils/electronBridge';
import { isSafeNavigationUrl } from '../utils/safeNavigation';
import { logger } from '../utils/logger';

export interface UseDiskHydrationFallbackOptions {
  isDemo?: boolean;
  setSettings: Dispatch<SetStateAction<UserSettings>>;
  setWorkspaces: Dispatch<SetStateAction<Workspace[]>>;
  setFolders: Dispatch<SetStateAction<Folder[]>>;
  setBookmarks: Dispatch<SetStateAction<Bookmark[]>>;
  setTabs: Dispatch<SetStateAction<Tab[]>>;
}

/**
 * Disk-backed storage hydration fallback:
 * If localStorage was cleared, corrupted, or exceeded quota, restore
 * session tabs, folders, workspaces, bookmarks, and user settings from
 * the Electron disk store on initial mount.
 */
export function useDiskHydrationFallback({
  isDemo,
  setSettings,
  setWorkspaces,
  setFolders,
  setBookmarks,
  setTabs,
}: UseDiskHydrationFallbackOptions): void {
  useEffect(() => {
    if (isDemo) return;
    const restoreFromDisk = async () => {
      try {
        const electronStore = getElectronAPI();
        if (!electronStore?.storeGet) return;

        // Restore settings if missing from localStorage
        if (!localStorage.getItem('user_settings')) {
          const diskSettings = await electronStore.storeGet('user_settings');
          if (diskSettings) {
            try {
              const parsed = JSON.parse(diskSettings);
              if (parsed && typeof parsed === 'object') {
                setSettings(prev => ({ ...prev, ...parsed }));
                localStorage.setItem('user_settings', diskSettings);
              }
            } catch (err) {
              logger.warn('App:Storage', 'Failed to parse diskSettings from storage', err);
            }
          }
        }

        // Restore workspaces if missing
        if (!localStorage.getItem('workspaces_session')) {
          const diskWorkspaces = await electronStore.storeGet('workspaces_session');
          if (diskWorkspaces) {
            try {
              const parsed = JSON.parse(diskWorkspaces);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setWorkspaces(parsed);
                localStorage.setItem('workspaces_session', diskWorkspaces);
              }
            } catch (err) {
              logger.warn('App:Storage', 'Failed to parse diskWorkspaces from storage', err);
            }
          }
        }

        // Restore folders if missing
        if (!localStorage.getItem('folders_session')) {
          const diskFolders = await electronStore.storeGet('folders_session');
          if (diskFolders) {
            try {
              const parsed = JSON.parse(diskFolders);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setFolders(parsed);
                localStorage.setItem('folders_session', diskFolders);
              }
            } catch (err) {
              logger.warn('App:Storage', 'Failed to parse diskFolders from storage', err);
            }
          }
        }

        // Restore bookmarks if missing
        if (!localStorage.getItem('bookmarks')) {
          const diskBookmarks = await electronStore.storeGet('bookmarks');
          if (diskBookmarks) {
            try {
              const parsed = JSON.parse(diskBookmarks);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setBookmarks(parsed);
                localStorage.setItem('bookmarks', diskBookmarks);
              }
            } catch (err) {
              logger.warn('App:Storage', 'Failed to parse diskBookmarks from storage', err);
            }
          }
        }

        // Restore tabs if missing
        if (!localStorage.getItem('nova_session_tabs')) {
          const diskTabs = await electronStore.storeGet('session_tabs');
          if (diskTabs) {
            try {
              const parsed = JSON.parse(diskTabs);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const safeTabs = parsed.filter((t: any) =>
                  t && typeof t === 'object' && typeof t.id === 'string' && (!t.url || isSafeNavigationUrl(t.url))
                );
                if (safeTabs.length > 0) {
                  setTabs(safeTabs);
                  localStorage.setItem('nova_session_tabs', JSON.stringify(safeTabs));
                }
              }
            } catch (err) {
              logger.warn('App:Storage', 'Failed to parse diskTabs from storage', err);
            }
          }
        }
      } catch (err) {
        logger.warn('App:Storage', 'Fallback restore from disk encountered an error', err);
      }
    };

    restoreFromDisk();
  }, [isDemo, setSettings, setWorkspaces, setFolders, setBookmarks, setTabs]);
}
