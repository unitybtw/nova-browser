// Run standalone with --external:jsdom (owns JSDOM globals for its lifetime).
import { createRequire } from 'node:module';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import type { BrowserDesignProfile, UserSettings } from '../src/types/browser';
import { defaultSettings } from '../src/types/browser';
import { createDefaultDesignProfile } from '../src/utils/designDefaults';
import { STARTER_DESIGN_TEMPLATES } from '../src/utils/designTemplates';
import {
  CustomizeProvider,
  useCustomize,
} from '../src/components/customization/CustomizeContext';
import { CustomizeTopBanner } from '../src/components/customization/CustomizeTopBanner';
import { DesignStudioDrawer } from '../src/components/customization/DesignStudioDrawer';
import { AppearanceSection } from '../src/components/settings/AppearanceSection';

const require = createRequire(join(process.cwd(), 'noop.js'));
const { JSDOM } = require('jsdom') as typeof import('jsdom');

async function main() {
  console.log('\n--- Design Studio & Customization Integration Test Suite ---');

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'https://nova.test/',
    pretendToBeVisual: true,
  });

  const w = dom.window;
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'localStorage', 'MutationObserver', 'CustomEvent'] as const) {
    Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? w : (w as any)[key] });
  }
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: w.requestAnimationFrame.bind(w),
    cancelAnimationFrame: w.cancelAnimationFrame.bind(w),
    getComputedStyle: w.getComputedStyle.bind(w),
  });

  class TestPort {
    peer: TestPort | null = null;
    onmessage: ((event: { data: unknown }) => void) | null = null;
    postMessage(data: unknown) { const target = this.peer; setImmediate(() => target?.onmessage?.({ data })); }
    close() { this.peer = null; this.onmessage = null; }
    start() {}
  }
  Object.defineProperty(globalThis, 'MessageChannel', { configurable: true, value: class {
    port1 = new TestPort(); port2 = new TestPort();
    constructor() { this.port1.peer = this.port2; this.port2.peer = this.port1; }
  }});

  const React = await import('react');
  const { createRoot } = await import('react-dom/client');

  const rootContainer = dom.window.document.getElementById('root')!;
  const root = createRoot(rootContainer);

  // ---------------------------------------------------------------------------
  // 1. CustomizeContext Logic & State Lifecycle Test
  // ---------------------------------------------------------------------------
  console.log('Testing CustomizeContext state management, undo, scope, templates & commit/discard...');

  let currentSettings: UserSettings = {
    ...defaultSettings,
    useVerticalTabs: false,
    showTasksWidget: true,
    designProfile: createDefaultDesignProfile(),
  };

  let capturedState: ReturnType<typeof useCustomize> | null = null;

  function StateInspector() {
    capturedState = useCustomize();
    return React.createElement('div', { 'data-testid': 'state-inspector' }, 'ready');
  }

  await React.act(async () => {
    root.render(
      React.createElement(
        CustomizeProvider,
        {
          settings: currentSettings,
          activeWorkspaceId: 'work-1',
          workspaces: [{ id: 'work-1', name: 'Work Space' } as any],
          onUpdateSettings: (newSettings: Partial<UserSettings>) => {
            currentSettings = { ...currentSettings, ...newSettings };
          },
        },
        React.createElement(StateInspector)
      )
    );
  });

  assert.ok(capturedState, 'CustomizeContext state must be initialized');
  assert.strictEqual((capturedState as any).isCustomizeMode, false, 'Default isCustomizeMode must be false');
  assert.strictEqual((capturedState as any).canUndo, false, 'Default canUndo must be false');

  // Open Customize Mode (Global scope)
  await React.act(async () => {
    capturedState!.openCustomizeMode('global');
  });
  assert.strictEqual(capturedState!.isCustomizeMode, true, 'isCustomizeMode must be true after open');
  assert.strictEqual(capturedState!.editingScope, 'global', 'editingScope must be global');

  // Update draft profile (e.g. change sidebar width)
  const initialWidth = capturedState!.draftProfile.layout.sidebarWidth;
  await React.act(async () => {
    capturedState!.updateDraft((prev: BrowserDesignProfile) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sidebarWidth: 320,
      },
    }));
  });

  assert.strictEqual(capturedState!.draftProfile.layout.sidebarWidth, 320, 'Draft width updated');
  assert.strictEqual(capturedState!.canUndo, true, 'canUndo must be true after draft edit');

  // Undo
  await React.act(async () => {
    capturedState!.undo();
  });
  assert.strictEqual(
    capturedState!.draftProfile.layout.sidebarWidth,
    initialWidth,
    'Undo must restore previous draft state'
  );
  assert.strictEqual(capturedState!.canUndo, false, 'canUndo must be false after undoing only change');

  // Apply Starter Template
  await React.act(async () => {
    capturedState!.applyStarterTemplate('zen-compact');
  });
  assert.strictEqual(
    capturedState!.draftProfile.meta.baseTemplateId,
    'zen-compact',
    'Starter template must be applied to draft'
  );
  assert.strictEqual(capturedState!.canUndo, true, 'Applying starter template must push to undo stack');

  // Discard exits without modifying settings
  await React.act(async () => {
    capturedState!.discard();
  });
  assert.strictEqual(capturedState!.isCustomizeMode, false, 'Discard must exit customize mode');
  assert.notStrictEqual(
    currentSettings.designProfile?.meta.baseTemplateId,
    'zen-compact',
    'Discard must not persist changes to settings'
  );

  // Open again and Commit
  await React.act(async () => {
    capturedState!.openCustomizeMode('global');
  });
  await React.act(async () => {
    capturedState!.updateDraft((prev: BrowserDesignProfile) => ({
      ...prev,
      layout: {
        ...prev.layout,
        chromeMode: 'vertical-left',
      },
      newTabLayout: {
        ...prev.newTabLayout,
        tasksWidget: {
          ...prev.newTabLayout.tasksWidget,
          visible: false,
        },
      },
    }));
  });

  await React.act(async () => {
    capturedState!.commit();
  });

  assert.strictEqual(capturedState!.isCustomizeMode, false, 'Commit must exit customize mode');
  assert.strictEqual(
    currentSettings.designProfile?.layout.chromeMode,
    'vertical-left',
    'Commit must persist draft to settings.designProfile'
  );
  assert.strictEqual(
    currentSettings.useVerticalTabs,
    true,
    'Commit must sync legacy useVerticalTabs=true for vertical-left'
  );
  assert.strictEqual(
    currentSettings.showTasksWidget,
    false,
    'Commit must sync legacy showTasksWidget=false'
  );

  // Test Theme Pack Export & Import
  await React.act(async () => {
    capturedState!.openCustomizeMode('global');
  });
  const exportedJson = capturedState!.exportPack();
  assert.ok(typeof exportedJson === 'string', 'exportPack must return serialized JSON string');

  const packObj = JSON.parse(exportedJson);
  assert.strictEqual(packObj.schemaVersion, 1, 'Theme pack schemaVersion must be 1');

  await React.act(async () => {
    const importResult = capturedState!.importPack(exportedJson);
    assert.strictEqual(importResult.success, true, 'Valid theme pack must import successfully');
  });

  await React.act(async () => {
    const badImportResult = capturedState!.importPack('{ invalid json');
    assert.strictEqual(badImportResult.success, false, 'Malformed json must return error');
    assert.ok(badImportResult.error, 'Error message must be present');
  });

  await React.act(async () => {
    capturedState!.discard();
  });

  console.log('[PASS] CustomizeContext state, undo, template, commit, export & import verified');

  // ---------------------------------------------------------------------------
  // 2. CustomizeTopBanner Component Verification
  // ---------------------------------------------------------------------------
  console.log('Testing CustomizeTopBanner rendered controls and click actions...');

  await React.act(async () => {
    root.render(
      React.createElement(
        CustomizeProvider,
        {
          settings: currentSettings,
          activeWorkspaceId: 'work-1',
          workspaces: [{ id: 'work-1', name: 'Work Space' } as any],
          onUpdateSettings: (newSettings: Partial<UserSettings>) => {
            currentSettings = { ...currentSettings, ...newSettings };
          },
        },
        React.createElement(StateInspector),
        React.createElement(CustomizeTopBanner)
      )
    );
  });

  // Not visible when customize mode is closed
  let banner = dom.window.document.querySelector('[data-customize-banner="true"]');
  assert.strictEqual(banner, null, 'Banner must not render when isCustomizeMode is false');

  // Open customize mode and re-check banner
  await React.act(async () => {
    capturedState!.openCustomizeMode('global');
  });

  banner = dom.window.document.querySelector('[data-customize-banner="true"]');
  assert.ok(banner, 'Banner must render when isCustomizeMode is true');

  // Check banner buttons: Undo, Reset, Cancel, Save
  const undoBtn = banner!.querySelector('[data-action="undo"]') as HTMLButtonElement | null;
  const resetBtn = banner!.querySelector('[data-action="reset"]') as HTMLButtonElement | null;
  const cancelBtn = banner!.querySelector('[data-action="cancel"]') as HTMLButtonElement | null;
  const saveBtn = banner!.querySelector('[data-action="save"]') as HTMLButtonElement | null;

  assert.ok(undoBtn, 'Undo button must exist in banner');
  assert.ok(resetBtn, 'Reset button must exist in banner');
  assert.ok(cancelBtn, 'Cancel button must exist in banner');
  assert.ok(saveBtn, 'Save & Exit button must exist in banner');

  console.log('[PASS] CustomizeTopBanner rendered controls verified');

  // ---------------------------------------------------------------------------
  // 3. DesignStudioDrawer 5-Tab Component Verification
  // ---------------------------------------------------------------------------
  console.log('Testing DesignStudioDrawer 5 tabs, palette, zones, CSS warning...');

  await React.act(async () => {
    root.render(
      React.createElement(
        CustomizeProvider,
        {
          settings: currentSettings,
          activeWorkspaceId: 'work-1',
          workspaces: [{ id: 'work-1', name: 'Work Space' } as any],
          onUpdateSettings: (newSettings: Partial<UserSettings>) => {
            currentSettings = { ...currentSettings, ...newSettings };
          },
        },
        React.createElement(StateInspector),
        React.createElement(DesignStudioDrawer)
      )
    );
  });

  const drawer = dom.window.document.querySelector('[data-design-studio-drawer="true"]');
  assert.ok(drawer, 'DesignStudioDrawer must render when isCustomizeMode is true');

  // Check 5 tab buttons exist
  const tabButtons = drawer!.querySelectorAll('[data-studio-tab]');
  assert.strictEqual(tabButtons.length, 5, 'Drawer must have 5 tabs');

  // Tab 1: Templates & Packs
  const tabTemplatesBtn = drawer!.querySelector('[data-studio-tab="templates"]') as HTMLButtonElement;
  assert.ok(tabTemplatesBtn, 'Templates tab button must exist');
  await React.act(async () => {
    tabTemplatesBtn.click();
  });

  const templateCards = drawer!.querySelectorAll('[data-template-card]');
  assert.strictEqual(
    templateCards.length,
    STARTER_DESIGN_TEMPLATES.length,
    'All 6 starter templates must be listed'
  );

  // Tab 2: Layout & Toolbar
  const tabLayoutBtn = drawer!.querySelector('[data-studio-tab="layout"]') as HTMLButtonElement;
  assert.ok(tabLayoutBtn, 'Layout tab button must exist');
  await React.act(async () => {
    tabLayoutBtn.click();
  });

  // Check chromeMode cards
  const chromeCards = drawer!.querySelectorAll('[data-chrome-mode]');
  assert.strictEqual(chromeCards.length, 4, '4 chrome mode cards must be rendered');

  // Check sidebarWidth slider
  const widthSlider = drawer!.querySelector('input[type="range"][data-control="sidebarWidth"]');
  assert.ok(widthSlider, 'sidebarWidth slider must exist');

  // Check Palette items with + Add buttons
  const paletteItems = drawer!.querySelectorAll('[data-palette-item]');
  assert.ok(paletteItems.length > 0, 'Palette items must be present');
  const addButtons = drawer!.querySelectorAll('[data-action="add-toolbar-item"]');
  assert.ok(addButtons.length > 0, '+ Add buttons must be present on palette items');

  // Tab 3: Zones & Surfaces
  const tabZonesBtn = drawer!.querySelector('[data-studio-tab="zones"]') as HTMLButtonElement;
  assert.ok(tabZonesBtn, 'Zones tab button must exist');
  await React.act(async () => {
    tabZonesBtn.click();
  });

  const zonePills = drawer!.querySelectorAll('[data-zone-pill]');
  assert.strictEqual(zonePills.length, 9, 'All 9 surface zones must have selection pills');

  // Tab 4: Typography & Effects
  const tabTypoBtn = drawer!.querySelector('[data-studio-tab="typography"]') as HTMLButtonElement;
  assert.ok(tabTypoBtn, 'Typography tab button must exist');
  await React.act(async () => {
    tabTypoBtn.click();
  });

  const fontOptions = drawer!.querySelectorAll('[data-font-option]');
  assert.ok(fontOptions.length >= 6, 'At least 6 font family options must be rendered');

  // Tab 5: New Tab & CSS
  const tabCssBtn = drawer!.querySelector('[data-studio-tab="newtab-css"]') as HTMLButtonElement;
  assert.ok(tabCssBtn, 'NewTab & CSS tab button must exist');
  await React.act(async () => {
    tabCssBtn.click();
  });

  const cssTextarea = drawer!.querySelector('textarea[data-control="custom-css"]') as HTMLTextAreaElement;
  assert.ok(cssTextarea, 'Custom CSS textarea must be rendered');

  console.log('[PASS] DesignStudioDrawer 5 tabs, palette, zones, typography and CSS verified');

  // ---------------------------------------------------------------------------
  // 4. AppearanceSection Launch Button & Sync Verification
  // ---------------------------------------------------------------------------
  console.log('Testing AppearanceSection "Live Design Studio" launch card & sync...');

  let customEventFired = false;
  dom.window.addEventListener('nova-open-customize-mode', () => {
    customEventFired = true;
  });

  await React.act(async () => {
    root.render(
      React.createElement(AppearanceSection, {
        settings: currentSettings,
        onUpdateSettings: (newSettings: Partial<UserSettings>) => {
          currentSettings = { ...currentSettings, ...newSettings };
        },
      })
    );
  });

  const launchBtn = dom.window.document.querySelector('[data-action="launch-design-studio"]') as HTMLButtonElement;
  assert.ok(launchBtn, 'AppearanceSection must render a Live Design Studio launch button');

  await React.act(async () => {
    launchBtn.click();
  });
  assert.strictEqual(customEventFired, true, 'Clicking launch button must dispatch nova-open-customize-mode event');

  console.log('[PASS] AppearanceSection launch button and event dispatch verified');

  console.log('\n[PASS] ALL Design Studio & Customization Integration tests passed cleanly!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
