import React, { useEffect, useRef, useState } from 'react';
import BrowserApp from '../../../src/App';

type TourScene = {
  id: string;
  feature: 'website' | 'ai' | 'vertical_tabs' | 'split' | 'shield';
  tabs: 'horizontal' | 'vertical';
  bg: string;
};

const TOUR_SCENES: TourScene[] = [
  { id: 'workspace', feature: 'website', tabs: 'horizontal', bg: 'default' },
  { id: 'local-ai', feature: 'ai', tabs: 'horizontal', bg: 'nebula' },
  { id: 'split-view', feature: 'split', tabs: 'horizontal', bg: 'default' },
  { id: 'vertical-tabs', feature: 'vertical_tabs', tabs: 'vertical', bg: 'cyber_grid' },
  { id: 'privacy', feature: 'shield', tabs: 'horizontal', bg: 'default' },
];

const TOUR_INTERVAL = 6200;

const isMacOS = () => {
  if (typeof navigator === 'undefined') return false;
  return /Macintosh|Mac OS X/i.test(navigator.userAgent) || /Mac/i.test(navigator.platform);
};

const WindowChrome: React.FC<{ macOS: boolean }> = ({ macOS }) => (
  <div className="browser-window-chrome relative z-10 flex h-10 shrink-0 items-center border-b border-slate-200/90 bg-[#f7f7f8] px-3 text-slate-500">
    {macOS ? (
      <div className="flex items-center gap-2" aria-hidden="true">
        <span className="browser-window-dot bg-[#ff5f57]" />
        <span className="browser-window-dot bg-[#febc2e]" />
        <span className="browser-window-dot bg-[#28c840]" />
      </div>
    ) : (
      <div className="ml-auto flex h-full items-center" aria-hidden="true">
        <span className="browser-window-button text-[15px] leading-none">−</span>
        <span className="browser-window-button text-[12px] leading-none">□</span>
        <span className="browser-window-button browser-window-close text-[14px] leading-none">×</span>
      </div>
    )}
    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 font-sans text-[11px] font-medium tracking-wide text-slate-400">
      Nova Browser
    </span>
  </div>
);

/**
 * A presentation-only browser showcase. It uses the real browser demo states,
 * but intentionally blocks pointer, touch, wheel, keyboard, and context-menu
 * interaction so the marketing page never turns into a second browser window.
 */
export const BrowserDemo: React.FC = () => {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [macOS, setMacOS] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);
  const scene = TOUR_SCENES[sceneIndex];

  useEffect(() => {
    setMacOS(isMacOS());
  }, []);

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
    const demo = demoRef.current;
    if (!demo) return;
    demo.inert = true;
    return () => {
      demo.inert = false;
    };
  }, []);

  useEffect(() => {
    if (isReducedMotion || isDocumentHidden) return;
    const timer = window.setInterval(() => {
      setSceneIndex((current) => (current + 1) % TOUR_SCENES.length);
    }, TOUR_INTERVAL);
    return () => window.clearInterval(timer);
  }, [isDocumentHidden, isReducedMotion]);

  return (
    <div
      ref={demoRef}
      className="browser-demo-showcase relative w-full overflow-hidden rounded-[1.15rem] border border-slate-300/90 bg-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.16)]"
      aria-hidden="true"
    >
      <WindowChrome macOS={macOS} />
      <div className="browser-demo isolate h-[min(760px,72vh)] min-h-[520px] w-full overflow-hidden text-left">
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
    </div>
  );
};

export default BrowserDemo;
