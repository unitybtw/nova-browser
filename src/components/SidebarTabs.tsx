import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Globe, VolumeX, Volume2 } from 'lucide-react';
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

// Tab Peek Popover rendered via Portal to escape Framer Motion's transform context
const TabPeekPortal: React.FC<{
  tab: Tab | null;
  pos: { top: number; left: number };
}> = ({ tab, pos }) => {
  if (!tab || !tab.thumbnail) return null;

  return createPortal(
    <AnimatePresence>
      {tab && tab.thumbnail && (
        <motion.div
          key="tab-peek"
          initial={{ opacity: 0, x: -12, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -8, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="pointer-events-none bg-white dark:bg-slate-800"
          style={{
            position: 'fixed',
            top: Math.min(pos.top, window.innerHeight - 220),
            left: pos.left,
            zIndex: 99999,
            width: 272,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis">
              {tab.favicon && <img src={tab.favicon} alt="" style={{ width: 12, height: 12, marginRight: 6, display: 'inline', verticalAlign: 'middle', borderRadius: 2 }} />}
              {tab.title || tab.url || 'New Tab'}
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-900 overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <img
              src={tab.thumbnail}
              alt="Tab preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const SidebarTabs: React.FC<SidebarTabsProps> = React.memo(({
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
  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null);
  const [hoverPos, setHoverPos] = useState({ top: 0, left: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (tab: Tab, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoverPos({ top: rect.top, left: rect.right + 10 });

    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTab(tab);
    }, 350);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredTab(null);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return (
    <>
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
                  onMouseEnter={(e) => handleMouseEnter(tab, e)}
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
                    {tab.isMuted ? (
                      <button
                        onClick={(e) => onToggleMuteTab(tab.id, e)}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-red-500"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                      </button>
                    ) : tab.isPlayingAudio ? (
                      <div className="flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof (window as any).executeMcpAction === 'function') {
                              // We can just trigger the PIP via the MCP action or we should pass onTogglePip.
                              // Wait, SidebarTabs doesn't have onTogglePip. Let's just dispatch an event or click a hidden button.
                              // Since we don't have onTogglePip in SidebarTabs props, we can select the webview directly.
                              const webview = document.querySelector(`webview[data-tab-id="${tab.id}"]`) as any;
                              if (webview) {
                                webview.executeJavaScript(`
                                  (() => {
                                    const videos = Array.from(document.querySelectorAll('video'));
                                    const target = videos.find(v => !v.paused) || videos[0];
                                    if (!target) {
                                      throw new Error("No video found on page!");
                                    }
                                    if (document.pictureInPictureElement) {
                                      return document.exitPictureInPicture();
                                    } else {
                                      return target.requestPictureInPicture();
                                    }
                                  })();
                                `, true).catch((e: any) => alert("Picture-in-Picture Error: " + (e.message || e)));
                              }
                            }
                          }}
                          className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500"
                          title="Picture in Picture"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-picture-in-picture-2"><path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"/><rect width="10" height="7" x="12" y="13" rx="2"/></svg>
                        </button>
                        <button
                          onClick={(e) => onToggleMuteTab(tab.id, e)}
                          className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-500"
                        >
                          <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                        </button>
                      </div>
                    ) : null}
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

      {/* Tab Peek rendered via Portal — escapes Framer Motion transform context */}
      <TabPeekPortal tab={hoveredTab} pos={hoverPos} />
    </>
  );
});
