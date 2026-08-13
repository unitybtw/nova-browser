import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DownloadItem } from '../App';
import { CheckCircle2, AlertCircle, FileText, Folder as FolderIcon, X } from 'lucide-react';

interface DownloadToastProps {
  downloads: DownloadItem[];
}

export const DownloadToast: React.FC<DownloadToastProps> = ({ downloads }) => {
  const [activeToast, setActiveToast] = useState<DownloadItem | null>(null);

  useEffect(() => {
    if (downloads.length > 0) {
      const latest = downloads[0];
      setActiveToast(latest);

      // Auto-hide the toast after 4 seconds if the download has finished
      if (latest.state === 'completed' || latest.state === 'cancelled' || latest.state === 'interrupted') {
        const timer = setTimeout(() => {
          setActiveToast(current => current?.id === latest.id ? null : current);
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [downloads]);

  if (!activeToast) return null;

  const progress = activeToast.totalBytes ? Math.round((activeToast.receivedBytes / activeToast.totalBytes) * 100) : 0;
  const isCompleted = activeToast.state === 'completed';
  const isCancelled = activeToast.state === 'cancelled';
  const isInterrupted = activeToast.state === 'interrupted';
  const isProgressing = activeToast.state === 'progressing';

  return (
    <AnimatePresence>
      <motion.div
        key={activeToast.id}
        initial={{ opacity: 0, y: 50, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-[9999] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700/80 p-3 w-80 flex items-start gap-3 group"
      >
        <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 mt-0.5">
          {isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
           isCancelled || isInterrupted ? <AlertCircle className="w-5 h-5 text-red-500" /> :
           <FileText className="w-5 h-5" />}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex justify-between items-start mb-0.5">
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate pr-2" title={activeToast.filename}>
              {activeToast.filename}
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveToast(null); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {isProgressing && (
            <div className="mt-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span>{progress}%</span>
                {activeToast.totalBytes ? <span>{(activeToast.totalBytes / 1024 / 1024).toFixed(1)} MB</span> : <span>Downloading...</span>}
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          
          {!isProgressing && (
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : 'Interrupted'}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-2 flex items-center gap-2">
            {isCompleted && activeToast.savePath && (
              <button
                onClick={() => {
                  (window as any).electronAPI?.showDownloadInFolder?.(activeToast.savePath!);
                  setActiveToast(null);
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-2 py-1 rounded-md transition-colors"
              >
                <FolderIcon className="w-3.5 h-3.5" />
                Show in Folder
              </button>
            )}
            
            {isProgressing && (
              <button
                onClick={() => (window as any).electronAPI?.cancelDownload?.(activeToast.id)}
                className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-2 py-1 rounded-md transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
