const { app, BrowserWindow } = require('electron');

const portArgIndex = process.argv.indexOf('--benchmark-port');
const port = portArgIndex >= 0 ? process.argv[portArgIndex + 1] : '9229';
app.commandLine.appendSwitch('remote-debugging-port', port);
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-features', 'Translate,MediaRouter');
app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  win.loadFile(require('path').resolve(__dirname, 'benchmark_fixture.html'));
});

app.on('window-all-closed', () => app.quit());
