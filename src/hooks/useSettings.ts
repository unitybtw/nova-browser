import { useState, useEffect, useRef, useCallback } from 'react';
import type { UserSettings } from '../types/browser';
import { defaultSettings } from '../types/browser';
import { safeParseObjectWithBackup } from '../utils/safeStorage';

export interface UseSettingsOptions {
  isDemo?: boolean;
  demoTheme?: UserSettings['theme'];
  showTasksWidget?: boolean;
  demoFeature?: string;
  demoTabs?: string;
  demoBg?: string;
  isMac?: boolean;
}

export function useSettings(options: UseSettingsOptions = {}) {
  const isMac = options.isMac ?? (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac'));

  const [settings, setSettings] = useState<UserSettings>(() => {
    const initialSettings: UserSettings = {
      ...defaultSettings,
      theme: options.isDemo && options.demoTheme ? options.demoTheme : defaultSettings.theme,
      showTasksWidget: options.showTasksWidget ?? (options.demoFeature === 'website' ? false : defaultSettings.showTasksWidget ?? true),
      useVerticalTabs: options.isDemo
        ? options.demoFeature === 'website'
          ? false
          : options.demoTabs === 'vertical'
        : defaultSettings.useVerticalTabs,
      newTabBackground: (options.demoBg as any) || (options.demoFeature === 'vertical_tabs' ? 'cyber_grid' : options.demoFeature === 'ai' ? 'nebula' : defaultSettings.newTabBackground),
      shortcuts: {
        ...defaultSettings.shortcuts,
        downloads: { key: 'j', shift: isMac, meta: true },
        findInPage: { key: 'f', shift: false, meta: true },
      }
    };

    if (options.isDemo) {
      return initialSettings;
    }

    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('user_settings') : null;
    const parsed = safeParseObjectWithBackup<Partial<UserSettings>>('user_settings', saved, {});
    const merged = { ...initialSettings, ...parsed };
    // Migration: ensure macOS users have shift: true for downloads shortcut if they had the legacy default shift: false
    // Preserve custom user settings: do NOT overwrite if the user has explicitly customized their shortcuts
    const isCustomized = typeof localStorage !== 'undefined' && localStorage.getItem('shortcuts_customized') === 'true';
    if (!isCustomized && isMac && merged.shortcuts?.downloads && merged.shortcuts.downloads.key === 'j' && merged.shortcuts.downloads.shift === false) {
      const migrated = typeof localStorage !== 'undefined' ? localStorage.getItem('shortcuts_v2_migrated') : null;
      if (!migrated) {
        merged.shortcuts = {
          ...merged.shortcuts,
          downloads: { key: 'j', shift: true, meta: true }
        };
        try {
          localStorage.setItem('shortcuts_v2_migrated', 'true');
        } catch (_) {}
      }
    }
    return merged;
  });

  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const handleUpdateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return {
    settings,
    setSettings,
    settingsRef,
    handleUpdateSettings,
  };
}
