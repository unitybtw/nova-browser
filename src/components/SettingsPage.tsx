import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Search, ShieldCheck, Download, Upload, Monitor, Bot, Paintbrush, LayoutPanelLeft, Cpu, Check, Zap, ExternalLink, Key, RefreshCw, ShieldAlert, Keyboard, Puzzle, Loader2, X, Sparkles, Cloud, User, Mail, FolderTree, Link2, Laptop, QrCode, ChevronDown, ChevronUp, Bookmark, Power, Plus } from 'lucide-react';
import { UserSettings } from '../types/browser';
import { Eye, EyeOff, Trash2 } from 'lucide-react';

import { backupCorruptData, safeParseArrayWithBackup, safeParseObjectWithBackup } from '../utils/safeStorage';
import { showConfirm } from '../utils/confirmDialog';
import { aiAgent } from '../services/aiAgent';
import { ToggleSwitch } from './settings/ToggleSwitch';
import { GeneralSection } from './settings/GeneralSection';
import { ShortcutsSection } from './settings/ShortcutsSection';
import { ExtensionsSection } from './settings/ExtensionsSection';
import { AppearanceSection } from './settings/AppearanceSection';
import { McpSection } from './settings/McpSection';
import { SyncSection } from './settings/SyncSection';

function safeParseArray<T>(raw: string | null, key: string = 'unknown_array'): T[] {
  return safeParseArrayWithBackup<T>(key, raw, []);
}

function safeParseObject<T extends object>(raw: string | null, fallback: T, key: string = 'unknown_object'): T {
  return safeParseObjectWithBackup<T>(key, raw, fallback);
}

const PasswordList = () => {
  const [passwords, setPasswords] = useState<any[]>([]);
  const [visibleIndexes, setVisibleIndexes] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchPasswords = async () => {
      try {
        const raw = await (window as any).electronAPI?.secureStoreGet?.('passwords');
        if (raw) {
          const parsed = safeParseArray<any>(raw);
          const valid = parsed.filter(p => p && typeof p.hostname === 'string' && typeof p.username === 'string');
          setPasswords(valid);
        }
      } catch (e) {}
    };
    fetchPasswords();
  }, []);

  const handleDelete = async (index: number) => {
    const confirmed = await showConfirm({
      title: 'Delete Password',
      message: 'Are you sure you want to delete this password?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
    if (!confirmed) return;
    const newPasses = [...passwords];
    newPasses.splice(index, 1);
    setPasswords(newPasses);
    try {
      await (window as any).electronAPI?.secureStoreSet?.('passwords', JSON.stringify(newPasses));
    } catch (e) {}
  };

  const toggleVisibility = (index: number) => {
    const next = new Set(visibleIndexes);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setVisibleIndexes(next);
  };

  if (passwords.length === 0) {
    return <div className="p-6 text-center text-slate-500">No saved passwords yet.</div>;
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
      {passwords.map((p, i) => (
        <div key={`${p.hostname}-${p.username}-${i}`} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
              <Key size={16} />
            </div>
            <div className="flex-1">
              <div className="font-medium text-slate-800 dark:text-slate-200">{p.hostname}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{p.username}</div>
            </div>
            <div className="flex-1 max-w-[200px] flex items-center gap-2">
              <input 
                type={visibleIndexes.has(i) ? "text" : "password"} 
                value={p.password}
                readOnly
                className="w-full bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:outline-none"
              />
              <button onClick={() => toggleVisibility(i)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
                {visibleIndexes.has(i) ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <button onClick={() => handleDelete(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg ml-4">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

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
  const [isPurgingMemory, setIsPurgingMemory] = useState(false);
  const [purgedFeedback, setPurgedFeedback] = useState(false);
  const [aiVramTimeout, setAiVramTimeout] = useState<number>(() => aiAgent.getAutoParkTimeoutMinutes());
  const [aiEngineLoaded, setAiEngineLoaded] = useState<boolean>(() => aiAgent.isEngineLoaded());
  const [rememberedPermCount, setRememberedPermCount] = useState<number>(0);
  const [resettingPerms, setResettingPerms] = useState(false);
  const [resetPermsSuccess, setResetPermsSuccess] = useState(false);

  useEffect(() => {
    if (activeTab === 'privacy' && window.electronAPI?.getRememberedPermissionsCount) {
      window.electronAPI.getRememberedPermissionsCount().then((count: number) => {
        setRememberedPermCount(count || 0);
      }).catch(() => {});
    }
  }, [activeTab]);

  const handleResetRememberedPermissions = async () => {
    if (!window.electronAPI?.resetRememberedPermissions) return;
    setResettingPerms(true);
    try {
      await window.electronAPI.resetRememberedPermissions();
      setRememberedPermCount(0);
      setResetPermsSuccess(true);
      setTimeout(() => setResetPermsSuccess(false), 3000);
    } catch (_) {}
    setResettingPerms(false);
  };

  useEffect(() => {
    return aiAgent.onStatus(() => {
      setAiEngineLoaded(aiAgent.isEngineLoaded());
    });
  }, []);

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

  const [aiCacheStatus, setAiCacheStatus] = useState<string>('');
  const [isClearingCache, setIsClearingCache] = useState<boolean>(false);

  const handleClearAiCache = async () => {
    const confirmed = await showConfirm({
      title: 'Clear AI Cache',
      message: 'Clear all downloaded local AI model files and temporary cache?',
      confirmLabel: 'Clear Cache',
      cancelLabel: 'Cancel'
    });
    if (!confirmed) return;
    setIsClearingCache(true);
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await window.caches.keys();
        for (const k of keys) {
          await window.caches.delete(k);
        }
      }
      if ((window as any).electronAPI?.clearAiModelsCache) {
        await (window as any).electronAPI.clearAiModelsCache();
      }
      setAiCacheStatus('AI model cache cleared successfully!');
      setTimeout(() => setAiCacheStatus(''), 4000);
    } catch (e: any) {
      setAiCacheStatus('Failed to clear cache: ' + (e?.message || String(e)));
    } finally {
      setIsClearingCache(false);
    }
  };

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
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
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
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Send a "Do Not Track" request</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Request that your browsing traffic is not tracked</div>
                    </div>
                    <ToggleSwitch
                      checked={settings.doNotTrack}
                      onToggle={() => onUpdateSettings({ doNotTrack: !settings.doNotTrack })}
                    />
                  </div>
                  
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Clear cookies on exit</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Clear cookies and site data when you close all windows</div>
                    </div>
                    <ToggleSwitch
                      checked={settings.clearOnExit}
                      onToggle={() => onUpdateSettings({ clearOnExit: !settings.clearOnExit })}
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Binary Integrity</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>SHA-256 Checksum Verification</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        REPRODUCIBLE CI
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Every release publishes a <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">SHA256SUMS.txt</code> file. Run <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">sha256sum -c SHA256SUMS.txt</code> to verify your download before installing.
                    </div>
                  </div>
                  <a
                    href="https://github.com/unitybtw/nova-browser/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-xs font-semibold shrink-0 transition-colors"
                  >
                    <span>View Checksums</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Site Permissions</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Remembered Authorizations</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Permissions granted to websites (camera, microphone, notifications, location) automatically expire after 30 days. You can revoke all remembered permissions immediately.
                    </div>
                    {rememberedPermCount > 0 && (
                      <div className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                        Active permissions remembered for <span className="font-semibold text-blue-500">{rememberedPermCount}</span> origin{rememberedPermCount > 1 ? 's' : ''}.
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleResetRememberedPermissions}
                    disabled={resettingPerms}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/30 rounded-xl text-xs font-semibold transition-colors shrink-0"
                  >
                    {resetPermsSuccess ? 'Permissions Cleared!' : resettingPerms ? 'Resetting...' : 'Reset All Permissions'}
                  </button>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">AI Storage & Model Cache</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Purge AI Model Cache</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Delete downloaded local WebLLM neural network weights to free up disk space</div>
                    {aiCacheStatus && (
                      <div className={`text-xs mt-2 font-medium ${aiCacheStatus.includes('successfully') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {aiCacheStatus}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleClearAiCache}
                    disabled={isClearingCache}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isClearingCache ? 'Clearing...' : 'Clear AI Cache'}
                  </button>
                </div>

                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        <span>GPU VRAM & Anti-Jank Engine Management</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md">
                        Auto-parks the resident 3B model from VRAM when idle to eliminate scroll jank and keep GPU memory available for heavy web browsing.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium border ${
                        aiEngineLoaded 
                          ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}>
                        {aiEngineLoaded ? `VRAM: ~${aiAgent.getVramEstimate()} MB` : 'VRAM: 0 MB (Parked)'}
                      </span>
                      {aiEngineLoaded && (
                        <button
                          onClick={async () => {
                            await aiAgent.parkModel();
                            setAiEngineLoaded(false);
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                        >
                          Park Now
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Inactivity Auto-Park Timeout</div>
                      <div className="text-[11px] text-slate-400">Duration before resident WebLLM weights are automatically released from VRAM.</div>
                    </div>
                    <select
                      value={aiVramTimeout}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setAiVramTimeout(val);
                        aiAgent.setAutoParkTimeoutMinutes(val);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value={1}>1 minute</option>
                      <option value={3}>3 minutes (Recommended)</option>
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={0}>Disabled (Always Resident)</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* PASSWORDS */}
          {activeTab === 'passwords' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Saved Passwords</h2>
                </div>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                  <PasswordList />
                </div>
              </section>
            </div>
          )}

          {/* ADVANCED */}
          {activeTab === 'advanced' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">AI Features</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50 mb-8">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">AI Link Preview (Hover Summaries)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automatically reads and summarizes links when you hover over them. (Uses local WebLLM)</div>
                    </div>
                    <ToggleSwitch
                      checked={settings.aiLinkPreviewEnabled}
                      onToggle={() => onUpdateSettings({ aiLinkPreviewEnabled: !settings.aiLinkPreviewEnabled })}
                      activeColorClass="bg-indigo-500"
                    />
                  </div>

                  {/* Password Manager */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Password Manager</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Offer to save and autofill passwords on websites. Credentials are encrypted on this device.</div>
                    </div>
                    <ToggleSwitch
                      checked={settings.passwordManagerEnabled}
                      onToggle={() => onUpdateSettings({ passwordManagerEnabled: !settings.passwordManagerEnabled })}
                      activeColorClass="bg-indigo-500"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Memory & Performance</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50 mb-8">
                  {/* Automatic Tab Hibernation */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Automatic Tab Hibernation (Memory Saver)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Unloads inactive background tabs from RAM to keep the browser lightning fast</div>
                    </div>
                    <ToggleSwitch
                      checked={(settings.tabHibernationEnabled ?? true)}
                      onToggle={() => onUpdateSettings({ tabHibernationEnabled: !(settings.tabHibernationEnabled ?? true) })}
                    />
                  </div>

                  {(settings.tabHibernationEnabled ?? true) && (
                    <div className="p-5 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hibernation Inactivity Timeout</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Time after which unused tabs are suspended to save RAM</div>
                      </div>
                      <select
                        value={settings.hibernationTimeoutMinutes ?? 10}
                        onChange={(e) => onUpdateSettings({ hibernationTimeoutMinutes: Number(e.target.value) })}
                        className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none"
                      >
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                      </select>
                    </div>
                  )}

                  {/* Energy Saver Mode */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Energy Saver Mode (Battery & CPU)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Throttles heavy background canvas shaders and limits particle effects to extend laptop battery life</div>
                    </div>
                    <ToggleSwitch
                      checked={settings.energySaverMode}
                      onToggle={() => onUpdateSettings({ energySaverMode: !(settings.energySaverMode ?? false) })}
                      activeColorClass="bg-emerald-500"
                    />
                  </div>

                  {/* Link Preload & DNS Prefetching */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">DNS Prefetching & Link Pre-warming (Speed Booster)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pre-resolves domain names and opens anticipatory sockets on link hover for instant page loads</div>
                    </div>
                    <ToggleSwitch
                      checked={(settings.preloadDnsEnabled ?? true)}
                      onToggle={() => onUpdateSettings({ preloadDnsEnabled: !(settings.preloadDnsEnabled ?? true) })}
                    />
                  </div>

                  {/* Smooth Scrolling Engine */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hardware-Accelerated Smooth Scrolling</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Interpolates page scrolling with GPU composited physics for high refresh rate monitors</div>
                    </div>
                    <ToggleSwitch
                      checked={(settings.smoothScrollingEnabled ?? true)}
                      onToggle={() => onUpdateSettings({ smoothScrollingEnabled: !(settings.smoothScrollingEnabled ?? true) })}
                    />
                  </div>

                  {/* Instant Memory Purge Action */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Instant RAM & Cache Purge</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Immediately hibernates all background tabs, clears thumbnail cache, and triggers V8 garbage collection</div>
                    </div>
                    <button
                      onClick={async () => {
                        setIsPurgingMemory(true);
                        try {
                          if (onPurgeMemory) await onPurgeMemory();
                        } catch (_) {}
                        setTimeout(() => {
                          setIsPurgingMemory(false);
                          setPurgedFeedback(true);
                          setTimeout(() => setPurgedFeedback(false), 3000);
                        }, 500);
                      }}
                      disabled={isPurgingMemory}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                    >
                      {isPurgingMemory ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                          <span>Purging RAM...</span>
                        </>
                      ) : purgedFeedback ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">RAM Purged!</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Purge RAM Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">System & Developer</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Use hardware acceleration</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Use GPU to render web pages faster (requires restart)</div>
                    </div>
                    <ToggleSwitch
                      checked={settings.hardwareAcceleration}
                      onToggle={() => onUpdateSettings({ hardwareAcceleration: !settings.hardwareAcceleration })}
                    />
                  </div>
                  
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Developer Mode</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enable "Inspect Element" in right-click menu and advanced tools</div>
                    </div>
                    <ToggleSwitch
                      checked={settings.developerMode}
                      onToggle={() => onUpdateSettings({ developerMode: !settings.developerMode })}
                    />
                  </div>
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
