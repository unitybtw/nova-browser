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
        return { ...parsed, isCustom: true };
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
        storageKey: 'nova_sb_auth_token'
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
