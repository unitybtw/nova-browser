export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
  isIncognito?: boolean;
  thumbnail?: string;
  workspaceId?: string;
  folderId?: string;
  zoomFactor?: number;
  isPlayingAudio?: boolean;
  blockedAdsCount?: number;
  webContentsId?: number;
  isSuspended?: boolean;
  lastAccessed?: number;
}

export interface Folder {
  id: string;
  name: string;
  isExpanded: boolean;
  workspaceId: string;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export const defaultSettings = {
  showBookmarksBar: true,
  useVerticalTabs: true,
  mcpServerEnabled: false,
  tabHibernationEnabled: true,
  hibernationTimeoutMinutes: 10,
  aiLinkPreviewEnabled: false,
};

export interface Extension {
  id: string;
  name: string;
  description?: string;
  version?: string;
  enabled?: boolean;
  iconData?: string;
  popupUrl?: string;
  optionsUrl?: string;
  homepageUrl?: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  timestamp: number;
}

export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  receivedBytes: number;
  totalBytes: number;
  startTime: number;
  savePath?: string;
  isPaused?: boolean;
}
