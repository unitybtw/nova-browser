import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

function loadSource(file: string, globals: Record<string, unknown>, imports: Record<string, unknown>) {
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
  }).outputText, { exports, require: (name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected dependency ${name}`);
    return imports[name];
  }, console, Date, Set, Map, URL, ...globals });
  return exports;
}

async function run() {
  const timerCallbacks: Function[] = [];
  const events: any[][] = [];
  const mainBridge = loadSource('electron/main/mcpBridge.ts', {
    setTimeout: (fn: Function) => { timerCallbacks.push(fn); return timerCallbacks.length; }, clearTimeout: () => {}
  }, { electron: { ipcMain: { on: () => {} } }, crypto });
  const win = { isDestroyed: () => false, webContents: { send: (...args: any[]) => events.push(args) } };
  const pending = mainBridge.requestRendererMcpAction(win, 'browser_click', {});
  const rejected = assert.rejects(pending, /timed out/);
  timerCallbacks[0]();
  await rejected;
  const id = events[0][1];
  assert.ok(events.some(event => event[0] === 'mcp-action-cancel' && event[1] === id), 'timeout must cancel the corresponding renderer approval');

  let onRequest: Function = () => {};
  let onCancel: Function = () => {};
  let approve: (allow: boolean) => void = () => {};
  let clicks = 0;
  let denied = 0;
  let opened = '';
  const responses: any[] = [];
  const api = {
    onMcpActionRequest: (callback: Function) => { onRequest = callback; return () => {}; },
    onMcpActionCancel: (callback: Function) => { onCancel = callback; return () => {}; },
    respondMcpAction: (...args: any[]) => responses.push(args),
    checkAgentNavigationHost: async () => ({ allowed: false, reason: 'non HTTP scheme' })
  };
  const settingsRef = { current: { mcpServerEnabled: true } };
  const hook = loadSource('src/hooks/useBrowserAgentBridge.ts', {
    window: { electronAPI: api, dispatchEvent: () => {} },
    document: { querySelector: () => ({ executeJavaScript: async () => { clicks++; return { success: true, x: 1, y: 1 }; }, getBoundingClientRect: () => ({ left: 0, top: 0 }) }) },
    CustomEvent: class {}, setTimeout, clearTimeout
  }, {
    react: { useEffect: (fn: Function) => fn(), useRef: (current: unknown) => ({ current }) },
    '../services/aiAgent': { aiAgent: { setActionContext: () => {} } },
    '../services/agentOrchestrator': { orchestrator: {
      enqueueAction: () => ({ id: 'approval', done: new Promise<boolean>(resolve => { approve = resolve; }) }),
      denyAction: () => { denied++; approve(false); }, updateActionState: () => {}
    } },
    '../utils/safeNavigation': { isSafeAgentNavigationUrl: (url: string) => url === 'nova://newtab' || url.startsWith('https://') },
    '../utils/searchHistoryBookmarks': { searchHistoryAndBookmarks: () => [] }
  });
  hook.useBrowserAgentBridge({ activeTabId: 'tab', tabs: [], history: [], bookmarks: [], settingsRef,
    activeWorkspaceIdRef: { current: 'default' }, setActiveWorkspaceId: () => {}, setActiveTabId: () => {}, setTabs: () => {},
    handleNavigate: () => {}, handleNewTab: (url: string) => { opened = url; }, handleCloseTab: () => {}, handleSelectTab: () => {} });
  onRequest('cancel-me', 'browser_click', { selector: 'button' }, Date.now() + 15000);
  onCancel('cancel-me');
  approve(true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(clicks, 0, 'cancelled requests must never execute after late approval');
  assert.equal(denied, 1, 'cancellation must remove the pending approval');
  onRequest('expired', 'browser_click', { selector: 'button' }, Date.now() - 1);
  approve(true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(clicks, 0, 'expired requests must not execute even before cancellation IPC arrives');
  onRequest('disabled', 'browser_click', { selector: 'button' }, Date.now() + 15000);
  settingsRef.current.mcpServerEnabled = false;
  approve(true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(clicks, 0, 'settings must be rechecked after approval');
  settingsRef.current.mcpServerEnabled = true;
  onRequest('tab', 'browser_new_tab', {}, Date.now() + 15000);
  approve(true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(opened, 'nova://newtab', 'default new tab must not undergo a network DNS check');

  let resolveDialog: (result: { response: number }) => void = () => {};
  let forwarded = 0;
  const lockEvents = new Map<string, Function>();
  const serverModule = loadSource('electron/mcpServer.ts', { process, Buffer, setTimeout, clearTimeout }, {
    electron: { app: { isPackaged: false }, powerMonitor: { on: (name: string, fn: Function) => lockEvents.set(name, fn) },
      dialog: { showMessageBox: () => new Promise(resolve => { resolveDialog = resolve; }) } },
    crypto, os, fs, path,
    './main/mcpBridge.js': { requestRendererMcpAction: async () => { forwarded++; return 'ok'; }, cancelPendingMcpActions: () => {} }
  });
  for (const change of ['stop', 'rotateToken', 'lock'] as const) {
    const server: any = Object.assign(Object.create(serverModule.BrowserMCPServer.prototype), {
      mainWindow: win, authorizationGeneration: 0, firstUseApproved: false,
      isToolAllowed: () => true, revokeAllClients: () => {}, saveNewToken: () => 'new-token'
    });
    const action = server.executeTool('browser_click', {});
    if (change === 'lock') lockEvents.get('lock-screen')!();
    else server[change]();
    resolveDialog({ response: 0 });
    await assert.rejects(action, /revoked|locked|rejected/, 'revocation while first-use dialog is open must prevent dispatch');
    assert.equal(forwarded, 0);
    assert.equal(server.firstUseApproved, false, 'a revoked dialog must not grant future requests');
    lockEvents.get('unlock-screen')!();
  }
  console.log('[PASS] MCP timeout, cancellation, settings and internal new tab');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
