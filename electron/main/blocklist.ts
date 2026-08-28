/**
 * Blocklist Auto-Refresh with Ed25519 Signature Verification
 * 
 * This module handles fetching the phishing blocklist from a remote source,
 * verifying its Ed25519 signature, and storing it locally for offline use.
 * Falls back to the packaged blocklist if refresh fails.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import fetch from 'cross-fetch';
import { app } from 'electron';

// Configuration
const BLOCKLIST_REMOTE_URL = 'https://raw.githubusercontent.com/unitybtw/nova-browser/main/electron/blocked-domains.json';
const BLOCKLIST_SIGNATURE_URL = 'https://raw.githubusercontent.com/unitybtw/nova-browser/main/electron/blocked-domains.json.sig';
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// Ed25519 Public Key (embedded in app) - Base64 encoded
// This is the public key corresponding to the private key used to sign the blocklist
// Generate with: npx tsx electron/main/generate-keys.ts
const ED25519_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAx1OfyEwTjhZGWqI+sVmpNqTCVOQOTkTdN3WR9n6M66E=
-----END PUBLIC KEY-----`;

// Local storage paths
function getBlocklistStoragePath(): string {
  return path.join(app.getPath('userData'), 'blocked-domains.json');
}

function getBlocklistSignatureStoragePath(): string {
  return path.join(app.getPath('userData'), 'blocked-domains.json.sig');
}

function getPackagedBlocklistPath(): string {
  // Packaged builds ship the file via extraResources (Contents/Resources/)
  // Dev builds read from the repo layout
  const candidates = [
    path.join(process.resourcesPath, 'blocked-domains.json'),
    path.join(__dirname, '..', 'blocked-domains.json'),
    path.join(process.cwd(), 'electron', 'blocked-domains.json')
  ];
  
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0]; // Return first as fallback
}

/**
 * Verify Ed25519 signature of the blocklist data using Web Crypto API
 */
async function verifySignature(data: string, signatureB64: string): Promise<boolean> {
  try {
    // Import public key using Web Crypto API
    const publicKey = await crypto.subtle.importKey(
      'spki',
      pemToArrayBuffer(ED25519_PUBLIC_KEY_PEM),
      { name: 'Ed25519' },
      false,
      ['verify']
    );
    
    const signature = Buffer.from(signatureB64, 'base64');
    return await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      signature,
      new TextEncoder().encode(data)
    );
  } catch (err) {
    console.error('[Blocklist] Signature verification failed:', err);
    return false;
  }
}

/**
 * Convert PEM string to ArrayBuffer for Web Crypto API
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s/g, '');
  const binary = Buffer.from(b64, 'base64');
  return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
}

/**
 * Fetch blocklist and signature from remote source
 */
async function fetchRemoteBlocklist(): Promise<{ data: string; signature: string } | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Blocklist] Fetching remote blocklist (attempt ${attempt}/${MAX_RETRIES})...`);
      
      const [dataRes, sigRes] = await Promise.all([
        fetch(BLOCKLIST_REMOTE_URL, { signal: AbortSignal.timeout(15000) }),
        fetch(BLOCKLIST_SIGNATURE_URL, { signal: AbortSignal.timeout(15000) })
      ]);
      
      if (!dataRes.ok || !sigRes.ok) {
        throw new Error(`HTTP error: data=${dataRes.status}, sig=${sigRes.status}`);
      }
      
      const data = await dataRes.text();
      const signature = await sigRes.text();
      
      // Validate JSON structure
      JSON.parse(data); // throws if invalid
      
      console.log('[Blocklist] Remote blocklist fetched successfully');
      return { data, signature: signature.trim() };
    } catch (err) {
      console.warn(`[Blocklist] Fetch attempt ${attempt} failed:`, err);
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  return null;
}

/**
 * Load blocklist from local storage (verified cache)
 */
function loadLocalBlocklist(): string[] | null {
  try {
    const storagePath = getBlocklistStoragePath();
    if (!fs.existsSync(storagePath)) return null;
    
    const data = fs.readFileSync(storagePath, 'utf8');
    const domains = JSON.parse(data);
    
    if (!Array.isArray(domains)) {
      console.warn('[Blocklist] Local blocklist is not an array');
      return null;
    }
    
    console.log(`[Blocklist] Loaded ${domains.length} domains from local storage`);
    return domains.map(d => d.toLowerCase().trim());
  } catch (err) {
    console.error('[Blocklist] Failed to load local blocklist:', err);
    return null;
  }
}

/**
 * Load blocklist from packaged resources (fallback)
 */
function loadPackagedBlocklist(): string[] | null {
  try {
    const packagedPath = getPackagedBlocklistPath();
    if (!fs.existsSync(packagedPath)) return null;
    
    const data = fs.readFileSync(packagedPath, 'utf8');
    const domains = JSON.parse(data);
    
    if (!Array.isArray(domains)) {
      console.warn('[Blocklist] Packaged blocklist is not an array');
      return null;
    }
    
    console.log(`[Blocklist] Loaded ${domains.length} domains from packaged resources`);
    return domains.map(d => d.toLowerCase().trim());
  } catch (err) {
    console.error('[Blocklist] Failed to load packaged blocklist:', err);
    return null;
  }
}

/**
 * Save verified blocklist to local storage
 */
function saveLocalBlocklist(domains: string[]): boolean {
  try {
    const storagePath = getBlocklistStoragePath();
    fs.writeFileSync(storagePath, JSON.stringify(domains, null, 2), 'utf8');
    console.log(`[Blocklist] Saved ${domains.length} domains to local storage`);
    return true;
  } catch (err) {
    console.error('[Blocklist] Failed to save local blocklist:', err);
    return false;
  }
}

/**
 * Refresh blocklist from remote source with signature verification
 * Returns the verified blocklist domains, or null if refresh failed
 */
export async function refreshBlocklist(): Promise<string[] | null> {
  console.log('[Blocklist] Starting blocklist refresh...');
  
  // Fetch remote blocklist and signature
  const remote = await fetchRemoteBlocklist();
  if (!remote) {
    console.warn('[Blocklist] Failed to fetch remote blocklist after retries');
    return null;
  }
  
  // Verify signature
  if (!(await verifySignature(remote.data, remote.signature))) {
    console.error('[Blocklist] Signature verification FAILED - rejecting remote blocklist');
    return null;
  }
  
  console.log('[Blocklist] Signature verification PASSED');
  
  // Parse and validate domains
  let domains: string[];
  try {
    domains = JSON.parse(remote.data);
    if (!Array.isArray(domains)) {
      throw new Error('Blocklist is not an array');
    }
  } catch (err) {
    console.error('[Blocklist] Invalid JSON in remote blocklist:', err);
    return null;
  }
  
  // Normalize domains
  const normalizedDomains = domains
    .map(d => d.toLowerCase().trim())
    .filter(d => d.length > 0);
  
  // Save to local storage for offline use
  saveLocalBlocklist(normalizedDomains);
  
  // Also save signature for reference
  try {
    fs.writeFileSync(getBlocklistSignatureStoragePath(), remote.signature, 'utf8');
  } catch (err) {
    console.warn('[Blocklist] Failed to save signature:', err);
  }
  
  console.log(`[Blocklist] Refresh complete: ${normalizedDomains.length} domains loaded`);
  return normalizedDomains;
}

/**
 * Initialize blocklist: load from local storage, fallback to packaged, then start periodic refresh
 */
export async function initializeBlocklist(): Promise<string[]> {
  console.log('[Blocklist] Initializing...');
  
  // 1. Try loading from local storage (verified cache from previous refresh)
  let domains = loadLocalBlocklist();
  if (domains) {
    console.log('[Blocklist] Using locally cached blocklist');
    return domains;
  }
  
  // 2. Fallback to packaged blocklist
  domains = loadPackagedBlocklist();
  if (domains) {
    console.log('[Blocklist] Using packaged blocklist as fallback');
    // Save to local storage for future use
    saveLocalBlocklist(domains);
    return domains;
  }
  
  // 3. Last resort: empty array (should not happen)
  console.error('[Blocklist] No blocklist available!');
  return [];
}

/**
 * Start periodic blocklist refresh timer
 */
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let currentBlocklist: string[] = [];
let onBlocklistUpdated: ((domains: string[]) => void) | null = null;

export function startPeriodicRefresh(callback?: (domains: string[]) => void): void {
  if (refreshTimer) {
    console.warn('[Blocklist] Periodic refresh already running');
    return;
  }
  
  if (callback) {
    onBlocklistUpdated = callback;
  }
  
  // Initial refresh (async, non-blocking)
  refreshBlocklist().then(domains => {
    if (domains) {
      currentBlocklist = domains;
      onBlocklistUpdated?.(domains);
    }
  }).catch(err => {
    console.error('[Blocklist] Initial refresh error:', err);
  });
  
  // Periodic refresh
  refreshTimer = setInterval(async () => {
    console.log('[Blocklist] Periodic refresh triggered');
    const domains = await refreshBlocklist();
    if (domains) {
      currentBlocklist = domains;
      onBlocklistUpdated?.(domains);
    }
  }, REFRESH_INTERVAL_MS);
  
  // Prevent timer from keeping process alive
  refreshTimer.unref?.();
  
  console.log(`[Blocklist] Periodic refresh started (interval: ${REFRESH_INTERVAL_MS / 1000 / 60 / 60}h)`);
}

export function stopPeriodicRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
    console.log('[Blocklist] Periodic refresh stopped');
  }
}

export function getCurrentBlocklist(): string[] {
  return currentBlocklist;
}

export function setCurrentBlocklist(domains: string[]): void {
  currentBlocklist = domains;
}