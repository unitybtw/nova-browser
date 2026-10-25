// Run with Electron: exercises the production hook with a real sandboxed
// <webview>, including the NativeImage returned to the host renderer.
import { app, BrowserWindow, webContents } from 'electron';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-screenshot-native-'));
app.setPath('userData', profile);
function pngSize(dataUrl: string) {
  const png = Buffer.from(dataUrl.split(',')[1], 'base64');
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

app.whenReady().then(async () => {
  let exitCode = 1;
  const root = new BrowserWindow({ width: 1000, height: 760, show: false,
    webPreferences: { webviewTag: true, sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  try {
    await root.loadURL('data:text/html,<html><body style="margin:0"></body></html>');
    const ready = new Promise<Electron.WebContents>(resolve => root.webContents.once('did-attach-webview', (_event, guest) => guest.once('did-finish-load', () => resolve(guest))));
    const url = 'data:text/html,' + encodeURIComponent('<!doctype html><html><body style="margin:0;background:#dde8f0"><h1>Native screenshot resolution</h1><p>Readable text and the original viewport size must survive capture.</p></body></html>');
    await root.webContents.executeJavaScript(`const guest = document.createElement('webview'); guest.dataset.tabId = 'fixture'; guest.style.cssText = 'width:900px;height:600px'; guest.src = ${JSON.stringify(url)}; document.body.appendChild(guest);`);
    const guest = await ready;
    root.showInactive();
    await guest.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const originalImage = await guest.capturePage();
    assert.equal(originalImage.isEmpty(), false);
    const originalSize = pngSize(originalImage.toDataURL());

    // Obtain the actual thumbnail through its production main-process handler.
    const tree = ts.createSourceFile('main.ts', fs.readFileSync('electron/main.ts', 'utf8'), ts.ScriptTarget.Latest, true);
    let thumbnailHandler = '';
    function find(node: ts.Node) {
      if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'capture-tab-thumbnail') thumbnailHandler = node.arguments[1].getText(tree);
      ts.forEachChild(node, find);
    }
    find(tree); assert.ok(thumbnailHandler);
    const nativeCode = ts.transpileModule(`return ${thumbnailHandler};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
    const thumbnail = await new Function('isTrustedSender', 'webContents', nativeCode)(() => true, webContents)({}, guest.id);
    const thumbnailSize = pngSize(thumbnail);
    assert.ok(originalSize.width > thumbnailSize.width, 'fixture must distinguish a native screenshot from a thumbnail');

    const hookCode = ts.transpileModule(fs.readFileSync('src/hooks/useScreenshots.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const result = await root.webContents.executeJavaScript(`(async () => {
      const cells = []; let cursor = 0, thumbnailCalls = 0;
      const alerts = [], opened = [];
      const react = {
        useState(initial) { const index = cursor++; cells[index] ??= {value:initial}; return [cells[index].value, value => cells[index].value = value]; },
        useRef(initial) { return cells[cursor++] ??= {current:initial}; },
        useCallback(fn) { return fn; }, useEffect() {},
      };
      const api = {captureTabThumbnail: async () => {thumbnailCalls++; return ${JSON.stringify(thumbnail)};}};
      const require = name => {
        if (name === 'react') return react;
        if (name === '../utils/electronBridge') return {getElectronAPI:()=>api};
        if (name === '../utils/confirmDialog') return {showAlert: alert => alerts.push(alert)};
        throw new Error('Unexpected dependency: ' + name);
      };
      const exports = {};
      new Function('require', 'exports', ${JSON.stringify(hookCode)})(require, exports);
      const options = {activeTabId:'fixture',tabs:[{id:'fixture',url:${JSON.stringify(url)},title:'Native fixture'}],setIsScreenshotOpen:value=>opened.push(value)};
      await exports.useScreenshots(options).handleTakeScreenshot();
      cursor = 0;
      const hook = exports.useScreenshots(options);
      return {image:hook.screenshotDataUrl,title:hook.screenshotPageTitle,alerts,opened,thumbnailCalls};
    })()`);
    assert.deepEqual(result.alerts, []);
    assert.deepEqual(result.opened, [true]);
    assert.equal(result.title, 'Native fixture');
    assert.deepEqual(pngSize(result.image), originalSize, 'saved screenshot must preserve the full native viewport resolution');
    assert.equal(result.thumbnailCalls, 0);
    console.log('[PASS] Native screenshot hook retains viewport PNG dimensions:', originalSize, 'thumbnail:', thumbnailSize);
    exitCode = 0;
  } catch (error) { console.error(error); }
  finally { root.destroy(); app.exit(exitCode); }
});
