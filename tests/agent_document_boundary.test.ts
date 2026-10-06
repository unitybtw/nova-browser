import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { isSafeAgentNavigationUrl } from '../src/utils/safeNavigation';

async function run() {
  let request: Function = () => {};
  let approve: (value: boolean) => void = () => {};
  let context: any;
  let url = 'https://example.com/';
  let scripts = 0; let flipBeforeScript = false; let flipDuringCapture = false;
  let captures = 0;
  let duplicates = 0; let lastNewTabOptions: any;
  let resolveDns: (() => void) | undefined;
  const listeners = new Map<string, Set<Function>>();
  const fire = (name: string) => listeners.get(name)?.forEach(fn => fn({ isMainFrame: true }));
  const webview = {
    getURL: () => url, getAttribute: () => 'tab', isLoading: () => false,
    addEventListener: (name: string, fn: Function) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(fn); },
    removeEventListener: (name: string, fn: Function) => listeners.get(name)?.delete(fn),
    executeJavaScript: async (code: string) => {
      scripts++;
      if (flipBeforeScript) { url = 'http://127.0.0.1/'; flipBeforeScript = false; }
      return vm.runInNewContext(code, { window: { location: { href: url } }, location: { href: url }, document: {
        body: { innerText: 'private-service-secret' }, documentElement: { innerText: '' }, querySelectorAll: () => [],
      }, URL });
    },
    capturePage: async () => { captures++; if (flipDuringCapture) { url = 'http://[::1]/'; fire('did-start-navigation'); flipDuringCapture = false; } return { toDataURL: () => 'private-image' }; },
  };
  const refs: any[] = [];
  const responses: any[] = [];
  const api = {
    onMcpActionRequest: (fn: Function) => { request = fn; return () => {}; },
    onMcpActionCancel: () => () => {}, respondMcpAction: (...args: any[]) => responses.push(args),
    checkAgentNavigationHost: async () => { if (resolveDns) await new Promise<void>(resolve => { resolveDns = resolve; }); return { allowed: true }; },
  };
  const module: any = { exports: {} };
  const imports: Record<string, any> = {
    react: { useEffect: (fn: Function) => fn(), useRef: (current: any) => { const ref = { current }; refs.push(ref); return ref; } },
    '../services/aiAgent': { aiAgent: { setActionContext: (value: any) => { context = value; } } },
    '../services/agentOrchestrator': { orchestrator: { enqueueAction: () => ({ id: 'approval', done: new Promise<boolean>(resolve => { approve = resolve; }) }), updateActionState: () => {}, denyAction: () => approve(false) } },
    '../utils/safeNavigation': { isSafeAgentNavigationUrl },
    '../utils/searchHistoryBookmarks': { searchHistoryAndBookmarks: () => [] },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useBrowserAgentBridge.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText, { module, exports: module.exports, require: (name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected dependency ${name}`);
    return imports[name];
  }, URL, WeakMap, Map, Set, console, setTimeout, clearTimeout,
  window: { electronAPI: api }, document: { querySelector: () => webview, querySelectorAll: () => [webview] } });
  module.exports.useBrowserAgentBridge({ activeTabId: 'tab', tabs: [{ id: 'tab', url }], history: [], bookmarks: [],
    settingsRef: { current: { mcpServerEnabled: true } }, activeWorkspaceIdRef: { current: 'default' },
    setActiveWorkspaceId: () => {}, setActiveTabId: () => {}, setTabs: () => {}, handleNavigate: () => {},
    handleNewTab: (_url: string, _source: unknown, opts: any) => { duplicates++; lastNewTabOptions = opts; }, handleCloseTab: () => {}, handleSelectTab: () => {} });
  const call = async (tool: string) => {
    request(tool, tool, {}, Date.now() + 15000); approve(true);
    await new Promise(resolve => setImmediate(resolve));
    const value = responses.at(-1)?.[1]; return typeof value === 'string' ? value : JSON.stringify(value);
  };
  url = 'http://127.0.0.1:8080/';
  assert.match(String(await call('browser_read_page')), /blocked|security|public/i, 'redirected private page must not reach read sink');
  assert.match(String(await call('browser_screenshot')), /blocked|security|public/i);
  assert.equal(scripts, 0); assert.equal(captures, 0);
  await assert.rejects(context.onExecuteScript('document.body.innerText'), /blocked|security|public/i);
  await assert.rejects(context.onTakeScreenshot(), /blocked|security|public/i);
  refs[0].current.tabs[0].url = url;
  await call('browser_duplicate_tab'); assert.equal(duplicates, 0);
  url = 'https://example.com/';
  assert.match(String(await call('browser_read_page')), /private-service-secret/, 'ordinary public page remains readable');
  const before = scripts;
  request('changed-tab', 'browser_read_page', {}, Date.now() + 15000);
  refs[0].current.activeTabId = 'other'; approve(true);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(scripts, before, 'approval cannot move to another tab');
  refs[0].current.activeTabId = 'tab';
  request('reload', 'browser_read_page', {}, Date.now() + 15000);
  fire('did-start-navigation'); approve(true);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(scripts, before, 'same-URL reload revokes approval');
  resolveDns = () => {};
  request('dns-race', 'browser_read_page', {}, Date.now() + 15000); approve(true);
  await new Promise(resolve => setImmediate(resolve));
  url = 'http://[::1]/'; fire('did-start-navigation'); resolveDns!(); resolveDns = undefined;
  await new Promise(resolve => setImmediate(resolve)); assert.equal(scripts, before, 'navigation during DNS authorization must fail closed');
  url = 'https://example.com/'; flipBeforeScript = true;
  await assert.rejects(context.onExecuteScript('document.body.innerText'), /target document changed/i, 'guest must check URL in the operation task');
  url = 'https://example.com/'; flipDuringCapture = true;
  await assert.rejects(context.onTakeScreenshot(), /target document changed/i, 'changed-document screenshot must never be returned');
  url = 'https://example.com/'; await call('browser_new_tab'); assert.equal(lastNewTabOptions?.reuseBlank, false, 'new tab must never consume a different blank tab');
  console.log('[PASS] Agent private-document, screenshot, duplicate and stale-approval boundaries');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
