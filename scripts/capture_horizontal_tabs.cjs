const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const assetsDir = path.resolve(__dirname, '../public');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    }
  });

  const distHtml = 'file://' + path.resolve(__dirname, '../dist/index.html');

  console.log('Capturing Scene 1: Horizontal Tabs - New Tab Dashboard...');
  await win.loadURL(`${distHtml}?demo=true&feature=website&tabs=horizontal&bg=cyber_grid`);
  await new Promise(r => setTimeout(r, 3000));
  let image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(assetsDir, 'horizontal-newtab.png'), image.toPNG());
  console.log('Scene 1 saved to public/horizontal-newtab.png', image.getSize());

  console.log('Capturing Scene 2: Horizontal Tabs - Active Browsing & AI Copilot...');
  await win.loadURL(`${distHtml}?demo=true&feature=ai&tabs=horizontal&bg=nebula`);
  await new Promise(r => setTimeout(r, 3000));
  image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(assetsDir, 'horizontal-preview.png'), image.toPNG());
  console.log('Scene 2 saved to public/horizontal-preview.png', image.getSize());

  console.log('Horizontal screenshots captured successfully!');
  app.quit();
});
