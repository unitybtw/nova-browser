import React, { useState } from 'react';
import { Clock, Search, Trash2, Globe } from 'lucide-react';
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

  const filteredHistory = history.filter(item => 
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.url?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-900 overflow-y-auto flex justify-center py-10 px-4 select-text">
      <div className="w-full max-w-4xl space-y-6">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">History</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{history.length} pages visited</p>
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
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-200"
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
            placeholder="Search in history..."
            className="w-full h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/50 shadow-sm transition-shadow text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Clock className="w-16 h-16 text-slate-200 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Your history is clear</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Pages you visit will appear here.</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
              <p className="text-base font-medium text-slate-500 dark:text-slate-400">No matching history found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredHistory.map((item, idx) => (
                <div 
                  key={item.id}
                  className="group flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationFillMode: 'both', animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex-1 flex items-center gap-4 min-w-0">
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-400 dark:text-slate-500 shrink-0">
                      {item.favicon ? (
                        <img src={item.favicon} className="w-5 h-5 rounded-sm" alt="" />
                      ) : (
                        <Globe className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p 
                        onClick={() => onNavigate(item.url)}
                        className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {item.title || item.url}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5" title={item.url}>{item.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 pl-4">
                    <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{formatDate(item.timestamp)}</span>
                    <button
                      onClick={() => onRemoveHistoryItem(item.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Remove from history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
