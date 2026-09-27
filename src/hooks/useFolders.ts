import { useCallback, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import type { Folder, Tab } from '../types/browser';
import { generateId } from '../utils/idGenerator';
import { isTombstonedRow } from '../services/syncService';
import { canMoveTabToFolder } from '../utils/verticalTabs';

export interface UseFoldersOptions {
  folders: Folder[];
  setFolders: Dispatch<SetStateAction<Folder[]>>;
  activeWorkspaceId: string;
  tabsRef: MutableRefObject<Tab[]>;
  setTabs: Dispatch<SetStateAction<Tab[]>>;
}

export function useFolders({
  folders,
  setFolders,
  activeWorkspaceId,
  tabsRef,
  setTabs,
}: UseFoldersOptions) {
  const handleCreateFolder = useCallback(() => {
    const newFolder: Folder = {
      id: generateId('folder'),
      name: 'New Folder',
      isExpanded: true,
      workspaceId: activeWorkspaceId
    };
    setFolders(prev => [...prev, newFolder]);
  }, [activeWorkspaceId, setFolders]);

  const handleToggleFolder = useCallback((folderId: string) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f));
  }, [setFolders]);

  const handleRenameFolder = useCallback((folderId: string, name: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: trimmed.slice(0, 100) } : f));
  }, [setFolders]);

  const handleDeleteFolder = useCallback((folderId: string) => {
    setFolders(prev => {
      const target = prev.find(f => f.id === folderId);
      if (!target) return prev;
      if (isTombstonedRow(target)) return prev;
      // Soft delete — the row keeps its id and becomes a tombstone so the
      // delete is pushed on the next sync and can suppress the copy other
      // devices still hold. It leaves the folder list immediately.
      const deletedAt = Date.now();
      return prev.map(f => f === target ? { ...f, deletedAt } : f);
    });
    // Remove folderId from all tabs that were in this folder
    setTabs(prev => prev.map(t => t.folderId === folderId ? { ...t, folderId: undefined } : t));
  }, [setFolders, setTabs]);

  const handleMoveTabToFolder = useCallback((tabId: string, folderId?: string) => {
    const targetTab = tabsRef.current.find(tab => tab.id === tabId);
    if (!targetTab) return;

    if (!canMoveTabToFolder(targetTab, folderId, folders)) return;

    setTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, folderId } : tab));
  }, [folders, tabsRef, setTabs]);

  return {
    handleCreateFolder,
    handleToggleFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleMoveTabToFolder,
  };
}
