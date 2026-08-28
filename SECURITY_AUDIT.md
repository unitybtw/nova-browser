# Nova Browser Security Audit

Date: 2026-08-28
Auditor: Antigravity (automated)
Scope: Electron main process, preload, React frontend (BrowserView, TopBar, searchEngine utilities)

---

## Summary

| ID | Severity | Area | Status |
|----|----------|------|--------|
| VULN-A1 | High | BrowserView.tsx — new-window URL injection | Fixed |
| VULN-A2 | Medium | BrowserView.tsx — favicon URL injection | Fixed |
| VULN-A3 | Medium | searchEngine.ts — dangerous protocol bypass in isValidUrlOrDomain | Fixed |
| VULN-A4 | Medium | searchEngine.ts — dangerous protocol bypass in formatSearchUrl | Fixed |
| EXISTING | High | main.ts VULN-16 — CSP nonce on app pages | Already present |
| EXISTING | High | main.ts VULN-05 — phishing page HTML escape | Already present |
| EXISTING | High | main.ts VULN-24 — global UA spoof removed | Already present |
| EXISTING | High | main.ts VULN-23 — store-set max size enforcement | Already present |
| EXISTING | High | main.ts VULN-06 — safeStorage encryption guard | Already present |
| EXISTING | High | main.ts VULN-18 — SSRF private IP guard on fetch-page-html | Already present |
| EXISTING | High | main.ts will-attach-webview — forced sandbox/contextIsolation | Already present |
| EXISTING | Medium | main.ts isTrustedSender — all IPC handlers validated | Already present |

---

## Fixed Vulnerabilities

### VULN-A1 — new-window URL Injection (High)

**File**: `src/components/BrowserView.tsx`, `handleNewWindow`

**Description**: Webview `new-window` events forwarded the URL directly to `onNewTab`/`onNavigate`
without any protocol check. A malicious page could trigger a `javascript:`, `data:`, `vbscript:`
or `file:` URL to be opened as a new tab.

**Fix**: Added protocol validation before forwarding. Only `http:` and `https:` URLs are forwarded.
Any other protocol is silently discarded.

---

### VULN-A2 — Favicon URL Injection (Medium)

**File**: `src/components/BrowserView.tsx`, `handleFaviconUpdate`

**Description**: `e.favicons[0]` was stored directly as the tab favicon without any validation.
A page could emit a `javascript:` or `data:text/html` favicon URL, which would later be used in
`<img src={tab.favicon}>` — a potential XSS vector if browsers allow script execution through
crafted data URIs in image contexts.

**Fix**: Added an allowlist check. Only `https://`, `http://`, and
`data:image/<safe-type>;base64,` URIs are accepted as favicon values.

---

### VULN-A3 — Dangerous Protocol Bypass in isValidUrlOrDomain (Medium)

**File**: `src/utils/searchEngine.ts`, `isValidUrlOrDomain`

**Description**: The function matched `javascript:3000` or `data:text` as valid "domain:port"
patterns because the port-based regex ran before any protocol safety check. This could allow
dangerous protocol URLs to be treated as navigable addresses.

**Fix**: Added explicit early rejection of all dangerous protocol prefixes
(`javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, `chrome:`, `edge:`, `about:config`)
before any regex matching is performed.

---

### VULN-A4 — Dangerous Protocol Bypass in formatSearchUrl (Medium)

**File**: `src/utils/searchEngine.ts`, `formatSearchUrl`

**Description**: If a dangerous protocol URL somehow reached `formatSearchUrl`, it would be
returned as-is without validation because only `nova://`, `about:`, and `https?://` were
checked as early-exit conditions.

**Fix**: Added the same dangerous protocol early-rejection block at the top of `formatSearchUrl`.
Dangerous protocol strings are treated as search queries and routed to Google Search instead.

---

## Existing Security Controls (Verified)

The following security controls were verified to be already present and correctly implemented:

- **IPC Sender Validation**: Every `ipcMain.handle` and `ipcMain.on` handler calls `isTrustedSender(event)` and returns early if not trusted.
- **Webview Sandbox Enforcement**: `will-attach-webview` forces `nodeIntegration: false`, `contextIsolation: true`, `webSecurity: true`, `sandbox: true`, `allowRunningInsecureContent: false` on every webview.
- **Preload Allowlist**: Webview preloads are restricted to an allowlist of exactly 2 authorized paths.
- **CSP on App Pages**: `onHeadersReceived` injects a strict Content Security Policy with a per-request cryptographic nonce.
- **HTTPS Upgrade**: HTTP navigations are automatically upgraded to HTTPS with protection against infinite loops and MITM downgrade attacks.
- **Dangerous Protocol Block on Navigation**: `will-navigate` on webview contents blocks `javascript:`, `data:`, `vbscript:`, `file:`, `chrome:`, `edge:` and any non-http/https protocol.
- **Phishing Detection**: All navigations are checked against a live-refreshed phishing domain blocklist.
- **SSRF Protection on fetch-page-html**: Private/reserved IP ranges are resolved and blocked before proxying HTML fetch requests.
- **safeStorage Encryption**: Secure store uses `safeStorage.encryptString` with a fallback marker for unencrypted data.
- **Store Value Size Limits**: `store-set` enforces 10MB max, `secure-store-set` enforces 5MB max.
- **Credential Sanitization in Logs**: `console-message` handler redacts messages containing `NOVA_SAVE_PW`, `password`, `token`, `secret`, or `apiKey`.
- **Window Open Handler**: All webview popup requests are denied; only http/https URLs are routed through the secure new-tab IPC channel.

---

## Verification

- `npm run build`: 0 errors
- `npx tsc --noEmit`: 0 type errors
- `npm test`: 29/29 tests passing
