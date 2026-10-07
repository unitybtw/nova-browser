import assert from 'node:assert/strict';
import { getLocale, formatDate, formatTime, setLanguage, getLanguage, onLanguageChange, t, LOCALE_MAP, SupportedLanguage } from '../src/services/i18n';
import en from '../src/locales/en.json';
import tr from '../src/locales/tr.json';
import de from '../src/locales/de.json';
import ar from '../src/locales/ar.json';

console.log('\n--- i18n & English Date/Time Suite ---');

// Legacy locale arguments all resolve to the single English interface.
for (const code of ['en', 'tr', 'de', 'ar'] as SupportedLanguage[]) {
  assert.equal(LOCALE_MAP[code], 'en-US');
  assert.equal(getLocale(code), 'en-US');
  const fixedDate = new Date(2026, 8, 4, 15, 30);
  const date = formatDate(fixedDate, code);
  assert.ok(date.includes('September') && date.includes('Friday'));
  assert.ok(formatTime(fixedDate, code).length > 0);
}

// 4. Greetings in All Locales
const getGreetingKey = (hour: number): string => {
  if (hour < 12) return 'newtab.goodMorning';
  if (hour < 18) return 'newtab.goodAfternoon';
  return 'newtab.goodEvening';
};

setLanguage('en');
assert.equal(t(getGreetingKey(9)), 'Good Morning');
assert.equal(t(getGreetingKey(14)), 'Good Afternoon');
assert.equal(t(getGreetingKey(20)), 'Good Evening');

// The tr/de/ar dictionaries are dynamic imports in the app, so they are NOT
// synchronously available here and this suite does not seed them: i18n is
// module-level shared state, and seeding from two suites makes them order
// dependent. The loading policy and the translated strings are asserted in
// tests/i18n_loading.test.ts, which owns those dictionaries.

// 5. Reactive Listener on Language Change
let listenerTriggered = false;
let observedLang: SupportedLanguage | null = null;
const unsubscribe = onLanguageChange((lang) => {
  listenerTriggered = true;
  observedLang = lang;
});

setLanguage('en');
assert.equal(listenerTriggered, true);
assert.equal(observedLang, 'en');
assert.equal(getLanguage(), 'en');
unsubscribe();

// 6. Locale Dictionary Parity for New Sections
const dictionaries = { en, tr, de, ar };
const requiredNewtabKeys = [
  'goodMorning', 'goodAfternoon', 'goodEvening',
  'incognitoTitle', 'incognitoDesc', 'incognitoPlaceholder',
  'shieldActive', 'shieldDisabled', 'searchEngine',
  'tasks', 'tasksLeft', 'clearCompletedTasks', 'noTasks',
  'addTaskPlaceholder', 'deleteTask', 'clearTasksTitle',
  'addShortcutTitle', 'editShortcutTitle', 'shortcutName', 'shortcutUrl',
  'shuffleWallpaper'
];

const requiredHistoryKeys = [
  'title', 'pagesRecorded', 'clearBrowsingData', 'searchPlaceholder',
  'noHistory', 'today', 'yesterday', 'last7Days', 'older',
  'clearModalTitle', 'clearModalDesc', 'lastHour', 'last24Hours',
  'last7DaysOption', 'allTime'
];

const requiredDownloadsKeys = [
  'title', 'clearList', 'searchPlaceholder', 'noDownloads',
  'noDownloadsDesc', 'openFolder', 'cancel', 'pause', 'resume',
  'retry', 'completed', 'cancelled', 'interrupted', 'progressing'
];

for (const [langCode, dict] of Object.entries(dictionaries)) {
  const d = dict as Record<string, any>;
  for (const key of requiredNewtabKeys) {
    assert.ok(d.newtab && typeof d.newtab[key] === 'string' && d.newtab[key].length > 0, `Missing newtab.${key} in ${langCode}`);
  }
  for (const key of requiredHistoryKeys) {
    assert.ok(d.history && typeof d.history[key] === 'string' && d.history[key].length > 0, `Missing history.${key} in ${langCode}`);
  }
  for (const key of requiredDownloadsKeys) {
    assert.ok(d.downloads && typeof d.downloads[key] === 'string' && d.downloads[key].length > 0, `Missing downloads.${key} in ${langCode}`);
  }
}

// Reset language to en
setLanguage('en');

console.log('[PASS] [i18n Localization] English date/time formatting, greetings and legacy language compatibility verified.');
