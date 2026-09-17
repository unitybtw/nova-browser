import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Paintbrush, 
  ShieldCheck, 
  Key, 
  Puzzle, 
  Bot, 
  Cpu, 
  Keyboard, 
  Cloud 
} from 'lucide-react';
import { UserSettings } from '../types/browser';
import { GeneralSettings } from './settings/GeneralSettings';
import { AccountSettings } from './settings/AccountSettings';
import { AppearanceSettings } from './settings/AppearanceSettings';
import { PrivacySettings } from './settings/PrivacySettings';
import { PasswordsSettings } from './settings/PasswordsSettings';
import { AdvancedSettings } from './settings/AdvancedSettings';
import { McpSettings } from './settings/McpSettings';
import { ShortcutsSettings } from './settings/ShortcutsSettings';
import { ExtensionsSettings } from './settings/ExtensionsSettings';

export interface SettingsPageProps {
  url?: string;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onExportData?: () => void;
  onImportData?: (file: File) => void;
  onClearHistory?: () => void;
  onPurgeMemory?: () => Promise<void> | void;
  onPerformSync?: (mergedData: any) => Promise<void> | void;
}

type SettingsTab = 'general' | 'account' | 'appearance' | 'privacy' | 'passwords' | 'extensions' | 'advanced' | 'mcp' | 'shortcuts';

const tabs = [
  { id: 'general' as SettingsTab, label: 'General', icon: Settings },
  { id: 'account' as SettingsTab, label: 'Nova Sync', icon: Cloud },
  { id: 'appearance' as SettingsTab, label: 'Appearance', icon: Paintbrush },
  { id: 'privacy' as SettingsTab, label: 'Privacy & Security', icon: ShieldCheck },
  { id: 'passwords' as SettingsTab, label: 'Passwords', icon: Key },
  { id: 'extensions' as SettingsTab, label: 'Extensions', icon: Puzzle, badge: 'Beta' },
  { id: 'advanced' as SettingsTab, label: 'Advanced', icon: Bot },
  { id: 'mcp' as SettingsTab, label: 'MCP Server', icon: Cpu },
  { id: 'shortcuts' as SettingsTab, label: 'Shortcuts', icon: Keyboard },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  url,
  settings,
  onUpdateSettings,
  onExportData,
  onImportData,
  onClearHistory,
  onPurgeMemory,
  onPerformSync
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  useEffect(() => {
    if (url) {
      if (url.includes('#account') || url.includes('#sync')) setActiveTab('account');
      else if (url.includes('#appearance')) setActiveTab('appearance');
      else if (url.includes('#privacy')) setActiveTab('privacy');
      else if (url.includes('#passwords')) setActiveTab('passwords');
      else if (url.includes('#advanced')) setActiveTab('advanced');
      else if (url.includes('#extensions')) setActiveTab('extensions');
      else if (url.includes('#mcp')) setActiveTab('mcp');
      else if (url.includes('#shortcuts')) setActiveTab('shortcuts');
      else if (url.includes('#general')) setActiveTab('general');
    }
  }, [url]);

  return (
    <div 
      style={{ backgroundColor: 'var(--nova-frame-bg)' }}
      className="w-full h-full bg-slate-50 dark:bg-slate-900 overflow-hidden flex font-sans selection:bg-blue-500/30"
    >
      {/* Sidebar */}
      <div 
        style={{ backgroundColor: 'var(--nova-sidebar-bg)', borderColor: 'var(--nova-border-subtle)' }}
        className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col"
      >
        <div className="p-6 pb-2">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            Settings
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' 
                    : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {'badge' in tab && tab.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-md">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8 py-12 space-y-12">
          {activeTab === 'general' && (
            <GeneralSettings 
              settings={settings} 
              onUpdateSettings={onUpdateSettings} 
              onClearHistory={onClearHistory} 
            />
          )}

          {activeTab === 'account' && (
            <AccountSettings 
              settings={settings} 
              onPerformSync={onPerformSync} 
            />
          )}

          {activeTab === 'appearance' && (
            <AppearanceSettings 
              settings={settings} 
              onUpdateSettings={onUpdateSettings} 
            />
          )}

          {activeTab === 'privacy' && (
            <PrivacySettings 
              settings={settings} 
              onUpdateSettings={onUpdateSettings} 
            />
          )}

          {activeTab === 'passwords' && (
            <PasswordsSettings />
          )}

          {activeTab === 'advanced' && (
            <AdvancedSettings 
              settings={settings} 
              onUpdateSettings={onUpdateSettings} 
              onExportData={onExportData} 
              onImportData={onImportData} 
              onPurgeMemory={onPurgeMemory} 
            />
          )}

          {activeTab === 'mcp' && (
            <McpSettings 
              settings={settings} 
              onUpdateSettings={onUpdateSettings} 
            />
          )}

          {activeTab === 'shortcuts' && (
            <ShortcutsSettings 
              settings={settings} 
              onUpdateSettings={onUpdateSettings} 
            />
          )}

          {activeTab === 'extensions' && (
            <ExtensionsSettings />
          )}
        </div>
      </div>
    </div>
  );
};
