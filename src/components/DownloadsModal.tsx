import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, CheckCircle2, AlertCircle, FileText, Pause, Play, XCircle } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  receivedBytes: number;
  totalBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  isPaused?: boolean;
}

interface DownloadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  downloads: DownloadItem[];
  onClearDownloads: () => void;
}

export const DownloadsModal: React.FC<DownloadsModalProps> = React.memo(({
  isOpen,
  onClose,
  downloads,
  onClearDownloads
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(isOpen, onClose, containerRef);

  if (!isOpen) return null;
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            ref={containerRef}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl h-[480px] flex flex-col overflow-hidden outline-none"
            tabIndex={-1}
          >
        
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Downloads</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{downloads.length} items</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const testItem: DownloadItem = {
                      id: 'dl_' + Date.now(),
                      filename: 'sample_archive_package.zip',
                      url: 'https://example.com/files/sample_archive_package.zip',
                      receivedBytes: 15400000,
                      totalBytes: 25000000,
                      state: 'progressing'
                    };
                    downloads.unshift(testItem);
                  }}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2.5 py-1 rounded-lg transition-colors"
                >
                  + Add Sample
                </button>
                {downloads.length > 0 && (
                  <button
                    onClick={onClearDownloads}
                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    Clear List
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {downloads.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Download className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs font-medium">No downloads yet</p>
                </div>
              ) : (
                downloads.map((item) => {
                  const percent = item.totalBytes > 0 
                    ? Math.min(100, Math.round((item.receivedBytes / item.totalBytes) * 100))
                    : 0;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-800 truncate">{item.filename}</p>
                            <p className="text-[11px] text-slate-400 truncate">{item.url}</p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {item.state === 'completed' && (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </span>
                          )}
                          {item.state === 'cancelled' && (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-red-500">
                              <AlertCircle className="w-3.5 h-3.5" /> Failed
                            </span>
                          )}
                          {item.state === 'progressing' && (
                            <span className="text-[11px] font-medium text-blue-600">{percent}%</span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {item.state === 'progressing' && (
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>
                          {formatBytes(item.receivedBytes)} {item.totalBytes > 0 && `/ ${formatBytes(item.totalBytes)}`}
                        </span>
                        {item.state === 'progressing' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (item.isPaused) {
                                  (window as any).electronAPI?.resumeDownload?.(item.id);
                                } else {
                                  (window as any).electronAPI?.pauseDownload?.(item.id);
                                }
                              }}
                              className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              title={item.isPaused ? "Resume" : "Pause"}
                            >
                              {item.isPaused ? <Play className="w-3.5 h-3.5 text-blue-500" /> : <Pause className="w-3.5 h-3.5 text-blue-500" />}
                            </button>
                            <button
                              onClick={() => {
                                (window as any).electronAPI?.cancelDownload?.(item.id);
                              }}
                              className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              title="Cancel"
                            >
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
