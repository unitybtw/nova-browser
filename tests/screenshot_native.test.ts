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
    let thumbnailHandler = '', fullPageHandler = '';
    function find(node: ts.Node) {
      if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'capture-tab-thumbnail') thumbnailHandler = node.arguments[1].getText(tree);
      if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'capture-full-page') fullPageHandler = node.arguments[1].getText(tree);
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

    // Verify lifecycle restoration, including a page with smooth-scroll CSS.
    // This does not certify off-screen raster coverage: embedded Electron
    // surfaces can repeat content beyond their visible host bounds.
    const longPage = '<!doctype html><html style="scroll-behavior:smooth"><body style="margin:0"><header style="height:600px;background:#dde8f0">Page header</header><main style="height:1200px;background:#fff">Long document</main><footer style="height:100px;background:rgb(12,180,90)">Footer</footer></body></html>';
    await guest.loadURL('data:text/html,' + encodeURIComponent(longPage));
    await guest.executeJavaScript('window.scrollTo({left:0,top:250,behavior:"instant"}); new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const before = await guest.executeJavaScript('({width:innerWidth,height:innerHeight,scroll:scrollY,hero:document.querySelector("header").offsetHeight,content:document.documentElement.scrollHeight})');
    assert.ok(fullPageHandler);
    const fullCode = ts.transpileModule(`return ${fullPageHandler};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
    const fullCapture = new Function('isTrustedSender', 'webContents', 'fullPageCaptureJobs', fullCode)(() => true, webContents, new Map());
    const fullImage = await fullCapture({}, guest.id);
    assert.ok(fullImage, 'full-page capture must produce a PNG');
    await guest.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const after = await guest.executeJavaScript('({width:innerWidth,height:innerHeight,scroll:scrollY,hero:document.querySelector("header").offsetHeight,content:document.documentElement.scrollHeight})');
    assert.deepEqual(after, before, 'capture must preserve viewport, scroll position and document layout');
    const fullSize = pngSize(fullImage);
    assert.ok(fullSize.height > originalSize.height);
    assert.equal(guest.debugger.isAttached(), false);
    console.log('[PASS] Native full-page capture restores viewport and immediate scroll position:', fullSize);
    exitCode = 0;
  } catch (error) { console.error(error); }
  finally { root.destroy(); app.exit(exitCode); }
});
