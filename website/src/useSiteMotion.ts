import { useEffect } from 'react'

/** Bounded entrances and scroll continuity without a perpetual animation loop. */
export function useSiteMotion() {
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    let dispose = () => {}

    const configure = () => {
      dispose()
      const header = document.querySelector<HTMLElement>('.site-header')
      const stage = document.querySelector<HTMLElement>('.hero-stage')
      const product = document.querySelector<HTMLElement>('.hero-product')
      const sections = [...document.querySelectorAll<HTMLElement>('main > section[id]')]
      const links = [...document.querySelectorAll<HTMLAnchorElement>('.main-nav a')]
      let request = 0
      let pointerX = 0
      let pointerY = 0

      const update = () => {
        request = 0
        const distance = document.documentElement.scrollHeight - window.innerHeight
        header?.style.setProperty('--reading-progress', String(distance > 0 ? window.scrollY / distance : 0))
        header?.classList.toggle('is-scrolled', window.scrollY > 24)
        const active = [...sections].reverse().find(section => section.getBoundingClientRect().top <= 180)
        links.forEach(link => {
          if (link.classList.contains('mobile-menu-cta')) return
          if (link.hash === `#${active?.id}`) link.setAttribute('aria-current', 'location')
          else link.removeAttribute('aria-current')
        })
        if (preference.matches || !stage || !product || window.innerWidth < 768) return
        const bounds = stage.getBoundingClientRect()
        if (bounds.bottom < 0 || bounds.top > window.innerHeight) return
        const depth = Math.max(0, Math.min(1, -bounds.top / bounds.height))
        product.style.setProperty('--hero-angle', `${3 - depth * 3 + pointerY * .7}deg`)
        product.style.setProperty('--hero-shift', `${-depth * 24}px`)
        product.style.setProperty('--hero-rotate', `${pointerX * -.7}deg`)
      }

      const schedule = () => { if (!request) request = window.requestAnimationFrame(update) }
      const onPointer = (event: PointerEvent) => {
        if (preference.matches || !finePointer.matches || !stage) return
        const rect = stage.getBoundingClientRect()
        pointerX = (event.clientX - rect.left) / rect.width - .5
        pointerY = (event.clientY - rect.top) / rect.height - .5
        schedule()
      }
      const resetPointer = () => { pointerX = 0; pointerY = 0; schedule() }
      window.addEventListener('scroll', schedule, { passive: true })
      window.addEventListener('resize', schedule, { passive: true })
      stage?.addEventListener('pointermove', onPointer, { passive: true })
      stage?.addEventListener('pointerleave', resetPointer)
      const animations: Animation[] = []
      let observer: IntersectionObserver | undefined

      if (!preference.matches && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return
            observer?.unobserve(entry.target)
            const element = entry.target as HTMLElement
            element.dataset.motionVisible = 'true'
            if (typeof element.animate !== 'function') return
            animations.push(element.animate([
              { opacity: .35, transform: 'translateY(22px)', clipPath: 'inset(0 0 18% 0)' },
              { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0% 0)' },
            ], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' }))
          })
        }, { threshold: .18, rootMargin: '0px 0px -24px 0px' })
        document.querySelectorAll('.section-heading, .source-copy, .download-heading').forEach(element => observer?.observe(element))
      }

      update()
      dispose = () => {
        window.cancelAnimationFrame(request)
        observer?.disconnect()
        animations.forEach(animation => animation.cancel())
        window.removeEventListener('scroll', schedule)
        window.removeEventListener('resize', schedule)
        stage?.removeEventListener('pointermove', onPointer)
        stage?.removeEventListener('pointerleave', resetPointer)
        product?.style.removeProperty('--hero-angle')
        product?.style.removeProperty('--hero-shift')
        product?.style.removeProperty('--hero-rotate')
      }
    }

    configure()
    preference.addEventListener('change', configure)
    return () => { dispose(); preference.removeEventListener('change', configure) }
  }, [])
}
