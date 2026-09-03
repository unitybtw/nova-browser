import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Theme
  setTheme: (theme: 'light' | 'dark' | 'system') => ipcRenderer.send('set-theme', theme),
  setPrivacyShield: (enabled: boolean) => ipcRenderer.invoke('set-privacy-shield', enabled),
  setDoNotTrack: (enabled: boolean) => ipcRenderer.invoke('set-do-not-track', enabled),
  getSuggestions: (query: string, engine?: string, locale?: string) => ipcRenderer.invoke('get-suggestions', query, engine, locale),
  fetchWallpaperPhotos: (query: string) => ipcRenderer.invoke('fetch-wallpaper-photos', query),
  fetchUnsplashPhotos: (query: string) => ipcRenderer.invoke('fetch-unsplash-photos', query),
  fetchPageHtml: (url: string) => ipcRenderer.invoke('fetch-page-html', url),
  captureFullPage: (wcId: number) => ipcRenderer.invoke('capture-full-page', wcId),
  // Translation APIs
  translateTextBatch: (texts: string[], sourceLang?: string, targetLang?: string) => ipcRenderer.invoke('translate-text-batch', { texts, sourceLang, targetLang }),
  detectLanguage: (sampleText: string) => ipcRenderer.invoke('detect-language', sampleText),
  onTriggerPageTranslation: (callback: (data: { targetLang?: string; webContentsId?: number }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('trigger-page-translation', handler);
    return () => ipcRenderer.removeListener('trigger-page-translation', handler);
  },
  // Downloads
  pauseDownload: (id: string) => ipcRenderer.invoke('pause-download', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('resume-download', id),
  cancelDownload: (id: string) => ipcRenderer.invoke('cancel-download', id),
  openDownload: (pathStr: string) => ipcRenderer.invoke('open-download', pathStr),
  showDownloadInFolder: (pathStr: string) => ipcRenderer.invoke('show-download-in-folder', pathStr),
  // Auto Updater & Version APIs
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateChecking: (callback: (event: any) => void) => {
    const handler = () => callback(null);
    ipcRenderer.on('update-checking', handler);
    return () => ipcRenderer.removeListener('update-checking', handler);
  },
  onUpdateAvailable: (callback: (event: any, info: any) => void) => {
    const handler = (_event: any, info: any) => callback(null, info);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateNotAvailable: (callback: (event: any, info: any) => void) => {
    const handler = (_event: any, info: any) => callback(null, info);
    ipcRenderer.on('update-not-available', handler);
    return () => ipcRenderer.removeListener('update-not-available', handler);
  },
  onUpdateDownloadProgress: (callback: (event: any, progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(null, progress);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },
  onUpdateDownloaded: (callback: (event: any, info: any) => void) => {
    const handler = (_event: any, info: any) => callback(null, info);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
  onUpdateError: (callback: (event: any, error: string) => void) => {
    const handler = (_event: any, error: string) => callback(null, error);
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  },
  // MCP Server
  startMcpServer: () => ipcRenderer.invoke('start-mcp-server'),
  importChromeBookmarks: () => ipcRenderer.invoke('import-chrome-bookmarks'),
  stopMcpServer: () => ipcRenderer.invoke('stop-mcp-server'),
  getMcpStatus: () => ipcRenderer.invoke('get-mcp-status'),
  onMcpClientChanged: (callback: (event: any, data: { count: number; clients: any[] }) => void) => {
    const handler = (_event: any, data: any) => callback(null, data);
    ipcRenderer.on('mcp-client-changed', handler);
    return () => ipcRenderer.removeListener('mcp-client-changed', handler);
  },
  onMcpStatusChanged: (callback: (event: any, isRunning: boolean) => void) => {
    const handler = (_event: any, isRunning: boolean) => callback(null, isRunning);
    ipcRenderer.on('mcp-status-changed', handler);
    return () => ipcRenderer.removeListener('mcp-status-changed', handler);
  },
  getMcpToken: () => ipcRenderer.invoke('get-mcp-token'),
  rotateMcpToken: () => ipcRenderer.invoke('rotate-mcp-token'),
  getMcpToolSettings: () => ipcRenderer.invoke('get-mcp-tool-settings'),
  setMcpToolEnabled: (toolName: string, enabled: boolean) => ipcRenderer.invoke('set-mcp-tool-enabled', toolName, enabled),
  // MCP action bridge: the main process asks this trusted app page to execute
  // a browser_* tool via IPC; results return on a sender-validated channel.
  // Must be ipcRenderer.send — the main side listens with ipcMain.on.
  onMcpActionRequest: (callback: (id: string, toolName: string, args: any) => void) => {
    const handler = (_event: any, id: string, toolName: string, args: any) => callback(id, toolName, args);
    ipcRenderer.on('mcp-action-request', handler);
    return () => ipcRenderer.removeListener('mcp-action-request', handler);
  },
  respondMcpAction: (id: string, result: unknown) => {
    ipcRenderer.send('mcp-action-response', { id, result });
  },
  clearIncognitoSession: () => ipcRenderer.invoke('clear-incognito-session'),
  clearAiModelsCache: () => ipcRenderer.invoke('clear-ai-models-cache'),
  purgeSystemMemory: () => ipcRenderer.invoke('purge-system-memory'),
  secureStoreSet: (key: string, value: string) => ipcRenderer.invoke('secure-store-set', key, value),
  secureStoreGet: (key: string) => ipcRenderer.invoke('secure-store-get', key),
  // Password Manager: fire-and-forget send channel (not invoke)
  savePassword: (data: { hostname: string; username: string; password: string }) => ipcRenderer.send('save-password', data),
  storeSet: (key: string, value: string) => ipcRenderer.invoke('store-set', key, value),
  storeGet: (key: string) => ipcRenderer.invoke('store-get', key),
  // VPN
  setVpn: (config: { enabled: boolean; proxyUrl?: string }) => ipcRenderer.invoke('set-vpn', config),
  // Shortcuts, Navigation & Downloads events
  onShortcut: (callback: (event: any, command: string) => void) => {
    const handler = (_event: any, command: string) => callback(null, command);
    ipcRenderer.on('shortcut', handler);
    return () => ipcRenderer.removeListener('shortcut', handler);
  },
  onNewTab: (callback: (event: any, url: string) => void) => {
    const handler = (_event: any, url: string) => callback(null, url);
    ipcRenderer.on('new-tab', handler);
    return () => ipcRenderer.removeListener('new-tab', handler);
  },
  onNewIncognitoTab: (callback: (event: any, url?: string) => void) => {
    const handler = (_event: any, url?: string) => callback(null, url);
    ipcRenderer.on('new-incognito-tab', handler);
    return () => ipcRenderer.removeListener('new-incognito-tab', handler);
  },
  onQuickAIAction: (callback: (event: any, text: string) => void) => {
    const handler = (_event: any, text: string) => callback(null, text);
    ipcRenderer.on('quick-ai-action', handler);
    return () => ipcRenderer.removeListener('quick-ai-action', handler);
  },
  onDownloadUpdate: (callback: (event: any, data: any) => void) => {
    const handler = (_event: any, data: any) => callback(null, data);
    ipcRenderer.on('download-update', handler);
    return () => ipcRenderer.removeListener('download-update', handler);
  },
  // Extension management
  installExtension: (folderPath: string) => ipcRenderer.invoke('install-extension', folderPath),
  toggleExtension: (extensionId: string, enabled: boolean) => ipcRenderer.invoke('toggle-extension', extensionId, enabled),
  listExtensions: () => ipcRenderer.invoke('list-extensions'),
  removeExtension: (extensionId: string) => ipcRenderer.invoke('remove-extension', extensionId),
  openExtensionPopup: (url: string, bounds: any, activeTabInfo?: any) => ipcRenderer.invoke('open-extension-popup', url, bounds, activeTabInfo),
  selectExtensionFolder: () => ipcRenderer.invoke('select-extension-folder'),
  installFromWebStore: (urlOrId: string) => ipcRenderer.invoke('install-from-webstore', urlOrId),
  reviewExtensionPermissions: (extensionId: string, extractPath: string) => ipcRenderer.invoke('review-extension-permissions', extensionId, extractPath),
  onExtensionInstalledSilently: (callback: (event: any, data: any) => void) => {
    const handler = (_event: any, data: any) => callback(null, data);
    ipcRenderer.on('extension-installed-silently', handler);
    return () => ipcRenderer.removeListener('extension-installed-silently', handler);
  },
  onExtensionChanged: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('extension-changed', handler);
    return () => ipcRenderer.removeListener('extension-changed', handler);
  },
  // Tab thumbnails
  captureTabThumbnail: (webContentsId: number) => ipcRenderer.invoke('capture-tab-thumbnail', webContentsId),
  onTabAudioChanged: (callback: (event: any, data: { webContentsId: number; isPlayingAudio: boolean }) => void) => {
    const handler = (_event: any, data: any) => callback(null, data);
    ipcRenderer.on('tab-audio-changed', handler);
    return () => ipcRenderer.removeListener('tab-audio-changed', handler);
  },
  onAdBlockedBatch: (callback: (event: any, batch: Record<number, number>) => void) => {
    const handler = (_event: any, batch: any) => callback(null, batch);
    ipcRenderer.on('ad-blocked-batch', handler);
    return () => ipcRenderer.removeListener('ad-blocked-batch', handler);
  },
  // Native OS TTS (macOS high quality voices)
  nativeTtsGetVoices: () => ipcRenderer.invoke('native-tts-get-voices'),
  nativeTtsSpeak: (text: string, voiceName?: string, rate?: number, lang?: string) => ipcRenderer.invoke('native-tts-speak', text, voiceName, rate, lang),
  nativeTtsStop: () => ipcRenderer.invoke('native-tts-stop'),
  // Permission Requests (Chrome-style Top Bar Bubble)
  onPermissionRequest: (callback: (event: any, request: any) => void) => {
    const handler = (_event: any, request: any) => callback(null, request);
    ipcRenderer.on('permission-request', handler);
    return () => ipcRenderer.removeListener('permission-request', handler);
  },
  respondPermissionRequest: (requestId: string, allow: boolean, remember?: boolean) => ipcRenderer.invoke('permission-response', { requestId, allow, remember }),
});
