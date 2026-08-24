# Security Hardening Design

## Goal

Replace Nova's public, pairing-code-based sync with authenticated, encrypted sync; make automation and password features opt-in; and add test coverage for the resulting security boundaries.

## Scope

- This is a breaking reset: existing sync chains, vault records, and pairing codes are discarded.
- No user migration is required because there are no active users.
- The work is limited to the desktop app and its Supabase schema. It does not redesign the marketing website.

## Sync model

1. Supabase Auth identifies each account. The database uses `auth.uid()` ownership policies; anonymous clients have no access to user data.
2. Each account has one `nova_sync_vaults` row containing only an opaque encrypted payload and its encryption metadata. The server never receives individual bookmarks, history, passwords, settings, or workspaces as JSON fields.
3. A user supplies a sync passphrase when enabling sync. PBKDF2 derives an AES-256-GCM key with a per-vault random salt; the passphrase and derived key are memory-only. They are never stored in `localStorage`, `sessionStorage`, or Supabase.
4. Pairing creates an authenticated, short-lived invitation record. The invitation stores a SHA-256 hash of a cryptographically random token and the owner id, never the token or encrypted vault key. Joining requires a signed-in second device and atomically consumes the invitation. The user re-enters the sync passphrase on the new device.
5. Sync rejects malformed payloads and expired or consumed invitations. An unavailable Supabase configuration reports a clear error rather than emulating cloud sync in browser storage.

## Password manager

- Password capture is disabled by default and exposed as an explicit setting.
- No preload scans every page for credentials. Password save prompts are triggered only for an enabled manager after a submitted form, and autofill requires a user action in Nova's UI.
- The Electron safe storage remains the local password-at-rest mechanism. Stored password records are validated before use.

## MCP and browser isolation

- Mutating MCP tools (`type`, key presses, select, click, navigation, tab state mutations) are disabled by default. Enabling one is an explicit settings action.
- Tool enumeration returns only enabled tools, while direct calls keep an allow-list check.
- The Chrome Web Store preload is attached only to Web Store webviews. General webviews do not receive web-store or password-manager preload logic.

## Tests and quality

- Extract pure crypto, invitation and payload validation helpers so they can be tested directly under Node.
- Add tests for encrypted payloads, no persisted secrets, invitation expiration/hash validation, and default-disabled mutating MCP tools.
- Make the test bundle ESM so `import.meta.env` has its intended semantics, and remove test-environment localStorage error logging by guarding storage access.
- Update README versions to match package dependencies and document that sync requires authentication and a user-held passphrase.

## Acceptance criteria

- Generated SQL contains no unrestricted `using (true)` policies for sync data.
- Sync payload rows expose no plaintext user browsing data or credentials.
- A pairing token cannot be read back from the database and expires after 10 minutes or first use.
- No sync secret is persisted in Web Storage.
- Fresh MCP settings do not permit any tool with a mutating permission level.
- `npm test` and `npm run build` complete without warnings from the project test bundle.
