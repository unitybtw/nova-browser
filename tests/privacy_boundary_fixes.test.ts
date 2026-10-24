import assert from 'node:assert/strict';
import { getVisibleDownloads, getPersistableDownloads } from '../src/hooks/useDownloads';
import { resolveNewTabRequest } from '../src/hooks/useAppIpc';
import type { DownloadItem } from '../src/types/browser';
const normal: DownloadItem = { id: 'normal', filename: 'normal.pdf', url: 'https://example.com', receivedBytes: 1, totalBytes: 1, state: 'completed' };
const privateItem = { ...normal, id: 'private', isPrivate: true, privateSessionId: 'incognito-a' };
const otherPrivate = { ...privateItem, id: 'other', privateSessionId: 'incognito-b' };
assert.deepEqual(getPersistableDownloads([normal, privateItem, otherPrivate]), [normal]);
assert.deepEqual(getVisibleDownloads([normal, privateItem, otherPrivate]), [normal]);
assert.deepEqual(getVisibleDownloads([normal, privateItem, otherPrivate], 'incognito-a'), [privateItem]);
assert.deepEqual(getVisibleDownloads([normal, privateItem, otherPrivate], '*'), [privateItem, otherPrivate], 'the private downloads page can manage all private transfers without showing normal history');
const source = { id: 'a', webContentsId: 7, isIncognito: true } as any;
assert.deepEqual(resolveNewTabRequest({ url: 'https://example.com', sourceWebContentsId: 7, isIncognito: true }, [source]), { url: 'https://example.com', sourceTabId: 'a', isIncognito: true });
assert.equal(resolveNewTabRequest({ url: 'https://example.com', sourceWebContentsId: 7, isIncognito: true }, [])?.isIncognito, true, 'source closure cannot downgrade a queued private open');
assert.equal(resolveNewTabRequest('https://example.com', [])?.isIncognito, undefined, 'legacy source-less opens retain normal defaults');
assert.equal(resolveNewTabRequest({ url: 'javascript:alert(1)', sourceWebContentsId: 7, isIncognito: true }, [source]), null);
console.log('[PASS] Private download persistence/view isolation and trusted popup provenance');

// Run the actual main-process routing helper and callback bodies, with only
// Electron effects replaced. Do not duplicate the session-selection policy.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const mainSource = fs.readFileSync('electron/main.ts', 'utf8');
const tree = ts.createSourceFile('main.ts', mainSource, ts.ScriptTarget.Latest, true);
let routingFunction = '', guestPopup = '';
const contextClicks: string[] = [];
const labelsToCheck = new Set(['labels.openLinkNewTab', 'labels.openImageNewTab', 'labels.searchImageLens', 'labels.searchFor(shortQuery)']);
function inspect(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'openTabFromWebContents') routingFunction = node.getText(tree);
  if (ts.isCallExpression(node) && node.expression.getText(tree) === 'contents.setWindowOpenHandler') guestPopup = node.arguments[0].getText(tree);
  if (ts.isNewExpression(node) && node.expression.getText(tree) === 'MenuItem' && node.arguments?.[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
    const props = node.arguments[0].properties.filter(ts.isPropertyAssignment);
    const label = props.find(prop => prop.name.getText(tree) === 'label')?.initializer.getText(tree);
    const click = props.find(prop => prop.name.getText(tree) === 'click');
    if (label && labelsToCheck.has(label) && click) contextClicks.push(click.initializer.getText(tree));
  }
  ts.forEachChild(node, inspect);
}
inspect(tree);
assert.ok(routingFunction && guestPopup);
assert.ok(contextClicks.length === 4, 'native link context action is exercised');
const emitted: any[] = [];
const defaultSession = {};
const contents = { id: 7, session: {}, isDestroyed: () => false };
const context: any = vm.createContext({ session: { defaultSession }, sendToMainWindow: (channel: string, request: any) => emitted.push([channel, request]),
  popupHistory: new Map(), contents, wc: contents, loadedExtensions: [], URL, Date, console,
  params: { linkURL: 'https://example.com/link', srcURL: 'https://example.com/image' }, queryText: 'selected text' });
function execute(code: string) { vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, context); }
execute(routingFunction);
execute(`globalThis.popupHandler = ${guestPopup};`);
context.popupHandler({ url: 'https://example.com/popup' });
for (const callback of contextClicks) { execute(`globalThis.contextClick = ${callback};`); context.contextClick(); }
assert.ok(emitted.every(([, request]) => request.isIncognito === true && request.sourceWebContentsId === 7));
contents.session = defaultSession;
context.openTabFromWebContents('https://example.com/normal', contents);
assert.equal(emitted.at(-1)[1].isIncognito, false);
console.log('[PASS] Actual native guest popup and context-menu routing retain private-session provenance');

// Exercise the shipped menu/shortcut callback rather than a second routing policy.
const appTree = ts.createSourceFile('App.tsx', fs.readFileSync('src/App.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let openDownloads = '';
function inspectApp(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(appTree) === 'handleOpenDownloads' && node.initializer && ts.isCallExpression(node.initializer)) {
    openDownloads = node.initializer.arguments[0].getText(appTree);
  }
  ts.forEachChild(node, inspectApp);
}
inspectApp(appTree);
assert.ok(openDownloads);
const opened: any[] = [], activated: string[] = [];
const normalDownloads = { id: 'normal-downloads', url: 'nova://downloads' };
const privateDownloads = { id: 'private-downloads', url: 'nova://downloads', isIncognito: true };
const tabsRef = { current: [source, normalDownloads] as any[] };
const activeTabIdRef = { current: source.id };
const appContext = vm.createContext({ tabsRef, activeTabIdRef, closeAllModals: () => {}, activateTab: (id: string) => activated.push(id), handleNewTab: (...args: any[]) => opened.push(args) });
vm.runInContext(ts.transpileModule(`globalThis.openDownloads = ${openDownloads};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, appContext);
appContext.openDownloads();
assert.equal(activated.length, 0, 'a private menu action must never activate an existing normal downloads page');
assert.equal(opened[0][0], 'nova://downloads');
assert.equal(opened[0][1], source.id, 'a new downloads tab inherits its private source');
tabsRef.current.push(privateDownloads);
appContext.openDownloads();
assert.deepEqual(activated, [privateDownloads.id]);
tabsRef.current.push({ id: 'normal-source', url: 'https://example.com' });
activeTabIdRef.current = 'normal-source';
appContext.openDownloads();
assert.deepEqual(activated, [privateDownloads.id, normalDownloads.id], 'normal browsing retains its own downloads page');
console.log('[PASS] Actual Downloads menu/shortcut callback keeps normal and private pages separate');
