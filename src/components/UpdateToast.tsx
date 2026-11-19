import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, X, ArrowUpCircle, AlertCircle } from 'lucide-react';

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const UpdateToast: React.FC = React.memo(() => {
  const [isVisible, setIsVisible] = useState(false);
  const [version, setVersion] = useState('');
  const [releaseName, setReleaseName] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const api = window.electronAPI;

    if (api) {
      if (api.onUpdateAvailable) {
        unsubs.push(api.onUpdateAvailable((_: any, info: any) => {
          setVersion(info?.version || 'new');
          setReleaseName(info?.releaseName || '');
          setIsDownloaded(false);
          setIsDownloading(false);
          setError(null);
          setIsVisible(true);
        }));
      }

      if (api.onUpdateDownloadProgress) {
        unsubs.push(api.onUpdateDownloadProgress((_: any, progress: any) => {
          setIsDownloading(true);
          setIsDownloaded(false);
          setDownloadProgress(progress);
          setIsVisible(true);
        }));
      }

      if (api.onUpdateDownloaded) {
        unsubs.push(api.onUpdateDownloaded((_: any, info: any) => {
          setVersion(info?.version || 'new');
          if (info?.releaseName) setReleaseName(info.releaseName);
          setIsDownloading(false);
          setIsDownloaded(true);
          setError(null);
          setIsVisible(true);
        }));
      }

      if (api.onUpdateError) {
        unsubs.push(api.onUpdateError((_: any, err: any) => {
          setIsDownloading(false);
          setIsInstalling(false);
          setError(typeof err === 'string' ? err : (err?.message || 'Update error encountered'));
          setIsVisible(true);
        }));
      }
    }

    return () => unsubs.forEach(u => u());
  }, []);

  const handleDownload = async () => {
    const api = window.electronAPI;
    if (!api?.downloadUpdate) return;
    setIsDownloading(true);
    setError(null);
    try {
      const res = await api.downloadUpdate();
      if (!res.success && res.error) {
        setError(res.error);
        setIsDownloading(false);
        setIsVisible(true);
      }
    } catch (e: any) {
      setError(e?.message || 'Download failed');
      setIsDownloading(false);
      setIsVisible(true);
    }
  };

  const handleInstall = async () => {
    const api = window.electronAPI;
    if (api?.installUpdate) {
      setIsInstalling(true);
      try {
        await api.installUpdate();
      } catch (e: any) {
        setError(e?.message || 'Install failed');
        setIsInstalling(false);
        setIsVisible(true);
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="alert"
          aria-live="assertive"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed bottom-5 right-5 z-[9999] bg-white/95 dark:bg-[#141518]/95 backdrop-blur-xl border border-neutral-200/90 dark:border-white/[0.1] p-3.5 rounded-xl shadow-2xl flex items-start gap-3 max-w-sm w-full"
        >
          <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center shrink-0">
            {isDownloading || isInstalling ? (
              <RefreshCw className="w-4 h-4 text-neutral-700 dark:text-neutral-200 animate-spin" />
            ) : error ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : (
              <ArrowUpCircle className="w-4 h-4 text-neutral-700 dark:text-neutral-200" />
            )}
          </div>

          <div className="flex-1 pt-0.5 min-w-0">
            <h3 className="text-xs font-semibold text-neutral-950 dark:text-neutral-100 mb-0.5 truncate">
              {isDownloaded
                ? 'Update Ready to Install'
                : isDownloading
                ? 'Downloading Update...'
                : error
                ? 'Update Warning'
                : 'Update Available'}
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2.5 leading-relaxed">
              {error
                ? error
                : isDownloaded
                ? `Version ${version} has been prepared and is ready to install.`
                : isDownloading
                ? `Fetching version ${version} from GitHub Releases...`
                : `${releaseName || `Version ${version}`} is available.`}
            </p>

            {isDownloading && downloadProgress && (
              <div className="mb-2.5 space-y-1">
                <div className="w-full bg-neutral-200 dark:bg-white/[0.1] h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-neutral-900 dark:bg-white h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, downloadProgress.percent))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
                  <span>{Math.round(downloadProgress.percent)}%</span>
                  {downloadProgress.total > 0 && (
                    <span>
                      {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
                      {downloadProgress.bytesPerSecond > 0 && ` (${formatBytes(downloadProgress.bytesPerSecond)}/s)`}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              {isDownloaded ? (
                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 disabled:opacity-50 text-white dark:text-neutral-950 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isInstalling ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {isInstalling ? 'Relaunching...' : 'Restart & Update'}
                </button>
              ) : !isDownloading ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download & Install
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setIsVisible(false)}
                className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-neutral-200/80 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-md transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

