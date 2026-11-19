import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Tab } from '../types/browser';
import { tabThumbnailCache } from '../services/thumbnailCache';
import { 
  Globe, 
  Settings, 
  Clock, 
  Download, 
  Compass, 
  VenetianMask, 
  Volume2, 
  VolumeX, 
  Pin,
  Moon
} from 'lucide-react';

export interface TabHoverPreviewProps {
  tab: Tab | null;
  rect: { top: number; left: number; width: number; height: number; right: number; bottom: number } | null;
  position?: 'bottom' | 'right';
  visible: boolean;
}

export const TabHoverPreview: React.FC<TabHoverPreviewProps> = React.memo(({
  tab,
  rect,
  position = 'bottom',
  visible
}) => {
  const [cachedThumbnail, setCachedThumbnail] = useState<string | undefined>(
    tab ? (tabThumbnailCache.get(tab.id) || tab.thumbnail) : undefined
  );

  useEffect(() => {
    let isCancelled = false;
    const currentTabId = tab?.id;

    if (!tab) {
      setCachedThumbnail(undefined);
      return;
    }

    const current = tabThumbnailCache.get(tab.id) || tab.thumbnail;
    setCachedThumbnail(current);

    // If thumbnail is missing and webContentsId is available, attempt capture with 300ms hover dwell debounce
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    if (!current && tab.webContentsId && typeof (window as any).electronAPI?.captureTabThumbnail === 'function') {
      const targetWcId = tab.webContentsId;
      debounceTimer = setTimeout(() => {
        (window as any).electronAPI.captureTabThumbnail(targetWcId)
          .then((thumb: string | null) => {
            if (!isCancelled && thumb && currentTabId) {
              tabThumbnailCache.set(currentTabId, thumb);
              setCachedThumbnail(thumb);
            }
          })
          .catch(() => {});
      }, 300);
    }

    const unsubscribe = tabThumbnailCache.subscribe(() => {
      if (!isCancelled && currentTabId) {
        const updated = tabThumbnailCache.get(currentTabId) || tab?.thumbnail;
        setCachedThumbnail(updated);
      }
    });

    return () => {
      isCancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [tab?.id, tab?.thumbnail, tab?.webContentsId]);

  if (!tab || !rect) return null;

  // Calculate Popover Position
  let top = 0;
  let left = 0;
  const popoverWidth = 280;
  const popoverHeight = 210;

  if (position === 'bottom') {
    top = rect.bottom + 8;
    left = Math.max(12, Math.min(rect.left + rect.width / 2 - popoverWidth / 2, window.innerWidth - popoverWidth - 16));
  } else {
    // position === 'right' (for sidebar vertical tabs)
    left = rect.right + 12;
    top = Math.max(12, Math.min(rect.top + rect.height / 2 - popoverHeight / 2, window.innerHeight - popoverHeight - 16));
  }

  // Format domain or internal page title
  let domain = '';
  try {
    if (tab.url?.startsWith('http://') || tab.url?.startsWith('https://')) {
      domain = new URL(tab.url).hostname.replace(/^www\./, '');
    } else if (tab.url?.startsWith('nova://')) {
      domain = tab.url;
    }
  } catch (_) {
    domain = tab.url || '';
  }

  const isInternal = tab.url?.startsWith('nova://') || tab.url === 'about:blank';
  const isSettings = tab.url === 'nova://settings';
  const isHistory = tab.url === 'nova://history';
  const isDownloads = tab.url === 'nova://downloads';
  const isNewTab = tab.url === 'nova://newtab' || tab.url === 'about:blank';

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`tab-preview-${tab.id}`}
          initial={{ opacity: 0, y: position === 'bottom' ? -8 : 0, x: position === 'right' ? -8 : 0, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === 'bottom' ? -4 : 0, scale: 0.96 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none fixed z-[999999] rounded-xl bg-white/95 dark:bg-[#141518]/95 backdrop-blur-xl border border-neutral-200/90 dark:border-white/[0.1] shadow-2xl overflow-hidden select-none flex flex-col"
          style={{
            top,
            left,
            width: popoverWidth,
          }}
        >
          {/* Header */}
          <div className="px-3 py-2 bg-neutral-50/90 dark:bg-white/[0.03] border-b border-neutral-200/80 dark:border-white/[0.07] flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-4 h-4 rounded-xs flex items-center justify-center shrink-0">
                {tab.favicon ? (
                  <img src={tab.favicon} alt="" className="w-4 h-4 rounded-xs object-contain" />
                ) : isSettings ? (
                  <Settings className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                ) : isHistory ? (
                  <Clock className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                ) : isDownloads ? (
                  <Download className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                ) : isNewTab ? (
                  tab.isIncognito ? <VenetianMask className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-300" /> : <Compass className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-300" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-neutral-400" />
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate leading-tight">
                  {tab.title || tab.url || 'New Tab'}
                </span>
                {domain && (
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate leading-none mt-0.5">
                    {domain}
                  </span>
                )}
              </div>
            </div>

            {/* Badges: Audio, Muted, Pinned, Hibernated */}
            <div className="flex items-center gap-1 shrink-0">
              {tab.isPinned && (
                <span className="p-1 rounded-md bg-neutral-100 dark:bg-white/[0.07] text-neutral-600 dark:text-neutral-300" title="Pinned Tab">
                  <Pin className="w-3 h-3" />
                </span>
              )}
              {tab.isPlayingAudio && (
                <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" title="Playing Audio">
                  {tab.isMuted ? <VolumeX className="w-3 h-3 text-red-500" /> : <Volume2 className="w-3 h-3" />}
                </span>
              )}
              {tab.isSuspended && (
                <span className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400" title="Sleeping Tab">
                  <Moon className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>

          {/* Thumbnail / Visual Area */}
          <div className="w-full bg-neutral-100 dark:bg-[#0e0f12] overflow-hidden relative" style={{ aspectRatio: '16/10' }}>
            {cachedThumbnail ? (
              <img
                src={cachedThumbnail}
                alt="Tab preview"
                className="w-full h-full object-cover object-top block"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-neutral-100 dark:bg-[#0e0f12]">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#141518] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center mb-2">
                  {isSettings ? (
                    <Settings className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                  ) : isHistory ? (
                    <Clock className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                  ) : isDownloads ? (
                    <Download className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                  ) : isNewTab ? (
                    <Compass className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                  ) : (
                    <Globe className="w-5 h-5 text-neutral-400" />
                  )}
                </div>
                <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">
                  {tab.title || (isNewTab ? 'New Tab Page' : domain)}
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {tab.isLoading ? 'Loading Page...' : (isInternal ? 'Nova System Page' : domain || 'Web Page')}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
});
