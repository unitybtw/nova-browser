import { useCallback } from 'react';
import { logger } from '../utils/logger';

export interface UseWebviewNavigationOptions {
  activeTabId: string;
}

export function useWebviewNavigation({ activeTabId }: UseWebviewNavigationOptions) {
  const handleGoBack = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.canGoBack && webview.canGoBack()) {
      webview.goBack();
    } else {
      const iframe = document.querySelector(`iframe[data-tab-id="${activeTabId}"]`) as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.history.back();
        } catch (err) {
          logger.debug('App:Navigation', 'iframe history.back blocked or failed', err);
        }
      }
    }
  }, [activeTabId]);

  const handleGoForward = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.canGoForward && webview.canGoForward()) {
      webview.goForward();
    } else {
      const iframe = document.querySelector(`iframe[data-tab-id="${activeTabId}"]`) as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.history.forward();
        } catch (err) {
          logger.debug('App:Navigation', 'iframe history.forward blocked or failed', err);
        }
      }
    }
  }, [activeTabId]);

  const handleReload = useCallback(() => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && webview.reload) {
      webview.reload();
    } else {
      const iframe = document.querySelector(`iframe[data-tab-id="${activeTabId}"]`) as HTMLIFrameElement;
      if (iframe) {
        const currentSrc = iframe.src;
        iframe.src = 'about:blank';
        setTimeout(() => { if (iframe) iframe.src = currentSrc; }, 50);
      }
    }
  }, [activeTabId]);

  return {
    handleGoBack,
    handleGoForward,
    handleReload,
  };
}
