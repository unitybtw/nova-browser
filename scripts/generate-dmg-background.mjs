import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Generates the macOS DMG installer background (`build/dmg-background@2x.png` at 1320x880
 * and `build/dmg-background.png` at 660x440).
 *
 * Coordinate alignment with `package.json -> build.dmg`:
 *   - Window: 660x440 (1x) -> 1320x880 (2x)
 *   - Icon size: 128pt (1x) -> 256px (2x)
 *   - App icon center: (180, 220) in 1x -> (360, 440) in 2x (spans x: 232..488, y: 312..568)
 *   - Applications link center: (480, 220) in 1x -> (960, 440) in 2x (spans x: 832..1088, y: 312..568)
 *   - Finder icon labels occupy y: ~576..618 in 2x
 *   - Visible Finder content height (440pt minus ~28pt titlebar) is ~412pt (824px in 2x)
 */
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body {
      width: 1320px;
      height: 880px;
      background-color: #0b0c0e;
      background-image:
        radial-gradient(ellipse 68% 42% at 50% 0%, rgba(255, 255, 255, 0.045) 0%, rgba(255, 255, 255, 0.012) 48%, transparent 78%),
        linear-gradient(180deg, #0d0e11 0%, #0b0c0e 55%, #090a0c 100%);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", Helvetica, Arial, sans-serif;
      color: #fafafa;
      position: relative;
      overflow: hidden;
    }

    /* Subtle top specular hairline */
    .top-hairline {
      position: absolute;
      top: 0;
      left: 15%;
      right: 15%;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.14) 50%, transparent 100%);
    }

    /* Header Section (y: 74..205 in 2x, well clear of icons at y: 312) */
    .header {
      position: absolute;
      top: 76px;
      left: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 16px;
      z-index: 10;
    }

    .brand-row {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 36px;
      height: 36px;
      display: block;
    }

    .brand-name {
      font-size: 24px;
      font-weight: 500;
      letter-spacing: -0.015em;
      color: #a1a1aa;
    }

    .title {
      font-size: 46px;
      font-weight: 600;
      letter-spacing: -0.032em;
      line-height: 1.12;
      color: #fafafa;
    }

    /* Frameless Sculptural Arrow (centered at x: 660, y: 440 between icons at 360 and 960) */
    .connector {
      position: absolute;
      left: 660px;
      top: 440px;
      transform: translate(-50%, -50%);
      width: 200px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 5;
    }

    /* Quiet Signature Footer (placed at y: 726 in 2x so it sits cleanly inside the 824px visible Finder area) */
    .footer {
      position: absolute;
      top: 724px;
      left: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      z-index: 10;
    }

    .footer-rule {
      width: 96px;
      height: 1px;
      background: rgba(255, 255, 255, 0.09);
    }

    .footer-text {
      font-size: 22px;
      font-weight: 500;
      letter-spacing: 0.01em;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div class="top-hairline"></div>

  <!-- Editorial Header -->
  <div class="header">
    <div class="brand-row">
      <svg class="brand-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none">
        <defs>
          <linearGradient id="nova-sq-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#171b24"/>
            <stop offset="45%" stop-color="#0d0f14"/>
            <stop offset="100%" stop-color="#07080b"/>
          </linearGradient>
          <linearGradient id="nova-sq-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(238,240,243,0.26)"/>
            <stop offset="50%" stop-color="rgba(238,240,243,0.1)"/>
            <stop offset="100%" stop-color="rgba(238,240,243,0.04)"/>
          </linearGradient>
          <mask id="nova-eclipse-app">
            <rect width="1024" height="1024" fill="#ffffff"/>
            <circle cx="536" cy="488" r="176" fill="#000000"/>
            <path d="M684 186 C684 288 632 340 530 340 C632 340 684 392 684 494 C684 392 736 340 838 340 C736 340 684 288 684 186 Z" fill="#000000" stroke="#000000" stroke-width="48" stroke-linejoin="round"/>
          </mask>
        </defs>
        <rect x="80" y="80" width="864" height="864" rx="200" fill="url(#nova-sq-bg)" stroke="url(#nova-sq-rim)" stroke-width="16"/>
        <circle cx="502" cy="522" r="296" fill="#eef0f3" mask="url(#nova-eclipse-app)"/>
        <path d="M684 208 C684 294 640 340 554 340 C640 340 684 386 684 472 C684 386 728 340 814 340 C728 340 684 294 684 208 Z" fill="#1f2de6"/>
      </svg>
      <span class="brand-name">Nova Browser</span>
    </div>
    <h1 class="title">Drag Nova Browser to Applications</h1>
  </div>

  <!-- Minimal Frameless Connector Arrow -->
  <div class="connector">
    <svg width="200" height="48" viewBox="0 0 200 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="arrow-shaft" x1="16" y1="24" x2="178" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08"/>
          <stop offset="35%" stop-color="#ffffff" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.82"/>
        </linearGradient>
      </defs>
      <line x1="16" y1="24" x2="176" y2="24" stroke="url(#arrow-shaft)" stroke-width="3" stroke-linecap="round"/>
      <path d="M162 11L177 24L162 37" stroke="#f4f4f5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>

  <!-- Quiet Signature Footer -->
  <div class="footer">
    <div class="footer-rule"></div>
    <div class="footer-text">Nova Browser for macOS</div>
  </div>
</body>
</html>
`;

const tempHtmlPath = path.join(os.tmpdir(), 'dmg-template.html');
const out2xPath = path.join(rootDir, 'build', 'dmg-background@2x.png');
const out1xPath = path.join(rootDir, 'build', 'dmg-background.png');
fs.mkdirSync(path.join(rootDir, 'build'), { recursive: true });

fs.writeFileSync(tempHtmlPath, htmlContent);

if (process.platform !== 'darwin') {
  console.log('[generate-dmg-background] DMG generation is macOS-only. Skipping on ' + process.platform);
  process.exit(0);
}

const chromeBin = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!fs.existsSync(chromeBin)) {
  console.warn('[generate-dmg-background] Google Chrome not found at ' + chromeBin + '. Skipping DMG background render.');
  process.exit(0);
}

console.log('Rendering Retina 2x DMG Background (1320x880)...');
execSync(
  `"${chromeBin}" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --screenshot="${out2xPath}" --window-size=1320,880 --default-background-color=00000000 "file://${tempHtmlPath}"`,
  { stdio: 'inherit' }
);
fs.rmSync(tempHtmlPath, { force: true });

console.log('Rendering 1x DMG Background (660x440)...');
try {
  execSync(`sips -z 440 660 "${out2xPath}" --out "${out1xPath}"`, { stdio: 'inherit' });
} catch (e) {
  console.warn('[generate-dmg-background] sips resize failed, copying 2x to 1x:', e.message);
  fs.copyFileSync(out2xPath, out1xPath);
}

console.log('DMG Backgrounds generated successfully in build/ directory:');
console.log(' - ' + out2xPath);
console.log(' - ' + out1xPath);
