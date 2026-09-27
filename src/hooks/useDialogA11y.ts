import { useEffect, useRef, type RefObject } from 'react';

/**
 * Dialog keyboard semantics for the app's overlays.
 *
 * Every modal here already had a `containerRef` and `tabIndex={-1}`, so focus was
 * clearly intended - but none of them closed on Escape, none trapped Tab, none
 * restored focus to the trigger, and none announced themselves as dialogs. So a
 * keyboard user could open a modal, tab straight out of it into the page behind,
 * and could not dismiss it with Escape.
 *
 * The nesting rule matters: `ExtensionsModal` can host a `PermissionReviewDialog`.
 * A document-level listener in every dialog would let one Escape press close both
 * at once, so open dialogs register in a stack and only the topmost one reacts.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * The focusable elements inside a container, in tab order.
 *
 * Filtering is attribute-based rather than layout-based on purpose: a layout
 * check needs `getComputedStyle`/`offsetParent`, which cannot be exercised
 * without a real rendering engine, and this is the part whose correctness
 * actually matters. `hidden` and `aria-hidden` are honoured because an element
 * that is explicitly hidden must not become a tab stop.
 */
export function getFocusableElements<T extends { getAttribute(name: string): string | null; hasAttribute(name: string): boolean }>(
  container: { querySelectorAll(selector: string): ArrayLike<T> } | null | undefined
): T[] {
  if (!container) return [];
  const found = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR) as ArrayLike<T>);
  return found.filter(el => {
    if (el.hasAttribute('hidden')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    // The selector already excludes these, but stating it here too means the
    // function does not silently depend on one CSS string staying correct.
    if (el.hasAttribute('disabled')) return false;
    if (el.getAttribute('tabindex') === '-1') return false;
    if (el.getAttribute('type') === 'hidden') return false;
    return true;
  });
}

/**
 * Where Tab should move from the currently active element.
 *
 * Wraps at both ends, which is the whole point of a trap: without the wrap, Tab
 * from the last control leaves the dialog. Returns the active element unchanged
 * when there is nothing to move to, and the first/last control when focus is
 * currently outside the dialog.
 */
export function computeNextTabTarget<T>(focusables: T[], active: T | null, shift: boolean): T | null {
  if (focusables.length === 0) return null;
  const index = active ? focusables.indexOf(active) : -1;
  if (index === -1) return shift ? focusables[focusables.length - 1] : focusables[0];
  const next = shift ? index - 1 : index + 1;
  if (next < 0) return focusables[focusables.length - 1];
  if (next >= focusables.length) return focusables[0];
  return focusables[next];
}

/** Open dialogs, innermost last. Module state, so it is not per-component. */
const openDialogs: symbol[] = [];

export function isTopmostDialog(id: symbol): boolean {
  return openDialogs.length > 0 && openDialogs[openDialogs.length - 1] === id;
}

export interface DialogA11yOptions {
  isOpen: boolean;
  onClose: () => void;
  /** The element that wraps the dialog's content. */
  containerRef: RefObject<HTMLElement | null>;
  /** Optional element to focus on open; defaults to the first focusable control. */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function useDialogA11y({ isOpen, onClose, containerRef, initialFocusRef }: DialogA11yOptions): void {
  const restoreRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const id = Symbol('dialog');
    openDialogs.push(id);
    // Whatever had focus before the dialog opened is where focus goes back to on
    // close; without this, dismissing a modal drops the user at the top of the
    // document and they lose their place entirely.
    restoreRef.current = (document.activeElement as HTMLElement | null) ?? null;

    const container = containerRef.current;
    const first = initialFocusRef?.current ?? getFocusableElements<HTMLElement>(container)[0] ?? container;
    // rAF so the entry animation has mounted the real controls before we look.
    const raf = requestAnimationFrame(() => {
      if (isTopmostDialog(id)) first?.focus?.();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopmostDialog(id)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = getFocusableElements<HTMLElement>(containerRef.current);
      if (focusables.length === 0) {
        event.preventDefault();
        containerRef.current?.focus?.();
        return;
      }
      const target = computeNextTabTarget(focusables, document.activeElement as HTMLElement | null, event.shiftKey);
      if (target && target !== document.activeElement) {
        event.preventDefault();
        target.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      const at = openDialogs.indexOf(id);
      if (at !== -1) openDialogs.splice(at, 1);
      restoreRef.current?.focus?.();
    };
  }, [isOpen, containerRef, initialFocusRef]);
}
