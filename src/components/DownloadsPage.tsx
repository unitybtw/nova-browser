import { performDownloadAction } from '../utils/downloadActions';
import React, { useState, useMemo } from 'react';
import { Download, CheckCircle2, AlertCircle, FileText, Pause, Play, XCircle, Trash2, Search, FolderOpen } from 'lucide-react';
import { useTranslation, t as translateFn, type SupportedLanguage } from '../services/i18n';
import { formatBytes } from '../utils/formatBytes';

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

interface DownloadRowItemProps {
  item: DownloadItemPage;
  t: typeof translateFn;
  /**
   * Not read by the component body: it exists purely to invalidate the memo
   * when the app language changes. `t` is a module level function with a
   * stable identity, so a shallow prop compare alone cannot see a language
   * switch and would leave every status label in the previous language.
   */
  language: SupportedLanguage;
  /**
   * Not read by the component body either: it is the shared module level
   * formatter, so its reference never changes and the memo below can rely on
   * that. A per-render arrow would defeat React.memo for all 100 visible rows.
   */
  formatBytes: (bytes: number) => string;
}

// Extracted so a list re-render (search keystroke, show more, parent state) can
// skip re-rendering rows whose item did not change. `t` is the module level
// translation function, so its reference never changes — `language` is compared
// explicitly to compensate for exactly that.
const DownloadRowItem: React.FC<DownloadRowItemProps> = React.memo(({
  item,
  t,
  formatBytes
}) => {
  const percent = item.totalBytes > 0
    ? Math.min(100, Math.round((item.receivedBytes / item.totalBytes) * 100))
    : 0;

  return (
    <div className="px-4 sm:px-5 py-3.5 hover:bg-neutral-50/70 dark:hover:bg-white/[0.02] transition-colors space-y-2.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-300 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100 truncate">{item.filename}</p>
            <p className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 truncate mt-0.5" title={item.url}>{item.url}</p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          {item.state === 'completed' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/12 px-2 py-0.5 rounded-md border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" /> {t('downloads.completed')}
            </span>
          )}
          {item.state === 'cancelled' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-500/12 px-2 py-0.5 rounded-md border border-red-500/20">
              <AlertCircle className="w-3 h-3" /> {t('downloads.cancelled')}
            </span>
          )}
          {item.state === 'progressing' && (
            <span className="inline-flex items-center text-[10px] font-mono font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-white/[0.07] px-2 py-0.5 rounded-md border border-neutral-200/80 dark:border-white/[0.08]">
              {item.isPaused ? t('downloads.pause') : `${percent}%`}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {item.state === 'progressing' && (
        <div className="w-full bg-neutral-200 dark:bg-white/[0.1] h-1 rounded-full overflow-hidden">
          <div
            className="bg-neutral-900 dark:bg-white h-full transition-[width] duration-300 rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
        <span className="font-mono tabular-nums">
          {formatBytes(item.receivedBytes)} {item.totalBytes > 0 && `/ ${formatBytes(item.totalBytes)}`}
        </span>
        {item.state === 'progressing' && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (item.isPaused) {
                  (window as any).electronAPI?.resumeDownload?.(item.id);
                } else {
                  (window as any).electronAPI?.pauseDownload?.(item.id);
                }
              }}
              className="p-1.5 rounded-md hover:bg-neutral-200/70 dark:hover:bg-white/[0.08] text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              title={item.isPaused ? t('downloads.resume') : t('downloads.pause')}
            >
              {item.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                (window as any).electronAPI?.cancelDownload?.(item.id);
              }}
              className="p-1.5 rounded-md hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
              title={t('downloads.cancel')}
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {item.state === 'completed' && item.savePath && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void performDownloadAction(item.savePath!, 'reveal')}
              className="text-xs font-medium text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" /> {t('downloads.openFolder')}
            </button>
            <button
              type="button"
              onClick={() => void performDownloadAction(item.savePath!, 'open')}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 transition-colors cursor-pointer"
            >
              {t('downloads.openFile')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.item === next.item &&
  prev.formatBytes === next.formatBytes &&
  prev.language === next.language
);

export const DownloadsPage: React.FC<DownloadsPageProps> = ({
  downloads,
  onClearDownloads
}) => {
  const { t, language } = useTranslation();
  const [filterText, setFilterText] = useState('');
  const [visibleCount, setVisibleCount] = useState(100);

  const filteredDownloads = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return downloads;
    return downloads.filter(d =>
      (d.filename && d.filename.toLowerCase().includes(q)) ||
      (d.url && d.url.toLowerCase().includes(q))
    );
  }, [downloads, filterText]);

  return (
    <div className="nova-page-enter nova-smooth-scroll w-full h-full bg-[#fbfbfc] dark:bg-[#0e0f12] overflow-y-auto flex justify-center py-9 px-6 sm:px-10 select-text">
      <div className="w-full max-w-3xl space-y-6">
        <header className="pb-5 border-b border-neutral-200/90 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-neutral-100">
              {t('downloads.title')}
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('downloads.totalItems', { count: downloads.length })}
            </p>
          </div>
          {downloads.length > 0 && (
            <button
              type="button"
              onClick={onClearDownloads}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium transition-colors border border-red-500/20 cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('downloads.clearList')}
            </button>
          )}
        </header>

        {downloads.length > 0 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => { setFilterText(e.target.value); setVisibleCount(100); }}
              placeholder={t('downloads.searchPlaceholder')}
              className="w-full h-9 bg-white dark:bg-[#141518] border border-neutral-200/90 dark:border-white/[0.09] rounded-lg pl-9 pr-3.5 text-xs outline-none focus:border-neutral-400 dark:focus:border-white/30 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-colors"
            />
          </div>
        )}

        <div className="bg-white dark:bg-[#141518] border border-neutral-200/90 dark:border-white/[0.08] rounded-xl overflow-hidden">
          {filteredDownloads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center text-neutral-400 mb-3">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {t('downloads.noDownloads')}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {t('downloads.noDownloadsDesc')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200/80 dark:divide-white/[0.07]">
              {filteredDownloads.slice(0, visibleCount).map((item) => (
                <DownloadRowItem key={item.id} item={item} t={t} language={language} formatBytes={formatBytes} />
              ))}
              {filteredDownloads.length > visibleCount && (
                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 100)}
                    className="w-full py-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-neutral-200/80 dark:border-white/[0.08] rounded-lg transition-colors cursor-pointer"
                  >
                    {t('common.showMore', { remaining: filteredDownloads.length - visibleCount })}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
