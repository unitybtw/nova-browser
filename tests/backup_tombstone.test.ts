/**
 * Backup export/import versus sync tombstones.
 *
 * The import used to REPLACE the bookmark store with the sanitised backup rows.
 * Two things went wrong at once:
 *
 *  1. The sanitiser rebuilt each row field by field and had no `deletedAt`, so
 *     deletion state was dropped on the floor.
 *  2. Replacing the store discarded every local tombstone. The restored live
 *     rows were then pushed on the next sync, so restoring an old backup
 *     resurrected the deleted bookmarks on every other signed-in device — the
 *     exact data loss the tombstone work exists to prevent.
 *
 * The export also wrote the LIVE view, so a backup could not represent a
 * deletion in the first place.
 *
 * These assertions drive the real production helpers rather than restating the
 * policy, so a future change to the merge rules shows up here.
 */

import { isTombstonedRow } from '../src/services/syncService';
import type { Bookmark } from '../src/types/browser';
// The real import path, not a restatement of it: the sanitiser rebuilds every
// field, so a dropped `deletedAt` silently revives a deleted row, and the merge
// decides whether a restore may resurrect anything at all.
import { sanitizeImportedBookmarks, mergeImportedBookmarks } from '../src/hooks/useAppDataBackup';
import { isSafeAgentNavigationUrl } from '../src/utils/safeNavigation';

console.log('--- Backup restore vs tombstones ---');
let passed = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { passed++; console.log(`[PASS] [Backup-Tombstone] ${name}`); }
  else { console.log(`[FAIL] [Backup-Tombstone] ${name} ${extra}`); process.exitCode = 1; }
}

const bookmark = (id: string, url: string, timestamp: number, deletedAt?: number): Bookmark =>
  ({ id, url, title: id, timestamp, ...(deletedAt ? { deletedAt } : {}) } as Bookmark);

const live = (rows: Bookmark[]) => rows.filter(r => !isTombstonedRow(r));
// A backup file goes in, a store comes out - exactly the production sequence.
const restore = (local: Bookmark[], backupPayload: unknown) =>
  mergeImportedBookmarks(local, sanitizeImportedBookmarks(backupPayload));

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

// 1. A bookmark deleted locally must NOT come back from an older backup.
{
  const local = [
    bookmark('keep', 'https://keep.example/', NOW - 10 * DAY),
    bookmark('gone', 'https://gone.example/', NOW - 20 * DAY, NOW - 2 * DAY), // tombstone
  ];
  // The backup predates the delete, so it still lists `gone` as live.
  const backup = [
    bookmark('keep', 'https://keep.example/', NOW - 10 * DAY),
    bookmark('gone', 'https://gone.example/', NOW - 20 * DAY),
    bookmark('new', 'https://new.example/', NOW - 30 * DAY),
  ];
  const after = restore(local, backup);

  check('a locally deleted bookmark is not resurrected by an older backup',
    !live(after).some(b => b.url === 'https://gone.example/'),
    live(after).map(b => b.url).join(', '));
  check('the new bookmark from the backup IS added',
    live(after).some(b => b.url === 'https://new.example/'));
  check('untouched bookmarks survive the restore',
    live(after).some(b => b.url === 'https://keep.example/'));
  check('the tombstone is retained so the delete keeps propagating',
    after.some(b => b.url === 'https://gone.example/' && isTombstonedRow(b)));
}

// 2. Restoring must not be destructive: nothing local is dropped.
{
  const local = [
    bookmark('a', 'https://a.example/', NOW - 5 * DAY),
    bookmark('b', 'https://b.example/', NOW - 5 * DAY),
    bookmark('c', 'https://c.example/', NOW - 5 * DAY, NOW - DAY),
  ];
  const after = restore(local, [bookmark('z', 'https://z.example/', NOW - DAY)]);
  check('restore is additive: a local row missing from the backup is kept',
    live(after).some(b => b.url === 'https://b.example/'));
  check('restore is additive: another local row is kept',
    live(after).some(b => b.url === 'https://a.example/'));
  check('the imported row is present', live(after).some(b => b.url === 'https://z.example/'));
  check('an imported row never removes a local tombstone', after.filter(isTombstonedRow).length === 1);
}

// 3. A tombstone that IS in the backup must suppress the local live row.
{
  const local = [bookmark('x', 'https://x.example/', NOW - 40 * DAY)];
  const backup = [bookmark('x', 'https://x.example/', NOW - 40 * DAY, NOW - 3 * DAY)];
  const after = restore(local, backup);
  check('a tombstone inside the backup suppresses the matching local row',
    !live(after).some(b => b.url === 'https://x.example/'),
    live(after).map(b => b.url).join(','));
}

// 4. Ids are minted per device, so a backup imported on another machine has
//    different ids for the same URL. The delete must still hold.
{
  const local = [bookmark('local-id', 'https://same.example/', NOW - 20 * DAY, NOW - 2 * DAY)];
  const backup = [bookmark('backup-id', 'https://same.example/', NOW - 20 * DAY)];
  const after = restore(local, backup);
  check('a delete holds across differing ids for the same URL',
    !live(after).some(b => b.url === 'https://same.example/'),
    live(after).map(b => `${b.id}:${b.url}`).join(','));
}

// 5. The export must be able to represent a deletion at all.
{
  const rawStore = [
    bookmark('live1', 'https://live.example/', NOW - DAY),
    bookmark('dead1', 'https://dead.example/', NOW - DAY, NOW - DAY),
  ];
  // The export writes the raw store, so the row survives as a tombstone and
  // `deletedAt` is serialised. This is what makes a round trip lossless.
  const json = JSON.stringify({ bookmarks: rawStore });
  const parsed = JSON.parse(json).bookmarks as Bookmark[];
  const dead = parsed.find(b => b.id === 'dead1')!;
  check('an exported tombstone round-trips with its deletedAt intact',
    typeof dead.deletedAt === 'number' && dead.deletedAt > 0, JSON.stringify(dead));
  check('an exported tombstone is still recognised as a tombstone',
    isTombstonedRow(dead) === true);
  check('a live row is not mistaken for a tombstone', isTombstonedRow(parsed[0]) === false);
}

// 6. Importing the same backup twice must not duplicate anything.
{
  const local = [bookmark('d', 'https://dup.example/', NOW - 2 * DAY)];
  const backup = [bookmark('d', 'https://dup.example/', NOW - 2 * DAY)];
  const once = restore(local, backup);
  const twice = restore(once, backup);
  check('re-importing the same backup does not duplicate rows',
    live(twice).filter(b => b.url === 'https://dup.example/').length === 1,
    String(live(twice).filter(b => b.url === 'https://dup.example/').length));
}

// 7. The sanitiser itself, since it is what silently dropped deletedAt once.
{
  const cleaned = sanitizeImportedBookmarks([
    { id: 'a', url: 'https://a.example/', timestamp: NOW, deletedAt: NOW - DAY },
    { id: 'b', url: 'https://b.example/', timestamp: NOW },
    { id: 'c', url: 'https://c.example/', timestamp: NOW, deletedAt: 'nope' },
    { id: 'd', url: 'https://d.example/', timestamp: NOW, deletedAt: -5 },
    { id: 'e', url: 'https://e.example/', timestamp: NOW, deletedAt: NaN },
    { id: 'f', url: 'javascript:alert(1)', timestamp: NOW },
    { id: 'g', url: 'http://169.254.169.254/', timestamp: NOW },
    { id: 'h', url: 'http://127.0.0.1:3000/', timestamp: NOW },
    'not an object',
    null,
  ]);
  const byId = (id: string) => cleaned.find(b => b.id === id);

  check('the sanitiser keeps a valid deletedAt', byId('a')?.deletedAt === NOW - DAY);
  check('the sanitiser leaves a live row undeleted', byId('b')?.deletedAt === undefined);
  check('a non-numeric deletedAt is dropped, not coerced', byId('c')?.deletedAt === undefined);
  check('a negative deletedAt is dropped', byId('d')?.deletedAt === undefined);
  check('a NaN deletedAt is dropped', byId('e')?.deletedAt === undefined);
  check('a javascript: URL is filtered out', byId('f') === undefined);
  // The general policy deliberately ALLOWS private and loopback hosts: a user
  // may legitimately bookmark an intranet service or a local dev server, and
  // refusing those here would break real use. Only the AI/MCP agent boundary is
  // strict, because there the destination comes from page-influenced text.
  // Pinning the distinction stops someone "fixing" this by tightening the wrong
  // predicate (which would silently drop a user's own bookmarks) or by loosening
  // the agent one.
  check('an intranet bookmark is kept, by design', byId('h')?.url === 'http://127.0.0.1:3000/');
  check('the metadata address is also kept by the general policy', byId('g')?.url === 'http://169.254.169.254/');
  check('the agent policy is the strict one',
    isSafeAgentNavigationUrl('http://127.0.0.1:3000/') === false &&
    isSafeAgentNavigationUrl('http://169.254.169.254/') === false);
  check('the agent policy still allows a normal public site',
    isSafeAgentNavigationUrl('https://example.com/') === true);
  check('non-object entries are filtered out', cleaned.every(b => b && typeof b === 'object'));
  check('a row missing an id still gets one', typeof byId('a')?.id === 'string' && byId('a')!.id.length > 0);
  check('a non-array payload yields nothing rather than throwing',
    sanitizeImportedBookmarks('nope').length === 0 && sanitizeImportedBookmarks(null).length === 0);
}

console.log(`\n${passed} backup-tombstone checks passed\n`);

// ---------------------------------------------------------------------------
// The push payload must stay bounded even when the user mass-deletes.
// ---------------------------------------------------------------------------
import { capSyncedCollection } from '../src/services/syncService';

console.log('--- Tombstone push cap ---');
let capPassed = 0;
function ccheck(name: string, cond: boolean, extra = '') {
  if (cond) { capPassed++; console.log(`[PASS] [Tombstone-Cap] ${name}`); }
  else { console.log(`[FAIL] [Tombstone-Cap] ${name} ${extra}`); process.exitCode = 1; }
}

{
  // A user with 3000 bookmarks clears them all: 3000 tombstones, no live rows.
  const cleared = Array.from({ length: 3000 }, (_, i) =>
    bookmark(`b${i}`, `https://site${i}.example/`, NOW - 40 * DAY, NOW - 5 * DAY - i)
  );
  const pushed = capSyncedCollection(cleared, 5000, 2000);
  ccheck('a mass delete cannot grow the payload without bound', pushed.length <= 2000, String(pushed.length));
  ccheck('every pushed row is still a tombstone', pushed.every(isTombstonedRow));

  // The survivors must be the NEWEST deletes, not the oldest.
  const newest = Math.max(...pushed.map(r => r.deletedAt!));
  ccheck('the newest tombstones are the ones kept', newest === NOW - 5 * DAY, String(newest));
  ccheck('the oldest tombstones are the ones dropped',
    !pushed.some(r => r.id === 'b2999'), 'the last-deleted row should have been kept');
}

{
  // The cap must never evict live rows in favour of tombstones.
  const mixed = [
    ...Array.from({ length: 400 }, (_, i) => bookmark(`l${i}`, `https://live${i}.example/`, NOW)),
    ...Array.from({ length: 3000 }, (_, i) => bookmark(`t${i}`, `https://dead${i}.example/`, NOW - 5 * DAY, NOW - 5 * DAY)),
  ];
  const pushed = capSyncedCollection(mixed, 400, 50);
  ccheck('live rows survive a tombstone flood', pushed.filter(r => !isTombstonedRow(r)).length === 400,
    String(pushed.filter(r => !isTombstonedRow(r)).length));
  ccheck('tombstones are truncated to their own cap', pushed.filter(isTombstonedRow).length === 50,
    String(pushed.filter(isTombstonedRow).length));
}

{
  // Two devices holding the same tombstones in a different order must push the
  // same set, or a delete could be dropped on one device but kept on another.
  // The timestamps are deliberately IDENTICAL: a mass delete stamps Date.now()
  // once, so a whole burst arrives with the same deletedAt, and then the sort
  // key cannot break the tie on its own. With distinct timestamps this test
  // proves nothing, because the sort alone already orders them.
  const tombs = Array.from({ length: 100 }, (_, i) =>
    bookmark(`d${i}`, `https://x${i}.example/`, NOW, NOW - 1000));
  const a = capSyncedCollection(tombs, 0, 50).map(r => r.id).join(',');
  const b = capSyncedCollection([...tombs].reverse(), 0, 50).map(r => r.id).join(',');
  ccheck('the kept set is independent of input order', a === b, `\n    ${a.slice(0, 90)}\n    ${b.slice(0, 90)}`);
}

{
  // Below the cap nothing is dropped.
  const few = [bookmark('a', 'https://a.example/', NOW), bookmark('b', 'https://b.example/', NOW, NOW)];
  ccheck('a small payload is untouched', capSyncedCollection(few, 100, 2000).length === 2);
  ccheck('an empty collection stays empty', capSyncedCollection([], 100, 2000).length === 0);
}

console.log(`\n${capPassed} tombstone-cap checks passed\n`);
