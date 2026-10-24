import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
const extension = { id: 'a', name: 'Example extension', enabled: true };
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
function harness() {
  let cursor = 0, confirm = true;
  const cells: any[] = [], effects: Array<() => void> = [], alerts: any[] = [];
  const listeners = new Set<() => void>();
  const api: any = {
    listExtensions: async () => [extension],
    onExtensionChanged: (callback: () => void) => { listeners.add(callback); return () => listeners.delete(callback); },
  };
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useExtensions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, {
    exports, console: { error() {} }, window: { electronAPI: api },
    require: (name: string) => {
      if (name === '../utils/electronBridge') return { getElectronAPI: () => api };
      if (name === '../utils/confirmDialog') return { showAlert: (alert: any) => { alerts.push(alert); }, showConfirm: async () => confirm };
      assert.equal(name, 'react');
      return {
        useState: (value: unknown) => {
          const index = cursor++; cells[index] ??= { value };
          return [cells[index].value, (next: any) => { cells[index].value = typeof next === 'function' ? next(cells[index].value) : next; }];
        },
        useRef: (value: unknown) => cells[cursor++] ??= { current: value },
        useCallback: (fn: unknown, deps: unknown[]) => {
          const index = cursor++, old = cells[index];
          if (!old || deps.some((dep, i) => !Object.is(dep, old.deps[i]))) cells[index] = { deps, value: fn };
          return cells[index].value;
        },
        useEffect: (fn: () => any, deps: unknown[]) => {
          const index = cursor++, old = cells[index];
          if (!old || deps.some((dep, i) => !Object.is(dep, old.deps[i]))) {
            const next: any = { deps }; cells[index] = next;
            effects.push(() => { old?.cleanup?.(); next.cleanup = fn(); });
          }
        },
      };
    },
  });
  return { api, alerts, cancel: () => { confirm = false; }, changed: () => listeners.forEach(callback => callback()),
    render() { cursor = 0; const hook = exports.useExtensions(); while (effects.length) effects.shift()!(); return hook; },
    dispose() { cells.forEach(cell => cell.cleanup?.()); },
  };
}
async function run() {
  const failures: string[] = [];
  async function check(name: string, test: () => Promise<void>) {
    try { await test(); console.log(`[PASS] [Extensions] ${name}`); }
    catch (error) { failures.push(name); console.error(`[FAIL] [Extensions] ${name}`, error); }
  }
  await check('missing remove API never removes a row as if it succeeded', async () => {
    const h = harness();
    try {
      h.render(); await settle(); await h.render().handleRemoveExtension('a');
      assert.equal(h.render().extensions.length, 1);
      assert.equal(h.alerts.length, 1);
    } finally { h.dispose(); }
  });
  await check('an unconfirmed native result cannot toggle or remove an extension', async () => {
    const h = harness();
    try {
      h.api.toggleExtension = async () => ({}); h.api.removeExtension = async () => ({});
      h.render(); await settle(); await h.render().handleToggleExtension('a');
      assert.equal(h.render().extensions[0].enabled, true);
      await h.render().handleRemoveExtension('a');
      assert.equal(h.render().extensions.length, 1);
      assert.equal(h.alerts.length, 2);
    } finally { h.dispose(); }
  });
  await check('a list started before removal cannot resurrect the removed row', async () => {
    const h = harness();
    try {
      h.render(); await settle();
      const oldList = deferred<any[]>(); h.api.listExtensions = () => oldList.promise; h.changed();
      h.api.removeExtension = async () => { h.api.listExtensions = async () => []; return { success: true }; };
      await h.render().handleRemoveExtension('a');
      oldList.resolve([extension]); await settle();
      assert.equal(h.render().extensions.length, 0);
    } finally { h.dispose(); }
  });
  await check('repeated toggle clicks issue one native mutation and expose pending state', async () => {
    const h = harness();
    try {
      h.render(); await settle(); let calls = 0;
      const pending = deferred<any>(); h.api.toggleExtension = () => { calls++; return pending.promise; };
      const hook = h.render(); const first = hook.handleToggleExtension('a'); const second = hook.handleToggleExtension('a');
      assert.equal(calls, 1);
      assert.ok(h.render().pendingExtensionIds.has('a'));
      h.api.listExtensions = async () => [{ ...extension, enabled: false }];
      pending.resolve({ success: true }); await Promise.all([first, second]); await settle();
      assert.equal(h.render().extensions[0].enabled, false);
      assert.equal(h.render().pendingExtensionIds.size, 0);
    } finally { h.dispose(); }
  });
  await check('cancelled confirmation preserves the extension without a native call', async () => {
    const h = harness();
    try {
      h.render(); await settle(); let calls = 0;
      h.api.removeExtension = async () => { calls++; return { success: true }; }; h.cancel();
      await h.render().handleRemoveExtension('a');
      assert.equal(calls, 0); assert.equal(h.render().extensions.length, 1);
    } finally { h.dispose(); }
  });
  await check('unmount invalidates pending list responses', async () => {
    const h = harness();
    const list = deferred<any[]>(); h.api.listExtensions = () => list.promise;
    h.render(); h.dispose(); list.resolve([extension]); await settle();
    assert.equal(h.render().extensions.length, 0);
  });
  assert.equal(failures.length, 0, `Extension regressions: ${failures.join(', ')}`);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
