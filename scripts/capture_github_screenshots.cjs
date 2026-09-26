const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const publicDir = path.resolve(__dirname, '../public');
const websitePublicDir = path.resolve(__dirname, '../website/public');

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

  const baseUrl = 'http://localhost:5173';

  const scenes = [
    {
      name: 'newtab.png',
      url: `${baseUrl}/?demo=true&feature=website&tabs=vertical&bg=aurora_waves`,
      desc: 'Vertical Tabs - New Tab Page'
    },
    {
      name: 'preview.png',
      url: `${baseUrl}/?demo=true&feature=ai&tabs=vertical&bg=nebula`,
      desc: 'Vertical Tabs - AI Assistant Sidepanel'
    },
    {
      name: 'horizontal-newtab.png',
      url: `${baseUrl}/?demo=true&feature=website&tabs=horizontal&bg=cyber_grid`,
      desc: 'Horizontal Tabs - New Tab Page'
    },
    {
      name: 'horizontal-preview.png',
      url: `${baseUrl}/?demo=true&feature=ai&tabs=horizontal&bg=nebula`,
      desc: 'Horizontal Tabs - AI Assistant Sidepanel'
    },
    {
      name: 'sync.png',
      url: `${baseUrl}/?demo=true&feature=sync&bg=aurora_waves`,
      desc: 'Nova Sync - Cloud Sync Interface'
    }
  ];

  for (const scene of scenes) {
    console.log(`Capturing: ${scene.desc} (${scene.name})...`);
    await win.loadURL(scene.url);
    await new Promise(r => setTimeout(r, 3500));
    const image = await win.webContents.capturePage();
    const pngBuffer = image.toPNG();

    const destPublic = path.join(publicDir, scene.name);
    fs.writeFileSync(destPublic, pngBuffer);
    console.log(`Saved to ${destPublic}, size: ${pngBuffer.length} bytes`);

    if (fs.existsSync(websitePublicDir)) {
      const destWebsite = path.join(websitePublicDir, scene.name);
      fs.writeFileSync(destWebsite, pngBuffer);
      console.log(`Copied to ${destWebsite}`);
    }
  }

  console.log('All 5 GitHub screenshots updated successfully!');
  app.quit();
});
