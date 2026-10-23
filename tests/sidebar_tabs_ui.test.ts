// Run separately from runAll: this suite owns the DOM globals for its lifetime.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import type { Tab } from '../src/types/browser';
const require = createRequire(join(process.cwd(), 'noop.js'));
const { JSDOM } = require('jsdom') as typeof import('jsdom');
async function main() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://nova.test', pretendToBeVisual: true });
  const w = dom.window;
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'localStorage', 'MutationObserver', 'CustomEvent'] as const) {
    Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? w : (w as any)[key] });
  }
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, requestAnimationFrame: w.requestAnimationFrame.bind(w), cancelAnimationFrame: w.cancelAnimationFrame.bind(w), getComputedStyle: w.getComputedStyle.bind(w) });
  // Browser-style microtask ports avoid retaining Node's scheduler handles.
  class TestPort {
    peer: TestPort | null = null;
    onmessage: ((event: { data: unknown }) => void) | null = null;
    postMessage(data: unknown) { const target = this.peer; queueMicrotask(() => target?.onmessage?.({ data })); }
    close() { this.peer = null; this.onmessage = null; }
    start() {}
  }
  Object.defineProperty(globalThis, 'MessageChannel', { configurable: true, value: class {
    port1 = new TestPort(); port2 = new TestPort();
    constructor() { this.port1.peer = this.port2; this.port2.peer = this.port1; }
  }});
  w.scrollTo = () => {};
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { SidebarTabs } = await import('../src/components/SidebarTabs');
  const base = (id: string, extra: Partial<Tab> = {}): Tab => ({ id, title: id, url: `https://${id}.test`, workspaceId: 'default', isLoading: false, canGoBack: false, canGoForward: false, ...extra });
  const selected: string[] = [], closed: string[] = [], spaces: string[] = [];
  let created = 0, toggled = 0;
  const container = w.document.getElementById('root')!;
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(SidebarTabs, {
      tabs: [base('pinned', { isPinned: true, folderId: 'folder' }), base('nested', { folderId: 'folder' }), base('root')],
      folders: [{ id: 'folder', name: 'Projects', isExpanded: true, workspaceId: 'default' }],
      activeTabId: 'nested', workspaces: [{ id: 'default', name: 'Personal', color: 'slate' }, { id: 'work', name: 'Work', color: 'blue' }], activeWorkspaceId: 'default',
      onSelectTab: id => selected.push(id), onCloseTab: id => closed.push(id), onNewTab: () => created++, onToggleMuteTab: () => {}, onSelectWorkspace: id => spaces.push(id), onToggleFolder: () => toggled++
    })));
    const click = async (element: Element | null) => {
      assert.ok(element, 'expected control exists');
      await React.act(async () => element.dispatchEvent(new w.MouseEvent('click', { bubbles: true })));
    };
    assert.equal(container.querySelectorAll('[role="tab"]').length, 3, 'each tab appears exactly once');
    assert.equal(container.querySelector('.nova-sidebar-pinned [data-tab-id]')?.getAttribute('data-tab-id'), 'pinned', 'pinned folder tabs have their own section');
    await click(container.querySelector('.nova-sidebar-new-tab'));
    assert.equal(created, 1);
    await click(container.querySelector('[aria-label="Switch to Work"]'));
    assert.deepEqual(spaces, ['work']);
    const tabRow = container.querySelector('[data-tab-id="root"]')!;
    await click(tabRow);
    assert.deepEqual(selected, ['root']);
    const close = tabRow.querySelector('button[title="Close Tab"]')!;
    assert.ok(close);
    await React.act(async () => close.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    assert.deepEqual(selected, ['root'], 'nested keyboard events do not select the parent tab');
    await click(close);
    assert.deepEqual(closed, ['root']);
    assert.deepEqual(selected, ['root']);
    await React.act(async () => tabRow.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })));
    assert.deepEqual(selected, ['root', 'nested'], 'arrow navigation follows the visible tab order');
    assert.equal(w.document.activeElement?.getAttribute('data-tab-id'), 'nested');
    await React.act(async () => w.document.activeElement!.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Home', bubbles: true })));
    assert.equal(selected.at(-1), 'pinned', 'Home focuses the first visible tab');
    const folder = container.querySelector('[aria-expanded="true"][role="button"]')!;
    await React.act(async () => folder.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', bubbles: true })));
    assert.equal(toggled, 1);
    assert.ok(container.querySelector('[aria-label="Remove GitHub favorite"]'));
    console.log('[PASS] Sidebar UI: pinned/folder visibility, create, workspace switching, selection, close and keyboard isolation');
  } finally {
    await React.act(async () => root.unmount());
    dom.window.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
