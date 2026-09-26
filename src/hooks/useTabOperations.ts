import { useCallback } from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { Tab } from '../types/browser';
import { generateId } from '../utils/idGenerator';
import { isSafeNavigationUrl } from '../utils/safeNavigation';
import { reorderTabsWithinGroup } from '../utils/verticalTabs';
import { tabThumbnailCache } from '../services/thumbnailCache';
import { aiAgent } from '../services/aiAgent';
import { getElectronAPI } from '../utils/electronBridge';
import { showAlert } from '../utils/confirmDialog';
import { logger } from '../utils/logger';

export interface UseTabOperationsOptions {
  tabsRef: MutableRefObject<Tab[]>;
  activeTabId: string;
  activeTabIdRef: MutableRefObject<string>;
  splitTabId: string | null;
  activeWorkspaceId: string;
  activeWorkspaceIdRef: MutableRefObject<string>;
  setTabs: Dispatch<SetStateAction<Tab[]>>;
  setActiveTabId: Dispatch<SetStateAction<string>>;
  pushClosedTab: (tab: Tab) => void;
  pushClosedTabs: (tabs: Tab[]) => void;
  recordVisit: (tab: Tab, updates: Partial<Tab>) => void;
  setIsExtensionsOpen: (open: boolean) => void;
}

export function useTabOperations({
  tabsRef,
  activeTabId,
  activeTabIdRef,
  splitTabId,
  activeWorkspaceId,
  activeWorkspaceIdRef,
  setTabs,
  setActiveTabId,
  pushClosedTab,
  pushClosedTabs,
  recordVisit,
  setIsExtensionsOpen,
}: UseTabOperationsOptions) {
  // Select/focus tab & reset hibernation timer
  const handleSelectTab = useCallback((id: string) => {
    // Performance: skip the setTabs cascade when re-selecting the active tab
    // unless it needs waking from hibernation.
    if (id === activeTabIdRef.current && !tabsRef.current.find(t => t.id === id)?.isSuspended) {
      return;
    }
    if (!tabsRef.current.some(t => t.id === id)) return;
    setActiveTabId(id);
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isSuspended: false, lastAccessed: Date.now() } : t));
  }, [activeTabIdRef, tabsRef, setActiveTabId, setTabs]);

  // Manual tab suspension
  const handleSuspendTab = useCallback((id: string) => {
    setTabs(prev => prev.map(t => (t.id === id && t.id !== activeTabId && t.id !== splitTabId && !t.isPlayingAudio) ? { ...t, isSuspended: true } : t));
  }, [activeTabId, splitTabId, setTabs]);

  // Instant RAM & Cache Purge Engine
  const handlePurgeMemory = useCallback(async () => {
    // 1. Suspend all background inactive tabs immediately
    setTabs(prev => prev.map(t => (t.id !== activeTabId && t.id !== splitTabId && !t.isPlayingAudio && !t.isPinned) ? { ...t, isSuspended: true } : t));
    // 2. Clear thumbnail memory cache
    tabThumbnailCache.clear();
    // 3. Terminate background AI worker and release GPU VRAM
    try {
      await aiAgent.unload();
    } catch (err) {
      console.warn('Purge AI worker error:', err);
    }
    // 4. Invoke native Electron session cache purge & host resolver trim
    try {
      if (getElectronAPI()?.purgeSystemMemory) {
        await getElectronAPI()?.purgeSystemMemory();
      }
    } catch (err) {
      console.error('Purge system memory error:', err);
    }
  }, [activeTabId, splitTabId, setTabs]);

  // Tab Close Handler (Graceful Navigation & Multi-Process Cleanup)
  // All side effects (closed-tabs stack, active-tab selection, incognito session
  // cleanup) are computed from tabsRef OUTSIDE the setState updater so every
  // updater stays pure (StrictMode double-invokes updater functions in dev).
  const handleCloseTab = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    tabThumbnailCache.remove(id);
    const prevTabs = tabsRef.current;
    const targetTab = prevTabs.find(t => t.id === id);
    const activeWs = activeWorkspaceIdRef.current || 'default';
    const workspaceTabs = prevTabs.filter(t => (t.workspaceId || 'default') === activeWs);
    if (workspaceTabs.length <= 1 && workspaceTabs.some(t => t.id === id)) {
      if (targetTab?.isIncognito && getElectronAPI()?.clearIncognitoSession) {
        getElectronAPI()?.clearIncognitoSession(targetTab.id)?.catch((e: any) => console.error(e));
        const remainingIncognitoTabs = prevTabs.some(t => t.isIncognito && t.id !== id);
        if (!remainingIncognitoTabs) {
          getElectronAPI()?.clearIncognitoSession()?.catch((e: any) => console.error(e));
        }
      }
      if (targetTab && (targetTab.url !== 'nova://newtab' || targetTab.canGoBack)) {
        pushClosedTab(targetTab);
      }
      // Reset sole tab in place without unmounting or regenerating tab ID.
      // This prevents animation glitching, unmount/remount churn, and rightward drift.
      setTabs(prev => prev.map(t => {
        if (t.id === id) {
          return {
            ...t,
            url: 'nova://newtab',
            title: 'New Tab',
            isLoading: false,
            canGoBack: false,
            canGoForward: false,
            isIncognito: false,
            favicon: undefined,
            splitWith: undefined,
            isPinned: false,
            folderId: undefined,
            zoomFactor: undefined,
            isMuted: false,
            lastAccessed: Date.now()
          };
        }
        return t.splitWith === id ? { ...t, splitWith: undefined } : t;
      }));
      setActiveTabId(id);
      return;
    }

    if (prevTabs.length <= 1) {
      if (targetTab?.isIncognito && getElectronAPI()?.clearIncognitoSession) {
        getElectronAPI()?.clearIncognitoSession(targetTab.id)?.catch((e: any) => console.error(e));
        const remainingIncognitoTabs = prevTabs.some(t => t.isIncognito && t.id !== id);
        if (!remainingIncognitoTabs) {
          getElectronAPI()?.clearIncognitoSession()?.catch((e: any) => console.error(e));
        }
      }
      if (targetTab && (targetTab.url !== 'nova://newtab' || targetTab.canGoBack)) {
        pushClosedTab(targetTab);
      }
      setTabs(prev => prev.map(t => ({
        ...t,
        url: 'nova://newtab',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        isIncognito: false,
        favicon: undefined,
        splitWith: undefined,
        isPinned: false,
        folderId: undefined,
        zoomFactor: undefined,
        isMuted: false,
        lastAccessed: Date.now()
      })));
      return;
    }

    const targetIdx = prevTabs.findIndex(t => t.id === id);
    const newTabs = prevTabs
      .filter(t => t.id !== id)
      .map(t => t.splitWith === id ? { ...t, splitWith: undefined } : t);

    if (targetTab) {
      pushClosedTab(targetTab);
    }

    if (activeTabIdRef.current === id && newTabs.length > 0) {
      const partnerTab = targetTab?.splitWith ? newTabs.find(t => t.id === targetTab.splitWith) : null;
      if (partnerTab) {
        setActiveTabId(partnerTab.id);
      } else {
        const targetWs = targetTab?.workspaceId || activeWs;
        const remainingWsTabs = newTabs.filter(t => (t.workspaceId || 'default') === targetWs);
        if (remainingWsTabs.length > 0) {
          const normalTab = remainingWsTabs.find(t => !t.isIncognito);
          const wsTargetIdx = workspaceTabs.findIndex(t => t.id === id);
          const nextWsIdx = Math.min(Math.max(0, wsTargetIdx), remainingWsTabs.length - 1);
          const nextCandidate = (targetTab?.isIncognito && normalTab) ? normalTab : remainingWsTabs[nextWsIdx];
          setActiveTabId(nextCandidate.id);
        } else {
          const nextActiveIdx = Math.min(Math.max(0, targetIdx), newTabs.length - 1);
          setActiveTabId(newTabs[nextActiveIdx].id);
        }
      }
    }

    // If closing an incognito tab, always clear that tab's specific partition immediately.
    // If no more incognito tabs remain, also clear the legacy shared partition for safety.
    if (targetTab?.isIncognito) {
      if (getElectronAPI()?.clearIncognitoSession) {
        getElectronAPI()?.clearIncognitoSession(targetTab.id)?.catch((e: any) => console.error(e));
      }
      const remainingIncognitoTabs = newTabs.some(t => t.isIncognito);
      if (!remainingIncognitoTabs && getElectronAPI()?.clearIncognitoSession) {
        getElectronAPI()?.clearIncognitoSession()?.catch((e: any) => console.error(e));
      }
    }

    setTabs(newTabs);
  }, [activeWorkspaceId, pushClosedTab, tabsRef, activeWorkspaceIdRef, setTabs, setActiveTabId, activeTabIdRef]);

  // Tab Reordering (Drag and Drop)
  const handleReorderTabs = useCallback((draggedId: string, targetId: string) => {
    const nextTabs = reorderTabsWithinGroup(tabsRef.current, draggedId, targetId);
    if (nextTabs !== tabsRef.current) setTabs(nextTabs);
  }, [tabsRef, setTabs]);

  const handleReorderFullList = useCallback((reorderedWorkspaceTabs: Tab[]) => {
    setTabs(prevTabs => {
      const activeWs = activeWorkspaceId || 'default';
      const workspaceIds = new Set(reorderedWorkspaceTabs.map(t => t.id));
      const nonWorkspaceTabs = prevTabs.filter(t => !workspaceIds.has(t.id) && (t.workspaceId || 'default') !== activeWs);
      // Guarantee any tab from the current workspace that was omitted is preserved
      const missingWorkspaceTabs = prevTabs.filter(t => (t.workspaceId || 'default') === activeWs && !workspaceIds.has(t.id));
      return [...reorderedWorkspaceTabs, ...missingWorkspaceTabs, ...nonWorkspaceTabs];
    });
  }, [activeWorkspaceId, setTabs]);

  const handleDuplicateTab = useCallback((tabId: string) => {
    // Compute from tabsRef OUTSIDE the updater (StrictMode-safe)
    const prev = tabsRef.current;
    const idx = prev.findIndex(t => t.id === tabId);
    if (idx === -1) return;
    const original = prev[idx];
    const newTab: Tab = {
      ...original,
      id: generateId('tab'),
      title: original.title,
      url: original.url,
      favicon: original.favicon,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isPinned: false,
      splitWith: undefined
    };
    const newTabs = [...prev];
    newTabs.splice(idx + 1, 0, newTab);
    setTabs(newTabs);
    setActiveTabId(newTab.id);
  }, [tabsRef, setTabs, setActiveTabId]);

  const handleTogglePinTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const target = prev.find(t => t.id === tabId);
      if (!target) return prev;
      const willPin = !target.isPinned;
      const targetWs = target.workspaceId || 'default';
      const updated = prev.map(t => t.id === tabId ? { ...t, isPinned: willPin, isSuspended: willPin ? false : t.isSuspended } : t);
      // Re-sort only within the target workspace, preserving workspace boundaries
      const wsTabs = updated.filter(t => (t.workspaceId || 'default') === targetWs);
      const wsPinned = wsTabs.filter(t => t.isPinned);
      const wsUnpinned = wsTabs.filter(t => !t.isPinned);
      const sortedWsTabs = [...wsPinned, ...wsUnpinned];

      let wsIdx = 0;
      return updated.map(t => {
        if ((t.workspaceId || 'default') === targetWs) {
          return sortedWsTabs[wsIdx++];
        }
        return t;
      });
    });
  }, [setTabs]);

  const handleCloseOtherTabs = useCallback((tabId: string) => {
    // Compute from tabsRef OUTSIDE the updater (StrictMode-safe)
    const prev = tabsRef.current;
    const target = prev.find(t => t.id === tabId);
    if (!target) return;
    const targetWs = target.workspaceId || 'default';
    const toClose = prev.filter(t => (t.workspaceId || 'default') === targetWs && t.id !== tabId && !t.isPinned);
    toClose.forEach(t => tabThumbnailCache.remove(t.id));
    pushClosedTabs(toClose);
    const toKeep = prev.filter(t => !toClose.some(c => c.id === t.id));
    setActiveTabId(tabId);
    setTabs(toKeep);
  }, [pushClosedTabs, tabsRef, setActiveTabId, setTabs]);

  const handleCloseTabsToRight = useCallback((target: number | string) => {
    // Compute from tabsRef OUTSIDE the updater (StrictMode-safe)
    const prev = tabsRef.current;
    let targetTab: Tab | undefined;

    if (typeof target === 'string') {
      targetTab = prev.find(t => t.id === target);
    } else if (typeof target === 'number' && target >= 0) {
      const activeWs = activeWorkspaceIdRef.current || 'default';
      const wsTabs = prev.filter(t => (t.workspaceId || 'default') === activeWs);
      if (target < wsTabs.length) {
        targetTab = wsTabs[target];
      } else if (target < prev.length) {
        targetTab = prev[target];
      }
    }

    if (!targetTab) return;

    const targetWs = targetTab.workspaceId || 'default';
    const wsTabs = prev.filter(t => (t.workspaceId || 'default') === targetWs);
    const targetIdx = wsTabs.findIndex(t => t.id === targetTab!.id);
    if (targetIdx < 0 || targetIdx >= wsTabs.length - 1) return;

    const tabsToClose = wsTabs.slice(targetIdx + 1).filter(t => !t.isPinned);
    if (tabsToClose.length === 0) return;

    const closeIds = new Set(tabsToClose.map(t => t.id));
    closeIds.forEach(id => tabThumbnailCache.remove(id));
    pushClosedTabs(tabsToClose);
    const nextTabs = prev.filter(t => !closeIds.has(t.id));
    if (!nextTabs.some(t => t.id === activeTabIdRef.current)) {
      setActiveTabId(targetTab.id);
    }
    setTabs(nextTabs);
  }, [pushClosedTabs, tabsRef, activeWorkspaceIdRef, activeTabIdRef, setActiveTabId, setTabs]);

  const handleNewTabRight = useCallback((target: number | string) => {
    const prev = tabsRef.current;
    const activeWs = activeWorkspaceIdRef.current || 'default';
    let targetTab: Tab | undefined;

    if (typeof target === 'string') {
      targetTab = prev.find(t => t.id === target);
    } else if (typeof target === 'number' && target >= 0) {
      const wsTabs = prev.filter(t => (t.workspaceId || 'default') === activeWs);
      targetTab = (target < wsTabs.length) ? wsTabs[target] : (target < prev.length ? prev[target] : undefined);
    }

    const targetWs = targetTab?.workspaceId || activeWs;

    const newId = generateId('tab');
    const newTab: Tab = {
      id: newId,
      url: 'nova://newtab',
      title: 'New Tab',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      lastAccessed: Date.now(),
      workspaceId: targetWs,
      // Fix: inherit incognito status from target tab to prevent privacy leakage
      isIncognito: targetTab?.isIncognito || false
    };
    setTabs(prevTabs => {
      const newTabs = [...prevTabs];
      if (targetTab) {
        const globalIdx = newTabs.findIndex(t => t.id === targetTab.id);
        if (globalIdx !== -1) {
          newTabs.splice(globalIdx + 1, 0, newTab);
          return newTabs;
        }
      }
      newTabs.push(newTab);
      return newTabs;
    });
    setActiveTabId(newId);
  }, [tabsRef, activeWorkspaceIdRef, setTabs, setActiveTabId]);

  const handlePrintPage = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.print) {
      try {
        webview.print();
      } catch (err) {
        console.error('Print error:', err);
      }
    } else {
      window.print();
    }
  }, [activeTabId]);

  const handleOpenDevTools = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.openDevTools) {
      try {
        if (webview.isDevToolsOpened?.()) {
          webview.closeDevTools();
        } else {
          webview.openDevTools({ mode: 'right' });
        }
      } catch (err) {
        console.error('DevTools error:', err);
      }
    }
  }, [activeTabId]);

  const handleNewTab = useCallback((url?: string | any, sourceTabId?: string, opts?: { reuseBlank?: boolean; isIncognito?: boolean }) => {
    let finalUrl = typeof url === 'string' ? url : 'nova://newtab';
    
    // Security: Block malicious protocols (shared blocklist — see safeNavigation.ts)
    if (!isSafeNavigationUrl(finalUrl)) {
      finalUrl = 'nova://newtab';
    }
    
    // Extensions page handling: open extensions modal directly
    if (finalUrl === 'nova://extensions' || finalUrl === 'chrome://extensions') {
      setIsExtensionsOpen(true);
      return;
    }
    
    let initialTitle = 'New Tab';
    if (finalUrl.startsWith('nova://settings')) initialTitle = 'Settings';
    else if (finalUrl.startsWith('nova://history')) initialTitle = 'History';
    else if (finalUrl.startsWith('nova://downloads')) initialTitle = 'Downloads';
    else if (finalUrl.startsWith('nova://changelog') || finalUrl.startsWith('nova://whats-new')) initialTitle = "What's New";

    // If target/current tab is an unnavigated empty "New Tab" and url is specific (e.g. settings, history),
    // navigate current tab instead of spawning a redundant new tab
    const targetSourceId = sourceTabId || activeTabIdRef.current;
    const currentTarget = tabsRef.current.find(t => t.id === targetSourceId);
    const isCurrentBlank = currentTarget && 
      (currentTarget.url === 'nova://newtab' || currentTarget.url === 'about:blank' || !currentTarget.url) &&
      !currentTarget.isLoading &&
      !currentTarget.canGoBack;

    if (isCurrentBlank && finalUrl !== 'nova://newtab' && (opts?.reuseBlank ?? true)) {
      const isInternalPage = finalUrl.startsWith('nova://') || finalUrl === 'about:blank';
      setTabs(prev => prev.map(tab => tab.id === currentTarget.id ? {
        ...tab,
        url: finalUrl,
        title: initialTitle,
        isLoading: !isInternalPage
      } : tab));
      setActiveTabId(currentTarget.id);
      return;
    }
    
    // Determine incognito status:
    // - If explicitly requested via opts.isIncognito, respect that.
    // - If opened from an internal link/window.open inside a tab (sourceTabId provided), inherit the source tab's incognito status.
    // - Otherwise (user clicked "+", pressed ⌘T, or triggered a new tab from UI), always create a normal tab (isIncognito: false).
    //   Private tabs are explicitly opened via handleNewIncognitoTab (⌘⇧N or Private Tab button).
    const isIncognitoTab = opts?.isIncognito !== undefined
      ? opts.isIncognito
      : (sourceTabId ? Boolean(currentTarget?.isIncognito) : false);

    const newTab: Tab = {
      id: generateId('tab'),
      url: finalUrl,
      title: initialTitle,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      workspaceId: activeWorkspaceId,
      isIncognito: isIncognitoTab,
      lastAccessed: Date.now()
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [activeWorkspaceId, setIsExtensionsOpen, activeTabIdRef, tabsRef, setTabs, setActiveTabId]);

  const handleExitIncognitoTab = useCallback(() => {
    const currentTab = tabsRef.current.find(t => t.id === activeTabIdRef.current);
    if (!currentTab || !currentTab.isIncognito) return;

    const prevTabs = tabsRef.current;
    const activeWs = activeWorkspaceIdRef.current || 'default';
    const normalTabsInWs = prevTabs.filter(t => !t.isIncognito && (t.workspaceId || 'default') === activeWs);

    if (normalTabsInWs.length > 0) {
      handleCloseTab(currentTab.id);
    } else {
      if (getElectronAPI()?.clearIncognitoSession) {
        getElectronAPI()?.clearIncognitoSession(currentTab.id)?.catch((e: any) => console.error(e));
        const remainingIncognito = prevTabs.some(t => t.isIncognito && t.id !== currentTab.id);
        if (!remainingIncognito) {
          getElectronAPI()?.clearIncognitoSession()?.catch((e: any) => console.error(e));
        }
      }
      setTabs(prev => prev.map(t => t.id === currentTab.id ? {
        ...t,
        isIncognito: false,
        url: 'nova://newtab',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        favicon: undefined,
        splitWith: undefined,
        lastAccessed: Date.now()
      } : t));
    }
  }, [handleCloseTab, activeTabIdRef, tabsRef, activeWorkspaceIdRef, setTabs]);

  const handleNewIncognitoTab = useCallback((url?: string | any) => {
    let targetUrl = typeof url === 'string' ? url : 'nova://newtab';

    // Security: Block malicious protocols (shared blocklist — see safeNavigation.ts)
    if (!isSafeNavigationUrl(targetUrl)) {
      targetUrl = 'nova://newtab';
    }

    const newTab: Tab = {
      id: generateId('tab'),
      url: targetUrl,
      title: targetUrl !== 'nova://newtab' ? targetUrl : 'Private Tab',
      isLoading: targetUrl !== 'nova://newtab',
      canGoBack: false,
      canGoForward: false,
      isIncognito: true,
      workspaceId: activeWorkspaceId,
      lastAccessed: Date.now()
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [activeWorkspaceId, setTabs, setActiveTabId]);

  const handleNavigate = useCallback((url: string, explicitTabId?: string) => {
    if (!url || typeof url !== 'string') return;
    
    // Security: Block malicious protocols (shared blocklist — see safeNavigation.ts)
    if (!isSafeNavigationUrl(url)) {
      console.warn('Blocked malicious navigation protocol:', url);
      return;
    }

    if (url === 'nova://extensions' || url === 'chrome://extensions') {
      setIsExtensionsOpen(true);
      return;
    }

    const prev = tabsRef.current;

    if (prev.length === 0) {
      const newTabId = generateId('tab');
      setTabs([{
        id: newTabId,
        url,
        title: 'New Tab',
        isLoading: true,
        canGoBack: false,
        canGoForward: false,
        workspaceId: activeWorkspaceIdRef.current
      }]);
      setActiveTabId(newTabId);
      return;
    }

    if (explicitTabId && !prev.some(t => t.id === explicitTabId)) {
      logger.warn('App:Navigation', 'handleNavigate: unknown explicitTabId, ignoring', explicitTabId);
      return;
    }

    const currentActiveId = activeTabIdRef.current;
    const targetTab = explicitTabId 
      ? (prev.find(t => t.id === explicitTabId) || prev.find(t => t.id === currentActiveId) || prev[0])
      : (prev.find(t => t.id === currentActiveId) || prev[0]);
    const targetId = targetTab ? targetTab.id : (prev.find(t => t.id === currentActiveId)?.id || prev[0].id);

    tabThumbnailCache.remove(targetId);

    let newTitle: string | undefined = undefined;
    const isNewTabUrl = url === 'nova://newtab' || url === 'about:blank' || url === 'https://newtab';
    if (isNewTabUrl) newTitle = 'New Tab';
    else if (url.startsWith('nova://settings')) newTitle = 'Settings';
    else if (url.startsWith('nova://history')) newTitle = 'History';
    else if (url.startsWith('nova://downloads')) newTitle = 'Downloads';
    else if (url.startsWith('nova://changelog') || url.startsWith('nova://whats-new')) newTitle = "What's New";

    const isInternalPage = !!newTitle;

    if (targetId !== currentActiveId) {
      setActiveTabId(targetId);
    }

    if (targetTab && targetTab.url === url) {
      // URL is exactly the same, force a reload if it's a webview
      if (!isInternalPage) {
        const webview = document.querySelector(`webview[data-tab-id="${targetId}"]`) as any;
        if (webview) webview.reload();
      }
      setTabs(p => p.map(t => t.id === targetId ? { ...t, isLoading: !isInternalPage } : t));
      return;
    }

    setTabs(p => p.map(t => t.id === targetId ? {
      ...t,
      url,
      isLoading: !isInternalPage,
      ...(newTitle ? { title: newTitle } : {})
    } : t));
  }, [setIsExtensionsOpen, tabsRef, activeWorkspaceIdRef, setActiveTabId, activeTabIdRef, setTabs]);

  const handleUpdateTab = useCallback((id: string, updates: Partial<Tab>) => {
    const current = tabsRef.current.find(t => t.id === id);
    if (!current) return;

    // Read the current tab once. Webview events often repeat the same payload;
    // avoid scheduling a React update when every field already matches.
    const hasChanges = Object.entries(updates).some(([key, value]) => (current as any)[key] !== value);
    if (!hasChanges) return;

    // Pure tabs update only — no side effects inside the updater (StrictMode-safe)
    setTabs(prev => {
      let changed = false;
      const updated = prev.map(t => {
        if (t.id !== id) return t;
        const actualChanges = Object.entries(updates).some(([key, value]) => (t as any)[key] !== value);
        if (!actualChanges) return t;
        changed = true;
        return { ...t, ...updates };
      });
      // Identity guard: when a newer queued update already applied the same
      // values, return prev so React skips the App subtree render.
      return changed ? updated : prev;
    });

    // History recording is derived from the pre-update tab state OUTSIDE the
    // tabs updater so setHistory is never called from within another updater.
    const updated = { ...current, ...updates };

    // Add to history if title or url loaded and not blank/newtab AND NOT INCOGNITO
    // (gating + dedupe rules live in useHistoryRecorder.recordVisit)
    recordVisit(updated, updates);
  }, [tabsRef, setTabs, recordVisit]);

  const handleToggleMuteTab = useCallback((id: string, e?: React.MouseEvent) => {
    if (e?.stopPropagation) e.stopPropagation();
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isMuted: !t.isMuted } : t));
  }, [setTabs]);

  const handleTogglePip = useCallback((tabId: string) => {
    const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`) as any;
    if (webview && webview.executeJavaScript) {
      webview.executeJavaScript(`
        (() => {
          const videos = Array.from(document.querySelectorAll('video'));
          const target = videos.find(v => !v.paused) || videos[0];
          if (!target) {
            throw new Error("No video found on page!");
          }
          if (document.pictureInPictureElement) {
            return document.exitPictureInPicture();
          } else {
            return target.requestPictureInPicture();
          }
        })();
      `, true).catch((e: any) => {
        void showAlert({ title: 'Picture-in-Picture', message: "Picture-in-Picture Error: " + (e.message || e) });
      });
    }
  }, []);

  return {
    handleSelectTab,
    handleSuspendTab,
    handlePurgeMemory,
    handleCloseTab,
    handleReorderTabs,
    handleReorderFullList,
    handleDuplicateTab,
    handleTogglePinTab,
    handleCloseOtherTabs,
    handleCloseTabsToRight,
    handleNewTabRight,
    handlePrintPage,
    handleOpenDevTools,
    handleNewTab,
    handleNewIncognitoTab,
    handleExitIncognitoTab,
    handleNavigate,
    handleUpdateTab,
    handleToggleMuteTab,
    handleTogglePip,
  };
}
