import assert from 'node:assert/strict';
import {
  createPairingToken,
  decryptSyncPayload,
  encryptSyncPayload,
  hashPairingToken,
  isInvitationUsable,
} from '../src/services/syncCrypto';

async function run() {
  const payload = { bookmarks: [{ id: 'bookmark-1', url: 'https://example.com' }], history: [] };
  const envelope = await encryptSyncPayload(payload, 'correct horse battery staple');

  assert.equal(envelope.version, 2);
  assert.equal(envelope.ciphertext.includes('example.com'), false, 'ciphertext must not expose plaintext');
  assert.deepEqual(await decryptSyncPayload(envelope, 'correct horse battery staple'), payload);
  await assert.rejects(() => decryptSyncPayload(envelope, 'wrong passphrase'));

  const token = createPairingToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(await hashPairingToken(token), await hashPairingToken(createPairingToken()));
  assert.equal(isInvitationUsable({ tokenHash: 'hash', expiresAt: Date.now() + 1_000, consumedAt: null }, Date.now()), true);
  assert.equal(isInvitationUsable({ tokenHash: 'hash', expiresAt: Date.now() - 1, consumedAt: null }, Date.now()), false);
  assert.equal(isInvitationUsable({ tokenHash: 'hash', expiresAt: Date.now() + 1_000, consumedAt: Date.now() }, Date.now()), false);

  console.log('Security hardening crypto tests passing');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
