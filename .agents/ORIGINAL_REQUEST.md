# Original User Request

## 2026-08-12T20:52:55Z

<USER_REQUEST>
# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Scan the Nova Browser codebase for bugs, runtime errors, and vulnerabilities, implement fixes, and push the changes directly to the `main` branch on GitHub.

Working directory: /Users/siracsimsek/Desktop/novabrowser
Integrity mode: development

## Requirements

### R1. Backend & Security Audit
Scan the codebase with a primary focus on the Electron backend/main process logic and security/privacy vulnerabilities.

### R2. Bug Fixing & Stabilization
Implement robust fixes for identified issues without altering the core architecture or breaking existing features.

### R3. Version Control Integration
Commit all verified fixes to the local Git repository and push them directly to the `main` branch (`origin/main`).

## Acceptance Criteria

### Code Quality & Security
- [ ] Project successfully compiles (`npm run build`) with zero TypeScript errors.
- [ ] Application launches without runtime crashes in the Electron main process.
- [ ] No new security vulnerabilities are introduced.

### Version Control
- [ ] Changes are cleanly committed to the `main` branch.
- [ ] Changes are successfully pushed to `origin/main`.
</USER_REQUEST>
