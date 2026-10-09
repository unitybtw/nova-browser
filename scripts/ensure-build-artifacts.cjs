const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distAssets = path.join(rootDir, 'dist', 'assets');
const distElectronMain = path.join(rootDir, 'dist-electron', 'main.cjs');

if (!fs.existsSync(distAssets) || !fs.existsSync(distElectronMain)) {
  console.log('[ensure-build-artifacts] Production artifacts missing, executing npm run build...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}
