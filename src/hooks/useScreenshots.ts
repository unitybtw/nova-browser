import { useState, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
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

  const handleTakeScreenshot = useCallback(async () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview) {
      try {
        let dataUrl: string | null = null;
        if (typeof webview.getWebContentsId === 'function' && getElectronAPI()?.captureTabThumbnail) {
          const wcId = webview.getWebContentsId();
          dataUrl = await getElectronAPI()?.captureTabThumbnail(wcId) ?? null;
        } else if (typeof webview.capturePage === 'function') {
          const image = await webview.capturePage();
          dataUrl = image.toDataURL();
        }

        if (dataUrl) {
          setScreenshotDataUrl(dataUrl);
          setIsScreenshotOpen(true);
        } else {
          void showAlert({ title: 'Screenshot', message: 'Failed to capture screenshot. The page might not be fully loaded.' });
        }
      } catch (err) {
        console.error('Screenshot capture failed:', err);
      }
    } else {
      // Check if it's an internal page by looking at activeTab url
      const tab = tabs.find(t => t.id === activeTabId);
      if (tab?.url?.startsWith('nova://')) {
        void showAlert({ title: 'Screenshot', message: 'Screenshots cannot be taken on internal pages (Settings, New Tab, etc.).' });
      } else {
        void showAlert({ title: 'Screenshot', message: 'Screenshot feature is only available in the desktop app.' });
      }
    }
  }, [activeTabId, tabs, setIsScreenshotOpen]);

  const handleCaptureFullPage = useCallback(async () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any;
    if (webview && typeof webview.getWebContentsId === 'function' && getElectronAPI()?.captureFullPage) {
      try {
        const wcId = webview.getWebContentsId();
        const dataUrl = await getElectronAPI()?.captureFullPage(wcId) ?? null;
        return dataUrl;
      } catch (err) {
        console.error('Full page screenshot failed:', err);
        return null;
      }
    }
    return null;
  }, [activeTabId]);

  return {
    screenshotDataUrl,
    setScreenshotDataUrl,
    handleTakeScreenshot,
    handleCaptureFullPage,
  };
}
