import React, { useState, useMemo } from 'react';
import { Clock, Search, Trash2, Globe, Calendar, ArrowUpRight } from 'lucide-react';
import { HistoryItem } from '../App';

interface HistoryPageProps {
  history: HistoryItem[];
  onNavigate: (url: string) => void;
  onClearHistory: (timeframe?: string) => void;
  onRemoveHistoryItem: (id: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  history,
  onNavigate,
  onClearHistory,
  onRemoveHistoryItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearTimeframe, setClearTimeframe] = useState('all');
  const [failedFavicons, setFailedFavicons] = useState<Set<string>>(new Set());

  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) return history;
    const query = searchTerm.toLowerCase();
    return history.filter(item => 
      item.title?.toLowerCase().includes(query) ||
      item.url?.toLowerCase().includes(query)
    );
  }, [history, searchTerm]);

  const groupedHistory = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const lastWeekStart = todayStart - 7 * 86400000;

    const groups: { [key: string]: HistoryItem[] } = {
      'Today': [],
      'Yesterday': [],
      'Last 7 Days': [],
      'Older': []
    };

    filteredHistory.forEach(item => {
      const t = item.timestamp;
      if (t >= todayStart) {
        groups['Today'].push(item);
      } else if (t >= yesterdayStart) {
        groups['Yesterday'].push(item);
      } else if (t >= lastWeekStart) {
        groups['Last 7 Days'].push(item);
      } else {
        groups['Older'].push(item);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [filteredHistory]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleFaviconError = (id: string) => {
    setFailedFavicons(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-900 overflow-y-auto flex justify-center py-10 px-4 select-text">
      <div className="w-full max-w-4xl space-y-6">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-2xl text-cyan-600 dark:text-cyan-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">History</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{history.length} pages recorded</p>
            </div>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => setIsClearModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 rounded-xl text-sm font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear browsing data
            </button>
          )}
        </header>

        {isClearModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 border border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Clear Browsing Data</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Time range
                  </label>
                  <select 
                    value={clearTimeframe}
                    onChange={(e) => setClearTimeframe(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 dark:text-slate-200"
                  >
                    <option value="hour">Last hour</option>
                    <option value="day">Last 24 hours</option>
                    <option value="week">Last 7 days</option>
                    <option value="month">Last 4 weeks</option>
                    <option value="all">All time</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsClearModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onClearHistory(clearTimeframe);
                    setIsClearModalOpen(false);
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white shadow-sm transition-colors"
                >
                  Clear Data
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search history by title or URL..."
            className="w-full h-12 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-500/50 shadow-sm transition-shadow text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-md"
          />
        </div>

        <div className="space-y-6">
          {history.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <Clock className="w-16 h-16 text-slate-200 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Your history is clear</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Pages you visit will appear here.</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <Search className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
              <p className="text-base font-medium text-slate-500 dark:text-slate-400">No matching history found.</p>
            </div>
          ) : (
            groupedHistory.map(([groupLabel, items]) => (
              <div key={groupLabel} className="space-y-2">
                <div className="flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{groupLabel}</span>
                  <span className="text-[10px] font-normal text-slate-400">({items.length})</span>
                </div>

                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-700/50">
                  {items.map((item, idx) => (
                    <div 
                      key={item.id}
                      className="group flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <div className="flex-1 flex items-center gap-3.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900/60 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0 overflow-hidden">
                          {item.favicon && !failedFavicons.has(item.id) ? (
                            <img 
                              src={item.favicon} 
                              className="w-4 h-4 rounded-sm object-contain" 
                              alt="" 
                              onError={() => handleFaviconError(item.id)}
                            />
                          ) : (
                            <Globe className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p 
                              onClick={() => onNavigate(item.url)}
                              className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                              title={item.title || item.url}
                            >
                              {item.title || item.url}
                            </p>
                            <button
                              onClick={() => onNavigate(item.url)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-cyan-500 transition-opacity"
                              title="Open URL"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5" title={item.url}>{item.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 pl-4">
                        <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap font-mono">{formatTime(item.timestamp)}</span>
                        <button
                          onClick={() => onRemoveHistoryItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Remove from history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
