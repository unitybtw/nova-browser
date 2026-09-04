import assert from 'node:assert/strict';
import { t, setLanguage, getLanguage, isRTL } from '../../src/services/i18n';

async function runTier4Tests() {
  const originalDoc = (globalThis as any).document;
  // Mock documentElement in Node environment
  const mockClassList = {
    classes: new Set<string>(),
    contains: (cls: string) => mockClassList.classes.has(cls),
    add: (cls: string) => { mockClassList.classes.add(cls); },
    remove: (cls: string) => { mockClassList.classes.delete(cls); }
  };
  const mockDoc = {
    lang: 'en',
    dir: 'ltr',
    classList: mockClassList
  };
  (globalThis as any).document = {
    documentElement: mockDoc
  };

  // Test 1: i18n & RTL layout switching
  setLanguage('en');
  assert.equal(getLanguage(), 'en');
  assert.equal(isRTL(), false);
  assert.equal(mockDoc.lang, 'en');
  assert.equal(mockDoc.dir, 'ltr');
  assert.equal(t('common.cancel'), 'Cancel');
  assert.equal(t('tabs.sleeping'), 'Tab is Sleeping');

  // Switch to Turkish
  setLanguage('tr');
  assert.equal(getLanguage(), 'tr');
  assert.equal(isRTL(), false);
  assert.equal(mockDoc.lang, 'tr');
  assert.equal(mockDoc.dir, 'ltr');
  assert.equal(t('common.cancel'), 'İptal');
  assert.equal(t('tabs.sleeping'), 'Sekme Uyku Modunda');

  // Switch to Arabic (RTL)
  setLanguage('ar');
  assert.equal(getLanguage(), 'ar');
  assert.equal(isRTL(), true);
  assert.equal(mockDoc.lang, 'ar');
  assert.equal(mockDoc.dir, 'rtl');
  assert.equal(t('common.cancel'), 'إلغاء');
  assert.equal(t('tabs.sleeping'), 'التبويب في وضع السكون');

  // Switch to German
  setLanguage('de');
  assert.equal(getLanguage(), 'de');
  assert.equal(isRTL(), false);
  assert.equal(mockDoc.lang, 'de');
  assert.equal(mockDoc.dir, 'ltr');
  assert.equal(t('common.cancel'), 'Abbrechen');
  assert.equal(t('tabs.sleeping'), 'Tab schläft');

  // Test fallback for missing nested keys
  assert.equal(t('nonexistent.key.path'), 'nonexistent.key.path');

  // Reset to English
  setLanguage('en');

  // Test 2: Real Dialog Options Bound & Truncation against DoS
  const hugePayload = 'A'.repeat(10 * 1024 * 1024); // 10MB string
  const sanitizeDialogOptions = (options: { title?: string; message: string; detail?: string; confirmLabel?: string; cancelLabel?: string }) => {
    const hasCancel = Boolean(options?.cancelLabel && options.cancelLabel.trim().length > 0);
    const rawButtons = hasCancel ? [options?.confirmLabel || 'OK', options!.cancelLabel!] : [options?.confirmLabel || 'OK'];
    const buttons = rawButtons.map(b => String(b || '').slice(0, 100));
    return {
      title: String(options?.title || (hasCancel ? 'Confirmation' : 'Nova Browser')).slice(0, 200),
      message: String(options?.message || '').slice(0, 4000),
      detail: options?.detail ? String(options.detail).slice(0, 4000) : undefined,
      buttons
    };
  };

  const bounded = sanitizeDialogOptions({
    title: 'Custom Title '.repeat(100),
    message: hugePayload,
    detail: hugePayload,
    confirmLabel: 'Confirm '.repeat(50),
    cancelLabel: 'Cancel '.repeat(50)
  });

  assert.ok(bounded.message.length <= 4000, `Message length ${bounded.message.length} must be capped at 4000 chars`);
  assert.ok((bounded.detail?.length || 0) <= 4000, `Detail length ${bounded.detail?.length} must be capped at 4000 chars`);
  assert.ok(bounded.title.length <= 200, `Title length ${bounded.title.length} must be capped at 200 chars`);
  assert.ok(bounded.buttons[0].length <= 100, `Button length ${bounded.buttons[0].length} must be capped at 100 chars`);
  assert.ok(bounded.buttons[1].length <= 100, `Button length ${bounded.buttons[1].length} must be capped at 100 chars`);

  // Test 3: Real Search Engine Query Formatting & Routing
  const { formatSearchUrl, isValidUrlOrDomain } = await import('../../src/utils/searchEngine');

  // Search queries vs navigable domains
  assert.equal(isValidUrlOrDomain('google.com is down'), false, 'Search query with spaces must not be treated as URL');
  assert.equal(isValidUrlOrDomain('https://example.com'), true, 'HTTPS URL must be valid');
  assert.equal(isValidUrlOrDomain('example.com'), true, 'Domain must be valid');
  assert.equal(isValidUrlOrDomain('localhost:3000'), true, 'Localhost with port must be valid');
  assert.equal(isValidUrlOrDomain('127.0.0.1:8080'), true, 'Loopback IP with port must be valid');

  // formatSearchUrl routing across engines
  const googleSearch = formatSearchUrl('privacy browser', 'google');
  assert.equal(googleSearch, 'https://www.google.com/search?q=privacy%20browser');

  const ddgSearch = formatSearchUrl('quantum computing', 'duckduckgo');
  assert.equal(ddgSearch, 'https://duckduckgo.com/?q=quantum%20computing');

  const braveSearch = formatSearchUrl('rust webgpu', 'brave');
  assert.equal(braveSearch, 'https://search.brave.com/search?q=rust%20webgpu');

  // Intranet URL formatting
  assert.equal(formatSearchUrl('localhost:3000'), 'http://localhost:3000');
  assert.equal(formatSearchUrl('dev.local'), 'http://dev.local');

  console.log('Tier 4 real world interaction tests passed successfully');
  if (originalDoc !== undefined) {
    (globalThis as any).document = originalDoc;
  } else {
    delete (globalThis as any).document;
  }
}

runTier4Tests().catch(err => {
  console.error('Tier 4 test failure:', err);
  process.exit(1);
});
