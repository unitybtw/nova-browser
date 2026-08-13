# Adversarial Challenge Report — Renderer & Storage (Challenger M1-2)

## Challenge Summary

**Overall risk assessment**: MEDIUM

- **ReaderMode.tsx safeBase64 Unicode Test**: **PASS WITH CAVEAT** (Valid Cyrillic, CJK, Emoji, percent-encoded URLs pass with 0 `btoa` DOMException crashes; lone surrogate malformed URLs trigger uncaught `URIError`).
- **BrowserView.tsx Tab Nullability Test**: **FAIL ON NULL/UNDEFINED** (Empty object `{}` passes; `null` and `undefined` tab props trigger uncaught `TypeError`).
- **App.tsx Startup localStorage Hydration**: **PASS** (13/13 test scenarios with corrupted/malformed JSON strings hydrators fall back gracefully).
- **Compilation**: **PASS** (`npm run build` exits 0 with 0 TypeScript errors).

## Challenges

### [Medium] Challenge 1: `BrowserView.tsx` throws uncaught TypeError when `tab` prop is `null` or `undefined`
- **Assumption challenged**: Assumed `tab` prop passed to `BrowserView` component will always be a valid non-null object.
- **Attack scenario**: Parent component renders `<BrowserView tab={null} ... />` or `<BrowserView tab={undefined} ... />` (e.g. during asynchronous tab switching or tab closure race conditions).
- **Blast radius**: Uncaught `TypeError: Cannot read properties of null (reading 'url')` crashes the React component render tree.
- **Mitigation**: Add optional chaining in `BrowserView.tsx` line 63/64 (`tab?.url`) or return early `if (!tab) return null;`.

### [Low] Challenge 2: `safeBase64` in `ReaderMode.tsx` throws uncaught `URIError` on lone surrogate strings
- **Assumption challenged**: Assumed strings passed to `safeBase64` will always be valid UTF-16 code unit sequences without lone surrogates.
- **Attack scenario**: Navigating to a URL containing lone surrogates (`\uD800`). `encodeURIComponent` throws `URIError`. The `catch` block calls `encodeURIComponent(str)` a second time, which re-throws uncaught `URIError`.
- **Blast radius**: `ReaderMode.tsx` fails to render or store highlights for URLs with malformed surrogate sequences.
- **Mitigation**: Wrap the `catch` block fallback in a nested `try...catch` or sanitize lone surrogates with `String(str).replace(/[^a-zA-Z0-9]/g, '_')`.

## Stress Test Results

- [Scenario 1.1] Cyrillic URL (`https://ru.wikipedia.org/wiki/Заглавная_страница`) → No `btoa` DOMException → Encoded base64 `aHR0cHM6...` → PASS
- [Scenario 1.2] CJK URL (`https://zh.wikipedia.org/wiki/中文`) → No `btoa` DOMException → Encoded base64 `aHR0cHM6...` → PASS
- [Scenario 1.3] Emoji URL (`https://example.com/😊/🎉/test`) → No `btoa` DOMException → Encoded base64 `aHR0cHM6...` → PASS
- [Scenario 1.4] Percent-encoded URL (`https://example.com/foo%20bar%26baz`) → No `btoa` DOMException → Encoded base64 `aHR0cHM6...` → PASS
- [Scenario 1.5] Lone surrogate URL (`https://example.com/\uD800/test`) → Fallback to safe string → Uncaught `URIError` → FAIL
- [Scenario 2.1] `BrowserView` with `tab = null` → Graceful render/null → `TypeError: Cannot read properties of null (reading 'url')` → FAIL
- [Scenario 2.2] `BrowserView` with `tab = undefined` → Graceful render/null → `TypeError: Cannot read properties of undefined (reading 'url')` → FAIL
- [Scenario 2.3] `BrowserView` with `tab = {}` → Default to NewTabPage → Handled safely → PASS
- [Scenario 2.4] `BrowserView` with `tab = { id: 't1' }` → Missing url handled → Handled safely → PASS
- [Scenario 3.1] `App.tsx` with corrupted `user_settings` JSON → Fallback to defaults → Handled safely → PASS
- [Scenario 3.2] `App.tsx` with corrupted `tabs_session` JSON → Fallback to new tab → Handled safely → PASS
- [Scenario 3.3] `App.tsx` with corrupted `workspaces_session` JSON → Fallback to default workspaces → Handled safely → PASS
- [Scenario 3.4] `App.tsx` with corrupted `nova_vpn` JSON → Fallback to defaults → Handled safely → PASS
- [Scenario 3.5] `App.tsx` with corrupted `browsing_history` JSON → Fallback to empty array → Handled safely → PASS
- [Scenario 3.6] `App.tsx` with corrupted `bookmarks` JSON → Fallback to empty array → Handled safely → PASS
- [Scenario 4.1] `npm run build` execution → Clean compilation → 0 TS errors, build succeeded → PASS

## Unchallenged Areas
- Electron main process IPC handler performance under 10k concurrent messages (Out of scope for Challenger M1-2).
