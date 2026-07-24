import React from 'react';
import { Download, CheckCircle2, AlertCircle, FileText, Pause, Play, XCircle, Trash2 } from 'lucide-react';
// We use the interface from App directly instead of DownloadsModal

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
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-900 overflow-y-auto flex justify-center py-10 px-4 select-text">
      <div className="w-full max-w-4xl space-y-6">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Downloads</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{downloads.length} items</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const testItem: DownloadItemPage = {
                  id: 'dl_' + Date.now(),
                  filename: 'sample_archive_package.zip',
                  url: 'https://example.com/files/sample_archive_package.zip',
                  receivedBytes: 15400000,
                  totalBytes: 25000000,
                  state: 'progressing'
                };
                downloads.unshift(testItem);
              }}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 rounded-xl text-sm font-semibold transition-colors"
            >
              + Add Sample
            </button>
            {downloads.length > 0 && (
              <button
                onClick={onClearDownloads}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 rounded-xl text-sm font-semibold transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear list
              </button>
            )}
          </div>
        </header>

        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm p-4">
          <div className="flex flex-col gap-4">
            {downloads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Download className="w-16 h-16 text-slate-200 dark:text-slate-700 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No downloads yet</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Files you download will appear here.</p>
              </div>
            ) : (
              downloads.map((item) => {
                const percent = item.totalBytes > 0 
                  ? Math.min(100, Math.round((item.receivedBytes / item.totalBytes) * 100))
                  : 0;

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/80 transition-all shadow-sm hover:shadow-md space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl shrink-0">
                          <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate">{item.filename}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5" title={item.url}>{item.url}</p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {item.state === 'completed' && (
                          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">
                            <CheckCircle2 className="w-4 h-4" /> Done
                          </span>
                        )}
                        {item.state === 'cancelled' && (
                          <span className="flex items-center gap-1.5 text-sm font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-full">
                            <AlertCircle className="w-4 h-4" /> Failed
                          </span>
                        )}
                        {item.state === 'progressing' && (
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full">{percent}%</span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {item.state === 'progressing' && (
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 pt-1">
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
                            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title={item.isPaused ? "Resume" : "Pause"}
                          >
                            {item.isPaused ? <Play className="w-4 h-4 text-blue-500" /> : <Pause className="w-4 h-4 text-blue-500" />}
                          </button>
                          <button
                            onClick={() => {
                              (window as any).electronAPI?.cancelDownload?.(item.id);
                            }}
                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            title="Cancel"
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      )}
                      {item.state === 'completed' && item.savePath && (
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => (window as any).electronAPI?.showDownloadInFolder?.(item.savePath!)}
                            className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                          >
                            Show in folder
                          </button>
                          <button
                            onClick={() => (window as any).electronAPI?.openDownload?.(item.savePath!)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
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
