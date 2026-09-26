import React, { useState, useEffect } from 'react';
import { Cloud, Check, ShieldAlert, ShieldCheck, RefreshCw, Link2, Laptop, Bookmark, Key, Settings, FolderTree, Sparkles } from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { syncService, SyncStatus, SyncPreferences } from '../../services/syncService';
import { safeParseArrayWithBackup, safeParseObjectWithBackup } from '../../utils/safeStorage';
import { getLocale } from '../../services/i18n';
import { copyTextToClipboard } from '../../utils/clipboard';
import { useSafeTimeout } from '../../hooks/useSafeTimeout';

function safeParseArray<T>(raw: string | null, key: string = 'unknown_array'): T[] {
  return safeParseArrayWithBackup<T>(key, raw, []);
}

function safeParseObject<T extends object>(raw: string | null, fallback: T, key: string = 'unknown_object'): T {
  return safeParseObjectWithBackup<T>(key, raw, fallback);
}

export interface SyncSectionProps {
  settings: Pick<UserSettings, 'language'>;
  onPerformSync?: (mergedData: any) => Promise<void> | void;
}

export const SyncSection: React.FC<SyncSectionProps> = ({
  settings,
  onPerformSync
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncErr, setSyncErr] = useState<string | null>(null);
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);
  const { setSafeTimeout } = useSafeTimeout();

  useEffect(() => {
    const unsub = syncService.subscribe(status => {
      setSyncStatus(status);
    });
    return () => { unsub(); };
  }, []);

  return (
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
                      setSafeTimeout(() => setSyncMsg(null), 3000);
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
                        setSafeTimeout(() => setCopiedSyncCode(false), 3000);
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
                        setSafeTimeout(() => setCopiedSyncCode(false), 4000);
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
  );
};
