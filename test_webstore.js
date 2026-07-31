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

  win.loadURL('https://chromewebstore.google.com/detail/uBlock-Origin/cjpalhdlnbpafiamejdnhcphjbkeiagm');

  win.webContents.on('did-finish-load', async () => {
    try {
      const isAvailable = await win.webContents.executeJavaScript(`
        !document.body.innerText.includes('Item currently unavailable') && 
        !document.body.innerText.includes('Şu anda kullanılamıyor')
      `);
      
      const hasBanner = await win.webContents.executeJavaScript(`
        !!document.getElementById('nova-extension-banner')
      `);

      const userAgent = await win.webContents.executeJavaScript('navigator.userAgent');
      const vendor = await win.webContents.executeJavaScript('navigator.vendor');
      const hasWebstore = await win.webContents.executeJavaScript('!!window.chrome?.webstore');
      
      console.log(JSON.stringify({
        isAvailable,
        hasBanner,
        userAgent,
        vendor,
        hasWebstore
      }, null, 2));
      
      app.quit();
    } catch (e) {
      console.error(e);
      app.quit();
    }
  });
});
