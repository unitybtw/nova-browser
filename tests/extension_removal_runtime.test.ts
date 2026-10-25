import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the registered production IPC callbacks and persistence helpers.
// Only Electron and deliberate OS failures are substituted; files are real.
const source = ts.createSourceFile('main.ts', fs.readFileSync('electron/main.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const helpers = new Set(['getDisabledExtensionIds', 'setDisabledExtensionIds', 'getUnpackedExtensionPaths', 'setUnpackedExtensionPaths']);
const declarations: string[] = [];
const callbacks = new Map<string, string>();
function visit(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && node.name && helpers.has(node.name.text)) declarations.push(node.getText(source));
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(source) === 'ipcMain' && ts.isStringLiteral(node.arguments[0])) {
    const channel = node.arguments[0].text;
    if (['remove-extension', 'list-extensions'].includes(channel)) callbacks.set(channel, node.arguments[1].getText(source));
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.equal(callbacks.size, 2);
const code = ts.transpileModule(`${declarations.join('\n')}
exports.remove = ${callbacks.get('remove-extension')};
exports.list = ${callbacks.get('list-extensions')};
exports.rows = () => loadedExtensions;
`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const id = 'a'.repeat(32), otherId = 'b'.repeat(32);

function harness(options: { unpacked?: boolean; runtimeFailure?: boolean; stillRunning?: boolean;
  diskFailure?: boolean; registryFailure?: boolean; popupId?: string; secondaryFailure?: boolean;
  disabled?: boolean; disabledWriteFailure?: boolean; notificationFailure?: boolean;
  registryReadFailure?: boolean; disabledReadFailure?: boolean } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-remove-test-'));
  const managed = path.join(root, 'extensions', id);
  const extensionPath = options.unpacked ? path.join(root, 'developer-source') : managed;
  fs.mkdirSync(extensionPath, { recursive: true });
  fs.writeFileSync(path.join(extensionPath, 'manifest.json'), JSON.stringify({ name: 'Fixture', version: '1.0' }));
  const disabledFile = path.join(root, 'disabled_extensions.json');
  const unpackedFile = path.join(root, 'unpacked_extensions.json');
  fs.writeFileSync(disabledFile, JSON.stringify(options.disabled ? [id, otherId] : [otherId]));
  fs.writeFileSync(unpackedFile, JSON.stringify(options.unpacked ? { [id]: extensionPath } : {}));
  const extension = { id, name: 'Fixture', version: '1.0', path: extensionPath };
  const running = new Map(options.disabled ? [] : [[id, extension]]);
  const runtime = {
    getExtension: (key: string) => running.get(key),
    getAllExtensions: () => [...running.values()],
    removeExtension: async (key: string) => {
      if (options.runtimeFailure) throw new Error('runtime unload failed');
      if (!options.stillRunning) running.delete(key);
    },
  };
  let destroyed = false;
  const popup = { isDestroyed: () => destroyed, close() { destroyed = true; }, destroy() { destroyed = true; } };
  const messages: string[] = [];
  const defaultSession = { extensions: runtime };
  const secondarySession = { extensions: {
    getExtension: (key: string) => key === id ? extension : null,
    removeExtension: async () => { throw new Error('secondary unload failed'); },
  } };
  const windows = [{ isDestroyed: () => false, webContents: {
    session: options.secondaryFailure ? secondarySession : defaultSession,
    send: (channel: string) => { if (options.notificationFailure) throw new Error('renderer closed'); messages.push(channel); },
  } }];
  const api: any = {};
  const privateAccess = new Set([id, otherId]);
  vm.runInNewContext(code, {
    exports: api, URL, path, Set, Map,
    fs: { ...fs,
      readFileSync: (target: string, opts: any) => {
        if ((options.registryReadFailure && target === unpackedFile) || (options.disabledReadFailure && target === disabledFile)) {
          throw new Error('registry read failed');
        }
        return fs.readFileSync(target, opts);
      },
      rmSync: (target: string, opts: any) => {
        if (options.diskFailure && target === managed) throw new Error('disk removal failed');
        return fs.rmSync(target, opts);
      },
      writeFileSync: (target: string, data: any, opts: any) => {
        if (options.registryFailure && target === unpackedFile) throw new Error('registry write failed');
        if (options.disabledWriteFailure && target === disabledFile) throw new Error('disabled registry write failed');
        return fs.writeFileSync(target, data, opts);
      },
    },
    console: { error() {} }, app: { getPath: () => root }, session: { defaultSession },
    BrowserWindow: { getAllWindows: () => windows }, isTrustedSender: (event: any) => event.trusted === true,
    loadedExtensions: [extension], disabledExtensionsFile: disabledFile, unpackedExtensionsFile: unpackedFile,
    activeExtensionPopupWin: options.popupId ? popup : null,
    activeExtensionPopupUrl: options.popupId ? `chrome-extension://${options.popupId}/popup.html` : null,
    incognitoAllowedExtensions: privateAccess,
    getLocalizedManifestString: (_folder: string, text: string, fallback: string) => text || fallback,
  });
  return { root, extensionPath, disabledFile, unpackedFile, api, privateAccess, messages,
    remove: (trusted = true) => api.remove({ trusted }, id),
    list: () => api.list({ trusted: true }), popupDestroyed: () => destroyed,
    allowDiskRemoval: () => { options.diskFailure = false; },
    dispose: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

async function run() {
  let failures = 0;
  async function check(name: string, options: Parameters<typeof harness>[0], test: (h: ReturnType<typeof harness>) => Promise<void>) {
    const h = harness(options);
    try { await test(h); console.log(`[PASS] [Extension removal] ${name}`); }
    catch (error) { failures++; console.error(`[FAIL] [Extension removal] ${name}`, error); }
    finally { h.dispose(); }
  }
  await check('runtime failure preserves files and registration and returns an error', { runtimeFailure: true }, async h => {
    const result = await h.remove();
    assert.ok(result.error); assert.notEqual(result.success, true);
    assert.equal(h.api.rows().length, 1);
    assert.equal(fs.readFileSync(path.join(h.extensionPath, 'manifest.json'), 'utf8'), '{"name":"Fixture","version":"1.0"}');
  });
  await check('a still-running extension cannot be reported removed', { stillRunning: true }, async h => {
    assert.ok((await h.remove()).error);
    assert.equal(h.api.rows().length, 1);
    assert.equal(fs.existsSync(h.extensionPath), true);
  });
  await check('secondary-session failure does not delete installed files', { secondaryFailure: true }, async h => {
    assert.ok((await h.remove()).error);
    assert.equal(fs.existsSync(h.extensionPath), true);
  });
  await check('disk failure keeps a retryable row and reports its stopped runtime accurately', { diskFailure: true }, async h => {
    assert.ok((await h.remove()).error);
    assert.equal(h.api.rows().length, 1);
    assert.equal((await h.list())[0].enabled, false);
    assert.ok(h.messages.includes('extension-changed'));
    h.allowDiskRemoval();
    assert.equal((await h.remove()).success, true);
    assert.equal(h.api.rows().length, 0);
    assert.equal(fs.existsSync(h.extensionPath), false);
  });
  await check('disabled registry write failure retains a retryable row', { disabled: true, disabledWriteFailure: true }, async h => {
    assert.ok((await h.remove()).error);
    assert.equal(h.api.rows().length, 1);
    assert.deepEqual(JSON.parse(fs.readFileSync(h.disabledFile, 'utf8')), [id, otherId]);
  });
  await check('registry failure cannot claim a successful unpacked uninstall', { unpacked: true, registryFailure: true }, async h => {
    assert.ok((await h.remove()).error);
    assert.equal(h.api.rows().length, 1);
    assert.equal(JSON.parse(fs.readFileSync(h.unpackedFile, 'utf8'))[id], h.extensionPath);
    assert.equal(fs.existsSync(h.extensionPath), true);
  });
  await check('unreadable unpacked registration cannot be mistaken for an empty registry', { unpacked: true, registryReadFailure: true }, async h => {
    assert.ok((await h.remove()).error);
    assert.equal(h.api.rows().length, 1);
    assert.equal(JSON.parse(fs.readFileSync(h.unpackedFile, 'utf8'))[id], h.extensionPath);
    assert.equal(fs.existsSync(path.join(h.extensionPath, 'manifest.json')), true);
  });
  await check('unreadable disabled registry blocks destructive deletion', { disabled: true, disabledReadFailure: true }, async h => {
    assert.ok((await h.remove()).error);
    assert.equal(h.api.rows().length, 1);
    assert.equal(fs.existsSync(path.join(h.extensionPath, 'manifest.json')), true);
  });
  for (const invalid of ['{', 'null', '[]', '{"not-an-extension-id":"/source"}']) {
    await check(`malformed unpacked registry is preserved: ${invalid}`, {}, async h => {
      fs.writeFileSync(h.unpackedFile, invalid);
      assert.ok((await h.remove()).error);
      assert.equal(h.api.rows().length, 1);
      assert.equal(fs.readFileSync(h.unpackedFile, 'utf8'), invalid);
      assert.equal(fs.existsSync(path.join(h.extensionPath, 'manifest.json')), true);
    });
  }
  await check('removing one extension preserves another extension popup', { popupId: otherId }, async h => {
    assert.equal((await h.remove()).success, true);
    assert.equal(h.popupDestroyed(), false);
  });
  await check('successful removal clears owned files, rows and private grants', { popupId: id }, async h => {
    assert.equal((await h.remove()).success, true);
    assert.equal(h.api.rows().length, 0);
    assert.equal(h.popupDestroyed(), true);
    assert.equal(h.privateAccess.has(id), false);
    assert.equal(h.privateAccess.has(otherId), true);
    assert.equal(fs.existsSync(h.extensionPath), false);
    assert.deepEqual(JSON.parse(fs.readFileSync(h.disabledFile, 'utf8')), [otherId]);
  });
  await check('unpacked source remains on disk after its registration is removed', { unpacked: true }, async h => {
    assert.equal((await h.remove()).success, true);
    assert.deepEqual(JSON.parse(fs.readFileSync(h.unpackedFile, 'utf8')), {});
    assert.equal(fs.existsSync(path.join(h.extensionPath, 'manifest.json')), true);
  });
  await check('untrusted callers cannot mutate extension state', {}, async h => {
    assert.ok((await h.remove(false)).error);
    assert.equal(h.api.rows().length, 1);
    assert.equal(fs.existsSync(h.extensionPath), true);
  });
  await check('a closed renderer does not reverse a completed removal result', { notificationFailure: true }, async h => {
    assert.equal((await h.remove()).success, true);
    assert.equal(h.api.rows().length, 0);
    assert.equal(fs.existsSync(h.extensionPath), false);
  });
  assert.equal(failures, 0, `${failures} extension removal regressions`);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
