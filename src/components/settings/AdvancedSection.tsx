import React, { useState } from 'react';
import { Download, Upload, Check, Zap, Loader2 } from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { ToggleSwitch } from './ToggleSwitch';
import { SmoothCollapse } from './SmoothCollapse';
import { useSafeTimeout } from '../../hooks/useSafeTimeout';
import {
  SETTINGS_SELECT_CLS,
  SettingsButton,
  SettingsGroup,
  SettingsPageHeader,
  SettingsRow,
} from './SettingsPrimitives';

export interface AdvancedSectionProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onPurgeMemory?: () => Promise<void> | void;
  onExportData?: () => void;
  onImportData?: (file: File) => void;
}

export const AdvancedSection: React.FC<AdvancedSectionProps> = ({
  settings,
  onUpdateSettings,
  onPurgeMemory,
  onExportData,
  onImportData,
}) => {
  const [isPurgingMemory, setIsPurgingMemory] = useState(false);
  const [purgedFeedback, setPurgedFeedback] = useState(false);
  const { setSafeTimeout } = useSafeTimeout();

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Advanced"
        description="Tune memory management, hardware acceleration, developer tools, and portable JSON backups."
      />

      {/* Memory & Performance */}
      <SettingsGroup title="Memory & Performance">
        <SettingsRow
          title="Automatic Tab Hibernation (Memory Saver)"
          description="Unloads inactive background tabs from RAM to keep the browser responsive."
        >
          <ToggleSwitch
            ariaLabel="Toggle automatic tab hibernation"
            checked={settings.tabHibernationEnabled ?? true}
            onToggle={() => onUpdateSettings({ tabHibernationEnabled: !(settings.tabHibernationEnabled ?? true) })}
          />
        </SettingsRow>

        <SmoothCollapse isOpen={Boolean(settings.tabHibernationEnabled ?? true)}>
          <SettingsRow
            title="Hibernation Inactivity Timeout"
            description="Duration before unused tabs are suspended to free memory."
            className="bg-neutral-50/70 dark:bg-white/[0.02]"
          >
            <select
              value={settings.hibernationTimeoutMinutes ?? 10}
              onChange={(e) => onUpdateSettings({ hibernationTimeoutMinutes: Number(e.target.value) })}
              className={SETTINGS_SELECT_CLS}
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </SettingsRow>
        </SmoothCollapse>

        <SettingsRow
          title="Energy Saver Mode (Battery & CPU)"
          description="Throttles heavy background canvas shaders and limits particle effects to extend battery life."
        >
          <ToggleSwitch
            ariaLabel="Toggle energy saver mode"
            checked={settings.energySaverMode}
            onToggle={() => onUpdateSettings({ energySaverMode: !(settings.energySaverMode ?? false) })}
          />
        </SettingsRow>

        <SettingsRow
          title="DNS Prefetching & Link Pre-warming"
          description="Pre-resolves domain names and opens anticipatory sockets on link hover for faster page loads."
        >
          <ToggleSwitch
            ariaLabel="Toggle DNS prefetching and link pre-warming"
            checked={settings.preloadDnsEnabled ?? true}
            onToggle={() => onUpdateSettings({ preloadDnsEnabled: !(settings.preloadDnsEnabled ?? true) })}
          />
        </SettingsRow>

        <SettingsRow
          title="Hardware-Accelerated Smooth Scrolling"
          description="Interpolates page scrolling with GPU-composited physics for high refresh rate monitors."
        >
          <ToggleSwitch
            ariaLabel="Toggle smooth scrolling"
            checked={settings.smoothScrollingEnabled ?? true}
            onToggle={() => onUpdateSettings({ smoothScrollingEnabled: !(settings.smoothScrollingEnabled ?? true) })}
          />
        </SettingsRow>

        <SettingsRow
          title="Instant RAM & Cache Purge"
          description="Immediately hibernates background tabs, clears thumbnail caches, and triggers garbage collection."
        >
          <SettingsButton
            variant="secondary"
            disabled={isPurgingMemory}
            onClick={async () => {
              setIsPurgingMemory(true);
              try {
                if (onPurgeMemory) await onPurgeMemory();
              } catch (_) {}
              setSafeTimeout(() => {
                setIsPurgingMemory(false);
                setPurgedFeedback(true);
                setSafeTimeout(() => setPurgedFeedback(false), 3000);
              }, 500);
            }}
          >
            {isPurgingMemory ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Purging RAM...</span>
              </>
            ) : purgedFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-300">RAM Purged!</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Purge RAM Now</span>
              </>
            )}
          </SettingsButton>
        </SettingsRow>
      </SettingsGroup>

      {/* System & Developer */}
      <SettingsGroup title="System & Developer">
        <SettingsRow
          title="Use hardware acceleration"
          description="Use the GPU to render web pages faster (requires restart)."
        >
          <ToggleSwitch
            ariaLabel="Toggle hardware acceleration"
            checked={settings.hardwareAcceleration}
            onToggle={() => onUpdateSettings({ hardwareAcceleration: !settings.hardwareAcceleration })}
          />
        </SettingsRow>

        <SettingsRow
          title="Developer Mode"
          description='Enable "Inspect Element" in the right-click menu and advanced developer tools.'
        >
          <ToggleSwitch
            ariaLabel="Toggle developer mode"
            checked={settings.developerMode}
            onToggle={() => onUpdateSettings({ developerMode: !settings.developerMode })}
          />
        </SettingsRow>
      </SettingsGroup>

      {/* Backup & Restore */}
      <SettingsGroup
        title="Backup & Restore"
        description="Export or restore your bookmarks, workspaces, and browser preferences as a portable JSON file."
      >
        <SettingsRow
          icon={<Download className="w-4 h-4" />}
          title="Export Backup"
          description="Download a JSON snapshot of your bookmarks and settings."
        >
          <SettingsButton variant="secondary" onClick={onExportData}>
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </SettingsButton>
        </SettingsRow>

        <SettingsRow
          icon={<Upload className="w-4 h-4" />}
          title="Import Backup"
          description="Restore bookmarks and preferences from a previously exported JSON file."
        >
          <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-white/[0.08] transition-colors cursor-pointer active:scale-[0.98] whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onImportData) onImportData(file);
              }}
            />
          </label>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
};
