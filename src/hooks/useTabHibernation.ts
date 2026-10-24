import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Tab, UserSettings } from '../types/browser';
import { computeLiveAndSuspendedTabs } from '../utils/tabManager';

export interface UseTabHibernationOptions {
  tabs: Tab[];
  tabsRef: { current: Tab[] };
  setTabs: Dispatch<SetStateAction<Tab[]>>;
  activeTabId: string;
  activeTabIdRef: { current: string };
  splitTabId: string | null;
  /** App.tsx'teki activeSplitTabIdRef karşılığı */
  splitRef: { current: string | null };
  settings: UserSettings;
  isDemo?: boolean;
}

const MAX_LIVE_WEBVIEWS = 6;

/** Owns idle suspension, the live webview pool and gradual wake-up. */
export function useTabHibernation({
  tabs,
  tabsRef,
  setTabs,
  activeTabId,
  activeTabIdRef,
  splitTabId,
  splitRef,
  settings,
  isDemo,
}: UseTabHibernationOptions): void {
  // Tab Hibernation Checker Engine (Idle Timer)
  useEffect(() => {
    const isHibernationEnabled = settings.tabHibernationEnabled ?? true;
    if (!isHibernationEnabled || isDemo) return;
    const isEnergySaver = settings.energySaverMode ?? false;
    const baseTimeoutMinutes = settings.hibernationTimeoutMinutes || 10;
    const effectiveTimeoutMinutes = isEnergySaver ? Math.min(baseTimeoutMinutes, 3) : baseTimeoutMinutes;
    const timeoutMs = effectiveTimeoutMinutes * 60 * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const activeId = activeTabIdRef.current;
      const splitId = splitRef.current;

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
  }, [settings.tabHibernationEnabled, settings.hibernationTimeoutMinutes, settings.energySaverMode, isDemo]);

  // Unrelated tab metadata changes must not restart the 300ms wake interval.
  const hasSuspendedTabs = tabs.some(tab => tab.isSuspended);
  useEffect(() => {
    if ((settings.tabHibernationEnabled ?? true) || !hasSuspendedTabs) return;
    const interval = setInterval(() => {
      if (!tabsRef.current.some(tab => tab.isSuspended)) {
        clearInterval(interval);
        return;
      }
      setTabs(prev => {
        const ids = new Set(prev.filter(tab => tab.isSuspended).slice(0, 2).map(tab => tab.id));
        return ids.size ? prev.map(tab => ids.has(tab.id) ? { ...tab, isSuspended: false } : tab) : prev;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [hasSuspendedTabs, settings.tabHibernationEnabled, tabsRef, setTabs]);

  // Cap live webviews while hibernation is enabled.
  useEffect(() => {
    if (!(settings.tabHibernationEnabled ?? true)) return;
    const liveLimit = settings.energySaverMode ? 3 : MAX_LIVE_WEBVIEWS;
    const { tabsToSuspend } = computeLiveAndSuspendedTabs(tabs, activeTabId, splitTabId, liveLimit);
    if (tabsToSuspend.size > 0) {
      setTabs(prev => {
        // Identity guard (Effect 1 ile aynı desen): `tabs` bu effect'in dep
        // array'inde olduğu için, alanı gerçekten değişmeyen bir güncelleme
        // yeni dizi referansı üretip garantili bir ikinci geçişi tetikler.
        let changed = false;
        const updated = prev.map(t => {
          if (tabsToSuspend.has(t.id) && !t.isSuspended) {
            changed = true;
            return { ...t, isSuspended: true };
          }
          return t;
        });
        return changed ? updated : prev;
      });
    }
  }, [tabs, activeTabId, splitTabId, settings.tabHibernationEnabled, settings.energySaverMode]);
}
