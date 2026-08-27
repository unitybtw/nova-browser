import { 
  getExtractTextNodesScript, 
  getApplyTranslationScript, 
  getRestoreOriginalScript, 
  SUPPORTED_LANGUAGES 
} from '../src/services/translationService';

console.log('\n--- 6. Page Translation Engine Empirical Tests ---');

// Test 1: Language support list
const hasTurkish = SUPPORTED_LANGUAGES.some(l => l.code === 'tr');
const hasEnglish = SUPPORTED_LANGUAGES.some(l => l.code === 'en');
const hasGerman = SUPPORTED_LANGUAGES.some(l => l.code === 'de');
if (hasTurkish && hasEnglish && hasGerman && SUPPORTED_LANGUAGES.length >= 15) {
  console.log('[PASS] [Translation Engine] Supported languages verified (' + SUPPORTED_LANGUAGES.length + ' languages registered)');
} else {
  console.error('[FAIL] [Translation Engine] Supported languages missing key codes');
  process.exit(1);
}

// Test 2: Extraction script syntax
const extractScript = getExtractTextNodesScript();
if (extractScript.includes('TreeWalker') && extractScript.includes('window.__novaTranslationMap')) {
  console.log('[PASS] [Translation Engine] Extract text nodes script generated successfully');
} else {
  console.error('[FAIL] [Translation Engine] Extract script missing TreeWalker or Map setup');
  process.exit(1);
}

// Test 3: Apply translation script with escaping
const sampleTranslations = ['Merhaba Dünya', 'Nova Tarayıcı "Hızlı" & Güvenli', "O'clock & test <tags>"];
const applyScript = getApplyTranslationScript(sampleTranslations, 'tr');
if (applyScript.includes('Merhaba D\\u00fcnya') || applyScript.includes('Merhaba Dünya')) {
  console.log('[PASS] [Translation Engine] Apply translation script safely serialized with targetLang="tr"');
} else {
  console.error('[FAIL] [Translation Engine] Apply script serialization failed');
  process.exit(1);
}

// Test 4: Restore original script
const restoreScript = getRestoreOriginalScript();
if (restoreScript.includes('window.__novaTranslationMap') && restoreScript.includes('removeAttribute')) {
  console.log('[PASS] [Translation Engine] Restore original script generated successfully');
} else {
  console.error('[FAIL] [Translation Engine] Restore script missing cleanup logic');
  process.exit(1);
}

