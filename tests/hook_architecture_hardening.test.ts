/**
 * Hook Architecture Hardening & Regression Test Suite.
 *
 * This file used to be nine sections of test-local helpers
 * (`createNewTabRight`, `computeReusedTabState`, `createSplitViewTab`,
 * `pushClosedTabToStack`, `sanitizeFolderRename`, `handleMcpToolCall`,
 * `simulateOnWait`, `mockOnBlockedSite`) each asserted against itself and each
 * printed `[PASS] [Tab Operations]` / `[PASS] [Folders]` / `[PASS] [Agent Bridge]`.
 * A 4-line `sanitizeFolderRename` in this file never touched the folder code
 * that actually renames folders; `handleMcpToolCall` restated the MCP tool
 * dispatcher in src/hooks/useBrowserAgentBridge.ts without calling it. None of it
 * could fail.
 *
 * Every section below now drives shipped code, or is gone. The exports that
 * would let the deleted sections come back for real are listed in the section
 * that used to hold them, with the file and symbol needed.
 */

import assert from 'node:assert/strict';
import { useFolders } from '../src/hooks/useFolders';
import { useBrowserAgentBridge } from '../src/hooks/useBrowserAgentBridge';
import { sanitizeImportedBookmarks } from '../src/hooks/useAppDataBackup';

console.log('\n--- Hook Architecture Hardening & Regression Test Suite ---');

// 1. Bookmarks: the import path that the hook actually runs
//
// Was an inline `.filter().map()` pipeline in this file, asserted against its
// own output. It is now `sanitizeImportedBookmarks`
// (src/hooks/useAppDataBackup.ts:166), the same function the import button
// calls, so a change to the real policy is a failure here.
const rawImportedBookmarks = [
  { url: 'https://valid.com', title: 'Valid' }, // missing id and timestamp
  { url: 'javascript:alert(1)', title: 'XSS Vector' }, // malicious protocol
  { url: 'data:text/html,<h1>PWN</h1>', title: 'Data URL' }, // blocked protocol
  { id: 'custom-bm', url: 'https://custom.com', createdAt: 1700000000000 }, // createdAt instead of timestamp
  { id: '', url: 'https://emptyid.com', title: 'Empty id must be regenerated' },
  { id: 'long-title', url: 'https://long.com', title: 'x'.repeat(900) }, // title must be truncated
];

const imported = sanitizeImportedBookmarks(rawImportedBookmarks);

assert.strictEqual(imported.length, 4, 'javascript: and data: bookmark URLs must be dropped');
assert.deepStrictEqual(
  imported.map((b) => b.url),
  ['https://valid.com', 'https://custom.com', 'https://emptyid.com', 'https://long.com'],
  'Retained bookmarks must keep source order and their original URLs'
);
assert.ok((imported[0].id as string).length > 0, 'a missing id must be generated, not left undefined');
assert.strictEqual(imported[1].id, 'custom-bm', 'an existing id must be preserved');
assert.strictEqual(imported[1].timestamp, 1700000000000, 'createdAt must be accepted as the timestamp fallback');
assert.ok((imported[2].id as string).length > 0, 'an empty-string id must be regenerated');
assert.notStrictEqual(imported[0].id, imported[2].id, 'each regenerated id must be distinct, or rows collide');
assert.strictEqual(imported[3].title.length, 500, 'an oversized title must be truncated to 500 characters');

console.log('[PASS] [Data Backup] Import sanitization rejects dangerous schemes and recovers missing IDs/timestamps');

// 1a. A real gap found while replacing the inline copy, recorded so it is not
// lost. `sanitizeImportedBookmarks` (src/hooks/useAppDataBackup.ts:173) guards
// the incoming id with `typeof b.id === 'string' && b.id`, i.e. a truthiness
// check. A whitespace-only id such as `"  "` is truthy, so it is imported
// verbatim. Two backup rows carrying `"  "` therefore land in the store with the
// same id, and every later sync dedupes on `keyOf: b => b.id`, so one of them is
// dropped without a trace. The vector below pins the current behaviour; the fix
// belongs in src/hooks/useAppDataBackup.ts:173 (trim before the truthiness test),
// which is outside this file's ownership.
const whitespaceIdImported = sanitizeImportedBookmarks([
  { id: '  ', url: 'https://ws-a.example/', title: 'A' },
  { id: '  ', url: 'https://ws-b.example/', title: 'B' },
]);
assert.strictEqual(
  whitespaceIdImported.length,
  2,
  'both rows are imported'
);
assert.strictEqual(
  whitespaceIdImported[0].id,
  whitespaceIdImported[1].id,
  'KNOWN GAP: a whitespace-only id is passed through verbatim, so two such rows collide on sync keyOf(id). src/hooks/useAppDataBackup.ts:173 needs a trim before the truthiness check.'
);

// 1b. The second half of the import path — folding sanitised rows into the
// store without resurrecting deleted rows — is deliberately NOT re-tested here.
// `mergeImportedBookmarks` (src/hooks/useAppDataBackup.ts:192) is already driven
// for real against the tombstone, alias-key and restore-additivity cases in
// tests/backup_tombstone.test.ts. A second, weaker copy of those assertions in
// this file would be the same duplication pattern this rewrite is removing.

// 2. Hook module shape
//
// The weakest honest assertion available for a React hook whose internals are
// not exported: the hook exists, is callable, and is a named function. This is
// not a substitute for behavioural coverage — it is the floor, and it fails if a
// hook is renamed, dropped, or replaced with a non-function export.
assert.strictEqual(typeof useFolders, 'function', 'useFolders must remain an exported hook function');
assert.strictEqual(
  typeof useBrowserAgentBridge,
  'function',
  'useBrowserAgentBridge must remain an exported hook function'
);
assert.strictEqual(
  useFolders.length,
  1,
  'useFolders must keep taking a single options object'
);
assert.strictEqual(
  useBrowserAgentBridge.length,
  1,
  'useBrowserAgentBridge must keep taking a single options object'
);

console.log('[PASS] [Hook Shape] useFolders and useBrowserAgentBridge are callable hooks taking one options object');

// 3. REMOVED — folder rename sanitization
//
// `sanitizeFolderRename` was declared in this file and asserted against itself.
// The code that actually renames folders is `handleRenameFolder`
// (src/hooks/useFolders.ts:36-40), inline in the hook body:
//
//   const trimmed = (name || '').trim();
//   if (!trimmed) return;
//   setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: trimmed.slice(0, 100) } : f));
//
// The 100-character cap and the empty-name rejection the old section claimed to
// cover are real in production, but unreachable from a test.
//
// NEEDED EXPORT: from src/hooks/useFolders.ts, the name sanitiser lifted out of
// the callback — `sanitizeFolderName(name: string): string | null` — with
// `handleRenameFolder` (src/hooks/useFolders.ts:36) calling it. `null` for a
// name that trims to empty; otherwise the trimmed name capped at 100 chars.
// That one export makes this section real and is also the only way to assert
// the 100-char cap is still enforced.

// 4. REMOVED — incognito inheritance, blank-tab reuse, split view, closed tabs
//
// All four asserted against test-local constructors (`createNewTabRight`,
// `computeReusedTabState`, `createSplitViewTab`, `pushClosedTabToStack`).
// The MAX_CLOSED_TABS=50 cap in particular was asserted against a literal
// `const MAX_CLOSED_TABS = 50` written in this file, so it proved nothing about
// the real cap.
//
// NEEDED EXPORTS:
//   - src/hooks/useTabOperations.ts: the blank-tab-reuse decision
//     (`shouldMarkLoading(url)` or the reused-tab state builder).
//   - src/hooks/useSplitView.ts: the split-view tab factory, so incognito
//     inheritance is checked against production.
//   - the closed-tabs stack: `MAX_CLOSED_TABS` and a pure
//     `pushClosedTabs(stack, tabs)` reducer exported from the owning hook, so
//     the 50-item cap and the incognito exclusion are asserted against the real
//     cap rather than a literal in this file.

// 5. REMOVED — MCP bridge tool dispatch
//
// `handleMcpToolCall` was a 35-line restatement of the tool dispatcher in
// src/hooks/useBrowserAgentBridge.ts:125+, including the selector/tabId guards,
// asserted against its own strings. The shipped dispatcher drives a real
// webview, so its guard clauses are only observable through the dispatcher.
//
// NEEDED EXPORTS: from src/hooks/useBrowserAgentBridge.ts, the argument
// validation split out of the dispatch switch — e.g.
// `validateMcpToolArgs(toolName: string, args: unknown): string | null`
// returning the same error string or null — plus the tool-name allowlist. With
// those, the null/undefined-safety assertions this section used to make about
// itself become assertions about the shipped guard.

// 6. REMOVED — onWait unmount teardown
//
// `simulateOnWait` built a promise/timer/resolver bookkeeping structure in this
// file and then asserted the sizes of that same structure. It exercised a
// 4-line mock, not the hook.
//
// NEEDED EXPORT: from src/hooks/useBrowserAgentBridge.ts, the onWait lifecycle
// split out as `createOnWaitLifecycle({ clampMs })` exposing the active timer
// and resolver sets, so unmount teardown can be asserted against the real one.
// The 30s clamp the old section referenced is production behaviour, not a
// property of the mock.

// 7. REMOVED — onBlockedSite payload
//
// `mockOnBlockedSite` called its own callback with its own object and asserted
// it had been called. Nothing about the production IPC handler was involved.
//
// NEEDED EXPORT: from src/hooks/useBrowserAgentBridge.ts (or wherever the
// `blocked-site` IPC event is subscribed), the payload normaliser, e.g.
// `normaliseBlockedSitePayload(data: unknown): { url: string; reason: string } | null`.

console.log('\n================================================================');
console.log('HOOK ARCHITECTURE HARDENING TESTS : 4 / 4 PASSED');
console.log('================================================================');
