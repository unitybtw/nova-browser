import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Search, ShieldCheck, Download, Upload, Monitor, Bot, Paintbrush, LayoutPanelLeft, Cpu, Play, Square, Copy, Check, Users, Zap, ExternalLink, Key, RefreshCw, Lock, Unlock, ShieldAlert, Keyboard, Puzzle, Loader2, X, Sparkles, Cloud, User, Mail, FolderTree, Link2, Laptop, QrCode, ChevronDown, ChevronUp, Bookmark, Power, Plus } from 'lucide-react';
import { UserSettings } from '../types/browser';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { syncService, SyncStatus, SyncPreferences } from '../services/syncService';

import { backupCorruptData, safeParseArrayWithBackup, safeParseObjectWithBackup } from '../utils/safeStorage';
import { showConfirm } from '../utils/confirmDialog';
import { getLocale } from '../services/i18n';
import { aiAgent } from '../services/aiAgent';
import { ToggleSwitch } from './settings/ToggleSwitch';
import { UpdateWidget } from './settings/UpdateWidget';
import { ShortcutsSection } from './settings/ShortcutsSection';
import { ExtensionsSection } from './settings/ExtensionsSection';
import { AppearanceSection } from './settings/AppearanceSection';

function safeParseArray<T>(raw: string | null, key: string = 'unknown_array'): T[] {
  return safeParseArrayWithBackup<T>(key, raw, []);
}

function safeParseObject<T extends object>(raw: string | null, fallback: T, key: string = 'unknown_object'): T {
  return safeParseObjectWithBackup<T>(key, raw, fallback);
}

// P0: crash-safe clipboard. navigator.clipboard throws in insecure contexts
// (http/file) — fall back to legacy textarea+execCommand. Resolves true only
// on actual success so callers set "copied" state conditionally.
async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

// mcpToken from getMcpTokenStatus is only a display prefix (e.g. "nova_mcp_••••").
// Never treat a masked value as the real secret.
const isMaskedToken = (v: string) => !v || v.includes('•') || v.includes('****');

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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncErr, setSyncErr] = useState<string | null>(null);
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);
  const [appVersion, setAppVersion] = useState<string>(() => {
    return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.4.8';
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
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(ver => {
        if (ver) setAppVersion(ver);
      }).catch(() => {});
    }
    if (window.electronAPI?.getSystemVersions) {
      window.electronAPI.getSystemVersions().then(ver => {
        if (ver) setSystemVersions(ver);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    return aiAgent.onStatus(() => {
      setAiEngineLoaded(aiAgent.isEngineLoaded());
    });
  }, []);

  useEffect(() => {
    const unsub = syncService.subscribe(status => {
      setSyncStatus(status);
    });
    return () => { unsub(); };
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

  // MCP Server state
  const [mcpStatus, setMcpStatus] = useState<{ running: boolean; port: number; clientCount: number; clients: any[] } | null>(null);
  const [mcpToken, setMcpToken] = useState<string>('');
  const [mcpTokenVisible, setMcpTokenVisible] = useState(false);
  const [disabledTools, setDisabledTools] = useState<string[]>([]);
  const [mcpCopied, setMcpCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
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

  const fetchMcpStatus = useCallback(async () => {
    if ((window as any).electronAPI?.getMcpStatus) {
      const status = await (window as any).electronAPI.getMcpStatus();
      setMcpStatus(status);
    }
    if ((window as any).electronAPI?.getMcpTokenStatus) {
      const tokenStatus = await (window as any).electronAPI.getMcpTokenStatus();
      if (tokenStatus?.configured) {
        setMcpToken(tokenStatus.prefix || 'nova_mcp_••••••••');
      } else {
        setMcpToken('');
      }
    }
    if ((window as any).electronAPI?.getMcpToolSettings) {
      setDisabledTools(await (window as any).electronAPI.getMcpToolSettings());
    }
  }, []);

  useEffect(() => {
    fetchMcpStatus();

    let cleanup: (() => void) | void;
    let cleanupStatus: (() => void) | void;
    if ((window as any).electronAPI?.onMcpClientChanged) {
      cleanup = (window as any).electronAPI.onMcpClientChanged((_: any, data: any) => {
        setMcpStatus(prev => prev ? { ...prev, clientCount: data.count, clients: data.clients } : null);
      });
    }
    if ((window as any).electronAPI?.onMcpStatusChanged) {
      cleanupStatus = (window as any).electronAPI.onMcpStatusChanged((_: any, isRunning: boolean) => {
        setMcpStatus(prev => prev ? { ...prev, running: isRunning } : { running: isRunning, port: 3020, clientCount: 0, clients: [] });
      });
    }
    return () => {
      if (typeof cleanup === 'function') cleanup();
      if (typeof cleanupStatus === 'function') cleanupStatus();
    };
  }, [fetchMcpStatus]);

  const handleToggleMcp = async () => {
    const isRunning = mcpStatus?.running || false;
    if (isRunning) {
      await (window as any).electronAPI?.stopMcpServer?.();
      onUpdateSettings({ mcpServerEnabled: false });
    } else {
      await (window as any).electronAPI?.startMcpServer?.();
      onUpdateSettings({ mcpServerEnabled: true });
    }
    setTimeout(fetchMcpStatus, 300);
  };

  const handleRotateToken = async () => {
    if ((window as any).electronAPI?.rotateMcpToken) {
      await (window as any).electronAPI.rotateMcpToken();
      await fetchMcpStatus();
    }
  };

  const handleCopyToken = async () => {
    // Real token lives in main process — copy via IPC, never the masked prefix.
    try {
      if ((window as any).electronAPI?.copyMcpToken) {
        const ok = await (window as any).electronAPI.copyMcpToken();
        if (ok) {
          setTokenCopied(true);
          setTimeout(() => setTokenCopied(false), 2000);
          return;
        }
      }
    } catch (_) {}
    // Fallback only when we hold an unmasked value; placeholder prefix must not be copied.
    if (mcpToken && !isMaskedToken(mcpToken)) {
      const ok = await copyTextToClipboard(mcpToken);
      if (ok) {
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
      }
    }
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
      "url": "http://localhost:${mcpStatus?.port || 3020}/sse",
      "headers": {
        "Authorization": "Bearer ${mcpToken}"
      }
    }
  }
}`;

  const handleCopyConfig = async () => {
    // Main builds the config with the real token — prefer IPC over the
    // status prefix shown in the UI.
    try {
      if ((window as any).electronAPI?.copyMcpConfig) {
        const ok = await (window as any).electronAPI.copyMcpConfig();
        if (ok) {
          setMcpCopied(true);
          setTimeout(() => setMcpCopied(false), 2000);
          return;
        }
      }
    } catch (_) {}
    const ok = await copyTextToClipboard(mcpConfigSnippet);
    if (ok) {
      setMcpCopied(true);
      setTimeout(() => setMcpCopied(false), 2000);
    }
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
    { name: 'browser_press_key', desc: 'Simulate a keyboard key press', level: 'sensitive' },
    { name: 'browser_select_option', desc: 'Select a dropdown option', level: 'sensitive' },
  ];

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
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">About Nova</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Nova Browser</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Version {appVersion} (Open Source Edition)</p>
                  </div>
                  <UpdateWidget />
                </div>

                {systemVersions && (
                  <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span>Engine & Security Patch Transparency</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Chromium</div>
                        <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">{systemVersions.chrome || '134.0.6998'}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Electron</div>
                        <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">{systemVersions.electron}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">V8 Engine</div>
                        <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">{systemVersions.v8}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Architecture</div>
                        <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">{systemVersions.platform} ({systemVersions.arch})</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 leading-relaxed">
                      Patch gap tracking active: Automated CI/CD builds release Chromium security patches with verified platform binaries.
                    </p>
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Language & Layout</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Application Language</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select interface language. Arabic automatically switches UI to RTL layout.</p>
                    </div>
                    <select
                      value={settings.language || 'en'}
                      onChange={(e) => onUpdateSettings({ language: e.target.value as any })}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="en">English (LTR)</option>
                      <option value="tr">Türkçe (LTR)</option>
                      <option value="ar">العربية (RTL)</option>
                      <option value="de">Deutsch (LTR)</option>
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">On Startup</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col sm:flex-row gap-2">
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
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                    {[
                      { id: 'google', name: 'Google', desc: 'Fast & Accurate' },
                      { id: 'duckduckgo', name: 'DuckDuckGo', desc: 'Privacy focused' },
                      { id: 'brave', name: 'Brave Search', desc: 'Independent index' },
                      { id: 'bing', name: 'Bing', desc: 'AI powered' },
                      { id: 'ecosia', name: 'Ecosia', desc: 'Plant trees' },
                      { id: 'yahoo', name: 'Yahoo', desc: 'Classic search' }
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
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Page Translation</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Default Target Language</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Foreign web pages will be translated to this language in 1-click.</p>
                    </div>
                    <select
                      value={settings.defaultTranslationLanguage || 'en'}
                      onChange={(e) => onUpdateSettings({ defaultTranslationLanguage: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Font Size</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 flex gap-2">
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
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Clear History & Cache</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Clear your browsing history, cookies, cache, and more.</p>
                  </div>
                  <button
                    onClick={async () => {
                      const confirmed = await showConfirm({
                        title: 'Clear Browsing History',
                        message: 'Are you sure you want to clear your browsing history?',
                        confirmLabel: 'Clear History',
                        cancelLabel: 'Cancel'
                      });
                      if (confirmed) {
                        if (onClearHistory) {
                          onClearHistory();
                        } else {
                          localStorage.removeItem('browsing_history');
                        }
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

          {/* NOVA ACCOUNT & SYNC */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
              <section className="space-y-6">
                <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/20">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        Nova Cloud Sync
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Access your bookmarks, saved passwords, browsing history, and settings from any computer.
                      </p>
                    </div>
                  </div>
                </div>

                {syncMsg && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2.5">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{syncMsg}</span>
                  </div>
                )}
                {syncErr && (
                  <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{syncErr}</span>
                  </div>
                )}

                {syncStatus.isLoggedIn ? (
                  /* ACTIVE SYNC CHAIN VIEW */
                  <div className="space-y-6">
                    {/* Active Sync Code Banner */}
                    <div className="premium-card bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-cyan-500/20">
                          <Link2 className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Sync Chain Active</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> E2EE Protected
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            Code: <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{syncStatus.syncCode || 'Active Device'}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Status: <span className="text-emerald-500 font-medium">● Connected</span> · Last synced: {syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString(getLocale(settings.language), { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={async () => {
                            setSyncErr(null);
                            setSyncMsg(null);
                            setSyncLoading(true);
                            try {
                              const rawB = localStorage.getItem('bookmarks');
                              const rawF = localStorage.getItem('folders_session');
                              const rawH = localStorage.getItem('browsing_history');
                              const rawP = await (window as any).electronAPI?.secureStoreGet?.('passwords');
                              const rawW = localStorage.getItem('workspaces_session');
                              const rawS = localStorage.getItem('user_settings');

                              const syncRes = await syncService.syncData({
                                bookmarks: safeParseArray(rawB),
                                folders: safeParseArray(rawF),
                                history: safeParseArray(rawH),
                                passwords: safeParseArray(rawP),
                                settings: safeParseObject(rawS, {} as any),
                                workspaces: safeParseArray(rawW)
                              });

                              if (syncRes && syncRes.mergedData) {
                                const md = syncRes.mergedData;
                                if (md.bookmarks) {
                                  localStorage.setItem('bookmarks', JSON.stringify(md.bookmarks));
                                  (window as any).electronAPI?.storeSet?.('bookmarks', JSON.stringify(md.bookmarks));
                                }
                                if (md.folders) {
                                  localStorage.setItem('folders_session', JSON.stringify(md.folders));
                                  (window as any).electronAPI?.storeSet?.('folders_session', JSON.stringify(md.folders));
                                }
                                if (md.history) {
                                  localStorage.setItem('browsing_history', JSON.stringify(md.history));
                                }
                                if (md.workspaces) {
                                  localStorage.setItem('workspaces_session', JSON.stringify(md.workspaces));
                                  (window as any).electronAPI?.storeSet?.('workspaces_session', JSON.stringify(md.workspaces));
                                }
                                if (md.settings) {
                                  localStorage.setItem('user_settings', JSON.stringify(md.settings));
                                  (window as any).electronAPI?.storeSet?.('user_settings', JSON.stringify(md.settings));
                                }
                                if (md.passwords && (window as any).electronAPI?.secureStoreSet) {
                                  await (window as any).electronAPI.secureStoreSet('passwords', JSON.stringify(md.passwords));
                                }
                                if (onPerformSync) {
                                  await onPerformSync(md);
                                }
                              }

                              setSyncMsg('Sync completed successfully!');
                              setTimeout(() => setSyncMsg(null), 3000);
                            } catch (e: any) {
                              setSyncErr(e.message || 'Sync failed');
                            } finally {
                              setSyncLoading(false);
                            }
                          }}
                          disabled={syncLoading}
                          className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                          <span>{syncLoading ? 'Syncing...' : 'Sync Now'}</span>
                        </button>

                        <button
                          onClick={() => syncService.logout()}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-slate-700/50 dark:hover:bg-red-500/10 dark:text-slate-300 dark:hover:text-red-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Leave Chain
                        </button>
                      </div>
                    </div>

                    {/* Pair Another Device Card */}
                    <div className="premium-card bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-6 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                            <Laptop className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Pair Another Computer</h4>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Use your unique sync code to link other laptops or desktops.</p>
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              const rawB = localStorage.getItem('bookmarks');
                              const rawF = localStorage.getItem('folders_session');
                              const rawH = localStorage.getItem('browsing_history');
                              const rawP = await (window as any).electronAPI?.secureStoreGet?.('passwords');
                              const rawW = localStorage.getItem('workspaces_session');
                              const rawS = localStorage.getItem('user_settings');

                              const code = await syncService.generateSyncChainCode({
                                bookmarks: safeParseArray(rawB),
                                folders: safeParseArray(rawF),
                                history: safeParseArray(rawH),
                                passwords: safeParseArray(rawP),
                                settings: safeParseObject(rawS, {} as any),
                                workspaces: safeParseArray(rawW)
                              });

                              const copied = await copyTextToClipboard(code);
                              if (copied) {
                                setCopiedSyncCode(true);
                                setSyncMsg(`Sync Code Copied to Clipboard: ${code}`);
                                setTimeout(() => setCopiedSyncCode(false), 3000);
                              } else {
                                setSyncMsg(`Sync Code: ${code} (copy manually)`);
                              }
                            } catch (err: any) {
                              setSyncErr(err.message || 'Failed to generate code');
                            }
                          }}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-700/60 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-500 dark:hover:text-white text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>{copiedSyncCode ? 'Code Copied!' : 'Copy Device Code'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Synced Categories List */}
                    <div className="premium-card bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-6 space-y-4 shadow-sm">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Synchronized Data Categories
                      </h4>

                      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {[
                          { key: 'syncBookmarks', label: 'Bookmarks & Folders', icon: Bookmark, desc: 'Your saved bookmarks and toolbar folders' },
                          { key: 'syncPasswords', label: 'Saved Passwords (E2EE)', icon: Key, desc: 'Zero-knowledge client-side encrypted with AES-256' },
                          { key: 'syncHistory', label: 'Browsing History', icon: Cloud, desc: 'Your visited page history across devices' },
                          { key: 'syncSettings', label: 'Settings & Appearance', icon: Settings, desc: 'Themes, search engine, shortcuts' },
                          { key: 'syncWorkspaces', label: 'Workspaces', icon: FolderTree, desc: 'Custom tab workspaces and icons' },
                        ].map(item => {
                          const isChecked = syncStatus.user?.syncPreferences[item.key as keyof SyncPreferences] ?? true;
                          const Icon = item.icon;

                          return (
                            <div 
                              key={item.key} 
                              onClick={() => {
                                if (syncStatus.user) {
                                  syncService.updatePreferences({ [item.key]: !isChecked });
                                }
                              }}
                              className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">{item.label}</span>
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500">{item.desc}</span>
                                </div>
                              </div>

                              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${isChecked ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isChecked ? 'translate-x-4' : 'translate-x-0'}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* PAIRING SETUP (NO EMAIL / NO PASSWORD) */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Option 1: Enter Code */}
                    <div className="premium-card bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-6 flex flex-col justify-between space-y-6 shadow-sm">
                      <div className="space-y-3">
                        <div className="p-3 w-fit rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                          <Laptop className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                          I have a Sync Code
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Enter the pairing code generated from your other computer to sync all bookmarks, passwords, and history instantly.
                        </p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <input
                          type="text"
                          placeholder="nova-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
                          id="quick-pair-input"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-cyan-500 font-mono"
                        />
                        <button
                          onClick={async () => {
                            const input = document.getElementById('quick-pair-input') as HTMLInputElement;
                            if (!input || !input.value.trim()) return;
                            setSyncLoading(true);
                            try {
                              await syncService.joinSyncChain(input.value.trim());
                              setSyncMsg('Device paired successfully! Data synced.');
                            } catch (err: any) {
                              setSyncErr(err.message || 'Invalid or expired sync code');
                            } finally {
                              setSyncLoading(false);
                            }
                          }}
                          className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                        >
                          <Link2 className="w-4 h-4" />
                          <span>Connect & Sync</span>
                        </button>
                      </div>
                    </div>

                    {/* Option 2: Generate Code on This Computer */}
                    <div className="premium-card bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-6 flex flex-col justify-between space-y-6 shadow-sm">
                      <div className="space-y-3">
                        <div className="p-3 w-fit rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                          Start New Sync Chain
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Generate a secure 1-click pairing code on this computer to link your other laptops or desktops.
                        </p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <button
                          onClick={async () => {
                            try {
                              const rawB = localStorage.getItem('bookmarks');
                              const rawF = localStorage.getItem('folders_session');
                              const rawH = localStorage.getItem('browsing_history');
                              const rawP = await (window as any).electronAPI?.secureStoreGet?.('passwords');
                              const rawW = localStorage.getItem('workspaces_session');
                              const rawS = localStorage.getItem('user_settings');

                              const code = await syncService.generateSyncChainCode({
                                bookmarks: safeParseArray(rawB),
                                folders: safeParseArray(rawF),
                                history: safeParseArray(rawH),
                                passwords: safeParseArray(rawP),
                                settings: safeParseObject(rawS, {} as any),
                                workspaces: safeParseArray(rawW)
                              });

                              const copied = await copyTextToClipboard(code);
                              if (copied) {
                                setCopiedSyncCode(true);
                                setSyncMsg(`Sync Code: ${code} (Copied to clipboard!)`);
                                setTimeout(() => setCopiedSyncCode(false), 4000);
                              } else {
                                setSyncMsg(`Sync Code: ${code} (copy manually)`);
                              }
                            } catch (err: any) {
                              setSyncErr(err.message || 'Failed to generate code');
                            }
                          }}
                          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-4 h-4 text-cyan-400 dark:text-cyan-600" />
                          <span>{copiedSyncCode ? 'Sync Code Copied!' : 'Generate Sync Code'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
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
              <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
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
                    {mcpStatus?.clients?.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-slate-700 dark:text-slate-300 truncate">{c.userAgent}</span>
                        <span className="text-slate-400 text-xs ml-auto">
                          {Math.round((Date.now() - c.connectedAt) / 1000)}s ago
                        </span>
                      </div>
                    )) ?? null}
                  </div>
                )}
              </div>

              {/* API Token Card */}
              <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
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
              <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
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
              <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
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
