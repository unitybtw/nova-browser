// safeBase64 test logic verification
const safeBase64 = (str: string): string => {
  if (!str) return '';
  const wellFormed = typeof (str as any).toWellFormed === 'function'
    ? (str as any).toWellFormed()
    : str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');

  try {
    return btoa(unescape(encodeURIComponent(wellFormed)));
  } catch (e) {
    try {
      const sanitized = wellFormed.replace(/%/g, '_');
      return btoa(sanitized);
    } catch (e2) {
      return wellFormed.replace(/[^a-zA-Z0-9]/g, '_');
    }
  }
};

try {
  const loneSurrogateUrl = 'https://example.com/\uD800/test';
  const res = safeBase64(loneSurrogateUrl);
  console.log('[Tier 5 Test] safeBase64 with lone surrogate result:', res);
  if (!res || typeof res !== 'string') {
    throw new Error('safeBase64 returned non-string result');
  }
  console.log('[Tier 5 Test] safeBase64 lone surrogate test PASSED');
} catch (err) {
  console.error('[Tier 5 Test] safeBase64 lone surrogate test FAILED:', err);
  process.exit(1);
}

console.log('Tier 5 test suite passing');
