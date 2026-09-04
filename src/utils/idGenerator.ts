/**
 * Collision-free UUID and unique identifier generation.
 * Uses crypto.randomUUID when available with CSPRNG RFC4122 v4 fallback.
 * Browser-safe: relies only on `globalThis.crypto` — no `require('crypto')`
 * or `node:crypto` imports, so the Vite browser bundle never breaks.
 */
interface RuntimeCrypto {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
}

export function generateId(prefix?: string): string {
  let id: string;
  const runtimeCrypto: RuntimeCrypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  if (runtimeCrypto && typeof runtimeCrypto.randomUUID === 'function') {
    id = runtimeCrypto.randomUUID();
  } else if (runtimeCrypto && typeof runtimeCrypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    runtimeCrypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // RFC4122 v4
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } else {
    // Last resort (no WebCrypto available): mix Date.now with Math.random.
    // Not cryptographically strong — only for non-security contexts.
    const bytes = new Uint8Array(16);
    let time = Date.now();
    for (let i = 0; i < 16; i++) {
      const timeByte = time % 256;
      time = Math.floor(time / 256);
      bytes[i] = Math.floor(Math.random() * 256) ^ timeByte;
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return prefix ? `${prefix}_${id}` : id;
}
