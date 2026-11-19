import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../src/App'

async function run() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const w = dom.window
  Object.assign(globalThis, {
    window: w,
    document: w.document,
    localStorage: w.localStorage,
    Node: w.Node,
    HTMLElement: w.HTMLElement,
    HTMLDialogElement: w.HTMLDialogElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const mediaListeners = new Set<Function>()
  let reducedMotion = false
  let lastScroll: ScrollToOptions | undefined

  w.scrollTo = ((options: ScrollToOptions) => { lastScroll = options }) as any
  w.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion') && reducedMotion,
    media: query,
    addEventListener: (_: string, fn: Function) => {
      if (query.includes('min-width')) mediaListeners.add(fn)
    },
    removeEventListener: (_: string, fn: Function) => mediaListeners.delete(fn),
  })) as any
  w.requestAnimationFrame = (() => 1) as any
  w.cancelAnimationFrame = () => {}

  Object.defineProperty(w.HTMLDialogElement.prototype, 'showModal', {
    value() { this.open = true },
  })
  Object.defineProperty(w.HTMLDialogElement.prototype, 'close', {
    value() {
      this.open = false
      this.dispatchEvent(new w.Event('close'))
    },
  })

  let loads = 0
  let pauses = 0
  w.HTMLMediaElement.prototype.play = (() => Promise.resolve()) as any
  w.HTMLMediaElement.prototype.pause = () => { pauses++ }
  w.HTMLMediaElement.prototype.load = () => { loads++ }

  const root = createRoot(document.getElementById('root')!)
  await act(async () => root.render(<App />))

  const click = async (el: Element | null) => {
    assert.ok(el, 'Expected clickable element to exist')
    await act(async () => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })))
  }
  const buttonByText = (label: string) =>
    [...document.querySelectorAll('button')].find((el) => el.textContent?.trim() === label)!

  const assertAriaControls = () => {
    for (const el of document.querySelectorAll('[aria-controls]')) {
      const id = el.getAttribute('aria-controls')!
      assert.ok(document.getElementById(id), `Missing aria-controls target: ${id}`)
    }
  }
  assertAriaControls()

  // 1. Footer brand star mark & Back-to-top focus return + reduced-motion scroll behavior
  assert.ok(
    document.querySelector('.footer-monument img[src="/images/nova-mark.svg"]'),
    'Footer must render the Nova star mark alongside the monumental wordmark'
  )
  const toTop = document.querySelector('.back-to-top') as HTMLAnchorElement
  toTop.focus()
  reducedMotion = true
  await click(toTop)
  assert.ok(document.activeElement === document.querySelector('main'), 'Back to top must focus main')
  assert.equal(lastScroll?.behavior, 'auto', 'Reduced motion disables smooth scroll')
  reducedMotion = false
  await click(document.querySelector('.brand'))
  assert.equal(lastScroll?.behavior, 'smooth', 'Normal motion keeps smooth scroll')

  // 2. Hero monumental NOVA renders the new Nova brand mark as the letter O
  assert.ok(
    document.querySelector('#hero-title .hero-logo-glyph img[src="/images/nova-mark.svg"]'),
    'Hero monumental NOVA heading must render the Nova logo mark as the letter O'
  )

  // 3. Live Browser Studio preview pause/play control (WCAG 2.2.2)
  const pauseBtn = buttonByText('Pause preview')
  assert.ok(pauseBtn, 'Live Studio looping preview video must expose a Pause control')
  assert.equal(pauseBtn.getAttribute('aria-pressed'), null, 'Pause/Play button whose label changes must not set aria-pressed')
  const pausesBefore = pauses
  await click(pauseBtn)
  assert.equal(pauseBtn.textContent?.trim(), 'Play preview')
  assert.ok(pauses > pausesBefore, 'Clicking Pause preview must pause the live preview video')

  // 3. Live Browser Studio: layout, workspace, surface & keyboard ARIA tablist
  const browserUi = document.querySelector('[data-ui].studio-browser')!
  assert.equal(browserUi.getAttribute('data-layout'), 'vertical')
  await click(buttonByText('Compact'))
  assert.equal(browserUi.getAttribute('data-layout'), 'compact')
  await click(buttonByText('Below bar'))
  assert.equal(browserUi.getAttribute('data-layout'), 'below')
  await click(buttonByText('Light'))
  assert.equal(browserUi.getAttribute('data-surface'), 'light')
  await click(buttonByText('Work'))
  assert.equal(browserUi.getAttribute('data-workspace'), 'work')

  const tourTab = document.getElementById('tour-tab-0')!
  await act(async () => tourTab.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'End', bubbles: true })))
  assert.equal(document.activeElement?.id, 'tour-tab-2')
  assert.equal(document.getElementById('tour-panel')?.getAttribute('aria-labelledby'), 'tour-tab-2')
  assertAriaControls()

  // 4. Platform download picker: keyboard + official v1.5.2 release assets
  await click(document.getElementById('platform-tab-1'))
  const winLinks = [...document.querySelectorAll('.download-file')]
  assert.equal(winLinks.length, 2, 'Windows tab must show both Installer and Portable v1.5.2 downloads')
  assert.ok(winLinks[0].getAttribute('href')?.includes('/releases/download/v1.5.2/'))
  await click(document.getElementById('platform-tab-2'))
  const linuxLinks = [...document.querySelectorAll('.download-file')]
  assert.equal(linuxLinks.length, 2, 'Linux tab must show both AppImage and Debian downloads')
  assertAriaControls()

  // 5. Bilingual language switch (EN <-> TR)
  const langBtn = document.querySelector('.lang-switch')!
  await click(langBtn)
  assert.equal(document.documentElement.lang, 'tr')
  assert.ok(document.querySelector('#faq-heading')?.textContent?.includes('Merak edilenler'))
  await click(langBtn)
  assert.equal(document.documentElement.lang, 'en')

  // 6. Mobile drawer open, outside click, Escape focus return & desktop breakpoint close
  const menu = document.querySelector('.menu-button')!
  await click(menu)
  assert.equal(menu.getAttribute('aria-expanded'), 'true')
  const mobileCta = document.querySelector('.mobile-menu-cta')
  assert.ok(mobileCta && mobileCta.getAttribute('href') === '#download')
  await act(async () => document.querySelector('main')!.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true })))
  assert.equal(menu.getAttribute('aria-expanded'), 'false', 'Outside pointerdown dismisses mobile menu')
  await click(menu)
  await act(async () => w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  assert.equal(document.activeElement, menu, 'Escape returns focus to menu toggle button')
  await click(menu)
  await act(async () => mediaListeners.forEach((fn) => fn({ matches: true })))
  assert.equal(menu.getAttribute('aria-expanded'), 'false', 'Desktop breakpoint closes mobile menu')

  // 7. Native <dialog> video player (no body overflow lock, EN/TR tracks, retry recovery)
  const dialog = document.querySelector('dialog.video-dialog') as HTMLDialogElement
  assert.equal(dialog.getAttribute('role'), null, 'Native modal <dialog> must not set redundant role="dialog"')
  assert.equal(dialog.getAttribute('aria-modal'), null, 'Native modal <dialog> must not set redundant aria-modal')
  assert.equal(dialog.getAttribute('closedby'), 'any')
  document.body.style.overflow = 'clip'
  await click(buttonByText('Watch 36s film'))
  assert.equal(dialog.open, true)
  assert.equal(document.body.style.overflow, 'clip', 'Native modal <dialog> must not mutate body overflow')
  const video = dialog.querySelector('video')!
  const tracks = [...video.querySelectorAll('track')]
  assert.equal(tracks.length, 2, 'Film must provide English and Turkish WebVTT tracks')
  assert.equal(tracks[0].default, true)
  await act(async () => video.dispatchEvent(new w.Event('error')))
  assert.ok(dialog.querySelector('[role="alert"]'), 'Failed video must display recovery alert')
  await click(buttonByText('Retry video'))
  assert.equal(loads, 1)
  await click(dialog.querySelector('.dialog-close'))
  assert.equal(dialog.open, false)

  // 8. FAQ disclosures are non-exclusive native <details> with zero headings inside <summary>
  const faqDetails = [...document.querySelectorAll('.faq-item')]
  assert.equal(faqDetails.length, 6)
  for (const d of faqDetails) {
    assert.equal(d.getAttribute('name'), null, 'FAQ <details> should remain non-exclusive')
    assert.equal(d.querySelector('summary h1, summary h2, summary h3, summary h4'), null, 'No headings inside <summary>')
  }

  await act(async () => root.unmount())
  console.log('[PASS] Website regression suite passed: Live Studio, hero pause, ARIA tabs, bilingual switch, native dialog, FAQ, and mobile menu.')
  dom.window.close()
}

run().then(() => process.exit(0)).catch((error) => {
  console.error(error)
  process.exit(1)
})
