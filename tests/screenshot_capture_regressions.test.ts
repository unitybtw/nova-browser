import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { getEventListeners } from 'node:events';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function run() {
  const cells: any[] = [];
  let cursor = 0;
  const effects: Array<() => void> = [], opened: boolean[] = [], alerts: any[] = [];
  const guests = new Map<string, any>();
  let capture = deferred<string>();
  let fullRequests = 0;
  const api = { captureTabThumbnail: () => capture.promise, captureFullPage: () => { fullRequests++; return capture.promise; } };
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useScreenshots.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, {
    exports, console: { error() {} },
    document: { querySelector: (selector: string) => guests.get(selector) ?? null },
    require: (name: string) => {
      if (name === '../utils/electronBridge') return { getElectronAPI: () => api };
      if (name === '../utils/confirmDialog') return { showAlert: (alert: any) => { alerts.push(alert); } };
      assert.equal(name, 'react');
      return {
        useState: (initial: unknown) => {
          const index = cursor++;
          cells[index] ??= { value: initial };
          return [cells[index].value, (value: unknown) => { cells[index].value = value; }];
        },
        useRef: (value: unknown) => cells[cursor++] ??= { current: value },
        useCallback: (fn: unknown) => fn,
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
  const guest = Object.assign(new EventTarget(), { getWebContentsId: () => 7, isConnected: true });
  guests.set('webview[data-tab-id="a"]', guest);
  let options = { activeTabId: 'a', tabs: [{ id: 'a', url: 'https://example.com/a', title: 'Original page' }], setIsScreenshotOpen: (value: boolean) => opened.push(value) };
  const render = () => {
    cursor = 0;
    const result = exports.useScreenshots(options);
    while (effects.length) effects.shift()!();
    return result;
  };
  let hook = render();
  const first = hook.handleTakeScreenshot();
  options = { ...options, activeTabId: 'b', tabs: [...options.tabs, { id: 'b', url: 'https://example.com/b', title: 'Other page' }] };
  hook = render();
  options = { ...options, activeTabId: 'a' }; hook = render();
  capture.resolve('data:image/png;base64,old'); await first;
  assert.equal(opened.length, 0, 'switching tabs must discard a pending screenshot');
  assert.equal(render().screenshotDataUrl, null);

  capture = deferred(); const reloaded = hook.handleTakeScreenshot();
  guest.dispatchEvent(new Event('did-start-navigation'));
  capture.resolve('data:image/png;base64,before-reload'); await reloaded;
  assert.equal(opened.length, 0, 'a same-URL reload must invalidate a pending screenshot');

  options = { ...options, activeTabId: 'a' }; hook = render();
  capture = deferred(); const navigated = hook.handleTakeScreenshot();
  options = { ...options, tabs: [{ id: 'a', url: 'https://example.com/new', title: 'New document' }, { id: 'b', url: 'https://example.com/b', title: 'Other page' }] }; render();
  capture.resolve('data:image/png;base64,previous-document'); await navigated;
  assert.equal(opened.length, 0, 'navigation in the same guest invalidates the old capture');

  capture = deferred(); hook = render(); const olderCapture = capture;
  const older = hook.handleTakeScreenshot();
  capture = deferred(); const newer = hook.handleTakeScreenshot();
  capture.resolve('data:image/png;base64,newest'); await newer;
  olderCapture.resolve('data:image/png;base64,obsolete'); await older;
  assert.equal(render().screenshotDataUrl, 'data:image/png;base64,newest');
  assert.equal(render().screenshotPageTitle, 'New document', 'the preview title belongs to its capture, not the selected tab');
  assert.equal(opened.length, 1, 'only the latest request can open a preview');

  guests.set('webview[data-tab-id="b"]', { getWebContentsId: () => 9, isConnected: true });
  options = { ...options, activeTabId: 'b' }; hook = render();
  const wrongOwner = hook.handleCaptureFullPage();
  assert.equal(fullRequests, 0, 'a screenshot of A must never issue a full-page capture for B');
  assert.equal(await wrongOwner, null);
  options = { ...options, activeTabId: 'a' }; hook = render();
  capture = deferred(); const validFull = hook.handleCaptureFullPage();
  capture.resolve('data:image/png;base64,valid-full');
  assert.equal(await validFull, 'data:image/png;base64,valid-full');
  capture = deferred(); hook = render(); const full = hook.handleCaptureFullPage();
  options = { ...options, activeTabId: 'b' }; render();
  capture.resolve('data:image/png;base64,wrong-tab');
  assert.equal(await full, null, 'full-page capture must also keep its original owner');
  options = { ...options, activeTabId: 'a' }; hook = render();

  capture = deferred(); hook = render(); const replaced = hook.handleTakeScreenshot();
  const replacementGuest = Object.assign(new EventTarget(), { getWebContentsId: () => 8, isConnected: true });
  guests.set('webview[data-tab-id="a"]', replacementGuest);
  capture.resolve('data:image/png;base64,replaced-guest'); await replaced;
  assert.equal(opened.length, 1, 'replacing the webview invalidates its in-flight capture');

  capture = deferred(); hook = render(); const failed = hook.handleTakeScreenshot();
  capture.reject(new Error('capture failed')); await failed;
  assert.equal(alerts.length, 1, 'a current capture failure needs visible feedback');

  capture = deferred(); const unmounted = hook.handleTakeScreenshot();
  assert.equal(getEventListeners(replacementGuest, 'did-start-navigation').length, 1);
  cells.forEach(cell => cell.cleanup?.());
  assert.equal(getEventListeners(replacementGuest, 'did-start-navigation').length, 0, 'unmount removes navigation listeners even if capture is still pending');
  capture.resolve('data:image/png;base64,unmounted'); await unmounted;
  assert.equal(opened.length, 1, 'unmount invalidates pending captures');
  console.log('[PASS] Screenshot ownership, navigation/replacement races, latest-request ordering and failure feedback');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
