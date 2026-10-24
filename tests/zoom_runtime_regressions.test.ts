import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import type { Tab } from '../src/types/browser';

async function run() {
  const exports: any = {};
  const errors: unknown[][] = [];
  let webview: any = null;
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useZoom.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, {
    exports, console: { error: (...args: unknown[]) => errors.push(args) },
    document: { querySelector: () => webview },
    require: (name: string) => {
      assert.equal(name, 'react');
      return { useCallback: (fn: unknown) => fn, useRef: (value: unknown) => ({ current: value }) };
    }
  });
  let tabs = [{ id: 'active', url: 'nova://newtab', zoomFactor: 1.25 }] as Tab[];
  const updates: Array<(tabs: Tab[]) => Tab[]> = [];
  const api = exports.useZoom({ activeTabId: 'active', setTabs: (update: (tabs: Tab[]) => Tab[]) => updates.push(update) });
  const flush = () => { while (updates.length) tabs = updates.shift()!(tabs); };
  api.handleZoomIn();
  flush();
  assert.equal(tabs[0].zoomFactor, 1.5, 'deferred React state must step from the saved 125%, not assume 100%');
  api.handleZoomIn(); api.handleZoomIn();
  flush();
  assert.equal(tabs[0].zoomFactor, 2, 'each batched shortcut must advance one step');
  api.handleZoomOut(); flush();
  assert.equal(tabs[0].zoomFactor, 1.75);
  api.handleResetZoom(); flush();
  assert.equal(tabs[0].zoomFactor, 1);
  assert.equal(errors.length, 0, 'internal pages must not call a missing webview');

  const applied: number[] = [];
  webview = { getZoomFactor: () => Promise.resolve(1.25), setZoomFactor: (factor: number) => applied.push(factor) };
  api.handleZoomIn();
  await new Promise<void>(resolve => setImmediate(resolve)); flush();
  assert.deepEqual(applied, [1.5]);
  assert.equal(tabs[0].zoomFactor, 1.5);
  let resolveRead!: (value: number) => void;
  webview.getZoomFactor = () => new Promise<number>(resolve => { resolveRead = resolve; });
  api.handleZoomIn(); api.handleResetZoom();
  resolveRead(1.5);
  await new Promise<void>(resolve => setImmediate(resolve)); flush();
  assert.equal(tabs[0].zoomFactor, 1, 'reset must supersede an in-flight zoom read');
  assert.deepEqual(applied, [1.5, 1]);
  console.log('[PASS] Zoom: deferred/batched internal updates, native application and reset ordering');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
