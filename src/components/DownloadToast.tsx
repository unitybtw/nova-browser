import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DownloadItem } from '../App';
import { CheckCircle2, AlertCircle, FileText, Folder as FolderIcon, X, Pause, Play, FileCheck } from 'lucide-react';

interface DownloadToastProps {
  downloads: DownloadItem[];
}

export const DownloadToast: React.FC<DownloadToastProps> = ({ downloads }) => {
  const [activeToast, setActiveToast] = useState<DownloadItem | null>(null);

  useEffect(() => {
    if (downloads.length > 0) {
      const latest = downloads[0];
      setActiveToast(latest);

      // Auto-hide the toast after 4.5 seconds if the download has finished
      if (latest.state === 'completed' || latest.state === 'cancelled' || latest.state === 'interrupted') {
        const timer = setTimeout(() => {
          setActiveToast(current => current?.id === latest.id ? null : current);
        }, 4500);
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
        initial={{ opacity: 0, y: 50, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        className="fixed bottom-6 right-6 z-[9999] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 p-3.5 w-84 flex items-start gap-3 group"
      >
        <div className="w-10 h-10 shrink-0 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mt-0.5">
          {isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
           isCancelled || isInterrupted ? <AlertCircle className="w-5 h-5 text-red-500" /> :
           <FileText className="w-5 h-5" />}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex justify-between items-start mb-0.5">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate pr-2" title={activeToast.filename}>
              {activeToast.filename}
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveToast(null); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0 p-0.5 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {isProgressing && (
            <div className="mt-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                <span>{activeToast.isPaused ? 'Paused' : `${progress}%`}</span>
                {activeToast.totalBytes ? <span>{(activeToast.totalBytes / 1024 / 1024).toFixed(1)} MB</span> : <span>Downloading...</span>}
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          
          {!isProgressing && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {isCompleted ? 'Download completed' : isCancelled ? 'Download cancelled' : 'Download interrupted'}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-2.5 flex items-center gap-2">
            {isCompleted && activeToast.savePath && (
              <>
                <button
                  onClick={() => {
                    (window as any).electronAPI?.showDownloadInFolder?.(activeToast.savePath!);
                    setActiveToast(null);
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-cyan-600 dark:text-slate-300 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-white/5 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <FolderIcon className="w-3 h-3" />
                  Show in Folder
                </button>
                <button
                  onClick={() => {
                    (window as any).electronAPI?.openDownload?.(activeToast.savePath!);
                    setActiveToast(null);
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <FileCheck className="w-3 h-3" />
                  Open
                </button>
              </>
            )}
            
            {isProgressing && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (activeToast.isPaused) {
                      (window as any).electronAPI?.resumeDownload?.(activeToast.id);
                    } else {
                      (window as any).electronAPI?.pauseDownload?.(activeToast.id);
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 px-2 py-0.5 rounded-lg transition-colors"
                >
                  {activeToast.isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  <span>{activeToast.isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={() => (window as any).electronAPI?.cancelDownload?.(activeToast.id)}
                  className="flex items-center gap-1 text-[11px] font-medium text-red-500 hover:bg-red-500/10 px-2 py-0.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
