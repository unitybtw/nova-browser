import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { EventEmitter } from 'node:events';

async function run() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-download-runtime-'));
  const handlers = new Map<string, Function>();
  let openResult = '';
  let dialogResponse = 1;
  let reservationError = false;
  const broadcasts: Array<[string, any]> = [];
  const exports: any = {};
  const imports: Record<string, unknown> = { fs: { ...fs, openSync: (...args: any[]) => {
    if (reservationError) throw Object.assign(new Error('Cannot reserve download'), { code: 'EACCES' });
    return (fs.openSync as any)(...args);
  } }, path, crypto,
    electron: {
      app: { getPath: () => dir },
      ipcMain: { handle: (name: string, fn: Function) => handlers.set(name, fn) },
      shell: { openPath: async () => openResult }, dialog: { showMessageBox: async () => ({ response: dialogResponse }) }
    }
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('electron/main/downloads.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, { exports, console, Buffer, URL, process, require: (name: string) => ({ default: imports[name], ...imports[name] as object }) });
  try {
    exports.initDownloads((channel: string, payload: any) => broadcasts.push([channel, payload]), () => true);
    const file = path.join(dir, 'notes.txt');
    fs.writeFileSync(file, 'test');
    openResult = 'No application is associated with this file';
    assert.equal(await handlers.get('open-download')!({}, file), false, 'native open failure must not be reported as success');
    openResult = '';
    assert.equal(await handlers.get('open-download')!({}, file), true, 'empty native result means success');

    const executable = path.join(dir, 'installer.exe');
    fs.writeFileSync(executable, 'test');
    dialogResponse = 0;
    assert.equal(await handlers.get('open-download')!({}, executable), 'cancelled', 'user cancellation must be distinguishable from a failed open');
    dialogResponse = 1;

    for (const original of ['ş'.repeat(200) + '.pdf', '😀'.repeat(100) + '.exe', 'x.' + 'a'.repeat(300), 'a'.repeat(300) + '.html']) {
      const safe = exports.sanitizeDownloadFilename(original);
      assert.ok(Buffer.byteLength(safe, 'utf8') <= 255, 'filename must fit filesystem byte limits');
      assert.ok(safe.length <= 255, 'filename must fit Windows code-unit limits');
      const target = path.join(dir, safe);
      fs.writeFileSync(target, 'filename boundary');
      assert.equal(fs.readFileSync(target, 'utf8'), 'filename boundary');
      if (original.endsWith('.exe')) {
        assert.ok(safe.endsWith('.exe'), 'truncation must preserve the executable extension');
        assert.equal(exports.requiresOpenConfirmation(safe), true);
      }
    }
    const downloadSession = new EventEmitter();
    exports.registerDownloadsManager(downloadSession);
    const longName = exports.sanitizeDownloadFilename('ş'.repeat(200) + '.pdf');
    const originalPath = path.join(dir, longName);
    fs.writeFileSync(originalPath, 'existing download');
    const item: any = new EventEmitter();
    let savePath = '';
    Object.assign(item, {
      getFilename: () => longName, getURL: () => 'https://example.com/file.pdf',
      getTotalBytes: () => 100, getSavePath: () => savePath,
      setSavePath: (value: string) => { savePath = value; }
    });
    downloadSession.emit('will-download', {}, item, { id: 42 });
    assert.notEqual(savePath, originalPath, 'a duplicate download must reserve a different name');
    assert.ok(Buffer.byteLength(path.basename(savePath), 'utf8') <= 255, 'collision suffix must fit the byte budget too');
    assert.ok(fs.existsSync(savePath), 'the collision path must have been atomically reserved');
    assert.equal(fs.readFileSync(originalPath, 'utf8'), 'existing download', 'collision must not overwrite the existing file');
    reservationError = true;
    const refused: any = new EventEmitter();
    let cancelled = false;
    let unsafeSavePath = '';
    Object.assign(refused, {
      getFilename: () => longName, getURL: () => 'https://example.com/file.pdf', getTotalBytes: () => 100,
      getSavePath: () => unsafeSavePath, setSavePath: (value: string) => { unsafeSavePath = value; },
      cancel: () => { cancelled = true; }
    });
    downloadSession.emit('will-download', {}, refused, { id: 43 });
    assert.equal(cancelled, true, 'reservation failure must cancel instead of using an unreserved path');
    assert.equal(unsafeSavePath, '', 'a failed reservation must never fall back to the existing filename');
    reservationError = false;
    const privateSession = new EventEmitter();
    exports.registerDownloadsManager(privateSession, 'incognito-test');
    const privateItem: any = new EventEmitter();
    let privatePath = '', wasCancelled = false;
    Object.assign(privateItem, {
      getFilename: () => 'private.pdf', getURL: () => 'https://example.com/private.pdf?secret=1',
      getTotalBytes: () => 100, getReceivedBytes: () => 50, isPaused: () => false,
      getSavePath: () => privatePath, setSavePath: (value: string) => { privatePath = value; },
      cancel: () => { wasCancelled = true; privateItem.emit('done', {}, 'cancelled'); }
    });
    privateSession.emit('will-download', {}, privateItem, { id: 99 });
    privateItem.emit('updated', {}, 'interrupted');
    const privateEvents = broadcasts.filter(([channel, payload]) => channel === 'download-update' && payload.filename === 'private.pdf');
    assert.ok(privateEvents.length >= 2);
    assert.ok(privateEvents.every(([, payload]) => payload.isPrivate === true && payload.privateSessionId === 'incognito-test'), 'all private download events carry main-owned classification');
    exports.disposePrivateDownloads('incognito-test');
    assert.equal(wasCancelled, true, 'closing a private session cancels its running transfers');
    const afterClose = broadcasts.filter(([channel]) => channel === 'download-update').length;
    privateItem.emit('updated', {}, 'interrupted');
    privateItem.emit('done', {}, 'completed');
    assert.equal(broadcasts.filter(([channel]) => channel === 'download-update').length, afterClose, 'late terminal events cannot restore private metadata');
    assert.ok(broadcasts.some(([channel, payload]) => channel === 'private-downloads-cleared' && payload === 'incognito-test'));
    let lateCancelled = false;
    const lateItem = { cancel: () => { lateCancelled = true; } };
    privateSession.emit('will-download', {}, lateItem, { id: 99 });
    assert.equal(lateCancelled, true, 'a disposed session must reject new delayed download events');
    const unusedPrivateSession = new EventEmitter();
    exports.registerDownloadsManager(unusedPrivateSession, 'incognito-unused');
    exports.disposePrivateDownloads('incognito-unused');
    lateCancelled = false;
    unusedPrivateSession.emit('will-download', {}, lateItem, { id: 100 });
    assert.equal(lateCancelled, true, 'disposal before the first download also closes the event boundary');

    console.log('[PASS] Native download open outcomes and UTF-8/long-extension filename limits.');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
