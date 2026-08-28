import React, { useEffect, useMemo, useState } from 'react';
import BrowserApp from '../../../src/App';

type TourScene = {
  id: string;
  label: string;
  title: string;
  description: string;
  feature: 'website' | 'ai' | 'vertical_tabs' | 'split' | 'shield';
  tabs: 'horizontal' | 'vertical';
  bg: string;
};

const TOUR_SCENES: TourScene[] = [
  {
    id: 'workspace',
    label: '01 / WORKSPACE',
    title: 'A calmer way to browse.',
    description: 'Keep your active context visible without losing the page you are on.',
    feature: 'website',
    tabs: 'horizontal',
    bg: 'default',
  },
  {
    id: 'local-ai',
    label: '02 / LOCAL AI',
    title: 'Ask your browser. Keep context local.',
    description: 'The on-device assistant turns the current page into an active workspace.',
    feature: 'ai',
    tabs: 'horizontal',
    bg: 'nebula',
  },
  {
    id: 'split-view',
    label: '03 / SPLIT VIEW',
    title: 'Two pages. One synchronized canvas.',
    description: 'Compare documentation, research, and references side by side.',
    feature: 'split',
    tabs: 'horizontal',
    bg: 'default',
  },
  {
    id: 'vertical-tabs',
    label: '04 / TAB CONTROL',
    title: 'More tabs, less noise.',
    description: 'Vertical tabs give long-running research sessions room to breathe.',
    feature: 'vertical_tabs',
    tabs: 'vertical',
    bg: 'cyber_grid',
  },
  {
    id: 'privacy',
    label: '05 / PRIVACY',
    title: 'The web, without the clutter.',
    description: 'Built-in protection removes distractions before they reach your workspace.',
    feature: 'shield',
    tabs: 'horizontal',
    bg: 'default',
  },
];

const TOUR_INTERVAL = 5200;

/**
 * The website preview uses the same browser application as the desktop build.
 * The tour remounts supported demo scenes so the visuals stay product-real rather
 * than relying on a separate fake animation layer.
 */
export const BrowserDemo: React.FC = () => {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isTourPaused, setIsTourPaused] = useState(false);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const scene = TOUR_SCENES[sceneIndex];

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setIsReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => setIsDocumentHidden(document.hidden);
    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (isTourPaused || isReducedMotion || isPreviewActive || isDocumentHidden) return;
    const timer = window.setInterval(() => {
      setSceneIndex((current) => (current + 1) % TOUR_SCENES.length);
    }, TOUR_INTERVAL);
    return () => window.clearInterval(timer);
  }, [isReducedMotion, isTourPaused]);

  const sceneProgress = useMemo(
    () => `${((sceneIndex + 1) / TOUR_SCENES.length) * 100}%`,
    [sceneIndex],
  );

  return (
    <div className="browser-demo-shell rounded-[1.35rem] border border-white/70 bg-white/70 p-1.5 shadow-[0_30px_90px_rgba(30,27,75,0.16)] backdrop-blur-sm sm:p-2">
      <div className="mb-2 flex flex-col gap-2 px-2 py-1 sm:px-3 sm:py-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" aria-hidden="true" />
            <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 sm:text-[11px]">Live product tour</span>
          </div>
          <button
            type="button"
            onClick={() => setIsTourPaused((paused) => !paused)}
            className="shrink-0 rounded-md px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-500 transition-colors hover:bg-white hover:text-[#4338ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]"
            aria-pressed={isTourPaused}
          >
            {isTourPaused ? 'Resume tour' : 'Pause tour'}
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-wider text-neutral-400" aria-live="polite">
          <span className="truncate text-[#4338ca]">{scene.label}</span>
          <span className="hidden truncate sm:inline">{scene.title}</span>
        </div>
        <div className="h-0.5 overflow-hidden rounded-full bg-neutral-200" aria-hidden="true">
          <div className="h-full rounded-full bg-[#4338ca] transition-[width] duration-500" style={{ width: sceneProgress }} />
        </div>
      </div>

      <div
        className="browser-demo isolate w-full min-h-[520px] h-[min(760px,72vh)] overflow-hidden rounded-[1rem] border border-slate-300/90 bg-slate-100 text-left shadow-[0_18px_50px_rgba(15,23,42,0.14)]"
        onMouseEnter={() => setIsPreviewActive(true)}
        onMouseLeave={() => setIsPreviewActive(false)}
        onFocusCapture={() => setIsPreviewActive(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsPreviewActive(false);
          }
        }}
      >
        <div key={scene.id} className="browser-demo-scene h-full w-full">
          <BrowserApp
            demo={{
              isDemo: true,
              feature: scene.feature,
              theme: 'light',
              tabs: scene.tabs,
              showTasksWidget: false,
              bg: scene.bg,
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-2 pb-1 pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-bold text-[#171717] sm:text-base">{scene.title}</h3>
          <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-neutral-500">{scene.description}</p>
        </div>
        <div className="flex shrink-0 gap-1.5" aria-label="Product tour scenes">
          {TOUR_SCENES.map((tourScene, index) => (
            <button
              key={tourScene.id}
              type="button"
              onClick={() => {
                setSceneIndex(index);
                setIsTourPaused(true);
              }}
              aria-label={`Show ${tourScene.title}`}
              aria-pressed={sceneIndex === index}
              className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2 ${sceneIndex === index ? 'w-6 bg-[#4338ca]' : 'w-2 bg-neutral-300 hover:bg-neutral-400'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrowserDemo;
