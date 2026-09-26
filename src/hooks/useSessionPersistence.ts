import { useEffect, useRef } from 'react';
import type { Bookmark, Folder, Tab, UserSettings, Workspace } from '../types/browser';
import { getElectronAPI } from '../utils/electronBridge';
import { logger } from '../utils/logger';

/**
 * Tab fields that represent durable state and must therefore trigger a
 * `session_tabs` disk write when they change.
 *
 * Deliberately EXCLUDED (runtime-only, re-derived on hydration/restore):
 *   - `blockedAdsCount` — bumped every 300ms by the `ad-blocked-batch` IPC
 *   - `isLoading`, `canGoBack`, `canGoForward` — webview navigation state
 *   - `webContentsId` — runtime handle, re-assigned on attach
 *   - `lastAccessed` — LRU hint, defaulted during hydration (App.tsx)
 *   - `thumbnail` — ephemeral preview cache, re-generated on demand
 */
const PERSISTED_TAB_FIELDS = [
  'id',
  'url',
  'title',
  'favicon',
  'isPinned',
  'isMuted',
  'isPlayingAudio',
  'isSuspended',
  'isIncognito',
  'splitWith',
  'zoomFactor',
  'workspaceId',
  'folderId',
  'isTranslated',
  'translatedLang',
] as const satisfies readonly (keyof Tab)[];

/**
 * Builds a cheap structural fingerprint of the tab list.
 * Two invocations producing the same string guarantee the persisted JSON is
 * identical, so the write can be skipped entirely.
 */
function buildTabSignature(tabs: Tab[]): string {
  let signature = '';
  for (const tab of tabs) {
    for (const field of PERSISTED_TAB_FIELDS) {
      const value = tab[field];
      // 1-char encoding for flags keeps the fingerprint small and collision-free
      // for booleans, while strings/numbers fall back to their JSON form.
      if (typeof value === 'boolean' || value === undefined) {
        signature += value === true ? '1' : '0';
      } else {
        signature += `${JSON.stringify(value)},`;
      }
    }
    signature += ';';
  }
  return signature;
}

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
 *  3. session_tabs debounce (500ms, incognito-filtered, structural-change gated)
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
  //
  // Perf guard: the ad-block counter replaces the `tabs` array reference every
  // 300ms, which used to cause a continuous `JSON.stringify` + localStorage +
  // storeSet (disk) write storm on ad-heavy pages. We fingerprint only the
  // durable fields (PERSISTED_TAB_FIELDS) and skip the debounce entirely when
  // nothing structural changed. The signature is recorded as soon as the write
  // is *scheduled* so bursts inside the 500ms window also collapse into one
  // write. Transient counters are still flushed by the beforeunload /
  // visibilitychange handler above, which reads live refs.
  const lastPersistedTabsSignature = useRef<string | null>(null);
  useEffect(() => {
    if (isDemo || !isHydrated) return;
    const sessionTabs = tabs
      .filter(t => !t.isIncognito);
    const signature = buildTabSignature(sessionTabs);
    if (lastPersistedTabsSignature.current === signature) return;
    lastPersistedTabsSignature.current = signature;
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
