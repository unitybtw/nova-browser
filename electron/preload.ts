import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Existing API
  setTheme: (theme: 'light' | 'dark' | 'system') => ipcRenderer.send('set-theme', theme),
  setPrivacyShield: (enabled: boolean) => ipcRenderer.invoke('set-privacy-shield', enabled),
  getSuggestions: (query: string) => ipcRenderer.invoke('get-suggestions', query),
  pauseDownload: (id: string) => ipcRenderer.invoke('pause-download', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('resume-download', id),
  cancelDownload: (id: string) => ipcRenderer.invoke('cancel-download', id),
  openDownload: (pathStr: string) => ipcRenderer.invoke('open-download', pathStr),
  showDownloadInFolder: (pathStr: string) => ipcRenderer.invoke('show-download-in-folder', pathStr),
  startMcpServer: () => ipcRenderer.invoke('start-mcp-server'),
  stopMcpServer: () => ipcRenderer.invoke('stop-mcp-server'),
  setVpn: (config: { enabled: boolean; proxyUrl?: string }) => ipcRenderer.invoke('set-vpn', config),
  onShortcut: (callback: (event: any, command: string) => void) => {
    ipcRenderer.on('shortcut', callback);
    return () => ipcRenderer.removeListener('shortcut', callback);
  },
  onDownloadUpdate: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('download-update', callback);
    return () => ipcRenderer.removeListener('download-update', callback);
  },
  // Extension management
  installExtension: (folderPath: string) => ipcRenderer.invoke('install-extension', folderPath),
  listExtensions: () => ipcRenderer.invoke('list-extensions'),
  removeExtension: (extensionId: string) => ipcRenderer.invoke('remove-extension', extensionId),
  // Open folder dialog for extension install
  selectExtensionFolder: () => ipcRenderer.invoke('select-extension-folder'),
  // Install directly from Chrome Web Store URL
  installFromWebStore: (urlOrId: string) => ipcRenderer.invoke('install-from-webstore', urlOrId),
  // Silently installed via crx download
  onExtensionInstalledSilently: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('extension-installed-silently', callback);
    return () => ipcRenderer.removeListener('extension-installed-silently', callback);
  },
  // Capture a screenshot of a webview by its webContentsId for Tab Peek
  captureTabThumbnail: (webContentsId: number) => ipcRenderer.invoke('capture-tab-thumbnail', webContentsId),
  // Listen for auto-captured thumbnails pushed from main process
  onTabThumbnailUpdate: (callback: (event: any, data: { webContentsId: number; dataUrl: string }) => void) => {
    ipcRenderer.on('tab-thumbnail-update', callback);
    return () => ipcRenderer.removeListener('tab-thumbnail-update', callback);
  },
  onAdBlocked: (callback: (event: any, tabId: number) => void) => {
    ipcRenderer.on('ad-blocked', callback);
    return () => ipcRenderer.removeListener('ad-blocked', callback);
  },
});

