import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Globe, VolumeX } from 'lucide-react';
import { Tab, Workspace } from '../types/browser';

interface SidebarTabsProps {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e?: React.MouseEvent) => void;
  onNewTab: () => void;
  onToggleMuteTab: (id: string, e: React.MouseEvent) => void;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  isIncognito?: boolean;
}

export const SidebarTabs: React.FC<SidebarTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onToggleMuteTab,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  isIncognito
}) => {
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (id: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTabId(id);
    }, 400); // 400ms delay before showing peek
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredTabId(null);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return (
    <div className={`group flex flex-col h-full transition-all duration-300 w-12 hover:w-64 border-r overflow-hidden shrink-0 no-drag z-40 ${
      isIncognito 
        ? 'bg-slate-900 border-slate-800' 
        : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800'
    }`}>
      
      {/* Workspace Header */}
      <div className="flex items-center gap-3 px-3 h-12 shrink-0 border-b border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-700/50 transition-colors cursor-pointer"
           onClick={() => window.dispatchEvent(new CustomEvent('open-workspace-manager'))}
      >
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" 
             style={{ backgroundColor: activeWorkspace?.color === 'slate' ? '#64748b' : activeWorkspace?.color === 'blue' ? '#3b82f6' : activeWorkspace?.color === 'emerald' ? '#10b981' : activeWorkspace?.color === 'amber' ? '#f59e0b' : '#a855f7' }}>
          <span className="text-white text-xs font-bold">{activeWorkspace?.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">{activeWorkspace?.name}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Workspace</div>
        </div>
      </div>

      {/* Tabs List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-1 px-2 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <motion.div
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                onMouseEnter={() => handleMouseEnter(tab.id)}
                onMouseLeave={handleMouseLeave}
                className={`relative flex items-center h-10 rounded-lg cursor-pointer transition-colors group/tab ${
                  isActive
                    ? isIncognito
                      ? 'bg-slate-800 text-slate-100'
                      : 'bg-white text-blue-600 shadow-xs border border-slate-200/50 dark:bg-slate-800 dark:text-blue-400 dark:border-slate-700'
                    : isIncognito
                      ? 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                      : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-500 rounded-r-full" />
                )}

                <div className="flex items-center gap-3 px-2 flex-1 min-w-0">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {tab.isLoading ? (
                      <div className="w-4 h-4 border-2 border-blue-500/50 border-t-transparent rounded-full animate-spin" />
                    ) : tab.favicon ? (
                      <img src={tab.favicon} alt="" className="w-4 h-4 rounded-sm" />
                    ) : (
                      <Globe className="w-4 h-4 opacity-70" />
                    )}
                  </div>
                  
                  <span className="truncate text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {tab.title || tab.url || 'New Tab'}
                  </span>
                </div>

                <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:group-hover/tab:opacity-100 transition-opacity shrink-0">
                  {tab.isMuted && (
                    <button
                      onClick={(e) => onToggleMuteTab(tab.id, e)}
                      className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-red-500"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.id, e);
                      }}
                      className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                
                {/* Tab Peek Popover */}
                <AnimatePresence>
                  {hoveredTabId === tab.id && tab.thumbnail && (
                    <motion.div
                      initial={{ opacity: 0, x: -10, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-[calc(100%+8px)] top-0 z-[100] w-64 bg-white dark:bg-slate-900 shadow-2xl rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden pointer-events-none"
                    >
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{tab.title || tab.url}</div>
                      </div>
                      <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
                        <img src={tab.thumbnail} alt="Tab preview" className="w-full h-full object-cover object-top" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer / New Tab */}
      <div className="p-2 border-t border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-700/50 transition-colors">
        <button
          onClick={() => onNewTab()}
          className={`flex items-center gap-3 w-full h-10 px-2 rounded-lg transition-colors ${
            isIncognito
              ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              : 'text-slate-500 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate">
            New Tab
          </span>
        </button>
      </div>
    </div>
  );
};
