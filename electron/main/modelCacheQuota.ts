import * as fs from 'fs';
import * as path from 'path';

/**
 * Disk budget for the on-disk model cache.
 *
 * The per-file cap alone is not a budget: every distinct CDN URL gets its own
 * file, so a renderer (or a page that influences which model is fetched) could
 * grow `userData/models` without bound and fill the user's disk. This module
 * owns the *policy* as pure functions so it can be tested without Electron,
 * plus a thin filesystem wrapper that main.ts calls.
 */

export const MAX_MODEL_CACHE_FILE_BYTES = 512 * 1024 * 1024;
export const MAX_MODEL_CACHE_TOTAL_BYTES = 1024 * 1024 * 1024;

/**
 * A temp file older than this is from a crashed write, not an in-flight one.
 * The age gate is what makes reclaiming them safe: temp names carry a pid and a
 * uuid, but a concurrent `model-cache-set` for a different model is still
 * writing its own .tmp right now, and deleting that would break its rename.
 */
export const STALE_TEMP_FILE_AGE_MS = 60 * 60 * 1000;

export interface CacheEntry {
  /** File name inside the cache directory (not a path). */
  name: string;
  size: number;
  /** Last-modified time in ms; the eviction order key. */
  mtimeMs: number;
}

export interface EvictionPlan {
  /** File names to delete, least-recently-modified first. */
  evict: string[];
  /** Total size after the planned evictions and the incoming write. */
  projectedTotal: number;
  /** True when the incoming file cannot fit even after evicting everything. */
  impossible: boolean;
}

/**
 * Decide which cached files to drop so that `incomingBytes` fits within
 * `budget`.
 *
 * `replacingName` is the file the incoming write will overwrite. Its current
 * size is excluded from the projection, otherwise re-caching a model that is
 * already present would count its bytes twice and evict a sibling for nothing.
 *
 * Eviction is oldest-first rather than a flat rejection on purpose: the cache
 * is disposable (the renderer re-downloads a miss), so making room keeps the
 * feature working instead of turning a full disk into a broken one.
 */
export function planEviction(
  entries: CacheEntry[],
  incomingBytes: number,
  budget: number = MAX_MODEL_CACHE_TOTAL_BYTES,
  replacingName?: string
): EvictionPlan {
  // A non-finite or negative size would poison the whole projection (NaN
  // compares false against everything, so every bound check silently passes and
  // the result claims to fit while the accounting is meaningless). Real sizes
  // come from fs.stat and are always sane, but this function is exported, so
  // the accounting is defended rather than assumed.
  const size = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  incomingBytes = size(incomingBytes);
  const limit = size(budget) || Number.MAX_SAFE_INTEGER;

  let total = 0;
  for (const e of entries) {
    if (replacingName && e.name === replacingName) continue;
    total += size(e.size);
  }
  const projected = total + incomingBytes;
  if (projected <= limit) {
    return { evict: [], projectedTotal: projected, impossible: false };
  }

  // Oldest first, and never list the file we are about to overwrite.
  const candidates = entries
    .filter((e) => !replacingName || e.name !== replacingName)
    .sort((a, b) => a.mtimeMs - b.mtimeMs || a.name.localeCompare(b.name));

  const evict: string[] = [];
  for (const c of candidates) {
    if (total + incomingBytes <= limit) break;
    evict.push(c.name);
    total -= c.size;
  }

  return {
    evict,
    projectedTotal: total + incomingBytes,
    impossible: total + incomingBytes > limit,
  };
}

/**
 * Apply {@link planEviction} to a real directory. Never throws: a cache that
 * cannot be pruned is a performance problem, not a reason to fail the write.
 */
export async function enforceModelCacheBudget(
  dir: string,
  incomingBytes: number,
  replacingPath: string,
  budget: number = MAX_MODEL_CACHE_TOTAL_BYTES
): Promise<boolean> {
  const replacingName = path.basename(replacingPath);

  let names: string[];
  try {
    names = await fs.promises.readdir(dir);
  } catch {
    return true; // nothing cached yet
  }

  const entries: CacheEntry[] = [];
  for (const name of names) {
    try {
      const st = await fs.promises.stat(path.join(dir, name));
      if (!st.isFile()) continue;
      if (name.includes('.tmp')) {
        // A crashed write leaves a full-size .tmp that no readdir-based eviction
        // would ever reclaim, which is precisely how this directory fills a disk.
        // Only reclaim it once it is provably not in flight.
        if (Date.now() - st.mtimeMs > STALE_TEMP_FILE_AGE_MS) {
          await fs.promises.unlink(path.join(dir, name)).catch(() => {});
        }
        continue;
      }
      entries.push({ name, size: st.size, mtimeMs: st.mtimeMs });
    } catch {
      // Raced with another eviction or removed underneath us; nothing to do.
    }
  }

  const plan = planEviction(entries, incomingBytes, budget, replacingName);
  if (plan.impossible) return false;

  for (const name of plan.evict) {
    try {
      await fs.promises.unlink(path.join(dir, name));
    } catch {
      // Already gone, or not ours to delete.
    }
  }
  return true;
}
