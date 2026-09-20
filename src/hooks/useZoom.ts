import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Tab } from '../types/browser';

export const ZOOM_FACTORS = [
  0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0
];

export interface UseZoomOptions {
  activeTabId: string | null;
  setTabs: Dispatch<SetStateAction<Tab[]>>;
}

export function useZoom({ activeTabId, setTabs }: UseZoomOptions) {
  const handleZoomIn = useCallback(() => {
    if (!activeTabId) return;
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.getZoomFactor) {
      try {
        const result = webview.getZoomFactor();
        if (typeof result === 'number') {
          const nextFactor = ZOOM_FACTORS.find(f => f > result + 0.01) || ZOOM_FACTORS[ZOOM_FACTORS.length - 1];
          webview.setZoomFactor(nextFactor);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomFactor: nextFactor } : t));
        } else if (result && typeof result.then === 'function') {
          result.then((currentFactor: number) => {
            const nextFactor = ZOOM_FACTORS.find(f => f > currentFactor + 0.01) || ZOOM_FACTORS[ZOOM_FACTORS.length - 1];
            webview.setZoomFactor(nextFactor);
            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomFactor: nextFactor } : t));
          });
        }
      } catch (e) {
        console.error("Zoom in error:", e);
      }
    }
  }, [activeTabId, setTabs]);

  const handleZoomOut = useCallback(() => {
    if (!activeTabId) return;
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.getZoomFactor) {
      try {
        const result = webview.getZoomFactor();
        if (typeof result === 'number') {
          const nextFactor = [...ZOOM_FACTORS].reverse().find(f => f < result - 0.01) || ZOOM_FACTORS[0];
          webview.setZoomFactor(nextFactor);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomFactor: nextFactor } : t));
        } else if (result && typeof result.then === 'function') {
          result.then((currentFactor: number) => {
            const nextFactor = [...ZOOM_FACTORS].reverse().find(f => f < currentFactor - 0.01) || ZOOM_FACTORS[0];
            webview.setZoomFactor(nextFactor);
            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomFactor: nextFactor } : t));
          });
        }
      } catch (e) {
        console.error("Zoom out error:", e);
      }
    }
  }, [activeTabId, setTabs]);

  const handleResetZoom = useCallback(() => {
    if (!activeTabId) return;
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.setZoomFactor) {
      try {
        webview.setZoomFactor(1.0);
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, zoomFactor: 1.0 } : t));
      } catch (e) {
        console.error("Zoom reset error:", e);
      }
    }
  }, [activeTabId, setTabs]);

  return {
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
  };
}
