import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, CheckCircle2, AlertCircle, FileText, Pause, Play, XCircle, Trash2, Folder as FolderIcon } from 'lucide-react';
import { DownloadItem } from '../types/browser';

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

  const rect = buttonRef.current?.getBoundingClientRect();
  const top = rect ? rect.bottom + 10 : 50;
  const right = rect ? window.innerWidth - rect.right - 10 : 20;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="downloads-popover"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed z-50 w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col"
          style={{ top, right }}
        >
          <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Download className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Downloads</h3>
            </div>
            {downloads.length > 0 && (
              <button
                onClick={onClearDownloads}
                className="text-xs text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
            {downloads.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center px-4">
                <Download className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No downloaded files yet.</p>
              </div>
            ) : (
              downloads.map(item => {
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
                        (window as any).electronAPI?.openDownload?.(item.savePath);
                      }
                    }}
                    className={`group flex items-start gap-3 p-2.5 hover:bg-slate-100/70 dark:hover:bg-white/[0.04] rounded-xl transition-colors ${isCompleted ? 'cursor-pointer' : ''}`}
                  >
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-50 dark:bg-cyan-500/10 flex items-center justify-center text-blue-500 dark:text-cyan-400">
                      {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                       isCancelled || isInterrupted ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                       <FileText className="w-4 h-4" />}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate pr-2" title={item.filename}>
                        {item.filename}
                      </div>
                      
                      {isProgressing && (
                        <div className="mt-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                            <span>{isPaused ? 'Paused' : `${progress}%`}</span>
                            {item.totalBytes ? <span>{(item.totalBytes / 1024 / 1024).toFixed(1)} MB</span> : <span>Downloading...</span>}
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${isPaused ? 'bg-amber-500' : 'bg-cyan-500'}`} style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      )}
                      
                      {!isProgressing && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {isCompleted ? 'Completed — click to open' : isCancelled ? 'Cancelled' : 'Interrupted'}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCompleted && item.savePath && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            (window as any).electronAPI?.showDownloadInFolder?.(item.savePath!);
                          }}
                          className="p-1.5 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-lg transition-colors"
                          title="Show in Folder"
                        >
                          <FolderIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      
                      {isProgressing && (
                        <>
                          {isPaused ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                (window as any).electronAPI?.resumeDownload?.(item.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-lg transition-colors"
                              title="Resume"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                (window as any).electronAPI?.pauseDownload?.(item.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors"
                              title="Pause"
                            >
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              (window as any).electronAPI?.cancelDownload?.(item.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
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
            <div className="px-3 py-2 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30 text-center">
              <button
                onClick={() => {
                  onClose();
                  onOpenDownloadsPage();
                }}
                className="w-full text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline py-1"
              >
                Show all downloads (nova://downloads)
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
