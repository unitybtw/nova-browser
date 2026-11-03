import crypto from 'crypto';
import os from 'os';
import fs from 'fs';
import path from 'path';

/**
 * Validates proxy rules to ensure strictly secure protocols and valid host structure.
 * Only https://, socks5://, and socks5h:// are permitted.
 * Plaintext http:// and socks4:// are rejected.
 * Credentials in URLs are rejected to prevent leakage.
 * Uses WHATWG URL parsing without whole-string lowercasing to preserve URL component semantics.
 */
export function isValidSecureProxy(rawProxyUrl: unknown): boolean {
  if (typeof rawProxyUrl !== 'string') return false;
  const trimmed = rawProxyUrl.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    const isSecureScheme = protocol === 'https:' || protocol === 'socks5:' || protocol === 'socks5h:';
    
    return isSecureScheme &&
           !!parsed.hostname &&
           !parsed.username &&
           !parsed.password;
  } catch {
    return false;
  }
}

/**
 * Normalizes proxy URLs for Chromium's NetworkService.
 * Chromium's setProxy proxyRules only recognizes http, https, socks, socks4, and socks5.
 * It does NOT recognize socks5h:// (which causes Chromium to fall back to direct://, leaking traffic).
 * In Chromium, socks5:// already performs remote DNS resolution.
 * This helper maps socks5h:// to socks5:// so Chromium never drops to direct.
 */
export function normalizeProxyForChromium(proxyUrl: string): string {
  if (!proxyUrl || typeof proxyUrl !== 'string') return 'direct://';
  return proxyUrl.trim().replace(/^socks5h:\/\//i, 'socks5://');
}

/**
 * Machine-bound salt generation with safe fallback when os.userInfo() throws.
 * Binds keys to machine hostname, user identity, and home directory to prevent cross-device copying.
 */
export function getMachineSalt(saltContext = 'nova-secure-salt', mockUserInfoError = false): Buffer {
  let username = 'unknown';
  try {
    if (mockUserInfoError) {
      throw new Error('SystemError: user not found in /etc/passwd');
    }
    username = os.userInfo().username;
  } catch (_) {
    username = process.env.USER || process.env.USERNAME || 'unknown';
  }
  return crypto.createHash('sha256')
    .update(`${os.hostname()}:${username}:${os.homedir()}:${saltContext}`)
    .digest();
}

export const MAX_SCRYPT_CACHE_ENTRIES = 50;

// Process-level LRU memo cache for computationally heavy scrypt key derivations.
// Keys are composite hex strings: `${secret.hex}:${machineSalt.hex}`.
const scryptKeyCache = new Map<string, Buffer>();

/**
 * Returns a memoized 32-byte key derived from secret and machineSalt using scrypt.
 * Eliminates 50-100ms synchronous event loop freezes on subsequent calls.
 * Enforces strict LRU bounding capped at MAX_SCRYPT_CACHE_ENTRIES (50) to prevent memory growth.
 */
export function getMemoizedScryptKey(secret: Buffer, machineSalt: Buffer): Buffer {
  const cacheKey = `${secret.toString('hex')}:${machineSalt.toString('hex')}`;
  let keyBuf = scryptKeyCache.get(cacheKey);
  if (keyBuf) {
    // Refresh LRU order on cache hit (re-insert moves key to the end)
    scryptKeyCache.delete(cacheKey);
    scryptKeyCache.set(cacheKey, keyBuf);
    return keyBuf;
  }

  // Derive 32-byte key synchronously
  keyBuf = crypto.scryptSync(secret, machineSalt, 32);

  // Evict least recently used entry if capacity is reached
  if (scryptKeyCache.size >= MAX_SCRYPT_CACHE_ENTRIES) {
    const oldestKey = scryptKeyCache.keys().next().value;
    if (oldestKey !== undefined) {
      scryptKeyCache.delete(oldestKey);
    }
  }

  scryptKeyCache.set(cacheKey, keyBuf);
  return keyBuf;
}

/**
 * Exposed for unit tests to reset cached keys across isolated test cases.
 */
export function _clearScryptKeyCacheForTesting(): void {
  scryptKeyCache.clear();
}

/**
 * Exposed for unit tests to inspect current cache size and verify LRU bounding.
 */
export function _getScryptCacheSizeForTesting(): number {
  return scryptKeyCache.size;
}

/**
 * Encrypts sensitive configuration using safeStorage (DPAPI on Windows, Keychain on macOS)
 * or falls back to an authenticated AES-256-GCM cipher bound to the machine salt.
 */
export function encryptDataWithFallback(plainText: string, userDataPath: string, safeStorageRef?: any): Buffer {
  if (safeStorageRef && typeof safeStorageRef.isEncryptionAvailable === 'function' && safeStorageRef.isEncryptionAvailable()) {
    try {
      return safeStorageRef.encryptString(plainText);
    } catch (_) {}
  }

  // Fallback: AES-256-GCM using machine-bound secret
  const secretPath = path.join(userDataPath, '.machine_secret');
  let secret: Buffer;
  try {
    secret = fs.readFileSync(secretPath);
    if (secret.length !== 32) {
      throw new Error(
        `Corrupt .machine_secret (${secret.length} bytes, expected 32). ` +
        'Values encrypted with it cannot be recovered; restore a backup or clear secure storage.'
      );
    }
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      secret = crypto.randomBytes(32);
      fs.writeFileSync(secretPath, secret, { mode: 0o600 });
      if (process.platform !== 'win32') {
        try { fs.chmodSync(secretPath, 0o600); } catch (_) {}
      }
    } else {
      throw err;
    }
  }

  const machineSalt = getMachineSalt('nova-secure-salt');
  const keyBuf = getMemoizedScryptKey(secret, machineSalt);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
  const enc = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from('NENC', 'utf8'), iv, tag, enc]);
}

/**
 * Decrypts sensitive configuration encrypted with encryptDataWithFallback.
 * Returns null if data is corrupt or authentication fails.
 */
export function decryptDataWithFallback(raw: Buffer, userDataPath: string, safeStorageRef?: any): string | null {
  if (!raw || raw.length === 0) return null;

  if (safeStorageRef && typeof safeStorageRef.isEncryptionAvailable === 'function' && safeStorageRef.isEncryptionAvailable()) {
    try {
      return safeStorageRef.decryptString(raw);
    } catch (_) {}
  }

  if (raw.length >= 32 && raw.subarray(0, 4).toString('utf8') === 'NENC') {
    try {
      const secretPath = path.join(userDataPath, '.machine_secret');
      if (fs.existsSync(secretPath)) {
        const secret = fs.readFileSync(secretPath);
        if (secret.length !== 32) return null;
        const machineSalt = getMachineSalt('nova-secure-salt');
        const keyBuf = getMemoizedScryptKey(secret, machineSalt);
        const iv = raw.subarray(4, 16);
        const tag = raw.subarray(16, 32);
        const enc = raw.subarray(32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
        decipher.setAuthTag(tag);
        return decipher.update(enc) + decipher.final('utf8');
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Computes the SHA-256 checksum of a file on disk via streaming to avoid large heap allocations.
 * Streams data directly into crypto.Hash and resolves with 64-character lowercase hex digest.
 */
export function computeFileSha256Stream(filePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      stream.destroy();
      reject(err);
    });
    hash.on('error', (err) => {
      stream.destroy();
      reject(err);
    });
    hash.on('finish', () => resolve(hash.digest('hex').toLowerCase()));
    stream.pipe(hash);
  });
}
