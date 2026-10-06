import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowDown, ArrowDownRight, ArrowRight, ArrowUpRight, Code2, Command, Download, Github, Globe2, Layers3, LockKeyhole, Menu, Monitor, Play, Plus, Puzzle, ShieldCheck, Sparkles, Terminal, X } from 'lucide-react'
import { copy } from './content'
import { useSiteMotion } from './useSiteMotion'

const REPO = 'https://github.com/unitybtw/nova-browser'
const RELEASE = `${REPO}/releases/download/v1.5.0/`
const platforms = [
  { name: 'macOS', icon: Command, choices: [{ name: 'Apple Silicon', file: 'Nova-Browser-arm64.dmg', type: '.dmg' }, { name: 'Intel', file: 'Nova-Browser-x64.dmg', type: '.dmg' }] },
  { name: 'Windows', icon: Monitor, choices: [{ name: 'Windows x64', file: 'Nova-Browser-Setup-1.5.0-x64.exe', type: '.exe' }] },
  { name: 'Linux', icon: Terminal, choices: [{ name: 'AppImage · x64', file: 'Nova-Browser-x86_64.AppImage', type: '.AppImage' }, { name: 'Debian / Ubuntu', file: 'Nova-Browser-amd64.deb', type: '.deb' }] },
]

export default function App() {
  useSiteMotion()
  const [lang, setLang] = useState<'en' | 'tr'>(() => { try { return localStorage.getItem('nova-language') === 'tr' ? 'tr' : 'en' } catch { return 'en' } })
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [platform, setPlatform] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const t = copy[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = lang === 'en' ? 'Nova — A little more space.' : 'Nova — Biraz daha alan.'
    try { localStorage.setItem('nova-language', lang) } catch { /* Storage may be disabled. */ }
  }, [lang])

  useEffect(() => {
    const onEscape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [])

  function openVideo() { dialog.current?.showModal(); document.body.style.overflow = 'hidden' }
  function closeVideo() { dialog.current?.close(); video.current?.pause(); document.body.style.overflow = '' }
  function moveTab(event: KeyboardEvent<HTMLButtonElement>, group: 'tour' | 'platform', current: number) {
    let next = current
    if (event.key === 'ArrowRight') next = (current + 1) % 3
    else if (event.key === 'ArrowLeft') next = (current + 2) % 3
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = 2
    else return
    event.preventDefault()
    if (group === 'tour') setActiveTab(next); else setPlatform(next)
    document.getElementById(`${group}-tab-${next}`)?.focus()
  }

  return <>
    <a className="skip-link" href="#main">{t.skip}</a>
    <header className="site-header">
      <div className="nav-wrap container">
        <a href="#" className="brand" aria-label="Nova home"><img src="/images/nova-icon.svg" width="34" height="34" alt="" /><span>nova<span className="brand-period">.</span></span></a>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} id="main-navigation" aria-label={lang === 'en' ? 'Main navigation' : 'Ana menü'}>
          {['experience', 'features', 'open-source'].map((id, i) => <a href={`#${id}`} key={id} onClick={() => setMenuOpen(false)}>{t.nav[i]}</a>)}
        </nav>
        <div className="nav-actions">
          <button className="language-button" onClick={() => setLang(lang === 'en' ? 'tr' : 'en')} aria-label={t.language}><Globe2 size={15} /><span>{lang.toUpperCase()}</span></button>
          <a className="button button-small button-dark" href="#download">{t.get}<ArrowDown size={15} /></a>
          <button className="menu-button icon-button" aria-label={menuOpen ? t.close : t.menu} aria-controls="main-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </div>
    </header>

    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy container">
          <a className="release-note" href={`${REPO}/releases/tag/v1.5.0`} target="_blank" rel="noopener noreferrer"><span className="status-dot" />Nova 1.5<span className="release-divider" />{lang === 'en' ? 'A fresh perspective' : 'Yeni bir bakış açısı'}<ArrowUpRight size={13} /></a>
          <h1 id="hero-title"><span className="hero-line"><span>{t.hero[0]}</span></span><span className="hero-line"><span>{t.hero[1]}</span></span></h1>
          <p className="hero-intro">{t.intro}</p>
          <div className="hero-actions"><a href="#download" className="button button-blue">{t.download}<ArrowDown size={18} /></a><button className="watch-button" onClick={openVideo}><span className="play-icon"><Play size={11} fill="currentColor" /></span>{t.watch}</button></div>
          <p className="availability"><span className="tiny-platforms"><Command /><Monitor /><Terminal /></span>{t.available}</p>
        </div>
        <div className="hero-stage">
          <div className="landscape" aria-hidden="true" />
          <div className="hero-product"><img src="/images/newtab.png" alt={t.screenshot} width="2880" height="1800" fetchPriority="high" /><div className="image-shine" aria-hidden="true" /></div>
          <div className="stage-caption"><span className="little-star">✦</span>{t.note}<span className="caption-line" /></div>
        </div>
      </section>

      <div className="principles container">{[ShieldCheck, Layers3, Code2].map((Icon, i) => <div key={i}><Icon size={18} strokeWidth={1.5} /><span>{t.principles[i]}</span></div>)}</div>

      <section className="experience section container" id="experience" aria-labelledby="experience-title">
        <div className="section-heading"><h2 id="experience-title">{t.experienceTitle[0]}<br /><span>{t.experienceTitle[1]}</span></h2><p>{t.experienceText}</p></div>
        <div className="tour-tabs" data-active={activeTab} role="tablist" aria-label={t.nav[0]}>{t.tabs.map((title, i) => { const Icon = [Layers3, Sparkles, Monitor][i]; return <button key={title} id={`tour-tab-${i}`} role="tab" aria-selected={activeTab === i} aria-controls={`tour-panel-${i}`} tabIndex={activeTab === i ? 0 : -1} onClick={() => setActiveTab(i)} onKeyDown={e => moveTab(e, 'tour', i)}><Icon size={17} />{title}<span className="tab-index">0{i + 1}</span></button> })}</div>
        <div className={`tour-panel tour-panel-${activeTab}`} id={`tour-panel-${activeTab}`} role="tabpanel" aria-labelledby={`tour-tab-${activeTab}`} tabIndex={0}>
          <div className="tour-copy" key={`copy-${activeTab}`}><span className="tour-number">0{activeTab + 1} / 03</span><h3>{t.tabTitles[activeTab]}</h3><p>{t.tabText[activeTab]}</p><span className="tour-detail">{t.tabDetails[activeTab]}</span><ArrowDownRight className="tour-arrow" size={38} strokeWidth={1} /></div>
          <div className="tour-image-wrap" key={`image-${activeTab}`}><div className={`tour-media media-${activeTab}`}><img className={`tour-image image-${activeTab}`} src={['/images/newtab-current.jpg', '/images/assistant-current.jpg', '/images/sync.png'][activeTab]} alt={t.tabAlt[activeTab]} width={activeTab === 2 ? 2880 : 1280} height={activeTab === 2 ? 1800 : 720} loading="lazy" /></div></div>
        </div>
        <p className="screenshot-caption">{t.previewCaption}</p>
      </section>

      <section className="features section container" id="features" aria-labelledby="features-title">
        <div className="section-heading"><h2 id="features-title">{t.personalTitle[0]}<br /><span>{t.personalTitle[1]}</span></h2><p>{t.personalText}</p></div>
        <div className="feature-grid">
          <article className="privacy-feature">
            <div className="privacy-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /><span className="orbit-dot dot-three" /><div className="shield-emblem"><ShieldCheck size={67} strokeWidth={1.25} /></div><div className="protected-pill"><span className="status-dot" />{lang === 'en' ? 'A little peace of mind' : 'Biraz daha iç rahatlığı'}</div></div>
            <div className="feature-copy"><h3>{t.privacyTitle}</h3><p>{t.privacyText}</p><a className="text-link" href={`${REPO}#security--privacy-commitment`} target="_blank" rel="noopener noreferrer">{t.privacyLink}<ArrowUpRight size={17} /></a></div>
          </article>
          <article className="ai-feature">
            <div className="ai-art" aria-hidden="true"><div className="ai-light" /><div className="ai-chip"><div className="chip-label">NOVA</div><Sparkles size={45} strokeWidth={1.2} /><div className="chip-bottom">LOCAL AI</div></div><div className="ai-art-label"><LockKeyhole size={12} />{lang === 'en' ? 'On your device. In your flow.' : 'Cihazında. Akışında.'}</div></div>
            <div className="feature-copy"><h3>{t.aiTitle}</h3><p>{t.aiText}</p><span className="feature-note">{t.aiNote}</span></div>
          </article>
        </div>
        <div className="small-features">{[Puzzle, Layers3, Terminal].map((Icon, i) => <article key={i}><Icon size={24} strokeWidth={1.4} /><h3>{t.detailTitles[i]}</h3><p>{t.detailTexts[i]}</p></article>)}</div>
      </section>

      <section className="open-source" id="open-source" aria-labelledby="source-title"><div className="container source-inner"><div className="source-symbol" aria-hidden="true"><span>{'{'}</span><img src="/images/nova-mark.svg" alt="" width="120" height="120" /><span>{'}'}</span></div><div className="source-copy"><h2 id="source-title">{t.sourceTitle[0]}<br /><span>{t.sourceTitle[1]}</span></h2><p>{t.sourceText}</p><a className="button button-dark" href={REPO} target="_blank" rel="noopener noreferrer"><Github size={18} />{t.sourceLink}<ArrowUpRight size={16} /></a><span className="source-note">{t.sourceNote}</span></div></div></section>

      <section className="faq section container" aria-labelledby="faq-title"><h2 id="faq-title">{t.faqTitle}</h2><div className="faq-list">{t.faq.map(([q, a], i) => <details key={i} name="nova-faq"><summary>{q}<Plus size={19} /></summary><p>{a}</p></details>)}</div></section>

      <section className="download-section container" id="download" aria-labelledby="download-title"><div className="download-heading"><img src="/images/nova-icon.svg" width="64" height="64" alt="" /><h2 id="download-title">{t.downloadTitle[0]}<br /><span>{t.downloadTitle[1]}</span></h2><p>{t.downloadText}</p></div><div className="download-picker"><div className="download-picker-header"><span>{t.installer}</span><span className="version-label"><span className="status-dot" />v1.5.0</span></div><div className="platform-tabs" role="tablist" aria-label={t.installer}>{platforms.map(({ name, icon: Icon }, i) => <button key={name} id={`platform-tab-${i}`} role="tab" aria-selected={platform === i} aria-controls={`platform-panel-${i}`} tabIndex={platform === i ? 0 : -1} onClick={() => setPlatform(i)} onKeyDown={e => moveTab(e, 'platform', i)}><Icon size={20} />{name}</button>)}</div><div id={`platform-panel-${platform}`} role="tabpanel" aria-labelledby={`platform-tab-${platform}`} className="platform-files"><span className="platform-file-list" key={platform}>{platforms[platform].choices.map(choice => <a key={choice.file} className="download-file" href={`${RELEASE}${choice.file}`}><span><strong>{choice.name}</strong><small>{choice.type}</small></span><Download size={18} aria-label={t.download} /></a>)}</span></div><a className="all-releases" href={`${REPO}/releases/latest`} target="_blank" rel="noopener noreferrer">{t.allReleases}<ArrowUpRight size={14} /></a><p className="desktop-note">{t.desktopNote}</p></div></section>
    </main>

    <footer className="footer container"><div className="footer-top"><p>{t.footerLine}</p><nav aria-label="Footer">{[REPO, `${REPO}/releases`, `${REPO}/issues`].map((url, i) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">{t.footerLinks[i]}<ArrowUpRight size={14} /></a>)}</nav></div><div className="footer-wordmark" aria-hidden="true">nova<span>✦</span></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Nova Browser</span><span>{t.footerBottom}</span><a href="#" aria-label={lang === 'en' ? 'Back to top' : 'Başa dön'}>{lang === 'en' ? 'Back to top' : 'Başa dön'}<ArrowRight size={15} /></a></div></footer>

    <dialog ref={dialog} className="video-dialog" aria-labelledby="video-title" aria-describedby="video-description" onCancel={closeVideo} onClose={() => { video.current?.pause(); document.body.style.overflow = '' }} onClick={e => { if (e.target === e.currentTarget) closeVideo() }}><div className="video-dialog-inner"><div className="video-heading"><h2 id="video-title">{t.videoTitle}</h2><button className="icon-button" onClick={closeVideo} aria-label={t.close} autoFocus><X size={21} /></button></div><video ref={video} src="/images/nova-tour.mp4" poster="/images/nova-tour.poster.jpg" controls playsInline preload="none"><track key={lang} kind="captions" src={`/images/nova-tour.${lang}.vtt`} srcLang={lang} label={lang === 'en' ? 'English' : 'Türkçe'} default={lang === 'tr'} /></video><p id="video-description">{t.videoDescription}</p></div></dialog>
  </>
}
