/**
 * Electron Main Process Runtime Stability & Integrity Verification Suite
 * Nova Browser Milestone 3
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function verifyMainProcessRuntime() {
  console.log('====================================================');
  console.log('ELECTRON MAIN PROCESS RUNTIME STABILITY VERIFICATION');
  console.log('====================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const distElectronDir = path.join(rootDir, 'dist-electron');

  const compiledFiles = [
    'main.cjs',
    'preload.cjs',
    'webstore-preload.cjs'
  ];

  let errorsCount = 0;

  // STEP 1: Verify Compiled Artifact Existence & Non-Zero File Size
  console.log('--- Step 1: Checking Compiled Main Process Bundles ---');
  for (const filename of compiledFiles) {
    const filePath = path.join(distElectronDir, filename);
    if (!fs.existsSync(filePath)) {
      console.error(`[FAIL] Missing compiled artifact: ${filename}`);
      errorsCount++;
      continue;
    }
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      console.error(`[FAIL] Compiled artifact is empty (0 bytes): ${filename}`);
      errorsCount++;
      continue;
    }
    console.log(`[PASS] ${filename} exists (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  // STEP 2: Node Syntax Validation (`node --check`)
  console.log('\n--- Step 2: Executing Node Syntax Verification (`node --check`) ---');
  for (const filename of compiledFiles) {
    const filePath = path.join(distElectronDir, filename);
    try {
      execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
      console.log(`[PASS] Syntax check clean for ${filename}`);
    } catch (err: any) {
      console.error(`[FAIL] Syntax error in ${filename}:`, err.stderr?.toString() || err.message);
      errorsCount++;
    }
  }

  // STEP 3: External Require Resolution Validation
  console.log('\n--- Step 3: Verifying Require Resolution for External Dependencies ---');
  const externalDependencies = [
    '@cliqz/adblocker-electron',
    'cross-fetch',
    'express',
    '@modelcontextprotocol/sdk/package.json',
    'electron-updater',
    'unzip-crx-3'
  ];

  for (const dep of externalDependencies) {
    try {
      require.resolve(dep, { paths: [rootDir] });
      console.log(`[PASS] Module resolution successful for '${dep}'`);
    } catch (err: any) {
      console.error(`[FAIL] Cannot resolve required external module '${dep}':`, err.message);
      errorsCount++;
    }
  }

  // STEP 4: IPC Handler Channel Contract Audit
  console.log('\n--- Step 4: Auditing Registered Main Process IPC Handlers ---');
  const mainCjsPath = path.join(distElectronDir, 'main.cjs');
  const mainCjsContent = fs.readFileSync(mainCjsPath, 'utf8');

  const expectedIpcHandlers = [
    'set-privacy-shield',
    'set-do-not-track',
    'set-theme',
    'capture-tab-thumbnail',
    'pause-download',
    'resume-download',
    'cancel-download',
    'open-download',
    'show-download-in-folder',
    'start-mcp-server',
    'stop-mcp-server',
    'get-mcp-token',
    'rotate-mcp-token',
    'get-mcp-tool-settings',
    'set-mcp-tool-enabled',
    'get-mcp-status',
    'clear-incognito-session',
    'clear-ai-models-cache',
    'secure-store-set',
    'secure-store-get',
    'store-set',
    'store-get',
    'set-vpn',
    'fetch-page-html',
    'get-suggestions',
    'select-extension-folder',
    'install-extension',
    'list-extensions',
    'open-extension-popup',
    'import-chrome-bookmarks',
    'remove-extension',
    'install-from-webstore',
    'check-for-updates',
    'install-update'
  ];

  for (const handler of expectedIpcHandlers) {
    if (mainCjsContent.includes(`"${handler}"`) || mainCjsContent.includes(`'${handler}'`)) {
      console.log(`[PASS] IPC handler verified: ${handler}`);
    } else {
      console.error(`[FAIL] Missing expected IPC channel binding in main.cjs: ${handler}`);
      errorsCount++;
    }
  }

  // STEP 5: Security Configurations in Main Process Bundle
  console.log('\n--- Step 5: Auditing Critical Security Flags in Bundle ---');
  const securityChecks = [
    { name: 'Context Isolation Enabled', pattern: /contextIsolation:\s*!0|contextIsolation:\s*true/ },
    { name: 'Node Integration Disabled', pattern: /nodeIntegration:\s*!1|nodeIntegration:\s*false/ },
    { name: 'Sandbox Enabled', pattern: /sandbox:\s*!0|sandbox:\s*true/ },
    { name: 'WebSecurity Active', pattern: /webSecurity:\s*!0|webSecurity:\s*true|webSecurity\s*=\s*!0|webSecurity\s*=\s*true/ }
  ];

  for (const check of securityChecks) {
    if (check.pattern.test(mainCjsContent)) {
      console.log(`[PASS] Security flag verified: ${check.name}`);
    } else {
      console.warn(`[WARN] Security flag check pattern missing: ${check.name}`);
    }
  }

  // SUMMARY
  console.log('\n====================================================');
  console.log('MAIN PROCESS RUNTIME VERIFICATION SUMMARY');
  console.log('====================================================');
  console.log(`Total Errors Detected: ${errorsCount}`);

  if (errorsCount > 0) {
    console.error('VERIFICATION FAILED!');
    process.exit(1);
  } else {
    console.log('VERIFICATION PASSED CLEANLY (0 ERRORS).');
  }
}

verifyMainProcessRuntime().catch(err => {
  console.error('Unhandled Verification Error:', err);
  process.exit(1);
});
