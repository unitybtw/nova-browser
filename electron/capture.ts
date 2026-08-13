import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

app.whenReady().then(async () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the Vite dev server
  await mainWindow.loadURL('http://localhost:5173');

  // Wait a bit for the page to render fully
  setTimeout(async () => {
    try {
      const image = await mainWindow!.webContents.capturePage();
      const buffer = image.toPNG();
      
      const outDir = path.join(__dirname, '../website/public/browser-assets');
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(outDir, 'hero-mockup-new.png'), buffer);
      console.log('Saved hero-mockup-new.png');
      
      app.quit();
    } catch (e) {
      console.error(e);
      app.quit();
    }
  }, 3000);
});
