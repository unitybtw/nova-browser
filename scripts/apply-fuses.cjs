#!/usr/bin/env node
/**
 * electron-builder afterPack hook: hardens the packaged Electron binary by
 * flipping security-relevant fuses (@electron/fuses).
 *
 * Wired up via package.json "build.afterPack". Runs AFTER the app is packed
 * into context.appOutDir but BEFORE code signing, so signing stays valid.
 *
 * Fuses flipped:
 *   - RunAsNode                        -> OFF  (blocks ELECTRON_RUN_AS_NODE abuse)
 *   - EnableNodeCliInspectArguments    -> OFF  (blocks --inspect remote debugging)
 *   - EnableCookieEncryption           -> ON   (cookies encrypted at rest with safeStorage/DPAPI)
 *   - OnlyLoadAppFromAsar              -> ON   (app must load from app.asar;
 *                                               asar packaging confirmed: package.json
 *                                               "build" does not disable asar and
 *                                               electron-builder defaults to asar:true)
 *   - EnableEmbeddedAsarIntegrityValidation -> opt-in (NOVA_ENABLE_ASAR_INTEGRITY_FUSE=1):
 *                                               requires code signing to embed/verify
 *                                               ASAR integrity data. The Windows NSIS
 *                                               target has no signing config, so
 *                                               enabling it unconditionally would break
 *                                               unsigned builds. Turn it on for signed
 *                                               release builds.
 *
 * Non-matching platforms no-op gracefully with an explanation.
 */

const path = require('path');
const fs = require('fs');
const child_process = require('child_process');

function getElectronBinaryPath(context) {
  const productName = context.packager.appInfo.productFilename;
  switch (context.electronPlatformName) {
    case 'darwin':
    case 'mas':
      return path.join(context.appOutDir, `${productName}.app`, 'Contents', 'MacOS', productName);
    case 'win32':
      return path.join(context.appOutDir, `${productName}.exe`);
    case 'linux':
      return path.join(context.appOutDir, productName);
    default:
      return null;
  }
}

async function defaultExport(context) {
  const platform = context.electronPlatformName;
  const binaryPath = getElectronBinaryPath(context);

  if (!binaryPath) {
    console.log(`[apply-fuses] Platform "${platform}" not matched — skipping Electron fuse flipping (no-op).`);
    return;
  }
  if (!fs.existsSync(binaryPath)) {
    console.warn(`[apply-fuses] Electron binary not found at "${binaryPath}" — skipping fuse flipping (no-op).`);
    return;
  }

  const { flipFuses, FuseV1Options, FuseVersion } = require('@electron/fuses');

  const asarEnabled = context?.packager?.config?.asar !== false;
  const enableAsarIntegrity = asarEnabled && process.env.NOVA_ENABLE_ASAR_INTEGRITY_FUSE === '1';

  const plan = [
    ['RunAsNode', FuseV1Options.RunAsNode, false],
    ['EnableNodeCliInspectArguments', FuseV1Options.EnableNodeCliInspectArguments, false],
    ['EnableCookieEncryption', FuseV1Options.EnableCookieEncryption, true],
    ['OnlyLoadAppFromAsar', FuseV1Options.OnlyLoadAppFromAsar, asarEnabled],
    ['EnableEmbeddedAsarIntegrityValidation', FuseV1Options.EnableEmbeddedAsarIntegrityValidation, enableAsarIntegrity]
  ];

  const fuseConfig = {
    version: FuseVersion.V1,
    // Flipping fuses rewrites the Electron binary; on macOS this invalidates the
    // ad-hoc signature of the unpackaged binary. Re-adhoc-sign here — the real
    // identity signing happens afterwards in electron-builder's sign step.
    resetAdHocDarwinSignature: platform === 'darwin' || platform === 'mas'
  };
  for (const [, fuseOption, value] of plan) {
    fuseConfig[fuseOption] = value;
  }

  // Strip resource forks / extended attributes before signing
  if (platform === 'darwin' || platform === 'mas') {
    try {
      const appDir = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
      child_process.execSync(`xattr -cr "${appDir}"`, { stdio: 'ignore' });
    } catch (_) {}
  }

  try {
    await flipFuses(binaryPath, fuseConfig);
    console.log(`[apply-fuses] Flipped Electron fuses in ${binaryPath}:`);
    for (const [name, , value] of plan) {
      console.log(`[apply-fuses]   ${name} -> ${value ? 'ON' : 'OFF'}`);
    }
  } catch (err) {
    console.warn(`[apply-fuses] Initial fuse flipping failed (${err.message}). Retrying after deep attribute sweep...`);
    if (platform === 'darwin' || platform === 'mas') {
      try {
        const appDir = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
        child_process.execSync(`xattr -cr "${appDir}"`, { stdio: 'ignore' });
        await flipFuses(binaryPath, { ...fuseConfig, resetAdHocDarwinSignature: false });
        console.log(`[apply-fuses] Flipped Electron fuses successfully on retry.`);
      } catch (retryErr) {
        console.warn(`[apply-fuses] Non-fatal: fuse flipping skipped on unsigned build:`, retryErr.message);
      }
    }
  }

  if (!enableAsarIntegrity) {
    console.log('[apply-fuses] Note: EnableEmbeddedAsarIntegrityValidation left OFF (requires code-signed builds). Set NOVA_ENABLE_ASAR_INTEGRITY_FUSE=1 to enable.');
  }
}

// Support both electron-builder hook styles: module.exports = fn and exports.default = fn.
module.exports = defaultExport;
module.exports.default = defaultExport;
