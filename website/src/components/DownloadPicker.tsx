import type { CSSProperties, KeyboardEvent } from 'react'
import { ArrowUpRight, Command, Download, Monitor, Terminal } from 'lucide-react'
import { PLATFORMS, RELEASE_BASE, RELEASE_VERSION, REPO_URL, type SiteCopy } from '../content'

interface DownloadPickerProps {
  t: SiteCopy
  platform: number
  onSelectPlatform: (index: number) => void
  onMoveTab: (event: KeyboardEvent<HTMLButtonElement>, current: number) => void
}

const PLATFORM_ICONS = [Command, Monitor, Terminal]

export function DownloadPicker({ t, platform, onSelectPlatform, onMoveTab }: DownloadPickerProps) {
  const current = PLATFORMS[platform]

  return (
    <section className="band band--accent download-section" id="download" aria-labelledby="download-heading">
      <div className="container download-grid">
        <div className="download-left" data-reveal style={{ '--d': '0ms' } as CSSProperties}>
          <h2 id="download-heading" className="download-heading">
            <span>{t.downloadHeading[0]}</span>
            <span>{t.downloadHeading[1]}</span>
          </h2>
          <p className="download-lead">{t.downloadLead}</p>
          <a
            className="download-checksums-link"
            href={`${REPO_URL}/releases/latest`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{t.allReleases}</span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>

        <div className="download-right" data-reveal style={{ '--d': '120ms' } as CSSProperties}>
          <div className="installer-dialog" data-ui>
            <div className="installer-header">
              <div>
                <p className="installer-title">{t.installerHeading}</p>
                <p className="installer-subtitle">{t.installerSubheading}</p>
              </div>
              <span className="installer-version">{RELEASE_VERSION}</span>
            </div>

            <div className="platform-tabs" role="tablist" aria-label={t.installerSubheading}>
              {PLATFORMS.map((item, i) => {
                const Icon = PLATFORM_ICONS[i]
                return (
                  <button
                    key={item.id}
                    id={`platform-tab-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={platform === i}
                    aria-controls="platform-panel"
                    tabIndex={platform === i ? 0 : -1}
                    className={`platform-tab ${platform === i ? 'is-active' : ''}`}
                    onClick={() => onSelectPlatform(i)}
                    onKeyDown={(event) => onMoveTab(event, i)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{item.name}</span>
                  </button>
                )
              })}
            </div>

            <div
              id="platform-panel"
              role="tabpanel"
              aria-labelledby={`platform-tab-${platform}`}
              className="platform-files"
            >
              {current.choices.map((choice) => (
                <a
                  key={choice.file}
                  className="download-file"
                  href={`${RELEASE_BASE}${choice.file}`}
                  aria-label={`${t.download}: ${current.name} ${choice.name} (${choice.ext})`}
                >
                  <span className="download-file-meta">
                    <strong>{choice.name}</strong>
                    <span>{choice.detail} ({choice.ext})</span>
                  </span>
                  <Download size={18} aria-hidden="true" />
                </a>
              ))}
            </div>

            <p className="installer-note">{t.desktopNote}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
