import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../src/App'

async function run() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const w = dom.window
  Object.assign(globalThis, { window: w, document: w.document, localStorage: w.localStorage, Node: w.Node, IS_REACT_ACT_ENVIRONMENT: true })
  const mediaListeners = new Set<Function>()
  w.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener: (_: string, fn: Function) => { if (query.includes('min-width')) mediaListeners.add(fn) }, removeEventListener: (_: string, fn: Function) => mediaListeners.delete(fn) })) as any
  w.requestAnimationFrame = (() => 1) as any
  w.cancelAnimationFrame = () => {}
  Object.defineProperty(w.HTMLDialogElement.prototype, 'showModal', { value() { this.open = true } })
  Object.defineProperty(w.HTMLDialogElement.prototype, 'close', { value() { this.open = false; this.dispatchEvent(new w.Event('close')) } })
  let loads = 0
  w.HTMLMediaElement.prototype.pause = () => {}
  w.HTMLMediaElement.prototype.load = () => { loads++ }
  const root = createRoot(document.getElementById('root')!)
  await act(async () => root.render(<App />))
  const click = async (el: Element | null) => { assert.ok(el); await act(async () => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }))) }
  const button = (label: string) => [...document.querySelectorAll('button')].find(el => el.textContent === label)!
  const references = () => {
    for (const el of document.querySelectorAll('[aria-controls]')) assert.ok(document.getElementById(el.getAttribute('aria-controls')!), `Missing panel: ${el.getAttribute('aria-controls')}`)
  }
  references()
  const tour = document.getElementById('tour-tab-0')!
  await act(async () => tour.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'End', bubbles: true })))
  assert.equal(document.activeElement?.id, 'tour-tab-2')
  assert.equal(document.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby'), 'tour-tab-2')
  references()
  await click(document.getElementById('platform-tab-1'))
  const downloadLinks = [...document.querySelectorAll('.download-file')]
  assert.equal(downloadLinks.length, 2, 'Windows platform must offer both Setup and Portable choices')
  await click(document.getElementById('platform-tab-2'))
  references()
  const menu = document.querySelector('.menu-button')!
  await click(menu)
  assert.equal(menu.getAttribute('aria-expanded'), 'true')
  const mobileCta = document.querySelector('.mobile-menu-cta')
  assert.ok(mobileCta, 'Mobile navigation menu must include a direct download CTA')
  assert.equal(mobileCta.getAttribute('href'), '#download')
  await act(async () => document.querySelector('main')!.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true })))
  assert.equal(menu.getAttribute('aria-expanded'), 'false', 'Outside click must dismiss the mobile menu')
  await click(menu)
  await act(async () => w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  assert.equal(document.activeElement, menu, 'Escape returns focus to the menu button')
  await click(menu)
  await act(async () => mediaListeners.forEach(fn => fn({ matches: true })))
  assert.equal(menu.getAttribute('aria-expanded'), 'false', 'Desktop breakpoint closes stale mobile navigation')
  document.body.style.overflow = 'clip'
  await click(button('Take a closer look'))
  const video = document.querySelector('video')!
  assert.equal(document.body.style.overflow, 'hidden')
  const tracks = [...document.querySelectorAll('track')]
  assert.equal(tracks.length, 2, 'Video must provide both English and Turkish caption tracks')
  assert.equal(tracks[0].default, true, 'English captions should be enabled by default')
  await act(async () => video.dispatchEvent(new w.Event('error')))
  assert.ok(document.querySelector('[role="alert"]'), 'Failed media needs a visible recovery state')
  await click(button('Retry video'))
  assert.equal(loads, 1)
  await click(document.querySelector('.video-heading button'))
  assert.equal(document.body.style.overflow, 'clip', 'Closing restores previous overflow')
  await click(button('Take a closer look'))
  await act(async () => root.unmount())
  assert.equal(document.body.style.overflow, 'clip', 'Unmount while open must release scroll lock')
  console.log('[PASS] Website tab references, keyboard navigation, mobile menu, captions, media recovery and scroll-lock cleanup.')
  dom.window.close()
}
run().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1) })
