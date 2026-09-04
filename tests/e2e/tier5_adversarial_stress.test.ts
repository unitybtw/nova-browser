import assert from 'node:assert/strict';
import { getApplyTranslationScript } from '../../src/services/translationService';
import { safeBase64 } from '../../src/utils/securityUtils';

async function runTier5Tests() {
  // Test 1: lone surrogate URL safety
  const loneSurrogateUrl = 'https://example.com/\uD800/test';
  const res = safeBase64(loneSurrogateUrl);
  assert.equal(typeof res, 'string');
  assert.equal(res.length > 0, true);

  // Test 2: Poisoned translation payload injection prevention
  const attackPayload = [
    'Normal translation',
    '</script><script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    'Paragraph\u2028LineSeparator'
  ];
  const script = getApplyTranslationScript(attackPayload, 'tr');
  assert.equal(script.includes('</script>'), false, 'Translation script must not contain unescaped closing script tags');
  assert.equal(script.includes('<script>'), false, 'Translation script must not contain unescaped script tags');
  assert.equal(script.includes('\\u003c/script\\u003e'), true, 'Script tags must be unicode escaped');

  console.log('Tier 5 adversarial stress tests passed successfully');
}

runTier5Tests().catch(err => {
  console.error('Tier 5 test failure:', err);
  process.exit(1);
});
