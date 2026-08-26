import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bot, Columns2, Play, Sparkles } from 'lucide-react';

/**
 * Auto-playing product tour built from a REAL single-take screen recording of
 * the Nova Browser web build (scripts/record_demo_videos.cjs). The app's
 * built-in directed showcase cycles three 6.5s stages, so the video chapters
 * are synced to those stages:
 *   0.0s–6.5s  AI Assistant (arXiv tab + side panel + glowing agent cursor)
 *   6.5s–13s   New Tab dashboard (clock, speed dials, tasks)
 *   13s–19.5s  Dual split-screen (React 19 / Tailwind docs)
 */
const STAGE_MS = 6500;

interface Chapter {
  id: string;
  label: string;
  caption: string;
  description: string;
  icon: React.ElementType;
  accentClass: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: 'ai',
    label: 'AI Assistant',
    caption: 'On-device AI copilot',
    description:
      'A full AI side panel running locally — the glowing agent cursor shows it reading and acting on the page, no cloud involved.',
    icon: Bot,
    accentClass: 'text-nova-light bg-nova/15',
  },
  {
    id: 'newtab',
    label: 'Start Page',
    caption: 'A dashboard, not a blank page',
    description:
      'Clock, greeting, speed dials, tasks and a live shield indicator — the new tab page is a customizable workspace.',
    icon: Sparkles,
    accentClass: 'text-star bg-star/15',
  },
  {
    id: 'split',
    label: 'Split View',
    caption: 'Two pages, one window',
    description:
      'React docs and Tailwind docs side-by-side. Multi-tasking is built into the tab strip — no extensions required.',
    icon: Columns2,
    accentClass: 'text-nova-light bg-nova/15',
  },
];

export const HeroDemo: React.FC = () => {
  const reduceMotion = useReducedMotion() ?? false;
  const [chapter, setChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [started, setStarted] = useState(!reduceMotion);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chapterRef = useRef(0);

  // Sync the caption/chips to the video's internal stages.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !started) return;
    let raf = 0;
    const tick = () => {
      const t = video.currentTime;
      if (video.duration > 0) setProgress(t / video.duration);
      const idx = Math.min(CHAPTERS.length - 1, Math.floor(t * 1000 / STAGE_MS));
      if (idx !== chapterRef.current) {
        chapterRef.current = idx;
        setChapter(idx);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started]);

  const seekToChapter = (idx: number) => {
    const video = videoRef.current;
    setChapter(idx);
    chapterRef.current = idx;
    if (!video) return;
    video.currentTime = idx * (STAGE_MS / 1000) + 0.05;
    if (video.paused) {
      video.play().catch(() => {});
      setStarted(true);
    }
  };

  const startPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
    setStarted(true);
  };

  const active = CHAPTERS[chapter];

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Chapter chips */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Tour chapters">
          {CHAPTERS.map((c, idx) => {
            const Icon = c.icon;
            const isActive = idx === chapter;
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => seekToChapter(idx)}
                className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-lg shadow-white/10'
                    : 'glass text-muted hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-nova' : ''}`} />
                {c.label}
              </button>
            );
          })}
        </div>

        <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Real footage
        </span>
      </div>

      {/* Video frame */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="glass relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
      >
        {/* macOS-style chrome strip */}
        <div className="flex h-9 items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-4">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 truncate font-mono text-[11px] text-faint">
            nova://tour — actual screen recording of Nova Browser
          </span>
        </div>

        <div className="relative h-[420px] sm:h-[520px] md:h-[600px] lg:h-[660px] bg-abyss">
          {/* Poster shows instantly while the clip buffers */}
          <img
            src="/demo/tour.poster.jpg"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />

          <video
            ref={videoRef}
            src="/demo/tour.webm"
            poster="/demo/tour.poster.jpg"
            autoPlay={started}
            muted
            playsInline
            loop
            onPlay={() => setStarted(true)}
            className="absolute inset-0 h-full w-full object-cover"
            aria-label="Nova Browser product tour — real screen recording"
          />

          {/* Reduced-motion users get an explicit play affordance */}
          {!started && (
            <button
              onClick={startPlayback}
              aria-label="Play product tour"
              className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center bg-void/40 transition-colors duration-200 hover:bg-void/30"
            >
              <span className="glass flex h-16 w-16 items-center justify-center rounded-full shadow-2xl">
                <Play className="ml-1 h-7 w-7 text-foreground" />
              </span>
            </button>
          )}

          {/* Caption overlay — synced narration */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 sm:left-6 sm:max-w-md"
            >
              <div className="glass rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${active.accentClass}`}>
                    <active.icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">{active.caption}</p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{active.description}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Chapter timeline: three segments with per-chapter fill */}
        <div className="absolute inset-x-0 top-9 z-30 flex h-0.5 gap-0.5 bg-white/[0.06]">
          {CHAPTERS.map((c, idx) => (
            <div key={c.id} className="relative h-full flex-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-nova to-star transition-[width] duration-100 ease-linear"
                style={{
                  width: `${idx < chapter ? 100 : idx === chapter ? Math.min(100, progress * CHAPTERS.length * 100 - idx * 100) : 0}%`,
                }}
              />
            </div>
          ))}
        </div>
      </motion.div>

      <p className="mt-3 flex items-center justify-center gap-2 px-2 text-center font-mono text-xs text-faint">
        Single take, captured from the real application — three features, no cuts.
      </p>
    </div>
  );
};
