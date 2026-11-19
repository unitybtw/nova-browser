import type { CSSProperties } from 'react'
import type { SiteCopy } from '../content'

interface FeatureProofsProps {
  t: SiteCopy
}

export function FeatureProofs({ t }: FeatureProofsProps) {
  return (
    <section className="band band--dark features-section" id="capabilities" aria-labelledby="capabilities-heading">
      <div className="container">
        <div className="features-header" data-reveal style={{ '--d': '0ms' } as CSSProperties}>
          <h2 id="capabilities-heading" className="features-heading">{t.featuresHeading}</h2>
          <p className="features-lead">{t.featuresLead}</p>
        </div>

        <div className="proof-list">
          {t.features.map((item, idx) => (
            <article
              key={item.id}
              className="proof-module"
              data-reveal
              style={{ '--d': `${Math.min(idx * 65, 260)}ms` } as CSSProperties}
            >
              <div className={`proof-panel ${item.id === 'shield-sync' ? 'proof-panel--contained' : ''}`}>
                <img
                  src={item.image}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  style={{ objectPosition: item.cropPosition }}
                  loading="lazy"
                  decoding="async"
                />
                {item.uiOverlay && (
                  <div className="proof-ui-strip" data-ui aria-hidden="true">
                    {item.uiOverlay.rows.map((row) => (
                      <div key={row.label} className="proof-ui-row">
                        <span>{row.label}</span>
                        <span className="proof-ui-status">{row.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="proof-copy">
                <h3>{item.title}</h3>
                <p>{item.body[0]}</p>
                <p>{item.body[1]}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
