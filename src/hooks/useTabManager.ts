import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Tab } from '../types/browser';
import { generateId } from '../utils/idGenerator';
import { isSafeNavigationUrl } from '../utils/safeNavigation';
import { computeLiveAndSuspendedTabs } from '../utils/tabManager';
import { reorderTabsWithinGroup } from '../utils/verticalTabs';
import { tabThumbnailCache } from '../services/thumbnailCache';
import { getElectronAPI } from '../utils/electronBridge';

export interface UseTabManagerOptions {
  initialTabs: Tab[];
  initialActiveTabId?: string;
  activeWorkspaceIdRef: React.MutableRefObject<string>;
  tabHibernationEnabled?: boolean;
  hibernationTimeoutMinutes?: number;
  onRecordVisit?: (updated: Tab, updates: Partial<Tab>) => void;
}

export function useTabManager(options: UseTabManagerOptions) {
  const {
    initialTabs,
    initialActiveTabId,
    activeWorkspaceIdRef,
    tabHibernationEnabled = true,
    hibernationTimeoutMinutes = 10,
    onRecordVisit
  } = options;

  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const [activeTabId, setActiveTabIdState] = useState<string>(() => {
    if (initialActiveTabId) return initialActiveTabId;
    return initialTabs[0]?.id || '1';
  });
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const setActiveTabId = useCallback((id: string) => {
    activeTabIdRef.current = id;
    setActiveTabIdState(id);
  }, []);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);

  // Derived Split Tab ID
  const splitTabId = useMemo(() => {
    if (!activeTab || !activeTab.splitWith) return null;
    const partner = tabs.find(t => t.id === activeTab.splitWith);
    return partner ? partner.id : null;
  }, [activeTab, tabs]);

  const activeSplitTabIdRef = useRef<string | null>(splitTabId);
  activeSplitTabIdRef.current = splitTabId;

  const [splitRatio, setSplitRatio] = useState<number>(50);

  // Closed tabs stack for reopening
  const [closedTabsStack, setClosedTabsStack] = useState<Tab[]>([]);
  const closedTabsStackRef = useRef(closedTabsStack);
  closedTabsStackRef.current = closedTabsStack;

  const secondaryTab = useMemo(() => {
    return splitTabId ? tabs.find(t => t.id === splitTabId) : undefined;
  }, [tabs, splitTabId]);

  // Select/focus tab & reset hibernation timer
  const handleSelectTab = useCallback((id: string) => {
    if (id === activeTabIdRef.current && !tabsRef.current.find(t => t.id === id)?.isSuspended) {
      return;
    }
    setActiveTabId(id);
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isSuspended: false, lastAccessed: Date.now() } : t));
  }, [setActiveTabId]);

  // Manual tab suspension
  const handleSuspendTab = useCallback((id: string) => {
    setTabs(prev => prev.map(t => (t.id === id && t.id !== activeTabId && t.id !== splitTabId && !t.isPlayingAudio) ? { ...t, isSuspended: true } : t));
  }, [activeTabId, splitTabId]);

  // Tab Hibernation Checker Engine (Idle Timer)
  useEffect(() => {
    if (!tabHibernationEnabled) return;
    const timeoutMs = (hibernationTimeoutMinutes || 10) * 60 * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const activeId = activeTabIdRef.current;
      const splitId = activeSplitTabIdRef.current;
      setTabs(prevTabs => {
        let changed = false;
        const updated = prevTabs.map(tab => {
          if (
            tab.id === activeId ||
            (splitId && tab.id === splitId) ||
            tab.isPinned ||
            tab.isPlayingAudio ||
            tab.isSuspended ||
            tab.isLoading
          ) {
            return tab;
          }
          const idleTime = now - (tab.lastAccessed || now);
          if (idleTime > timeoutMs) {
            changed = true;
            return { ...tab, isSuspended: true };
          }
          return tab;
        });
        return changed ? updated : prevTabs;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [tabHibernationEnabled, hibernationTimeoutMinutes]);

  // Webview LRU Pool: cap concurrent live tabs to max 6 with staggered wake-up when hibernation is disabled
  const MAX_LIVE_WEBVIEWS = 6;
  const staggeredWakeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!tabHibernationEnabled) {
      if (staggeredWakeRef.current !== null) {
        clearInterval(staggeredWakeRef.current);
        staggeredWakeRef.current = null;
      }
      staggeredWakeRef.current = setInterval(() => {
        setTabs(prev => {
          const suspendedTabs = prev.filter(t => t.isSuspended);
          if (suspendedTabs.length === 0) {
            if (staggeredWakeRef.current !== null) {
              clearInterval(staggeredWakeRef.current);
              staggeredWakeRef.current = null;
            }
            return prev;
          }
          const idsToWake = new Set(suspendedTabs.slice(0, 2).map(t => t.id));
          return prev.map(t => idsToWake.has(t.id) ? { ...t, isSuspended: false } : t);
        });
      }, 300);
      return () => {
        if (staggeredWakeRef.current !== null) {
          clearInterval(staggeredWakeRef.current);
          staggeredWakeRef.current = null;
        }
      };
    }

    const { tabsToSuspend } = computeLiveAndSuspendedTabs(tabs, activeTabId, splitTabId, MAX_LIVE_WEBVIEWS);
    if (tabsToSuspend.size > 0) {
      setTabs(prev => prev.map(t => tabsToSuspend.has(t.id) ? { ...t, isSuspended: true } : t));
    }
  }, [tabs, activeTabId, splitTabId, tabHibernationEnabled]);

  // Tab Close Handler
  const handleCloseTab = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    tabThumbnailCache.remove(id);
    const prevTabs = tabsRef.current;
    const targetTab = prevTabs.find(t => t.id === id);
    const activeWs = activeWorkspaceIdRef.current || 'default';
    const workspaceTabs = prevTabs.filter(t => (t.workspaceId || 'default') === activeWs);

    if (workspaceTabs.length <= 1 && workspaceTabs.some(t => t.id === id)) {
      if (targetTab && (targetTab.url !== 'nova://newtab' || targetTab.canGoBack)) {
        setClosedTabsStack(stack => [...stack, targetTab]);
      }
      setTabs(prev => prev.map(t => {
        if (t.id === id) {
          return {
            ...t,
            url: 'nova://newtab',
            title: 'New Tab',
            isLoading: false,
            canGoBack: false,
            canGoForward: false,
            favicon: undefined,
            splitWith: undefined,
            isPinned: false,
            lastAccessed: Date.now()
          };
        }
        return t.splitWith === id ? { ...t, splitWith: undefined } : t;
      }));
      setActiveTabId(id);
      return;
    }

    if (prevTabs.length <= 1) {
      if (targetTab && (targetTab.url !== 'nova://newtab' || targetTab.canGoBack)) {
        setClosedTabsStack(stack => [...stack, targetTab]);
      }
      setTabs(prev => prev.map(t => ({
        ...t,
        url: 'nova://newtab',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        favicon: undefined,
        splitWith: undefined,
        isPinned: false,
        lastAccessed: Date.now()
      })));
      return;
    }

    const targetIdx = prevTabs.findIndex(t => t.id === id);
    const newTabs = prevTabs
      .filter(t => t.id !== id)
      .map(t => t.splitWith === id ? { ...t, splitWith: undefined } : t);

    if (targetTab) {
      setClosedTabsStack(stack => [...stack, targetTab]);
    }

    if (activeTabIdRef.current === id && newTabs.length > 0) {
      const partnerTab = targetTab?.splitWith ? newTabs.find(t => t.id === targetTab.splitWith) : null;
      if (partnerTab) {
        setActiveTabId(partnerTab.id);
      } else {
        const nextActiveIdx = Math.min(Math.max(0, targetIdx), newTabs.length - 1);
        setActiveTabId(newTabs[nextActiveIdx].id);
      }
    }

    // Incognito partition cleanup
    if (targetTab?.isIncognito) {
      const electronAPI = getElectronAPI();
      if (electronAPI?.clearIncognitoSession) {
        electronAPI.clearIncognitoSession(targetTab.id).catch(console.error);
      }
      const remainingIncognitoTabs = newTabs.some(t => t.isIncognito);
      if (!remainingIncognitoTabs && electronAPI?.clearIncognitoSession) {
        electronAPI.clearIncognitoSession().catch(console.error);
      }
    }

    setTabs(newTabs);
  }, [activeWorkspaceIdRef, setActiveTabId]);

  const handleNewTab = useCallback((url?: string, options?: { isIncognito?: boolean; workspaceId?: string }) => {
    let targetUrl = url || 'nova://newtab';
    if (!isSafeNavigationUrl(targetUrl)) {
      targetUrl = 'nova://newtab';
    }

    const prev = tabsRef.current;
    const currentActive = prev.find(t => t.id === activeTabIdRef.current);
    const isCurrentBlank = currentActive &&
      (currentActive.url === 'nova://newtab' || currentActive.url === 'about:blank') &&
      !currentActive.isLoading &&
      !currentActive.canGoBack;

    if (isCurrentBlank && targetUrl !== 'nova://newtab') {
      setTabs(p => p.map(tab => tab.id === currentActive.id ? {
        ...tab,
        url: targetUrl,
        title: targetUrl === 'nova://newtab' ? 'New Tab' : targetUrl
      } : tab));
      return;
    }

    const newTab: Tab = {
      id: generateId('tab'),
      url: targetUrl,
      title: targetUrl === 'nova://newtab' ? 'New Tab' : targetUrl,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isIncognito: options?.isIncognito,
      workspaceId: options?.workspaceId || activeWorkspaceIdRef.current || 'default',
      lastAccessed: Date.now()
    };
    setTabs(p => [...p, newTab]);
    setActiveTabId(newTab.id);
  }, [activeWorkspaceIdRef, setActiveTabId]);

  const handleNewIncognitoTab = useCallback((url?: string) => {
    let targetUrl = typeof url === 'string' ? url : 'nova://newtab';
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
      workspaceId: activeWorkspaceIdRef.current || 'default',
      lastAccessed: Date.now()
    };
    setTabs(p => [...p, newTab]);
    setActiveTabId(newTab.id);
  }, [activeWorkspaceIdRef, setActiveTabId]);

  const handleReorderTabs = useCallback((draggedId: string, targetId: string) => {
    const nextTabs = reorderTabsWithinGroup(tabsRef.current, draggedId, targetId);
    if (nextTabs !== tabsRef.current) setTabs(nextTabs);
  }, []);

  const handleReorderFullList = useCallback((reorderedWorkspaceTabs: Tab[]) => {
    setTabs(prevTabs => {
      const activeWs = activeWorkspaceIdRef.current || 'default';
      const workspaceIds = new Set(reorderedWorkspaceTabs.map(t => t.id));
      const nonWorkspaceTabs = prevTabs.filter(t => !workspaceIds.has(t.id) && (t.workspaceId || 'default') !== activeWs);
      const missingWorkspaceTabs = prevTabs.filter(t => (t.workspaceId || 'default') === activeWs && !workspaceIds.has(t.id));
      return [...reorderedWorkspaceTabs, ...missingWorkspaceTabs, ...nonWorkspaceTabs];
    });
  }, [activeWorkspaceIdRef]);

  const handleDuplicateTab = useCallback((tabId: string) => {
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
      isPinned: false
    };
    const newTabs = [...prev];
    newTabs.splice(idx + 1, 0, newTab);
    setTabs(newTabs);
    setActiveTabId(newTab.id);
  }, [setActiveTabId]);

  const handleTogglePinTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const target = prev.find(t => t.id === tabId);
      if (!target) return prev;
      const willPin = !target.isPinned;
      const updated = prev.map(t => t.id === tabId ? { ...t, isPinned: willPin } : t);
      const pinned = updated.filter(t => t.isPinned);
      const unpinned = updated.filter(t => !t.isPinned);
      return [...pinned, ...unpinned];
    });
  }, []);

  const handleToggleMuteTab = useCallback((id: string, e?: React.MouseEvent) => {
    if (e?.stopPropagation) e.stopPropagation();
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isMuted: !t.isMuted } : t));
  }, []);

  const handleCloseOtherTabs = useCallback((tabId: string) => {
    const prev = tabsRef.current;
    const target = prev.find(t => t.id === tabId);
    if (!target) return;
    const toKeep = prev.filter(t => t.id === tabId || t.isPinned);
    const toClose = prev.filter(t => t.id !== tabId && !t.isPinned);
    setClosedTabsStack(stack => [...stack, ...toClose]);
    setActiveTabId(tabId);
    setTabs(toKeep);
  }, [setActiveTabId]);

  const handleCloseTabsToRight = useCallback((index: number) => {
    const prev = tabsRef.current;
    if (index < 0 || index >= prev.length - 1) return;
    const toKeep = prev.slice(0, index + 1);
    const toClose = prev.slice(index + 1).filter(t => !t.isPinned);
    const pinnedToRight = prev.slice(index + 1).filter(t => t.isPinned);
    setClosedTabsStack(stack => [...stack, ...toClose]);
    const nextTabs = [...toKeep, ...pinnedToRight];
    if (!nextTabs.some(t => t.id === activeTabIdRef.current)) {
      setActiveTabId(prev[index].id);
    }
    setTabs(nextTabs);
  }, [setActiveTabId]);

  const handleNewTabRight = useCallback((index: number) => {
    const newId = generateId('tab');
    const newTab: Tab = {
      id: newId,
      url: 'nova://newtab',
      title: 'New Tab',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      workspaceId: activeWorkspaceIdRef.current || 'default',
      lastAccessed: Date.now()
    };
    setTabs(prev => {
      const newTabs = [...prev];
      const targetIndex = index >= 0 && index < prev.length ? index + 1 : prev.length;
      newTabs.splice(targetIndex, 0, newTab);
      return newTabs;
    });
    setActiveTabId(newId);
  }, [activeWorkspaceIdRef, setActiveTabId]);

  const handleReopenClosedTab = useCallback(() => {
    const stack = closedTabsStackRef.current;
    if (stack.length === 0) return;
    const lastTab = stack[stack.length - 1];
    setTabs(prev => [...prev, lastTab]);
    setActiveTabId(lastTab.id);
    setClosedTabsStack(stack.slice(0, -1));
  }, [setActiveTabId]);

  const handleUpdateTab = useCallback((id: string, updates: Partial<Tab>) => {
    const current = tabsRef.current.find(t => t.id === id);
    if (!current) return;

    const hasChanges = Object.entries(updates).some(([key, value]) => (current as any)[key] !== value);
    if (!hasChanges) return;

    setTabs(prev => {
      let changed = false;
      const updated = prev.map(t => {
        if (t.id !== id) return t;
        const actualChanges = Object.entries(updates).some(([key, value]) => (t as any)[key] !== value);
        if (!actualChanges) return t;
        changed = true;
        return { ...t, ...updates };
      });
      return changed ? updated : prev;
    });

    const updatedTab = { ...current, ...updates };
    onRecordVisit?.(updatedTab, updates);
  }, [onRecordVisit]);

  const handleCloseSplit = useCallback(() => {
    const active = tabsRef.current.find(t => t.id === activeTabIdRef.current);
    if (active && active.splitWith) {
      const partnerId = active.splitWith;
      setTabs(prev => prev.map(t => {
        if (t.id === active.id || t.id === partnerId) {
          return { ...t, splitWith: undefined };
        }
        return t;
      }));
    }
  }, []);

  return {
    tabs,
    setTabs,
    tabsRef,
    activeTabId,
    setActiveTabId,
    activeTabIdRef,
    splitTabId,
    activeSplitTabIdRef,
    splitRatio,
    setSplitRatio,
    closedTabsStack,
    setClosedTabsStack,
    closedTabsStackRef,
    activeTab,
    secondaryTab,
    handleSelectTab,
    handleSuspendTab,
    handleNewTab,
    handleNewIncognitoTab,
    handleCloseTab,
    handleReorderTabs,
    handleReorderFullList,
    handleDuplicateTab,
    handleTogglePinTab,
    handleToggleMuteTab,
    handleCloseOtherTabs,
    handleCloseTabsToRight,
    handleNewTabRight,
    handleReopenClosedTab,
    handleUpdateTab,
    handleCloseSplit
  };
}
