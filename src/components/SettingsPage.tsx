import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Search, ShieldCheck, Download, Upload, Monitor, Bot, Paintbrush, LayoutPanelLeft, Cpu, Play, Square, Copy, Check, Users, Zap, ExternalLink, Key, RefreshCw, Lock, Unlock, ShieldAlert } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'privacy' | 'advanced' | 'mcp'>('general');

  // MCP Server state
  const [mcpStatus, setMcpStatus] = useState<{ running: boolean; port: number; clientCount: number; clients: any[] } | null>(null);
  const [mcpToken, setMcpToken] = useState<string>('');
  const [mcpTokenVisible, setMcpTokenVisible] = useState(false);
  const [disabledTools, setDisabledTools] = useState<string[]>([]);
  const [mcpCopied, setMcpCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  const fetchMcpStatus = useCallback(async () => {
    if ((window as any).electronAPI?.getMcpStatus) {
      const status = await (window as any).electronAPI.getMcpStatus();
      setMcpStatus(status);
    }
    if ((window as any).electronAPI?.getMcpToken) {
      setMcpToken(await (window as any).electronAPI.getMcpToken());
    }
    if ((window as any).electronAPI?.getMcpToolSettings) {
      setDisabledTools(await (window as any).electronAPI.getMcpToolSettings());
    }
  }, []);

  useEffect(() => {
    fetchMcpStatus();
    const interval = setInterval(fetchMcpStatus, 2000);

    let cleanup: (() => void) | void;
    if ((window as any).electronAPI?.onMcpClientChanged) {
      cleanup = (window as any).electronAPI.onMcpClientChanged((_: any, data: any) => {
        setMcpStatus(prev => prev ? { ...prev, clientCount: data.count, clients: data.clients } : null);
      });
    }
    return () => {
      clearInterval(interval);
      if (typeof cleanup === 'function') cleanup();
    };
  }, [fetchMcpStatus]);

  const handleToggleMcp = async () => {
    if (!mcpStatus) return;
    if (mcpStatus.running) {
      await (window as any).electronAPI?.stopMcpServer?.();
    } else {
      await (window as any).electronAPI?.startMcpServer?.();
    }
    setTimeout(fetchMcpStatus, 300);
  };

  const handleRotateToken = async () => {
    if ((window as any).electronAPI?.rotateMcpToken) {
      const newToken = await (window as any).electronAPI.rotateMcpToken();
      setMcpToken(newToken);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(mcpToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const handleToggleTool = async (toolName: string, currentlyDisabled: boolean) => {
    if ((window as any).electronAPI?.setMcpToolEnabled) {
      await (window as any).electronAPI.setMcpToolEnabled(toolName, currentlyDisabled); // true means enable it, false means disable it
      fetchMcpStatus();
    }
  };

  const mcpConfigSnippet = `{
  "mcpServers": {
    "nova-browser": {
      "url": "http://localhost:${mcpStatus?.port || 3020}/sse?token=${mcpToken}"
    }
  }
}`;

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(mcpConfigSnippet);
    setMcpCopied(true);
    setTimeout(() => setMcpCopied(false), 2000);
  };

  const MCP_TOOLS = [
    { name: 'browser_navigate', desc: 'Navigate to a URL', level: 'safe' },
    { name: 'browser_read_page', desc: 'Extract full page text + links', level: 'safe' },
    { name: 'browser_screenshot', desc: 'Take a screenshot', level: 'safe' },
    { name: 'browser_list_tabs', desc: 'List all open tabs', level: 'safe' },
    { name: 'browser_get_url', desc: 'Get the current tab URL', level: 'safe' },
    { name: 'browser_scroll', desc: 'Scroll the page up/down/top/bottom', level: 'safe' },
    { name: 'browser_go_back', desc: 'Navigate back in history', level: 'safe' },
    { name: 'browser_go_forward', desc: 'Navigate forward in history', level: 'safe' },
    { name: 'browser_reload', desc: 'Reload the current page', level: 'safe' },
    { name: 'browser_wait', desc: 'Wait for N milliseconds', level: 'safe' },
    { name: 'browser_get_element_text', desc: 'Get an element\'s text content', level: 'safe' },
    { name: 'browser_scroll_to_element', desc: 'Scroll until element is visible', level: 'safe' },

    { name: 'browser_click', desc: 'Click an element by CSS selector', level: 'medium' },
    { name: 'browser_hover', desc: 'Hover over an element', level: 'medium' },
    { name: 'browser_focus', desc: 'Focus an element', level: 'medium' },
    { name: 'browser_switch_tab', desc: 'Switch to a tab by ID', level: 'medium' },
    { name: 'browser_close_tab', desc: 'Close a tab by ID', level: 'medium' },
    { name: 'browser_new_tab', desc: 'Open a new tab', level: 'medium' },
    { name: 'browser_mute_tab', desc: 'Mute or unmute the active tab', level: 'medium' },
    { name: 'browser_pin_tab', desc: 'Pin or unpin the active tab', level: 'medium' },
    { name: 'browser_duplicate_tab', desc: 'Duplicate the active tab', level: 'medium' },
    { name: 'browser_zoom', desc: 'Set page zoom level', level: 'medium' },

    { name: 'browser_type', desc: 'Type text into an input', level: 'sensitive' },
    { name: 'browser_run_js', desc: 'Execute arbitrary JavaScript', level: 'sensitive' },
    { name: 'browser_press_key', desc: 'Simulate a keyboard key press', level: 'sensitive' },
    { name: 'browser_select_option', desc: 'Select a dropdown option', level: 'sensitive' },
  ];

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'appearance', label: 'Appearance', icon: Paintbrush },
    { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
    { id: 'advanced', label: 'Advanced', icon: Bot },
    { id: 'mcp', label: 'MCP Server', icon: Cpu },
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
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">On Startup</h2>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col sm:flex-row gap-2">
                  {[
                    { id: 'newTab', label: 'Open New Tab Page' },
                    { id: 'continue', label: 'Continue where you left off' },
                    { id: 'specificPages', label: 'Open a specific page' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => onUpdateSettings({ startupBehavior: opt.id as any })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                        settings.startupBehavior === opt.id || (!settings.startupBehavior && opt.id === 'newTab')
                          ? 'bg-slate-900 text-white shadow-md dark:bg-blue-600 dark:text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

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

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Clear Browsing Data</h2>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Clear History & Cache</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Clear your browsing history, cookies, cache, and more.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear your browsing history?")) {
                        localStorage.removeItem('browsing_history');
                        alert("Browsing history cleared.");
                      }
                    }}
                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-xl font-medium transition-colors text-sm"
                  >
                    Clear Data
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Theme Mode</h2>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 flex gap-2">
                  {[
                    { id: 'light', label: 'Light' },
                    { id: 'dark', label: 'Dark' },
                    { id: 'system', label: 'System Default' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => onUpdateSettings({ theme: opt.id as any })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                        settings.theme === opt.id || (!settings.theme && opt.id === 'system')
                          ? 'bg-slate-900 text-white shadow-md dark:bg-blue-600 dark:text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Tab Style</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'floating', name: 'Floating', desc: 'Modern & Detached' },
                    { id: 'rounded', name: 'Rounded', desc: 'Classic Chrome Style' },
                    { id: 'square', name: 'Square', desc: 'Compact & Sharp' }
                  ].map(ts => (
                    <button
                      key={ts.id}
                      onClick={() => onUpdateSettings({ tabStyle: ts.id as any })}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                        settings.tabStyle === ts.id || (!settings.tabStyle && ts.id === 'floating')
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-900 dark:text-blue-100'
                          : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="w-full h-8 bg-slate-100 dark:bg-slate-800 rounded-md relative flex items-end justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                        {ts.id === 'floating' && <div className="w-16 h-5 bg-white dark:bg-slate-700 rounded-md mb-1 shadow-sm" />}
                        {ts.id === 'rounded' && <div className="w-16 h-6 bg-white dark:bg-slate-700 rounded-t-lg" />}
                        {ts.id === 'square' && <div className="w-16 h-6 bg-white dark:bg-slate-700" />}
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm">{ts.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ts.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

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

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Tracking & Cookies</h2>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Send a "Do Not Track" request</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Request that your browsing traffic is not tracked</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ doNotTrack: !settings.doNotTrack })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.doNotTrack ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.doNotTrack ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Clear cookies on exit</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Clear cookies and site data when you close all windows</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ clearOnExit: !settings.clearOnExit })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.clearOnExit ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.clearOnExit ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ADVANCED */}
          {activeTab === 'advanced' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">System & Developer</h2>
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Use hardware acceleration</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Use GPU to render web pages faster (requires restart)</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ hardwareAcceleration: !settings.hardwareAcceleration })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.hardwareAcceleration ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.hardwareAcceleration ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Developer Mode</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enable "Inspect Element" in right-click menu and advanced tools</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ developerMode: !settings.developerMode })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.developerMode ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.developerMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </section>

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

          {activeTab === 'mcp' && (
            <div className="p-8 space-y-8 max-w-3xl">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                    <Cpu className="w-6 h-6 text-blue-500" />
                    MCP Server
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Model Context Protocol — Let AI tools control Nova Browser</p>
                </div>
                <button
                  onClick={handleToggleMcp}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    mcpStatus?.running
                      ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-400'
                  }`}
                >
                  {mcpStatus?.running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {mcpStatus?.running ? 'Stop Server' : 'Start Server'}
                </button>
              </div>

              {/* Status Card */}
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${mcpStatus?.running ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {mcpStatus?.running ? 'Running' : 'Stopped'}
                    </span>
                    {mcpStatus?.running && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                        http://localhost:{mcpStatus.port}/sse
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Users className="w-4 h-4" />
                    <span>{mcpStatus?.clientCount || 0} connected</span>
                  </div>
                </div>

                {/* Connected clients list */}
                {(mcpStatus?.clients?.length || 0) > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Connected Clients</p>
                    {mcpStatus!.clients.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-slate-700 dark:text-slate-300 truncate">{c.userAgent}</span>
                        <span className="text-slate-400 text-xs ml-auto">
                          {Math.round((Date.now() - c.connectedAt) / 1000)}s ago
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* API Token Card */}
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-500" />
                  <p className="font-semibold text-slate-800 dark:text-slate-100">API Token Authentication</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type={mcpTokenVisible ? "text" : "password"}
                    value={mcpToken}
                    readOnly
                    className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <button
                    onClick={() => setMcpTokenVisible(!mcpTokenVisible)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={mcpTokenVisible ? "Hide Token" : "Show Token"}
                  >
                    {mcpTokenVisible ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleCopyToken}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    {tokenCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleRotateToken}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    title="Revoke old token and generate a new one"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Rotate
                  </button>
                </div>
                <p className="text-xs text-slate-500">This token is required for all MCP clients to connect securely.</p>
              </div>

              {/* Config snippet */}
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Setup Guide</p>
                    <p className="text-xs text-slate-500 mt-0.5">Add this to your AI tool's MCP config (e.g., claude_desktop_config.json)</p>
                  </div>
                  <button
                    onClick={handleCopyConfig}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    {mcpCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {mcpCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-slate-950 text-green-400 text-sm rounded-xl p-4 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
                  {mcpConfigSnippet}
                </pre>
              </div>

              {/* Tools list & Permissions */}
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-orange-500" />
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Tool Permissions ({MCP_TOOLS.length})</p>
                </div>
                <p className="text-xs text-slate-500 mb-2">Enable or disable specific browser capabilities. Sensitive actions are disabled by default.</p>
                <div className="grid grid-cols-1 gap-1.5 max-h-[400px] overflow-y-auto pr-1">
                  {MCP_TOOLS.map(tool => {
                    const isDisabled = disabledTools.includes(tool.name);
                    let badgeClass = "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
                    let badgeText = "Safe";
                    if (tool.level === 'medium') {
                      badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400";
                      badgeText = "Medium";
                    } else if (tool.level === 'sensitive') {
                      badgeClass = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
                      badgeText = "Sensitive";
                    }

                    return (
                      <div key={tool.name} className={`flex items-center justify-between py-2 px-3 rounded-lg border transition-colors ${isDisabled ? 'bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700/50 opacity-60' : 'bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/50'}`}>
                        <div className="flex flex-col gap-1 pr-4 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-blue-600 dark:text-blue-400 font-mono font-medium truncate">{tool.name}</code>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>{badgeText}</span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{tool.desc}</span>
                        </div>
                        <button
                          onClick={() => handleToggleTool(tool.name, isDisabled)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!isDisabled ? (tool.level === 'sensitive' ? 'bg-orange-500' : 'bg-blue-500') : 'bg-slate-200 dark:bg-slate-600'}`}
                          role="switch"
                          aria-checked={!isDisabled}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!isDisabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
