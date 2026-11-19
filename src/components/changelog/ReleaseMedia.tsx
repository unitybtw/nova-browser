import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  X,
  ImageOff,
  FileText,
} from 'lucide-react';
import { ReleaseVersion } from '../../data/changelog';
import { useTranslation } from '../../services/i18n';
import { EASE_OUT, backdropVariants, modalVariants } from '../../utils/motion';

interface MediaItem {
  src: string;
  kind: 'image' | 'video';
  title: string;
  alt: string;
  caption?: string;
  poster?: string;
  captions?: string;
}

const stageVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    scale: 0.992,
    x: dir > 0 ? 12 : -12,
  }),
  center: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -10 : 10,
    transition: { duration: 0.14, ease: EASE_OUT },
  }),
};

/** Full-bleed editorial media showcase, clean filmstrip, and fullscreen Lightbox. */
export function ReleaseMedia({ release }: { release: ReleaseVersion }) {
  const { t, language } = useTranslation();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isLightbox, setIsLightbox] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageImgRef = useRef<HTMLImageElement>(null);

  // Dynamic gallery construction from mediaGallery, hero, and editorial sections
  const gallery: MediaItem[] = useMemo(() => {
    if (release.mediaGallery && release.mediaGallery.length > 0) {
      return release.mediaGallery.map((m) => {
        const isVideo = m.kind === 'video' || m.src.endsWith('.mp4');
        return {
          src: m.src,
          kind: isVideo ? 'video' : 'image',
          title: m.title || m.caption || m.alt || release.title,
          alt: m.alt || release.title,
          caption: m.caption,
          poster: m.poster,
          captions:
            m.captions ||
            (isVideo ? `./changelog/nova-tour.${language === 'tr' ? 'tr' : 'en'}.vtt` : undefined),
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
          title:
            section.media.title || section.media.caption || section.media.alt || section.title,
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
    setDirection(1);
    setIsLightbox(false);
    setIsZoomed(false);
  }, [release.version]);

  useEffect(() => {
    const node = videoRef.current;
    return () => {
      node?.pause();
    };
  }, [index, release.version]);

  useEffect(() => {
    if (!active || active.kind !== 'image') return;
    if (stageImgRef.current?.complete && stageImgRef.current.naturalWidth > 0) {
      setLoadedMap((prev) => (prev[active.src] ? prev : { ...prev, [active.src]: true }));
    }
  }, [active]);

  const select = (next: number) => {
    if (gallery.length <= 1) return;
    videoRef.current?.pause();
    const wrapped = ((next % gallery.length) + gallery.length) % gallery.length;
    setDirection(next > index ? 1 : -1);
    setIndex(wrapped);
    setIsZoomed(false);
  };

  useEffect(() => {
    if (!isLightbox) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightbox(false);
        setIsZoomed(false);
      } else if (e.key === 'ArrowRight' && gallery.length > 1) {
        select(index + 1);
      } else if (e.key === 'ArrowLeft' && gallery.length > 1) {
        select(index - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightbox, gallery.length, index]);

  if (!active) {
    return (
      <section className="py-6 border-y border-neutral-200/70 dark:border-white/[0.07] flex items-center gap-3.5 text-neutral-500 dark:text-neutral-400">
        <FileText size={18} className="shrink-0" />
        <p className="text-[13px]">
          <strong className="font-medium text-neutral-900 dark:text-neutral-200">
            Nova {release.version}
          </strong>{' '}
          — {release.title}
        </p>
      </section>
    );
  }

  return (
    <section aria-label={t('releaseJournal.media')} className="space-y-3.5">
      {/* Primary Framed Product Stage */}
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-neutral-100 dark:bg-[#131418] ring-1 ring-black/[0.06] dark:ring-white/[0.08] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.2)] dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)] group">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={`${release.version}-${index}-${active.src}`}
            custom={direction}
            variants={stageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full h-full relative"
          >
            {active.kind === 'image' ? (
              errorMap[active.src] ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-6 text-center text-neutral-500 dark:text-neutral-400">
                  <ImageOff size={26} />
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {active.title}
                  </p>
                  <small className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
                    {active.caption || release.title}
                  </small>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsLightbox(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsLightbox(true);
                    }
                  }}
                  aria-label={`${active.title} — ${t('releaseJournal.zoomImage')}`}
                  className="w-full h-full relative cursor-zoom-in focus:outline-none"
                >
                  {!loadedMap[active.src] && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-neutral-200/60 dark:bg-white/[0.04]"
                    />
                  )}
                  <img
                    ref={stageImgRef}
                    src={active.src}
                    alt={active.alt}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover object-top transition-opacity duration-300 ${
                      loadedMap[active.src] ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setLoadedMap((prev) => ({ ...prev, [active.src]: true }))}
                    onError={() => setErrorMap((prev) => ({ ...prev, [active.src]: true }))}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLightbox(true);
                    }}
                    title={t('releaseJournal.zoomImage')}
                    aria-label={t('releaseJournal.zoomImage')}
                    className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/70 hover:bg-black/85 text-white text-[11px] font-medium backdrop-blur-md border border-white/15 cursor-pointer shadow-lg"
                  >
                    <Maximize2 size={12} />
                    <span>{t('releaseJournal.zoomImage')}</span>
                  </button>
                </div>
              )
            ) : (
              <video
                ref={videoRef}
                controls
                playsInline
                preload="none"
                poster={active.poster}
                aria-label={active.title}
                className="w-full h-full object-contain bg-black"
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
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Caption & Minimal Counter directly on canvas */}
      <div className="flex items-baseline justify-between gap-6">
        <p className="text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          <span className="font-medium text-neutral-900 dark:text-neutral-200">{active.title}</span>
          {active.caption ? ` — ${active.caption}` : ''}
        </p>

        {gallery.length > 1 && (
          <div className="flex items-center gap-1 shrink-0 text-neutral-400 dark:text-neutral-500">
            <button
              type="button"
              onClick={() => select(index - 1)}
              aria-label={t('releaseJournal.previousMedia')}
              className="p-1 rounded hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="px-1 text-[11px] font-mono tabular-nums">
              {index + 1} / {gallery.length}
            </span>
            <button
              type="button"
              onClick={() => select(index + 1)}
              aria-label={t('releaseJournal.nextMedia')}
              className="p-1 rounded hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Clean Editorial Filmstrip */}
      {gallery.length > 1 && (
        <div
          role="group"
          aria-label={t('releaseJournal.media')}
          className="flex items-center gap-3 overflow-x-auto py-1"
        >
          {gallery.map((media, i) => {
            const isActive = index === i;
            return (
              <button
                key={`${media.src}-${i}`}
                type="button"
                aria-pressed={isActive}
                aria-label={media.title}
                title={media.title}
                onClick={() => select(i)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                    event.preventDefault();
                    const next =
                      (i + (event.key === 'ArrowRight' ? 1 : -1) + gallery.length) %
                      gallery.length;
                    select(next);
                    (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
                  }
                }}
                className={`relative w-24 sm:w-28 aspect-[16/10] rounded-lg overflow-hidden shrink-0 cursor-pointer transition-all bg-neutral-200 dark:bg-[#131418] ${
                  isActive
                    ? 'opacity-100 ring-2 ring-neutral-900 dark:ring-white ring-offset-2 ring-offset-[#fcfcfd] dark:ring-offset-[#0b0c0e]'
                    : 'opacity-45 hover:opacity-85 ring-1 ring-black/10 dark:ring-white/10'
                }`}
              >
                {media.kind === 'video' ? (
                  <>
                    {media.poster ? (
                      <img
                        src={media.poster}
                        alt=""
                        className="w-full h-full object-cover opacity-80"
                      />
                    ) : null}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
                      <Play size={13} />
                    </span>
                  </>
                ) : errorMap[media.src] ? (
                  <span className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={14} className="text-neutral-400" />
                  </span>
                ) : (
                  <img
                    src={media.src}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen Animated Lightbox */}
      <AnimatePresence>
        {isLightbox && active.kind === 'image' && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
            onClick={() => {
              setIsLightbox(false);
              setIsZoomed(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md select-none"
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl max-h-full rounded-2xl bg-[#141518] border border-white/[0.12] shadow-2xl flex flex-col overflow-hidden text-neutral-100"
            >
              <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <strong className="text-xs font-semibold text-white truncate">
                    {active.title}
                  </strong>
                  <span className="text-[11px] font-mono tabular-nums text-neutral-400 shrink-0">
                    {index + 1} / {gallery.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsZoomed((z) => !z)}
                    title={isZoomed ? 'Actual size' : 'Zoom in'}
                    aria-label={isZoomed ? 'Actual size' : 'Zoom in'}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    {isZoomed ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLightbox(false);
                      setIsZoomed(false);
                    }}
                    title={t('releaseJournal.closeLightbox')}
                    aria-label={t('releaseJournal.closeLightbox')}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div
                onClick={() => setIsZoomed((z) => !z)}
                className={`relative flex-1 min-h-0 overflow-auto bg-[#0b0c0f] flex items-center justify-center p-4 ${
                  isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                }`}
              >
                <img
                  src={active.src}
                  alt={active.alt}
                  referrerPolicy="no-referrer"
                  className={`transition-transform duration-200 rounded-lg max-w-full max-h-full object-contain ${
                    isZoomed ? 'scale-150' : 'scale-100'
                  }`}
                />

                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        select(index - 1);
                      }}
                      aria-label={t('releaseJournal.previousMedia')}
                      className="fixed sm:absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/15 backdrop-blur-md transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        select(index + 1);
                      }}
                      aria-label={t('releaseJournal.nextMedia')}
                      className="fixed sm:absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/15 backdrop-blur-md transition-colors cursor-pointer"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {active.caption && (
                <div className="px-5 py-3 border-t border-white/[0.08] text-xs text-neutral-400 text-center">
                  {active.caption}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
