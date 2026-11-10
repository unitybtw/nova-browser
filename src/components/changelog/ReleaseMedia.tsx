import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  X,
  ImageOff,
  Sparkles,
} from 'lucide-react';
import { ReleaseVersion } from '../../data/changelog';
import { useTranslation } from '../../services/i18n';

interface MediaItem {
  src: string;
  kind: 'image' | 'video';
  title: string;
  alt: string;
  caption?: string;
  poster?: string;
  captions?: string;
}

export function ReleaseMedia({ release }: { release: ReleaseVersion }) {
  const { t, language } = useTranslation();
  const [index, setIndex] = useState(0);
  const [isLightbox, setIsLightbox] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  // Dynamic gallery construction with no hardcoded versions
  const gallery: MediaItem[] = useMemo(() => {
    if (release.mediaGallery && release.mediaGallery.length > 0) {
      return release.mediaGallery.map(m => {
        const isVideo = m.kind === 'video' || m.src.endsWith('.mp4');
        return {
          src: m.src,
          kind: isVideo ? 'video' : 'image',
          title: m.title || m.caption || m.alt || release.title,
          alt: m.alt || release.title,
          caption: m.caption,
          poster: m.poster,
          captions: m.captions || (isVideo ? `./changelog/nova-tour.${language === 'tr' ? 'tr' : 'en'}.vtt` : undefined),
        };
      });
    }

    const items: MediaItem[] = [];
    if (release.hero) {
      const isVideo = release.hero.kind === 'video' || release.hero.src.endsWith('.mp4');
      items.push({
        src: release.hero.src,
        kind: isVideo ? 'video' : 'image',
        title: release.hero.title || release.hero.caption || release.hero.alt || release.title,
        alt: release.hero.alt || release.title,
        caption: release.hero.caption,
        poster: release.hero.poster,
        captions: release.hero.captions,
      });
    }

    for (const section of release.sections ?? []) {
      if (section.media) {
        const isVideo = section.media.kind === 'video' || section.media.src.endsWith('.mp4');
        items.push({
          src: section.media.src,
          kind: isVideo ? 'video' : 'image',
          title: section.media.title || section.media.caption || section.media.alt || section.title,
          alt: section.media.alt || section.title,
          caption: section.media.caption,
          poster: section.media.poster,
          captions: section.media.captions,
        });
      }
    }

    return items;
  }, [release, language]);

  const active = gallery[index] || gallery[0];

  useEffect(() => {
    setIndex(0);
    setIsLightbox(false);
    setIsZoomed(false);
  }, [release.version]);

  useEffect(() => {
    const node = videoRef.current;
    return () => {
      node?.pause();
    };
  }, [index, release.version]);

  // Handle keyboard navigation for Lightbox and Stage
  useEffect(() => {
    if (!isLightbox) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightbox(false);
        setIsZoomed(false);
      } else if (e.key === 'ArrowRight' && gallery.length > 1) {
        setIndex(prev => (prev + 1) % gallery.length);
        setIsZoomed(false);
      } else if (e.key === 'ArrowLeft' && gallery.length > 1) {
        setIndex(prev => (prev - 1 + gallery.length) % gallery.length);
        setIsZoomed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightbox, gallery.length]);

  if (!active) {
    return (
      <section className="journal-media journal-media-empty">
        <div className="journal-media-fallback-card">
          <div className="journal-media-fallback-icon">
            <Sparkles size={28} />
          </div>
          <div>
            <h3>Nova {release.version}</h3>
            <p>{release.title}</p>
          </div>
        </div>
      </section>
    );
  }

  const select = (next: number) => {
    videoRef.current?.pause();
    setIndex((next + gallery.length) % gallery.length);
    setIsZoomed(false);
  };

  const handleImageError = (src: string) => {
    setErrorMap(prev => ({ ...prev, [src]: true }));
  };

  const handleImageLoad = (src: string) => {
    setLoadedMap(prev => ({ ...prev, [src]: true }));
  };

  return (
    <section className="journal-media" aria-label={t('releaseJournal.media')}>
      <div className="journal-media-stage-wrapper">
        <div className="journal-media-stage">
          {active.kind === 'image' ? (
            errorMap[active.src] ? (
              <div className="journal-media-error-state">
                <ImageOff size={36} />
                <p>{active.title}</p>
                <small>{active.caption || release.title}</small>
              </div>
            ) : (
              <div className="journal-image-stage" onClick={() => setIsLightbox(true)}>
                {!loadedMap[active.src] && <div className="journal-media-skeleton" />}
                <img
                  key={active.src}
                  src={active.src}
                  alt={active.alt}
                  loading="lazy"
                  className={loadedMap[active.src] ? 'loaded' : 'loading'}
                  onLoad={() => handleImageLoad(active.src)}
                  onError={() => handleImageError(active.src)}
                />
                <button
                  type="button"
                  className="journal-media-zoom-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightbox(true);
                  }}
                  title={t('releaseJournal.zoomImage')}
                  aria-label={t('releaseJournal.zoomImage')}
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            )
          ) : (
            <video
              key={active.src}
              ref={videoRef}
              controls
              playsInline
              preload="none"
              poster={active.poster}
              aria-label={active.title}
            >
              <source src={active.src} type="video/mp4" />
              {active.captions && (
                <track
                  key={active.captions}
                  kind="captions"
                  src={active.captions}
                  srcLang={language === 'tr' ? 'tr' : 'en'}
                  label={language === 'tr' ? 'Türkçe' : 'English'}
                  default
                />
              )}
            </video>
          )}
        </div>
      </div>

      <div className="journal-media-footer">
        <div className="journal-media-info">
          <p className="journal-media-title">{active.title}</p>
          {active.caption && <p className="journal-media-caption">{active.caption}</p>}
        </div>
        {gallery.length > 1 && (
          <div className="journal-media-arrows">
            <button
              onClick={() => select(index - 1)}
              aria-label={t('releaseJournal.previousMedia')}
              disabled={gallery.length < 2}
            >
              <ChevronLeft size={18} />
            </button>
            <span>{index + 1} / {gallery.length}</span>
            <button
              onClick={() => select(index + 1)}
              aria-label={t('releaseJournal.nextMedia')}
              disabled={gallery.length < 2}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {gallery.length > 1 && (
        <div className="journal-media-picker" role="group" aria-label={t('releaseJournal.media')}>
          {gallery.map((media, i) => (
            <button
              key={`${media.src}-${i}`}
              aria-pressed={index === i}
              onClick={() => select(i)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                  event.preventDefault();
                  const next = (i + (event.key === 'ArrowRight' ? 1 : -1) + gallery.length) % gallery.length;
                  select(next);
                  (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
                }
              }}
            >
              {media.kind === 'video' ? <Play size={14} /> : <ImageIcon size={14} />}
              <span>{media.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Fullscreen Preview */}
      {isLightbox && active.kind === 'image' && (
        <div
          className="journal-lightbox-backdrop"
          ref={lightboxRef}
          onClick={() => {
            setIsLightbox(false);
            setIsZoomed(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
        >
          <div className="journal-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="journal-lightbox-header">
              <div className="journal-lightbox-meta">
                <strong>{active.title}</strong>
                <span>{index + 1} / {gallery.length}</span>
              </div>
              <div className="journal-lightbox-actions">
                <button
                  type="button"
                  onClick={() => setIsZoomed(z => !z)}
                  title={isZoomed ? 'Actual size' : 'Zoom in'}
                  aria-label={isZoomed ? 'Actual size' : 'Zoom in'}
                >
                  {isZoomed ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLightbox(false);
                    setIsZoomed(false);
                  }}
                  title={t('releaseJournal.closeLightbox')}
                  aria-label={t('releaseJournal.closeLightbox')}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div
              className={`journal-lightbox-stage ${isZoomed ? 'zoomed' : ''}`}
              onClick={() => setIsZoomed(z => !z)}
            >
              <img
                src={active.src}
                alt={active.alt}
                className={isZoomed ? 'zoom-target' : ''}
              />
            </div>

            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  className="journal-lightbox-nav prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    select(index - 1);
                  }}
                  aria-label={t('releaseJournal.previousMedia')}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  className="journal-lightbox-nav next"
                  onClick={(e) => {
                    e.stopPropagation();
                    select(index + 1);
                  }}
                  aria-label={t('releaseJournal.nextMedia')}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {active.caption && (
              <div className="journal-lightbox-caption">
                <p>{active.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
