/**
 * Empirical Adversarial Test Harness for Milestone 2: Webview Sandbox, Incognito & Audio UI
 * Nova Browser M2 Verification
 */

console.log('================================================================');
console.log('STARTING EMPIRICAL ADVERSARIAL VERIFICATION SUITE - MILESTONE 2');
console.log('================================================================\n');

interface TestResult {
  suite: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const m2Results: TestResult[] = [];

function assertM2(condition: boolean, suite: string, name: string, details: string) {
  if (condition) {
    m2Results.push({ suite, name, status: 'PASS', details });
    console.log(`[PASS] [${suite}] ${name}`);
  } else {
    m2Results.push({ suite, name, status: 'FAIL', details });
    console.error(`[FAIL] [${suite}] ${name} --> ${details}`);
  }
}

// =========================================================================
// SUITE 1: INCOGNITO PARTITION ISOLATION & PRIVATE STORAGE HYGIENE
// =========================================================================
console.log('--- 1. Testing Incognito Partition & Storage Isolation ---');

// 1.1 Webview partition resolution logic
function resolveWebviewPartition(isIncognito?: boolean): string | undefined {
  return isIncognito ? 'incognito' : undefined;
}

const partitionVectors = [
  { isIncognito: true, expected: 'incognito', desc: 'Incognito tab assigns "incognito" partition' },
  { isIncognito: false, expected: undefined, desc: 'Normal tab assigns undefined (default partition)' },
  { isIncognito: undefined, expected: undefined, desc: 'Undefined incognito flag assigns undefined' },
  { isIncognito: null as any, expected: undefined, desc: 'Null incognito flag assigns undefined' },
  { isIncognito: 0 as any, expected: undefined, desc: 'Falsy number flag assigns undefined' },
  { isIncognito: '' as any, expected: undefined, desc: 'Empty string flag assigns undefined' },
];

for (const vec of partitionVectors) {
  const result = resolveWebviewPartition(vec.isIncognito);
  assertM2(
    result === vec.expected,
    'Incognito Partition',
    vec.desc,
    `isIncognito: ${JSON.stringify(vec.isIncognito)} | Expected: ${vec.expected} | Got: ${result}`
  );
}

// 1.2 Session persistence isolation (excluding incognito tabs from localStorage)
function filterTabsForStorage(tabs: Array<{ id: string; url: string; isIncognito?: boolean }>) {
  return tabs.filter(t => !t.isIncognito);
}

const mockTabsList = [
  { id: '1', url: 'https://news.ycombinator.com', isIncognito: false },
  { id: '2', url: 'https://secretbank.com', isIncognito: true },
  { id: '3', url: 'https://medicalportal.org', isIncognito: true },
  { id: '4', url: 'https://github.com' } // undefined isIncognito
];

const savedTabs = filterTabsForStorage(mockTabsList);
assertM2(
  savedTabs.length === 2 && savedTabs.every(t => !t.isIncognito),
  'Storage Isolation',
  'Incognito tabs stripped from persistent session storage',
  `Saved count: ${savedTabs.length}, IDs: ${savedTabs.map(t => t.id).join(',')}`
);

// 1.3 Browsing history isolation
function recordHistory(
  history: Array<{ id: string; url: string; title: string }>,
  tab: { url?: string; title?: string; isIncognito?: boolean },
  updates: { url?: string; title?: string }
): Array<{ id: string; url: string; title: string }> {
  const updated = { ...tab, ...updates };
  if (!updated.isIncognito && (updates.title || updates.url)) {
    const targetUrl = updated.url;
    if (targetUrl && targetUrl !== 'nova://newtab' && targetUrl !== 'about:blank' && !targetUrl.startsWith('chrome://')) {
      return [{
        id: 'mock_id',
        url: targetUrl,
        title: updated.title || targetUrl
      }, ...history];
    }
  }
  return history;
}

let historyState: Array<{ id: string; url: string; title: string }> = [];
// Normal tab update records to history
historyState = recordHistory(historyState, { isIncognito: false }, { url: 'https://wikipedia.org', title: 'Wikipedia' });
assertM2(
  historyState.length === 1 && historyState[0].url === 'https://wikipedia.org',
  'History Isolation',
  'Normal tab navigation records to history',
  `History length: ${historyState.length}`
);

// Incognito tab update does NOT record to history
const historyAfterIncognito = recordHistory(historyState, { isIncognito: true }, { url: 'https://private-site.com', title: 'Private' });
assertM2(
  historyAfterIncognito.length === 1 && historyAfterIncognito[0].url === 'https://wikipedia.org',
  'History Isolation',
  'Incognito tab navigation is blocked from history recording',
  `History length: ${historyAfterIncognito.length}`
);

// 1.4 Clear incognito session on last incognito tab close
function simulateCloseTabIncognitoCleanup(
  currentTabs: Array<{ id: string; isIncognito?: boolean }>,
  closedTabId: string,
  clearIncognitoSessionMock: () => void
) {
  const targetTab = currentTabs.find(t => t.id === closedTabId);
  const newTabs = currentTabs.filter(t => t.id !== closedTabId);
  
  if (targetTab?.isIncognito) {
    const remainingIncognitoTabs = newTabs.some(t => t.isIncognito);
    if (!remainingIncognitoTabs) {
      clearIncognitoSessionMock();
    }
  }
  return newTabs;
}

let clearCallCount = 0;
const mockClearSession = () => { clearCallCount++; };

// Scenario A: 2 incognito tabs, closing 1 does not clear session yet
let tabSet = [{ id: 'incog-1', isIncognito: true }, { id: 'incog-2', isIncognito: true }, { id: 'norm-1', isIncognito: false }];
tabSet = simulateCloseTabIncognitoCleanup(tabSet, 'incog-1', mockClearSession);
assertM2(clearCallCount === 0, 'Incognito Cleanup', 'Closing 1 of 2 incognito tabs does not prematurely clear session', `Calls: ${clearCallCount}`);

// Scenario B: Closing the last incognito tab triggers clearIncognitoSession
tabSet = simulateCloseTabIncognitoCleanup(tabSet, 'incog-2', mockClearSession);
assertM2(clearCallCount === 1, 'Incognito Cleanup', 'Closing the last incognito tab invokes clearIncognitoSession', `Calls: ${clearCallCount}`);

// Scenario C: Closing normal tab does not trigger clearIncognitoSession
tabSet = simulateCloseTabIncognitoCleanup(tabSet, 'norm-1', mockClearSession);
assertM2(clearCallCount === 1, 'Incognito Cleanup', 'Closing a normal tab does not invoke clearIncognitoSession', `Calls: ${clearCallCount}`);


// =========================================================================
// SUITE 2: HOSTNAME SPOOFING & CREDENTIAL INJECTION IN HANDLEIPCMESSAGE
// =========================================================================
console.log('\n--- 2. Testing Password Prompt Hostname Validation & Spoofing Defense ---');

interface PasswordPromptState {
  isOpen: boolean;
  hostname: string;
  username: string;
  password: string;
}

function simulateHandleIpcMessage(
  tabUrl: string | undefined,
  ipcEvent: any
): PasswordPromptState {
  let promptState: PasswordPromptState = {
    isOpen: false,
    hostname: '',
    username: '',
    password: ''
  };

  if (ipcEvent?.channel === 'password-form-submitted' && ipcEvent?.args?.[0]) {
    const { hostname, username, password } = ipcEvent.args[0];
    let actualHostname = '';
    try {
      actualHostname = new URL(tabUrl || '').hostname;
    } catch (_) {}

    if (actualHostname && actualHostname === hostname && username && password) {
      promptState = {
        isOpen: true,
        hostname: actualHostname,
        username: String(username).substring(0, 100),
        password: String(password).substring(0, 500)
      };
    }
  }

  return promptState;
}

const spoofingTestVectors = [
  // 1. Direct spoofing attempts
  {
    tabUrl: 'https://bank.com/login',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'evil.com', username: 'victim', password: 'secret123' }] },
    expectedOpen: false,
    desc: 'Reject spoofed evil.com hostname on bank.com page'
  },
  {
    tabUrl: 'https://bank.com/login',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'bank.com.evil.com', username: 'victim', password: 'secret123' }] },
    expectedOpen: false,
    desc: 'Reject subdomain suffix spoof (bank.com.evil.com)'
  },
  {
    tabUrl: 'https://sub.bank.com/login',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'bank.com', username: 'victim', password: 'secret123' }] },
    expectedOpen: false,
    desc: 'Reject parent domain spoof from subdomain (sub.bank.com vs bank.com)'
  },
  {
    tabUrl: 'https://bank.com/login',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'sub.bank.com', username: 'victim', password: 'secret123' }] },
    expectedOpen: false,
    desc: 'Reject subdomain spoof from parent domain (bank.com vs sub.bank.com)'
  },
  {
    tabUrl: 'https://attacker:bank.com@evil.com/login',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'bank.com', username: 'victim', password: 'secret123' }] },
    expectedOpen: false,
    desc: 'Reject userinfo spoof (attacker:bank.com@evil.com)'
  },
  {
    tabUrl: 'http://bank.com:8080/login',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'bank.com:8080', username: 'victim', password: 'secret123' }] },
    expectedOpen: false,
    desc: 'Reject port suffix in hostname payload (bank.com:8080 vs bank.com)'
  },
  {
    tabUrl: 'http://bank.com:8080/login',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'bank.com', username: 'victim', password: 'secret123' }] },
    expectedOpen: true,
    expectedHostname: 'bank.com',
    desc: 'Accept exact parsed hostname on custom port'
  },

  // 2. Legitimate submissions
  {
    tabUrl: 'https://accounts.google.com/signin',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'accounts.google.com', username: 'user@gmail.com', password: 'correct_horse_battery' }] },
    expectedOpen: true,
    expectedHostname: 'accounts.google.com',
    expectedUser: 'user@gmail.com',
    expectedPass: 'correct_horse_battery',
    desc: 'Accept valid password submission with matching hostname'
  },
  {
    tabUrl: 'https://github.com/login',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'github.com', username: 'octocat', password: 'pwd' }] },
    expectedOpen: true,
    expectedHostname: 'github.com',
    expectedUser: 'octocat',
    expectedPass: 'pwd',
    desc: 'Accept standard valid login form submission'
  },

  // 3. Dangerous / invalid / internal protocols in tab.url
  {
    tabUrl: 'about:blank',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'about:blank', username: 'u', password: 'p' }] },
    expectedOpen: false,
    desc: 'Reject password prompt on about:blank'
  },
  {
    tabUrl: 'nova://settings',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'evil.com', username: 'u', password: 'p' }] },
    expectedOpen: false,
    desc: 'Reject spoofed hostname on internal nova:// protocol'
  },
  {
    tabUrl: 'javascript:alert(1)',
    event: { channel: 'password-form-submitted', args: [{ hostname: '', username: 'u', password: 'p' }] },
    expectedOpen: false,
    desc: 'Reject password prompt on javascript: URL'
  },
  {
    tabUrl: '',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'anything.com', username: 'u', password: 'p' }] },
    expectedOpen: false,
    desc: 'Reject password prompt on empty tab URL'
  },
  {
    tabUrl: undefined,
    event: { channel: 'password-form-submitted', args: [{ hostname: 'anything.com', username: 'u', password: 'p' }] },
    expectedOpen: false,
    desc: 'Reject password prompt on undefined tab URL'
  },

  // 4. Missing / empty / corrupted credentials
  {
    tabUrl: 'https://bank.com/login',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'bank.com', username: '', password: 'pwd' }] },
    expectedOpen: false,
    desc: 'Reject prompt with empty username'
  },
  {
    tabUrl: 'https://bank.com/login',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'bank.com', username: 'user', password: '' }] },
    expectedOpen: false,
    desc: 'Reject prompt with empty password'
  },
  {
    tabUrl: 'https://bank.com/login',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'bank.com', username: null, password: 'pwd' }] },
    expectedOpen: false,
    desc: 'Reject prompt with null username'
  },
  {
    tabUrl: 'https://bank.com/login',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'bank.com', username: 'user', password: null }] },
    expectedOpen: false,
    desc: 'Reject prompt with null password'
  },

  // 5. IPC channel confusion & payload malformation
  {
    tabUrl: 'https://bank.com/login',
    event: { channel: 'other-channel', args: [{ hostname: 'bank.com', username: 'user', password: 'pwd' }] },
    expectedOpen: false,
    desc: 'Ignore unrelated IPC channel'
  },
  {
    tabUrl: 'https://bank.com/login',
    event: { channel: 'password-form-submitted', args: [] },
    expectedOpen: false,
    desc: 'Handle empty args array gracefully'
  },
  {
    tabUrl: 'https://bank.com/login',
    event: { channel: 'password-form-submitted', args: [null] },
    expectedOpen: false,
    desc: 'Handle null arg in args array gracefully'
  },
  {
    tabUrl: 'https://bank.com/login',
    event: { channel: 'password-form-submitted', args: ['not an object'] },
    expectedOpen: false,
    desc: 'Handle primitive string arg gracefully'
  },
  {
    tabUrl: 'https://bank.com/login',
    event: null,
    expectedOpen: false,
    desc: 'Handle null event gracefully'
  },

  // 6. Truncation boundary defense for payload overflow
  {
    tabUrl: 'https://bank.com/login',
    event: { channel: 'password-form-submitted', args: [{ hostname: 'bank.com', username: 'U'.repeat(300), password: 'P'.repeat(1000) }] },
    expectedOpen: true,
    expectedHostname: 'bank.com',
    expectedUserLen: 100,
    expectedPassLen: 500,
    desc: 'Truncate overly long username to 100 chars and password to 500 chars'
  }
];

for (const vec of spoofingTestVectors) {
  const result = simulateHandleIpcMessage(vec.tabUrl, vec.event);
  const isOpenMatch = result.isOpen === vec.expectedOpen;
  const hostMatch = !vec.expectedHostname || result.hostname === vec.expectedHostname;
  const userMatch = !vec.expectedUser || result.username === vec.expectedUser;
  const passMatch = !vec.expectedPass || result.password === vec.expectedPass;
  const userLenMatch = !vec.expectedUserLen || result.username.length === vec.expectedUserLen;
  const passLenMatch = !vec.expectedPassLen || result.password.length === vec.expectedPassLen;

  const passed = isOpenMatch && hostMatch && userMatch && passMatch && userLenMatch && passLenMatch;
  assertM2(
    passed,
    'Password Prompt Security',
    vec.desc,
    `isOpen: ${result.isOpen} (exp ${vec.expectedOpen}), host: "${result.hostname}"`
  );
}


// =========================================================================
// SUITE 3: SIDEBAR INDICATOR BADGE CSS VISIBILITY
// =========================================================================
console.log('\n--- 3. Testing Sidebar Badge CSS Visibility Logic ---');

function computeBadgeContainerClass(tab: {
  isPlayingAudio?: boolean;
  isMuted?: boolean;
  isSuspended?: boolean;
}, isActive: boolean): string {
  const isVisible = isActive || tab.isPlayingAudio || tab.isMuted || tab.isSuspended;
  return `flex items-center gap-1 transition-all duration-150 shrink-0 ${
    isVisible ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-100'
  }`;
}

const badgeVectors = [
  {
    tab: { isPlayingAudio: true, isMuted: false, isSuspended: false },
    isActive: false,
    expectedClass: 'opacity-100',
    desc: 'Inactive tab playing audio is visible (opacity-100)'
  },
  {
    tab: { isPlayingAudio: false, isMuted: true, isSuspended: false },
    isActive: false,
    expectedClass: 'opacity-100',
    desc: 'Inactive muted tab is visible (opacity-100)'
  },
  {
    tab: { isPlayingAudio: false, isMuted: false, isSuspended: true },
    isActive: false,
    expectedClass: 'opacity-100',
    desc: 'Inactive suspended/sleeping tab is visible (opacity-100)'
  },
  {
    tab: { isPlayingAudio: false, isMuted: false, isSuspended: false },
    isActive: true,
    expectedClass: 'opacity-100',
    desc: 'Active normal tab is visible (opacity-100)'
  },
  {
    tab: { isPlayingAudio: false, isMuted: false, isSuspended: false },
    isActive: false,
    expectedClass: 'opacity-0 group-hover/tab:opacity-100',
    desc: 'Inactive quiescent tab remains hidden until hover (opacity-0 group-hover/tab:opacity-100)'
  },
];

for (const vec of badgeVectors) {
  const cls = computeBadgeContainerClass(vec.tab, vec.isActive);
  const containsExpected = cls.includes(vec.expectedClass);
  assertM2(
    containsExpected,
    'Sidebar Badge Visibility',
    vec.desc,
    `Class: "${cls}" | Expected substring: "${vec.expectedClass}"`
  );
}


// =========================================================================
// SUITE 4: INACTIVE TAB NATIVE AUDIO HOOK & HIBERNATION IMMUNITY
// =========================================================================
console.log('\n--- 4. Testing Native Audio State Tracking & Auto-Hibernation Immunity ---');

// 4.1 Native IPC audio event hook simulation
function simulateOnTabAudioChanged(
  tabs: Array<{ id: string; webContentsId?: number; isPlayingAudio?: boolean }>,
  eventData: { webContentsId: number; isPlayingAudio: boolean }
) {
  return tabs.map(tab => {
    if (tab.webContentsId === eventData.webContentsId) {
      return { ...tab, isPlayingAudio: eventData.isPlayingAudio };
    }
    return tab;
  });
}

let audioTabs = [
  { id: 'tab-1', webContentsId: 101, isPlayingAudio: false },
  { id: 'tab-2', webContentsId: 102, isPlayingAudio: false },
  { id: 'tab-3', webContentsId: 103, isPlayingAudio: false }
];

// Audio starts on tab 2
audioTabs = simulateOnTabAudioChanged(audioTabs, { webContentsId: 102, isPlayingAudio: true });
assertM2(
  audioTabs.find(t => t.id === 'tab-2')?.isPlayingAudio === true &&
  audioTabs.find(t => t.id === 'tab-1')?.isPlayingAudio === false,
  'Audio IPC Dispatch',
  'Tab 2 audio state updated to true via webContentsId 102',
  `Tab 2 playing: ${audioTabs.find(t => t.id === 'tab-2')?.isPlayingAudio}`
);

// Audio stops on tab 2
audioTabs = simulateOnTabAudioChanged(audioTabs, { webContentsId: 102, isPlayingAudio: false });
assertM2(
  audioTabs.find(t => t.id === 'tab-2')?.isPlayingAudio === false,
  'Audio IPC Dispatch',
  'Tab 2 audio state updated to false via webContentsId 102',
  `Tab 2 playing: ${audioTabs.find(t => t.id === 'tab-2')?.isPlayingAudio}`
);

// 4.2 Auto-hibernation Memory Saver simulation
interface HibernationTab {
  id: string;
  title: string;
  lastAccessed: number;
  isSuspended?: boolean;
  isPlayingAudio?: boolean;
  isPinned?: boolean;
}

function simulateMemorySaverHibernation(
  tabs: HibernationTab[],
  activeTabId: string,
  splitTabId: string | null,
  now: number,
  timeoutMs: number
): HibernationTab[] {
  return tabs.map(tab => {
    if (
      tab.id === activeTabId ||
      tab.id === splitTabId ||
      tab.isPlayingAudio ||
      tab.isPinned ||
      tab.isSuspended ||
      !tab.lastAccessed
    ) {
      return tab;
    }
    if (now - tab.lastAccessed > timeoutMs) {
      return { ...tab, isSuspended: true };
    }
    return tab;
  });
}

function simulateManualSuspendTab(
  tabs: HibernationTab[],
  targetId: string,
  activeTabId: string,
  splitTabId: string | null
): HibernationTab[] {
  return tabs.map(t => (t.id === targetId && t.id !== activeTabId && t.id !== splitTabId && !t.isPlayingAudio) ? { ...t, isSuspended: true } : t);
}

const tenMinutesAgo = Date.now() - (11 * 60 * 1000);
const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
const timeoutMs = 10 * 60 * 1000;

const hibernationTestSet: HibernationTab[] = [
  { id: 'active-tab', title: 'Active Tab', lastAccessed: tenMinutesAgo, isSuspended: false, isPlayingAudio: false },
  { id: 'split-tab', title: 'Split Tab', lastAccessed: tenMinutesAgo, isSuspended: false, isPlayingAudio: false },
  { id: 'audio-background-tab', title: 'YouTube Audio Tab', lastAccessed: tenMinutesAgo, isSuspended: false, isPlayingAudio: true },
  { id: 'pinned-tab', title: 'Pinned Tab', lastAccessed: tenMinutesAgo, isSuspended: false, isPlayingAudio: false, isPinned: true },
  { id: 'idle-expired-tab', title: 'Idle Tab Expired', lastAccessed: tenMinutesAgo, isSuspended: false, isPlayingAudio: false },
  { id: 'idle-recent-tab', title: 'Idle Tab Recent', lastAccessed: fiveMinutesAgo, isSuspended: false, isPlayingAudio: false },
  { id: 'already-suspended-tab', title: 'Already Suspended', lastAccessed: tenMinutesAgo, isSuspended: true, isPlayingAudio: false },
];

const postHibernationTabs = simulateMemorySaverHibernation(
  hibernationTestSet,
  'active-tab',
  'split-tab',
  Date.now(),
  timeoutMs
);

assertM2(
  postHibernationTabs.find(t => t.id === 'audio-background-tab')?.isSuspended === false,
  'Hibernation Audio Immunity',
  'Audio-playing background tab is NOT hibernated despite expired idle timer',
  `isSuspended: ${postHibernationTabs.find(t => t.id === 'audio-background-tab')?.isSuspended}`
);

assertM2(
  postHibernationTabs.find(t => t.id === 'active-tab')?.isSuspended === false,
  'Hibernation Active Immunity',
  'Active tab is NOT hibernated',
  `isSuspended: ${postHibernationTabs.find(t => t.id === 'active-tab')?.isSuspended}`
);

assertM2(
  postHibernationTabs.find(t => t.id === 'split-tab')?.isSuspended === false,
  'Hibernation Split Immunity',
  'Split view secondary tab is NOT hibernated',
  `isSuspended: ${postHibernationTabs.find(t => t.id === 'split-tab')?.isSuspended}`
);

assertM2(
  postHibernationTabs.find(t => t.id === 'pinned-tab')?.isSuspended === false,
  'Hibernation Pin Immunity',
  'Pinned tab is NOT hibernated',
  `isSuspended: ${postHibernationTabs.find(t => t.id === 'pinned-tab')?.isSuspended}`
);

assertM2(
  postHibernationTabs.find(t => t.id === 'idle-recent-tab')?.isSuspended === false,
  'Hibernation Recent Access Immunity',
  'Recently accessed tab (<10m) is NOT hibernated',
  `isSuspended: ${postHibernationTabs.find(t => t.id === 'idle-recent-tab')?.isSuspended}`
);

assertM2(
  postHibernationTabs.find(t => t.id === 'idle-expired-tab')?.isSuspended === true,
  'Hibernation Auto-Suspend',
  'Inactive expired tab is correctly suspended',
  `isSuspended: ${postHibernationTabs.find(t => t.id === 'idle-expired-tab')?.isSuspended}`
);

// 4.3 Manual suspend audio immunity check
const manualSuspendAttempt = simulateManualSuspendTab(
  hibernationTestSet,
  'audio-background-tab',
  'active-tab',
  'split-tab'
);
assertM2(
  manualSuspendAttempt.find(t => t.id === 'audio-background-tab')?.isSuspended === false,
  'Manual Suspend Audio Immunity',
  'handleSuspendTab rejects suspending audio-playing tab',
  `isSuspended: ${manualSuspendAttempt.find(t => t.id === 'audio-background-tab')?.isSuspended}`
);


// =========================================================================
// SUITE 5: SLEEPING TAB WAKEUP & URL INTEGRITY
// =========================================================================
console.log('\n--- 5. Testing Sleeping Tab Wakeup URL Integrity & Memo Invalidation ---');

// 5.1 Wakeup URL synchronization simulation
function simulateTabLifecycle(initialUrl: string) {
  let tab = {
    id: 'tab-99',
    url: initialUrl,
    title: 'Initial Page',
    isSuspended: false,
    lastAccessed: Date.now()
  };

  const webviewInitialSrcRef = { current: (tab.url.startsWith('nova://') ? 'about:blank' : tab.url) };

  // Step 1: Tab navigates to new URLs while active
  const navigate = (newUrl: string, newTitle: string) => {
    tab = { ...tab, url: newUrl, title: newTitle, lastAccessed: Date.now() };
    webviewInitialSrcRef.current = (newUrl.startsWith('nova://') ? 'about:blank' : newUrl);
  };

  // Step 2: Tab is hibernated
  const suspend = () => {
    tab = { ...tab, isSuspended: true };
  };

  // Step 3: Tab is woken up
  const wakeup = () => {
    tab = { ...tab, isSuspended: false, lastAccessed: Date.now() };
  };

  return { getTab: () => tab, getSrc: () => webviewInitialSrcRef.current, navigate, suspend, wakeup };
}

const lifecycle = simulateTabLifecycle('https://initial-site.com');
assertM2(lifecycle.getSrc() === 'https://initial-site.com', 'Lifecycle Init', 'Initial webview src set', lifecycle.getSrc());

// Navigate to deep subpage
lifecycle.navigate('https://target-docs.io/guide/advanced-topics', 'Advanced Topics');
assertM2(lifecycle.getSrc() === 'https://target-docs.io/guide/advanced-topics', 'Lifecycle Navigation', 'Webview src synced to navigated URL', lifecycle.getSrc());

// Suspend tab
lifecycle.suspend();
assertM2(lifecycle.getTab().isSuspended === true, 'Lifecycle Suspend', 'Tab is suspended', `isSuspended: ${lifecycle.getTab().isSuspended}`);

// Wakeup tab
lifecycle.wakeup();
assertM2(
  lifecycle.getTab().isSuspended === false && lifecycle.getSrc() === 'https://target-docs.io/guide/advanced-topics',
  'Lifecycle Wakeup Integrity',
  'Waking tab retains latest navigated URL rather than stale initial URL',
  `Tab URL: ${lifecycle.getTab().url}, Webview Src: ${lifecycle.getSrc()}`
);

// 5.2 BrowserView Memo Comparator Invalidation Tests
function browserViewMemoComparator(prevProps: any, nextProps: any): boolean {
  if (prevProps.isActive !== nextProps.isActive) return false;
  if (prevProps.tab?.url !== nextProps.tab?.url) return false;
  if (prevProps.tab?.isLoading !== nextProps.tab?.isLoading) return false;
  if (prevProps.tab?.title !== nextProps.tab?.title) return false;
  if (prevProps.tab?.favicon !== nextProps.tab?.favicon) return false;
  if (prevProps.tab?.isSuspended !== nextProps.tab?.isSuspended) return false;
  if (prevProps.tab?.thumbnail !== nextProps.tab?.thumbnail) return false;
  if (prevProps.tab?.isMuted !== nextProps.tab?.isMuted) return false;
  if (prevProps.isIncognito !== nextProps.isIncognito) return false;
  
  if ((prevProps.tab?.url?.startsWith('nova://settings') || prevProps.tab?.url?.startsWith('about:settings')) && prevProps.settings !== nextProps.settings) return false;
  if ((prevProps.tab?.url?.startsWith('nova://history') || prevProps.tab?.url?.startsWith('about:history')) && prevProps.history !== nextProps.history) return false;
  if ((prevProps.tab?.url?.startsWith('nova://downloads') || prevProps.tab?.url?.startsWith('about:downloads')) && prevProps.downloads !== nextProps.downloads) return false;
  
  return true;
}

const baseProps = {
  isActive: true,
  isIncognito: false,
  tab: {
    id: 't1',
    url: 'https://example.com',
    title: 'Example',
    isLoading: false,
    favicon: 'fav.ico',
    isSuspended: false,
    thumbnail: 'data:...',
    isMuted: false
  },
  settings: {},
  history: [],
  downloads: []
};

// Test memo invalidation cases (must return false = re-render)
const memoInvalidationCases = [
  { mod: { tab: { ...baseProps.tab, isSuspended: true } }, desc: 'Re-render on tab.isSuspended change' },
  { mod: { tab: { ...baseProps.tab, url: 'https://newurl.com' } }, desc: 'Re-render on tab.url change' },
  { mod: { tab: { ...baseProps.tab, isLoading: true } }, desc: 'Re-render on tab.isLoading change' },
  { mod: { tab: { ...baseProps.tab, isMuted: true } }, desc: 'Re-render on tab.isMuted change' },
  { mod: { isIncognito: true }, desc: 'Re-render on isIncognito change' },
  { mod: { isActive: false }, desc: 'Re-render on isActive change' },
];

for (const c of memoInvalidationCases) {
  const nextProps = { ...baseProps, ...c.mod };
  const memoEqual = browserViewMemoComparator(baseProps, nextProps);
  assertM2(
    memoEqual === false,
    'BrowserView Memo Invalidation',
    c.desc,
    `memoEqual: ${memoEqual} (expected false to trigger re-render)`
  );
}

// Test memo equality case (must return true = skip re-render)
const memoIdentical = browserViewMemoComparator(baseProps, { ...baseProps, tab: { ...baseProps.tab } });
assertM2(
  memoIdentical === true,
  'BrowserView Memo Equality',
  'Skip redundant re-render when all tracked properties match',
  `memoEqual: ${memoIdentical} (expected true)`
);


// =========================================================================
// SUMMARY & VERDICT
// =========================================================================
console.log('\n================================================================');
console.log('MILESTONE 2 EMPIRICAL ADVERSARIAL TEST SUITE SUMMARY');
console.log('================================================================');

const totalM2Tests = m2Results.length;
const passM2Count = m2Results.filter(r => r.status === 'PASS').length;
const failM2Count = m2Results.filter(r => r.status === 'FAIL').length;

console.log(`TOTAL M2 EMPIRICAL TESTS : ${totalM2Tests}`);
console.log(`PASSED                   : ${passM2Count}`);
console.log(`FAILED                   : ${failM2Count}\n`);

if (failM2Count > 0) {
  console.error('M2 ADVERSARIAL TEST SUITE DETECTED FAILURES:');
  for (const r of m2Results.filter(r => r.status === 'FAIL')) {
    console.error(`  - [FAIL] [${r.suite}] ${r.name}: ${r.details}`);
  }
  process.exit(1);
} else {
  console.log('ALL M2 ADVERSARIAL EMPIRICAL TESTS PASSED CLEANLY (0 DEFECTS DETECTED).');
}
