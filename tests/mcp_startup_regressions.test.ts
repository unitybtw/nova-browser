import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import ts from 'typescript';

// Run the actual startup promise with Express 5's documented callback ordering:
// a failed bind invokes the listen callback before our own error listener.
const source = fs.readFileSync('electron/mcpServer.ts', 'utf8');
const start = source.indexOf('      return await new Promise<void>');
const end = source.indexOf('\n    } finally {', start);
const body = source.slice(start, end);
async function exercise(code: string, fallbackCode?: string) {
  const callbacks: Array<(error?: any) => void> = [];
  const servers: any[] = [];
  const owner: any = { requestedPort: 3020, stopRequested: false, savePersistedPort: () => {} };
  const app = { listen: (_port: number, _host: string, callback: (error?: any) => void) => {
    const server: any = new EventEmitter();
    server.address = () => server.bound ? { port: 43210 } : null;
    server.close = () => {};
    servers.push(server);
    callbacks.push(callback);
    return server;
  } };
  const fn = vm.runInNewContext(ts.transpileModule(`(async function() { ${body} })`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 }
  }).outputText, { app, console: { log: () => {}, warn: () => {}, error: () => {} }, Promise });
  let settled = false;
  const promise = fn.call(owner);
  promise.then(() => { settled = true; }, () => { settled = true; });
  const error = Object.assign(new Error(code), { code });
  callbacks[0](error);
  servers[0].emit('error', error);
  if (code === 'EADDRINUSE') {
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(settled, false, 'startup must wait for the fallback to bind');
    if (fallbackCode) {
      const fallbackError = Object.assign(new Error(fallbackCode), { code: fallbackCode });
      callbacks[1](fallbackError);
      servers[1].emit('error', fallbackError);
      await assert.rejects(promise, new RegExp(fallbackCode));
      assert.equal(owner.server, null);
    } else {
      servers[1].bound = true;
      servers[1].listening = true;
      callbacks[1]();
      await promise;
      assert.equal(owner.actualPort, 43210);
    }
  } else {
    await assert.rejects(promise, new RegExp(code), 'a failed bind must not report success');
  }
}
async function run() {
  await exercise('EACCES');
  await exercise('EADDRINUSE');
  await exercise('EADDRINUSE', 'EACCES');
  console.log('[PASS] MCP bind failure and fallback settlement');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
