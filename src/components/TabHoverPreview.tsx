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

export const TabHoverPreview: React.FC<TabHoverPreviewProps> = ({
  tab,
  rect,
  position = 'bottom',
  visible
}) => {
  const [cachedThumbnail, setCachedThumbnail] = useState<string | undefined>(
    tab ? (tabThumbnailCache.get(tab.id) || tab.thumbnail) : undefined
  );

  useEffect(() => {
    if (!tab) {
      setCachedThumbnail(undefined);
      return;
    }

    const current = tabThumbnailCache.get(tab.id) || tab.thumbnail;
    setCachedThumbnail(current);

    // If thumbnail is missing and webContentsId is available, attempt capture
    if (!current && tab.webContentsId && typeof (window as any).electronAPI?.captureTabThumbnail === 'function') {
      (window as any).electronAPI.captureTabThumbnail(tab.webContentsId)
        .then((thumb: string | null) => {
          if (thumb) {
            tabThumbnailCache.set(tab.id, thumb);
            setCachedThumbnail(thumb);
          }
        })
        .catch(() => {});
    }

    const unsubscribe = tabThumbnailCache.subscribe(() => {
      if (tab?.id) {
        const updated = tabThumbnailCache.get(tab.id) || tab.thumbnail;
        setCachedThumbnail(updated);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tab?.id, tab?.thumbnail, tab?.webContentsId]);

  if (!visible || !tab || !rect) return null;

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
  const isSettings = tab.url === 'nova://settings' || tab.url?.includes('settings');
  const isHistory = tab.url === 'nova://history' || tab.url?.includes('history');
  const isDownloads = tab.url === 'nova://downloads' || tab.url?.includes('downloads');
  const isNewTab = tab.url === 'nova://newtab' || tab.url === 'about:blank' || tab.url === 'https://newtab';

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`tab-preview-${tab.id}`}
          initial={{ opacity: 0, y: position === 'bottom' ? -8 : 0, x: position === 'right' ? -8 : 0, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          className="pointer-events-none fixed z-[999999] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 shadow-2xl shadow-black/30 overflow-hidden select-none flex flex-col"
          style={{
            top,
            left,
            width: popoverWidth,
          }}
        >
          {/* Header */}
          <div className="px-3 py-2.5 bg-slate-100/80 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-4 h-4 rounded-xs flex items-center justify-center shrink-0">
                {tab.favicon ? (
                  <img src={tab.favicon} alt="" className="w-4 h-4 rounded-xs object-contain" />
                ) : isSettings ? (
                  <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                ) : isHistory ? (
                  <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                ) : isDownloads ? (
                  <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                ) : isNewTab ? (
                  tab.isIncognito ? <VenetianMask className="w-3.5 h-3.5 text-cyan-400" /> : <Compass className="w-3.5 h-3.5 text-cyan-500" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                  {tab.title || tab.url || 'New Tab'}
                </span>
                {domain && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-none mt-0.5">
                    {domain}
                  </span>
                )}
              </div>
            </div>

            {/* Badges: Audio, Muted, Pinned, Hibernated */}
            <div className="flex items-center gap-1 shrink-0">
              {tab.isPinned && (
                <span className="p-1 rounded-md bg-blue-500/10 text-blue-500 dark:text-blue-400" title="Pinned Tab">
                  <Pin className="w-3 h-3" />
                </span>
              )}
              {tab.isPlayingAudio && (
                <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 dark:text-emerald-400" title="Playing Audio">
                  {tab.isMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 animate-pulse" />}
                </span>
              )}
              {tab.isSuspended && (
                <span className="p-1 rounded-md bg-amber-500/10 text-amber-500 dark:text-amber-400" title="Sleeping Tab">
                  <Moon className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>

          {/* Thumbnail / Visual Area */}
          <div className="w-full bg-slate-100 dark:bg-slate-950 overflow-hidden relative" style={{ aspectRatio: '16/10' }}>
            {cachedThumbnail ? (
              <img
                src={cachedThumbnail}
                alt="Tab preview"
                className="w-full h-full object-cover object-top block"
              />
            ) : (
              /* High-Quality Graphic Fallback for Internal / Loading Pages */
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950">
                <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-white/10 backdrop-blur-md border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-md mb-2">
                  {isSettings ? (
                    <Settings className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                  ) : isHistory ? (
                    <Clock className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                  ) : isDownloads ? (
                    <Download className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                  ) : isNewTab ? (
                    <Compass className="w-6 h-6 text-cyan-500" />
                  ) : (
                    <Globe className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                  {tab.title || (isNewTab ? 'New Tab Page' : domain)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {tab.isLoading ? 'Sayfa Yükleniyor...' : (isInternal ? 'Nova Sistem Sayfası' : domain || 'Web Sayfası')}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
