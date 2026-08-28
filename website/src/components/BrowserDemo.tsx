import React, { useEffect, useRef, useState } from 'react';
import BrowserApp from '../../../src/App';
import type { WindowPlatform } from '../../../src/components/WindowControls';

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

const getWindowPlatform = (): WindowPlatform => {
  if (typeof navigator === 'undefined') return 'windows';
  return /Macintosh|Mac OS X/i.test(navigator.userAgent) || /Mac/i.test(navigator.platform)
    ? 'mac'
    : 'windows';
};

/**
 * A presentation-only browser showcase. It uses the real browser demo states,
 * but intentionally blocks pointer, touch, wheel, keyboard, and context-menu
 * interaction so the marketing page never turns into a second browser window.
 */
export const BrowserDemo: React.FC = () => {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);
  const scene = TOUR_SCENES[sceneIndex];
  const windowPlatform = getWindowPlatform();

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
      className="browser-demo-showcase relative h-[clamp(520px,72vh,760px)] min-h-[520px] w-full overflow-hidden rounded-[1.15rem] border border-slate-300/90 bg-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.16)]"
      aria-hidden="true"
    >
      <div className="browser-demo-viewport shimmer-line absolute inset-0 overflow-hidden text-left">
        <div key={scene.id} className="browser-demo-scene absolute inset-0 h-full w-full rounded-[1.05rem]">
          <BrowserApp
            demo={{
              isDemo: true,
              feature: scene.feature,
              theme: 'light',
              tabs: scene.tabs,
              showTasksWidget: false,
              bg: scene.bg,
              windowPlatform,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BrowserDemo;
