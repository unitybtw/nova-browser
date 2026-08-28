import { canMoveTabToFolder, repairTabFolderAssignments, reorderTabsWithinGroup } from '../src/utils/verticalTabs';
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
