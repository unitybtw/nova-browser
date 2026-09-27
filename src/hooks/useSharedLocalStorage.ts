import { useCallback, useRef, useSyncExternalStore } from 'react';
import { logger } from '../utils/logger';

type Listener = () => void;

interface Store<T> {
  value: T;
  listeners: Set<Listener>;
  persistent: boolean;
}

const stores = new Map<string, Store<unknown>>();

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    logger.warn('SharedLocalStorage', `Failed to read "${key}" from localStorage`, err);
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    logger.warn('SharedLocalStorage', `Failed to write "${key}" to localStorage`, err);
  }
}

function getStore<T>(key: string, persistent: boolean, parse: (raw: string) => T | null, fallback: () => T): Store<T> {
  const existing = stores.get(key);
  if (existing) return existing as Store<T>;

  let value = fallback();
  if (persistent) {
    const raw = readRaw(key);
    if (raw) {
      try {
        const parsed = parse(raw);
        if (parsed !== null) value = parsed;
      } catch (err) {
        logger.warn('SharedLocalStorage', `Failed to parse "${key}" from localStorage`, err);
      }
    }
  }

  // Sweep stores whose owner never committed — a render React throws away
  // subscribes to nothing and is never cleaned up. Runs before the new entry
  // is inserted so a store created by the render that is about to commit is
  // never a candidate.
  reapOrphanedPrivateStores();

  const store: Store<T> = { value, listeners: new Set(), persistent };
  stores.set(key, store as Store<unknown>);
  return store;
}

/**
 * Drops non-persistent stores that nothing is subscribed to.
 *
 * Persistent stores are deliberately exempt: `nova_speed_dials` and
 * `nova_todos` must keep their value across the moment no tab is showing them,
 * and they are the whole reason this module holds state. A private store's key
 * is namespaced per component instance, so once it has no subscriber there is
 * no way for another instance to reach it — keeping it alive only pinned a
 * `Store`, a `Set` and a full copy of the speed-dial defaults in the Map for
 * every incognito/demo tab ever opened, and for every render React discarded.
 */
function releaseIfUnreferenced(key: string, store: Store<unknown>): void {
  if (store.persistent) return;
  if (store.listeners.size > 0) return;
  // Only evict our own entry: the key may have been reused since.
  if (stores.get(key) === store) stores.delete(key);
}

/** Same policy as {@link releaseIfUnreferenced}, applied to every private store. */
function reapOrphanedPrivateStores(): void {
  for (const [key, store] of stores) {
    if (!store.persistent && store.listeners.size === 0) stores.delete(key);
  }
}

/**
 * localStorage-backed state shared by every component instance in this document.
 *
 * `NewTabPage` is mounted once per tab, so a plain `useState` initialised from
 * localStorage plus a write-back effect gave each tab a private copy and made
 * the last tab to change the list silently overwrite the others: delete a speed
 * dial in tab A, edit a task in tab B, open a third new tab and A's change is
 * gone. `storage` events cannot fix this because the instances live in the same
 * document, so the source of truth has to live in the module.
 *
 * `enabled: false` (incognito, demo) uses a per-instance private store: nothing
 * is read from or written to disk, and no other tab can observe the value.
 */
export function useSharedLocalStorageState<T>(
  key: string,
  parse: (raw: string) => T | null,
  fallback: () => T,
  enabled = true
): [T, (updater: T | ((prev: T) => T)) => void] {
  const privateKeyRef = useRef<string | null>(null);
  if (privateKeyRef.current === null) {
    privateKeyRef.current = `__private__${key}#${Math.random().toString(36).slice(2)}#${Date.now()}`;
  }
  const storeKey = enabled ? key : privateKeyRef.current;

  // The store is resolved once per key; `parse`/`fallback` are only consulted
  // for the first instance, which is why they are intentionally not deps.
  const storeRef = useRef<Store<T> | null>(null);
  if (storeRef.current === null || (storeRef.current as Store<T> & { __key?: string }).__key !== storeKey) {
    const store = getStore(storeKey, enabled, parse, fallback) as Store<T> & { __key?: string };
    store.__key = storeKey;
    storeRef.current = store;
  }
  const store = storeRef.current;

  const subscribe = useCallback((listener: Listener) => {
    store.listeners.add(listener);
    return () => {
      store.listeners.delete(listener);
      // `useSyncExternalStore` re-subscribes the same store object on demand
      // and `getSnapshot` keeps reading `store.value` from the reference this
      // component already holds, so evicting the Map entry cannot hand a
      // mounted component a different store or a fresh object identity.
      releaseIfUnreferenced(storeKey, store);
    };
  }, [store, storeKey]);

  const getSnapshot = useCallback(() => store.value, [store]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const next = typeof updater === 'function' ? (updater as (prev: T) => T)(store.value) : updater;
      if (Object.is(next, store.value)) return;
      store.value = next;
      if (store.persistent) writeRaw(storeKey, JSON.stringify(next));
      store.listeners.forEach(listener => listener());
    },
    [store, storeKey]
  );

  return [value, setValue];
}
