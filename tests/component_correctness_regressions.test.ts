/**
 * Correctness regressions in the components this agent owns.
 *
 * Each block below drives the REAL exported production function. Nothing here
 * re-implements the logic under test — where the behaviour used to live inside a
 * closure it was lifted to module scope in the component and imported, so a
 * change that breaks the fix breaks this suite. The only static reads are for
 * two defects whose whole shape is "which props is this `useEffect` keyed on"
 * and "is there a `return` before this component's first hook", which no pure
 * function can express.
 *
 * The defects, in the order they bit:
 *
 *  1. `BrowserView`'s hand-rolled memo comparator ignored every callback prop.
 *     `onExportData`/`onPerformSync` close over the app's data rows, so a
 *     bookmark deleted in another tab gave them a new identity, the comparator
 *     bailed, and the Settings tab kept pre-deletion closures. "Sync Now" then
 *     wrote the deleted bookmark back and republished it to every device.
 *  2. Speed dials were edited by array position captured in another tab, which
 *     silently appended a phantom shortcut — or built a sparse array whose hole
 *     serialised to `null` and crashed the new tab into the ErrorBoundary.
 *  3. The tab context menu re-focused item 1 on every parent render, so
 *     ArrowDown x3 + Enter ran the wrong action.
 *  4. `SidePanel`'s model switch had no cancellation, so a superseded attempt
 *     cleared the progress card of the download that replaced it.
 *  5. `ReaderMode` never reset highlights on an article change, so article A's
 *     highlights were written into article B's storage key.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  browserViewPropsEqual,
  isAutofillLookupCurrent,
  type BrowserViewProps,
} from '../src/components/BrowserView';
import {
  parseSpeedDials,
  isRenderableSpeedDial,
  updateSpeedDial,
  removeSpeedDial,
  addSpeedDial,
  formatWallpaperCreditTitle,
  formatWallpaperCreditAuthor,
  type SpeedDial,
} from '../src/components/NewTabPage';
import { resolveMenuFocusIndex } from '../src/components/TabContextMenu';
import { beginModelRequest, isCurrentModelRequest } from '../src/components/SidePanel';
import {
  loadArticleHighlights,
  highlightsStorageKey,
  type HighlightData,
} from '../src/components/ReaderMode';

async function main() {
  console.log('--- Component correctness regressions ---');
  let passed = 0;
  function check(name: string, cond: boolean, extra = '') {
    if (cond) { passed++; console.log(`[PASS] [CompFix] ${name}`); }
    else { console.error(`[FAIL] [CompFix] ${name} ${extra}`); process.exitCode = 1; }
  }

  const SRC = path.resolve(process.cwd(), 'src');
  const readSrc = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');
  /** Structural checks must see code only: a comment naming the old bug would
   *  otherwise satisfy — or defeat — the assertion. */
  const readCode = (rel: string) =>
    readSrc(rel)
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

  // =========================================================================
  // 1. BrowserView memo comparator
  // =========================================================================
  console.log('--- 1. BrowserView memo comparator ---');

  const noop = () => {};
  const settings = { fontSize: 'medium' } as any;
  const webTab = { id: 't1', url: 'https://example.com/', title: 'Example' } as any;
  const settingsTab = { id: 't2', url: 'nova://settings', title: 'Settings' } as any;

  const base = (over: Partial<BrowserViewProps> = {}): BrowserViewProps => ({
    tab: webTab,
    isActive: true,
    onUpdateTab: noop,
    onCloseTab: noop,
    isIncognito: false,
    settings,
    ...over,
  });

  check('an unchanged web tab is skipped', browserViewPropsEqual(base(), base()) === true);
  check('a changed title is a change', browserViewPropsEqual(base(), base({ tab: { ...webTab, title: 'Other' } })) === false);
  check('losing active focus is a change', browserViewPropsEqual(base(), base({ isActive: false })) === false);

  // --- the regression: a data edit re-identifies the sync/export closures ------
  {
    const prev = base({
      tab: settingsTab,
      onPerformSync: async () => {},
      onExportData: () => {},
    });
    // `bookmarkRows` changed in the parent, so both callbacks got new identities.
    const next = base({
      tab: settingsTab,
      onPerformSync: async () => {},
      onExportData: () => {},
    });
    check('a new onPerformSync on a settings tab re-renders (was: stale sync resurrects deleted rows)',
      browserViewPropsEqual(prev, next) === false);
    check('a new onExportData on a settings tab re-renders (was: backup missing recent changes)',
      (() => {
        const a = base({ tab: settingsTab, onExportData: () => {} });
        const b = base({ tab: settingsTab, onExportData: () => {} });
        return browserViewPropsEqual(a, b) === false;
      })());
  }

  // --- every callback the component actually hands to a child is covered -------
  {
    const SETTINGS_CALLBACKS: Array<keyof BrowserViewProps> = [
      'onUpdateSettings', 'onExportData', 'onImportData', 'onPurgeMemory', 'onPerformSync',
    ];
    const WEBVIEW_CALLBACKS: Array<keyof BrowserViewProps> = [
      'onUpdateTab', 'onNewTab', 'onNavigate', 'onActivate', 'onFoundInPage',
    ];
    const uncovered: string[] = [];
    for (const key of [...SETTINGS_CALLBACKS, ...WEBVIEW_CALLBACKS]) {
      const a = base({ tab: settingsTab, [key]: (() => {}) as any });
      const b = base({ tab: settingsTab, [key]: (() => {}) as any });
      if (browserViewPropsEqual(a, b) !== false) uncovered.push(String(key));
    }
    check('every callback prop is compared, so none can go stale', uncovered.length === 0, uncovered.join(', '));
  }

  // --- the memo's intent survives: unrelated data must not re-render a web tab --
  // `onPurgeMemory` closes over `activeTabId` in useTabOperations, so comparing it
  // on a web tab would re-render every tab on every tab switch.
  {
    const prev = base({
      tab: webTab,
      onPerformSync: async () => {},
      onExportData: () => {},
      onPurgeMemory: async () => {},
    });
    const next = base({
      tab: webTab,
      onPerformSync: async () => {},
      onExportData: () => {},
      onPurgeMemory: async () => {},
    });
    check('a web tab still skips a re-render when only settings-page callbacks change',
      browserViewPropsEqual(prev, next) === true);
  }

  // --- page-scoped data -------------------------------------------------------
  {
    const historyA: any[] = [{ id: 'h1' }];
    const prevH = base({ tab: { ...webTab, url: 'nova://history' }, history: historyA, onClearHistory: noop, onRemoveHistoryItem: noop });
    const nextH = base({ tab: { ...webTab, url: 'nova://history' }, history: [...historyA], onClearHistory: noop, onRemoveHistoryItem: noop });
    check('a new history array re-renders the history tab', browserViewPropsEqual(prevH, nextH) === false);

    const prevD = base({ tab: { ...webTab, url: 'nova://downloads' }, downloads: [{ id: 'd1' }] as any, onClearDownloads: noop });
    const nextD = base({ tab: { ...webTab, url: 'nova://downloads' }, downloads: [{ id: 'd1' }] as any, onClearDownloads: noop });
    check('a new downloads array re-renders the downloads tab', browserViewPropsEqual(prevD, nextD) === false);

    const prevW = base({ tab: webTab, history: historyA, downloads: [{ id: 'd1' }] as any });
    const nextW = base({ tab: webTab, history: [...historyA], downloads: [{ id: 'd1' }] as any });
    check('a web tab is not re-rendered by history/downloads churn', browserViewPropsEqual(prevW, nextW) === true);
  }

  // --- settings: a new object is a change for an internal page, not a web tab ---
  {
    const prevI = base({ tab: { ...webTab, url: 'nova://newtab' }, settings: { ...settings } });
    const nextI = base({ tab: { ...webTab, url: 'nova://newtab' }, settings: { ...settings } });
    check('a new settings object re-renders an internal page', browserViewPropsEqual(prevI, nextI) === false);

    const prevF = base({ tab: { ...webTab, url: 'https://a.test' }, settings: { ...settings, fontSize: 'medium' } });
    const nextF = base({ tab: { ...webTab, url: 'https://a.test' }, settings: { ...settings, fontSize: 'large' } });
    check('a field a web tab reads (fontSize) re-renders it', browserViewPropsEqual(prevF, nextF) === false);

    const prevZ = base({ tab: { ...webTab, url: 'https://a.test' }, settings: { ...settings, passwordManagerEnabled: false } });
    const nextZ = base({ tab: { ...webTab, url: 'https://a.test' }, settings: { ...settings, passwordManagerEnabled: true } });
    check('a field a web tab reads via latestSettingsRef re-renders it', browserViewPropsEqual(prevZ, nextZ) === false);
  }

  // --- 1b. autofill lookup currency after the secure-store await --------------
  {
    const wv = { getURL: () => 'https://site-a.test/login', isDestroyed: () => false } as any;
    const other = { getURL: () => 'https://site-b.test/' } as any;
    const dead = { getURL: () => 'https://site-a.test/login', isDestroyed: () => true } as any;

    check('a lookup still on the queried host is applied',
      isAutofillLookupCurrent(wv, wv, 'site-a.test', 'site-a.test') === true);
    check('a lookup resolved after navigating to another host is dropped',
      isAutofillLookupCurrent(wv, wv, 'site-b.test', 'site-a.test') === false);
    check('a lookup resolved against a replaced webview is dropped',
      isAutofillLookupCurrent(other, wv, 'site-a.test', 'site-a.test') === false);
    check('a lookup resolved against a destroyed webview is dropped',
      isAutofillLookupCurrent(dead, dead, 'site-a.test', 'site-a.test') === false);
    check('an unresolvable current host is never treated as a match',
      isAutofillLookupCurrent(wv, wv, '', 'site-a.test') === false);
  }

  // =========================================================================
  // 2. Speed dials: stable ids instead of captured positions
  // =========================================================================
  console.log('--- 2. Speed dial identity ---');

  const dial = (id: string, name: string, url: string): SpeedDial => ({
    id, name, url, domain: new URL(url).hostname.replace(/^www\./, ''),
  });

  // --- legacy rows without an id get one, on read -----------------------------
  {
    const legacy = JSON.stringify([
      { name: 'Google', url: 'https://www.google.com', domain: 'google.com' },
      { name: 'GitHub', url: 'https://github.com', domain: 'github.com' },
    ]);
    const parsed = parseSpeedDials(legacy)!;
    check('a legacy list without ids still parses', parsed.length === 2);
    check('legacy rows are given a non-empty id',
      parsed.every(d => typeof d.id === 'string' && d.id.length > 0));
    check('migrated ids are unique', new Set(parsed.map(d => d.id)).size === 2);
    check('existing ids are preserved, not regenerated', (() => {
      const withIds = JSON.stringify([{ id: 'keep-me', name: 'A', url: 'https://a.test', domain: 'a.test' }]);
      return parseSpeedDials(withIds)![0].id === 'keep-me';
    })());
  }

  // --- the crash: a stored hole must not survive the read ---------------------
  {
    // Exactly what the old positional editor persisted: `updated[2] = …` on a
    // one-element array is sparse, and `JSON.stringify` writes the holes as null.
    const sparse = JSON.stringify([dial('a', 'A', 'https://a.test'), null, null]);
    const parsed = parseSpeedDials(sparse)!;
    check('a sparse list (holes serialised to null) loses exactly the holes', parsed.length === 1);
    check('the surviving row is renderable', isRenderableSpeedDial(parsed[0]));
    // And the crash itself: spreading it and iterating yields real `undefined`.
    let threw: string | null = null;
    try {
      const next = [...parsed];
      for (const row of next) {
        // `title={dial.name}` in the grid
        void (row as SpeedDial).name;
      }
    } catch (e) {
      threw = String(e);
    }
    check('iterating the repaired list never yields an undefined row', threw === null, threw ?? '');

    const allHoles = JSON.stringify([null, null, null]);
    check('a list of nothing but holes parses to empty', parseSpeedDials(allHoles)!.length === 0);
  }

  // --- the render guard ------------------------------------------------------
  {
    check('a well-formed row renders', isRenderableSpeedDial(dial('x', 'X', 'https://x.test')));
    check('undefined is not renderable', isRenderableSpeedDial(undefined) === false);
    check('null is not renderable', isRenderableSpeedDial(null) === false);
    check('a row with no id is not renderable', isRenderableSpeedDial({ name: 'N', url: 'https://n.test' }) === false);
    check('a row with a non-string name is not renderable', isRenderableSpeedDial({ id: 'a', name: 1, url: 'https://a.test' }) === false);
    check('a row with no url is not renderable', isRenderableSpeedDial({ id: 'a', name: 'A', url: '' }) === false);
  }

  // --- the wrong-row write ---------------------------------------------------
  {
    const list = [dial('d0', 'A', 'https://a.test'), dial('d1', 'B', 'https://b.test'), dial('d2', 'C', 'https://c.test')];

    const same = updateSpeedDial(list, 'd2', { name: 'C2', url: 'https://c2.test', domain: 'c2.test' });
    check('editing a present row keeps the list length', same!.length === 3);
    check('editing a present row keeps its position', same![2].id === 'd2');
    check('editing a present row preserves the id', same![2].id === 'd2' && same![2].name === 'C2');
    check('editing does not mutate the input', list[2].name === 'C');

    // Consequence A: another tab deleted index 0, so the held position 2 is now
    // past the end. Positionally that appends a third shortcut.
    const afterOneDelete = removeSpeedDial(list, 'd0');
    const survived = updateSpeedDial(afterOneDelete, 'd2', { name: 'C2', url: 'https://c2.test', domain: 'c2.test' });
    check('after another tab deletes an earlier row the edit still lands on the right row',
      survived !== null && survived.length === 2 && survived[1].name === 'C2' && survived[1].id === 'd2');
    check('after another tab deletes an earlier row nothing is appended',
      survived !== null && survived.length === 2);

    // Consequence B: the held row itself is deleted in another tab, and the
    // position it was opened with is now past the end. `updated[2] = …` on a
    // one-element array is sparse, and its holes serialise to `null`.
    const afterTwoDeletes = removeSpeedDial(removeSpeedDial(list, 'd0'), 'd2');
    const gone = updateSpeedDial(afterTwoDeletes, 'd2', { name: 'C2', url: 'https://c2.test', domain: 'c2.test' });
    check('editing a row deleted in another tab reports the row is gone', gone === null);
    check('a refused edit leaves the list untouched',
      afterTwoDeletes.length === 1 && afterTwoDeletes[0].id === 'd1');
    check('a refused edit cannot produce a sparse array',
      Object.keys(afterTwoDeletes).length === afterTwoDeletes.length &&
      afterTwoDeletes.every(row => row !== undefined));
    // The positional write this replaces, for the record: it appended a phantom
    // shortcut when the row survived, and built a hole when it did not.
    const positional = [...afterTwoDeletes];
    positional[2] = { name: 'C2', url: 'https://c2.test', domain: 'c2.test' };
    check('the positional write this replaces really did corrupt the list',
      positional.length === 3 && positional[1] === undefined && Object.keys(positional).length === 2);
    check('...and the hole reaches localStorage as null',
      JSON.parse(JSON.stringify(positional))[1] === null);
  }

  // --- add / remove ----------------------------------------------------------
  {
    const list = [dial('d0', 'A', 'https://a.test')];
    const added = addSpeedDial(list, { name: 'B', url: 'https://b.test', domain: 'b.test' });
    check('add appends one row', added.length === 2);
    check('add gives the new row its own id', added[1].id !== 'd0' && added[1].id.length > 0);
    check('add never collides with an existing id', new Set(added.map(d => d.id)).size === 2);
    check('add leaves the input alone', list.length === 1);
    check('remove by id drops exactly that row',
      removeSpeedDial(added, 'd0').map(d => d.id).join() === added[1].id);
    check('removing a missing id is a no-op', removeSpeedDial(added, 'nope').length === 2);
  }

  // --- the crash, end to end ------------------------------------------------
  // The old editor's `updated[2] = ...` on a one-element array produced a SPARSE
  // array. `map` skips holes, so nothing rendered; but the next Add spread it,
  // and a spread of a hole yields a REAL `undefined`, which turns the array dense
  // again and makes `title={dial.name}` throw into the ErrorBoundary. Two
  // independent layers have to hold: the editor cannot create the hole, and the
  // grid refuses to render a row it cannot use.
  {
    const gridRows = (list: SpeedDial[]) => list.filter(isRenderableSpeedDial);
    let threw: string | null = null;
    let names: string[] = [];
    try {
      // What the old positional editor persisted and the next Add then spread.
      const corrupt: SpeedDial[] = [dial('d0', 'A', 'https://a.test')];
      corrupt[2] = { ...dial('ghost', 'Ghost', 'https://g.test'), id: 'ghost' } as SpeedDial;
      delete corrupt[1];
      const withAdd = [...corrupt, dial('dNew', 'New', 'https://n.test')];
      names = gridRows(withAdd).map(r => r.name);
    } catch (e) {
      threw = String(e);
    }
    check('a spread hole never reaches the grid as an undefined row', threw === null, threw ?? '');
    check('the grid drops the unusable rows and keeps the real ones',
      names.join() === 'A,Ghost,New', names.join());

    // And no production writer can produce a hole in the first place.
    const dense = [dial('d0', 'A', 'https://a.test'), dial('d1', 'B', 'https://b.test')];
    for (const out of [
      updateSpeedDial(dense, 'd1', { name: 'B2', url: 'https://b2.test', domain: 'b2.test' })!,
      addSpeedDial(dense, { name: 'C', url: 'https://c.test', domain: 'c.test' }),
      removeSpeedDial(dense, 'd0'),
    ]) {
      if (Object.keys(out).length !== out.length || out.some(r => r === undefined)) {
        check('no production speed-dial writer can produce a sparse array', false, JSON.stringify(out));
        break;
      }
    }
    check('no production speed-dial writer can produce a sparse array', true);
  }

  // --- the component's save path, not just the helper ------------------------
  // The defect lived in `handleAddSpeedDial`, not in a helper: it took the
  // position the modal was opened with and assigned into it. A test that only
  // drove `updateSpeedDial` would keep passing after that came back, so the
  // wiring is asserted too.
  {
    const code = readCode('components/NewTabPage.tsx');
    check('the open editor is keyed by dial id, never by position',
      /id: string \| null/.test(code) && !/editingDial\.index/.test(code));
    check('the save path resolves the row by id through updateSpeedDial',
      /updateSpeedDial\(speedDials, editingDial\.id,/.test(code));
    // `updateSpeedDial` indexes internally (after `findIndex` resolved the id);
    // what must not come back is an index handed in from the open editor.
    const savePath = code.slice(code.indexOf('const handleAddSpeedDial'), code.indexOf('const handleSpeedDialClick'));
    check('the save handler holds no positional dial assignment',
      savePath.length > 0 && !/\w+\[\s*\w*\s*\]\s*=/.test(savePath) && !/editingDial\.index/.test(savePath));
    check('the save handler refuses to persist when the row is gone',
      /if \(!updated\)/.test(savePath));
    check('the grid is filtered through the render guard',
      /speedDials\.filter\(isRenderableSpeedDial\)/.test(code));
    check('the grid is keyed on dial.id, not on name+url+position',
      /key=\{dial\.id\}/.test(code));
    check('delete resolves by id too', /removeSpeedDial\(speedDials, id\)/.test(code));
  }

  // --- 2b. the wallpaper credit helpers the daily-wallpaper suite duplicated ---
  {
    check('credit title extracts the category',
      formatWallpaperCreditTitle('4K Desktop Wallpaper (anime)') === 'Anime');
    check('credit title strips a 4K suffix',
      formatWallpaperCreditTitle('Alpine Lake & Mountain Panorama 4K') === 'Alpine Lake & Mountain Panorama');
    check('credit title strips a 4K UHD suffix',
      formatWallpaperCreditTitle('Mount Fuji & Spring Blossom 4K UHD') === 'Mount Fuji & Spring Blossom');
    check('credit author strips the curated suffix',
      formatWallpaperCreditAuthor('Wallhaven 4K Curated') === 'Wallhaven');
    check('a plain author is untouched',
      formatWallpaperCreditAuthor('Luca Bravo') === 'Luca Bravo');
    check('an empty title stays empty rather than throwing', formatWallpaperCreditTitle('') === '');
    check('a fully-decorated title falls back to the original',
      formatWallpaperCreditTitle('4K 4K') === '4K 4K');
  }

  // =========================================================================
  // 3. Tab context menu keyboard focus
  // =========================================================================
  console.log('--- 3. Tab context menu focus ---');

  {
    const n = 6;
    check('ArrowDown from nothing lands on the first item', resolveMenuFocusIndex('ArrowDown', n, -1) === 0);
    check('ArrowDown advances', resolveMenuFocusIndex('ArrowDown', n, 0) === 1);
    check('ArrowDown wraps at the end', resolveMenuFocusIndex('ArrowDown', n, n - 1) === 0);
    check('ArrowUp from nothing lands on the last item', resolveMenuFocusIndex('ArrowUp', n, -1) === n - 1);
    check('ArrowUp goes back', resolveMenuFocusIndex('ArrowUp', n, 3) === 2);
    check('ArrowUp wraps at the start', resolveMenuFocusIndex('ArrowUp', n, 0) === n - 1);
    check('ArrowDown three times from the initial focus reaches item 3',
      [0, 1, 2, 3].reduce((i) => resolveMenuFocusIndex('ArrowDown', n, i)!, -1) === 3);
    check('Home goes to the first item', resolveMenuFocusIndex('Home', n, 4) === 0);
    check('End goes to the last item', resolveMenuFocusIndex('End', n, 0) === n - 1);
    check('an unhandled key moves nothing', resolveMenuFocusIndex('a', n, 2) === null);
    check('Escape is not a focus key', resolveMenuFocusIndex('Escape', n, 2) === null);
    check('an empty menu moves nothing', resolveMenuFocusIndex('ArrowDown', 0, -1) === null);
  }

  // The defect itself is structural: the listener effect was keyed on `onClose`,
  // a fresh arrow on every parent render, so it re-focused item 1 constantly.
  {
    const src = readCode('components/TabContextMenu.tsx');
    const effectBlocks = [...src.matchAll(/useEffect\(\(\)\s*=>\s*\{([\s\S]*?)\n\s*\}, \[([^\]]*)\]\);/g)];
    const depLists = effectBlocks.map(m => m[2].trim());
    const listenerEffect = effectBlocks.find(m => m[1].includes("addEventListener('keydown'"));
    check('there is a window keydown listener effect to inspect', !!listenerEffect);
    check('the keydown listener effect is keyed on isOpen alone, not on onClose',
      !!listenerEffect && !/onClose/.test(listenerEffect[2]), listenerEffect ? listenerEffect[2] : 'not found');
    check('onClose is read through a ref so its identity cannot re-run the effect',
      /onCloseRef\.current\(\)/.test(src) && /useRef\(onClose\)/.test(src));
    check('initial focus has its own [isOpen] effect that cancels its frame',
      /cancelAnimationFrame/.test(src) &&
      /querySelector<HTMLButtonElement>\('\[role="menuitem"\]'\)\?\.focus\(\)/.test(src));
    check('Copy page link goes through the crash-safe clipboard helper',
      /copyTextToClipboard\(/.test(src) && !/navigator\.clipboard/.test(src));
    void depLists;
  }

  // =========================================================================
  // 4. SidePanel model-switch cancellation
  // =========================================================================
  console.log('--- 4. SidePanel model switch cancellation ---');

  {
    const ref = { current: 0 };
    const first = beginModelRequest(ref);
    check('the first attempt owns token 1', first === 1 && isCurrentModelRequest(ref, first));

    // `setModel` for C unloads the worker, so B's `init` rejects from here on.
    const second = beginModelRequest(ref);
    check('the superseding attempt takes a fresh token', second === 2);
    check('the superseded attempt is no longer current', isCurrentModelRequest(ref, first) === false);
    check('the newest attempt is current', isCurrentModelRequest(ref, second) === true);
    check('a stale token never becomes current again', isCurrentModelRequest(ref, first) === false);

    // The exact reported sequence: B (2GB) then C before B finishes.
    const third = beginModelRequest(ref);
    check('three overlapping attempts all but the last are stale',
      !isCurrentModelRequest(ref, first) && !isCurrentModelRequest(ref, second) && isCurrentModelRequest(ref, third));
  }
  {
    // Wiring, not just the helper: both load paths must gate every state write.
    const src = readCode('components/SidePanel.tsx');
    for (const fn of ['handleInit', 'handleSelectModel']) {
      const start = src.indexOf(`const ${fn} = useCallback`);
      check(`${fn} exists`, start > -1);
      if (start === -1) continue;
      const body = src.slice(start, src.indexOf('}, [', start));
      check(`${fn} claims a token before any await`, /beginModelRequest\(modelRequestIdRef\)/.test(body));
      check(`${fn} clears isInitializing only while current`,
        /finally\s*\{\s*if \(isCurrentModelRequest\(modelRequestIdRef, modelRequestId\)\) setIsInitializing\(false\);/.test(body));
      check(`${fn} marks ready only while current`,
        /if \(!isCurrentModelRequest\(modelRequestIdRef, modelRequestId\)\) return;\s*setIsReady\(true\);/.test(body));
      check(`${fn} drops a superseded rejection`, /catch \(err: any\) \{\s*if \(!isCurrentModelRequest\(modelRequestIdRef, modelRequestId\)\) return;/.test(body));
    }
  }

  // =========================================================================
  // 5. ReaderMode highlight reset + cancellation
  // =========================================================================
  console.log('--- 5. ReaderMode highlight generations ---');

  {
    const stored = JSON.stringify([
      { id: 'h1', text: 'alpha', color: '#ff0', note: 'a', path: '', offset: 0 },
    ]);

    // A thenable that settles on the spot, so every assertion below runs in one
    // synchronous pass. The production code only uses `.then(...).catch(...)`,
    // which is exactly the surface exercised here; the app passes a real IPC
    // promise and takes the identical path.
    const syncRead = (value: string | null) => (_key: string) => ({
      then(onOk: (v: string | null | undefined) => void) {
        onOk(value);
        return { catch: () => {} };
      },
    });

    // A controllable clock, so "the pending marker injection is cancelled" is
    // observable without waiting for a real timer.
    const clock = () => {
      const pending: Array<() => void> = [];
      return {
        setTimer: (fn: () => void) => { pending.push(fn); return pending.length - 1; },
        clearTimer: (handle: unknown) => { pending[handle as number] = () => {}; },
        run: () => { const queued = pending.splice(0); queued.forEach(fn => fn()); },
        get size() { return pending.length; },
      };
    };

    check('the storage key is the url under a safe base64',
      highlightsStorageKey('https://a.test/').startsWith('reader_highlights_'));
    check('two urls get two keys', highlightsStorageKey('https://a.test/') !== highlightsStorageKey('https://b.test/'));

    // (a) no saved highlights -> state must still be reset. The old effect had no
    // `else`, so article A's rows stayed and the next save wrote them under B.
    {
      let resets = 0;
      const applied: HighlightData[][] = [];
      loadArticleHighlights({
        url: 'https://b.test/',
        read: syncRead(null),
        onReset: () => { resets++; },
        onApply: h => applied.push(h),
        onInject: () => {},
      });
      check('an article with no saved highlights still resets state', resets === 1);
      check('an article with no saved highlights applies nothing', applied.length === 0);
    }

    // (b) highlights present -> applied, and a marker injection is scheduled.
    {
      const t = clock();
      let applied: HighlightData[] = [];
      loadArticleHighlights({
        url: 'https://a.test/',
        read: syncRead(stored),
        onReset: () => {},
        onApply: h => { applied = h; },
        onInject: () => {},
        setTimer: t.setTimer,
        clearTimer: t.clearTimer,
      });
      check('a stored highlight list is applied', applied.length === 1 && applied[0].text === 'alpha');
      check('a loaded article schedules its marker injection', t.size === 1);
      t.run();
    }

    // (c) corrupted storage must not install a non-array.
    {
      let applied: unknown = 'untouched';
      loadArticleHighlights({
        url: 'https://c.test/',
        read: syncRead('{"not":"an array"}'),
        onReset: () => {},
        onApply: h => { applied = h; },
        onInject: () => {},
      });
      check('a non-array stored payload is refused, not installed', applied === 'untouched');
    }
    {
      let applied: unknown = 'untouched';
      loadArticleHighlights({
        url: 'https://c.test/',
        read: syncRead('{ not json'),
        onReset: () => {},
        onApply: h => { applied = h; },
        onInject: () => {},
      });
      check('unparseable storage is refused, not installed', applied === 'untouched');
    }

    // (d) THE REGRESSION: a slow read for article A must not resolve after the
    // reader has moved to article B. `read` returns a thenable whose settlement
    // the test controls, which is what makes the race observable.
    {
      const t = clock();
      let settleA: (() => void) | null = null;
      const readA = (_key: string) => ({
        then(onOk: (v: string | null | undefined) => void) {
          settleA = () => { onOk(stored); return { catch: () => {} }; };
          return { catch: () => {} };
        },
      });

      const applied: string[] = [];
      const injected: string[] = [];

      // Article A loads; the read is still in flight.
      const cancelA = loadArticleHighlights({
        url: 'https://a.test/',
        read: readA,
        onReset: () => {},
        onApply: h => applied.push(...h.map(x => x.id)),
        onInject: h => injected.push(...h.map(x => x.id)),
        setTimer: t.setTimer,
        clearTimer: t.clearTimer,
      });
      // Reader navigated to B; A's effect cleaned up.
      cancelA();
      // B has no saved highlights.
      loadArticleHighlights({
        url: 'https://b.test/',
        read: syncRead(null),
        onReset: () => {},
        onApply: h => applied.push(...h.map(x => x.id)),
        onInject: h => injected.push(...h.map(x => x.id)),
        setTimer: t.setTimer,
        clearTimer: t.clearTimer,
      });
      // A's read finally resolves — far too late.
      settleA!();
      t.run();

      check('a cancelled generation never applies its highlights', applied.length === 0, JSON.stringify(applied));
      check('a cancelled generation never injects <mark> elements', injected.length === 0, JSON.stringify(injected));
    }

    // (e) the pending <mark> injection is cancelled, not just the apply.
    {
      const t = clock();
      let injected = 0;
      const cancel = loadArticleHighlights({
        url: 'https://a.test/',
        read: syncRead(stored),
        onReset: () => {},
        onApply: () => {},
        onInject: () => { injected++; },
        setTimer: t.setTimer,
        clearTimer: t.clearTimer,
      });
      check('the injection is pending before cancel', t.size === 1);
      cancel();
      t.run();
      check('a pending marker injection is cleared on cancel', injected === 0);
    }

    // (f) markers still run when nothing cancels.
    {
      const t = clock();
      let injected = 0;
      loadArticleHighlights({
        url: 'https://a.test/',
        read: syncRead(stored),
        onReset: () => {},
        onApply: () => {},
        onInject: () => { injected++; },
        setTimer: t.setTimer,
        clearTimer: t.clearTimer,
      });
      t.run();
      check('an uncancelled load still injects its markers', injected === 1);
    }

    // (g) a rejected read must not throw out of the effect.
    {
      let threw = false;
      try {
        loadArticleHighlights({
          url: 'https://a.test/',
          read: () => ({
            // A real `.then` hands a failing chain to `.catch`; the handler
            // swallows the rejection, exactly as a rejected IPC read would.
            then: () => ({ catch: (onErr: () => void) => { onErr(); return {}; } }),
          }),
          onReset: () => {},
          onApply: () => {},
          onInject: () => {},
        });
      } catch { threw = true; }
      check('a failing secure-store read surfaces nothing to the caller', threw === false);
    }

    // (h) the default clock is the real timer, so the app path is unchanged.
    {
      const src = readCode('components/ReaderMode.tsx');
      check('the default schedule/unschedule are the real timer',
        /setTimer \?\? \(\(fn: \(\) => void, ms: number\) => setTimeout\(fn, ms\)\)/.test(src) &&
        /clearTimer \?\? \(\(handle: unknown\) => clearTimeout\(/.test(src));
    }
  }

  // =========================================================================
  // 6. TopBar: no conditional hook in MemoizedTabItem, no dead imports
  // =========================================================================
  console.log('--- 6. TopBar dead branch and dead imports ---');

  {
    const src = readCode('components/TopBar.tsx');
    const start = src.indexOf('const MemoizedTabItem = React.memo(');
    check('MemoizedTabItem exists', start > -1);
    if (start > -1) {
      const body = src.slice(start, src.indexOf('\n});', start));
      const firstHook = body.search(/\buse(Memo|Callback|Ref|State|Effect)\s*\(/);
      const firstReturn = body.search(/^\s*return\b/m);
      check('MemoizedTabItem has a hook to protect', firstHook > -1);
      check('MemoizedTabItem has no return before its first hook',
        firstReturn === -1 || firstHook < firstReturn, `return@${firstReturn} hook@${firstHook}`);
      check('the dead isSplitChild prop is gone entirely', !/isSplitChild/.test(src));
    }
    for (const dead of ['SiteInfoPopover', 'getUrlSecurityInfo', 'PermissionPromptPopover', 'PageTranslatePopover']) {
      check(`TopBar no longer imports ${dead}`, !new RegExp(`^import .*\\b${dead}\\b`, 'm').test(src));
    }
    check('OmniboxBar is still re-exported from TopBar', /export \{ OmniboxBar \}/.test(src));
  }

  console.log(`\n${passed} component correctness regression checks passed\n`);
}

void main();
