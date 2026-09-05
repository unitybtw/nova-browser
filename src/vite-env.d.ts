/// <reference types="vite/client" />

import type { DownloadItem, PermissionRequest } from './types/browser';
import type { NativeVoiceInfo } from './services/tts';

/** Wallpaper photo object returned by the main-process wallpaper providers. */
interface ElectronWallpaperPhoto {
  id: string;
  title: string;
  author: string;
  authorUrl?: string;
  imageUrl: string;
  thumbnailUrl: string;
  source: string;
  resolution?: string;
  date?: string;
}

/** Version/update metadata broadcast by the auto-updater. */
interface ElectronUpdateInfo {
  version: string;
  releaseDate?: string;
  downloadUrl?: string;
  assetName?: string;
  isManual?: boolean;
  releaseNotes?: string;
  releaseName?: string;
}

/** Numeric progress payload of the auto-updater `download-progress` event. */
interface ElectronUpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

/** Single connected MCP client as reported by `getConnectedClientsInfo`. */
interface ElectronMcpClientInfo {
  id: string;
  connectedAt: number;
  userAgent: string;
}

/** Aggregate MCP server status returned by `get-mcp-status`. */
interface ElectronMcpStatus {
  running: boolean;
  port: number;
  clientCount: number;
  clients: ElectronMcpClientInfo[];
}

/** Bookmark node imported from a Chrome/Chromium `Bookmarks` file. */
interface ElectronImportedBookmark {
  title: string;
  url?: string;
  children?: ElectronImportedBookmark[];
}

/** Extension descriptor returned by `list-extensions` / install handlers. */
interface ElectronExtensionInfo {
  id: string;
  name: string;
  enabled: boolean;
  path?: string;
  version?: string;
  description?: string;
  iconData?: string;
  popupUrl?: string;
  optionsUrl?: string;
  homepageUrl?: string;
}

/** Anchor rectangle + originating tab context for `open-extension-popup`. */
interface ElectronExtensionPopupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ElectronExtensionPopupTabInfo {
  id?: string;
  url?: string;
  title?: string;
  favIconUrl?: string;
  webContentsId?: number;
}

/**
 * Typed mirror of the `electronAPI` object exposed by `electron/preload.ts`
 * via `contextBridge.exposeInMainWorld`. Every member here must match the
 * preload expose list 1:1 — no `checkOllama` / `onAdBlocked` / `showAlert`
 * (those are not IPC channels: `showAlert` is the renderer-side wrapper in
 * `src/utils/confirmDialog.ts`), and every real channel present with its
 * actual main-process request/response shape. The top-level object stays
 * optional so web (non-Electron) builds type-check; when it exists, all
 * members exist, so members are required and consumers can use
 * `window.electronAPI` directly with full type safety (no casts).
 */
interface ElectronAPI {
  // Theme / privacy
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setPrivacyShield: (enabled: boolean) => Promise<boolean>;
  setDoNotTrack: (enabled: boolean) => Promise<void>;
  getSuggestions: (query: string, engine?: string, locale?: string) => Promise<string[]>;
  fetchWallpaperPhotos: (query: string) => Promise<ElectronWallpaperPhoto[]>;
  fetchUnsplashPhotos: (query: string) => Promise<ElectronWallpaperPhoto[]>;
  fetchPageHtml: (url: string) => Promise<{ success: boolean; html?: string; error?: string }>;
  captureFullPage: (webContentsId: number) => Promise<string | null>;
  // Translation
  translateTextBatch: (
    texts: string[],
    sourceLang?: string,
    targetLang?: string
  ) => Promise<{ translations: string[]; success: boolean; error?: string }>;
  detectLanguage: (sampleText: string) => Promise<string>;
  onTriggerPageTranslation: (
    callback: (data: { targetLang?: string; webContentsId?: number }) => void
  ) => () => void;
  // Downloads
  pauseDownload: (id: string) => Promise<boolean>;
  resumeDownload: (id: string) => Promise<boolean>;
  cancelDownload: (id: string) => Promise<boolean>;
  openDownload: (pathStr: string) => Promise<boolean>;
  showDownloadInFolder: (pathStr: string) => Promise<boolean>;
  // Auto updater & version
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<{ success: boolean; version?: string; error?: string }>;
  getUpdateInfo: () => Promise<ElectronUpdateInfo | null>;
  downloadUpdate: (url?: string) => Promise<{ success: boolean; filePath?: string; version?: string; error?: string }>;
  installUpdate: () => Promise<{ success: boolean; error?: string }>;
  openExternal: (url: string) => Promise<boolean>;
  onUpdateChecking: (callback: (event: null) => void) => () => void;
  onUpdateAvailable: (callback: (event: null, info: ElectronUpdateInfo) => void) => () => void;
  onUpdateNotAvailable: (callback: (event: null, info: ElectronUpdateInfo) => void) => () => void;
  onUpdateDownloadProgress: (callback: (event: null, progress: ElectronUpdateProgress) => void) => () => void;
  onUpdateDownloaded: (callback: (event: null, info: ElectronUpdateInfo) => void) => () => void;
  onUpdateError: (callback: (event: null, error: string) => void) => () => void;
  // MCP server
  startMcpServer: () => Promise<boolean>;
  importChromeBookmarks: () => Promise<{
    success: boolean;
    bookmarks?: ElectronImportedBookmark[];
    error?: string;
  }>;
  stopMcpServer: () => Promise<boolean>;
  getMcpStatus: () => Promise<ElectronMcpStatus>;
  onMcpClientChanged: (
    callback: (event: null, data: { count: number; clients: ElectronMcpClientInfo[] }) => void
  ) => () => void;
  onMcpStatusChanged: (callback: (event: null, isRunning: boolean) => void) => () => void;
  copyMcpToken: () => Promise<boolean>;
  copyMcpConfig: () => Promise<{ ok: boolean; autoClearSec: number } | boolean>;
  getMcpTokenStatus: () => Promise<{ configured: boolean; prefix: string }>;
  rotateMcpToken: () => Promise<boolean>;
  getMcpToolSettings: () => Promise<string[]>;
  setMcpToolEnabled: (toolName: string, enabled: boolean) => Promise<boolean>;
  // MCP action bridge (main process <-> renderer round-trip)
  onMcpActionRequest: (
    callback: (id: string, toolName: string, args: unknown) => void
  ) => () => void;
  respondMcpAction: (id: string, result: unknown) => void;
  clearIncognitoSession: () => Promise<boolean>;
  clearAiModelsCache: () => Promise<boolean>;
  purgeSystemMemory: () => Promise<boolean>;
  secureStoreSet: (key: string, value: string) => Promise<boolean>;
  secureStoreGet: (key: string) => Promise<string | null>;
  secureStoreDelete: (key: string) => Promise<boolean>;
  // Password manager: fire-and-forget send channel (not invoke)
  savePassword: (data: { hostname: string; username: string; password: string }) => void;
  storeSet: (key: string, value: string) => Promise<boolean | { error: string }>;
  storeGet: (key: string) => Promise<string | null>;
  showConfirmDialog: (options: {
    title?: string;
    message: string;
    detail?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }) => Promise<boolean>;
  // VPN
  setVpn: (config: { enabled: boolean; proxyUrl?: string }) => Promise<boolean | { error: string }>;
  // Shortcuts, navigation & download events
  onShortcut: (callback: (event: null, command: string) => void) => () => void;
  onNewTab: (callback: (event: null, url: string) => void) => () => void;
  onNewIncognitoTab: (callback: (event: null, url?: string) => void) => () => void;
  onQuickAIAction: (callback: (event: null, text: string) => void) => () => void;
  onDownloadUpdate: (callback: (event: null, data: DownloadItem) => void) => () => void;
  // Extension management
  installExtension: (folderPath: string) => Promise<{
    success?: boolean;
    extension?: ElectronExtensionInfo;
    error?: string;
  }>;
  toggleExtension: (extensionId: string, enabled: boolean) => Promise<{
    success?: boolean;
    error?: string;
  }>;
  listExtensions: () => Promise<ElectronExtensionInfo[]>;
  removeExtension: (extensionId: string) => Promise<{
    success?: boolean;
    error?: string;
  }>;
  openExtensionPopup: (
    url: string,
    bounds?: ElectronExtensionPopupBounds,
    activeTabInfo?: ElectronExtensionPopupTabInfo
  ) => Promise<{ success?: boolean; toggled?: boolean; error?: string }>;
  selectExtensionFolder: () => Promise<{ canceled: boolean; folderPath?: string }>;
  installFromWebStore: (urlOrId: string) => Promise<{
    success?: boolean;
    extension?: ElectronExtensionInfo;
    error?: string;
  }>;
  reviewExtensionPermissions: (
    extensionId: string,
    extractPath: string
  ) => Promise<{ allowed?: boolean; cancelled?: boolean; remember?: boolean; error?: string }>;
  onExtensionInstalledSilently: (
    callback: (event: null, data: { success: boolean; name: string }) => void
  ) => () => void;
  onExtensionChanged: (callback: () => void) => () => void;
  // Tab thumbnails
  captureTabThumbnail: (webContentsId: number) => Promise<string | null>;
  onTabAudioChanged: (
    callback: (event: null, data: { webContentsId: number; isPlayingAudio: boolean }) => void
  ) => () => void;
  onAdBlockedBatch: (callback: (event: null, batch: Record<number, number>) => void) => () => void;
  // Native OS TTS (macOS high quality voices)
  nativeTtsGetVoices: () => Promise<NativeVoiceInfo[]>;
  nativeTtsSpeak: (
    text: string,
    voiceName?: string,
    rate?: number,
    lang?: string
  ) => Promise<{ success: boolean; error?: string }>;
  nativeTtsStop: () => Promise<boolean>;
  // Permission requests (Chrome-style top bar bubble)
  onPermissionRequest: (
    callback: (event: null, request: PermissionRequest) => void
  ) => () => void;
  respondPermissionRequest: (
    requestId: string,
    allow: boolean,
    remember?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  onBlockedSite: (
    callback: (event: null, data: { url: string; reason: string }) => void
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }

  // Injected by the Vite build (`define` in vite.config.ts).
  const __APP_VERSION__: string;
}

export {};
