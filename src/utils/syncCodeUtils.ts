/**
 * Normalizes a sync pairing code into raw uppercase hex string.
 * Strips 'nova-', 'nova:', spaces, and hyphens.
 */
export function normalizeSyncCode(code: string): string {
  if (!code || typeof code !== 'string') return '';
  let clean = code.trim().toLowerCase();
  if (clean.startsWith('nova-')) {
    clean = clean.slice(5);
  } else if (clean.startsWith('nova:')) {
    clean = clean.slice(5);
  }
  return clean.replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Formats a raw hex string into a human-friendly sync chain pairing code:
 * nova-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx (groups of 4 characters).
 */
export function formatSyncCode(cleanHex: string): string {
  if (!cleanHex || typeof cleanHex !== 'string') return '';
  const lower = cleanHex.toLowerCase();
  const chunks = lower.match(/.{1,4}/g)?.join('-') || lower;
  return `nova-${chunks}`;
}
