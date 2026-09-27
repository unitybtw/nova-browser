/**
 * Sync correctness: deletion propagation, the conditional vault write, and the
 * per-field settings clock.
 *
 * Every assertion drives the production functions the service itself calls —
 * `indexPushedRows` / `pendingDeletionTombstones` / `deletionTombstones` /
 * `mergeSyncedCollections` / `capSyncedCollection` / `liveRowsOnly` for the
 * merges, `readVaultSnapshot` / `writeVaultIfUnchanged` /
 * `retryOnVaultConflict` against a PostgREST-shaped fake for the write, and
 * `mergeSettingsLastWriteWins` / `stampPersistedSettings` /
 * `recordPersistedSettings` for the settings clock. Nothing here restates the
 * policy: a test that re-implemented the merge would keep passing while the
 * shipped sync still resurrected a cleared history.
 *
 * The three bugs under test:
 *   1. A deleted password or a cleared history was union-only, so the next sync
 *      re-read the remote vault, merged the rows straight back and re-pushed
 *      them — "Clear browsing history" was a no-op on a synced device.
 *   2. The vault write had no precondition, so two devices reading the same row
 *      silently clobbered each other across the decrypt/encrypt round trip.
 *   3. Nothing stamped a per-field write clock when the user persisted a
 *      setting, so a local change could never outrank a remote one and the
 *      field was frozen on whichever device synced first.
 */

import type { Folder, HistoryItem, SavedPassword, UserSettings } from '../src/types/browser';
import type { EncryptedSyncEnvelope } from '../src/services/syncCrypto';
import { decryptSyncPayload, encryptSyncPayload } from '../src/services/syncCrypto';
import {
  MAX_SYNCED_HISTORY,
  SYNC_BUNDLE_VERSION,
  SyncConflictError,
  capSyncedCollection,
  deletionTombstones,
  evictionFloor,
  indexPushedRows,
  isSyncConflictError,
  isTombstonedRow,
  liveRowsOnly,
  loadPushedIndex,
  mergeSettingsLastWriteWins,
  mergeSyncedCollection,
  mergeSyncedCollections,
  mergeSyncedHistory,
  migrateSyncBundle,
  passwordRowKey,
  pendingDeletionTombstones,
  readVaultSnapshot,
  recordPersistedSettings,
  retryOnVaultConflict,
  rowVersion,
  savePushedIndex,
  stampPersistedSettings,
  syncService,
  writeVaultIfUnchanged,
  type PushedRowIndex,
  type TombstoneRow,
  type VaultRow,
  type VaultTable
} from '../src/services/syncService';

console.log('\n--- Sync correctness: deletions, conditional write, settings clock ---');

// The suites share one process, and some earlier suite normally installs the
// mock; in isolation there is no Web Storage at all, and the push index and the
// settings clock both live there.
if (typeof (globalThis as { localStorage?: unknown }).localStorage === 'undefined') {
  const map = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, String(v)); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    get length() { return map.size; },
    key: (i: number) => Array.from(map.keys())[i] ?? null
  };
}

const DAY = 24 * 60 * 60 * 1000;
/**
 * Real clock on purpose: the production merges are called with `Date.now()` by
 * the service, and retention arithmetic is relative to that, so a fixed date in
 * the past would read every tombstone here as already purged. Offsets are
 * relative to this instant.
 */
const NOW = Date.now();
const ALL_PREFS = { syncBookmarks: true, syncWorkspaces: true, syncHistory: true, syncPasswords: true };

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) { passed++; console.log(`[PASS] [SyncFix] ${name}`); }
  else { failed++; console.log(`[FAIL] [SyncFix] ${name} ${extra}`); process.exitCode = 1; }
}

const visit = (id: string, timestamp: number, deletedAt?: number): TombstoneRow<HistoryItem> =>
  ({ id, url: `https://${id}.example/`, title: id, timestamp, ...(deletedAt ? { deletedAt } : {}) });
const credential = (
  hostname: string,
  username: string,
  extra: Partial<SavedPassword> = {}
): TombstoneRow<SavedPassword> => ({ hostname, username, password: `pw-${username}`, ...extra });

const live = (rows: unknown[]): any[] => rows.filter(row => !isTombstonedRow(row));
const tombs = (rows: unknown[]): any[] => rows.filter(isTombstonedRow);
const ids = (rows: any[]): string => rows.map(row => row.id ?? row.hostname).join(',');

/** Capture what reached the logger, so "surfaced" is a checkable claim. */
function captureWarnings(run: () => void): string[] {
  const original = console.warn;
  const lines: string[] = [];
  console.warn = (...args: unknown[]) => { lines.push(args.map(a => String(a)).join(' ')); };
  try { run(); } finally { console.warn = original; }
  return lines;
}

// ---------------------------------------------------------------------------
// 1. The whole push/merge cycle for history and passwords, as the service runs
//    it: index what was pushed, reconstruct this device's deletions, merge, cap,
//    strip tombstones off the live result, re-index the live rows.
// ---------------------------------------------------------------------------
interface CycleResult {
  pushed: TombstoneRow<HistoryItem>[];
  liveHistory: HistoryItem[];
  pushedPasswords: TombstoneRow<SavedPassword>[];
  livePasswords: SavedPassword[];
  index: { history: PushedRowIndex; passwords: PushedRowIndex };
}

/** One device's sync cycle, built only from production functions. */
function syncCycle(
  local: { history: HistoryItem[]; passwords: SavedPassword[] },
  remote: { history: TombstoneRow<HistoryItem>[]; passwords: TombstoneRow<SavedPassword>[] },
  previousIndex: { history?: PushedRowIndex; passwords?: PushedRowIndex } | null,
  now: number = NOW
): CycleResult {
  const deletedLocally = pendingDeletionTombstones(
    local,
    previousIndex,
    now,
    { syncHistory: true, syncPasswords: true }
  );
  const merged = mergeSyncedCollections(
    { bookmarks: [], folders: [], workspaces: [], history: [...local.history, ...deletedLocally.history], passwords: [...local.passwords, ...deletedLocally.passwords] },
    { history: remote.history, passwords: remote.passwords },
    ALL_PREFS,
    now
  );
  const historyRows = merged.history!;
  const pushedHistory = capSyncedCollection(
    [...historyRows].sort((a, b) => rowVersion(b) - rowVersion(a)),
    MAX_SYNCED_HISTORY,
    undefined,
    h => String((h as HistoryItem).id)
  );
  const passwordRows = merged.passwords!;
  const pushedPasswords = capSyncedCollection(passwordRows, 2000, undefined, p => passwordRowKey(p));
  const liveHistory = liveRowsOnly(pushedHistory) as HistoryItem[];
  const livePasswords = liveRowsOnly(pushedPasswords) as SavedPassword[];
  return {
    pushed: pushedHistory,
    liveHistory,
    pushedPasswords,
    livePasswords,
    // Only live rows are indexed, exactly as the service records it: a pushed
    // delete must not be re-minted with a fresh `deletedAt` on every sync.
    index: {
      history: indexPushedRows(liveHistory, h => String((h as HistoryItem).id), h => rowVersion(h)),
      passwords: indexPushedRows(livePasswords, p => passwordRowKey(p), p => rowVersion(p))
    }
  };
}

// ---------------------------------------------------------------------------
// 1a. "Clear browsing history" has to reach the other devices.
// ---------------------------------------------------------------------------
{
  const historyOnBoth = [
    visit('h-1', NOW - 5 * 60_000),
    visit('h-2', NOW - 4 * 60_000),
    visit('h-3', NOW - 3 * 60_000)
  ];
  // First sync: the device holds the log and pushes it.
  const first = syncCycle({ history: historyOnBoth, passwords: [] }, { history: [], passwords: [] }, null);
  check('a first sync pushes the log and indexes it for later',
    first.liveHistory.length === 3 && Object.keys(first.index.history).length === 3,
    ids(first.liveHistory));

  // The user clears the log. The remote still holds all three rows.
  const afterClear = syncCycle({ history: [], passwords: [] }, { history: historyOnBoth, passwords: [] }, first.index);
  check('a cleared history is NOT refilled from the vault (the reported bug)',
    afterClear.liveHistory.length === 0, ids(afterClear.liveHistory));
  check('the cleared visits ride along as tombstones so the delete is pushed',
    tombs(afterClear.pushed).length === 3, String(tombs(afterClear.pushed).length));
  check('a pushed history tombstone is a delete marker, not a visit',
    tombs(afterClear.pushed).every(t => t.url === '' && t.timestamp === 0 && typeof t.id === 'string'));

  // A second device pulls what the first one pushed.
  const onDeviceB = syncCycle(
    { history: historyOnBoth, passwords: [] },
    { history: afterClear.pushed, passwords: [] },
    { history: indexPushedRows(historyOnBoth, h => String(h.id), h => rowVersion(h)) }
  );
  check('the deletion reaches a second device that still held the rows',
    onDeviceB.liveHistory.length === 0, ids(onDeviceB.liveHistory));
  check('the second device keeps re-pushing the deletion (it is carried onward)',
    tombs(onDeviceB.pushed).length === 3, String(tombs(onDeviceB.pushed).length));

  // And the next sync on the clearing device must not re-stamp the delete: the
  // index is rebuilt from the live rows only, so the delete is delivered by the
  // vault from now on (it is carried onward, with its ORIGINAL deletedAt) and
  // ages out on the normal retention schedule.
  const nextSync = syncCycle({ history: [], passwords: [] }, { history: afterClear.pushed, passwords: [] }, afterClear.index);
  const delivered = tombs(afterClear.pushed);
  check('a later sync still carries the delivered delete onward',
    tombs(nextSync.pushed).length === 3, String(tombs(nextSync.pushed).length));
  check('a later sync does not re-stamp it, so the retention window still expires',
    tombs(nextSync.pushed).every((t, i) => t.deletedAt === delivered[i].deletedAt),
    JSON.stringify(tombs(nextSync.pushed).map(t => t.deletedAt)));
  check('a later sync does not resurrect the cleared log either',
    nextSync.liveHistory.length === 0, ids(nextSync.liveHistory));
}

// ---------------------------------------------------------------------------
// 1b. A deleted saved password must stay deleted.
// ---------------------------------------------------------------------------
{
  const vault = [credential('github.com', 'dev', { timestamp: NOW - 2 * DAY }), credential('gitlab.com', 'ops', { timestamp: NOW - 2 * DAY })];
  const first = syncCycle({ history: [], passwords: vault }, { history: [], passwords: [] }, null);
  check('both credentials are pushed and indexed',
    first.livePasswords.length === 2 && Object.keys(first.index.passwords).length === 2);

  // The user deletes the GitHub entry. The remote still holds it.
  const afterDelete = syncCycle(
    { history: [], passwords: [vault[1]] },
    { history: [], passwords: vault },
    first.index
  );
  check('a deleted password is NOT restored from the vault (the reported bug)',
    afterDelete.livePasswords.length === 1, ids(afterDelete.livePasswords));
  check('the deleted credential is the one that is gone',
    afterDelete.livePasswords[0]?.hostname === 'gitlab.com', ids(afterDelete.livePasswords));
  check('the deletion rides along in the encrypted blob as a tombstone',
    tombs(afterDelete.pushedPasswords).length === 1, String(tombs(afterDelete.pushedPasswords).length));
  check('a password tombstone carries no credential material',
    !JSON.stringify(tombs(afterDelete.pushedPasswords)).includes('pw-dev'),
    JSON.stringify(tombs(afterDelete.pushedPasswords)));

  // Deleting every credential: the blob must still be pushed, or the vault keeps
  // the old list forever (the blob is skipped when there is nothing to send).
  const allDeleted = syncCycle({ history: [], passwords: [] }, { history: [], passwords: vault }, first.index);
  check('deleting every credential still leaves a tombstone to push',
    allDeleted.pushedPasswords.length === 2 && live(allDeleted.pushedPasswords).length === 0,
    String(allDeleted.pushedPasswords.length));

  // Re-adding a credential after a delete must win: the save stamps `timestamp`
  // (BrowserView writes it on every save), so the row post-dates the delete.
  const reAdded = credential('github.com', 'dev', { password: 'new-pw', timestamp: NOW + 1 });
  const reAddCycle = syncCycle(
    { history: [], passwords: [reAdded, vault[1]] },
    { history: [], passwords: afterDelete.pushedPasswords },
    afterDelete.index
  );
  check('a credential saved after the delete comes back and the stale tombstone is retired',
    reAddCycle.livePasswords.some(p => p.hostname === 'github.com' && p.password === 'new-pw')
      && tombs(reAddCycle.pushedPasswords).length === 0,
    JSON.stringify(reAddCycle.pushedPasswords));

  // The precedence is `deletedAt >= rowVersion`, so a re-save has to be strictly
  // newer than the delete: an undated or same-instant copy is the pre-delete one.
  const deleteTombstone = { hostname: 'gitlab.com', username: 'ops', deletedAt: NOW } as TombstoneRow<SavedPassword>;
  const sameInstant = mergeSyncedCollection(
    [credential('gitlab.com', 'ops', { password: 'pw-ops', timestamp: NOW })],
    [deleteTombstone],
    { keyOf: p => passwordRowKey(p), collision: 'keep-newer', now: NOW }
  );
  check('a re-save that is not newer than the delete stays deleted (the delete wins ties)',
    live(sameInstant).length === 0, ids(live(sameInstant)));
  const newerSave = mergeSyncedCollection(
    [credential('gitlab.com', 'ops', { password: 'pw-ops', timestamp: NOW + 1 })],
    [deleteTombstone],
    { keyOf: p => passwordRowKey(p), collision: 'keep-newer', now: NOW }
  );
  check('a strictly newer save wins the delete and retires its tombstone',
    live(newerSave).length === 1 && tombs(newerSave).length === 0, JSON.stringify(newerSave));
}

// ---------------------------------------------------------------------------
// 1c. The password key must not collapse two different credentials, and a
//     collision must never be silent.
// ---------------------------------------------------------------------------
{
  // Underscore is legal in a host and in a user name, so the previous
  // `hostname_username` key gave these two different credentials one key.
  check('a host/user split by an underscore does not collide',
    passwordRowKey({ hostname: 'a_b.example', username: 'c' })
      !== passwordRowKey({ hostname: 'a_b.example', username: 'c' }).replace('a_b.example c', 'a_b.examplec')
      && passwordRowKey({ hostname: 'a_b', username: 'c' }) !== passwordRowKey({ hostname: 'a', username: 'b_c' }),
    `${passwordRowKey({ hostname: 'a_b', username: 'c' })} vs ${passwordRowKey({ hostname: 'a', username: 'b_c' })}`);
  check('the host is case-folded, the user name is not',
    passwordRowKey({ hostname: 'GitHub.com', username: 'Dev' }) === passwordRowKey({ hostname: 'github.com', username: 'Dev' })
      && passwordRowKey({ hostname: 'github.com', username: 'Dev' }) !== passwordRowKey({ hostname: 'github.com', username: 'dev' }));

  // The key is still coarser than the credential — SavedPassword has no port or
  // scheme — so two rows CAN claim it. The previous merge dropped one silently;
  // now the newer save wins and the collision is reported.
  const staleLocal = credential('github.com', 'dev', { password: 'old-pw', timestamp: NOW - 2 * DAY });
  const freshRemote = credential('github.com', 'dev', { password: 'new-pw', timestamp: NOW - DAY });
  let collisionWarnings: string[] = [];
  let collided: TombstoneRow<SavedPassword>[] = [];
  collisionWarnings = captureWarnings(() => {
    collided = mergeSyncedCollection([staleLocal], [freshRemote], {
      keyOf: p => passwordRowKey(p),
      collision: 'keep-newer',
      now: NOW
    });
  });
  check('two rows on one key do not both vanish and none is dropped silently',
    collided.length === 1, String(collided.length));
  check('the newer save wins the collision, so a password change reaches the other device',
    collided[0]?.password === 'new-pw', String(collided[0]?.password));
  check('the collision is surfaced with a count',
    collisionWarnings.some(line => /claimed a key already taken/.test(line)), collisionWarnings.join(' | '));

  // A row with no key at all is refused and counted, never collided away.
  const refused = captureWarnings(() => {
    const merged = mergeSyncedCollection(
      [credential('', '', { password: 'a' }) as TombstoneRow<SavedPassword>, { password: 'b' } as unknown as TombstoneRow<SavedPassword>],
      [],
      { keyOf: p => (p?.hostname ? passwordRowKey(p) : ''), collision: 'keep-newer', now: NOW }
    );
    check('unkeyable credential rows are refused without throwing', merged.length === 0, String(merged.length));
  });
  check('the refused count is surfaced',
    refused.some(line => /Refused 2 synced row/.test(line)), refused.join(' | '));
}

// ---------------------------------------------------------------------------
// 1d. A row the app's own bound evicted is not a user deletion.
// ---------------------------------------------------------------------------
{
  const full = Array.from({ length: MAX_SYNCED_HISTORY }, (_, i) =>
    visit(`h-${i}`, NOW - (MAX_SYNCED_HISTORY - i) * 1000)
  );
  const oldest = full[0];
  // The user browses: the log stays at its bound, the oldest entries fall off the
  // tail, and a new visit takes the top. Nothing here is a user deletion.
  const afterBrowsing = [visit('n-1', NOW + 1), ...full.slice(1)];
  check('the local log is at its bound after browsing', afterBrowsing.length === MAX_SYNCED_HISTORY);
  const evictedIndex = indexPushedRows(full, h => String(h.id), h => rowVersion(h));
  const afterEviction = syncCycle({ history: afterBrowsing, passwords: [] }, { history: full, passwords: [] }, { history: evictedIndex });
  check('a row evicted by the log\'s own bound is not treated as deleted',
    tombs(afterEviction.pushed).length === 0, JSON.stringify(tombs(afterEviction.pushed)));
  check('the merged log is still a full log of visits, not one with a hole in it',
    afterEviction.liveHistory.length === MAX_SYNCED_HISTORY, String(afterEviction.liveHistory.length));

  // A log that is NOT full cannot have evicted anything, so the same absence is
  // a deletion.
  const partial = full.slice(0, 10);
  const partialIndex = indexPushedRows(partial, h => String(h.id), h => rowVersion(h));
  check('a log shorter than its bound has evicted nothing',
    evictionFloor(partial, h => rowVersion(h), MAX_SYNCED_HISTORY) === 0);
  check('a full log has an eviction floor at its oldest row',
    evictionFloor(full, h => rowVersion(h), MAX_SYNCED_HISTORY) === rowVersion(oldest));
  const clearedPartial = syncCycle({ history: [], passwords: [] }, { history: partial, passwords: [] }, { history: partialIndex });
  check('clearing a short log deletes every visit in it',
    tombs(clearedPartial.pushed).length === partial.length, String(tombs(clearedPartial.pushed).length));

  // No index at all (a device that never synced this collection, or a wiped
  // localStorage): nothing may be inferred, the vault is adopted instead.
  const noEvidence = syncCycle({ history: [], passwords: [] }, { history: partial, passwords: [] }, null);
  check('with no push index nothing is inferred as deleted',
    noEvidence.liveHistory.length === partial.length && tombs(noEvidence.pushed).length === 0,
    `${noEvidence.liveHistory.length}/${tombs(noEvidence.pushed).length}`);

  // The exemption must not swallow a real delete, and must not fire for one: a
  // timeframe clear removes the NEWEST visits while the log stays full (newer
  // visits take their place), so the removed rows sit above the eviction floor.
  const newest = full[full.length - 1];
  const afterTimeframeClear = [visit('n-2', NOW + 2_000), visit('n-1', NOW + 1_000), ...full.slice(1, full.length - 1)];
  check('the timeframe-clear log is still at its bound', afterTimeframeClear.length === MAX_SYNCED_HISTORY);
  const clearedNewest = syncCycle({ history: afterTimeframeClear, passwords: [] }, { history: full, passwords: [] }, { history: evictedIndex });
  check('a visit removed from a full log while older ones remain is a deletion',
    tombs(clearedNewest.pushed).length === 1 && tombs(clearedNewest.pushed)[0].id === newest.id,
    JSON.stringify(tombs(clearedNewest.pushed)));
  check('the eviction that happened earlier is still NOT read as a deletion',
    !tombs(clearedNewest.pushed).some(t => t.id === oldest.id), JSON.stringify(tombs(clearedNewest.pushed)));
  check('the deletion of that visit reaches the other device',
    !clearedNewest.liveHistory.some(h => h.id === newest.id), ids(clearedNewest.liveHistory));

  // Once the log is no longer full, nothing can be attributed to the bound: the
  // row that had fallen off the tail earlier is read as a deletion as well, so
  // both land in the same batch. Bounded and self-limiting (the tombstone is not
  // re-indexed, so it is delivered once and then ages out with the rest).
  const dipped = syncCycle({ history: afterBrowsing.filter(h => h.id !== newest.id), passwords: [] }, { history: full, passwords: [] }, { history: evictedIndex });
  check('below the bound every absent row is a deletion',
    tombs(dipped.pushed).length === 2, JSON.stringify(tombs(dipped.pushed).map(t => t.id)));

  // A row added AFTER a delete must not retire the delivered deletion: the
  // tombstone is only obsolete when a surviving row that claims ITS key is newer.
  const unrelatedNewer = mergeSyncedCollection(
    [visit('h-1', NOW - 5 * 60_000), visit('brand-new', NOW + 10_000), { ...visit('h-2', NOW - 4 * 60_000), deletedAt: NOW }],
    [],
    { keyOf: h => String(h.id), now: NOW }
  );
  check('an unrelated newer row does not retire a delivered tombstone',
    tombs(unrelatedNewer).length === 1 && tombs(unrelatedNewer)[0].id === 'h-2', JSON.stringify(tombs(unrelatedNewer)));
  check('and the row it deleted stays suppressed',
    !live(unrelatedNewer).some(h => h.id === 'h-2'), ids(live(unrelatedNewer)));
}

// ---------------------------------------------------------------------------
// 1e. Retention, and no tombstone ever reaching the local store.
// ---------------------------------------------------------------------------
{
  const stale = visit('h-old', NOW - 60 * DAY, NOW - 45 * DAY); // deleted 45 days ago
  const fresh = visit('h-keep', NOW - 60 * DAY, NOW - 2 * DAY); // deleted 2 days ago
  const merged = mergeSyncedCollection(
    [stale, fresh],
    [visit('h-old', NOW - 60 * DAY), visit('h-keep', NOW - 60 * DAY)],
    { keyOf: h => String(h.id), now: NOW }
  );
  check('a tombstone past the retention window is purged from the payload',
    !merged.some(h => h.id === 'h-old' && isTombstonedRow(h)), ids(merged));
  check('and the row it used to suppress is live again',
    merged.some(h => h.id === 'h-old' && !isTombstonedRow(h)), ids(merged));
  check('a tombstone inside the window still suppresses its row',
    !merged.some(h => h.id === 'h-keep' && !isTombstonedRow(h)), ids(merged));
  check('the in-window tombstone is kept for the next push',
    merged.filter(h => h.id === 'h-keep' && isTombstonedRow(h)).length === 1);

  // The app's post-sync re-merge must not turn a tombstone back into a visit.
  const remerged = mergeSyncedHistory([visit('h-old', NOW - 60 * DAY), fresh], [visit('h-keep', NOW - 60 * DAY)]);
  check('the post-sync history re-merge drops tombstone rows',
    remerged.every(h => !isTombstonedRow(h)) && remerged.every(h => h.url !== ''), JSON.stringify(remerged));
}

// ---------------------------------------------------------------------------
// 1f. The push index itself (per user, corrupted input, persistence).
// ---------------------------------------------------------------------------
{
  const USER = 'push-index-user';
  const KEY = `nova_sync_pushed_index_${USER}`;
  localStorage.removeItem(KEY);
  check('a device that never pushed has no index', loadPushedIndex(USER) === null);

  const rows = [visit('h-1', NOW - 1000), visit('h-2', NOW - 2000)];
  savePushedIndex(USER, { history: indexPushedRows(rows, h => String(h.id), h => rowVersion(h)) });
  check('the index round-trips through storage',
    Object.keys(loadPushedIndex(USER)!.history!).join(',') === 'h-1,h-2', JSON.stringify(loadPushedIndex(USER)));

  localStorage.setItem(KEY, 'not json at all');
  check('a corrupted index reads as absent instead of throwing', loadPushedIndex(USER) === null);
  localStorage.setItem(KEY, JSON.stringify({ history: { a: 1, b: 'x', c: -5, d: Number.NaN } }));
  const repaired = loadPushedIndex(USER)!.history!;
  check('only positive finite versions survive the index',
    JSON.stringify(repaired) === JSON.stringify({ a: 1 }), JSON.stringify(repaired));
  localStorage.removeItem(KEY);

  // A tombstone is never indexed: it is a deletion that has already been pushed,
  // and re-minting it every sync would keep the retention window rolling.
  const withTombstone = [visit('h-live', NOW), visit('h-dead', NOW - 1000, NOW - 500)];
  const index = indexPushedRows(withTombstone, h => String(h.id), h => rowVersion(h));
  check('a tombstone is not indexed as a live row', JSON.stringify(index) === JSON.stringify({ 'h-live': rowVersion(withTombstone[0]) }), JSON.stringify(index));
}

// ---------------------------------------------------------------------------
// 2. The conditional write: PostgREST-shaped fake, real production functions.
// ---------------------------------------------------------------------------
/**
 * A `VaultTable` that behaves like PostgREST for the calls the sync makes: the
 * filters a write carries are applied to the row it is about to write, so a
 * filtered upsert that matches nothing is a NO-OP answered with an empty array
 * and no error — the silent failure the production code has to detect.
 */
class FakeVaultTable implements VaultTable {
  row: (VaultRow & { user_id?: string }) | null = null;
  /** Emulate a backend that answers a successful write with no rows at all. */
  swallowWriteRows = false;
  readError: unknown = null;
  writeError: unknown = null;
  reads = 0;
  writes = 0;
  private filters: Record<string, unknown> = {};
  private pending: Record<string, unknown> | null = null;

  private matches(): boolean {
    if (!this.row) return false;
    return Object.entries(this.filters).every(([column, value]) => (this.row as any)[column] === value);
  }

  private chain(): any {
    const owner = this;
    const chain: any = {
      eq(column: string, value: unknown) { owner.filters[column] = value; return chain; },
      select() { return chain; },
      maybeSingle() {
        owner.reads++;
        if (owner.readError) return Promise.resolve({ data: null, error: owner.readError });
        return Promise.resolve({ data: owner.matches() ? owner.row : null, error: null });
      },
      then(onfulfilled?: any, onrejected?: any) {
        return Promise.resolve()
          .then(() => owner.resolveWrite())
          .then(onfulfilled, onrejected);
      }
    };
    return chain;
  }

  select(): any { this.filters = {}; this.pending = null; return this.chain(); }
  upsert(values: Record<string, unknown>): any { this.pending = values; this.filters = {}; return this.chain(); }

  private resolveWrite(): { data: unknown[]; error: unknown } {
    if (this.writeError) return { data: null, error: this.writeError };
    // No row yet: this is the first write for the account (an insert, subject to
    // a concurrent first sync from another device).
    if (!this.row) return this.applyWrite();
    // Filters that do not match the current row mean the row moved on: nothing is
    // written and the backend reports zero affected rows.
    if (!this.matches()) return { data: [], error: null };
    return this.applyWrite();
  }

  private applyWrite(): { data: unknown[]; error: unknown } {
    this.writes++;
    this.row = {
      user_id: this.pending!.user_id as string,
      envelope: this.pending!.envelope as EncryptedSyncEnvelope,
      updated_at: this.pending!.updated_at as string
    };
    return { data: this.swallowWriteRows ? [] : [this.row], error: null };
  }
}

const VAULT_USER = '11111111-2222-3333-4444-555555555555';
const VAULT_KEY = 'test-sync-key-aaaaaaaa-bbbbbbbb';

const envelopeOf = (folders: Folder[], stamp: number) => ({
  version: SYNC_BUNDLE_VERSION as 2 | 3 | 4,
  timestamp: stamp,
  userId: VAULT_USER,
  folders
});
const folder = (id: string, name: string): Folder => ({ id, name, isExpanded: true, workspaceId: 'default' });

async function pushBundle(table: FakeVaultTable, bundle: unknown): Promise<{ data: unknown[]; error: unknown }> {
  const envelope = await encryptSyncPayload(bundle, VAULT_KEY);
  const snapshot = await readVaultSnapshot(table, VAULT_USER);
  const result = await writeVaultIfUnchanged(table, {
    userId: VAULT_USER,
    envelope,
    expectedUpdatedAt: snapshot.updatedAt,
    nowIso: new Date().toISOString()
  });
  return { data: result.written ? ['row'] : [], error: result.error };
}

async function main() {
  // 2a. The happy path still writes.
  {
    const table = new FakeVaultTable();
    const written = await pushBundle(table, envelopeOf([folder('f-1', 'Work')], NOW));
    check('a first sync writes the vault', written.data.length === 1 && table.writes === 1, JSON.stringify(written));
    const snapshot = await readVaultSnapshot(table, VAULT_USER);
    check('the read hands back the version the write must be conditioned on',
      typeof snapshot.updatedAt === 'string' && snapshot.row?.envelope != null, String(snapshot.updatedAt));
  }

  // 2a-bis. A row with no version cannot be written with a precondition, and a
  // blind write is what this whole mechanism exists to prevent.
  {
    const unversioned = new FakeVaultTable();
    unversioned.row = { user_id: VAULT_USER, envelope: null, updated_at: null as unknown as string };
    let refused = false;
    try {
      await readVaultSnapshot(unversioned, VAULT_USER);
    } catch {
      refused = true;
    }
    check('a vault row with no updated_at is refused rather than written blind', refused);
  }

  // 2b. THE race: A reads, B renames and writes, A writes its stale bundle. The
  // write is refused, so B's rename survives.
  {
    const table = new FakeVaultTable();
    const readByA = await readVaultSnapshot(table, VAULT_USER);
    check('a missing vault reads as no row and no precondition', readByA.row === null && readByA.updatedAt === null);

    // Device B creates the vault first.
    await pushBundle(table, envelopeOf([folder('f-1', 'Work')], NOW));
    // A read the row, then B renamed the folder and pushed.
    const staleSnapshot = await readVaultSnapshot(table, VAULT_USER);
    await pushBundle(table, envelopeOf([folder('f-1', 'Renamed by B')], NOW + 1));
    const afterB = await readVaultSnapshot(table, VAULT_USER);
    check('the vault moved on while A was encrypting',
      afterB.updatedAt !== staleSnapshot.updatedAt, `${staleSnapshot.updatedAt} -> ${afterB.updatedAt}`);

    // A's stale write, with the precondition it read.
    const envelope = await encryptSyncPayload(envelopeOf([folder('f-1', 'Work')], NOW + 2), VAULT_KEY);
    const conflict = await writeVaultIfUnchanged(table, {
      userId: VAULT_USER, envelope, expectedUpdatedAt: staleSnapshot.updatedAt, nowIso: new Date().toISOString()
    });
    check('a write based on a superseded read is reported as a conflict, not as a success',
      conflict.conflict === true && conflict.written === false, JSON.stringify(conflict));

    const survivors = await decryptSyncPayload<any>((await readVaultSnapshot(table, VAULT_USER)).row!.envelope as EncryptedSyncEnvelope, VAULT_KEY);
    check("the losing device's stale bundle did NOT overwrite the winner's rename",
      survivors.folders[0].name === 'Renamed by B', JSON.stringify(survivors.folders));
  }

  // 2c. The silent no-op: the write matched nothing and the backend answered
  // with an empty array and NO error. Reporting success here would tell the user
  // their change was uploaded when nothing was written at all.
  {
    const table = new FakeVaultTable();
    await pushBundle(table, envelopeOf([folder('f-1', 'Work')], NOW));
    const stale = await readVaultSnapshot(table, VAULT_USER);
    await pushBundle(table, envelopeOf([folder('f-1', 'Renamed by B')], NOW + 1));
    const envelope = await encryptSyncPayload(envelopeOf([folder('f-1', 'Work')], NOW + 2), VAULT_KEY);
    const noop = await writeVaultIfUnchanged(table, {
      userId: VAULT_USER, envelope, expectedUpdatedAt: stale.updatedAt, nowIso: new Date().toISOString()
    });
    check('a filtered write that matched nothing is a conflict, never a silent success',
      noop.conflict === true && noop.written === false && noop.error == null, JSON.stringify(noop));

    // Same thing when the backend reports no affected rows for a write it did
    // perform: the result is unverifiable, so it must be retried, not trusted.
    const quiet = new FakeVaultTable();
    quiet.swallowWriteRows = true;
    const reported = await writeVaultIfUnchanged(quiet, {
      userId: VAULT_USER, envelope, expectedUpdatedAt: null, nowIso: new Date().toISOString()
    });
    check('a write whose result cannot be confirmed is not reported as written',
      reported.written === false && reported.conflict === true, JSON.stringify(reported));
  }

  // 2d. A concurrent FIRST sync (both devices insert) is a race, not a failure.
  {
    const table = new FakeVaultTable();
    table.writeError = { code: '23505', message: 'duplicate key value violates unique constraint' };
    const duplicate = await writeVaultIfUnchanged(table, {
      userId: VAULT_USER,
      envelope: await encryptSyncPayload(envelopeOf([], NOW), VAULT_KEY),
      expectedUpdatedAt: null,
      nowIso: new Date().toISOString()
    });
    check('a duplicate-key insert is reported as a conflict, not as an error',
      duplicate.conflict === true && duplicate.error == null, JSON.stringify(duplicate));

    const broken = new FakeVaultTable();
    broken.writeError = { code: '57014', message: 'statement timeout' };
    const failed = await writeVaultIfUnchanged(broken, {
      userId: VAULT_USER,
      envelope: await encryptSyncPayload(envelopeOf([], NOW), VAULT_KEY),
      expectedUpdatedAt: null,
      nowIso: new Date().toISOString()
    });
    check('a real backend failure is surfaced as an error, not retried as a race',
      failed.error != null && failed.conflict === false, JSON.stringify(failed));
  }

  // 2e. The retry loop: the whole read-merge-write runs again, and the device
  // that lost the race ends up with the winner's rows rather than erasing them.
  {
    const table = new FakeVaultTable();
    await pushBundle(table, envelopeOf([folder('f-1', 'Work'), folder('f-2', 'Personal')], NOW));
    let attempts = 0;

    const deviceRound = async (): Promise<Folder[]> => retryOnVaultConflict(async () => {
      attempts++;
      const snapshot = await readVaultSnapshot(table, VAULT_USER);
      const remote = snapshot.row?.envelope
        ? migrateSyncBundle(await decryptSyncPayload<any>(snapshot.row.envelope as EncryptedSyncEnvelope, VAULT_KEY))
        : null;
      const local = [{ id: 'f-3', name: 'Added by A', isExpanded: true, workspaceId: 'default' }];
      const merged = mergeSyncedCollections(
        { bookmarks: [], folders: local, workspaces: [] },
        remote,
        { syncBookmarks: true, syncWorkspaces: true },
        NOW
      );
      const envelope = await encryptSyncPayload({ ...envelopeOf(merged.folders, NOW), bookmarks: [] }, VAULT_KEY);
      // Another device, reading the same row, wins the race on the first attempt.
      if (attempts === 1) {
        const theirs = await encryptSyncPayload(envelopeOf([...merged.folders, folder('f-4', 'Added by B')], NOW + 1), VAULT_KEY);
        await writeVaultIfUnchanged(table, {
          userId: VAULT_USER, envelope: theirs, expectedUpdatedAt: snapshot.updatedAt, nowIso: new Date(Date.now() + 1).toISOString()
        });
      }
      const write = await writeVaultIfUnchanged(table, {
        userId: VAULT_USER, envelope, expectedUpdatedAt: snapshot.updatedAt, nowIso: new Date().toISOString()
      });
      if (write.error) throw write.error;
      if (write.conflict) throw new SyncConflictError();
      return merged.folders;
    });

    const result = await deviceRound();
    check('a lost write race is retried', attempts === 2, String(attempts));
    check('the retry re-reads and keeps the other device\'s rows instead of erasing them',
      result.map(f => f.id).sort().join(',') === 'f-1,f-2,f-3,f-4', result.map(f => f.id).join(','));
    const finalVault = await decryptSyncPayload<any>((await readVaultSnapshot(table, VAULT_USER)).row!.envelope as EncryptedSyncEnvelope, VAULT_KEY);
    check('the vault ends up holding both devices\' folders',
      finalVault.folders.map((f: Folder) => f.id).sort().join(',') === 'f-1,f-2,f-3,f-4',
      finalVault.folders.map((f: Folder) => f.id).join(','));
  }

  // 2f. The retry is bounded, and only a lost race is retried.
  {
    let attempts = 0;
    let surfaced: unknown = null;
    try {
      await retryOnVaultConflict(async () => {
        attempts++;
        throw new SyncConflictError();
      });
    } catch (error) {
      surfaced = error;
    }
    check('the retry gives up instead of hammering the backend', attempts === 3, String(attempts));
    check('giving up surfaces a conflict the user is told about',
      isSyncConflictError(surfaced) && /another device|Another device/.test((surfaced as Error).message),
      String((surfaced as Error)?.message));

    let otherAttempts = 0;
    await retryOnVaultConflict(async () => {
      otherAttempts++;
      throw new Error('network down');
    }).catch(() => {});
    check('a real failure is not retried as a race', otherAttempts === 1, String(otherAttempts));
  }

  // -------------------------------------------------------------------------
  // 3. The per-field settings clock.
  // -------------------------------------------------------------------------
  {
    const T0 = NOW - 10 * DAY; // this device last synced the field
    const T1 = NOW - 5 * DAY;  // the other device changed it and synced
    const T2 = NOW - DAY;      // the user changes it here, after that
    const remote = { theme: 'light' as const };
    const remoteStamps = { theme: T1 };
    const frozen = { theme: T0 };

    // With no stamp taken at the write, the local clock can only be as old as the
    // last sync, so the remote wins and the user's change is discarded.
    const withoutStamp = mergeSettingsLastWriteWins({ theme: 'dark' } as UserSettings, remote, frozen, remoteStamps, { now: T2 });
    check('premise: without a write-time stamp a local change loses to the remote',
      withoutStamp.settings.theme === 'light', String(withoutStamp.settings.theme));

    // The fix: the persist path stamps the changed field.
    const stamped = stampPersistedSettings({ theme: 'system' } as Partial<UserSettings>, { theme: 'dark' } as Partial<UserSettings>, T2, frozen);
    check('the persist path stamps the changed field with the time it was written',
      stamped.theme === T2 && stamped.fontSize === undefined, JSON.stringify(stamped));
    const withStamp = mergeSettingsLastWriteWins({ theme: 'system' } as UserSettings, remote, stamped, remoteStamps, { now: T2 });
    check('a setting changed after the remote change now wins instead of being frozen',
      withStamp.settings.theme === 'system', String(withStamp.settings.theme));
    check('the winning field is pushed with its own write clock, so the other device adopts it',
      withStamp.timestamps.theme === T2, JSON.stringify(withStamp.timestamps));

    const onOtherDevice = mergeSettingsLastWriteWins(
      { theme: 'light' } as UserSettings,
      { theme: 'system' },
      { theme: T1 },
      { theme: T2 },
      { now: T2 }
    );
    check("the change reaches the device that made the earlier change",
      onOtherDevice.settings.theme === 'system', String(onOtherDevice.settings.theme));

    // Unchanged fields are not stamped: a hydration write must not make this
    // device win every field and stop adopting the cloud configuration.
    const untouched = stampPersistedSettings(
      { theme: 'system', fontSize: 'large' } as Partial<UserSettings>,
      { theme: 'system', fontSize: 'medium' } as Partial<UserSettings>,
      T2,
      frozen
    );
    check('a field whose value did not change keeps its existing stamp instead of being re-stamped',
      untouched.theme === T0 && untouched.fontSize === T2, JSON.stringify(untouched));
    check('a first-time stamp is created for a field that never had one',
      stampPersistedSettings({ fontSize: 'large' } as Partial<UserSettings>, {}, T2, {}).fontSize === T2);

    // Deep values are compared by content, not by reference: `shortcuts` is
    // replaced wholesale, and a change inside it is still a change of the field.
    const shortcutsBefore = { shortcuts: { newTab: { key: 't', shift: false, meta: true } } } as unknown as Partial<UserSettings>;
    const shortcutsAfter = { shortcuts: { newTab: { key: 't', shift: false, meta: true } } } as unknown as Partial<UserSettings>;
    const objectStamps = stampPersistedSettings(shortcutsAfter, shortcutsBefore, T2, {});
    check('an object setting that is deep-equal is not re-stamped', objectStamps.shortcuts === undefined, JSON.stringify(objectStamps));
    const changedObject = stampPersistedSettings(
      { shortcuts: { newTab: { key: 'k', shift: false, meta: true } } } as unknown as Partial<UserSettings>,
      shortcutsBefore,
      T2,
      {}
    );
    check('a change inside an object setting IS stamped', changedObject.shortcuts === T2, JSON.stringify(changedObject));

    // The service-level call, and the hydration case: the first persist of a
    // process adopts the stored settings as its baseline and stamps nothing.
    localStorage.setItem('user_settings', JSON.stringify({ theme: 'dark', fontSize: 'medium' }));
    syncService.saveSettingsTimestamps({});
    const hydrationWrite = recordPersistedSettings({ theme: 'dark', fontSize: 'medium' } as Partial<UserSettings>, NOW);
    check('re-persisting the settings a device already had stamps nothing',
      Object.keys(hydrationWrite).length === 0, JSON.stringify(hydrationWrite));
    const userEdit = recordPersistedSettings({ theme: 'light', fontSize: 'medium' } as Partial<UserSettings>, NOW + 1);
    check('a real edit after hydration stamps exactly the changed field',
      userEdit.theme === NOW + 1 && userEdit.fontSize === undefined, JSON.stringify(userEdit));

    syncService.saveSettingsTimestamps({ theme: T0 });
    syncService.recordSettingsPersist({ theme: 'system', fontSize: 'large' } as Partial<UserSettings>, T2);
    const viaService = syncService.getSettingsTimestamps();
    check('the service persists the stamps the settings write path hands it',
      viaService.theme === T2 && viaService.fontSize === T2, JSON.stringify(viaService));
  }

  console.log(`\n${passed} sync-correctness checks passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error('[FAIL] [SyncFix] Test failed:', err);
  process.exit(1);
});
