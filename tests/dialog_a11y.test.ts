/**
 * Dialog keyboard semantics.
 *
 * Before this hook the overlays closed on nothing but a backdrop click, had no
 * Escape handler, did not trap Tab, and did not restore focus - so a keyboard
 * user could open a modal, tab out of it into the page behind, and could not
 * dismiss it. These assertions drive the real exported helpers.
 *
 * `computeNextTabTarget` is the part that matters: without the wrap-around, Tab
 * from the last control escapes the dialog, which is the exact bug.
 */

import {
  getFocusableElements,
  computeNextTabTarget,
  isTopmostDialog,
} from '../src/hooks/useDialogA11y';

console.log('--- Dialog a11y (Escape / focus trap / nesting) ---');
let passed = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { passed++; console.log(`[PASS] [Dialog-A11y] ${name}`); }
  else { console.log(`[FAIL] [Dialog-A11y] ${name} ${extra}`); process.exitCode = 1; }
}

// A minimal stand-in for a DOM element: the helper only reads attributes.
const el = (attrs: Record<string, string | null> = {}) => ({
  getAttribute: (n: string) => (n in attrs ? attrs[n] : null),
  hasAttribute: (n: string) => n in attrs && attrs[n] !== null,
});
const container = (nodes: any[]) => ({ querySelectorAll: () => nodes });

// --- tab trap wrapping -------------------------------------------------
{
  const items = ['a', 'b', 'c'] as const;
  check('Tab from the first control moves to the second', computeNextTabTarget([...items], 'a' as any, false) === 'b');
  check('Tab from the last control wraps to the first', computeNextTabTarget([...items], 'c' as any, false) === 'a');
  check('Shift+Tab from the first wraps to the last', computeNextTabTarget([...items], 'a' as any, true) === 'c');
  check('Shift+Tab from the last moves back one', computeNextTabTarget([...items], 'c' as any, true) === 'b');
  check('Tab into the dialog from outside lands on the first', computeNextTabTarget([...items], null, false) === 'a');
  check('Shift+Tab into the dialog from outside lands on the last', computeNextTabTarget([...items], null, true) === 'c');
  check('a dialog with no focusables yields no target', computeNextTabTarget([], 'x' as any, false) === null);
  check('a single focusable traps onto itself', computeNextTabTarget(['only'] as any, 'only' as any, false) === 'only');
  check('an element no longer in the list falls back to the first', computeNextTabTarget([...items], 'gone' as any, false) === 'a');
}

// --- focusable discovery -----------------------------------------------
{
  const nodes = [
    el({ href: '#' }),
    el({ disabled: '' }),
    el({ type: 'hidden' }),
    el({ hidden: '' }),
    el({ 'aria-hidden': 'true' }),
    el({ tabindex: '-1' }),
    el(),
  ];
  const found = getFocusableElements<any>(container(nodes));
  check('a plain element is focusable', found.includes(nodes[6]));
  check('a disabled control is not a tab stop', !found.includes(nodes[1]));
  check('a hidden input type is not a tab stop', !found.includes(nodes[2]));
  check('an element with [hidden] is not a tab stop', !found.includes(nodes[3]));
  check('an aria-hidden element is not a tab stop', !found.includes(nodes[4]));
  check('tabindex=-1 is not a tab stop', !found.includes(nodes[5]));
  check('a missing container yields nothing rather than throwing', getFocusableElements<any>(null).length === 0);
}

// --- nesting: only the topmost dialog reacts ---------------------------
{
  // The stack is module state, driven here through the public predicate. An empty
  // stack means nothing is topmost, which is the "no dialog open" case.
  check('with no dialog open nothing is topmost', isTopmostDialog(Symbol('x')) === false);
}

console.log(`\n${passed} dialog-a11y checks passed\n`);
