import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tab } from '../types/browser';
import { NewTabPage } from './NewTabPage';
import { SettingsPage } from './SettingsPage';
import { UserSettings } from '../App';

interface BrowserViewProps {
  tab: Tab;
  isActive: boolean;
  onUpdateTab: (id: string, updates: Partial<Tab>) => void;
  onCloseTab: (id: string) => void;
  isIncognito: boolean;
  onNewTab?: (url?: string) => void;
  onNavigate?: (url: string) => void;
  onFoundInPage?: (activeMatchOrdinal: number, numberOfMatches: number) => void;
  searchEngine: 'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia';
  privacyShield: boolean;
  newTabBackground?: 'default' | 'gradient' | 'mesh' | 'glass';
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onExportData?: () => void;
  onImportData?: (file: File) => void;
}

export const BrowserView: React.FC<BrowserViewProps> = React.memo(({
  tab,
  isActive,
  onUpdateTab,
  onCloseTab,
  isIncognito,
  onNewTab,
  onNavigate,
  onFoundInPage,
  searchEngine = 'google',
  privacyShield = true,
  newTabBackground = 'default',
  settings,
  onUpdateSettings,
  onExportData,
  onImportData
}) => {
  const webviewRef = useRef<any>(null);
  const lastLoadedUrl = useRef<string>('');

  const isNewTab = React.useMemo(() => (
    !tab.url || tab.url === 'about:blank' || tab.url === 'nova://newtab' || tab.url === 'https://newtab'
  ), [tab.url]);
  
  const isSettingsTab = React.useMemo(() => (
    tab.url === 'nova://settings' || tab.url === 'about:settings'
  ), [tab.url]);

  const domReadyRef = useRef(false);

  // Programmatically navigate the webview when tab.url changes.
  // IMPORTANT: Only call loadURL() when the webview is ALREADY dom-ready.
  // For the initial mount, the `src={tab.url}` attribute handles the load —
  // registering a dom-ready listener here would cause a DOUBLE navigation (src + loadURL).
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || isNewTab) return;
    if (!tab.url || tab.url === lastLoadedUrl.current) return;

    lastLoadedUrl.current = tab.url;

    if (domReadyRef.current) {
      // Webview already initialized — navigate programmatically
      try { webview.loadURL(tab.url); } catch (_) {}
    }
    // If not yet dom-ready: the `src` attribute handles the first load.
    // Once dom-ready fires, domReadyRef becomes true and future URL changes use loadURL().
  }, [tab.url, isNewTab]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDomReady = () => {
      console.log('[BrowserView] dom-ready');
      domReadyRef.current = true;
      onUpdateTab(tab.id, {
        isLoading: false,
        canGoBack: webview.canGoBack?.() || false,
        canGoForward: webview.canGoForward?.() || false,
        title: webview.getTitle?.() || tab.url
      });
    };

    const handleStartNavigation = (e: any) => {
      console.log('[BrowserView] did-start-navigation', e.isMainFrame, e.url);
      if (e.isMainFrame) {
        onUpdateTab(tab.id, { isLoading: true });
      }
    };

    const handleFinishLoad = (e: any) => {
      console.log('[BrowserView] did-finish-load', e.isMainFrame);
      if (e.isMainFrame || e.isMainFrame === undefined) {
        onUpdateTab(tab.id, {
          isLoading: false,
          canGoBack: webview.canGoBack?.() || false,
          canGoForward: webview.canGoForward?.() || false,
          title: webview.getTitle?.() || tab.url
        });
      }
    };

    const handleStopLoading = async () => {
      console.log('[BrowserView] did-stop-loading');
      
      let thumbnailDataUrl;
      try {
        if (webviewRef.current && (window as any).electronAPI?.captureTabThumbnail) {
          const wcId = webviewRef.current.getWebContentsId();
          thumbnailDataUrl = await (window as any).electronAPI.captureTabThumbnail(wcId);
        }
      } catch (err) {}

      // Fallback for when all frames finish loading
      onUpdateTab(tab.id, {
        isLoading: false,
        canGoBack: webview.canGoBack?.() || false,
        canGoForward: webview.canGoForward?.() || false,
        title: webview.getTitle?.() || tab.url,
        ...(thumbnailDataUrl ? { thumbnail: thumbnailDataUrl } : {})
      });
    };

    const handleFailLoad = (e: any) => {
      console.log('[BrowserView] did-fail-load', e.isMainFrame, e.errorCode, e.errorDescription);
      if (!e.isMainFrame) return; // Ignore subframe/resource failures (like Youtube ads or trackers)
      onUpdateTab(tab.id, { isLoading: false });
    };

    const handleNavigateEvent = (e: any) => {
      console.log('[BrowserView] did-navigate', e.isMainFrame, e.url);
      if (e.isMainFrame && e.url) {
        lastLoadedUrl.current = e.url;
        onUpdateTab(tab.id, {
          url: e.url,
          isLoading: false,
          canGoBack: webview.canGoBack?.() || false,
          canGoForward: webview.canGoForward?.() || false
        });
      }
    };

    const handleNavigateInPage = (e: any) => {
      if (e.isMainFrame && e.url) {
        lastLoadedUrl.current = e.url;
        onUpdateTab(tab.id, {
          url: e.url,
          isLoading: false,
          canGoBack: webview.canGoBack?.() || false,
          canGoForward: webview.canGoForward?.() || false
        });
      }
    };

    const handleTitleUpdate = (e: any) => {
      if (e.title) {
        onUpdateTab(tab.id, { title: e.title });
      }
    };

    const handleFaviconUpdate = (e: any) => {
      if (e.favicons && e.favicons.length > 0) {
        onUpdateTab(tab.id, { favicon: e.favicons[0] });
      }
    };

    const handleNewWindow = (e: any) => {
      if (e.url) {
        if (onNewTab) {
          onNewTab(e.url);
        } else if (onNavigate) {
          onNavigate(e.url);
        }
      }
    };

    const handleCrashed = () => {
      onUpdateTab(tab.id, { isLoading: false, title: 'Page Crashed' });
      if (webviewRef.current) {
        webviewRef.current.reload();
      }
    };

    const handleFoundInPage = (e: any) => {
      if (e.result && onFoundInPage) {
        onFoundInPage(e.result.activeMatchOrdinal || 0, e.result.numberOfMatches || 0);
      }
    };

    const handleMediaStarted = () => {
      onUpdateTab(tab.id, { isPlayingAudio: true });
    };

    const handleMediaPaused = () => {
      onUpdateTab(tab.id, { isPlayingAudio: false });
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-start-navigation', handleStartNavigation);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-finish-load', handleFinishLoad);
    webview.addEventListener('did-fail-load', handleFailLoad);
    webview.addEventListener('did-navigate', handleNavigateEvent);
    webview.addEventListener('did-navigate-in-page', handleNavigateInPage);
    webview.addEventListener('page-title-updated', handleTitleUpdate);
    webview.addEventListener('page-favicon-updated', handleFaviconUpdate);
    webview.addEventListener('new-window', handleNewWindow);
    webview.addEventListener('crashed', handleCrashed);
    webview.addEventListener('found-in-page', handleFoundInPage);
    webview.addEventListener('media-started-playing', handleMediaStarted);
    webview.addEventListener('media-paused', handleMediaPaused);

    // Initial check: if webview is already not loading, ensure isLoading is false
    setTimeout(() => {
      try {
        if (webview && typeof webview.isLoading === 'function' && !webview.isLoading()) {
          onUpdateTab(tab.id, { isLoading: false });
        }
      } catch (err) {}
    }, 500);

    // Failsafe: Continuously sync actual webview loading state to fix any stuck spinners
    const syncInterval = setInterval(() => {
      try {
        if (webview && typeof webview.isLoading === 'function') {
          const actualLoading = webview.isLoading();
          // If webview says it's not loading, but our state says it is, forcefully clear it
          // We can't access tab.isLoading directly here because it's stale, but we can call onUpdateTab
          // We just send isLoading: false. App.tsx will ignore it if it's already false.
          if (!actualLoading) {
             onUpdateTab(tab.id, { isLoading: false });
          }
        }
      } catch (err) {}
    }, 2000);

    return () => {
      clearInterval(syncInterval);
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-start-navigation', handleStartNavigation);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
      webview.removeEventListener('did-finish-load', handleFinishLoad);
      webview.removeEventListener('did-fail-load', handleFailLoad);
      webview.removeEventListener('did-navigate', handleNavigateEvent);
      webview.removeEventListener('did-navigate-in-page', handleNavigateInPage);
      webview.removeEventListener('page-title-updated', handleTitleUpdate);
      webview.removeEventListener('page-favicon-updated', handleFaviconUpdate);
      webview.removeEventListener('new-window', handleNewWindow);
      webview.removeEventListener('crashed', handleCrashed);
      webview.removeEventListener('found-in-page', handleFoundInPage);
      webview.removeEventListener('media-started-playing', handleMediaStarted);
      webview.removeEventListener('media-paused', handleMediaPaused);
    };
  }, [tab.id, onUpdateTab, onNewTab, onFoundInPage, isNewTab]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (webview && webview.setAudioMuted) {
      try {
        webview.setAudioMuted(!!tab.isMuted);
      } catch (err) {
        // webview might not be dom-ready yet
      }
    }
  }, [tab.isMuted]);

  // Receive thumbnails pushed from the main process (via web-contents-created + did-stop-loading)
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.onTabThumbnailUpdate || isNewTab) return;

    const unsubscribe = electronAPI.onTabThumbnailUpdate((_event: any, { webContentsId, dataUrl }: { webContentsId: number; dataUrl: string }) => {
      // Check if this thumbnail belongs to our webview
      const webview = webviewRef.current;
      try {
        const ourWcId = webview?.getWebContentsId?.();
        if (ourWcId && ourWcId === webContentsId && dataUrl) {
          onUpdateTab(tab.id, { thumbnail: dataUrl });
        }
      } catch (_) {}
    });

    return () => { try { unsubscribe?.(); } catch (_) {} };
  }, [isNewTab, tab.id, onUpdateTab]);

  // Capture thumbnail when switching away from this tab
  useEffect(() => {
    if (!isActive && webviewRef.current && !isNewTab && (window as any).electronAPI?.captureTabThumbnail) {
      const capture = async () => {
        try {
          const wcId = webviewRef.current.getWebContentsId();
          const thumbnailDataUrl = await (window as any).electronAPI.captureTabThumbnail(wcId);
          if (thumbnailDataUrl) {
            onUpdateTab(tab.id, { thumbnail: thumbnailDataUrl });
          }
        } catch (err) {}
      };
      capture();
    }
  }, [isActive, isNewTab, tab.id, onUpdateTab]);

  if (isNewTab) {
    return (
      <NewTabPage 
        onNavigate={(url) => {
          // Update the tab URL so BrowserView's useEffect fires loadURL
          onUpdateTab(tab.id, { url, isLoading: !(url === 'nova://newtab' || url === 'about:blank' || url === 'https://newtab') });
          // Also call parent navigate if available
          if (onNavigate) onNavigate(url);
        }} 
        searchEngine={searchEngine}
        privacyShield={privacyShield}
        newTabBackground={newTabBackground}
      />
    );
  }

  if (isSettingsTab) {
    return (
      <SettingsPage
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onExportData={onExportData}
        onImportData={onImportData}
      />
    );
  }

  return (
    <div className="w-full h-full relative bg-white dark:bg-slate-900 flex flex-col">
      {/* Top Progress Bar */}
      <AnimatePresence>
        {tab.isLoading && (
          <motion.div
            initial={{ opacity: 0, width: '0%' }}
            animate={{ 
              opacity: 1, 
              width: '85%',
              transition: { 
                width: { duration: 10, ease: 'easeOut' }, // Fake slow progress
                opacity: { duration: 0.2 }
              } 
            }}
            exit={{ 
              opacity: 0, 
              width: '100%', 
              transition: { 
                width: { duration: 0.3, ease: 'easeIn' }, // Jump to 100% quickly
                opacity: { duration: 0.4, delay: 0.2 } // Then fade out
              } 
            }}
            className="absolute top-0 left-0 h-[2px] bg-blue-500 z-50 origin-left"
            style={{ boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 w-full relative">
        {/* Electron Webview Tag for Native Browser Experience */}
        {typeof window !== 'undefined' && (window as any).electronAPI ? (
          <webview
            ref={webviewRef}
            data-tab-id={tab.id}
            src={tab.url}
            className="w-full h-full border-none"
            allowpopups={"true" as any}
          />
        ) : (
          /* Web / Dev IFrame Fallback for standard browser preview */
          <iframe
            ref={webviewRef}
            data-tab-id={tab.id}
            src={tab.url}
            className="w-full h-full border-none"
            title={tab.title}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            onLoad={() => {
              onUpdateTab(tab.id, { isLoading: false });
            }}
          />
        )}
      </div>
    </div>
  );
});

