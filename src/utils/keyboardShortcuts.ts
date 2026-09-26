export interface KeyEventLike {
  key: string;
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
  nativeEvent?: { isComposing?: boolean };
}

export interface ShortcutBindingLike {
  key: string;
  shift?: boolean;
  meta?: boolean;
}

/**
 * Evaluates whether a keyboard event matches a specific shortcut binding.
 * Honors platform modifier conventions:
 * - On macOS: primary modifier is Meta (Cmd).
 * - On Windows/Linux: primary modifier is Ctrl.
 */
export function matchesShortcut(
  binding: ShortcutBindingLike | undefined,
  event: KeyEventLike,
  isMac = true
): boolean {
  if (!binding) return false;

  // Guard against active IME composition (e.g. CJK, dead keys, accent sequences)
  if (event.isComposing || event.nativeEvent?.isComposing) return false;

  // On Windows/Linux, the AltGr key triggers both ctrlKey: true and altKey: true simultaneously.
  // Example: AltGr + Q (produces '@' on Turkish layout) or AltGr + 4 (produces '₺').
  // Never treat AltGr combinations as pure Ctrl shortcuts.
  if (!isMac && event.ctrlKey && event.altKey) {
    return false;
  }

  const key = event.key.toLowerCase();
  const shift = !!event.shiftKey;
  const meta = isMac ? !!event.metaKey : !!event.ctrlKey;

  return key === binding.key.toLowerCase() &&
         shift === !!binding.shift &&
         meta === !!binding.meta;
}

/**
 * Resolves an action identifier from a dictionary of shortcut bindings.
 */
export function resolveActionFromShortcuts<T extends string>(
  shortcuts: Partial<Record<T, ShortcutBindingLike>> | undefined,
  event: KeyEventLike,
  isMac = true
): T | null {
  if (!shortcuts) return null;
  for (const [action, binding] of Object.entries(shortcuts) as [T, ShortcutBindingLike][]) {
    if (matchesShortcut(binding, event, isMac)) {
      return action;
    }
  }
  return null;
}
