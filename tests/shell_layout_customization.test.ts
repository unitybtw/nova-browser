// Run separately from runAll: this suite owns the DOM globals for its lifetime.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import type { Tab, UserSettings } from '../src/types/browser';
import { defaultSettings } from '../src/types/browser';
import { createDefaultDesignProfile } from '../src/utils/designDefaults';
import { resolveEffectiveDesign } from '../src/utils/designEngine';
import { sanitizeDesignProfile } from '../src/utils/designSecurity';
import { matchesShortcut } from '../src/utils/keyboardShortcuts';

const require = createRequire(join(process.cwd(), 'noop.js'));
const { JSDOM } = require('jsdom') as typeof import('jsdom');

function makeTab(id: string, extra: Partial<Tab> = {}): Tab {
  return {
    id,
    title: `Tab ${id}`,
    url: `https://${id}.example.com`,
    workspaceId: 'default',
    isLoading: false,
    canGoBack: true,
    canGoForward: false,
    ...extra,
  };
}

async function main() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://nova.test', pretendToBeVisual: true });
  const w = dom.window;
  for (const key of [
    'window',
    'document',
    'navigator',
    'HTMLElement',
    'Element',
    'Node',
    'SVGElement',
    'localStorage',
    'MutationObserver',
    'CustomEvent',
    'MouseEvent',
    'KeyboardEvent',
    'Event',
  ] as const) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: key === 'window' ? w : (w as any)[key],
    });
  }
  Object.defineProperty(w.navigator, 'platform', { configurable: true, value: 'MacIntel' });
  Object.defineProperty(w.navigator, 'userAgent', {
    configurable: true,
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  });
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: w.requestAnimationFrame.bind(w),
    cancelAnimationFrame: w.cancelAnimationFrame.bind(w),
    getComputedStyle: w.getComputedStyle.bind(w),
  });

  class TestPort {
    peer: TestPort | null = null;
    onmessage: ((event: { data: unknown }) => void) | null = null;
    postMessage(data: unknown) {
      const target = this.peer;
      setImmediate(() => target?.onmessage?.({ data }));
    }
    close() {
      this.peer = null;
      this.onmessage = null;
    }
    start() {}
  }
  Object.defineProperty(globalThis, 'MessageChannel', {
    configurable: true,
    value: class {
      port1 = new TestPort();
      port2 = new TestPort();
      constructor() {
        this.port1.peer = this.port2;
        this.port2.peer = this.port1;
      }
    },
  });
  w.scrollTo = () => {};

  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { MotionGlobalConfig } = await import('framer-motion');
  MotionGlobalConfig.skipAnimations = true;

  const {
    SidebarTabs,
    MIN_SIDEBAR_WIDTH,
    MAX_SIDEBAR_WIDTH,
    DEFAULT_SIDEBAR_WIDTH,
    clampSidebarWidth,
    computeResizedSidebarWidth,
    resolveSidebarSections,
    resolveSidebarHoverPreviewRect,
    sidebarTabsPropsEqual,
  } = await import('../src/components/SidebarTabs');

  const container = w.document.getElementById('root')!;
  const root = createRoot(container);

  const noop = () => {};
  const baseProps = (overrides: Record<string, any> = {}) => ({
    tabs: [
      makeTab('pin-1', { isPinned: true }),
      makeTab('f-tab', { folderId: 'folder-1' }),
      makeTab('open-1'),
    ],
    folders: [{ id: 'folder-1', name: 'Projects', isExpanded: true, workspaceId: 'default' }],
    activeTabId: 'open-1',
    workspaces: [
      { id: 'default', name: 'Personal', color: 'slate' },
      { id: 'work', name: 'Work', color: 'blue' },
    ],
    activeWorkspaceId: 'default',
    onSelectTab: noop,
    onCloseTab: noop,
    onNewTab: noop,
    onToggleMuteTab: noop,
    onSelectWorkspace: noop,
    onToggleCollapse: noop,
    ...overrides,
  });

  try {
    // 1. Width bounds and drag delta math
    assert.equal(MIN_SIDEBAR_WIDTH, 200);
    assert.equal(MAX_SIDEBAR_WIDTH, 360);
    assert.equal(DEFAULT_SIDEBAR_WIDTH, 250);
    assert.equal(clampSidebarWidth(120), 200);
    assert.equal(clampSidebarWidth(200), 200);
    assert.equal(clampSidebarWidth(295.6), 296);
    assert.equal(clampSidebarWidth(360), 360);
    assert.equal(clampSidebarWidth(540), 360);
    assert.equal(clampSidebarWidth(Number.NaN), 250);
    assert.equal(clampSidebarWidth(undefined), 250);

    // Drag right increases left-sidebar width, decreases right-sidebar width
    assert.equal(computeResizedSidebarWidth(250, 40, 'left'), 290);
    assert.equal(computeResizedSidebarWidth(250, -100, 'left'), 200);
    assert.equal(computeResizedSidebarWidth(250, 200, 'left'), 360);
    assert.equal(computeResizedSidebarWidth(250, -50, 'right'), 300);
    assert.equal(computeResizedSidebarWidth(250, 80, 'right'), 200);
    assert.equal(computeResizedSidebarWidth(250, -200, 'right'), 360);

    // Hover preview rect shifts left for right-docked sidebar
    const sampleRect = { top: 100, left: 1000, right: 1240, bottom: 136, width: 240, height: 36 };
    assert.deepEqual(resolveSidebarHoverPreviewRect(sampleRect, 'left'), sampleRect);
    const rightPreviewRect = resolveSidebarHoverPreviewRect(sampleRect, 'right')!;
    assert.ok(rightPreviewRect.right + 12 + 280 <= sampleRect.left, 'right-sidebar hover preview stays left of sidebar');

    // Memo comparator detects width, position, customize mode, and individual section changes
    const memoBase = baseProps({
      sidebarWidth: 250,
      sidebarPosition: 'left',
      sidebarSections: resolveSidebarSections(),
      isCustomizeMode: false,
      onToggleSidebarSection: noop,
    }) as any;
    assert.equal(sidebarTabsPropsEqual(memoBase, { ...memoBase }), true);
    assert.equal(
      sidebarTabsPropsEqual(memoBase, { ...memoBase, sidebarWidth: 280 }),
      false
    );
    assert.equal(
      sidebarTabsPropsEqual(memoBase, { ...memoBase, sidebarPosition: 'right' }),
      false
    );
    assert.equal(
      sidebarTabsPropsEqual(memoBase, { ...memoBase, isCustomizeMode: true }),
      false
    );
    assert.equal(
      sidebarTabsPropsEqual(memoBase, {
        ...memoBase,
        sidebarSections: { ...resolveSidebarSections(), favorites: false },
      }),
      false
    );
    console.log('[PASS] Sidebar width clamping, drag delta math, hover rect, and memo comparator');

    // 2. SidebarTabs width clamping, left/right positioning, and macOS traffic-light spacer
    await React.act(async () => root.render(React.createElement(SidebarTabs, baseProps({ sidebarWidth: 110, sidebarPosition: 'left' }))));
    let sidebarEl = container.querySelector('.nova-vertical-sidebar') as HTMLElement;
    assert.equal(sidebarEl.style.width, '200px', 'clamps below minimum to 200px');
    assert.ok(sidebarEl.className.includes('border-r') && !sidebarEl.className.includes('border-l'));
    assert.ok(sidebarEl.querySelector('[data-sidebar-mac-spacer="true"]'), 'macOS spacer present when left-docked');

    await React.act(async () => root.render(React.createElement(SidebarTabs, baseProps({ sidebarWidth: 480, sidebarPosition: 'right' }))));
    sidebarEl = container.querySelector('.nova-vertical-sidebar') as HTMLElement;
    assert.equal(sidebarEl.style.width, '360px', 'clamps above maximum to 360px');
    assert.equal(sidebarEl.getAttribute('data-sidebar-position'), 'right');
    assert.ok(sidebarEl.className.includes('border-l') && !sidebarEl.className.includes('border-r'));
    assert.equal(sidebarEl.querySelector('[data-sidebar-mac-spacer="true"]'), null, 'macOS spacer removed when right-docked');
    console.log('[PASS] SidebarTabs width clamping and left/right macOS spacer relocation');

    // 3. All 5 sidebarSections toggles in normal mode vs Customize Mode
    await React.act(async () =>
      root.render(
        React.createElement(
          SidebarTabs,
          baseProps({
            sidebarSections: {
              favorites: false,
              pinned: false,
              folders: false,
              workspaces: false,
              dockFooter: false,
            },
            isCustomizeMode: false,
          })
        )
      )
    );
    assert.equal(Boolean(container.querySelector('.nova-sidebar-favorites')), false);
    assert.equal(Boolean(container.querySelector('.nova-sidebar-pinned')), false);
    assert.equal(Boolean(container.querySelector('[aria-expanded][role="button"]')), false, 'folders hidden');
    assert.equal(Boolean(container.querySelector('[data-sidebar-workspace]')), false);
    assert.equal(Boolean(container.querySelector('.nova-sidebar-spaces')), false);
    assert.equal(Boolean(container.querySelector('[title="Library"]')), false);
    assert.ok(container.querySelector('[data-tab-id="f-tab"]'), 'open tab from hidden folder stays accessible');

    const toggled: string[] = [];
    await React.act(async () =>
      root.render(
        React.createElement(
          SidebarTabs,
          baseProps({
            sidebarSections: {
              favorites: false,
              pinned: false,
              folders: false,
              workspaces: false,
              dockFooter: false,
            },
            isCustomizeMode: true,
            onToggleSidebarSection: (key: string) => toggled.push(key),
          })
        )
      )
    );
    const click = async (selector: string) => {
      const btn = container.querySelector(selector);
      assert.ok(btn, `expected button ${selector}`);
      await React.act(async () => btn.dispatchEvent(new w.MouseEvent('click', { bubbles: true })));
    };
    await click('[aria-label="Show Favorites section"]');
    await click('[aria-label="Show Pinned section"]');
    await click('[aria-label="Show Folders section"]');
    await click('[aria-label="Show Workspaces section"]');
    await click('[aria-label="Show Footer Dock section"]');
    assert.deepEqual(toggled, ['favorites', 'pinned', 'folders', 'workspaces', 'dockFooter']);
    console.log('[PASS] SidebarTabs 5 section toggles in normal and Customize Mode');

    // 4. App.tsx AST + VM verification for shortcut ordering, emergency reset, workspace-aware layout & shell shields
    const appSource = fs.readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8');
    const appTree = ts.createSourceFile('App.tsx', appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    let keyDownBody = '';
    let resetFnBody = '';
    let hasWsOverrideFn = '';
    let updateLayoutFn = '';
    function visitApp(node: ts.Node) {
      if (ts.isVariableDeclaration(node)) {
        const name = node.name.getText(appTree);
        if (name === 'handleKeyDown' && node.initializer) {
          keyDownBody = node.initializer.getText(appTree);
        } else if (name === 'handleResetAppearanceDefault' && node.initializer && ts.isCallExpression(node.initializer)) {
          resetFnBody = node.initializer.arguments[0].getText(appTree);
        }
      } else if (ts.isFunctionDeclaration(node) && node.name?.text === 'updateWorkspaceAwareLayout') {
        updateLayoutFn = node.getText(appTree);
      } else if (ts.isFunctionDeclaration(node) && node.name?.text === 'hasWorkspaceDesignOverride') {
        hasWsOverrideFn = node.getText(appTree);
      }
      ts.forEachChild(node, visitApp);
    }
    visitApp(appTree);

    assert.ok(keyDownBody, 'handleKeyDown found in App.tsx');
    assert.ok(resetFnBody, 'handleResetAppearanceDefault found in App.tsx');
    assert.ok(hasWsOverrideFn && updateLayoutFn, 'updateWorkspaceAwareLayout found in App.tsx');
    const combinedLayoutFn = `${hasWsOverrideFn}\n${updateLayoutFn}`;

    // Verify Shift+CmdOrCtrl+0 strictly precedes meta && key === '0'
    const emergencyIdx = keyDownBody.indexOf("handleResetAppearanceDefault()");
    const zoomResetIdx = keyDownBody.indexOf("handleResetZoom()");
    assert.ok(emergencyIdx !== -1 && zoomResetIdx !== -1 && emergencyIdx < zoomResetIdx,
      'Shift+CmdOrCtrl+0 emergency reset must strictly precede Cmd+0 zoom reset');

    // Execute handleKeyDown in VM
    let zoomResetCount = 0;
    let emergencyResetCount = 0;
    let customizeToggleCount = 0;
    const kbdContext = vm.createContext({
      isMac: true,
      document: { activeElement: null, querySelector: () => null },
      settings: { shortcuts: defaultSettings.shortcuts },
      matchesShortcut,
      activeTabId: 't1',
      activeWorkspaceIdRef: { current: 'default' },
      tabsRef: { current: [makeTab('t1')] },
      activeTabIdRef: { current: 't1' },
      handleResetZoom: () => { zoomResetCount++; },
      handleResetAppearanceDefault: () => { emergencyResetCount++; },
      handleToggleCustomizeMode: () => { customizeToggleCount++; },
      handleNewTab: noop,
      handleReopenClosedTab: noop,
      handleCloseTab: noop,
      handleNewIncognitoTab: noop,
      handleReload: noop,
      setIsSpotlightOpen: noop,
      activateTab: noop,
      handleTakeScreenshot: noop,
      setIsSidebarCollapsed: noop,
      handleToggleBookmarkActive: noop,
      closeAllModals: noop,
      handleOpenHistory: noop,
      handleOpenDownloads: noop,
      handleToggleAIAssistant: noop,
      setIsFindInPageOpen: noop,
      handleZoomIn: noop,
      handleZoomOut: noop,
      handleGoBack: noop,
      handleGoForward: noop,
      handlePrintPage: noop,
      handleOpenDevTools: noop,
      setHelpInitialTab: noop,
      setIsHelpOpen: noop,
    });
    const transpiledKbd = ts.transpileModule(`globalThis.runKeyDown = ${keyDownBody};`, {
      compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInContext(transpiledKbd, kbdContext);

    const dispatchSyntheticKey = (opts: Record<string, any>) => {
      let prevented = false;
      kbdContext.runKeyDown({
        key: '',
        code: '',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        isComposing: false,
        preventDefault: () => { prevented = true; },
        ...opts,
      });
      return prevented;
    };

    assert.equal(dispatchSyntheticKey({ key: '0', code: 'Digit0', metaKey: true, shiftKey: true }), true);
    assert.equal(emergencyResetCount, 1);
    assert.equal(zoomResetCount, 0, 'Shift+Cmd+0 must NOT trigger Zoom Reset');

    // US keyboard where Shift+0 emits key === ')'
    assert.equal(dispatchSyntheticKey({ key: ')', code: 'Digit0', metaKey: true, shiftKey: true }), true);
    assert.equal(emergencyResetCount, 2);
    assert.equal(zoomResetCount, 0);

    // Plain Cmd+0 triggers Zoom Reset
    assert.equal(dispatchSyntheticKey({ key: '0', code: 'Digit0', metaKey: true, shiftKey: false }), true);
    assert.equal(zoomResetCount, 1);
    assert.equal(emergencyResetCount, 2);

    // Cmd+Shift+E toggles Customize Mode
    assert.equal(dispatchSyntheticKey({ key: 'e', code: 'KeyE', metaKey: true, shiftKey: true }), true);
    assert.equal(customizeToggleCount, 1);

    // Execute handleResetAppearanceDefault in VM
    let currentSettings: UserSettings = {
      ...defaultSettings,
      useVerticalTabs: true,
      showTasksWidget: true,
      designProfile: {
        ...createDefaultDesignProfile(),
        layout: { ...createDefaultDesignProfile().layout, chromeMode: 'vertical-right', sidebarWidth: 320 },
      },
      workspaceDesigns: { work: { layout: { chromeMode: 'compact-single-row' } } },
    };
    let sidebarCollapsed = true;
    let customizeMode = true;
    let confirmAnswer = false;
    const resetCtx = vm.createContext({
      isResettingAppearanceRef: { current: false },
      showConfirm: async () => confirmAnswer,
      createDefaultDesignProfile,
      setSettings: (updater: any) => {
        currentSettings = typeof updater === 'function' ? updater(currentSettings) : updater;
      },
      setIsSidebarCollapsed: (v: boolean) => { sidebarCollapsed = v; },
      setIsCustomizeMode: (v: boolean) => { customizeMode = v; },
      customize: { discard: () => { customizeMode = false; } },
    });
    vm.runInContext(
      ts.transpileModule(`globalThis.runReset = ${resetFnBody};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText,
      resetCtx
    );
    await resetCtx.runReset();
    assert.equal(currentSettings.useVerticalTabs, true, 'cancelled confirm leaves settings intact');
    confirmAnswer = true;
    await resetCtx.runReset();
    assert.equal(currentSettings.useVerticalTabs, false);
    assert.equal(currentSettings.showTasksWidget, false);
    assert.deepEqual(Object.keys(currentSettings.workspaceDesigns || {}), []);
    assert.equal(currentSettings.designProfile?.layout.chromeMode, 'classic-top');
    assert.equal(currentSettings.designProfile?.layout.sidebarWidth, 250);
    assert.equal(sidebarCollapsed, false);
    assert.equal(customizeMode, false);

    // Execute updateWorkspaceAwareLayout in VM: global vs workspace override persistence
    const layoutCtx = vm.createContext({
      sanitizeDesignProfile,
      createDefaultDesignProfile,
    });
    vm.runInContext(
      ts.transpileModule(`${combinedLayoutFn}\nglobalThis.updateWorkspaceAwareLayout = updateWorkspaceAwareLayout;`, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
      }).outputText,
      layoutCtx
    );
    const globalResized = layoutCtx.updateWorkspaceAwareLayout(
      { ...defaultSettings, workspaceDesigns: {} },
      'default',
      () => ({ sidebarWidth: 310 })
    ) as UserSettings;
    assert.equal(globalResized.designProfile?.layout.sidebarWidth, 310);
    assert.deepEqual(Object.keys(globalResized.workspaceDesigns || {}), []);

    const withWsOverride: UserSettings = {
      ...defaultSettings,
      designProfile: {
        ...createDefaultDesignProfile(),
        layout: { ...createDefaultDesignProfile().layout, sidebarWidth: 250 },
      },
      workspaceDesigns: { work: { layout: { chromeMode: 'vertical-right' } } },
    };
    const wsResized = layoutCtx.updateWorkspaceAwareLayout(withWsOverride, 'work', () => ({ sidebarWidth: 335 })) as UserSettings;
    assert.equal(wsResized.workspaceDesigns?.work?.layout?.sidebarWidth, 335);
    assert.equal(wsResized.designProfile?.layout.sidebarWidth, 250, 'workspace resize does not mutate global sidebarWidth');
    assert.equal(
      resolveEffectiveDesign(wsResized, 'work', false).layout.sidebarWidth,
      335,
      'resolveEffectiveDesign reads persisted workspace width'
    );

    // Source checks for macOS right-sidebar drag strip, pointer shields, IPC wiring, and TopBar props
    assert.ok(appSource.includes('data-main-mac-drag-strip="true"'), 'macOS right-sidebar drag strip present');
    assert.ok(appSource.includes('w-[76px]'), '76px macOS traffic light spacer present in main content drag strip');
    assert.ok(appSource.includes('data-webview-pointer-shield="resize"'), 'resize webview pointer shield present');
    assert.ok(appSource.includes('data-webview-pointer-shield="customize"'), 'customize webview pointer shield present');
    assert.ok(appSource.includes('isCustomizeMode && !isNewTabActive'), 'customize shield disabled on nova://newtab');
    assert.ok(appSource.includes('onToggleCustomizeMode'), 'Electron IPC toggle-customize-mode wired');
    assert.ok(appSource.includes('onResetAppearanceDefault'), 'Electron IPC reset-appearance-default wired');
    assert.ok(appSource.includes('design={isWebsiteDemo ? undefined : effectiveDesign}'), 'effectiveDesign passed to TopBar');
    console.log('[PASS] App.tsx shortcut order, emergency reset, workspace-aware width persistence, shields, and IPC wiring');
  } finally {
    await React.act(async () => root.unmount());
    dom.window.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
