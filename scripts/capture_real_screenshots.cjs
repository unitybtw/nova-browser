const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const outDir = process.env.OUTPUT_DIR || path.join(__dirname, '..', 'dist-screenshots');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    }
  });

  const distHtml = 'file://' + path.resolve(__dirname, '../dist/index.html');

  console.log('Capturing Scene 1: Real New Tab Page (Cyber Grid 3D & OLED Dark)...');
  await win.loadURL(`${distHtml}?demo=true&feature=vertical_tabs&bg=cyber_grid`);
  await new Promise(r => setTimeout(r, 2500));
  let image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, 'real_nova_scene1_cyber_newtab.png'), image.toPNG());
  console.log('Scene 1 saved to real_nova_scene1_cyber_newtab.png');

  console.log('Capturing Scene 2: Real AI Assistant SidePanel & Web Co-Pilot...');
  await win.loadURL(`${distHtml}?demo=true&feature=ai&bg=nebula`);
  await new Promise(r => setTimeout(r, 2500));
  image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, 'real_nova_scene2_ai_copilot.png'), image.toPNG());
  console.log('Scene 2 saved to real_nova_scene2_ai_copilot.png');

  console.log('Capturing Scene 3: Real Split-Screen Multi-Tasking...');
  await win.loadURL(`${distHtml}?demo=true&feature=split&bg=mesh`);
  await new Promise(r => setTimeout(r, 2500));
  image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, 'real_nova_scene3_split_screen.png'), image.toPNG());
  console.log('Scene 3 saved to real_nova_scene3_split_screen.png');

  console.log('Capturing Scene 4: Real Privacy Shield & Security Defenses...');
  await win.loadURL(`${distHtml}?demo=true&feature=shield&bg=fireflies`);
  await new Promise(r => setTimeout(r, 2500));
  image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, 'real_nova_scene4_privacy_shield.png'), image.toPNG());
  console.log('Scene 4 saved to real_nova_scene4_privacy_shield.png');

  console.log('All 4 real browser screenshots captured with 100% genuine UI!');
  app.quit();
});
