import { useEffect } from 'react';
import type { Bookmark, Folder, Tab, UserSettings, Workspace } from '../types/browser';
import { getElectronAPI } from '../utils/electronBridge';
import { logger } from '../utils/logger';

export interface UseSessionPersistenceOptions {
  tabs: Tab[];
  settings: UserSettings;
  activeTabId: string;
  tabsRef: { current: Tab[] };
  activeTabIdRef: { current: string };
  foldersRef: { current: Folder[] };
  settingsRef: { current: UserSettings };
  bookmarksRef: { current: Bookmark[] };
  workspacesRef: { current: Workspace[] };
  activeWorkspaceIdRef: { current: string };
  flushHistory: () => void;
  flushBookmarks: () => void;
  isDemo?: boolean;
  isHydrated?: boolean;
}

/**
 * Session persistence writes extracted verbatim from App.tsx.
 *
 * Contains ONLY the write (persistence) side:
 *  1. settings debounce (500ms, `user_settings` localStorage + storeSet + privacy/doNotTrack IPC)
 *  2. beforeunload + visibilitychange synchronous flush-all
 *     (`nova_session_tabs`/`session_tabs`, `active_tab_session`, `folders_session`,
 *      `user_settings`, `bookmarks`, `workspaces_session`, `active_workspace_session`
 *      + flushBookmarks()/flushHistory())
 *  3. session_tabs debounce (500ms, incognito-filtered)
 *  4. active_tab debounce (300ms, localStorage only)
 *
 * Declaration order matches the original App.tsx order
 * (settings -> beforeunload -> session_tabs -> active_tab) so write
 * ordering/timing stays identical. Debounce durations, JSON keys,
 * try/catch messages are preserved 1:1.
 *
 * Intentionally NOT moved (stay in App.tsx):
 *  - disk-hydration fallback (read side, `storeGet` -> setState)
 *  - VPN persist (`nova_vpn` + setVpn IPC, independent domain)
 *  - debounced writes owned by useBookmarks / useWorkspaces / useHistoryRecorder
 */
export function useSessionPersistence(options: UseSessionPersistenceOptions): void {
  const {
    tabs,
    settings,
    activeTabId,
    tabsRef,
    activeTabIdRef,
    foldersRef,
    settingsRef,
    bookmarksRef,
    workspacesRef,
    activeWorkspaceIdRef,
    flushHistory,
    flushBookmarks,
    isDemo,
    isHydrated = true,
  } = options;

  // Sync settings with local storage and backend (debounced 500ms like tabs:
  // color picker drags must not write localStorage / IPC per pixel)
  useEffect(() => {
    if (isDemo || !isHydrated) return;
    const timer = setTimeout(() => {
      try {
        const serialized = JSON.stringify(settings);
        localStorage.setItem('user_settings', serialized);
        getElectronAPI()?.storeSet?.('user_settings', serialized);
      } catch (err) {
        logger.warn('App:Settings', 'Failed to persist user_settings to storage', err);
      }
      if (window.electronAPI?.setPrivacyShield) {
        window.electronAPI.setPrivacyShield(settings.privacyShield);
      }
      if (window.electronAPI?.setDoNotTrack) {
        getElectronAPI()?.setDoNotTrack(settings.doNotTrack ?? true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [settings, isDemo, isHydrated]);

  // Immediate flush on beforeunload to prevent session loss on abrupt browser close
  // (also flushes debounced settings/bookmarks/workspaces stores)
  useEffect(() => {
    if (isDemo) return;
    const handleBeforeUnload = () => {
      try {
        const sessionTabs = tabsRef.current.filter(t => !t.isIncognito);
        const serializedTabs = JSON.stringify(sessionTabs);
        localStorage.setItem('nova_session_tabs', serializedTabs);
        getElectronAPI()?.storeSet?.('session_tabs', serializedTabs);
        if (activeTabIdRef.current) {
          localStorage.setItem('active_tab_session', activeTabIdRef.current);
          getElectronAPI()?.storeSet?.('active_tab_session', activeTabIdRef.current);
        }
        const serializedFolders = JSON.stringify(foldersRef.current);
        localStorage.setItem('folders_session', serializedFolders);
        getElectronAPI()?.storeSet?.('folders_session', serializedFolders);

        const serializedSettings = JSON.stringify(settingsRef.current);
        localStorage.setItem('user_settings', serializedSettings);
        getElectronAPI()?.storeSet?.('user_settings', serializedSettings);

        const serializedBookmarks = JSON.stringify(bookmarksRef.current);
        localStorage.setItem('bookmarks', serializedBookmarks);
        getElectronAPI()?.storeSet?.('bookmarks', serializedBookmarks);

        const serializedWorkspaces = JSON.stringify(workspacesRef.current);
        localStorage.setItem('workspaces_session', serializedWorkspaces);
        getElectronAPI()?.storeSet?.('workspaces_session', serializedWorkspaces);

        localStorage.setItem('active_workspace_session', activeWorkspaceIdRef.current);
        flushBookmarks();
        flushHistory();
      } catch (err) {
        logger.warn('App:Lifecycle', 'Failed to save session state before unload', err);
      }
    };
    const handleVisibilityHidden = () => {
      if (document.visibilityState === 'hidden') handleBeforeUnload();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityHidden);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityHidden);
    };
  }, [
    flushHistory,
    flushBookmarks,
    isDemo,
    tabsRef,
    activeTabIdRef,
    foldersRef,
    settingsRef,
    bookmarksRef,
    workspacesRef,
    activeWorkspaceIdRef,
  ]);

  // Save session whenever tabs changes (Excluding Incognito Tabs)
  useEffect(() => {
    if (isDemo || !isHydrated) return;
    const sessionTabs = tabs
      .filter(t => !t.isIncognito);
    const timer = setTimeout(() => {
      try {
        const serialized = JSON.stringify(sessionTabs);
        localStorage.setItem('nova_session_tabs', serialized);
        getElectronAPI()?.storeSet?.('session_tabs', serialized);
      } catch (err) {
        logger.warn('App:Session', 'Failed to persist session_tabs to storage', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [tabs, isDemo, isHydrated]);

  useEffect(() => {
    if (isDemo || !isHydrated) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('active_tab_session', activeTabId);
      } catch (err) {
        logger.warn('App:Session', 'Failed to persist active_tab_session to storage', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTabId, isDemo, isHydrated]);
}
