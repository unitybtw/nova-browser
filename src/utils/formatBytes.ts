// Single formatter for every download-size / transfer-speed string in the app.
// Three drifted copies of this used to live in DownloadsToast, DownloadsPage and
// DownloadsPopover, and they disagreed: the toast printed "1.0 KB" where the page
// printed "1 KB", and the popover did not call a helper at all — it hardcoded
// `(bytes / 1024 / 1024).toFixed(1) + ' MB'`, so a 900 KB file rendered "0.9 MB"
// and a 4 KB one rendered "0.0 MB".
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
const STEP = 1024;

/**
 * Formats a byte count as a short human string, e.g. `0 B`, `512 B`, `1 KB`,
 * `900 KB`, `1.5 MB`, `12.3 MB`, `2.4 GB`.
 *
 * Contract:
 * - Anything that is not a finite number greater than 0 (`undefined`, `null`,
 *   `NaN`, `Infinity`, negatives) becomes `'0 B'` — download totals are often
 *   `undefined` or 0 until the server reports a Content-Length.
 * - The unit index is clamped to the last unit, so a value past the final unit
 *   renders as a large TB number instead of indexing past the array ("1.0
 *   undefined").
 * - Whole bytes are integers; from KB up a single decimal carries the
 *   information, and a trailing `.0` is dropped because "1 KB" reads better than
 *   "1.0 KB" and neither is less precise than the other.
 * - The unit index is clamped at both ends. A sub-byte input (the toast computes
 *   a transfer *rate*, which can be well under 1) used to produce a negative
 *   index and therefore a value scaled by 1024 upwards ("0.4" rendered as
 *   "411 B").
 */
export function formatBytes(bytes?: number | null): string {
  if (bytes === undefined || bytes === null || !Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const index = Math.max(0, Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(STEP))));
  const value = bytes / Math.pow(STEP, index);
  const text = index === 0 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, '');
  return `${text} ${UNITS[index]}`;
}
