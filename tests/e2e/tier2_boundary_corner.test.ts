import assert from 'node:assert/strict';
import { Tab } from '../../src/types/browser';
import { computeLiveAndSuspendedTabs } from '../../src/utils/tabManager';

async function runTier2Tests() {
  const TOTAL_TABS = 50;
  const MAX_LIVE = 6;
  const baseTime = 1700000000000;

  // 1. Create 50 tabs
  const tabs: Tab[] = [];
  for (let i = 0; i < TOTAL_TABS; i++) {
    tabs.push({
      id: `tab-${i}`,
      url: `https://example${i}.com`,
      title: `Tab ${i}`,
      lastAccessed: baseTime + i * 1000,
      isSuspended: false
    });
  }

  const activeId = 'tab-49'; // newest tab
  const splitId = null;

  // Run LRU pool evaluation
  const { liveIds, tabsToSuspend } = computeLiveAndSuspendedTabs(tabs, activeId, splitId, MAX_LIVE);

  assert.equal(liveIds.size, MAX_LIVE, `Live tabs pool must cap at exactly ${MAX_LIVE}`);
  assert.equal(tabsToSuspend.size, TOTAL_TABS - MAX_LIVE, `Remaining tabs (${TOTAL_TABS - MAX_LIVE}) must be marked to suspend`);
  assert.equal(liveIds.has(activeId), true, 'Active tab must always be in the live pool');

  // Verify that the most recently accessed tabs are the ones retained in live pool
  // tabs 49 (active), 48, 47, 46, 45, 44 should be live
  for (let i = 44; i <= 49; i++) {
    assert.equal(liveIds.has(`tab-${i}`), true, `Recent tab-${i} should be live`);
  }

  // 2. Audio tab immunity test
  tabs[5].isPlayingAudio = true; // Background tab playing audio
  const resultWithAudio = computeLiveAndSuspendedTabs(tabs, activeId, splitId, MAX_LIVE);
  assert.equal(resultWithAudio.liveIds.has('tab-5'), true, 'Audio playing tab must be preserved in live pool');
  assert.equal(resultWithAudio.tabsToSuspend.has('tab-5'), false, 'Audio playing tab must not be suspended');

  // 3. Waking a suspended tab
  const clickedTabId = 'tab-10'; // was previously marked to suspend
  tabs[10].lastAccessed = baseTime + 100000; // updated last accessed on click
  const resultAfterClick = computeLiveAndSuspendedTabs(tabs, clickedTabId, splitId, MAX_LIVE);
  assert.equal(resultAfterClick.liveIds.has(clickedTabId), true, 'Selected tab must enter live pool immediately');
  assert.equal(resultAfterClick.liveIds.size, MAX_LIVE, 'Live pool must not exceed max cap after tab switch');

  console.log('Tier 2 boundary corner tests passed successfully');
}

runTier2Tests().catch(err => {
  console.error('Tier 2 test failure:', err);
  process.exit(1);
});
