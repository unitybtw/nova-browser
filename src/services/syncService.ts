/**
 * Nova Browser Cloud Sync & Account Service
 *
 * Supabase-backed E2EE sync vault: data is stored as a version-2 envelope
 * (AES-GCM-256, PBKDF2-SHA256 600k iterations — see syncCrypto.ts). The E2EE
 * secret is a dedicated sync key derived from the account password (min 12
 * chars) via PBKDF2-SHA256 @ 600k with a per-account random salt; the
 * raw password is never persisted or used as the long-lived key. The derived
 * key is kept in memory and persisted only in the OS-keychain-backed secure
 * store, scoped per user id.
 *
 * Local (zero-config) account passwords are stored as salted PBKDF2-SHA256
 * hashes (600k iterations) and compared in constant time.
 *
 * Cloud sync requires a Supabase-linked (UUID) account; local fallback
 * accounts cannot sync. Legacy sync-chain/pairing APIs are deprecated (throw).
 */

import { Bookmark, Folder, Tab, Workspace, HistoryItem, UserSettings, SavedPassword, defaultSettings } from '../types/browser';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured, hasElectronSecureStore, SUPABASE_AUTH_STORAGE_KEY } from './supabaseClient';
import { base64ToBytes, bytesToBase64, decryptSyncPayload, deriveKey as deriveSyncCryptoKey, encryptSyncPayload, EncryptedSyncEnvelope } from './syncCrypto';
import { generateId } from '../utils/idGenerator';
import { normalizeSyncCode, formatSyncCode } from '../utils/syncCodeUtils';
import { logger } from '../utils/logger';
import { getElectronAPI, type ElectronAPI } from '../utils/electronBridge';

export interface NovaUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  lastLoginAt: number;
  syncPreferences: SyncPreferences;
  syncCode?: string | null;
}

export interface SyncPreferences {
  syncBookmarks: boolean;
  syncHistory: boolean;
  syncPasswords: boolean;
  syncSettings: boolean;
  syncWorkspaces: boolean;
}

export interface SyncStatus {
  isLoggedIn: boolean;
  user: NovaUser | null;
  lastSyncedAt: number | null;
  isSyncing: boolean;
  syncError: string | null;
  backend: 'supabase' | 'nova_cloud';
  syncCode?: string | null;
  itemsSynced: {
    bookmarks: number;
    history: number;
    passwords: number;
    workspaces: number;
  };
}

export interface SyncDataBundle {
  version: number;
  timestamp: number;
  userId: string;
  bookmarks?: Bookmark[];
  folders?: Folder[];
  /** Carries tombstones for cleared visits — they are never merged into a live log. */
  history?: TombstoneRow<HistoryItem>[];
  passwords?: SavedPassword[];
  encryptedPasswords?: string;
  passwordsSalt?: string;
  passwordsIv?: string;
  settings?: Partial<UserSettings>;
  settingsTimestamps?: Record<string, number>;
  workspaces?: Workspace[];
}

/**
 * Entry of the local (zero-config) account registry persisted in
 * localStorage 'nova_accounts_registry'. `syncKeySalt` is absent on accounts
 * registered before the migration.
 */
interface LocalRegistryEntry {
  user: NovaUser;
  passwordHash: string;
  syncKeySalt?: string;
}

const STORAGE_KEYS = {
  USER: 'nova_auth_user',
  TOKEN: 'nova_auth_token',
  SYNC_STATUS: 'nova_sync_status',
  CLOUD_VAULT_PREFIX: 'nova_cloud_vault_',
  USER_REGISTRY: 'nova_accounts_registry',
  SYNC_CHAIN_REGISTRY: 'nova_sync_chain_registry',
  MASTER_KEY: 'nova_e2ee_master_key'
};

// Key used in the Electron main-process secure store (safeStorage-encrypted).
// The E2EE sync key is never persisted in Web Storage. Entries are scoped
// per user id (see masterKeyStoreName) so one account's key can never be
// restored for another; this constant is the legacy/global fallback name.
const SECURE_STORE_MASTER_KEY = 'sync_master_key';

// Migration shim: secure-store entry that holds the pre-hardening value (the
// RAW ACCOUNT PASSWORD) after an account is migrated to a dedicated derived
// sync key. It is kept only so envelopes still encrypted under the raw
// password remain decryptable until the next successful sync re-encrypts
// them, then it is wiped.
const SECURE_STORE_LEGACY_MASTER_KEY_PREFIX = 'sync_master_key_legacy_';

// Format marker for the dedicated sync key stored in the secure store:
//   nk2$<saltB64>$<keyB64>
// The whole string doubles as the in-memory E2EE passphrase handed to
// syncCrypto (well above its 12-char minimum).
const SYNC_KEY_FORMAT_PREFIX = 'nk2$';

// Local-account password hash format: pbkdf2$<iterations>$<saltB64>$<hashB64>
// (replaces the old unsalted SHA-256(password + ':' + email) hex digest.)
const PASSWORD_HASH_FORMAT = 'pbkdf2';
const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_HASH_BYTES = 32;

/** Hard ceiling for one full sync round-trip against Supabase. */
const SYNC_RUN_TIMEOUT_MS = 60_000;

/**
 * Upper bounds on how many items of each collection a single synced vault
 * envelope may carry.
 *
 * The merge below never drops a row outright: deletions are carried as
 * tombstone rows until TOMBSTONE_RETENTION_MS purges them, so a collection can
 * only shrink in retention-sized steps. Without a cap the vault grows
 * monotonically and can never shrink. Once the encrypted envelope passes what
 * the backend accepts — or the 10MB `store-set` ceiling in the main process —
 * the *read* half fails first, `remoteUnusable` is set, and the push is
 * aborted "to protect your data". That is a permanent, self-inflicted
 * dead end: the vault can no longer be written, so it can never be trimmed
 * back down either. Capping at assembly time keeps the envelope writable.
 *
 * The values are deliberately far above any real usage (a few thousand
 * bookmarks, a couple of hundred workspaces) so they act purely as a growth
 * guard, not as a quota. They bound the *pushed* envelope only: the merged set
 * is still returned to the caller in `mergedData`, so local data beyond a cap
 * is never truncated out of the user's own store.
 *
 * Union order is local-first, so the entries that survive a cap are the ones
 * already on the device doing the push.
 */
const MAX_SYNCED_BOOKMARKS = 5_000;
const MAX_SYNCED_FOLDERS = 1_000;
/**
 * Ceiling on tombstones in one push.
 *
 * Without it the live cap above is meaningless for the payload size: the cap
 * bounds live rows but tombstones rode along unbounded, so clearing 5 000
 * bookmarks produced 5 000 tombstone rows — each still carrying the full row,
 * because the content is what lets a tombstone suppress a same-URL bookmark
 * minted with a different id on another device — and that payload was re-pushed
 * on every sync for the whole 30-day retention window.
 *
 * The newest are kept: a fresh tombstone is the one a not-yet-synced device is
 * most likely to need, and an old one has already been offered to every device
 * for the longest time. The dropped ones are exactly the ones closest to the
 * retention purge, so what is lost is the smallest possible amount of
 * suppression for the shortest possible time.
 */
const MAX_TOMBSTONES_PER_PUSH = 2_000;
/**
 * Exported because the post-sync re-merge has to apply the same bound: a log
 * that grew past it would stop matching what the vault carries, so the two would
 * disagree about which entries exist.
 */
export const MAX_SYNCED_HISTORY = 300;
const MAX_SYNCED_PASSWORDS = 2_000;
const MAX_SYNCED_WORSPACES = 200;

/**
 * Schema version of the encrypted vault payload.
 *
 * v3 = per-row `deletedAt` soft deletes (tombstones) on every id-keyed synced
 * collection. v4 = the same mechanism extended to the last two synced
 * collections, history and saved passwords, whose delete sites drop the row
 * instead of stamping it, so their tombstones are minted at sync time from the
 * device's push index and only ever travel in the payload. Still a forward-only
 * migration: an older bundle is accepted verbatim, because `deletedAt` is
 * optional and a row without it means "live" — exactly how every row written
 * before v3 behaved. `migrateSyncBundle()` performs that forward step (a version
 * stamp, no data rewrite), so upgrading users keep their vault and no row is
 * reinterpreted as deleted.
 */
export const SYNC_BUNDLE_VERSION = 4;

/**
 * How long a tombstone is kept before it is purged, on every sync.
 *
 * The window has to outlive the longest plausible gap between a delete on one
 * device and the next sync of the others; 30 days is comfortably longer than
 * the sync interval and than a typical "I forgot about this old laptop"
 * absence. Purging is safe precisely because the window is that long: every
 * device that comes back within it receives the delete, and one that stays
 * offline longer than the window has already missed far more than a single
 * deletion. The trade-off is bounded (unlike a never-purged table) — see
 * `mergeSyncedCollection()`.
 */
export const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Forward-only migration of a decrypted remote bundle to the current schema.
 * Idempotent, and a no-op for data: tombstones are opt-in per row, so a legacy
 * bundle needs no rewrite beyond the version stamp.
 */
export function migrateSyncBundle(bundle: SyncDataBundle | null | undefined): SyncDataBundle | null {
  if (!bundle) return bundle ?? null;
  if (bundle.version === SYNC_BUNDLE_VERSION) return bundle;
  return { ...bundle, version: SYNC_BUNDLE_VERSION };
}

/** Wall-clock time a row was deleted, or null when the row is live. */
export function tombstoneTimestamp(row: unknown): number | null {
  const value = (row as { deletedAt?: unknown } | null)?.deletedAt;
  // Anything that is not a positive finite number (absent, null, a string from
  // a hand-edited store) reads as "live", which is the safe default: it is what
  // every pre-v3 row means, and it never hides a row from the user.
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/** True while a row is a tombstone, i.e. deleted but not yet purged. */
export function isTombstonedRow(row: unknown): boolean {
  return tombstoneTimestamp(row) !== null;
}

/**
 * Last-write stamp of a row, used to decide whether an incoming copy predates
 * a local delete. Only collections whose rows carry a creation timestamp can be
 * compared precisely; a row without one (folders, workspaces) reports 0 and
 * therefore always loses to a delete. That is the safe direction: an undated
 * copy cannot prove it was written after the delete, and a row id is minted
 * once at creation, so an undated copy is by definition the pre-delete one.
 */
export function rowVersion(row: unknown): number {
  const stamp = (row as { timestamp?: unknown } | null)?.timestamp;
  return typeof stamp === 'number' && Number.isFinite(stamp) ? stamp : 0;
}

/**
 * Canonical bookmark URL used as the collection's secondary key. Bookmarked
 * pages dedupe by URL rather than id (two devices bookmarking the same page
 * mint different ids), so the same normalization has to be used by the merge
 * and by the tombstone that must suppress such a row.
 *
 * Total by contract. This runs unguarded on EVERY row of every collection on
 * every sync, and a row without a `url` is accepted by the store (a legacy row,
 * a hand-edited localStorage, a vault written by an older build) — so a throw
 * here aborted the sync before the push, and since nothing had been uploaded
 * the next sync hit the same row and failed identically: sync wedged for good,
 * with no clue which row did it. Such a row simply has no secondary key; the
 * merge keys it by id instead.
 */
export function normalizeBookmarkUrl(url: unknown): string {
  if (typeof url !== 'string' || url.length === 0) return '';
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      parsed.pathname = path.slice(0, -1);
    }
    return parsed.href.toLowerCase();
  } catch {
    return (url.length > 1 && url.endsWith('/') ? url.slice(0, -1) : url).toLowerCase();
  }
}

export interface TombstoneMergeOptions<T> {
  /** Stable row identity (the row id). */
  keyOf: (row: T) => string;
  /**
   * Secondary identity for rows two devices may have created independently.
   * A tombstone claims it as well, so deleting a page on device A also
   * suppresses the same page on device B even though B minted its own id.
   */
  aliasKeyOf?: (row: T) => string | null;
  /** Clock used to expire tombstones past the retention window. */
  now: number;
  /**
   * What happens when two LIVE rows claim the same key. A key is not
   * necessarily unique data — two devices bookmarking the same page collapse
   * into one row by design — but for a collection whose key is coarser than
   * the row it identifies (saved passwords are keyed by host+user, which two
   * entries differing only by port or scheme share) a collision means one of
   * them is lost. `keep-first` (the default) preserves the union semantics the
   * id-keyed collections have always had; `keep-newer` makes the survivor
   * deterministic and last-write-wins on `rowVersion` instead of position.
   * Either way the count is logged: a row that is not carried is never silent.
   */
  collision?: 'keep-first' | 'keep-newer';
}

/**
 * A row can only take part in a union merge if it can be keyed at all: a
 * readable object and a non-empty string identity. Anything else used to be
 * admitted under an `undefined` map key, where every such row collided with the
 * first one and was discarded from the survivors — and therefore also excluded
 * from the pushed vault. That is silent, permanent loss written to the vault, so
 * the row is refused up front and the count is reported.
 *
 * `keyOf` is only reached for an object: callers read a field off the row, so
 * asking it about a `null` entry would throw inside the merge instead of
 * refusing the row.
 */
function isObjectRow(row: unknown): row is Record<string, unknown> {
  return row !== null && typeof row === 'object';
}

function isUsableKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0;
}

/**
 * Union merge for an id-keyed synced collection, tombstone-aware.
 *
 * Rules, in order of precedence:
 *
 * 1. A row that cannot be keyed (no object, no non-empty string identity) is
 *    refused and counted; it is not part of the union in either direction.
 * 2. A row with `deletedAt` is a tombstone: it never appears among the live
 *    rows, but it IS returned so the caller keeps pushing it until every device
 *    has seen it and the retention window purges it.
 * 3. A live row is dropped when a tombstone claims one of its keys with
 *    `deletedAt >= rowVersion(row)`. This is the rule that stops a device which
 *    has not synced since the delete from resurrecting the row: the copy it
 *    uploads was necessarily written before the delete it never saw, so the
 *    comparison has to be row-version vs delete-time (bundle-level timestamps
 *    cannot work here — a device that pushes *after* the delete while still
 *    holding the old row would carry a newer bundle timestamp and win).
 * 4. Two tombstones for the same key merge last-write-wins on `deletedAt`, so
 *    a delete stays suppressed for a full retention window measured from the
 *    most recent delete. A tombstone a newer live row beats on any of the keys
 *    it claims is obsolete and is dropped, so a delete that lost last-write-wins
 *    does not sit in the payload pretending to be current. Identical tombstones
 *    arriving from both sides collapse to one.
 * 5. Live rows keep the previous union behaviour: local first, first key wins.
 *    A second live row that claims a key already taken is a COLLISION rather
 *    than a union member. With `collision: 'keep-first'` the key is the row's
 *    identity, so the overlap is the union working as before; with
 *    `collision: 'keep-newer'` the key is coarser than the row, the merge has to
 *    choose which copy the user keeps, and the count is reported.
 * 6. Tombstones older than TOMBSTONE_RETENTION_MS are ignored entirely — they
 *    no longer suppress anything, which is what keeps the table bounded.
 */
export function mergeSyncedCollection<T>(local: T[], remote: T[], options: TombstoneMergeOptions<T>): T[] {
  const { keyOf, aliasKeyOf, now, collision = 'keep-first' } = options;

  const keysOf = (row: T): string[] => {
    const keys = [keyOf(row)];
    const alias = aliasKeyOf?.(row);
    if (alias && alias !== keys[0]) keys.push(alias);
    return keys;
  };

  const deletedAt = new Map<string, number>();
  const tombstones: T[] = [];
  const live = new Map<string, T>();
  let unkeyed = 0;
  let collided = 0;

  for (const row of [...local, ...remote]) {
    // keyOf is only reached for an object: callers read a field off the row, so
    // asking it about a `null` entry would throw inside the merge.
    const primary = isObjectRow(row) ? keyOf(row) : null;
    if (!isUsableKey(primary)) {
      unkeyed++;
      continue;
    }
    const deletedAtValue = tombstoneTimestamp(row);
    if (deletedAtValue !== null) {
      if (now - deletedAtValue >= TOMBSTONE_RETENTION_MS) continue; // purged
      if (!tombstones.includes(row)) tombstones.push(row);
      for (const key of keysOf(row)) {
        deletedAt.set(key, Math.max(deletedAt.get(key) ?? 0, deletedAtValue));
      }
      continue;
    }
    const alias = aliasKeyOf?.(row);
    // Dedupe by the secondary identity when the row HAS one, by id alone when
    // it does not: an absent alias is not an empty alias, and using the empty
    // string as a map key collapses every row without a secondary identity onto
    // whichever one was seen first.
    const dedupeKey = isUsableKey(alias) && alias !== primary ? alias : primary;
    const held = live.get(dedupeKey);
    if (held === undefined) {
      live.set(dedupeKey, row);
      continue;
    }
    if (collision !== 'keep-newer') continue;
    // `keep-first` is the union: the key IS the row's identity, so meeting the
    // same row on both sides is the normal case and the local copy winning is
    // what the union has always meant. `keep-newer` is a content decision — the
    // key is coarser than the row, so the merge has to choose WHICH of the two
    // the user keeps — and that decision is counted and reported.
    collided++;
    if (rowVersion(row) > rowVersion(held)) live.set(dedupeKey, row);
  }

  if (unkeyed > 0) {
    logger.warn(
      'SyncService:mergeSyncedCollection',
      `Refused ${unkeyed} synced row(s) with no usable id — they are in neither the merged set nor the pushed vault.`
    );
  }
  if (collided > 0) {
    logger.warn(
      'SyncService:mergeSyncedCollection',
      `${collided} synced row(s) claimed a key already taken by a different row; kept the newest copy, the other(s) are not carried.`
    );
  }

  const survivors: T[] = [];
  for (const row of live.values()) {
    // Only a key that is actually claimed by a tombstone can block. Treating
    // "no claim" as 0 would compare 0 >= rowVersion() and drop every undated
    // row in the collection (folders, workspaces carry no timestamp).
    const blocked = keysOf(row).some(key => {
      const claimedAt = deletedAt.get(key);
      return claimedAt !== undefined && claimedAt >= rowVersion(row);
    });
    if (!blocked) survivors.push(row);
  }

  // Tombstone collapse: a tombstone is kept only for the keys it still wins.
  // `claimed` is what stops the payload doubling on every sync — the same delete
  // comes back from the vault as a structurally identical but *distinct* object
  // (it was serialized and re-encrypted in between), so identity dedupe is not
  // enough and the keys themselves have to be tracked.
  //
  // The newest version each key reaches among the SURVIVORS is collected first:
  // a tombstone is obsolete only when a surviving row that actually claims one
  // of its keys is newer than the delete. Comparing the delete against every
  // survivor's version instead would let an unrelated row — a bookmark added
  // anywhere in the collection after the delete — retire a delivered deletion,
  // and the other devices would resurrect the row the moment the tombstone left
  // the payload.
  const survivorVersionByKey = new Map<string, number>();
  for (const row of survivors) {
    for (const key of keysOf(row)) {
      const version = rowVersion(row);
      if (version > (survivorVersionByKey.get(key) ?? 0)) survivorVersionByKey.set(key, version);
    }
  }
  const claimed = new Set<string>();
  const retained: T[] = [];
  for (const tombstone of tombstones) {
    const at = tombstoneTimestamp(tombstone)!;
    const fresh = keysOf(tombstone).filter(key => !claimed.has(key));
    if (fresh.length === 0) continue;                        // same delete, already carried
    if (fresh.some(key => deletedAt.get(key) !== at)) continue; // a newer delete owns these keys
    if (fresh.some(key => (survivorVersionByKey.get(key) ?? 0) > at)) continue; // beaten by a live row
    for (const key of fresh) claimed.add(key);
    retained.push(tombstone);
  }

  return [...survivors, ...retained];
}

/**
 * Drops tombstones past the retention window, so the rows leave the local store
 * and not just the payload. mergeSyncedCollection() applies the same rule
 * inline; this is the path for a collection with no remote counterpart (first
 * sync, or its sync pref is off), where a device would otherwise keep its own
 * tombstones forever.
 */
export function purgeExpiredTombstones<T>(rows: T[], now: number): T[] {
  return rows.filter(row => {
    const deletedAtValue = tombstoneTimestamp(row);
    return deletedAtValue === null || now - deletedAtValue < TOMBSTONE_RETENTION_MS;
  });
}

/**
 * Applies a collection's push cap without letting tombstones crowd live rows
 * out of the envelope: the cap bounds the live set exactly as before (union
 * order is local-first, so the rows that survive are the pushing device's) and
 * the surviving tombstones ride along after it.
 *
 * `keyOf` is the collection's own key extractor, used only to break a tie
 * between tombstones that share a `deletedAt` (see below). It is a parameter
 * because the id/url probe below is meaningless for a collection keyed by
 * something else — a saved-password row has no `id`.
 */
export function capSyncedCollection<T>(
  rows: T[],
  liveCap: number,
  tombstoneCap = MAX_TOMBSTONES_PER_PUSH,
  keyOf?: (row: T) => string
): T[] {
  const live: T[] = [];
  const tombstones: T[] = [];
  for (const row of rows) {
    if (isTombstonedRow(row)) tombstones.push(row);
    else live.push(row);
  }
  // Newest first, and ties broken by something derived from the ROW rather than
  // from its position: a mass delete stamps Date.now() once, so a whole burst
  // shares one deletedAt, and then the sort key cannot order them. Breaking that
  // tie by array index looks stable but is not — two devices hold the same
  // tombstones in whatever order they merged them, so an index tiebreak makes
  // them truncate to DIFFERENT sets and a delete silently dies on one of them.
  const tiebreakKey = (row: T): string => {
    const keyed = keyOf?.(row);
    if (typeof keyed === 'string' && keyed) return keyed;
    const id = (row as any)?.id;
    if (typeof id === 'string' && id) return id;
    const url = (row as any)?.url;
    if (typeof url === 'string' && url) return url;
    return '';
  };
  const newestFirst = tombstones
    .slice()
    .sort((a, b) => {
      const delta = (tombstoneTimestamp(b) ?? 0) - (tombstoneTimestamp(a) ?? 0);
      if (delta !== 0) return delta;
      const keys = tiebreakKey(a).localeCompare(tiebreakKey(b));
      return keys !== 0 ? keys : 0;
    })
    .slice(0, tombstoneCap);
  return [...live.slice(0, liveCap), ...newestFirst];
}

/**
 * A synced row that may carry the soft-delete marker.
 *
 * `HistoryItem` and `SavedPassword` do not declare `deletedAt`: their delete
 * sites (Clear browsing history, the password list's trash button) drop the row
 * from the store rather than stamping it, so there is no moment at which the
 * store holds a tombstone for them. Their tombstones are minted at sync time
 * from `deletionTombstones()` below and only ever live in the encrypted
 * payload, never in the local store or the UI — hence the extended type.
 */
export type TombstoneRow<T> = T & { deletedAt?: number | null };

/** The collections whose deletions propagate, i.e. every synced collection. */
export interface TombstoneAwareCollections {
  bookmarks: Bookmark[];
  folders: Folder[];
  workspaces: Workspace[];
  /**
   * Optional because their delete sites drop rows instead of stamping them, so
   * only a sync that has deletion evidence for them (a recorded push index)
   * passes them in. Absent ⇒ the collection is not part of this merge.
   */
  history?: TombstoneRow<HistoryItem>[];
  passwords?: TombstoneRow<SavedPassword>[];
}

/**
 * `TombstoneAwareCollections` with every collection required — the shape the
 * keying map is built from. It has to be this and not the interface itself: a
 * mapped type over `keyof T` keeps the optionality of T's members, so keying one
 * straight off the interface would make every `keyOf` optional.
 */
type KeyedCollections = Required<TombstoneAwareCollections>;

/** The row type of one synced collection. */
type SyncedCollectionRow<K extends keyof KeyedCollections> = KeyedCollections[K][number];

/**
 * Drop the tombstones from a merged collection, keeping the row order.
 *
 * The merge returns live rows followed by tombstones on purpose: the tombstones
 * have to be pushed so the deletion reaches the other devices, but they are
 * delete markers, not data. Anything that leaves the sync as a *live* collection
 * (the caller's local store, the secure store, the UI) is this list, so a
 * tombstone can never be rendered, autofilled or re-read as a real row.
 */
export function liveRowsOnly<T>(rows: T[]): T[] {
  return rows.filter(row => !isTombstonedRow(row));
}

/** The key of a saved-password row; the separator cannot occur in a host or a user name. */
const PASSWORD_KEY_SEPARATOR = ' ';

/**
 * Stable identity of a saved password.
 *
 * Host + user name, the pair the password manager itself matches on. The
 * separator is a space rather than the previous '_' so a host or a user name
 * containing an underscore cannot make two different credentials produce the
 * same key — '_' is legal in both and silently collapsed them. The host is
 * case-folded because it comes from `new URL().hostname`, which is already
 * lower-case; the user name keeps its case because the app treats `Bob` and
 * `bob` as different accounts.
 *
 * The key is still COARSER than the credential: two entries for the same host
 * and user name on different ports or schemes are indistinguishable, because
 * `SavedPassword` carries no port or scheme to tell them apart. That is why the
 * passwords collection merges with `collision: 'keep-newer'` and logs the
 * count, instead of dropping one of them the way a map key collision did.
 */
export function passwordRowKey(row: SavedPassword): string {
  const host = String(row?.hostname ?? '').trim().toLowerCase();
  const user = String(row?.username ?? '').trim();
  return `${host}${PASSWORD_KEY_SEPARATOR}${user}`;
}

/**
 * How each synced collection is keyed, defined ONCE.
 *
 * Both the sync merge and the post-sync re-merge (below) read it, so a change to
 * a collection's identity — say a new secondary key — cannot be applied to the
 * path that runs during a sync and forgotten on the path that runs after one,
 * which would quietly reintroduce the exact duplication/resurrection the merge
 * exists to prevent.
 */
const SYNCED_COLLECTION_KEYING: {
  [K in keyof KeyedCollections]: Omit<TombstoneMergeOptions<SyncedCollectionRow<K>>, 'now'>
} = {
  bookmarks: {
    keyOf: (b: Bookmark) => b.id,
    // A bookmark is also identified by its URL: ids are minted per device, so a
    // delete on one device has to suppress the same page another device booked
    // under its own id.
    aliasKeyOf: (b: Bookmark) => normalizeBookmarkUrl(b.url)
  },
  folders: { keyOf: (f: Folder) => f.id },
  workspaces: { keyOf: (w: Workspace) => w.id },
  history: {
    // No secondary key: two visits to the same page are two different rows, so
    // the URL cannot identify one. A cleared visit is suppressed by its own id.
    keyOf: (h: TombstoneRow<HistoryItem>) => historyRowKey(h)
  },
  passwords: {
    keyOf: (p: TombstoneRow<SavedPassword>) => passwordRowKey(p),
    // The host+user key is lossy (see passwordRowKey), so a second row claiming
    // it is a real conflict and the newer save wins rather than "whichever was
    // seen first" — a device that changed a password must be able to hand the
    // new one to the other devices.
    collision: 'keep-newer'
  }
};

/** The merge configuration for one collection, with the clock the caller wants. */
function syncedCollectionMergeOptions<K extends keyof KeyedCollections>(
  collection: K,
  now: number
): TombstoneMergeOptions<SyncedCollectionRow<K>> {
  return { ...SYNCED_COLLECTION_KEYING[collection], now };
}

/** The key extractor of one collection, without the merge options around it. */
export function syncedCollectionKey<K extends keyof KeyedCollections>(
  collection: K
): (row: SyncedCollectionRow<K>) => string {
  return SYNCED_COLLECTION_KEYING[collection].keyOf;
}

/**
 * Re-merge a collection after a sync round trip, for callers that hold the
 * collection somewhere other than the service (the credentials blob lives in the
 * secure store, not in React state). Same policy as the in-service merge, so a
 * deletion made during the round trip is not resurrected.
 */
export function remergeSyncedCollectionOf<K extends keyof KeyedCollections>(
  collection: K,
  current: SyncedCollectionRow<K>[],
  synced: SyncedCollectionRow<K>[]
): SyncedCollectionRow<K>[] {
  return mergeSyncedCollection(current, synced, {
    ...SYNCED_COLLECTION_KEYING[collection],
    now: Date.now(),
  });
}

/**
 * Single entry point for the tombstone-aware merges `executeSyncData` runs, so
 * the two-device behaviour is driven by one production function rather than by
 * logic duplicated in a test. A collection with no remote counterpart is only
 * purged, never re-deduped, so this cannot change what a first sync returns.
 */
export function mergeSyncedCollections(
  local: TombstoneAwareCollections,
  remote: Partial<TombstoneAwareCollections> | null | undefined,
  prefs: { syncBookmarks: boolean; syncWorkspaces: boolean; syncHistory?: boolean; syncPasswords?: boolean },
  now: number
): TombstoneAwareCollections {
  return {
    bookmarks: prefs.syncBookmarks && remote?.bookmarks
      ? mergeSyncedCollection(local.bookmarks, remote.bookmarks, syncedCollectionMergeOptions('bookmarks', now))
      : purgeExpiredTombstones(local.bookmarks, now),
    folders: prefs.syncBookmarks && remote?.folders
      ? mergeSyncedCollection(local.folders, remote.folders, syncedCollectionMergeOptions('folders', now))
      : purgeExpiredTombstones(local.folders, now),
    workspaces: prefs.syncWorkspaces && remote?.workspaces
      ? mergeSyncedCollection(local.workspaces, remote.workspaces, syncedCollectionMergeOptions('workspaces', now))
      : purgeExpiredTombstones(local.workspaces, now),
    history: local.history
      ? (prefs.syncHistory && remote?.history
          ? mergeSyncedCollection(local.history, remote.history, syncedCollectionMergeOptions('history', now))
          : purgeExpiredTombstones(local.history, now))
      : local.history,
    passwords: local.passwords
      ? (prefs.syncPasswords && remote?.passwords
          ? mergeSyncedCollection(local.passwords, remote.passwords, syncedCollectionMergeOptions('passwords', now))
          : purgeExpiredTombstones(local.passwords, now))
      : local.passwords
  };
}

/**
 * Fold a completed sync's result back into rows that may have changed while the
 * round-trip was in flight.
 *
 * The merge a sync returns was computed from the rows as they were when the
 * request went out — two PBKDF2 derivations, a read and an upsert sit between
 * that snapshot and the answer — so applying it verbatim reverts anything the
 * user did in the meantime, and since the pushed bundle was built from the same
 * snapshot, that change was never uploaded either. Merging with the CURRENT rows
 * as the local side keeps it: the current rows win for the keys they hold (which
 * is also the order the sync merge itself used, so nothing it decided is undone),
 * while remote-only rows, remote tombstones and retention purges still land.
 */
export function remergeSyncedCollection<K extends keyof KeyedCollections>(
  collection: K,
  current: TombstoneAwareCollections[K],
  synced: TombstoneAwareCollections[K],
  now: number = Date.now()
): TombstoneAwareCollections[K] {
  // The casts only restore the pairing a generic indexed type cannot state: the
  // caller names ONE collection, so both arrays are that collection's row type.
  return mergeSyncedCollection(
    current as SyncedCollectionRow<K>[],
    synced as SyncedCollectionRow<K>[],
    syncedCollectionMergeOptions(collection, now)
  ) as TombstoneAwareCollections[K];
}

/** Stable identity of a history entry; rows from before `id` existed fall back to url+time. */
function historyRowKey(item: HistoryItem): string {
  return item?.id || `${item?.url}_${item?.timestamp}`;
}

/**
 * Union of two history logs: one entry per identity, newest first, bounded by
 * `cap`. Used by the post-sync re-merge in the app, so it produces the same log
 * the sync itself produced instead of one replacing the other.
 *
 * A tombstoned row is dropped rather than unioned: it is a delete marker, not a
 * visit, and this function's result is what lands in the local log and from
 * there in the history UI. History tombstones only ever have to survive in the
 * encrypted payload, which the sync's own merge guarantees.
 */
export function mergeSyncedHistory(
  local: HistoryItem[],
  synced: HistoryItem[],
  cap: number = MAX_SYNCED_HISTORY
): HistoryItem[] {
  const byKey = new Map<string, HistoryItem>();
  for (const item of [...local, ...synced]) {
    if (!item || typeof item !== 'object') continue;
    if (isTombstonedRow(item)) continue;
    const key = historyRowKey(item);
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return Array.from(byKey.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, cap);
}

/**
 * What this device contributed to the vault at its last successful push, per
 * collection: every LIVE row's key mapped to the row version that was pushed.
 *
 * It exists for the two collections whose delete site drops the row instead of
 * stamping it (history, passwords): with no record of what this device once
 * held, a locally missing row is indistinguishable from one this device never
 * had, and a union merge has to treat the second case as "pull it down" — which
 * is exactly why "Clear browsing history" used to be a no-op and why a deleted
 * password came straight back.
 *
 * Tombstones are deliberately NOT indexed: a delete that has been pushed must
 * not be re-minted with a fresh `deletedAt` on every later sync, which would
 * keep the retention window rolling forward forever. The tombstone is already
 * in the vault, and the vault is what carries it to the other devices.
 *
 * The index is written only after a successful push, from the rows the vault
 * then holds. The one thing it cannot see is the caller applying the merged
 * rows to its own state: a tab closed in that window leaves rows the index
 * claims missing locally, and the next sync reads them as deletions. That is
 * the same class of assumption as the tombstone retention window itself, and
 * erring towards "this device deleted it" is the direction the vault already
 * resolves deletions in.
 */
export type PushedRowIndex = Record<string, number>;

/** The collections whose deletions are reconstructed from a push index. */
export const INDEXED_DELETION_COLLECTIONS = ['history', 'passwords'] as const;
export type IndexedDeletionCollection = (typeof INDEXED_DELETION_COLLECTIONS)[number];

/** Per-user storage of the push index, so wiping localStorage also drops the evidence. */
const PUSHED_INDEX_KEY_PREFIX = 'nova_sync_pushed_index_';

export interface DeletionTombstoneOptions<T> {
  keyOf: (row: T) => string;
  /** Rebuilds a tombstone row for a key the index knows about. */
  tombstoneFor: (key: string, deletedAt: number) => T | null;
  /**
   * Keys pushed at a version older than this were dropped by the collection's
   * own row bound rather than by the user, so their absence is not a deletion.
   * 0 disables the exemption (see `evictionFloor`).
   */
  evictedBelow?: number;
}

/**
 * The version below which a row missing from a bounded collection was EVICTED
 * by that bound rather than deleted by the user: the oldest row a full log
 * still keeps.
 *
 * The history log is capped in the app as well as in the payload, so its oldest
 * rows leave on their own as new visits arrive. Without this exemption each of
 * those would read as "the user deleted it" and become a tombstone, deleting
 * the other devices' history rows on a plain browse. A log shorter than its
 * bound has evicted nothing, so it returns 0 and every absent row counts.
 *
 * The one case this cannot tell apart is deleting the single oldest entry of a
 * log that is already at its bound: that is indistinguishable from the entry
 * being evicted, and eviction is the common case, so it is not propagated.
 */
export function evictionFloor<T>(rows: T[], versionOf: (row: T) => number, bound: number): number {
  if (!Number.isFinite(bound) || bound <= 0 || rows.length < bound) return 0;
  let oldest = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const version = versionOf(row);
    if (version > 0 && version < oldest) oldest = version;
  }
  return Number.isFinite(oldest) ? oldest : 0;
}

/**
 * Tombstones for the rows this device pushed and no longer holds.
 *
 * These are ordinary tombstone rows handed to the same `mergeSyncedCollection`
 * the other three collections use: the local side carries them like any other
 * row, they suppress the same stale copies, they ride along in the payload for
 * the other devices and are purged after the same retention window. The only
 * thing specific to these two collections is WHEN the tombstone is minted — the
 * delete site dropped the row, so the deletion is reconstructed here from the
 * push index instead of being read off the store.
 */
export function deletionTombstones<T>(
  local: T[],
  pushed: PushedRowIndex | null | undefined,
  now: number,
  options: DeletionTombstoneOptions<T>
): T[] {
  // No index: nothing is known about what this device held, so nothing may be
  // called deleted (a device that never synced the collection must adopt it).
  if (!pushed) return [];
  const { keyOf, tombstoneFor } = options;
  const evictedBelow = options.evictedBelow ?? 0;

  const present = new Set<string>();
  for (const row of local) {
    if (!isObjectRow(row)) continue;
    const key = keyOf(row);
    if (isUsableKey(key)) present.add(key);
  }

  const tombstones: T[] = [];
  let unreconstructable = 0;
  for (const [key, version] of Object.entries(pushed)) {
    if (present.has(key)) continue;
    if (Number.isFinite(version) && version > 0 && version < evictedBelow) continue; // evicted, not deleted
    const tombstone = tombstoneFor(key, now);
    if (!tombstone) {
      unreconstructable++;
      continue;
    }
    tombstones.push(tombstone);
  }
  if (unreconstructable > 0) {
    logger.warn(
      'SyncService:deletionTombstones',
      `Could not rebuild ${unreconstructable} deleted synced row(s) from the push index — those deletions are not propagated.`
    );
  }
  return tombstones;
}

/** Index every live row of a collection by its key and row version. */
export function indexPushedRows<T>(rows: T[], keyOf: (row: T) => string, versionOf: (row: T) => number): PushedRowIndex {
  const index: PushedRowIndex = {};
  for (const row of rows) {
    if (!isObjectRow(row) || isTombstonedRow(row)) continue;
    const key = keyOf(row);
    if (isUsableKey(key)) index[key] = versionOf(row);
  }
  return index;
}

/** A history tombstone carries the visit's identity and nothing else. */
function historyTombstoneFor(key: string, deletedAt: number): TombstoneRow<HistoryItem> {
  // No url/title and no visit time: the tombstone only has to key the row it
  // suppresses, so a cleared log of 300 visits costs 300 tiny rows instead of
  // 300 full ones, and there is no stale page content left lying in the vault.
  return { id: key, url: '', title: '', timestamp: 0, deletedAt };
}

/**
 * A password tombstone carries the credential's identity and NOTHING else — no
 * password — so a vault whose passwords were all deleted shrinks instead of
 * growing, and no secret travels in a row whose only job is to say "this is
 * gone".
 */
function passwordTombstoneFor(key: string, deletedAt: number): TombstoneRow<SavedPassword> | null {
  const split = key.indexOf(PASSWORD_KEY_SEPARATOR);
  if (split < 0) return null; // an index written by a build that keyed differently
  return {
    hostname: key.slice(0, split),
    username: key.slice(split + 1),
    deletedAt
  };
}

/**
 * The deletion tombstones for every indexed collection, ready to be handed to
 * the local side of the merge. One call so the collections cannot drift apart:
 * they share the detection, the merge, the retention window and the push cap.
 */
export function pendingDeletionTombstones(
  local: { history: HistoryItem[]; passwords: SavedPassword[] },
  pushed: Partial<Record<IndexedDeletionCollection, PushedRowIndex | null>> | null | undefined,
  now: number,
  enabled: { syncHistory: boolean; syncPasswords: boolean }
): { history: TombstoneRow<HistoryItem>[]; passwords: TombstoneRow<SavedPassword>[] } {
  return {
    history: enabled.syncHistory
      ? deletionTombstones(local.history, pushed?.history ?? null, now, {
          keyOf: (h: HistoryItem) => historyRowKey(h),
          tombstoneFor: historyTombstoneFor,
          evictedBelow: evictionFloor(local.history, (h: HistoryItem) => rowVersion(h), MAX_SYNCED_HISTORY)
        })
      : [],
    passwords: enabled.syncPasswords
      ? deletionTombstones(local.passwords, pushed?.passwords ?? null, now, {
          keyOf: (p: SavedPassword) => passwordRowKey(p),
          tombstoneFor: passwordTombstoneFor
        })
      : []
  };
}

/** In-memory pushed indices to prevent storing sensitive password metadata in unencrypted localStorage */
const inMemoryPushedIndices = new Map<string, Partial<Record<IndexedDeletionCollection, PushedRowIndex>>>();

/** Read the per-user push index. Never throws; a damaged record reads as absent. */
export function loadPushedIndex(userId: string): Partial<Record<IndexedDeletionCollection, PushedRowIndex>> | null {
  if (!userId) return null;
  const mem = inMemoryPushedIndices.get(userId);
  if (typeof localStorage === 'undefined') return mem ?? null;
  try {
    const raw = localStorage.getItem(`${PUSHED_INDEX_KEY_PREFIX}${userId}`);
    if (!raw && !mem) return null;
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return mem ?? null;
    const out: Partial<Record<IndexedDeletionCollection, PushedRowIndex>> = { ...mem };
    for (const collection of INDEXED_DELETION_COLLECTIONS) {
      if (collection === 'passwords') {
        if (mem?.passwords) out.passwords = mem.passwords;
        continue;
      }
      const section = (parsed as Record<string, unknown>)[collection];
      if (!section || typeof section !== 'object') continue;
      const index: PushedRowIndex = {};
      for (const [key, version] of Object.entries(section as Record<string, unknown>)) {
        if (typeof version === 'number' && Number.isFinite(version) && version > 0) index[key] = version;
      }
      out[collection] = index;
    }
    return out;
  } catch (e) {
    logger.warn('SyncService:loadPushedIndex', 'Failed to read the sync push index', e);
    return null;
  }
}

/** Persist the push index for the next sync's deletion detection. Best effort. */
export function savePushedIndex(
  userId: string,
  index: Partial<Record<IndexedDeletionCollection, PushedRowIndex>>
): void {
  if (!userId) return;
  inMemoryPushedIndices.set(userId, { ...index });
  if (typeof localStorage === 'undefined') return;
  try {
    // Only persist non-sensitive collections (history) to DOM localStorage.
    // Sensitive credentials index (passwords) is kept strictly memory-resident.
    const nonSensitiveIndex: Partial<Record<IndexedDeletionCollection, PushedRowIndex>> = {};
    if (index.history) {
      nonSensitiveIndex.history = index.history;
    }
    localStorage.setItem(`${PUSHED_INDEX_KEY_PREFIX}${userId}`, JSON.stringify(nonSensitiveIndex));
  } catch (e) {
    // An unavailable or overfull Web Storage costs deletion propagation until
    // the next successful write; it must never fail the sync itself.
    logger.warn('SyncService:savePushedIndex', 'Could not persist the sync push index', e);
  }
}

/**
 * Fold a sync's settings result into the CURRENT settings, per field.
 *
 * `synced` is the per-field LWW merge computed against the settings as they were
 * when the request went out, so a field the user flipped in that window still
 * holds their value in `current` while `synced` carries the older one — spreading
 * `synced` over `current` would silently undo it. `snapshot` is the settings that
 * were actually pushed, and that is what makes "changed since the request went
 * out" decidable without a per-field clock: a field still equal to the snapshot
 * was left alone and takes the synced value, a field that differs was touched and
 * keeps the user's value. Fields the sync says nothing about are left untouched
 * rather than being replaced wholesale.
 */
export function mergeSyncedSettings<T extends object>(
  current: T,
  synced: Partial<T> | null | undefined,
  snapshot: Partial<T> | null | undefined
): T {
  const merged = { ...current } as Record<string, unknown>;
  const pushed = (snapshot ?? {}) as Record<string, unknown>;
  const incoming = (synced ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(incoming)) {
    if (merged[key] === pushed[key]) merged[key] = incoming[key];
  }
  return merged as T;
}

export interface SettingsLwwResult {
  settings: UserSettings;
  /** The timestamp map to persist: the per-field write clock, advanced by the merge. */
  timestamps: Record<string, number>;
}

/**
 * Per-field last-write-wins between the local settings and the vault's.
 *
 * A field is compared by WHEN ITS VALUE WAS WRITTEN, which is why the local
 * stamp must be taken at the user's edit (`stampPersistedSettings`) and not at
 * the last sync: a stamp taken at sync time makes the comparison circular — the
 * local value can only be as new as the sync that last saw it, so an edit the
 * user made after a remote change would always lose, forever, and the setting
 * would be frozen on whichever device synced first. Both sides therefore carry
 * a per-field write clock, and the newer write wins.
 *
 * `timestamps` is returned rather than mutated so the caller decides when to
 * persist it: a sync that loses its write race must not leave the stamps of an
 * attempt whose bundle never reached the vault.
 */
export function mergeSettingsLastWriteWins(
  local: UserSettings,
  remote: Partial<UserSettings> | null | undefined,
  localTimestamps: Record<string, number>,
  remoteTimestamps: Record<string, number> | null | undefined,
  options: { fallbackRemoteTimestamp?: number; now?: number } = {}
): SettingsLwwResult {
  const remoteSettings = (remote ?? {}) as Record<string, unknown>;
  const localSettings = (local ?? {}) as unknown as Record<string, unknown>;
  const stamps = { ...(localTimestamps ?? {}) };
  const remoteStamps = (remoteTimestamps ?? {}) as Record<string, unknown>;
  const fallbackRemoteTs = options.fallbackRemoteTimestamp ?? 0;
  const now = options.now ?? Date.now();
  const merged: Record<string, unknown> = { ...localSettings };

  const allKeys = new Set([...Object.keys(localSettings), ...Object.keys(remoteSettings)]);

  allKeys.forEach(key => {
    const localTs = stamps[key] || 0;
    const remoteTs = (typeof remoteStamps[key] === 'number' ? remoteStamps[key] : fallbackRemoteTs) as number;

    if (key in remoteSettings && (remoteTs > localTs || !(key in localSettings))) {
      merged[key] = remoteSettings[key];
      // The local value IS the remote value now, so it inherits the remote's
      // write clock: this is what lets the next local edit beat it.
      stamps[key] = remoteTs;
    } else if (key in localSettings) {
      merged[key] = localSettings[key];
      // Only a key that was never stamped gets one here. Re-stamping a key that
      // already holds a write clock would claim the value was just written when
      // the user may not have touched it, and turn LWW into "local always wins".
      if (!stamps[key]) stamps[key] = now;
    }
  });

  return { settings: merged as unknown as UserSettings, timestamps: stamps };
}

/**
 * Record that the user's settings were persisted, stamping the per-field write
 * clock for the fields whose value actually changed.
 *
 * This is the fix for the frozen-settings bug and it has to happen at the write:
 * nothing else observes the edit, and a sync cannot tell a user edit from a
 * value it adopted from the vault. Called by the settings persistence path
 * (useSessionPersistence) with the settings as they are about to be written and
 * the settings as they were written last time.
 *
 * Only CHANGED fields are stamped: stamping everything would make a device
 * claim every field on every settings write and never adopt the cloud
 * configuration again (the "newly paired device inherits settings" case).
 */
export function stampPersistedSettings(
  persisted: Partial<UserSettings>,
  previousPersisted: Partial<UserSettings> | null | undefined,
  at: number = Date.now(),
  timestamps: Record<string, number> = {}
): Record<string, number> {
  const next = { ...(timestamps ?? {}) };
  const previous = (previousPersisted ?? {}) as Record<string, unknown>;
  const candidate = (persisted ?? {}) as Record<string, unknown>;
  const validKeys = Object.keys(defaultSettings) as (keyof UserSettings)[];
  for (const key of validKeys) {
    if (!Object.prototype.hasOwnProperty.call(candidate, key)) continue;
    const value = candidate[key];
    // Compared as written, not by reference: `shortcuts` and the other object
    // settings are replaced wholesale on every render, so reference equality
    // would stamp them on every keystroke, while a change deep inside one of
    // them is still a real change of the field.
    if (JSON.stringify(previous[key]) === JSON.stringify(value)) continue;
    next[key] = at;
  }
  return next;
}

/** The localStorage key the settings persistence path writes. */
const PERSISTED_SETTINGS_KEY = 'user_settings';

/** The last settings this process saw persisted; seeds the per-field diff. */
let lastPersistedSettingsSnapshot: Partial<UserSettings> | null = null;

/**
 * Stamp the fields that changed since the last persisted settings snapshot.
 *
 * Order-independent: the first call in a process adopts whatever is already in
 * `user_settings` as the baseline (that IS the last persisted state) and stamps
 * nothing, so hydrating the app on launch — which re-persists the same values —
 * can never be mistaken for a user edit and make this device win every field.
 */
export function recordPersistedSettings(
  settings: Partial<UserSettings>,
  at: number = Date.now(),
  timestamps: Record<string, number> = {}
): Record<string, number> {
  let baseline = lastPersistedSettingsSnapshot;
  if (baseline === null) {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PERSISTED_SETTINGS_KEY) : null;
      baseline = raw ? JSON.parse(raw) : null;
    } catch (e) {
      logger.warn('SyncService:recordPersistedSettings', 'Could not read the persisted settings baseline', e);
    }
    if (!baseline || typeof baseline !== 'object') return { ...timestamps };
  }
  lastPersistedSettingsSnapshot = { ...settings };
  return stampPersistedSettings(settings, baseline, at, timestamps);
}

/**
 * Constant-time byte comparison: XOR-accumulate loop over two
 * equal-length Uint8Arrays. A length mismatch returns false up front — the
 * compared digest lengths are public constants, not secrets.
 */
function constantTimeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** PBKDF2-SHA256 key derivation returning raw bits. */
async function pbkdf2Bits(password: string, salt: Uint8Array, iterations: number, outputBytes: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    outputBytes * 8
  );
  return new Uint8Array(bits);
}

/** Hash a local-account password as pbkdf2$600000$<saltB64>$<hashB64>. */
async function hashLocalPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
  const hash = await pbkdf2Bits(password, salt, PBKDF2_ITERATIONS, PBKDF2_HASH_BYTES);
  return `${PASSWORD_HASH_FORMAT}$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

/**
 * Verify a local-account password against either the current pbkdf2$ format
 * or the legacy unsalted SHA-256 hex digest (verified the legacy way first,
 * then transparently upgraded by the caller on success).
 */
async function verifyLocalPassword(password: string, email: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith(`${PASSWORD_HASH_FORMAT}$`)) {
    const [, iterationsRaw, saltB64, hashB64] = storedHash.split('$');
    const iterations = Number.parseInt(iterationsRaw, 10);
    if (!Number.isFinite(iterations) || iterations < 1 || iterations > 10_000_000 || !saltB64 || !hashB64) {
      return false;
    }
    try {
      const computed = await pbkdf2Bits(password, base64ToBytes(saltB64), iterations, PBKDF2_HASH_BYTES);
      return constantTimeEqualBytes(computed, base64ToBytes(hashB64));
    } catch {
      return false;
    }
  }

  // Legacy scheme: SHA-256(password + ':' + email), lowercase hex.
  // Only accept well-formed legacy digests — an attacker who can write the
  // registry must not be able to plant an arbitrary downgrade hash.
  if (!/^[0-9a-f]{64}$/.test(storedHash)) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${password}:${email}`));
  const calculatedHex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  return constantTimeEqualBytes(new TextEncoder().encode(calculatedHex), new TextEncoder().encode(storedHash));
}

const isDedicatedSyncKey = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.startsWith(SYNC_KEY_FORMAT_PREFIX);

/**
 * Derive the dedicated sync key: PBKDF2-SHA256 @ 600k over the account
 * password with a per-account random salt, returned as a storable
 * "nk2$<saltB64>$<keyB64>" string. syncCrypto.deriveKey() cannot be reused
 * here because its AES-GCM CryptoKey is non-extractable — we need the raw
 * bits to persist the key in the OS secure store.
 */
async function deriveDedicatedSyncKey(password: string, preferredSaltB64?: string): Promise<{ key: string; saltB64: string }> {
  let salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
  if (preferredSaltB64) {
    try {
      salt = base64ToBytes(preferredSaltB64);
    } catch {
      // Malformed salt — fall back to a fresh random one.
    }
  }
  const bits = await pbkdf2Bits(password, salt, PBKDF2_ITERATIONS, PBKDF2_HASH_BYTES);
  const saltB64 = bytesToBase64(salt);
  return { key: `${SYNC_KEY_FORMAT_PREFIX}${saltB64}$${bytesToBase64(bits)}`, saltB64 };
}

const DEFAULT_PREFERENCES: SyncPreferences = {
  syncBookmarks: true,
  syncHistory: true,
  syncPasswords: true,
  syncSettings: true,
  syncWorkspaces: true,
};

/** The table the encrypted vault lives in. */
export const SYNC_VAULT_TABLE = 'nova_sync_vaults';

/**
 * How many times one sync will re-read, re-merge and re-write the vault when it
 * loses the write race. Bounded because the race is not guaranteed to end: a
 * device that keeps losing gives up and reports the error instead of hammering
 * the backend forever.
 */
export const SYNC_WRITE_ATTEMPTS = 3;

/**
 * A vault write that was rejected because the row changed under it. Only this
 * is retried; every other failure aborts the sync.
 */
export class SyncConflictError extends Error {
  constructor(message = 'Another device synced first — your changes were not lost, try again.') {
    super(message);
    this.name = 'SyncConflictError';
  }
}

export function isSyncConflictError(error: unknown): error is SyncConflictError {
  return error instanceof SyncConflictError;
}

/**
 * Re-run the whole read-merge-write cycle when — and only when — the write lost
 * its race. Everything is recomputed from the fresh read, because the bundle the
 * failed attempt built was derived from a vault that no longer exists.
 */
export async function retryOnVaultConflict<T>(
  attempt: (round: number) => Promise<T>,
  attempts: number = SYNC_WRITE_ATTEMPTS
): Promise<T> {
  const max = Math.max(1, Math.floor(attempts));
  for (let round = 1; ; round++) {
    try {
      return await attempt(round);
    } catch (error) {
      if (!isSyncConflictError(error) || round >= max) throw error;
      logger.warn(
        'SyncService:retryOnVaultConflict',
        `Vault write lost a race (attempt ${round}/${max}) — re-reading and merging again.`
      );
    }
  }
}

/** One row of `nova_sync_vaults` as far as the sync is concerned. */
export interface VaultRow {
  envelope?: EncryptedSyncEnvelope | null;
  updated_at?: string | null;
}

/** PostgREST's `{ data, error }` pair. */
export interface VaultResponse<T> {
  data: T;
  error: unknown;
}

/**
 * The builder chain the vault read and the conditional write use, named
 * structurally so the write can be driven by a fake in a test instead of a live
 * project. The real Supabase builder satisfies it; the single cast at the call
 * site is the price of not pulling the whole PostgREST type surface into the
 * signature.
 */
export interface VaultChain {
  eq(column: string, value: unknown): VaultChain;
  select(columns?: string): VaultChain;
  maybeSingle(): Promise<VaultResponse<VaultRow | null>>;
  then<TResolved = unknown>(
    onfulfilled?: ((value: VaultResponse<VaultRow[]>) => TResolved | PromiseLike<TResolved>) | null,
    onrejected?: ((reason: unknown) => never) | null
  ): PromiseLike<TResolved>;
}

export interface VaultTable {
  select(columns?: string): VaultChain;
  upsert(values: Record<string, unknown>): VaultChain;
}

export interface VaultSnapshot {
  row: VaultRow | null;
  /**
   * The `updated_at` the read observed. It is the precondition of the write
   * that follows, and null means "there is no row to be stale about".
   */
  updatedAt: string | null;
}

/**
 * Read the vault row together with its `updated_at`.
 *
 * Both are needed: the envelope is the data, and `updated_at` is the only
 * version the row has, so it is the only thing a conditional write can be
 * conditioned on. Reading them in separate queries would leave a window in which
 * the two describe different rows.
 *
 * Throws when the row exists but carries no version. Writing such a row would
 * mean overwriting it with no precondition at all, which is the blind write this
 * whole mechanism exists to remove — so the sync reports the vault as
 * unverifiable and aborts rather than risking another device's data.
 */
export async function readVaultSnapshot(table: VaultTable, userId: string): Promise<VaultSnapshot> {
  const { data, error } = await table.select('envelope, updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  const row = data ?? null;
  const updatedAt = typeof row?.updated_at === 'string' ? row.updated_at : null;
  if (row && updatedAt === null) {
    throw new Error('Vault row has no updated_at — the write cannot be guarded.');
  }
  return { row, updatedAt };
}

export interface VaultWriteResult {
  /** The vault row now holds the envelope we built. */
  written: boolean;
  /** Somebody else wrote between our read and our write. */
  conflict: boolean;
  error: unknown;
}

/** Postgres unique-violation, i.e. two devices inserting the row at once. */
function isDuplicateKeyError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === '23505' || code === 23505;
}

/**
 * Write the vault ONLY if it has not changed since `expectedUpdatedAt`.
 *
 * The sync reads the vault, spends the whole decrypt+encrypt round trip on it
 * (two PBKDF2 derivations plus two network hops) and only then writes. Without
 * a precondition that window is a lost update: two devices read the same row,
 * the second one to write silently discards the first one's rename. Tombstones
 * do not help here — they only cover deletions, and a content edit carries no
 * row version at all.
 *
 * So the write is conditional on the `updated_at` the read observed, and — the
 * part that is easy to get wrong — the RESULT is verified. PostgREST answers a
 * filtered upsert that matched nothing with an empty array and NO error, so an
 * unchecked call reports a successful sync that wrote nothing: the other
 * device's data stays, this device believes its own change was uploaded, and it
 * is not. An empty result is therefore a conflict, never a success.
 */
export async function writeVaultIfUnchanged(
  table: VaultTable,
  params: { userId: string; envelope: EncryptedSyncEnvelope; expectedUpdatedAt: string | null; nowIso: string }
): Promise<VaultWriteResult> {
  const payload = {
    user_id: params.userId,
    envelope: params.envelope,
    updated_at: params.nowIso
  };

  if (params.expectedUpdatedAt === null) {
    // No row to be stale about (first sync for this account): write
    // unconditionally, but a concurrent first sync from another device races on
    // the primary key, and Postgres reports that as 23505 — a conflict to
    // retry, not a failure to surface.
    const { data, error } = await table.upsert(payload).select('updated_at');
    if (error) {
      return isDuplicateKeyError(error)
        ? { written: false, conflict: true, error: null }
        : { written: false, conflict: false, error };
    }
    if (!Array.isArray(data) || data.length === 0) return { written: false, conflict: true, error: null };
    return { written: true, conflict: false, error: null };
  }

  const { data, error } = await table
    .upsert(payload)
    .eq('updated_at', params.expectedUpdatedAt)
    .select('updated_at');
  if (error) return { written: false, conflict: false, error };
  if (!Array.isArray(data) || data.length === 0) return { written: false, conflict: true, error: null };
  return { written: true, conflict: false, error: null };
}

/** The local rows one sync round works from. */
export interface SyncLocalData {
  bookmarks: Bookmark[];
  folders: Folder[];
  history: HistoryItem[];
  passwords: SavedPassword[];
  settings: UserSettings;
  workspaces: Workspace[];
}

/** What a completed sync hands back. */
export interface SyncResult {
  mergedData: SyncLocalData;
  syncedItemsCount: {
    bookmarks: number;
    history: number;
    passwords: number;
    workspaces: number;
  };
}

export class NovaSyncService {
  private currentUser: NovaUser | null = null;
  private token: string | null = null;
  private isSyncing = false;
  private syncQueue: Promise<any> = Promise.resolve();
  private lastSyncedAt: number | null = null;
  private lastError: string | null = null;
  private listeners = new Set<(status: SyncStatus) => void>();
  private remoteSyncListeners = new Set<() => void>();
  // Dedicated derived sync key — NEVER the raw account password.
  private masterKey: string | null = null;
  // Memory-only fallback holding the legacy raw password (or the pre-migration
  // keychain value) so envelopes encrypted under it stay readable until the
  // next successful sync re-encrypts them under the dedicated key.
  private legacyMasterKey: string | null = null;
  private legacyMasterKeyLoaded = false;
  // Set during a sync when the legacy fallback had to be used, so the
  // post-push cleanup can wipe the legacy material.
  private usedLegacyKeyThisSync = false;
  private realtimeChannel: RealtimeChannel | null = null;
  // Coalesce realtime bursts: rapid postgres_changes events schedule a single
  // notify 1000ms after the last event instead of one full sync per event.
  private realtimeNotifyTimer: ReturnType<typeof setTimeout> | null = null;
  // In-flight lazy Supabase auth-listener initialization. Kept so concurrent
  // triggers share one init; reset on failure so a later auth action retries.
  private supabaseInitPromise: Promise<void> | null = null;
  // Ciphertext of the last envelope written by this client to ignore self-echoes from Realtime
  private lastPushedCiphertext: string | null = null;

  constructor() {
    this.loadSession();
    // PERF (first paint): constructing the Supabase client pulls the ~216KB
    // vendor chunk and starts its auth listener. Defer both off the module-
    // import/first-paint path — session restore still happens shortly after
    // startup via INITIAL_SESSION, just once the window is interactive.
    this.scheduleSupabaseInit();
  }

  /**
   * Schedules listener initialization for when the renderer is idle instead
   * of running it synchronously during service construction (module import).
   */
  private scheduleSupabaseInit(): void {
    const idleApi = typeof window !== 'undefined' ? (window as unknown as { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => void }) : null;
    if (typeof idleApi?.requestIdleCallback === 'function') {
      idleApi.requestIdleCallback(() => { void this.ensureSupabaseListener(); }, { timeout: 3000 });
    } else if (typeof window !== 'undefined') {
      setTimeout(() => { void this.ensureSupabaseListener(); }, 0);
    } else {
      void this.ensureSupabaseListener();
    }
  }

  /**
   * Idempotent, retry-on-failure initialization of the Supabase auth state
   * listener. Also invoked directly by register/login/logout so the listener
   * is guaranteed to be attached on first actual auth use even if the idle
   * callback has not fired yet.
   */
  private ensureSupabaseListener(): Promise<void> {
    if (!this.supabaseInitPromise) {
      this.supabaseInitPromise = this.initSupabaseListener().catch(e => {
        logger.warn('SyncService:ensureSupabaseListener', 'Supabase listener init skipped', e);
        this.supabaseInitPromise = null;
      });
    }
    return this.supabaseInitPromise;
  }

  private get electronAPI(): ElectronAPI | undefined {
    return getElectronAPI();
  }

  /** Read a value from the OS secure store; null when unavailable/empty. */
  private async readSecureStore(name: string): Promise<string | null> {
    try {
      const value = await this.electronAPI?.secureStoreGet?.(name);
      return typeof value === 'string' && value.length > 0 ? value : null;
    } catch {
      return null;
    }
  }

  /** Best-effort write to the OS secure store; never throws. */
  private async writeSecureStore(name: string, value: string): Promise<boolean> {
    try {
      return Boolean(await this.electronAPI?.secureStoreSet?.(name, value));
    } catch {
      return false;
    }
  }

  /** Best-effort delete from the OS secure store; never throws. */
  private async deleteSecureStore(name: string): Promise<boolean> {
    try {
      return Boolean(await this.electronAPI?.secureStoreDelete?.(name));
    } catch {
      return false;
    }
  }

  /** In-memory fallback storage for sessions when OS secureStore is not active. Never leaks secrets into DOM Web Storage. */
  private sessionMemoryStore = new Map<string, string>();

  /** Session-scoped read; null when unavailable/empty. Never throws. */
  private readSessionValue(key: string): string | null {
    if (this.sessionMemoryStore.has(key)) {
      return this.sessionMemoryStore.get(key) ?? null;
    }
    return null;
  }

  /** Session-scoped write kept strictly memory-only to prevent DOM cleartext storage of tokens/credentials. */
  private writeSessionValue(key: string, value: string): void {
    this.sessionMemoryStore.set(key, value);
  }

  /** Session-scoped delete; never throws. */
  private removeSessionValue(key: string): void {
    this.sessionMemoryStore.delete(key);
  }

  /** Read user profile from OS keychain / secureStore with session + legacy fallbacks. */
  private async readStoredUser(): Promise<NovaUser | null> {
    const secure = await this.readSecureStore(STORAGE_KEYS.USER);
    if (secure) {
      try {
        const parsed = JSON.parse(secure);
        if (parsed && typeof parsed === 'object' && parsed.id) return parsed;
      } catch (err) {
        logger.warn('SyncService:readStoredUser', 'Failed to parse user profile from secure store', err);
      }
    }
    // Session-scoped fallback (web builds without the OS secure store).
    const session = this.readSessionValue(STORAGE_KEYS.USER);
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed && typeof parsed === 'object' && parsed.id) return parsed;
      } catch (err) {
        logger.warn('SyncService:readStoredUser', 'Failed to parse user profile from session store', err);
      }
    }
    if (typeof localStorage !== 'undefined') {
      const legacy = localStorage.getItem(STORAGE_KEYS.USER);
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          if (parsed && typeof parsed === 'object' && parsed.id) {
            if (hasElectronSecureStore()) {
              const ok = await this.writeSecureStore(STORAGE_KEYS.USER, legacy);
              if (ok) {
                localStorage.removeItem(STORAGE_KEYS.USER);
              }
            } else {
              // Web fallback: lift the legacy plaintext copy into
              // session-scoped storage and scrub it from localStorage.
              this.writeSessionValue(STORAGE_KEYS.USER, legacy);
              localStorage.removeItem(STORAGE_KEYS.USER);
              logger.warn('SyncService:readStoredUser', 'Migrated legacy plaintext user profile from localStorage to session-only storage.');
            }
            return parsed;
          }
        } catch (err) {
          logger.warn('SyncService:readStoredUser', 'Failed to parse legacy user profile from localStorage', err);
        }
      }
    }
    return null;
  }

  /** Write user profile to OS keychain / secureStore; session-only on web, scrubbing plaintext localStorage. */
  private async writeStoredUser(user: NovaUser | null): Promise<void> {
    if (!user) {
      await this.deleteSecureStore(STORAGE_KEYS.USER);
      this.removeSessionValue(STORAGE_KEYS.USER);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
      return;
    }
    const raw = JSON.stringify(user);
    if (hasElectronSecureStore()) {
      await this.writeSecureStore(STORAGE_KEYS.USER, raw);
      this.removeSessionValue(STORAGE_KEYS.USER);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } else {
      // Security: never persist the profile as plaintext in localStorage on
      // web builds without the OS secure store (same policy as
      // writeStoredToken). Session-scoped only; the Settings UI should warn
      // the user that the session will not survive a browser restart.
      this.writeSessionValue(STORAGE_KEYS.USER, raw);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
      logger.warn('SyncService:writeStoredUser', 'Web build without secure store: user profile kept session-only, not persisted.');
    }
  }

  /** Read auth token from OS keychain / secureStore with session + legacy fallbacks. */
  private async readStoredToken(): Promise<string | null> {
    const secure = await this.readSecureStore(STORAGE_KEYS.TOKEN);
    if (secure) return secure;
    const session = this.readSessionValue(STORAGE_KEYS.TOKEN);
    if (session) return session;
    if (typeof localStorage !== 'undefined') {
      const legacy = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (legacy) {
        if (hasElectronSecureStore()) {
          const ok = await this.writeSecureStore(STORAGE_KEYS.TOKEN, legacy);
          if (ok) {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
          }
        } else {
          // Web fallback: lift the legacy plaintext token into
          // session-scoped storage and scrub it from localStorage.
          this.writeSessionValue(STORAGE_KEYS.TOKEN, legacy);
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          logger.warn('SyncService:readStoredToken', 'Migrated legacy plaintext auth token from localStorage to session-only storage.');
        }
        return legacy;
      }
    }
    return null;
  }

  /** Persist auth token to OS keychain / secureStore; session-only on web, wiping plaintext localStorage. */
  private async writeStoredToken(token: string): Promise<void> {
    this.token = token;
    if (!token) {
      await this.deleteSecureStore(STORAGE_KEYS.TOKEN);
      this.removeSessionValue(STORAGE_KEYS.TOKEN);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
      return;
    }
    if (hasElectronSecureStore()) {
      await this.writeSecureStore(STORAGE_KEYS.TOKEN, token);
      this.removeSessionValue(STORAGE_KEYS.TOKEN);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
    } else {
      // Security: Web builds keep token in session storage across page reloads
      this.writeSessionValue(STORAGE_KEYS.TOKEN, token);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
    }
  }

  /** Read user credential registry from OS keychain / secureStore with session + legacy fallbacks. */
  private async readUserRegistry(): Promise<Record<string, LocalRegistryEntry>> {
    const secure = await this.readSecureStore(STORAGE_KEYS.USER_REGISTRY);
    if (secure) {
      try {
        const parsed = JSON.parse(secure);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (err) {
        logger.warn('SyncService:readUserRegistry', 'Failed to parse user registry from secure store', err);
      }
    }
    // Session-scoped fallback (web builds without the OS secure store).
    const session = this.readSessionValue(STORAGE_KEYS.USER_REGISTRY);
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (err) {
        logger.warn('SyncService:readUserRegistry', 'Failed to parse user registry from session store', err);
      }
    }
    if (typeof localStorage !== 'undefined') {
      const legacy = localStorage.getItem(STORAGE_KEYS.USER_REGISTRY);
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          if (parsed && typeof parsed === 'object') {
            if (hasElectronSecureStore()) {
              const ok = await this.writeSecureStore(STORAGE_KEYS.USER_REGISTRY, legacy);
              if (ok) {
                localStorage.removeItem(STORAGE_KEYS.USER_REGISTRY);
              }
            } else {
              // Web fallback: lift the legacy plaintext copy (holds
              // passwordHash + syncKeySalt) into session-scoped storage and
              // scrub it from localStorage.
              this.writeSessionValue(STORAGE_KEYS.USER_REGISTRY, legacy);
              localStorage.removeItem(STORAGE_KEYS.USER_REGISTRY);
              logger.warn('SyncService:readUserRegistry', 'Migrated legacy plaintext account registry from localStorage to session-only storage.');
            }
            return parsed;
          }
        } catch (err) {
          logger.warn('SyncService:readUserRegistry', 'Failed to parse legacy user registry from localStorage', err);
        }
      }
    }
    return {};
  }

  /** Write user credential registry to OS keychain / secureStore; session-only on web, scrubbing plaintext localStorage. */
  private async writeUserRegistry(registry: Record<string, LocalRegistryEntry>): Promise<void> {
    const raw = JSON.stringify(registry);
    if (hasElectronSecureStore()) {
      await this.writeSecureStore(STORAGE_KEYS.USER_REGISTRY, raw);
      this.removeSessionValue(STORAGE_KEYS.USER_REGISTRY);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.USER_REGISTRY);
      }
    } else {
      // Security: the registry holds passwordHash + syncKeySalt — never
      // persist it as plaintext in localStorage on web builds without the OS
      // secure store (same policy as writeStoredToken). Session-scoped only.
      this.writeSessionValue(STORAGE_KEYS.USER_REGISTRY, raw);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.USER_REGISTRY);
      }
      logger.warn('SyncService:writeUserRegistry', 'Web build without secure store: account registry kept session-only, not persisted.');
    }
  }

  /**
   * Secure-store key for the E2EE sync key, scoped per user so a failed
   * persist for account B can never cause account A's key to be restored
   * for B. Falls back to the legacy global name when no user is set.
   */
  private masterKeyStoreName(userId?: string): string {
    const uid = userId ?? this.currentUser?.id;
    return uid ? `sync_master_key_${uid}` : SECURE_STORE_MASTER_KEY;
  }

  /** Secure-store key preserving the legacy raw-password entry (see above). */
  private legacyMasterKeyStoreName(userId?: string): string {
    const uid = userId ?? this.currentUser?.id;
    return uid ? `${SECURE_STORE_LEGACY_MASTER_KEY_PREFIX}${uid}` : SECURE_STORE_MASTER_KEY;
  }

  /**
   * Fire-and-forget persistence of the E2EE sync key into the OS-level
   * encrypted secure store (safeStorage in the main process) so sync keeps
   * working after an app restart. Best-effort: never throws, never blocks
   * the auth flow, and is a no-op outside the Electron renderer.
   */
  private persistMasterKeyBestEffort(): void {
    if (!this.electronAPI?.secureStoreSet) return;
    void (async () => {
      try {
        // Re-check at execution time in case the user logged out meanwhile.
        if (!this.masterKey || !this.currentUser) return;
        await this.electronAPI?.secureStoreSet?.(this.masterKeyStoreName(), this.masterKey);
      } catch {
        // Best-effort only — sync still works for the current session.
      }
    })();
  }

  /**
   * Fire-and-forget restore of the persisted sync key(s) for a user. Restores
   * the dedicated derived key, and — when the primary entry is already the
   * migrated format — stages the retained legacy raw-password entry so
   * envelopes still encrypted under the password remain decryptable.
   */
  private restoreMasterKeysForUser(userId?: string): void {
    if (!userId) return;
    if (!this.electronAPI?.secureStoreGet) return;
    void (async () => {
      try {
        const storeName = this.masterKeyStoreName(userId);
        const stored = await this.readSecureStore(storeName);
        if (stored && !this.masterKey && this.currentUser?.id === userId) {
          this.masterKey = stored;
        }
        if (isDedicatedSyncKey(stored)) {
          const legacy = await this.readSecureStore(this.legacyMasterKeyStoreName(userId));
          if (legacy && !isDedicatedSyncKey(legacy) && !this.legacyMasterKey && this.currentUser?.id === userId) {
            this.legacyMasterKey = legacy;
            this.legacyMasterKeyLoaded = true;
          }
        }
      } catch (e) {
        logger.warn('SyncService:restoreMasterKeysForUser', 'Failed to restore master key from secure store', e);
      }
    })();
  }

  /**
   * Legacy raw-password fallback for decrypting pre-migration envelopes. Sources, in
   * order: the in-memory value captured at migration time, then the retained
   * secure-store entry written when the keychain was migrated.
   */
  private async getLegacyFallbackKey(): Promise<string | null> {
    if (this.legacyMasterKey) return this.legacyMasterKey;
    if (this.legacyMasterKeyLoaded) return null;
    const legacy = await this.readSecureStore(this.legacyMasterKeyStoreName());
    this.legacyMasterKeyLoaded = true;
    if (legacy && !isDedicatedSyncKey(legacy)) {
      this.legacyMasterKey = legacy;
    }
    return this.legacyMasterKey;
  }

  /**
   * Establish the long-lived E2EE secret WITHOUT persisting the raw
   * password. Reuses an existing dedicated key from the secure store when
   * present; otherwise derives one via PBKDF2-SHA256 @ 600k with a per-account
   * salt (`preferredSaltB64`, e.g. mirrored from Supabase user_metadata so all
   * devices derive the same key) and stores it. A pre-existing legacy
   * raw-password entry is preserved under the legacy name for fallback
   * decryption of old envelopes. Returns the salt that was used.
   */
  private async acquireSyncKey(password: string, preferredSaltB64?: string): Promise<string> {
    const storeName = this.masterKeyStoreName();
    const stored = await this.readSecureStore(storeName);

    if (isDedicatedSyncKey(stored)) {
      this.masterKey = stored;
      if (!this.legacyMasterKey && !this.legacyMasterKeyLoaded) {
        await this.getLegacyFallbackKey();
      }
      // Salt is embedded in the stored key string.
      return stored.slice(SYNC_KEY_FORMAT_PREFIX.length).split('$')[0] || preferredSaltB64 || '';
    }

    let saltB64 = preferredSaltB64;
    if (!saltB64) {
      saltB64 = bytesToBase64(crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES)));
    }
    const { key } = await deriveDedicatedSyncKey(password, saltB64);

    if (stored && !isDedicatedSyncKey(stored)) {
      // Preserve the legacy raw-password entry for decryption of envelopes
      // created before this migration.
      await this.writeSecureStore(this.legacyMasterKeyStoreName(), stored);
      if (!this.legacyMasterKey) this.legacyMasterKey = stored;
    }

    this.masterKey = key;
    await this.writeSecureStore(storeName, key);
    return saltB64;
  }

  private loadSession() {
    if (typeof localStorage !== 'undefined') {
      try {
        const savedStatus = localStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
        if (savedStatus) {
          const parsed = JSON.parse(savedStatus);
          this.lastSyncedAt = parsed.lastSyncedAt || null;
        }
      } catch (e) {
        logger.error('SyncService:loadSession', 'Failed to restore sync status', e);
      }
    }

    void this.restoreSessionAsync();
  }

  private async restoreSessionAsync(): Promise<void> {
    try {
      const [user, token] = await Promise.all([
        this.readStoredUser(),
        this.readStoredToken()
      ]);

      // The auth listener (INITIAL_SESSION) may already have established a
      // session — never clobber it with stale stored values.
      if (!this.currentUser && user && token) {
        this.currentUser = user;
        this.token = token;
        this.restoreMasterKeysForUser(user.id);
        this.notify();
      } else if (!this.currentUser && user) {
        // Stored profile without a usable auth token (web builds never
        // persist tokens): present a clean logged-out state instead of a
        // broken half-session that syncData() would reject anyway.
        this.currentUser = null;
        this.token = null;
        this.removeSessionValue(STORAGE_KEYS.USER);
        logger.warn('SyncService:restoreSessionAsync', 'Stored profile found without an auth token — staying logged out.');
        this.notify();
      }
    } catch (e) {
      logger.error('SyncService:restoreSessionAsync', 'Failed to restore sync session', e);
    }
  }

  private async initSupabaseListener() {
    try {
      if (!isSupabaseConfigured()) return;
      const supabase = await getSupabaseClient();
      supabase.auth.onAuthStateChange((event, session) => {
        // INITIAL_SESSION is handled alongside SIGNED_IN so that sessions
        // restored by supabase-js from its storage adapter re-hydrate this
        // service after a restart.
        if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          const userMeta = session.user.user_metadata || {};
          this.currentUser = {
            id: session.user.id,
            email: session.user.email || '',
            displayName: userMeta.display_name || session.user.email?.split('@')[0] || 'User',
            createdAt: new Date(session.user.created_at).getTime(),
            lastLoginAt: Date.now(),
            syncPreferences: userMeta.sync_preferences || { ...DEFAULT_PREFERENCES }
          };
          this.token = session.access_token;
          void this.writeStoredUser(this.currentUser).catch(err => {
            logger.warn('SyncService:initSupabaseListener', 'Failed to persist user profile', err);
          });
          // The JWT is persisted by supabase-js through the secure storage
          // adapter — deliberately no localStorage token mirror here.
          this.restoreMasterKeysForUser(session.user.id);
          void this.subscribeToRealtime();
          this.notify();
        } else if (event === 'SIGNED_OUT') {
          void this.unsubscribeFromRealtime();
        }
      });
    } catch (e) {
      logger.warn('SyncService:initSupabaseListener', 'Supabase listener init skipped', e);
    }
  }

  private async subscribeToRealtime() {
    if (!this.currentUser || !isSupabaseConfigured()) return;
    try {
      const supabase = await getSupabaseClient();
      await this.unsubscribeFromRealtime();

      this.realtimeChannel = supabase
        .channel(`sync-vault:${this.currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nova_sync_vaults',
            filter: `user_id=eq.${this.currentUser.id}`
          },
          (payload: any) => {
            const incomingCiphertext = payload?.new?.envelope?.ciphertext;
            if (incomingCiphertext && incomingCiphertext === this.lastPushedCiphertext) {
              logger.info('SyncService', 'Ignoring self-echo from Realtime WebSocket');
              return;
            }
            logger.info('SyncService', 'Remote sync change received via Realtime WebSocket');
            this.scheduleRealtimeNotify();
          }
        )
        .subscribe();
    } catch (e) {
      logger.warn('SyncService', 'Realtime subscribe failed:', e);
    }
  }

  private scheduleRealtimeNotify(): void {
    if (this.realtimeNotifyTimer) clearTimeout(this.realtimeNotifyTimer);
    this.realtimeNotifyTimer = setTimeout(() => {
      this.realtimeNotifyTimer = null;
      this.remoteSyncListeners.forEach(fn => {
        try {
          fn();
        } catch (e) {
          logger.warn('SyncService:scheduleRealtimeNotify', 'Remote sync listener failed', e);
        }
      });
    }, 1000);
  }

  private async unsubscribeFromRealtime(): Promise<void> {
    // Null the channel synchronously so overlapping calls can't double-remove.
    const channel = this.realtimeChannel;
    this.realtimeChannel = null;
    if (this.realtimeNotifyTimer) {
      clearTimeout(this.realtimeNotifyTimer);
      this.realtimeNotifyTimer = null;
    }
    if (!channel) return;
    try {
      const supabase = await getSupabaseClient();
      supabase.removeChannel(channel);
    } catch (e) {
      logger.warn('SyncService:unsubscribeFromRealtime', 'Failed to remove realtime channel cleanly', e);
    }
  }

  // --- CRYPTOGRAPHY / E2EE ---

  public async encryptPasswords(passwords: SavedPassword[], masterPassword: string): Promise<{ ciphertext: string; salt: string; iv: string }> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    // Reuse syncCrypto.deriveKey (PBKDF2-SHA256 @ 600k) so the inner
    // passwords blob uses the same parameters as the outer vault envelope.
    const key = await deriveSyncCryptoKey(masterPassword, salt);

    const plaintext = new TextEncoder().encode(JSON.stringify(passwords));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext
    );

    return {
      ciphertext: bytesToBase64(new Uint8Array(encrypted)),
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv)
    };
  }

  public async decryptPasswords(ciphertext: string, saltStr: string, ivStr: string, masterPassword: string): Promise<SavedPassword[]> {
    let salt: Uint8Array;
    let iv: Uint8Array;
    let encryptedData: Uint8Array;
    try {
      salt = base64ToBytes(saltStr);
      iv = base64ToBytes(ivStr);
      encryptedData = base64ToBytes(ciphertext);
    } catch (err) {
      logger.error('SyncService:decryptPasswords', 'E2EE decryption failed', err);
      throw new Error('Incorrect master password or corrupted sync payload');
    }

    // Current parameters: PBKDF2-SHA256 @ 600k (unified with syncCrypto.ts).
    try {
      const key = await deriveSyncCryptoKey(masterPassword, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
      );
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (currentErr) {
      // Compat: blobs written before the parameter unification used
      // PBKDF2 @ 100k. Retry with the legacy parameters; on success the next
      // sync push opportunistically re-encrypts the blob at 600k (the merged
      // passwords always go through encryptPasswords() above).
      try {
        const legacyKey = await this.deriveLegacyPasswordBlobKey(masterPassword, salt);
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          legacyKey,
          encryptedData
        );
        logger.info('SyncService:decryptPasswords', 'Password blob decrypted with legacy PBKDF2 parameters (100k)');
        return JSON.parse(new TextDecoder().decode(decrypted));
      } catch (legacyErr) {
        logger.error('SyncService:decryptPasswords', 'E2EE decryption failed', legacyErr);
        throw new Error('Incorrect master password or corrupted sync payload');
      }
    }
  }

  /**
   * LEGACY: PBKDF2-SHA256 @ 100k. Only used to decrypt password blobs
   * written before the parameters were unified at 600k.
   */
  private async deriveLegacyPasswordBlobKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100_000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  }

  // --- STANDARD 1-CLICK AUTHENTICATION ---

  public async register(email: string, password: string, displayName?: string): Promise<NovaUser> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new Error('Email and password are required');
    }
    // Must match syncCrypto.deriveKey()'s minimum, otherwise every sync would
    // fail later with a cryptic crypto error.
    if (password.length < 12) {
      throw new Error('Password must be at least 12 characters');
    }

    const finalName = displayName?.trim() || normalizedEmail.split('@')[0];

    if (isSupabaseConfigured()) {
      try {
        // First actual auth use: make sure the deferred auth listener is up.
        void this.ensureSupabaseListener();
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { display_name: finalName }
          }
        });

        if (error) throw error;
        if (!data.user) throw new Error('Registration failed');

        const newUser: NovaUser = {
          id: data.user.id,
          email: normalizedEmail,
          displayName: finalName,
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          syncPreferences: { ...DEFAULT_PREFERENCES }
        };

        this.currentUser = newUser;
        this.token = data.session?.access_token || generateId('sb_token');

        // Derive a dedicated sync key instead of using the raw password as
        // the long-lived E2EE secret. The per-account salt is mirrored
        // into user_metadata (best-effort) so every device derives the SAME
        // key for this account.
        const saltB64 = bytesToBase64(crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES)));
        try {
          await supabase.auth.updateUser({ data: { sync_key_salt: saltB64 } });
        } catch (metaErr) {
          logger.warn('SyncService:register', 'Could not persist sync key salt to user metadata', metaErr);
        }
        await this.acquireSyncKey(password, saltB64);
        this.persistMasterKeyBestEffort();

        await this.writeStoredUser(newUser);
        // Token persistence is handled by supabase-js through its secure
        // storage adapter — no localStorage JWT mirror here.

        void this.subscribeToRealtime();
        this.notify();
        return newUser;
      } catch (err: unknown) {
        logger.warn('SyncService:register', 'Supabase registration failed', err);
        // Never silently downgrade to a local account when Supabase IS
        // configured: syncData() rejects non-UUID ids, so the user would
        // believe cloud sync works and then hit errors on first sync.
        // Raw provider error is logged above; keep the user-facing copy stable
        // instead of interpolating internal error text.
        throw new Error('Could not create your cloud account — please try again.');
      }
    }

    // Zero-Config Built-in Vault Registration
    const registry = await this.readUserRegistry();

    if (registry[normalizedEmail]) {
      throw new Error('An account with this email already exists');
    }

    // Salted PBKDF2-SHA256 (600k) instead of a bare SHA-256 digest.
    const passwordHash = await hashLocalPassword(password);
    // Per-account salt for the dedicated sync key, kept in the registry
    // so future logins re-derive the same key.
    const syncKeySalt = bytesToBase64(crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES)));

    const userId = generateId('usr');
    const newUser: NovaUser = {
      id: userId,
      email: normalizedEmail,
      displayName: finalName,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      syncPreferences: { ...DEFAULT_PREFERENCES }
    };

    registry[normalizedEmail] = { user: newUser, passwordHash, syncKeySalt };
    await this.writeUserRegistry(registry);

    this.currentUser = newUser;
    this.token = generateId('nvt');
    // Store the derived sync key — never the raw password.
    await this.acquireSyncKey(password, syncKeySalt);
    this.persistMasterKeyBestEffort();

    await this.writeStoredUser(newUser);
    // Synthetic local token: securely persisted in OS Keychain / SecureStore
    await this.writeStoredToken(this.token);

    this.notify();
    return newUser;
  }

  public async login(email: string, password: string): Promise<NovaUser> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new Error('Email and password are required');
    }
    // Must match syncCrypto.deriveKey()'s minimum so users get a clear error
    // instead of a cryptic downstream crypto failure (legacy short-password
    // accounts cannot work with E2EE anyway).
    if (password.length < 12) {
      throw new Error('Password must be at least 12 characters');
    }

    if (isSupabaseConfigured()) {
      try {
        // First actual auth use: make sure the deferred auth listener is up.
        void this.ensureSupabaseListener();
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });

        if (error) throw error;
        if (!data.user) throw new Error('Login failed');

        const userMeta = data.user.user_metadata || {};
        const loggedUser: NovaUser = {
          id: data.user.id,
          email: normalizedEmail,
          displayName: userMeta.display_name || normalizedEmail.split('@')[0],
          createdAt: new Date(data.user.created_at).getTime(),
          lastLoginAt: Date.now(),
          syncPreferences: userMeta.sync_preferences || { ...DEFAULT_PREFERENCES }
        };

        this.currentUser = loggedUser;
        this.token = data.session.access_token;

        // Derive/reuse the dedicated sync key instead of using the raw
        // password as the long-lived E2EE secret. Prefer the per-account salt
        // from user_metadata so every device derives the same key; if the
        // account has none yet (pre-migration), publish a fresh one
        // (best-effort) so other devices converge on the same key.
        const metaSalt = typeof userMeta.sync_key_salt === 'string' && userMeta.sync_key_salt
          ? userMeta.sync_key_salt
          : undefined;
        const saltB64 = await this.acquireSyncKey(password, metaSalt);
        if (!metaSalt) {
          try {
            await supabase.auth.updateUser({ data: { sync_key_salt: saltB64 } });
          } catch (metaErr) {
            logger.warn('SyncService:login', 'Could not persist sync key salt to user metadata', metaErr);
          }
        }
        // Memory-only fallback so envelopes still encrypted under the raw
        // password remain readable until the next successful sync re-encrypts
        // them under the derived key. Never persisted.
        this.legacyMasterKey = this.legacyMasterKey || password;
        this.persistMasterKeyBestEffort();

        await this.writeStoredUser(loggedUser);
        // Token persistence is handled by supabase-js through its secure
        // storage adapter — no localStorage JWT mirror here.

        void this.subscribeToRealtime();
        this.notify();
        return loggedUser;
      } catch (err: unknown) {
        logger.warn('SyncService:login', 'Supabase login failed', err);
        // Symmetric with register(): do not fall through to the local
        // zero-config registry when Supabase IS configured — that would
        // silently sign the user into a non-syncing local account.
        // Raw provider error is logged above; keep user-facing copy stable.
        throw new Error('Could not sign in to your cloud account — please check your credentials and try again.');
      }
    }

    // Zero-Config Built-in Vault Login
    const registry = await this.readUserRegistry();

    const account = registry[normalizedEmail];
    if (!account) {
      throw new Error('Invalid email or password');
    }

    // Verify against the pbkdf2$ format (constant-time compare) or,
    // for legacy accounts, the old SHA-256 scheme — then transparently
    // upgrade the stored hash on success.
    const passwordOk = await verifyLocalPassword(password, normalizedEmail, account.passwordHash);
    if (!passwordOk) {
      throw new Error('Invalid email or password');
    }
    if (!account.passwordHash.startsWith(`${PASSWORD_HASH_FORMAT}$`)) {
      account.passwordHash = await hashLocalPassword(password);
    }

    account.user.lastLoginAt = Date.now();

    // Make sure a sync-key salt exists (accounts registered before the
    // migration lack one) so logins re-derive the same dedicated key.
    if (!account.syncKeySalt) {
      account.syncKeySalt = bytesToBase64(crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES)));
    }
    registry[normalizedEmail] = account;
    await this.writeUserRegistry(registry);

    this.currentUser = account.user;
    this.token = generateId('nvt');
    await this.acquireSyncKey(password, account.syncKeySalt);
    this.persistMasterKeyBestEffort();

    await this.writeStoredUser(account.user);
    // Synthetic local token: securely persisted in OS Keychain / SecureStore
    await this.writeStoredToken(this.token);

    this.notify();
    return account.user;
  }

  public async logout() {
    void this.unsubscribeFromRealtime();
    if (isSupabaseConfigured()) {
      try {
        // First actual auth use: make sure the deferred auth listener is up
        // so signOut() also clears any secure-store session via its events.
        void this.ensureSupabaseListener();
        const supabase = await getSupabaseClient();
        await supabase.auth.signOut();
      } catch (e) {
        logger.warn('SyncService:logout', 'Failed to cleanly sign out from Supabase', e);
      }
    }

    // Secure wipe of persisted sync keys and tokens via OS secureStore delete
    const masterKeyStore = this.masterKeyStoreName();
    const legacyKeyStore = this.legacyMasterKeyStoreName();
    await Promise.allSettled([
      this.deleteSecureStore(masterKeyStore),
      this.deleteSecureStore(legacyKeyStore),
      this.deleteSecureStore(SUPABASE_AUTH_STORAGE_KEY),
      this.writeStoredToken(''),
      this.writeStoredUser(null)
    ]);

    this.currentUser = null;
    this.token = null;
    this.masterKey = null;
    this.legacyMasterKey = null;
    this.legacyMasterKeyLoaded = false;
    this.usedLegacyKeyThisSync = false;
    this.lastSyncedAt = null;

    // Web Storage access can throw on its own (partitioned storage, ITP,
    // Firefox's resistFingerprinting): it is the *getter* that throws, not just
    // the method. An unguarded removeItem here would skip the scrub AND the
    // notify() below, leaving subscribers rendering a signed-in session.
    try {
      for (const key of [
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.SYNC_STATUS,
        // Legacy cleanup: older builds leaked the master key into Web Storage.
        STORAGE_KEYS.MASTER_KEY,
        // Cloud sessions now live in the Electron secure store via the
        // supabase-js storage adapter; scrub any JWT copy that older installs
        // persisted in localStorage.
        SUPABASE_AUTH_STORAGE_KEY,
      ]) {
        try { localStorage.removeItem(key); } catch (_) {}
      }
      try { sessionStorage.removeItem(STORAGE_KEYS.MASTER_KEY); } catch (_) {}
    } finally {
      this.notify();
    }
  }

  public updatePreferences(prefs: Partial<SyncPreferences>) {
    if (!this.currentUser) return;
    this.currentUser.syncPreferences = {
      ...this.currentUser.syncPreferences,
      ...prefs
    };
    void this.writeStoredUser(this.currentUser).catch(err => {
      logger.warn('SyncService:updatePreferences', 'Failed to persist preference change', err);
    });
    this.notify();
  }

  // --- DATA SYNC ENGINE ---

  public syncData(localData: SyncLocalData): Promise<SyncResult> {
    const run = () => this.executeSyncData(localData);
    const queued = this.syncQueue.then(run, run);
    // supabase-js sets no default timeout on PostgREST calls, and a TCP stall
    // that is never closed (captive portal, VPN transition, sleep/resume) would
    // leave `queued` pending forever. `this.syncQueue` chains onto that promise,
    // so one stall wedges every later sync AND pins `isSyncing` on. Bound the
    // run so a stuck request can never poison the queue.
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const guard = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Sync timed out — check your connection and try again.')),
        SYNC_RUN_TIMEOUT_MS
      );
    });
    const guarded = Promise.race([queued, guard]).finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    }) as Promise<SyncResult>;

    this.syncQueue = guarded.catch(() => {});
    return guarded;
  }

  /**
   * Validate the session, then run the vault round-trip, retrying the WHOLE
   * read-merge-write when it loses the race to another device.
   */
  private async executeSyncData(localData: SyncLocalData): Promise<SyncResult> {
    if (!this.currentUser || !this.token) {
      throw new Error('User is not logged in');
    }
    if (!this.masterKey) {
      // Logged in but the E2EE key never got restored (e.g. secure store
      // unavailable after restart) — a clear message beats a crypto failure.
      throw new Error('Sync session expired — please sign in again.');
    }
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(this.currentUser.id)) {
      // nova_sync_vaults.user_id is a uuid referencing auth.users; zero-config
      // fallback accounts ('usr_…' ids) would only surface a cryptic Postgres
      // error mid-query.
      throw new Error('Cloud sync requires a Nova Cloud account. Please sign in with your cloud account.');
    }
    if (!isSupabaseConfigured()) {
      throw new Error('Secure sync requires a configured Supabase project');
    }

    this.isSyncing = true;
    this.lastError = null;
    this.usedLegacyKeyThisSync = false;
    this.notify();

    // The settings merge compares per-field write clocks, so every attempt has to
    // start from the clocks as they were BEFORE this sync: an attempt that loses
    // the race has already written the stamps of a bundle that never landed, and
    // inheriting them would let values that only existed in a discarded attempt
    // beat the vault forever.
    const baselineSettingsTimestamps = this.getSettingsTimestamps();
    const prefs = this.currentUser.syncPreferences || DEFAULT_PREFERENCES;
    const user = this.currentUser;
    const masterKey = this.masterKey;

    try {
      return await retryOnVaultConflict(async round => {
        this.saveSettingsTimestamps(baselineSettingsTimestamps);
        return this.runSyncAttempt(localData, prefs, { userId: user.id, masterKey }, round);
      });
    } catch (err: unknown) {
      this.saveSettingsTimestamps(baselineSettingsTimestamps);
      this.isSyncing = false;
      this.lastError = err instanceof Error ? (err.message || 'Sync failed') : 'Sync failed';
      this.notify();
      throw err;
    }
  }

  /**
   * Remember what this device contributed, per user, for the deletions the
   * delete sites of history and passwords do not record themselves.
   *
   * Only the rows the vault now holds are indexed, and only once the write has
   * succeeded: the index is the evidence that this device holds these rows, and
   * a failed (or lost) push delivered nothing, so the deletions it would prove
   * must be detected again on the next sync.
   *
   * A collection whose sync preference is off is NOT indexed: while it is off
   * this device's copy of it is not meant to be authoritative and the absence of
   * a row says nothing. The previous index is dropped rather than kept, so
   * turning the preference back on treats the collection as new (adopt what is
   * in the vault) instead of reading the rows synced before the pause as
   * deletions.
   */
  private recordPushedIndex(
    userId: string,
    prefs: SyncPreferences,
    pushed: { history: HistoryItem[]; passwords: SavedPassword[] }
  ): void {
    const previous = loadPushedIndex(userId) ?? {};
    const next: Partial<Record<IndexedDeletionCollection, PushedRowIndex>> = { ...previous };
    if (prefs.syncHistory) {
      next.history = indexPushedRows(pushed.history, h => historyRowKey(h), h => rowVersion(h));
    } else {
      delete next.history;
    }
    if (prefs.syncPasswords) {
      next.passwords = indexPushedRows(pushed.passwords, p => passwordRowKey(p), p => rowVersion(p));
    } else {
      delete next.passwords;
    }
    savePushedIndex(userId, next);
  }

  /**
   * One read-merge-write cycle against the vault.
   *
   * Kept as a unit of work so a lost write race can be retried by re-running the
   * entire cycle — the bundle an attempt builds is derived from the vault it
   * read, so a retry that reused it would overwrite exactly the rows it was
   * supposed to merge with. Throws `SyncConflictError` when the conditional
   * write is rejected; every other failure propagates.
   */
  private async runSyncAttempt(
    localData: SyncLocalData,
    prefs: SyncPreferences,
    session: { userId: string; masterKey: string },
    round: number
  ): Promise<SyncResult> {
    const tombstoneNow = Date.now();
    const supabase = await getSupabaseClient();
    // The structural type names the four chain calls made below; the real
    // PostgREST builder satisfies it.
    const table = supabase.from(SYNC_VAULT_TABLE) as unknown as VaultTable;

    // 1. Fetch and decrypt the remote vault. A missing vault (0 rows) is a
    // normal first-sync; an unreadable one must ABORT the push or we would
    // clobber another device's data with a local-only merge.
    let remoteBundle: SyncDataBundle | null = null;
    let remoteUnusable = false;
    let remoteUpdatedAt: string | null = null;
    try {
      const snapshot = await readVaultSnapshot(table, session.userId);
      remoteUpdatedAt = snapshot.updatedAt;
      if (snapshot.row && !snapshot.row.envelope) {
        // A row exists but carries no envelope (legacy schema: plain
        // bookmarks/history columns). It must NOT be treated as "no remote
        // data", or the local-only merge below would be pushed and clobber
        // the legacy remote state.
        remoteUnusable = true;
        logger.warn('SyncService:syncData', 'Remote vault row has no envelope (legacy format) — aborting push');
      } else if (snapshot.row?.envelope) {
        try {
          remoteBundle = migrateSyncBundle(await decryptSyncPayload<SyncDataBundle>(snapshot.row.envelope, session.masterKey));
        } catch (decErr) {
          // Compat: the vault may predate the dedicated sync key and be
          // encrypted under the raw account password. Fall back to the
          // retained legacy key for decryption; the push below re-encrypts
          // everything under the dedicated key, completing the migration.
          const legacyKey = await this.getLegacyFallbackKey();
          if (legacyKey) {
            try {
              remoteBundle = migrateSyncBundle(await decryptSyncPayload<SyncDataBundle>(snapshot.row.envelope, legacyKey));
              this.usedLegacyKeyThisSync = true;
              logger.info('SyncService:syncData', 'Vault decrypted with legacy key; re-encrypting under dedicated sync key');
            } catch {
              remoteUnusable = true;
              logger.warn('SyncService:syncData', 'Failed to decrypt remote vault with current and legacy keys — aborting push');
            }
          } else {
            remoteUnusable = true;
            logger.warn('SyncService:syncData', 'Failed to decrypt remote vault — aborting push to prevent data loss', decErr);
          }
        }
      }
    } catch (e) {
      remoteUnusable = true;
      logger.warn('SyncService:syncData', 'Remote vault lookup failed', e);
    }

    if (remoteUnusable) {
      throw new Error('Could not verify remote encrypted vault — sync aborted to protect your data.');
    }

    // 2. Decrypt the remote password blob, which lives in its own envelope and
    // therefore cannot travel through the row merge.
    let remotePasswords: TombstoneRow<SavedPassword>[] | undefined;
    if (remoteBundle && prefs.syncPasswords && remoteBundle.encryptedPasswords && remoteBundle.passwordsSalt && remoteBundle.passwordsIv) {
      remotePasswords = await this.decryptRemotePasswords(
        remoteBundle.encryptedPasswords,
        remoteBundle.passwordsSalt,
        remoteBundle.passwordsIv,
        session.masterKey
      );
    }

    // 3. Reconstruct the deletions this device made since its last push, for
    // the two collections whose delete sites drop the row instead of stamping
    // it. They are ordinary tombstones from here on.
    const deletedLocally = pendingDeletionTombstones(
      { history: localData.history, passwords: localData.passwords },
      loadPushedIndex(session.userId),
      tombstoneNow,
      prefs
    );

    // 4. Union of local and remote. Deletions propagate through tombstones: a
    // deleted row stays in the store as a row carrying `deletedAt`, is carried
    // in the bundle like any other row, and suppresses any copy that predates
    // the delete when it comes back down (mergeSyncedCollections).
    const tombstoneAware = mergeSyncedCollections(
      {
        bookmarks: localData.bookmarks,
        folders: localData.folders,
        workspaces: localData.workspaces,
        history: [...localData.history, ...deletedLocally.history],
        passwords: [...localData.passwords, ...deletedLocally.passwords]
      },
      remoteBundle ? { ...remoteBundle, passwords: remotePasswords } : null,
      prefs,
      tombstoneNow
    );
    const mergedBookmarks = tombstoneAware.bookmarks;
    const mergedFolders = tombstoneAware.folders;
    const mergedWorkspaces = tombstoneAware.workspaces;

    // History is a newest-first, bounded log, so the cap has to keep the
    // NEWEST rows: the merge's own order is local-first, and the live rows are
    // sorted before capping. Tombstones ride along after the live cap.
    const historyRows = tombstoneAware.history ?? purgeExpiredTombstones(localData.history, tombstoneNow);
    const pushedHistory = prefs.syncHistory
      ? capSyncedCollection(
          [...historyRows].sort((a, b) => rowVersion(b) - rowVersion(a)),
          MAX_SYNCED_HISTORY,
          undefined,
          h => historyRowKey(h)
        )
      : historyRows; // opted out: the local log is returned untouched, as for the other collections
    const mergedHistory = liveRowsOnly(pushedHistory) as HistoryItem[];

    // Passwords are pushed as a separately-encrypted blob, so the cap has to be
    // applied to the encryption input — capping it in `newBundle` below would
    // bound nothing, because the blob is already sealed by then.
    const passwordRows = tombstoneAware.passwords ?? purgeExpiredTombstones(localData.passwords, tombstoneNow);
    const pushedPasswords = prefs.syncPasswords
      ? capSyncedCollection(passwordRows, MAX_SYNCED_PASSWORDS, undefined, p => passwordRowKey(p))
      : passwordRows; // opted out: the local credentials are returned untouched
    // A tombstone is a delete marker, not a credential: it must not reach the
    // secure store, or it would be re-read as a password row with no password.
    // The returned list is the UNCAPPED live set, so a user with more
    // credentials than the push cap does not lose the overflow on every sync —
    // the cap only bounds what the envelope carries.
    const mergedPasswords = liveRowsOnly(passwordRows) as SavedPassword[];

    let mergedSettings = { ...localData.settings };

    if (remoteBundle) {
      const vaultVersion = typeof remoteBundle.version === 'number' ? remoteBundle.version : 1;
      logger.info('SyncService:syncData', `Processing remote encrypted vault v${vaultVersion}`);
      if (vaultVersion > SYNC_BUNDLE_VERSION) {
        logger.warn('SyncService:syncData', `Remote vault has higher schema version (${vaultVersion}) than client (${SYNC_BUNDLE_VERSION})`);
      }

      if (prefs.syncSettings && remoteBundle.settings) {
        const lww = mergeSettingsLastWriteWins(
          localData.settings,
          remoteBundle.settings,
          this.getSettingsTimestamps(),
          remoteBundle.settingsTimestamps,
          { fallbackRemoteTimestamp: remoteBundle.timestamp || 0, now: tombstoneNow }
        );
        mergedSettings = lww.settings;
        this.saveSettingsTimestamps(lww.timestamps);
      }
    }

    let encryptedPassPayload: { ciphertext: string; salt: string; iv: string } | undefined;
    if (prefs.syncPasswords && pushedPasswords.length > 0) {
      encryptedPassPayload = await this.encryptPasswords(pushedPasswords, session.masterKey);
    }

    const syncTimestamp = Date.now();

    // Build the encrypted vault payload. It is never stored in Web Storage.
    // Each collection is capped here so the envelope stays writable; see the
    // MAX_SYNCED_* comment at the constants for why unbounded growth is
    // unrecoverable. `undefined` still means "opted out" and is preserved.
    const newBundle: SyncDataBundle = {
      version: SYNC_BUNDLE_VERSION,
      timestamp: syncTimestamp,
      userId: session.userId,
      bookmarks: prefs.syncBookmarks ? capSyncedCollection(mergedBookmarks, MAX_SYNCED_BOOKMARKS) : undefined,
      folders: prefs.syncBookmarks ? capSyncedCollection(mergedFolders, MAX_SYNCED_FOLDERS) : undefined,
      history: prefs.syncHistory ? pushedHistory : undefined,
      encryptedPasswords: encryptedPassPayload?.ciphertext,
      passwordsSalt: encryptedPassPayload?.salt,
      passwordsIv: encryptedPassPayload?.iv,
      settings: prefs.syncSettings ? mergedSettings : undefined,
      settingsTimestamps: prefs.syncSettings ? this.getSettingsTimestamps() : undefined,
      workspaces: prefs.syncWorkspaces ? capSyncedCollection(mergedWorkspaces, MAX_SYNCED_WORSPACES) : undefined
    };

    // 5. Conditional write. The vault is only overwritten if it still holds the
    // revision this attempt read; otherwise the attempt lost the race and the
    // whole cycle has to run again from a fresh read.
    const envelope = await encryptSyncPayload(newBundle, session.masterKey);
    this.lastPushedCiphertext = envelope.ciphertext;
    const write = await writeVaultIfUnchanged(table, {
      userId: session.userId,
      envelope,
      expectedUpdatedAt: remoteUpdatedAt,
      nowIso: new Date().toISOString()
    });
    if (write.error) throw write.error;
    if (write.conflict) throw new SyncConflictError();

    // The vault holds this bundle now, so this device holds the rows in it: that
    // is what the next sync compares its store against to tell a deletion from
    // a row it never had.
    this.recordPushedIndex(session.userId, prefs, {
      history: mergedHistory,
      passwords: liveRowsOnly(pushedPasswords) as SavedPassword[]
    });

    // The remote vault is now encrypted under the dedicated sync key, so
    // the retained legacy raw-password material is no longer needed — wipe
    // it from memory and the secure store.
    if (this.usedLegacyKeyThisSync) {
      this.usedLegacyKeyThisSync = false;
      this.legacyMasterKey = null;
      void this.writeSecureStore(this.legacyMasterKeyStoreName(), '');
    }

    // Bookkeeping only — the vault upsert above has already succeeded, so
    // this must not be able to fail the whole sync. An unguarded setItem
    // throws QuotaExceededError when Web Storage is full or blocked, the
    // outer catch sets lastError and rejects, and the caller therefore never
    // applies `mergedData`: remote-only bookmarks stop coming down and the
    // user is shown a failure for a sync that actually worked. The
    // in-memory timestamp is always kept; only the persistence is best-effort.
    this.lastSyncedAt = syncTimestamp;
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_STATUS, JSON.stringify({ lastSyncedAt: this.lastSyncedAt }));
    } catch (e) {
      logger.warn('SyncService:syncData', 'Could not persist last-synced timestamp to localStorage', e);
    }

    if (round > 1) {
      logger.info('SyncService:syncData', `Sync completed after ${round} attempts (lost write races were re-merged)`);
    }

    this.isSyncing = false;
    this.notify();

    return {
      mergedData: {
        bookmarks: mergedBookmarks,
        folders: mergedFolders,
        history: mergedHistory,
        passwords: mergedPasswords,
        settings: mergedSettings,
        workspaces: mergedWorkspaces
      },
      syncedItemsCount: {
        bookmarks: mergedBookmarks.length,
        history: mergedHistory.length,
        passwords: mergedPasswords.length,
        workspaces: mergedWorkspaces.length
      }
    };
  }

  /**
   * Decrypt the vault's inner password blob, retrying with the retained legacy
   * key for blobs written before the parameter unification.
   *
   * Returns undefined — leaving the local passwords untouched — when the blob
   * cannot be read at all: guessing then would mean either dropping the user's
   * credentials or overwriting the vault's ones with an empty list.
   */
  private async decryptRemotePasswords(
    ciphertext: string,
    salt: string,
    iv: string,
    masterKey: string
  ): Promise<TombstoneRow<SavedPassword>[] | undefined> {
    try {
      return await this.decryptPasswords(ciphertext, salt, iv, masterKey);
    } catch (e) {
      const legacyKey = await this.getLegacyFallbackKey();
      if (!legacyKey) {
        logger.warn('SyncService:syncData', 'Skipping password decrypt', e);
        return undefined;
      }
      try {
        const passwords = await this.decryptPasswords(ciphertext, salt, iv, legacyKey);
        this.usedLegacyKeyThisSync = true;
        return passwords;
      } catch (legacyErr) {
        logger.warn('SyncService:syncData', 'Skipping password decrypt (current and legacy keys failed)', legacyErr);
        return undefined;
      }
    }
  }

  // --- STATE & SUBSCRIPTIONS ---

  public getStatus(): SyncStatus {
    return {
      isLoggedIn: Boolean(this.currentUser),
      user: this.currentUser,
      lastSyncedAt: this.lastSyncedAt,
      isSyncing: this.isSyncing,
      syncError: this.lastError,
      backend: isSupabaseConfigured() ? 'supabase' : 'nova_cloud',
      syncCode: this.currentUser?.syncCode || null,
      itemsSynced: {
        bookmarks: 0,
        history: 0,
        passwords: 0,
        workspaces: 0
      }
    };
  }

  public subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onRemoteChange(listener: () => void) {
    this.remoteSyncListeners.add(listener);
    return () => {
      this.remoteSyncListeners.delete(listener);
    };
  }

  // --- SYNC CHAIN & PAIRING ---
  //
  // Device pairing by sync code is NOT implemented: there is no pairing
  // registry, no invitation store and no transport that a second device could
  // reach (the `createPairingToken`/`hashPairingToken` primitives in
  // syncCrypto.ts have no caller). The previous implementations minted a random
  // code, stored it on the local user, ignored the data bundle they were handed
  // — including the secure-store password blob — and returned success, so the UI
  // reported "Device paired!" while nothing was ever shared.
  //
  // Both entry points now fail loudly instead of pretending. Pairing needs to be
  // built on the real primitives before these can be reinstated.
  private static readonly PAIRING_UNAVAILABLE =
    'Device pairing is not available in this build. Sign in with your Nova Cloud account to sync.';

  /**
   * Whether the pairing UI should be offered at all.
   *
   * The `nova_pairing_invitations` table and its RLS exist, but the join flow
   * does not: a second device cannot read an invitation by `token_hash`, and so
   * cannot reach the owner's vault. Until those policies and the client flow
   * land, the buttons would only ever surface the error above, so the UI hides
   * them instead of advertising an action that cannot work. Flip this to `true`
   * once the SQL in supabase_schema.sql has been applied and the RPC exists.
   */
  public static readonly PAIRING_AVAILABLE = false;

  public static normalizeSyncCode = normalizeSyncCode;
  public static formatSyncCode = formatSyncCode;

  public async generateSyncChainCode(_currentData?: Partial<SyncDataBundle>): Promise<string> {
    throw new Error(NovaSyncService.PAIRING_UNAVAILABLE);
  }

  public async joinSyncChain(_code: string): Promise<boolean> {
    throw new Error(NovaSyncService.PAIRING_UNAVAILABLE);
  }

  public getSettingsTimestamps(): Record<string, number> {
    try {
      const raw = localStorage.getItem('nova_settings_timestamps');
      if (raw) return JSON.parse(raw) || {};
    } catch (_) {}
    return {};
  }

  public saveSettingsTimestamps(timestamps: Record<string, number>): void {
    try {
      localStorage.setItem('nova_settings_timestamps', JSON.stringify(timestamps));
    } catch (_) {}
  }

  /**
   * Record that the user persisted these settings, stamping the per-field write
   * clock for the fields that changed.
   *
   * This is the one call the settings write path has to make (see
   * `recordPersistedSettings`), and it is what unfreezes per-field LWW: the sync
   * compares a local field against the remote one by when each was WRITTEN, and
   * without a stamp taken at the write the local clock can only ever be as old
   * as the last sync, so a setting this user changed after a remote change would
   * lose every time and the field would be stuck on the other device's value.
   */
  public recordSettingsPersist(settings: Partial<UserSettings>, at: number = Date.now()): void {
    this.saveSettingsTimestamps(recordPersistedSettings(settings, at, this.getSettingsTimestamps()));
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach(fn => fn(status));
  }
}

export const syncService = new NovaSyncService();
