import assert from 'node:assert/strict';

console.log('\n--- Keyboard Shortcuts & Cross-Platform Command Suite ---');

type ShortcutAction =
  | 'new-tab'
  | 'close-tab'
  | 'reopen-tab'
  | 'focus-omnibox'
  | 'switch-tab'
  | 'switch-workspace'
  | 'new-incognito-tab'
  | 'toggle-reader-mode'
  | 'toggle-ai-assistant';

interface KeyEvent {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

function resolveShortcut(event: KeyEvent, isMac = true): { action: ShortcutAction; param?: number } | null {
  const primaryModifier = isMac ? event.metaKey : event.ctrlKey;
  const key = event.key.toLowerCase();

  // 1. Tab & Window shortcuts with Primary Modifier
  if (primaryModifier) {
    if (key === 't' && !event.shiftKey && !event.altKey) return { action: 'new-tab' };
    if (key === 't' && event.shiftKey && !event.altKey) return { action: 'reopen-tab' };
    if (key === 'w' && !event.shiftKey && !event.altKey) return { action: 'close-tab' };
    if (key === 'l' && !event.shiftKey && !event.altKey) return { action: 'focus-omnibox' };
    if (key === 'n' && event.shiftKey && !event.altKey) return { action: 'new-incognito-tab' };
    if (key === 'r' && event.shiftKey && !event.altKey) return { action: 'toggle-reader-mode' };
    if (key === 'k' && !event.shiftKey && !event.altKey) return { action: 'toggle-ai-assistant' };

    // Numeric Tab Switching: 1-9
    if (/^[1-9]$/.test(key) && !event.shiftKey && !event.altKey) {
      return { action: 'switch-tab', param: parseInt(key, 10) };
    }
  }

  // 2. Workspace Switching with Alt/Option Modifier (⌥1-9)
  if (event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
    if (/^[1-9]$/.test(key)) {
      return { action: 'switch-workspace', param: parseInt(key, 10) };
    }
  }

  return null;
}

// 1. macOS Shortcut Resolution
assert.deepEqual(resolveShortcut({ key: 't', metaKey: true }, true), { action: 'new-tab' });
assert.deepEqual(resolveShortcut({ key: 'T', metaKey: true, shiftKey: true }, true), { action: 'reopen-tab' });
assert.deepEqual(resolveShortcut({ key: 'w', metaKey: true }, true), { action: 'close-tab' });
assert.deepEqual(resolveShortcut({ key: 'l', metaKey: true }, true), { action: 'focus-omnibox' });
assert.deepEqual(resolveShortcut({ key: 'N', metaKey: true, shiftKey: true }, true), { action: 'new-incognito-tab' });
assert.deepEqual(resolveShortcut({ key: '3', metaKey: true }, true), { action: 'switch-tab', param: 3 });
assert.deepEqual(resolveShortcut({ key: '2', altKey: true }, true), { action: 'switch-workspace', param: 2 });

// 2. Windows / Linux Shortcut Resolution (Ctrl Modifier)
assert.deepEqual(resolveShortcut({ key: 't', ctrlKey: true }, false), { action: 'new-tab' });
assert.deepEqual(resolveShortcut({ key: 'T', ctrlKey: true, shiftKey: true }, false), { action: 'reopen-tab' });
assert.deepEqual(resolveShortcut({ key: 'w', ctrlKey: true }, false), { action: 'close-tab' });
assert.deepEqual(resolveShortcut({ key: 'l', ctrlKey: true }, false), { action: 'focus-omnibox' });
assert.deepEqual(resolveShortcut({ key: 'N', ctrlKey: true, shiftKey: true }, false), { action: 'new-incognito-tab' });

// 3. Reject Unassociated Combinations
assert.equal(resolveShortcut({ key: 't' }, true), null);
assert.equal(resolveShortcut({ key: 'x', metaKey: true }, true), null);
assert.equal(resolveShortcut({ key: 't', ctrlKey: true }, true), null); // Ctrl on Mac is not primary

console.log('[PASS] [Keyboard Shortcuts] 15 cross-platform shortcut mappings and modifier resolution rules verified.');
