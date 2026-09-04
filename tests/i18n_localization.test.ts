import assert from 'node:assert/strict';
import { getLocale, formatDate, formatTime, setLanguage, getLanguage, onLanguageChange, t, LOCALE_MAP, SupportedLanguage } from '../src/services/i18n';
import en from '../src/locales/en.json';
import tr from '../src/locales/tr.json';
import de from '../src/locales/de.json';
import ar from '../src/locales/ar.json';

console.log('\n--- i18n & Multi-Language Date/Time Localization Suite ---');

// 1. Locale Mapping Verification
assert.equal(LOCALE_MAP.en, 'en-US', 'en must map to en-US');
assert.equal(LOCALE_MAP.tr, 'tr-TR', 'tr must map to tr-TR');
assert.equal(LOCALE_MAP.de, 'de-DE', 'de must map to de-DE');
assert.equal(LOCALE_MAP.ar, 'ar-SA', 'ar must map to ar-SA');

assert.equal(getLocale('en'), 'en-US');
assert.equal(getLocale('tr'), 'tr-TR');
assert.equal(getLocale('de'), 'de-DE');
assert.equal(getLocale('ar'), 'ar-SA');

// 2. Date Formatting Across Locales
const fixedDate = new Date(2026, 8, 4, 15, 30); // September 4, 2026 (Friday)
const enDate = formatDate(fixedDate, 'en');
const trDate = formatDate(fixedDate, 'tr');
const deDate = formatDate(fixedDate, 'de');
const arDate = formatDate(fixedDate, 'ar');

assert.ok(enDate.includes('September') && enDate.includes('Friday'), `en date must have English month/day, got: ${enDate}`);
assert.ok(trDate.includes('Eylül') && trDate.includes('Cuma'), `tr date must have Turkish month/day, got: ${trDate}`);
assert.ok(deDate.includes('September') && deDate.includes('Freitag'), `de date must have German month/day, got: ${deDate}`);
assert.ok(arDate.length > 0, 'ar date must format properly');

// 3. Time Formatting Across Locales
const enTime = formatTime(fixedDate, 'en');
const trTime = formatTime(fixedDate, 'tr');
assert.ok(typeof enTime === 'string' && enTime.length > 0);
assert.ok(typeof trTime === 'string' && trTime.length > 0);

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

setLanguage('tr');
assert.equal(t(getGreetingKey(9)), 'Günaydın');
assert.equal(t(getGreetingKey(14)), 'İyi Günler');
assert.equal(t(getGreetingKey(20)), 'İyi Akşamlar');

setLanguage('de');
assert.equal(t(getGreetingKey(9)), 'Guten Morgen');
assert.equal(t(getGreetingKey(14)), 'Guten Tag');
assert.equal(t(getGreetingKey(20)), 'Guten Abend');

setLanguage('ar');
assert.equal(t(getGreetingKey(9)), 'صباح الخير');
assert.equal(t(getGreetingKey(14)), 'مساء الخير');
assert.equal(t(getGreetingKey(20)), 'مساء الخير');

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

console.log('[PASS] [i18n Localization] Locale mapping, date/time formatting, greeting calculation, and reactive switching verified.');
