import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { showConfirm } from '../../utils/confirmDialog';
import { getElectronAPI } from '../../utils/electronBridge';
import { UpdateWidget } from './UpdateWidget';
import { ToggleSwitch } from './ToggleSwitch';
import {
  SETTINGS_SELECT_CLS,
  SettingsBadge,
  SettingsButton,
  SettingsGroup,
  SettingsPageHeader,
  SettingsRow,
  SettingsSegment,
} from './SettingsPrimitives';

export interface GeneralSectionProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onClearHistory?: () => void;
}

const SEARCH_ENGINES = [
  { id: 'google', name: 'Google', desc: 'Fast and accurate' },
  { id: 'duckduckgo', name: 'DuckDuckGo', desc: 'Privacy focused' },
  { id: 'brave', name: 'Brave Search', desc: 'Independent index' },
  { id: 'bing', name: 'Bing', desc: 'Microsoft search' },
  { id: 'ecosia', name: 'Ecosia', desc: 'Reforestation search' },
  { id: 'yahoo', name: 'Yahoo', desc: 'Classic web search' },
] as const;

export const GeneralSection: React.FC<GeneralSectionProps> = ({
  settings,
  onUpdateSettings,
  onClearHistory,
}) => {
  const [appVersion, setAppVersion] = useState<string>(() => {
    return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.5.2';
  });
  const [systemVersions, setSystemVersions] = useState<{
    app: string;
    electron: string;
    chrome: string;
    node: string;
    v8: string;
    platform: string;
    arch: string;
  } | null>(null);

  useEffect(() => {
    if (getElectronAPI()?.getAppVersion) {
      getElectronAPI()
        ?.getAppVersion()
        .then((ver) => {
          if (ver) setAppVersion(ver);
        })
        .catch(() => {});
    }
    if (getElectronAPI()?.getSystemVersions) {
      getElectronAPI()
        ?.getSystemVersions()
        .then((ver) => {
          if (ver) setSystemVersions(ver);
        })
        .catch(() => {});
    }
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <SettingsPageHeader
        title="General"
        description="Default search engine, startup behavior, translation, media playback, and application updates."
      />

      {/* Updates & About */}
      <SettingsGroup title="Application & Updates">
        <SettingsRow
          title="Nova Browser"
          description={`Version ${appVersion} · Open Source Edition`}
        >
          <UpdateWidget />
        </SettingsRow>

        <SettingsRow
          title="Automatic Update Checks"
          description="Periodically check GitHub Releases in the background and notify when a new build is available."
        >
          <ToggleSwitch
            ariaLabel="Toggle automatic update checks"
            checked={settings.autoCheckUpdates ?? true}
            onToggle={() =>
              onUpdateSettings({ autoCheckUpdates: !(settings.autoCheckUpdates ?? true) })
            }
          />
        </SettingsRow>

        <SettingsRow
          title="Auto-Download Updates"
          description="When disabled, Nova will never download installer packages without your explicit confirmation."
        >
          <ToggleSwitch
            ariaLabel="Toggle automatic update downloads"
            checked={settings.autoDownloadUpdates ?? false}
            onToggle={() =>
              onUpdateSettings({ autoDownloadUpdates: !(settings.autoDownloadUpdates ?? false) })
            }
          />
        </SettingsRow>

        {systemVersions && (
          <div className="px-4 sm:px-5 py-4 space-y-2.5">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
              Runtime &amp; Engine Versions
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { label: 'Chromium', val: systemVersions.chrome || '134.0.6998' },
                { label: 'Electron', val: systemVersions.electron },
                { label: 'V8 Engine', val: systemVersions.v8 },
                { label: 'Platform', val: `${systemVersions.platform} (${systemVersions.arch})` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="px-3 py-2 rounded-lg bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/70 dark:border-white/[0.06]"
                >
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {item.label}
                  </div>
                  <div className="font-mono text-xs text-neutral-900 dark:text-neutral-200 mt-0.5 truncate">
                    {item.val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SettingsGroup>

      {/* Startup & Typography */}
      <SettingsGroup title="Startup & Reading">
        <SettingsRow
          title="On Startup"
          description="Choose what Nova opens when launching a new window session."
          vertical
        >
          <SettingsSegment
            fullWidth
            value={(settings.startupBehavior || 'newTab') as 'newTab' | 'continue' | 'specificPages'}
            onChange={(val) => onUpdateSettings({ startupBehavior: val })}
            options={[
              { id: 'newTab', label: 'Open New Tab Page' },
              { id: 'continue', label: 'Continue where you left off' },
              { id: 'specificPages', label: 'Open a specific page' },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          title="Web Page Font Size"
          description="Default baseline font scale across pages and internal views."
        >
          <SettingsSegment
            value={(settings.fontSize || 'medium') as 'small' | 'medium' | 'large'}
            onChange={(val) => onUpdateSettings({ fontSize: val })}
            options={[
              { id: 'small', label: 'Small' },
              { id: 'medium', label: 'Medium' },
              { id: 'large', label: 'Large' },
            ]}
          />
        </SettingsRow>
      </SettingsGroup>

      {/* Search Engine */}
      <SettingsGroup
        title="Default Search Engine"
        description="Used when typing queries directly into the address bar or New Tab search box."
      >
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {SEARCH_ENGINES.map((engine) => {
            const isSelected = settings.searchEngine === engine.id;
            return (
              <button
                key={engine.id}
                type="button"
                onClick={() => onUpdateSettings({ searchEngine: engine.id })}
                className={`px-3.5 py-3 rounded-lg border text-left transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                  isSelected
                    ? 'border-neutral-900 dark:border-white/75 bg-neutral-50 dark:bg-white/[0.05]'
                    : 'border-neutral-200/80 dark:border-white/[0.07] hover:border-neutral-300 dark:hover:border-white/[0.16] hover:bg-neutral-50/70 dark:hover:bg-white/[0.03]'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                    {engine.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {engine.desc}
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </SettingsGroup>

      {/* Media & Translation */}
      <SettingsGroup title="Browsing & Language">
        <SettingsRow
          title="Automatic Picture-in-Picture"
          badge={<SettingsBadge>Video</SettingsBadge>}
          description="Pop playing videos into a floating window when switching away from a tab and restore on return."
        >
          <ToggleSwitch
            ariaLabel="Toggle automatic picture-in-picture"
            checked={settings.autoPictureInPicture ?? true}
            onToggle={() =>
              onUpdateSettings({
                autoPictureInPicture: !(settings.autoPictureInPicture ?? true),
              })
            }
          />
        </SettingsRow>

        <SettingsRow
          title={<span id="setting-target-language">Default Translation Language</span>}
          description="Target language when translating foreign web pages with one click."
        >
          <select
            aria-labelledby="setting-target-language"
            value={settings.defaultTranslationLanguage || 'en'}
            onChange={(e) => onUpdateSettings({ defaultTranslationLanguage: e.target.value })}
            className={SETTINGS_SELECT_CLS}
          >
            <option value="en">English</option>
            <option value="tr">Turkish (Türkçe)</option>
            <option value="de">German (Deutsch)</option>
            <option value="fr">French (Français)</option>
            <option value="es">Spanish (Español)</option>
            <option value="it">Italian (Italiano)</option>
            <option value="ru">Russian (Русский)</option>
            <option value="ar">Arabic (العربية)</option>
            <option value="ja">Japanese (日本語)</option>
            <option value="zh">Chinese (中文)</option>
            <option value="az">Azərbaycan (Azerbaycan)</option>
          </select>
        </SettingsRow>
      </SettingsGroup>

      {/* Browsing Data */}
      <SettingsGroup title="Browsing Data">
        <SettingsRow
          title="Clear History & Cache"
          description="Permanently remove saved browsing history, cookies, and temporary cached data."
        >
          <SettingsButton
            variant="danger"
            onClick={async () => {
              const confirmed = await showConfirm({
                title: 'Clear Browsing History',
                message: 'Are you sure you want to clear your browsing history?',
                confirmLabel: 'Clear History',
                cancelLabel: 'Cancel',
              });
              if (confirmed) {
                if (onClearHistory) {
                  onClearHistory();
                } else {
                  localStorage.removeItem('browsing_history');
                }
              }
            }}
          >
            Clear Data
          </SettingsButton>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
};
