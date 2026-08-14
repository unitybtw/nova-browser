import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, CheckCircle2, AlertCircle, FileText, Pause, Play, XCircle, Trash2, Folder as FolderIcon } from 'lucide-react';
import { DownloadItem } from '../App';

interface DownloadsPopoverProps {
  downloads: DownloadItem[];
  isOpen: boolean;
  onClose: () => void;
  onClearDownloads: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export const DownloadsPopover: React.FC<DownloadsPopoverProps> = ({
  downloads,
  isOpen,
  onClose,
  onClearDownloads,
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

  if (!isOpen) return null;

  const rect = buttonRef.current?.getBoundingClientRect();
  const top = rect ? rect.bottom + 10 : 50;
  const right = rect ? window.innerWidth - rect.right - 10 : 20;

  return (
    <AnimatePresence>
      <motion.div
        id="downloads-popover"
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed z-50 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden flex flex-col"
        style={{ top, right }}
      >
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Downloads</h3>
          </div>
          {downloads.length > 0 && (
            <button
              onClick={onClearDownloads}
              className="text-xs text-slate-500 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto p-2 flex flex-col gap-1">
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

              return (
                <div 
                  key={item.id} 
                  onClick={() => {
                    if (isCompleted && item.savePath) {
                      (window as any).electronAPI?.openDownload?.(item.savePath);
                    }
                  }}
                  className={`group flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors ${isCompleted ? 'cursor-pointer' : ''}`}
                >
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
                    {isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                     isCancelled || isInterrupted ? <AlertCircle className="w-5 h-5 text-red-500" /> :
                     <FileText className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate pr-2" title={item.filename}>
                      {item.filename}
                    </div>
                    
                    {isProgressing && (
                      <div className="mt-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>{progress}%</span>
                          {item.totalBytes ? <span>{(item.totalBytes / 1024 / 1024).toFixed(1)} MB</span> : <span>Downloading...</span>}
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}
                    
                    {!isProgressing && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {isCompleted ? 'Completed — click to open' : isCancelled ? 'Cancelled' : 'Interrupted'}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isCompleted && item.savePath && (
                      <button
                        onClick={() => (window as any).electronAPI?.showDownloadInFolder?.(item.savePath!)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Show in Folder"
                      >
                        <FolderIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    
                    {isProgressing && (
                      <button
                        onClick={() => (window as any).electronAPI?.cancelDownload?.(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
