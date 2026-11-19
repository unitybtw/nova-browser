import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Key, Eye, EyeOff, Trash2, Search } from 'lucide-react';
import { showConfirm } from '../../utils/confirmDialog';
import { getElectronAPI } from '../../utils/electronBridge';
import { UserSettings } from '../../types/browser';
import { ToggleSwitch } from './ToggleSwitch';
import {
  SETTINGS_INPUT_CLS,
  SettingsBadge,
  SettingsGroup,
  SettingsPageHeader,
  SettingsRow,
} from './SettingsPrimitives';

function safeParseArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

const getPasswordKey = (p: any) => `${p?.origin || p?.hostname || ''}\0${p?.username || ''}`;

export interface PasswordsSectionProps {
  settings?: UserSettings;
  onUpdateSettings?: (newSettings: Partial<UserSettings>) => void;
}

export const PasswordsSection: React.FC<PasswordsSectionProps> = ({ settings, onUpdateSettings }) => {
  const [passwords, setPasswords] = useState<any[]>([]);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPasswords = useCallback(async () => {
    try {
      const raw = await getElectronAPI()?.secureStoreGet?.('passwords');
      if (raw) {
        const parsed = safeParseArray<any>(raw);
        const valid = parsed.filter((p) => p && typeof p.hostname === 'string' && typeof p.username === 'string');
        setPasswords(valid);
      } else {
        setPasswords([]);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchPasswords();
    window.addEventListener('focus', fetchPasswords);
    return () => window.removeEventListener('focus', fetchPasswords);
  }, [fetchPasswords]);

  const handleDelete = async (target: any, fallbackIndex: number) => {
    if (!target) return;

    const confirmed = await showConfirm({
      title: 'Delete Password',
      message: `Are you sure you want to delete the password for ${target.username} on ${target.hostname}?`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;

    const targetKey = getPasswordKey(target);
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      next.delete(targetKey);
      return next;
    });

    try {
      const raw = await getElectronAPI()?.secureStoreGet?.('passwords');
      const current = raw ? safeParseArray<any>(raw) : [];
      const updated = current.filter(
        (p: any) =>
          !(
            p.hostname === target.hostname &&
            p.username === target.username &&
            (p.origin || '') === (target.origin || '')
          )
      );
      await getElectronAPI()?.secureStoreSet?.('passwords', JSON.stringify(updated));
      setPasswords(updated.filter((p) => p && typeof p.hostname === 'string' && typeof p.username === 'string'));
    } catch (_) {
      setPasswords((prev) => prev.filter((_, i) => i !== fallbackIndex));
    }
  };

  const toggleVisibility = (key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredPasswords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return passwords;
    return passwords.filter(
      (p) =>
        p.hostname.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q)
    );
  }, [passwords, searchQuery]);

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Passwords"
        description="Credentials encrypted with OS-level secure storage on this device."
      />

      {settings && onUpdateSettings && (
        <SettingsGroup title="Autofill">
          <SettingsRow
            title="Offer to save passwords"
            description="Save and autofill credentials on secure websites. Passwords stay encrypted on this device."
          >
            <ToggleSwitch
              ariaLabel="Toggle password manager"
              checked={settings.passwordManagerEnabled}
              onToggle={() => onUpdateSettings({ passwordManagerEnabled: !settings.passwordManagerEnabled })}
            />
          </SettingsRow>
        </SettingsGroup>
      )}

      <SettingsGroup
        title="Saved Passwords"
        right={
          <div className="flex items-center gap-2">
            {passwords.length > 0 && (
              <div className="relative w-44">
                <Search className="w-3 h-3 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter sites..."
                  className={`${SETTINGS_INPUT_CLS} pl-7 py-1 text-[11px]`}
                />
              </div>
            )}
            <SettingsBadge>{passwords.length} saved</SettingsBadge>
          </div>
        }
        noDivide={filteredPasswords.length === 0}
      >
        {passwords.length === 0 ? (
          <div className="px-5 py-10 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center text-neutral-400 dark:text-neutral-500">
              <Key className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">No saved passwords yet.</p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs">
              When you sign in to websites, Nova can store credentials securely in your encrypted vault.
            </p>
          </div>
        ) : filteredPasswords.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
            No passwords match "{searchQuery}".
          </div>
        ) : (
          filteredPasswords.map((p, i) => {
            const itemKey = getPasswordKey(p);
            const isVisible = visibleKeys.has(itemKey);
            return (
              <div
                key={`${p.origin || p.hostname}-${p.username}-${i}`}
                className="px-4 sm:px-5 py-3 flex items-center justify-between gap-4 hover:bg-neutral-50/70 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center shrink-0 text-neutral-500 dark:text-neutral-400">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {p.hostname}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {p.username}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 max-w-[180px] shrink-0">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={p.password}
                      readOnly
                      className="w-full bg-transparent border-none text-xs font-mono text-neutral-700 dark:text-neutral-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility(itemKey)}
                      aria-label={isVisible ? 'Hide password' : 'Show password'}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
                    >
                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(p, i)}
                  aria-label={`Delete password for ${p.hostname}`}
                  className="p-1.5 rounded-md text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </SettingsGroup>
    </div>
  );
};
