import { Tab } from '../types/browser';

export interface TabPoolResult {
  liveIds: Set<string>;
  tabsToSuspend: Set<string>;
}

/**
 * Evaluates the webview LRU pool to prevent Chromium process explosion.
 * Preserves the active tab and split tab on screen. Fills the remaining slots
 * by priority: audio-playing > pinned > loading > LRU order (lastAccessed).
 * Caps live tabs strictly to maxLive — protected (audio/pinned/loading) tabs
 * may displace LRU tabs but can never push the live pool past maxLive.
 * Already-suspended tabs that are not active/split remain suspended and are never marked live.
 */
export function computeLiveAndSuspendedTabs(
  tabs: Tab[],
  activeTabId: string,
  splitTabId: string | null,
  maxLive: number = 6
): TabPoolResult {
  const liveIds = new Set<string>();
  const tabsToSuspend = new Set<string>();

  // Must-keep tabs on screen
  const screenTabIds = new Set<string>();
  if (activeTabId) {
    screenTabIds.add(activeTabId);
    liveIds.add(activeTabId);
  }
  if (splitTabId) {
    screenTabIds.add(splitTabId);
    liveIds.add(splitTabId);
  }

  // Non-suspended candidates that are not currently visible on screen.
  // Tabs that are already suspended remain suspended and must NOT be added to liveIds.
  const activeCandidates = tabs.filter(t => !screenTabIds.has(t.id) && !t.isSuspended);

  // Stable sort by protection priority:
  // 1. Playing audio
  // 2. Pinned
  // 3. Actively loading
  // 4. lastAccessed (descending)
  // 5. Original array index
  const tabIndexMap = new Map<string, number>();
  tabs.forEach((t, i) => tabIndexMap.set(t.id, i));

  activeCandidates.sort((a, b) => {
    const aAudio = a.isPlayingAudio ? 1 : 0;
    const bAudio = b.isPlayingAudio ? 1 : 0;
    if (aAudio !== bAudio) return bAudio - aAudio;

    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;

    const aLoading = a.isLoading ? 1 : 0;
    const bLoading = b.isLoading ? 1 : 0;
    if (aLoading !== bLoading) return bLoading - aLoading;

    const aTime = a.lastAccessed || 0;
    const bTime = b.lastAccessed || 0;
    if (aTime !== bTime) return bTime - aTime;

    return (tabIndexMap.get(a.id) ?? 0) - (tabIndexMap.get(b.id) ?? 0);
  });

  const slotsAvailable = Math.max(0, maxLive - liveIds.size);
  const keptCandidates = activeCandidates.slice(0, slotsAvailable);
  const excessCandidates = activeCandidates.slice(slotsAvailable);

  for (const t of keptCandidates) {
    liveIds.add(t.id);
  }

  for (const t of excessCandidates) {
    // Strict cap: even audio-playing tabs past maxLive are suspended so the
    // protected (audio/pinned/loading) total can never exceed maxLive.
    // Priority ordering above guarantees protected tabs displace LRU tabs first.
    tabsToSuspend.add(t.id);
  }

  return { liveIds, tabsToSuspend };
}
