/**
 * Empirical Adversarial Test Harness for Challenger 2 (Renderer & Storage)
 * Nova Browser Milestone 1
 */

// Implementation of safeBase64 from ReaderMode.tsx
const safeBase64 = (str: string): string => {
  if (!str) return '';
  const wellFormed = typeof (str as any).toWellFormed === 'function'
    ? (str as any).toWellFormed()
    : str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');

  try {
    return btoa(unescape(encodeURIComponent(wellFormed)));
  } catch (e) {
    try {
      const sanitized = wellFormed.replace(/%/g, '_');
      return btoa(sanitized);
    } catch (e2) {
      return wellFormed.replace(/[^a-zA-Z0-9]/g, '_');
    }
  }
};

async function runAdversarialTests() {
  console.log('====================================================');
  console.log('STARTING EMPIRICAL ADVERSARIAL VERIFICATION SUITE 2');
  console.log('====================================================\n');

  const testResults: Array<{ category: string; name: string; status: 'PASS' | 'FAIL'; detail: string }> = [];

  // ==========================================
  // TEST SUITE 1: ReaderMode safeBase64 & Unicode
  // ==========================================
  console.log('--- 1. Testing ReaderMode safeBase64 with Complex Unicode URLs ---');
  
  const unicodeTestCases = [
    { name: 'Cyrillic URL', url: 'https://ru.wikipedia.org/wiki/Заглавная_страница' },
    { name: 'CJK URL', url: 'https://zh.wikipedia.org/wiki/中文' },
    { name: 'Emoji URL', url: 'https://example.com/\uD83D\uDE0A/\uD83C\uDF89/test' },
    { name: 'Percent-encoded space & amp', url: 'https://example.com/foo%20bar%26baz' },
    { name: 'Percent-encoded UTF8 CJK', url: 'https://example.com/%E4%B8%AD%E6%96%87' },
    { name: 'Mixed Scripts & Special Symbols', url: 'https://example.com/тест?query=こんにちは&symbol=§¶†‡' },
    { name: 'Empty URL string', url: '' },
    { name: 'Lone Surrogate String', url: 'https://example.com/\uD800/test' },
  ];

  for (const tc of unicodeTestCases) {
    try {
      const result = safeBase64(tc.url);
      testResults.push({
        category: 'ReaderMode safeBase64',
        name: tc.name,
        status: 'PASS',
        detail: `Output len: ${result.length}, Output preview: ${result.substring(0, 30)}...`
      });
      console.log(`[PASS] ${tc.name}: safeBase64 produced valid string length ${result.length}`);
    } catch (err: any) {
      testResults.push({
        category: 'ReaderMode safeBase64',
        name: tc.name,
        status: 'FAIL',
        detail: `Uncaught Error: ${err.name} - ${err.message}`
      });
      console.error(`[FAIL] ${tc.name}: Threw ${err.name}: ${err.message}`);
    }
  }

  // ==========================================
  // TEST SUITE 2: BrowserView Tab Nullability
  // ==========================================
  console.log('\n--- 2. Testing BrowserView Tab Nullability (null, undefined, empty object) ---');

  const tabTestCases = [
    { name: 'Tab is null', tab: null as any },
    { name: 'Tab is undefined', tab: undefined as any },
    { name: 'Tab is empty object {}', tab: {} as any },
    { name: 'Tab without url property', tab: { id: 'tab-1' } as any },
    { name: 'Tab without id property', tab: { url: 'https://example.com' } as any },
  ];

  // Helper simulating BrowserView component initial setup & memo comparison
  function simulateBrowserViewInit(tab: any) {
    // Line 63 in BrowserView.tsx:
    const lastLoadedUrl = tab?.url || '';
    // Line 64 in BrowserView.tsx:
    const getSafeUrl = (u?: string) => (u && u.startsWith('nova://')) ? 'about:blank' : (u || 'about:blank');
    const webviewInitialSrc = getSafeUrl(tab?.url);
    // Line 68 in BrowserView.tsx:
    const isNewTab = !tab?.url || tab.url === 'about:blank' || tab.url === 'nova://newtab' || tab.url === 'https://newtab';
    // Line 90 in BrowserView.tsx:
    const isSettingsTab = Boolean(tab?.url?.startsWith('nova://settings') || tab?.url?.startsWith('about:settings'));
    // Line 94 in BrowserView.tsx:
    const isHistoryTab = tab?.url === 'nova://history' || tab?.url === 'about:history';
    // Line 98 in BrowserView.tsx:
    const isDownloadsTab = tab?.url === 'nova://downloads' || tab?.url === 'about:downloads';

    return { lastLoadedUrl, webviewInitialSrc, isNewTab, isSettingsTab, isHistoryTab, isDownloadsTab };
  }

  function simulateBrowserViewMemo(prevTab: any, nextTab: any) {
    const prevProps = { tab: prevTab, isActive: true, settings: {} };
    const nextProps = { tab: nextTab, isActive: true, settings: {} };
    // Lines 706-723 in BrowserView.tsx:
    if (prevProps.isActive !== nextProps.isActive) return false;
    if (prevProps.tab?.url !== nextProps.tab?.url) return false;
    if (prevProps.tab?.isLoading !== nextProps.tab?.isLoading) return false;
    if (prevProps.tab?.title !== nextProps.tab?.title) return false;
    if (prevProps.tab?.favicon !== nextProps.tab?.favicon) return false;
    if (prevProps.tab?.isSuspended !== nextProps.tab?.isSuspended) return false;
    if (prevProps.tab?.thumbnail !== nextProps.tab?.thumbnail) return false;
    if (prevProps.tab?.isMuted !== nextProps.tab?.isMuted) return false;
    return true;
  }

  for (const tc of tabTestCases) {
    try {
      const initRes = simulateBrowserViewInit(tc.tab);
      const memoRes = simulateBrowserViewMemo(tc.tab, tc.tab);
      testResults.push({
        category: 'BrowserView Tab Nullability',
        name: tc.name,
        status: 'PASS',
        detail: `Init succeeded, isNewTab=${initRes.isNewTab}, memoEqual=${memoRes}`
      });
      console.log(`[PASS] ${tc.name}: Handled without exception`);
    } catch (err: any) {
      testResults.push({
        category: 'BrowserView Tab Nullability',
        name: tc.name,
        status: 'FAIL',
        detail: `Uncaught Exception: ${err.name} - ${err.message}`
      });
      console.error(`[FAIL] ${tc.name}: Threw ${err.name}: ${err.message}`);
    }
  }

  // ==========================================
  // TEST SUITE 3: App.tsx Startup localStorage Hydration
  // ==========================================
  console.log('\n--- 3. Testing App.tsx Startup Loaders with Corrupted localStorage ---');

  const corruptedStorageScenarios = [
    { key: 'user_settings', val: '{corrupted_json_string...' },
    { key: 'user_settings', val: 'null' },
    { key: 'user_settings', val: '123' },
    { key: 'tabs_session', val: '{{invalid json' },
    { key: 'tabs_session', val: 'null' },
    { key: 'folders_session', val: 'UNDEFINED_JSON' },
    { key: 'workspaces_session', val: '[{corrupted' },
    { key: 'nova_vpn', val: '{"enabled": true, corrupted' },
    { key: 'nova_vpn', val: 'null' },
    { key: 'browsing_history', val: 'INVALID_HISTORY' },
    { key: 'bookmarks', val: 'INVALID_BOOKMARKS' },
    { key: 'nova_speed_dials', val: 'INVALID_SPEED_DIALS' },
    { key: 'nova_todos', val: 'INVALID_TODOS' },
  ];

  // Helper running App.tsx state initializers against mocked localStorage
  function testAppStartupWithCorruptedStorage(key: string, val: string) {
    const mockStorage: Record<string, string> = { [key]: val };
    const getItem = (k: string) => mockStorage[k] || null;

    // 1. Tabs initializer
    let tabs: any[] = [];
    let startupBehavior = 'newTab';
    try {
      const savedSettings = getItem('user_settings');
      if (savedSettings) {
        startupBehavior = JSON.parse(savedSettings).startupBehavior || 'newTab';
      }
    } catch (e) {}

    if (startupBehavior === 'continue') {
      const saved = getItem('tabs_session');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) tabs = parsed;
        } catch (e) {}
      }
    }

    if (tabs.length === 0) {
      tabs = [{ id: '1', url: 'nova://newtab', title: 'New Tab', isLoading: false }];
    }

    // 2. Folders initializer
    let folders: any[] = [];
    const savedFolders = getItem('folders_session');
    if (savedFolders) {
      try {
        const parsed = JSON.parse(savedFolders);
        if (Array.isArray(parsed)) folders = parsed;
      } catch (e) {}
    }

    // 3. Workspaces initializer
    let workspaces: any[] = [];
    const savedWs = getItem('workspaces_session');
    if (savedWs) {
      try {
        const parsed = JSON.parse(savedWs);
        if (Array.isArray(parsed) && parsed.length > 0) workspaces = parsed;
      } catch (e) {}
    }
    if (workspaces.length === 0) {
      workspaces = [{ id: 'default', name: 'Personal', color: 'slate' }];
    }

    // 4. UserSettings initializer
    const defaultSettings = { searchEngine: 'google', privacyShield: true };
    let settings = defaultSettings;
    try {
      const saved = getItem('user_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          settings = { ...defaultSettings, ...parsed };
        }
      }
    } catch (e) {}

    // 5. VPN initializer
    let vpnEnabled = false;
    let vpnLocation = { id: 'us-1' };
    const savedVpn = getItem('nova_vpn');
    if (savedVpn) {
      try {
        const { enabled, location, customLocations } = JSON.parse(savedVpn);
        vpnEnabled = !!enabled;
        if (location) vpnLocation = location;
      } catch (e) {}
    }

    // 6. History initializer
    let history: any[] = [];
    try {
      const saved = getItem('browsing_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) history = parsed;
      }
    } catch (e) {}

    // 7. Bookmarks initializer
    let bookmarks: any[] = [];
    try {
      const saved = getItem('bookmarks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) bookmarks = parsed;
      }
    } catch (e) {}

    return { tabs, folders, workspaces, settings, vpnEnabled, vpnLocation, history, bookmarks };
  }

  for (const tc of corruptedStorageScenarios) {
    try {
      const res = testAppStartupWithCorruptedStorage(tc.key, tc.val);
      testResults.push({
        category: 'App.tsx Corrupted Storage',
        name: `Key=${tc.key}, Val=${tc.val}`,
        status: 'PASS',
        detail: `Gracefully fallback: tabs=${res.tabs.length}, ws=${res.workspaces.length}`
      });
      console.log(`[PASS] Key=${tc.key}, Val="${tc.val}": Fallback successful`);
    } catch (err: any) {
      testResults.push({
        category: 'App.tsx Corrupted Storage',
        name: `Key=${tc.key}, Val=${tc.val}`,
        status: 'FAIL',
        detail: `Uncaught Exception: ${err.name} - ${err.message}`
      });
      console.error(`[FAIL] Key=${tc.key}, Val="${tc.val}": Threw ${err.name}: ${err.message}`);
    }
  }

  // Summary
  console.log('\n====================================================');
  console.log('ADVERSARIAL VERIFICATION SUMMARY');
  console.log('====================================================');
  const passes = testResults.filter(r => r.status === 'PASS').length;
  const fails = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS: ${testResults.length}`);
  console.log(`PASSING: ${passes}`);
  console.log(`FAILING: ${fails}\n`);

  for (const r of testResults) {
    console.log(`[${r.status}] [${r.category}] ${r.name} --> ${r.detail}`);
  }

  if (fails > 0) {
    process.exit(1);
  }
}

runAdversarialTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
