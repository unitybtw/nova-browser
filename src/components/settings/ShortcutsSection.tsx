import React, { useState } from 'react';
import { Pencil, RotateCcw } from 'lucide-react';
import { UserSettings } from '../../types/browser';
import {
  SettingsButton,
  SettingsGroup,
  SettingsPageHeader,
  SettingsRow,
} from './SettingsPrimitives';

interface ShortcutAction {
  id: string;
  label: string;
}

const SHORTCUT_ACTIONS: ShortcutAction[] = [
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
  { id: 'toggleSidebar', label: 'Toggle Vertical Sidebar' },
  { id: 'settings', label: 'Open Settings' },
];

function buildDefaultShortcuts(): NonNullable<UserSettings['shortcuts']> {
  return {
    newTab: { key: 't', shift: false, meta: true },
    reopenTab: { key: 't', shift: true, meta: true },
    closeTab: { key: 'w', shift: false, meta: true },
    newIncognito: { key: 'n', shift: true, meta: true },
    reload: { key: 'r', shift: false, meta: true },
    omnibox: { key: 'k', shift: false, meta: true },
    bookmark: { key: 'd', shift: false, meta: true },
    history: {
      key: typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac') ? 'y' : 'h',
      shift: false,
      meta: true,
    },
    downloads: {
      key: 'j',
      shift: typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac'),
      meta: true,
    },
    findInPage: { key: 'f', shift: false, meta: true },
    toggleSidebar: { key: 's', shift: false, meta: true },
    settings: { key: ',', shift: false, meta: true },
  };
}

export interface ShortcutsSectionProps {
  shortcuts?: UserSettings['shortcuts'];
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

export const ShortcutsSection: React.FC<ShortcutsSectionProps> = ({
  shortcuts,
  onUpdateSettings,
}) => {
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [shortcutInputValue, setShortcutInputValue] = useState('');

  const handleReset = () => {
    try {
      localStorage.removeItem('shortcuts_customized');
      localStorage.setItem('shortcuts_v2_migrated', 'true');
    } catch (_) {}
    onUpdateSettings({
      shortcuts: buildDefaultShortcuts(),
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <SettingsPageHeader
        title="Keyboard Shortcuts"
        description="Customize command keybindings for tab management, navigation, and browser utilities."
        action={
          <SettingsButton variant="secondary" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </SettingsButton>
        }
      />

      <SettingsGroup title="Browser Commands">
        {SHORTCUT_ACTIONS.map((action) => {
          const currentBinding = shortcuts?.[action.id as keyof typeof shortcuts] || {
            key: '?',
            meta: true,
          };

          const formatBinding = (b: { key: string; shift?: boolean; meta?: boolean }) => {
            const parts: string[] = [];
            if (b.meta) parts.push('⌘ / Ctrl');
            if (b.shift) parts.push('Shift');
            parts.push(b.key.toUpperCase());
            return parts;
          };

          const isEditing = editingShortcut === action.id;

          const handleSave = () => {
            if (shortcutInputValue.trim()) {
              const input = shortcutInputValue.trim();
              const newBinding = {
                key: input.toLowerCase(),
                shift: input.toLowerCase() !== input,
                meta: true,
              };
              try {
                localStorage.setItem('shortcuts_customized', 'true');
                localStorage.setItem('shortcuts_v2_migrated', 'true');
              } catch (_) {}
              onUpdateSettings({
                shortcuts: {
                  ...shortcuts,
                  [action.id]: newBinding,
                } as any,
              });
            }
            setEditingShortcut(null);
            setShortcutInputValue('');
          };

          return (
            <SettingsRow
              key={action.id}
              title={action.label}
              description={<span className="font-mono text-[11px]">{action.id}</span>}
              className="group hover:bg-neutral-50/70 dark:hover:bg-white/[0.02] transition-colors"
            >
              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                    ⌘ / Ctrl +
                  </span>
                  <input
                    type="text"
                    autoFocus
                    maxLength={2}
                    value={shortcutInputValue}
                    onChange={(e) => setShortcutInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                      if (e.key === 'Escape') setEditingShortcut(null);
                    }}
                    onBlur={handleSave}
                    placeholder="Key"
                    className="w-16 px-2 py-1 rounded-md bg-neutral-100 dark:bg-white/[0.07] border border-neutral-400 dark:border-white/30 text-xs font-mono text-neutral-900 dark:text-neutral-100 outline-none text-center"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {formatBinding(currentBinding).map((part, i) => (
                      <kbd
                        key={i}
                        className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/90 dark:border-white/[0.09] text-[11px] font-mono text-neutral-700 dark:text-neutral-200"
                      >
                        {part}
                      </kbd>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShortcutInputValue(
                        currentBinding.shift
                          ? currentBinding.key.toUpperCase()
                          : currentBinding.key.toLowerCase()
                      );
                      setEditingShortcut(action.id);
                    }}
                    className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.08] transition-colors opacity-60 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    title={`Edit ${action.label} shortcut`}
                    aria-label={`Edit ${action.label} shortcut`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </SettingsRow>
          );
        })}
      </SettingsGroup>
    </div>
  );
};
