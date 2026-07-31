const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: __dirname + '/dist-electron/webstore-preload.cjs'
    }
  });

  win.webContents.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

  win.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[Console] ${message} (${sourceId}:${line})`);
  });

  win.loadURL('https://chromewebstore.google.com/detail/uBlock-Origin/cjpalhdlnbpafiamejdnhcphjbkeiagm');

  win.webContents.on('did-finish-load', async () => {
    app.quit();
  });
});
