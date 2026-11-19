import React, { useState, useMemo, useCallback } from 'react';
import { Clock, Search, Trash2, Globe, Calendar, ArrowUpRight } from 'lucide-react';
import { HistoryItem } from '../types/browser';
import { useTranslation, t as translateFn } from '../services/i18n';

// Building an Intl.DateTimeFormat is expensive: doing it once per row per render
// dominated the cost of long history lists. The instance only depends on the
// locale, so it is cached module level and reused for every row.
// The options must stay in sync with the default used by i18n.formatTime so the
// rendered string stays byte-for-byte identical.
const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getTimeFormatter = (locale: string): Intl.DateTimeFormat => {
  let formatter = timeFormatterCache.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, TIME_FORMAT_OPTIONS);
    timeFormatterCache.set(locale, formatter);
  }
  return formatter;
};

const formatTimeForLocale = (timestamp: number, locale: string): string => {
  // Intl.DateTimeFormat#format throws on a non-finite timestamp, while
  // toLocaleTimeString renders "Invalid Date". Keep the previous output.
  if (!Number.isFinite(timestamp)) {
    return new Date(timestamp).toLocaleTimeString(locale, TIME_FORMAT_OPTIONS);
  }
  return getTimeFormatter(locale).format(new Date(timestamp));
};

interface HistoryPageProps {
  history: HistoryItem[];
  onNavigate: (url: string) => void;
  onClearHistory: (timeframe?: string) => void;
  onRemoveHistoryItem: (id: string) => void;
}

interface HistoryRowItemProps {
  item: HistoryItem;
  t: typeof translateFn;
  formatTime: (ts: number) => string;
  onNavigate: (url: string) => void;
  onRemoveHistoryItem: (id: string) => void;
}

// Memoized rows must not subscribe to i18n themselves: N rows would mean N
// useState + N language listeners. `t` is a module level function (stable
// reference) and is passed down from the single useTranslation() in the parent.
const HistoryRowItem: React.FC<HistoryRowItemProps> = React.memo(({
  item,
  t,
  formatTime,
  onNavigate,
  onRemoveHistoryItem
}) => {
  const [faviconFailed, setFaviconFailed] = useState(false);

  return (
    <div className="group flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-neutral-50/70 dark:hover:bg-white/[0.02] transition-colors">
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center text-neutral-400 dark:text-neutral-500 shrink-0 overflow-hidden">
          {item.favicon && !faviconFailed ? (
            <img
              src={item.favicon}
              className="w-4 h-4 rounded-xs object-contain"
              alt=""
              onError={() => setFaviconFailed(true)}
            />
          ) : (
            <Globe className="w-3.5 h-3.5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p
              onClick={() => onNavigate(item.url)}
              className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100 truncate cursor-pointer hover:underline transition-colors"
              title={item.title || item.url}
            >
              {item.title || item.url}
            </p>
            <button
              type="button"
              onClick={() => onNavigate(item.url)}
              className="p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.07] rounded-md transition-colors cursor-pointer"
              title={t('history.openUrl')}
              aria-label={t('history.openUrl')}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 truncate mt-0.5" title={item.url}>
            {item.url}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 pl-4">
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap font-mono tabular-nums">
          {formatTime(item.timestamp)}
        </span>
        <button
          type="button"
          onClick={() => onRemoveHistoryItem(item.id)}
          className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
          title={t('history.removeFromHistory')}
          aria-label={t('history.removeFromHistory')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

export const HistoryPage: React.FC<HistoryPageProps> = ({
  history,
  onNavigate,
  onClearHistory,
  onRemoveHistoryItem
}) => {
  const { t, locale } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearTimeframe, setClearTimeframe] = useState('all');
  const [visibleCount, setVisibleCount] = useState(100);

  const filteredHistory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return history.filter(item => !query ||
      item.title?.toLowerCase().includes(query) ||
      item.url?.toLowerCase().includes(query)
    ).sort((a, b) => b.timestamp - a.timestamp);
  }, [history, searchTerm]);

  const groupedHistory = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const lastWeekStart = todayStart - 7 * 86400000;

    const todayLabel = t('history.today');
    const yesterdayLabel = t('history.yesterday');
    const last7DaysLabel = t('history.last7Days');
    const olderLabel = t('history.older');

    const groups: { [key: string]: HistoryItem[] } = {
      [todayLabel]: [],
      [yesterdayLabel]: [],
      [last7DaysLabel]: [],
      [olderLabel]: []
    };

    filteredHistory.forEach(item => {
      const tTime = item.timestamp;
      if (tTime >= todayStart) {
        groups[todayLabel].push(item);
      } else if (tTime >= yesterdayStart) {
        groups[yesterdayLabel].push(item);
      } else if (tTime >= lastWeekStart) {
        groups[last7DaysLabel].push(item);
      } else {
        groups[olderLabel].push(item);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [filteredHistory, t]);

  // Stable across renders: only the locale can invalidate it, so HistoryRowItem
  // memoization actually holds instead of failing on a fresh closure every time.
  const formatTime = useCallback(
    (timestamp: number) => formatTimeForLocale(timestamp, locale),
    [locale]
  );

  return (
    <div className="nova-page-enter nova-smooth-scroll w-full h-full bg-[#fbfbfc] dark:bg-[#0e0f12] overflow-y-auto flex justify-center py-9 px-6 sm:px-10 select-text">
      <div className="w-full max-w-3xl space-y-6">
        <header className="pb-5 border-b border-neutral-200/90 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-neutral-100">
              {t('history.title')}
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('history.pagesRecorded', { count: history.length })}
            </p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('history.clearBrowsingData')}
            </button>
          )}
        </header>

        {isClearModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#141518] rounded-xl shadow-2xl max-w-md w-full p-5 border border-neutral-200/90 dark:border-white/[0.1]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">{t('history.clearModalTitle')}</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('history.clearModalDesc')}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    {t('history.timeframe')}
                  </label>
                  <select
                    value={clearTimeframe}
                    onChange={(e) => setClearTimeframe(e.target.value)}
                    className="w-full bg-neutral-100/90 dark:bg-white/[0.06] border border-neutral-200/90 dark:border-white/[0.09] rounded-lg px-3 py-2 text-xs outline-none focus:border-neutral-400 dark:focus:border-white/30 text-neutral-900 dark:text-neutral-100 cursor-pointer"
                  >
                    <option value="hour">{t('history.lastHour')}</option>
                    <option value="day">{t('history.last24Hours')}</option>
                    <option value="week">{t('history.last7DaysOption')}</option>
                    <option value="month">{t('history.last4Weeks')}</option>
                    <option value="all">{t('history.allTime')}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsClearModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-neutral-200/80 dark:border-white/[0.08] transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory(clearTimeframe);
                    setIsClearModalOpen(false);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
                >
                  {t('common.clear')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(100); }}
            placeholder={t('history.searchPlaceholder')}
            className="w-full h-9 bg-white dark:bg-[#141518] border border-neutral-200/90 dark:border-white/[0.09] rounded-lg pl-9 pr-3.5 text-xs focus:outline-none focus:border-neutral-400 dark:focus:border-white/30 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-colors"
          />
        </div>

        <div className="space-y-6">
          {history.length === 0 ? (
            <div className="bg-white dark:bg-[#141518] border border-neutral-200/90 dark:border-white/[0.08] rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center text-neutral-400 mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t('history.noHistory')}</h3>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white dark:bg-[#141518] border border-neutral-200/90 dark:border-white/[0.08] rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <Search className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mb-2.5" />
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('history.noHistory')}</p>
            </div>
          ) : (
            <>
              {(() => {
                let rendered = 0;
                return groupedHistory.map(([groupLabel, items]) => {
                  const remaining = visibleCount - rendered;
                  if (remaining <= 0) return null;
                  const visibleItems = items.slice(0, remaining);
                  rendered += visibleItems.length;
                  return (
                    <div key={groupLabel} className="space-y-2">
                      <div className="flex items-center gap-1.5 px-0.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{groupLabel}</span>
                        <span className="text-[11px] font-normal text-neutral-400 tabular-nums">({items.length})</span>
                      </div>

                      <div className="bg-white dark:bg-[#141518] border border-neutral-200/90 dark:border-white/[0.08] rounded-xl overflow-hidden divide-y divide-neutral-200/80 dark:divide-white/[0.07]">
                        {visibleItems.map((item) => (
                          <HistoryRowItem
                            key={item.id}
                            item={item}
                            t={t}
                            formatTime={formatTime}
                            onNavigate={onNavigate}
                            onRemoveHistoryItem={onRemoveHistoryItem}
                          />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
              {filteredHistory.length > visibleCount && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + 100)}
                  className="w-full py-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-white dark:bg-[#141518] border border-neutral-200/90 dark:border-white/[0.08] rounded-xl hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  {t('common.showMore', { remaining: filteredHistory.length - visibleCount })}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
