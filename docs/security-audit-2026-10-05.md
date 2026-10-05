# Bug and security audit — October 5, 2026

## Findings addressed

| Issue | Resolution |
| --- | --- |
| A remembered microphone grant also allowed camera access on the same site. | Store and check `media:audio` and `media:video` separately. Legacy `media` grants have ambiguous scope and require fresh approval. |
| Private tabs shared normal browsing permissions and persisted their own grants to disk. | Each private partition has an independent permission store held in memory. |
| WHATWG URL serialized extension origins as `null`, merging distinct identities. | Include the extension host ID in permission keys and reject opaque origins. |
| Site information dropped the port and displayed camera/microphone status from one record. | Preserve the complete origin and show separate device permission states. |
| Valid encrypted values containing 0–3 plaintext bytes could not be read. | Correct the minimum AES-GCM envelope size to 32 bytes. |
| An ENOENT error while writing an encryption key was swallowed, producing unrecoverable ciphertext. | Fail the operation when the key cannot be persisted. |
| MCP requests could execute after timeout or revocation when approved late. | Send cancellation from the main process, check deadlines and current settings in the renderer, and cancel pending approvals. Token rotation, tool disabling, server shutdown, and screen locking cancel pending requests. Recheck navigation authorization after DNS lookup. |
| Revocation during the native first-use MCP approval dialog could be bypassed. | Compare authorization and screen-lock generations before and after approval. A stale dialog cannot authorize future requests. |
| Express 5 invokes the listen callback on bind errors, allowing premature startup success. | Resolve startup only after obtaining a valid listening address. Reject initial and fallback bind failures. |
| Opening an MCP tab without a URL failed the DNS check. | Skip network DNS checks for internal routes accepted by the local navigation policy. |
| The standalone MCP bridge read encrypted token files as plaintext. | Require `MCP_TOKEN` copied from settings and validate its header-safe format before connecting. Synchronize the TypeScript and JavaScript bridge files. |
| npm audit reported seven dependency vulnerabilities. | Update 14 packages within compatible version ranges. Raise the Electron and DOMPurify minimum versions to 43.7.7 and 3.4.16, and align Node requirements with the installed jsdom version. |

## Validation

- `npm test`: passed. Four new regression suites execute production handlers and bridge code. The defects were reproduced before their fixes.
- `npm run build`: passed, including TypeScript, renderer, and Electron builds.
- `npm run build:website`: passed.
- Root package `npm audit`: zero known vulnerabilities.
- Website package `npm audit`: zero known vulnerabilities.
- `git diff --check`: passed.
- Independent review identified the native approval revocation race; the fix was tested and reviewed again.

## Scope and limitations

The audit focused on Electron privilege boundaries, site permissions, local MCP, encrypted storage, and dependencies. These results do not establish the absence of all possible vulnerabilities. User flows in a real Electron window, Windows/Linux packages, and OS camera/microphone interactions were not manually exercised. The live DNS test was skipped because of network sandbox restrictions; injected-resolver tests for private addresses, mixed answers, and timeouts passed. Existing bundle-size warnings remain for AI model packages and the website.

Device permission scopes were checked against the [Electron session documentation](https://www.electronjs.org/docs/latest/api/session). Dependency results reflect npm advisory data available on the audit date.
