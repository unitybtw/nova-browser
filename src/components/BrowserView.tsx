import React, { useRef, useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Zap, Key } from 'lucide-react';
import { Tab, HistoryItem, UserSettings } from '../types/browser';
import { NewTabPage } from './NewTabPage';
import { PasswordPromptModal } from './PasswordPromptModal';
import type { DownloadItemPage } from './DownloadsPage';
import { AILinkPreview } from './AILinkPreview';
import { tabThumbnailCache } from '../services/thumbnailCache';
import { 
  getExtractTextNodesScript, 
  getApplyTranslationScript, 
  getRestoreOriginalScript 
} from '../services/translationService';
import { isSafeNavigationUrl } from '../utils/safeNavigation';

const SettingsPage = lazy(() => import('./SettingsPage').then(m => ({ default: m.SettingsPage })));
const HistoryPage = lazy(() => import('./HistoryPage').then(m => ({ default: m.HistoryPage })));
const DownloadsPage = lazy(() => import('./DownloadsPage').then(m => ({ default: m.DownloadsPage })));

const NOOP = () => {};

// Origins already hinted via <link rel="preconnect">. LRU bounded to max 50 entries
// so document.head does not accumulate unbounded link DOM nodes over long sessions.
const MAX_PRECONNECT_HINTS = 50;
const preconnectedOrigins = new Set<string>();
const preconnectLinkElements: HTMLLinkElement[] = [];

function addPreconnectHint(origin: string) {
  if (!origin || origin.startsWith('null') || preconnectedOrigins.has(origin)) return;
  if (preconnectedOrigins.size >= MAX_PRECONNECT_HINTS) {
    const oldestOrigin = preconnectedOrigins.values().next().value;
    if (oldestOrigin) {
      preconnectedOrigins.delete(oldestOrigin);
      const oldestNode = preconnectLinkElements.shift();
      oldestNode?.remove();
    }
  }
  preconnectedOrigins.add(origin);
  const hint = document.createElement('link');
  hint.rel = 'preconnect';
  hint.href = origin;
  hint.crossOrigin = 'anonymous';
  document.head.appendChild(hint);
  preconnectLinkElements.push(hint);
}

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
  disableTasksWidget?: boolean;
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
  disableTasksWidget = false,
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

  const getSafeUrl = (u?: string) => {
    if (!u || u.startsWith('nova://')) return 'about:blank';
    return isSafeNavigationUrl(u) ? u : 'about:blank';
  };
  const initialUrlRef = useRef<string>(getSafeUrl(tab?.url));
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

  const [autofillMenu, setAutofillMenu] = useState<{
    isOpen: boolean;
    rect: { left: number; top: number; bottom: number; right: number; width: number; height: number };
    accounts: Array<{ username: string; password: string }>;
    hostname: string;
  } | null>(null);

  const handleSelectAutofill = useCallback((account: { username: string; password: string }) => {
    const webview = webviewRef.current;
    if (webview && !(typeof webview.isDestroyed === 'function' && webview.isDestroyed())) {
      try {
        webview.send('fill-credentials', { username: account.username, password: account.password });
      } catch (_) {}
    }
    setAutofillMenu(null);
  }, []);
  
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
  const latestIsActiveRef = useRef(isActive);
  latestIsActiveRef.current = isActive;

  useEffect(() => {
    latestTabRef.current = tab;
  }, [tab]);


  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || !tab?.id || tab.isSuspended) return;

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

      // Mute state must always be applied, regardless of feature gates
      if (webview.setAudioMuted) webview.setAudioMuted(!!tab?.isMuted);

      // 4. Ensure current URL is synchronized on DOM ready
      try {
        const currentUrl = typeof webview.getURL === 'function' ? webview.getURL() : '';
        if (currentUrl && currentUrl !== 'about:blank' && tab?.id && currentUrl !== latestTabRef.current?.url) {
          lastLoadedUrl.current = currentUrl;
          onUpdateTab(tab.id, {
            url: currentUrl,
            canGoBack: webview.canGoBack?.() || false,
            canGoForward: webview.canGoForward?.() || false
          });
        }
      } catch (_) {}
    };

    const handleStartNavigation = (e: any) => {
      if (tab?.id) {
        const isMain = e?.isMainFrame !== false;
        if (isMain) {
          const targetUrl = e?.url || (typeof webview.getURL === 'function' ? webview.getURL() : '');
          const currentBlockedAds = latestTabRef.current?.blockedAdsCount || 0;
          const updates: Partial<Tab> = { 
            isLoading: true,
            isTranslated: false,
            translatedLang: undefined
          };
          if (targetUrl && targetUrl !== 'about:blank') {
            lastLoadedUrl.current = targetUrl;
            updates.url = targetUrl;
          }
          if (currentBlockedAds) {
            updates.blockedAdsCount = 0;
          }
          onUpdateTab(tab.id, updates);
        }
      }
    };

    const isSafeWebviewUrl = (candidate: unknown): candidate is string =>
      typeof candidate === 'string' && isSafeNavigationUrl(candidate);

    const handleWillNavigate = (e: any) => {
      if (e?.isMainFrame === false || !isSafeWebviewUrl(e?.url) || !tab?.id) return;
      lastLoadedUrl.current = e.url;
      onUpdateTab(tab.id, {
        url: e.url,
        isLoading: true
      });
    };

    const handleRedirectNavigation = (e: any) => {
      if (e?.isMainFrame === false || !isSafeWebviewUrl(e?.url) || !tab?.id) return;
      lastLoadedUrl.current = e.url;
      onUpdateTab(tab.id, { url: e.url });
    };

    const handleLoadCommit = (e: any) => {
      if (e?.isMainFrame === false || !isSafeWebviewUrl(e?.url) || !tab?.id) return;
      lastLoadedUrl.current = e.url;
      onUpdateTab(tab.id, { url: e.url });
    };

    const syncSafeCurrentUrl = (updates: Partial<Tab>) => {
      let currentUrl = '';
      try {
        currentUrl = typeof webview.getURL === 'function' ? webview.getURL() : '';
      } catch (_) {}
      if (isSafeWebviewUrl(currentUrl) && currentUrl !== 'about:blank') {
        lastLoadedUrl.current = currentUrl;
        updates.url = currentUrl;
      }
      return updates;
    };

    const handleFinishLoad = (e: any) => {
      if (tab?.id && e?.isMainFrame !== false) {
        const updates = syncSafeCurrentUrl({
          isLoading: false,
          canGoBack: webview.canGoBack?.() || false,
          canGoForward: webview.canGoForward?.() || false,
          title: webview.getTitle?.() || latestTabRef.current?.title || latestTabRef.current?.url || ''
        });
        onUpdateTab(tab.id, updates);
      }
    };

    const handleStopLoading = () => {
      if (tab?.id) {
        const updates = syncSafeCurrentUrl({
          isLoading: false,
          canGoBack: webview.canGoBack?.() || false,
          canGoForward: webview.canGoForward?.() || false,
          title: webview.getTitle?.() || latestTabRef.current?.title || latestTabRef.current?.url || ''
        });
        onUpdateTab(tab.id, updates);
      }
    };

    const handleFailLoad = (e: any) => {
      if (e.errorCode === -3) return;
      if (e.isMainFrame === false || !tab?.id) return;
      onUpdateTab(tab.id, { isLoading: false, title: `Error: ${e.errorDescription || 'Failed'}` });
      console.error('[Webview] Failed to load:', e.errorDescription, 'Code:', e.errorCode);
    };

    const handleNavigateEvent = (e: any) => {
      let targetUrl = e?.url;
      if (!targetUrl && typeof webview.getURL === 'function') {
        try { targetUrl = webview.getURL(); } catch (_) {}
      }
      if (e?.isMainFrame === false || !isSafeWebviewUrl(targetUrl) || !tab?.id) return;
      lastLoadedUrl.current = targetUrl;
      onUpdateTab(tab.id, {
        url: targetUrl,
        isLoading: false,
        canGoBack: webview.canGoBack?.() || false,
        canGoForward: webview.canGoForward?.() || false
      });
    };

    const handleNavigateInPage = (e: any) => {
      let targetUrl = e?.url;
      if (!targetUrl && typeof webview.getURL === 'function') {
        try { targetUrl = webview.getURL(); } catch (_) {}
      }
      if (e?.isMainFrame === false || !isSafeWebviewUrl(targetUrl) || !tab?.id) return;
      lastLoadedUrl.current = targetUrl;
      onUpdateTab(tab.id, {
        url: targetUrl,
        isLoading: false,
        canGoBack: webview.canGoBack?.() || false,
        canGoForward: webview.canGoForward?.() || false
      });
    };

    const handleTitleUpdate = (e: any) => {
      if (e.title && tab?.id) {
        onUpdateTab(tab.id, { title: e.title });
      }
    };

    const handleFaviconUpdate = (e: any) => {
      if (e.favicons && e.favicons.length > 0 && tab?.id) {
        // Security: only allow https:// favicons or safe data:image/ URIs.
        // Reject javascript:, data:text/, vbscript:, file: and other dangerous sources.
        const raw = e.favicons[0] as string;
        const isSafe =
          (typeof raw === 'string') &&
          (raw.startsWith('https://') ||
            raw.startsWith('http://localhost') ||
            raw.startsWith('http://127.0.0.1') ||
            /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,/.test(raw));
        if (isSafe) {
          onUpdateTab(tab.id, { favicon: raw });
        }
      }
    };

    const handleNewWindow = (e: any) => {
      if (e.url) {
        // Security: only allow safe HTTP/HTTPS URLs from new-window events.
        // Reject javascript:, data:, vbscript:, file: and other dangerous protocols.
        try {
          const parsed = new URL(e.url);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
        } catch {
          return;
        }
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
      if (!latestSettingsRef.current?.passwordManagerEnabled) return;

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
      } else if (e.channel === 'login-field-focused' && e.args?.[0]) {
        if (!latestSettingsRef.current?.passwordManagerEnabled) return;
        const data = e.args[0];
        const hostname = data.hostname || '';
        if (!hostname) return;
        (window as any).electronAPI?.secureStoreGet?.('passwords').then((raw: string) => {
          if (!raw) return;
          try {
            const all = JSON.parse(raw);
            const matching = all.filter((p: any) => p.hostname === hostname && p.username && p.password);
            if (matching.length > 0) {
              setAutofillMenu({
                isOpen: true,
                rect: data.rect,
                accounts: matching,
                hostname
              });
            }
          } catch (_) {}
        }).catch(() => {});
      } else if (e.channel === 'login-field-blurred') {
        setTimeout(() => {
          setAutofillMenu(prev => (prev?.isOpen ? { ...prev, isOpen: false } : null));
        }, 300);
      } else if (e.channel === 'nova-link-hover' && e.args?.[0]) {
        if (latestSettingsRef.current?.aiLinkPreviewEnabled === false || !latestIsActiveRef.current) return;
        const data = e.args[0];
        if (typeof data.url === 'string' && data.url.startsWith('https://')) {
          if (latestSettingsRef.current?.preloadDnsEnabled !== false) {
            try {
              const origin = new URL(data.url).origin;
              if (origin && !origin.startsWith('null')) {
                addPreconnectHint(origin);
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
      } else if (e.channel === 'nova-link-hover-out') {
        setAiPreview(prev => (prev.isOpen ? { ...prev, isOpen: false } : prev));
      }
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('will-navigate', handleWillNavigate);
    webview.addEventListener('did-start-navigation', handleStartNavigation);
    webview.addEventListener('did-redirect-navigation', handleRedirectNavigation);
    webview.addEventListener('load-commit', handleLoadCommit);
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
      webview.removeEventListener('will-navigate', handleWillNavigate);
      webview.removeEventListener('did-start-navigation', handleStartNavigation);
      webview.removeEventListener('did-redirect-navigation', handleRedirectNavigation);
      webview.removeEventListener('load-commit', handleLoadCommit);
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
    };
  }, [tab?.id, tab?.isSuspended, onUpdateTab, onNewTab, onFoundInPage, isNewTab]);

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

  // Capture thumbnail when switching away from this tab (stored in memory cache).
  const activeSinceRef = useRef(0);
  const lastThumbnailCaptureAtRef = useRef(0);
  useEffect(() => {
    if (isActive) {
      activeSinceRef.current = Date.now();
      return;
    }
    const MIN_ACTIVE_MS_BEFORE_CAPTURE = 600;
    const THUMBNAIL_CAPTURE_THROTTLE_MS = 2500;
    const now = Date.now();
    const wasContinuouslyActive =
      activeSinceRef.current > 0 &&
      now - activeSinceRef.current >= MIN_ACTIVE_MS_BEFORE_CAPTURE;
    const canCapture = now - lastThumbnailCaptureAtRef.current >= THUMBNAIL_CAPTURE_THROTTLE_MS;
    if (wasContinuouslyActive && canCapture && webviewRef.current && !isNewTab && tab?.id && (window as any).electronAPI?.captureTabThumbnail) {
      lastThumbnailCaptureAtRef.current = now;
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
    if (!tab?.url || isNewTab || isSettingsTab || isHistoryTab || isDownloadsTab) return;
    
    const targetUrl = tab.url;
    const wv = webviewRef.current as any;
    if (!wv) return;

    // Check if the webview is already at this URL to prevent duplicate navigation/refresh
    try {
      const currentWvUrl = wv.getURL?.();
      if (currentWvUrl && (currentWvUrl === targetUrl || currentWvUrl.replace(/\/$/, '') === targetUrl.replace(/\/$/, ''))) {
        lastLoadedUrl.current = targetUrl;
        return;
      }
    } catch (e) {}

    lastLoadedUrl.current = targetUrl;
    
    if (isWebviewReady.current && typeof wv.loadURL === 'function') {
      wv.loadURL(targetUrl).catch((err: any) => {
        if (err?.code !== 'ERR_ABORTED') console.error('loadURL failed:', err);
      });
    } else {
      const pendingLoad = () => {
        wv.removeEventListener('dom-ready', pendingLoad);
        try {
          const currentWvUrl = wv.getURL?.();
          if (currentWvUrl && (currentWvUrl === targetUrl || currentWvUrl.replace(/\/$/, '') === targetUrl.replace(/\/$/, ''))) {
            return;
          }
        } catch (e) {}
        if (typeof wv.loadURL === 'function') {
          wv.loadURL(targetUrl).catch(() => {});
        }
      };
      wv.addEventListener('dom-ready', pendingLoad);
      return () => {
        wv.removeEventListener('dom-ready', pendingLoad);
      };
    }
  }, [tab?.url, isNewTab, isSettingsTab, isHistoryTab, isDownloadsTab]);

  // Handle Page Translation & Restore events
  useEffect(() => {
    const handleTranslateTabEvent = async (e: any) => {
      const detail = e.detail;
      if (detail?.tabId === tab?.id && webviewRef.current) {
        const webview = webviewRef.current;
        try {
          // 1. Extract text nodes
          const extractScript = getExtractTextNodesScript();
          const extractResult = await webview.executeJavaScript(extractScript);
          
          if (extractResult && extractResult.success && Array.isArray(extractResult.texts) && extractResult.texts.length > 0) {
            // 2. Translate via IPC batch
            const targetLang = detail.targetLang || 'tr';
            const sourceLang = detail.sourceLang || 'auto';
            
            if (typeof (window as any).electronAPI?.translateTextBatch === 'function') {
              const response = await (window as any).electronAPI.translateTextBatch(extractResult.texts, sourceLang, targetLang);
              
              if (response && Array.isArray(response.translations) && response.translations.length > 0) {
                // 3. Apply translations
                const applyScript = getApplyTranslationScript(response.translations, targetLang);
                await webview.executeJavaScript(applyScript);
                if (tab?.id) {
                  onUpdateTab(tab.id, { isTranslated: true, translatedLang: targetLang });
                }
                window.dispatchEvent(new CustomEvent('nova:translate-tab-done', { detail: { tabId: tab?.id, success: true } }));
                return;
              }
            }
          }
          window.dispatchEvent(new CustomEvent('nova:translate-tab-done', { detail: { tabId: tab?.id, success: false, error: 'Could not extract or translate page content' } }));
        } catch (err: any) {
          console.error('[BrowserView] Translation execution failed:', err);
          window.dispatchEvent(new CustomEvent('nova:translate-tab-done', { detail: { tabId: tab?.id, success: false, error: err.message || 'Translation failed' } }));
        }
      }
    };

    const handleRestoreTabEvent = async (e: any) => {
      const detail = e.detail;
      if (detail?.tabId === tab?.id && webviewRef.current) {
        try {
          const restoreScript = getRestoreOriginalScript();
          await webviewRef.current.executeJavaScript(restoreScript);
          if (tab?.id) {
            onUpdateTab(tab.id, { isTranslated: false, translatedLang: undefined });
          }
          window.dispatchEvent(new CustomEvent('nova:translate-tab-done', { detail: { tabId: tab?.id, success: true } }));
        } catch (err) {
          console.error('[BrowserView] Restore original failed:', err);
          window.dispatchEvent(new CustomEvent('nova:translate-tab-done', { detail: { tabId: tab?.id, success: false } }));
        }
      }
    };

    window.addEventListener('nova:translate-tab', handleTranslateTabEvent);
    window.addEventListener('nova:restore-tab', handleRestoreTabEvent);

    return () => {
      window.removeEventListener('nova:translate-tab', handleTranslateTabEvent);
      window.removeEventListener('nova:restore-tab', handleRestoreTabEvent);
    };
  }, [tab?.id, onUpdateTab]);

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
        showTasksWidget={disableTasksWidget ? false : settings.showTasksWidget}
        isIncognito={isIncognito}
        theme={settings.theme}
        energySaverMode={settings.energySaverMode}
      />
    );
  }

  if (isSettingsTab) {
    return (
      <Suspense fallback={<div className="w-full h-full bg-white dark:bg-slate-900" />}>
        <SettingsPage
          url={tab.url}
          settings={settings}
          onUpdateSettings={onUpdateSettings || NOOP}
          onExportData={onExportData}
          onImportData={onImportData}
          onClearHistory={onClearHistory}
          onPurgeMemory={onPurgeMemory}
        />
      </Suspense>
    );
  }

  if (isHistoryTab) {
    return (
      <Suspense fallback={<div className="w-full h-full bg-white dark:bg-slate-900" />}>
        <HistoryPage
          history={history}
          onNavigate={(url) => {
            onUpdateTab(tab.id, { url, isLoading: true });
            if (onNavigate) onNavigate(url);
          }}
          onClearHistory={onClearHistory || NOOP}
          onRemoveHistoryItem={onRemoveHistoryItem || NOOP}
        />
      </Suspense>
    );
  }

  if (isDownloadsTab) {
    return (
      <Suspense fallback={<div className="w-full h-full bg-white dark:bg-slate-900" />}>
        <DownloadsPage
          downloads={downloads}
          onClearDownloads={onClearDownloads || NOOP}
        />
      </Suspense>
    );
  }

  return (
    <div className="w-full h-full relative bg-white dark:bg-slate-900 flex flex-col">
      {/* Top Progress Bar (GPU Composited scaleX - Ultra Fast Responsive Feedback) */}
      <AnimatePresence>
        {tab.isLoading && (
          <motion.div
            initial={{ opacity: 1, scaleX: 0.15 }}
            animate={{ 
              scaleX: [0.15, 0.75, 0.94],
              transition: { 
                duration: 1.0,
                ease: [0.22, 1, 0.36, 1],
                times: [0, 0.35, 1]
              } 
            }}
            exit={{ 
              scaleX: 1, 
              opacity: 0,
              transition: { 
                scaleX: { duration: 0.12, ease: 'easeOut' },
                opacity: { duration: 0.15, delay: 0.05 }
              } 
            }}
            style={{ willChange: 'transform, opacity', transformOrigin: '0% 50%', boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)' }}
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 z-50 shadow-md"
          />
        )}
      </AnimatePresence>

      <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col min-h-0">
        {/* Electron Webview Tag for Native Browser Experience */}
        {typeof window !== 'undefined' && (window as any).electronAPI && !(window as any).electronAPI.isWebMockup ? (
          <webview
            ref={webviewRef}
            data-tab-id={tab.id}
            partition={isIncognito ? 'incognito' : undefined}
            src={getSafeUrl(tab.url)}
            className="w-full h-full flex-1 border-none bg-white absolute inset-0"
            allowpopups={"true" as any}
          />
        ) : (
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
        )}
      </div>

      {autofillMenu?.isOpen && autofillMenu.accounts.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: Math.max(16, Math.min(autofillMenu.rect?.left || 20, (typeof window !== 'undefined' ? window.innerWidth : 800) - 280)),
            top: Math.min((autofillMenu.rect?.bottom || 100) + 6, (typeof window !== 'undefined' ? window.innerHeight : 600) - 200),
            zIndex: 9999
          }}
          className="w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden select-none text-xs"
        >
          <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-blue-400" />
              Saved Accounts ({autofillMenu.accounts.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono truncate max-w-[100px]">{autofillMenu.hostname}</span>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60 p-1">
            {autofillMenu.accounts.map((acc, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectAutofill(acc);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-600/20 hover:text-blue-300 text-slate-200 transition-colors flex flex-col gap-0.5"
              >
                <span className="font-medium text-slate-100">{acc.username || 'Unnamed Account'}</span>
                <span className="text-[10px] text-slate-400">Click to fill password</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
  if (prevProps.disableTasksWidget !== nextProps.disableTasksWidget) return false;

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
  if (prevProps.tab?.isTranslated !== nextProps.tab?.isTranslated) return false;

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
