/**
 * Safe JSON parsing and storage utilities with non-destructive corrupt backups.
 * Prevents user data loss (bookmarks, history, tabs, settings) if JSON becomes malformed.
 */

const MAX_BACKUPS_PER_KEY = 3;

export function backupCorruptData(key: string, raw: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      const prefix = `${key}_corrupt_backup_`;
      const existingKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          existingKeys.push(k);
        }
      }
      // Cap backups per key to prevent QuotaExceededError
      if (existingKeys.length >= MAX_BACKUPS_PER_KEY) {
        existingKeys.sort(); // timestamps sort chronologically
        const toDelete = existingKeys.slice(0, existingKeys.length - MAX_BACKUPS_PER_KEY + 1);
        for (const oldKey of toDelete) {
          localStorage.removeItem(oldKey);
        }
      }

      // Date.now() alone collides within the same millisecond — add entropy.
      const backupKey = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(backupKey, raw);
      console.warn(`[safeStorage] Corrupt data detected for "${key}". Preserved backup at "${backupKey}".`);
    }
  } catch (err) {
    console.error(`[safeStorage] Failed to create corrupt data backup for "${key}":`, err);
  }
}

export function safeParseWithBackup<T>(
  key: string,
  raw: string | null,
  fallback: T,
  validator?: (val: unknown) => boolean
): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (validator && !validator(parsed)) {
      backupCorruptData(key, raw);
      return fallback;
    }
    return parsed as T;
  } catch (err) {
    backupCorruptData(key, raw);
    return fallback;
  }
}

export function safeParseArrayWithBackup<T>(
  key: string,
  raw: string | null,
  fallback: T[] = []
): T[] {
  return safeParseWithBackup<T[]>(key, raw, fallback, (val): val is T[] => Array.isArray(val));
}

export function safeParseObjectWithBackup<T extends object>(
  key: string,
  raw: string | null,
  fallback: T
): T {
  return safeParseWithBackup<T>(
    key,
    raw,
    fallback,
    (val) => Boolean(val && typeof val === "object" && !Array.isArray(val))
  );
}
