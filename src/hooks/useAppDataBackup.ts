import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Bookmark, HistoryItem, UserSettings } from '../types/browser';
import { isSafeNavigationUrl } from '../utils/safeNavigation';

export interface UseAppDataBackupOptions {
  bookmarks: Bookmark[];
  history: HistoryItem[];
  settings: UserSettings;
  setBookmarks: Dispatch<SetStateAction<Bookmark[]>>;
  setHistory: Dispatch<SetStateAction<HistoryItem[]>>;
  setSettings: Dispatch<SetStateAction<UserSettings>>;
}

export function useAppDataBackup({
  bookmarks,
  history,
  settings,
  setBookmarks,
  setHistory,
  setSettings,
}: UseAppDataBackupOptions) {
  const handleExportData = useCallback(() => {
    const backup = {
      version: '1.0',
      timestamp: Date.now(),
      bookmarks,
      history,
      settings
    };
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nova_browser_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [bookmarks, history, settings]);

  const handleImportData = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.bookmarks && Array.isArray(data.bookmarks)) {
          const sanitizedBookmarks = data.bookmarks.filter((b: any) =>
            b && typeof b === 'object' && typeof b.url === 'string' && isSafeNavigationUrl(b.url)
          );
          setBookmarks(sanitizedBookmarks);
        }
        if (data.history && Array.isArray(data.history)) {
          const sanitizedHistory = data.history.filter((h: any) =>
            h && typeof h === 'object' && typeof h.url === 'string' && isSafeNavigationUrl(h.url)
          );
          setHistory(sanitizedHistory);
        }
        if (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
          const raw = data.settings;
          const safeSettings: Partial<UserSettings> = {};
          if (typeof raw.theme === 'string' && ['dark', 'light', 'system'].includes(raw.theme)) safeSettings.theme = raw.theme;
          if (typeof raw.searchEngine === 'string' && ['google', 'duckduckgo', 'bing', 'brave', 'ecosia', 'yahoo'].includes(raw.searchEngine)) safeSettings.searchEngine = raw.searchEngine;
          if (typeof raw.privacyShield === 'boolean') safeSettings.privacyShield = raw.privacyShield;
          if (typeof raw.useVerticalTabs === 'boolean') safeSettings.useVerticalTabs = raw.useVerticalTabs;
          if (typeof raw.fontSize === 'string' && ['small', 'medium', 'large'].includes(raw.fontSize)) safeSettings.fontSize = raw.fontSize;
          if (typeof raw.tabStyle === 'string' && ['rounded', 'square', 'floating'].includes(raw.tabStyle)) safeSettings.tabStyle = raw.tabStyle;
          if (typeof raw.tabAnimation === 'string' && ['chrome', 'smooth', 'snappy', 'none'].includes(raw.tabAnimation)) safeSettings.tabAnimation = raw.tabAnimation;
          if (typeof raw.doNotTrack === 'boolean') safeSettings.doNotTrack = raw.doNotTrack;
          if (typeof raw.clearOnExit === 'boolean') safeSettings.clearOnExit = raw.clearOnExit;
          if (typeof raw.hardwareAcceleration === 'boolean') safeSettings.hardwareAcceleration = raw.hardwareAcceleration;
          if (typeof raw.tabHibernationEnabled === 'boolean') safeSettings.tabHibernationEnabled = raw.tabHibernationEnabled;
          if (typeof raw.aiLinkPreviewEnabled === 'boolean') safeSettings.aiLinkPreviewEnabled = raw.aiLinkPreviewEnabled;
          if (typeof raw.energySaverMode === 'boolean') safeSettings.energySaverMode = raw.energySaverMode;
          if (typeof raw.preloadDnsEnabled === 'boolean') safeSettings.preloadDnsEnabled = raw.preloadDnsEnabled;
          if (typeof raw.smoothScrollingEnabled === 'boolean') safeSettings.smoothScrollingEnabled = raw.smoothScrollingEnabled;
          if (typeof raw.newTabBackground === 'string' && ['default', 'gradient', 'mesh', 'glass', 'unsplash', 'custom_url', 'aurora_waves', 'cyber_grid', 'hyper_space', 'fireflies', 'nebula', 'matrix'].includes(raw.newTabBackground)) safeSettings.newTabBackground = raw.newTabBackground;
          if (typeof raw.backgroundCustomUrl === 'string' && isSafeNavigationUrl(raw.backgroundCustomUrl)) safeSettings.backgroundCustomUrl = raw.backgroundCustomUrl;
          if (typeof raw.accentColor === 'string' && ['blue', 'emerald', 'purple', 'rose', 'amber', 'custom'].includes(raw.accentColor)) safeSettings.accentColor = raw.accentColor;
          if (typeof raw.customAccentColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.customAccentColor)) safeSettings.customAccentColor = raw.customAccentColor;
          if (typeof raw.browserColor === 'string' && ['default', 'midnight', 'cyberpunk', 'forest', 'crimson', 'warm', 'ocean', 'sunset', 'custom'].includes(raw.browserColor)) safeSettings.browserColor = raw.browserColor as any;
          if (typeof raw.customBrowserColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.customBrowserColor)) safeSettings.customBrowserColor = raw.customBrowserColor;
          setSettings(prev => ({ ...prev, ...safeSettings }));
        }
      } catch (err) {
        console.error('Backup import error:', err);
      }
    };
    reader.readAsText(file);
  }, [setBookmarks, setHistory, setSettings]);

  return {
    handleExportData,
    handleImportData,
  };
}
