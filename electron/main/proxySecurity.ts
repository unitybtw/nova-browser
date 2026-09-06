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
  if (fs.existsSync(secretPath)) {
    secret = fs.readFileSync(secretPath);
  } else {
    secret = crypto.randomBytes(32);
    try {
      fs.writeFileSync(secretPath, secret, { mode: 0o600 });
      if (process.platform !== 'win32') {
        fs.chmodSync(secretPath, 0o600);
      }
    } catch (_) {}
  }

  const machineSalt = getMachineSalt('nova-secure-salt');
  const keyBuf = crypto.scryptSync(secret, machineSalt, 32);
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

  if (raw.length >= 36 && raw.subarray(0, 4).toString('utf8') === 'NENC') {
    try {
      const secretPath = path.join(userDataPath, '.machine_secret');
      if (fs.existsSync(secretPath)) {
        const secret = fs.readFileSync(secretPath);
        const machineSalt = getMachineSalt('nova-secure-salt');
        const keyBuf = crypto.scryptSync(secret, machineSalt, 32);
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
