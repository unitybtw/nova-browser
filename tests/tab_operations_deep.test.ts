import assert from 'node:assert/strict';
import type { Tab } from '../src/types/browser';

console.log('\n--- Tab Operations & Lifecycle Deep Test Suite ---');

const makeTab = (id: string, opts: Partial<Tab> = {}): Tab => ({
  id,
  url: opts.url || `https://${id}.com`,
  title: opts.title || `Tab ${id}`,
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  workspaceId: opts.workspaceId || 'default',
  isPinned: opts.isPinned ?? false,
  folderId: opts.folderId,
  lastAccessed: opts.lastAccessed || Date.now()
});

// 1. Close Tabs to the Right (with Workspace & Pinned Protection)
function closeTabsToRight(tabs: Tab[], targetId: string): { remaining: Tab[]; closed: Tab[] } {
  const targetIndex = tabs.findIndex(t => t.id === targetId);
  if (targetIndex === -1) return { remaining: tabs, closed: [] };
  const targetTab = tabs[targetIndex];
  const targetWorkspace = targetTab.workspaceId || 'default';

  const closed: Tab[] = [];
  const remaining = tabs.filter((t, index) => {
    const isSameWorkspace = (t.workspaceId || 'default') === targetWorkspace;
    if (index > targetIndex && isSameWorkspace && !t.isPinned) {
      closed.push(t);
      return false;
    }
    return true;
  });
  return { remaining, closed };
}

const testTabs1: Tab[] = [
  makeTab('t1', { isPinned: true, workspaceId: 'default' }),
  makeTab('t2', { workspaceId: 'default' }), // target
  makeTab('t3', { workspaceId: 'default' }), // should close
  makeTab('t4', { isPinned: true, workspaceId: 'default' }), // pinned, should NOT close
  makeTab('t5', { workspaceId: 'work' }), // different workspace, should NOT close
  makeTab('t6', { workspaceId: 'default' }), // should close
];

const { remaining: rem1, closed: cl1 } = closeTabsToRight(testTabs1, 't2');
assert.deepStrictEqual(cl1.map(t => t.id), ['t3', 't6'], 'Only unpinned tabs to the right in default workspace must close');
assert.deepStrictEqual(rem1.map(t => t.id), ['t1', 't2', 't4', 't5'], 'Target, pinned, and other workspace tabs must remain');

console.log('[PASS] [Tab Operations] Close tabs to right respects pinned status and workspace boundaries');

// 2. Close Other Tabs (with Workspace & Pinned Protection)
function closeOtherTabs(tabs: Tab[], keepId: string): { remaining: Tab[]; closed: Tab[] } {
  const keepTab = tabs.find(t => t.id === keepId);
  if (!keepTab) return { remaining: tabs, closed: [] };
  const keepWorkspace = keepTab.workspaceId || 'default';

  const closed: Tab[] = [];
  const remaining = tabs.filter(t => {
    const isSameWorkspace = (t.workspaceId || 'default') === keepWorkspace;
    if (t.id !== keepId && isSameWorkspace && !t.isPinned) {
      closed.push(t);
      return false;
    }
    return true;
  });
  return { remaining, closed };
}

const testTabs2: Tab[] = [
  makeTab('p1', { isPinned: true, workspaceId: 'default' }),
  makeTab('a1', { workspaceId: 'default' }), // keep target
  makeTab('a2', { workspaceId: 'default' }), // should close
  makeTab('w1', { workspaceId: 'work' }), // different workspace, should NOT close
  makeTab('a3', { workspaceId: 'default' }), // should close
];

const { remaining: rem2, closed: cl2 } = closeOtherTabs(testTabs2, 'a1');
assert.deepStrictEqual(cl2.map(t => t.id), ['a2', 'a3'], 'Only unpinned tabs in default workspace must close');
assert.deepStrictEqual(rem2.map(t => t.id), ['p1', 'a1', 'w1'], 'Target tab, pinned tab, and work workspace tabs must remain');

console.log('[PASS] [Tab Operations] Close other tabs preserves active tab, pinned tabs, and other workspaces');

// 3. Duplicate Tab Operation
function duplicateTab(tabs: Tab[], targetId: string, generateNewId: () => string): Tab[] {
  const targetIndex = tabs.findIndex(t => t.id === targetId);
  if (targetIndex === -1) return tabs;
  const target = tabs[targetIndex];
  const newTab: Tab = {
    ...target,
    id: generateNewId(),
    isPinned: false, // duplicates start unpinned
    lastAccessed: Date.now()
  };
  const updated = [...tabs];
  updated.splice(targetIndex + 1, 0, newTab);
  return updated;
}

let counter = 100;
const testTabs3: Tab[] = [makeTab('tab-A'), makeTab('tab-B')];
const duplicated = duplicateTab(testTabs3, 'tab-A', () => `tab-dup-${++counter}`);
assert.strictEqual(duplicated.length, 3, 'Duplication must increase tab count by 1');
assert.strictEqual(duplicated[1].id, 'tab-dup-101', 'Duplicate must be inserted directly after target tab');
assert.strictEqual(duplicated[1].url, 'https://tab-A.com', 'Duplicate must copy target URL');
assert.strictEqual(duplicated[1].isPinned, false, 'Duplicate must not be pinned');

console.log('[PASS] [Tab Operations] Duplicate tab inserts directly adjacent with cloned state and unpinned status');

// 4. Tab Reordering
function reorderTabs(tabs: Tab[], sourceIndex: number, destinationIndex: number): Tab[] {
  if (sourceIndex < 0 || sourceIndex >= tabs.length || destinationIndex < 0 || destinationIndex >= tabs.length) {
    return tabs;
  }
  const result = Array.from(tabs);
  const [removed] = result.splice(sourceIndex, 1);
  result.splice(destinationIndex, 0, removed);
  return result;
}

const reordered = reorderTabs(testTabs3, 0, 1);
assert.deepStrictEqual(reordered.map(t => t.id), ['tab-B', 'tab-A'], 'Tabs must be swapped cleanly');
assert.deepStrictEqual(reorderTabs(testTabs3, -1, 5), testTabs3, 'Out of bounds reorder must return unchanged array');

console.log('[PASS] [Tab Operations] Tab reordering with bounds checking verified');

// 5. Split Partner Decoupling on Tab Closure (closeOtherTabs & closeTabsToRight)
function closeOtherTabsWithDecouple(tabs: Tab[], keepId: string): Tab[] {
  const keepTab = tabs.find(t => t.id === keepId);
  if (!keepTab) return tabs;
  const keepWorkspace = keepTab.workspaceId || 'default';
  const toClose = tabs.filter(t => (t.workspaceId || 'default') === keepWorkspace && t.id !== keepId && !t.isPinned);
  const closeIds = new Set(toClose.map(t => t.id));
  return tabs
    .filter(t => !closeIds.has(t.id))
    .map(t => (t.splitWith && closeIds.has(t.splitWith)) ? { ...t, splitWith: undefined } : t);
}

function closeTabsToRightWithDecouple(tabs: Tab[], targetId: string): Tab[] {
  const targetIndex = tabs.findIndex(t => t.id === targetId);
  if (targetIndex === -1) return tabs;
  const targetTab = tabs[targetIndex];
  const targetWorkspace = targetTab.workspaceId || 'default';
  const wsTabs = tabs.filter(t => (t.workspaceId || 'default') === targetWorkspace);
  const wsTargetIdx = wsTabs.findIndex(t => t.id === targetId);
  const toClose = wsTabs.slice(wsTargetIdx + 1).filter(t => !t.isPinned);
  const closeIds = new Set(toClose.map(t => t.id));
  return tabs
    .filter(t => !closeIds.has(t.id))
    .map(t => (t.splitWith && closeIds.has(t.splitWith)) ? { ...t, splitWith: undefined } : t);
}

const splitTestTabs: Tab[] = [
  makeTab('tab-kept', { splitWith: 'tab-closed-1', workspaceId: 'default' }),
  makeTab('tab-closed-1', { splitWith: 'tab-kept', workspaceId: 'default' }),
  makeTab('tab-closed-2', { workspaceId: 'default' }),
  makeTab('tab-other-ws', { workspaceId: 'dev' }),
];

const afterCloseOther = closeOtherTabsWithDecouple(splitTestTabs, 'tab-kept');
assert.strictEqual(afterCloseOther.length, 2, 'Must keep target tab and other workspace tab');
assert.strictEqual(afterCloseOther.find(t => t.id === 'tab-kept')?.splitWith, undefined, 'Kept tab must have splitWith cleared when partner is closed');

const splitRightTabs: Tab[] = [
  makeTab('tab-L', { splitWith: 'tab-R', workspaceId: 'default' }),
  makeTab('tab-R', { splitWith: 'tab-L', workspaceId: 'default' }),
];
const afterCloseRight = closeTabsToRightWithDecouple(splitRightTabs, 'tab-L');
assert.strictEqual(afterCloseRight.length, 1);
assert.strictEqual(afterCloseRight[0].id, 'tab-L');
assert.strictEqual(afterCloseRight[0].splitWith, undefined, 'Closing right split partner must decouple left tab splitWith');

console.log('[PASS] [Tab Operations] splitWith decoupling on tab closure verified');

// 6. Workspace-scoped tab switching
function getNextWorkspaceTab(tabs: Tab[], currentActiveId: string, activeWorkspaceId: string, shiftKey: boolean): string | null {
  const currentTabs = tabs.filter(t => (t.workspaceId || 'default') === activeWorkspaceId);
  if (currentTabs.length <= 1) return null;
  const currentIndex = currentTabs.findIndex(t => t.id === currentActiveId);
  let nextIndex = 0;
  if (shiftKey) {
    nextIndex = currentIndex <= 0 ? currentTabs.length - 1 : currentIndex - 1;
  } else {
    nextIndex = currentIndex >= currentTabs.length - 1 ? 0 : currentIndex + 1;
  }
  return currentTabs[nextIndex].id;
}

const multiWsTabs: Tab[] = [
  makeTab('w1-t1', { workspaceId: 'work' }),
  makeTab('w1-t2', { workspaceId: 'work' }),
  makeTab('w2-t1', { workspaceId: 'personal' }),
  makeTab('w1-t3', { workspaceId: 'work' }),
];

assert.strictEqual(getNextWorkspaceTab(multiWsTabs, 'w1-t1', 'work', false), 'w1-t2');
assert.strictEqual(getNextWorkspaceTab(multiWsTabs, 'w1-t2', 'work', false), 'w1-t3');
assert.strictEqual(getNextWorkspaceTab(multiWsTabs, 'w1-t3', 'work', false), 'w1-t1'); // wraps around within 'work'
assert.strictEqual(getNextWorkspaceTab(multiWsTabs, 'w1-t1', 'work', true), 'w1-t3'); // shift-tab backwards in 'work'
assert.strictEqual(getNextWorkspaceTab(multiWsTabs, 'w2-t1', 'personal', false), null); // only 1 tab in personal, no cycle

console.log('[PASS] [Tab Operations] Workspace-scoped tab switching verified');

