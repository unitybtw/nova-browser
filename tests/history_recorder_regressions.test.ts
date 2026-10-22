import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { safeParseArrayWithBackup } from '../src/utils/safeStorage';

let history: any[] = [];
let now = 1_000_000;
let sequence = 0;
const exports: any = {};
const react = {
  useState: (init: Function) => { history = init(); return [history, (next: any) => { history = typeof next === 'function' ? next(history) : next; }]; },
  useRef: (current: unknown) => ({ current }), useCallback: (fn: Function) => fn, useEffect: () => {}
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useHistoryRecorder.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, {
  exports, URL, console, Date: class extends Date { static now() { return now; } },
  localStorage: { getItem: () => null, setItem: () => {} },
  require: (name: string) => {
    if (name === 'react') return react;
    if (name === '../utils/idGenerator') return { generateId: () => `visit-${++sequence}` };
    if (name === '../utils/safeStorage') return { safeParseArrayWithBackup };
    if (name === '../utils/logger') return { logger: console };
    throw new Error(`Unexpected dependency ${name}`);
  }
});
const hook = exports.useHistoryRecorder();
const visit = (url: string, title = url, isIncognito = false) => hook.recordVisit({ url, title, isIncognito }, { url, title });
visit('https://example.com/docs/');
assert.equal(history[0].url, 'https://example.com/docs/', 'history must reopen the exact path, including its trailing slash');
now += 1000;
visit('https://example.com/docs');
assert.equal(history.length, 2, 'slash and non-slash paths may be distinct resources');
const slashId = history[1].id;
now += 1000;
visit('https://example.com/docs/#section', 'Updated docs');
assert.equal(history.length, 2, 'hash-only navigation must deduplicate');
assert.equal(history[0].id, slashId, 'refreshing an older recent visit must move it to newest-first position');
assert.equal(history[0].title, 'Updated docs');
assert.equal(history[0].timestamp, now);
visit('https://example.com/secret', 'Private', true);
assert.equal(history.length, 2, 'private visits must remain absent');
console.log('[PASS] History preserves path semantics, deduplicates fragments and keeps newest visits first.');
