import type { Folder, Tab } from '../types/browser';

export const getTabWorkspaceId = (tab: Pick<Tab, 'workspaceId'>): string => tab.workspaceId || 'default';

/** Reorders only the visible workspace/folder group and preserves all other slots. */
export function reorderTabsWithinGroup(tabs: Tab[], draggedId: string, targetId: string): Tab[] {
  if (!draggedId || !targetId || draggedId === targetId) return tabs;

  const dragged = tabs.find(tab => tab.id === draggedId);
  const target = tabs.find(tab => tab.id === targetId);
  if (!dragged || !target) return tabs;

  if (
    getTabWorkspaceId(dragged) !== getTabWorkspaceId(target) ||
    dragged.folderId !== target.folderId
  ) {
    return tabs;
  }

  const groupIds = tabs
    .filter(tab =>
      getTabWorkspaceId(tab) === getTabWorkspaceId(target) &&
      tab.folderId === target.folderId
    )
    .map(tab => tab.id);
  const draggedIndex = groupIds.indexOf(draggedId);
  const targetIndex = groupIds.indexOf(targetId);
  if (draggedIndex === -1 || targetIndex === -1) return tabs;

  const reorderedGroup = [...groupIds];
  const [removed] = reorderedGroup.splice(draggedIndex, 1);
  reorderedGroup.splice(targetIndex, 0, removed);

  const groupPositions = tabs.reduce<number[]>((positions, tab, index) => {
    if (
      getTabWorkspaceId(tab) === getTabWorkspaceId(target) &&
      tab.folderId === target.folderId
    ) {
      positions.push(index);
    }
    return positions;
  }, []);
  if (groupPositions.length !== reorderedGroup.length) return tabs;

  const tabsById = new Map(tabs.map(tab => [tab.id, tab]));
  const nextTabs = [...tabs];
  groupPositions.forEach((position, index) => {
    const replacement = tabsById.get(reorderedGroup[index]);
    if (replacement) nextTabs[position] = replacement;
  });
  return nextTabs;
}

/** Clears stale or cross-workspace folder references without mutating input. */
export function repairTabFolderAssignments(tabs: Tab[], folders: Folder[]): Tab[] {
  const folderById = new Map(folders.map(folder => [folder.id, folder]));
  let changed = false;
  const repaired = tabs.map(tab => {
    if (!tab.folderId) return tab;
    const folder = folderById.get(tab.folderId);
    if (!folder || folder.workspaceId !== getTabWorkspaceId(tab)) {
      changed = true;
      return { ...tab, folderId: undefined };
    }
    return tab;
  });
  return changed ? repaired : tabs;
}

export function canMoveTabToFolder(tab: Tab, folderId: string | undefined, folders: Folder[]): boolean {
  if (!folderId) return true;
  const folder = folders.find(candidate => candidate.id === folderId);
  return Boolean(folder && folder.workspaceId === getTabWorkspaceId(tab));
}
