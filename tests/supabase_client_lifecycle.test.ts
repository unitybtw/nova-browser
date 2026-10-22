import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real lazy factory; only the external SDK and desktop bridge are
// replaced. Holding the import lets us reproduce a config switch mid-load.
function harness() {
  let config = { url: 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co', anonKey: 'test-key-a' };
  let fail = false;
  let release: (() => void) | undefined;
  let waiting: Promise<void> | undefined;
  const created: any[] = [];
  const sdk = {
    createClient: (url: string, key: string, options: unknown) => {
      if (fail) throw new Error('SDK initialization failed');
      const client = { url, key, options };
      created.push(client);
      return client;
    }
  };
  const source = fs.readFileSync('src/services/supabaseClient.ts', 'utf8').replaceAll('import.meta.env', '({})');
  const exports: any = {};
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  vm.runInNewContext(code, { exports, console, localStorage: { getItem: () => JSON.stringify(config) },
    require: (name: string) => {
      if (name === '../utils/electronBridge') return { getElectronAPI: () => undefined };
      if (name === '@supabase/supabase-js') return waiting ? waiting.then(() => sdk) : sdk;
      throw new Error(`Unexpected dependency ${name}`);
    }
  });
  return {
    get: exports.getSupabaseClient as () => Promise<any>, created,
    configure: (suffix: string) => { config = { url: `https://${suffix.repeat(20)}.supabase.co`, anonKey: `test-key-${suffix}` }; },
    fail: (value: boolean) => { fail = value; },
    hold: () => { waiting = new Promise<void>(resolve => { release = resolve; }); },
    release: () => { waiting = undefined; release?.(); }
  };
}

async function run() {
  const h = harness();
  const first = await h.get();
  assert.equal(await h.get(), first, 'same configuration must reuse its client');
  h.configure('b');
  const second = await h.get();
  assert.equal(second.url, 'https://bbbbbbbbbbbbbbbbbbbb.supabase.co', 'config switch must use the new endpoint');
  assert.notEqual(second, first);
  h.fail(true);
  h.configure('c');
  await assert.rejects(h.get(), /initialization failed/);
  h.fail(false);
  assert.equal((await h.get()).key, 'test-key-c', 'a failed initialization must be retryable');

  const race = harness();
  race.hold();
  const stale = race.get();
  const staleResult = stale.then(() => 'resolved', () => 'rejected');
  await Promise.resolve(); // let the SDK import begin
  race.configure('b');
  const latest = race.get();
  assert.equal(race.get(), latest, 'same-config in-flight callers must share one factory');
  race.release();
  const client = await latest;
  assert.equal(client.key, 'test-key-b', 'old async initialization must not win over the new config');
  assert.equal(await staleResult, 'rejected', 'stale endpoint initialization must fail closed');
  assert.equal(await race.get(), client, 'stale cleanup must not evict the current client');
  assert.equal(race.created.length, 1, 'a stale endpoint must never create an SDK client');

  const changedWithoutRead = harness();
  changedWithoutRead.hold();
  const pending = changedWithoutRead.get();
  const changedResult = pending.then(() => 'resolved', () => 'rejected');
  await Promise.resolve();
  changedWithoutRead.configure('b');
  changedWithoutRead.release();
  assert.equal(await changedResult, 'rejected', 'configuration must also be rechecked after SDK import');
  assert.equal((await changedWithoutRead.get()).key, 'test-key-b');
  console.log('[PASS] Supabase client endpoint switching, coalescing, stale import and failure recovery.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
