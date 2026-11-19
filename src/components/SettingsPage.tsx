import { motion } from 'framer-motion';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  ShieldCheck,
  Cpu,
  SlidersHorizontal,
  Paintbrush,
  Key,
  Keyboard,
  Puzzle,
  Cloud,
  Search,
  X,
  Bot,
  ArrowRight,
} from 'lucide-react';
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
import { AISection } from './settings/AISection';

export type SettingsTabId =
  | 'general'
  | 'account'
  | 'appearance'
  | 'ai'
  | 'privacy'
  | 'passwords'
  | 'extensions'
  | 'advanced'
  | 'mcp'
  | 'shortcuts';

export interface SettingsPageProps {
  url?: string;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onExportData?: () => void;
  onImportData?: (file: File) => void;
  onClearHistory?: () => void;
  onPurgeMemory?: () => Promise<void> | void;
  onPerformSync?: (mergedData?: any) => Promise<void> | void;
  activeWorkspaceId?: string;
  onOpenCustomizeMode?: () => void;
}

interface SettingsNavItem {
  id: SettingsTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SettingsNavGroup {
  label: string;
  items: SettingsNavItem[];
}

const NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: 'Browser',
    items: [
      { id: 'general', label: 'General', icon: Settings },
      { id: 'appearance', label: 'Appearance', icon: Paintbrush },
      { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
    ],
  },
  {
    label: 'Tools & AI',
    items: [
      { id: 'ai', label: 'Nova AI', icon: Bot },
      { id: 'extensions', label: 'Extensions', icon: Puzzle },
      { id: 'mcp', label: 'MCP Server', icon: Cpu },
    ],
  },
  {
    label: 'Privacy & System',
    items: [
      { id: 'account', label: 'Nova Sync', icon: Cloud },
      { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
      { id: 'passwords', label: 'Passwords', icon: Key },
      { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
    ],
  },
];

interface SearchIndexEntry {
  tab: SettingsTabId;
  tabLabel: string;
  title: string;
  keywords: string;
}

const SETTINGS_SEARCH_INDEX: SearchIndexEntry[] = [
  { tab: 'general', tabLabel: 'General', title: 'Search Engine & Suggestions', keywords: 'google duckduckgo bing brave ecosia yahoo omnibox search' },
  { tab: 'general', tabLabel: 'General', title: 'Startup & Session Restore', keywords: 'startup tabs restore new tab homepage url' },
  { tab: 'general', tabLabel: 'General', title: 'Downloads & App Updates', keywords: 'download folder update version check release' },
  { tab: 'general', tabLabel: 'General', title: 'Browsing History & Data', keywords: 'clear history cache browsing data' },
  { tab: 'appearance', tabLabel: 'Appearance', title: 'Live Design Studio & Starter Layouts', keywords: 'design studio layout vertical tabs compact classic customize theme pack' },
  { tab: 'appearance', tabLabel: 'Appearance', title: 'Theme Mode (Light / Dark / System)', keywords: 'dark light system theme mode' },
  { tab: 'appearance', tabLabel: 'Appearance', title: 'Tab Style, Animation & Accent Color', keywords: 'tab style floating rounded square animation accent browser color' },
  { tab: 'appearance', tabLabel: 'Appearance', title: 'New Tab Background & Daily 4K Wallpaper', keywords: 'wallpaper background unsplash photo clean minimal' },
  { tab: 'shortcuts', tabLabel: 'Shortcuts', title: 'Keyboard Shortcuts & Keybindings', keywords: 'hotkey keybinding keyboard command ctrl cmd shortcut' },
  { tab: 'ai', tabLabel: 'Nova AI', title: 'Local WebGPU Models (WebLLM)', keywords: 'llama phi qwen webgpu gpu offline local model ai' },
  { tab: 'ai', tabLabel: 'Nova AI', title: 'Custom OpenAI-Compatible API Provider', keywords: 'api key openai anthropic gemini ollama openrouter provider' },
  { tab: 'ai', tabLabel: 'Nova AI', title: 'On-Device Whisper Voice & Memory Vault', keywords: 'whisper voice microphone speech stt memory preferences' },
  { tab: 'extensions', tabLabel: 'Extensions', title: 'Chrome Web Store CRX3 Installer', keywords: 'extension addon crx chrome web store install unpacked' },
  { tab: 'mcp', tabLabel: 'MCP Server', title: 'Local MCP Server (Port 3020) & Token', keywords: 'mcp model context protocol claude cursor windsurf antigravity agent port token' },
  { tab: 'account', tabLabel: 'Nova Sync', title: 'Nova Cloud Account & AES-256-GCM Sync', keywords: 'sync cloud account login sign in encrypt bookmarks passwords' },
  { tab: 'privacy', tabLabel: 'Privacy & Security', title: 'Network Privacy Shield & AdBlocker', keywords: 'adblock tracker shield easylist whitelist filter privacy' },
  { tab: 'privacy', tabLabel: 'Privacy & Security', title: 'Tracking Protection, HTTPS & Private Tabs', keywords: 'https cookies do not track fingerprinting private incognito' },
  { tab: 'passwords', tabLabel: 'Passwords', title: 'Encrypted Password Vault', keywords: 'password credential autofill login vault secret' },
  { tab: 'advanced', tabLabel: 'Advanced', title: 'Tab Hibernation & Memory Management', keywords: 'memory ram hibernate sleep suspend purge performance' },
  { tab: 'advanced', tabLabel: 'Advanced', title: 'Backup Export / Import & System Reset', keywords: 'backup json export import reset factory' },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  url,
  settings,
  onUpdateSettings,
  onExportData,
  onImportData,
  onClearHistory,
  onPurgeMemory,
  onPerformSync,
  activeWorkspaceId,
  onOpenCustomizeMode,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!url) return;
    if (url.includes('#account') || url.includes('#sync')) setActiveTab('account');
    else if (url.includes('#appearance')) setActiveTab('appearance');
    else if (url.includes('#ai')) setActiveTab('ai');
    else if (url.includes('#privacy')) setActiveTab('privacy');
    else if (url.includes('#passwords')) setActiveTab('passwords');
    else if (url.includes('#advanced')) setActiveTab('advanced');
    else if (url.includes('#extensions')) setActiveTab('extensions');
    else if (url.includes('#mcp')) setActiveTab('mcp');
    else if (url.includes('#shortcuts')) setActiveTab('shortcuts');
    else if (url.includes('#general')) setActiveTab('general');
  }, [url]);

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return SETTINGS_SEARCH_INDEX.filter(
      (entry) =>
        entry.title.toLowerCase().includes(q) ||
        entry.tabLabel.toLowerCase().includes(q) ||
        entry.keywords.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleJumpFromSearch = (tab: SettingsTabId) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  return (
    <div
      style={{ backgroundColor: 'var(--nova-frame-bg)' }}
      className="w-full h-full bg-[#fbfbfc] dark:bg-[#0e0f12] text-neutral-900 dark:text-neutral-100 overflow-hidden flex font-sans"
    >
      {/* Left Navigation Rail */}
      <aside
        style={{ backgroundColor: 'var(--nova-sidebar-bg)', borderColor: 'var(--nova-border-subtle)' }}
        className="w-60 shrink-0 border-r border-neutral-200/90 dark:border-white/[0.07] bg-[#f7f8f9] dark:bg-[#111214] flex flex-col"
      >
        {/* Header + Quick Search */}
        <div className="px-4 pt-5 pb-3 space-y-3">
          <div className="px-1 flex items-center justify-between">
            <h1 className="text-[15px] font-semibold tracking-[-0.015em] text-neutral-950 dark:text-neutral-100">
              Settings
            </h1>
            <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
              v1.5.2
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              aria-label="Search settings"
              className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white dark:bg-white/[0.05] border border-neutral-200/90 dark:border-white/[0.08] text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-white/25 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear settings search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Groups or Live Search Results */}
        <nav aria-label="Settings navigation" className="flex-1 overflow-y-auto px-3 pb-5 space-y-5">
          {searchQuery.trim() ? (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Results ({searchMatches.length})
              </div>
              {searchMatches.length === 0 ? (
                <p className="px-2 py-3 text-xs text-neutral-400 dark:text-neutral-500">
                  No matching settings.
                </p>
              ) : (
                searchMatches.map((item) => (
                  <button
                    key={`${item.tab}-${item.title}`}
                    type="button"
                    onClick={() => handleJumpFromSearch(item.tab)}
                    className="w-full px-2.5 py-2 rounded-lg text-left hover:bg-neutral-200/70 dark:hover:bg-white/[0.07] transition-colors cursor-pointer group flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {item.tabLabel}
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))
              )}
            </div>
          ) : (
            NAV_GROUPS.map((group) => (
              <div key={group.label} className="space-y-0.5">
                <div className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  {group.label}
                </div>
                {group.items.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors cursor-pointer ${
                        isActive
                          ? 'text-neutral-950 dark:text-white font-medium'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-200 hover:bg-neutral-200/45 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="settings-active-pill"
                          aria-hidden="true"
                          transition={{ type: 'spring', stiffness: 520, damping: 40, mass: 0.6 }}
                          className="absolute inset-0 rounded-lg bg-neutral-200/80 dark:bg-white/[0.09]"
                        />
                      )}
                      <Icon
                        className={`relative w-4 h-4 shrink-0 ${
                          isActive
                            ? 'text-neutral-900 dark:text-white'
                            : 'text-neutral-400 dark:text-neutral-500'
                        }`}
                      />
                      <span className="relative truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </nav>
      </aside>

      {/* Main Content Canvas */}
      <main className="flex-1 overflow-y-auto nova-smooth-scroll">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto px-6 sm:px-10 py-9 space-y-8"
        >
          {activeTab === 'general' && (
            <GeneralSection
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              onClearHistory={onClearHistory}
            />
          )}

          {activeTab === 'account' && (
            <SyncSection settings={settings} onPerformSync={onPerformSync} />
          )}

          {activeTab === 'appearance' && (
            <AppearanceSection
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              activeWorkspaceId={activeWorkspaceId}
              onOpenCustomizeMode={onOpenCustomizeMode}
            />
          )}

          {activeTab === 'ai' && (
            <AISection
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              onOpenMcp={() => setActiveTab('mcp')}
            />
          )}

          {activeTab === 'privacy' && (
            <PrivacySection settings={settings} onUpdateSettings={onUpdateSettings} />
          )}

          {activeTab === 'passwords' && (
            <PasswordsSection settings={settings} onUpdateSettings={onUpdateSettings} />
          )}

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

          {activeTab === 'shortcuts' && (
            <ShortcutsSection shortcuts={settings.shortcuts} onUpdateSettings={onUpdateSettings} />
          )}

          {activeTab === 'extensions' && <ExtensionsSection />}
        </motion.div>
      </main>
    </div>
  );
};
