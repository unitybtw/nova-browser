import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  captureLegacyCustomAiApiKeySync,
  getCachedCustomAiApiKey,
  loadCustomAiApiKey,
  registerPendingLegacyCustomAiApiKey,
  sanitizeSettingsForPersistence,
  saveCustomAiApiKey,
  SECURE_STORE_AI_API_KEY,
  setCachedCustomAiApiKey,
} from '../src/services/aiSecretStore';
import { mergeSettingsLastWriteWins } from '../src/services/syncService';

// ---------------------------------------------------------------------------
// M1: Fail-Closed Updater Integrity Checks
// ---------------------------------------------------------------------------
{
  const mainSource = fs.readFileSync('electron/main.ts', 'utf8');
  assert.ok(
    mainSource.includes("if (!latestReleaseDownloadInfo?.expectedSha256 || !/^[a-fA-F0-9]{64}$/.test(latestReleaseDownloadInfo.expectedSha256))"),
    'performSelfUpdateAndRelaunch must fail closed when expectedSha256 is missing or malformed'
  );
  assert.ok(
    mainSource.includes("if (!expectedSha256 || !/^[a-fA-F0-9]{64}$/.test(expectedSha256))"),
    'downloadFileWithProgress must fail closed when expectedSha256 is missing or malformed'
  );
  console.log('[PASS] M1: Updater fail-closed SHA-256 enforcement verified');
}

// ---------------------------------------------------------------------------
// M2 & M3: CSP Hardening & Byte-Identity Between vite.config.ts and main.ts
// ---------------------------------------------------------------------------
{
  const viteSource = fs.readFileSync('vite.config.ts', 'utf8');
  const mainSource = fs.readFileSync('electron/main.ts', 'utf8');
  const indexHtml = fs.readFileSync('index.html', 'utf8');

  const viteCspMatch = viteSource.match(/const HARDENED_PROD_CSP = (\[[\s\S]*?\]\.join\('; '\));/);
  assert.ok(viteCspMatch, 'HARDENED_PROD_CSP definition must exist in vite.config.ts');
  const viteProdCsp: string = vm.runInNewContext(viteCspMatch[1], {});

  const mainProdMatch = mainSource.match(/const isDev = isDevLocalhost \|\| !app\.isPackaged;[\s\S]*?:\s*`([^`]+)`/);
  assert.ok(mainProdMatch, 'Production CSP branch must exist in electron/main.ts');
  const mainProdCsp = mainProdMatch[1];

  assert.equal(
    mainProdCsp,
    viteProdCsp,
    'electron/main.ts PROD CSP header MUST remain byte-identical to HARDENED_PROD_CSP in vite.config.ts'
  );

  const connectSrcMatch = viteProdCsp.match(/connect-src ([^;]+)/);
  assert.ok(connectSrcMatch, 'connect-src directive must exist in HARDENED_PROD_CSP');
  const connectTokens = connectSrcMatch[1].trim().split(/\s+/);
  assert.equal(connectTokens.includes('https:'), false, 'PROD connect-src must never include bare https: wildcard');
  assert.equal(connectTokens.includes('http:'), false, 'PROD connect-src must never include bare http: wildcard');

  const scriptSrcMatch = viteProdCsp.match(/script-src ([^;]+)/);
  assert.ok(scriptSrcMatch, 'script-src directive must exist');
  assert.equal(scriptSrcMatch[1].includes("'unsafe-inline'"), false, "PROD script-src must omit 'unsafe-inline'");
  assert.equal(scriptSrcMatch[1].includes("'unsafe-eval'"), false, "PROD script-src must omit 'unsafe-eval'");

  // Also ensure index.html dev meta CSP and electron/main.ts dev CSP have no bare https: wildcard in connect-src or http://* in img-src
  const devCspMatch = mainSource.match(/isDev\s*\?\s*`([^`]+)`/);
  assert.ok(devCspMatch, 'DEV CSP branch must exist in electron/main.ts');
  const devConnectMatch = devCspMatch[1].match(/connect-src ([^;]+)/);
  assert.ok(devConnectMatch && !devConnectMatch[1].split(/\s+/).includes('https:'), 'DEV connect-src must not include bare https:');
  const htmlMetaMatch = indexHtml.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
  assert.ok(htmlMetaMatch, 'index.html must include Content-Security-Policy meta tag');
  assert.equal(htmlMetaMatch[1].includes('http://*'), false, 'index.html img-src must not include http://* wildcard');
  const htmlConnectMatch = htmlMetaMatch[1].match(/connect-src ([^;]+)/);
  assert.ok(htmlConnectMatch && !htmlConnectMatch[1].split(/\s+/).includes('https:'), 'index.html connect-src must not include bare https:');

  console.log('[PASS] M2/M3: Strict CSP parity and wildcard elimination verified');
}

// ---------------------------------------------------------------------------
// L2 & L3: No innerHTML sinks in aiAgent.ts / ReaderMode link hardening
// ---------------------------------------------------------------------------
{
  const aiAgentSource = fs.readFileSync('src/services/aiAgent.ts', 'utf8');
  assert.equal(/\.innerHTML\s*=/.test(aiAgentSource), false, 'aiAgent.ts must not assign to innerHTML');
  assert.ok(aiAgentSource.includes('createElementNS'), 'aiAgent.ts cursor overlay must use createElementNS');
  assert.ok(aiAgentSource.includes('/^#[0-9a-fA-F]{3,8}$/'), 'aiAgent.ts must validate hex theme color before interpolation');

  const readerSource = fs.readFileSync('src/components/ReaderMode.tsx', 'utf8');
  assert.equal(/linkHost\.innerHTML\s*=/.test(readerSource), false, 'ReaderMode.tsx must not use linkHost.innerHTML sink');
  assert.ok(readerSource.includes('DOMParser().parseFromString'), 'ReaderMode.tsx should harden links using an inert DOMParser');
  console.log('[PASS] L2/L3: innerHTML elimination and color validation verified');
}

// ---------------------------------------------------------------------------
// L4: Embedded ASAR Integrity Fuse enabled by default on supported platforms
// ---------------------------------------------------------------------------
{
  const fusesSource = fs.readFileSync('scripts/apply-fuses.cjs', 'utf8');
  assert.ok(
    fusesSource.includes("NOVA_ENABLE_ASAR_INTEGRITY_FUSE === '0'"),
    'apply-fuses.cjs must use opt-out semantics (default ON on macOS/Windows when ASAR is enabled)'
  );
  assert.equal(
    fusesSource.includes("process.env.NOVA_ENABLE_ASAR_INTEGRITY_FUSE === '1'"),
    false,
    'apply-fuses.cjs must no longer leave EnableEmbeddedAsarIntegrityValidation opt-in'
  );
  console.log('[PASS] L4: Electron ASAR integrity fuse default posture verified');
}

// ---------------------------------------------------------------------------
// M4: Encrypted AI API Key Store, Legacy Migration, & Sync Scrubbing
// ---------------------------------------------------------------------------
export async function runAiSecretStoreChecks(): Promise<void> {
  const localMap = new Map<string, string>();
  const secureMap = new Map<string, string>();
  const diskMap = new Map<string, string>();

  const mockStorage = {
    getItem: (k: string) => localMap.get(k) ?? null,
    setItem: (k: string, v: string) => { localMap.set(k, v); },
    removeItem: (k: string) => { localMap.delete(k); },
  };
  const mockApi = {
    secureStoreGet: async (k: string) => secureMap.get(k) ?? null,
    secureStoreSet: async (k: string, v: string) => { secureMap.set(k, v); return true; },
    secureStoreDelete: async (k: string) => { secureMap.delete(k); return true; },
    storeGet: async (k: string) => diskMap.get(k) ?? null,
    storeSet: async (k: string, v: string) => { diskMap.set(k, v); return true; },
  };
  const deps = { storage: mockStorage, api: mockApi };

  try {
    setCachedCustomAiApiKey('');

    // 1. Legacy plaintext migration from localStorage + disk user_settings
    const legacySettings = JSON.stringify({ theme: 'dark', aiCustomApiKey: 'sk-legacy-secret-123' });
    localMap.set('user_settings', legacySettings);
    diskMap.set('user_settings', legacySettings);
    registerPendingLegacyCustomAiApiKey('sk-legacy-secret-123');

    const migrated = await loadCustomAiApiKey(deps);
    assert.equal(migrated, 'sk-legacy-secret-123');
    assert.equal(secureMap.get(SECURE_STORE_AI_API_KEY), 'sk-legacy-secret-123', 'Legacy key must be migrated into secureStore');
    assert.equal(JSON.parse(localMap.get('user_settings')!).aiCustomApiKey, '', 'Plaintext key must be scrubbed from localStorage');
    assert.equal(JSON.parse(diskMap.get('user_settings')!).aiCustomApiKey, '', 'Plaintext key must be scrubbed from disk store');

    // 2. Saving a new API key writes only to secureStore, never plaintext localStorage
    setCachedCustomAiApiKey('');
    const saveRes = await saveCustomAiApiKey('sk-new-secret-999', deps);
    assert.equal(saveRes.ok, true);
    assert.equal(saveRes.persisted, true);
    assert.equal(secureMap.get(SECURE_STORE_AI_API_KEY), 'sk-new-secret-999');
    assert.equal(getCachedCustomAiApiKey(), 'sk-new-secret-999');
    assert.equal(localMap.has('nova_ai_custom_api_key'), false);
    assert.equal(JSON.parse(localMap.get('user_settings')!).aiCustomApiKey, '');

    // 3. Sanitizer always strips aiCustomApiKey before persistence/export
    const scrubbed = sanitizeSettingsForPersistence({ theme: 'dark', aiCustomApiKey: 'sk-leak' } as any);
    assert.equal(scrubbed.aiCustomApiKey, '');

    // 4. Deleting/clearing removes from secureStore
    await saveCustomAiApiKey('', deps);
    assert.equal(secureMap.has(SECURE_STORE_AI_API_KEY), false);
    assert.equal(getCachedCustomAiApiKey(), '');

    // 5. Cloud sync merge must never import remote aiCustomApiKey into settings
    const lww = mergeSettingsLastWriteWins(
      { theme: 'dark', aiCustomApiKey: '' } as any,
      { theme: 'light', aiCustomApiKey: 'sk-remote-poison' } as any,
      { theme: 100 },
      { theme: 200, aiCustomApiKey: 999999 },
      { now: 300 }
    );
    assert.equal((lww.settings as any).aiCustomApiKey, '', 'Sync LWW merge must strip aiCustomApiKey');
    assert.equal(captureLegacyCustomAiApiKeySync(deps), '', 'No legacy key remains captured after clearing');

    console.log('[PASS] M4: AI API key OS secure storage migration and scrubbing verified');
  } finally {
    setCachedCustomAiApiKey('');
  }
}

void runAiSecretStoreChecks().catch((err) => {
  console.error('[FAIL] Security hardening suite error:', err);
  process.exit(1);
});
