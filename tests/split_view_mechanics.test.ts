import assert from 'node:assert/strict';
import type { Tab } from '../src/types/browser';

console.log('\n--- Split View Mechanics & Pairing Test Suite ---');

const makeTab = (id: string, splitWith?: string, workspaceId = 'default'): Tab => ({
  id,
  url: `https://${id}.com`,
  title: id,
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  workspaceId,
  splitWith,
  lastAccessed: Date.now()
});

// 1. Finding Split Partner
function getSplitPartnerId(activeTab: Tab | undefined, tabs: Tab[]): string | null {
  if (!activeTab || !activeTab.splitWith) return null;
  const partner = tabs.find(t => t.id === activeTab.splitWith);
  return partner ? partner.id : null;
}

const tabs1: Tab[] = [
  makeTab('tab-1', 'tab-2'),
  makeTab('tab-2', 'tab-1'),
  makeTab('tab-3')
];

assert.strictEqual(getSplitPartnerId(tabs1[0], tabs1), 'tab-2', 'Tab 1 partner must be Tab 2');
assert.strictEqual(getSplitPartnerId(tabs1[1], tabs1), 'tab-1', 'Tab 2 partner must be Tab 1');
assert.strictEqual(getSplitPartnerId(tabs1[2], tabs1), null, 'Tab 3 has no split partner');
assert.strictEqual(getSplitPartnerId(undefined, tabs1), null, 'Undefined activeTab returns null');

console.log('[PASS] [Split View] Partner resolution and bidirectional lookup verified');

// 2. Closing Split View
function closeSplitView(tabs: Tab[], activeTabId: string, splitTabId: string | null): Tab[] {
  return tabs.map(t => {
    if (t.id === activeTabId || (splitTabId && t.id === splitTabId) || t.splitWith === activeTabId) {
      return { ...t, splitWith: undefined };
    }
    return t;
  });
}

const unlinked = closeSplitView(tabs1, 'tab-1', 'tab-2');
assert.strictEqual(unlinked[0].splitWith, undefined, 'Tab 1 must have splitWith cleared');
assert.strictEqual(unlinked[1].splitWith, undefined, 'Tab 2 must have splitWith cleared');
assert.strictEqual(unlinked.length, 3, 'Closing split view must not destroy any tabs');

console.log('[PASS] [Split View] Closing split view unlinks pair without dropping tabs');

// 3. Toggling Split View (Pairing Existing Tab or Generating New One)
function toggleSplitView(
  tabs: Tab[],
  activeTabId: string,
  splitTabId: string | null,
  activeWorkspaceId: string,
  generateNewId: () => string
): Tab[] {
  if (splitTabId) {
    return closeSplitView(tabs, activeTabId, splitTabId);
  }
  const workspaceTabs = tabs.filter(t => (t.workspaceId || 'default') === activeWorkspaceId);
  const otherTab = workspaceTabs.find(t => t.id !== activeTabId && !t.splitWith);
  if (otherTab) {
    return tabs.map(t => {
      if (t.id === activeTabId) return { ...t, splitWith: otherTab.id };
      if (t.id === otherTab.id) return { ...t, splitWith: activeTabId };
      return t;
    });
  } else {
    const newId = generateNewId();
    const newTab: Tab = {
      id: newId,
      url: 'nova://newtab',
      title: 'New Tab',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      workspaceId: activeWorkspaceId,
      splitWith: activeTabId
    };
    return [...tabs.map(t => t.id === activeTabId ? { ...t, splitWith: newId } : t), newTab];
  }
}

// Case A: Another un-split tab exists in workspace
const tabs2 = [makeTab('alpha'), makeTab('beta')];
const pairedExisting = toggleSplitView(tabs2, 'alpha', null, 'default', () => 'gamma');
assert.strictEqual(pairedExisting[0].splitWith, 'beta');
assert.strictEqual(pairedExisting[1].splitWith, 'alpha');
assert.strictEqual(pairedExisting.length, 2, 'Should pair existing tab rather than creating new');

// Case B: No other tab exists in workspace -> creates new tab
const tabs3 = [makeTab('solo', undefined, 'work')];
const pairedNew = toggleSplitView(tabs3, 'solo', null, 'work', () => 'created-tab');
assert.strictEqual(pairedNew.length, 2);
assert.strictEqual(pairedNew[0].splitWith, 'created-tab');
assert.strictEqual(pairedNew[1].id, 'created-tab');
assert.strictEqual(pairedNew[1].splitWith, 'solo');
assert.strictEqual(pairedNew[1].workspaceId, 'work');

console.log('[PASS] [Split View] Toggle split view cleanly pairs existing tabs or provisions new tab');

// 4. Split Ratio Clamping (Prevent Complete Occlusion)
function clampSplitRatio(ratio: number, min = 20, max = 80): number {
  return Math.max(min, Math.min(max, ratio));
}

assert.strictEqual(clampSplitRatio(50), 50);
assert.strictEqual(clampSplitRatio(10), 20, 'Ratio below 20% must clamp to 20%');
assert.strictEqual(clampSplitRatio(95), 80, 'Ratio above 80% must clamp to 80%');

console.log('[PASS] [Split View] Split ratio boundary clamping verified (20% - 80%)');

// 5. Real useSplitView Hook: Incognito Boundary & Suspended Tab Wake Verification
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

{
  let currentTabs: Tab[] = [
    { ...makeTab('normal-1'), isIncognito: false },
    { ...makeTab('incog-1'), isIncognito: true },
    { ...makeTab('normal-suspended'), isIncognito: false, isSuspended: true }
  ];
  const activeSplitRef = { current: null as string | null };
  const exports: any = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync('src/hooks/useSplitView.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText,
    {
      exports,
      Date,
      Boolean,
      require: (name: string) => {
        if (name === 'react') {
          return {
            useMemo: (fn: () => any) => fn(),
            useCallback: (fn: any) => fn
          };
        }
        if (name === '../utils/idGenerator') {
          return { generateId: () => 'generated-split-tab' };
        }
        throw new Error(`Unexpected module ${name}`);
      }
    }
  );

  // Toggling split view from normal-1 must skip incog-1 and pair with normal-suspended, waking it up
  const hook = exports.useSplitView({
    activeTab: currentTabs[0],
    activeTabId: 'normal-1',
    tabs: currentTabs,
    activeWorkspaceId: 'default',
    setTabs: (updater: (prev: Tab[]) => Tab[]) => {
      currentTabs = updater(currentTabs);
    },
    activeSplitTabIdRef: activeSplitRef
  });

  hook.handleToggleSplitView();
  const normal1 = currentTabs.find(t => t.id === 'normal-1')!;
  const incog1 = currentTabs.find(t => t.id === 'incog-1')!;
  const wokenNormal = currentTabs.find(t => t.id === 'normal-suspended')!;

  assert.strictEqual(normal1.splitWith, 'normal-suspended', 'Normal tab must pair with normal tab, skipping incognito tab');
  assert.strictEqual(incog1.splitWith, undefined, 'Incognito tab must not be paired with normal tab');
  assert.strictEqual(wokenNormal.splitWith, 'normal-1', 'Partner tab must point back to active tab');
  assert.strictEqual(wokenNormal.isSuspended, false, 'Suspended partner tab must be woken up when entering Split View');
  console.log('[PASS] [Split View] Incognito isolation and suspended partner wake verified on useSplitView hook');
}
