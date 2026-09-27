import { useState, useEffect, useRef, useMemo } from 'react';
import { Workspace, Folder } from '../types/browser';
import { safeParseArrayWithBackup } from '../utils/safeStorage';
import { isTombstonedRow } from '../services/syncService';
import { getElectronAPI } from '../utils/electronBridge';
import { logger } from '../utils/logger';

export interface UseWorkspacesOptions {
  isDemo?: boolean;
  demoFeature?: string;
}

const DEFAULT_WORKSPACES: Workspace[] = [
  { id: 'default', name: 'Personal', color: 'slate' },
  { id: 'work', name: 'Work', color: 'blue' },
  { id: 'research', name: 'Research', color: 'purple' }
];

export function useWorkspaces(options: UseWorkspacesOptions = {}) {
  // Row stores: tombstones (deleted rows) stay in these arrays so deletes can
  // be synced; the live views below are what the UI renders.
  const [folderRows, setFolders] = useState<Folder[]>(() => {
    if (options.isDemo && options.demoFeature === 'vertical_tabs') {
      return [
        { id: 'f1', name: 'Frontend Stack', isExpanded: true, workspaceId: 'default' },
        { id: 'f2', name: 'Research Papers', isExpanded: false, workspaceId: 'default' }
      ];
    }
    if (options.isDemo) return [];
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('folders_session') : null;
    return safeParseArrayWithBackup<Folder>('folders_session', saved, []);
  });

  const [workspaceRows, setWorkspaces] = useState<Workspace[]>(() => {
    if (options.isDemo) return DEFAULT_WORKSPACES;
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('workspaces_session') : null;
    const parsed = safeParseArrayWithBackup<Workspace>('workspaces_session', saved, []);
    return parsed.length > 0 ? parsed : DEFAULT_WORKSPACES;
  });

  const folders = useMemo(() => folderRows.filter(row => !isTombstonedRow(row)), [folderRows]);
  const workspaces = useMemo(() => workspaceRows.filter(row => !isTombstonedRow(row)), [workspaceRows]);

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    if (options.isDemo) return 'default';
    return (typeof localStorage !== 'undefined' ? localStorage.getItem('active_workspace_session') : null) || 'default';
  });

  const activeWorkspaceIdRef = useRef(activeWorkspaceId);
  useEffect(() => { activeWorkspaceIdRef.current = activeWorkspaceId; }, [activeWorkspaceId]);

  const workspacesRef = useRef(workspaceRows);
  useEffect(() => { workspacesRef.current = workspaceRows; }, [workspaceRows]);

  // Debounced 500ms workspace persistence with error logging (no silent failure)
  useEffect(() => {
    if (options.isDemo) return;
    const timer = setTimeout(() => {
      try {
        const serialized = JSON.stringify(workspaceRows);
        localStorage.setItem('workspaces_session', serialized);
        getElectronAPI()?.storeSet?.('workspaces_session', serialized);
      } catch (err) {
        logger.warn('useWorkspaces', 'Failed to persist workspaces to storage', err);
      }
      try {
        localStorage.setItem('active_workspace_session', activeWorkspaceId);
      } catch (err) {
        logger.warn('useWorkspaces', 'Failed to persist active_workspace_session to storage', err);
      }
      try {
        const serializedFolders = JSON.stringify(folderRows);
        localStorage.setItem('folders_session', serializedFolders);
        getElectronAPI()?.storeSet?.('folders_session', serializedFolders);
      } catch (err) {
        logger.warn('useWorkspaces', 'Failed to persist folders to storage', err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [workspaceRows, activeWorkspaceId, folderRows, options.isDemo]);

  useEffect(() => {
    if (workspaces.length === 0) return;
    if (!workspaces.some(workspace => workspace.id === activeWorkspaceId)) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  return {
    folders,
    folderRows,
    setFolders,
    workspaces,
    workspaceRows,
    setWorkspaces,
    workspacesRef,
    activeWorkspaceId,
    setActiveWorkspaceId,
    activeWorkspaceIdRef
  };
}
