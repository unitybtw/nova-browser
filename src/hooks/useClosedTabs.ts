import { useState, useRef, useCallback, useEffect } from 'react';
import type { Tab } from '../types/browser';

export interface UseClosedTabsOptions {
  /** Stack'ten pop'lanan sekmeyi geri açan tab-oluşturma callback'i (App.tsx'te kalır). */
  onReopen?: (tab: Tab) => void;
}

/**
 * Kapalı-sekme-geri-al (undo close) stack'i: App.tsx'ten birebir taşıma (pure code motion).
 *
 * - Stack state + LIFO sıra aynen korunur (push sona ekler, reopen sondan pop'lar).
 * - Cap/limit 50 ile sınırlıdır (MAX_CLOSED_TABS).
 * - Incognito sekmeler stack'e girmez (Chrome/Firefox parity: gizli sekmeler
 *   Ctrl+Shift+T ile geri açılmaz). Filtre tek yer olarak burada uygulanır,
 *   call-site guard'larına gerek yoktur.
 * - Boş `nova://newtab` eleme filtresi hook'ta değil, push call-site'larında
 *   (`handleCloseTab` içindeki guard'lar) aynen durur.
 * - Tab oluşturma (`setTabs`/`setActiveTabId`/workspace switch/id-collision)
 *   hook'a taşınmadı; `onReopen` callback'i olarak App.tsx'ten alınır.
 * - Ref senkronizasyonu mutasyon anında eşzamanlı yapılır; hızlı çift Ctrl+Shift+T
 *   aynı sekmeyi iki kez açmaz.
 */
const MAX_CLOSED_TABS = 50;

export function useClosedTabs({ onReopen }: UseClosedTabsOptions = {}) {
  const [closedTabsStack, setClosedTabsStack] = useState<Tab[]>([]);
  const closedTabsStackRef = useRef(closedTabsStack);

  useEffect(() => {
    closedTabsStackRef.current = closedTabsStack;
  }, [closedTabsStack]);

  const onReopenRef = useRef(onReopen);
  useEffect(() => {
    onReopenRef.current = onReopen;
  }, [onReopen]);

  const pushClosedTab = useCallback((tab: Tab) => {
    if (tab.isIncognito) return;
    const next = [...closedTabsStackRef.current, tab].slice(-MAX_CLOSED_TABS);
    closedTabsStackRef.current = next;
    setClosedTabsStack(next);
  }, []);

  const pushClosedTabs = useCallback((tabs: Tab[]) => {
    const visibleTabs = tabs.filter(t => !t.isIncognito);
    if (visibleTabs.length === 0) return;
    const next = [...closedTabsStackRef.current, ...visibleTabs].slice(-MAX_CLOSED_TABS);
    closedTabsStackRef.current = next;
    setClosedTabsStack(next);
  }, []);

  const clearClosedTabs = useCallback(() => {
    closedTabsStackRef.current = [];
    setClosedTabsStack([]);
  }, []);

  const reopenLastClosed = useCallback(() => {
    const stack = closedTabsStackRef.current;
    if (stack.length === 0) return;
    const lastTab = stack[stack.length - 1];
    const nextStack = stack.slice(0, -1);
    closedTabsStackRef.current = nextStack;
    setClosedTabsStack(nextStack);
    onReopenRef.current?.(lastTab);
  }, []);

  return { closedTabsStack, pushClosedTab, pushClosedTabs, reopenLastClosed, clearClosedTabs };
}
