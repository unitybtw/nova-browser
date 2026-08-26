/**
 * Nova Browser Supabase Client
 * Manages Supabase connection, credentials, and real-time syncing.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isCustom: boolean;
}

const STORAGE_KEY = 'nova_supabase_config';

// Auth storage key used by supabase-js. Exported so the sync service can
// scrub stale JWT copies from localStorage on logout (H-4: sessions now live
// in the OS-keychain-backed secure store, not Web Storage).
export const SUPABASE_AUTH_STORAGE_KEY = 'nova_sb_auth_token';

// M-4: a custom endpoint read from localStorage must never be blindly
// trusted — it could otherwise point the anon key at an attacker-controlled
// host. Only accept genuine Supabase project URLs of the form
// https://<project-ref>.supabase.co. Project refs are lowercase alphanumeric
// IDs; they are commonly 20 chars but vary in length, so accept [a-z0-9]{10,}
// instead of a fixed width. Anything else falls back to the env default.
const CUSTOM_SUPABASE_URL_PATTERN = /^https:\/\/[a-z0-9]{10,}\.supabase\.co$/;

const isValidCustomSupabaseUrl = (url: unknown): url is string =>
  typeof url === 'string' && CUSTOM_SUPABASE_URL_PATTERN.test(url);

// Default Supabase project endpoints for Nova Cloud Sync
const DEFAULT_CONFIG: SupabaseConfig = {
  url: import.meta.env?.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
  isCustom: false
};

let cachedClient: SupabaseClient | null = null;
let currentConfigKey = '';

export const getSupabaseConfig = (): SupabaseConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        if (!isValidCustomSupabaseUrl(parsed.url)) {
          console.warn('[SupabaseConfig] Rejected untrusted custom Supabase URL; falling back to default config.');
        } else {
          return { url: parsed.url, anonKey: String(parsed.anonKey), isCustom: true };
        }
      }
    }
  } catch (e) {
    console.error('[SupabaseConfig] Failed to load config:', e);
  }
  return DEFAULT_CONFIG;
};

export const saveSupabaseConfig = (url: string, anonKey: string): void => {
  const cleanUrl = url.trim().replace(/\/$/, '');
  const cleanKey = anonKey.trim();

  if (!cleanUrl || !cleanKey) {
    localStorage.removeItem(STORAGE_KEY);
    cachedClient = null;
    currentConfigKey = '';
    return;
  }

  const newConfig: SupabaseConfig = {
    url: cleanUrl,
    anonKey: cleanKey,
    isCustom: true
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  cachedClient = null;
  currentConfigKey = '';
};

// --- H-4: secure session storage -------------------------------------------

const hasElectronSecureStore = (): boolean =>
  typeof window !== 'undefined' &&
  Boolean((window as any).electronAPI?.secureStoreSet) &&
  Boolean((window as any).electronAPI?.secureStoreGet);

/**
 * supabase-js storage adapter backed by the Electron secure store
 * (safeStorage-encrypted files in the main process). Keeps refresh/access
 * tokens out of localStorage entirely.
 */
const electronSecureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await (window as any).electronAPI.secureStoreGet(key);
      // The bridge has no remove API; logout overwrites with ''. Treat that
      // (and any other empty value) as "no session".
      return typeof value === 'string' && value.length > 0 ? value : null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await (window as any).electronAPI.secureStoreSet(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      // No remove API in the preload bridge — overwrite with an empty string
      // instead (same approach as the sync service's keychain wipe).
      await (window as any).electronAPI.secureStoreSet(key, '');
    } catch {
      // Best-effort only.
    }
  }
};

export const getSupabaseClient = (): SupabaseClient => {
  const config = getSupabaseConfig();
  const configKey = `${config.url}_${config.anonKey}`;

  if (cachedClient && currentConfigKey === configKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
        // H-4: route session persistence (JWTs!) through the OS-keychain-
        // backed secure store instead of localStorage. Falls back to
        // supabase-js' default (localStorage) only when the Electron bridge
        // is unavailable, i.e. plain web dev mode.
        storage: hasElectronSecureStore() ? electronSecureStorage : undefined
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    currentConfigKey = configKey;
    return cachedClient;
  } catch (err) {
    console.warn('[Supabase] Failed to initialize Supabase client:', err);
    // Fallback dummy client if url is malformed
    return createClient('https://fallback.supabase.co', 'dummy', {
      auth: { persistSession: false }
    });
  }
};

export const isSupabaseConfigured = (): boolean => {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey && !config.anonKey.includes('dummyKeyForDemo'));
};
