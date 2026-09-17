import { useEffect, useRef } from 'react';
import { Tab } from '../types/browser';
import { computeLiveAndSuspendedTabs } from '../utils/tabManager';

export interface UseTabHibernationOptions {
  tabs: Tab[];
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
  tabsRef: React.MutableRefObject<Tab[]>;
  activeTabId: string;
  activeTabIdRef: React.MutableRefObject<string>;
  splitTabId: string | null;
  activeSplitTabIdRef: React.MutableRefObject<string | null>;
  tabHibernationEnabled?: boolean;
  hibernationTimeoutMinutes?: number;
  isDemo?: boolean;
}

const MAX_LIVE_WEBVIEWS = 6;

export function useTabHibernation({
  tabs,
  setTabs,
  tabsRef,
  activeTabId,
  activeTabIdRef,
  splitTabId,
  activeSplitTabIdRef,
  tabHibernationEnabled = true,
  hibernationTimeoutMinutes = 10,
  isDemo = false
}: UseTabHibernationOptions) {
  // Staggered wake-up ref: tracks the interval used to gradually restore suspended tabs
  // when hibernation is disabled, preventing simultaneous Chromium renderer process spawning.
  const staggeredWakeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tab Hibernation Checker Engine (Idle Timer)
  useEffect(() => {
    if (!tabHibernationEnabled || isDemo) return;
    const timeoutMs = hibernationTimeoutMinutes * 60 * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const activeId = activeTabIdRef.current;
      const splitId = activeSplitTabIdRef.current;

      // Pre-check on tabsRef before queueing a React state updater to avoid unnecessary re-evaluations
      const hasIdleTabs = tabsRef.current.some(tab =>
        tab.id !== activeId &&
        (!splitId || tab.id !== splitId) &&
        !tab.isPinned &&
        !tab.isPlayingAudio &&
        !tab.isSuspended &&
        !tab.isLoading &&
        now - (tab.lastAccessed || now) > timeoutMs
      );
      if (!hasIdleTabs) return;

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
    }, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [tabHibernationEnabled, hibernationTimeoutMinutes, isDemo, activeTabIdRef, activeSplitTabIdRef, tabsRef, setTabs]);

  // Webview LRU Pool: cap concurrent live tabs to max 6 to prevent Chromium process explosion only when hibernation is enabled
  useEffect(() => {
    if (!tabHibernationEnabled) {
      // Staggered wake-up: wake at most 2 tabs every 300ms to avoid a Chromium process explosion.
      // Clear any previous interval before starting a new one.
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
          // Wake next 2 suspended tabs in this tick
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
  }, [tabs, activeTabId, splitTabId, tabHibernationEnabled, setTabs]);
}
