const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 1280, height: 800 });
  win.loadURL('http://localhost:5173'); // assuming vite is running
  
  setTimeout(async () => {
    const img = await win.capturePage();
    fs.writeFileSync('/Users/siracsimsek/.gemini/antigravity/brain/553ca456-9d6d-485e-ae68-2d31adf84e57/scratch/test-shot.png', img.toPNG());
    console.log('Saved test-shot.png');
    app.quit();
  }, 10000);
});
