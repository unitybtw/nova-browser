import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Trash2 } from 'lucide-react';
import { showConfirm } from '../../utils/confirmDialog';
import { safeParseArray } from './settingsUtils';

export const PasswordList: React.FC = () => {
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
              <button onClick={() => toggleVisibility(i)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer">
                {visibleIndexes.has(i) ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <button onClick={() => handleDelete(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg ml-4 cursor-pointer">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export const PasswordsSettings: React.FC = () => {
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
