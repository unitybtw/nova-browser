import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, Layers3, LockKeyhole, Pause, Play, RotateCw, ShieldCheck, Sparkles } from 'lucide-react'
import type { SiteCopy, StudioLayoutId, StudioSurface, StudioWorkspaceId } from '../content'

interface LiveStudioProps {
  t: SiteCopy
  activeTab: number
  onSelectTab: (index: number) => void
  onWatchFilm: () => void
  onMoveTab: (event: KeyboardEvent<HTMLButtonElement>, current: number) => void
}

const LAYOUT_IDS: StudioLayoutId[] = ['vertical', 'top', 'compact', 'below']
const WORKSPACE_IDS: StudioWorkspaceId[] = ['personal', 'work', 'research']

function resolveViewportMedia(
  activeTab: number,
  workspace: StudioWorkspaceId,
  surface: StudioSurface
): { src: string; width: number; height: number; position: string } {
  if (activeTab === 1) {
    return surface === 'dark'
      ? { src: '/images/studio-dark.png', width: 1440, height: 900, position: '50% 0%' }
      : { src: '/images/assistant-clean-light.jpg', width: 1440, height: 900, position: '50% 0%' }
  }
  if (activeTab === 2) {
    return { src: '/images/sync-clean-light.jpg', width: 512, height: 280, position: '50% 50%' }
  }
  if (workspace === 'research') {
    return { src: '/images/tour-poster.jpg', width: 1280, height: 800, position: '50% 0%' }
  }
  if (workspace === 'work') {
    return surface === 'dark'
      ? { src: '/images/studio-dark.png', width: 1440, height: 900, position: '50% 0%' }
      : { src: '/images/studio-layout.png', width: 1440, height: 900, position: '50% 0%' }
  }
  return surface === 'dark'
    ? { src: '/images/hero-loop.jpg', width: 1280, height: 800, position: '50% 42%' }
    : { src: '/images/newtab-clean-light.jpg', width: 1440, height: 900, position: '50% 42%' }
}

export function LiveStudio({ t, activeTab, onSelectTab, onWatchFilm, onMoveTab }: LiveStudioProps) {
  const [layout, setLayout] = useState<StudioLayoutId>('vertical')
  const [workspace, setWorkspace] = useState<StudioWorkspaceId>('personal')
  const [surface, setSurface] = useState<StudioSurface>('dark')
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState(0)
  const [previewPaused, setPreviewPaused] = useState(false)
  const previewVideoRef = useRef<HTMLVideoElement>(null)

  const ws = t.studioWorkspaces[workspace]
  const media = resolveViewportMedia(activeTab, workspace, surface)
  const showLiveVideo = activeTab === 0 && workspace === 'personal' && surface === 'dark'

  useEffect(() => {
    const video = previewVideoRef.current
    if (!video || !showLiveVideo) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    const syncPlayback = () => {
      if (reduced.matches || previewPaused) {
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
  }, [previewPaused, showLiveVideo])

  const renderTabStrip = (orientation: 'row' | 'column') => (
    <div className={`ui-tabs ui-tabs--${orientation}`}>
      {ws.tabs.map((tabName, idx) => (
        <button
          key={tabName}
          type="button"
          className={`ui-tab ${activeWorkspaceTab === idx ? 'is-active' : ''}`}
          onClick={() => setActiveWorkspaceTab(idx)}
        >
          <span className="ui-tab-dot" aria-hidden="true" />
          <span className="ui-tab-label">{tabName}</span>
        </button>
      ))}
    </div>
  )

  const renderAddressBar = (compact = false) => (
    <div className={`ui-toolbar ${compact ? 'ui-toolbar--compact' : ''}`}>
      <div className="ui-nav-btns" aria-hidden="true">
        <span><ArrowLeft size={13} /></span>
        <span><ArrowRight size={13} /></span>
        <span><RotateCw size={12} /></span>
      </div>
      {compact && (
        <div className="ui-inline-tabs">
          {renderTabStrip('row')}
        </div>
      )}
      <div className="ui-omnibox">
        <LockKeyhole size={12} aria-hidden="true" />
        <span className="ui-omnibox-url">{ws.url}</span>
      </div>
      <div className="ui-toolbar-pills" aria-hidden="true">
        <span className="ui-pill">
          <ShieldCheck size={12} />
          <span>{t.studioShieldLabel}</span>
        </span>
        <span className="ui-pill ui-pill--accent">
          <Sparkles size={12} />
          <span>{t.studioAiLabel}</span>
        </span>
      </div>
    </div>
  )

  return (
    <section className="band band--light studio-section" id="studio" aria-label={t.studioSectionLabel}>
      <div className="studio-split">
        <div className="studio-stage" data-reveal style={{ '--d': '0ms' } as React.CSSProperties}>
          <div
            className={`studio-browser studio-browser--${surface} studio-browser--${layout}`}
            data-ui
            data-layout={layout}
            data-surface={surface}
            data-workspace={workspace}
          >
            <div className="ui-titlebar">
              <div className="ui-traffic" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="ui-workspace-switcher" role="group" aria-label={t.studioWorkspaceLabel}>
                {WORKSPACE_IDS.map((wsId) => (
                  <button
                    key={wsId}
                    type="button"
                    className={`ui-ws-btn ${workspace === wsId ? 'is-active' : ''}`}
                    aria-pressed={workspace === wsId}
                    onClick={() => {
                      setWorkspace(wsId)
                      setActiveWorkspaceTab(0)
                    }}
                  >
                    <Layers3 size={12} aria-hidden="true" />
                    <span>{t.studioWorkspaces[wsId].name}</span>
                  </button>
                ))}
              </div>
              <span className="ui-layout-readout">{t.studioLayouts[layout]}</span>
            </div>

            {layout === 'top' && (
              <>
                <div className="ui-strip">{renderTabStrip('row')}</div>
                {renderAddressBar(false)}
              </>
            )}

            {layout === 'below' && (
              <>
                {renderAddressBar(false)}
                <div className="ui-strip ui-strip--below">{renderTabStrip('row')}</div>
              </>
            )}

            {layout === 'compact' && renderAddressBar(true)}

            <div className="ui-body">
              {layout === 'vertical' && (
                <aside className="ui-sidebar" aria-label={t.studioLayoutLabel}>
                  <div className="ui-sidebar-head">{ws.name}</div>
                  {renderTabStrip('column')}
                </aside>
              )}

              <div className="ui-viewport">
                {layout === 'vertical' && renderAddressBar(false)}
                <div className={`ui-canvas ${activeTab === 2 ? 'ui-canvas--contained' : ''}`}>
                  <img
                    src={media.src}
                    alt={`${ws.name}: ${t.studioTabTitles[activeTab]}`}
                    width={media.width}
                    height={media.height}
                    style={{ objectPosition: media.position }}
                    loading="lazy"
                    decoding="async"
                  />
                  {showLiveVideo && (
                    <video
                      ref={previewVideoRef}
                      className={`ui-canvas-video ${previewPaused ? 'is-paused' : ''}`}
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
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="studio-caption-row">
            <p className="studio-caption">{t.studioCaption}</p>
            {showLiveVideo && (
              <button
                type="button"
                className="studio-preview-toggle"
                onClick={() => setPreviewPaused((prev) => !prev)}
              >
                {previewPaused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
                <span>{previewPaused ? t.heroVideoPlay : t.heroVideoPause}</span>
              </button>
            )}
          </div>
        </div>

        <div className="studio-editorial">
          <div className="studio-tabs" role="tablist" aria-label={t.studioSectionLabel} data-reveal style={{ '--d': '70ms' } as React.CSSProperties}>
            {t.studioTabs.map((label, i) => (
              <button
                key={label}
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
            style={{ '--d': '140ms' } as React.CSSProperties}
          >
            <h2 className="studio-title">{t.studioTabTitles[activeTab]}</h2>
            <p className="studio-description">{t.studioTabDescriptions[activeTab]}</p>

            <div className="studio-controls">
              <div className="control-group">
                <span className="control-label">{t.studioLayoutLabel}</span>
                <div className="control-row" role="group" aria-label={t.studioLayoutLabel}>
                  {LAYOUT_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`control-chip ${layout === id ? 'is-active' : ''}`}
                      aria-pressed={layout === id}
                      onClick={() => setLayout(id)}
                    >
                      {t.studioLayouts[id]}
                    </button>
                  ))}
                </div>
              </div>

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
            </div>
          </div>

          <div className="studio-actions" data-reveal style={{ '--d': '200ms' } as React.CSSProperties}>
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
