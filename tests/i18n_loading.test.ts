import assert from 'node:assert/strict';
import { seedDictionary, ensureLanguageLoaded, isLanguageReady, setLanguage, getLanguage, t, isRTL, getLocale } from '../src/services/i18n';

console.log('--- English-only interface policy ---');
const originalDocument = globalThis.document;
const originalStorage = globalThis.localStorage;
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
try {
  (globalThis as any).document = { documentElement: { lang: 'ar', dir: 'rtl' } };
  const saved = new Map([['nova_language', 'tr'], ['user_settings', JSON.stringify({ language: 'ar', theme: 'light' })]]);
  (globalThis as any).localStorage = { getItem: (k: string) => saved.get(k) ?? null, setItem: (k: string, v: string) => saved.set(k, v) };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'tr-TR' } });
  for (const legacy of ['en', 'tr', 'de', 'ar', 'zz']) {
    seedDictionary(legacy as any, { common: { cancel: 'non-English override' } });
    setLanguage(legacy as any);
    assert.equal(getLanguage(), 'en');
    assert.equal(getLocale(legacy as any), 'en-US');
    assert.equal(isRTL(legacy), false);
    assert.equal(t('common.cancel'), 'Cancel');
    assert.equal(document.documentElement.lang, 'en');
    assert.equal(document.documentElement.dir, 'ltr');
    assert.equal(saved.get('nova_language'), 'en');
    assert.equal(isLanguageReady(), true);
    assert.equal(typeof ensureLanguageLoaded(legacy as any).then, 'function');
  }
  assert.equal(t('definitely.not.a.key'), 'definitely.not.a.key');
  assert.equal(JSON.parse(saved.get('user_settings')!).theme, 'light');
} finally {
  (globalThis as any).document = originalDocument;
  (globalThis as any).localStorage = originalStorage;
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else delete (globalThis as any).navigator;
  setLanguage('en');
}
console.log('[PASS] English UI survives legacy language preferences, RTL settings and dictionary overrides.');
