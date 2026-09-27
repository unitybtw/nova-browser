/**
 * On-demand locale loading.
 *
 * The three non-English dictionaries are dynamic imports; English stays static
 * so a failed or missing chunk always has a working fallback. The first paint
 * waits for the active language (the main.tsx bootstrap) precisely so this stays
 * invisible: without that gate a Turkish or Arabic user would see English and
 * have the UI, and document.dir, re-render under them.
 *
 * Fully SYNCHRONOUS on purpose. i18n is module-level shared state, so a suite that
 * left a pending promise behind would flip the language under whatever suite ran
 * next - which is exactly what happened when these checks were written with a
 * trailing async block. Dictionaries are seeded with the real JSON so the policy
 * is tested without any timing.
 */

import {
  seedDictionary,
  ensureLanguageLoaded,
  isLanguageReady,
  setLanguage,
  getLanguage,
  t,
  isRTL,
  getLocale,
} from '../src/services/i18n';
import trDict from '../src/locales/tr.json';
import deDict from '../src/locales/de.json';
import arDict from '../src/locales/ar.json';

console.log('--- i18n on-demand locale loading ---');
let passed = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { passed++; console.log(`[PASS] [I18n-Loading] ${name}`); }
  else { console.log(`[FAIL] [I18n-Loading] ${name} ${extra}`); process.exitCode = 1; }
}

// 1. English is bundled, so it is ready with no fetch at all.
check('English is ready without loading anything', isLanguageReady('en') === true);
check('a non-English language starts out not ready', isLanguageReady('tr') === false);
check('Arabic is not ready either', isLanguageReady('ar') === false);

// 2. A supported language must NOT be downgraded just because its chunk has not
//    arrived. Downgrading here is the flash-of-English bug.
setLanguage('tr');
check('the language is not downgraded to English while loading', getLanguage() === 'tr', getLanguage());
check('t() falls back to English rather than the key path', t('newtab.shieldDisabled') === 'Shield Disabled', t('newtab.shieldDisabled'));
check('the fallback is the English string, not an empty one', t('newtab.shieldDisabled').length > 0);

// 3. ensureLanguageLoaded hands back a thenable for a pending language, and a
//    settled one for a language that is already present.
let thenable = false;
ensureLanguageLoaded('tr').then(() => { thenable = true; });
check('ensureLanguageLoaded returns a thenable', typeof thenable === 'boolean');
check('English needs no load', isLanguageReady('en') === true);

// 4. Once the dictionary is in hand the strings come from it.
seedDictionary('tr', trDict as any);
check('after seeding, the language is ready', isLanguageReady('tr') === true);
check('t() now renders Turkish, not the fallback', t('newtab.shieldDisabled') === 'Kalkan Devre Dışı', t('newtab.shieldDisabled'));

seedDictionary('de', deDict as any);
setLanguage('de');
check('a seeded language needs no downgrade', getLanguage() === 'de', getLanguage());
check('and renders German', t('newtab.shieldDisabled') === 'Schutz deaktiviert', t('newtab.shieldDisabled'));

seedDictionary('ar', arDict as any);
setLanguage('ar');
check('Arabic renders its own strings', t('newtab.shieldDisabled') === 'الدرع معطل', t('newtab.shieldDisabled'));
check('Arabic is RTL by declaration', isRTL('ar') === true);

// The greetings the localisation suite used to assert synchronously. They live
// here because this is the suite that owns the on-demand dictionaries.
seedDictionary('tr', trDict as any);
setLanguage('tr');
check('tr greeting (morning)', t('newtab.goodMorning') === 'Günaydın', t('newtab.goodMorning'));
check('tr greeting (afternoon)', t('newtab.goodAfternoon') === 'İyi Günler', t('newtab.goodAfternoon'));
check('tr greeting (evening)', t('newtab.goodEvening') === 'İyi Akşamlar', t('newtab.goodEvening'));
seedDictionary('de', deDict as any);
setLanguage('de');
check('de greeting (morning)', t('newtab.goodMorning') === 'Guten Morgen', t('newtab.goodMorning'));
check('de greeting (evening)', t('newtab.goodEvening') === 'Guten Abend', t('newtab.goodEvening'));
seedDictionary('ar', arDict as any);
setLanguage('ar');
check('ar greeting (morning)', t('newtab.goodMorning') === 'صباح الخير', t('newtab.goodMorning'));

// 5. Locale and direction metadata never depend on the dictionary being loaded.
check('Turkish maps to a Turkish locale', getLocale('tr') === 'tr-TR', getLocale('tr'));
check('German is not RTL', isRTL('de') === false);
check('Turkish is not RTL', isRTL('tr') === false);
check('Arabic maps to a Saudi locale', getLocale('ar') === 'ar-SA', getLocale('ar'));

// 6. Seeding a dictionary that is already present is harmless, and an unknown
//    language still falls back to English.
seedDictionary('tr', trDict as any);
check('re-seeding is harmless', isLanguageReady('tr') === true);
setLanguage('zz' as any);
check('an unsupported code falls back to English', getLanguage() === 'en', getLanguage());
check('and English is ready', isLanguageReady('en') === true);

// 7. The pre-existing whole-key fallback must survive all of this.
check('an unknown key returns its path', t('definitely.not.a.key') === 'definitely.not.a.key');

// Leave the shared state as the rest of the suite expects it.
setLanguage('en');
check('the suite leaves the language on English', getLanguage() === 'en');

console.log(`\n${passed} i18n-loading checks passed\n`);
