import { type CSSProperties, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Play } from 'lucide-react'
import { STUDIO_SCENARIOS, type SiteCopy, type StudioSurface } from '../content'

interface LiveStudioProps {
  t: SiteCopy
  activeTab: number
  onSelectTab: (index: number) => void
  onWatchFilm: () => void
  onMoveTab: (event: KeyboardEvent<HTMLButtonElement>, current: number) => void
}

function buildDemoUrl(tabIndex: number, surface: StudioSurface): string {
  const scenario = STUDIO_SCENARIOS[tabIndex] ?? STUDIO_SCENARIOS[0]
  return `/browser-demo/index.html?demo=true&feature=${scenario.feature}&tabs=${scenario.tabs}&theme=${surface}&bg=clean`
}

export function LiveStudio({ t, activeTab, onSelectTab, onWatchFilm, onMoveTab }: LiveStudioProps) {
  const [surface, setSurface] = useState<StudioSurface>('dark')
  const surfaceRef = useRef<StudioSurface>('dark')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [demoUrl, setDemoUrl] = useState(() => buildDemoUrl(activeTab, 'dark'))

  const scenario = STUDIO_SCENARIOS[activeTab] ?? STUDIO_SCENARIOS[0]

  useEffect(() => {
    surfaceRef.current = surface
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'NOVA_THEME_CHANGE', theme: surface },
        window.location.origin
      )
    } catch {
      /* Ignore if iframe window is not yet initialized. */
    }
  }, [surface])

  useEffect(() => {
    setDemoUrl(buildDemoUrl(activeTab, surfaceRef.current))
  }, [activeTab])

  function handleIframeLoad() {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'NOVA_THEME_CHANGE', theme: surfaceRef.current },
        window.location.origin
      )
    } catch {
      /* Same-origin sync best effort. */
    }
  }

  return (
    <section className="band band--light studio-section" id="studio" aria-label={t.studioSectionLabel}>
      <div className="container studio-stack">
        <div className="studio-top">
          <div className="studio-heading-col">
            <div
              className="studio-tabs"
              role="tablist"
              aria-label={t.studioSectionLabel}
              data-reveal
              style={{ '--d': '0ms' } as CSSProperties}
            >
              {t.studioTabs.map((label, i) => (
                <button
                  key={STUDIO_SCENARIOS[i].id}
                  id={`tour-tab-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === i}
                  aria-controls="tour-panel"
                  tabIndex={activeTab === i ? 0 : -1}
                  className={`studio-tab ${activeTab === i ? 'is-active' : ''}`}
                  onClick={() => onSelectTab(i)}
                  onKeyDown={(event) => onMoveTab(event, i)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              id="tour-panel"
              role="tabpanel"
              aria-labelledby={`tour-tab-${activeTab}`}
              tabIndex={0}
              className="studio-copy-block"
              data-reveal
              style={{ '--d': '70ms' } as CSSProperties}
            >
              <h2 className="studio-title">{t.studioTabTitles[activeTab]}</h2>
              <p className="studio-description">{t.studioTabDescriptions[activeTab]}</p>
            </div>
          </div>

          <div className="studio-toolbar-col" data-reveal style={{ '--d': '120ms' } as CSSProperties}>
            <div className="control-group">
              <span className="control-label">{t.studioSurfaceLabel}</span>
              <div className="control-row" role="group" aria-label={t.studioSurfaceLabel}>
                {(['dark', 'light'] as StudioSurface[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`control-chip ${surface === mode ? 'is-active' : ''}`}
                    aria-pressed={surface === mode}
                    onClick={() => setSurface(mode)}
                  >
                    {t.studioSurfaces[mode]}
                  </button>
                ))}
              </div>
            </div>

            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="studio-open-link"
            >
              <span>{t.studioOpenFull}</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div
          className={`live-browser-shell live-browser-shell--${surface}`}
          data-ui
          data-scenario={scenario.id}
          data-surface={surface}
        >
          <iframe
            ref={iframeRef}
            src={demoUrl}
            title={`${t.studioIframeTitle}: ${t.studioTabs[activeTab]}`}
            className="live-browser-frame"
            allow="clipboard-read; clipboard-write"
            onLoad={handleIframeLoad}
          />
        </div>

        <div className="studio-bottom" data-reveal style={{ '--d': '180ms' } as CSSProperties}>
          <p className="studio-caption">{t.studioCaption}</p>
          <div className="studio-actions">
            <a href="#download" className="action-cell action-cell--primary">
              <span>{t.studioPrimaryAction}</span>
              <ArrowDown size={18} aria-hidden="true" />
            </a>
            <button type="button" className="action-cell action-cell--secondary" onClick={onWatchFilm}>
              <span>{t.studioSecondaryAction}</span>
              <Play size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
