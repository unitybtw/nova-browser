import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Star,
  BookOpen,
  Lock,
  Unlock,
  ShieldAlert,
  HelpCircle,
  Settings,
  Clock,
  Download,
  Globe,
  Languages,
  VenetianMask
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tab, Bookmark, UserSettings, PermissionRequest } from '../../types/browser';
import { formatSearchUrl, getSearchEngineName, isValidUrlOrDomain } from '../../utils/searchEngine';
import { getLanguage, getLocale } from '../../services/i18n';
import { getUrlSecurityInfo } from '../../utils/securityUtils';
import { SiteInfoPopover } from '../SiteInfoPopover';
import { PermissionPromptPopover } from '../PermissionPromptPopover';
import { PageTranslatePopover } from '../PageTranslatePopover';
import { getClientCachedSuggestions, setClientCachedSuggestions } from '../../utils/suggestionCache';
import { getElectronAPI } from '../../utils/electronBridge';
import { logger } from '../../utils/logger';

export interface OmniboxBarProps {
  activeTab?: Tab;
  isIncognito?: boolean;
  searchEngine: UserSettings['searchEngine'];
  bookmarks: Bookmark[];
  useVerticalTabs?: boolean;
  onNavigate: (url: string) => void;
  onToggleReaderMode?: () => void;
  onToggleBookmark?: (targetTab?: Tab) => void;
  onResetZoom?: () => void;
  isBookmarked: boolean;
  permissionRequests?: PermissionRequest[];
  onRespondPermission?: (requestId: string, allow: boolean, remember: boolean) => void;
  onDismissPermission?: (requestId: string) => void;
}

export const OmniboxBar: React.FC<OmniboxBarProps> = React.memo(({
  activeTab,
  isIncognito,
  searchEngine,
  bookmarks,
  useVerticalTabs,
  onNavigate,
  onToggleReaderMode,
  onToggleBookmark,
  onResetZoom,
  isBookmarked,
  permissionRequests,
  onRespondPermission,
  onDismissPermission,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSiteInfoOpen, setIsSiteInfoOpen] = useState(false);
  const siteInfoBtnRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const suggestionRequestIdRef = useRef<number>(0);
  const blurTimerRef = useRef<NodeJS.Timeout | null>(null);

  const relevantPermissionRequests = useMemo(() => {
    if (!permissionRequests || permissionRequests.length === 0) return [];
    let currentOrigin = '';
    try {
      currentOrigin = activeTab?.url ? new URL(activeTab.url).origin : '';
    } catch {
      currentOrigin = activeTab?.url || '';
    }
    return permissionRequests.filter(req => {
      let reqOrigin = '';
      try {
        reqOrigin = new URL(req.url || req.origin).origin;
      } catch {
        reqOrigin = req.origin || req.url;
      }
      const isAppOrigin = req.origin === 'app' ||
                          reqOrigin === 'app' ||
                          reqOrigin === 'http://localhost:5173' ||
                          req.url?.startsWith('file:') ||
                          req.url?.startsWith('nova:');
      return isAppOrigin || reqOrigin === currentOrigin || (req.webContentsId && req.webContentsId === activeTab?.webContentsId);
    });
  }, [permissionRequests, activeTab?.url, activeTab?.webContentsId]);

  // Memoized search-matched bookmarks: avoids full array filtering on every render and keypress
  const matchedBookmarks = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q || !Array.isArray(bookmarks)) return [];
    return bookmarks
      .filter(b => (b?.title && typeof b.title === 'string' && b.title.toLowerCase().includes(q)) ||
                   (b?.url && typeof b.url === 'string' && b.url.toLowerCase().includes(q)))
      .slice(0, 3);
  }, [bookmarks, searchValue]);

  const [isPermissionPromptDismissed, setIsPermissionPromptDismissed] = useState(false);

  // Translation State
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string>('tr');
  const [sourceLang, setSourceLang] = useState<string>('auto');

  const handleTranslatePage = async (tLang: string, sLang?: string) => {
    if (!activeTab?.id) return;
    setIsTranslating(true);
    setTranslationError(null);
    setTargetLang(tLang);
    if (sLang) setSourceLang(sLang);
    try {
      window.dispatchEvent(new CustomEvent('nova:translate-tab', {
        detail: { tabId: activeTab.id, targetLang: tLang, sourceLang: sLang || 'auto' }
      }));
    } catch (err: any) {
      setTranslationError(err.message || 'Translation failed');
      setIsTranslating(false);
    }
  };

  const handleRestoreOriginal = async () => {
    if (!activeTab?.id) return;
    setIsTranslating(true);
    try {
      window.dispatchEvent(new CustomEvent('nova:restore-tab', {
        detail: { tabId: activeTab.id }
      }));
    } catch (err: any) {
      setIsTranslating(false);
    }
  };

  // Listen for translation completion events
  useEffect(() => {
    const handleDone = (e: any) => {
      if (e.detail?.tabId === activeTab?.id) {
        setIsTranslating(false);
        if (e.detail?.error) {
          setTranslationError(e.detail.error);
        }
      }
    };
    window.addEventListener('nova:translate-tab-done', handleDone);
    return () => window.removeEventListener('nova:translate-tab-done', handleDone);
  }, [activeTab?.id]);

  const handleTranslatePageRef = useRef(handleTranslatePage);
  handleTranslatePageRef.current = handleTranslatePage;

  // Listen to main process context-menu trigger
  useEffect(() => {
    if (typeof getElectronAPI()?.onTriggerPageTranslation === 'function') {
      const unsub = getElectronAPI()?.onTriggerPageTranslation((data: any) => {
        if (activeTab?.id) {
          setIsTranslateOpen(true);
          handleTranslatePageRef.current(data?.targetLang || 'tr', 'auto');
        }
      });
      return () => unsub?.();
    }
  }, [activeTab?.id]);

  const relevantPermissionRequestsKey = useMemo(
    () => relevantPermissionRequests.map(r => `${r.requestId}|${r.permission}|${r.origin}|${r.url}|${r.webContentsId ?? ''}`).join(','),
    [relevantPermissionRequests]
  );

  useEffect(() => {
    if (relevantPermissionRequests.length > 0) {
      setIsPermissionPromptDismissed(false);
    }
  }, [relevantPermissionRequestsKey]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isFocused) {
      const url = activeTab?.url || '';
      if (url === 'nova://newtab' || url === 'about:blank' || url === 'https://newtab') {
        setSearchValue('');
      } else {
        setSearchValue(url);
      }
    }
  }, [activeTab?.url, isFocused]);

  useEffect(() => {
    const trimmed = searchValue.trim();
    if (isAIMode || !trimmed || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('nova://') || trimmed.startsWith('about:')) {
      setSuggestions([]);
      return;
    }

    // 1. Instant 0ms cache lookup
    const cacheKey = `${trimmed}_${searchEngine}`;
    const cached = getClientCachedSuggestions(cacheKey);
    if (cached) {
      setSuggestions(cached.slice(0, 6));
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const currentReqId = ++suggestionRequestIdRef.current;

    const fetchSuggestions = async () => {
      try {
        const clientLocale = getLocale();
        if (typeof window !== 'undefined' && getElectronAPI()?.getSuggestions) {
          const results = await getElectronAPI()?.getSuggestions(trimmed, searchEngine, clientLocale);
          if (!abortController.signal.aborted && suggestionRequestIdRef.current === currentReqId) {
            if (Array.isArray(results)) {
              setClientCachedSuggestions(cacheKey, results);
              setSuggestions(results.slice(0, 6));
            } else {
              setSuggestions([]);
            }
          }
          return;
        }

        // Without electron IPC, do not leak user typing to external domains from renderer
        setSuggestions([]);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          logger.debug('TopBar:suggestions', 'Non-fatal error while fetching search suggestions', err);
        }
      }
    };

    const timer = setTimeout(fetchSuggestions, 120);
    setSelectedIndex(-1);
    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [searchValue, isAIMode, searchEngine]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    let targetValue = searchValue;

    if (selectedIndex > -1 && selectedIndex < suggestions.length) {
      targetValue = suggestions[selectedIndex];
    } else if (selectedIndex >= suggestions.length && selectedIndex < suggestions.length + matchedBookmarks.length) {
      targetValue = matchedBookmarks[selectedIndex - suggestions.length].url;
    }

    if (isAIMode || targetValue.startsWith('@ai ') || targetValue.startsWith('ai:')) {
      let prompt = targetValue;
      if (prompt.startsWith('@ai ')) prompt = prompt.substring(4);
      if (prompt.startsWith('ai:')) prompt = prompt.substring(3);
      
      window.dispatchEvent(new CustomEvent('ai-quick-action', { detail: prompt.trim() }));
      setSearchValue('');
      setIsAIMode(false);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      return;
    }

    const url = formatSearchUrl(targetValue, searchEngine, getLanguage());
    onNavigate(url);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    // Blur the active element to drop focus
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [searchValue, searchEngine, onNavigate, isAIMode, selectedIndex, suggestions, bookmarks]);

  return (
    <div className="flex-1 flex w-full mx-1 duration-200 ease-out" style={{ transform: isFocused ? 'scale(1.005)' : 'scale(1)' }}>
      <div className="w-full relative">
        <form
          onSubmit={handleSearchSubmit}
          className="nova-omnibox-form relative group w-full"
          style={{ position: 'relative' }}
        >
          <div 
            ref={siteInfoBtnRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsSiteInfoOpen(prev => !prev);
            }}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10 cursor-pointer"
          >
            {isIncognito ? (
              <div className="flex items-center gap-1.5 text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-lg shadow-xs hover:bg-cyan-500/25 transition-colors" title="Private & Incognito Mode (Click for Site Info)">
                <VenetianMask className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Incognito</span>
              </div>
            ) : (
              (() => {
                const sec = getUrlSecurityInfo(activeTab?.url || '');
                return (
                  <div className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-md transition-[background-color,color,box-shadow,transform] hover:scale-105 active:scale-95 ${sec.bgColor} ${sec.color}`} title={`${sec.tooltip} (Click for site info & permissions)`}>
                    {sec.level === 'internal' && (
                      (activeTab?.url === 'nova://settings' || activeTab?.url?.includes('settings')) ? <Settings className="w-3.5 h-3.5" /> :
                      (activeTab?.url === 'nova://history' || activeTab?.url?.includes('history')) ? <Clock className="w-3.5 h-3.5" /> :
                      (activeTab?.url === 'nova://downloads' || activeTab?.url?.includes('downloads')) ? <Download className="w-3.5 h-3.5" /> :
                      <Search className="w-3.5 h-3.5" />
                    )}
                    {sec.level === 'secure' && <Lock className="w-3.5 h-3.5" />}
                    {sec.level === 'http' && <Unlock className="w-3.5 h-3.5" />}
                    {sec.level === 'dangerous' && <ShieldAlert className="w-3.5 h-3.5" />}
                    {sec.level === 'unknown' && <HelpCircle className="w-3.5 h-3.5" />}
                  </div>
                );
              })()
            )}
          </div>

          <SiteInfoPopover
            isOpen={isSiteInfoOpen}
            onClose={() => setIsSiteInfoOpen(false)}
            url={activeTab?.url || ''}
            blockedAdsCount={activeTab?.blockedAdsCount || 0}
            buttonRef={siteInfoBtnRef}
          />

          {/* Chrome-Style Permission Prompt Bubble */}
          {!isPermissionPromptDismissed && relevantPermissionRequests.length > 0 && onRespondPermission && (
            <PermissionPromptPopover
              requests={relevantPermissionRequests}
              onRespond={(requestId, allow, remember) => {
                onRespondPermission(requestId, allow, remember);
              }}
              onDismiss={(requestId) => {
                if (onDismissPermission) {
                  onDismissPermission(requestId);
                }
                setIsPermissionPromptDismissed(true);
              }}
            />
          )}

          {/* Chrome-Style Omnibox Permission Chip */}
          {relevantPermissionRequests.length > 0 && (
            <div 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsPermissionPromptDismissed(prev => !prev);
              }}              className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10 cursor-pointer bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg text-xs font-semibold shadow-xs ${
                isIncognito ? 'left-28' : 'left-10'
              }`}
              title="Site Permissions (Click to toggle)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping shrink-0" />
              <span className="text-[11px] font-semibold whitespace-nowrap">Permissions</span>
            </div>
          )}

          <input
            type="text"
            aria-label="Address and search bar"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && searchValue.trim().toLowerCase() === '@ai') {
                e.preventDefault();
                setIsAIMode(true);
                setSearchValue('');
              } else if (e.key === 'Tab' && selectedIndex >= 0 && selectedIndex < suggestions.length) {
                e.preventDefault();
                setSearchValue(suggestions[selectedIndex]);
                setSelectedIndex(-1);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const maxIndex = suggestions.length + matchedBookmarks.length - 1;
                setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : prev));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > -1 ? prev - 1 : -1));
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
                setSelectedIndex(-1);
                if (activeTab?.url) {
                  setSearchValue(activeTab.url);
                }
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }
            }}
            onFocus={(e) => {
              setIsFocused(true);
              setShowSuggestions(true);
              e.target.select();
            }}
            onBlur={() => {
              setIsFocused(false);
              if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
              blurTimerRef.current = setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder={isAIMode ? "AI: What would you like me to do? (e.g. Open YouTube and search for music)" : `Search ${getSearchEngineName(searchEngine)} or type a URL`}
            className={`w-full border border-slate-200/60 dark:border-white/10 focus:border-cyan-500 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl py-1.5 pr-24 text-[13px] outline-none transition-colors duration-300 shadow-2xs ${
              relevantPermissionRequests.length > 0
                ? isIncognito ? 'pl-52' : 'pl-34'
                : isIncognito ? 'pl-28' : 'pl-11'
            } ${
              isIncognito 
                ? 'bg-slate-900/80 hover:bg-slate-900 focus:bg-slate-900 text-slate-200 placeholder-slate-500' 
                : 'bg-slate-100/90 hover:bg-slate-200/60 focus:bg-white text-slate-800 placeholder-slate-400 dark:bg-slate-900/70 dark:hover:bg-slate-900 dark:focus:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500'
            } ${isAIMode ? 'border-cyan-400/50 ring-4 ring-cyan-500/20 bg-cyan-950/30 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : ''} ${
              (useVerticalTabs && !isFocused && !isAIMode) ? '!text-transparent !placeholder-transparent' : ''
            }`}
          />

          {/* Title & URL Overlay for Vertical Tabs Mode */}
          {useVerticalTabs && !isFocused && !isAIMode && (
            <div className={`absolute inset-0 pointer-events-none flex flex-col justify-center pr-24 ${
              relevantPermissionRequests.length > 0
                ? isIncognito ? 'pl-52' : 'pl-34'
                : isIncognito ? 'pl-28' : 'pl-11'
            }`}>
              <span className="text-[12px] font-semibold truncate text-slate-800 dark:text-slate-200 leading-[14px]">
                {activeTab?.title || 'New Tab'}
              </span>
              {activeTab?.url && activeTab.url !== 'nova://newtab' && (
                <span className="text-[10px] truncate text-slate-500 dark:text-slate-400 leading-[12px]">
                  {formatSearchUrl(activeTab.url)}
                </span>
              )}
            </div>
          )}
          <div
            className="nova-omnibox-actions absolute inset-y-0 right-2 flex items-center gap-1 z-10"
            style={{
              position: 'absolute',
              top: 0,
              right: '0.5rem',
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              zIndex: 10,
            }}
          >
            {activeTab?.zoomFactor !== undefined && activeTab.zoomFactor !== 1.0 && (
              <button 
                type="button" 
                onClick={onResetZoom}
                className={`px-1.5 py-0.5 mr-1 rounded-md text-[10px] font-bold cursor-pointer select-none transition-colors hover:scale-105 active:scale-95 ${isIncognito ? 'bg-slate-700 hover:bg-slate-600 text-cyan-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-cyan-400'}`}
                title="Zoom Level (Click to reset 100%)"
              >
                {Math.round(activeTab.zoomFactor * 100)}%
              </button>
            )}

            {onToggleReaderMode && (
              <button 
                type="button" 
                onClick={onToggleReaderMode}
                className={`p-1 rounded-lg transition-colors ${isIncognito ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
                title="Toggle Reader Mode"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Page Translation Button & Popover */}
            {activeTab?.url && (activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://')) && (
              <div className="relative flex items-center">
                <button 
                  type="button" 
                  onClick={() => setIsTranslateOpen(!isTranslateOpen)}
                  className={`p-1 rounded-lg transition-colors relative ${
                    activeTab.isTranslated
                      ? 'text-cyan-500 bg-cyan-500/15 hover:bg-cyan-500/25'
                      : isIncognito 
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title="Translate Page"
                >
                  <Languages className="w-3.5 h-3.5" />
                  {activeTab.isTranslated && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-500 ring-1 ring-white dark:ring-slate-900" />
                  )}
                </button>

                <PageTranslatePopover
                  isOpen={isTranslateOpen}
                  onClose={() => setIsTranslateOpen(false)}
                  onTranslate={handleTranslatePage}
                  onRestoreOriginal={handleRestoreOriginal}
                  isTranslated={!!activeTab?.isTranslated}
                  isLoading={isTranslating}
                  currentSourceLang={sourceLang}
                  currentTargetLang={targetLang}
                  error={translationError}
                />
              </div>
            )}

            <button 
              type="button" 
              onClick={() => onToggleBookmark?.(activeTab)}
              className={`p-1 rounded-lg transition-colors ${isIncognito ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
              title="Bookmark Page"
            >
              <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-cyan-500 text-cyan-500' : ''}`} />
            </button>
          </div>
        </form>

        {/* Search Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && searchValue.trim().length > 0 && (
            <motion.div 
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`absolute left-0 right-0 top-full mt-2 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden divide-y ${isIncognito ? 'bg-slate-800 border border-slate-700 divide-slate-700' : 'bg-white/95 backdrop-blur-xl border border-slate-200/80 divide-slate-100 dark:bg-slate-900/95 dark:border-white/10 dark:divide-white/5'}`}
                onMouseDown={(e) => e.preventDefault()}
              >
              
              {/* Primary Direct Action (Index -1) */}
                <button
                  type="button"
                  onMouseEnter={() => setSelectedIndex(-1)}
                  onClick={() => {
                    setShowSuggestions(false);
                    onNavigate(formatSearchUrl(searchValue, searchEngine, getLanguage()));
                    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors group ${
                    selectedIndex === -1 
                      ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold' 
                      : isIncognito 
                        ? 'hover:bg-slate-700 text-slate-200' 
                        : 'hover:bg-slate-100 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                {isValidUrlOrDomain(searchValue) ? (
                  <>
                    <Globe className="w-4 h-4 shrink-0 text-cyan-500" />
                    <span className="truncate font-medium text-cyan-600 dark:text-cyan-400">Go to: <span className="underline">{searchValue}</span></span>
                  </>
                ) : (
                  <>
                    <Search className={`w-4 h-4 shrink-0 ${selectedIndex === -1 ? 'text-cyan-500' : 'text-slate-400 group-hover:text-cyan-500'}`} />
                    <span className="truncate text-slate-700 dark:text-slate-200">Search with {getSearchEngineName(searchEngine)}: <strong className="text-slate-900 dark:text-white">{searchValue}</strong></span>
                  </>
                )}
              </button>

              {/* Search Suggestions (Index 0 to suggestions.length - 1) */}
              {suggestions.length > 0 && (
                <div className="py-1" role="listbox" aria-label="Search suggestions">
                  <div className="px-4 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Search Suggestions
                  </div>

                  {suggestions.map((suggestion, idx) => (
                      <button
                        key={`sug-${idx}`}
                        type="button"
                        role="option"
                        aria-selected={selectedIndex === idx}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          setSearchValue(suggestion);
                          setShowSuggestions(false);
                          onNavigate(formatSearchUrl(suggestion, searchEngine, getLanguage()));
                          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                          selectedIndex === idx 
                            ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <Search className={`w-3.5 h-3.5 shrink-0 ${selectedIndex === idx ? 'text-cyan-500' : 'text-slate-400'}`} />
                        <span className="truncate">{suggestion}</span>
                      </button>
                    ))}
                </div>
              )}

              {/* Matching Bookmarks (Index suggestions.length to ...) */}
              {matchedBookmarks.length > 0 && (
                <div className="py-1">
                  <div className="px-4 pt-1 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Bookmarks
                  </div>
                  {matchedBookmarks
                    .map((bookmark, idx) => {
                      const bookmarkIdx = suggestions.length + idx;
                      return (
                        <button
                          key={`bm-${bookmark.id}`}
                          type="button"
                          onMouseEnter={() => setSelectedIndex(bookmarkIdx)}
                          onClick={() => {
                            setSearchValue(bookmark.url);
                            setShowSuggestions(false);
                            onNavigate(bookmark.url);
                            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors ${
                            selectedIndex === bookmarkIdx
                              ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Star className={`w-3.5 h-3.5 shrink-0 ${selectedIndex === bookmarkIdx ? 'text-cyan-500 fill-cyan-500' : 'text-amber-400 fill-amber-400'}`} />
                            <span className="truncate font-medium">{bookmark.title}</span>
                          </div>
                          <span className="text-xs text-slate-400 truncate max-w-[150px]">{bookmark.url}</span>
                        </button>
                      );
                    })}
                </div>
                )}
              </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
});
