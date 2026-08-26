import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bot,
  Columns2,
  Gauge,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

type SceneId = 'ai' | 'newtab' | 'split' | 'shield';

interface Scene {
  id: SceneId;
  feature: string;
  bg: string;
  label: string;
  caption: string;
  description: string;
  icon: React.ElementType;
  accentClass: string;
}

/**
 * Live, auto-playing tour of the REAL Nova Browser web build.
 * The iframe embeds the actual application (copied to /browser-demo),
 * driven through its supported ?demo=true&feature=…&bg=… URL parameters.
 * No mockups — every pixel inside the frame is the genuine product UI.
 */
const SCENES: Scene[] = [
  {
    id: 'ai',
    feature: 'ai',
    bg: 'nebula',
    label: 'AI Assistant',
    caption: 'On-device AI copilot',
    description:
      'A full AI side panel running a real model locally — summarizing, answering and acting on the page without sending data anywhere.',
    icon: Bot,
    accentClass: 'text-nova-light bg-nova/15',
  },
  {
    id: 'newtab',
    feature: 'newtab',
    bg: 'cyber_grid',
    label: 'Start Page',
    caption: 'A dashboard, not a blank page',
    description:
      'Speed dials, search, to-dos and animated backgrounds — the new tab page is a fully customizable workspace.',
    icon: Sparkles,
    accentClass: 'text-star bg-star/15',
  },
  {
    id: 'split',
    feature: 'split',
    bg: 'hyper_space',
    label: 'Split View',
    caption: 'Two pages, one window',
    description:
      'Drag, snap and browse side-by-side. Multi-tasking is built into the tab strip — no extensions required.',
    icon: Columns2,
    accentClass: 'text-nova-light bg-nova/15',
  },
  {
    id: 'shield',
    feature: 'shield',
    bg: 'fireflies',
    label: 'Privacy Shield',
    caption: 'Ads and trackers, blocked live',
    description:
      'The shield counts every blocked tracker in real time. Phishing domains and fingerprinting defenses are always on.',
    icon: ShieldCheck,
    accentClass: 'text-star bg-star/15',
  },
];

const SCENE_DURATION_MS = 11000;

export const HeroDemo: React.FC = () => {
  const reduceMotion = useReducedMotion() ?? false;
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [cycle, setCycle] = useState(0); // bumping forces an iframe reload
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const scene = SCENES[sceneIndex];

  // Auto-advance the tour like a video. Disabled entirely when the user
  // prefers reduced motion — the demo stays on the first scene, manually
  // switchable via the chips.
  useEffect(() => {
    if (reduceMotion) return;
    setIsLoading(true);
    const timer = setTimeout(() => {
      setSceneIndex((i) => (i + 1) % SCENES.length);
    }, SCENE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [sceneIndex, cycle, reduceMotion]);

  const selectScene = (idx: number) => {
    if (idx === sceneIndex) {
      setCycle((c) => c + 1); // same scene → just reload the sandbox
      return;
    }
    setSceneIndex(idx);
  };

  const resetDemo = () => setCycle((c) => c + 1);

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Scene chips */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Live demo scenes">
          {SCENES.map((s, idx) => {
            const Icon = s.icon;
            const active = idx === sceneIndex;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                onClick={() => selectScene(idx)}
                className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm ${
                  active
                    ? 'bg-white text-slate-950 shadow-lg shadow-white/10'
                    : 'glass text-muted hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-nova' : ''}`} />
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetDemo}
            title="Reset demo"
            aria-label="Reset live demo"
            className="glass hover:bg-white/[0.08] flex cursor-pointer items-center gap-1.5 rounded-full p-2 text-xs font-medium text-muted transition-colors duration-200 hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Live app
          </span>
        </div>
      </div>

      {/* Real browser frame */}
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
            nova://live-demo — this is the real Nova Browser build, not a video
          </span>
        </div>

        <div className="relative h-[420px] sm:h-[520px] md:h-[600px] lg:h-[660px]">
          {/* Boot overlay masks iframe reloads so scene switches feel seamless */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-abyss"
              >
                <img
                  src="/nova-icon-transparent.png"
                  alt=""
                  className="h-10 w-10 animate-pulse object-contain"
                />
                <span className="font-mono text-xs font-bold text-nova-light">
                  Booting Nova Browser engine…
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <iframe
            ref={iframeRef}
            key={`${scene.id}-${cycle}`}
            src={`/browser-demo/index.html?demo=true&feature=${scene.feature}&bg=${scene.bg}&theme=dark`}
            onLoad={() => setIsLoading(false)}
            className="h-full w-full border-0 bg-[#070a11]"
            title={`Nova Browser live demo — ${scene.label}`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            loading="lazy"
          />

          {/* Caption overlay — the "video narration" */}
          <AnimatePresence mode="wait">
            <motion.div
              key={scene.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: isLoading ? 0.6 : 0.15 }}
              className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 sm:left-6 sm:max-w-md"
            >
              <div className="glass rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${scene.accentClass}`}>
                    <scene.icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">{scene.caption}</p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{scene.description}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress bar — video-style scene timing */}
        {!reduceMotion && (
          <div className="absolute inset-x-0 top-9 z-30 h-0.5 bg-white/[0.06]">
            <motion.div
              key={`${scene.id}-${cycle}`}
              className="h-full bg-gradient-to-r from-nova to-star"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: SCENE_DURATION_MS / 1000, ease: 'linear' }}
            />
          </div>
        )}
      </motion.div>

      {/* Helper hint */}
      <p className="mt-3 flex items-center justify-center gap-2 px-2 text-center font-mono text-xs text-faint">
        <Gauge className="h-3.5 w-3.5" />
        Interactive sandbox — click tabs, type in the omnibox, chat with the AI.
      </p>
    </div>
  );
};
