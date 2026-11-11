import type { ToolbarItemKind, ToolbarSlotItem } from '../types/browser';
import { ALLOWED_TOOLBAR_KINDS } from './designDefaults';

export const REPEATABLE_TOOLBAR_KINDS: ReadonlySet<ToolbarItemKind> = new Set(['spacer', 'divider']);
export const REPEATABLE_KINDS = REPEATABLE_TOOLBAR_KINDS;

export function reorderToolbarItems(
  items: ToolbarSlotItem[],
  draggedId: string,
  targetId: string
): ToolbarSlotItem[] {
  if (draggedId === targetId) return items;
  const fromIdx = items.findIndex(i => i.id === draggedId);
  const toIdx = items.findIndex(i => i.id === targetId);
  if (fromIdx === -1 || toIdx === -1) return items;
  const next = [...items];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

export function moveToolbarItemToIndex(
  items: ToolbarSlotItem[],
  draggedId: string,
  targetIndex: number
): ToolbarSlotItem[] {
  const fromIdx = items.findIndex(i => i.id === draggedId);
  if (fromIdx === -1) return items;
  const next = [...items];
  const [moved] = next.splice(fromIdx, 1);
  const clamped = Math.max(0, Math.min(next.length, targetIndex));
  next.splice(clamped, 0, moved);
  return next;
}

export function toggleToolbarItemVisibility(items: ToolbarSlotItem[], id: string): ToolbarSlotItem[] {
  return items.map(item => (item.id === id ? { ...item, visible: !item.visible } : item));
}

export function removeToolbarItem(items: ToolbarSlotItem[], id: string): ToolbarSlotItem[] {
  return items.filter(item => item.id !== id);
}

export function insertToolbarItem(
  items: ToolbarSlotItem[],
  kind: ToolbarItemKind,
  atIndex?: number,
  nonce: number = Date.now()
): ToolbarSlotItem[] {
  if (!REPEATABLE_TOOLBAR_KINDS.has(kind) && items.some(i => i.kind === kind)) {
    return items;
  }
  const newItem: ToolbarSlotItem = {
    id: `slot-${kind}-${nonce.toString(36)}`,
    kind,
    visible: true,
  };
  const next = [...items];
  const insertAt = atIndex === undefined ? next.length : Math.max(0, Math.min(next.length, atIndex));
  next.splice(insertAt, 0, newItem);
  return next;
}

export function getPaletteToolbarItems(activeItems: ToolbarSlotItem[]): ToolbarItemKind[] {
  const presentKinds = new Set(activeItems.map(i => i.kind));
  return ALLOWED_TOOLBAR_KINDS.filter(
    kind => REPEATABLE_TOOLBAR_KINDS.has(kind) || !presentKinds.has(kind)
  );
}
