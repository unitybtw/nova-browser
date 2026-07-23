import { ipcRenderer } from 'electron';

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
  onDownloadUpdate: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('download-update', handler);
    return () => ipcRenderer.removeListener('download-update', handler);
  },
  togglePrivacyShield: (enabled: boolean) => ipcRenderer.invoke('toggle-privacy-shield', enabled),
  getLoadedExtensions: () => ipcRenderer.invoke('get-loaded-extensions'),
  installCrxExtension: (filePath: string) => ipcRenderer.invoke('install-crx-extension', filePath),
  removeExtension: (extensionId: string) => ipcRenderer.invoke('remove-extension', extensionId)
};
