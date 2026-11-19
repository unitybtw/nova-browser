import { performDownloadAction } from '../utils/downloadActions';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, CheckCircle2, AlertCircle, FileText, Pause, Play, XCircle, Folder as FolderIcon } from 'lucide-react';
import { DownloadItem } from '../types/browser';
import { formatBytes } from '../utils/formatBytes';

interface DownloadsPopoverProps {
  downloads: DownloadItem[];
  isOpen: boolean;
  onClose: () => void;
  onClearDownloads: () => void;
  onOpenDownloadsPage?: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export const DownloadsPopover: React.FC<DownloadsPopoverProps> = ({
  downloads,
  isOpen,
  onClose,
  onClearDownloads,
  onOpenDownloadsPage,
  buttonRef
}) => {
  // Hide popover if click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        const popover = document.getElementById('downloads-popover');
        if (popover && !popover.contains(e.target as Node)) {
          onClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, buttonRef]);

  return (
    <AnimatePresence>
      {isOpen && (() => {
        // Ölçüm sadece popover açıkken yapılır: getBoundingClientRect() senkron
        // layout okuması tetikler ve bu component her App render'ında çalışıyor.
        // `top`/`right` style'da kullanıldığı için hesap CSS'e devredilemez.
        const rect = buttonRef.current?.getBoundingClientRect();
        const top = rect ? rect.bottom + 10 : 50;
        const right = rect ? window.innerWidth - rect.right - 10 : 20;

        return (
          <motion.div
            id="downloads-popover"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-50 w-84 bg-white/95 dark:bg-[#141518]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-neutral-200/90 dark:border-white/[0.1] overflow-hidden flex flex-col"
            style={{ top, right }}
          >
            <div className="px-3.5 py-2.5 border-b border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Downloads</h3>
              </div>
              {downloads.length > 0 && (
                <button
                  type="button"
                  onClick={onClearDownloads}
                  className="text-[11px] font-medium text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto p-1.5 flex flex-col gap-0.5">
              {downloads.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center px-4">
                  <Download className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mb-2" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">No downloaded files yet.</p>
                </div>
              ) : (
                downloads.map((item) => {
                  const progress = item.totalBytes ? Math.round((item.receivedBytes / item.totalBytes) * 100) : 0;
                  const isCompleted = item.state === 'completed';
                  const isCancelled = item.state === 'cancelled';
                  const isInterrupted = item.state === 'interrupted';
                  const isProgressing = item.state === 'progressing';
                  const isPaused = item.isPaused;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isCompleted && item.savePath) {
                          void performDownloadAction(item.savePath, 'open');
                        }
                      }}
                      className={`group flex items-start gap-2.5 p-2 hover:bg-neutral-100/80 dark:hover:bg-white/[0.05] rounded-lg transition-colors ${isCompleted ? 'cursor-pointer' : ''}`}
                    >
                      <div className="w-8 h-8 shrink-0 rounded-lg bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : isCancelled || isInterrupted ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                        <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate pr-2" title={item.filename}>
                          {item.filename}
                        </div>

                        {isProgressing && (
                          <div className="mt-1">
                            <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 font-mono tabular-nums mb-1">
                              <span>{isPaused ? 'Paused' : `${progress}%`}</span>
                              {item.totalBytes ? <span>{formatBytes(item.totalBytes)}</span> : <span>Downloading...</span>}
                            </div>
                            <div className="h-1 w-full bg-neutral-200 dark:bg-white/[0.1] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${isPaused ? 'bg-amber-500' : 'bg-neutral-900 dark:bg-white'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {!isProgressing && (
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                            {isCompleted ? 'Completed — click to open' : isCancelled ? 'Cancelled' : 'Interrupted'}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity">
                        {isCompleted && item.savePath && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void performDownloadAction(item.savePath!, 'reveal');
                            }}
                            className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-white/[0.08] rounded-md transition-colors cursor-pointer"
                            title="Show in Folder"
                          >
                            <FolderIcon className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isProgressing && (
                          <>
                            {isPaused ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  (window as any).electronAPI?.resumeDownload?.(item.id);
                                }}
                                className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-white/[0.08] rounded-md transition-colors cursor-pointer"
                                title="Resume"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  (window as any).electronAPI?.pauseDownload?.(item.id);
                                }}
                                className="p-1.5 text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors cursor-pointer"
                                title="Pause"
                              >
                                <Pause className="w-3.5 h-3.5 fill-current" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                (window as any).electronAPI?.cancelDownload?.(item.id);
                              }}
                              className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {onOpenDownloadsPage && (
              <div className="px-3 py-2 border-t border-neutral-200/80 dark:border-white/[0.08] bg-neutral-50/70 dark:bg-white/[0.02] text-center">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDownloadsPage();
                  }}
                  className="w-full text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white py-1 transition-colors cursor-pointer"
                >
                  Show all downloads (nova://downloads)
                </button>
              </div>
            )}
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
};
