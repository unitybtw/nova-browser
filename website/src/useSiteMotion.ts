import { useEffect } from 'react'

export function useSiteMotion() {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal], .shutter'))
    if (targets.length === 0) return

    const revealAll = () => {
      for (const el of targets) {
        el.classList.add('is-in')
      }
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches || typeof IntersectionObserver === 'undefined') {
      revealAll()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }
    )

    const viewportH = window.innerHeight || 900
    for (const el of targets) {
      const rect = el.getBoundingClientRect()
      if (rect.top < viewportH * 0.96) {
        el.classList.add('is-in')
      } else {
        observer.observe(el)
      }
    }

    const onReducedChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        revealAll()
        observer.disconnect()
      }
    }

    reduced.addEventListener('change', onReducedChange)

    return () => {
      observer.disconnect()
      reduced.removeEventListener('change', onReducedChange)
    }
  }, [])
}
