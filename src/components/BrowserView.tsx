import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Zap } from 'lucide-react';
import { Tab } from '../types/browser';
import { NewTabPage } from './NewTabPage';
import { SettingsPage } from './SettingsPage';
import { HistoryPage } from './HistoryPage';
import { DownloadsPage } from './DownloadsPage';
import { PasswordPromptModal } from './PasswordPromptModal';
import { HistoryItem } from '../App';
import { DownloadItemPage } from './DownloadsPage';
import { UserSettings } from '../App';
import { AILinkPreview } from './AILinkPreview';

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
  newTabBackground?: string;
  settings: UserSettings;
  onUpdateSettings?: (newSettings: Partial<UserSettings>) => void;
  history?: HistoryItem[];
  downloads?: DownloadItemPage[];
  onClearHistory?: (timeframe?: string) => void;
  onRemoveHistoryItem?: (id: string) => void;
  onClearDownloads?: () => void;
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
  history = [],
  downloads = [],
  onClearHistory,
  onRemoveHistoryItem,
  onClearDownloads,
  onExportData,
  onImportData
}) => {
  const webviewRef = useRef<any>(null);
  
  const getSafeUrl = (u: string) => (u && u.startsWith('nova://')) ? 'about:blank' : (u || 'about:blank');
  const lastLoadedUrl = useRef<string>(tab.url || '');
  const webviewInitialSrc = useRef<string>(getSafeUrl(tab.url));
  const isWebviewReady = useRef<boolean>(false);

  const isNewTab = React.useMemo(() => (
    !tab.url || tab.url === 'about:blank' || tab.url === 'nova://newtab' || tab.url === 'https://newtab'
  ), [tab.url]);
  
  const [passwordPrompt, setPasswordPrompt] = useState<{
    isOpen: boolean;
    hostname: string;
    username: string;
    password: string;
  }>({
    isOpen: false,
    hostname: '',
    username: '',
    password: ''
  });
  
  const [aiPreview, setAiPreview] = useState<{ isOpen: boolean; x: number; y: number; url: string }>({
    isOpen: false,
    x: 0,
    y: 0,
    url: ''
  });
  
  const isSettingsTab = React.useMemo(() => (
    tab.url.startsWith('nova://settings') || tab.url.startsWith('about:settings')
  ), [tab.url]);
  
  const isHistoryTab = React.useMemo(() => (
    tab.url === 'nova://history' || tab.url === 'about:history'
  ), [tab.url]);
  
  const isDownloadsTab = React.useMemo(() => (
    tab.url === 'nova://downloads' || tab.url === 'about:downloads'
  ), [tab.url]);

  const domReadyRef = useRef(false);
  const latestTabRef = useRef(tab);
  
  useEffect(() => {
    latestTabRef.current = tab;
  }, [tab]);


  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDomReady = async () => {
      domReadyRef.current = true;
      let wcId = undefined;
      try { wcId = webview.getWebContentsId(); } catch (e) {}
      onUpdateTab(tab.id, {
        isLoading: false,
        canGoBack: webview.canGoBack?.() || false,
        canGoForward: webview.canGoForward?.() || false,
        title: webview.getTitle?.() || tab.url,
        webContentsId: wcId
      });

      try {
        if (latestTabRef.current.zoomFactor !== undefined) {
          webview.setZoomFactor(latestTabRef.current.zoomFactor);
        } else {
          const zoomMap = { small: 0.85, medium: 1.0, large: 1.25 };
          webview.setZoomFactor(zoomMap[settings.fontSize || 'medium'] || 1.0);
        }
      } catch (err) {
        console.error('Failed to set zoom factor', err);
      }

      // 1. Password Autofill & Capture Logic
      try {
        // Fetch saved passwords for current domain
        let hostname = '';
        try { hostname = new URL(tab.url).hostname; } catch (e) {}
        
        let savedPasswords: any[] = [];
        try {
          const raw = await (window as any).electronAPI?.secureStoreGet?.('passwords');
          if (raw) {
            const all = JSON.parse(raw);
            savedPasswords = all.filter((p: any) => p.hostname === hostname);
          }
        } catch (e) {}

        const autofillScript = `
          (function() {
            if (window.__nova_pw_injected) return;
            window.__nova_pw_injected = true;

            // Autofill existing credentials
            const savedCredentials = ${JSON.stringify(savedPasswords)};
            if (savedCredentials.length > 0) {
              const cred = savedCredentials[0];
              const pwdInputs = document.querySelectorAll('input[type="password"]');
              if (pwdInputs.length > 0) {
                const form = pwdInputs[0].closest('form');
                if (form) {
                  const textInputs = form.querySelectorAll('input[type="text"], input[type="email"]');
                  if (textInputs.length > 0) {
                    textInputs[0].value = cred.username;
                    textInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                  }
                  pwdInputs[0].value = cred.password;
                  pwdInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                }
              }
            }

            // Capture new submissions
            document.addEventListener('submit', (e) => {
              const form = e.target;
              if (form && form.tagName === 'FORM') {
                const pwdInput = form.querySelector('input[type="password"]');
                if (pwdInput && pwdInput.value) {
                  let username = '';
                  const textInputs = form.querySelectorAll('input[type="text"], input[type="email"]');
                  if (textInputs.length > 0) {
                    username = textInputs[0].value;
                  }
                  
                  // IPC to parent window (App.tsx / BrowserView.tsx)
                  // But wait, window.ipcRenderer doesn't exist unless nodeIntegration/preload.
                  // Instead, we can send a custom event and listen for it via another executeJavaScript polling, 
                  // or set title? No, webview supports ipc-message if we use sendToHost in a preload.
                  // Since we have no preload, we can't easily send an IPC message from standard injected script.
                  // However, we can use console.log and capture it!
                  console.log('NOVA_SAVE_PW::' + JSON.stringify({ hostname: window.location.hostname, username, password: pwdInput.value }));
                }
              }
            });
          })();
          
          (function() {
            if (!${settings.aiLinkPreviewEnabled}) return;
            if (window.__nova_hover_injected) return;
            window.__nova_hover_injected = true;
            let hoverTimer = null;
            let currentLink = null;
            
            document.addEventListener('mouseover', (e) => {
              const a = e.target.closest('a');
              if (a && a.href && a.href.startsWith('http')) {
                if (currentLink === a) return;
                currentLink = a;
                clearTimeout(hoverTimer);
                hoverTimer = setTimeout(() => {
                  const rect = a.getBoundingClientRect();
                  console.log('NOVA_LINK_HOVER::' + JSON.stringify({
                    url: a.href,
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                  }));
                }, 1500);
              }
            });
            
            document.addEventListener('mouseout', (e) => {
              const a = e.target.closest('a');
              if (a) {
                clearTimeout(hoverTimer);
                if (currentLink === a) currentLink = null;
                console.log('NOVA_LINK_HOVER_OUT::');
              }
            });
            
            document.addEventListener('click', () => {
              clearTimeout(hoverTimer);
              currentLink = null;
              console.log('NOVA_LINK_HOVER_OUT::');
            });
          })();
        `;
        webview.executeJavaScript(autofillScript);
        if (webview.setAudioMuted) webview.setAudioMuted(!!tab.isMuted);
      } catch (e) {}
    };

    const handleStartNavigation = (e: any) => {
      if (e.isMainFrame) {
        onUpdateTab(tab.id, { isLoading: true, blockedAdsCount: 0 });
      }
    };

    const handleFinishLoad = (e: any) => {
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
      if (!e.isMainFrame) return; // Ignore subframe/resource failures (like Youtube ads or trackers)
      onUpdateTab(tab.id, { isLoading: false, title: `Error: ${e.errorDescription || 'Failed'}` });
      console.error('[Webview] Failed to load:', e.errorDescription, 'Code:', e.errorCode);
    };

    const handleNavigateEvent = (e: any) => {
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
      console.error('[Webview] Crashed on tab:', tab.id, 'URL:', tab.url);
      // We removed the automatic reload because if the page crashes on mount, 
      // reloading it will cause an infinite crash loop (black screen).
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

    const handleIpcMessage = (e: any) => {
      if (e.channel === 'password-form-submitted') {
        const { hostname, username, password } = e.args[0];
        setPasswordPrompt({ isOpen: true, hostname, username, password });
      }
    };

    const handleConsoleMessage = (e: any) => {
      if (e.message && e.message.startsWith('NOVA_SAVE_PW::')) {
        try {
          const data = JSON.parse(e.message.substring(14));
          setPasswordPrompt({ isOpen: true, hostname: data.hostname, username: data.username, password: data.password });
        } catch (err) {}
      }
      if (e.message && e.message.startsWith('NOVA_LINK_HOVER::')) {
        try {
          const data = JSON.parse(e.message.substring(17));
          setAiPreview({ isOpen: true, url: data.url, x: data.x, y: data.y });
        } catch (err) {}
      }
      if (e.message && e.message.startsWith('NOVA_LINK_HOVER_OUT::')) {
        setAiPreview(prev => ({ ...prev, isOpen: false }));
      }
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
    webview.addEventListener('ipc-message', handleIpcMessage);
    webview.addEventListener('console-message', handleConsoleMessage);

    // Initial check: if webview is already not loading, ensure isLoading is false
    setTimeout(() => {
      try {
        if (webview && typeof webview.isLoading === 'function' && !webview.isLoading()) {
          onUpdateTab(tab.id, { isLoading: false });
        }
      } catch (err) {}
    }, 500);

    return () => {
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
      webview.removeEventListener('ipc-message', handleIpcMessage);
      webview.removeEventListener('console-message', handleConsoleMessage);
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

  // Immediately clear loading state for internal React pages since they don't use webview
  useEffect(() => {
    if ((isSettingsTab || isHistoryTab || isDownloadsTab || isNewTab) && tab.isLoading) {
      onUpdateTab(tab.id, { isLoading: false });
    }
  }, [isSettingsTab, isHistoryTab, isDownloadsTab, isNewTab, tab.isLoading, tab.id, onUpdateTab]);

  // Listen for dom-ready to know when it's safe to call loadURL
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const onReady = () => {
      isWebviewReady.current = true;
    };
    wv.addEventListener('dom-ready', onReady);
    
    return () => {
      wv.removeEventListener('dom-ready', onReady);
    };
  }, []);

  useEffect(() => {
    if (!tab.url || tab.url === lastLoadedUrl.current) return;
    lastLoadedUrl.current = tab.url;
    
    const wv = webviewRef.current as any;
    if (wv && wv.loadURL) {
      if (isWebviewReady.current) {
        wv.loadURL(tab.url).catch((err: any) => console.error('loadURL failed:', err));
      } else {
        // If the webview was just created but the user navigated immediately, wait for dom-ready before calling loadURL!
        const pendingLoad = () => {
          wv.loadURL(tab.url).catch((err: any) => console.error('loadURL failed (pending):', err));
          wv.removeEventListener('dom-ready', pendingLoad);
        };
        wv.addEventListener('dom-ready', pendingLoad);
      }
    }
  }, [tab.url]);

  if (tab.isSuspended) {
    return (
      <div 
        onClick={() => onUpdateTab(tab.id, { isSuspended: false, lastAccessed: Date.now() })}
        className="w-full h-full flex flex-col items-center justify-center p-6 select-none bg-slate-950 text-slate-100 cursor-pointer relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-slate-950 to-purple-950/40 opacity-80" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex items-center justify-center mb-6 backdrop-blur-xl group-hover:scale-105 transition-transform duration-300">
            {tab.favicon ? (
              <img src={tab.favicon} alt="" className="w-12 h-12 rounded-xl object-contain" />
            ) : (
              <Moon className="w-10 h-10 text-indigo-400" />
            )}
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2 line-clamp-1">{tab.title || tab.url}</h2>
          <p className="text-sm text-slate-400 mb-8 leading-relaxed">
            Bellek tasarrufu için bu sekme askıya alındı. Tıklayarak anında uyandırın.
          </p>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onUpdateTab(tab.id, { isSuspended: false, lastAccessed: Date.now() });
            }}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 group-hover:scale-105"
          >
            <Zap className="w-4 h-4" />
            Sekmeyi Yeniden Yükle
          </button>
        </div>
      </div>
    );
  }

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
        backgroundCustomUrl={settings.backgroundCustomUrl}
        unsplashCategory={settings.unsplashCategory}
        showTasksWidget={settings.showTasksWidget}
        isIncognito={isIncognito}
      />
    );
  }

  if (isSettingsTab) {
    return (
      <SettingsPage
        url={tab.url}
        settings={settings}
        onUpdateSettings={onUpdateSettings || (() => {})}
        onExportData={onExportData}
        onImportData={onImportData}
      />
    );
  }

  if (isHistoryTab) {
    return (
      <HistoryPage
        history={history}
        onNavigate={(url) => {
          onUpdateTab(tab.id, { url, isLoading: true });
          if (onNavigate) onNavigate(url);
        }}
        onClearHistory={onClearHistory || (() => {})}
        onRemoveHistoryItem={onRemoveHistoryItem || (() => {})}
      />
    );
  }

  if (isDownloadsTab) {
    return (
      <DownloadsPage
        downloads={downloads}
        onClearDownloads={onClearDownloads || (() => {})}
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
                width: { duration: 8, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.2 }
              } 
            }}
            exit={{ 
              opacity: 0, 
              width: '100%', 
              transition: { 
                width: { duration: 0.25, ease: 'easeOut' },
                opacity: { duration: 0.3, delay: 0.15 }
              } 
            }}
            style={{ willChange: 'opacity, width', boxShadow: '0 0 12px rgba(99, 102, 241, 0.7)' }}
            className="absolute top-0 left-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 z-50 origin-left shadow-lg"
          />
        )}
      </AnimatePresence>

      <div className="flex-1 w-full relative">
        {/* Debug Banner */}
        {!(typeof window !== 'undefined' && (window as any).electronAPI && !(window as any).electronAPI.isWebMockup) && (
          <div className="absolute top-0 left-0 right-0 bg-red-600 text-white font-bold p-2 z-[9999] text-center">
            UYARI: ELECTRON API BULUNAMADI! IFRAME (GÜVENLİ MOD) KULLANILIYOR! 
            Bu yüzden YouTube ve Reddit gibi siteler (X-Frame-Options engeli nedeniyle) SİYAH EKRAN verecektir!
          </div>
        )}

        {/* Electron Webview Tag for Native Browser Experience */}
        {typeof window !== 'undefined' && (window as any).electronAPI && !(window as any).electronAPI.isWebMockup ? (
          <webview
            ref={webviewRef}
            data-tab-id={tab.id}
            src={webviewInitialSrc.current || 'about:blank'}
            className="w-full h-full border-none bg-white"
            allowpopups={"true" as any}
            useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
          />
        ) : (
          /* Web / Dev IFrame Fallback for standard browser preview */
          <iframe
            ref={webviewRef as any}
            data-tab-id={tab.id}
            src={webviewInitialSrc.current || 'about:blank'}
            className="w-full h-full border-none bg-white"
            title={tab.title}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            onLoad={() => {
              if (tab.isLoading) {
                onUpdateTab(tab.id, { isLoading: false });
              }
            }}
          />
        )}
      </div>

      <PasswordPromptModal
        isOpen={passwordPrompt.isOpen}
        hostname={passwordPrompt.hostname}
        username={passwordPrompt.username}
        onClose={() => setPasswordPrompt((prev: any) => ({ ...prev, isOpen: false }))}
        onSave={async () => {
          try {
            const raw = await (window as any).electronAPI?.secureStoreGet?.('passwords');
            let passwords = raw ? JSON.parse(raw) : [];
            
            // Remove existing password for this host if any
            passwords = passwords.filter((p: any) => p.hostname !== passwordPrompt.hostname);
            
            passwords.push({
              hostname: passwordPrompt.hostname,
              username: passwordPrompt.username,
              password: passwordPrompt.password,
              timestamp: Date.now()
            });
            
            await (window as any).electronAPI?.secureStoreSet?.('passwords', JSON.stringify(passwords));
          } catch (e) {
            console.error('Failed to save password', e);
          }
          setPasswordPrompt((prev: any) => ({ ...prev, isOpen: false }));
        }}
      />
      
      {settings.aiLinkPreviewEnabled && (
        <AILinkPreview 
          url={aiPreview.url}
          x={aiPreview.x}
          y={aiPreview.y}
          isOpen={aiPreview.isOpen}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) return false;
  if (prevProps.tab.url !== nextProps.tab.url) return false;
  if (prevProps.tab.isLoading !== nextProps.tab.isLoading) return false;
  if (prevProps.tab.title !== nextProps.tab.title) return false;
  if (prevProps.tab.favicon !== nextProps.tab.favicon) return false;
  if (prevProps.tab.isSuspended !== nextProps.tab.isSuspended) return false;
  if (prevProps.tab.thumbnail !== nextProps.tab.thumbnail) return false;
  if (prevProps.tab.isMuted !== nextProps.tab.isMuted) return false;
  if (prevProps.isIncognito !== nextProps.isIncognito) return false;
  
  // Deep comparison for settings object changes that affect rendering
  if (prevProps.tab.url === 'nova://settings' && prevProps.settings !== nextProps.settings) return false;
  if (prevProps.tab.url === 'nova://history' && prevProps.history !== nextProps.history) return false;
  if (prevProps.tab.url === 'nova://downloads' && prevProps.downloads !== nextProps.downloads) return false;
  
  return true;
});

