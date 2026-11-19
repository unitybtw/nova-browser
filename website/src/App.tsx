import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import { ArrowDown, ArrowUp, ArrowUpRight, Globe2, Menu, Pause, Play, X } from 'lucide-react'
import { copy, PLATFORMS, REPO_URL, type Lang } from './content'
import { LiveStudio } from './components/LiveStudio'
import { FeatureProofs } from './components/FeatureProofs'
import { DownloadPicker } from './components/DownloadPicker'
import { VideoDialog } from './components/VideoDialog'
import { useSiteMotion } from './useSiteMotion'

const NAV_ANCHORS = ['studio', 'capabilities', 'open-source', 'faq'] as const

export default function App() {
  useSiteMotion()

  const [lang, setLang] = useState<Lang>(() => {
    try {
      return localStorage.getItem('nova-language') === 'tr' ? 'tr' : 'en'
    } catch {
      return 'en'
    }
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [platform, setPlatform] = useState(0)
  const [heroPaused, setHeroPaused] = useState(false)

  const headerRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const lastDialogTriggerRef = useRef<HTMLElement | null>(null)

  const t = copy[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t.docTitle
    try {
      localStorage.setItem('nova-language', lang)
    } catch {
      /* Storage may be disabled in private contexts. */
    }
  }, [lang, t.docTitle])

  // Sync hero preview loop with reduced motion and pause toggle (WCAG 2.2.2)
  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    const syncPlayback = () => {
      if (reduced.matches || heroPaused) {
        video.pause()
      } else {
        const playResult = video.play?.()
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => {})
        }
      }
    }

    syncPlayback()
    reduced.addEventListener('change', syncPlayback)
    return () => {
      reduced.removeEventListener('change', syncPlayback)
    }
  }, [heroPaused])

  // Accessible mobile drawer dismiss behavior
  useEffect(() => {
    if (!menuOpen) return
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    const desktop = window.matchMedia('(min-width: 820px)')
    const onDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false)
    }

    window.addEventListener('keydown', onEscape)
    document.addEventListener('pointerdown', onOutside)
    desktop.addEventListener('change', onDesktop)
    return () => {
      window.removeEventListener('keydown', onEscape)
      document.removeEventListener('pointerdown', onOutside)
      desktop.removeEventListener('change', onDesktop)
    }
  }, [menuOpen])

  function openVideo(trigger?: HTMLElement | null) {
    if (!dialogRef.current || dialogRef.current.open) return
    setMenuOpen(false)
    lastDialogTriggerRef.current = trigger || (document.activeElement as HTMLElement | null)
    dialogRef.current.showModal()
  }

  function handleVideoClosed() {
    lastDialogTriggerRef.current?.focus()
    lastDialogTriggerRef.current = null
  }

  function goToTop(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    setMenuOpen(false)
    document.getElementById('main')?.focus({ preventScroll: true })
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, group: 'tour' | 'platform', current: number) {
    const count = group === 'tour' ? 3 : PLATFORMS.length
    let next = current
    if (event.key === 'ArrowRight') next = (current + 1) % count
    else if (event.key === 'ArrowLeft') next = (current + count - 1) % count
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = count - 1
    else return
    event.preventDefault()
    if (group === 'tour') setActiveTab(next)
    else setPlatform(next)
    document.getElementById(`${group}-tab-${next}`)?.focus()
  }

  return (
    <>
      <a className="skip-link" href="#main">{t.skip}</a>

      <header ref={headerRef} className="site-header">
        <div className="container nav-bar">
          <a href="#main" onClick={goToTop} className="brand" aria-label={t.homeLabel}>
            <img src="/images/nova-icon.svg" width="28" height="28" alt="" />
            <span>nova<span className="brand-dot">.</span></span>
          </a>

          <nav
            id="main-navigation"
            className={`main-nav ${menuOpen ? 'is-open' : ''}`}
            aria-label={t.navLabel}
          >
            {NAV_ANCHORS.map((id, index) => (
              <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>
                {t.nav[index]}
              </a>
            ))}
            <a
              href="#download"
              className="mobile-menu-cta"
              onClick={() => setMenuOpen(false)}
            >
              <span>{t.get}</span>
              <ArrowDown size={15} aria-hidden="true" />
            </a>
          </nav>

          <div className="nav-actions">
            <button
              type="button"
              className="lang-switch"
              onClick={() => setLang(lang === 'en' ? 'tr' : 'en')}
              aria-label={t.languageLabel}
            >
              <Globe2 size={15} aria-hidden="true" />
              <span>{lang.toUpperCase()}</span>
            </button>

            <a className="btn btn--small btn--cobalt nav-cta" href="#download">
              <span>{t.get}</span>
            </a>

            <button
              ref={menuButtonRef}
              type="button"
              className="menu-button"
              aria-label={menuOpen ? t.menuClose : t.menuOpen}
              aria-controls="main-navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        {/* Hero: Photograph for a letter (Obsidian dark opening) */}
        <section className="band band--dark hero-section" aria-labelledby="hero-title">
          <div className="container hero-inner">
            <div className="hero-monument-wrap">
              <h1 id="hero-title" className="hero-monument" data-rise style={{ '--i': 0 } as CSSProperties}>
                <span className="sr-only">Nova</span>
                <span className="monument-glyph" aria-hidden="true">N</span>
                <span className="hero-aperture shutter" aria-hidden="true">
                  <img
                    className="aperture-poster"
                    src="/images/hero-loop.jpg"
                    alt={t.heroVideoAlt}
                    width="1280"
                    height="800"
                    fetchPriority="high"
                  />
                  <video
                    ref={heroVideoRef}
                    className={`aperture-video ${heroPaused ? 'is-paused' : ''}`}
                    src="/images/hero-loop.webm"
                    poster="/images/hero-loop.jpg"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    width="1280"
                    height="800"
                    aria-hidden="true"
                  />
                </span>
                <span className="monument-glyph" aria-hidden="true">VA</span>
              </h1>
            </div>

            <div className="hero-bottom">
              <div className="hero-meta-col" data-rise style={{ '--i': 1 } as CSSProperties}>
                <p className="hero-meta">{t.heroMeta}</p>
                <button
                  type="button"
                  className="preview-toggle"
                  onClick={() => setHeroPaused((prev) => !prev)}
                >
                  {heroPaused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
                  <span>{heroPaused ? t.heroVideoPlay : t.heroVideoPause}</span>
                </button>
              </div>

              <p className="hero-intro" data-rise style={{ '--i': 2 } as CSSProperties}>
                {t.heroIntro}
              </p>

              <div className="hero-actions" data-rise style={{ '--i': 3 } as CSSProperties}>
                <a className="btn btn--cobalt hero-primary" href="#download">
                  <span>{t.download}</span>
                  <ArrowDown size={17} aria-hidden="true" />
                </a>
                <button
                  type="button"
                  className="text-action"
                  onClick={(event) => openVideo(event.currentTarget)}
                >
                  {t.watchFilm}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Interactive Live Browser Studio (Cool Stone light block) */}
        <LiveStudio
          t={t}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onWatchFilm={() => openVideo()}
          onMoveTab={(event, current) => moveTab(event, 'tour', current)}
        />

        {/* Section 2: Real Interface Proofs (Obsidian dark block) */}
        <FeatureProofs t={t} />

        {/* Section 3: Open Source Side Facts & Architecture (Cool Stone light block) */}
        <section className="band band--light about-section" id="open-source" aria-label={t.aboutLabel}>
          <div className="container about-layout">
            <div className="about-row">
              <dl className="about-facts" data-reveal style={{ '--d': '0ms' } as CSSProperties}>
                {t.aboutFacts.map(([label, value]) => (
                  <div key={label} className="fact-pair">
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="about-statement-col" data-reveal style={{ '--d': '90ms' } as CSSProperties}>
                <p className="about-statement">{t.aboutStatement}</p>
                <a
                  className="btn btn--ink about-btn"
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>{t.aboutAction}</span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="about-row about-row--specs">
              <div className="about-row-label" data-reveal style={{ '--d': '0ms' } as CSSProperties}>
                {t.aboutRowLabel}
              </div>

              <div className="about-specs-grid">
                <ul className="spec-col" data-reveal style={{ '--d': '80ms' } as CSSProperties}>
                  {t.aboutSpecsLeft.map(([name, detail]) => (
                    <li key={name}>
                      <span className="spec-name">{name}</span>
                      <span className="spec-val">{detail}</span>
                    </li>
                  ))}
                </ul>

                <ul className="spec-col" data-reveal style={{ '--d': '150ms' } as CSSProperties}>
                  {t.aboutSpecsRight.map(([name, detail]) => (
                    <li key={name}>
                      <span className="spec-name">{name}</span>
                      <span className="spec-val">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Wide Heading & Indented FAQ (Obsidian dark block) */}
        <section className="band band--dark faq-section" id="faq" aria-labelledby="faq-heading">
          <div className="container">
            <h2 id="faq-heading" className="faq-heading" data-reveal style={{ '--d': '0ms' } as CSSProperties}>
              {t.faqHeading}
            </h2>

            <div className="faq-list">
              {t.faq.map(([question, answer], idx) => (
                <details
                  key={question}
                  className="faq-item"
                  data-reveal
                  style={{ '--d': `${Math.min(idx * 55, 275)}ms` } as CSSProperties}
                >
                  <summary className="faq-summary">
                    <span>{question}</span>
                    <span className="faq-chevron" aria-hidden="true" />
                  </summary>
                  <p className="faq-answer">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: First Step Already Open — Official v1.5.2 Download (Electric Cobalt block) */}
        <DownloadPicker
          t={t}
          platform={platform}
          onSelectPlatform={setPlatform}
          onMoveTab={(event, current) => moveTab(event, 'platform', current)}
        />
      </main>

      {/* Section 6: Invitation over a Cropped Name (Obsidian dark footer) */}
      <footer className="band band--dark site-footer">
        <div className="container footer-top">
          <div className="footer-invite" data-reveal style={{ '--d': '0ms' } as CSSProperties}>
            <h2 className="footer-heading">
              <span>{t.footerInvitation[0]}</span>
              <span>{t.footerInvitation[1]}</span>
            </h2>
            <a
              className="btn btn--cobalt footer-cta"
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{t.footerAction}</span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>

          <nav className="footer-links" aria-label={t.footerNavLabel} data-reveal style={{ '--d': '90ms' } as CSSProperties}>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">{t.footerLinks[0]}</a>
            <a href={`${REPO_URL}/releases`} target="_blank" rel="noopener noreferrer">{t.footerLinks[1]}</a>
            <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">{t.footerLinks[2]}</a>
          </nav>
        </div>

        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Nova Browser</span>
          <span>{t.footerLicense}</span>
          <a href="#main" onClick={goToTop} className="back-to-top" aria-label={t.backToTop}>
            <span>{t.backToTop}</span>
            <ArrowUp size={15} aria-hidden="true" />
          </a>
        </div>

        <div className="footer-monument" aria-hidden="true" data-reveal style={{ '--d': '120ms' } as CSSProperties}>
          <span className="footer-wordmark">
            NOVA<span className="brand-dot">.</span>
          </span>
          <img className="footer-mark" src="/images/nova-mark.svg" alt="" width="220" height="220" loading="lazy" />
        </div>
      </footer>

      <VideoDialog dialogRef={dialogRef} lang={lang} t={t} onClosed={handleVideoClosed} />
    </>
  )
}
