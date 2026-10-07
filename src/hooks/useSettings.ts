import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { defaultSettings, type UserSettings } from '../types/browser';
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

  const [settings, setSettingsState] = useState<UserSettings>(() => {
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
    const merged: UserSettings = {
      ...initialSettings,
      ...parsed,
      language: 'en',
      shortcuts: {
        ...initialSettings.shortcuts,
        ...(parsed.shortcuts || {})
      }
    };
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

  // All restore/import/sync paths share this setter. Legacy preferences cannot
  // re-enable an interface language after the initial migration.
  const setSettings: Dispatch<SetStateAction<UserSettings>> = useCallback(update => {
    setSettingsState(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      return next.language === 'en' ? next : { ...next, language: 'en' };
    });
  }, []);

  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const handleUpdateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, [setSettings]);

  return {
    settings,
    setSettings,
    settingsRef,
    handleUpdateSettings,
  };
}
