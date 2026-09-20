import { useState, useRef, useCallback } from 'react';
import type { Tab } from '../types/browser';

export interface UseClosedTabsOptions {
  /** Stack'ten pop'lanan sekmeyi geri açan tab-oluşturma callback'i (App.tsx'te kalır). */
  onReopen?: (tab: Tab) => void;
}

/**
 * Kapalı-sekme-geri-al (undo close) stack'i: App.tsx'ten birebir taşıma (pure code motion).
 *
 * - Stack state + LIFO sıra aynen korunur (push sona ekler, reopen sondan pop'lar).
 * - Cap/limit yoktu, eklenmedi (unbounded).
 * - Incognito sekmeler stack'e girmez (Chrome/Firefox parity: gizli sekmeler
 *   Ctrl+Shift+T ile geri açılmaz). Filtre tek yer olarak burada uygulanır,
 *   call-site guard'larına gerek yoktur.
 * - Boş `nova://newtab` eleme filtresi hook'ta değil, push call-site'larında
 *   (`handleCloseTab` içindeki guard'lar) aynen durur.
 * - Tab oluşturma (`setTabs`/`setActiveTabId`/workspace switch/id-collision)
 *   hook'a taşınmadı; `onReopen` callback'i olarak App.tsx'ten alınır.
 * - Tüm okumalar ref snapshot üzerinden (StrictMode-safe), updater'lar pure.
 */
export function useClosedTabs({ onReopen }: UseClosedTabsOptions = {}) {
  const [closedTabsStack, setClosedTabsStack] = useState<Tab[]>([]);
  const closedTabsStackRef = useRef(closedTabsStack);
  closedTabsStackRef.current = closedTabsStack;

  const onReopenRef = useRef(onReopen);
  onReopenRef.current = onReopen;

  const pushClosedTab = useCallback((tab: Tab) => {
    if (tab.isIncognito) return;
    setClosedTabsStack(stack => [...stack, tab]);
  }, []);

  const pushClosedTabs = useCallback((tabs: Tab[]) => {
    const visibleTabs = tabs.filter(t => !t.isIncognito);
    if (visibleTabs.length === 0) return;
    setClosedTabsStack(stack => [...stack, ...visibleTabs]);
  }, []);

  const clearClosedTabs = useCallback(() => {
    setClosedTabsStack([]);
  }, []);

  const reopenLastClosed = useCallback(() => {
    // Stack'i ref'ten updater DIŞINDA oku (StrictMode-safe, App.tsx'teki gibi).
    const stack = closedTabsStackRef.current;
    if (stack.length === 0) return;
    const lastTab = stack[stack.length - 1];
    setClosedTabsStack(stack.slice(0, -1));
    onReopenRef.current?.(lastTab);
  }, []);

  return { closedTabsStack, pushClosedTab, pushClosedTabs, reopenLastClosed, clearClosedTabs };
}
