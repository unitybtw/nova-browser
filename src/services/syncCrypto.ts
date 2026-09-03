export interface EncryptedSyncEnvelope {
  version: 2;
  ciphertext: string;
  salt: string;
  iv: string;
}

export interface PairingInvitation {
  tokenHash: string;
  expiresAt: number;
  consumedAt: number | null;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Loop-based base64 encoder: avoids the `btoa(String.fromCharCode(...bytes))`
 * spread idiom, which can blow the call stack for large payloads.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000; // 32KB chunks prevent call-stack overflow while avoiding O(n^2) string allocations
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/**
 * PBKDF2-SHA256 @ 600k iterations -> AES-GCM-256 key. Shared by every sync
 * payload encryption path so parameters stay uniform across the codebase.
 * Note: the returned key is non-extractable; callers that need the raw key
 * material as a storable string must derive bits themselves.
 */
export async function deriveKey(passphrase: string, salt: Uint8Array, allowLegacyShort = false): Promise<CryptoKey> {
  if (!passphrase || (!allowLegacyShort && passphrase.length < 12)) {
    throw new Error('Sync passphrase must contain at least 12 characters');
  }
  const material = await crypto.subtle.importKey('raw', textEncoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptSyncPayload(payload: unknown, passphrase: string): Promise<EncryptedSyncEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plaintext = textEncoder.encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { version: 2, ciphertext: bytesToBase64(new Uint8Array(encrypted)), salt: bytesToBase64(salt), iv: bytesToBase64(iv) };
}

export async function decryptSyncPayload<T>(envelope: EncryptedSyncEnvelope, passphrase: string): Promise<T> {
  if (!envelope || envelope.version !== 2 || !envelope.ciphertext || !envelope.salt || !envelope.iv) {
    throw new Error('Invalid encrypted sync payload');
  }
  // Allow legacy passphrases during decryption to prevent locking out older users
  const key = await deriveKey(passphrase, base64ToBytes(envelope.salt), true);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
    key,
    base64ToBytes(envelope.ciphertext)
  );
  return JSON.parse(textDecoder.decode(plaintext)) as T;
}

export function createPairingToken(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function hashPairingToken(token: string): Promise<string> {
  if (!token) throw new Error('Pairing token is required');
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(token));
  return bytesToBase64(new Uint8Array(digest));
}

export function isInvitationUsable(invitation: PairingInvitation, now = Date.now()): boolean {
  return Boolean(invitation?.tokenHash) && invitation.consumedAt === null && Number.isFinite(invitation.expiresAt) && invitation.expiresAt > now;
}
