import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const RealBrowserSandbox: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="w-full max-w-6xl mx-auto select-none">
      {/* Real Nova Browser Embed Container */}
      <div className="rounded-3xl border border-white/15 bg-[#05070a] shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden relative h-[540px] sm:h-[620px] md:h-[700px] lg:h-[760px]">
        
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

        {/* Real Live Self-Driving Nova Browser React Application */}
        <iframe
          src="/browser-demo/index.html?demo=true&theme=dark&tabs=horizontal"
          onLoad={() => setIsLoading(false)}
          tabIndex={-1}
          scrolling="no"
          className="w-full h-full border-0 pointer-events-none bg-[#070a11]"
          title="Nova Browser Live Self-Driving Engine"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />

        {/* Transparent Click Shield */}
        <div className="absolute inset-0 z-20 pointer-events-auto bg-transparent" />
      </div>
    </div>
  );
};
