import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import type { Tab, DownloadItem } from '../src/types/browser';

// Execute the shipped hooks. Only React scheduling and external side effects
// are stubbed; no tab/download transition logic is copied into this harness.
function loadHook(file: string, react: object, dependencies: Record<string, unknown> = {}, globals: object = {}) {
  const exports: any = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  vm.runInNewContext(code, {
    exports, console, Date, URL, setTimeout, clearTimeout, ...globals,
    require: (name: string) => {
      if (name === 'react') return react;
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected hook dependency: ${name}`);
    }
  }, { filename: file });
  return exports;
}

let sequence = 0;
function tabHarness(initial: Tab[]) {
  let tabs = initial;
  const tabsRef = { current: tabs };
  const activeTabIdRef = { current: tabs[0].id };
  const removed: string[] = [];
  const hook = loadHook('src/hooks/useTabOperations.ts', { useCallback: (fn: any) => fn }, {
    '../utils/idGenerator': { generateId: () => `new-${++sequence}` },
    '../utils/safeNavigation': { isSafeNavigationUrl: () => true },
    '../utils/verticalTabs': {},
    '../services/thumbnailCache': { tabThumbnailCache: { remove: (id: string) => removed.push(id) } },
    '../services/aiAgent': {},
    '../utils/electronBridge': { getElectronAPI: () => undefined },
    '../utils/confirmDialog': {},
    '../utils/logger': { logger: console },
  }).useTabOperations;
  const api = hook({
    tabsRef, activeTabId: activeTabIdRef.current, activeTabIdRef,
    splitTabId: null, activeWorkspaceId: 'default', activeWorkspaceIdRef: { current: 'default' },
    setTabs: (next: any) => { tabs = typeof next === 'function' ? next(tabs) : next; tabsRef.current = tabs; },
    setActiveTabId: (id: string) => { activeTabIdRef.current = id; },
    pushClosedTab: () => {}, pushClosedTabs: () => {}, recordVisit: () => {}, setIsExtensionsOpen: () => {},
  });
  return { api, getTabs: () => tabs, removed };
}
const tab = (id: string, extra: Partial<Tab> = {}): Tab => ({
  id, url: 'https://example.com/', title: 'Example', workspaceId: 'default',
  isLoading: false, canGoBack: true, canGoForward: false, ...extra,
});
const failures: string[] = [];
function check(name: string, test: () => void) {
  try { test(); console.log(`[PASS] [Lifecycle] ${name}`); }
  catch (error: any) { failures.push(name); console.error(`[FAIL] [Lifecycle] ${name}: ${error.message}`); }
}

check('a stale close request cannot reset the last remaining tab', () => {
  const original = tab('live');
  const h = tabHarness([original]);
  h.api.handleCloseTab('already-closed');
  assert.equal(h.getTabs()[0], original);
  assert.equal(h.removed.length, 0);
});
check('closing the last tab clears state belonging to the old document', () => {
  const h = tabHarness([tab('live', { isPlayingAudio: true, isTranslated: true, translatedLang: 'de', blockedAdsCount: 8, webContentsId: 999, thumbnail: 'old-preview' })]);
  h.api.handleCloseTab('live');
  const fresh = h.getTabs()[0];
  assert.equal(fresh.url, 'nova://newtab');
  assert.equal(Boolean(fresh.isPlayingAudio), false);
  assert.equal(Boolean(fresh.isTranslated), false);
  assert.equal(fresh.translatedLang, undefined);
  assert.equal(fresh.webContentsId, undefined);
  assert.equal(fresh.thumbnail, undefined);
  assert.equal(fresh.blockedAdsCount ?? 0, 0);
});
check('duplicating a tab does not pretend the new document is already playing or translated', () => {
  const h = tabHarness([tab('live', { isPlayingAudio: true, isTranslated: true, translatedLang: 'de', blockedAdsCount: 9, thumbnail: 'old-preview', isMuted: true, zoomFactor: 1.25 })]);
  h.api.handleDuplicateTab('live');
  const duplicate = h.getTabs()[1];
  assert.equal(Boolean(duplicate.isPlayingAudio), false);
  assert.equal(Boolean(duplicate.isTranslated), false);
  assert.equal(duplicate.translatedLang, undefined);
  assert.equal(duplicate.thumbnail, undefined);
  assert.equal(duplicate.blockedAdsCount ?? 0, 0);
  assert.equal(duplicate.isMuted, true, 'user-selected mute preference must be preserved');
  assert.equal(duplicate.zoomFactor, 1.25, 'user-selected zoom must be preserved');
});

check('leaving private mode clears the cached private document preview', () => {
  const h = tabHarness([tab('private', { isIncognito: true, thumbnail: 'private-preview', isPlayingAudio: true })]);
  h.api.handleExitIncognitoTab();
  assert.equal(h.getTabs()[0].isIncognito, false);
  assert.equal(Boolean(h.getTabs()[0].isPlayingAudio), false);
  assert.ok(h.removed.includes('private'));
});

check('clearing download history preserves active and paused download controls', () => {
  let state: DownloadItem[];
  let listener: any;
  const effects: Array<() => any> = [];
  const stored = new Map<string, string>();
  const storage = { getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => stored.set(k, v), removeItem: (k: string) => stored.delete(k) };
  const hook = loadHook('src/hooks/useDownloads.ts', {
    useState: (init: any) => { state = init(); return [state, (next: any) => { state = typeof next === 'function' ? next(state) : next; }]; },
    useRef: (value: any) => ({ current: value }), useCallback: (fn: any) => fn,
    useEffect: (effect: any) => effects.push(effect),
  }, { '../utils/safeStorage': { safeParseArrayWithBackup: () => [] } }, {
    localStorage: storage, window: { electronAPI: { onDownloadUpdate: (fn: any) => { listener = fn; return () => {}; } } },
  }).useDownloads;
  const api = hook();
  const cleanups = effects.map(effect => effect());
  const item = (id: string, status: DownloadItem['state'], isPaused = false): DownloadItem => ({ id, url: 'https://example.com/file', filename: id, state: status, receivedBytes: 0, totalBytes: 100, isPaused });
  try {
    listener(null, item('finished', 'completed'));
    listener(null, item('active', 'progressing'));
    listener(null, item('paused', 'progressing', true));
    api.handleClearDownloads();
    assert.equal(state!.length, 2);
    assert.ok(state!.some(d => d.id === 'active'));
    assert.ok(state!.some(d => d.id === 'paused' && d.isPaused));
    assert.equal(JSON.parse(stored.get('nova_downloads_history')!).length, 2);
    listener(null, item('active', 'completed'));
    api.handleClearDownloads();
    assert.equal(state!.length, 1);
    assert.equal(state![0].id, 'paused');
  } finally { cleanups.forEach(cleanup => cleanup?.()); }
});
assert.equal(failures.length, 0, `Lifecycle regressions: ${failures.join(', ')}`);
