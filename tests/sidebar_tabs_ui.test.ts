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
  // Browser-style task ports yield to timers without retaining Node scheduler handles.
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
  w.scrollTo = () => {};
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  // This suite checks interaction outcomes, not animation timing in jsdom.
  const { MotionGlobalConfig } = await import('framer-motion');
  MotionGlobalConfig.skipAnimations = true;
  const { SidebarTabs } = await import('../src/components/SidebarTabs');
  const base = (id: string, extra: Partial<Tab> = {}): Tab => ({ id, title: id, url: `https://${id}.test`, workspaceId: 'default', isLoading: false, canGoBack: false, canGoForward: false, ...extra });
  const selected: string[] = [], closed: string[] = [], spaces: string[] = [];
  let created = 0, toggled = 0;
  const renamed: string[][] = [];
  const container = w.document.getElementById('root')!;
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(React.createElement(SidebarTabs, {
      tabs: [base('pinned', { isPinned: true, folderId: 'folder' }), base('nested', { folderId: 'folder' }), base('root')],
      folders: [{ id: 'folder', name: 'Projects', isExpanded: true, workspaceId: 'default' }],
      activeTabId: 'nested', workspaces: [{ id: 'default', name: 'Personal', color: 'slate' }, { id: 'work', name: 'Work', color: 'blue' }], activeWorkspaceId: 'default',
      onSelectTab: id => selected.push(id), onCloseTab: id => closed.push(id), onNewTab: () => created++, onToggleMuteTab: () => {}, onSelectWorkspace: id => spaces.push(id), onToggleFolder: () => toggled++, onRenameFolder: (id, name) => renamed.push([id, name])
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
    await click(container.querySelector('[aria-label="Rename Projects folder"]'));
    const nameInput = container.querySelector<HTMLInputElement>('input[aria-label="Folder name"]')!;
    assert.ok(nameInput, 'folder name editor is reachable');
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')!.set!.call(nameInput, '  Research  ');
      nameInput.dispatchEvent(new w.Event('input', { bubbles: true }));
    });
    await React.act(async () => nameInput.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    assert.deepEqual(renamed, [['folder', 'Research']], 'Enter saves without toggling the folder');
    assert.equal(toggled, 1);
    await click(container.querySelector('[aria-label="Rename Projects folder"]'));
    await React.act(async () => container.querySelector('input[aria-label="Folder name"]')!.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(renamed.length, 1, 'Escape cancels without saving');

    console.log('[PASS] Sidebar UI: pinned/folder visibility, create, workspace switching, selection, close and keyboard isolation');
    // Exercise the real workspace editor with controlled parent state.
    const { WorkspaceManager } = await import('../src/components/WorkspaceManager');
    let writes = 0;
    let currentSpaces = [{ id: 'default', name: 'Personal', color: 'slate' }];
    const renderManager = async (isOpen: boolean) => {
      await React.act(async () => root.render(React.createElement(WorkspaceManager, {
        isOpen, onClose: () => {}, workspaces: currentSpaces, activeWorkspaceId: 'default', onSelectWorkspace: () => {},
        onUpdateWorkspaces: next => { writes++; currentSpaces = next; }
      })));
    };
    await renderManager(true);
    await click(Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Create New Workspace'))!);
    assert.equal(writes, 0, 'creating a draft must not persist a workspace before Save');
    await click(Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Cancel')!);
    assert.equal(writes, 0, 'Cancel discards the draft');
    assert.equal(container.querySelector('input[aria-label="Workspace name"]'), null);
    await click(Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Create New Workspace'))!);
    await click(container.querySelector('[aria-label="Edit Personal workspace"]'));
    assert.equal(container.querySelector('[aria-label="Edit New Workspace workspace"]'), null, 'switching to an existing edit discards the draft');
    assert.equal(container.querySelector<HTMLInputElement>('input[aria-label="Workspace name"]')?.value, 'Personal');
    await click(Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Cancel')!);
    assert.equal(writes, 0);
    await click(Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Create New Workspace'))!);
    const workspaceInput = container.querySelector<HTMLInputElement>('input[aria-label="Workspace name"]')!;
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')!.set!.call(workspaceInput, '  Design  ');
      workspaceInput.dispatchEvent(new w.Event('input', { bubbles: true }));
    });
    await click(Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Save')!);
    assert.equal(writes, 1);
    assert.equal(currentSpaces[1].name, 'Design');
    await renderManager(true);
    await click(Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Create New Workspace'))!);
    await renderManager(false);
    await renderManager(true);
    assert.equal(container.querySelector('input[aria-label="Workspace name"]'), null, 'closing the manager discards unsaved edits');
    assert.equal(writes, 1);
    await renderManager(false);
    assert.equal(w.document.body.style.overflow, '', 'closing restores the previous scroll style');
    w.document.body.style.overflow = 'clip';
    const closedRoot = root;
    await React.act(async () => closedRoot.render(React.createElement(WorkspaceManager, {
      key: 'closed-probe', isOpen: false, onClose: () => {}, workspaces: currentSpaces, activeWorkspaceId: 'default', onSelectWorkspace: () => {}, onUpdateWorkspaces: () => {}
    })));
    assert.equal(w.document.body.style.overflow, 'clip', 'a closed manager must not overwrite another modal scroll lock');
    console.log('[PASS] Workspace drafts: Cancel, Save, close/reopen, and closed-dialog scroll isolation');
    w.localStorage.setItem('nova_top_favorites', '[]');
    await React.act(async () => root.render(React.createElement(SidebarTabs, {
      tabs: [base('blank')], activeTabId: 'blank', workspaces: currentSpaces, activeWorkspaceId: 'default',
      onSelectTab: () => {}, onCloseTab: () => {}, onNewTab: () => {}, onToggleMuteTab: () => {}, onSelectWorkspace: () => {}
    })));
    assert.equal(container.querySelector('.nova-sidebar-favorites [title^="YouTube"]'), null, 'empty saved favorites do not resurrect defaults');
    const { NewTabPage } = await import('../src/components/NewTabPage');
    w.localStorage.setItem('nova_todos', JSON.stringify([null, { id: 'first', text: 'First task', completed: false }, { id: 'second', text: 'Second task', completed: false }]));
    await React.act(async () => root.render(React.createElement(NewTabPage, { onNavigate: () => {}, isActive: false, energySaverMode: true })));
    const tasks = container.querySelectorAll<HTMLElement>('[role="checkbox"]');
    assert.equal(tasks.length, 2, 'malformed tasks cannot crash the new tab page');
    await React.act(async () => {
      tasks[0].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      tasks[1].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    });
    const savedTasks = JSON.parse(w.localStorage.getItem('nova_todos')!);
    assert.ok(savedTasks.every((task: any) => task.completed), 'batched task changes preserve both updates');
    const deleteTask = tasks[0].querySelector('button')!;
    await React.act(async () => deleteTask.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    assert.ok(JSON.parse(w.localStorage.getItem('nova_todos')!)[0].completed, 'keyboard activation of Delete must not toggle the parent task');
    console.log('[PASS] Empty favorites, malformed task recovery, batched toggles, and task delete keyboard isolation');
    const { HistoryPage } = await import('../src/components/HistoryPage');
    const now = Date.now();
    await React.act(async () => root.render(React.createElement(HistoryPage, {
      history: [
        { id: 'old', title: 'Older article', url: 'https://example.com/older', timestamp: now - 1000, visitCount: 1 },
        { id: 'recent', title: 'Recent article', url: 'https://example.com/recent', timestamp: now, visitCount: 1 }
      ], onNavigate: () => {}, onClearHistory: () => {}, onRemoveHistoryItem: () => {}
    })));
    const historyTitles = Array.from(container.querySelectorAll('p[title]')).map(element => element.textContent);
    assert.ok(historyTitles.indexOf('Recent article') < historyTitles.indexOf('Older article'), 'history presents the newest visit first even after unordered imports');
    const historySearch = container.querySelector('input')!;
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')!.set!.call(historySearch, '  recent  ');
      historySearch.dispatchEvent(new w.Event('input', { bubbles: true }));
    });
    assert.ok(container.textContent?.includes('Recent article'), 'surrounding search whitespace is ignored');
    assert.ok(!container.textContent?.includes('Older article'));
    console.log('[PASS] History ordering and trimmed search');

    const { DownloadToast } = await import('../src/components/DownloadToast');
    let resolveOpen!: (result: boolean | 'cancelled') => void;
    let calls = 0;
    (w as any).electronAPI = {
      openDownload: () => { calls++; return new Promise(resolve => { resolveOpen = resolve; }); },
      showDownloadInFolder: async () => true,
      showConfirmDialog: async () => true
    };
    const completedDownload = { id: 'download', filename: 'report.pdf', url: 'https://example.com/report', receivedBytes: 10, totalBytes: 10, state: 'completed' as const, savePath: '/tmp/report.pdf' };
    await React.act(async () => root.render(React.createElement(DownloadToast, { activeDownload: completedDownload })));
    const openButton = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Open File'))!;
    await click(openButton);
    assert.equal(openButton.disabled, true, 'pending action disables duplicate clicks');
    assert.equal(calls, 1);
    await React.act(async () => { resolveOpen(false); await new Promise(resolve => setImmediate(resolve)); });
    assert.ok(Array.from(container.querySelectorAll('button')).some(button => button.textContent?.includes('Open File')), 'failed open preserves the toast for retry');
    const retryButton = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Open File'))!;
    await click(retryButton);
    await React.act(async () => { resolveOpen('cancelled'); await new Promise(resolve => setImmediate(resolve)); });
    assert.equal(retryButton.disabled, false, 'cancelling allows retry');
    await click(retryButton);
    await React.act(async () => { resolveOpen(true); await new Promise(resolve => setImmediate(resolve)); });
    await React.act(async () => { await new Promise(resolve => setImmediate(resolve)); });
    assert.equal(container.querySelector('[role="status"]'), null, 'success dismisses the toast');
    await React.act(async () => root.render(React.createElement(DownloadToast, { activeDownload: { ...completedDownload, id: 'older-pending' } })));
    await click(Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Open File'))!);
    const latestDownload = { ...completedDownload, id: 'latest', filename: 'latest.pdf' };
    await React.act(async () => root.render(React.createElement(DownloadToast, { activeDownload: latestDownload })));
    await React.act(async () => { resolveOpen(true); await new Promise(resolve => setImmediate(resolve)); });
    assert.ok(container.querySelector('[title="latest.pdf"]'), 'an older OS action must not dismiss a newer download');
    console.log('[PASS] Download pending action, failure retry, cancellation, successful dismissal, and stale result isolation');
    const { handleReaderLink, persistArticleHighlights, sanitizeReaderContent } = await import('../src/components/ReaderMode');
    const readerHost = w.document.createElement('div');
    readerHost.innerHTML = '<a href="https://example.com/private"><span>Read more</span></a>';
    const readerNavigations: string[] = [];
    for (const button of [0, 1]) {
      let prevented = false;
      handleReaderLink({ button, target: readerHost.querySelector('span'), preventDefault: () => { prevented = true; }, stopPropagation: () => {} } as any, url => readerNavigations.push(url));
      assert.ok(prevented, 'reader activation cannot fall through to a context-free popup');
    }
    assert.equal(readerNavigations.length, 2);
    readerHost.querySelector('a')!.setAttribute('href', 'javascript:alert(1)');
    handleReaderLink({ button: 0, target: readerHost.querySelector('span'), preventDefault() {}, stopPropagation() {} } as any, url => readerNavigations.push(url));
    assert.equal(readerNavigations.length, 2, 'dangerous reader destinations are rejected');
    let highlightWrites = 0;
    persistArticleHighlights('https://example.com/private', [], true, () => { highlightWrites++; });
    assert.equal(highlightWrites, 0);
    persistArticleHighlights('https://example.com/normal', [], false, () => { highlightWrites++; });
    assert.equal(highlightWrites, 1);
    const article = '<p>Article text</p><img src="https://example.com/tracker"><picture><source srcset="https://example.com/other"></picture><script>alert(1)</script>';
    const privateArticle = sanitizeReaderContent(article, true);
    assert.ok(privateArticle.includes('Article text'));
    assert.ok(!privateArticle.includes('<img') && !privateArticle.includes('<source') && !privateArticle.includes('<script'), 'private reader cannot fetch images using the normal host session');
    assert.ok(sanitizeReaderContent(article, false).includes('<img'), 'ordinary reader images remain available');
    console.log('[PASS] Reader navigation gestures, unsafe schemes, private highlights and private image isolation');
  } finally {
    await React.act(async () => root.unmount());
    dom.window.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
