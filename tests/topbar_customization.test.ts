// Run separately from runAll: this suite owns the DOM globals for its lifetime.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import type { BrowserDesignProfile, Tab } from '../src/types/browser';
import { createDefaultDesignProfile, TOOLBAR_ITEM_ORDER_DEFAULT } from '../src/utils/designDefaults';
import type { ResolvedBrowserDesign } from '../src/utils/designEngine';

const require = createRequire(join(process.cwd(), 'noop.js'));
const { JSDOM } = require('jsdom') as typeof import('jsdom');

function makeResolvedDesign(
  patch: Partial<BrowserDesignProfile['layout']> = {},
  effectsPatch: Partial<BrowserDesignProfile['effects']> = {}
): ResolvedBrowserDesign {
  const base = createDefaultDesignProfile();
  return {
    ...base,
    layout: {
      ...base.layout,
      ...patch,
    },
    effects: {
      ...base.effects,
      ...effectsPatch,
    },
    isIncognitoLocked: false,
    effectiveAccentHex: '#3b82f6',
  };
}

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
    TopBar,
    resolveTopBarLayoutConfig,
    getOmniboxWidthClass,
    parseToolbarDropPayload,
    resolveDropInsertionIndex,
    topBarPropsEqual,
  } = await import('../src/components/TopBar');

  const container = w.document.getElementById('root')!;
  const root = createRoot(container);

  const noop = () => {};
  const baseProps = (overrides: Record<string, any> = {}) => ({
    tabs: [makeTab('t1'), makeTab('t2')],
    workspaces: [
      { id: 'default', name: 'Personal', color: 'blue' },
      { id: 'work', name: 'Work', color: 'emerald' },
    ],
    activeWorkspaceId: 'default',
    onSelectWorkspace: noop,
    activeTabId: 't1',
    bookmarks: [],
    searchEngine: 'google' as const,
    onToggleBookmark: noop,
    onOpenHistory: noop,
    onOpenDownloads: noop,
    onOpenSettings: noop,
    onOpenFindInPage: noop,
    onToggleSplitView: noop,
    onZoomIn: noop,
    onZoomOut: noop,
    onDuplicateTab: noop,
    onTogglePinTab: noop,
    onToggleMuteTab: noop,
    onSelectTab: noop,
    onCloseTab: noop,
    onNewTab: noop,
    onNavigate: noop,
    onGoBack: noop,
    onGoForward: noop,
    onReload: noop,
    onToggleAIAssistant: noop,
    onOpenExtensions: noop,
    ...overrides,
  });

  try {
    // 1. Pure helpers verification
    const defaultCfg = resolveTopBarLayoutConfig(undefined, false);
    assert.equal(defaultCfg.chromeMode, 'classic-top');
    assert.equal(defaultCfg.tabBarPosition, 'above-toolbar');
    assert.equal(defaultCfg.isCompactSingleRow, false);
    assert.deepEqual(defaultCfg.toolbarItems, TOOLBAR_ITEM_ORDER_DEFAULT);
    assert.equal(defaultCfg.toolbarShowLabels, false);
    assert.equal(defaultCfg.omniboxMaxWidth, 'balanced');

    assert.equal(getOmniboxWidthClass('compact'), 'max-w-md');
    assert.equal(getOmniboxWidthClass('balanced'), 'max-w-5xl');
    assert.equal(getOmniboxWidthClass('full'), '');

    // Slot payload takes precedence over kind payload (CustomizeSlotWrapper sets both!)
    const slotFirst = parseToolbarDropPayload((type: string) => {
      if (type === 'application/x-nova-toolbar-slot') return 'slot-ai';
      if (type === 'application/x-nova-toolbar-kind') return 'ai';
      return '';
    });
    assert.deepEqual(slotFirst, { type: 'slot', draggedId: 'slot-ai' });

    const kindOnly = parseToolbarDropPayload((type: string) =>
      type === 'application/x-nova-toolbar-kind' ? 'screenshot' : ''
    );
    assert.deepEqual(kindOnly, { type: 'kind', kind: 'screenshot' });

    assert.equal(
      parseToolbarDropPayload((type: string) =>
        type === 'application/x-nova-toolbar-kind' ? 'invalid-kind' : ''
      ),
      null
    );

    const sampleItems = [
      { id: 'a', kind: 'back' as const, visible: true },
      { id: 'b', kind: 'forward' as const, visible: true },
      { id: 'c', kind: 'reload' as const, visible: true },
    ];
    assert.equal(resolveDropInsertionIndex(sampleItems, 'a', 3), 2);
    assert.equal(resolveDropInsertionIndex(sampleItems, 'c', 0), 0);

    // Memo comparator checks design, isCustomizeMode, customization callbacks, while ignoring background blockedAdsCount
    const memoBase = baseProps({
      design: makeResolvedDesign(),
      isCustomizeMode: false,
    }) as any;
    assert.equal(topBarPropsEqual(memoBase, { ...memoBase }), true);
    assert.equal(
      topBarPropsEqual(memoBase, {
        ...memoBase,
        tabs: [memoBase.tabs[0], { ...memoBase.tabs[1], blockedAdsCount: 99 }],
      }),
      true
    );
    assert.equal(
      topBarPropsEqual(memoBase, { ...memoBase, design: makeResolvedDesign({ omniboxMaxWidth: 'compact' }) }),
      false
    );
    assert.equal(topBarPropsEqual(memoBase, { ...memoBase, isCustomizeMode: true }), false);
    assert.equal(
      topBarPropsEqual(memoBase, { ...memoBase, onToggleBookmarksBar: () => {} }),
      false
    );
    console.log('[PASS] TopBar pure helpers and memo comparator');

    // 2. Legacy/default fallback rendering (no design prop)
    await React.act(async () => root.render(React.createElement(TopBar, baseProps())));
    const tabBarRowDefault = container.querySelector('[data-topbar-row="tabbar"]');
    const toolbarRowDefault = container.querySelector('[data-topbar-row="toolbar"]');
    assert.ok(tabBarRowDefault, 'tabbar row renders in classic-top');
    assert.ok(toolbarRowDefault, 'toolbar row renders in classic-top');
    assert.ok(
      tabBarRowDefault.compareDocumentPosition(toolbarRowDefault) & w.Node.DOCUMENT_POSITION_FOLLOWING,
      'tabbar renders above toolbar by default'
    );
    assert.ok(tabBarRowDefault.querySelector('.w-\\[88px\\]'), 'macOS drag spacer sits on top-most tabbar row');
    assert.equal(toolbarRowDefault.querySelector('.w-\\[88px\\]'), null, 'toolbar has no macOS spacer when below tabbar');
    assert.ok(container.querySelector('[data-omnibox-input="true"]'), 'omnibox renders in default order');
    console.log('[PASS] Default fallback layout and drag spacer placement');

    // 3. Modular slot order, hidden slots, labels, omniboxMaxWidth, newly exposed items
    let bookmarksToggled = 0;
    let splitToggled = 0;
    let pipToggledId = '';
    let screenshotTaken = 0;
    let customizeOpened = 0;
    const customSlots = [
      { id: 'slot-menu', kind: 'menu' as const, visible: true },
      { id: 'slot-bookmarks', kind: 'bookmarksToggle' as const, visible: true },
      { id: 'slot-split', kind: 'splitView' as const, visible: true },
      { id: 'slot-pip', kind: 'pip' as const, visible: true },
      { id: 'slot-shot', kind: 'screenshot' as const, visible: true },
      { id: 'slot-divider', kind: 'divider' as const, visible: true },
      { id: 'slot-spacer', kind: 'spacer' as const, visible: true },
      { id: 'slot-omnibox', kind: 'omnibox' as const, visible: true },
      { id: 'slot-hidden-home', kind: 'home' as const, visible: false },
      { id: 'slot-custom', kind: 'customize' as const, visible: true },
    ];
    await React.act(async () =>
      root.render(
        React.createElement(
          TopBar,
          baseProps({
            design: makeResolvedDesign({
              toolbarItems: customSlots,
              toolbarShowLabels: true,
              omniboxMaxWidth: 'compact',
            }),
            isCustomizeMode: false,
            onToggleBookmarksBar: () => {
              bookmarksToggled++;
            },
            onToggleSplitView: () => {
              splitToggled++;
            },
            onTogglePip: (id: string) => {
              pipToggledId = id;
            },
            onTakeScreenshot: () => {
              screenshotTaken++;
            },
            onOpenCustomizeMode: () => {
              customizeOpened++;
            },
          })
        )
      )
    );
    const renderedToolbar = container.querySelector('[data-topbar-row="toolbar"]')!;
    assert.equal(renderedToolbar.querySelector('[data-toolbar-kind="home"]'), null, 'hidden slot omitted outside customize mode');
    assert.ok(renderedToolbar.querySelector('[data-toolbar-kind="divider"]'), 'divider renders visual element');
    assert.ok(renderedToolbar.querySelector('[data-toolbar-kind="spacer"]'), 'spacer renders visual element');
    assert.ok(renderedToolbar.innerHTML.includes('max-w-md'), 'compact omnibox applies max-w-md');
    assert.ok(renderedToolbar.textContent?.includes('Bookmarks'), 'toolbarShowLabels renders Bookmarks label');
    assert.ok(renderedToolbar.textContent?.includes('Screenshot'), 'toolbarShowLabels renders Screenshot label');

    const clickEl = async (selector: string) => {
      const el = container.querySelector(selector);
      assert.ok(el, `missing element: ${selector}`);
      await React.act(async () => {
        el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      });
    };
    await clickEl('[data-toolbar-kind="bookmarksToggle"] button');
    await clickEl('[data-toolbar-kind="splitView"] button');
    await clickEl('[data-toolbar-kind="pip"] button');
    await clickEl('[data-toolbar-kind="screenshot"] button');
    await clickEl('[data-toolbar-kind="customize"] button');
    assert.equal(bookmarksToggled, 1);
    assert.equal(splitToggled, 1);
    assert.equal(pipToggledId, 't1');
    assert.equal(screenshotTaken, 1);
    assert.equal(customizeOpened, 1);

    // Order check: menu slot precedes omnibox slot in DOM
    const menuEl = renderedToolbar.querySelector('[data-toolbar-kind="menu"]')!;
    const omniboxEl = renderedToolbar.querySelector('[data-toolbar-kind="omnibox"]')!;
    assert.ok(menuEl.compareDocumentPosition(omniboxEl) & w.Node.DOCUMENT_POSITION_FOLLOWING, 'slots follow design order');
    console.log('[PASS] Modular slot ordering, hidden slot filtering, labels, omniboxMaxWidth, and callbacks');

    // 4. tabBarPosition: 'below-toolbar' swaps rows and moves drag spacers onto toolbar
    await React.act(async () =>
      root.render(
        React.createElement(
          TopBar,
          baseProps({
            design: makeResolvedDesign({
              chromeMode: 'classic-top',
              tabBarPosition: 'below-toolbar',
              omniboxMaxWidth: 'full',
            }),
          })
        )
      )
    );
    const tabBarBelow = container.querySelector('[data-topbar-row="tabbar"]')!;
    const toolbarAbove = container.querySelector('[data-topbar-row="toolbar"]')!;
    assert.ok(
      toolbarAbove.compareDocumentPosition(tabBarBelow) & w.Node.DOCUMENT_POSITION_FOLLOWING,
      'toolbar renders BEFORE tabbar when tabBarPosition is below-toolbar'
    );
    assert.ok(toolbarAbove.querySelector('.w-\\[88px\\]'), 'macOS drag spacer moves to toolbar when toolbar is on top');
    assert.equal(tabBarBelow.querySelector('.w-\\[88px\\]'), null, 'tabbar drops macOS spacer when below toolbar');
    assert.ok(!toolbarAbove.innerHTML.includes('max-w-md') && !toolbarAbove.innerHTML.includes('max-w-5xl'), 'full omnibox removes max-w caps');

    // Also check Windows spacer moves properly in below-toolbar mode
    Object.defineProperty(w.navigator, 'platform', { configurable: true, value: 'Win32' });
    Object.defineProperty(w.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });
    await React.act(async () =>
      root.render(
        React.createElement(
          TopBar,
          baseProps({
            design: makeResolvedDesign({
              chromeMode: 'classic-top',
              tabBarPosition: 'below-toolbar',
            }),
          })
        )
      )
    );
    assert.ok(container.querySelector('[data-topbar-row="toolbar"] .w-\\[140px\\]'), 'Windows drag spacer moves to toolbar when below-toolbar');
    assert.equal(container.querySelector('[data-topbar-row="tabbar"] .w-\\[140px\\]'), null);
    // Restore Mac platform for remaining tests
    Object.defineProperty(w.navigator, 'platform', { configurable: true, value: 'MacIntel' });
    Object.defineProperty(w.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    });
    console.log('[PASS] tabBarPosition below-toolbar swaps bars and moves Mac/Windows drag spacers');

    // 5. compact-single-row mode
    await React.act(async () =>
      root.render(
        React.createElement(
          TopBar,
          baseProps({
            showBookmarksBar: true,
            design: makeResolvedDesign({
              chromeMode: 'compact-single-row',
              omniboxMaxWidth: 'compact',
              toolbarItems: [
                { id: 'slot-back', kind: 'back', visible: true },
                { id: 'slot-omnibox', kind: 'omnibox', visible: true },
                { id: 'slot-menu', kind: 'menu', visible: true },
              ],
            }),
          })
        )
      )
    );
    const compactRow = container.querySelector('[data-topbar-row="compact"]');
    assert.ok(compactRow, 'compact-single-row renders unified single row');
    assert.equal(container.querySelector('[data-topbar-row="tabbar"]'), null, 'no separate tabbar row in compact mode');
    assert.equal(container.querySelector('[data-topbar-row="toolbar"]'), null, 'no separate toolbar row in compact mode');
    assert.ok(compactRow.querySelector('.w-\\[88px\\]'), 'macOS drag spacer kept in compact-single-row');
    assert.ok(compactRow.querySelector('[data-tab-id="t1"]'), 'tabs render inside compact row');
    assert.ok(compactRow.querySelector('[data-omnibox-input="true"]'), 'omnibox renders inside compact row');
    assert.ok(compactRow.querySelector('[aria-label="Switch workspace"]'), 'workspace pill available in compact row when not duplicated');
    assert.ok(container.textContent?.includes('Bookmarks will appear here'), 'bookmarks bar still renders below compact row');
    console.log('[PASS] compact-single-row unifies drag spacer, workspace pill, tabs, and toolbar slots');

    // 6. Customize Mode: hidden slots visible dimmed, slot controls & DnD reorder/palette insert
    const reorders: Array<[string, string]> = [];
    const inserts: Array<[string, number]> = [];
    const toggledVis: string[] = [];
    const removedIds: string[] = [];

    await React.act(async () =>
      root.render(
        React.createElement(
          TopBar,
          baseProps({
            isCustomizeMode: true,
            design: makeResolvedDesign({
              toolbarItems: customSlots,
            }),
            onReorderToolbarSlot: (d: string, t: string) => reorders.push([d, t]),
            onInsertToolbarSlot: (k: string, idx: number) => inserts.push([k, idx]),
            onToggleToolbarSlotVisibility: (id: string) => toggledVis.push(id),
            onRemoveToolbarSlot: (id: string) => removedIds.push(id),
          })
        )
      )
    );
    const hiddenRegion = container.querySelector('[aria-label="Toolbar slot: Home"]')!;
    assert.ok(hiddenRegion, 'hidden slot is surfaced in customize mode');
    assert.ok(hiddenRegion.className.includes('opacity-45'), 'hidden slot is dimmed in customize mode');
    assert.ok(hiddenRegion.className.includes('no-drag'), 'slot wrapper must mark no-drag so Electron does not hijack slot drag');
    const slotControlsBar = hiddenRegion.querySelector('[role="toolbar"]')!;
    assert.ok(slotControlsBar.className.includes('top-full'), 'slot controls overlay must open below slot to avoid clipping/tab collision');
    assert.ok(slotControlsBar.className.includes('opacity-0'), 'slot controls overlay stays hidden until hover/focus to prevent adjacent overlap');
    assert.ok(container.querySelector('[aria-label="Show Home"]'), 'hidden slot exposes Show control');
    assert.equal(container.querySelector('[aria-label="Remove Address & Search Bar"]'), null, 'critical omnibox cannot be removed');

    await clickEl('[aria-label="Show Home"]');
    await clickEl('[aria-label="Remove Bookmarks"]');
    assert.deepEqual(toggledVis, ['slot-hidden-home']);
    assert.deepEqual(removedIds, ['slot-bookmarks']);

    // Simulate drag/drop reorder (slot onto slot) and palette insert (kind onto gap)
    const dispatchDrop = async (target: Element, data: Record<string, string>) => {
      const event = new w.Event('drop', { bubbles: true, cancelable: true }) as any;
      event.dataTransfer = {
        types: Object.keys(data),
        getData: (type: string) => data[type] || '',
      };
      await React.act(async () => {
        target.dispatchEvent(event);
      });
    };

    const splitRegion = container.querySelector('[aria-label="Toolbar slot: Split View"]')!;
    await dispatchDrop(splitRegion, {
      'application/x-nova-toolbar-slot': 'slot-menu',
      'application/x-nova-toolbar-kind': 'menu',
    });
    assert.deepEqual(reorders, [['slot-menu', 'slot-split']]);

    const endDropZone = container.querySelector('[data-toolbar-dropzone="end"]')!;
    assert.ok(endDropZone, 'trailing drop zone exists in customize mode');
    await dispatchDrop(endDropZone, {
      'application/x-nova-toolbar-kind': 'workspaces',
    });
    assert.deepEqual(inserts, [['workspaces', customSlots.length]]);

    // Existing slot dropped on a gap uses onMoveToolbarSlotToIndex when provided
    const movesToIdx: Array<[string, number]> = [];
    await React.act(async () =>
      root.render(
        React.createElement(
          TopBar,
          baseProps({
            isCustomizeMode: true,
            design: makeResolvedDesign({ toolbarItems: customSlots }),
            onMoveToolbarSlotToIndex: (id: string, targetIdx: number) => movesToIdx.push([id, targetIdx]),
          })
        )
      )
    );
    await dispatchDrop(container.querySelector('[data-toolbar-dropzone="end"]')!, {
      'application/x-nova-toolbar-slot': 'slot-menu',
      'application/x-nova-toolbar-kind': 'menu',
    });
    assert.deepEqual(movesToIdx, [['slot-menu', customSlots.length - 1]]);

    // Header must remove drag-region (set no-drag) in customize mode so macOS Electron does not hijack DnD
    const customizeHeader = container.querySelector('header') as HTMLElement;
    assert.ok(customizeHeader.className.includes('no-drag'), 'header sets no-drag during customize mode');
    assert.ok(!customizeHeader.className.includes('drag-region'), 'header removes drag-region during customize mode');

    // Drag start/end lifecycle cleanly clears dragging state without stuck highlights
    const splitSlotEl = container.querySelector('[aria-label="Toolbar slot: Split View"]') as HTMLElement;
    assert.ok(splitSlotEl, 'Split View slot wrapper exists');
    const dragStartEv = new w.Event('dragstart', { bubbles: true, cancelable: true }) as any;
    const setDataMap: Record<string, string> = {};
    dragStartEv.dataTransfer = {
      effectAllowed: 'copyMove',
      setData: (k: string, v: string) => { setDataMap[k] = v; },
    };
    await React.act(async () => {
      splitSlotEl.dispatchEvent(dragStartEv);
    });
    assert.equal(setDataMap['application/x-nova-toolbar-slot'], 'slot-split');
    assert.ok(splitSlotEl.className.includes('opacity-35'), 'dragged slot dims cleanly while dragging');
    await React.act(async () => {
      w.dispatchEvent(new w.Event('dragend'));
    });
    assert.ok(!splitSlotEl.className.includes('opacity-35'), 'window dragend clears dragged slot styling');
    console.log('[PASS] Customize mode dimmed hidden slots, Eye/Remove controls, no-drag header, and DnD reorder/cleanup');

    // 7. Right-click context menu on TopBar background -> Customize Browser..., Escape closes
    let contextCustomizeTriggered = 0;
    await React.act(async () =>
      root.render(
        React.createElement(
          TopBar,
          baseProps({
            onOpenCustomizeMode: () => {
              contextCustomizeTriggered++;
            },
          })
        )
      )
    );

    const omniboxInput = container.querySelector('[data-omnibox-input="true"]')!;
    const inputCtxEvent = new w.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 50 });
    await React.act(async () => {
      omniboxInput.dispatchEvent(inputCtxEvent);
    });
    assert.equal(inputCtxEvent.defaultPrevented, false, 'right-clicking omnibox input must not hijack native copy/paste menu');
    assert.equal(w.document.querySelector('[role="menu"][aria-label="Toolbar context menu"]'), null);

    const headerEl = container.querySelector('header')!;
    const headerCtxEvent = new w.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 20 });
    await React.act(async () => {
      headerEl.dispatchEvent(headerCtxEvent);
    });
    assert.equal(headerCtxEvent.defaultPrevented, true, 'right-clicking TopBar background opens context menu');
    await React.act(async () => {
      w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    assert.equal(w.document.querySelector('[role="menu"][aria-label="Toolbar context menu"]'), null, 'Escape dismisses context menu');

    await React.act(async () => {
      headerEl.dispatchEvent(new w.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 20 }));
    });
    const customizeMenuBtn = Array.from(w.document.querySelectorAll('[role="menuitem"]')).find((el) =>
      el.textContent?.includes('Customize Browser...')
    );
    assert.ok(customizeMenuBtn, 'Customize Browser... menuitem is shown');
    await React.act(async () => {
      customizeMenuBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    });
    assert.equal(contextCustomizeTriggered, 1);
    console.log('[PASS] Right-click Customize Browser... context menu, Escape dismissal & omnibox protection');

    // 8. Compact single-row avoids duplicate workspace pill when workspaces slot is in toolbar + Incognito isolation
    await React.act(async () =>
      root.render(
        React.createElement(
          TopBar,
          baseProps({
            isIncognito: true,
            design: makeResolvedDesign({
              chromeMode: 'compact-single-row',
              toolbarItems: [
                { id: 'slot-ws', kind: 'workspaces', visible: true },
                { id: 'slot-omnibox', kind: 'omnibox', visible: true },
              ],
            }),
          })
        )
      )
    );
    assert.equal(
      container.querySelectorAll('[data-topbar-row="compact"] [aria-label="Switch workspace"]').length,
      1,
      'compact-single-row does not duplicate workspace switcher when workspaces slot is present'
    );
    assert.ok(
      container.querySelector('header')?.className.includes('bg-slate-900'),
      'incognito isolation styling preserved'
    );

    // Non-incognito compact-single-row delegates backdrop to compact row so header background stays transparent
    await React.act(async () =>
      root.render(
        React.createElement(
          TopBar,
          baseProps({
            isIncognito: false,
            design: makeResolvedDesign({
              chromeMode: 'compact-single-row',
              toolbarItems: [
                { id: 'slot-omnibox', kind: 'omnibox', visible: true },
              ],
            }),
          })
        )
      )
    );
    const nonIncognitoCompactHeader = container.querySelector('header') as HTMLElement;
    assert.equal(
      nonIncognitoCompactHeader.style.background,
      'transparent',
      'compact-single-row header avoids double-painting background behind toolbar layer'
    );
    console.log('[PASS] Compact workspace deduplication, incognito isolation & single-backdrop header');

    // 9. TopBar row stacking hierarchy keeps top-most dropdowns (Workspace Switcher) above lower rows
    const assertStackingForPosition = async (tabBarPosition: 'above-toolbar' | 'below-toolbar') => {
      await React.act(async () =>
        root.render(
          React.createElement(
            TopBar,
            baseProps({
              isIncognito: false,
              showBookmarksBar: true,
              bookmarks: [{ id: 'bm-1', title: 'Docs', url: 'https://example.com' }],
              design: makeResolvedDesign({
                chromeMode: 'classic-tabs',
                tabBarPosition,
              }),
            })
          )
        )
      );

      const tabbarRow = container.querySelector('[data-topbar-row="tabbar"]') as HTMLElement;
      const toolbarRow = container.querySelector('[data-topbar-row="toolbar"]') as HTMLElement;
      const tabbarBackdrop = container.querySelector('[data-topbar-backdrop="tabbar"]') as HTMLElement;
      assert.ok(tabbarRow && toolbarRow && tabbarBackdrop, `rows and tabbar backdrop present for ${tabBarPosition}`);
      assert.ok(!tabbarRow.style.backdropFilter, 'backdropFilter lives on dedicated backdrop layer, not tabbar row');
      assert.ok(tabbarBackdrop.className.includes('pointer-events-none'), 'tabbar backdrop does not block clicks');

      if (tabBarPosition === 'above-toolbar') {
        assert.ok(tabbarRow.className.includes('z-30'), 'above-toolbar places tabbar row in z-30');
        assert.ok(toolbarRow.className.includes('z-20'), 'above-toolbar places toolbar row in z-20');
      } else {
        assert.ok(toolbarRow.className.includes('z-30'), 'below-toolbar places toolbar row in z-30');
        assert.ok(tabbarRow.className.includes('z-20'), 'below-toolbar places tabbar row in z-20');
      }
    };

    await assertStackingForPosition('above-toolbar');
    await assertStackingForPosition('below-toolbar');

    // Open Workspace Switcher from tabbar and confirm dropdown mounts with high z-index
    const wsBtn = container.querySelector('[data-topbar-row="tabbar"] [aria-label="Switch workspace"]') as HTMLButtonElement;
    assert.ok(wsBtn, 'workspace switcher button found in tabbar');
    await React.act(async () => {
      wsBtn.click();
    });
    assert.equal(wsBtn.getAttribute('aria-expanded'), 'true', 'workspace menu opens');
    assert.ok(container.textContent?.includes('Workspaces'), 'workspace dropdown content is rendered');
    console.log('[PASS] TopBar row stacking & workspace dropdown overlay ordering');

    console.log('\ntopbar_customization.test.ts passed');
  } finally {
    await React.act(async () => root.unmount());
    dom.window.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
