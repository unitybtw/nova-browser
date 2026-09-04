import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DownloadItem } from '../types/browser';
import { 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Folder as FolderIcon, 
  X, 
  Pause, 
  Play, 
  FileCheck,
  FileArchive,
  FileCode,
  FileImage,
  FileVideo,
  FileAudio,
  Download
} from 'lucide-react';

interface DownloadToastProps {
  downloads: DownloadItem[];
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'dmg', 'pkg', 'exe', 'msi', 'crx'].includes(ext)) {
    return <FileArchive className="w-5 h-5 text-amber-500" />;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext)) {
    return <FileImage className="w-5 h-5 text-cyan-500" />;
  }
  if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) {
    return <FileVideo className="w-5 h-5 text-purple-500" />;
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) {
    return <FileAudio className="w-5 h-5 text-pink-500" />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css', 'rs', 'go', 'cpp', 'c', 'java'].includes(ext)) {
    return <FileCode className="w-5 h-5 text-emerald-500" />;
  }
  return <FileText className="w-5 h-5 text-cyan-500" />;
}

function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export const DownloadToast: React.FC<DownloadToastProps> = ({ downloads }) => {
  const [activeToast, setActiveToast] = useState<DownloadItem | null>(null);
  const [speed, setSpeed] = useState<string>('');
  const lastProgressRef = useRef<{ bytes: number; time: number }>({ bytes: 0, time: Date.now() });

  useEffect(() => {
    if (!downloads || downloads.length === 0) return;

    // Pick active progressing download first, otherwise latest item
    const progressingItem = downloads.find(d => d.state === 'progressing');
    const latestItem = progressingItem || downloads[0];

    if (!latestItem) return;

    setActiveToast(latestItem);

    // Calculate speed if progressing
    if (latestItem.state === 'progressing' && latestItem.receivedBytes !== undefined) {
      const now = Date.now();
      const elapsedSec = (now - lastProgressRef.current.time) / 1000;
      if (elapsedSec >= 0.5) {
        const bytesDiff = latestItem.receivedBytes - lastProgressRef.current.bytes;
        if (bytesDiff > 0 && elapsedSec > 0) {
          const bytesPerSec = bytesDiff / elapsedSec;
          setSpeed(`${formatBytes(bytesPerSec)}/s`);
        }
        lastProgressRef.current = { bytes: latestItem.receivedBytes, time: now };
      }
    }

    // Auto-hide completed/cancelled toasts after 5 seconds
    if (latestItem.state === 'completed' || latestItem.state === 'cancelled' || latestItem.state === 'interrupted') {
      const timer = setTimeout(() => {
        setActiveToast(current => (current?.id === latestItem.id ? null : current));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [downloads]);

  const progress = activeToast?.totalBytes 
    ? Math.min(100, Math.round((activeToast.receivedBytes / activeToast.totalBytes) * 100)) 
    : 0;
  const isCompleted = activeToast?.state === 'completed';
  const isCancelled = activeToast?.state === 'cancelled';
  const isInterrupted = activeToast?.state === 'interrupted';
  const isProgressing = activeToast?.state === 'progressing';

  return (
    <AnimatePresence>
      {activeToast && (
        <motion.div
          key={activeToast.id}
          initial={{ opacity: 0, y: 50, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 26, stiffness: 420 }}
          className="fixed bottom-6 right-6 z-[9999] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 p-3.5 w-90 flex items-start gap-3 group"
        >
          <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 flex items-center justify-center mt-0.5 shadow-xs">
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-in zoom-in-50 duration-200" />
            ) : isCancelled || isInterrupted ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : (
              getFileIcon(activeToast.filename)
            )}
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex justify-between items-start mb-0.5">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate pr-2" title={activeToast.filename}>
                {activeToast.filename}
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveToast(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0 p-0.5 rounded-md"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {isProgressing && (
              <div className="mt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1.5">
                  <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                    {activeToast.isPaused ? 'Paused' : `${progress}%`}
                  </span>
                  <span>
                    {formatBytes(activeToast.receivedBytes)} / {activeToast.totalBytes ? formatBytes(activeToast.totalBytes) : 'Unknown'}
                    {speed && !activeToast.isPaused ? ` (${speed})` : ''}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-200 ${
                      activeToast.isPaused ? 'bg-amber-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                    }`} 
                    style={{ width: `${Math.max(4, progress)}%` }} 
                  />
                </div>
              </div>
            )}
            
            {!isProgressing && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                {isCompleted ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Download complete ({formatBytes(activeToast.totalBytes || activeToast.receivedBytes)})
                  </span>
                ) : isCancelled ? (
                  <span className="text-red-500 font-medium">Download cancelled</span>
                ) : (
                  <span className="text-amber-500 font-medium">Download interrupted</span>
                )}
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
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-cyan-600 dark:text-slate-300 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-white/5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <FolderIcon className="w-3 h-3" />
                    Show in Folder
                  </button>
                  <button
                    onClick={() => {
                      (window as any).electronAPI?.openDownload?.(activeToast.savePath!);
                      setActiveToast(null);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <FileCheck className="w-3 h-3" />
                    Open File
                  </button>
                </>
              )}
              
              {isProgressing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (activeToast.isPaused) {
                        (window as any).electronAPI?.resumeDownload?.(activeToast.id);
                      } else {
                        (window as any).electronAPI?.pauseDownload?.(activeToast.id);
                      }
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {activeToast.isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
                    <span>{activeToast.isPaused ? 'Resume' : 'Pause'}</span>
                  </button>
                  <button
                    onClick={() => (window as any).electronAPI?.cancelDownload?.(activeToast.id)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:bg-red-500/10 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
