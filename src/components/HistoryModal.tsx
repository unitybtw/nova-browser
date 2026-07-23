import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Search, Trash2, X, ExternalLink, Globe } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  timestamp: number;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onNavigate: (url: string) => void;
  onClearHistory: () => void;
  onRemoveHistoryItem: (id: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = React.memo(({
  isOpen,
  onClose,
  history,
  onNavigate,
  onClearHistory,
  onRemoveHistoryItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(isOpen, onClose, containerRef);

  const filteredHistory = history.filter(item => 
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.url?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl h-[550px] flex flex-col overflow-hidden outline-none"
            tabIndex={-1}
          >
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Browsing History</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{history.length} pages visited</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={onClearHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
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

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search history..."
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 dark:text-slate-100 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Clock className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">Your history is clear</h3>
                  <p className="text-sm text-slate-400 dark:text-slate-500">Pages you visit will appear here.</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No matching history found.</p>
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all cursor-pointer"
                  >
                    <button
                      onClick={() => { onClose(); onNavigate(item.url); }}
                      className="flex-1 flex items-center gap-4 text-left group-hover:translate-x-1 transition-transform"
                    >
                      <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-400 dark:text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                        {item.favicon ? (
                          <img src={item.favicon} className="w-4 h-4 rounded-sm" />
                        ) : (
                          <Globe className="w-4 h-4" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{item.title || item.url}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{item.url}</p>
                      </div>
                    </button>

                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatDate(item.timestamp)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveHistoryItem(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-200/50 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
