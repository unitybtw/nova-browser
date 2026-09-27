/**
 * What to do when a renderer process goes away.
 *
 * `render-process-gone` fires for EVERY way a renderer can end, including the
 * ordinary ones. Treating it as "crashed" is actively harmful during shutdown
 * and during an update: `install-update` destroys the windows and then quits,
 * so a `clean-exit` arrives moments before the process is meant to die. Calling
 * `reload()` on that webContents resurrects a window whose bundle is being
 * replaced underneath it by the updater, which is how a finished update used to
 * land on the error screen instead of starting cleanly.
 *
 * Exported separately from main.ts because main.ts boots Electron on import and
 * therefore cannot be exercised by the test suite.
 */

/** Reasons that mean a real crash worth recovering from. */
const RECOVERABLE_REASONS = new Set<string>([
  'crashed',
  'oom',
  'launch-failed',
  'integrity-failure',
]);

/**
 * True when the renderer died unexpectedly and a reload can plausibly recover
 * the window. `clean-exit` (a destroyed/closed window) and `killed` (the app is
 * quitting) are normal and must never trigger a reload.
 */
export function isRecoverableRendererExit(reason: string | undefined | null): boolean {
  return RECOVERABLE_REASONS.has(String(reason));
}

/**
 * Whether the app is on its way out. Set before the windows are torn down so a
 * late `render-process-gone` cannot revive anything.
 */
let quitting = false;

export function markQuitting(value = true): void {
  quitting = value;
}

export function isQuitting(): boolean {
  return quitting;
}

/**
 * The full decision, in one place so the update path and the crash path cannot
 * disagree: reload only for a genuine crash, and never while quitting.
 */
export function shouldReloadAfterRendererGone(reason: string | undefined | null): boolean {
  if (quitting) return false;
  return isRecoverableRendererExit(reason);
}
