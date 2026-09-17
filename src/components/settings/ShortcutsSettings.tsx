import React, { useState } from 'react';
import { Keyboard } from 'lucide-react';
import { UserSettings } from '../../types/browser';

interface ShortcutsSettingsProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

export const ShortcutsSettings: React.FC<ShortcutsSettingsProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [shortcutInputValue, setShortcutInputValue] = useState('');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Keyboard Shortcuts</h2>
          <button 
            onClick={() => {
              try {
                localStorage.removeItem('shortcuts_customized');
                localStorage.setItem('shortcuts_v2_migrated', 'true');
              } catch (_) {}
              onUpdateSettings({ 
                shortcuts: {
                  newTab: { key: 't', shift: false, meta: true },
                  reopenTab: { key: 't', shift: true, meta: true },
                  closeTab: { key: 'w', shift: false, meta: true },
                  newIncognito: { key: 'n', shift: true, meta: true },
                  reload: { key: 'r', shift: false, meta: true },
                  omnibox: { key: 'k', shift: false, meta: true },
                  bookmark: { key: 'd', shift: false, meta: true },
                  history: { key: (typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')) ? 'y' : 'h', shift: false, meta: true },
                  downloads: { key: 'j', shift: (typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')), meta: true },
                  findInPage: { key: 'f', shift: false, meta: true },
                }
              });
            }}
            className="text-xs text-blue-500 hover:text-blue-600 font-medium cursor-pointer"
          >
            Reset Defaults
          </button>
        </div>
        
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 divide-y divide-slate-100 dark:divide-slate-700/50">
          {[
            { id: 'newTab', label: 'New Tab' },
            { id: 'reopenTab', label: 'Reopen Closed Tab' },
            { id: 'closeTab', label: 'Close Active Tab' },
            { id: 'newIncognito', label: 'New Incognito Window' },
            { id: 'reload', label: 'Reload Page' },
            { id: 'omnibox', label: 'Focus Address Bar' },
            { id: 'bookmark', label: 'Bookmark Page' },
            { id: 'history', label: 'Open History' },
            { id: 'downloads', label: 'Open Downloads' },
            { id: 'findInPage', label: 'Find in Page' },
          ].map(action => {
            const currentBinding = settings.shortcuts?.[action.id as keyof typeof settings.shortcuts] || { key: '?', meta: true };
            
            const formatBinding = (b: { key: string, shift?: boolean, meta?: boolean }) => {
              let str = '';
              if (b.meta) str += '⌘/Ctrl + ';
              if (b.shift) str += 'Shift + ';
              str += b.key.toUpperCase();
              return str;
            };

            const isEditing = editingShortcut === action.id;

            const handleSave = () => {
              if (shortcutInputValue.trim()) {
                const input = shortcutInputValue.trim();
                const newBinding = {
                  key: input.toLowerCase(),
                  shift: input.toLowerCase() !== input,
                  meta: true
                };
                try {
                  localStorage.setItem('shortcuts_customized', 'true');
                  localStorage.setItem('shortcuts_v2_migrated', 'true');
                } catch (_) {}
                onUpdateSettings({
                  shortcuts: {
                    ...settings.shortcuts,
                    [action.id]: newBinding
                  } as any
                });
              }
              setEditingShortcut(null);
              setShortcutInputValue('');
            };

            return (
              <div key={action.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 group hover:bg-slate-50 dark:hover:bg-slate-700/20 rounded-xl transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{action.label}</p>
                  <p className="text-xs text-slate-500">ID: {action.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono text-slate-500">⌘/Ctrl +</span>
                      <input 
                        type="text"
                        autoFocus
                        maxLength={2}
                        value={shortcutInputValue}
                        onChange={e => setShortcutInputValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSave();
                          if (e.key === 'Escape') setEditingShortcut(null);
                        }}
                        onBlur={handleSave}
                        placeholder="Key..."
                        className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-blue-500 rounded-lg text-xs font-mono outline-none"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-medium text-slate-600 dark:text-slate-300 shadow-sm min-w-[100px] text-center">
                        {formatBinding(currentBinding)}
                      </div>
                      <button
                        onClick={() => {
                          setShortcutInputValue(currentBinding.shift ? currentBinding.key.toUpperCase() : currentBinding.key.toLowerCase());
                          setEditingShortcut(action.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                        title="Edit Shortcut"
                      >
                        <Keyboard className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
