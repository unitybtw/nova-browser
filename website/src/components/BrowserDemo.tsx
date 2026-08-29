import React, { useEffect, useRef, useState } from 'react';
import App, { BrowserDemoOptions } from '@/App';

const WEBSITE_DEMO_OPTIONS: BrowserDemoOptions = {
  isDemo: true,
  feature: 'website',
  theme: 'dark',
  tabs: 'horizontal',
  showTasksWidget: false,
};

const BASE_WIDTH = 960;
const BASE_HEIGHT = 600;

/**
 * The website uses the actual browser application instead of a second mockup.
 * This keeps the marketing demo and the shipped Nova UI on the same component
 * and styling source, so visual changes cannot drift between them.
 * On mobile and tablet screens, a responsive scale-matrix preserves full desktop
 * fidelity without distorting or squishing the browser UI.
 */
export const BrowserDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      if (width < BASE_WIDTH) {
        const s = width / BASE_WIDTH;
        setScale(s);
        setContainerHeight(Math.round(BASE_HEIGHT * s));
      } else {
        setScale(1);
        setContainerHeight(undefined);
      }
    };

    updateDimensions();

    const ro = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    window.addEventListener('resize', updateDimensions);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={containerHeight ? { height: `${containerHeight}px` } : undefined}
      className={`browser-demo relative w-full overflow-hidden rounded-xl border border-slate-700/80 bg-[#151122] shadow-[0_20px_60px_rgba(15,23,42,0.32)] transition-all sm:rounded-[18px] ${
        scale === 1 ? 'aspect-[16/10] max-h-[760px] min-h-[520px]' : ''
      }`}
    >
      <div
        style={{
          width: scale < 1 ? `${BASE_WIDTH}px` : '100%',
          height: scale < 1 ? `${BASE_HEIGHT}px` : '100%',
          transform: scale < 1 ? `scale(${scale})` : 'none',
          transformOrigin: 'top left',
        }}
        className="relative"
      >
        <App demo={WEBSITE_DEMO_OPTIONS} />
      </div>
    </div>
  );
};

export default BrowserDemo;
