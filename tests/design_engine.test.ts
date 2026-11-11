import assert from 'node:assert/strict';
import { defaultSettings, type UserSettings } from '../src/types/browser';
import {
  resolveEffectiveDesign,
  designToCssVariables,
  type ResolvedBrowserDesign,
} from '../src/utils/designEngine';
import {
  STARTER_DESIGN_TEMPLATES,
  getStarterTemplateById,
} from '../src/utils/designTemplates';

// ---------------------------------------------------------------------------
// 1. Starter Templates
// ---------------------------------------------------------------------------
assert.ok(Array.isArray(STARTER_DESIGN_TEMPLATES));
assert.ok(STARTER_DESIGN_TEMPLATES.length >= 6, 'Must provide at least 6 starter templates');

const expectedTemplateIds = [
  'nova-default',
  'zen-compact',
  'arc-studio',
  'right-dock-pro',
  'frosted-glass',
  'minimal-paper',
];

for (const id of expectedTemplateIds) {
  const found = getStarterTemplateById(id);
  assert.ok(found, `Template "${id}" must be retrievable by id`);
  assert.equal(found.id, id);
  assert.ok(typeof found.name === 'string' && found.name.length > 0);
  assert.ok(typeof found.description === 'string' && found.description.length > 0);
  assert.ok(found.previewAccent.startsWith('#'), 'previewAccent must be hex');
  assert.ok(found.previewBg.startsWith('#'), 'previewBg must be hex');
  assert.ok(found.profile && typeof found.profile === 'object');
  assert.equal(found.profile.meta.version, 1);
}

assert.equal(getStarterTemplateById('nonexistent-template'), undefined);

// Specific starter architectural checks
const zen = getStarterTemplateById('zen-compact')!;
assert.equal(zen.profile.layout.chromeMode, 'compact-single-row');
assert.equal(zen.profile.density, 'compact');

const arc = getStarterTemplateById('arc-studio')!;
assert.equal(arc.profile.layout.chromeMode, 'vertical-left');
assert.equal(arc.profile.layout.sidebarWidth, 268);

const rightDock = getStarterTemplateById('right-dock-pro')!;
assert.equal(rightDock.profile.layout.chromeMode, 'vertical-right');
assert.equal(rightDock.profile.layout.sidebarWidth, 248);
assert.equal(rightDock.profile.typography.fontFamily, 'mono');

const frosted = getStarterTemplateById('frosted-glass')!;
assert.equal(frosted.profile.effects.windowMaterial, 'glass-vibrancy');
assert.ok((frosted.profile.surfaces.toolbar?.opacity ?? 1) < 1);

const minimal = getStarterTemplateById('minimal-paper')!;
assert.equal(minimal.profile.layout.tabBarPosition, 'below-toolbar');
assert.equal(minimal.profile.typography.fontFamily, 'serif');

// ---------------------------------------------------------------------------
// 2. Base Resolution & Workspace Override Priority (Sparse Merge)
// ---------------------------------------------------------------------------
const baseSettings: UserSettings = {
  ...defaultSettings,
  designProfile: {
    ...defaultSettings.designProfile!,
    layout: {
      ...defaultSettings.designProfile!.layout,
      sidebarWidth: 290,
      omniboxMaxWidth: 'balanced',
    },
    typography: {
      fontFamily: 'geist',
      uiScale: 1.1,
      iconScale: 1.05,
    },
    density: 'comfortable',
  },
  workspaceDesigns: {
    work: {
      layout: {
        chromeMode: 'vertical-right',
        sidebarWidth: 310,
        sidebarSections: {
          favorites: false,
        },
      },
      surfaces: {
        toolbar: { bg: '#112233', radius: 14, blur: 12 },
      },
    },
    sparseWorkspace: {
      layout: {
        chromeMode: 'vertical-left',
      },
    },
  },
};

// Default workspace / no override
const defaultResolved = resolveEffectiveDesign(baseSettings, 'default', false);
assert.equal(defaultResolved.layout.chromeMode, 'classic-top');
assert.equal(defaultResolved.layout.sidebarWidth, 290);
assert.equal(defaultResolved.typography.fontFamily, 'geist');
assert.equal(defaultResolved.density, 'comfortable');
assert.equal(defaultResolved.isIncognitoLocked, false);
assert.equal(defaultResolved.effectiveAccentHex, '#3b82f6');

// "work" workspace: overrides chromeMode, sidebarWidth, toolbar surface, and favorites section
const workResolved = resolveEffectiveDesign(baseSettings, 'work', false);
assert.equal(workResolved.layout.chromeMode, 'vertical-right');
assert.equal(workResolved.layout.sidebarWidth, 310);
assert.equal(workResolved.surfaces.toolbar?.bg, '#112233');
assert.equal(workResolved.surfaces.toolbar?.radius, 14);
assert.equal(workResolved.surfaces.toolbar?.blur, 12);
// Sparse check: un-overridden sidebarSections preserved from base
assert.equal(workResolved.layout.sidebarSections.favorites, false);
assert.equal(workResolved.layout.sidebarSections.pinned, true);
assert.equal(workResolved.layout.sidebarSections.folders, true);
// Sparse check: un-overridden layout / typography / density preserved from base
assert.equal(workResolved.typography.fontFamily, 'geist');
assert.equal(workResolved.typography.uiScale, 1.1);
assert.equal(workResolved.density, 'comfortable');
assert.equal(workResolved.layout.toolbarItems.length, defaultSettings.designProfile!.layout.toolbarItems.length);

// "sparseWorkspace": overrides ONLY chromeMode. Must keep global sidebarWidth 290 and all other fields!
const sparseResolved = resolveEffectiveDesign(baseSettings, 'sparseWorkspace', false);
assert.equal(sparseResolved.layout.chromeMode, 'vertical-left');
assert.equal(sparseResolved.layout.sidebarWidth, 290, 'Global sidebarWidth must be preserved when override does not specify it');
assert.equal(sparseResolved.layout.toolbarItems.length, defaultSettings.designProfile!.layout.toolbarItems.length);
assert.equal(sparseResolved.typography.fontFamily, 'geist');

// Unknown workspace id falls back to base profile
const unknownWsResolved = resolveEffectiveDesign(baseSettings, 'unknown-ws-id', false);
assert.equal(unknownWsResolved.layout.chromeMode, 'classic-top');
assert.equal(unknownWsResolved.layout.sidebarWidth, 290);

// ---------------------------------------------------------------------------
// 3. Legacy Synchronization
// ---------------------------------------------------------------------------
// useVerticalTabs syncs classic-top to vertical-left if not vertical
const legacySettings: UserSettings = {
  ...defaultSettings,
  useVerticalTabs: true,
  showTasksWidget: true,
  designProfile: undefined, // uninitialized or legacy
};
const legacyResolved = resolveEffectiveDesign(legacySettings, undefined, false);
assert.equal(legacyResolved.layout.chromeMode, 'vertical-left');
assert.equal(legacyResolved.newTabLayout.tasksWidget.visible, true);

// If designProfile explicitly sets tasksWidget to false, showTasksWidget does not overwrite it
const explicitSettings: UserSettings = {
  ...defaultSettings,
  showTasksWidget: true,
  designProfile: {
    ...defaultSettings.designProfile!,
    newTabLayout: {
      ...defaultSettings.designProfile!.newTabLayout,
      tasksWidget: {
        visible: false,
        placement: 'bottom',
      },
    },
  },
};
const explicitResolved = resolveEffectiveDesign(explicitSettings, undefined, false);
assert.equal(explicitResolved.newTabLayout.tasksWidget.visible, false);

// ---------------------------------------------------------------------------
// 4. Accent Color Mapping
// ---------------------------------------------------------------------------
const emeraldSettings: UserSettings = {
  ...defaultSettings,
  accentColor: 'emerald',
};
assert.equal(resolveEffectiveDesign(emeraldSettings).effectiveAccentHex, '#10b981');

const customAccentSettings: UserSettings = {
  ...defaultSettings,
  accentColor: 'custom',
  customAccentColor: '#ff00aa',
};
assert.equal(resolveEffectiveDesign(customAccentSettings).effectiveAccentHex, '#ff00aa');

const invalidCustomAccentSettings: UserSettings = {
  ...defaultSettings,
  accentColor: 'custom',
  customAccentColor: 'invalid-not-hex',
};
assert.equal(resolveEffectiveDesign(invalidCustomAccentSettings).effectiveAccentHex, '#3b82f6');

// ---------------------------------------------------------------------------
// 5. Incognito Isolation & Surface Guard
// ---------------------------------------------------------------------------
const incognitoResolved = resolveEffectiveDesign(baseSettings, 'work', true);
assert.equal(incognitoResolved.isIncognitoLocked, true);
// Preserves layout from workspace override
assert.equal(incognitoResolved.layout.chromeMode, 'vertical-right');
assert.equal(incognitoResolved.layout.sidebarWidth, 310);
// Overrides chrome surfaces with incognito high-contrast dark guard values
assert.equal(incognitoResolved.surfaces.frame?.bg, '#090710');
assert.equal(incognitoResolved.surfaces.frame?.opacity, 1);
assert.equal(incognitoResolved.surfaces.toolbar?.bg, '#110e1c');
assert.equal(incognitoResolved.surfaces.toolbar?.textColor, '#f1f5f9');
assert.equal(incognitoResolved.surfaces.sidebar?.bg, '#0c0a14');
assert.equal(incognitoResolved.surfaces.sidebar?.textColor, '#e2e8f0');

// ---------------------------------------------------------------------------
// 6. designToCssVariables Generation
// ---------------------------------------------------------------------------
const varsDark = designToCssVariables(workResolved, true);
assert.equal(varsDark['--nova-toolbar-bg'], '#112233');
assert.equal(varsDark['--nova-toolbar-radius'], '14px');
assert.equal(varsDark['--nova-toolbar-blur'], '12px');
assert.equal(varsDark['--nova-sidebar-width'], '310px');
assert.ok(varsDark['--nova-font-ui'].includes('Geist'));
assert.equal(varsDark['--nova-ui-scale'], '1.1');
assert.equal(varsDark['--nova-icon-scale'], '1.05');
assert.equal(varsDark['--nova-toolbar-height'], '50px'); // comfortable density
assert.equal(varsDark['--nova-tab-height'], '42px');

// Legacy variable synchronization
assert.equal(varsDark['--nova-toolbar-bg'], varsDark['--nova-toolbar-bg']);
assert.equal(varsDark['--nova-sidebar-bg'], varsDark['--nova-sidebar-bg']);
assert.equal(varsDark['--nova-header-bg'], varsDark['--nova-tabBar-bg']);
assert.equal(varsDark['--nova-active-tab-bg'], varsDark['--nova-activeTab-bg']);
assert.equal(varsDark['--nova-card-bg'], varsDark['--nova-popovers-bg']);

// Opacity color-mix formula test
const translucentDesign: ResolvedBrowserDesign = {
  ...workResolved,
  surfaces: {
    ...workResolved.surfaces,
    toolbar: {
      bg: '#ff5500',
      opacity: 0.75,
      radius: 8,
      shadow: 'glow',
    },
  },
};
const varsTranslucent = designToCssVariables(translucentDesign, true);
assert.equal(
  varsTranslucent['--nova-toolbar-bg'],
  'color-mix(in srgb, #ff5500 75%, transparent)'
);
assert.equal(
  varsTranslucent['--nova-toolbar-shadow'],
  '0 0 18px color-mix(in srgb, var(--nova-accent, #3b82f6) 28%, transparent)'
);

// Light mode fallback check
const varsLight = designToCssVariables(defaultResolved, false);
assert.equal(varsLight['--nova-toolbar-bg'], '#ffffff');
assert.equal(varsLight['--nova-toolbar-text'], '#0f172a');

console.log('design_engine.test.ts passed');
