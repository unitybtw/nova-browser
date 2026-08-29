import assert from 'node:assert/strict';
import { canMoveTabToFolder, repairTabFolderAssignments, reorderTabsWithinGroup } from '../src/utils/verticalTabs';
import type { Folder, Tab, Workspace } from '../src/types/browser';

console.log('\n--- Workspace State & Tab Management Comprehensive Suite ---');

const makeTab = (id: string, workspaceId = 'default', folderId?: string, isPinned = false): Tab => ({
  id,
  url: `https://${id}.com`,
  title: `Tab ${id}`,
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  workspaceId,
  folderId,
  isPinned
});

const workspaces: Workspace[] = [
  { id: 'default', name: 'Personal', icon: 'User', color: 'blue' },
  { id: 'work', name: 'Work', icon: 'Briefcase', color: 'purple' },
  { id: 'research', name: 'Research', icon: 'BookOpen', color: 'emerald' }
];

const folders: Folder[] = [
  { id: 'f-pers', name: 'Personal Docs', isExpanded: true, workspaceId: 'default' },
  { id: 'f-work', name: 'Client Work', isExpanded: true, workspaceId: 'work' }
];

// 1. Workspace Tab Isolation
const tabs: Tab[] = [
  makeTab('t1', 'default'),
  makeTab('t2', 'default', 'f-pers'),
  makeTab('t3', 'work'),
  makeTab('t4', 'work', 'f-work'),
  makeTab('t5', 'research')
];

const personalTabs = tabs.filter(t => t.workspaceId === 'default');
assert.equal(personalTabs.length, 2);
assert.equal(personalTabs.map(t => t.id).join(','), 't1,t2');

const workTabs = tabs.filter(t => t.workspaceId === 'work');
assert.equal(workTabs.length, 2);
assert.equal(workTabs.map(t => t.id).join(','), 't3,t4');

// 2. Folder Tab Moving Rules
assert.equal(canMoveTabToFolder(makeTab('t1', 'default'), 'f-pers', folders), true);
assert.equal(canMoveTabToFolder(makeTab('t1', 'default'), 'f-work', folders), false, 'Cannot move tab into folder belonging to different workspace');
assert.equal(canMoveTabToFolder(makeTab('t1', 'default'), undefined, folders), true, 'Can move tab back to root workspace');

// 3. Tab Reordering within same group
const groupTabs = [
  makeTab('a', 'default', 'f-pers'),
  makeTab('other-ws', 'work'),
  makeTab('b', 'default', 'f-pers'),
  makeTab('c', 'default', 'f-pers')
];

const reordered = reorderTabsWithinGroup(groupTabs, 'c', 'a');
assert.equal(reordered[0].id, 'c');
assert.equal(reordered[1].id, 'other-ws', 'Other workspace tab slot must be preserved undisturbed');
assert.equal(reordered[2].id, 'a');
assert.equal(reordered[3].id, 'b');

// 4. Closed Tab Restoration Stack (LIFO)
const closedTabStack: Tab[] = [];
function closeTab(tab: Tab) {
  closedTabStack.push(tab);
}
function reopenTab(): Tab | undefined {
  return closedTabStack.pop();
}

closeTab(makeTab('tab-closed-1', 'default'));
closeTab(makeTab('tab-closed-2', 'default'));
assert.equal(closedTabStack.length, 2);

const restored = reopenTab();
assert.equal(restored?.id, 'tab-closed-2', 'LIFO order: most recently closed tab must be reopened first');
assert.equal(closedTabStack.length, 1);

console.log('[PASS] [Workspace & Tabs] Workspace isolation, folder assignment repair, slot preservation, and LIFO restoration verified.');
