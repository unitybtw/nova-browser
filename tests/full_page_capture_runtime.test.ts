import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import ts from 'typescript';

const tree = ts.createSourceFile('main.ts', fs.readFileSync('electron/main.ts', 'utf8'), ts.ScriptTarget.Latest, true);
let callback = '';
function find(node: ts.Node) {
  if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'capture-full-page') callback = node.arguments[1].getText(tree);
  ts.forEachChild(node, find);
}
find(tree); assert.ok(callback);
const compiled = ts.transpileModule(`exports.capture = ${callback};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
function harness(options: { attached?: boolean; failCapture?: boolean; metrics?: any; waitMetrics?: Promise<any>; waitCapture?: Promise<any> } = {}) {
  let attached = options.attached ?? false, detached = 0;
  const debuggerEvents = new EventEmitter();
  const commands: Array<{ name: string; params: any }> = [];
  const guest = Object.assign(new EventEmitter(), {
    id: 7, isDestroyed: () => false, getType: () => 'webview',
    debugger: Object.assign(debuggerEvents, {
      isAttached: () => attached,
      attach() { attached = true; },
      detach() { attached = false; detached++; debuggerEvents.emit('detach', {}, 'target_closed'); },
      async sendCommand(name: string, params: any) {
        commands.push({ name, params });
        if (name === 'Page.getLayoutMetrics') return options.waitMetrics ?? options.metrics ?? {
          cssContentSize: { width: 900, height: 1900 }, cssLayoutViewport: { pageX: 12, pageY: 250 },
        };
        if (name === 'Runtime.evaluate') return { result: { objectId: 'original-window' } };
        if (name === 'Page.captureScreenshot') {
          if (options.failCapture) throw new Error('capture failed');
          return options.waitCapture ?? { data: 'fixture-png' };
        }
        return {};
      },
    }),
  });
  const exports: any = {}, jobs = new Map();
  vm.runInNewContext(compiled, { exports, Number, Math, Set, Map,
    console: { error() {} }, setTimeout: (fn: () => void) => { fn(); return 0; },
    isTrustedSender: (event: any) => event.trusted === true,
    webContents: { fromId: (id: number) => id === guest.id ? guest : null },
    fullPageCaptureJobs: jobs,
  });
  return { guest, commands, jobs, options,
    capture: (trusted = true, id: any = 7) => exports.capture({ trusted }, id),
    detached: () => detached, attached: () => attached,
  };
}

export async function verifyFullPageCaptureRegressions() {
  let failures = 0;
  const check = async (name: string, test: () => Promise<void>) => {
    try { await test(); console.log(`[PASS] [Full-page capture] ${name}`); }
    catch (error) { failures++; console.error(`[FAIL] [Full-page capture] ${name}`, error); }
  };
  const waitForCapture = async (h: ReturnType<typeof harness>) => {
    for (let i = 0; i < 30; i++) {
      if (h.commands.some(command => command.name === 'Page.captureScreenshot')) return;
      await Promise.resolve();
    }
    assert.fail('capture command did not start');
  };
  await check('owned viewport override and debugger are cleaned up', async () => {
    const h = harness();
    assert.equal(await h.capture(), 'data:image/png;base64,fixture-png');
    assert.ok(h.commands.some(command => command.name === 'Emulation.clearDeviceMetricsOverride'));
    assert.equal(h.detached(), 1);
    assert.equal(h.guest.listenerCount('did-start-navigation'), 0);
    assert.equal(h.jobs.size, 0);
    const restore = h.commands.filter(command => command.name === 'Runtime.callFunctionOn').slice(-1)[0];
    assert.equal(restore?.params.objectId, 'original-window');
    assert.equal(restore?.params.arguments[0].value, 12);
    assert.equal(restore?.params.arguments[1].value, 250);
  });
  await check('overlapping requests share one capture and one debugger lifetime', async () => {
    const metrics = deferred<any>(); const h = harness({ waitMetrics: metrics.promise });
    const first = h.capture(), second = h.capture();
    assert.equal(h.commands.filter(command => command.name === 'Page.getLayoutMetrics').length, 1);
    metrics.resolve({ cssContentSize: { width: 900, height: 1900 } });
    assert.deepEqual(await Promise.all([first, second]), ['data:image/png;base64,fixture-png', 'data:image/png;base64,fixture-png']);
    assert.equal(h.commands.filter(command => command.name === 'Page.captureScreenshot').length, 1);
    assert.equal(h.detached(), 1);
  });
  await check('failed captures release their debugger and allow retry', async () => {
    const h = harness({ failCapture: true });
    assert.equal(await h.capture(), null);
    assert.equal(h.attached(), false);
    assert.equal(h.jobs.size, 0);
    assert.equal(h.guest.listenerCount('did-start-navigation'), 0);
    assert.ok(h.commands.some(command => command.name === 'Emulation.clearDeviceMetricsOverride'));
    assert.ok(h.commands.some(command => command.name === 'Runtime.callFunctionOn'), 'a failed capture must also restore its scroll position');
    h.options.failCapture = false;
    assert.equal(await h.capture(), 'data:image/png;base64,fixture-png');
  });
  await check('a busy debugger is left completely untouched', async () => {
    const h = harness({ attached: true });
    assert.equal(await h.capture(), null);
    assert.equal(h.detached(), 0);
    assert.equal(h.attached(), true);
    assert.equal(h.commands.length, 0);
  });
  await check('main-frame navigation invalidates a pending capture', async () => {
    const capture = deferred<any>(); const h = harness({ waitCapture: capture.promise });
    const result = h.capture();
    await waitForCapture(h);
    h.guest.emit('did-start-navigation', { isMainFrame: true });
    capture.resolve({ data: 'wrong-document' });
    assert.equal(await result, null);
    assert.equal(h.detached(), 1);
    assert.equal(h.guest.listenerCount('did-start-navigation'), 0);
    assert.equal(h.commands.some(command => command.name === 'Runtime.callFunctionOn' && command.params.arguments), false,
      'navigation must not restore old scroll state into the new document');
  });
  await check('a replacement debugger is never used or detached by the old capture', async () => {
    const capture = deferred<any>(); const h = harness({ waitCapture: capture.promise });
    const result = h.capture(); await waitForCapture(h);
    h.guest.debugger.detach();
    h.guest.debugger.attach();
    const beforeReplacementCommands = h.commands.length;
    capture.resolve({ data: 'obsolete-session' });
    assert.equal(await result, null);
    assert.equal(h.commands.length, beforeReplacementCommands);
    assert.equal(h.attached(), true);
    assert.equal(h.detached(), 1);
    assert.equal(h.guest.debugger.listenerCount('detach'), 0);
    assert.equal(h.jobs.size, 0);
  });
  await check('subframe navigation does not cancel the page capture', async () => {
    const metrics = deferred<any>(); const h = harness({ waitMetrics: metrics.promise });
    const result = h.capture();
    h.guest.emit('did-start-navigation', { isMainFrame: false });
    metrics.resolve({ cssContentSize: { width: 900, height: 1900 } });
    assert.equal(await result, 'data:image/png;base64,fixture-png');
  });
  await check('narrow documents are not expanded or padded to a desktop viewport', async () => {
    const h = harness({ metrics: { cssContentSize: { width: 180, height: 120 } } });
    await h.capture();
    const clip = h.commands.find(command => command.name === 'Page.captureScreenshot')!.params.clip;
    assert.equal(clip.width, 180); assert.equal(clip.height, 120);
  });
  await check('invalid metrics fail instead of inventing screenshot dimensions', async () => {
    for (const width of [NaN, Infinity, 0, -1]) {
      const h = harness({ metrics: { cssContentSize: { width, height: 1900 } } });
      assert.equal(await h.capture(), null);
      assert.equal(h.commands.some(command => command.name === 'Page.captureScreenshot'), false);
    }
  });
  await check('large documents remain within the existing dimension limits', async () => {
    const h = harness({ metrics: { cssContentSize: { width: 20000, height: 90000 } } });
    await h.capture();
    const clip = h.commands.find(command => command.name === 'Page.captureScreenshot')!.params.clip;
    assert.equal(clip.width, 8192); assert.equal(clip.height, 16384);
  });
  await check('untrusted callers and invalid guest identifiers cannot capture', async () => {
    const h = harness();
    assert.equal(await h.capture(false), null);
    for (const id of ['7', NaN, 7.5, 99]) assert.equal(await h.capture(true, id), null);
    assert.equal(h.commands.length, 0);
  });
  assert.equal(failures, 0, `${failures} full-page capture regressions`);
}
