import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import type { Tab } from '../types/browser';

export const ZOOM_FACTORS = [
  0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0
];

export interface UseZoomOptions {
  activeTabId: string | null;
  setTabs: Dispatch<SetStateAction<Tab[]>>;
}

export function useZoom({ activeTabId, setTabs }: UseZoomOptions) {
  // getZoomFactor() resolves asynchronously, so two quick presses can land out of
  // order. Every request takes a ticket; only the newest one may commit.
  const zoomRequestIdRef = useRef(0);

  const commitFactor = useCallback((tabId: string, factor: number) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, zoomFactor: factor } : t));
  }, [setTabs]);

  // The tab record is the only place the current factor lives when there is no
  // webview (internal pages: nova://, about:). Reading it through an
  // identity-preserving updater runs the reducer during the dispatch and hands
  // back the very same array, so React bails out and nothing re-renders.
  const readCommittedFactor = useCallback((tabId: string): number => {
    let factor: number | undefined;
    setTabs(prev => {
      factor = prev.find(t => t.id === tabId)?.zoomFactor;
      return prev;
    });
    return typeof factor === 'number' && factor > 0 ? factor : 1;
  }, [setTabs]);

  /** Applies one step along the zoom ladder and records it on the tab. */
  const stepZoom = useCallback((direction: 1 | -1) => {
    if (!activeTabId) return;
    const tabId = activeTabId;
    const requestId = ++zoomRequestIdRef.current;
    const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`) as any;

    const nextFrom = (current: number) => {
      // A non-finite read must not walk the ladder to the 500% extreme: fall
      // back to 100% as the reference point instead.
      const base = Number.isFinite(current) && current > 0 ? current : 1;
      return direction > 0
        ? (ZOOM_FACTORS.find(f => f > base + 0.01) ?? ZOOM_FACTORS[ZOOM_FACTORS.length - 1])
        : ([...ZOOM_FACTORS].reverse().find(f => f < base - 0.01) ?? ZOOM_FACTORS[0]);
    };

    const applyFactor = (current: number) => {
      // A newer press (or a reset) superseded this read — drop the stale reply
      // instead of overwriting the newer factor.
      if (requestId !== zoomRequestIdRef.current) return;
      const nextFactor = nextFrom(current);
      // The tab can close while the read is in flight, which leaves the webview
      // element destroyed; that throws, and we are now outside the try/catch
      // that guarded the synchronous call, so it needs one of its own.
      try {
        webview.setZoomFactor(nextFactor);
      } catch (e) {
        console.error("Zoom apply error:", e);
      }
      commitFactor(tabId, nextFactor);
    };

    // Internal pages have no webview in the DOM: nothing to read, so step from
    // the recorded factor and let the next real page inherit it.
    if (!webview || typeof webview.getZoomFactor !== 'function') {
      applyFactor(readCommittedFactor(tabId));
      return;
    }

    let pending: unknown;
    try {
      pending = webview.getZoomFactor();
    } catch (e) {
      console.error("Zoom factor read error:", e);
      return;
    }

    // Electron hands back a Promise here; a plain number is tolerated too, so
    // both shapes flow through one path with a single rejection handler.
    Promise.resolve(pending as number)
      .then((current: number) => applyFactor(current))
      .catch((e) => console.error("Zoom factor read error:", e));
  }, [activeTabId, commitFactor, readCommittedFactor]);

  const handleZoomIn = useCallback(() => stepZoom(1), [stepZoom]);

  const handleZoomOut = useCallback(() => stepZoom(-1), [stepZoom]);

  const handleResetZoom = useCallback(() => {
    if (!activeTabId) return;
    // A reset issued mid-read outranks whatever that read resolves to.
    zoomRequestIdRef.current += 1;
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.setZoomFactor) {
      try {
        webview.setZoomFactor(1.0);
      } catch (e) {
        console.error("Zoom reset error:", e);
      }
    }
    // Recorded even without a webview, so the badge clears on internal pages too.
    commitFactor(activeTabId, 1.0);
  }, [activeTabId, commitFactor]);

  return {
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
  };
}
