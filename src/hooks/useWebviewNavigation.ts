import { useCallback } from 'react';
import { logger } from '../utils/logger';

export interface UseWebviewNavigationOptions {
  activeTabId: string;
}

export function useWebviewNavigation({ activeTabId }: UseWebviewNavigationOptions) {
  const navigateHistory = useCallback((direction: 'back' | 'forward') => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    try {
      if (webview) {
        const canGo = direction === 'back' ? 'canGoBack' : 'canGoForward';
        const go = direction === 'back' ? 'goBack' : 'goForward';
        if (typeof webview[canGo] === 'function' && webview[canGo]()) webview[go]();
        return;
      }
      const iframe = document.querySelector(`iframe[data-tab-id="${activeTabId}"]`) as HTMLIFrameElement;
      iframe?.contentWindow?.history[direction]();
    } catch (err) {
      logger.debug('App:Navigation', `History ${direction} blocked or failed`, err);
    }
  }, [activeTabId]);

  const handleGoBack = useCallback(() => navigateHistory('back'), [navigateHistory]);
  const handleGoForward = useCallback(() => navigateHistory('forward'), [navigateHistory]);

  const handleReload = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    try {
      if (webview && typeof webview.reload === 'function') {
        webview.reload();
      } else {
        const iframe = document.querySelector(`iframe[data-tab-id="${activeTabId}"]`) as HTMLIFrameElement;
        if (iframe) iframe.src = iframe.src;
      }
    } catch (err) {
      logger.debug('App:Navigation', 'Reload blocked or failed', err);
    }
  }, [activeTabId]);

  return {
    handleGoBack,
    handleGoForward,
    handleReload,
  };
}
