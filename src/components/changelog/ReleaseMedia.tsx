import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Image as ImageIcon } from 'lucide-react';
import { ReleaseVersion } from '../../data/changelog';
import { useTranslation } from '../../services/i18n';

type Media = { src: string; kind: 'image' | 'video'; title: string; poster?: string; captions?: string };

export function ReleaseMedia({ release }: { release: ReleaseVersion }) {
  const { t, language } = useTranslation();
  const [index, setIndex] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const gallery: Media[] = release.version === '1.5.0' ? [
    { src: './changelog/newtab.jpg', kind: 'image', title: t('releaseJournal.newTab') },
    { src: './changelog/assistant.jpg', kind: 'image', title: t('releaseJournal.assistant') },
    { src: './changelog/nova-tour.mp4', kind: 'video', title: t('releaseJournal.productFilm'), poster: './changelog/nova-tour.poster.jpg', captions: `./changelog/nova-tour.${language === 'tr' ? 'tr' : 'en'}.vtt` },
    { src: './changelog/update-guide.mp4', kind: 'video', title: t('releaseJournal.updateFilm'), poster: './changelog/update-guide.poster.jpg', captions: `./changelog/update-guide.${language === 'tr' ? 'tr' : 'en'}.vtt` },
  ] : [release.hero, ...(release.sections ?? []).map(section => section.media)]
    .filter((media): media is NonNullable<typeof media> => Boolean(media))
    .map(media => ({ src: media.src, kind: 'image', title: media.caption || media.alt }));
  const active = gallery[index] || gallery[0];
  useEffect(() => { setIndex(0); }, [release.version]);
  useEffect(() => { const node = video.current; return () => { node?.pause(); }; }, [index, release.version]);
  if (!active) return null;
  const select = (next: number) => { video.current?.pause(); setIndex((next + gallery.length) % gallery.length); };
  return <section className="journal-media" aria-label={t('releaseJournal.media')}>
    <div className="journal-media-stage">
      {active.kind === 'image' ? <img key={active.src} src={active.src} alt={active.title} loading="lazy" /> :
        <video key={active.src} ref={video} controls playsInline preload="none" poster={active.poster} aria-label={active.title}>
          <source src={active.src} type="video/mp4" />
          {active.captions && <track key={active.captions} kind="captions" src={active.captions} srcLang={language === 'tr' ? 'tr' : 'en'} label={language === 'tr' ? 'Türkçe' : 'English'} default />}
        </video>}
    </div>
    <div className="journal-media-footer">
      <p aria-live="polite">{active.title}</p>
      <div className="journal-media-arrows"><button onClick={() => select(index - 1)} aria-label={t('releaseJournal.previousMedia')} disabled={gallery.length < 2}><ChevronLeft size={18} /></button><span>{index + 1} / {gallery.length}</span><button onClick={() => select(index + 1)} aria-label={t('releaseJournal.nextMedia')} disabled={gallery.length < 2}><ChevronRight size={18} /></button></div>
    </div>
    <div className="journal-media-picker" role="group" aria-label={t('releaseJournal.media')}>
      {gallery.map((media, i) => <button key={media.src} aria-pressed={index === i} onClick={() => select(i)} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const next = (i + (event.key === 'ArrowRight' ? 1 : -1) + gallery.length) % gallery.length; select(next); (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus(); } }}>
        {media.kind === 'video' ? <Play size={14} /> : <ImageIcon size={14} />}{media.title}
      </button>)}
    </div>
  </section>;
}
