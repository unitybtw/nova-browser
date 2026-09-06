import assert from 'node:assert/strict';
import { matchesShortcut, resolveActionFromShortcuts } from '../src/utils/keyboardShortcuts';
import type { ShortcutBinding } from '../src/types/browser';

console.log('\n--- Keyboard Shortcuts & Genuine matches() Test Suite ---');

// Standard Nova Browser default shortcuts configuration (macOS vs Windows)
const macShortcuts: Record<string, ShortcutBinding> = {
  newTab: { key: 't', shift: false, meta: true },
  reopenTab: { key: 't', shift: true, meta: true },
  closeTab: { key: 'w', shift: false, meta: true },
  newIncognito: { key: 'n', shift: true, meta: true },
  reload: { key: 'r', shift: false, meta: true },
  omnibox: { key: 'k', shift: false, meta: true },
  bookmark: { key: 'd', shift: false, meta: true },
  history: { key: 'y', shift: false, meta: true },
  downloads: { key: 'j', shift: true, meta: true },
  findInPage: { key: 'f', shift: false, meta: true },
  toggleSidebar: { key: 's', shift: false, meta: true },
};

const winShortcuts: Record<string, ShortcutBinding> = {
  ...macShortcuts,
  history: { key: 'h', shift: false, meta: true },
  downloads: { key: 'j', shift: false, meta: true },
};

// 1. Genuine matchesShortcut() evaluation on macOS (metaKey = ⌘ Cmd)
assert.strictEqual(matchesShortcut(macShortcuts.newTab, { key: 't', metaKey: true }, true), true, 'Cmd+T must trigger newTab');
assert.strictEqual(matchesShortcut(macShortcuts.newTab, { key: 'T', metaKey: true }, true), true, 'Case-insensitive key T must match');
assert.strictEqual(matchesShortcut(macShortcuts.newTab, { key: 't', ctrlKey: true }, true), false, 'Ctrl+T on Mac must NOT trigger newTab (primary modifier is Meta)');
assert.strictEqual(matchesShortcut(macShortcuts.newTab, { key: 't', metaKey: true, shiftKey: true }, true), false, 'Cmd+Shift+T must NOT match newTab (shift expected false)');

assert.strictEqual(matchesShortcut(macShortcuts.reopenTab, { key: 't', metaKey: true, shiftKey: true }, true), true, 'Cmd+Shift+T must trigger reopenTab');
assert.strictEqual(matchesShortcut(macShortcuts.closeTab, { key: 'w', metaKey: true }, true), true, 'Cmd+W must trigger closeTab');
assert.strictEqual(matchesShortcut(macShortcuts.newIncognito, { key: 'n', metaKey: true, shiftKey: true }, true), true, 'Cmd+Shift+N must trigger newIncognito');
assert.strictEqual(matchesShortcut(macShortcuts.reload, { key: 'r', metaKey: true }, true), true, 'Cmd+R must trigger reload');
assert.strictEqual(matchesShortcut(macShortcuts.omnibox, { key: 'k', metaKey: true }, true), true, 'Cmd+K must trigger omnibox');
assert.strictEqual(matchesShortcut(macShortcuts.bookmark, { key: 'd', metaKey: true }, true), true, 'Cmd+D must trigger bookmark');
assert.strictEqual(matchesShortcut(macShortcuts.downloads, { key: 'j', metaKey: true, shiftKey: true }, true), true, 'Cmd+Shift+J must trigger downloads on macOS');
assert.strictEqual(matchesShortcut(macShortcuts.downloads, { key: 'j', metaKey: true, shiftKey: false }, true), false, 'Cmd+J without shift must NOT match macOS downloads');

// 2. Genuine matchesShortcut() evaluation on Windows / Linux (ctrlKey = Ctrl)
assert.strictEqual(matchesShortcut(winShortcuts.newTab, { key: 't', ctrlKey: true }, false), true, 'Ctrl+T must trigger newTab on Windows');
assert.strictEqual(matchesShortcut(winShortcuts.newTab, { key: 't', metaKey: true }, false), false, 'Meta+T on Windows must NOT trigger newTab');
assert.strictEqual(matchesShortcut(winShortcuts.reopenTab, { key: 't', ctrlKey: true, shiftKey: true }, false), true, 'Ctrl+Shift+T must trigger reopenTab on Windows');
assert.strictEqual(matchesShortcut(winShortcuts.closeTab, { key: 'w', ctrlKey: true }, false), true, 'Ctrl+W must trigger closeTab on Windows');
assert.strictEqual(matchesShortcut(winShortcuts.downloads, { key: 'j', ctrlKey: true, shiftKey: false }, false), true, 'Ctrl+J must trigger downloads on Windows');
assert.strictEqual(matchesShortcut(winShortcuts.downloads, { key: 'j', ctrlKey: true, shiftKey: true }, false), false, 'Ctrl+Shift+J must NOT trigger downloads on Windows');
assert.strictEqual(matchesShortcut(winShortcuts.history, { key: 'h', ctrlKey: true }, false), true, 'Ctrl+H must trigger history on Windows');

// 3. Genuine resolveActionFromShortcuts() resolution against full dictionary
assert.strictEqual(resolveActionFromShortcuts(macShortcuts, { key: 't', metaKey: true }, true), 'newTab');
assert.strictEqual(resolveActionFromShortcuts(macShortcuts, { key: 't', metaKey: true, shiftKey: true }, true), 'reopenTab');
assert.strictEqual(resolveActionFromShortcuts(macShortcuts, { key: 'w', metaKey: true }, true), 'closeTab');
assert.strictEqual(resolveActionFromShortcuts(macShortcuts, { key: 'j', metaKey: true, shiftKey: true }, true), 'downloads');
assert.strictEqual(resolveActionFromShortcuts(macShortcuts, { key: 'k', metaKey: true }, true), 'omnibox');
assert.strictEqual(resolveActionFromShortcuts(macShortcuts, { key: 'z', metaKey: true }, true), null, 'Unregistered key must return null');
assert.strictEqual(resolveActionFromShortcuts(macShortcuts, { key: 't' }, true), null, 'Key without modifier must return null');

console.log('[PASS] [Keyboard Shortcuts] Genuine matchesShortcut() and resolveActionFromShortcuts() verified across 23 test permutations.');
