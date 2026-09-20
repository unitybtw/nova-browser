import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
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

/**
 * Tab hibernation motoru: App.tsx'ten birebir taşıma (pure code motion).
 *
 * - Effect 1 (Idle Timer): 30sn'de bir, aktif/split/pinned/sesli/loading
 *   olmayan ve `hibernationTimeoutMinutes` süresince dokunulmamış sekmeleri
 *   `isSuspended: true` yapar. `clearInterval` cleanup aynen korunur.
 * - Effect 2 (Webview LRU Pool + staggered wake): hibernation açıkken canlı
 *   webview sayısını LRU-6 ile cap'ler (`computeLiveAndSuspendedTabs`);
 *   kapalıyken askıdaki sekmeleri 300ms'de en fazla 2'şerli uyandırır
 *   (Chromium renderer patlamasını önler). `staggeredWakeRef` cleanup'ları
 *   aynen korunur.
 *
 * Timer davranışı birebir aynıdır: 30sn idle kontrol, LRU-6, staggered wake.
 * Manuel kontroller (handleSelectTab/handleSuspendTab/handlePurgeMemory)
 * App.tsx'te kalır; bu hook sadece 2 effect'i sahiplenir.
 */
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
    const timeoutMs = (settings.hibernationTimeoutMinutes || 10) * 60 * 1000;

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
  }, [settings.tabHibernationEnabled, settings.hibernationTimeoutMinutes]);

  // Webview LRU Pool: cap concurrent live tabs to max 6 to prevent Chromium process explosion only when hibernation is enabled
  // Staggered wake-up ref: tracks the interval used to gradually restore suspended tabs
  // when hibernation is disabled, preventing simultaneous Chromium renderer process spawning.
  const staggeredWakeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const isHibernationEnabled = settings.tabHibernationEnabled ?? true;
    if (!isHibernationEnabled) {
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
  }, [tabs, activeTabId, splitTabId, settings.tabHibernationEnabled]);
}
