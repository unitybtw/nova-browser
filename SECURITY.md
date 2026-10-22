# Security Policy

Nova Browser takes security, memory safety, and user privacy seriously. This document outlines our security policies, vulnerability disclosure guidelines, response timelines, and threat model.

## Supported Versions

Nova Browser operates on a rolling release cadence. Security patches and hardening updates are delivered directly to the `main` branch and published in the latest tagged release.

| Version | Supported | Notes |
| :--- | :--- | :--- |
| >= 1.5.0 | Yes | Current active supported release series with active security patches |
| < 1.5.0 | No | End of life / Unsupported legacy versions. Upgrade to v1.5.0+ required. |

## Threat Model & Security Architecture

Nova Browser employs defense-in-depth principles across all application boundaries:

1. **Multi-Process Sandboxing**: Renderer preferences disable Node.js integration and enable context isolation and sandboxing (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`). On Linux, the current startup code disables the Chromium sandbox when running as root or when unprivileged user namespaces are disabled, and displays a warning. Those configurations do not provide the same isolation as a sandboxed launch.
2. **Webview Preload Scoping**: Specialized preloads (`webstore-preload.cjs`) are restricted exclusively to authorized Chrome Web Store origins (`chromewebstore.google.com` and `chrome.google.com`). All general webviews receive standard, restricted sandboxed preloads.
3. **IPC Origin Validation**: All IPC channels evaluate the sender's frame origin and webContents identifier using `isTrustedSender`. Subframe iframes and foreign webContents cannot invoke privileged host APIs.
4. **Credential Isolation**: Desktop secure storage uses Electron `safeStorage` when available. Otherwise it uses AES-256-GCM with a local file-backed secret and machine-derived key material. This fallback protects ciphertext integrity but does not provide OS-keystore isolation from an attacker who can read the user's files. Supabase sessions use this secure-store bridge on desktop; web mode disables persistent sessions.
5. **Local MCP Server Security**: The optional Model Context Protocol (MCP) server binds to IPv4 loopback (`127.0.0.1`), validates `Host` headers and requires bearer authorization. Its encrypted token persists across restarts unless explicitly rotated; `MCP_TOKEN` can override it. Tool policy, user approval and request expiry are separate controls.

Agent URL and DNS checks are preflight checks; they do not establish connection-time DNS pinning or complete private-network isolation across redirects. Treat that transport boundary as an area requiring further validation.

## Scope & Out of Scope

| In Scope | Out of Scope |
| :--- | :--- |
| Sandbox escape or privilege escalation from `<webview>` to host process | Attacks requiring physical access or root/administrator privileges on the user device |
| Remote Code Execution (RCE) or Command Injection via IPC or URL schemes | Self-XSS requiring users to paste malicious code into Developer Tools |
| Insecure credential storage or plaintext token leaks to renderer DOM | Vulnerabilities in third-party websites visited within the browser webview |
| SSRF vulnerabilities in internal proxy handlers or MCP server endpoints | Denial of Service through resource exhaustion on severely resource-constrained machines |
| Bypass of Safe Navigation URL filter policies or phishing blocklists | Issues in unmaintained or deprecated upstream third-party dependencies without proof of exploitability in Nova |

## Reporting a Vulnerability

Please do not report security vulnerabilities via public GitHub issues or public forums.

### Reporting Channels

Submit a private report via [GitHub Security Advisories](https://github.com/unitybtw/nova-browser/security/advisories/new). Do not send sensitive reports to an email address or encrypt them to a fingerprint unless a working contact and its public key have been independently verified.

### Information to Provide

To expedite triage and validation, please include:
- A clear description of the vulnerability and its potential security impact.
- Step-by-step reproduction instructions or a minimal reproducible proof-of-concept (PoC).
- Target platform (macOS Apple Silicon/Intel, Windows x64, Linux) and Nova Browser version.
- Any relevant logs, stack traces, or screenshots.

## Response and Disclosure

Maintainers prioritize reports by demonstrated impact and reachability. Acknowledgment, investigation and release timing depend on maintainer availability; no fixed response SLA is guaranteed. Coordinate public disclosure through the private advisory so users can receive a fix first.

## Safe Harbor

We consider security research conducted under this policy to be authorized. We will not pursue legal action against researchers who:
- Act in good faith to avoid privacy violations, data destruction, and service interruption.
- Give us reasonable time to remediate vulnerabilities before public disclosure.
- Do not exploit identified vulnerabilities beyond what is necessary to establish proof-of-concept.
