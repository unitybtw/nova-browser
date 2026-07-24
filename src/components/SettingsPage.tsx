import React, { useState } from 'react';
import { Settings, Search, ShieldCheck, Download, Upload, Monitor, Bot, Paintbrush, LayoutPanelLeft } from 'lucide-react';
import { UserSettings } from '../App';

export interface SettingsPageProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onExportData?: () => void;
  onImportData?: (file: File) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onExportData,
  onImportData
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'privacy' | 'advanced'>('general');

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'appearance', label: 'Appearance', icon: Paintbrush },
    { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
    { id: 'advanced', label: 'Advanced', icon: Bot },
  ] as const;

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-900 overflow-hidden flex font-sans selection:bg-blue-500/30">
      
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col">
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' 
                    : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
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
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Search Engine</h2>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                    {[
                      { id: 'google', name: 'Google', desc: 'Fast & Accurate' },
                      { id: 'duckduckgo', name: 'DuckDuckGo', desc: 'Privacy focused' },
                      { id: 'brave', name: 'Brave Search', desc: 'Independent index' },
                      { id: 'bing', name: 'Bing', desc: 'AI powered' },
                      { id: 'ecosia', name: 'Ecosia', desc: 'Plant trees' }
                    ].map(engine => (
                      <button
                        key={engine.id}
                        onClick={() => onUpdateSettings({ searchEngine: engine.id as any })}
                        className={`p-4 rounded-xl text-left transition-all ${
                          settings.searchEngine === engine.id
                            ? 'bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-500 text-blue-900 dark:text-blue-100'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <p className="font-semibold">{engine.name}</p>
                        <p className={`text-xs mt-1 ${settings.searchEngine === engine.id ? 'text-blue-700/70 dark:text-blue-400/70' : 'text-slate-500 dark:text-slate-400'}`}>{engine.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Font Size</h2>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 flex gap-2">
                  {(['small', 'medium', 'large'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => onUpdateSettings({ fontSize: size })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium capitalize transition-all ${
                        settings.fontSize === size
                          ? 'bg-slate-900 text-white shadow-md dark:bg-blue-600 dark:text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Accent Color</h2>
                <div className="flex gap-4 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                  {[
                    { id: 'blue', color: 'bg-blue-500' },
                    { id: 'emerald', color: 'bg-emerald-500' },
                    { id: 'purple', color: 'bg-purple-500' },
                    { id: 'rose', color: 'bg-rose-500' },
                    { id: 'amber', color: 'bg-amber-500' }
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => onUpdateSettings({ accentColor: c.id as any })}
                      className={`w-12 h-12 rounded-full ${c.color} shadow-lg transition-transform hover:scale-110 flex items-center justify-center`}
                    >
                      {settings.accentColor === c.id && <div className="w-4 h-4 bg-white rounded-full opacity-90" />}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">New Tab Background</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'default', name: 'Clean (Default)', style: 'bg-slate-100 dark:bg-slate-800' },
                    { id: 'gradient', name: 'Vibrant Gradient', style: 'bg-gradient-to-br from-blue-500 via-purple-500 to-rose-500' },
                    { id: 'mesh', name: 'Mesh Aurora', style: 'bg-gradient-to-tr from-emerald-400 via-cyan-500 to-blue-500' },
                    { id: 'glass', name: 'Dark Glass', style: 'bg-slate-900' }
                  ].map(bg => (
                    <button
                      key={bg.id}
                      onClick={() => onUpdateSettings({ newTabBackground: bg.id as any })}
                      className={`group relative h-32 rounded-2xl overflow-hidden border-2 transition-all ${
                        settings.newTabBackground === bg.id || (!settings.newTabBackground && bg.id === 'default')
                          ? 'border-blue-500 shadow-xl scale-[1.02] z-10'
                          : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className={`absolute inset-0 ${bg.style}`} />
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                        <p className="text-white font-medium text-sm text-left">{bg.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Layout & Navigation</h2>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Bookmarks Bar</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Show favorite sites below address bar</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ showBookmarksBar: !settings.showBookmarksBar })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showBookmarksBar ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.showBookmarksBar ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Vertical Tabs</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Display tabs on the left sidebar instead of the top</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ useVerticalTabs: !settings.useVerticalTabs })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.useVerticalTabs ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.useVerticalTabs ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                  <div className="p-6 flex items-start gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Ad & Tracker Blocking</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6 max-w-lg">
                        Nova's Privacy Shield blocks malicious scripts, tracking cookies, and intrusive ads across all websites. It uses Ghostery and Cliqz blocklists to keep your browsing fast and secure.
                      </p>
                      
                      <button
                        onClick={() => onUpdateSettings({ privacyShield: !settings.privacyShield })}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          settings.privacyShield 
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20' 
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
                        }`}
                      >
                        {settings.privacyShield ? 'Shield is Active' : 'Enable Shield'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ADVANCED */}
          {activeTab === 'advanced' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">AI Integration (MCP)</h2>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Model Context Protocol (MCP) Server</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Allow external AI agents (like Claude Desktop) to control the browser, read tabs, and execute commands.</p>
                    </div>
                    <button
                      onClick={async () => {
                        const newVal = !settings.mcpServerEnabled;
                        onUpdateSettings({ mcpServerEnabled: newVal });
                        if (newVal) {
                          await (window as any).electronAPI?.startMcpServer?.();
                        } else {
                          await (window as any).electronAPI?.stopMcpServer?.();
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.mcpServerEnabled ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.mcpServerEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  {settings.mcpServerEnabled && (
                    <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-100 dark:border-purple-500/20">
                      <p className="text-xs font-semibold text-purple-800 dark:text-purple-300 mb-2">SSE Connection URL:</p>
                      <code className="block bg-white dark:bg-slate-900 px-3 py-2 rounded-lg text-sm text-slate-800 dark:text-slate-300 font-mono shadow-inner border border-slate-200 dark:border-slate-700">
                        http://localhost:3020/mcp
                      </code>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Backup & Restore</h2>
                <div className="flex gap-4">
                  <button
                    onClick={onExportData}
                    className="flex-1 bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex flex-col items-center justify-center gap-3 group"
                  >
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                      <Download className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Export Backup</p>
                      <p className="text-xs text-slate-500 mt-1">Save bookmarks & settings to a JSON file</p>
                    </div>
                  </button>

                  <label className="flex-1 bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors flex flex-col items-center justify-center gap-3 group cursor-pointer">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Import Backup</p>
                      <p className="text-xs text-slate-500 mt-1">Restore from a JSON backup file</p>
                    </div>
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
                </div>
              </section>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
