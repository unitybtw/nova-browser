# Contributing to Nova Browser

Thank you for your interest in contributing to Nova Browser. Nova is an open-source, sovereign desktop web browser built with Electron, React, TypeScript, and Vite, featuring a native Model Context Protocol (MCP) server, on-device WebGPU neural execution, and zero-knowledge encrypted multi-device sync.

This document outlines the workflow, development environment setup, architecture principles, and contribution guidelines.

---

## Code of Conduct

All contributors and participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating.

---

## Prerequisites

Before setting up the project locally, ensure you have the following installed:

- **Node.js**: Version 22.x LTS (Node 22.22.2 or later is supported)
- **npm**: Version 10.x or later
- **Git**: Version 2.30 or later
- **Operating System Build Tools**:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Visual Studio C++ Build Tools and Windows 10/11 SDK
  - **Linux**: Standard build tools (`build-essential`, `libsecret-1-dev`)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/unitybtw/nova-browser.git
cd nova-browser
```

### 2. Install Dependencies

Install root workspace dependencies:

```bash
npm install
```

If you plan to work on the marketing website or documentation site:

```bash
npm --prefix website install
```

### 3. Run in Development Mode

To start the React renderer development server and launch the Electron application simultaneously:

```bash
npm run dev
```

To run only the web interface in Vite without launching the Electron desktop container:

```bash
npm run dev:web
```

To develop the public website:

```bash
npm run dev:website
```

---

## Architecture Overview

Nova Browser is structured into distinct subsystems:

- `electron/`: Electron main process, host IPC bridges, webview preload scripts, and core desktop services:
  - `electron/main.ts`: Application entry point, window management, webContents lifecycle, and IPC handlers.
  - `electron/preload.ts`: Secure context bridge exposing host APIs to the primary React UI.
  - `electron/guest-preload.ts`: Sandboxed preload script injected into active `<webview>` guest pages.
  - `electron/webstore-preload.ts`: Scoped preload script for Chrome Web Store extension downloads.
  - `electron/mcpServer.ts`: Loopback HTTP and SSE Model Context Protocol server for coding agents.
  - `electron/main/crxInstaller.ts`: Safe CRX extension extraction and manifest validation engine.
- `src/`: React 18 renderer process (UI and state management):
  - `src/App.tsx`: Primary application layout, tab orchestration, split view coordination.
  - `src/components/`: Modular UI components (Omnibar, TabBar, Settings, DevTools, AI Chat).
  - `src/services/`: Client-side services including zero-knowledge E2EE sync, search engines, and AI agents.
- `website/`: Standalone React/Vite/Tailwind landing page and documentation showcase.
- `tests/`: Automated test suite covering security boundaries, IPC validation, extension extraction, and regressions.

---

## Security Invariants & Coding Standards

Nova Browser enforces strict security invariants across all processes:

1. **IPC Sender Validation**: Every `ipcMain.handle` and `ipcMain.on` handler that performs privileged operations MUST validate the sender using `isTrustedSender(event)` to prevent unauthorized IPC calls from guest webviews or subframes.
2. **Context Isolation**: Never enable `nodeIntegration: true` in any webview or BrowserWindow. Always retain `contextIsolation: true` and `sandbox: true`.
3. **Restricted Storage**: Plaintext passwords, private keys, or session tokens must never be written to unencrypted `localStorage`. Sensitive vault data must pass through platform keystores via Electron `safeStorage`.
4. **Input Sanitization**: All file system paths, URLs, and external commands must undergo canonicalization and validation before execution. Path traversal payloads and command injection vectors fail closed.
5. **Zero-Emoji Policy**: In accordance with project standards, do not include emojis in code comments, commit messages, pull request titles, or documentation files. Maintain clear, professional, and accessible technical prose.

---

## Verification & Testing Workflow

Before committing changes, execute the full validation pipeline:

```bash
# 1. Typecheck TypeScript across the codebase
npx tsc --noEmit

# 2. Run all unit, integration, and security tests
npm test

# 3. Verify Electron main process bundling
npm run build:electron

# 4. If website files were modified, verify website build
npm --prefix website run build
```

All pull requests must pass these checks in continuous integration (`.github/workflows/ci.yml`).

---

## Git Workflow & Conventional Commits

We follow the Conventional Commits specification. Commit messages should be structured as follows:

```text
type(scope): concise description in imperative mood
```

### Allowed Types

- `feat`: A new user-facing or developer feature
- `fix`: A bug fix
- `security`: Vulnerability mitigations, security boundary tightening, or sanitizer improvements
- `perf`: Performance optimizations (CPU, memory, bundle size)
- `refactor`: Code refactoring without changing functionality
- `docs`: Documentation updates or additions
- `test`: Adding or updating test suites
- `chore`: Build tooling, dependency maintenance, or CI workflow changes

### Branch Naming Conventions

- `feature/short-description`
- `fix/short-description`
- `security/short-description`
- `chore/short-description`

---

## Submitting a Pull Request

1. Fork the repository and create your feature branch from `main`.
2. Ensure all tests and type checks pass cleanly (`npx tsc --noEmit && npm test && npm run build:electron`).
3. Commit your changes using descriptive, conventional commit messages in English.
4. Push your branch to your fork: `git push origin feature/your-branch-name`.
5. Open a Pull Request targeting the `main` branch.
6. Complete all items in the pull request checklist.

---

## Reporting Security Vulnerabilities

Please do not report security vulnerabilities via public GitHub issues. Follow the guidelines in our [Security Policy](SECURITY.md) to report security concerns privately through GitHub Security Advisories or encrypted email.
