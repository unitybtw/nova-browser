import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const tab = { id: 7, windowId: 3, active: true, url: 'https://example.com/' };
const queries: any[] = [], gets: number[] = [];
const getCurrent = () => 'native current';
const window = { chrome: { tabs: {
  query: (query: any, callback?: (value: any) => void) => { queries.push(query); if (callback) callback(['native']); else return Promise.resolve(['native']); },
  get: (id: number) => { gets.push(id); return Promise.resolve({ id }); }, getCurrent,
} } };
const context: any = { exports: {}, window, console, require: () => ({
  ipcRenderer: { sendSync: () => ({ tabData: tab }) },
  contextBridge: { executeInMainWorld: ({ func, args }: any) => func(...args) },
}) };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('electron/extension-popup-preload.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, context);
async function run() {
  let result: any;
  window.chrome.tabs.query({ active: true, currentWindow: true }, value => { result = value; });
  assert.equal(result[0].url, tab.url, 'callback-style startup sees the source tab synchronously');
  assert.equal((await window.chrome.tabs.query({ active: true }) as any)[0].id, 7);
  await window.chrome.tabs.query({ active: false });
  await window.chrome.tabs.query({ active: true, url: 'https://other.test/*' });
  assert.equal(queries.length, 2, 'other queries retain native filtering instead of fabricating an active match');
  assert.equal((await window.chrome.tabs.get(7)).id, 7);
  await window.chrome.tabs.get(9);
  assert.deepEqual(gets, [9], 'get for another tab must delegate rather than return the active tab');
  assert.equal(window.chrome.tabs.getCurrent, getCurrent, 'getCurrent must retain native popup semantics');
  console.log('[PASS] Extension preload startup, native delegation and callback/Promise compatibility');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
