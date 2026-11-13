// Run standalone with --external:jsdom (owns JSDOM globals for its lifetime).
import { createRequire } from 'node:module';
import { join } from 'node:path';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import type { NewTabLayoutConfig, Tab, UserSettings } from '../src/types/browser';
import { defaultSettings } from '../src/types/browser';
import { createDefaultDesignProfile } from '../src/utils/designDefaults';
import { resolveEffectiveDesign } from '../src/utils/designEngine';
import { sanitizeDesignProfile } from '../src/utils/designSecurity';

const require = createRequire(join(process.cwd(), 'noop.js'));
const { JSDOM } = require('jsdom') as typeof import('jsdom');

function makeNewTab(id = 'tab-new'): Tab {
  return {
    id,
    title: 'New Tab',
    url: 'nova://newtab',
    workspaceId: 'default',
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
  };
}

function makeLayout(overrides: Partial<{
  clock: Partial<NewTabLayoutConfig['clock']>;
  greeting: Partial<NewTabLayoutConfig['greeting']>;
  searchBox: Partial<NewTabLayoutConfig['searchBox']>;
  shortcuts: Partial<NewTabLayoutConfig['shortcuts']>;
  tasksWidget: Partial<NewTabLayoutConfig['tasksWidget']>;
}> = {}): NewTabLayoutConfig {
  const base = createDefaultDesignProfile().newTabLayout;
  return {
    clock: { ...base.clock, ...(overrides.clock || {}) },
    greeting: { ...base.greeting, ...(overrides.greeting || {}) },
    searchBox: { ...base.searchBox, ...(overrides.searchBox || {}) },
    shortcuts: { ...base.shortcuts, ...(overrides.shortcuts || {}) },
    tasksWidget: { ...base.tasksWidget, ...(overrides.tasksWidget || {}) },
  };
}

async function main() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://nova.test', pretendToBeVisual: true });
  const w = dom.window;

  w.matchMedia = (() => ({
    matches: false,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as any;

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

  const { NewTabPage } = await import('../src/components/NewTabPage');
  const { BrowserView, browserViewPropsEqual, areBrowserViewPropsEqual } = await import('../src/components/BrowserView');

  const container = w.document.getElementById('root')!;
  const root = createRoot(container);
  const noop = () => {};

  try {
    // -----------------------------------------------------------------------
    // 1. Backward Compatibility Fallback (no newTabLayout prop)
    // -----------------------------------------------------------------------
    await React.act(async () => {
      root.render(React.createElement(NewTabPage, { onNavigate: noop, showTasksWidget: false }));
    });
    assert.ok(container.querySelector('[data-widget="clock"]'), 'Clock renders in fallback mode');
    assert.ok(container.querySelector('[data-widget="greeting"]'), 'Greeting renders in fallback mode');
    assert.ok(container.querySelector('[data-widget="searchBox"]'), 'SearchBox renders in fallback mode');
    assert.ok(container.querySelector('[data-widget="shortcuts-grid"]'), 'Shortcuts grid renders in fallback mode');
    assert.equal(container.querySelector('[data-widget="tasksWidget"]'), null, 'showTasksWidget=false hides tasks when newTabLayout is omitted');

    await React.act(async () => {
      root.render(React.createElement(NewTabPage, { onNavigate: noop, showTasksWidget: true }));
    });
    const fallbackTasks = container.querySelector('[data-widget="tasksWidget"]');
    assert.ok(fallbackTasks, 'showTasksWidget=true renders tasks when newTabLayout is omitted');
    assert.equal(fallbackTasks?.getAttribute('data-placement'), 'bottom', 'Fallback tasks placement defaults to bottom');

    // Incognito still renders dedicated incognito screen
    await React.act(async () => {
      root.render(React.createElement(NewTabPage, { onNavigate: noop, isIncognito: true, isCustomizeMode: true }));
    });
    assert.equal(container.querySelector('[data-customize-widget]'), null, 'Incognito tab never exposes widget customization overlays');

    console.log('[PASS] Backward-compatible showTasksWidget fallback and Incognito isolation');

    // -----------------------------------------------------------------------
    // 2. Clock (formats, styles, alignment, visibility) & Greeting (customText)
    // -----------------------------------------------------------------------
    await React.act(async () => {
      root.render(React.createElement(NewTabPage, {
        onNavigate: noop,
        newTabLayout: makeLayout({
          clock: { visible: true, format: '12h', style: 'editorial', align: 'left' },
          greeting: { visible: true, customText: '  Build Something Great  ' },
        }),
      }));
    });
    const clockEl = container.querySelector('[data-widget="clock"]')!;
    assert.ok(clockEl, 'Clock renders');
    assert.equal(clockEl.getAttribute('data-clock-format'), '12h');
    assert.equal(clockEl.getAttribute('data-clock-style'), 'editorial');
    assert.equal(clockEl.getAttribute('data-clock-align'), 'left');
    assert.ok(clockEl.className.includes('items-start') && clockEl.className.includes('text-left'), 'Left-aligned clock sets start/left classes');
    assert.ok(/AM|PM/i.test(clockEl.querySelector('h1')?.textContent || ''), '12h clock displays AM/PM');
    assert.ok(clockEl.querySelector('h1')?.className.includes('font-serif'), 'Editorial clock uses font-serif');

    const greetingEl = container.querySelector('[data-widget="greeting"]')!;
    assert.equal(greetingEl.textContent, 'Build Something Great', 'Custom greeting text is trimmed and rendered');
    assert.equal(greetingEl.getAttribute('data-greeting-custom'), 'true');
    assert.ok(greetingEl.className.includes('text-left'), 'Greeting aligns left with clock');

    // Clock hidden while Greeting remains visible with whitespace customText fallback
    await React.act(async () => {
      root.render(React.createElement(NewTabPage, {
        onNavigate: noop,
        newTabLayout: makeLayout({
          clock: { visible: false, format: '24h', style: 'mono', align: 'center' },
          greeting: { visible: true, customText: '   ' },
        }),
      }));
    });
    assert.equal(container.querySelector('[data-widget="clock"]'), null, 'Clock hides when clock.visible=false');
    const fallbackGreeting = container.querySelector('[data-widget="greeting"]')!;
    assert.ok(fallbackGreeting, 'Greeting stays visible independently when clock is hidden');
    assert.equal(fallbackGreeting.getAttribute('data-greeting-custom'), 'false');
    assert.ok(['Good Morning', 'Good Afternoon', 'Good Evening'].includes(fallbackGreeting.textContent || ''), 'Whitespace customText falls back to time-of-day greeting');

    // Mono & Pill clock styles + 24h
    for (const [style, expectedSelector, expectedClass] of [
      ['mono', 'h1', 'font-mono'],
      ['pill', 'h1', 'text-5xl'],
    ] as const) {
      await React.act(async () => {
        root.render(React.createElement(NewTabPage, {
          onNavigate: noop,
          newTabLayout: makeLayout({
            clock: { visible: true, format: '24h', style, align: 'center' },
          }),
        }));
      });
      const c = container.querySelector('[data-widget="clock"]')!;
      assert.equal(c.getAttribute('data-clock-format'), '24h');
      assert.ok(!/AM|PM/i.test(c.querySelector('h1')?.textContent || ''), '24h clock omits AM/PM');
      assert.ok(c.querySelector(expectedSelector)?.className.includes(expectedClass), `Clock style ${style} applies ${expectedClass}`);
      if (style === 'pill') {
        assert.ok(c.innerHTML.includes('rounded-full'), 'Pill clock renders capsule wrapper');
      }
    }

    console.log('[PASS] Clock visibility, 12h/24h formats, 4 styles, alignment, and independent Greeting');

    // -----------------------------------------------------------------------
    // 3. SearchBox (widths & styles), Shortcuts (4..8 cols & 4 cardStyles), Tasks placements
    // -----------------------------------------------------------------------
    for (const [width, widthClass] of [
      ['narrow', 'max-w-[440px]'],
      ['medium', 'max-w-[560px]'],
      ['wide', 'max-w-[740px]'],
    ] as const) {
      await React.act(async () => {
        root.render(React.createElement(NewTabPage, {
          onNavigate: noop,
          newTabLayout: makeLayout({ searchBox: { visible: true, style: 'glass', width } }),
        }));
      });
      const sb = container.querySelector('[data-widget="searchBox"]')!;
      assert.ok(sb.className.includes(widthClass), `SearchBox width ${width} includes ${widthClass}`);
    }

    for (const style of ['glass', 'solid', 'minimal', 'pill'] as const) {
      await React.act(async () => {
        root.render(React.createElement(NewTabPage, {
          onNavigate: noop,
          newTabLayout: makeLayout({ searchBox: { visible: true, style, width: 'medium' } }),
        }));
      });
      const sb = container.querySelector('[data-widget="searchBox"]')!;
      const form = sb.querySelector('form')!;
      const input = sb.querySelector('input')!;
      assert.equal(sb.getAttribute('data-search-style'), style);
      if (style === 'glass') assert.ok(form.className.includes('nova-newtab-glass'));
      if (style === 'solid') assert.ok(!form.className.includes('nova-newtab-glass') && input.className.includes('bg-white'));
      if (style === 'minimal') assert.ok(input.className.includes('border-b-2') && input.className.includes('bg-transparent'));
      if (style === 'pill') assert.ok(input.className.includes('rounded-full'));
    }

    for (const cols of [4, 5, 6, 7, 8] as const) {
      await React.act(async () => {
        root.render(React.createElement(NewTabPage, {
          onNavigate: noop,
          newTabLayout: makeLayout({ shortcuts: { visible: true, columns: cols, cardStyle: 'tile' } }),
        }));
      });
      const grid = container.querySelector('[data-widget="shortcuts-grid"]')!;
      assert.ok(grid.className.includes(`grid-cols-${cols}`), `Shortcuts columns=${cols} includes static grid-cols-${cols}`);
    }

    // Verify no dynamic grid-cols-${...} interpolation exists in NewTabPage.tsx
    const newTabSource = fs.readFileSync(join(process.cwd(), 'src/components/NewTabPage.tsx'), 'utf-8');
    assert.ok(!/grid-cols-\$\{/.test(newTabSource), 'NewTabPage.tsx must not use dynamic grid-cols-${...} interpolation');

    for (const cardStyle of ['tile', 'pill', 'icon-only', 'compact'] as const) {
      await React.act(async () => {
        root.render(React.createElement(NewTabPage, {
          onNavigate: noop,
          newTabLayout: makeLayout({ shortcuts: { visible: true, columns: 4, cardStyle } }),
        }));
      });
      const grid = container.querySelector('[data-widget="shortcuts-grid"]')!;
      const firstShortcut = grid.querySelector('button.nova-shortcut')!;
      assert.equal(grid.getAttribute('data-card-style'), cardStyle);
      if (cardStyle === 'pill') {
        assert.ok(firstShortcut.className.includes('rounded-full') && firstShortcut.className.includes('flex-row'));
        assert.ok(firstShortcut.querySelector('span')?.textContent, 'Pill shortcut displays name label');
      } else if (cardStyle === 'icon-only') {
        assert.equal(firstShortcut.querySelector('span'), null, 'Icon-only shortcut hides text label');
        assert.ok(firstShortcut.getAttribute('aria-label'), 'Icon-only shortcut retains accessible aria-label');
      } else if (cardStyle === 'compact') {
        assert.ok(firstShortcut.className.includes('py-2.5'));
        assert.ok(firstShortcut.querySelector('span')?.textContent, 'Compact shortcut displays name label');
      } else {
        assert.ok(firstShortcut.className.includes('aspect-square'));
        assert.ok(firstShortcut.querySelector('span')?.textContent, 'Tile shortcut displays name label');
      }
    }

    for (const placement of ['bottom', 'left', 'right', 'floating'] as const) {
      await React.act(async () => {
        root.render(React.createElement(NewTabPage, {
          onNavigate: noop,
          newTabLayout: makeLayout({ tasksWidget: { visible: true, placement } }),
        }));
      });
      const layoutEl = container.querySelector('.nova-newtab-layout')!;
      const tasksEl = container.querySelector('[data-widget="tasksWidget"]')!;
      assert.equal(layoutEl.getAttribute('data-tasks-visible'), 'true');
      assert.equal(layoutEl.getAttribute('data-tasks-placement'), placement);
      assert.equal(tasksEl.getAttribute('data-placement'), placement);
      assert.ok(tasksEl.className.includes(`nova-tasks-${placement}`));
    }

    // Verify src/index.css placement container rules
    const cssSource = fs.readFileSync(join(process.cwd(), 'src/index.css'), 'utf-8');
    assert.ok(cssSource.includes('.nova-tasks-widget[data-placement="left"]'), 'CSS defines left dock container query');
    assert.ok(cssSource.includes('.nova-tasks-widget[data-placement="right"]'), 'CSS defines right dock container query');
    assert.ok(cssSource.includes('.nova-tasks-widget[data-placement="floating"]'), 'CSS defines floating panel container query');
    assert.ok(!/@container\s*\(min-width:\s*1320px\)\s*\{\s*\.nova-tasks-widget\s*\{/.test(cssSource),
      'Unconditional 1320px tasks override removed so bottom/left/floating placements are respected on wide viewports');

    console.log('[PASS] SearchBox widths/styles, Shortcuts 4-8 static columns & 4 card styles, Tasks placements');

    // -----------------------------------------------------------------------
    // 4. Customize Mode Inline Toggles, Custom Greeting Edit & Hidden Widget Restore Bar
    // -----------------------------------------------------------------------
    let liveLayout = makeLayout({ tasksWidget: { visible: true, placement: 'bottom' } });
    const renderInteractiveCustomize = async () => {
      await React.act(async () => {
        root.render(React.createElement(NewTabPage, {
          onNavigate: noop,
          newTabLayout: liveLayout,
          isCustomizeMode: true,
          onUpdateNewTabLayout: (next: NewTabLayoutConfig) => {
            liveLayout = next;
          },
        }));
      });
    };

    await renderInteractiveCustomize();
    const newtabRoot = container.querySelector('.nova-newtab')!;
    assert.ok(newtabRoot.className.includes('overflow-hidden'), 'Outer NewTab frame locks background layer to viewport');
    assert.ok(newtabRoot.querySelector('.overflow-y-auto .nova-newtab-layout'), 'Scrollable layout sits inside dedicated inner scroller');
    for (const id of ['clock', 'greeting', 'searchBox', 'shortcuts', 'tasksWidget']) {
      assert.ok(container.querySelector(`[data-customize-widget="${id}"]`), `Customize outline renders for ${id}`);
      assert.ok(container.querySelector(`[data-widget-controls="${id}"]`), `Customize pill controls render for ${id}`);
    }
    assert.equal(container.querySelector('[data-customize-hidden-widgets="true"]'), null, 'Hidden bar omitted when all widgets visible');

    // Cycle Clock options
    await React.act(async () => {
      (container.querySelector('button[aria-label="Cycle clock style"]') as HTMLButtonElement).click();
    });
    assert.equal(liveLayout.clock.style, 'editorial');
    await renderInteractiveCustomize();

    await React.act(async () => {
      (container.querySelector('button[aria-label="Toggle clock format"]') as HTMLButtonElement).click();
    });
    assert.equal(liveLayout.clock.format, '12h');
    await renderInteractiveCustomize();

    await React.act(async () => {
      (container.querySelector('button[aria-label="Toggle clock alignment"]') as HTMLButtonElement).click();
    });
    assert.equal(liveLayout.clock.align, 'left');
    await renderInteractiveCustomize();

    // Edit Greeting inline
    await React.act(async () => {
      (container.querySelector('button[aria-label="Edit greeting text"]') as HTMLButtonElement).click();
    });
    const greetingInput = container.querySelector('input[aria-label="Custom greeting text"]') as HTMLInputElement;
    assert.ok(greetingInput, 'Inline greeting input opens in Customize Mode');
    await React.act(async () => {
      const setter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(greetingInput, 'Live Studio Mode');
      greetingInput.dispatchEvent(new w.Event('input', { bubbles: true }));
    });
    assert.equal(liveLayout.greeting.customText, 'Live Studio Mode');
    await renderInteractiveCustomize();
    await React.act(async () => {
      (container.querySelector('button[aria-label="Edit greeting text"]') as HTMLButtonElement).click();
    });
    assert.equal(container.querySelector('[data-widget="greeting"]')?.textContent, 'Live Studio Mode');

    // Cycle SearchBox options
    await React.act(async () => {
      (container.querySelector('button[aria-label="Cycle search style"]') as HTMLButtonElement).click();
    });
    assert.equal(liveLayout.searchBox.style, 'solid');
    await renderInteractiveCustomize();

    await React.act(async () => {
      (container.querySelector('button[aria-label="Cycle search width"]') as HTMLButtonElement).click();
    });
    assert.equal(liveLayout.searchBox.width, 'wide');
    await renderInteractiveCustomize();

    // Cycle Shortcuts options
    await React.act(async () => {
      (container.querySelector('button[aria-label="Cycle shortcuts style"]') as HTMLButtonElement).click();
    });
    assert.equal(liveLayout.shortcuts.cardStyle, 'pill');
    await renderInteractiveCustomize();

    await React.act(async () => {
      (container.querySelector('button[aria-label="Cycle shortcuts columns"]') as HTMLButtonElement).click();
    });
    assert.equal(liveLayout.shortcuts.columns, 5);
    await renderInteractiveCustomize();

    // Cycle Tasks placement
    await React.act(async () => {
      (container.querySelector('button[aria-label="Cycle tasks placement"]') as HTMLButtonElement).click();
    });
    assert.equal(liveLayout.tasksWidget.placement, 'left');
    await renderInteractiveCustomize();

    // Hide all 5 widgets -> Hidden Widgets restore bar allows toggling all back
    for (const hideLabel of [
      'Hide clock',
      'Hide greeting',
      'Hide search box',
      'Hide shortcuts',
      'Hide tasks widget',
    ]) {
      await React.act(async () => {
        (container.querySelector(`button[aria-label="${hideLabel}"]`) as HTMLButtonElement).click();
      });
      await renderInteractiveCustomize();
    }
    assert.equal(liveLayout.clock.visible, false);
    assert.equal(liveLayout.greeting.visible, false);
    assert.equal(liveLayout.searchBox.visible, false);
    assert.equal(liveLayout.shortcuts.visible, false);
    assert.equal(liveLayout.tasksWidget.visible, false);

    const hiddenBar = container.querySelector('[data-customize-hidden-widgets="true"]');
    assert.ok(hiddenBar, 'Hidden Widgets restore bar renders when widgets are hidden');
    for (const showLabel of ['Show Clock', 'Show Greeting', 'Show Search', 'Show Shortcuts', 'Show Tasks']) {
      assert.ok(hiddenBar.querySelector(`button[aria-label="${showLabel}"]`), `Restore pill present for ${showLabel}`);
    }

    await React.act(async () => {
      (hiddenBar.querySelector('button[aria-label="Show Clock"]') as HTMLButtonElement).click();
    });
    assert.equal(liveLayout.clock.visible, true);
    await renderInteractiveCustomize();
    assert.ok(container.querySelector('[data-widget="clock"]'), 'Clock restores immediately');
    assert.equal(container.querySelector('button[aria-label="Show Clock"]'), null, 'Restored widget leaves hidden bar');

    console.log('[PASS] Customize Mode inline toggles, greeting edit, and Hidden Widgets restore bar');

    // -----------------------------------------------------------------------
    // 5. BrowserView Forwarding, Memo Comparator & Demo Suppression
    // -----------------------------------------------------------------------
    const layoutA = makeLayout();
    const layoutB = makeLayout({ clock: { style: 'mono' } });
    const baseBvProps: any = {
      tab: makeNewTab(),
      isActive: true,
      onUpdateTab: noop,
      onCloseTab: noop,
      isIncognito: false,
      settings: defaultSettings,
      newTabLayout: layoutA,
      isCustomizeMode: false,
      onUpdateNewTabLayout: noop,
    };
    assert.equal(browserViewPropsEqual(baseBvProps, { ...baseBvProps }), true);
    assert.equal(areBrowserViewPropsEqual(baseBvProps, { ...baseBvProps }), true);
    assert.equal(areBrowserViewPropsEqual, browserViewPropsEqual, 'areBrowserViewPropsEqual is exported alias of browserViewPropsEqual');
    assert.equal(browserViewPropsEqual(baseBvProps, { ...baseBvProps, newTabLayout: layoutB }), false, 'Memo detects newTabLayout change');
    assert.equal(browserViewPropsEqual(baseBvProps, { ...baseBvProps, isCustomizeMode: true }), false, 'Memo detects isCustomizeMode change');
    assert.equal(browserViewPropsEqual(baseBvProps, { ...baseBvProps, onUpdateNewTabLayout: () => {} }), false, 'Memo detects onUpdateNewTabLayout change');
    assert.equal(areBrowserViewPropsEqual(baseBvProps, { ...baseBvProps, onUpdateNewTabLayout: () => {} }), false, 'areBrowserViewPropsEqual detects onUpdateNewTabLayout change');

    // Verify BrowserView re-renders and does not retain a stale closure when onUpdateNewTabLayout changes
    let calledV1 = 0;
    let calledV2 = 0;
    const v1Updater = () => { calledV1++; };
    const v2Updater = () => { calledV2++; };

    await React.act(async () => {
      root.render(React.createElement(BrowserView, {
        ...baseBvProps,
        disableTasksWidget: false,
        isDemo: false,
        isCustomizeMode: true,
        onUpdateNewTabLayout: v1Updater,
      }));
      await new Promise((r) => setTimeout(r, 20));
    });

    await React.act(async () => {
      root.render(React.createElement(BrowserView, {
        ...baseBvProps,
        disableTasksWidget: false,
        isDemo: false,
        isCustomizeMode: true,
        onUpdateNewTabLayout: v2Updater,
      }));
      await new Promise((r) => setTimeout(r, 20));
    });

    await React.act(async () => {
      const cycleClockBtn = container.querySelector('button[aria-label="Cycle clock style"]') as HTMLButtonElement;
      assert.ok(cycleClockBtn, 'Cycle clock button is available');
      cycleClockBtn.click();
    });

    assert.equal(calledV1, 0, 'Stale v1 onUpdateNewTabLayout handler was not called');
    assert.equal(calledV2, 1, 'Fresh v2 onUpdateNewTabLayout handler was called after callback update');

    // Render BrowserView with disableTasksWidget=true & isDemo=true
    await React.act(async () => {
      root.render(React.createElement(BrowserView, {
        ...baseBvProps,
        disableTasksWidget: true,
        isDemo: true,
        isCustomizeMode: true,
        newTabLayout: makeLayout({ tasksWidget: { visible: true, placement: 'right' } }),
      }));
      await new Promise((r) => setTimeout(r, 20));
    });
    assert.equal(container.querySelector('[data-widget="tasksWidget"]'), null, 'BrowserView disableTasksWidget suppresses tasksWidget even when layout.tasksWidget.visible=true');
    assert.equal(container.querySelector('[data-customize-widget]'), null, 'BrowserView isDemo=true suppresses Customize Mode overlays');

    // Render BrowserView normally in Customize Mode
    await React.act(async () => {
      root.render(React.createElement(BrowserView, {
        ...baseBvProps,
        disableTasksWidget: false,
        isDemo: false,
        isCustomizeMode: true,
        newTabLayout: makeLayout({ tasksWidget: { visible: true, placement: 'floating' } }),
      }));
      await new Promise((r) => setTimeout(r, 20));
    });
    assert.equal(container.querySelector('[data-widget="tasksWidget"]')?.getAttribute('data-placement'), 'floating');
    assert.ok(container.querySelector('[data-customize-widget="clock"]'), 'BrowserView forwards isCustomizeMode to NewTabPage');

    console.log('[PASS] BrowserView forwarding, memo comparator, and demo suppression');

    // -----------------------------------------------------------------------
    // 6. App.tsx Workspace-Aware NewTabLayout Persistence & Wiring
    // -----------------------------------------------------------------------
    const appSource = fs.readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf-8');
    const appTree = ts.createSourceFile('App.tsx', appSource, ts.ScriptTarget.Latest, true);
    let hasWsOverrideFn = '';
    let updateNewTabFn = '';
    function visitApp(node: ts.Node) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'hasWorkspaceDesignOverride') {
        hasWsOverrideFn = node.getText(appTree);
      } else if (ts.isFunctionDeclaration(node) && node.name?.text === 'updateWorkspaceAwareNewTabLayout') {
        updateNewTabFn = node.getText(appTree);
      }
      ts.forEachChild(node, visitApp);
    }
    visitApp(appTree);
    assert.ok(hasWsOverrideFn && updateNewTabFn, 'updateWorkspaceAwareNewTabLayout found in App.tsx');

    const ctx = vm.createContext({ sanitizeDesignProfile, createDefaultDesignProfile });
    vm.runInContext(
      ts.transpileModule(`${hasWsOverrideFn}\n${updateNewTabFn}\nglobalThis.updateWorkspaceAwareNewTabLayout = updateWorkspaceAwareNewTabLayout;`, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
      }).outputText,
      ctx
    );

    const nextGlobalLayout = makeLayout({
      clock: { style: 'pill', format: '12h' },
      tasksWidget: { visible: true, placement: 'floating' },
    });
    const globalUpdated = ctx.updateWorkspaceAwareNewTabLayout(
      { ...defaultSettings, workspaceDesigns: {} },
      'default',
      nextGlobalLayout
    ) as UserSettings;
    assert.equal(globalUpdated.designProfile?.newTabLayout.clock.style, 'pill');
    assert.equal(globalUpdated.showTasksWidget, true, 'Global update syncs legacy showTasksWidget flag');
    assert.deepEqual(Object.keys(globalUpdated.workspaceDesigns || {}), []);

    const withWs: UserSettings = {
      ...defaultSettings,
      designProfile: createDefaultDesignProfile(),
      workspaceDesigns: { focus: { layout: { chromeMode: 'compact-single-row' } } },
    };
    const wsUpdated = ctx.updateWorkspaceAwareNewTabLayout(
      withWs,
      'focus',
      makeLayout({ shortcuts: { columns: 7, cardStyle: 'compact' } })
    ) as UserSettings;
    assert.equal(wsUpdated.workspaceDesigns?.focus?.newTabLayout?.shortcuts?.columns, 7);
    assert.equal(wsUpdated.designProfile?.newTabLayout.shortcuts.columns, 4, 'Workspace update does not mutate global newTabLayout');
    assert.equal(resolveEffectiveDesign(wsUpdated, 'focus', false).newTabLayout.shortcuts.columns, 7);

    assert.ok(appSource.includes('newTabLayout={browserNewTabLayout}'), 'App.tsx forwards browserNewTabLayout to BrowserView');
    assert.ok(appSource.includes('onUpdateNewTabLayout={handleUpdateNewTabLayout}'), 'App.tsx forwards handleUpdateNewTabLayout to BrowserView');

    // Regression: symmetric tasks clearance keeps shortcuts centered even when tasks placement is left/right
    const indexCss = fs.readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');
    assert.ok(
      indexCss.includes('padding-inline: 320px;'),
      'index.css uses symmetric padding-inline for left/right tasks placement'
    );
    assert.ok(
      !indexCss.includes('padding-left: 320px;') && !indexCss.includes('padding-right: 320px;'),
      'index.css does not apply asymmetric one-sided padding that pushes shortcuts off-center'
    );
    await React.act(async () => {
      root.render(React.createElement(NewTabPage, {
        onNavigate: noop,
        newTabLayout: makeLayout({ tasksWidget: { visible: true, placement: 'left' } }),
      }));
    });
    const shortcutsCenterWrap = container.querySelector('[data-widget="shortcuts"]')!;
    assert.ok(shortcutsCenterWrap.className.includes('mx-auto'), 'Shortcuts wrapper remains centered with mx-auto');

    // Regression: when total shortcut tiles < column count (e.g. 0 speed dials -> only + Add), grid collapses to active count & centers
    const prevSpeedDials = dom.window.localStorage.getItem('nova_speed_dials');
    const sparseContainer = dom.window.document.createElement('div');
    dom.window.document.body.appendChild(sparseContainer);
    const sparseRoot = createRoot(sparseContainer);
    try {
      await React.act(async () => {
        sparseRoot.render(React.createElement(NewTabPage, {
          onNavigate: noop,
          newTabLayout: makeLayout({ shortcuts: { visible: true, columns: 4, cardStyle: 'tile' } }),
        }));
      });
      // Remove all existing dials so only the "+ Add" tile remains
      while (sparseContainer.querySelectorAll('[data-widget="shortcuts-grid"] > div').length > 1) {
        const removeBtn = sparseContainer.querySelector('[data-widget="shortcuts-grid"] > div .absolute button:last-child') as HTMLButtonElement | null;
        if (!removeBtn) break;
        await React.act(async () => {
          removeBtn.click();
        });
      }
      const sparseGrid = sparseContainer.querySelector('[data-widget="shortcuts-grid"]') as HTMLElement;
      assert.equal(sparseGrid.children.length, 1, 'Only +Add tile remains after clearing dials');
      assert.ok(sparseGrid.className.includes('mx-auto'), 'Sparse shortcuts grid centers with mx-auto');
      assert.equal(sparseGrid.style.gridTemplateColumns, 'repeat(1, minmax(0, 1fr))', 'Single +Add tile uses 1 centered column');
    } finally {
      await React.act(async () => sparseRoot.unmount());
      sparseContainer.remove();
      if (prevSpeedDials === null) dom.window.localStorage.removeItem('nova_speed_dials');
      else dom.window.localStorage.setItem('nova_speed_dials', prevSpeedDials);
    }

    console.log('[PASS] App.tsx workspace-aware NewTabLayout persistence and BrowserView wiring');
    console.log('[PASS] ALL New Tab Layout Customization tests passed!');
  } finally {
    await React.act(async () => root.unmount());
    dom.window.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
