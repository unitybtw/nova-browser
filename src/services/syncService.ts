/**
 * Nova Browser Cloud Sync & Account Service
 *
 * Supabase-backed E2EE sync vault: data is stored as a version-2 envelope
 * (AES-GCM-256, PBKDF2-SHA256 600k iterations — see syncCrypto.ts), encrypted
 * with a master key derived from the account password (min 12 chars). The key
 * is kept in memory and persisted only in the OS-keychain-backed secure store,
 * scoped per user id.
 *
 * Cloud sync requires a Supabase-linked (UUID) account; local fallback
 * accounts cannot sync. Legacy sync-chain/pairing APIs are deprecated (throw).
 */

import { Bookmark, Folder, Tab, Workspace } from '../types/browser';
import { HistoryItem, UserSettings } from '../App';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { decryptSyncPayload, encryptSyncPayload } from './syncCrypto';

export interface NovaUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  lastLoginAt: number;
  syncPreferences: SyncPreferences;
  syncCode?: string;
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
  encryptedPasswords?: string;
  passwordsSalt?: string;
  passwordsIv?: string;
  settings?: Partial<UserSettings>;
  workspaces?: Workspace[];
}

const STORAGE_KEYS = {
  USER: 'nova_auth_user',
  TOKEN: 'nova_auth_token',
  SYNC_STATUS: 'nova_sync_status',
  CLOUD_VAULT_PREFIX: 'nova_cloud_vault_',
  USER_REGISTRY: 'nova_accounts_registry',
  SYNC_CHAIN_REGISTRY: 'nova_sync_chains',
  MASTER_KEY: 'nova_e2ee_master_key'
};

// Key used in the Electron main-process secure store (safeStorage-encrypted).
// The E2EE master key is never persisted in Web Storage. Entries are scoped
// per user id (see masterKeyStoreName) so one account's key can never be
// restored for another; this constant is the legacy/global fallback name.
const SECURE_STORE_MASTER_KEY = 'sync_master_key';

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
  private masterKey: string | null = null;
  private realtimeChannel: any = null;

  constructor() {
    this.loadSession();
    this.initSupabaseListener();
  }

  /**
   * Secure-store key for the E2EE master key, scoped per user so a failed
   * persist for account B can never cause account A's key to be restored
   * for B. Falls back to the legacy global name when no user is set.
   */
  private masterKeyStoreName(): string {
    return this.currentUser ? `sync_master_key_${this.currentUser.id}` : SECURE_STORE_MASTER_KEY;
  }

  /**
   * Fire-and-forget persistence of the E2EE master key into the OS-level
   * encrypted secure store (safeStorage in the main process) so sync keeps
   * working after an app restart. Best-effort: never throws, never blocks
   * the auth flow, and is a no-op outside the Electron renderer.
   */
  private persistMasterKeyBestEffort(): void {
    if (typeof window === 'undefined') return;
    const api = (window as any).electronAPI;
    if (!api?.secureStoreSet) return;
    void (async () => {
      try {
        // Re-check at execution time in case the user logged out meanwhile.
        if (!this.masterKey || !this.currentUser) return;
        await api.secureStoreSet(this.masterKeyStoreName(), this.masterKey);
      } catch {
        // Best-effort only — sync still works for the current session.
      }
    })();
  }

  private loadSession() {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const savedStatus = localStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
      
      if (savedUser && savedToken) {
        const parsedUser: NovaUser = JSON.parse(savedUser);
        this.currentUser = parsedUser;
        this.token = savedToken;

        // The E2EE master key is memory-only and never stored in Web Storage,
        // so restore it from the OS-encrypted secure store in the background.
        // Without it the session would look logged-in while every sync fails.
        // The store name is derived from the restored user (NOT
        // this.currentUser, which may change before the async read runs) so
        // accounts can't cross-contaminate each other's keys.
        if (typeof window !== 'undefined' && (window as any).electronAPI?.secureStoreGet) {
          void (async () => {
            try {
              const storeName = parsedUser?.id ? `sync_master_key_${parsedUser.id}` : SECURE_STORE_MASTER_KEY;
              const stored = await (window as any).electronAPI.secureStoreGet(storeName);
              if (stored && !this.masterKey && this.currentUser) {
                this.masterKey = stored;
              }
            } catch (e) {
              console.warn('[NovaSync] Failed to restore master key from secure store:', e);
            }
          })();
        }
      }
      if (savedStatus) {
        const parsed = JSON.parse(savedStatus);
        this.lastSyncedAt = parsed.lastSyncedAt || null;
      }
    } catch (e) {
      console.error('[NovaSync] Failed to restore sync session:', e);
    }
  }

  private async initSupabaseListener() {
    try {
      if (!isSupabaseConfigured()) return;
      const supabase = getSupabaseClient();
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
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
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
          localStorage.setItem(STORAGE_KEYS.TOKEN, this.token);
          this.subscribeToRealtime();
          this.notify();
        } else if (event === 'SIGNED_OUT') {
          this.unsubscribeFromRealtime();
        }
      });
    } catch (e) {
      console.warn('[NovaSync] Supabase listener init skipped:', e);
    }
  }

  private subscribeToRealtime() {
    if (!this.currentUser || !isSupabaseConfigured()) return;
    try {
      const supabase = getSupabaseClient();
      this.unsubscribeFromRealtime();

      // NOTE: the legacy branch that subscribed to `nova_sync_chains` for
      // users with a persisted syncCode was removed — that table no longer
      // exists in the schema, so such a subscription could never deliver
      // events. Only the vault subscription remains.
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
            this.remoteSyncListeners.forEach(fn => fn());
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[NovaSync] Realtime subscribe failed:', e);
    }
  }

  private unsubscribeFromRealtime() {
    if (this.realtimeChannel) {
      try {
        const supabase = getSupabaseClient();
        supabase.removeChannel(this.realtimeChannel);
      } catch (e) {}
      this.realtimeChannel = null;
    }
  }

  // --- CRYPTOGRAPHY / E2EE ---

  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  public async encryptPasswords(passwords: any[], masterPassword: string): Promise<{ ciphertext: string; salt: string; iv: string }> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(masterPassword, salt);
    
    const enc = new TextEncoder();
    const plaintext = enc.encode(JSON.stringify(passwords));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext
    );

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv))
    };
  }

  public async decryptPasswords(ciphertext: string, saltStr: string, ivStr: string, masterPassword: string): Promise<any[]> {
    try {
      const salt = new Uint8Array(atob(saltStr).split('').map(c => c.charCodeAt(0)));
      const iv = new Uint8Array(atob(ivStr).split('').map(c => c.charCodeAt(0)));
      const encryptedData = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
      
      const key = await this.deriveKey(masterPassword, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
      );

      const dec = new TextDecoder();
      return JSON.parse(dec.decode(decrypted));
    } catch (err) {
      console.error('[NovaSync] E2EE decryption failed:', err);
      throw new Error('Incorrect master password or corrupted sync payload');
    }
  }

  // --- BRAVE-STYLE SYNC CHAIN (DEVICE PAIRING CODE) ---

  /**
   * Generates a human-friendly pairing code (e.g. `nova-7f2a-99b1-4c3e-8812`)
   * and registers the current encrypted vault into the Sync Chain network.
   */
  public async generateSyncChainCode(localData: {
    bookmarks: Bookmark[];
    folders: Folder[];
    history: HistoryItem[];
    passwords: any[];
    settings: UserSettings;
    workspaces: Workspace[];
  }): Promise<string> {
    throw new Error('Pairing is temporarily unavailable while secure invitation RPC deployment is completed.');
    /*
    const randomSegments = Array.from({ length: 4 }, () => 
      Math.random().toString(36).substring(2, 6)
    );
    const syncCode = `nova-${randomSegments.join('-')}`;
    const syncSecret = syncCode.replace(/-/g, '');

    let encryptedPassPayload: { ciphertext: string; salt: string; iv: string } | undefined;
    if (localData.passwords.length > 0) {
      encryptedPassPayload = await this.encryptPasswords(localData.passwords, syncSecret);
    }

    const payload: SyncDataBundle = {
      version: 1,
      timestamp: Date.now(),
      userId: syncCode,
      bookmarks: localData.bookmarks,
      folders: localData.folders,
      history: localData.history.slice(0, 1000),
      encryptedPasswords: encryptedPassPayload?.ciphertext,
      passwordsSalt: encryptedPassPayload?.salt,
      passwordsIv: encryptedPassPayload?.iv,
      settings: localData.settings,
      workspaces: localData.workspaces
    };

    // 1. Push to Supabase Cloud if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('nova_sync_chains').upsert({
          sync_code: syncCode,
          payload,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('[NovaSync] Supabase sync chain upsert failed:', err);
      }
    }

    // 2. Save to local sync chains registry
    const chainsRaw = localStorage.getItem(STORAGE_KEYS.SYNC_CHAIN_REGISTRY);
    const chains: Record<string, { payload: SyncDataBundle; createdAt: number }> = chainsRaw ? JSON.parse(chainsRaw) : {};
    chains[syncCode] = { payload, createdAt: Date.now() };
    localStorage.setItem(STORAGE_KEYS.SYNC_CHAIN_REGISTRY, JSON.stringify(chains));

    // Also link to current user session
    if (!this.currentUser) {
      const pairedUser: NovaUser = {
        id: syncCode,
        email: `${syncCode}@sync.nova`,
        displayName: 'Paired Device',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        syncPreferences: { ...DEFAULT_PREFERENCES },
        syncCode
      };
      this.currentUser = pairedUser;
      this.token = 'nvt_chain_' + syncCode;
      this.masterKey = syncSecret;
      sessionStorage.setItem(STORAGE_KEYS.MASTER_KEY, syncSecret);
      localStorage.setItem(STORAGE_KEYS.MASTER_KEY, syncSecret);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(pairedUser));
      localStorage.setItem(STORAGE_KEYS.TOKEN, this.token);
      this.subscribeToRealtime();
      this.notify();
    }

    return syncCode;
    */
  }

  /**
   * Joins an existing sync chain using a pairing code entered on another computer
   */
  public async joinSyncChain(syncCode: string): Promise<SyncDataBundle> {
    throw new Error('Pairing is temporarily unavailable while secure invitation RPC deployment is completed.');
    /*
    const cleanCode = syncCode.trim().toLowerCase();
    if (!cleanCode.startsWith('nova-')) {
      throw new Error('Invalid Nova Sync Code format (should look like nova-xxxx-xxxx-xxxx-xxxx)');
    }

    let remotePayload: SyncDataBundle | null = null;
    let recordCreatedAt = Date.now();

    // 1. Check Supabase Cloud first
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('nova_sync_chains')
          .select('*')
          .eq('sync_code', cleanCode)
          .maybeSingle();

        if (!error && data && data.payload) {
          remotePayload = data.payload;
          if (data.created_at) recordCreatedAt = new Date(data.created_at).getTime();
        }
      } catch (err) {
        console.warn('[NovaSync] Supabase sync chain fetch failed:', err);
      }
    }

    // 2. Fallback to local registry
    if (!remotePayload) {
      const chainsRaw = localStorage.getItem(STORAGE_KEYS.SYNC_CHAIN_REGISTRY);
      const chains: Record<string, { payload: SyncDataBundle; createdAt: number }> = chainsRaw ? JSON.parse(chainsRaw) : {};
      const record = chains[cleanCode];
      if (record && record.payload) {
        remotePayload = record.payload;
        recordCreatedAt = record.createdAt;
      }
    }

    if (!remotePayload) {
      throw new Error('Sync code not found or expired. Please generate a fresh code on your other device.');
    }

    const syncSecret = cleanCode.replace(/-/g, '');
    const remoteBundle = remotePayload;

    // Decrypt passwords if present
    let decryptedPasswords: any[] = [];
    if (remoteBundle.encryptedPasswords && remoteBundle.passwordsSalt && remoteBundle.passwordsIv) {
      try {
        decryptedPasswords = await this.decryptPasswords(
          remoteBundle.encryptedPasswords,
          remoteBundle.passwordsSalt,
          remoteBundle.passwordsIv,
          syncSecret
        );
      } catch (e) {
        console.warn('[NovaSync] Password decrypt with sync code failed:', e);
      }
    }

    const joinedUser: NovaUser = {
      id: cleanCode,
      email: `${cleanCode}@sync.nova`,
      displayName: 'Synced Device',
      createdAt: recordCreatedAt,
      lastLoginAt: Date.now(),
      syncPreferences: { ...DEFAULT_PREFERENCES },
      syncCode: cleanCode
    };

    this.currentUser = joinedUser;
    this.token = 'nvt_chain_' + cleanCode;
    this.masterKey = syncSecret;
    sessionStorage.setItem(STORAGE_KEYS.MASTER_KEY, syncSecret);
    localStorage.setItem(STORAGE_KEYS.MASTER_KEY, syncSecret);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(joinedUser));
    localStorage.setItem(STORAGE_KEYS.TOKEN, this.token);
    this.lastSyncedAt = Date.now();
    localStorage.setItem(STORAGE_KEYS.SYNC_STATUS, JSON.stringify({ lastSyncedAt: this.lastSyncedAt }));

    this.subscribeToRealtime();
    this.notify();
    return {
      ...remoteBundle,
      bookmarks: remoteBundle.bookmarks || [],
      folders: remoteBundle.folders || [],
      history: remoteBundle.history || [],
      settings: remoteBundle.settings || ({} as any),
      workspaces: remoteBundle.workspaces || []
    };
    */
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
        const supabase = getSupabaseClient();
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
        this.token = data.session?.access_token || 'sb_token_' + Date.now();
        this.masterKey = password;
        this.persistMasterKeyBestEffort();

        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
        localStorage.setItem(STORAGE_KEYS.TOKEN, this.token);

        this.subscribeToRealtime();
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
    const registryRaw = localStorage.getItem(STORAGE_KEYS.USER_REGISTRY);
    const registry: Record<string, { user: NovaUser; passwordHash: string }> = registryRaw ? JSON.parse(registryRaw) : {};

    if (registry[normalizedEmail]) {
      throw new Error('An account with this email already exists');
    }

    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(password + ':' + normalizedEmail));
    const passwordHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const userId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newUser: NovaUser = {
      id: userId,
      email: normalizedEmail,
      displayName: finalName,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      syncPreferences: { ...DEFAULT_PREFERENCES }
    };

    registry[normalizedEmail] = { user: newUser, passwordHash };
    localStorage.setItem(STORAGE_KEYS.USER_REGISTRY, JSON.stringify(registry));

    this.currentUser = newUser;
    this.token = 'nvt_' + btoa(`${userId}:${Date.now()}`);
    this.masterKey = password;
    this.persistMasterKeyBestEffort();

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEYS.TOKEN, this.token);

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
        const supabase = getSupabaseClient();
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
        this.masterKey = password;
        this.persistMasterKeyBestEffort();

        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(loggedUser));
        localStorage.setItem(STORAGE_KEYS.TOKEN, this.token);

        this.subscribeToRealtime();
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
    const registryRaw = localStorage.getItem(STORAGE_KEYS.USER_REGISTRY);
    const registry: Record<string, { user: NovaUser; passwordHash: string }> = registryRaw ? JSON.parse(registryRaw) : {};

    const account = registry[normalizedEmail];
    if (!account) {
      throw new Error('Invalid email or password');
    }

    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(password + ':' + normalizedEmail));
    const calculatedHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (calculatedHash !== account.passwordHash) {
      throw new Error('Invalid email or password');
    }

    account.user.lastLoginAt = Date.now();
    registry[normalizedEmail] = account;
    localStorage.setItem(STORAGE_KEYS.USER_REGISTRY, JSON.stringify(registry));

    this.currentUser = account.user;
    this.token = 'nvt_' + btoa(`${account.user.id}:${Date.now()}`);
    this.masterKey = password;
    this.persistMasterKeyBestEffort();

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(account.user));
    localStorage.setItem(STORAGE_KEYS.TOKEN, this.token);

    this.notify();
    return account.user;
  }

  public async logout() {
    this.unsubscribeFromRealtime();
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
      } catch (e) {}
    }

    // Best-effort wipe of the persisted master key. The preload bridge has no
    // remove API, so overwrite it with an empty string instead. The store
    // entry is scoped per user, so capture the name BEFORE clearing
    // currentUser below.
    const masterKeyStore = this.masterKeyStoreName();
    if (typeof window !== 'undefined' && (window as any).electronAPI?.secureStoreSet) {
      void (async () => {
        try {
          await (window as any).electronAPI.secureStoreSet(masterKeyStore, '');
        } catch {}
      })();
    }

    this.currentUser = null;
    this.token = null;
    this.masterKey = null;
    this.lastSyncedAt = null;

    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.SYNC_STATUS);
    // Legacy cleanup: older builds leaked the master key into Web Storage.
    localStorage.removeItem(STORAGE_KEYS.MASTER_KEY);
    sessionStorage.removeItem(STORAGE_KEYS.MASTER_KEY);

    this.notify();
  }

  public updatePreferences(prefs: Partial<SyncPreferences>) {
    if (!this.currentUser) return;
    this.currentUser.syncPreferences = {
      ...this.currentUser.syncPreferences,
      ...prefs
    };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
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
    this.notify();

    try {
      const prefs = this.currentUser.syncPreferences || DEFAULT_PREFERENCES;
      let remoteBundle: SyncDataBundle | null = null;
      let remoteUnusable = false;

      // 1. Fetch and decrypt the remote vault. A missing vault (0 rows) is a
      // normal first-sync; an unreadable one must ABORT the push or we would
      // clobber another device's data with a local-only merge.
      try {
        const supabase = getSupabaseClient();
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
            remoteUnusable = true;
            console.warn('[NovaSync] Failed to decrypt remote vault — aborting push to prevent data loss', decErr);
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
            console.warn('[NovaSync] Skipping password decrypt:', e);
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
        history: prefs.syncHistory ? mergedHistory.slice(0, 1000) : undefined,
        encryptedPasswords: encryptedPassPayload?.ciphertext,
        passwordsSalt: encryptedPassPayload?.salt,
        passwordsIv: encryptedPassPayload?.iv,
        settings: prefs.syncSettings ? mergedSettings : undefined,
        workspaces: prefs.syncWorkspaces ? mergedWorkspaces : undefined
      };

      const supabase = getSupabaseClient();
      const envelope = await encryptSyncPayload(newBundle, this.masterKey);
      const { error: upsertError } = await supabase.from('nova_sync_vaults').upsert({
        user_id: this.currentUser.id,
        envelope,
        updated_at: new Date().toISOString()
      });
      if (upsertError) throw upsertError;

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

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach(fn => fn(status));
  }
}

export const syncService = new NovaSyncService();
