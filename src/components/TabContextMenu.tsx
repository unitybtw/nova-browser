import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  RotateCw, 
  Copy, 
  Pin, 
  PinOff, 
  Volume2, 
  VolumeX, 
  Bookmark, 
  Link, 
  X, 
  ArrowRightToLine, 
  Trash2, 
  Undo2 
} from 'lucide-react';
import { Tab } from '../types/browser';

export interface TabContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  tab: Tab | null;
  tabIndex: number;
}

interface TabContextMenuProps {
  menuState: TabContextMenuState;
  onClose: () => void;
  onNewTabRight: (index: number) => void;
  onReloadTab: (tabId: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onTogglePinTab: (tabId: string) => void;
  onToggleMuteTab: (tabId: string) => void;
  onBookmarkTab: (tab: Tab) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseTabsToRight: (index: number) => void;
  onReopenClosedTab: () => void;
  canReopenClosedTab?: boolean;
  isBookmarked?: boolean;
  totalTabs: number;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
  menuState,
  onClose,
  onNewTabRight,
  onReloadTab,
  onDuplicateTab,
  onTogglePinTab,
  onToggleMuteTab,
  onBookmarkTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onReopenClosedTab,
  canReopenClosedTab = false,
  isBookmarked = false,
  totalTabs
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (menuState.isOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState.isOpen, onClose]);

  const tab = menuState.tab;
  const tabIndex = menuState.tabIndex;
  const isRightmost = tabIndex >= totalTabs - 1;
  const hasOtherTabs = totalTabs > 1;

  // Adjust menu position to avoid overflowing viewport edges
  const menuWidth = 230;
  const menuHeight = 360;
  const adjustedX = Math.min(menuState.x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(menuState.y, window.innerHeight - menuHeight - 10);

  return (
    <AnimatePresence>
      {menuState.isOpen && tab && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
          className="fixed z-[99999] w-58 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 text-xs text-slate-700 dark:text-slate-200 select-none cursor-default font-medium"
        >
        {/* New Tab to Right */}
        <button
          onClick={() => { onNewTabRight(tabIndex); onClose(); }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 opacity-70" />
            New tab to the right
          </span>
        </button>

        {/* Reload */}
        <button
          onClick={() => { onReloadTab(tab.id); onClose(); }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <RotateCw className="w-3.5 h-3.5 opacity-70" />
            Reload
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">⌘R</span>
        </button>

        {/* Duplicate Tab */}
        <button
          onClick={() => { onDuplicateTab(tab.id); onClose(); }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 opacity-70" />
            Duplicate tab
          </span>
        </button>

        {/* Pin / Unpin */}
        <button
          onClick={() => { onTogglePinTab(tab.id); onClose(); }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {tab.isPinned ? <PinOff className="w-3.5 h-3.5 text-cyan-500" /> : <Pin className="w-3.5 h-3.5 opacity-70" />}
            {tab.isPinned ? 'Unpin tab' : 'Pin tab'}
          </span>
        </button>

        {/* Mute / Unmute */}
        <button
          onClick={() => { onToggleMuteTab(tab.id); onClose(); }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {tab.isMuted ? <Volume2 className="w-3.5 h-3.5 text-cyan-500" /> : <VolumeX className="w-3.5 h-3.5 opacity-70" />}
            {tab.isMuted ? 'Unmute site' : 'Mute site'}
          </span>
        </button>

        {/* Bookmark Tab */}
        <button
          onClick={() => { onBookmarkTab(tab); onClose(); }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-amber-500 fill-amber-500' : 'opacity-70'}`} />
            {isBookmarked ? 'Edit bookmark' : 'Bookmark tab'}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">⌘D</span>
        </button>

        {/* Copy URL */}
        <button
          onClick={() => {
            if (tab.url && tab.url !== 'nova://newtab') {
              navigator.clipboard?.writeText(tab.url);
            }
            onClose();
          }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Link className="w-3.5 h-3.5 opacity-70" />
            Copy page link
          </span>
        </button>

        <div className="my-1 border-t border-slate-200/60 dark:border-white/10" />

        {/* Close Tab */}
        <button
          onClick={() => { onCloseTab(tab.id); onClose(); }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <X className="w-3.5 h-3.5 opacity-70" />
            Close tab
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">⌘W</span>
        </button>

        {/* Close Other Tabs */}
        {hasOtherTabs && (
          <button
            onClick={() => { onCloseOtherTabs(tab.id); onClose(); }}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-left cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 opacity-70" />
              Close other tabs
            </span>
          </button>
        )}

        {/* Close Tabs to Right */}
        {!isRightmost && (
          <button
            onClick={() => { onCloseTabsToRight(tabIndex); onClose(); }}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-left cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <ArrowRightToLine className="w-3.5 h-3.5 opacity-70" />
              Close tabs to the right
            </span>
          </button>
        )}

        {/* Reopen Closed Tab */}
        {canReopenClosedTab && (
          <>
            <div className="my-1 border-t border-slate-200/60 dark:border-white/10" />
            <button
              onClick={() => { onReopenClosedTab(); onClose(); }}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer text-cyan-600 dark:text-cyan-400"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Undo2 className="w-3.5 h-3.5" />
                Reopen closed tab
              </span>
              <span className="text-[10px] font-mono opacity-80">⇧⌘T</span>
            </button>
          </>
        )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
