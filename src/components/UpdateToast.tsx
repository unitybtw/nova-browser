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

export const UpdateToast: React.FC = () => {
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
          setError(typeof err === 'string' ? err : 'Update error encountered');
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
      }
    } catch (e: any) {
      setError(e?.message || 'Download failed');
      setIsDownloading(false);
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
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          className="fixed bottom-6 right-6 z-[9999] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 p-4 rounded-2xl shadow-2xl flex items-start gap-3.5 max-w-sm w-full"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center shrink-0">
            {isDownloading || isInstalling ? (
              <RefreshCw className="w-5 h-5 text-cyan-600 dark:text-cyan-400 animate-spin" />
            ) : error ? (
              <AlertCircle className="w-5 h-5 text-rose-500" />
            ) : (
              <ArrowUpCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            )}
          </div>

          <div className="flex-1 pt-0.5 min-w-0">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5 truncate">
              {isDownloaded
                ? 'Update Ready to Install'
                : isDownloading
                ? 'Downloading Update...'
                : error
                ? 'Update Warning'
                : 'Update Available'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 leading-relaxed">
              {error
                ? error
                : isDownloaded
                ? `Version ${version} has been prepared and is ready to install.`
                : isDownloading
                ? `Fetching version ${version} from GitHub Releases...`
                : `${releaseName || `Version ${version}`} is available.`}
            </p>

            {isDownloading && downloadProgress && (
              <div className="mb-3 space-y-1.5">
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, downloadProgress.percent))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
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
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
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
                  onClick={handleDownload}
                  className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download & Install
                </button>
              ) : null}

              <button
                onClick={() => setIsVisible(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

