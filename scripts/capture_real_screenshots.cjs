const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-screenshots-capture-'));
app.setPath('userData', profile);

const rootDir = path.resolve(__dirname, '..');
const publicScreenshotsDir = path.join(rootDir, 'public', 'screenshots');
const websiteImagesDir = path.join(rootDir, 'website', 'public', 'images');
const websiteScreenshotsDir = path.join(rootDir, 'website', 'public', 'screenshots');

fs.mkdirSync(publicScreenshotsDir, { recursive: true });
fs.mkdirSync(websiteImagesDir, { recursive: true });
fs.mkdirSync(websiteScreenshotsDir, { recursive: true });

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    frame: false,
    enableLargerThanScreen: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  win.setContentSize(1440, 900);
  const distHtml = 'file://' + path.resolve(rootDir, 'dist/index.html');

  async function captureScene({ name, query, action, outputs, format = 'jpg' }) {
    console.log(`Capturing: ${name} (${query})...`);
    await win.loadURL(`${distHtml}${query}`);
    await new Promise((r) => setTimeout(r, 1200));
    if (action) {
      await win.webContents.executeJavaScript(action);
      await new Promise((r) => setTimeout(r, 900));
    }
    // Wait two animation frames for crisp paint
    await win.webContents.executeJavaScript(
      'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'
    );
    const nativeImg = await win.webContents.capturePage();
    const resized = nativeImg.resize({ width: 1440, height: 900, quality: 'best' });
    const buf = format === 'png' ? resized.toPNG() : resized.toJPEG(90);
    for (const outPath of outputs) {
      fs.writeFileSync(outPath, buf);
      console.log(`  -> Saved ${path.relative(rootDir, outPath)} (${Math.round(buf.length / 1024)} KB)`);
    }
  }

  // 1. Live Design Studio (Layout tab, Dark) -> website/public/images/shot-studio.jpg & public/screenshots/live-design-studio.jpg
  await captureScene({
    name: 'Live Design Studio (Layout Tab - Dark)',
    query: '?demo=true&feature=studio&tabs=horizontal&theme=dark&bg=clean',
    action: `(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const layoutBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Layout');
      if (layoutBtn) layoutBtn.click();
    })()`,
    outputs: [
      path.join(websiteImagesDir, 'shot-studio.jpg'),
      path.join(publicScreenshotsDir, 'live-design-studio.jpg'),
    ],
    format: 'jpg',
  });

  // 2. Local WebGPU AI Assistant + Vertical Tabs (Dark) -> website/public/images/shot-ai.jpg & preview.png
  await captureScene({
    name: 'Local WebGPU AI Assistant + Vertical Tabs (Dark)',
    query: '?demo=true&feature=ai&tabs=vertical&theme=dark&bg=clean',
    outputs: [
      path.join(websiteImagesDir, 'shot-ai.jpg'),
    ],
    format: 'jpg',
  });
  await captureScene({
    name: 'Local WebGPU AI Assistant + Vertical Tabs PNG (Dark)',
    query: '?demo=true&feature=ai&tabs=vertical&theme=dark&bg=clean',
    outputs: [
      path.join(publicScreenshotsDir, 'preview.png'),
      path.join(websiteScreenshotsDir, 'preview.png'),
    ],
    format: 'png',
  });

  // 3. Dual Split View (Dark) -> website/public/images/shot-split.jpg
  await captureScene({
    name: 'Dual Split View (Dark)',
    query: '?demo=true&feature=split&tabs=horizontal&theme=dark&bg=clean',
    outputs: [
      path.join(websiteImagesDir, 'shot-split.jpg'),
    ],
    format: 'jpg',
  });

  // 4. Chrome Web Store Extensions Modal (Dark) -> website/public/images/shot-extensions.jpg
  await captureScene({
    name: 'Extensions Modal (Dark)',
    query: '?demo=true&feature=extensions&tabs=horizontal&theme=dark&bg=clean',
    outputs: [
      path.join(websiteImagesDir, 'shot-extensions.jpg'),
    ],
    format: 'jpg',
  });

  // 5. Nova Sync Modal (Dark) -> website/public/images/shot-sync.jpg & sync.png
  await captureScene({
    name: 'Nova Sync Modal (Dark)',
    query: '?demo=true&feature=sync&tabs=horizontal&theme=dark&bg=clean',
    outputs: [
      path.join(websiteImagesDir, 'shot-sync.jpg'),
    ],
    format: 'jpg',
  });
  await captureScene({
    name: 'Nova Sync Modal PNG (Dark)',
    query: '?demo=true&feature=sync&tabs=horizontal&theme=dark&bg=nebula',
    outputs: [
      path.join(publicScreenshotsDir, 'sync.png'),
      path.join(websiteScreenshotsDir, 'sync.png'),
    ],
    format: 'png',
  });

  // 6. Vertical Tabs Start Page (Clean Light) -> public/screenshots/vertical-clean-light.jpg
  await captureScene({
    name: 'Vertical Tabs Start Page (Clean Light)',
    query: '?demo=true&feature=vertical_tabs&tabs=vertical&theme=light&bg=clean',
    outputs: [
      path.join(publicScreenshotsDir, 'vertical-clean-light.jpg'),
    ],
    format: 'jpg',
  });

  // 7. Vertical Tabs + AI Assistant (Clean Light) -> public/screenshots/vertical-assistant-clean-light.jpg
  await captureScene({
    name: 'Vertical Tabs + AI Assistant (Clean Light)',
    query: '?demo=true&feature=ai&tabs=vertical&theme=light&bg=clean',
    outputs: [
      path.join(publicScreenshotsDir, 'vertical-assistant-clean-light.jpg'),
    ],
    format: 'jpg',
  });

  // 8. Horizontal Tabs Start Page (Clean Light) -> public/screenshots/horizontal-clean-light.jpg
  await captureScene({
    name: 'Horizontal Tabs Start Page (Clean Light)',
    query: '?demo=true&feature=website&tabs=horizontal&theme=light&bg=clean',
    outputs: [
      path.join(publicScreenshotsDir, 'horizontal-clean-light.jpg'),
    ],
    format: 'jpg',
  });

  // 9. Horizontal Tabs + AI Assistant (Clean Light) -> public/screenshots/horizontal-assistant-clean-light.jpg
  await captureScene({
    name: 'Horizontal Tabs + AI Assistant (Clean Light)',
    query: '?demo=true&feature=ai&tabs=horizontal&theme=light&bg=clean',
    outputs: [
      path.join(publicScreenshotsDir, 'horizontal-assistant-clean-light.jpg'),
    ],
    format: 'jpg',
  });

  // 10. Nova Sync Modal (Clean Light) -> public/screenshots/sync-clean-light.jpg
  await captureScene({
    name: 'Nova Sync Modal (Clean Light)',
    query: '?demo=true&feature=sync&tabs=horizontal&theme=light&bg=clean',
    outputs: [
      path.join(publicScreenshotsDir, 'sync-clean-light.jpg'),
    ],
    format: 'jpg',
  });

  // 11. Horizontal Tabs Start Page (Dark Cyber Grid) -> horizontal-newtab.png
  await captureScene({
    name: 'Horizontal Tabs Start Page PNG (Dark)',
    query: '?demo=true&feature=website&tabs=horizontal&theme=dark&bg=cyber_grid',
    outputs: [
      path.join(publicScreenshotsDir, 'horizontal-newtab.png'),
      path.join(websiteScreenshotsDir, 'horizontal-newtab.png'),
    ],
    format: 'png',
  });

  // 12. Horizontal Tabs + AI Assistant (Dark) -> horizontal-preview.png
  await captureScene({
    name: 'Horizontal Tabs + AI Assistant PNG (Dark)',
    query: '?demo=true&feature=ai&tabs=horizontal&theme=dark&bg=clean',
    outputs: [
      path.join(publicScreenshotsDir, 'horizontal-preview.png'),
      path.join(websiteScreenshotsDir, 'horizontal-preview.png'),
    ],
    format: 'png',
  });

  // 13. Vertical Tabs Start Page (Dark Nebula) -> newtab.png
  await captureScene({
    name: 'Vertical Tabs Start Page PNG (Dark)',
    query: '?demo=true&feature=vertical_tabs&tabs=vertical&theme=dark&bg=nebula',
    outputs: [
      path.join(publicScreenshotsDir, 'newtab.png'),
      path.join(websiteScreenshotsDir, 'newtab.png'),
    ],
    format: 'png',
  });

  console.log('All v1.5.3 browser screenshots captured successfully!');
  win.destroy();
  app.quit();
});
