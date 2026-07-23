import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Existing API
  setPrivacyShield: (enabled: boolean) => ipcRenderer.invoke('set-privacy-shield', enabled),
  getSuggestions: (query: string) => ipcRenderer.invoke('get-suggestions', query),
  pauseDownload: (id: string) => ipcRenderer.invoke('pause-download', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('resume-download', id),
  cancelDownload: (id: string) => ipcRenderer.invoke('cancel-download', id),
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
  }
});

