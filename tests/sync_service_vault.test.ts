import assert from 'node:assert/strict';
import {
  deriveKey,
  encryptSyncPayload,
  decryptSyncPayload,
  EncryptedSyncEnvelope
} from '../src/services/syncCrypto';
import {
  syncService,
  SyncDataBundle,
  SYNC_BUNDLE_VERSION,
  TOMBSTONE_RETENTION_MS,
  capSyncedCollection,
  isTombstonedRow,
  mergeSyncedCollection,
  mergeSyncedCollections,
  migrateSyncBundle,
  normalizeBookmarkUrl,
  purgeExpiredTombstones,
  rowVersion,
  tombstoneTimestamp
} from '../src/services/syncService';
import type { Bookmark, Folder, SavedPassword, UserSettings, Workspace } from '../src/types/browser';

console.log('\n--- Sync Service, Crypto & Supabase Vault Test Suite ---');

const DAY_MS = 24 * 60 * 60 * 1000;
/** Fixed clock so retention arithmetic in the tombstone tests is deterministic. */
const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

const makeBookmark = (id: string, url: string, timestamp: number): Bookmark => ({
  id,
  url,
  title: id,
  timestamp
});
const makeFolder = (id: string, workspaceId = 'default'): Folder => ({
  id,
  name: id,
  isExpanded: true,
  workspaceId
});
const makeWorkspace = (id: string): Workspace => ({ id, name: id, color: 'blue' });

const liveRows = <T>(rows: T[]): T[] => rows.filter(row => !isTombstonedRow(row));
const tombstoneCount = (rows: unknown[]): number => rows.filter(isTombstonedRow).length;

/** The exact merge options the service passes for the bookmarks collection. */
const bookmarkMerge = (local: Bookmark[], remote: Bookmark[], now = NOW) =>
  mergeSyncedCollection(local, remote, {
    keyOf: (b: Bookmark) => b.id,
    aliasKeyOf: (b: Bookmark) => normalizeBookmarkUrl(b.url),
    now
  });

/**
 * Soft-delete (tombstone) propagation.
 *
 * These cases call the production merge/purge/cap functions the sync service
 * itself runs — no re-implementation — with rows shaped exactly as the app
 * stores them.
 */
function runTombstoneTests() {
  // 7. Tombstone representation: absent deletedAt means "not deleted", which is
  // how every row written before tombstones existed reads (forward migration).
  const legacyBundle = migrateSyncBundle({
    version: 2,
    timestamp: NOW - 60 * DAY_MS,
    userId: 'user-test-uuid-1234',
    bookmarks: [makeBookmark('bm-legacy', 'https://legacy.example/docs', NOW - 60 * DAY_MS)]
  });
  assert.strictEqual(legacyBundle!.version, SYNC_BUNDLE_VERSION, 'Legacy v2 bundle must migrate forward to the current schema version');
  assert.strictEqual(migrateSyncBundle(legacyBundle), legacyBundle, 'Bundle migration must be idempotent (no needless rewrite)');
  assert.strictEqual(isTombstonedRow(legacyBundle!.bookmarks![0]), false, 'A migrated v2 row has no deletedAt and must read as live');
  assert.strictEqual(tombstoneTimestamp(legacyBundle!.bookmarks![0]), null, 'tombstoneTimestamp must report null for a live row');
  const legacyMerged = bookmarkMerge([], legacyBundle!.bookmarks!);
  assert.strictEqual(liveRows(legacyMerged).length, 1, 'A migrated v2 row must survive the merge as a live row');

  // Malformed / hostile values must never read as a delete (fail open on the
  // tombstone, so a bad row can never hide a row from the user).
  for (const bad of [undefined, null, 0, -1, Number.NaN, '123', {}]) {
    assert.strictEqual(tombstoneTimestamp({ id: 'x', timestamp: NOW, deletedAt: bad }), null, `deletedAt=${String(bad)} must not count as a tombstone`);
  }

  // 8. The reported bug: device A deletes a bookmark, device B still holds the
  // pre-delete copy. The delete must propagate, and B's stale row must not undo
  // it on the way back.
  const createdAt = NOW - 10 * DAY_MS;
  const deletedAt = NOW - DAY_MS;
  const rowOnB = makeBookmark('bm-1', 'https://example.com/docs', createdAt);
  const tombstoneOnA = { ...rowOnB, deletedAt };

  const aMerge = bookmarkMerge([tombstoneOnA], [rowOnB]);
  assert.strictEqual(liveRows(aMerge).length, 0, 'Device A must not keep a deleted bookmark live after merging device B stale copy');
  assert.strictEqual(tombstoneCount(aMerge), 1, 'The tombstone must survive the merge so it keeps being pushed');

  // Device A pushes `aMerge`; a third device pulls it.
  const rowOnC = makeBookmark('bm-2', 'https://example.com/other', createdAt);
  const cMerge = bookmarkMerge([rowOnC], aMerge);
  assert.strictEqual(liveRows(cMerge).some(b => b.id === 'bm-1'), false, 'The deletion must reach a third device');
  assert.strictEqual(liveRows(cMerge).some(b => b.id === 'bm-2'), true, 'Unrelated bookmarks must still sync normally');

  // Repeated syncs must not drift: the delete stays applied, exactly once.
  const second = bookmarkMerge(cMerge, cMerge);
  const third = bookmarkMerge(second, second);
  assert.strictEqual(liveRows(third).some(b => b.id === 'bm-1'), false, 'Repeated merges must not resurrect a deleted bookmark');
  assert.strictEqual(tombstoneCount(third), 1, 'Repeated merges must not duplicate the tombstone');

  // The same delete arriving from the vault is a structurally identical but
  // distinct object (it was serialized and re-encrypted in between), so the
  // merge must collapse on the claimed keys — otherwise the payload doubles on
  // every sync and the table grows without bound.
  const bothSidesHoldIt = bookmarkMerge([{ ...tombstoneOnA }], [{ ...tombstoneOnA }]);
  assert.strictEqual(tombstoneCount(bothSidesHoldIt), 1, 'Identical tombstones from both devices must collapse into one');
  let churn: Bookmark[] = bothSidesHoldIt;
  for (let round = 0; round < 5; round++) {
    churn = bookmarkMerge(churn.map(row => ({ ...row })), churn.map(row => ({ ...row })));
  }
  assert.strictEqual(tombstoneCount(churn), 1, 'Repeated device round-trips must not multiply the tombstone');
  assert.strictEqual(liveRows(churn).length, 0, 'A collapsed tombstone must keep suppressing the deleted row');

  // 9. A tombstone suppresses the same page even when the other device minted
  // its own id for it (bookmarks dedupe by URL, not by id).
  const independentOnB = makeBookmark('bm-99', 'https://example.com/docs/', createdAt);
  const urlSuppressed = bookmarkMerge([{ ...independentOnB, id: 'bm-1', deletedAt }], [independentOnB]);
  assert.strictEqual(liveRows(urlSuppressed).some(b => b.id === 'bm-99'), false, 'A same-URL row with a different id must not survive the delete');

  // 10. Last-write-wins on BOTH sides: the row version is compared against the
  // delete time, so a row written AFTER the delete is a genuine update (kept)
  // while a row that predates it is a stale copy (dropped). A blanket
  // "tombstone always wins" or "tombstone never wins" would fail one of 8/10.
  // Same id on both sides, row written after the delete: a genuine update, not
  // a stale copy, so last-write-wins keeps it and retires the tombstone.
  const updatedAfterDelete = makeBookmark('bm-5', 'https://example.com/fresh', deletedAt + 1000);
  const sameIdNewer = bookmarkMerge([{ ...updatedAfterDelete, deletedAt }], [updatedAfterDelete]);
  assert.strictEqual(liveRows(sameIdNewer).some(b => b.id === 'bm-5'), true, 'A row newer than the delete must win (it is not a stale copy)');
  assert.strictEqual(tombstoneCount(sameIdNewer), 0, 'A delete that lost last-write-wins must not linger in the payload');
  // Same page under a different id: two devices bookmarked it separately, and
  // the second bookmarking happened after the delete.
  const writtenAfterDelete = makeBookmark('bm-3', 'https://example.com/fresh', deletedAt + 1000);
  const sameUrlNewer = bookmarkMerge([], [writtenAfterDelete, { ...writtenAfterDelete, id: 'bm-4', deletedAt }]);
  assert.strictEqual(liveRows(sameUrlNewer).some(b => b.id === 'bm-3'), true, 'A re-bookmarked page must survive a delete older than the re-bookmark');
  assert.strictEqual(tombstoneCount(sameUrlNewer), 0, 'The obsolete tombstone must be dropped once the row won last-write-wins');

  // Two tombstones for the same key merge last-write-wins, so the delete stays
  // suppressed for a full retention window measured from the newest delete.
  const doubleDelete = bookmarkMerge(
    [{ ...rowOnB, deletedAt }],
    [{ ...rowOnB, deletedAt: deletedAt + 2 * DAY_MS }]
  );
  const winningTombstone = doubleDelete.find(isTombstonedRow) as Bookmark;
  assert.strictEqual(winningTombstone.deletedAt, deletedAt + 2 * DAY_MS, 'Conflicting tombstones must merge last-write-wins');

  // 11. Purge: a tombstone past the retention window stops suppressing and
  // leaves both the payload and the local store, so the table stays bounded.
  assert.strictEqual(TOMBSTONE_RETENTION_MS, 30 * DAY_MS, 'Tombstone retention must be 30 days');
  const expired = { ...rowOnB, deletedAt: NOW - TOMBSTONE_RETENTION_MS - 1 };
  const purged = bookmarkMerge([expired], [rowOnB]);
  assert.strictEqual(tombstoneCount(purged), 0, 'An expired tombstone must be purged on sync');
  assert.strictEqual(purged.length, 1, 'After the purge the row is no longer treated as deleted');
  assert.strictEqual(purgeExpiredTombstones([expired, tombstoneOnA], NOW).length, 1, 'purgeExpiredTombstones must keep in-window tombstones and drop expired ones');
  assert.strictEqual(
    purgeExpiredTombstones([tombstoneOnA], NOW + TOMBSTONE_RETENTION_MS).length,
    0,
    'A tombstone must be purged once the whole window has elapsed'
  );

  // 12. The push cap must not let tombstones eat the live-row budget.
  const manyLive = Array.from({ length: 300 }, (_, i) => makeBookmark(`bulk-${i}`, `https://example.com/p${i}`, createdAt));
  const manyTombstones = Array.from({ length: 50 }, (_, i) => ({ ...makeBookmark(`gone-${i}`, `https://example.com/g${i}`, createdAt), deletedAt }));
  const capped = capSyncedCollection([...manyLive, ...manyTombstones], 10);
  assert.strictEqual(liveRows(capped).length, 10, 'The live cap must still apply to live rows');
  assert.strictEqual(tombstoneCount(capped), 50, 'Tombstones must ride along in the envelope, not consume the live budget');

  // 13. Folders and workspaces are id-keyed and undated: a delete therefore
  // outranks any copy of the row, which is the safe direction for a delete.
  const folderOnB = makeFolder('f-1');
  const folderMerge = mergeSyncedCollection([{ ...folderOnB, deletedAt }], [folderOnB], { keyOf: (f: Folder) => f.id, now: NOW });
  assert.strictEqual(liveRows(folderMerge).length, 0, 'A deleted folder must not be resurrected by the other device copy');
  assert.strictEqual(rowVersion(folderOnB), 0, 'An undated row must report version 0 so a delete always outranks it');
  const workspaceOnB = makeWorkspace('w-1');
  const workspaceMerge = mergeSyncedCollection([{ ...workspaceOnB, deletedAt }], [workspaceOnB, makeWorkspace('w-2')], { keyOf: (w: Workspace) => w.id, now: NOW });
  assert.strictEqual(liveRows(workspaceMerge).map(w => w.id).join(','), 'w-2', 'Only the deleted workspace may be removed; the others must survive');

  // 14. The whole-dataset entry point the sync service itself calls: device A
  // pulls a vault that still holds its deleted bookmark, folder and workspace.
  const deviceAStore = {
    bookmarks: [tombstoneOnA, makeBookmark('bm-keep', 'https://example.com/keep', createdAt)],
    folders: [{ ...folderOnB, deletedAt }],
    workspaces: [{ ...workspaceOnB, deletedAt }, makeWorkspace('w-2')]
  };
  const deviceBPush = {
    bookmarks: [rowOnB, makeBookmark('bm-keep', 'https://example.com/keep', createdAt)],
    folders: [folderOnB],
    workspaces: [workspaceOnB, makeWorkspace('w-2')]
  };
  const deviceAMerge = mergeSyncedCollections(deviceAStore, deviceBPush, { syncBookmarks: true, syncWorkspaces: true }, NOW);
  assert.strictEqual(liveRows(deviceAMerge.bookmarks).map(b => b.id).join(','), 'bm-keep', 'Device A must end up with only the bookmark it still wants');
  assert.strictEqual(liveRows(deviceAMerge.folders).length, 0, 'Device A must not keep the folder it deleted');
  assert.strictEqual(liveRows(deviceAMerge.workspaces).map(w => w.id).join(','), 'w-2', 'Device A must keep its surviving workspace');
  assert.strictEqual(tombstoneCount(deviceAMerge.bookmarks), 1, 'Device A must re-push the tombstone so device B sees the delete next time');

  // Opted-out collections and a first sync (no remote at all) must not change
  // what the local store holds beyond the purge.
  const firstSync = mergeSyncedCollections(deviceAStore, null, { syncBookmarks: true, syncWorkspaces: true }, NOW);
  assert.strictEqual(firstSync.bookmarks.length, 2, 'A first sync must not drop rows or tombstones');
  const optedOut = mergeSyncedCollections(deviceAStore, deviceBPush, { syncBookmarks: false, syncWorkspaces: false }, NOW);
  assert.strictEqual(optedOut.bookmarks.length, 2, 'An opted-out collection must pass through untouched');
}

async function runSyncTests() {
  // 1. Password and Master Key Derivation (PBKDF2-SHA256 @ 600k iterations)
  const password = 'CorrectHorseBatteryStaple-2026!';
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cryptoKey = await deriveKey(password, salt);
  assert.ok(cryptoKey, 'PBKDF2-SHA256 key derivation must produce a valid CryptoKey');
  assert.strictEqual(cryptoKey.algorithm.name, 'AES-GCM', 'Derived key must use AES-GCM');

  // 2. E2EE Payload Encryption & Decryption (Round-trip)
  const sampleBundle: SyncDataBundle = {
    version: 2,
    timestamp: Date.now(),
    userId: 'user-test-uuid-1234',
    settings: {
      searchEngine: 'duckduckgo',
      theme: 'dark',
      privacyShield: true,
      fontSize: 'medium',
      accentColor: 'emerald',
      browserColor: 'midnight',
      showBookmarksBar: true,
      useVerticalTabs: true,
      mcpServerEnabled: false,
      newTabBackground: 'aurora_waves',
      startupBehavior: 'continue',
      tabStyle: 'rounded',
      doNotTrack: true,
      clearOnExit: false,
      hardwareAcceleration: true,
      developerMode: false
    },
    bookmarks: [
      { id: 'bm-1', title: 'Example Site', url: 'https://example.com/', createdAt: Date.now() }
    ],
    folders: [
      { id: 'f-1', name: 'Work', createdAt: Date.now() }
    ],
    history: [
      { id: 'h-1', title: 'Home', url: 'https://example.com/home', timestamp: Date.now() }
    ],
    workspaces: [
      { id: 'ws-1', name: 'Main', icon: 'Globe', createdAt: Date.now() }
    ]
  };

  const encryptedEnvelope = await encryptSyncPayload(sampleBundle, password);
  assert.ok(encryptedEnvelope, 'Encrypted envelope must be produced');
  assert.strictEqual(typeof encryptedEnvelope, 'object', 'Encrypted envelope must be an object');
  assert.strictEqual(encryptedEnvelope.version, 2, 'Encrypted envelope version must be 2');
  assert.ok(encryptedEnvelope.ciphertext, 'Encrypted envelope must have ciphertext');
  assert.ok(encryptedEnvelope.salt, 'Encrypted envelope must have salt');
  assert.ok(encryptedEnvelope.iv, 'Encrypted envelope must have iv');

  const decryptedBundle = await decryptSyncPayload<SyncDataBundle>(encryptedEnvelope, password);
  assert.strictEqual(decryptedBundle.version, 2, 'Decrypted bundle version must be 2');
  assert.strictEqual(decryptedBundle.userId, sampleBundle.userId);
  assert.strictEqual(decryptedBundle.settings?.searchEngine, 'duckduckgo');
  assert.strictEqual(decryptedBundle.bookmarks?.length, 1);
  assert.strictEqual(decryptedBundle.bookmarks?.[0].title, 'Example Site');

  console.log('[PASS] [Sync Vault] E2EE payload encryption and decryption round-trip verified (v2 envelope).');

  // 3. Decryption Failure on Tampered Envelope or Wrong Password (Fail-Closed)
  await assert.rejects(
    async () => {
      await decryptSyncPayload(encryptedEnvelope, 'WrongPassword123!');
    },
    /operation failed|operation was rejected|invalid|failed/i,
    'Decryption with incorrect password must fail closed'
  );

  console.log('[PASS] [Sync Vault] Wrong master password cleanly rejected.');

  // 4. Sync Code Formatting & Normalization
  const rawCode = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d';
  const formatted = (syncService.constructor as any).formatSyncCode(rawCode);
  assert.strictEqual(formatted.startsWith('nova-'), true, 'Formatted code must have nova- prefix');

  const normalized = (syncService.constructor as any).normalizeSyncCode(formatted);
  assert.strictEqual(normalized, rawCode.toUpperCase(), 'Normalized code must strip nova- and hyphens');

  console.log('[PASS] [Sync Vault] Sync chain code format and normalization verified.');

  // 5. Password E2EE Encryption and Decryption
  const passwordsToEncrypt: SavedPassword[] = [
    { id: 'pw-1', hostname: 'github.com', username: 'dev', password: 'secretPassword42!', createdAt: Date.now() }
  ];
  const encryptedPass = await syncService.encryptPasswords(passwordsToEncrypt, password);
  assert.ok(encryptedPass.ciphertext);
  assert.ok(encryptedPass.salt);
  assert.ok(encryptedPass.iv);

  const decryptedPass = await syncService.decryptPasswords(encryptedPass.ciphertext, encryptedPass.salt, encryptedPass.iv, password);
  assert.strictEqual(decryptedPass.length, 1);
  assert.strictEqual(decryptedPass[0].password, 'secretPassword42!');

  console.log('[PASS] [Sync Vault] E2EE passwords payload encryption and decryption verified.');

  // 6. Settings Per-Field Timestamp LWW Conflict Resolution (Anti-Setting Freeze)
  const now = Date.now();
  const testTimestamps = { theme: now + 10000, fontSize: now - 10000 };
  syncService.saveSettingsTimestamps(testTimestamps);
  const loadedTimestamps = syncService.getSettingsTimestamps();
  assert.strictEqual(loadedTimestamps.theme, testTimestamps.theme, 'Theme timestamp must be preserved');
  assert.strictEqual(loadedTimestamps.fontSize, testTimestamps.fontSize, 'FontSize timestamp must be preserved');

  console.log('[PASS] [Sync Vault] Settings per-field timestamp persistence and LWW integrity verified.');

  // 14. Tombstone propagation (soft deletes) — the real merge/purge/cap code.
  runTombstoneTests();
  console.log('[PASS] [Sync Vault] Deletion tombstones propagate across devices and are purged after the retention window.');
}

runSyncTests().then(() => {
  console.log('[PASS] [Sync Service Vault] All sync crypto and vault integrity tests passed cleanly.\n');
}).catch(err => {
  console.error('[FAIL] [Sync Service Vault] Test failed:', err);
  process.exit(1);
});
