import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Globe, VolumeX, Volume2, ChevronDown, ChevronRight, Folder as FolderIcon, MoreHorizontal, FolderPlus, Check, Settings, LayoutGrid, Briefcase, User, Code, Sparkles, Gamepad2, GraduationCap, DollarSign, ShoppingCart, Clock, Download, VenetianMask, Moon } from 'lucide-react';
import { Tab, Workspace, Folder } from '../types/browser';

const WORKSPACE_COLORS: Record<string, string> = {
  slate: '#64748b',
  blue: '#3b82f6',
  emerald: '#10b981',
  purple: '#a855f7',
  rose: '#f43f5e',
  amber: '#f59e0b'
};

const WORKSPACE_ICONS: Record<string, React.ElementType> = {
  LayoutGrid, Briefcase, User, Code, Sparkles, Gamepad2, GraduationCap, DollarSign, ShoppingCart, Folder: FolderIcon
};

interface SidebarTabsProps {
  tabs: Tab[];
  folders?: Folder[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e?: React.MouseEvent) => void;
  onNewTab: () => void;
  onToggleMuteTab: (id: string, e: React.MouseEvent) => void;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  isIncognito?: boolean;
  onCreateFolder?: () => void;
  onToggleFolder?: (id: string) => void;
  onRenameFolder?: (id: string, name: string) => void;
  onDeleteFolder?: (id: string) => void;
  onMoveTabToFolder?: (tabId: string, folderId?: string) => void;
  onOpenSpotlight?: () => void;
  onTabDragStart?: () => void;
  onTabDragEnd?: () => void;
  splitTabId?: string | null;
  onCloseSplit?: () => void;
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
  isIncognito,
  folders,
  onCreateFolder,
  onToggleFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveTabToFolder,
  onOpenSpotlight,
  onTabDragStart,
  onTabDragEnd,
  splitTabId,
  onCloseSplit
}) => {
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null);
  const [hoverPos, setHoverPos] = useState({ top: 0, left: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWorkspaceDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const renderTab = (tab: Tab, isNested: boolean = false) => {
    const isActive = tab.id === activeTabId;
    const isSplitChild = tab.id === splitTabId;

    if (isSplitChild && splitTabId && activeTabId) {
      return null; // Hide the secondary tab from its normal position
    }

    if (isActive && splitTabId) {
      const splitTab = tabs.find(t => t.id === splitTabId);
      if (splitTab) {
        return (
          <motion.div
            draggable
            onDragStart={(e: any) => {
              e.dataTransfer.setData('text/plain', tab.id);
              onTabDragStart?.();
            }}
            onDragEnd={() => {
              setHoverPos({ top: 0, left: 0 });
              onTabDragEnd?.();
            }}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8, height: 0, marginTop: 0, marginBottom: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            whileHover={{ scale: 1.01 }}
            key={`split-${tab.id}-${splitTab.id}`}
            className={`relative flex items-center h-10 rounded-[10px] transition-all overflow-hidden ${isNested ? 'ml-[18px] w-[calc(100%-18px)]' : 'w-full'} ${
              isIncognito
                ? 'bg-slate-800 text-white shadow-md ring-1 ring-slate-700/50 relative after:absolute after:left-0 after:top-2 after:bottom-2 after:w-[3px] after:bg-blue-500 after:rounded-r-md'
                : 'bg-white text-slate-900 shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/60 dark:bg-slate-800/95 dark:text-white dark:ring-slate-700/50 dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] relative after:absolute after:left-0 after:top-2 after:bottom-2 after:w-[3px] after:bg-blue-500 after:rounded-r-md'
            }`}
          >
            <div className="flex w-full items-center h-full px-1 py-1">
              {/* Primary Tab Half */}
              <div 
                className="flex flex-1 items-center gap-1.5 px-1.5 min-w-0 h-full rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onSelectTab(tab.id); }}
                title={tab.title}
              >
                {tab.favicon ? <img src={tab.favicon} className="w-3.5 h-3.5 rounded-sm shrink-0" /> : <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />}
                <span className="truncate text-[11px] font-semibold">{tab.title || tab.url || 'New Tab'}</span>
              </div>

              <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 shrink-0 mx-0.5" />

              {/* Secondary Tab Half */}
              <div 
                className="flex flex-1 items-center gap-1.5 px-1.5 min-w-0 h-full rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onSelectTab(splitTab.id); }}
                title={splitTab.title}
              >
                {splitTab.favicon ? <img src={splitTab.favicon} className="w-3.5 h-3.5 rounded-sm shrink-0" /> : <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />}
                <span className="truncate text-[11px] font-semibold flex-1">{splitTab.title || splitTab.url || 'New Tab'}</span>
                
                <button onClick={(e) => { e.stopPropagation(); onCloseSplit?.(); }} className="p-0.5 rounded-sm hover:bg-red-500/20 text-slate-400 hover:text-red-500 shrink-0 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      }
    }

    return (
      <motion.div
        draggable
        onDragStart={(e: any) => {
          e.dataTransfer.setData('text/plain', tab.id);
          onTabDragStart?.();
        }}
        onDragEnd={() => {
          setHoverPos({ top: 0, left: 0 });
          onTabDragEnd?.();
        }}
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        whileHover={{ scale: 1.01 }}
        key={tab.id}
        onClick={() => onSelectTab(tab.id)}
        onMouseEnter={(e) => handleMouseEnter(tab, e)}
        onMouseLeave={handleMouseLeave}
        className={`relative flex items-center h-11 rounded-[10px] cursor-pointer transition-all overflow-hidden group/tab ${isNested ? 'ml-[18px] w-[calc(100%-18px)]' : 'w-full'} ${
          isActive
            ? isIncognito
              ? 'bg-slate-800 text-white shadow-md ring-1 ring-slate-700/50 relative after:absolute after:left-0 after:top-2 after:bottom-2 after:w-[3px] after:bg-blue-500 after:rounded-r-md'
              : 'bg-white text-slate-900 shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/60 dark:bg-slate-800/95 dark:text-white dark:ring-slate-700/50 dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] relative after:absolute after:left-0 after:top-2 after:bottom-2 after:w-[3px] after:bg-blue-500 after:rounded-r-md'
            : isIncognito
              ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              : 'text-slate-600 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-white/10'
        }`}
      >
        <div className="flex items-center gap-3 px-3 flex-1 min-w-0">
          <div className="w-6 h-6 flex items-center justify-center shrink-0 drop-shadow-sm">
            {tab.isLoading ? (
              <div className="w-[18px] h-[18px] border-2 border-slate-400/50 border-t-transparent rounded-full animate-spin" />
            ) : tab.favicon ? (
              <img src={tab.favicon} alt="" className="w-[18px] h-[18px] rounded-sm object-contain" />
            ) : tab.url === 'nova://settings' ? (
              <Settings className="w-[18px] h-[18px] opacity-70" />
            ) : tab.url === 'nova://history' ? (
              <Clock className="w-[18px] h-[18px] opacity-70" />
            ) : tab.url === 'nova://downloads' ? (
              <Download className="w-[18px] h-[18px] opacity-70" />
            ) : (tab.url === 'nova://newtab' || tab.url === 'about:blank' || tab.url === 'https://newtab') ? (
              tab.isIncognito ? <VenetianMask className="w-[18px] h-[18px] opacity-70" /> : <Plus className="w-[18px] h-[18px] opacity-70" />
            ) : (
              <Globe className="w-[18px] h-[18px] opacity-70" />
            )}
          </div>
          <span className={`truncate text-sm transition-opacity duration-200 ${isActive ? 'font-semibold' : 'font-medium'}`}>
            {tab.title || tab.url || 'New Tab'}
          </span>
        </div>
        <div className={`flex items-center gap-1 pr-2 transition-all duration-200 ease-out shrink-0 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 group-hover/tab:opacity-100 group-hover/tab:translate-x-0'}`}>
          {tab.isMuted ? (
            <button onClick={(e) => onToggleMuteTab(tab.id, e)} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-red-500">
              <VolumeX className="w-3.5 h-3.5" />
            </button>
          ) : tab.isPlayingAudio ? (
            <div className="flex items-center">
              <button onClick={(e) => { e.stopPropagation(); const wv = document.querySelector(`webview[data-tab-id="${tab.id}"]`) as any; if(wv) wv.executeJavaScript(`(() => { const v = Array.from(document.querySelectorAll('video')).find(v=>!v.paused)||document.querySelector('video'); if(!v) return; if(document.pictureInPictureElement) document.exitPictureInPicture(); else v.requestPictureInPicture(); })();`, true); }} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500" title="Picture in Picture">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"/><rect width="10" height="7" x="12" y="13" rx="2"/></svg>
              </button>
              <button onClick={(e) => onToggleMuteTab(tab.id, e)} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-500">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              </button>
            </div>
          ) : null}
          {tab.isSuspended && (
            <span className="p-1 text-indigo-400 shrink-0" title="Suspended Tab (Memory Saver)">
              <Moon className="w-3.5 h-3.5 opacity-80" />
            </span>
          )}
          {tabs.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id, e); }} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <div className={`flex flex-col h-full w-[260px] overflow-hidden shrink-0 drag-region z-40 pt-14 backdrop-blur-[40px] shadow-sm border-r ${
        isIncognito
          ? 'bg-slate-900/75 border-slate-800/80 dark'
          : 'bg-white/50 border-slate-200/50 dark:bg-slate-900/50 dark:border-slate-800/50'
      }`}>

        {/* Workspace Header & Switcher */}
        <div className="relative no-drag" ref={dropdownRef}>
          <div className="flex items-center gap-3 px-3 h-12 shrink-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
               onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
          >
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 shadow-sm"
                 style={{ backgroundColor: WORKSPACE_COLORS[activeWorkspace?.color || 'slate'] || '#64748b' }}>
              {activeWorkspace?.icon ? (
                React.createElement(WORKSPACE_ICONS[activeWorkspace.icon] || LayoutGrid, { className: "w-3.5 h-3.5 text-white" })
              ) : (
                <span className="text-white text-xs font-bold">{activeWorkspace?.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0 transition-opacity duration-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">{activeWorkspace?.name}</div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Workspace</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isWorkspaceDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>

          <AnimatePresence>
            {isWorkspaceDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute top-12 left-2 right-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden z-50 py-1"
              >
                <div className="max-h-60 overflow-y-auto no-scrollbar py-1">
                  {workspaces.map(w => (
                    <button
                      key={w.id}
                      onClick={() => {
                        onSelectWorkspace(w.id);
                        setIsWorkspaceDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left"
                    >
                      <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 shadow-sm"
                           style={{ backgroundColor: WORKSPACE_COLORS[w.color] || '#64748b' }}>
                        {w.icon ? (
                          React.createElement(WORKSPACE_ICONS[w.icon] || LayoutGrid, { className: "w-3 h-3 text-white" })
                        ) : (
                          <span className="text-white text-[10px] font-bold">{w.name.charAt(0)}</span>
                        )}
                      </div>
                      <span className={`text-[13px] flex-1 truncate ${w.id === activeWorkspaceId ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'}`}>
                        {w.name}
                      </span>
                      {w.id === activeWorkspaceId && (
                        <Check className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700/60 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setIsWorkspaceDropdownOpen(false);
                      window.dispatchEvent(new CustomEvent('open-workspace-manager'));
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Manage Workspaces
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tabs & Folders List */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-3 no-scrollbar flex flex-col gap-1 no-drag"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const tabId = e.dataTransfer.getData('text/plain');
            // Check if dropped on empty space (not on a folder)
            if (tabId && (e.target as HTMLElement).tagName === 'DIV' && (e.target === e.currentTarget)) {
              onMoveTabToFolder?.(tabId, undefined);
            }
          }}
        >
          <AnimatePresence>
            {/* Folders */}
            {folders?.filter(f => f.workspaceId === activeWorkspaceId).map(folder => {
              const folderTabs = tabs.filter(t => t.folderId === folder.id);
              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  key={folder.id}
                  className="flex flex-col gap-1"
                >
                  <div
                    onClick={() => onToggleFolder?.(folder.id)}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-black/10', 'dark:bg-white/10'); }}
                    onDragLeave={(e) => e.currentTarget.classList.remove('bg-black/10', 'dark:bg-white/10')}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-black/10', 'dark:bg-white/10');
                      const tabId = e.dataTransfer.getData('text/plain');
                      if (tabId) onMoveTabToFolder?.(tabId, folder.id);
                    }}
                    className="flex items-center gap-2 h-9 px-2 rounded-lg cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all group/folder"
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {folder.isExpanded ? <ChevronDown className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
                    </div>
                    <FolderIcon className="w-4 h-4 opacity-60 group-hover/folder:opacity-90 transition-opacity" />
                    <span className="text-[13px] font-semibold flex-1 truncate">{folder.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteFolder?.(folder.id); }}
                      className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 translate-x-2 group-hover/folder:opacity-100 group-hover/folder:translate-x-0 transition-all duration-200 ease-out text-slate-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <AnimatePresence>
                    {folder.isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative"
                      >
                        {/* Indentation Guide Line */}
                        <div className="absolute left-[13px] top-1 bottom-1 w-[2px] bg-slate-200/50 dark:bg-slate-700/50 rounded-full" />
                        <div className="flex flex-col gap-1 pb-1">
                          {folderTabs.map(tab => renderTab(tab, true))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Root Tabs (not in any folder) */}
            {tabs.filter(t => !t.folderId).map(tab => renderTab(tab, false))}
          </AnimatePresence>
        </div>

        {/* Footer / New Tab & New Folder */}
        <div className="p-3 flex items-center gap-1 no-drag mt-auto">
          <button
            onClick={() => onOpenSpotlight ? onOpenSpotlight() : onNewTab()}
            className={`flex flex-1 items-center gap-2 h-9 px-3 rounded-lg transition-colors ${
              isIncognito
                ? 'text-slate-300 hover:bg-white/10'
                : 'text-slate-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10'
            }`}
          >
            <Plus className="w-4 h-4 opacity-70" />
            <span className="text-[13px] font-medium truncate">
              New Tab
            </span>
            <span className="ml-auto text-[11px] opacity-40 font-mono">⌘T</span>
          </button>
          
          <button
            onClick={() => onCreateFolder?.()}
            className={`flex items-center justify-center shrink-0 w-9 h-9 rounded-lg transition-colors ${
              isIncognito
                ? 'text-slate-300 hover:bg-white/10'
                : 'text-slate-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10'
            }`}
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4 opacity-70" />
          </button>
        </div>
      </div>

      {/* Tab Peek rendered via Portal — escapes Framer Motion transform context */}
      <TabPeekPortal tab={hoveredTab} pos={hoverPos} />
    </>
  );
});
