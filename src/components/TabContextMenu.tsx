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
import { copyTextToClipboard } from '../utils/clipboard';

/**
 * Which menu item a navigation key moves to, or `null` for a key the menu does
 * not handle. `activeIndex` is `-1` when focus is not on an item, which behaves
 * as "from the start" for ArrowDown and "from the end" for ArrowUp.
 */
export function resolveMenuFocusIndex(
  key: string,
  itemCount: number,
  activeIndex: number
): number | null {
  if (itemCount === 0) return null;
  if (key === 'ArrowDown') return activeIndex < itemCount - 1 ? activeIndex + 1 : 0;
  if (key === 'ArrowUp') return activeIndex > 0 ? activeIndex - 1 : itemCount - 1;
  if (key === 'Home') return 0;
  if (key === 'End') return itemCount - 1;
  return null;
}

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
  onNewTabRight: (target: number | string) => void;
  onReloadTab: (tabId: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onTogglePinTab: (tabId: string) => void;
  onToggleMuteTab: (tabId: string) => void;
  onBookmarkTab: (tab: Tab) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseTabsToRight: (target: number | string) => void;
  onReopenClosedTab: () => void;
  canReopenClosedTab?: boolean;
  isBookmarked?: boolean;
  totalTabs: number;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = React.memo(({
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
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Keyed on `isOpen` alone. `onClose` is a fresh inline arrow on every
  // `TopBar`/`SidebarTabs` render, so putting it in the dep list re-attached
  // both listeners — and re-focused item 1 — on every parent render. A download
  // in flight (a new `downloads` array every 100ms) or a background tab's title
  // change was enough: right-click a tab, press ArrowDown three times, press
  // Enter, and the highlighted action had already been reset to "New tab to the
  // right". The handler reads `onCloseRef`, so the identity no longer matters.
  useEffect(() => {
    if (!menuState.isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCloseRef.current();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') || []
      );
      const target = resolveMenuFocusIndex(
        e.key,
        items.length,
        items.indexOf(document.activeElement as HTMLButtonElement)
      );
      if (target === null) return;
      e.preventDefault();
      items[target]?.focus();
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState.isOpen]);

  // Initial focus is its own effect for the same reason: it must run exactly
  // once per open, never on a parent re-render. The frame is cancelled in
  // cleanup so a menu that closes again before the next paint cannot steal
  // focus on its way out.
  useEffect(() => {
    if (!menuState.isOpen) return;
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [menuState.isOpen]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

  const tab = menuState.tab;
  const tabIndex = menuState.tabIndex;
  const isRightmost = tabIndex >= totalTabs - 1;
  const hasOtherTabs = totalTabs > 1;

  // Adjust menu position to avoid overflowing viewport edges
  const menuWidth = 230;
  const menuHeight = 360;
  const adjustedX = Math.max(10, Math.min(menuState.x, window.innerWidth - menuWidth - 10));
  const adjustedY = Math.max(10, Math.min(menuState.y, window.innerHeight - menuHeight - 10));

  return (
    <AnimatePresence>
      {menuState.isOpen && tab && (
        <motion.div
          ref={menuRef}
          role="menu"
          aria-label="Tab options"
          aria-orientation="vertical"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
          className="fixed z-[99999] w-58 max-h-[calc(100vh-20px)] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 text-xs text-slate-700 dark:text-slate-200 select-none cursor-default font-medium outline-none"
        >
        {/* New Tab to Right */}
        <button
          role="menuitem"
          tabIndex={-1}
          aria-label="New tab to the right"
          onClick={() => { onNewTabRight(tab.id); onClose(); }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 opacity-70" />
            New tab to the right
          </span>
        </button>

        {/* Reload */}
        <button
          role="menuitem"
          tabIndex={-1}
          aria-label="Reload tab"
          onClick={() => { onReloadTab(tab.id); onClose(); }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <RotateCw className="w-3.5 h-3.5 opacity-70" />
            Reload
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{isMac ? '⌘R' : 'Ctrl+R'}</span>
        </button>

        {/* Duplicate Tab */}
        <button
          role="menuitem"
          tabIndex={-1}
          aria-label="Duplicate tab"
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
          role="menuitem"
          tabIndex={-1}
          aria-label={tab.isPinned ? 'Unpin tab' : 'Pin tab'}
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
          role="menuitem"
          tabIndex={-1}
          aria-label={tab.isMuted ? 'Unmute site' : 'Mute site'}
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
          role="menuitem"
          tabIndex={-1}
          aria-label={isBookmarked ? 'Edit bookmark' : 'Bookmark tab'}
          onClick={() => { onBookmarkTab(tab); onClose(); }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'text-amber-500 fill-amber-500' : 'opacity-70'}`} />
            {isBookmarked ? 'Edit bookmark' : 'Bookmark tab'}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{isMac ? '⌘D' : 'Ctrl+D'}</span>
        </button>

        {/* Copy URL */}
        <button
          role="menuitem"
          tabIndex={-1}
          aria-label="Copy page link"
          onClick={() => {
            if (tab.url && tab.url !== 'nova://newtab') {
              // `navigator.clipboard.writeText` rejects outright in a non-secure
              // context, and an unhandled rejection is a global error that takes
              // the tab strip with it. The helper falls back to execCommand and
              // reports real success.
              void copyTextToClipboard(tab.url);
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
          role="menuitem"
          tabIndex={-1}
          aria-label="Close tab"
          onClick={() => { onCloseTab(tab.id); onClose(); }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <X className="w-3.5 h-3.5 opacity-70" />
            Close tab
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{isMac ? '⌘W' : 'Ctrl+W'}</span>
        </button>

        {/* Close Other Tabs */}
        {hasOtherTabs && (
          <button
            role="menuitem"
            tabIndex={-1}
            aria-label="Close other tabs"
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
            role="menuitem"
            tabIndex={-1}
            aria-label="Close tabs to the right"
            onClick={() => { onCloseTabsToRight(tab.id); onClose(); }}
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
              role="menuitem"
              tabIndex={-1}
              aria-label="Reopen closed tab"
              onClick={() => { onReopenClosedTab(); onClose(); }}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer text-cyan-600 dark:text-cyan-400"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Undo2 className="w-3.5 h-3.5" />
                Reopen closed tab
              </span>
              <span className="text-[10px] font-mono opacity-80">{isMac ? '⇧⌘T' : 'Ctrl+Shift+T'}</span>
            </button>
          </>
        )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});
