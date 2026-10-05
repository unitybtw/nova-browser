import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { encryptDataWithFallback, decryptDataWithFallback } from '../electron/main/proxySecurity';

// Execute the actual main-process permission handlers, not a duplicate policy.
const source = fs.readFileSync(path.resolve('electron/main.ts'), 'utf8');
const block = source.slice(source.indexOf('  // --- CHROME-STYLE PERMISSION SYSTEM'), source.indexOf('  // IPC: reset all remembered site permissions'));
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-permission-audit-'));
const handlers = new Map<string, Function>();
const prompts: any[] = [];
const timers = new Set<ReturnType<typeof setTimeout>>();
const defaultSession: any = {};
const context: any = {
  fs, path, crypto, URL, Map, Set, Date, console, process,
  app: { getPath: () => userData },
  session: { defaultSession },
  ipcMain: { handle: (name: string, fn: Function) => handlers.set(name, fn) },
  isTrustedSender: () => true,
  isTrustedAppOrigin: () => false,
  mainWindow: { isDestroyed: () => false, webContents: { send: (_name: string, prompt: any) => prompts.push(prompt) } },
  setTimeout: (fn: Function, ms: number) => { const timer = setTimeout(fn as any, ms); timers.add(timer); return timer; },
  clearTimeout: (timer: ReturnType<typeof setTimeout>) => { clearTimeout(timer); timers.delete(timer); },
};
vm.runInNewContext(ts.transpileModule(block, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
function makeSession(target: any = {}) {
  target.setPermissionRequestHandler = (handler: Function) => { target.request = handler; };
  target.setPermissionCheckHandler = (handler: Function) => { target.check = handler; };
  context.applyStrictSecurityToSession(target);
  return target;
}
const normal = makeSession(defaultSession);
const privateSession = makeSession();
const page = { id: 123, getURL: () => 'https://example.com/page' };
async function request(target: any, permission: string, mediaTypes?: string[]) {
  let verdict: boolean | undefined;
  const before = prompts.length;
  target.request(page, permission, (allow: boolean) => { verdict = allow; }, { requestingUrl: page.getURL(), mediaTypes });
  if (prompts.length > before) {
    await handlers.get('permission-response')!({}, { requestId: prompts.at(-1).requestId, allow: true, remember: true });
  }
  return verdict;
}
async function run() {
  try {
    await request(normal, 'media', ['audio']);
    assert.equal(normal.check(page, 'media', 'https://example.com', { mediaType: 'audio' }), true);
    assert.equal(normal.check(page, 'media', 'https://example.com', { mediaType: 'video' }), false, 'microphone approval must not grant camera access');
    assert.equal(normal.check(page, 'media', 'https://example.com', { mediaType: 'unknown' }), false);
    const before = prompts.length;
    await request(normal, 'media', ['video']);
    assert.equal(prompts.length, before + 1, 'camera must receive a separate approval prompt');
    assert.equal(privateSession.check(page, 'media', 'https://example.com', { mediaType: 'audio' }), false, 'private partitions must not inherit normal permissions');
    await request(privateSession, 'geolocation');
    assert.equal(privateSession.check(page, 'geolocation', 'https://example.com', {}), true);
    assert.equal(normal.check(page, 'geolocation', 'https://example.com', {}), false, 'private grants must not affect normal browsing');
    assert.equal(makeSession().check(page, 'geolocation', 'https://example.com', {}), false, 'private grants must not affect another private partition');
    const stored = fs.readFileSync(path.join(userData, 'remembered_permissions.json'), 'utf8');
    assert.equal(stored.includes('geolocation'), false, 'private browsing grants must never be persisted');
    const extensionA = `chrome-extension://${'a'.repeat(32)}`;
    const extensionB = `chrome-extension://${'b'.repeat(32)}`;
    page.getURL = () => `${extensionA}/popup.html`;
    await request(normal, 'media', ['audio']);
    assert.equal(normal.check(page, 'media', extensionA, { mediaType: 'audio' }), true);
    page.getURL = () => `${extensionB}/popup.html`;
    const extensionPrompts = prompts.length;
    await request(normal, 'media', ['audio']);
    assert.equal(prompts.length, extensionPrompts + 1, 'extension origins must not share the WHATWG null origin');
    page.getURL = () => 'data:text/html,opaque';
    assert.equal(await request(normal, 'notifications'), false, 'opaque origins must not receive remembered grants');

    for (const value of ['', 'a', 'ab', 'abc', 'ş', '🔐', 'normal value']) {
      assert.equal(decryptDataWithFallback(encryptDataWithFallback(value, userData), userData), value, 'all valid plaintext lengths must round-trip');
    }
    assert.throws(() => encryptDataWithFallback('secret', path.join(userData, 'missing')), /ENOENT/, 'missing key storage must fail instead of returning unrecoverable ciphertext');
    console.log('[PASS] Permission boundaries and short encrypted values');
  } finally {
    timers.forEach(clearTimeout);
    fs.rmSync(userData, { recursive: true, force: true });
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
