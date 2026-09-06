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

import { Bookmark, Folder, Tab, Workspace, HistoryItem, UserSettings } from '../types/browser';
import { getSupabaseClient, isSupabaseConfigured, hasElectronSecureStore, SUPABASE_AUTH_STORAGE_KEY } from './supabaseClient';
import { base64ToBytes, bytesToBase64, decryptSyncPayload, deriveKey as deriveSyncCryptoKey, encryptSyncPayload, EncryptedSyncEnvelope } from './syncCrypto';
import { generateId } from '../utils/idGenerator';
import { normalizeSyncCode, formatSyncCode } from '../utils/syncCodeUtils';

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
  history?: HistoryItem[];
  passwords?: any[];
  encryptedPasswords?: string;
  passwordsSalt?: string;
  passwordsIv?: string;
  settings?: Partial<UserSettings>;
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
    { name: 'PBKDF2', salt: salt as any, iterations, hash: 'SHA-256' },
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

class NovaSyncService {
  private currentUser: NovaUser | null = null;
  private token: string | null = null;
  private isSyncing = false;
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
  private realtimeChannel: any = null;
  // Coalesce realtime bursts: rapid postgres_changes events schedule a single
  // notify 1000ms after the last event instead of one full sync per event.
  private realtimeNotifyTimer: ReturnType<typeof setTimeout> | null = null;
  // In-flight lazy Supabase auth-listener initialization. Kept so concurrent
  // triggers share one init; reset on failure so a later auth action retries.
  private supabaseInitPromise: Promise<void> | null = null;

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
    const idleApi = typeof window !== 'undefined' ? (window as any) : null;
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
        console.warn('[NovaSync] Supabase listener init skipped:', e);
        this.supabaseInitPromise = null;
      });
    }
    return this.supabaseInitPromise;
  }

  private get electronAPI(): any {
    return typeof window !== 'undefined' ? (window as any).electronAPI ?? null : null;
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

  /** Session-scoped (tab lifetime) Web Storage read; null when unavailable/empty. Never throws. */
  private readSessionValue(key: string): string | null {
    try {
      if (typeof sessionStorage !== 'undefined') return sessionStorage.getItem(key);
    } catch {
      // Storage blocked (e.g. private mode) — treat as empty.
    }
    return null;
  }

  /** Session-scoped (tab lifetime) Web Storage write; never throws. */
  private writeSessionValue(key: string, value: string): void {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, value);
    } catch {
      console.warn(`[NovaSync] sessionStorage unavailable — "${key}" kept memory-only for this session.`);
    }
  }

  /** Session-scoped Web Storage delete; never throws. */
  private removeSessionValue(key: string): void {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
    } catch {
      // Best-effort only.
    }
  }

  /** Read user profile from OS keychain / secureStore with session + legacy fallbacks. */
  private async readStoredUser(): Promise<NovaUser | null> {
    const secure = await this.readSecureStore(STORAGE_KEYS.USER);
    if (secure) {
      try {
        const parsed = JSON.parse(secure);
        if (parsed && typeof parsed === 'object' && parsed.id) return parsed;
      } catch {}
    }
    // Session-scoped fallback (web builds without the OS secure store).
    const session = this.readSessionValue(STORAGE_KEYS.USER);
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed && typeof parsed === 'object' && parsed.id) return parsed;
      } catch {}
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
              console.warn('[NovaSync] Migrated legacy plaintext user profile from localStorage to session-only storage.');
            }
            return parsed;
          }
        } catch {}
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
      console.warn('[NovaSync] Web build without secure store: user profile kept session-only, not persisted.');
    }
  }

  /** Read auth token from OS keychain / secureStore with non-destructive fallback. */
  private async readStoredToken(): Promise<string | null> {
    const secure = await this.readSecureStore(STORAGE_KEYS.TOKEN);
    if (secure) return secure;
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
          // session-scoped storage and scrub it from localStorage (same
          // policy as readStoredUser/readUserRegistry). Auth tokens must
          // never linger as plaintext in localStorage.
          this.writeSessionValue(STORAGE_KEYS.TOKEN, legacy);
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          console.warn('[NovaSync] Migrated legacy plaintext auth token from localStorage to session-only storage.');
        }
        return legacy;
      }
    }
    return null;
  }

  /** Persist auth token to OS keychain / secureStore, wiping plaintext localStorage. */
  private async writeStoredToken(token: string): Promise<void> {
    this.token = token;
    if (!token) {
      await this.deleteSecureStore(STORAGE_KEYS.TOKEN);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
      return;
    }
    if (hasElectronSecureStore()) {
      await this.writeSecureStore(STORAGE_KEYS.TOKEN, token);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
    } else if (typeof localStorage !== 'undefined') {
      // Security: never store auth token as plaintext in localStorage
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
  }

  /** Read user credential registry from OS keychain / secureStore with session + legacy fallbacks. */
  private async readUserRegistry(): Promise<Record<string, LocalRegistryEntry>> {
    const secure = await this.readSecureStore(STORAGE_KEYS.USER_REGISTRY);
    if (secure) {
      try {
        const parsed = JSON.parse(secure);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }
    // Session-scoped fallback (web builds without the OS secure store).
    const session = this.readSessionValue(STORAGE_KEYS.USER_REGISTRY);
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
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
              console.warn('[NovaSync] Migrated legacy plaintext account registry from localStorage to session-only storage.');
            }
            return parsed;
          }
        } catch {}
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
      console.warn('[NovaSync] Web build without secure store: account registry kept session-only, not persisted.');
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
        await this.electronAPI.secureStoreSet(this.masterKeyStoreName(), this.masterKey);
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
        console.warn('[NovaSync] Failed to restore master key from secure store:', e);
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
        console.error('[NovaSync] Failed to restore sync status:', e);
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
        console.warn('[NovaSync] Stored profile found without an auth token — staying logged out.');
        this.notify();
      }
    } catch (e) {
      console.error('[NovaSync] Failed to restore sync session:', e);
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
            console.warn('[NovaSync] Failed to persist user profile:', err);
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
      console.warn('[NovaSync] Supabase listener init skipped:', e);
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
          () => {
            console.log('[NovaSync] Remote sync change received via Realtime WebSocket');
            this.scheduleRealtimeNotify();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[NovaSync] Realtime subscribe failed:', e);
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
          console.warn('[NovaSync] Remote sync listener failed:', e);
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
    } catch (e) {}
  }

  // --- CRYPTOGRAPHY / E2EE ---

  public async encryptPasswords(passwords: any[], masterPassword: string): Promise<{ ciphertext: string; salt: string; iv: string }> {
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

  public async decryptPasswords(ciphertext: string, saltStr: string, ivStr: string, masterPassword: string): Promise<any[]> {
    let salt: Uint8Array;
    let iv: Uint8Array;
    let encryptedData: Uint8Array;
    try {
      salt = base64ToBytes(saltStr);
      iv = base64ToBytes(ivStr);
      encryptedData = base64ToBytes(ciphertext);
    } catch (err) {
      console.error('[NovaSync] E2EE decryption failed:', err);
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
        console.info('[NovaSync] Password blob decrypted with legacy PBKDF2 parameters (100k)');
        return JSON.parse(new TextDecoder().decode(decrypted));
      } catch (legacyErr) {
        console.error('[NovaSync] E2EE decryption failed:', legacyErr);
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
        salt: salt as any,
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
          console.warn('[NovaSync] Could not persist sync key salt to user metadata:', metaErr);
        }
        await this.acquireSyncKey(password, saltB64);
        this.persistMasterKeyBestEffort();

        await this.writeStoredUser(newUser);
        // Token persistence is handled by supabase-js through its secure
        // storage adapter — no localStorage JWT mirror here.

        void this.subscribeToRealtime();
        this.notify();
        return newUser;
      } catch (err: any) {
        console.warn('[NovaSync] Supabase registration failed:', err);
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
            console.warn('[NovaSync] Could not persist sync key salt to user metadata:', metaErr);
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
      } catch (err: any) {
        console.warn('[NovaSync] Supabase login failed:', err);
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
      } catch (e) {}
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

    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.SYNC_STATUS);
    // Legacy cleanup: older builds leaked the master key into Web Storage.
    localStorage.removeItem(STORAGE_KEYS.MASTER_KEY);
    sessionStorage.removeItem(STORAGE_KEYS.MASTER_KEY);
    // Cloud sessions now live in the Electron secure store via the
    // supabase-js storage adapter; scrub any JWT copy that older installs
    // persisted in localStorage.
    localStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);

    this.notify();
  }

  public updatePreferences(prefs: Partial<SyncPreferences>) {
    if (!this.currentUser) return;
    this.currentUser.syncPreferences = {
      ...this.currentUser.syncPreferences,
      ...prefs
    };
    void this.writeStoredUser(this.currentUser).catch(err => {
      console.warn('[NovaSync] Failed to persist preference change:', err);
    });
    this.notify();
  }

  // --- DATA SYNC ENGINE ---

  public async syncData(localData: {
    bookmarks: Bookmark[];
    folders: Folder[];
    history: HistoryItem[];
    passwords: any[];
    settings: UserSettings;
    workspaces: Workspace[];
  }): Promise<{
    mergedData: {
      bookmarks: Bookmark[];
      folders: Folder[];
      history: HistoryItem[];
      passwords: any[];
      settings: UserSettings;
      workspaces: Workspace[];
    };
    syncedItemsCount: {
      bookmarks: number;
      history: number;
      passwords: number;
      workspaces: number;
    };
  }> {
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

    try {
      const prefs = this.currentUser.syncPreferences || DEFAULT_PREFERENCES;
      let remoteBundle: SyncDataBundle | null = null;
      let remoteUnusable = false;

      // 1. Fetch and decrypt the remote vault. A missing vault (0 rows) is a
      // normal first-sync; an unreadable one must ABORT the push or we would
      // clobber another device's data with a local-only merge.
      try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
          .from('nova_sync_vaults')
          .select('*')
          .eq('user_id', this.currentUser.id)
          .maybeSingle();

        if (error) {
          remoteUnusable = true;
          console.warn('[NovaSync] Failed to fetch remote vault:', error);
        } else if (data && !data.envelope) {
          // A row exists but carries no envelope (legacy schema: plain
          // bookmarks/history columns). It must NOT be treated as "no remote
          // data", or the local-only merge below would be pushed and clobber
          // the legacy remote state.
          remoteUnusable = true;
          console.warn('Remote vault row has no envelope (legacy format) — aborting push');
        } else if (data?.envelope) {
          try {
            remoteBundle = await decryptSyncPayload<SyncDataBundle>(data.envelope, this.masterKey);
          } catch (decErr) {
            // Compat: the vault may predate the dedicated sync key and be
            // encrypted under the raw account password. Fall back to the
            // retained legacy key for decryption; the push below re-encrypts
            // everything under the dedicated key, completing the migration.
            const legacyKey = await this.getLegacyFallbackKey();
            if (legacyKey) {
              try {
                remoteBundle = await decryptSyncPayload<SyncDataBundle>(data.envelope, legacyKey);
                this.usedLegacyKeyThisSync = true;
                console.info('[NovaSync] Vault decrypted with legacy key; re-encrypting under dedicated sync key');
              } catch {
                remoteUnusable = true;
                console.warn('[NovaSync] Failed to decrypt remote vault with current and legacy keys — aborting push');
              }
            } else {
              remoteUnusable = true;
              console.warn('[NovaSync] Failed to decrypt remote vault — aborting push to prevent data loss', decErr);
            }
          }
        }
      } catch (e) {
        remoteUnusable = true;
        console.warn('[NovaSync] Remote vault lookup failed:', e);
      }

      if (remoteUnusable) {
        throw new Error('Could not verify remote encrypted vault — sync aborted to protect your data.');
      }

      let mergedBookmarks = [...localData.bookmarks];
      let mergedFolders = [...localData.folders];
      let mergedHistory = [...localData.history];
      let mergedPasswords = [...localData.passwords];
      let mergedSettings = { ...localData.settings };
      let mergedWorkspaces = [...localData.workspaces];

      if (remoteBundle) {
        if (prefs.syncBookmarks && remoteBundle.bookmarks) {
          const localMap = new Map(localData.bookmarks.map(b => [b.id, b]));
          remoteBundle.bookmarks.forEach(rb => {
            if (!localMap.has(rb.id)) localMap.set(rb.id, rb);
          });
          mergedBookmarks = Array.from(localMap.values());
        }

        if (prefs.syncBookmarks && remoteBundle.folders) {
          const folderMap = new Map(localData.folders.map(f => [f.id, f]));
          remoteBundle.folders.forEach(rf => {
            if (!folderMap.has(rf.id)) folderMap.set(rf.id, rf);
          });
          mergedFolders = Array.from(folderMap.values());
        }

        if (prefs.syncHistory && remoteBundle.history) {
          const historyMap = new Map(localData.history.map(h => [h.id || `${h.url}_${h.timestamp}`, h]));
          remoteBundle.history.forEach(rh => {
            const key = rh.id || `${rh.url}_${rh.timestamp}`;
            if (!historyMap.has(key)) historyMap.set(key, rh);
          });
          mergedHistory = Array.from(historyMap.values()).sort((a, b) => b.timestamp - a.timestamp);
        }

        if (prefs.syncPasswords && remoteBundle.encryptedPasswords && remoteBundle.passwordsSalt && remoteBundle.passwordsIv && this.masterKey) {
          try {
            const decryptedRemotePasswords = await this.decryptPasswords(
              remoteBundle.encryptedPasswords,
              remoteBundle.passwordsSalt,
              remoteBundle.passwordsIv,
              this.masterKey
            );
            const passKey = (p: any) => `${p.hostname || ''}_${p.username || ''}`;
            const passMap = new Map(localData.passwords.map(p => [passKey(p), p]));
            decryptedRemotePasswords.forEach((rp: any) => {
              const k = passKey(rp);
              if (!passMap.has(k)) passMap.set(k, rp);
            });
            mergedPasswords = Array.from(passMap.values());
          } catch (e) {
            // Compat: the inner blob may still be encrypted under the raw
            // password — retry with the retained legacy key. Either way the
            // merged passwords are re-encrypted under the dedicated key below.
            const legacyKey = await this.getLegacyFallbackKey();
            if (legacyKey) {
              try {
                const decryptedRemotePasswords = await this.decryptPasswords(
                  remoteBundle.encryptedPasswords,
                  remoteBundle.passwordsSalt,
                  remoteBundle.passwordsIv,
                  legacyKey
                );
                this.usedLegacyKeyThisSync = true;
                const passKey = (p: any) => `${p.hostname || ''}_${p.username || ''}`;
                const passMap = new Map(localData.passwords.map(p => [passKey(p), p]));
                decryptedRemotePasswords.forEach((rp: any) => {
                  const k = passKey(rp);
                  if (!passMap.has(k)) passMap.set(k, rp);
                });
                mergedPasswords = Array.from(passMap.values());
              } catch (legacyErr) {
                console.warn('[NovaSync] Skipping password decrypt (current and legacy keys failed):', legacyErr);
              }
            } else {
              console.warn('[NovaSync] Skipping password decrypt:', e);
            }
          }
        }

        if (prefs.syncSettings && remoteBundle.settings) {
          mergedSettings = { ...localData.settings, ...remoteBundle.settings };
        }

        if (prefs.syncWorkspaces && remoteBundle.workspaces) {
          const wsMap = new Map(localData.workspaces.map(w => [w.id, w]));
          remoteBundle.workspaces.forEach(rw => {
            if (!wsMap.has(rw.id)) wsMap.set(rw.id, rw);
          });
          mergedWorkspaces = Array.from(wsMap.values());
        }
      }

      let encryptedPassPayload: { ciphertext: string; salt: string; iv: string } | undefined;
      if (prefs.syncPasswords && this.masterKey && mergedPasswords.length > 0) {
        encryptedPassPayload = await this.encryptPasswords(mergedPasswords, this.masterKey);
      }

      const syncTimestamp = Date.now();

      // Build the encrypted vault payload. It is never stored in Web Storage.
      const newBundle: SyncDataBundle = {
        version: 1,
        timestamp: syncTimestamp,
        userId: this.currentUser.id,
        bookmarks: prefs.syncBookmarks ? mergedBookmarks : undefined,
        folders: prefs.syncBookmarks ? mergedFolders : undefined,
        history: prefs.syncHistory ? mergedHistory.slice(0, 300) : undefined,
        encryptedPasswords: encryptedPassPayload?.ciphertext,
        passwordsSalt: encryptedPassPayload?.salt,
        passwordsIv: encryptedPassPayload?.iv,
        settings: prefs.syncSettings ? mergedSettings : undefined,
        workspaces: prefs.syncWorkspaces ? mergedWorkspaces : undefined
      };

      const envelope = await encryptSyncPayload(newBundle, this.masterKey);
      const supabase = await getSupabaseClient();
      const { error: upsertError } = await supabase.from('nova_sync_vaults').upsert({
        user_id: this.currentUser.id,
        envelope,
        updated_at: new Date().toISOString()
      });
      if (upsertError) throw upsertError;

      // The remote vault is now encrypted under the dedicated sync key, so
      // the retained legacy raw-password material is no longer needed — wipe
      // it from memory and the secure store.
      if (this.usedLegacyKeyThisSync) {
        this.usedLegacyKeyThisSync = false;
        this.legacyMasterKey = null;
        void this.writeSecureStore(this.legacyMasterKeyStoreName(), '');
      }

      this.lastSyncedAt = syncTimestamp;
      localStorage.setItem(STORAGE_KEYS.SYNC_STATUS, JSON.stringify({ lastSyncedAt: this.lastSyncedAt }));

      const syncedCounts = {
        bookmarks: mergedBookmarks.length,
        history: mergedHistory.length,
        passwords: mergedPasswords.length,
        workspaces: mergedWorkspaces.length
      };

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
        syncedItemsCount: syncedCounts
      };
    } catch (err: any) {
      this.isSyncing = false;
      this.lastError = err.message || 'Sync failed';
      this.notify();
      throw err;
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

  public static normalizeSyncCode = normalizeSyncCode;
  public static formatSyncCode = formatSyncCode;

  public async generateSyncChainCode(currentData?: Partial<SyncDataBundle>): Promise<string> {
    const rawHex = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    const code = NovaSyncService.formatSyncCode(rawHex);

    if (this.currentUser) {
      this.currentUser.syncCode = code;
      void this.writeStoredUser(this.currentUser).catch(() => {
        // Best-effort only — sync code generation must not fail on persistence.
      });
    }
    this.notify();
    return code;
  }

  public async joinSyncChain(code: string): Promise<boolean> {
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw new Error('Invalid sync chain code: code is required');
    }
    const cleanCode = NovaSyncService.normalizeSyncCode(code);
    if (!/^[0-9A-F]{16,32}$/.test(cleanCode)) {
      throw new Error('Invalid sync chain code: expected format nova-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx or 16-32 hexadecimal characters');
    }
    const formattedCode = NovaSyncService.formatSyncCode(cleanCode);
    if (this.currentUser) {
      this.currentUser.syncCode = formattedCode;
      await this.writeStoredUser(this.currentUser).catch(() => {
        // Best-effort only — joining must not fail on persistence.
      });
    }
    this.notify();
    return true;
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach(fn => fn(status));
  }
}

export const syncService = new NovaSyncService();
