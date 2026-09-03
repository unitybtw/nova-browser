import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const htmlContent = `
<!DOCTYPE html>
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
      background-color: #080a11;
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(6, 182, 212, 0.22) 0%, rgba(14, 165, 233, 0.08) 35%, transparent 65%),
        radial-gradient(circle at 18% 50%, rgba(6, 182, 212, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 82% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
        linear-gradient(180deg, #090c15 0%, #06080e 100%);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Helvetica, Arial, sans-serif;
      color: #ffffff;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 58px 60px 42px;
    }

    /* Perimeter inner border */
    .frame-border {
      position: absolute;
      inset: 14px;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 26px;
      pointer-events: none;
      box-shadow: 
        inset 0 1px 0 rgba(255, 255, 255, 0.12),
        inset 0 0 40px rgba(0, 0, 0, 0.6);
    }

    /* Top ambient light line */
    .top-glow-line {
      position: absolute;
      top: 14px;
      left: 20%;
      right: 20%;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.6) 50%, transparent 100%);
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.8);
    }

    /* Header Section */
    .header {
      text-align: center;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 14px;
      border-radius: 9999px;
      background: rgba(6, 182, 212, 0.12);
      border: 1px solid rgba(6, 182, 212, 0.3);
      color: #38bdf8;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      box-shadow: 0 2px 10px rgba(6, 182, 212, 0.15);
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 8px #38bdf8;
    }

    .title {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #ffffff;
      text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
    }

    .subtitle {
      font-size: 16px;
      color: #94a3b8;
      font-weight: 400;
      letter-spacing: -0.01em;
    }

    /* Platform Drop Targets */
    .targets-container {
      position: absolute;
      top: 440px; /* y: 220 in 1x -> 440 in 2x */
      left: 0;
      width: 1320px;
      transform: translateY(-50%);
      pointer-events: none;
      z-index: 5;
    }

    /* Left Target (x: 180 -> 360 in 2x) */
    .target-left {
      position: absolute;
      left: 360px;
      top: 0;
      transform: translate(-50%, -50%);
      width: 250px;
      height: 250px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(6, 182, 212, 0.16) 0%, rgba(6, 182, 212, 0.04) 55%, transparent 75%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .target-platform {
      width: 190px;
      height: 190px;
      border-radius: 50%;
      border: 1.5px solid rgba(6, 182, 212, 0.35);
      background: rgba(6, 182, 212, 0.04);
      box-shadow: 
        inset 0 0 20px rgba(6, 182, 212, 0.15),
        0 0 24px rgba(6, 182, 212, 0.1);
    }

    /* Right Target (x: 480 -> 960 in 2x) */
    .target-right {
      position: absolute;
      left: 960px;
      top: 0;
      transform: translate(-50%, -50%);
      width: 250px;
      height: 250px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.16) 0%, rgba(59, 130, 246, 0.04) 55%, transparent 75%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .target-platform-right {
      width: 190px;
      height: 190px;
      border-radius: 50%;
      border: 1.5px solid rgba(59, 130, 246, 0.35);
      background: rgba(59, 130, 246, 0.04);
      box-shadow: 
        inset 0 0 20px rgba(59, 130, 246, 0.15),
        0 0 24px rgba(59, 130, 246, 0.1);
    }

    /* Directional Connector Arrow */
    .connector-arrow {
      position: absolute;
      left: 485px;
      top: 0;
      width: 350px;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .arrow-track {
      position: relative;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, 
        rgba(6, 182, 212, 0.2) 0%, 
        rgba(56, 189, 248, 0.8) 40%, 
        rgba(59, 130, 246, 0.8) 85%, 
        transparent 100%
      );
      border-radius: 2px;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
    }

    /* Pulse dots on arrow track */
    .pulse-dot-1 {
      position: absolute;
      top: -3px;
      left: 20%;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 10px #38bdf8;
    }

    .pulse-dot-2 {
      position: absolute;
      top: -4px;
      left: 55%;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 0 14px #38bdf8;
    }

    .pulse-dot-3 {
      position: absolute;
      top: -3px;
      left: 82%;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #60a5fa;
      box-shadow: 0 0 10px #60a5fa;
    }

    .arrow-head {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-top: 10px solid transparent;
      border-bottom: 10px solid transparent;
      border-left: 15px solid #60a5fa;
      filter: drop-shadow(0 0 10px rgba(96, 165, 250, 0.9));
    }

    /* Footer Section */
    .footer {
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 26px;
      padding: 9px 24px;
      border-radius: 9999px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .footer-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #94a3b8;
      font-weight: 500;
      letter-spacing: -0.01em;
    }

    .footer-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #334155;
    }
  </style>
</head>
<body>
  <div class="frame-border"></div>
  <div class="top-glow-line"></div>

  <!-- Header -->
  <div class="header">
    <div class="badge">
      <span class="badge-dot"></span>
      Nova Browser
    </div>
    <h1 class="title">Drag to Applications to Install</h1>
    <p class="subtitle">Drag the Nova icon to the Applications folder to complete installation</p>
  </div>

  <!-- Targets & Connector -->
  <div class="targets-container">
    <div class="target-left">
      <div class="target-platform"></div>
    </div>

    <div class="connector-arrow">
      <div class="arrow-track">
        <div class="pulse-dot-1"></div>
        <div class="pulse-dot-2"></div>
        <div class="pulse-dot-3"></div>
      </div>
      <div class="arrow-head"></div>
    </div>

    <div class="target-right">
      <div class="target-platform-right"></div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-item">On-Device WebGPU AI</div>
    <span class="footer-dot"></span>
    <div class="footer-item">Rust Ad-Blocker</div>
    <span class="footer-dot"></span>
    <div class="footer-item">Zero-Knowledge Cloud Sync</div>
    <span class="footer-dot"></span>
    <div class="footer-item">MIT Open Source</div>
  </div>
</body>
</html>
`;

const tempHtmlPath = path.join('/tmp', 'dmg-template.html');
const out2xPath = path.join(rootDir, 'build', 'dmg-background@2x.png');
const out1xPath = path.join(rootDir, 'build', 'dmg-background.png');

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
  `"${chromeBin}" --headless --disable-gpu --screenshot="${out2xPath}" --window-size=1320,880 --default-background-color=00000000 "file://${tempHtmlPath}"`,
  { stdio: 'inherit' }
);

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
