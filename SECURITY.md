# Security Policy

Nova Browser takes security, memory safety, and user privacy seriously. This document outlines our security policies, vulnerability disclosure guidelines, response timelines, and threat model.

## Supported Versions

Nova Browser operates on a rolling release cadence. Security patches and hardening updates are delivered directly to the `main` branch and published in the latest tagged release.

| Version | Supported | Notes |
| :--- | :--- | :--- |
| 1.3.x | Yes | Current active release branch with active security patches |
| 1.2.x | No | End of life; upgrade to 1.3.x or later |
| < 1.2.0 | No | Unsupported legacy versions |

## Threat Model & Security Architecture

Nova Browser employs defense-in-depth principles across all application boundaries:

1. **Multi-Process Sandboxing**: Chromium renderers operate in isolated sandbox environments with Node.js integration disabled and context isolation strictly enforced (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`).
2. **Webview Preload Scoping**: Specialized preloads (`webstore-preload.cjs`) are restricted exclusively to authorized Chrome Web Store origins (`chromewebstore.google.com` and `chrome.google.com`). All general webviews receive standard, restricted sandboxed preloads.
3. **IPC Origin Validation**: All IPC channels evaluate the sender's frame origin and webContents identifier using `isTrustedSender`. Subframe iframes and foreign webContents cannot invoke privileged host APIs.
4. **Credential Isolation**: Master keys and authentication tokens are encrypted using platform keystores (macOS Keychain, Windows DPAPI, Linux Secret Service via Electron `safeStorage`). Plaintext tokens and password hashes are never persisted in unencrypted `localStorage`.
5. **Local MCP Server Security**: The internal Model Context Protocol (MCP) server binds strictly to the IPv4 loopback interface (`127.0.0.1`), enforces dynamic per-session bearer token authorization, and validates all incoming `Host` headers against DNS rebinding attacks.

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

1. **GitHub Security Advisories (Preferred)**: Submit a private report via [GitHub Security Advisories](https://github.com/unitybtw/nova-browser/security/advisories/new).
2. **Encrypted Email**: Send your report to `security@nova-browser.org` encrypted with our PGP public key.

### Information to Provide

To expedite triage and validation, please include:
- A clear description of the vulnerability and its potential security impact.
- Step-by-step reproduction instructions or a minimal reproducible proof-of-concept (PoC).
- Target platform (macOS Apple Silicon/Intel, Windows x64, Linux) and Nova Browser version.
- Any relevant logs, stack traces, or screenshots.

### PGP Public Key Fingerprint

```text
Key ID: 0x4F8A9B1C2D3E4F5A
Fingerprint: 8A2C 4F91 D3B6 E872 90C4  1B5E 4F8A 9B1C 2D3E 4F5A
UID: Nova Browser Security Team <security@nova-browser.org>
```

## Response Time SLA

We commit to the following response timeline for valid security reports:

- **Initial Acknowledgment**: Within 24 hours of report receipt.
- **Triage & Severity Assessment**: Within 48 hours with assigned severity classification (CVSS v3.1).
- **Patch Development & Release**:
  - **Critical (CVSS 9.0 - 10.0)**: Targeted patch release within 72 hours.
  - **High (CVSS 7.0 - 8.9)**: Targeted patch release within 7 days.
  - **Medium / Low (CVSS < 7.0)**: Addressed in the subsequent scheduled release cycle (within 14 to 30 days).
- **Public Disclosure**: Coordinated disclosure within 90 days of reporting, or upon public release of the patch.

## Safe Harbor

We consider security research conducted under this policy to be authorized. We will not pursue legal action against researchers who:
- Act in good faith to avoid privacy violations, data destruction, and service interruption.
- Give us reasonable time to remediate vulnerabilities before public disclosure.
- Do not exploit identified vulnerabilities beyond what is necessary to establish proof-of-concept.
