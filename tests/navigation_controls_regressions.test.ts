import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

let guest: any = null;
let source = 'https://example.com/a';
const writes: string[] = [], timers: unknown[] = [];
const iframe = { get src() { return source; }, set src(value: string) { source = value; writes.push(value); }, contentWindow: { history: { back() {}, forward() {} } } };
const exports: any = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useWebviewNavigation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, {
  exports, document: { querySelector: (selector: string) => selector === 'webview[data-tab-id="a"]' ? guest : selector === 'iframe[data-tab-id="a"]' ? iframe : null },
  setTimeout: (fn: unknown) => { timers.push(fn); },
  require: (name: string) => {
    if (name === 'react') return { useCallback: (fn: unknown) => fn };
    assert.equal(name, '../utils/logger'); return { logger: { debug() {} } };
  },
});
const controls = exports.useWebviewNavigation({ activeTabId: 'a' });
controls.handleReload();
assert.deepEqual(writes, ['https://example.com/a'], 'iframe reload should navigate directly to its current source');
assert.equal(timers.length, 0, 'a delayed restore must never overwrite a newer navigation');
guest = { canGoBack() { throw new Error('guest destroyed'); }, canGoForward() { throw new Error('guest destroyed'); }, reload() { throw new Error('guest destroyed'); } };
assert.doesNotThrow(() => controls.handleGoBack());
assert.doesNotThrow(() => controls.handleGoForward());
assert.doesNotThrow(() => controls.handleReload());
const called: string[] = [];
guest = { canGoBack: () => true, canGoForward: () => true, goBack: () => called.push('back'), goForward: () => called.push('forward'), reload: () => called.push('reload') };
controls.handleGoBack(); controls.handleGoForward(); controls.handleReload();
assert.deepEqual(called, ['back', 'forward', 'reload']);
console.log('[PASS] Native navigation controls, destroyed guest errors and timer-free iframe reload');
