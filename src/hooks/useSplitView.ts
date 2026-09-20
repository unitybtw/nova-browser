import { useMemo, useCallback } from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { Tab } from '../types/browser';
import { generateId } from '../utils/idGenerator';

export interface UseSplitViewOptions {
  activeTab: Tab | undefined;
  activeTabId: string;
  tabs: Tab[];
  activeWorkspaceId: string;
  setTabs: Dispatch<SetStateAction<Tab[]>>;
  activeSplitTabIdRef: MutableRefObject<string | null>;
  setSplitRatio?: Dispatch<SetStateAction<number>>;
}

export function useSplitView({
  activeTab,
  activeTabId,
  tabs,
  activeWorkspaceId,
  setTabs,
  activeSplitTabIdRef,
  setSplitRatio,
}: UseSplitViewOptions) {
  // Split view: pair tab whose splitWith points to activeTab, or vice versa
  const splitTabId = useMemo(() => {
    if (!activeTab || !activeTab.splitWith) return null;
    const partner = tabs.find(t => t.id === activeTab.splitWith);
    return partner ? partner.id : null;
  }, [activeTab, tabs]);

  activeSplitTabIdRef.current = splitTabId;

  const handleCloseSplitView = useCallback((tab1Id?: string, tab2Id?: string) => {
    setTabs(prev => prev.map(t => {
      if (tab1Id || tab2Id) {
        if (
          t.id === tab1Id || 
          t.id === tab2Id || 
          (tab1Id && t.splitWith === tab1Id) || 
          (tab2Id && t.splitWith === tab2Id)
        ) {
          return { ...t, splitWith: undefined };
        }
      } else if (t.id === activeTabId || (splitTabId && t.id === splitTabId) || t.splitWith === activeTabId) {
        return { ...t, splitWith: undefined };
      }
      return t;
    }));
  }, [activeTabId, splitTabId, setTabs]);

  const handleToggleSplitView = useCallback(() => {
    if (splitTabId) {
      handleCloseSplitView();
    } else {
      const workspaceTabs = tabs.filter(t => t.workspaceId === activeWorkspaceId || (!t.workspaceId && activeWorkspaceId === 'default'));
      const otherTab = workspaceTabs.find(t => t.id !== activeTabId && !t.splitWith);
      if (otherTab) {
        setTabs(prev => prev.map(t => {
          if (t.id === activeTabId) return { ...t, splitWith: otherTab.id };
          if (t.id === otherTab.id) return { ...t, splitWith: activeTabId };
          return t;
        }));
      } else {
        const newId = generateId('tab');
        const newTab: Tab = {
          id: newId,
          url: 'nova://newtab',
          title: 'New Tab',
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
          workspaceId: activeWorkspaceId,
          splitWith: activeTabId
        };
        setTabs(prev => [...prev.map(t => t.id === activeTabId ? { ...t, splitWith: newId } : t), newTab]);
      }
      setSplitRatio?.(50);
    }
  }, [splitTabId, tabs, activeWorkspaceId, activeTabId, handleCloseSplitView, setTabs, setSplitRatio]);

  return {
    splitTabId,
    handleCloseSplitView,
    handleToggleSplitView,
  };
}
