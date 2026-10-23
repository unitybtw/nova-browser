import { canMoveTabToFolder, getSidebarTabRows, repairTabFolderAssignments, reorderTabsWithinGroup } from '../src/utils/verticalTabs';
import type { Folder, Tab } from '../src/types/browser';

const tab = (id: string, workspaceId = 'default', folderId?: string): Tab => ({
  id,
  url: `https://${id}.example.com`,
  title: id,
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  workspaceId,
  folderId
});

const folders: Folder[] = [
  { id: 'frontend', name: 'Frontend', isExpanded: true, workspaceId: 'default' },
  { id: 'work-folder', name: 'Work', isExpanded: true, workspaceId: 'work' }
];

const grouped = [
  tab('a', 'default', 'frontend'),
  tab('b', 'work'),
  tab('c', 'default', 'frontend'),
  tab('d', 'default')
];
const reordered = reorderTabsWithinGroup(grouped, 'c', 'a');
if (reordered.map(item => item.id).join(',') !== 'c,b,a,d') {
  throw new Error(`Expected only the visible folder group to reorder, got ${reordered.map(item => item.id).join(',')}`);
}
if (reorderTabsWithinGroup(grouped, 'a', 'b') !== grouped) {
  throw new Error('Cross-workspace reorder must be rejected');
}
if (reorderTabsWithinGroup(grouped, 'a', 'd') !== grouped) {
  throw new Error('Cross-folder reorder must be rejected');
}

const repaired = repairTabFolderAssignments([
  tab('valid', 'default', 'frontend'),
  tab('missing', 'default', 'does-not-exist'),
  tab('cross-workspace', 'work', 'frontend')
], folders);
if (repaired[0].folderId !== 'frontend' || repaired[1].folderId || repaired[2].folderId) {
  throw new Error('Stale or cross-workspace folder assignments were not repaired');
}
if (!canMoveTabToFolder(tab('ok', 'default'), 'frontend', folders)) {
  throw new Error('Valid same-workspace folder move was rejected');
}
if (canMoveTabToFolder(tab('blocked', 'default'), 'work-folder', folders)) {
  throw new Error('Cross-workspace folder move was accepted');
}
if (!canMoveTabToFolder(tab('root', 'default'), undefined, folders)) {
  throw new Error('Moving a tab back to the root list was rejected');
}

console.log('[PASS] [Vertical Tabs] Reorder, workspace isolation, folder repair, and folder move validation');

// Every tab remains represented, including split pairs separated by pinning.
const left = { ...tab('left'), splitWith: 'right' };
const right = { ...tab('right'), splitWith: 'left' };
const rows = getSidebarTabRows([left, right, tab('single')]);
if (rows.length !== 2 || rows[0].splitTab?.id !== 'right' || rows[1].tab.id !== 'single') {
  throw new Error('Mutual split partners in the same section must share one row');
}
if (getSidebarTabRows([left])[0].splitTab) {
  throw new Error('A split partner outside the section must not be pulled into it');
}
const staleRows = getSidebarTabRows([left, { ...right, splitWith: undefined }]);
if (staleRows.length !== 2 || staleRows.some(row => row.splitTab)) {
  throw new Error('One-sided stale split metadata must not hide a tab');
}
const pinnedGroup = [{ ...tab('pin'), isPinned: true }, tab('normal'), { ...tab('pin2'), isPinned: true }];
if (reorderTabsWithinGroup(pinnedGroup, 'pin', 'normal') !== pinnedGroup) {
  throw new Error('Dragging across pinned and ordinary sections must not silently reorder hidden slots');
}
if (reorderTabsWithinGroup(pinnedGroup, 'pin2', 'pin').map(t => t.id).join(',') !== 'pin2,normal,pin') {
  throw new Error('Reordering pinned tabs must preserve ordinary tab slots');
}
console.log('[PASS] [Vertical Tabs] Split section visibility and pinned reorder boundaries');

const pinnedFolders = [{ ...tab('pin-a', 'default', 'frontend'), isPinned: true }, { ...tab('pin-b'), isPinned: true }];
if (reorderTabsWithinGroup(pinnedFolders, 'pin-b', 'pin-a')[0].id !== 'pin-b') {
  throw new Error('Pinned tabs share one visible section regardless of their original folder');
}
