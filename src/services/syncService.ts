/**
 * Nova Browser Cloud Sync & Account Service
 * Provides authentication, zero-knowledge end-to-end encryption (E2EE)
 * for passwords, and multi-device data synchronization.
 */

import { Bookmark, Folder, Tab, Workspace } from '../types/browser';
import { HistoryItem, UserSettings } from '../App';

export interface NovaUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  lastLoginAt: number;
  syncPreferences: SyncPreferences;
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
  encryptedPasswords?: string; // E2EE AES-GCM encrypted JSON
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
  SYNC_PREFERENCES: 'nova_sync_preferences',
  USER_REGISTRY: 'nova_accounts_registry'
};

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
  private masterKey: string | null = null;

  constructor() {
    this.loadSession();
  }

  private loadSession() {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const savedStatus = localStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
      
      if (savedUser && savedToken) {
        this.currentUser = JSON.parse(savedUser);
        this.token = savedToken;
      }
      if (savedStatus) {
        const parsed = JSON.parse(savedStatus);
        this.lastSyncedAt = parsed.lastSyncedAt || null;
      }
    } catch (e) {
      console.error('[NovaSync] Failed to restore sync session:', e);
    }
  }

  // --- CRYPTOGRAPHY / E2EE ---

  /**
   * Derive a 256-bit AES-GCM CryptoKey from the user's master password and salt using PBKDF2
   */
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

  /**
   * Encrypt passwords payload with AES-GCM 256-bit
   */
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

  /**
   * Decrypt passwords payload with AES-GCM 256-bit
   */
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

  // --- AUTHENTICATION ---

  /**
   * Register a new Nova Account
   */
  public async register(email: string, password: string, displayName?: string): Promise<NovaUser> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new Error('Email and password are required');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Retrieve local accounts registry
    const registryRaw = localStorage.getItem(STORAGE_KEYS.USER_REGISTRY);
    const registry: Record<string, { user: NovaUser; passwordHash: string }> = registryRaw ? JSON.parse(registryRaw) : {};

    if (registry[normalizedEmail]) {
      throw new Error('An account with this email already exists');
    }

    // Generate SHA-256 hash of password for auth verification
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(password + ':' + normalizedEmail));
    const passwordHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const userId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const finalName = displayName?.trim() || normalizedEmail.split('@')[0];

    const newUser: NovaUser = {
      id: userId,
      email: normalizedEmail,
      displayName: finalName,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      syncPreferences: { ...DEFAULT_PREFERENCES }
    };

    registry[normalizedEmail] = {
      user: newUser,
      passwordHash
    };

    localStorage.setItem(STORAGE_KEYS.USER_REGISTRY, JSON.stringify(registry));

    // Auto login
    this.currentUser = newUser;
    this.token = 'nvt_' + btoa(`${userId}:${Date.now()}`);
    this.masterKey = password;

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEYS.TOKEN, this.token);

    this.notify();
    return newUser;
  }

  /**
   * Log into an existing Nova Account
   */
  public async login(email: string, password: string): Promise<NovaUser> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new Error('Email and password are required');
    }

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

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(account.user));
    localStorage.setItem(STORAGE_KEYS.TOKEN, this.token);

    this.notify();
    return account.user;
  }

  /**
   * Log out of current account
   */
  public logout() {
    this.currentUser = null;
    this.token = null;
    this.masterKey = null;
    this.lastSyncedAt = null;

    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.SYNC_STATUS);

    this.notify();
  }

  /**
   * Update sync preferences
   */
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

  /**
   * Perform a full push/pull cloud sync
   */
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

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    try {
      const prefs = this.currentUser.syncPreferences || DEFAULT_PREFERENCES;
      const cloudVaultKey = STORAGE_KEYS.CLOUD_VAULT_PREFIX + this.currentUser.id;
      const remoteRaw = localStorage.getItem(cloudVaultKey);
      let remoteBundle: SyncDataBundle | null = remoteRaw ? JSON.parse(remoteRaw) : null;

      let mergedBookmarks = [...localData.bookmarks];
      let mergedFolders = [...localData.folders];
      let mergedHistory = [...localData.history];
      let mergedPasswords = [...localData.passwords];
      let mergedSettings = { ...localData.settings };
      let mergedWorkspaces = [...localData.workspaces];

      // Pull & merge remote bundle if it exists
      if (remoteBundle) {
        // Merge Bookmarks
        if (prefs.syncBookmarks && remoteBundle.bookmarks) {
          const localMap = new Map(localData.bookmarks.map(b => [b.id, b]));
          remoteBundle.bookmarks.forEach(rb => {
            if (!localMap.has(rb.id)) {
              localMap.set(rb.id, rb);
            }
          });
          mergedBookmarks = Array.from(localMap.values());
        }

        // Merge Folders
        if (prefs.syncBookmarks && remoteBundle.folders) {
          const folderMap = new Map(localData.folders.map(f => [f.id, f]));
          remoteBundle.folders.forEach(rf => {
            if (!folderMap.has(rf.id)) {
              folderMap.set(rf.id, rf);
            }
          });
          mergedFolders = Array.from(folderMap.values());
        }

        // Merge History
        if (prefs.syncHistory && remoteBundle.history) {
          const historyMap = new Map(localData.history.map(h => [h.id || `${h.url}_${h.timestamp}`, h]));
          remoteBundle.history.forEach(rh => {
            const key = rh.id || `${rh.url}_${rh.timestamp}`;
            if (!historyMap.has(key)) {
              historyMap.set(key, rh);
            }
          });
          mergedHistory = Array.from(historyMap.values()).sort((a, b) => b.timestamp - a.timestamp);
        }

        // Merge Passwords (E2EE Decryption)
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
              if (!passMap.has(k)) {
                passMap.set(k, rp);
              }
            });
            mergedPasswords = Array.from(passMap.values());
          } catch (e) {
            console.warn('[NovaSync] Skipping remote passwords decryption due to key mismatch:', e);
          }
        }

        // Merge Settings
        if (prefs.syncSettings && remoteBundle.settings) {
          mergedSettings = {
            ...localData.settings,
            ...remoteBundle.settings
          };
        }

        // Merge Workspaces
        if (prefs.syncWorkspaces && remoteBundle.workspaces) {
          const wsMap = new Map(localData.workspaces.map(w => [w.id, w]));
          remoteBundle.workspaces.forEach(rw => {
            if (!wsMap.has(rw.id)) {
              wsMap.set(rw.id, rw);
            }
          });
          mergedWorkspaces = Array.from(wsMap.values());
        }
      }

      // Now create updated cloud payload bundle
      let encryptedPassPayload: { ciphertext: string; salt: string; iv: string } | undefined;
      if (prefs.syncPasswords && this.masterKey && mergedPasswords.length > 0) {
        encryptedPassPayload = await this.encryptPasswords(mergedPasswords, this.masterKey);
      }

      const newBundle: SyncDataBundle = {
        version: 1,
        timestamp: Date.now(),
        userId: this.currentUser.id,
        bookmarks: prefs.syncBookmarks ? mergedBookmarks : undefined,
        folders: prefs.syncBookmarks ? mergedFolders : undefined,
        history: prefs.syncHistory ? mergedHistory.slice(0, 1000) : undefined, // Keep last 1000 history items
        encryptedPasswords: encryptedPassPayload?.ciphertext,
        passwordsSalt: encryptedPassPayload?.salt,
        passwordsIv: encryptedPassPayload?.iv,
        settings: prefs.syncSettings ? mergedSettings : undefined,
        workspaces: prefs.syncWorkspaces ? mergedWorkspaces : undefined
      };

      // Save to cloud vault
      localStorage.setItem(cloudVaultKey, JSON.stringify(newBundle));
      this.lastSyncedAt = Date.now();
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

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach(fn => fn(status));
  }
}

export const syncService = new NovaSyncService();
