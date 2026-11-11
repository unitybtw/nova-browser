import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
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
import { sanitizeCustomCss } from '../src/utils/designSecurity';

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

// Sidebar & typography tokens + baseVars fallback preservation
const sidebarDarkVars = designToCssVariables(workResolved, true);
assert.ok(sidebarDarkVars['--nova-sidebar-bg']);
assert.ok(sidebarDarkVars['--nova-sidebar-text']);
assert.ok(sidebarDarkVars['--nova-sidebar-border']);
assert.ok(sidebarDarkVars['--nova-font-ui']);

const basePaletteVars = {
  '--nova-frame-bg': '#101820',
  '--nova-header-bg': '#141e28',
  '--nova-toolbar-bg': '#1b2836',
  '--nova-sidebar-bg': '#121a24',
  '--nova-active-tab-bg': '#223344',
  '--nova-border-subtle': 'rgba(12, 34, 56, 0.45)',
  '--nova-card-bg': '#1f2d3d',
};
const mergedBaseVars = designToCssVariables(defaultResolved, true, basePaletteVars);
assert.equal(mergedBaseVars['--nova-frame-bg'], '#101820');
assert.equal(mergedBaseVars['--nova-tabBar-bg'], '#141e28');
assert.equal(mergedBaseVars['--nova-header-bg'], '#141e28');
assert.equal(mergedBaseVars['--nova-toolbar-bg'], '#1b2836');
assert.equal(mergedBaseVars['--nova-sidebar-bg'], '#121a24');
assert.equal(mergedBaseVars['--nova-activeTab-bg'], '#223344');
assert.equal(mergedBaseVars['--nova-active-tab-bg'], '#223344');
assert.equal(mergedBaseVars['--nova-sidebar-border'], 'rgba(12, 34, 56, 0.45)');
assert.equal(mergedBaseVars['--nova-card-bg'], '#1f2d3d');

// ---------------------------------------------------------------------------
// 7. useThemeLanguage DOM Token Injection, Custom CSS & Window Material
// ---------------------------------------------------------------------------
{
  const repoRoot = fs.existsSync(path.resolve(process.cwd(), 'src/hooks/useThemeLanguage.ts'))
    ? process.cwd()
    : path.resolve(__dirname, '..');

  interface MockStyleNode {
    id: string;
    textContent: string;
    parentNode: MockHead | null;
    get nextSibling(): MockStyleNode | null;
  }
  interface MockHead {
    children: MockStyleNode[];
    appendChild(el: MockStyleNode): MockStyleNode;
    insertBefore(el: MockStyleNode, ref: MockStyleNode | null): MockStyleNode;
  }

  const head: MockHead = {
    children: [],
    appendChild(el) {
      const prevIdx = this.children.indexOf(el);
      if (prevIdx !== -1) this.children.splice(prevIdx, 1);
      el.parentNode = this;
      this.children.push(el);
      return el;
    },
    insertBefore(el, ref) {
      const prevIdx = this.children.indexOf(el);
      if (prevIdx !== -1) this.children.splice(prevIdx, 1);
      el.parentNode = this;
      if (!ref) {
        this.children.push(el);
        return el;
      }
      const refIdx = this.children.indexOf(ref);
      if (refIdx === -1) {
        this.children.push(el);
      } else {
        this.children.splice(refIdx, 0, el);
      }
      return el;
    },
  };

  const makeStyleNode = (): MockStyleNode => ({
    id: '',
    textContent: '',
    parentNode: null,
    get nextSibling() {
      if (!this.parentNode) return null;
      const idx = this.parentNode.children.indexOf(this);
      return idx >= 0 && idx + 1 < this.parentNode.children.length
        ? this.parentNode.children[idx + 1]
        : null;
    },
  });

  const classes = new Set<string>();
  const rootProps = new Map<string, string>();
  const mockDocument = {
    head,
    documentElement: {
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
        contains: (c: string) => classes.has(c),
      },
      style: {
        setProperty: (k: string, v: string) => rootProps.set(k, v),
      },
    },
    getElementById: (id: string) => head.children.find((c) => c.id === id) ?? null,
    createElement: (tag: string) => {
      assert.equal(tag, 'style');
      return makeStyleNode();
    },
  };

  const themeCalls: string[] = [];
  const materialCalls: string[] = [];
  const mockElectronAPI = {
    setTheme: (theme: string) => themeCalls.push(theme),
    setWindowMaterial: (mat: string) => materialCalls.push(mat),
    setAppLanguage: async () => {},
  };

  const cells: any[] = [];
  let cursor = 0;
  const pendingEffects: Array<() => void> = [];

  const hookExports: any = {};
  const hookSource = fs.readFileSync(path.join(repoRoot, 'src/hooks/useThemeLanguage.ts'), 'utf8');
  vm.runInNewContext(
    ts.transpileModule(hookSource, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    {
      exports: hookExports,
      module: { exports: hookExports },
      document: mockDocument,
      window: {
        electronAPI: mockElectronAPI,
        matchMedia: () => ({
          matches: true,
          addEventListener: () => {},
          removeEventListener: () => {},
        }),
      },
      require: (id: string) => {
        if (id === 'react') {
          return {
            useRef: (initial: unknown) => {
              const idx = cursor++;
              if (!(idx in cells)) cells[idx] = { current: initial };
              return cells[idx];
            },
            useEffect: (fn: () => any, deps: unknown[]) => {
              const idx = cursor++;
              const prev = cells[idx];
              if (!prev || deps.some((d, i) => !Object.is(d, prev.deps[i]))) {
                const slot: any = { deps };
                cells[idx] = slot;
                pendingEffects.push(() => {
                  prev?.cleanup?.();
                  slot.cleanup = fn();
                });
              }
            },
          };
        }
        if (id === '../services/i18n') return { setLanguage: () => {} };
        if (id === '../utils/electronBridge') return { getElectronAPI: () => mockElectronAPI };
        if (id === '../utils/designEngine') return { resolveEffectiveDesign, designToCssVariables };
        if (id === '../utils/designSecurity') return { sanitizeCustomCss };
        throw new Error(`Unexpected import in useThemeLanguage: ${id}`);
      },
    }
  );

  const runHook = (...args: any[]) => {
    cursor = 0;
    hookExports.useThemeLanguage(...args);
    while (pendingEffects.length > 0) {
      pendingEffects.shift()!();
    }
  };

  // Backward compatibility: legacy 1-arg `{ settings }` form still works
  runHook({ settings: baseSettings });
  const accentStyle = mockDocument.getElementById('nova-accent-style');
  const customStyle = mockDocument.getElementById('nova-custom-user-style');
  assert.ok(accentStyle, '#nova-accent-style must be created');
  assert.ok(customStyle, '#nova-custom-user-style must be created');
  assert.equal(accentStyle!.nextSibling, customStyle, '#nova-custom-user-style must sit right after #nova-accent-style');
  assert.ok(accentStyle!.textContent.includes('--nova-sidebar-bg'), 'accent style must include --nova-sidebar-bg');
  assert.ok(accentStyle!.textContent.includes('--nova-font-ui'), 'accent style must include --nova-font-ui');
  assert.ok(
    accentStyle!.textContent.includes('#nova-browser-chrome, .nova-vertical-sidebar, .nova-chrome-surface'),
    'accent style must scope font-family to chrome surfaces without touching webviews'
  );
  assert.equal(customStyle!.textContent, '', 'disabled customCss must yield empty #nova-custom-user-style');
  assert.deepEqual(materialCalls, ['opaque']);
  assert.equal(rootProps.get('--nova-sidebar-width'), '290px');

  // Direct 1-arg `UserSettings` form without 2nd options argument also works
  runHook(baseSettings);
  assert.equal(rootProps.get('--nova-sidebar-width'), '290px');
  assert.equal(rootProps.get('--nova-toolbar-bg'), '#1e1b2e');

  // 2-arg form + workspace override + custom CSS sanitization + windowMaterial change
  const styledSettings: UserSettings = {
    ...baseSettings,
    designProfile: {
      ...baseSettings.designProfile!,
      effects: { windowMaterial: 'glass-vibrancy', reduceChromeMotion: false },
      customCss: {
        enabled: true,
        css: '@import url(https://evil.test/x.css); .nova-vertical-sidebar { opacity: 0.9; }',
      },
    },
  };
  runHook(styledSettings, { activeWorkspaceId: 'work', isIncognito: false });
  assert.equal(rootProps.get('--nova-toolbar-bg'), '#112233');
  assert.equal(rootProps.get('--nova-sidebar-width'), '310px');
  assert.ok(customStyle!.textContent.includes('.nova-vertical-sidebar { opacity: 0.9; }'));
  assert.ok(!customStyle!.textContent.includes('@import'), 'injected custom CSS must be sanitized');
  assert.deepEqual(materialCalls, ['opaque', 'glass-vibrancy']);

  // Calling again with same windowMaterial must not spam setWindowMaterial
  runHook(styledSettings, { activeWorkspaceId: 'work', isIncognito: false });
  assert.deepEqual(materialCalls, ['opaque', 'glass-vibrancy']);

  // Incognito lock overrides chrome surfaces
  runHook(styledSettings, { activeWorkspaceId: 'work', isIncognito: true });
  assert.equal(rootProps.get('--nova-frame-bg'), '#090710');
  assert.equal(rootProps.get('--nova-toolbar-bg'), '#110e1c');
  assert.equal(rootProps.get('--nova-sidebar-bg'), '#0c0a14');

  // Draft profile override previews live changes and disabling customCss clears #nova-custom-user-style
  runHook(styledSettings, {
    activeWorkspaceId: 'work',
    isIncognito: false,
    draftProfileOverride: {
      ...styledSettings.designProfile!,
      surfaces: { toolbar: { bg: '#abcdef' } },
      customCss: { enabled: false, css: '.nova-vertical-sidebar { color: red; }' },
    },
  });
  assert.equal(rootProps.get('--nova-toolbar-bg'), '#abcdef');
  assert.equal(customStyle!.textContent, '', 'disabling customCss must clear #nova-custom-user-style');

  // Verify src/index.css unifies .nova-vertical-sidebar with --nova-* variables
  const indexCss = fs.readFileSync(path.join(repoRoot, 'src/index.css'), 'utf8');
  assert.ok(indexCss.includes('--sidebar-ink: var(--nova-sidebar-text,'));
  assert.ok(indexCss.includes('--sidebar-muted: var(--nova-sidebar-muted,'));
  assert.ok(indexCss.includes('--sidebar-hover: var(--nova-inactive-tab-hover-bg,'));
  assert.ok(indexCss.includes('--sidebar-selected: var(--nova-activeTab-bg,'));
  assert.ok(indexCss.includes('--sidebar-surface: var(--nova-sidebar-bg,'));
  assert.ok(indexCss.includes('--sidebar-border: var(--nova-sidebar-border,'));
  assert.ok(indexCss.includes('font-family: var(--nova-font-ui, inherit);'));
  assert.ok(indexCss.includes('font-size: calc(13px * var(--nova-ui-scale, 1));'));
  assert.ok(indexCss.includes('outline: 2px solid var(--nova-accent, #74876a);'));
}

console.log('design_engine.test.ts passed');
