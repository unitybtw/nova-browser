/**
 * Clipboard and QR failure paths.
 *
 * Three defects shared one shape: an operation that can fail reported success,
 * or failed silently and left a permanent spinner.
 *
 *  1. AccountModal.handleCopyCode called `navigator.clipboard.writeText(code)`
 *     fire-and-forget and flipped the button to "Copied" regardless. It copies a
 *     sync code — a secret — and navigator.clipboard rejects outright in an
 *     insecure context. It now branches on the real `copyTextToClipboard`, which
 *     resolves true only on a confirmed write, and shows the code for manual
 *     copying when it is false.
 *  2. ErrorBoundary did the same thing with the error text, with no feedback at
 *     all: in an insecure context it was an unhandled promise rejection.
 *  3. ShareModal only console.error'd a QR encoder rejection, so `qrCodeDataUrl`
 *     stayed '' and the modal showed its `animate-pulse` placeholder — captioned
 *     "Scan with mobile phone" — forever.
 *
 * These assertions drive the real helpers and the real component (rendered in
 * jsdom), including a genuine qrcode rejection from a payload past the encoder
 * capacity rather than a stubbed one.
 */

import { createRequire } from 'node:module';
import { join } from 'node:path';
import { copyTextToClipboard } from '../src/utils/clipboard';

// jsdom is loaded at runtime rather than imported: it resolves its own default
// stylesheet relative to its installed directory, and inlining it into the
// esbuild test bundle breaks that path.
const nodeRequire = createRequire(join(process.cwd(), 'noop.js'));
const { JSDOM } = nodeRequire('jsdom') as typeof import('jsdom');

console.log('--- Clipboard & QR failure paths ---');
let passed = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { passed++; console.log(`[PASS] [Clipboard-QR] ${name}`); }
  else { console.log(`[FAIL] [Clipboard-QR] ${name} ${extra}`); process.exitCode = 1; }
}

// Some of these globals are getter-only in Node (navigator), so they have to be
// redefined rather than assigned.
function setGlobal(key: string, value: unknown) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}

// --- copyTextToClipboard: the boolean the callers now branch on -----------
// AccountModal and ErrorBoundary both show a *failure* message when this
// resolves false, so false must mean "nothing was copied" — never a silent true.
async function clipboardSuite() {
  const g = globalThis as any;
  const realNavigator = Object.getOwnPropertyDescriptor(g, 'navigator');
  const realDocument = Object.getOwnPropertyDescriptor(g, 'document');

  const restore = () => {
    if (realNavigator) Object.defineProperty(g, 'navigator', realNavigator);
    else delete g.navigator;
    if (realDocument) Object.defineProperty(g, 'document', realDocument);
    else delete g.document;
  };

  const setGlobals = (nav: any, doc: any) => {
    setGlobal('navigator', nav);
    setGlobal('document', doc);
  };

  // 1. A confirmed modern write is the only thing that reports success.
  const written: string[] = [];
  setGlobals({ clipboard: { writeText: async (t: string) => { written.push(t); } } }, undefined);
  check('a successful writeText resolves true', (await copyTextToClipboard('nova-secret-code')) === true);
  check('the text actually reached the clipboard', written[0] === 'nova-secret-code', `=> ${written[0]}`);

  // 2. The insecure-context case that AccountModal regressed on: writeText
  //    exists but throws. The helper must fall through to execCommand.
  const execCalls: string[] = [];
  const fakeDoc = (execResult: boolean) => ({
    createElement: () => ({
      value: '',
      style: {},
      setAttribute() {},
      select() {},
    }),
    body: { appendChild() {}, removeChild() {} },
    execCommand: (cmd: string) => { execCalls.push(cmd); return execResult; },
  });
  setGlobals(
    { clipboard: { writeText: async () => { throw new Error('NotAllowedError'); } } },
    fakeDoc(true)
  );
  check('a rejecting writeText falls back to execCommand', (await copyTextToClipboard('code')) === true);
  check('the fallback really ran execCommand("copy")', execCalls[0] === 'copy', `=> ${execCalls[0]}`);

  // 3. Both paths fail: the caller must be able to tell the user.
  setGlobals({ clipboard: { writeText: async () => { throw new Error('NotAllowedError'); } } }, fakeDoc(false));
  check('a failed fallback resolves false, not a silent true', (await copyTextToClipboard('code')) === false);

  // 4. No clipboard API at all (the http/file case), execCommand unavailable.
  setGlobals({}, {});
  check('a missing clipboard API and no execCommand resolves false', (await copyTextToClipboard('code')) === false);

  // 5. Nothing to copy.
  setGlobals({ clipboard: { writeText: async () => { written.push('should-not-happen'); } } }, undefined);
  check('an empty string resolves false without calling the clipboard', (await copyTextToClipboard('')) === false);
  check('an empty string never reached the clipboard', written.length === 1, `=> ${written.join(',')}`);

  restore();
}

// --- the real QR encoder --------------------------------------------------
// A payload past the QR capacity makes the real `qrcode` encoder reject; no stub
// involved, so this is the production failure mode.
async function qrSuite(generateQrDataUrl: (url: string) => Promise<string | null>) {
  const ok = await generateQrDataUrl('https://example.com/some/page');
  check('a normal URL encodes to a PNG data URL', typeof ok === 'string' && ok.startsWith('data:image/png;base64,'), `=> ${String(ok).slice(0, 40)}`);

  // console.error is expected here; silence it so the suite output stays clean.
  const realError = console.error;
  console.error = () => {};
  let tooBig: string | null | undefined;
  try {
    tooBig = await generateQrDataUrl('x'.repeat(5000));
  } finally {
    console.error = realError;
  }
  check('an over-capacity payload yields null instead of a data URL', tooBig === null, `=> ${String(tooBig).slice(0, 40)}`);
}

// --- the real component ---------------------------------------------------
// Renders ShareModal for a URL the encoder cannot handle and asserts the modal
// says so. Reverting to console.error-only puts the pulsing "Scan with mobile
// phone" placeholder back, which is exactly what these assertions forbid.
async function renderSuite() {
  const g = globalThis as any;
  const keys = [
    'window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event',
    'MouseEvent', 'KeyboardEvent', 'CustomEvent', 'MutationObserver', 'getComputedStyle',
    'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'DOMParser',
    'HTMLImageElement', 'HTMLTextAreaElement', 'HTMLButtonElement', 'HTMLAnchorElement',
    'IS_REACT_ACT_ENVIRONMENT',
  ] as const;
  const saved = new Map<string, PropertyDescriptor | undefined>();
  for (const k of keys) saved.set(k, Object.getOwnPropertyDescriptor(g, k));

  // pretendToBeVisual gives jsdom a real requestAnimationFrame. A hand-rolled
  // setTimeout-based one turns framer-motion's frame loop into an endless chain
  // of 0ms timers, which starves the rest of the suite instead of exiting.
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'https://example.com/',
    pretendToBeVisual: true,
  });
  const w = dom.window as any;
  setGlobal('window', w);
  setGlobal('document', w.document);
  setGlobal('navigator', w.navigator);
  setGlobal('HTMLElement', w.HTMLElement);
  setGlobal('Element', w.Element);
  setGlobal('Node', w.Node);
  setGlobal('Event', w.Event);
  setGlobal('MouseEvent', w.MouseEvent);
  setGlobal('KeyboardEvent', w.KeyboardEvent);
  setGlobal('CustomEvent', w.CustomEvent);
  setGlobal('MutationObserver', w.MutationObserver);
  setGlobal('getComputedStyle', w.getComputedStyle.bind(w));
  setGlobal('requestAnimationFrame', w.requestAnimationFrame.bind(w));
  setGlobal('cancelAnimationFrame', w.cancelAnimationFrame.bind(w));
  setGlobal('DOMParser', w.DOMParser);
  setGlobal('HTMLImageElement', w.HTMLImageElement);
  setGlobal('HTMLTextAreaElement', w.HTMLTextAreaElement);
  setGlobal('HTMLButtonElement', w.HTMLButtonElement);
  setGlobal('HTMLAnchorElement', w.HTMLAnchorElement);
  if (!w.matchMedia) {
    w.matchMedia = () => ({
      matches: false, media: '', onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
    });
  }
  setGlobal('matchMedia', w.matchMedia);
  setGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  // The focus trap focuses the close button on mount, and jsdom's focus() defers
  // a selection fixup through setTimeout(0) that outlives the window and keeps
  // node's event loop alive. Nothing here is testing focus.
  w.HTMLElement.prototype.focus = () => {};

  const realError = console.error;
  console.error = () => {};
  try {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    // react-dom/test-utils' act, not React.act: it is the one that completes
    // here. Its deprecation notice is a console.error, silenced above.
    const { act } = await import('react-dom/test-utils');
    const { ShareModal } = await import('../src/components/ShareModal');

    const render = async (url: string) => {
      const container = w.document.createElement('div');
      w.document.body.appendChild(container);
      const root = createRoot(container);
      await act(async () => {
        root.render(React.createElement(ShareModal, { isOpen: true, onClose: () => {}, url, title: 'A Page' }));
      });
      // Let the encoder's promise settle through the effect.
      await act(async () => { await new Promise(r => setTimeout(r, 30)); });
      const html = container.innerHTML;
      await act(async () => { root.unmount(); });
      container.remove();
      return html;
    };

    // Failure: the encoder rejects for this payload.
    const failedHtml = await render('x'.repeat(5000));
    check(
      'a failed QR generation shows a real error message',
      failedHtml.includes('QR code could not be generated'),
      failedHtml.slice(0, 200)
    );
    check(
      'a failed QR generation stops claiming the phone can scan it',
      !failedHtml.includes('Scan with mobile phone')
    );
    check('a failed QR generation has no eternal placeholder', !failedHtml.includes('animate-pulse'));
    check('a failed QR generation still offers the raw link', failedHtml.includes('Copy Page Link'));

    // Success path must be untouched.
    const okHtml = await render('https://example.com/ok');
    check('a successful QR generation renders the image', okHtml.includes('data:image/png;base64,'), okHtml.slice(0, 200));
    check('a successful QR generation keeps the scan caption', okHtml.includes('Scan with mobile phone'));
    check('a successful QR generation shows no error', !okHtml.includes('QR code could not be generated'));
  } finally {
    console.error = realError;
    for (const [k, desc] of saved) {
      if (desc) Object.defineProperty(g, k, desc);
      else delete g[k];
    }
    dom.window.close();
  }
}

/**
 * A MessageChannel that delivers through the microtask queue instead of a real
 * port. React's `act` builds one per call and never closes the ports, and
 * framer-motion's frame loop keeps one open; in node an open MessagePort is a
 * live libuv handle, so without this the test process never exits. Behaviourally
 * it is the same contract: postMessage delivers to the peer's onmessage
 * asynchronously.
 */
function installStubMessageChannel() {
  class StubPort {
    onmessage: ((ev: { data: unknown }) => void) | null = null;
    peer: StubPort | null = null;
    postMessage(data: unknown) {
      const target = this.peer;
      if (target && target.onmessage) queueMicrotask(() => target.onmessage!({ data }));
    }
    close() { this.peer = null; this.onmessage = null; }
    start() {}
  }
  class StubMessageChannel {
    port1 = new StubPort();
    port2 = new StubPort();
    constructor() {
      this.port1.peer = this.port2;
      this.port2.peer = this.port1;
    }
  }
  setGlobal('MessageChannel', StubMessageChannel);
}

(async () => {
  // setImmediate, not a plain await: this suite temporarily installs
  // window/document globals for the render, and the check phase runs after every
  // other suite's promise chain has already settled.
  await new Promise<void>(resolve => setImmediate(resolve));
  // Before the ShareModal import, so framer-motion picks the stub up.
  installStubMessageChannel();
  const realMessageChannel = Object.getOwnPropertyDescriptor(globalThis, 'MessageChannel');
  const realError = console.error;
  try {
    console.error = () => {};
    const { generateQrDataUrl } = await import('../src/components/ShareModal');
    await clipboardSuite();
    await qrSuite(generateQrDataUrl);
    console.error = realError;
    await renderSuite();
  } finally {
    console.error = realError;
    if (realMessageChannel) Object.defineProperty(globalThis, 'MessageChannel', realMessageChannel);
  }
  console.log(`\n${passed} clipboard/QR checks passed\n`);
})().catch(err => {
  console.error('[FAIL] [Clipboard-QR] suite crashed:', err);
  process.exit(1);
});
