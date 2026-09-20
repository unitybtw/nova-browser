import { useEffect } from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { Tab, UserSettings } from '../types/browser';
import { getElectronAPI } from '../utils/electronBridge';
import { showAlert } from '../utils/confirmDialog';

export type AppEventHandlers = {
  handleNewTab: (url?: string | any, sourceTabId?: string, opts?: { reuseBlank?: boolean }) => void;
  handleNewIncognitoTab: (url?: string) => void;
  handleCloseTab: (id: string, e?: React.MouseEvent) => void;
  handleReopenClosedTab: () => void;
  closeAllModals: () => void;
  handleOpenSettings: () => void;
  handlePrintPage: () => void;
  handleOpenDevTools: () => void;
  handleReload: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleOpenHistory: () => void;
  handleOpenDownloads: () => void;
  handleToggleBookmarkActive: () => void;
  handleGoBack: () => void;
  handleGoForward: () => void;
};

export interface UseAppIpcOptions {
  handlersRef: MutableRefObject<AppEventHandlers>;
  activeTabIdRef: MutableRefObject<string>;
  setIsSpotlightOpen: Dispatch<SetStateAction<boolean>>;
  setIsFindInPageOpen: Dispatch<SetStateAction<boolean>>;
  setHelpInitialTab: Dispatch<SetStateAction<'help' | 'shortcuts' | 'ai' | 'privacy' | 'about'>>;
  setIsHelpOpen: Dispatch<SetStateAction<boolean>>;
  setIsSidePanelOpen: Dispatch<SetStateAction<boolean>>;
  setIsWorkspaceManagerOpen: Dispatch<SetStateAction<boolean>>;
  setIsAccountModalOpen: Dispatch<SetStateAction<boolean>>;
  setSettings: Dispatch<SetStateAction<UserSettings>>;
  queueAIAction: (detail: unknown) => void;
  setTabs: Dispatch<SetStateAction<Tab[]>>;
}

/**
 * Global IPC and Event Listener Hub:
 * - Listens for main process keyboard shortcuts (search, tabs, zoom, devtools, etc.)
 * - Listens for external tab creation requests (normal and incognito)
 * - Handles quick AI trigger events from OS context menu and custom window events
 * - Handles extension installation notifications
 * - Listens for webview audio state and adblock counter updates
 */
export function useAppIpc({
  handlersRef,
  activeTabIdRef,
  setIsSpotlightOpen,
  setIsFindInPageOpen,
  setHelpInitialTab,
  setIsHelpOpen,
  setIsSidePanelOpen,
  setIsWorkspaceManagerOpen,
  setIsAccountModalOpen,
  setSettings,
  queueAIAction,
  setTabs,
}: UseAppIpcOptions): void {
  // Listen to batch ad-block count updates
  useEffect(() => {
    if (typeof window !== 'undefined' && getElectronAPI()?.onAdBlockedBatch) {
      const removeListener = getElectronAPI()?.onAdBlockedBatch((_event: any, batch: Record<number, number>) => {
        setTabs(prev => {
          let changed = false;
          const updated = prev.map(t => {
            const count = t.webContentsId !== undefined ? batch[t.webContentsId] : undefined;
            if (count) {
              changed = true;
              return { ...t, blockedAdsCount: (t.blockedAdsCount || 0) + count };
            }
            return t;
          });
          return changed ? updated : prev;
        });
      });
      return () => removeListener?.();
    }
  }, [setTabs]);

  // Listen for native Chromium webview audio state updates from Electron main process
  useEffect(() => {
    if (typeof window !== 'undefined' && getElectronAPI()?.onTabAudioChanged) {
      const removeListener = getElectronAPI()?.onTabAudioChanged((_event: any, { webContentsId, isPlayingAudio }: { webContentsId: number; isPlayingAudio: boolean }) => {
        setTabs(prevTabs => {
          let changed = false;
          const updated = prevTabs.map(tab => {
            if (tab.webContentsId === webContentsId) {
              if (tab.isPlayingAudio === isPlayingAudio) return tab;
              changed = true;
              return { ...tab, isPlayingAudio };
            }
            return tab;
          });
          return changed ? updated : prevTabs;
        });
      });
      return () => {
        try {
          removeListener?.();
        } catch (_) {}
      };
    }
  }, [setTabs]);

  // Main IPC shortcuts, tab openers, AI quick actions, and custom window event listeners
  useEffect(() => {
    let cleanupShortcut: (() => void) | void;
    let cleanupNewTab: (() => void) | void;

    if (window.electronAPI?.onShortcut) {
      cleanupShortcut = window.electronAPI.onShortcut((_event: any, command: string) => {
        if (command === 'search' || command === 'toggle-omnibox') {
          setIsSpotlightOpen(prev => !prev);
        } else if (command === 'new-tab') {
          handlersRef.current.handleNewTab();
        } else if (command === 'new-incognito') {
          handlersRef.current.handleNewIncognitoTab();
        } else if (command === 'close-tab') {
          if (activeTabIdRef.current) handlersRef.current.handleCloseTab(activeTabIdRef.current);
        } else if (command === 'reopen-tab') {
          handlersRef.current.handleReopenClosedTab();
        } else if (command === 'open-help') {
          handlersRef.current.closeAllModals();
          setHelpInitialTab('help');
          setIsHelpOpen(true);
        } else if (command === 'shortcuts-help') {
          handlersRef.current.closeAllModals();
          setHelpInitialTab('shortcuts');
          setIsHelpOpen(true);
        } else if (command === 'ai-help') {
          handlersRef.current.closeAllModals();
          setHelpInitialTab('ai');
          setIsHelpOpen(true);
        } else if (command === 'privacy-help') {
          handlersRef.current.closeAllModals();
          setHelpInitialTab('privacy');
          setIsHelpOpen(true);
        } else if (command === 'about-help') {
          handlersRef.current.closeAllModals();
          setHelpInitialTab('about');
          setIsHelpOpen(true);
        } else if (command === 'settings') {
          handlersRef.current.handleOpenSettings();
        } else if (command === 'focus-url') {
          const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        } else if (command === 'print') {
          handlersRef.current.handlePrintPage();
        } else if (command === 'devtools') {
          handlersRef.current.handleOpenDevTools();
        } else if (command === 'reload' || command === 'force-reload') {
          handlersRef.current.handleReload();
        } else if (command === 'zoom-in') {
          handlersRef.current.handleZoomIn();
        } else if (command === 'zoom-out') {
          handlersRef.current.handleZoomOut();
        } else if (command === 'zoom-reset') {
          handlersRef.current.handleResetZoom();
        } else if (command === 'history') {
          handlersRef.current.handleOpenHistory();
        } else if (command === 'downloads') {
          handlersRef.current.handleOpenDownloads();
        } else if (command === 'whats-new' || command === 'changelog') {
          handlersRef.current.handleNewTab('nova://changelog', undefined, { reuseBlank: false });
        } else if (command === 'bookmark') {
          handlersRef.current.handleToggleBookmarkActive();
        } else if (command === 'toggle-bookmarks-bar') {
          setSettings(s => ({ ...s, showBookmarksBar: !s.showBookmarksBar }));
        } else if (command === 'find') {
          setIsFindInPageOpen(prev => !prev);
        } else if (command === 'go-back') {
          handlersRef.current.handleGoBack();
        } else if (command === 'go-forward') {
          handlersRef.current.handleGoForward();
        }
      });
    }

    let cleanupNewIncognitoTab: any = null;
    let cleanupQuickAI: any = null;

    if (window.electronAPI?.onNewTab) {
      cleanupNewTab = window.electronAPI.onNewTab((_event: any, url: string) => {
        handlersRef.current.handleNewTab(url, undefined, { reuseBlank: false });
      });
    }

    if (getElectronAPI()?.onNewIncognitoTab) {
      cleanupNewIncognitoTab = getElectronAPI()?.onNewIncognitoTab((_event: any, url?: string) => {
        handlersRef.current.handleNewIncognitoTab(url);
      });
    }

    if (getElectronAPI()?.onQuickAIAction) {
      cleanupQuickAI = getElectronAPI()?.onQuickAIAction((_event: any, text: string) => {
        queueAIAction(`Explain or summarize this selection:\n\n"${typeof text === 'string' ? text : ''}"`);
      });
    }

    const handleQuickAIAction = (event: Event) => {
      queueAIAction((event as CustomEvent).detail);
    };
    let cleanupExtInstall: (() => void) | void;
    if (getElectronAPI()?.onExtensionInstalledSilently) {
      cleanupExtInstall = getElectronAPI()?.onExtensionInstalledSilently((_event: any, data: any) => {
        if (data.success) {
          void showAlert({ title: 'Extensions', message: `Extension successfully installed: ${data.name}` });
        }
      });
    }

    const handleOpenSidePanel = () => setIsSidePanelOpen(true);
    const handleOpenWorkspaceManager = () => setIsWorkspaceManagerOpen(true);
    const handleOpenAccountModal = () => setIsAccountModalOpen(true);
    const handleOpenChangelog = () => handlersRef.current.handleNewTab('nova://changelog', undefined, { reuseBlank: false });
    
    window.addEventListener('ai-quick-action', handleQuickAIAction);
    window.addEventListener('open-ai-sidepanel', handleOpenSidePanel);
    window.addEventListener('open-workspace-manager', handleOpenWorkspaceManager);
    window.addEventListener('open-account-modal', handleOpenAccountModal);
    window.addEventListener('open-changelog', handleOpenChangelog);

    return () => {
      if (typeof cleanupShortcut === 'function') cleanupShortcut();
      if (typeof cleanupNewTab === 'function') cleanupNewTab();
      if (typeof cleanupNewIncognitoTab === 'function') cleanupNewIncognitoTab();
      if (typeof cleanupQuickAI === 'function') cleanupQuickAI();
      if (typeof cleanupExtInstall === 'function') cleanupExtInstall();
      window.removeEventListener('ai-quick-action', handleQuickAIAction);
      window.removeEventListener('open-ai-sidepanel', handleOpenSidePanel);
      window.removeEventListener('open-workspace-manager', handleOpenWorkspaceManager);
      window.removeEventListener('open-account-modal', handleOpenAccountModal);
      window.removeEventListener('open-changelog', handleOpenChangelog);
    };
  }, []);
}
