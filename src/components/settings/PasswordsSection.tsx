import React, { useState, useEffect, useCallback } from 'react';
import { Key, Eye, EyeOff, Trash2 } from 'lucide-react';
import { showConfirm } from '../../utils/confirmDialog';
import { getElectronAPI } from '../../utils/electronBridge';

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

const PasswordList = () => {
  const [passwords, setPasswords] = useState<any[]>([]);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const fetchPasswords = useCallback(async () => {
    try {
      const raw = await getElectronAPI()?.secureStoreGet?.('passwords');
      if (raw) {
        const parsed = safeParseArray<any>(raw);
        const valid = parsed.filter(p => p && typeof p.hostname === 'string' && typeof p.username === 'string');
        setPasswords(valid);
      } else {
        setPasswords([]);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchPasswords();
    window.addEventListener('focus', fetchPasswords);
    return () => window.removeEventListener('focus', fetchPasswords);
  }, [fetchPasswords]);

  const handleDelete = async (index: number) => {
    const target = passwords[index];
    if (!target) return;

    const confirmed = await showConfirm({
      title: 'Delete Password',
      message: `Are you sure you want to delete the password for ${target.username} on ${target.hostname}?`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
    if (!confirmed) return;

    const targetKey = getPasswordKey(target);
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.delete(targetKey);
      return next;
    });

    try {
      const raw = await getElectronAPI()?.secureStoreGet?.('passwords');
      const current = raw ? safeParseArray<any>(raw) : [];
      const updated = current.filter((p: any) => !(p.hostname === target.hostname && p.username === target.username && (p.origin || '') === (target.origin || '')));
      await getElectronAPI()?.secureStoreSet?.('passwords', JSON.stringify(updated));
      setPasswords(updated.filter(p => p && typeof p.hostname === 'string' && typeof p.username === 'string'));
    } catch (e) {
      const newPasses = passwords.filter((_, i) => i !== index);
      setPasswords(newPasses);
    }
  };

  const toggleVisibility = (key: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (passwords.length === 0) {
    return <div className="p-6 text-center text-slate-500">No saved passwords yet.</div>;
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
      {passwords.map((p, i) => {
        const itemKey = getPasswordKey(p);
        const isVisible = visibleKeys.has(itemKey);
        return (
          <div key={`${p.origin || p.hostname}-${p.username}-${i}`} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
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
                  type={isVisible ? "text" : "password"}
                  value={p.password}
                  readOnly
                  className="w-full bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:outline-none"
                />
                <button onClick={() => toggleVisibility(itemKey)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
                  {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button onClick={() => handleDelete(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg ml-4">
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const PasswordsSection: React.FC = () => {
  return (
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
  );
};
