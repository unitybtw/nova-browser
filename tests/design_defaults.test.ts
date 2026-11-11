import assert from 'node:assert/strict';
import { defaultSettings } from '../src/types/browser';
import {
  DEFAULT_DESIGN_PROFILE,
  SURFACE_ZONE_IDS,
  createDefaultDesignProfile,
} from '../src/utils/designDefaults';

assert.equal(DEFAULT_DESIGN_PROFILE.meta.version, 1);
assert.equal(SURFACE_ZONE_IDS.length, 9);
assert.equal(defaultSettings.designProfile?.layout.chromeMode, 'classic-top');
assert.ok(defaultSettings.designProfile?.layout.toolbarItems.some(i => i.kind === 'omnibox'));
assert.deepEqual(defaultSettings.workspaceDesigns, {});

const copyA = createDefaultDesignProfile();
const copyB = createDefaultDesignProfile();
copyA.layout.toolbarItems.pop();
assert.notEqual(copyA.layout.toolbarItems.length, copyB.layout.toolbarItems.length);
console.log('design_defaults.test.ts passed');
