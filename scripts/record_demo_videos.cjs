/**
 * Records a REAL, single-take product tour video of the Nova Browser web build.
 *
 * The app ships with a built-in directed demo (App.tsx "Automated Real Browser
 * Demo Showcase"): when loaded with ?demo=true it cycles three 6.5s stages —
 *   stage 0: arXiv tab + AI SidePanel + animated glowing cursor
 *   stage 1: New Tab dashboard + cursor
 *   stage 2: Dual split-screen (React 19 / Tailwind docs)
 *
 * This script loads the real app offscreen, waits for a stage boundary, then
 * records exactly one full 19.5s cycle into website/public/demo/tour.webm via
 * a MediaRecorder encoder page (no ffmpeg). Debug stills are saved per stage
 * for visual verification.
 *
 * Usage: npx electron scripts/record_demo_videos.cjs
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const W = 1280;
const H = 800;
const FRAME_RATE = 20;
const STAGE_MS = 6500; // stage length inside the app's built-in showcase
const BOOT_MS = 4500; // initial app boot wait
const SETTLE_MS = 6300; // align recording start with the next stage boundary
const DUR_MS = STAGE_MS * 3; // one full cycle: 19.5s
const JPEG_QUALITY = 82;

const DIST_HTML = path.join(__dirname, '..', 'dist', 'index.html');
const OUT_DIR = path.join(__dirname, '..', 'website', 'public', 'demo');
const RECORDER_HTML = path.join(__dirname, 'recorder.html');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  if (!fs.existsSync(DIST_HTML)) {
    console.error('dist/index.html not found — run `npm run build` at the repo root first.');
    app.exit(1);
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // ---- Encoder helper window (nodeIntegration: local offline tool only) ----
  const encoder = new BrowserWindow({
    show: false,
    width: W,
    height: H,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
    },
  });
  await encoder.loadURL('file://' + RECORDER_HTML);

  // ---- Target window: the REAL Nova Browser, offscreen-rendered ----
  const target = new BrowserWindow({
    show: false,
    width: W,
    height: H,
    useContentSize: true,
    backgroundColor: '#020617',
    webPreferences: {
      offscreen: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      webSecurity: false,
    },
  });
  target.webContents.setFrameRate(FRAME_RATE);

  let forwarding = false;
  let framesSent = 0;
  let encodeFinished = false;
  let encodeError = null;

  ipcMain.on('started', (_e, mimeType) => console.log('  recording with', mimeType));
  ipcMain.on('encode-error', (_e, msg) => {
    encodeError = String(msg);
    console.error('  encoder error:', msg);
  });
  ipcMain.on('encoded', (_e, payload) => {
    encodeFinished = true;
    const webmPath = path.join(OUT_DIR, 'tour.webm');
    fs.writeFileSync(webmPath, Buffer.from(payload.buffer));
    if (payload.poster) {
      const b64 = String(payload.poster).split(',')[1] || '';
      fs.writeFileSync(path.join(OUT_DIR, 'tour.poster.jpg'), Buffer.from(b64, 'base64'));
    }
    console.log(`  saved tour.webm (${(payload.bytes / 1024).toFixed(0)} KB, ${framesSent} frames forwarded)`);
  });

  target.webContents.on('paint', (_event, _dirty, image) => {
    if (!forwarding) return;
    try {
      const jpeg = image.toJPEG(JPEG_QUALITY);
      encoder.webContents.send('frame', 'data:image/jpeg;base64,' + jpeg.toString('base64'));
      framesSent++;
    } catch (_) {
      /* skip dropped frame */
    }
  });

  const captureDebug = async (name) => {
    try {
      const img = await target.webContents.capturePage();
      fs.writeFileSync(path.join(OUT_DIR, `debug-${name}.jpg`), img.toJPEG(85));
      console.log(`  debug still: debug-${name}.jpg`);
    } catch (e) {
      console.warn('  debug capture failed:', name, e);
    }
  };

  console.log('Loading the real Nova Browser build…');
  await target.loadURL('file://' + DIST_HTML + '?demo=true&feature=ai&bg=nebula&theme=dark');
  await sleep(BOOT_MS);
  await captureDebug('boot');

  // Deterministic stage-boundary detection: the omnibox mirrors the active
  // tab URL. Stage 0 (AI + arXiv) is the only stage whose omnibox shows an
  // arxiv.org URL. Wait until we SEE arxiv, then see it DISAPPEAR (stage 1
  // began), then REAPPEAR — that reappearance is the exact start of a stage-0
  // window. Recording from there yields a clean AI → New Tab → Split cycle.
  const readOmnibox = async () => {
    try {
      return await target.webContents.executeJavaScript(
        `(function(){ var v=''; var inputs=document.querySelectorAll('input');` +
        ` for (var i=0;i<inputs.length;i++){ var val=inputs[i].value||'';` +
        ` if (/^(https?:|nova:)/.test(val)) { v=val; break; } } return v; })()`
      );
    } catch (_) {
      return '';
    }
  };

  console.log('Waiting for a stage-0 boundary (omnibox signal)…');
  const deadline = Date.now() + 60000;
  let seenArxiv = false;
  let sawNonArxivAfterArxiv = false;
  let boundaryFound = false;
  while (Date.now() < deadline) {
    const url = await readOmnibox();
    const isArxiv = /arxiv\.org/.test(url);
    if (isArxiv) seenArxiv = true;
    else if (seenArxiv && url) sawNonArxivAfterArxiv = true;
    if (seenArxiv && sawNonArxivAfterArxiv && isArxiv) {
      boundaryFound = true;
      break;
    }
    await sleep(120);
  }
  if (!boundaryFound) {
    console.error('Could not detect a stage boundary — aborting.');
    app.exit(1);
    return;
  }
  await captureDebug('boundary');
  console.log('Stage-0 boundary detected. Recording one full showcase cycle…');
  forwarding = true;
  encoder.webContents.send('start', { bitrate: 3_500_000 });

  // Debug stills at each stage midpoint for verification
  await sleep(STAGE_MS / 2);
  await captureDebug('stage-ai');
  await sleep(STAGE_MS);
  await captureDebug('stage-newtab');
  await sleep(STAGE_MS);
  await captureDebug('stage-split');

  await sleep(STAGE_MS / 2 - 400); // complete the 19.5s window
  forwarding = false;
  encoder.webContents.send('stop');

  const timeout = setTimeout(() => {
    if (!encodeFinished) {
      console.error('Encoder timed out.');
      app.exit(1);
    }
  }, 30000);
  const waitEncode = setInterval(() => {
    if (encodeFinished || encodeError) {
      clearTimeout(timeout);
      clearInterval(waitEncode);
      console.log('Done. Video in', OUT_DIR);
      app.exit(0);
    }
  }, 200);
});
