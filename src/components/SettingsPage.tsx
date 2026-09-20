import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Search, ShieldCheck, Monitor, Bot, Paintbrush, LayoutPanelLeft, Cpu, Key, RefreshCw, ShieldAlert, Keyboard, Puzzle, X, Sparkles, Cloud, User, Mail, FolderTree, Link2, Laptop, QrCode, ChevronDown, ChevronUp, Bookmark, Power, Plus } from 'lucide-react';
import { UserSettings } from '../types/browser';

import { GeneralSection } from './settings/GeneralSection';
import { ShortcutsSection } from './settings/ShortcutsSection';
import { ExtensionsSection } from './settings/ExtensionsSection';
import { AppearanceSection } from './settings/AppearanceSection';
import { McpSection } from './settings/McpSection';
import { SyncSection } from './settings/SyncSection';
import { PrivacySection } from './settings/PrivacySection';
import { PasswordsSection } from './settings/PasswordsSection';
import { AdvancedSection } from './settings/AdvancedSection';

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
  const [activeTab, setActiveTab] = useState<'general' | 'account' | 'appearance' | 'privacy' | 'passwords' | 'extensions' | 'advanced' | 'mcp' | 'shortcuts'>('general');

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

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'account', label: 'Nova Sync', icon: Cloud },
    { id: 'appearance', label: 'Appearance', icon: Paintbrush },
    { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
    { id: 'passwords', label: 'Passwords', icon: Key },
    { id: 'extensions', label: 'Extensions', icon: Puzzle, badge: 'Beta' },
    { id: 'advanced', label: 'Advanced', icon: Bot },
    { id: 'mcp', label: 'MCP Server', icon: Cpu },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  ];

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
                onClick={() => setActiveTab(tab.id as any)}
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
          
          {/* GENERAL */}
          {activeTab === 'general' && (
            <GeneralSection settings={settings} onUpdateSettings={onUpdateSettings} onClearHistory={onClearHistory} />
          )}

          {/* NOVA ACCOUNT & SYNC */}
          {activeTab === 'account' && (
            <SyncSection settings={settings} onPerformSync={onPerformSync} />
          )}

          {/* APPEARANCE */}
          {activeTab === 'appearance' && (
            <AppearanceSection settings={settings} onUpdateSettings={onUpdateSettings} />
          )}

          {/* PRIVACY */}
          {activeTab === 'privacy' && (
            <PrivacySection settings={settings} onUpdateSettings={onUpdateSettings} />
          )}

          {/* PASSWORDS */}
          {activeTab === 'passwords' && (
            <PasswordsSection />
          )}

          {/* ADVANCED */}
          {activeTab === 'advanced' && (
            <AdvancedSection
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              onPurgeMemory={onPurgeMemory}
              onExportData={onExportData}
              onImportData={onImportData}
            />
          )}

          {activeTab === 'mcp' && (
            <McpSection settings={settings} onUpdateSettings={onUpdateSettings} />
          )}

          {/* SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <ShortcutsSection shortcuts={settings.shortcuts} onUpdateSettings={onUpdateSettings} />
          )}

          {activeTab === 'extensions' && (
            <ExtensionsSection />
          )}

        </div>
      </div>
    </div>
  );
};
