import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const RealBrowserSandbox: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Canonical high-res desktop workspace viewport
  const BASE_WIDTH = 1200;
  const BASE_HEIGHT = 760;

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      if (width < BASE_WIDTH) {
        setScale(width / BASE_WIDTH);
      } else {
        setScale(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Also observe size changes via ResizeObserver
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-6xl mx-auto select-none px-0 sm:px-2">
      {/* Real Nova Browser Embed Container with Scaled Proportions */}
      <div 
        className="rounded-2xl sm:rounded-3xl border border-white/15 bg-[#05070a] shadow-[0_20px_70px_rgba(0,0,0,0.8)] sm:shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden relative"
        style={{
          height: `${Math.round(BASE_HEIGHT * scale)}px`,
        }}
      >
        {/* Loading Spinner */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-[#06080e] flex flex-col items-center justify-center gap-3"
            >
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center animate-pulse">
                <img src="/assets/nova-icon.png" alt="Loading Nova" className="w-6 h-6 object-contain" />
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold">Booting Real Nova Browser Engine...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scaled Desktop Browser Viewport */}
        <div
          style={{
            width: `${BASE_WIDTH}px`,
            height: `${BASE_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          className="absolute top-0 left-0"
        >
          <iframe
            src="/browser-demo/index.html?demo=true&theme=dark&tabs=horizontal"
            onLoad={() => setIsLoading(false)}
            tabIndex={-1}
            scrolling="no"
            className="w-full h-full border-0 pointer-events-none bg-[#070a11]"
            title="Nova Browser Live Self-Driving Engine"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>

        {/* Transparent Click Shield */}
        <div className="absolute inset-0 z-20 pointer-events-auto bg-transparent" />
      </div>
    </div>
  );
};
