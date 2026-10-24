import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import ts from 'typescript';
import path from 'node:path';
import { matchesExtensionHostPermission } from '../src/utils/securityUtils';

// Extract and execute the actual registered IPC callback, including its event
// handlers and injection closure. No navigation/permission policy is copied.
const file = ts.createSourceFile('main.ts', fs.readFileSync('electron/main.ts', 'utf8'), ts.ScriptTarget.Latest, true);
let callback: ts.Node | undefined, contextCallback: ts.Node | undefined;
function find(node: ts.Node) {
  if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text === 'open-extension-popup') callback = node.arguments[1];
  if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'extension-popup-context') contextCallback = node.arguments[1];
  ts.forEachChild(node, find);
}
find(file);
assert.ok(callback);
const extId = 'a'.repeat(32);
const otherId = 'b'.repeat(32);
const originalUrl = `chrome-extension://${extId}/popup.html`;
let popup: FakeWindow;
const scripts: string[] = [];
class FakeContents extends EventEmitter {
  id = 7;
  loading = false;
  currentUrl = originalUrl;
  mainFrame = { url: originalUrl };
  getURL() { return this.currentUrl; }
  isDestroyed() { return false; }
  isLoading() { return this.loading; }
  setWindowOpenHandler() {}
  async executeJavaScript(code: string) { scripts.push(code); return { width: 380, height: 520 }; }
}
class FakeWindow extends EventEmitter {
  id = 3;
  destroyed = false;
  webContents = new FakeContents();
  constructor(..._args: unknown[]) { super(); popup = this; }
  isDestroyed() { return this.destroyed; }
  close() { this.destroyed = true; this.emit('closed'); }
  destroy() { this.close(); }
  isVisible() { return true; }
  getContentBounds() { return { width: 1200, height: 800 }; }
  async loadURL(url: string) { this.webContents.currentUrl = url; }
  show() {}
  focus() {}
  setSize() {}
}
const root: any = new EventEmitter();
root.isDestroyed = () => false;
root.getContentBounds = () => ({ width: 1200, height: 800 });
const exports: any = {};
const contexts = new Map();
const code = ts.transpileModule(`exports.handler = ${callback!.getText(file)};exports.contextHandler = ${contextCallback!.getText(file)};`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
vm.runInNewContext(code, {
  exports, URL, console, path, __dirname: path.resolve('dist-electron'), BrowserWindow: FakeWindow, mainWindow: root,
  isTrustedSender: () => true, loadedExtensions: [{ id: extId, manifest: { permissions: ['tabs'] } }],
  session: { defaultSession: { getExtension: (id: string) => id === extId ? { id, manifest: { permissions: ['tabs'] } } : null } },
  activeExtensionPopupWin: null, activeExtensionPopupUrl: null, sendToMainWindow: () => {},
  extensionPopupContexts: contexts,
  matchesExtensionHostPermission, isExtensionAllowedInIncognito: () => false, setTimeout: () => 0
});

async function run() {
  const invalid = await exports.handler({}, `chrome-extension://user@${extId}/popup.html`);
  assert.ok(invalid.error, 'credential-bearing popup URLs must be rejected before creating a window');
  await exports.handler({}, originalUrl, null, { url: 'https://example.com/private-document', title: 'Private document', webContentsId: 4 });
  for (const event of ['will-navigate', 'will-redirect']) {
    for (const [url, blocked] of [
      [`chrome-extension://${extId}/another.html`, false],
      [`chrome-extension://${otherId}/public.html`, true],
      [`chrome-extension://user@${extId}/popup.html`, true],
      ['https://example.com/', true]
    ] as const) {
      let prevented = false;
      popup!.webContents.emit(event, { preventDefault: () => { prevented = true; } }, url);
      assert.equal(prevented, blocked, `${event} must enforce extension identity: ${url}`);
    }
  }
  const event: any = { sender: popup!.webContents, senderFrame: popup!.webContents.mainFrame };
  let replies = 0, returned: any;
  Object.defineProperty(event, 'returnValue', { set(value) { replies++; returned = value; } });
  exports.contextHandler(event);
  assert.equal(replies, 1, 'sendSync must receive exactly one reply, not an early null followed by data');
  assert.equal(returned.tabData.url, 'https://example.com/private-document');
  popup!.webContents.mainFrame.url = `chrome-extension://${otherId}/public.html`;
  exports.contextHandler(event);
  assert.equal(returned, null, 'a different extension document cannot receive original metadata');
  popup!.webContents.mainFrame.url = originalUrl;
  event.senderFrame = { url: originalUrl };
  exports.contextHandler(event);
  assert.equal(returned, null, 'subframes cannot request the popup tab context');
  const privateResult = await exports.handler({}, originalUrl, null, { isIncognito: true, webContentsId: 9 });
  assert.ok(privateResult.error, 'a popup cannot be launched against a private tab without explicit access');
  popup!.webContents.loading = true;
  const changedSource = await exports.handler({}, originalUrl, null, { url: 'https://example.com/another-document', webContentsId: 5 });
  assert.ok(!changedSource.toggled, 'opening from another tab must replace the popup instead of treating it as a close toggle');
  assert.equal(contexts.get(popup!.webContents.id).tabData.id, 5, 'loading-popup reuse must not preserve the source tab from a previous click');
  console.log('[PASS] Extension popup navigation, redirects and committed-document metadata binding.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
