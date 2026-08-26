import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Zap, Folder, Shield, Code2, Palette } from 'lucide-react';
import { Tab } from '../types/browser';
import { NewTabPage } from './NewTabPage';
import { PasswordPromptModal } from './PasswordPromptModal';
import { HistoryItem } from '../App';
import { DownloadItemPage } from './DownloadsPage';
import { UserSettings } from '../App';
import { AILinkPreview } from './AILinkPreview';
import { tabThumbnailCache } from '../services/thumbnailCache';

// Performance: Code-split internal browser pages
const SettingsPage = React.lazy(() => import('./SettingsPage').then(m => ({ default: m.SettingsPage })));
const HistoryPage = React.lazy(() => import('./HistoryPage').then(m => ({ default: m.HistoryPage })));
const DownloadsPage = React.lazy(() => import('./DownloadsPage').then(m => ({ default: m.DownloadsPage })));

const NOOP = () => {};

// Origins already hinted via <link rel="dns-prefetch">. Deduping by origin keeps
// document.head bounded (growth is capped by the number of distinct origins visited).
const dnsPrefetchedOrigins = new Set<string>();

interface BrowserViewProps {
  tab?: Tab | null;
  isActive: boolean;
  onUpdateTab: (id: string, updates: Partial<Tab>) => void;
  onCloseTab: (id: string) => void;
  isIncognito: boolean;
  onNewTab?: (url?: string) => void;
  onNavigate?: (url: string) => void;
  onFoundInPage?: (activeMatchOrdinal: number, numberOfMatches: number) => void;
  searchEngine?: UserSettings['searchEngine'];
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
  onPurgeMemory?: () => Promise<void> | void;
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
  onImportData,
  onPurgeMemory
}) => {
  const webviewRef = useRef<any>(null);

  const getSafeUrl = (u?: string) => (u && u.startsWith('nova://')) ? 'about:blank' : (u || 'about:blank');
  const lastLoadedUrl = useRef<string>(tab?.url || '');
  const isWebviewReady = useRef<boolean>(false);

  const isNewTab = React.useMemo(() => (
    !tab?.url || tab.url === 'about:blank' || tab.url === 'nova://newtab' || tab.url === 'https://newtab'
  ), [tab?.url]);
  
  const [passwordPrompt, setPasswordPrompt] = useState<{
    isOpen: boolean;
    hostname: string;
    username: string;
    password: string;
    isUpdate?: boolean;
  }>({
    isOpen: false,
    hostname: '',
    username: '',
    password: '',
    isUpdate: false
  });
  
  const [aiPreview, setAiPreview] = useState<{ isOpen: boolean; x: number; y: number; url: string }>({
    isOpen: false,
    x: 0,
    y: 0,
    url: ''
  });
  
  const isSettingsTab = React.useMemo(() => (
    Boolean(tab?.url?.startsWith('nova://settings') || tab?.url?.startsWith('about:settings'))
  ), [tab?.url]);
  
  const isHistoryTab = React.useMemo(() => (
    tab?.url === 'nova://history' || tab?.url === 'about:history'
  ), [tab?.url]);
  
  const isDownloadsTab = React.useMemo(() => (
    tab?.url === 'nova://downloads' || tab?.url === 'about:downloads'
  ), [tab?.url]);

  const latestTabRef = useRef(tab);
  // Latest-settings ref: the main webview effect intentionally does NOT depend
  // on `settings` (re-running would re-attach 18 listeners and reset webview
  // state), so its callbacks read current values through this ref instead of
  // stale closure captures.
  const latestSettingsRef = useRef(settings);
  latestSettingsRef.current = settings;

  useEffect(() => {
    latestTabRef.current = tab;
  }, [tab]);


  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || !tab?.id) return;

    const handleDomReady = async () => {
      let wcId = undefined;
      try { wcId = webview.getWebContentsId(); } catch (e) {}
      onUpdateTab(tab.id, {
        isLoading: false,
        canGoBack: webview.canGoBack?.() || false,
        canGoForward: webview.canGoForward?.() || false,
        title: webview.getTitle?.() || latestTabRef.current?.url || '',
        webContentsId: wcId
      });

      try {
        const currentTab = latestTabRef.current;
        if (currentTab?.zoomFactor !== undefined) {
          webview.setZoomFactor(currentTab.zoomFactor);
        } else {
          const zoomMap = { small: 0.85, medium: 1.0, large: 1.25 };
          webview.setZoomFactor(zoomMap[latestSettingsRef.current.fontSize || 'medium'] || 1.0);
        }
      } catch (err) {
        console.error('Failed to set zoom factor', err);
      }

      // Passwords are never filled automatically. Explicit user interaction is
      // required before credentials are exposed to a web page.
      // NOTE: Only the password-autofill portion is gated behind the password
      // manager setting. The AI link-preview injection and mute handling below
      // must run regardless of that setting.
      if (latestSettingsRef.current.passwordManagerEnabled === true) {
        // 1. Password Autofill & Capture Logic
        try {
          // Fetch saved passwords for current domain.
          // Read the URL through latestTabRef: tab.url can change (SPA
          // navigations) without this effect re-running.
          let hostname = '';
          try { hostname = new URL(latestTabRef.current?.url || '').hostname; } catch (e) {}
          
          let savedPasswords: any[] = [];
          try {
            const raw = await (window as any).electronAPI?.secureStoreGet?.('passwords');
            if (raw) {
              const all = JSON.parse(raw);
              savedPasswords = all.filter((p: any) => p.hostname === hostname);
            }
          } catch (e) {}

          const passwordScript = `
            (function() {
              if (window.__nova_pw_injected) return;
              window.__nova_pw_injected = true;

              // Autofill existing credentials
              const savedCredentials = ${JSON.stringify(savedPasswords)};
              if (savedCredentials.length > 0) {
                const cred = savedCredentials[0];
                const pwdInputs = Array.from(document.querySelectorAll('input[type="password"]'));
                if (pwdInputs.length > 0) {
                  const root = pwdInputs[0].closest('form') || pwdInputs[0].closest('div') || document;
                  const textInputs = Array.from(root.querySelectorAll('input[type="text"], input[type="email"], input[autocomplete="username"], input[name*="user" i], input[name*="email" i], input[name*="login" i]'));
                  if (textInputs.length > 0) {
                    textInputs[0].value = cred.username;
                    textInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                    textInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                  }
                  pwdInputs[0].value = cred.password;
                  pwdInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                  pwdInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                }
              }

              // In-page fallback password capture listener
              let lastUser = '';
              document.addEventListener('input', (e) => {
                const t = e.target;
                if (t && t.tagName === 'INPUT') {
                  const type = (t.type || '').toLowerCase();
                  const name = (t.name || '').toLowerCase();
                  if (type === 'text' || type === 'email' || type === 'tel' || name.includes('user') || name.includes('email') || name.includes('login')) {
                    if (t.value && t.value.trim()) lastUser = t.value.trim();
                  }
                }
              }, true);

              const checkAndEmit = () => {
                const pwds = Array.from(document.querySelectorAll('input[type="password"]'));
                const activePwd = pwds.find(p => p.value && p.value.length > 0);
                if (!activePwd || !activePwd.value) return;

                const root = activePwd.closest('form') || activePwd.closest('div') || document;
                let userInp = root.querySelector('input[autocomplete="username"], input[autocomplete="email"], input[name*="user" i], input[name*="email" i], input[name*="login" i], input[type="email"], input[type="text"]');
                const foundUser = (userInp && userInp.value && userInp.value.trim()) || lastUser;
                
                if (foundUser && activePwd.value) {
                  // SECURITY NOTE: This console.log IS the transport channel for the
                  // captured credential (piped to the renderer via the 'console-message'
                  // event), so the payload necessarily contains the password. It must
                  // not be duplicated or logged anywhere else.
                  console.log('NOVA_SAVE_PW::' + JSON.stringify({
                    hostname: window.location.hostname,
                    username: foundUser,
                    password: activePwd.value
                  }));
                }
              };

              document.addEventListener('submit', checkAndEmit, true);
              document.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkAndEmit(); }, true);
              document.addEventListener('click', (e) => {
                const btn = e.target && e.target.closest('button, input[type="submit"], input[type="button"], a[role="button"], div[role="button"]');
                if (btn) {
                  const txt = (btn.textContent || btn.value || '').toLowerCase();
                  if (btn.type === 'submit' || /log|sign|giriş|kayıt|devam|next|continue|submit|ileri/i.test(txt)) {
                    setTimeout(checkAndEmit, 50);
                  }
                }
              }, true);
            })();
          `;
          webview.executeJavaScript(passwordScript).catch(() => {});
        } catch (e) {}
      }

      // 2. AI Link Preview injection — independent of the password manager setting
      // (the script self-gates on aiLinkPreviewEnabled)
      try {
        const linkPreviewScript = `
          (function() {
            if (!${Boolean(latestSettingsRef.current.aiLinkPreviewEnabled ?? true)}) return;
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
        webview.executeJavaScript(linkPreviewScript).catch(() => {});
      } catch (e) {}

      // 3. Mute state must always be applied, regardless of feature gates
      if (webview.setAudioMuted) webview.setAudioMuted(!!tab?.isMuted);
    };

    const handleStartNavigation = (e: any) => {
      if (e.isMainFrame && tab?.id) {
        onUpdateTab(tab.id, { isLoading: true, blockedAdsCount: 0 });
      }
    };

    const handleFinishLoad = (e: any) => {
      if ((e.isMainFrame || e.isMainFrame === undefined) && tab?.id) {
        onUpdateTab(tab.id, {
          isLoading: false,
          canGoBack: webview.canGoBack?.() || false,
          canGoForward: webview.canGoForward?.() || false,
          title: webview.getTitle?.() || latestTabRef.current?.url || ''
        });
      }
    };

    const handleStopLoading = () => {
      // PERFORMANCE FIX: Removed aggressive thumbnail capture on every page load.
      if (tab?.id) {
        onUpdateTab(tab.id, {
          isLoading: false,
          canGoBack: webview.canGoBack?.() || false,
          canGoForward: webview.canGoForward?.() || false,
          title: webview.getTitle?.() || latestTabRef.current?.url || ''
        });
      }
    };

    const handleFailLoad = (e: any) => {
      if (e.errorCode === -3) return;
      if (!e.isMainFrame || !tab?.id) return; // Ignore subframe/resource failures (like Youtube ads or trackers)
      onUpdateTab(tab.id, { isLoading: false, title: `Error: ${e.errorDescription || 'Failed'}` });
      console.error('[Webview] Failed to load:', e.errorDescription, 'Code:', e.errorCode);
    };

    const handleNavigateEvent = (e: any) => {
      if (e.isMainFrame && e.url && tab?.id) {
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
      if (e.isMainFrame && e.url && tab?.id) {
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
      if (e.title && tab?.id) {
        onUpdateTab(tab.id, { title: e.title });
      }
    };

    const handleFaviconUpdate = (e: any) => {
      if (e.favicons && e.favicons.length > 0 && tab?.id) {
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
      if (tab?.id) {
        onUpdateTab(tab.id, { isLoading: false, title: 'Page Crashed' });
        console.error('[Webview] Crashed on tab:', tab.id, 'URL:', tab?.url);
      }
    };

    const handleRenderProcessGone = (e: any) => {
      if (tab?.id) {
        const reason = e?.details?.reason || e?.reason || 'crashed';
        onUpdateTab(tab.id, { isLoading: false, title: `Page Crashed (${reason})` });
        console.error('[Webview] Render process gone:', reason, 'Exit code:', e?.details?.exitCode || e?.exitCode);
      }
    };

    const handleFoundInPage = (e: any) => {
      if (e.result && onFoundInPage) {
        onFoundInPage(e.result.activeMatchOrdinal || 0, e.result.numberOfMatches || 0);
      }
    };

    const handleMediaStarted = () => {
      if (tab?.id) onUpdateTab(tab.id, { isPlayingAudio: true });
    };

    const handleMediaPaused = () => {
      if (tab?.id) onUpdateTab(tab.id, { isPlayingAudio: false });
    };

    const handlePasswordDetected = async (hostname: string, username: string, password: string) => {
      // Derive the hostname at EVENT time from the live webview. The captured
      // `tab?.url` closure goes stale after SPA navigations (this effect does
      // not depend on tab.url), which previously caused credentials to be
      // attributed to — and saved under — the wrong host.
      let actualHostname = '';
      try {
        const liveUrl = typeof webview.getURL === 'function' ? webview.getURL() : '';
        actualHostname = new URL(liveUrl || latestTabRef.current?.url || '').hostname;
      } catch (_) {}

      if (!(actualHostname && actualHostname === hostname && username && password)) return;

      const cleanUser = String(username).substring(0, 100);
      const cleanPass = String(password).substring(0, 500);

      let isUpdate = false;
      try {
        const raw = await (window as any).electronAPI?.secureStoreGet?.('passwords');
        if (raw) {
          const all = JSON.parse(raw);
          const existing = all.find((p: any) => p.hostname === actualHostname && p.username === cleanUser);
          if (existing) {
            if (existing.password === cleanPass) {
              return;
            }
            isUpdate = true;
          }
        }
      } catch (_) {}

      // Guard against races: while awaiting the secure store, this tab's
      // webview may have been closed or replaced. Don't surface a save prompt
      // for a dead context.
      const stillMounted = webviewRef.current === webview &&
        !(typeof webview.isDestroyed === 'function' && webview.isDestroyed());
      if (!stillMounted) return;

      setPasswordPrompt({
        isOpen: true,
        hostname: actualHostname,
        username: cleanUser,
        password: cleanPass,
        isUpdate
      });
    };

    const handleIpcMessage = (e: any) => {
      if (e.channel === 'password-form-submitted' && e.args?.[0]) {
        const { hostname, username, password } = e.args[0];
        handlePasswordDetected(hostname, username, password);
      }
    };

    const handleConsoleMessage = (e: any) => {
      if (e.message && e.message.startsWith('NOVA_SAVE_PW::')) {
        try {
          const data = JSON.parse(e.message.substring(14));
          if (data && data.hostname && data.username && data.password) {
            handlePasswordDetected(data.hostname, data.username, data.password);
          }
        } catch (_) {}
      }
      if (e.message && e.message.startsWith('NOVA_LINK_HOVER::')) {
        try {
          const data = JSON.parse(e.message.substring(17));
          if (typeof data.url === 'string' && (data.url.startsWith('http://') || data.url.startsWith('https://'))) {
            // Speed Booster: DNS prefetch and preconnect socket on hover
            if (latestSettingsRef.current?.preloadDnsEnabled !== false) {
              try {
                const origin = new URL(data.url).origin;
                if (origin && !origin.startsWith('null') && !dnsPrefetchedOrigins.has(origin)) {
                  dnsPrefetchedOrigins.add(origin);
                  const hint = document.createElement('link');
                  hint.rel = 'dns-prefetch';
                  hint.href = origin;
                  document.head.appendChild(hint);
                }
              } catch (_) {}
            }

            setAiPreview({
              isOpen: true,
              url: data.url,
              x: Number(data.x) || 0,
              y: Number(data.y) || 0
            });
          }
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
    webview.addEventListener('plugin-crashed', handleCrashed);
    webview.addEventListener('render-process-gone', handleRenderProcessGone);
    webview.addEventListener('found-in-page', handleFoundInPage);
    webview.addEventListener('media-started-playing', handleMediaStarted);
    webview.addEventListener('media-paused', handleMediaPaused);
    webview.addEventListener('ipc-message', handleIpcMessage);
    webview.addEventListener('console-message', handleConsoleMessage);

    // Initial check: if webview is already not loading, ensure isLoading is false
    const readyCheckTimer = setTimeout(() => {
      try {
        if (webview && typeof webview.isLoading === 'function' && !webview.isLoading() && tab?.id) {
          onUpdateTab(tab.id, { isLoading: false });
        }
      } catch (err) {}
    }, 500);

    return () => {
      clearTimeout(readyCheckTimer);
      isWebviewReady.current = false;
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
      webview.removeEventListener('plugin-crashed', handleCrashed);
      webview.removeEventListener('render-process-gone', handleRenderProcessGone);
      webview.removeEventListener('found-in-page', handleFoundInPage);
      webview.removeEventListener('media-started-playing', handleMediaStarted);
      webview.removeEventListener('media-paused', handleMediaPaused);
      webview.removeEventListener('ipc-message', handleIpcMessage);
      webview.removeEventListener('console-message', handleConsoleMessage);
    };
  }, [tab?.id, onUpdateTab, onNewTab, onFoundInPage, isNewTab]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (webview && webview.setAudioMuted) {
      try {
        webview.setAudioMuted(!!tab?.isMuted);
      } catch (err) {
        // webview might not be dom-ready yet
      }
    }
  }, [tab?.isMuted]);

  // Receive thumbnails pushed from the main process (via web-contents-created + did-stop-loading)
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.onTabThumbnailUpdate || isNewTab || !tab?.id) return;

    const unsubscribe = electronAPI.onTabThumbnailUpdate((_event: any, { webContentsId, dataUrl }: { webContentsId: number; dataUrl: string }) => {
      // Check if this thumbnail belongs to our webview
      const webview = webviewRef.current;
      try {
        const ourWcId = webview?.getWebContentsId?.();
        if (ourWcId && ourWcId === webContentsId && dataUrl && tab?.id) {
          tabThumbnailCache.set(tab.id, dataUrl);
        }
      } catch (_) {}
    });

    return () => { try { unsubscribe?.(); } catch (_) {} };
  }, [isNewTab, tab?.id]);

  // Capture thumbnail when switching away from this tab (stored in memory cache)
  useEffect(() => {
    if (!isActive && webviewRef.current && !isNewTab && tab?.id && (window as any).electronAPI?.captureTabThumbnail) {
      const capture = async () => {
        try {
          const wcId = webviewRef.current.getWebContentsId();
          const thumbnailDataUrl = await (window as any).electronAPI.captureTabThumbnail(wcId);
          if (thumbnailDataUrl && tab?.id) {
            tabThumbnailCache.set(tab.id, thumbnailDataUrl);
          }
        } catch (err) {}
      };
      capture();
    }
  }, [isActive, isNewTab, tab?.id]);

  // Immediately clear loading state for internal React pages since they don't use webview
  useEffect(() => {
    if ((isSettingsTab || isHistoryTab || isDownloadsTab || isNewTab) && tab?.isLoading && tab?.id) {
      onUpdateTab(tab.id, { isLoading: false });
    }
  }, [isSettingsTab, isHistoryTab, isDownloadsTab, isNewTab, tab?.isLoading, tab?.id, onUpdateTab]);

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
  }, [tab?.isSuspended]);

  useEffect(() => {
    if (!tab?.url || tab.url === lastLoadedUrl.current) return;
    lastLoadedUrl.current = tab.url;
    
    const wv = webviewRef.current as any;
    if (wv && wv.loadURL) {
      if (isWebviewReady.current) {
        wv.loadURL(tab.url).catch((err: any) => console.error('loadURL failed:', err));
      } else {
        // If the webview was just created but the user navigated immediately, wait for dom-ready before calling loadURL!
        const pendingLoad = () => {
          if (tab?.url) wv.loadURL(tab.url).catch((err: any) => console.error('loadURL failed (pending):', err));
          wv.removeEventListener('dom-ready', pendingLoad);
        };
        wv.addEventListener('dom-ready', pendingLoad);
        return () => {
          wv.removeEventListener('dom-ready', pendingLoad);
        };
      }
    }
  }, [tab?.url]);

  if (!tab) {
    return null;
  }

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
            This tab was suspended to save memory. Click to wake it up instantly.
          </p>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onUpdateTab(tab.id, { isSuspended: false, lastAccessed: Date.now() });
            }}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors shadow-lg shadow-indigo-600/30 flex items-center gap-2 group-hover:scale-105"
          >
            <Zap className="w-4 h-4" />
            Reload Tab
          </button>
        </div>
      </div>
    );
  }

  if (isNewTab) {
    return (
      <NewTabPage 
        isActive={isActive}
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
        showTasksWidget={settings.showTasksWidget}
        isIncognito={isIncognito}
        theme={settings.theme}
        energySaverMode={settings.energySaverMode}
      />
    );
  }

  if (isSettingsTab) {
    return (
      <React.Suspense fallback={<div className="w-full h-full bg-slate-900 flex items-center justify-center text-white/50">Loading Settings...</div>}>
        <SettingsPage
          url={tab.url}
          settings={settings}
          onUpdateSettings={onUpdateSettings || NOOP}
          onExportData={onExportData}
          onImportData={onImportData}
          onClearHistory={onClearHistory}
          onPurgeMemory={onPurgeMemory}
        />
      </React.Suspense>
    );
  }

  if (isHistoryTab) {
    return (
      <React.Suspense fallback={<div className="w-full h-full bg-slate-900 flex items-center justify-center text-white/50">Loading History...</div>}>
        <HistoryPage
          history={history}
          onNavigate={(url) => {
            onUpdateTab(tab.id, { url, isLoading: true });
            if (onNavigate) onNavigate(url);
          }}
          onClearHistory={onClearHistory || NOOP}
          onRemoveHistoryItem={onRemoveHistoryItem || NOOP}
        />
      </React.Suspense>
    );
  }

  if (isDownloadsTab) {
    return (
      <React.Suspense fallback={<div className="w-full h-full bg-slate-900 flex items-center justify-center text-white/50">Loading Downloads...</div>}>
        <DownloadsPage
          downloads={downloads}
          onClearDownloads={onClearDownloads || NOOP}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="w-full h-full relative bg-white dark:bg-slate-900 flex flex-col">
      {/* Top Progress Bar (GPU Composited scaleX) */}
      <AnimatePresence>
        {tab.isLoading && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ 
              opacity: 1, 
              scaleX: 0.85,
              transition: { 
                scaleX: { duration: 8, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.2 }
              } 
            }}
            exit={{ 
              opacity: 0, 
              scaleX: 1, 
              transition: { 
                scaleX: { duration: 0.25, ease: 'easeOut' },
                opacity: { duration: 0.3, delay: 0.15 }
              } 
            }}
            style={{ willChange: 'transform, opacity', transformOrigin: '0% 50%', boxShadow: '0 0 12px rgba(99, 102, 241, 0.7)' }}
            className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 z-50 shadow-lg"
          />
        )}
      </AnimatePresence>

      <div className="flex-1 w-full relative overflow-hidden">
        {/* Electron Webview Tag for Native Browser Experience */}
        {typeof window !== 'undefined' && (window as any).electronAPI && !(window as any).electronAPI.isWebMockup ? (
          <webview
            ref={webviewRef}
            data-tab-id={tab.id}
            partition={isIncognito ? 'incognito' : undefined}
            src={getSafeUrl(tab?.url)}
            className="w-full h-full border-none bg-white"
            allowpopups={"true" as any}
            useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
          />
        ) : (
          /* Web Demo Mode: Render rich simulated pages for mockups or fallback iframe cleanly */
          (() => {
            const isDarkTheme = settings.theme === 'dark' || (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
            
            if (tab.url?.includes('github.com')) {
              return (
                <div className={`w-full h-full p-6 overflow-auto font-mono text-xs select-text transition-colors ${
                  isDarkTheme ? 'bg-[#0d1117] text-white' : 'bg-white text-slate-800'
                }`}>
                  <div className={`flex items-center gap-2 pb-4 mb-4 border-b ${
                    isDarkTheme ? 'border-white/10 text-white/90' : 'border-slate-200 text-slate-900'
                  }`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                      isDarkTheme ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                    }`}>
                      <Folder className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-sm">unitybtw / nova-browser</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-sans ml-2 ${
                      isDarkTheme ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                    }`}>Public</span>
                    <span className={`ml-auto text-xs font-sans ${isDarkTheme ? 'text-white/50' : 'text-slate-400'}`}>TypeScript • 98.4%</span>
                  </div>
                  <div className={`p-4 rounded-xl border space-y-2 leading-relaxed ${
                    isDarkTheme ? 'bg-[#161b22] border-white/10 text-white/80' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div className={`text-[11px] pb-2 border-b flex items-center justify-between ${
                      isDarkTheme ? 'text-white/40 border-white/5' : 'text-slate-400 border-slate-200'
                    }`}>
                      <span>electron / mcpServer.ts</span>
                      <span>64 lines • 2.1 KB</span>
                    </div>
                    <p><span className="text-purple-500 font-semibold">import</span> &#123; <span className="text-amber-500">Server</span> &#125; <span className="text-purple-500 font-semibold">from</span> <span className="text-emerald-500">'@modelcontextprotocol/sdk'</span>;</p>
                    <p><span className="text-purple-500 font-semibold">export class</span> <span className="text-amber-500 font-semibold">BrowserMCPServer</span> &#123;</p>
                    <p className="pl-4"><span className="text-purple-500 font-semibold">private</span> port = <span className="text-emerald-500">3020</span>;</p>
                    <p className="pl-4 pt-1"><span className="text-purple-500 font-semibold">async</span> <span className="text-blue-500">executeAutonomousAction</span>(command: <span className="text-amber-500">string</span>) &#123;</p>
                    <p className="pl-8 text-emerald-600 dark:text-emerald-400">// Direct AI browser control bridge with sandboxed WebGPU execution</p>
                    <p className="pl-8"><span className="text-purple-500 font-semibold">return await</span> this.mainWindow.webContents.executeJavaScript(command);</p>
                    <p className="pl-4">&#125;</p>
                    <p>&#125;</p>
                  </div>
                </div>
              );
            }

            if (tab.url?.includes('techinsider.io')) {
              return (
                <div className={`w-full h-full p-8 overflow-auto select-none transition-colors ${
                  isDarkTheme ? 'bg-[#0a0e1a] text-white' : 'bg-slate-50 text-slate-800'
                }`}>
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="space-y-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        isDarkTheme ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        AI & Privacy Revolution
                      </span>
                      <h1 className={`text-2xl font-bold tracking-tight pt-2 ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                        Next-Gen Browsers: Running LLMs 100% Locally with Zero Cloud Latency
                      </h1>
                      <p className={`text-xs ${isDarkTheme ? 'text-white/50' : 'text-slate-400'}`}>By Elena Vance • Published Oct 2026 • 4 min read</p>
                    </div>

                    <div className={`w-full h-24 rounded-2xl border border-dashed flex items-center justify-center gap-3 text-xs font-medium ${
                      isDarkTheme ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400' : 'border-emerald-400 bg-emerald-50/80 text-emerald-800'
                    }`}>
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <Shield className="w-4 h-4" />
                      </div>
                      <span>Targeted Ad Banner Blocked by Nova Privacy Shield (3 Trackers Stopped)</span>
                    </div>

                    <div className={`space-y-3 text-xs leading-relaxed ${isDarkTheme ? 'text-white/70' : 'text-slate-600'}`}>
                      <p>
                        Local AI models powered by WebGPU transform how users navigate the web. Unlike traditional browsers that upload your personal browsing history to third-party servers, Nova executes all inference directly on local silicon.
                      </p>
                      <p>
                        By preventing telemetry and fingerprinting at the engine level, pages render up to 64% faster with zero data leakage.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            if (tab.url?.includes('react.dev')) {
              return (
                <div className={`w-full h-full p-8 overflow-auto select-none transition-colors ${
                  isDarkTheme ? 'bg-[#16181d] text-white' : 'bg-white text-slate-800'
                }`}>
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className={`flex items-center gap-3 pb-4 border-b ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
                        <Code2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className={`text-lg font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>React 19 Documentation</h2>
                        <p className={`text-xs ${isDarkTheme ? 'text-white/50' : 'text-slate-400'}`}>Server Components & Actions Architecture</p>
                      </div>
                      <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">v19.0.0</span>
                    </div>

                    <div className={`space-y-3 text-xs leading-relaxed ${isDarkTheme ? 'text-white/80' : 'text-slate-700'}`}>
                      <p>
                        React 19 introduces automatic action transitions, async data primitives, and first-class compiler optimizations that optimize rendering cycles.
                      </p>
                      <div className={`p-4 rounded-xl border font-mono text-[11px] space-y-1 ${
                        isDarkTheme ? 'bg-black/40 border-white/10 text-cyan-300/90' : 'bg-slate-50 border-slate-200 text-cyan-800'
                      }`}>
                        <p className={isDarkTheme ? 'text-white/40' : 'text-slate-400'}>// Example: Async Action Transition</p>
                        <p><span className="text-purple-500 font-semibold">const</span> [isPending, startTransition] = <span className="text-blue-500">useTransition</span>();</p>
                        <p><span className="text-purple-500 font-semibold">const</span> [state, formAction] = <span className="text-blue-500">useActionState</span>(updateItem, null);</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (tab.url?.includes('tailwindcss.com')) {
              return (
                <div className={`w-full h-full p-8 overflow-auto select-none transition-colors ${
                  isDarkTheme ? 'bg-[#0b1120] text-white' : 'bg-slate-50 text-slate-800'
                }`}>
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className={`flex items-center gap-3 pb-4 border-b ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
                      <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm">
                        <Palette className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className={`text-lg font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Tailwind CSS v4 Oxide Engine</h2>
                        <p className={`text-xs ${isDarkTheme ? 'text-white/50' : 'text-slate-400'}`}>High Performance Unified CSS Engine</p>
                      </div>
                      <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">v4.0</span>
                    </div>

                    <div className={`space-y-3 text-xs leading-relaxed ${isDarkTheme ? 'text-white/80' : 'text-slate-700'}`}>
                      <p>
                        Tailwind CSS v4 is rewritten in Rust from the ground up, delivering 10x faster compile times with zero-configuration CSS imports.
                      </p>
                      <div className={`p-4 rounded-xl border font-mono text-[11px] space-y-1 ${
                        isDarkTheme ? 'bg-black/40 border-white/10 text-sky-300/90' : 'bg-white border-slate-200 text-sky-800 shadow-xs'
                      }`}>
                        <p className={isDarkTheme ? 'text-white/40' : 'text-slate-400'}>/* app.css */</p>
                        <p><span className="text-purple-500 font-semibold">@import</span> <span className="text-emerald-500">"tailwindcss"</span>;</p>
                        <p><span className="text-purple-500 font-semibold">@theme</span> &#123; <span className="text-blue-500">--color-brand</span>: <span className="text-amber-500">#6366f1</span>; &#125;</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <iframe
                ref={webviewRef as any}
                data-tab-id={tab.id}
                src={getSafeUrl(tab?.url)}
                className="w-full h-full border-none bg-white"
                title={tab.title}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                onLoad={() => {
                  if (tab.isLoading) {
                    onUpdateTab(tab.id, { isLoading: false });
                  }
                }}
              />
            );
          })()
        )}
      </div>

      <PasswordPromptModal
        isOpen={passwordPrompt.isOpen}
        hostname={passwordPrompt.hostname}
        username={passwordPrompt.username}
        password={passwordPrompt.password}
        isUpdate={passwordPrompt.isUpdate}
        onClose={() => setPasswordPrompt((prev: any) => ({ ...prev, isOpen: false }))}
        onSave={async (customUsername?: string, customPassword?: string) => {
          const finalUsername = customUsername || passwordPrompt.username;
          const finalPassword = customPassword || passwordPrompt.password;
          try {
            const raw = await (window as any).electronAPI?.secureStoreGet?.('passwords');
            let passwords = raw ? JSON.parse(raw) : [];
            
            // Remove existing password for this host & username if any
            passwords = passwords.filter((p: any) => !(p.hostname === passwordPrompt.hostname && p.username === finalUsername));
            
            passwords.push({
              hostname: passwordPrompt.hostname,
              username: finalUsername,
              password: finalPassword,
              timestamp: Date.now()
            });
            
            await (window as any).electronAPI?.secureStoreSet?.('passwords', JSON.stringify(passwords));
          } catch (e) {
            console.error('Failed to save password', e);
          }
          setPasswordPrompt((prev: any) => ({ ...prev, isOpen: false }))
        }}
      />
      
      {(settings.aiLinkPreviewEnabled ?? true) && (
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
  if (prevProps.isIncognito !== nextProps.isIncognito) return false;
  if (prevProps.privacyShield !== nextProps.privacyShield) return false;
  if (prevProps.searchEngine !== nextProps.searchEngine) return false;
  if (prevProps.newTabBackground !== nextProps.newTabBackground) return false;

  // Tab properties comparison
  if (prevProps.tab?.id !== nextProps.tab?.id) return false;
  if (prevProps.tab?.url !== nextProps.tab?.url) return false;
  if (prevProps.tab?.title !== nextProps.tab?.title) return false;
  if (prevProps.tab?.favicon !== nextProps.tab?.favicon) return false;
  if (prevProps.tab?.isLoading !== nextProps.tab?.isLoading) return false;
  if (prevProps.tab?.canGoBack !== nextProps.tab?.canGoBack) return false;
  if (prevProps.tab?.canGoForward !== nextProps.tab?.canGoForward) return false;
  if (prevProps.tab?.isMuted !== nextProps.tab?.isMuted) return false;
  if (prevProps.tab?.isPinned !== nextProps.tab?.isPinned) return false;
  if (prevProps.tab?.isIncognito !== nextProps.tab?.isIncognito) return false;
  if (prevProps.tab?.thumbnail !== nextProps.tab?.thumbnail) return false;
  if (prevProps.tab?.zoomFactor !== nextProps.tab?.zoomFactor) return false;
  if (prevProps.tab?.isPlayingAudio !== nextProps.tab?.isPlayingAudio) return false;
  if (prevProps.tab?.blockedAdsCount !== nextProps.tab?.blockedAdsCount) return false;
  if (prevProps.tab?.webContentsId !== nextProps.tab?.webContentsId) return false;
  if (prevProps.tab?.isSuspended !== nextProps.tab?.isSuspended) return false;

  // Settings comparison
  if (prevProps.settings?.searchEngine !== nextProps.settings?.searchEngine) return false;
  if (prevProps.settings?.newTabBackground !== nextProps.settings?.newTabBackground) return false;
  if (prevProps.settings?.backgroundCustomUrl !== nextProps.settings?.backgroundCustomUrl) return false;
  if (prevProps.settings?.aiLinkPreviewEnabled !== nextProps.settings?.aiLinkPreviewEnabled) return false;
  if (prevProps.settings?.privacyShield !== nextProps.settings?.privacyShield) return false;
  if (prevProps.settings?.theme !== nextProps.settings?.theme) return false;
  if (prevProps.settings?.showTasksWidget !== nextProps.settings?.showTasksWidget) return false;
  if (prevProps.settings?.energySaverMode !== nextProps.settings?.energySaverMode) return false;
  if (prevProps.settings?.preloadDnsEnabled !== nextProps.settings?.preloadDnsEnabled) return false;
  if (prevProps.settings?.smoothScrollingEnabled !== nextProps.settings?.smoothScrollingEnabled) return false;

  // Deep comparison for settings object changes that affect internal pages
  if ((prevProps.tab?.url?.startsWith('nova://settings') || prevProps.tab?.url?.startsWith('about:settings')) && prevProps.settings !== nextProps.settings) return false;
  if ((prevProps.tab?.url?.startsWith('nova://history') || prevProps.tab?.url?.startsWith('about:history')) && prevProps.history !== nextProps.history) return false;
  if ((prevProps.tab?.url?.startsWith('nova://downloads') || prevProps.tab?.url?.startsWith('about:downloads')) && prevProps.downloads !== nextProps.downloads) return false;

  return true;
});
