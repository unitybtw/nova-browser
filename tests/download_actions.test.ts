import assert from 'node:assert/strict';
import { performDownloadAction } from '../src/utils/downloadActions';
async function run() {
  const messages: string[] = [];
  const notify = async (options: { message: string }) => { messages.push(options.message); };
  let opened = '';
  const success = { openDownload: async (path: string) => { opened = path; return true; }, showDownloadInFolder: async () => true };
  assert.equal(await performDownloadAction('/tmp/file.pdf', 'open', success, notify), true);
  assert.equal(opened, '/tmp/file.pdf');
  assert.equal(messages.length, 0);
  assert.equal(await performDownloadAction('/tmp/file.pdf', 'open', { ...success, openDownload: async () => 'cancelled' as const }, notify), false);
  assert.equal(messages.length, 0, 'cancelling the native warning must stay silent');
  assert.equal(await performDownloadAction('/tmp/missing.pdf', 'open', { ...success, openDownload: async () => false }, notify), false);
  assert.equal(messages.length, 1, 'a missing or rejected file must show an explanation');
  await performDownloadAction('/tmp/file.pdf', 'reveal', { ...success, showDownloadInFolder: async () => { throw new Error('IPC disconnected'); } }, notify);
  assert.equal(messages.length, 2, 'IPC errors are handled instead of escaping as rejected click handlers');
  await performDownloadAction(undefined, 'open', success, notify);
  assert.equal(messages.length, 3, 'missing paths are explained');
  await performDownloadAction('/tmp/file.pdf', 'open', {}, notify);
  assert.equal(messages.length, 4, 'unsupported preview environment is explained');
  console.log('[PASS] Download action success, cancellation, unavailable paths, bridge failures, and unavailable desktop API');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
