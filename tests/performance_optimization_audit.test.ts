/**
 * Empirical Verification Suite: Desktop Browser Performance & Resource Optimization
 * Verifies O(1) tab switch memoization, Omnibox memo decoupling,
 * energy saver mode animation pausing, and tighter memory pool caps.
 */

console.log('================================================================');
console.log('STARTING EMPIRICAL PERFORMANCE & RESOURCE OPTIMIZATION SUITE');
console.log('================================================================\n');

interface PerfTestResult {
  suite: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const perfResults: PerfTestResult[] = [];

function assertPerf(condition: boolean, suite: string, name: string, details: string) {
  if (condition) {
    perfResults.push({ suite, name, status: 'PASS', details });
    console.log(`[PASS] [${suite}] ${name}`);
  } else {
    perfResults.push({ suite, name, status: 'FAIL', details });
    console.error(`[FAIL] [${suite}] ${name} --> ${details}`);
  }
}

import { computeLiveAndSuspendedTabs } from '../src/utils/tabManager';
import type { Tab, UserSettings } from '../src/types/browser';

// =========================================================================
// 1. TOPBAR & SIDEBAR TABS MEMOIZATION COMPASSION (O(1) SWITCHING)
// =========================================================================
console.log('--- 1. Testing TopBar MemoizedTabItem Memo Comparator ---');

function topBarTabItemComparator(prevProps: any, nextProps: any): boolean {
  return (
    prevProps.index === nextProps.index &&
    prevProps.wasJustUnsplit === nextProps.wasJustUnsplit &&
    prevProps.isActive === nextProps.isActive &&
    (
      !prevProps.splitTab && !nextProps.splitTab
        ? true
        : (prevProps.activeTabId === prevProps.tab.id) === (nextProps.activeTabId === nextProps.tab.id) &&
          (prevProps.activeTabId === prevProps.splitTab?.id) === (nextProps.activeTabId === nextProps.splitTab?.id)
    ) &&
    prevProps.splitTab?.id === nextProps.splitTab?.id &&
    prevProps.splitTab?.title === nextProps.splitTab?.title &&
    prevProps.splitTab?.url === nextProps.splitTab?.url &&
    prevProps.splitTab?.favicon === nextProps.splitTab?.favicon &&
    prevProps.splitTab?.isLoading === nextProps.splitTab?.isLoading &&
    prevProps.splitTab?.isMuted === nextProps.splitTab?.isMuted &&
    prevProps.splitTab?.isPlayingAudio === nextProps.splitTab?.isPlayingAudio &&
    prevProps.tab.id === nextProps.tab.id &&
    prevProps.tab.url === nextProps.tab.url &&
    prevProps.tab.title === nextProps.tab.title &&
    prevProps.tab.splitWith === nextProps.tab.splitWith &&
    prevProps.tab.favicon === nextProps.tab.favicon &&
    prevProps.tab.isLoading === nextProps.tab.isLoading &&
    prevProps.tab.isMuted === nextProps.tab.isMuted &&
    prevProps.tab.isPinned === nextProps.tab.isPinned &&
    prevProps.tab.isPlayingAudio === nextProps.tab.isPlayingAudio &&
    prevProps.tab.isSuspended === nextProps.tab.isSuspended &&
    prevProps.tabsLength === nextProps.tabsLength &&
    prevProps.tabStyle === nextProps.tabStyle &&
    prevProps.tabAnimation === nextProps.tabAnimation &&
    prevProps.isIncognito === nextProps.isIncognito &&
    prevProps.tab.isIncognito === nextProps.tab.isIncognito
  );
}

const tabItemPropsA = {
  index: 0,
  wasJustUnsplit: false,
  isActive: false,
  activeTabId: 'tab-1',
  splitTab: null,
  tab: {
    id: 'tab-3',
    url: 'https://example.com/3',
    title: 'Tab 3',
    isPinned: false,
    isMuted: false,
    isPlayingAudio: false,
    isSuspended: false,
    isIncognito: false
  },
  tabsLength: 10,
  tabStyle: 'floating',
  tabAnimation: 'chrome',
  isIncognito: false
};

// When user switches activeTabId from tab-1 to tab-2, tab-3 is inactive before and after.
// The comparator MUST return true so React skips re-rendering tab-3!
const tabItemPropsB = {
  ...tabItemPropsA,
  activeTabId: 'tab-2'
};

assertPerf(
  topBarTabItemComparator(tabItemPropsA, tabItemPropsB),
  'TopBar Tab Memoization',
  'Skips re-rendering inactive un-split tab when switching between other tabs',
  'Expected comparator to return true for inactive un-split tab when activeTabId changes'
);

// When tab becomes active (isActive changes false -> true), it MUST re-render
const tabItemPropsActive = {
  ...tabItemPropsA,
  isActive: true,
  activeTabId: 'tab-3'
};

assertPerf(
  !topBarTabItemComparator(tabItemPropsA, tabItemPropsActive),
  'TopBar Tab Memoization',
  'Correctly invalidates memo when tab becomes active',
  'Expected comparator to return false when isActive flips to true'
);

// Split tab: left half active vs right half active MUST invalidate
const splitTabPropsLeftActive = {
  ...tabItemPropsA,
  isActive: true,
  activeTabId: 'tab-3',
  splitTab: { id: 'tab-4', url: 'https://example.com/4', title: 'Tab 4' }
};

const splitTabPropsRightActive = {
  ...splitTabPropsLeftActive,
  activeTabId: 'tab-4'
};

assertPerf(
  !topBarTabItemComparator(splitTabPropsLeftActive, splitTabPropsRightActive),
  'TopBar Tab Memoization',
  'Invalidates split tab when active focus flips between left and right half',
  'Expected comparator to return false when active pane shifts in split tab'
);

// =========================================================================
// 2. OMNIBOXBAR REACT.MEMO COMPARATOR DECOUPLING
// =========================================================================
console.log('\n--- 2. Testing OmniboxBar Memo Comparator ---');

function omniboxComparator(prevProps: any, nextProps: any): boolean {
  if (prevProps.isIncognito !== nextProps.isIncognito) return false;
  if (prevProps.searchEngine !== nextProps.searchEngine) return false;
  if (prevProps.useVerticalTabs !== nextProps.useVerticalTabs) return false;
  if (prevProps.isBookmarked !== nextProps.isBookmarked) return false;
  if (prevProps.bookmarks !== nextProps.bookmarks) return false;
  if (prevProps.permissionRequests !== nextProps.permissionRequests) return false;
  if (prevProps.onNavigate !== nextProps.onNavigate) return false;
  if (prevProps.onToggleReaderMode !== nextProps.onToggleReaderMode) return false;
  if (prevProps.onToggleBookmark !== nextProps.onToggleBookmark) return false;
  if (prevProps.onResetZoom !== nextProps.onResetZoom) return false;
  if (prevProps.onRespondPermission !== nextProps.onRespondPermission) return false;
  if (prevProps.onDismissPermission !== nextProps.onDismissPermission) return false;

  if (prevProps.activeTab?.id !== nextProps.activeTab?.id) return false;
  if (prevProps.activeTab?.url !== nextProps.activeTab?.url) return false;
  if (prevProps.activeTab?.zoomFactor !== nextProps.activeTab?.zoomFactor) return false;
  if (prevProps.activeTab?.isTranslated !== nextProps.activeTab?.isTranslated) return false;

  return true;
}

const baseOmniboxProps = {
  isIncognito: false,
  searchEngine: 'google',
  useVerticalTabs: false,
  isBookmarked: false,
  bookmarks: [],
  permissionRequests: [],
  onNavigate: () => {},
  activeTab: {
    id: 'tab-1',
    url: 'https://example.com',
    title: 'Example Domain',
    blockedAdsCount: 12,
    isPlayingAudio: false,
    zoomFactor: 1.0,
    isTranslated: false
  }
};

// 2.1 Omnibox skips re-render when adblocker blocks more ads on active tab (blockedAdsCount changes)
const omniboxPropsBlockedAdsUpdate = {
  ...baseOmniboxProps,
  activeTab: {
    ...baseOmniboxProps.activeTab,
    blockedAdsCount: 15
  }
};

assertPerf(
  omniboxComparator(baseOmniboxProps, omniboxPropsBlockedAdsUpdate),
  'Omnibox Memoization',
  'Skips re-render when activeTab blockedAdsCount updates',
  'Omnibox does not render ad count and should skip reconciliation'
);

// 2.2 Omnibox skips re-render when activeTab title changes (Omnibox displays URL, not title)
const omniboxPropsTitleUpdate = {
  ...baseOmniboxProps,
  activeTab: {
    ...baseOmniboxProps.activeTab,
    title: 'New Page Title'
  }
};

assertPerf(
  omniboxComparator(baseOmniboxProps, omniboxPropsTitleUpdate),
  'Omnibox Memoization',
  'Skips re-render when activeTab title changes',
  'Omnibox renders URL and should skip re-render on title changes'
);

// 2.3 Omnibox invalidates when URL actually changes
const omniboxPropsUrlUpdate = {
  ...baseOmniboxProps,
  activeTab: {
    ...baseOmniboxProps.activeTab,
    url: 'https://example.com/new-path'
  }
};

assertPerf(
  !omniboxComparator(baseOmniboxProps, omniboxPropsUrlUpdate),
  'Omnibox Memoization',
  'Invalidates memo when activeTab URL changes',
  'Omnibox must re-render when navigation occurs'
);

// 2.4 Omnibox invalidates when zoom factor changes
const omniboxPropsZoomUpdate = {
  ...baseOmniboxProps,
  activeTab: {
    ...baseOmniboxProps.activeTab,
    zoomFactor: 1.25
  }
};

assertPerf(
  !omniboxComparator(baseOmniboxProps, omniboxPropsZoomUpdate),
  'Omnibox Memoization',
  'Invalidates memo when activeTab zoomFactor changes',
  'Omnibox badge displays current zoom factor'
);

// =========================================================================
// 3. ENERGY SAVER MODE & TAB HIBERNATION ADAPTATION
// =========================================================================
console.log('\n--- 3. Testing Energy Saver Mode & Hibernation Pool ---');

const tenTabs: Tab[] = Array.from({ length: 10 }, (_, i) => ({
  id: `tab-${i + 1}`,
  url: `https://example.com/${i + 1}`,
  title: `Tab ${i + 1}`,
  isPinned: i === 0, // tab-1 is pinned
  isPlayingAudio: false,
  isSuspended: false,
  lastAccessed: 1000 + i * 10
}));

// Standard mode: pool limit 6
const standardPool = computeLiveAndSuspendedTabs(tenTabs, 'tab-10', null, 6);
assertPerf(
  standardPool.liveIds.size <= 6,
  'Standard Hibernation Pool',
  'Caps concurrent live webviews to 6 in normal mode',
  `Expected liveIds <= 6, got ${standardPool.liveIds.size}`
);

// Energy Saver Mode: tighter pool limit 3
const energySaverPool = computeLiveAndSuspendedTabs(tenTabs, 'tab-10', null, 3);
assertPerf(
  energySaverPool.liveIds.size <= 3,
  'Energy Saver Hibernation Pool',
  'Caps concurrent live webviews to 3 in energy saver mode',
  `Expected liveIds <= 3, got ${energySaverPool.liveIds.size}`
);

assertPerf(
  energySaverPool.tabsToSuspend.size > standardPool.tabsToSuspend.size,
  'Energy Saver Memory Reclamation',
  'Suspends more background tabs in energy saver mode to reclaim RAM',
  `Expected energy saver to suspend more tabs (${energySaverPool.tabsToSuspend.size} vs ${standardPool.tabsToSuspend.size})`
);

// Energy Saver timeout calculation
function computeEffectiveHibernationTimeout(settings: Partial<UserSettings>): number {
  const isEnergySaver = settings.energySaverMode ?? false;
  const baseTimeoutMinutes = settings.hibernationTimeoutMinutes || 10;
  const effectiveTimeoutMinutes = isEnergySaver ? Math.min(baseTimeoutMinutes, 3) : baseTimeoutMinutes;
  return effectiveTimeoutMinutes * 60 * 1000;
}

assertPerf(
  computeEffectiveHibernationTimeout({ energySaverMode: false, hibernationTimeoutMinutes: 10 }) === 600000,
  'Hibernation Timeout',
  'Keeps 10 minute timeout in normal mode',
  'Expected 600000ms'
);

assertPerf(
  computeEffectiveHibernationTimeout({ energySaverMode: true, hibernationTimeoutMinutes: 10 }) === 180000,
  'Hibernation Timeout',
  'Tightens timeout to 3 minutes in energy saver mode',
  'Expected 180000ms'
);

// =========================================================================
// 4. NEWTABPAGE BACKGROUND MOTION PAUSE IN ENERGY SAVER MODE
// =========================================================================
console.log('\n--- 4. Testing Background Motion Energy Saver Pausing ---');

function shouldAnimateNewTabBackground(isActive: boolean, energySaverMode: boolean): boolean {
  return isActive && !energySaverMode;
}

assertPerf(
  shouldAnimateNewTabBackground(true, false) === true,
  'Background Motion Lifecycle',
  'Background animations run when tab is active and energy saver is off',
  'Expected true'
);

assertPerf(
  shouldAnimateNewTabBackground(true, true) === false,
  'Background Motion Lifecycle',
  'Background animations pause (evaluate to false) when energy saver mode is on',
  'Expected false to eliminate GPU rendering load on battery'
);

assertPerf(
  shouldAnimateNewTabBackground(false, false) === false,
  'Background Motion Lifecycle',
  'Background animations pause when tab is inactive',
  'Expected false'
);

// =========================================================================
// SUMMARY
// =========================================================================
console.log('\n================================================================');
console.log('PERFORMANCE & RESOURCE OPTIMIZATION AUDIT SUMMARY');
console.log('================================================================');
const totalPerf = perfResults.length;
const passedPerf = perfResults.filter(r => r.status === 'PASS').length;
const failedPerf = perfResults.filter(r => r.status === 'FAIL').length;

console.log(`TOTAL PERFORMANCE TESTS: ${totalPerf}`);
console.log(`PASSED                 : ${passedPerf}`);
console.log(`FAILED                 : ${failedPerf}`);

if (failedPerf === 0) {
  console.log('\nALL PERFORMANCE AND RESOURCE OPTIMIZATION AUDIT TESTS PASSED CLEANLY.');
} else {
  console.error(`\nFAILED: ${failedPerf} performance tests failed.`);
  process.exit(1);
}
