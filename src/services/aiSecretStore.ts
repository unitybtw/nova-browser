import { getElectronAPI, type ElectronAPI } from '../utils/electronBridge';
import { logger } from '../utils/logger';
import type { UserSettings } from '../types/browser';

export const SECURE_STORE_AI_API_KEY = 'ai_custom_api_key';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type SecretStoreElectronDeps = Partial<
  Pick<ElectronAPI, 'secureStoreGet' | 'secureStoreSet' | 'secureStoreDelete' | 'storeGet' | 'storeSet'>
>;

export interface AiSecretStoreDeps {
  storage?: StorageLike | null;
  api?: SecretStoreElectronDeps | null;
}

let cachedApiKey = '';
let pendingLegacyApiKey = '';
let inFlightLoad: Promise<string> | null = null;

function resolveStorage(deps?: AiSecretStoreDeps): StorageLike | null {
  if (deps && deps.storage !== undefined) return deps.storage;
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function resolveApi(deps?: AiSecretStoreDeps): SecretStoreElectronDeps | undefined {
  if (deps && deps.api !== undefined) return deps.api ?? undefined;
  return getElectronAPI();
}

export function getCachedCustomAiApiKey(): string {
  return cachedApiKey || pendingLegacyApiKey;
}

export function setCachedCustomAiApiKey(val: string): void {
  cachedApiKey = typeof val === 'string' ? val : '';
  if (cachedApiKey) {
    pendingLegacyApiKey = '';
  }
}

export function sanitizeSettingsForPersistence<T extends Partial<UserSettings>>(settings: T): T {
  if (!settings || typeof settings !== 'object') return settings;
  if (!('aiCustomApiKey' in settings) || settings.aiCustomApiKey === '') {
    return settings;
  }
  return {
    ...settings,
    aiCustomApiKey: '',
  };
}

function scrubPlaintextLocalStorage(storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.removeItem('nova_ai_custom_api_key');
  } catch {}
  try {
    const rawSettings = storage.getItem('user_settings');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed && typeof parsed === 'object' && typeof parsed.aiCustomApiKey === 'string' && parsed.aiCustomApiKey.length > 0) {
        parsed.aiCustomApiKey = '';
        storage.setItem('user_settings', JSON.stringify(parsed));
      }
    }
  } catch (err) {
    logger.warn('AISecretStore', 'Failed to scrub legacy aiCustomApiKey from localStorage user_settings', err);
  }
}

async function scrubPlaintextDiskStore(api?: SecretStoreElectronDeps): Promise<void> {
  if (!api?.storeGet || !api?.storeSet) return;
  try {
    const rawDisk = await api.storeGet('user_settings');
    if (rawDisk) {
      const parsed = JSON.parse(rawDisk);
      if (parsed && typeof parsed === 'object' && typeof parsed.aiCustomApiKey === 'string' && parsed.aiCustomApiKey.length > 0) {
        parsed.aiCustomApiKey = '';
        await api.storeSet('user_settings', JSON.stringify(parsed));
      }
    }
  } catch (err) {
    logger.warn('AISecretStore', 'Failed to scrub legacy aiCustomApiKey from disk user_settings', err);
  }
}

/**
 * Synchronously captures any legacy plaintext API key from Web Storage into memory
 * before scrubbed settings overwrite `user_settings`, preventing accidental key loss
 * during one-time migration into Electron OS `safeStorage`.
 */
export function captureLegacyCustomAiApiKeySync(deps?: AiSecretStoreDeps): string {
  if (cachedApiKey) return cachedApiKey;
  if (pendingLegacyApiKey) return pendingLegacyApiKey;
  const storage = resolveStorage(deps);
  if (!storage) return '';

  try {
    const legacySingle = storage.getItem('nova_ai_custom_api_key');
    if (legacySingle && legacySingle.trim().length > 0) {
      pendingLegacyApiKey = legacySingle;
      storage.removeItem('nova_ai_custom_api_key');
    }
  } catch {}

  if (!pendingLegacyApiKey) {
    try {
      const rawSettings = storage.getItem('user_settings');
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed && typeof parsed === 'object' && typeof parsed.aiCustomApiKey === 'string' && parsed.aiCustomApiKey.trim().length > 0) {
          pendingLegacyApiKey = parsed.aiCustomApiKey;
        }
      }
    } catch {}
  }

  if (pendingLegacyApiKey) {
    cachedApiKey = pendingLegacyApiKey;
  }
  return pendingLegacyApiKey;
}

export function registerPendingLegacyCustomAiApiKey(val: string | undefined | null): void {
  if (typeof val === 'string' && val.trim().length > 0 && !cachedApiKey) {
    pendingLegacyApiKey = val;
    cachedApiKey = val;
  }
}

/**
 * Loads the custom AI API key from Electron's OS-backed `safeStorage` (`secureStore`),
 * transparently migrating & scrubbing any legacy plaintext key found in `user_settings`.
 */
export async function loadCustomAiApiKey(deps?: AiSecretStoreDeps): Promise<string> {
  if (!deps && inFlightLoad) return inFlightLoad;

  const run = (async () => {
    const storage = resolveStorage(deps);
    const api = resolveApi(deps);
    captureLegacyCustomAiApiKeySync({ storage });

    if (api?.secureStoreGet) {
      try {
        const stored = await api.secureStoreGet(SECURE_STORE_AI_API_KEY);
        if (typeof stored === 'string' && stored.length > 0) {
          cachedApiKey = stored;
          pendingLegacyApiKey = '';
          scrubPlaintextLocalStorage(storage);
          await scrubPlaintextDiskStore(api);
          return cachedApiKey;
        }
      } catch (err) {
        logger.warn('AISecretStore', 'Failed to read AI API key from secure store', err);
      }
    }

    let legacyCandidate = pendingLegacyApiKey || cachedApiKey;
    if (!legacyCandidate && api?.storeGet) {
      try {
        const rawDisk = await api.storeGet('user_settings');
        if (rawDisk) {
          const parsed = JSON.parse(rawDisk);
          if (parsed && typeof parsed === 'object' && typeof parsed.aiCustomApiKey === 'string' && parsed.aiCustomApiKey.trim().length > 0) {
            legacyCandidate = parsed.aiCustomApiKey;
          }
        }
      } catch {}
    }

    if (legacyCandidate && legacyCandidate.trim().length > 0) {
      cachedApiKey = legacyCandidate;
      if (api?.secureStoreSet) {
        try {
          const persisted = await api.secureStoreSet(SECURE_STORE_AI_API_KEY, legacyCandidate);
          if (!persisted) {
            logger.warn('AISecretStore', 'secureStoreSet did not persist migrated key; keeping key in memory only');
          }
        } catch (err) {
          logger.warn('AISecretStore', 'Failed to migrate AI API key into secure store', err);
        }
      }
      pendingLegacyApiKey = '';
      scrubPlaintextLocalStorage(storage);
      await scrubPlaintextDiskStore(api);
    }

    return cachedApiKey;
  })();

  if (deps) return run;

  inFlightLoad = run;
  try {
    return await run;
  } finally {
    inFlightLoad = null;
  }
}

/**
 * Saves the custom AI API key to Electron OS-backed `safeStorage` (`secureStore`)
 * and removes any plaintext copy from Web Storage and disk `user_settings`.
 */
export async function saveCustomAiApiKey(apiKey: string, deps?: AiSecretStoreDeps): Promise<{ ok: boolean; persisted: boolean }> {
  const storage = resolveStorage(deps);
  const api = resolveApi(deps);
  const normalized = typeof apiKey === 'string' ? apiKey : '';
  cachedApiKey = normalized;
  pendingLegacyApiKey = '';
  scrubPlaintextLocalStorage(storage);

  if (!normalized.trim()) {
    cachedApiKey = '';
    if (api?.secureStoreDelete) {
      try {
        await api.secureStoreDelete(SECURE_STORE_AI_API_KEY);
      } catch (err) {
        logger.warn('AISecretStore', 'Failed to delete AI API key from secure store', err);
      }
    }
    await scrubPlaintextDiskStore(api);
    return { ok: true, persisted: Boolean(api?.secureStoreDelete) };
  }

  if (api?.secureStoreSet) {
    try {
      const persisted = await api.secureStoreSet(SECURE_STORE_AI_API_KEY, normalized);
      await scrubPlaintextDiskStore(api);
      return { ok: Boolean(persisted), persisted: Boolean(persisted) };
    } catch (err) {
      logger.warn('AISecretStore', 'Failed to store AI API key in secure store', err);
      return { ok: false, persisted: false };
    }
  }

  return { ok: true, persisted: false };
}
