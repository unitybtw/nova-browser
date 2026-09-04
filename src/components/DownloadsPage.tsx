import React, { useState, useMemo } from 'react';
import { Download, CheckCircle2, AlertCircle, FileText, Pause, Play, XCircle, Trash2, Search, FolderOpen } from 'lucide-react';
import { useTranslation } from '../services/i18n';

export interface DownloadItemPage {
  id: string;
  filename: string;
  url: string;
  receivedBytes: number;
  totalBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  isPaused?: boolean;
  savePath?: string;
}

interface DownloadsPageProps {
  downloads: DownloadItemPage[];
  onClearDownloads: () => void;
}

export const DownloadsPage: React.FC<DownloadsPageProps> = ({
  downloads,
  onClearDownloads
}) => {
  const { t } = useTranslation();
  const [filterText, setFilterText] = useState('');

  const formatBytes = (bytes: number) => {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredDownloads = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return downloads;
    return downloads.filter(d => 
      (d.filename && d.filename.toLowerCase().includes(q)) ||
      (d.url && d.url.toLowerCase().includes(q))
    );
  }, [downloads, filterText]);

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0b0f17] overflow-y-auto flex justify-center py-10 px-4 select-text">
      <div className="w-full max-w-4xl space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-2xl text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-sm">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('downloads.title')}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{downloads.length} total items</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {downloads.length > 0 && (
              <button
                onClick={onClearDownloads}
                className="flex items-center gap-2 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold transition-colors border border-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
                {t('downloads.clearList')}
              </button>
            )}
          </div>
        </header>

        {downloads.length > 0 && (
          <div className="relative flex items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl px-3.5 py-2 shadow-xs">
            <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={t('downloads.searchPlaceholder')}
              className="flex-1 bg-transparent text-xs font-medium outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        )}

        <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm p-4">
          <div className="flex flex-col gap-3">
            {filteredDownloads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Download className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                  {t('downloads.noDownloads')}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {t('downloads.noDownloadsDesc')}
                </p>
              </div>
            ) : (
              filteredDownloads.map((item, idx) => {
                const percent = item.totalBytes > 0 
                  ? Math.min(100, Math.round((item.receivedBytes / item.totalBytes) * 100))
                  : 0;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/80 transition-colors shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2.5 bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 rounded-xl shrink-0 border border-cyan-500/20">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.filename}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={item.url}>{item.url}</p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {item.state === 'completed' && (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {t('downloads.completed')}
                          </span>
                        )}
                        {item.state === 'cancelled' && (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500 dark:text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                            <AlertCircle className="w-3.5 h-3.5" /> {t('downloads.cancelled')}
                          </span>
                        )}
                        {item.state === 'progressing' && (
                          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                            {item.isPaused ? t('downloads.pause') : `${percent}%`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {item.state === 'progressing' && (
                      <div className="w-full bg-slate-200 dark:bg-slate-700/80 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-cyan-500 h-full transition-[width] duration-300 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                      <span>
                        {formatBytes(item.receivedBytes)} {item.totalBytes > 0 && `/ ${formatBytes(item.totalBytes)}`}
                      </span>
                      {item.state === 'progressing' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              if (item.isPaused) {
                                (window as any).electronAPI?.resumeDownload?.(item.id);
                              } else {
                                (window as any).electronAPI?.pauseDownload?.(item.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-cyan-500 transition-colors"
                            title={item.isPaused ? t('downloads.resume') : t('downloads.pause')}
                          >
                            {item.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => {
                              (window as any).electronAPI?.cancelDownload?.(item.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                            title={t('downloads.cancel')}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {item.state === 'completed' && item.savePath && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => (window as any).electronAPI?.showDownloadInFolder?.(item.savePath!)}
                            className="text-xs font-semibold text-slate-600 hover:text-cyan-500 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors flex items-center gap-1"
                          >
                            <FolderOpen className="w-3.5 h-3.5" /> {t('downloads.openFolder')}
                          </button>
                          <button
                            onClick={() => (window as any).electronAPI?.openDownload?.(item.savePath!)}
                            className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 transition-colors"
                          >
                            Open file
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
