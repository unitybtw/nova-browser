import React, { useState, useEffect } from 'react';
import { Cloud, Check, ShieldAlert, ShieldCheck, RefreshCw, Link2, Laptop, Bookmark, Key, Settings, FolderTree } from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { syncService, NovaSyncService, SyncStatus, SyncPreferences } from '../../services/syncService';
import { safeParseArrayWithBackup, safeParseObjectWithBackup } from '../../utils/safeStorage';
import { getLocale } from '../../services/i18n';
import { copyTextToClipboard } from '../../utils/clipboard';
import { useSafeTimeout } from '../../hooks/useSafeTimeout';
import { SmoothCollapse } from './SmoothCollapse';
import { ToggleSwitch } from './ToggleSwitch';
import {
  SETTINGS_INPUT_CLS,
  SettingsBadge,
  SettingsButton,
  SettingsGroup,
  SettingsPageHeader,
  SettingsRow,
} from './SettingsPrimitives';

function safeParseArray<T>(raw: string | null, key: string = 'unknown_array'): T[] {
  return safeParseArrayWithBackup<T>(key, raw, []);
}

function safeParsePasswords<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function safeParseObject<T extends object>(raw: string | null, fallback: T, key: string = 'unknown_object'): T {
  return safeParseObjectWithBackup<T>(key, raw, fallback);
}

export interface SyncSectionProps {
  settings: Pick<UserSettings, 'language'>;
  onPerformSync?: (mergedData?: any) => Promise<void> | void;
}

export const SyncSection: React.FC<SyncSectionProps> = ({
  settings,
  onPerformSync,
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncErr, setSyncErr] = useState<string | null>(null);
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);
  const { setSafeTimeout } = useSafeTimeout();

  useEffect(() => {
    const unsub = syncService.subscribe((status) => {
      setSyncStatus(status);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleSyncNow = async () => {
    if (syncLoading || syncStatus.isSyncing) return;
    setSyncErr(null);
    setSyncMsg(null);
    setSyncLoading(true);
    try {
      if (onPerformSync) {
        // Delegate directly to onPerformSync() to capture live in-memory React state
        // rather than reading stale un-debounced localStorage entries.
        await onPerformSync();
      } else {
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
          passwords: safeParsePasswords(rawP),
          settings: safeParseObject(rawS, {} as any),
          workspaces: safeParseArray(rawW),
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
        }
      }

      setSyncMsg('Sync completed successfully!');
      setSafeTimeout(() => setSyncMsg(null), 3000);
    } catch (e: any) {
      setSyncErr(e.message || 'Sync failed');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Nova Cloud Sync"
        description="Access your bookmarks, saved passwords, browsing history, and settings across your devices."
      />

      <SmoothCollapse isOpen={Boolean(syncMsg)}>
        {syncMsg && (
          <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2.5">
            <Check className="w-4 h-4 shrink-0" />
            <span>{syncMsg}</span>
          </div>
        )}
      </SmoothCollapse>

      <SmoothCollapse isOpen={Boolean(syncErr)}>
        {syncErr && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{syncErr}</span>
          </div>
        )}
      </SmoothCollapse>

      {syncStatus.isLoggedIn ? (
        <div className="space-y-6">
          {/* Active Sync Status */}
          <SettingsGroup title="Account & Status">
            <SettingsRow
              icon={<Link2 className="w-4 h-4" />}
              title="Nova Sync Active"
              badge={
                <SettingsBadge tone="success">
                  <ShieldCheck className="w-3 h-3" />
                  Encrypted Sync
                </SettingsBadge>
              }
              description={
                <div className="space-y-0.5 mt-0.5">
                  <div>
                    Code:{' '}
                    <span className="font-mono text-neutral-700 dark:text-neutral-200 font-medium">
                      {syncStatus.syncCode || 'Active Device'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Status: <span className="text-emerald-600 dark:text-emerald-400 font-medium">Connected</span> · Last synced:{' '}
                    {syncStatus.lastSyncedAt
                      ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString(getLocale(settings.language), {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Just now'}
                  </div>
                </div>
              }
            >
              <SettingsButton
                variant="primary"
                onClick={handleSyncNow}
                disabled={syncLoading || syncStatus.isSyncing}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncLoading || syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                <span>{syncLoading || syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </SettingsButton>
              <SettingsButton
                variant="danger"
                onClick={() => syncService.logout()}
              >
                Leave Chain
              </SettingsButton>
            </SettingsRow>

            {/* Pair Another Device - hidden until the pairing join flow exists */}
            {NovaSyncService.PAIRING_AVAILABLE && (
              <SettingsRow
                icon={<Laptop className="w-4 h-4" />}
                title="Pair Another Computer"
                description="Use your unique sync code to link other laptops or desktops."
              >
                <SettingsButton
                  variant="secondary"
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
                        passwords: safeParsePasswords(rawP),
                        settings: safeParseObject(rawS, {} as any),
                        workspaces: safeParseArray(rawW),
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
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>{copiedSyncCode ? 'Code Copied!' : 'Copy Device Code'}</span>
                </SettingsButton>
              </SettingsRow>
            )}
          </SettingsGroup>

          {/* Synchronized Data Categories */}
          <SettingsGroup
            title="Synchronized Data Categories"
            description="Choose which local data categories sync with your Nova Cloud account."
          >
            {[
              { key: 'syncBookmarks', label: 'Bookmarks & Folders', icon: Bookmark, desc: 'Your saved bookmarks and toolbar folders' },
              { key: 'syncPasswords', label: 'Saved Passwords (Encrypted)', icon: Key, desc: 'Encrypted before upload with AES-256; the authentication provider remains trusted' },
              { key: 'syncHistory', label: 'Browsing History', icon: Cloud, desc: 'Your visited page history across devices' },
              { key: 'syncSettings', label: 'Settings & Appearance', icon: Settings, desc: 'Themes, search engine, shortcuts' },
              { key: 'syncWorkspaces', label: 'Workspaces', icon: FolderTree, desc: 'Custom tab workspaces and icons' },
            ].map((item) => {
              const isChecked = syncStatus.user?.syncPreferences[item.key as keyof SyncPreferences] ?? true;
              const Icon = item.icon;
              return (
                <SettingsRow
                  key={item.key}
                  icon={<Icon className="w-4 h-4" />}
                  title={item.label}
                  description={item.desc}
                >
                  <ToggleSwitch
                    checked={isChecked}
                    ariaLabel={item.label}
                    onToggle={() => {
                      if (syncStatus.user) {
                        syncService.updatePreferences({ [item.key]: !isChecked });
                      }
                    }}
                  />
                </SettingsRow>
              );
            })}
          </SettingsGroup>
        </div>
      ) : NovaSyncService.PAIRING_AVAILABLE ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsGroup noDivide>
            <div className="p-5 flex flex-col justify-between gap-4 h-full">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center text-neutral-700 dark:text-neutral-200">
                  <Laptop className="w-4 h-4" />
                </div>
                <h3 className="text-[13px] font-semibold text-neutral-950 dark:text-neutral-100">
                  I have a Sync Code
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Enter the pairing code generated from your other computer to sync all bookmarks, passwords, and history instantly.
                </p>
              </div>
              <div className="space-y-2.5">
                <input
                  type="text"
                  placeholder="nova-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
                  id="quick-pair-input"
                  className={`${SETTINGS_INPUT_CLS} font-mono`}
                />
                <SettingsButton
                  variant="primary"
                  className="w-full"
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
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Connect & Sync</span>
                </SettingsButton>
              </div>
            </div>
          </SettingsGroup>

          <SettingsGroup noDivide>
            <div className="p-5 flex flex-col justify-between gap-4 h-full">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center text-neutral-700 dark:text-neutral-200">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="text-[13px] font-semibold text-neutral-950 dark:text-neutral-100">
                  Start New Encrypted Sync
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Generate a secure pairing code on this computer to link your other laptops or desktops.
                </p>
              </div>
              <SettingsButton
                variant="primary"
                className="w-full"
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
                      passwords: safeParsePasswords(rawP),
                      settings: safeParseObject(rawS, {} as any),
                      workspaces: safeParseArray(rawW),
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
              >
                <Key className="w-3.5 h-3.5" />
                <span>{copiedSyncCode ? 'Sync Code Copied!' : 'Generate Sync Code'}</span>
              </SettingsButton>
            </div>
          </SettingsGroup>
        </div>
      ) : (
        /* Pairing is not built yet: offering a code that can never be redeemed
           is worse than saying so, so this states the one route that works. */
        <SettingsGroup noDivide>
          <div className="px-6 py-10 flex flex-col items-center text-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center text-neutral-500 dark:text-neutral-400">
              <Laptop className="w-5 h-5" />
            </div>
            <h3 className="text-[14px] font-semibold text-neutral-950 dark:text-neutral-100">
              Sign in to sync this browser
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-sm">
              Your bookmarks, history, tabs and workspaces sync through your Nova Cloud
              account. Pairing a second device with a sync code is not available yet.
            </p>
          </div>
        </SettingsGroup>
      )}
    </div>
  );
};
