import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Theme
  setTheme: (theme: 'light' | 'dark' | 'system') => ipcRenderer.send('set-theme', theme),
  setPrivacyShield: (enabled: boolean) => ipcRenderer.invoke('set-privacy-shield', enabled),
  getSuggestions: (query: string) => ipcRenderer.invoke('get-suggestions', query),
  // Downloads
  pauseDownload: (id: string) => ipcRenderer.invoke('pause-download', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('resume-download', id),
  cancelDownload: (id: string) => ipcRenderer.invoke('cancel-download', id),
  openDownload: (pathStr: string) => ipcRenderer.invoke('open-download', pathStr),
  showDownloadInFolder: (pathStr: string) => ipcRenderer.invoke('show-download-in-folder', pathStr),
  // Auto Updater APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback: (event: any, info: any) => void) => {
    ipcRenderer.on('update-available', callback);
    return () => ipcRenderer.removeListener('update-available', callback);
  },
  onUpdateDownloaded: (callback: (event: any, info: any) => void) => {
    ipcRenderer.on('update-downloaded', callback);
    return () => ipcRenderer.removeListener('update-downloaded', callback);
  },
  onUpdateError: (callback: (event: any, error: string) => void) => {
    ipcRenderer.on('update-error', callback);
    return () => ipcRenderer.removeListener('update-error', callback);
  },
  // MCP Server
  startMcpServer: () => ipcRenderer.invoke('start-mcp-server'),
  stopMcpServer: () => ipcRenderer.invoke('stop-mcp-server'),
  getMcpStatus: () => ipcRenderer.invoke('get-mcp-status'),
  onMcpClientChanged: (callback: (event: any, data: { count: number; clients: any[] }) => void) => {
    ipcRenderer.on('mcp-client-changed', callback);
    return () => ipcRenderer.removeListener('mcp-client-changed', callback);
  },
  getMcpToken: () => ipcRenderer.invoke('get-mcp-token'),
  rotateMcpToken: () => ipcRenderer.invoke('rotate-mcp-token'),
  getMcpToolSettings: () => ipcRenderer.invoke('get-mcp-tool-settings'),
  setMcpToolEnabled: (toolName: string, enabled: boolean) => ipcRenderer.invoke('set-mcp-tool-enabled', toolName, enabled),
  clearIncognitoSession: () => ipcRenderer.invoke('clear-incognito-session'),
  secureStoreSet: (key: string, value: string) => ipcRenderer.invoke('secure-store-set', key, value),
  secureStoreGet: (key: string) => ipcRenderer.invoke('secure-store-get', key),
  storeSet: (key: string, value: string) => ipcRenderer.invoke('store-set', key, value),
  storeGet: (key: string) => ipcRenderer.invoke('store-get', key),
  // VPN
  setVpn: (config: { enabled: boolean; proxyUrl?: string }) => ipcRenderer.invoke('set-vpn', config),
  // Shortcuts & Downloads events
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
  openExtensionPopup: (url: string, bounds: any) => ipcRenderer.invoke('open-extension-popup', url, bounds),
  selectExtensionFolder: () => ipcRenderer.invoke('select-extension-folder'),
  installFromWebStore: (urlOrId: string) => ipcRenderer.invoke('install-from-webstore', urlOrId),
  onExtensionInstalledSilently: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('extension-installed-silently', callback);
    return () => ipcRenderer.removeListener('extension-installed-silently', callback);
  },
  onExtensionChanged: (callback: () => void) => {
    ipcRenderer.on('extension-changed', callback);
    return () => ipcRenderer.removeListener('extension-changed', callback);
  },
  // Tab thumbnails
  captureTabThumbnail: (webContentsId: number) => ipcRenderer.invoke('capture-tab-thumbnail', webContentsId),
  onTabThumbnailUpdate: (callback: (event: any, data: { webContentsId: number; dataUrl: string }) => void) => {
    ipcRenderer.on('tab-thumbnail-update', callback);
    return () => ipcRenderer.removeListener('tab-thumbnail-update', callback);
  },
  onAdBlocked: (callback: (event: any, tabId: number) => void) => {
    ipcRenderer.on('ad-blocked', callback);
    return () => ipcRenderer.removeListener('ad-blocked', callback);
  },
});
