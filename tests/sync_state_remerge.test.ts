/**
 * A sync result must be re-merged into the live state, never replace it.
 *
 * `syncData` takes 0.5-3s (two PBKDF2 derivations, a read and an upsert) and
 * computes its result from the rows as they were when the request went out. The
 * hook used to apply that result with full-replacement setters, so anything the
 * user did inside that window — a bookmark added, a folder deleted, a setting
 * flipped — was destroyed locally, and because the pushed bundle was built from
 * the same stale snapshot it was never uploaded either. The change vanished from
 * both sides with no error anywhere.
 *
 * Every assertion below drives the real production functions: `applySyncedData`
 * (the hook's own apply step) on top of `remergeSyncedCollection` /
 * `mergeSyncedHistory` / `mergeSyncedSettings`, and the sync service's own
 * `mergeSyncedCollections` / `mergeSyncedCollection` for the row-level rules.
 * Nothing here restates the policy — a test that reimplements it would keep
 * passing while the shipped code stays broken.
 */

import { applySyncedData, type SyncedCollections } from '../src/hooks/useAppSync';
import {
  MAX_SYNCED_HISTORY,
  isTombstonedRow,
  mergeSyncedCollection,
  mergeSyncedCollections,
  mergeSyncedHistory,
  mergeSyncedSettings,
  normalizeBookmarkUrl,
  remergeSyncedCollection,
} from '../src/services/syncService';
import type { Bookmark, Folder, HistoryItem, UserSettings, Workspace } from '../src/types/browser';

console.log('--- Sync result re-merge: live state must win over the stale snapshot ---');
let passed = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { passed++; console.log(`[PASS] [Sync-Remerge] ${name}`); }
  else { console.log(`[FAIL] [Sync-Remerge] ${name} ${extra}`); process.exitCode = 1; }
}

/**
 * Real clock on purpose: `applySyncedData` merges against the real clock (that is
 * what production does), so a mid-sync tombstone stamped relative to a fixed date
 * in the past reads as retention-expired and is purged. Every offset below is
 * relative to this instant.
 */
const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

const bookmark = (id: string, url: string, timestamp: number, deletedAt?: number): Bookmark =>
  ({ id, url, title: id, timestamp, ...(deletedAt ? { deletedAt } : {}) } as Bookmark);
const folder = (id: string, deletedAt?: number): Folder =>
  ({ id, name: id, isExpanded: true, workspaceId: 'default', ...(deletedAt ? { deletedAt } : {}) } as Folder);
const workspace = (id: string): Workspace => ({ id, name: id, color: 'blue' } as Workspace);
const visit = (id: string, timestamp: number): HistoryItem =>
  ({ id, url: `https://${id}.example/`, title: id, timestamp } as HistoryItem);
const live = (rows: any[]) => rows.filter(row => !isTombstonedRow(row));
const ids = (rows: any[]) => rows.map(row => row.id);

/**
 * Stand-in for React state that applies `SetStateAction` exactly the way React
 * does, so the hook's own apply step is what runs.
 */
function createStore(initial: SyncedCollections) {
  const state: SyncedCollections = { ...initial };
  const setter = <K extends keyof SyncedCollections>(key: K) =>
    (update: SyncedCollections[K] | ((prev: SyncedCollections[K]) => SyncedCollections[K])) => {
      state[key] = typeof update === 'function'
        ? (update as (prev: SyncedCollections[K]) => SyncedCollections[K])(state[key])
        : update;
    };
  return {
    state,
    setters: {
      setBookmarks: setter('bookmarks'),
      setFolders: setter('folders'),
      setHistory: setter('history'),
      setSettings: setter('settings'),
      setWorkspaces: setter('workspaces'),
    }
  };
}

/** Capture what a logger call reached the console, so "surfaced" is checkable. */
function captureConsole(method: 'warn' | 'error', run: () => void): string[] {
  const original = console[method];
  const lines: string[] = [];
  console[method] = (...args: unknown[]) => { lines.push(args.map(a => String(a)).join(' ')); };
  try { run(); } finally { console[method] = original; }
  return lines;
}

// ---------------------------------------------------------------------------
// 1. The reported data loss: changes made DURING the round-trip.
// ---------------------------------------------------------------------------
{
  // What the app looked like when the request went out (this is what got pushed).
  const snapshot: SyncedCollections = {
    bookmarks: [bookmark('bm-old', 'https://old.example/', NOW - 10 * DAY), bookmark('bm-shared', 'https://shared.example/', NOW - 10 * DAY)],
    folders: [folder('f-keep'), folder('f-deleted-mid-sync')],
    history: [visit('h-old', NOW - 60_000)],
    settings: { theme: 'dark', fontSize: 'medium' } as UserSettings,
    workspaces: [workspace('ws-1')]
  };

  // What the user did while the 0.5-3s round-trip was still in flight.
  const liveAfterUserAction: SyncedCollections = {
    bookmarks: [...snapshot.bookmarks, bookmark('bm-added-mid-sync', 'https://added.example/', NOW - 1_000)],
    folders: [folder('f-keep'), folder('f-deleted-mid-sync', NOW - 2_000)],
    history: [visit('h-mid-sync', NOW - 500), ...snapshot.history],
    settings: { theme: 'light', fontSize: 'medium' } as UserSettings,
    workspaces: [workspace('ws-1')]
  };

  // What came back: the snapshot merged with the other device, so it is blind to
  // everything above and carries one remote row per collection.
  const remote: SyncedCollections = {
    bookmarks: [...snapshot.bookmarks, bookmark('bm-remote', 'https://remote.example/', NOW - 30 * DAY)],
    folders: [...snapshot.folders],
    history: [...snapshot.history, visit('h-remote', NOW - 120_000)],
    settings: { theme: 'dark', fontSize: 'large' } as UserSettings,
    workspaces: [workspace('ws-1'), workspace('ws-remote')]
  };

  // The premise of the whole suite: the payload really does lack the in-flight
  // changes, so anything that replaces state with it loses them by construction.
  check('the sync payload is blind to the mid-sync changes (premise)',
    !remote.bookmarks.some(b => b.id === 'bm-added-mid-sync')
    && !remote.folders.some(f => isTombstonedRow(f))
    && remote.settings.theme === 'dark');

  const store = createStore(liveAfterUserAction);
  applySyncedData(remote, store.setters, snapshot.settings);

  check('a bookmark added during the sync survives',
    live(store.state.bookmarks).some(b => b.id === 'bm-added-mid-sync'),
    ids(live(store.state.bookmarks)).join(','));
  check('a folder deleted during the sync is not resurrected',
    !live(store.state.folders).some(f => f.id === 'f-deleted-mid-sync'),
    ids(live(store.state.folders)).join(','));
  check('the mid-sync delete is kept as a tombstone so it still propagates',
    store.state.folders.some(f => f.id === 'f-deleted-mid-sync' && isTombstonedRow(f)));
  check('a setting flipped during the sync is not reverted',
    store.state.settings.theme === 'light', String(store.state.settings.theme));
  check('a visit recorded during the sync survives',
    store.state.history.some(h => h.id === 'h-mid-sync'));
  check('every pre-sync bookmark is still there',
    ['bm-old', 'bm-shared', 'bm-added-mid-sync'].every(id => live(store.state.bookmarks).some(b => b.id === id)),
    ids(live(store.state.bookmarks)).join(','));
  check('untouched folders are kept',
    live(store.state.folders).some(f => f.id === 'f-keep'));
  check('untouched workspaces are kept',
    store.state.workspaces.some(w => w.id === 'ws-1'));

  check('a remote-only bookmark still comes down',
    live(store.state.bookmarks).some(b => b.id === 'bm-remote'));
  check('a remote-only visit still comes down',
    store.state.history.some(h => h.id === 'h-remote'));
  check('a remote-only workspace still comes down',
    store.state.workspaces.some(w => w.id === 'ws-remote'));
  check('a setting the user did NOT touch takes the synced (remote) value',
    store.state.settings.fontSize === 'large', String(store.state.settings.fontSize));

  // Re-applying the same result must converge, not accumulate.
  const again = createStore({ ...store.state });
  applySyncedData(remote, again.setters, store.state.settings);
  check('applying the same sync result twice does not duplicate rows',
    ids(live(again.state.bookmarks)).join(',') === ids(live(store.state.bookmarks)).join(',')
    && ids(again.state.folders).join(',') === ids(store.state.folders).join(','),
    `${ids(live(again.state.bookmarks)).join(',')} | ${ids(again.state.folders).join(',')}`);
  check('the mid-sync bookmark is still there after a second pass',
    live(again.state.bookmarks).some(b => b.id === 'bm-added-mid-sync'));
}

// ---------------------------------------------------------------------------
// 2. The merge the apply step runs, on its own (tombstone precedence intact).
// ---------------------------------------------------------------------------
{
  // A delete the user made before the sync started still beats the stale live
  // copy that comes back down, and the tombstone rides along for the next push.
  const merged = remergeSyncedCollection('bookmarks', [
    { ...bookmark('bm-1', 'https://example.com/docs', NOW - 10 * DAY), deletedAt: NOW - DAY },
    bookmark('bm-keep', 'https://example.com/keep', NOW - 10 * DAY)
  ], [
    bookmark('bm-1', 'https://example.com/docs', NOW - 10 * DAY),
    bookmark('bm-remote', 'https://example.com/remote', NOW - 10 * DAY)
  ], NOW);

  check('re-merge keeps the pre-sync delete applied',
    !live(merged).some(b => b.id === 'bm-1'), ids(live(merged)).join(','));
  check('re-merge retains the tombstone for the next push',
    merged.some(b => b.id === 'bm-1' && isTombstonedRow(b)));
  check('re-merge keeps the unrelated local row and adds the remote one',
    live(merged).some(b => b.id === 'bm-keep') && live(merged).some(b => b.id === 'bm-remote'),
    ids(live(merged)).join(','));
  check('re-merge is the same union the sync itself performs (one policy)',
    merged.length === remergeSyncedCollection('bookmarks', merged, merged, NOW).length);
}

// ---------------------------------------------------------------------------
// 3. History: union, newest first, bounded by the cap the sync uses.
// ---------------------------------------------------------------------------
{
  const local = Array.from({ length: 400 }, (_, i) => visit(`local-${i}`, NOW - i * 1000));
  const synced = Array.from({ length: 400 }, (_, i) => visit(`remote-${i}`, NOW - (500 + i) * 1000));
  const merged = mergeSyncedHistory(local, synced);
  check('history from both sides is kept up to the cap',
    merged.length === MAX_SYNCED_HISTORY, String(merged.length));
  check('history is newest-first',
    merged.every((h, i) => i === 0 || merged[i - 1].timestamp >= h.timestamp));
  check('the newest entry is the newest local visit',
    merged[0].id === 'local-0', merged[0].id);
  check('a re-merge never grows the log past what a sync produces',
    mergeSyncedHistory(merged, merged).length === MAX_SYNCED_HISTORY);
  check('history rows that are not objects are ignored rather than throwing',
    mergeSyncedHistory([null as any, visit('ok', NOW)], [undefined as any]).length === 1);
}

// ---------------------------------------------------------------------------
// 4. Settings: merged per field, so an untouched field still tracks the cloud.
// ---------------------------------------------------------------------------
{
  const snapshot = { theme: 'dark', fontSize: 'medium', doNotTrack: false } as UserSettings;
  const synced = { theme: 'dark', fontSize: 'large', doNotTrack: true } as Partial<UserSettings>;
  const current = { theme: 'light', fontSize: 'medium', doNotTrack: false, searchEngine: 'brave' } as UserSettings;
  const merged = mergeSyncedSettings(current, synced, snapshot);

  check('a field changed since the push keeps the user value', merged.theme === 'light', String(merged.theme));
  check('a field untouched since the push takes the synced value', merged.fontSize === 'large');
  check('every other synced field is applied', merged.doNotTrack === true);
  check('a field the sync never mentioned is left alone', merged.searchEngine === 'brave');
  check('merging does not mutate the current object', (current as any).fontSize === 'medium');
  check('a field the local side does not have yet is adopted',
    (mergeSyncedSettings({} as UserSettings, { theme: 'system' } as Partial<UserSettings>, {} as UserSettings) as any).theme === 'system');
}

// ---------------------------------------------------------------------------
// 5. A row without a url must not wedge sync.
// ---------------------------------------------------------------------------
{
  // The reported wedge: `normalizeBookmarkUrl` dereferenced the very value it had
  // failed to parse, so a single row with no `url` threw a TypeError on every
  // sync — before the push, and therefore forever.
  let threw: unknown = null;
  try {
    normalizeBookmarkUrl(undefined as unknown as string);
  } catch (err) { threw = err; }
  check('normalizeBookmarkUrl is total: a missing url does not throw', threw === null, String(threw));

  for (const bad of [null, 42, {}, [], true, '']) {
    let value: string | null = null;
    let failed = false;
    try { value = normalizeBookmarkUrl(bad as unknown as string); } catch { failed = true; }
    check(`normalizeBookmarkUrl(${JSON.stringify(bad)}) yields no secondary key instead of throwing`,
      !failed && value === '', `${failed ? 'threw' : JSON.stringify(value)}`);
  }
  check('a real url still normalizes exactly as before',
    normalizeBookmarkUrl('https://Example.com/Path/') === 'https://example.com/path',
    normalizeBookmarkUrl('https://Example.com/Path/'));

  // The production entry point, with the alias key the sync service really uses.
  // The row is missing the `url` FIELD entirely — a legacy row or a hand-edited
  // store, which is what the wedge was reported against.
  const urlLessRow = { id: 'bm-nourl', title: 'Legacy row', timestamp: NOW } as Bookmark;
  let collections = null as any;
  let mergeThrew: unknown = null;
  try {
    collections = mergeSyncedCollections(
      { bookmarks: [urlLessRow, bookmark('bm-url', 'https://x.example/', NOW)], folders: [], workspaces: [] },
      { bookmarks: [bookmark('bm-remote', 'https://remote.example/', NOW)] },
      { syncBookmarks: true, syncWorkspaces: true },
      NOW
    );
  } catch (err) { mergeThrew = err; }
  check('mergeSyncedCollections survives a row with no url field', mergeThrew === null, String(mergeThrew));
  check('the row with no url is kept, not lost with the crash',
    live(collections?.bookmarks ?? []).some((b: Bookmark) => b.id === 'bm-nourl'),
    ids(live(collections?.bookmarks ?? [])).join(','));
  check('the rest of the collection is merged normally',
    live(collections?.bookmarks ?? []).some((b: Bookmark) => b.id === 'bm-url')
    && live(collections?.bookmarks ?? []).some((b: Bookmark) => b.id === 'bm-remote'));

  // Two rows without a url used to collide on the empty key, so the second was
  // silently dropped.
  const noUrls = mergeSyncedCollection(
    [{ id: 'a', title: 'A', timestamp: NOW }, { id: 'b', title: 'B', timestamp: NOW }] as Bookmark[],
    [] as Bookmark[],
    { keyOf: (b: Bookmark) => b.id, aliasKeyOf: (b: Bookmark) => normalizeBookmarkUrl(b.url), now: NOW }
  );
  check('rows with no url are keyed by id, so neither is lost', noUrls.length === 2, ids(noUrls).join(','));

  // The tombstone path must survive a url-less delete too. The stale copy is
  // dated BEFORE the delete, which is what a device that has not synced since
  // holds — otherwise last-write-wins would legitimately keep it.
  const tombstoneWithoutUrl = mergeSyncedCollection(
    [{ ...{ id: 'x', title: 'X', timestamp: NOW - 10 * DAY }, deletedAt: NOW - DAY }] as Bookmark[],
    [{ id: 'x', title: 'X', timestamp: NOW - 10 * DAY }] as Bookmark[],
    { keyOf: (b: Bookmark) => b.id, aliasKeyOf: (b: Bookmark) => normalizeBookmarkUrl(b.url), now: NOW }
  );
  check('a url-less delete still suppresses its stale row',
    !live(tombstoneWithoutUrl).some(b => b.id === 'x') && tombstoneWithoutUrl.some(b => isTombstonedRow(b)),
    JSON.stringify(tombstoneWithoutUrl));
}

// ---------------------------------------------------------------------------
// 6. Rows with no usable id must be refused, not silently collided away.
// ---------------------------------------------------------------------------
{
  // Legacy rows written before `id` existed: `keyOf` returns undefined for both,
  // so they shared one map key and all but the first were discarded from the
  // survivors — and therefore from the pushed vault, silently and permanently.
  let survivors: any[] = [];
  const warnings = captureConsole('warn', () => {
    survivors = mergeSyncedCollection([{ name: 'A' }, { name: 'B' }] as any, [] as any, { keyOf: (r: any) => r.id, now: NOW });
  });
  check('two rows with no id do not collapse into one', survivors.length === 0, String(survivors.length));
  check('the refused count is surfaced, not silent',
    warnings.some(line => /Refused 2 synced row/.test(line)), warnings.join(' | '));

  const mixed = captureConsole('warn', () => {
    const merged = mergeSyncedCollection(
      [{ id: 'good', timestamp: NOW }, { name: 'no-id' }, null, 'nope', 7, { id: '' }] as any,
      [{ id: 'good-remote' }] as any,
      { keyOf: (r: any) => r.id, now: NOW }
    );
    check('valid rows are still merged — the refusal is not over-broad',
      ids(merged).sort().join(',') === 'good,good-remote', ids(merged).join(','));
    check('a row with an empty-string id is refused too', !merged.some((r: any) => r.id === ''));
  });

  check('the refusal reports every unusable row it saw',
    mixed.some(line => /Refused 5 synced row/.test(line)), mixed.join(' | '));

  // A tombstone with no id cannot suppress anything, so it must not masquerade
  // as a live row either.
  const keylessTombstone = captureConsole('warn', () => {
    const merged = mergeSyncedCollection([{ name: 'A', deletedAt: NOW - DAY }] as any, [] as any, { keyOf: (r: any) => r.id, now: NOW });
    check('a tombstone with no id is refused, not pushed as an unblockable delete', merged.length === 0);
  });
  check('the keyless tombstone refusal is reported',
    keylessTombstone.some(line => /Refused 1 synced row/.test(line)), keylessTombstone.join(' | '));
}

console.log(`\n${passed} sync-remerge checks passed\n`);
