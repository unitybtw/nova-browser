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
import {
  DesignStudioDrawer,
  SafeColorTextInput,
} from '../src/components/customization/DesignStudioDrawer';
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

  // Test draftTabStyle & draftTabAnimation undo & resetToDefault support
  await React.act(async () => {
    capturedState!.openCustomizeMode('global');
  });
  const initialTabStyle = capturedState!.draftTabStyle;
  const initialTabAnim = capturedState!.draftTabAnimation;
  await React.act(async () => {
    capturedState!.updateDraftTabStyle('square');
    capturedState!.updateDraftTabAnimation('snappy');
  });
  assert.strictEqual(capturedState!.draftTabStyle, 'square', 'draftTabStyle updates immediately');
  assert.strictEqual(capturedState!.draftTabAnimation, 'snappy', 'draftTabAnimation updates immediately');
  assert.strictEqual(capturedState!.canUndo, true, 'Tab style/animation edits must push undo snapshot');

  await React.act(async () => {
    capturedState!.undo();
  });
  assert.strictEqual(capturedState!.draftTabAnimation, initialTabAnim, 'Undo must revert draftTabAnimation');

  await React.act(async () => {
    capturedState!.undo();
  });
  assert.strictEqual(capturedState!.draftTabStyle, initialTabStyle, 'Second undo must revert draftTabStyle');

  await React.act(async () => {
    capturedState!.updateDraftTabStyle('square');
    capturedState!.updateDraftTabAnimation('none');
  });
  await React.act(async () => {
    capturedState!.resetToDefault();
  });
  assert.strictEqual(capturedState!.draftTabStyle, 'floating', 'resetToDefault must restore floating tabStyle');
  assert.strictEqual(capturedState!.draftTabAnimation, 'chrome', 'resetToDefault must restore chrome tabAnimation');
  await React.act(async () => {
    capturedState!.discard();
  });

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
  // 1b. Draft Isolation, clearWorkspaceOverride & Dual-Scope Session Drafts
  // ---------------------------------------------------------------------------
  console.log('Testing clearWorkspaceOverride draft isolation (discard vs commit) and dual-scope drafts...');

  // Setup saved workspace override
  currentSettings = {
    ...currentSettings,
    workspaceDesigns: {
      'work-1': {
        meta: { name: 'Work-1 Override' },
        layout: {
          chromeMode: 'vertical-right',
          tabBarPosition: 'above-toolbar',
          omniboxMaxWidth: 'balanced',
          showToolbarLabels: false,
          sidebarWidth: 260,
          sidebarSections: {
            favorites: true,
            pinned: true,
            folders: true,
            workspaces: true,
            dockFooter: true,
          },
          toolbarSlots: ['back-forward', 'url-bar'],
        },
      },
    },
  };

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

  // Test Case A: clearWorkspaceOverride() -> discard() preserves original workspace override
  await React.act(async () => {
    capturedState!.openCustomizeMode('workspace');
  });

  assert.strictEqual(capturedState!.editingScope, 'workspace', 'Opened in workspace scope');
  assert.strictEqual(capturedState!.hasActiveWorkspaceOverride, true, 'hasActiveWorkspaceOverride must be true initially');

  await React.act(async () => {
    capturedState!.clearWorkspaceOverride();
  });

  // Verify settings were NOT prematurely updated
  assert.ok(
    currentSettings.workspaceDesigns?.['work-1'],
    'clearWorkspaceOverride must NOT prematurely delete workspaceDesigns from persisted settings'
  );
  assert.strictEqual(
    capturedState!.editingScope,
    'global',
    'clearWorkspaceOverride must cleanly switch scope back to global'
  );
  assert.strictEqual(
    capturedState!.hasActiveWorkspaceOverride,
    false,
    'hasActiveWorkspaceOverride must reflect pending clear'
  );

  // Discard must keep the original workspace override 100% untouched
  await React.act(async () => {
    capturedState!.discard();
  });

  assert.ok(
    currentSettings.workspaceDesigns?.['work-1'],
    'discard() must leave original settings.workspaceDesigns intact after clearWorkspaceOverride'
  );
  assert.strictEqual(
    currentSettings.workspaceDesigns?.['work-1']?.layout?.chromeMode,
    'vertical-right',
    'Original workspace design remains unchanged'
  );

  // Test Case B: clearWorkspaceOverride() -> commit() permanently deletes without resurrection
  await React.act(async () => {
    capturedState!.openCustomizeMode('workspace');
  });

  await React.act(async () => {
    capturedState!.clearWorkspaceOverride();
  });

  // Also make a global edit while in global scope
  await React.act(async () => {
    capturedState!.updateDraft((prev: BrowserDesignProfile) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sidebarWidth: 295,
      },
    }));
  });

  await React.act(async () => {
    capturedState!.commit();
  });

  assert.strictEqual(
    currentSettings.workspaceDesigns?.['work-1'],
    undefined,
    'commit() must permanently delete cleared workspace override from persisted settings'
  );
  assert.strictEqual(
    currentSettings.designProfile?.layout.sidebarWidth,
    295,
    'commit() must persist global edits made during the same session'
  );

  // Test Case C: Switching scopes (global -> edit -> workspace -> edit -> global) retains both uncommitted edits
  await React.act(async () => {
    capturedState!.openCustomizeMode('global');
  });

  // Edit in global scope
  await React.act(async () => {
    capturedState!.updateDraft((prev: BrowserDesignProfile) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sidebarWidth: 335,
      },
    }));
  });
  assert.strictEqual(capturedState!.draftProfile.layout.sidebarWidth, 335, 'Global edit applied');

  // Switch to workspace scope
  await React.act(async () => {
    capturedState!.switchScope('workspace');
  });
  assert.strictEqual(capturedState!.editingScope, 'workspace', 'Switched to workspace scope');

  // Edit in workspace scope
  await React.act(async () => {
    capturedState!.updateDraft((prev: BrowserDesignProfile) => ({
      ...prev,
      layout: {
        ...prev.layout,
        chromeMode: 'compact-single-row',
      },
    }));
  });
  assert.strictEqual(
    capturedState!.draftProfile.layout.chromeMode,
    'compact-single-row',
    'Workspace edit applied'
  );

  // Switch back to global scope: global edit MUST be retained!
  await React.act(async () => {
    capturedState!.switchScope('global');
  });
  assert.strictEqual(capturedState!.editingScope, 'global', 'Switched back to global scope');
  assert.strictEqual(
    capturedState!.draftProfile.layout.sidebarWidth,
    335,
    'Global uncommitted edit must be retained after switching back from workspace scope'
  );

  // Switch back to workspace scope: workspace edit MUST be retained!
  await React.act(async () => {
    capturedState!.switchScope('workspace');
  });
  assert.strictEqual(
    capturedState!.draftProfile.layout.chromeMode,
    'compact-single-row',
    'Workspace uncommitted edit must be retained after returning from global scope'
  );

  // Commit atomically saves both global profile and workspace override
  await React.act(async () => {
    capturedState!.commit();
  });

  assert.strictEqual(
    currentSettings.designProfile?.layout.sidebarWidth,
    335,
    'commit() persists uncommitted global edit'
  );
  assert.strictEqual(
    currentSettings.workspaceDesigns?.['work-1']?.layout?.chromeMode,
    'compact-single-row',
    'commit() persists uncommitted workspace edit'
  );

  console.log('[PASS] clearWorkspaceOverride draft isolation and dual-scope session drafts verified');

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
  assert.ok(banner!.className.includes('bottom-4'), 'Banner must anchor at bottom-center to avoid occluding TopBar');
  assert.ok(!banner!.className.includes('top-2'), 'Banner must not float at top-2 over TopBar');

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
  assert.ok(
    drawer!.className.includes('top-[94px]') || drawer!.className.includes('top-14'),
    'DesignStudioDrawer must start below TopBar controls'
  );
  assert.ok(
    drawer!.className.includes('bottom-[72px]'),
    'DesignStudioDrawer must leave bottom clearance for CustomizeTopBanner'
  );
  assert.ok(
    drawer!.className.includes('slide-in-from-right-4'),
    'DesignStudioDrawer must use explicit Tailwind slide-in class'
  );

  // Check 4 tab buttons exist (Themes, Layout, Style, New Tab)
  const tabButtons = drawer!.querySelectorAll('[data-studio-tab]');
  assert.strictEqual(tabButtons.length, 4, 'Drawer must have 4 tabs');

  // Tab 1: Themes
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

  // Check Active Toolbar Items manager & Move Down + DnD reordering
  const activeToolbarList = drawer!.querySelector('[data-active-toolbar-list="true"]');
  assert.ok(activeToolbarList, 'Active Toolbar Items manager list must render in Tab 2');
  const activeSlotRows = activeToolbarList!.querySelectorAll('[data-active-slot-id]');
  assert.ok(activeSlotRows.length >= 2, 'Active toolbar slots must be manageable inside Tab 2');
  const firstSlotId = activeSlotRows[0].getAttribute('data-active-slot-id')!;
  const secondSlotId = activeSlotRows[1].getAttribute('data-active-slot-id')!;
  const moveDownBtn = activeSlotRows[0].querySelector('[data-action="move-slot-down"]') as HTMLButtonElement | null;
  assert.ok(moveDownBtn, 'Active toolbar slot must expose move-down reorder button');
  await React.act(async () => {
    moveDownBtn!.click();
  });
  assert.strictEqual(
    capturedState!.draftProfile.layout.toolbarItems[1].id,
    firstSlotId,
    'Clicking Move Down in Active Toolbar list must move slot from index 0 to 1'
  );

  // Verify drag-and-drop reordering on Active Toolbar rows moves item back to index 0
  const reorderedRows = activeToolbarList!.querySelectorAll('[data-active-slot-id]');
  const draggedRow = Array.from(reorderedRows).find((el) => el.getAttribute('data-active-slot-id') === firstSlotId)!;
  const targetRow = Array.from(reorderedRows).find((el) => el.getAttribute('data-active-slot-id') === secondSlotId)!;
  const dispatchDndEvent = async (target: Element, type: string, data: Record<string, string>) => {
    const ev = new dom.window.Event(type, { bubbles: true, cancelable: true }) as any;
    ev.dataTransfer = {
      effectAllowed: 'copyMove',
      dropEffect: 'move',
      types: Object.keys(data),
      setData: (k: string, v: string) => { data[k] = v; },
      getData: (k: string) => data[k] || '',
    };
    await React.act(async () => {
      target.dispatchEvent(ev);
    });
  };
  const dragData: Record<string, string> = {};
  await dispatchDndEvent(draggedRow, 'dragstart', dragData);
  await dispatchDndEvent(targetRow, 'drop', dragData);
  assert.strictEqual(
    capturedState!.draftProfile.layout.toolbarItems[0].id,
    firstSlotId,
    'Dragging row back onto first position in Active Toolbar list must reorder slots'
  );

  // Verify Add Controls Palette (starts open by default, collapsible) & + Add / palette->list drop
  const paletteToggleBtn = Array.from(drawer!.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Add Controls Palette')
  ) as HTMLButtonElement | undefined;
  assert.ok(paletteToggleBtn, 'Add Controls Palette toggle must exist in Tab 2');
  if (drawer!.querySelectorAll('[data-palette-item]').length === 0) {
    await React.act(async () => {
      paletteToggleBtn!.click();
    });
  }

  const paletteItems = drawer!.querySelectorAll('[data-palette-item]');
  assert.ok(paletteItems.length > 0, 'Palette items must be present');
  const addButtons = drawer!.querySelectorAll('[data-action="add-toolbar-item"]');
  assert.ok(addButtons.length > 0, '+ Add buttons must be present on palette items');

  // Tab 3: Style (Quick Surface Presets, Typography, Density + Collapsible Advanced Surface Inspector)
  const tabZonesBtn = drawer!.querySelector('[data-studio-tab="zones"]') as HTMLButtonElement;
  assert.ok(tabZonesBtn, 'Style (zones) tab button must exist');
  await React.act(async () => {
    tabZonesBtn.click();
  });

  const surfacePresets = drawer!.querySelectorAll('[data-surface-preset]');
  assert.strictEqual(surfacePresets.length, 4, 'All 4 quick surface presets must be rendered in Style tab');
  assert.ok(
    drawer!.className.includes('bg-white/95') && drawer!.className.includes('dark:bg-slate-900/95'),
    'DesignStudioDrawer must adapt cleanly to both light and dark themes'
  );

  // Verify Frosted Glass preset adapts contrast to Light vs Dark theme
  const frostedBtn = drawer!.querySelector('[data-surface-preset="frosted-glass"]') as HTMLButtonElement;
  dom.window.document.documentElement.classList.remove('dark');
  await React.act(async () => {
    frostedBtn.click();
  });
  assert.strictEqual(
    capturedState!.draftProfile.surfaces.toolbar?.textColor,
    '#0f172a',
    'Frosted Glass in Light Mode must apply dark legible textColor'
  );
  dom.window.document.documentElement.classList.add('dark');
  await React.act(async () => {
    frostedBtn.click();
  });
  assert.strictEqual(
    capturedState!.draftProfile.surfaces.toolbar?.textColor,
    '#f8fafc',
    'Frosted Glass in Dark Mode must apply light legible textColor'
  );
  dom.window.document.documentElement.classList.remove('dark');

  const fontOptions = drawer!.querySelectorAll('[data-font-option]');
  assert.ok(fontOptions.length >= 6, 'At least 6 font family options must be rendered in Style tab');

  // Expand Advanced Surface Inspector accordion to verify all 9 surface zone pills
  const toggleAdvancedSurfacesBtn = drawer!.querySelector(
    '[data-action="toggle-advanced-surfaces"]'
  ) as HTMLButtonElement | null;
  assert.ok(toggleAdvancedSurfacesBtn, 'Advanced Surface Inspector toggle must exist in Style tab');
  await React.act(async () => {
    toggleAdvancedSurfacesBtn!.click();
  });

  const zonePills = drawer!.querySelectorAll('[data-zone-pill]');
  assert.strictEqual(zonePills.length, 9, 'All 9 surface zones must have selection pills when expanded');

  // Tab 4: New Tab (Widgets + Collapsible Advanced Custom CSS)
  const tabCssBtn = drawer!.querySelector('[data-studio-tab="newtab-css"]') as HTMLButtonElement;
  assert.ok(tabCssBtn, 'New Tab tab button must exist');
  await React.act(async () => {
    tabCssBtn.click();
  });

  // Verify Clock align selector in Tab 4
  const clockAlignSelect = drawer!.querySelector('[data-testid="clock-align-select"]') as HTMLSelectElement | null;
  assert.ok(clockAlignSelect, 'Clock align select must be rendered in Tab 4');
  await React.act(async () => {
    clockAlignSelect!.value = 'left';
    clockAlignSelect!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
  assert.strictEqual(
    capturedState!.draftProfile.newTabLayout.clock.align,
    'left',
    'Clock align must be updated to left'
  );

  // Expand Advanced: Custom CSS accordion
  const toggleAdvancedCssBtn = drawer!.querySelector(
    '[data-action="toggle-advanced-css"]'
  ) as HTMLButtonElement | null;
  assert.ok(toggleAdvancedCssBtn, 'Advanced Custom CSS toggle must exist in New Tab tab');
  await React.act(async () => {
    toggleAdvancedCssBtn!.click();
  });

  const cssTextarea = drawer!.querySelector('textarea[data-control="custom-css"]') as HTMLTextAreaElement;
  assert.ok(cssTextarea, 'Custom CSS textarea must be rendered when Advanced Custom CSS is expanded');

  console.log('[PASS] DesignStudioDrawer 4 tabs, DnD active list, quick presets, advanced accordions, typography & New Tab verified');

  // ---------------------------------------------------------------------------
  // 3b. SafeColorTextInput Incremental Typing Verification
  // ---------------------------------------------------------------------------
  console.log('Testing SafeColorTextInput incremental character-by-character typing...');
  let latestColorValue: string | undefined = undefined;

  function ColorInputHarness() {
    const [color, setColor] = React.useState<string | undefined>(undefined);
    return React.createElement(SafeColorTextInput, {
      value: color,
      placeholder: '#1e293b',
      onChange: (val: string | undefined) => {
        latestColorValue = val;
        setColor(val);
      },
      'data-testid': 'test-color-input',
    });
  }

  await React.act(async () => {
    root.render(React.createElement(ColorInputHarness));
  });

  const colorInput = dom.window.document.querySelector('input[data-testid="test-color-input"]') as HTMLInputElement;
  assert.ok(colorInput, 'SafeColorTextInput must render input element');

  // Incrementally type '#123456' character by character
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    'value'
  )?.set;

  const typedSequence = ['#', '#1', '#12', '#12345', '#123456'];
  for (const partial of typedSequence) {
    await React.act(async () => {
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(colorInput, partial);
      } else {
        colorInput.value = partial;
      }
      colorInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      colorInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    });
    // Check that local input value is retained without resetting
    assert.strictEqual(colorInput.value, partial, `Input must retain partial string "${partial}"`);
    if (partial !== '#123456') {
      assert.strictEqual(
        colorInput.getAttribute('aria-invalid'),
        'true',
        `Incomplete string "${partial}" should mark aria-invalid="true"`
      );
    } else {
      assert.strictEqual(
        colorInput.getAttribute('aria-invalid'),
        'false',
        `Valid string "${partial}" should mark aria-invalid="false"`
      );
      assert.strictEqual(latestColorValue, '#123456', 'onChange must be called with valid color string');
    }
  }

  // Test blur with invalid value restores previous valid value
  await React.act(async () => {
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(colorInput, '#invalid');
    } else {
      colorInput.value = '#invalid';
    }
    colorInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    colorInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    colorInput.dispatchEvent(new dom.window.FocusEvent('focusout', { bubbles: true }));
    colorInput.dispatchEvent(new dom.window.FocusEvent('blur', { bubbles: false }));
  });
  assert.strictEqual(colorInput.value, '#123456', 'Blur with invalid text must restore last valid value');
  assert.strictEqual(colorInput.getAttribute('aria-invalid'), 'false', 'aria-invalid must be false after restoring valid value');
  console.log('[PASS] SafeColorTextInput incremental typing and blur restoration verified');

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
