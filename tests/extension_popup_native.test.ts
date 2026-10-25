// Explicit native smoke test; run with Electron, outside the Node-only suite.
import { app, BrowserWindow, session, ipcMain } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { matchesExtensionHostPermission } from '../src/utils/securityUtils';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-extension-native-'));
app.setPath('userData', path.join(temp, 'profile'));
fs.mkdirSync(app.getPath('userData'), { recursive: true });
const fixture = path.join(temp, 'fixture'); fs.mkdirSync(fixture);
fs.writeFileSync(path.join(fixture, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'Nova compatibility fixture', version: '1.0', permissions: ['tabs', 'storage', 'scripting'], host_permissions: ['http://127.0.0.1/*'], content_scripts: [{ matches: ['http://127.0.0.1/*'], js: ['content.js'] }], action: { default_popup: 'popup.html' } }));
fs.writeFileSync(path.join(fixture, 'content.js'), 'document.documentElement.dataset.novaExtensionInjected = "yes";');
fs.writeFileSync(path.join(fixture, 'popup.html'), '<!doctype html><html><body><p>Nova extension compatibility test</p><script src="popup.js"></script></body></html>');
fs.writeFileSync(path.join(fixture, 'popup.js'), `
  window.__probe = { stage: 'starting' };
  try {
    chrome.tabs.query({active:true,currentWindow:true}, async tabs => {
      try {
        const results = await chrome.scripting.executeScript({target:{tabId:tabs[0].id},func:()=>document.title});
        await chrome.storage.local.set({novaFixture:'persisted'});
        const saved = await chrome.storage.local.get('novaFixture');
        window.__probe = {stage:'complete',url:tabs[0]?.url || '',id:tabs[0]?.id,title:results[0]?.result,storage:saved.novaFixture};
      } catch(error) { window.__probe = {stage:'error',error:String(error),url:tabs[0]?.url || ''}; }
    });
  } catch(error) { window.__probe = {stage:'error',error:String(error)}; }
`);

app.whenReady().then(async () => {
  let exitCode = 1;
  const popups: BrowserWindow[] = [];
  const server = http.createServer((_request, response) => { response.end('<!doctype html><title>Native guest fixture</title><p>Local test page</p>'); });
  try {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const expectedUrl = `http://127.0.0.1:${(server.address() as any).port}/document`;
    const ext = await session.defaultSession.extensions.loadExtension(fixture, { allowFileAccess: false });
    const root = new BrowserWindow({ width: 1000, height: 700, show: true, webPreferences: { webviewTag: true, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    await root.loadURL('about:blank');
    await root.webContents.executeJavaScript('window.__hostMarker = "preserved"');
    const guestReady = new Promise<Electron.WebContents>(resolve => root.webContents.once('did-attach-webview', (_event, guest) => guest.once('did-finish-load', () => resolve(guest))));
    await root.webContents.executeJavaScript(`const guest = document.createElement('webview'); guest.src = ${JSON.stringify(expectedUrl)}; guest.style.cssText = 'width:100%;height:100%'; document.body.appendChild(guest);`);
    const guest = await guestReady;
    const tree = ts.createSourceFile('main.ts', fs.readFileSync('electron/main.ts', 'utf8'), ts.ScriptTarget.Latest, true);
    let callback = '', contextCallback = '', removalCallback = '';
    const persistenceHelpers: string[] = [];
    function find(node: ts.Node) {
      if (ts.isFunctionDeclaration(node) && node.name &&
          ['getDisabledExtensionIds', 'setDisabledExtensionIds', 'getUnpackedExtensionPaths', 'setUnpackedExtensionPaths'].includes(node.name.text)) persistenceHelpers.push(node.getText(tree));
      if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'open-extension-popup') callback = node.arguments[1].getText(tree);
      if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'extension-popup-context') contextCallback = node.arguments[1].getText(tree);
      if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'remove-extension') removalCallback = node.arguments[1].getText(tree);
      ts.forEachChild(node, find);
    }
    find(tree); assert.ok(callback); assert.ok(removalCallback);
    const unpackedExtensionsFile = path.join(app.getPath('userData'), 'unpacked_extensions.json');
    fs.writeFileSync(unpackedExtensionsFile, JSON.stringify({ [ext.id]: fixture }));
    class PopupWindow extends BrowserWindow { constructor(options: any) {
      super(options); popups.push(this);
      this.webContents.on('console-message', details => console.log('[Fixture popup console]', details.message));
      this.webContents.on('preload-error', (_event, preload, error) => console.log('[Fixture preload error]', preload, error.message));
    } }
    const context: any = {
      exports: {}, URL, console, fs, path, session, BrowserWindow: PopupWindow, mainWindow: root,
      __dirname: path.resolve('dist-electron'), isTrustedSender: () => true, loadedExtensions: [ext],
      activeExtensionPopupWin: null, activeExtensionPopupUrl: null, sendToMainWindow() {},
      extensionPopupContexts: new Map(),
      app, unpackedExtensionsFile, disabledExtensionsFile: path.join(app.getPath('userData'), 'disabled_extensions.json'),
      incognitoAllowedExtensions: new Set([ext.id]),
      dialog: { showMessageBox: async () => ({ response: 0 }) },
      matchesExtensionHostPermission, isExtensionAllowedInIncognito: () => false, setTimeout, clearTimeout,
    };
    const callbacks = `${persistenceHelpers.join('\n')}\nexports.handler = ${callback};${contextCallback ? `exports.contextHandler = ${contextCallback};` : ''}
      exports.remove = ${removalCallback}; exports.rows = () => loadedExtensions;`;
    const compiled = ts.transpileModule(callbacks, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    // Electron native wrappers must be constructed in Node's own realm.
    new Function(...Object.keys(context), compiled + '\nreturn exports;')(...Object.values(context));
    if (contextCallback) ipcMain.on('extension-popup-context', context.exports.contextHandler);
    const opening = context.exports.handler({}, `chrome-extension://${ext.id}/popup.html`, null, { url: expectedUrl, title: 'Fixture document', webContentsId: guest.id });
    const repeated = context.exports.handler({}, `chrome-extension://${ext.id}/popup.html`, null, { url: expectedUrl, title: 'Fixture document', webContentsId: guest.id });
    const [result, repeatResult] = await Promise.all([opening, repeated]);
    assert.equal(result.success, true, JSON.stringify(result));
    assert.equal(repeatResult.success, true, JSON.stringify(repeatResult));
    assert.equal(popups.length, 1, 'repeated clicks while loading must not destroy the opening popup');
    const popup = popups.at(-1)!;
    let probe: any;
    for (let i = 0; i < 30; i++) {
      probe = await popup.webContents.executeJavaScript('window.__probe');
      if (probe?.stage === 'complete' || probe?.stage === 'error') break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    console.log('[Native extension startup]', JSON.stringify(probe));
    assert.equal(probe?.url, expectedUrl, 'extension startup must see the actual active tab before its first script runs');
    assert.equal(probe?.id, guest.id);
    assert.equal(probe?.stage, 'complete');
    assert.equal(probe?.title, 'Native guest fixture');
    assert.equal(probe?.storage, 'persisted');
    assert.equal(await guest.executeJavaScript('document.documentElement.dataset.novaExtensionInjected'), 'yes');
    console.log('[PASS] Native MV3 startup, real webview scripting/content injection and local storage');
    const gone = new Promise<void>(resolve => popup.webContents.once('render-process-gone', () => resolve()));
    popup.webContents.forcefullyCrashRenderer();
    await gone;
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(popup.isDestroyed(), true, 'a crashed extension must not leave a dead popup window');
    assert.equal(await root.webContents.executeJavaScript('window.__hostMarker'), 'preserved', 'the host renderer must survive without reload');
    assert.equal(context.extensionPopupContexts.size, 0);
    const reopened = await context.exports.handler({}, `chrome-extension://${ext.id}/popup.html`, null, { url: expectedUrl, title: 'Fixture document', webContentsId: guest.id });
    assert.equal(reopened.success, true, 'a closed crashed popup can be opened again');
    console.log('[PASS] Native extension crash cleanup, host survival and reopen');
    const removal = await context.exports.remove({}, ext.id);
    assert.equal(removal.success, true, JSON.stringify(removal));
    assert.equal(session.defaultSession.extensions.getExtension(ext.id), null);
    assert.equal(popups.at(-1)!.isDestroyed(), true);
    assert.equal(context.extensionPopupContexts.size, 0);
    assert.equal(context.incognitoAllowedExtensions.has(ext.id), false);
    assert.equal(context.exports.rows().length, 0);
    assert.deepEqual(JSON.parse(fs.readFileSync(unpackedExtensionsFile, 'utf8')), {});
    assert.equal(fs.existsSync(path.join(fixture, 'manifest.json')), true, 'uninstall must preserve external developer source');
    console.log('[PASS] Native extension removal unloads runtime, closes its popup and preserves unpacked source');
    exitCode = 0;
  } catch (error) { console.error(error); }
  finally { BrowserWindow.getAllWindows().forEach(window => window.destroy()); server.close(); app.exit(exitCode); }
});
