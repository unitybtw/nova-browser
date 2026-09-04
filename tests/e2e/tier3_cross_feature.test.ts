import assert from 'node:assert/strict';
import { computeLiveAndSuspendedTabs } from '../../src/utils/tabManager';
import { generateId } from '../../src/utils/idGenerator';
import { isSafeNavigationUrl } from '../../src/utils/safeNavigation';
import { Tab } from '../../src/types/browser';

async function runTier3Tests() {
  // Test 1: Real Webview LRU Pool Cap & Suspension Hygiene
  const mockTabs: Tab[] = [
    { id: 'tab-active', url: 'https://nova-browser.org', title: 'Active', isLoading: false, canGoBack: false, canGoForward: false, lastAccessed: 5000 },
    { id: 'tab-split', url: 'https://github.com', title: 'Split', isLoading: false, canGoBack: false, canGoForward: false, lastAccessed: 4500 },
    { id: 'tab-audio', url: 'https://youtube.com', title: 'Music', isLoading: false, canGoBack: false, canGoForward: false, isPlayingAudio: true, lastAccessed: 1000 },
    { id: 'tab-pinned-1', url: 'https://mail.com', title: 'Mail', isLoading: false, canGoBack: false, canGoForward: false, isPinned: true, lastAccessed: 4000 },
    { id: 'tab-pinned-2', url: 'https://slack.com', title: 'Chat', isLoading: false, canGoBack: false, canGoForward: false, isPinned: true, lastAccessed: 3500 },
    { id: 'tab-pinned-3', url: 'https://trello.com', title: 'Trello', isLoading: false, canGoBack: false, canGoForward: false, isPinned: true, lastAccessed: 3000 },
    { id: 'tab-pinned-4', url: 'https://jira.com', title: 'Jira', isLoading: false, canGoBack: false, canGoForward: false, isPinned: true, lastAccessed: 2500 },
    { id: 'tab-pinned-5', url: 'https://docs.com', title: 'Docs', isLoading: false, canGoBack: false, canGoForward: false, isPinned: true, lastAccessed: 2000 },
    { id: 'tab-suspended-1', url: 'https://old.com', title: 'Old', isLoading: false, canGoBack: false, canGoForward: false, isSuspended: true, lastAccessed: 100 },
    { id: 'tab-lru-1', url: 'https://news.com', title: 'News', isLoading: false, canGoBack: false, canGoForward: false, lastAccessed: 1500 },
  ];

  // Run real computeLiveAndSuspendedTabs with maxLive = 6
  const result = computeLiveAndSuspendedTabs(mockTabs, 'tab-active', 'tab-split', 6);

  // Active and split tabs MUST be in liveIds
  assert.equal(result.liveIds.has('tab-active'), true, 'Active tab must be live');
  assert.equal(result.liveIds.has('tab-split'), true, 'Split tab must be live');
  assert.equal(result.liveIds.has('tab-audio'), true, 'Audio playing tab must be live');

  // Already suspended tab must NEVER be added to liveIds
  assert.equal(result.liveIds.has('tab-suspended-1'), false, 'Already suspended tab must not be in liveIds');

  // Cap must be enforced: liveIds size should not exceed maxLive (unless active + audio require it)
  assert.ok(result.liveIds.size <= 6, `Live tabs count (${result.liveIds.size}) must respect maxLive 6`);

  // Excess tabs beyond maxLive must be in tabsToSuspend
  assert.ok(result.tabsToSuspend.size > 0, 'Excess tabs must be marked for suspension');
  assert.equal(result.tabsToSuspend.has('tab-audio'), false, 'Audio playing tab must not be suspended');

  // Test 2: Real CSPRNG ID Generator
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const rawId = generateId();
  assert.ok(uuidRegex.test(rawId), `Generated ID "${rawId}" must match RFC4122 v4 UUID regex`);

  const prefixedId = generateId('tab');
  assert.ok(prefixedId.startsWith('tab_'), 'Prefixed ID must start with prefix_');
  assert.ok(uuidRegex.test(prefixedId.slice(4)), 'Prefixed ID suffix must be a valid UUID');

  // 1,000 IDs collision test
  const generatedIds = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const id = generateId();
    assert.equal(generatedIds.has(id), false, `Collision detected on iteration ${i} for ID ${id}`);
    generatedIds.add(id);
  }
  assert.equal(generatedIds.size, 1000, 'All 1000 generated IDs must be unique');

  // Test 3: Real Safe Navigation Protocol Validation
  assert.equal(isSafeNavigationUrl('https://example.com'), true, 'Valid HTTPS must pass');
  assert.equal(isSafeNavigationUrl('http://example.com'), true, 'Valid HTTP must pass');
  assert.equal(isSafeNavigationUrl('nova://newtab'), true, 'Internal nova://newtab must pass');
  assert.equal(isSafeNavigationUrl('nova://settings'), true, 'Internal nova://settings must pass');

  // Dangerous URLs must be strictly rejected
  assert.equal(isSafeNavigationUrl('javascript:alert(1)'), false, 'javascript: must be rejected');
  assert.equal(isSafeNavigationUrl('data:text/html,<h1>hi</h1>'), false, 'data: must be rejected');
  assert.equal(isSafeNavigationUrl('file:///etc/passwd'), false, 'file: must be rejected');
  assert.equal(isSafeNavigationUrl('vbscript:msgbox'), false, 'vbscript: must be rejected');
  assert.equal(isSafeNavigationUrl('blob:https://example.com/uuid'), false, 'blob: must be rejected');
  assert.equal(isSafeNavigationUrl('chrome://extensions'), false, 'chrome:// must be rejected');

  console.log('Tier 3 cross feature integration tests passed successfully');
}

runTier3Tests().catch(err => {
  console.error('Tier 3 test failure:', err);
  process.exit(1);
});
