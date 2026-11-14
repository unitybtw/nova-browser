import assert from 'node:assert/strict';
import {
  reorderToolbarItems,
  moveToolbarItemToIndex,
  toggleToolbarItemVisibility,
  removeToolbarItem,
  insertToolbarItem,
  getPaletteToolbarItems,
  REPEATABLE_TOOLBAR_KINDS,
} from '../src/utils/toolbarSlots';
import {
  TOOLBAR_ITEM_META,
  getToolbarItemMeta,
} from '../src/components/customization/toolbarRegistry';
import { TOOLBAR_ITEM_ORDER_DEFAULT, ALLOWED_TOOLBAR_KINDS } from '../src/utils/designDefaults';
import type { ToolbarItemKind, ToolbarSlotItem } from '../src/types/browser';

// ============================================================================
// 1. SDD Canonical Flow from Brief
// ============================================================================
const items = [...TOOLBAR_ITEM_ORDER_DEFAULT];

// 1. Reorder: move 'slot-ai' to index 0
const reordered = reorderToolbarItems(items, 'slot-ai', 'slot-back');
assert.equal(reordered[0].kind, 'ai');

// 2. Toggle visibility (keep slot in place with visible: false)
const hidden = toggleToolbarItemVisibility(reordered, 'slot-home');
assert.equal(hidden.find(i => i.id === 'slot-home')?.visible, false);

// 3. Remove item to palette
const removed = removeToolbarItem(hidden, 'slot-downloads');
assert.ok(!removed.some(i => i.id === 'slot-downloads'));

// 4. Palette reports unused singletons + always includes spacer and divider
const palette = getPaletteToolbarItems(removed);
assert.ok(palette.includes('downloads'));
assert.ok(palette.includes('spacer'));
assert.ok(palette.includes('divider'));

// 5. Insert multiple spacers independently with unique ids
const withSpacer1 = insertToolbarItem(removed, 'spacer', 2, 100);
const withSpacer2 = insertToolbarItem(withSpacer1, 'spacer', 5, 101);
const spacers = withSpacer2.filter(i => i.kind === 'spacer');
assert.equal(spacers.length, 2);
assert.notEqual(spacers[0].id, spacers[1].id);

// Repeatable kinds set
assert.ok(REPEATABLE_TOOLBAR_KINDS.has('spacer'));
assert.ok(REPEATABLE_TOOLBAR_KINDS.has('divider'));
assert.ok(!REPEATABLE_TOOLBAR_KINDS.has('omnibox'));

// ============================================================================
// 2. Edge Cases: moveToolbarItemToIndex
// ============================================================================
const baseList: ToolbarSlotItem[] = [
  { id: 'item-0', kind: 'back', visible: true },
  { id: 'item-1', kind: 'forward', visible: true },
  { id: 'item-2', kind: 'reload', visible: true },
  { id: 'item-3', kind: 'home', visible: true },
];

// Move forward
const movedForward = moveToolbarItemToIndex(baseList, 'item-0', 2);
assert.deepEqual(movedForward.map(i => i.id), ['item-1', 'item-2', 'item-0', 'item-3']);

// Move backward
const movedBackward = moveToolbarItemToIndex(baseList, 'item-3', 1);
assert.deepEqual(movedBackward.map(i => i.id), ['item-0', 'item-3', 'item-1', 'item-2']);

// Move to negative index (clamps to 0)
const clampedNegative = moveToolbarItemToIndex(baseList, 'item-2', -5);
assert.equal(clampedNegative[0].id, 'item-2');

// Move beyond length (clamps to end)
const clampedEnd = moveToolbarItemToIndex(baseList, 'item-1', 99);
assert.equal(clampedEnd[clampedEnd.length - 1].id, 'item-1');

// Invalid ID is a no-op
const invalidMove = moveToolbarItemToIndex(baseList, 'non-existent', 2);
assert.deepEqual(invalidMove, baseList);

// ============================================================================
// 3. Edge Cases: reorderToolbarItems no-ops
// ============================================================================
// Dragged ID === target ID
assert.strictEqual(reorderToolbarItems(baseList, 'item-1', 'item-1'), baseList);
// Dragged ID not found
assert.strictEqual(reorderToolbarItems(baseList, 'missing', 'item-1'), baseList);
// Target ID not found
assert.strictEqual(reorderToolbarItems(baseList, 'item-1', 'missing'), baseList);

// ============================================================================
// 4. Edge Cases: toggleToolbarItemVisibility & removeToolbarItem
// ============================================================================
// Toggle visibility flips twice
const toggledOnce = toggleToolbarItemVisibility(baseList, 'item-0');
assert.equal(toggledOnce.find(i => i.id === 'item-0')?.visible, false);
const toggledTwice = toggleToolbarItemVisibility(toggledOnce, 'item-0');
assert.equal(toggledTwice.find(i => i.id === 'item-0')?.visible, true);

// Toggle non-existent ID does not mutate any items
const toggledMissing = toggleToolbarItemVisibility(baseList, 'non-existent');
assert.deepEqual(toggledMissing, baseList);

// Remove non-existent ID returns same items
const removeMissing = removeToolbarItem(baseList, 'non-existent');
assert.deepEqual(removeMissing, baseList);

// Critical omnibox cannot be hidden or removed
const listWithOmnibox: ToolbarSlotItem[] = [
  { id: 'slot-back', kind: 'back', visible: true },
  { id: 'slot-omnibox', kind: 'omnibox', visible: true },
];
const toggledOmnibox = toggleToolbarItemVisibility(listWithOmnibox, 'slot-omnibox');
assert.equal(toggledOmnibox.find(i => i.id === 'slot-omnibox')?.visible, true, 'Critical omnibox cannot be hidden');
const removedOmnibox = removeToolbarItem(listWithOmnibox, 'slot-omnibox');
assert.ok(removedOmnibox.some(i => i.id === 'slot-omnibox'), 'Critical omnibox cannot be removed');

// ============================================================================
// 5. Edge Cases: insertToolbarItem Singleton Deduplication
// ============================================================================
// Non-repeatable kind already in list is a no-op
const existingAiList: ToolbarSlotItem[] = [
  { id: 'slot-ai-1', kind: 'ai', visible: true },
  { id: 'slot-back', kind: 'back', visible: true },
];
const duplicateAi = insertToolbarItem(existingAiList, 'ai', 0, 999);
assert.strictEqual(duplicateAi, existingAiList);
assert.equal(duplicateAi.length, 2);

// Missing singleton can be inserted
const insertedDownloads = insertToolbarItem(existingAiList, 'downloads', 1, 12345);
assert.equal(insertedDownloads.length, 3);
assert.equal(insertedDownloads[1].kind, 'downloads');
assert.equal(insertedDownloads[1].visible, true);
assert.equal(insertedDownloads[1].id, `slot-downloads-${(12345).toString(36)}`);

// Default index inserts at end
const appended = insertToolbarItem(existingAiList, 'screenshot', undefined, 777);
assert.equal(appended[appended.length - 1].kind, 'screenshot');

// Negative index clamps to 0
const prepended = insertToolbarItem(existingAiList, 'account', -3, 888);
assert.equal(prepended[0].kind, 'account');

// Index beyond length clamps to end
const appendedClamped = insertToolbarItem(existingAiList, 'pip', 100, 999);
assert.equal(appendedClamped[appendedClamped.length - 1].kind, 'pip');

// Dividers are repeatable
const withDivider1 = insertToolbarItem(existingAiList, 'divider', 0, 501);
const withDivider2 = insertToolbarItem(withDivider1, 'divider', 2, 502);
assert.equal(withDivider2.filter(i => i.kind === 'divider').length, 2);

// Invalid / unlisted kind strings are rejected (no-op)
const invalidKindResult = insertToolbarItem(existingAiList, 'invalid-kind-string' as any);
assert.strictEqual(invalidKindResult, existingAiList);
assert.equal(invalidKindResult.length, existingAiList.length);

// Rapid same-tick insertions without nonce produce unique slot IDs
let rapidList = existingAiList;
for (let i = 0; i < 50; i++) {
  rapidList = insertToolbarItem(rapidList, i % 2 === 0 ? 'spacer' : 'divider');
}
const rapidSpacers = rapidList.filter(i => i.kind === 'spacer');
assert.equal(rapidSpacers.length, 25);
const rapidDividers = rapidList.filter(i => i.kind === 'divider');
assert.equal(rapidDividers.length, 25);
const allRapidIds = new Set(rapidList.map(s => s.id));
assert.equal(allRapidIds.size, rapidList.length);

// Explicit nonce determinism remains preserved
const explicitNonceResult = insertToolbarItem(existingAiList, 'spacer', 0, 789);
assert.equal(explicitNonceResult[0].id, `slot-spacer-${(789).toString(36)}`);

// ============================================================================
// 6. Edge Cases: getPaletteToolbarItems
// ============================================================================
// When all kinds from ALLOWED_TOOLBAR_KINDS are present
const allKindsPresent: ToolbarSlotItem[] = ALLOWED_TOOLBAR_KINDS.map((kind, idx) => ({
  id: `slot-${kind}-${idx}`,
  kind,
  visible: true,
}));
const fullPalette = getPaletteToolbarItems(allKindsPresent);
// Only repeatable kinds (spacer, divider) remain
assert.deepEqual(fullPalette.sort(), ['divider', 'spacer']);

// When empty list, palette contains all 19 kinds
const emptyPalette = getPaletteToolbarItems([]);
assert.equal(emptyPalette.length, ALLOWED_TOOLBAR_KINDS.length);
assert.deepEqual(emptyPalette, [...ALLOWED_TOOLBAR_KINDS]);

// ============================================================================
// 7. Metadata Registry: TOOLBAR_ITEM_META & getToolbarItemMeta
// ============================================================================
// Check all 19 kinds are registered
for (const kind of ALLOWED_TOOLBAR_KINDS) {
  const meta = TOOLBAR_ITEM_META[kind];
  assert.ok(meta, `Metadata missing for kind: ${kind}`);
  assert.equal(meta.kind, kind);
  assert.ok(typeof meta.label === 'string' && meta.label.length > 0);
  assert.ok(['navigation', 'address', 'actions', 'layout'].includes(meta.category));
  assert.ok(meta.icon, `Icon missing for kind: ${kind}`);
}

// Critical flags verification
assert.equal(TOOLBAR_ITEM_META.omnibox.isCritical, true);
assert.equal(Boolean(TOOLBAR_ITEM_META.downloads.isCritical), false);
assert.equal(Boolean(TOOLBAR_ITEM_META.spacer.isCritical), false);
assert.equal(Boolean(TOOLBAR_ITEM_META.divider.isCritical), false);
assert.equal(Boolean(TOOLBAR_ITEM_META.back.isCritical), false);

// Categories
assert.equal(TOOLBAR_ITEM_META.back.category, 'navigation');
assert.equal(TOOLBAR_ITEM_META.omnibox.category, 'address');
assert.equal(TOOLBAR_ITEM_META.spacer.category, 'layout');
assert.equal(TOOLBAR_ITEM_META.divider.category, 'layout');
assert.equal(TOOLBAR_ITEM_META.ai.category, 'actions');

// Fallback helper
const fallbackMeta = getToolbarItemMeta('unknown' as any);
assert.equal(fallbackMeta.kind, 'unknown');
assert.equal(fallbackMeta.isCritical, false);

console.log('toolbar_customization.test.ts passed');
