# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace public sync with authenticated encrypted sync and make MCP/password automation safe-by-default.

**Architecture:** Pure helpers in `src/services/syncCrypto.ts` own cryptography, payload validation, and invitation-token hashing. `syncService.ts` becomes an authenticated orchestration layer that stores opaque ciphertext only. Electron policy controls MCP and preloads, while renderer state exposes explicit opt-in controls.

**Tech Stack:** React 18, TypeScript, Electron 43, Supabase JS 2, Web Crypto, esbuild, Node test harness.

## Global Constraints

- Existing sync chains and vault data are intentionally incompatible and must not be migrated.
- Supabase must require `auth.uid()` ownership; no sync policy may use `using (true)` or `with check (true)`.
- Sync payloads must be AES-256-GCM ciphertext, and passphrases/derived keys must never be written to Web Storage or Supabase.
- Pairing invitations contain only a SHA-256 token hash, expire after ten minutes, and are single-use.
- Mutating MCP tools and password capture/autofill start disabled.
- Preserve Electron context isolation and run the full test and build commands before the final commit.

---

## File structure

- `src/services/syncCrypto.ts`: payload encryption/decryption, token creation/hash, invitation validation.
- `src/services/syncService.ts`: authenticated vault and invitation operations using `syncCrypto`.
- `supabase_schema.sql`: restrictive authenticated schema, vault blob and pairing invitation tables.
- `electron/mcpServer.ts`: permission defaults and enabled-tool listing.
- `electron/main.ts`, `electron/webstore-preload.ts`, `src/components/BrowserView.tsx`: opt-in password and Web Store preload boundaries.
- `tests/securityHardening.test.ts`: executable regression tests for pure sync/MCP behavior.
- `tests/runAll.ts`, `package.json`, `README.md`: test runner, ESM configuration and accurate documentation.

### Task 1: Crypto and invitation primitives

**Files:**
- Create: `src/services/syncCrypto.ts`
- Create: `tests/securityHardening.test.ts`
- Modify: `tests/runAll.ts`

**Interfaces:**
- Produces `encryptSyncPayload(payload, passphrase)`, `decryptSyncPayload(envelope, passphrase)`, `createPairingToken()`, `hashPairingToken(token)`, `isInvitationUsable(invitation, now)`.
- `EncryptedSyncEnvelope` has `ciphertext`, `salt`, `iv`, and `version`; plaintext payload is not a database type.

- [ ] **Step 1: Write failing tests**

```ts
const envelope = await encryptSyncPayload({ bookmarks: [{ id: 'a' }] }, 'passphrase');
assert(envelope.ciphertext && !envelope.ciphertext.includes('bookmarks'), 'ciphertext must not expose plaintext');
assert.deepEqual(await decryptSyncPayload(envelope, 'passphrase'), { bookmarks: [{ id: 'a' }] });
assert.notEqual(await hashPairingToken('token-a'), await hashPairingToken('token-b'));
assert.equal(isInvitationUsable({ tokenHash: 'x', expiresAt: Date.now() - 1, consumedAt: null }, Date.now()), false);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test`

Expected: bundle fails because `syncCrypto.ts` and its exports do not exist.

- [ ] **Step 3: Implement minimal crypto helpers**

```ts
export async function encryptSyncPayload(payload: unknown, passphrase: string): Promise<EncryptedSyncEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const data = new TextEncoder().encode(JSON.stringify(payload));
  return { version: 2, ciphertext: toBase64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)), salt: toBase64(salt), iv: toBase64(iv) };
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test`

Expected: security-hardening cases pass.

- [ ] **Step 5: Commit**

Run: `git add src/services/syncCrypto.ts tests/securityHardening.test.ts tests/runAll.ts && git commit -m "feat(sync): add encrypted payload primitives"`

### Task 2: Authenticated encrypted sync schema and service

**Files:**
- Modify: `supabase_schema.sql`
- Modify: `src/services/syncService.ts`
- Modify: `src/services/supabaseClient.ts`
- Test: `tests/securityHardening.test.ts`

**Interfaces:**
- Consumes Task 1 helpers.
- Produces `enableSync(passphrase)`, `syncEncryptedVault(data, passphrase)`, `createPairingInvitation()`, and `joinPairingInvitation(token, passphrase)`.

- [ ] **Step 1: Write failing tests**

```ts
assert.equal(containsPersistedSecret(sourceText), false, 'sync service must not write MASTER_KEY to storage');
assert.equal(schemaText.includes('using (true)'), false, 'schema must not have public read policies');
assert.equal(schemaText.includes('bookmarks jsonb'), false, 'vault schema must store an opaque payload only');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test`

Expected: assertions find existing `MASTER_KEY`, public RLS policies, and plaintext columns.

- [ ] **Step 3: Implement authenticated blob sync**

```ts
await supabase.from('nova_sync_vaults').upsert({
  user_id: user.id,
  envelope: await encryptSyncPayload(data, passphrase),
  updated_at: new Date().toISOString()
});
```

Replace pairing rows with token-hash invitations and restrict SQL policies to `auth.uid() = user_id` or invitation owner/recipient checks. Remove local registry fallback and all master-key Web Storage writes.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test`

Expected: sync schema and storage regression assertions pass.

- [ ] **Step 5: Commit**

Run: `git add supabase_schema.sql src/services/syncService.ts src/services/supabaseClient.ts tests/securityHardening.test.ts && git commit -m "fix(sync): require auth and encrypt vaults"`

### Task 3: Safe MCP defaults

**Files:**
- Modify: `electron/mcpServer.ts`
- Test: `tests/securityHardening.test.ts`

**Interfaces:**
- Produces `getEnabledTools()` and a default disabled set derived from `TOOL_PERMISSIONS`.

- [ ] **Step 1: Write failing tests**

```ts
for (const tool of ['browser_type', 'browser_press_key', 'browser_select_option', 'browser_click']) {
  assert.equal(defaultToolEnabled(tool), false, `${tool} must be disabled by default`);
}
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test`

Expected: mutating tools are currently enabled because `DEFAULT_DISABLED_TOOLS` is empty.

- [ ] **Step 3: Implement permission-derived defaults**

```ts
const DEFAULT_DISABLED_TOOLS = new Set(
  Object.entries(TOOL_PERMISSIONS)
    .filter(([, permission]) => permission !== 'safe')
    .map(([name]) => name)
);
```

Return only allowed tools from `/tools` and `tools/list`; retain `executeTool` authorization for direct calls.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test`

Expected: mutating tool defaults and list filtering pass.

- [ ] **Step 5: Commit**

Run: `git add electron/mcpServer.ts tests/securityHardening.test.ts && git commit -m "fix(mcp): disable mutating tools by default"`

### Task 4: Password and preload opt-in boundaries

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/webstore-preload.ts`
- Modify: `src/components/BrowserView.tsx`
- Modify: `src/types/browser.ts`
- Test: `tests/securityHardening.test.ts`

**Interfaces:**
- Adds `passwordManagerEnabled: boolean` to user settings, defaulting to `false`.
- `BrowserView` requests a save prompt only when the setting is enabled; it does not inject stored credentials automatically.

- [ ] **Step 1: Write failing tests**

```ts
assert.equal(defaultSettings.passwordManagerEnabled, false);
assert.equal(webStorePreloadText.includes('Password Manager Form & Submission Detection'), false);
assert.equal(browserViewText.includes('pwdInputs[0].value = cred.password'), false);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test`

Expected: global credential capture and DOM-ready autofill are present.

- [ ] **Step 3: Remove global capture and autofill**

```ts
if (!settings.passwordManagerEnabled) return;
// Save prompts are raised only from an explicit BrowserView user action.
```

Attach the Web Store preload exclusively when the target host is a Chrome Web Store host. Remove the universal password detector from `webstore-preload.ts`.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test`

Expected: default-off password setting and no universal credential collection pass.

- [ ] **Step 5: Commit**

Run: `git add electron/main.ts electron/webstore-preload.ts src/components/BrowserView.tsx src/types/browser.ts tests/securityHardening.test.ts && git commit -m "fix(passwords): require explicit opt-in"`

### Task 5: Test runner, docs, and release verification

**Files:**
- Modify: `package.json`
- Modify: `tests/runAll.ts`
- Modify: `src/services/aiMemory.ts`
- Modify: `README.md`
- Test: `tests/securityHardening.test.ts`

**Interfaces:**
- Test execution uses ESM so Vite environment access is not silently erased by CJS bundling.

- [ ] **Step 1: Write failing tests**

```ts
assert.equal(packageJson.scripts['test:e2e'].includes('--format=esm'), true);
assert.equal(readme.includes('Electron 43'), true);
assert.equal(readme.includes('TailwindCSS 4'), true);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test`

Expected: CJS test bundling and stale README versions fail assertions.

- [ ] **Step 3: Implement test/doc cleanup**

```json
"test:e2e": "esbuild tests/runAll.ts --bundle --platform=node --format=esm --outfile=dist-test/runAll.mjs && node dist-test/runAll.mjs"
```

Guard browser storage reads in `aiMemory.ts` with `typeof localStorage !== 'undefined'`. Update README runtime versions and authenticated encrypted-sync requirements.

- [ ] **Step 4: Run all verification commands**

Run: `npm test && npm run build && git diff --check`

Expected: exit code 0; no project test-bundle `import.meta` or unavailable-localStorage warnings.

- [ ] **Step 5: Commit**

Run: `git add package.json README.md src/services/aiMemory.ts tests/securityHardening.test.ts tests/runAll.ts && git commit -m "test: harden verification and update docs"`
