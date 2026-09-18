import React, { useEffect, useRef, useState } from 'react';
import App, { BrowserDemoOptions } from '../../../src/App';

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
export const BrowserDemo: React.FC = React.memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    let rafId: number | null = null;
    
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      if (width < BASE_WIDTH) {
        const s = width / BASE_WIDTH;
        // Check difference to avoid unnecessary state updates
        setScale((prev) => (Math.abs(prev - s) > 0.001 ? s : prev));
        setContainerHeight((prev) => {
          const newHeight = Math.round(BASE_HEIGHT * s);
          return prev !== newHeight ? newHeight : prev;
        });
      } else {
        setScale((prev) => (prev !== 1 ? 1 : prev));
        setContainerHeight((prev) => (prev !== undefined ? undefined : prev));
      }
    };

    const ro = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateDimensions);
    });

    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    return () => {
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={containerHeight ? { height: `${containerHeight}px` } : undefined}
      className={`browser-demo relative w-full overflow-hidden rounded-xl border border-slate-700/80 bg-[#151122] shadow-[0_20px_60px_rgba(15,23,42,0.32)] transition-[border-color,box-shadow] duration-300 sm:rounded-[18px] ${
        scale === 1 ? 'aspect-[16/10] max-h-[760px] min-h-[520px]' : ''
      }`}
    >
      <div
        style={{
          width: scale < 1 ? `${BASE_WIDTH}px` : '100%',
          height: scale < 1 ? `${BASE_HEIGHT}px` : '100%',
          transform: scale < 1 ? `scale(${scale})` : 'scale(1)',
          transformOrigin: 'top left',
          isolation: 'isolate',
        }}
        className="relative h-full w-full"
      >
        <App demo={WEBSITE_DEMO_OPTIONS} />
      </div>
    </div>
  );
});

export default BrowserDemo;
