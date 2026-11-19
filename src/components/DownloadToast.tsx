import { performDownloadAction } from '../utils/downloadActions';
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
  FileAudio
} from 'lucide-react';
import { formatBytes } from '../utils/formatBytes';

interface DownloadToastProps {
  /** Aktif indirme öğesi; App.tsx tarafından seçilip tekil prop olarak geçirilir. */
  activeDownload: DownloadItem | null;
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'dmg', 'pkg', 'exe', 'msi', 'crx'].includes(ext)) {
    return <FileArchive className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext)) {
    return <FileImage className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />;
  }
  if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) {
    return <FileVideo className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />;
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) {
    return <FileAudio className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css', 'rs', 'go', 'cpp', 'c', 'java'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />;
  }
  return <FileText className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />;
}

export const DownloadToast: React.FC<DownloadToastProps> = React.memo(({ activeDownload }) => {
  const [speed, setSpeed] = useState<string>('');
  // Toast gövdesi artık prop'tan doğrudan türetiliyor; lokal state yalnızca
  // gerçekten "türetilemeyen" UI durumunu tutar: kullanıcı tarafından kapatılan
  // indirme id'si (Dismiss butonu + 5sn otomatik gizleme).
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [pendingDownloadId, setPendingDownloadId] = useState<string | null>(null);
  const actionInFlightRef = useRef(false);
  const activeDownloadIdRef = useRef(activeDownload?.id);
  activeDownloadIdRef.current = activeDownload?.id;
  const lastProgressRef = useRef<{ bytes: number; time: number }>({ bytes: 0, time: Date.now() });

  useEffect(() => {
    if (!activeDownload) return;

    // Calculate speed if progressing
    if (activeDownload.state === 'progressing' && activeDownload.receivedBytes !== undefined) {
      const now = Date.now();
      const elapsedSec = (now - lastProgressRef.current.time) / 1000;
      if (elapsedSec >= 0.5) {
        const bytesDiff = activeDownload.receivedBytes - lastProgressRef.current.bytes;
        if (bytesDiff > 0 && elapsedSec > 0) {
          const bytesPerSec = bytesDiff / elapsedSec;
          setSpeed(`${formatBytes(bytesPerSec)}/s`);
        }
        lastProgressRef.current = { bytes: activeDownload.receivedBytes, time: now };
      }
    }

    // Auto-hide completed/cancelled toasts after 5 seconds
    if (pendingDownloadId !== activeDownload.id && (activeDownload.state === 'completed' || activeDownload.state === 'cancelled' || activeDownload.state === 'interrupted')) {
      const timer = setTimeout(() => {
        setDismissedId(current => (current === activeDownload.id ? current : activeDownload.id));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeDownload, pendingDownloadId]);

  const activeToast = activeDownload && activeDownload.id !== dismissedId ? activeDownload : null;
  const dismissToast = () => {
    if (activeToast) setDismissedId(activeToast.id);
  };

  const handleFileAction = async (action: 'open' | 'reveal') => {
    if (!activeToast || actionInFlightRef.current) return;
    const target = activeToast;
    actionInFlightRef.current = true;
    setPendingDownloadId(target.id);
    try {
      const succeeded = await performDownloadAction(target.savePath, action);
      // A newer download may have replaced this toast while the OS dialog was open.
      if (succeeded && activeDownloadIdRef.current === target.id) setDismissedId(target.id);
    } catch {
      // Keep the notification available even if displaying the failure dialog fails.
    } finally {
      actionInFlightRef.current = false;
      setPendingDownloadId(null);
    }
  };

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
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={{ opacity: 0, y: 50, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed bottom-5 right-5 z-[9999] bg-white/95 dark:bg-[#141518]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-neutral-200/90 dark:border-white/[0.1] p-3.5 w-88 flex items-start gap-3 group"
        >
          <div className="w-9 h-9 shrink-0 rounded-lg bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center mt-0.5">
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : isCancelled || isInterrupted ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : (
              getFileIcon(activeToast.filename)
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex justify-between items-start mb-0.5">
              <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate pr-2" title={activeToast.filename}>
                {activeToast.filename}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); dismissToast(); }}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors shrink-0 p-0.5 rounded-md cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {isProgressing && (
              <div className="mt-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 font-medium mb-1.5 font-mono tabular-nums">
                  <span className="text-neutral-900 dark:text-neutral-100">
                    {activeToast.isPaused ? 'Paused' : `${progress}%`}
                  </span>
                  <span>
                    {formatBytes(activeToast.receivedBytes)} / {activeToast.totalBytes ? formatBytes(activeToast.totalBytes) : 'Unknown'}
                    {speed && !activeToast.isPaused ? ` (${speed})` : ''}
                  </span>
                </div>
                <div className="h-1 w-full bg-neutral-200 dark:bg-white/[0.1] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      activeToast.isPaused ? 'bg-amber-500' : 'bg-neutral-900 dark:bg-white'
                    }`}
                    style={{ width: `${Math.max(4, progress)}%` }}
                  />
                </div>
              </div>
            )}

            {!isProgressing && (
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5 flex items-center gap-1.5">
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
            <div className="mt-2.5 flex items-center gap-1.5">
              {isCompleted && activeToast.savePath && (
                <>
                  <button
                    type="button"
                    disabled={pendingDownloadId !== null}
                    aria-busy={pendingDownloadId === activeToast.id}
                    onClick={() => { void handleFileAction('reveal'); }}
                    className="disabled:opacity-60 disabled:cursor-wait flex items-center gap-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-neutral-200/80 dark:border-white/[0.08] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <FolderIcon className="w-3 h-3" />
                    Show in Folder
                  </button>
                  <button
                    type="button"
                    disabled={pendingDownloadId !== null}
                    aria-busy={pendingDownloadId === activeToast.id}
                    onClick={() => { void handleFileAction('open'); }}
                    className="disabled:opacity-60 disabled:cursor-wait flex items-center gap-1 text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <FileCheck className="w-3 h-3" />
                    Open File
                  </button>
                </>
              )}

              {isProgressing && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeToast.isPaused) {
                        (window as any).electronAPI?.resumeDownload?.(activeToast.id);
                      } else {
                        (window as any).electronAPI?.pauseDownload?.(activeToast.id);
                      }
                    }}
                    className="disabled:opacity-60 disabled:cursor-wait flex items-center gap-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-neutral-200/80 dark:border-white/[0.08] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {activeToast.isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
                    <span>{activeToast.isPaused ? 'Resume' : 'Pause'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => (window as any).electronAPI?.cancelDownload?.(activeToast.id)}
                    className="disabled:opacity-60 disabled:cursor-wait flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
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
});
