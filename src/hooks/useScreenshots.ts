import { useState, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { Tab } from '../types/browser';
import { getElectronAPI } from '../utils/electronBridge';
import { showAlert } from '../utils/confirmDialog';

export interface UseScreenshotsOptions {
  activeTabId: string;
  tabs: Tab[];
  setIsScreenshotOpen: Dispatch<SetStateAction<boolean>>;
}

export function useScreenshots({
  activeTabId,
  tabs,
  setIsScreenshotOpen,
}: UseScreenshotsOptions) {
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [screenshotPageTitle, setScreenshotPageTitle] = useState('');
  const screenshotOwnerRef = useRef<{ tabId: string; url: string; webContentsId?: number } | null>(null);
  const latestContextRef = useRef({ activeTabId, tabs });
  const requestIdRef = useRef(0);
  const previous = latestContextRef.current;
  const previousTab = previous.tabs.find(tab => tab.id === previous.activeTabId);
  const currentTab = tabs.find(tab => tab.id === activeTabId);
  if (previous.activeTabId !== activeTabId || previousTab?.url !== currentTab?.url ||
      previousTab?.webContentsId !== currentTab?.webContentsId || previousTab?.isLoading !== currentTab?.isLoading) {
    requestIdRef.current++;
  }
  const owner = screenshotOwnerRef.current;
  if (owner) {
    const before = previous.tabs.find(tab => tab.id === owner.tabId);
    const after = tabs.find(tab => tab.id === owner.tabId);
    if (!after || after.url !== owner.url || before?.webContentsId !== after.webContentsId || before?.isLoading !== after.isLoading) {
      screenshotOwnerRef.current = null;
    }
  }
  latestContextRef.current = { activeTabId, tabs };
  const navigationCleanupsRef = useRef(new Set<() => void>());
  useEffect(() => () => {
    requestIdRef.current++;
    navigationCleanupsRef.current.forEach(cleanup => cleanup());
  }, []);

  const watchNavigation = useCallback((webview: any, requestId: number) => {
    const invalidate = (event: { isMainFrame?: boolean }) => {
      if (event.isMainFrame === false || requestIdRef.current !== requestId) return;
      requestIdRef.current++;
      screenshotOwnerRef.current = null;
    };
    webview.addEventListener?.('did-start-navigation', invalidate);
    const cleanup = () => {
      webview.removeEventListener?.('did-start-navigation', invalidate);
      navigationCleanupsRef.current.delete(cleanup);
    };
    navigationCleanupsRef.current.add(cleanup);
    return cleanup;
  }, []);

  const isCurrentCapture = useCallback((requestId: number, webview: any, tabId: string, url?: string) => {
    const current = latestContextRef.current;
    return requestId === requestIdRef.current && current.activeTabId === tabId &&
      url !== undefined && current.tabs.find(tab => tab.id === tabId)?.url === url &&
      webview?.isConnected !== false && document.querySelector(`webview[data-tab-id="${tabId}"]`) === webview;
  }, []);

  const handleTakeScreenshot = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const sourceTab = tabs.find(tab => tab.id === activeTabId);
    const url = sourceTab?.url;
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview) {
      const stopWatching = watchNavigation(webview, requestId);
      try {
        let dataUrl: string | null = null;
        const wcId = typeof webview.getWebContentsId === 'function' ? webview.getWebContentsId() : undefined;
        if (wcId !== undefined && getElectronAPI()?.captureTabThumbnail) {
          dataUrl = await getElectronAPI()?.captureTabThumbnail(wcId) ?? null;
        } else if (typeof webview.capturePage === 'function') {
          const image = await webview.capturePage();
          dataUrl = image.toDataURL();
        }

        if (!isCurrentCapture(requestId, webview, activeTabId, url)) return;
        if (dataUrl && sourceTab) {
          screenshotOwnerRef.current = { tabId: activeTabId, url: sourceTab.url, webContentsId: wcId };
          setScreenshotPageTitle(sourceTab.title || 'Page');
          setScreenshotDataUrl(dataUrl);
          setIsScreenshotOpen(true);
        } else {
          void showAlert({ title: 'Screenshot', message: 'Failed to capture screenshot. The page might not be fully loaded.' });
        }
      } catch (err) {
        console.error('Screenshot capture failed:', err);
        if (isCurrentCapture(requestId, webview, activeTabId, url)) {
          void showAlert({ title: 'Screenshot', message: 'Failed to capture screenshot. Please try again once the page has loaded.' });
        }
      } finally {
        stopWatching();
      }
    } else {
      // Check if it's an internal page by looking at activeTab url
      const tab = tabs.find(t => t.id === activeTabId);
      if (tab?.url?.startsWith('nova://') || tab?.url?.startsWith('about:')) {
        void showAlert({ title: 'Screenshot', message: 'Screenshots cannot be taken on internal pages (Settings, New Tab, etc.).' });
      } else {
        void showAlert({ title: 'Screenshot', message: 'Screenshot feature is only available in the desktop app.' });
      }
    }
  }, [activeTabId, tabs, setIsScreenshotOpen, isCurrentCapture, watchNavigation]);

  const handleCaptureFullPage = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const url = tabs.find(tab => tab.id === activeTabId)?.url;
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    const owner = screenshotOwnerRef.current;
    if (!owner || owner.tabId !== activeTabId || owner.url !== url) return null;
    if (webview && typeof webview.getWebContentsId === 'function' && getElectronAPI()?.captureFullPage) {
      const stopWatching = watchNavigation(webview, requestId);
      try {
        const wcId = webview.getWebContentsId();
        if (owner.webContentsId !== wcId) return null;
        const dataUrl = await getElectronAPI()?.captureFullPage(wcId) ?? null;
        return isCurrentCapture(requestId, webview, activeTabId, url) ? dataUrl : null;
      } catch (err) {
        console.error('Full page screenshot failed:', err);
        return null;
      } finally {
        stopWatching();
      }
    }
    return null;
  }, [activeTabId, tabs, isCurrentCapture, watchNavigation]);

  return {
    screenshotDataUrl,
    screenshotPageTitle,
    setScreenshotDataUrl,
    handleTakeScreenshot,
    handleCaptureFullPage,
  };
}
