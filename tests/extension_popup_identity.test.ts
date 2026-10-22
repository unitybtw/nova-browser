import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import ts from 'typescript';
import { matchesExtensionHostPermission } from '../src/utils/securityUtils';

// Extract and execute the actual registered IPC callback, including its event
// handlers and injection closure. No navigation/permission policy is copied.
const file = ts.createSourceFile('main.ts', fs.readFileSync('electron/main.ts', 'utf8'), ts.ScriptTarget.Latest, true);
let callback: ts.Node | undefined;
function find(node: ts.Node) {
  if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text === 'open-extension-popup') callback = node.arguments[1];
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
  currentUrl = originalUrl;
  getURL() { return this.currentUrl; }
  isDestroyed() { return false; }
  setWindowOpenHandler() {}
  async executeJavaScript(code: string) { scripts.push(code); return { width: 380, height: 520 }; }
}
class FakeWindow extends EventEmitter {
  id = 3;
  webContents = new FakeContents();
  constructor(..._args: unknown[]) { super(); popup = this; }
  isDestroyed() { return false; }
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
const code = ts.transpileModule(`exports.handler = ${callback!.getText(file)};`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
vm.runInNewContext(code, {
  exports, URL, console, BrowserWindow: FakeWindow, mainWindow: root,
  isTrustedSender: () => true, loadedExtensions: [{ id: extId, manifest: { permissions: ['tabs'] } }],
  session: { defaultSession: { getExtension: (id: string) => id === extId ? { id, manifest: { permissions: ['tabs'] } } : null } },
  activeExtensionPopupWin: null, activeExtensionPopupUrl: null, sendToMainWindow: () => {},
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
  popup!.webContents.emit('dom-ready');
  assert.ok(scripts.some(code => code.includes('https://example.com/private-document')), 'own extension gets its authorized metadata');
  scripts.length = 0;
  popup!.webContents.currentUrl = `chrome-extension://${otherId}/public.html`;
  popup!.webContents.emit('dom-ready');
  assert.ok(!scripts.some(code => code.includes('private-document')), 'a different committed extension document must never receive original metadata');
  console.log('[PASS] Extension popup navigation, redirects and committed-document metadata binding.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
