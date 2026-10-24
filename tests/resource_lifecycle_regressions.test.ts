import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { computeLiveAndSuspendedTabs } from '../src/utils/tabManager';
import type { Tab } from '../src/types/browser';

// Execute the shipped hooks with controlled clocks and deferred React updates.
// Effect dependencies and cleanup are retained across simulated renders.
function runtime(file: string, dependencies: Record<string, unknown>, globals: object = {}) {
  let cursor = 0, now = 1_000, timerId = 0;
  const cells: any[] = [], effects: Array<() => void> = [];
  const timers = new Map<number, { callback: () => void; due: number; period?: number }>();
  const schedule = (callback: () => void, delay: number, period?: number) => {
    const id = ++timerId;
    timers.set(id, { callback, due: now + delay, period });
    return id;
  };
  const react = {
    useRef: (value: unknown) => cells[cursor++] ??= { current: value },
    useEffect: (callback: () => any, deps: unknown[]) => {
      const index = cursor++, old = cells[index];
      if (!old || deps.some((dep, i) => !Object.is(dep, old.deps[i]))) {
        const next: any = { deps, setup: callback };
        cells[index] = next;
        effects.push(() => { old?.cleanup?.(); next.cleanup = callback(); });
      }
    },
  };
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, {
    exports, console, Date: class extends Date { static now() { return now; } },
    setTimeout: (fn: () => void, ms: number) => schedule(fn, ms),
    setInterval: (fn: () => void, ms: number) => schedule(fn, ms, ms),
    clearTimeout: (id: number) => timers.delete(id), clearInterval: (id: number) => timers.delete(id),
    ...globals,
    require: (name: string) => {
      if (name === 'react') return react;
      assert.ok(name in dependencies, `unexpected dependency ${name}`);
      return dependencies[name];
    },
  });
  return {
    render(name: string, options: object) { cursor = 0; exports[name](options); while (effects.length) effects.shift()!(); },
    advance(ms: number) {
      const end = now + ms;
      for (;;) {
        const next = [...timers.entries()].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
        if (!next) break;
        const [id, timer] = next;
        now = timer.due;
        if (timer.period) timer.due += timer.period; else timers.delete(id);
        timer.callback();
      }
      now = end;
    },
    intervals: () => [...timers.values()].filter(timer => timer.period).length,
    dispose() { cells.forEach(cell => cell.cleanup?.()); },
    replayEffects() {
      cells.forEach(cell => cell.cleanup?.());
      cells.forEach(cell => { if (cell.setup) cell.cleanup = cell.setup(); });
    },
  };
}

const tab = (id: string, extra: Partial<Tab> = {}): Tab => ({ id, url: 'https://example.com/', title: id, isLoading: false, canGoBack: false, canGoForward: false, ...extra });
const failures: string[] = [];
function check(name: string, test: () => void) {
  try { test(); console.log(`[PASS] [Resources] ${name}`); }
  catch (error) { failures.push(name); console.error(`[FAIL] [Resources] ${name}`, error); }
}

check('metadata churn cannot postpone staggered wakes or leave an idle polling timer', () => {
  let tabs = [tab('active'), ...['a', 'b', 'c', 'd'].map(id => tab(id, { isSuspended: true }))];
  const queue: Array<(prev: Tab[]) => Tab[]> = [];
  const options = { tabs, tabsRef: { current: tabs }, activeTabId: 'active', activeTabIdRef: { current: 'active' }, splitTabId: null, splitRef: { current: null }, settings: { tabHibernationEnabled: false }, setTabs: (update: (prev: Tab[]) => Tab[]) => queue.push(update) };
  const r = runtime('src/hooks/useTabHibernation.ts', { '../utils/tabManager': { computeLiveAndSuspendedTabs } });
  const render = () => { options.tabs = tabs; options.tabsRef.current = tabs; r.render('useTabHibernation', options); };
  const flush = () => { while (queue.length) tabs = queue.shift()!(tabs); render(); };
  try {
    render(); r.replayEffects();
    for (let i = 0; i < 6; i++) {
      r.advance(100); flush();
      tabs = tabs.map(t => t.id === 'active' ? { ...t, blockedAdsCount: i + 1 } : t);
      render();
      if (i === 2) assert.equal(tabs.filter(t => t.isSuspended).length, 2, 'first pair wakes at 300ms despite render churn');
    }
    assert.equal(tabs.filter(t => t.isSuspended).length, 0);
    r.advance(300); flush();
    assert.equal(r.intervals(), 0, 'the wake timer must stop after the queue drains');
    r.advance(3000);
    assert.equal(queue.length, 0, 'no background state dispatches when every tab is awake');
  } finally { r.dispose(); }
});

function persistenceHarness() {
  const stored = new Map<string, string>(), writes: string[] = [];
  let rejectWrites = false;
  const storage = { setItem: (key: string, value: string) => {
    if (rejectWrites && key === 'nova_session_tabs') throw new Error('quota');
    stored.set(key, value); if (key === 'nova_session_tabs') writes.push(value);
  } };
  const r = runtime('src/hooks/useSessionPersistence.ts', {
    '../utils/electronBridge': { getElectronAPI: () => undefined },
    '../utils/logger': { logger: { warn: () => {} } },
    '../services/syncService': { recordPersistedSettings: () => {} },
  }, { localStorage: storage, window: { addEventListener() {}, removeEventListener() {} }, document: { addEventListener() {}, removeEventListener() {} } });
  const tabs = [tab('a')];
  const options: any = { tabs, settings: {}, activeTabId: 'a', tabsRef: { current: tabs }, activeTabIdRef: { current: 'a' }, foldersRef: { current: [] }, settingsRef: { current: {} }, bookmarksRef: { current: [] }, workspacesRef: { current: [] }, activeWorkspaceIdRef: { current: 'default' }, flushHistory() {}, flushBookmarks() {} };
  return { r, stored, writes, options, setFailure: (fail: boolean) => { rejectWrites = fail; }, render(next = options.tabs) { options.tabs = next; options.tabsRef.current = next; r.render('useSessionPersistence', options); } };
}

check('reverting a pending edit cancels the obsolete disk write', () => {
  const h = persistenceHarness();
  try {
    h.render(); h.r.advance(500);
    h.render([tab('a', { title: 'B' })]); h.r.advance(100);
    h.render([tab('a')]); h.r.advance(1000);
    assert.equal(JSON.parse(h.stored.get('nova_session_tabs')!)[0].title, 'a', 'A → B → A must leave A on disk');
    assert.equal(h.writes.length, 1, 'the cancelled intermediate state must never be written');
  } finally { h.r.dispose(); }
});

check('progress churn does not debounce away a durable edit or cause extra disk writes', () => {
  const h = persistenceHarness();
  try {
    h.render(); h.r.advance(500);
    for (let i = 1; i <= 10; i++) {
      h.render([tab('a', { title: 'Changed', blockedAdsCount: i })]); h.r.advance(100);
    }
    assert.equal(h.writes.length, 2, 'ten transient updates need only one additional durable write');
    assert.equal(JSON.parse(h.stored.get('nova_session_tabs')!)[0].title, 'Changed');
  } finally { h.r.dispose(); }
});

check('a failed write remains eligible for retry on the next state update', () => {
  const h = persistenceHarness();
  try {
    h.setFailure(true); h.render(); h.r.advance(500);
    h.setFailure(false); h.render([tab('a', { blockedAdsCount: 1 })]); h.r.advance(500);
    assert.equal(h.writes.length, 1, 'a thrown storage write cannot be marked persisted');
  } finally { h.r.dispose(); }
});

check('unmount cancels a pending tab write', () => {
  const h = persistenceHarness();
  h.render(); h.r.dispose(); h.r.advance(1000);
  assert.equal(h.writes.length, 0, 'a detached persistence hook cannot write stale snapshots');
});

check('pausing persistence cancels work and resuming saves the current state', () => {
  const h = persistenceHarness();
  try {
    h.render(); h.options.isHydrated = false; h.render(); h.r.advance(1000);
    assert.equal(h.writes.length, 0);
    h.options.isHydrated = true; h.render([tab('a', { title: 'Ready' })]); h.r.advance(500);
    assert.equal(h.writes.length, 1);
    assert.equal(JSON.parse(h.writes[0])[0].title, 'Ready');
  } finally { h.r.dispose(); }
});

check('StrictMode effect replay retains one pending write', () => {
  const h = persistenceHarness();
  try {
    h.render(); h.r.replayEffects(); h.r.advance(500);
    assert.equal(h.writes.length, 1, 'cleanup must clear the scheduled marker so setup can reschedule');
  } finally { h.r.dispose(); }
});

check('incognito active tab does not overwrite persisted active_tab_session', () => {
  const h = persistenceHarness();
  try {
    h.render([tab('a'), tab('incog', { isIncognito: true })]);
    h.r.advance(500);
    assert.equal(h.stored.get('active_tab_session'), 'a');
    h.options.activeTabId = 'incog';
    h.options.activeTabIdRef.current = 'incog';
    h.render([tab('a'), tab('incog', { isIncognito: true })]);
    h.r.advance(500);
    assert.equal(h.stored.get('active_tab_session'), 'a', 'incognito tab ID must never overwrite active_tab_session');
  } finally { h.r.dispose(); }
});

assert.equal(failures.length, 0, `Resource regressions: ${failures.join(', ')}`);
