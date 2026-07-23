import React, { useRef, useEffect } from 'react';
import { Tab } from '../types/browser';
import { NewTabPage } from './NewTabPage';
import { UserSettings } from './SettingsModal';

export interface BrowserViewProps {
  tab: Tab;
  onUpdateTab: (id: string, updates: Partial<Tab>) => void;
  onNewTab?: (url?: string) => void;
  onNavigate?: (url: string) => void;
  onFoundInPage?: (index: number, count: number) => void;
  searchEngine?: 'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia';
  privacyShield?: boolean;
}

export const BrowserView: React.FC<BrowserViewProps> = React.memo(({
  tab,
  onUpdateTab,
  onNewTab,
  onNavigate,
  onFoundInPage,
  searchEngine = 'google',
  privacyShield = true
}) => {
  const webviewRef = useRef<any>(null);
  const lastLoadedUrl = useRef<string>('');

  const isNewTab = React.useMemo(() => (
    !tab.url || tab.url === 'about:blank' || tab.url === 'zen://newtab' || tab.url === 'https://newtab'
  ), [tab.url]);

  // Programmatically navigate the webview when tab.url changes (src prop alone is not reactive)
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || isNewTab) return;
    if (tab.url && tab.url !== lastLoadedUrl.current) {
      lastLoadedUrl.current = tab.url;
      try {
        webview.loadURL(tab.url);
      } catch (e) {
        // webview not ready yet, src handles initial load
      }
    }
  }, [tab.url, isNewTab]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleStartLoading = () => {
      onUpdateTab(tab.id, { isLoading: true });
    };

    const handleStopLoading = () => {
      onUpdateTab(tab.id, { 
        isLoading: false,
        canGoBack: webview.canGoBack?.() || false,
        canGoForward: webview.canGoForward?.() || false,
        title: webview.getTitle?.() || tab.url
      });
    };

    const handleFailLoad = (e: any) => {
      if (!e.isMainFrame) return; // Ignore subframe/resource failures (like Youtube ads or trackers)
      // errorCode -3 is ERR_ABORTED (usually fine, user navigated away before load finished)
      if (e.errorCode !== -3) {
        onUpdateTab(tab.id, { isLoading: false, title: 'Error: Cannot Load Page' });
      } else {
        onUpdateTab(tab.id, { isLoading: false });
      }
    };

    const handleNavigateEvent = (e: any) => {
      if (e.isMainFrame && e.url) {
        onUpdateTab(tab.id, {
          url: e.url,
          canGoBack: webview.canGoBack?.() || false,
          canGoForward: webview.canGoForward?.() || false
        });
      }
    };

    const handleNavigateInPage = (e: any) => {
      if (e.isMainFrame && e.url) {
        onUpdateTab(tab.id, {
          url: e.url,
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
        // Try to recover the webview by reloading it
        webviewRef.current.reload();
      }
    };

    const handleFoundInPage = (e: any) => {
      if (e.result && onFoundInPage) {
        onFoundInPage(e.result.activeMatchOrdinal || 0, e.result.numberOfMatches || 0);
      }
    };

    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-fail-load', handleFailLoad);
    webview.addEventListener('did-navigate', handleNavigateEvent);
    webview.addEventListener('did-navigate-in-page', handleNavigateInPage);
    webview.addEventListener('page-title-updated', handleTitleUpdate);
    webview.addEventListener('page-favicon-updated', handleFaviconUpdate);
    webview.addEventListener('new-window', handleNewWindow);
    webview.addEventListener('crashed', handleCrashed);
    webview.addEventListener('found-in-page', handleFoundInPage);

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoading);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
      webview.removeEventListener('did-fail-load', handleFailLoad);
      webview.removeEventListener('did-navigate', handleNavigateEvent);
      webview.removeEventListener('did-navigate-in-page', handleNavigateInPage);
      webview.removeEventListener('page-title-updated', handleTitleUpdate);
      webview.removeEventListener('page-favicon-updated', handleFaviconUpdate);
      webview.removeEventListener('new-window', handleNewWindow);
      webview.removeEventListener('crashed', handleCrashed);
      webview.removeEventListener('found-in-page', handleFoundInPage);
    };
  }, [tab.id, onUpdateTab, onNewTab, onFoundInPage]);

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

  if (isNewTab) {
    return (
      <NewTabPage 
        onNavigate={(url) => {
          // Update the tab URL so BrowserView's useEffect fires loadURL
          onUpdateTab(tab.id, { url, isLoading: !(url === 'zen://newtab' || url === 'about:blank' || url === 'https://newtab') });
          // Also call parent navigate if available
          if (onNavigate) onNavigate(url);
        }} 
        searchEngine={searchEngine}
        privacyShield={privacyShield}
      />
    );
  }

  return (
    <div className="w-full h-full relative bg-white dark:bg-slate-900">
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
  );
});

