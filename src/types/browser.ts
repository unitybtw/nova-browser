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
  workspaceId?: string;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export const defaultSettings = {
  showBookmarksBar: true,
  useVerticalTabs: false,
  mcpServerEnabled: false
};

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
