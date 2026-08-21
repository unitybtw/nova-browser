import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, FolderTree, Lock, Maximize2, RotateCcw } from 'lucide-react';

export const RealBrowserSandbox: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<'ai' | 'newtab' | 'split' | 'sync'>('ai');
  const [activeBg, setActiveBg] = useState<'nebula' | 'cyber_grid' | 'hyper_space' | 'matrix'>('nebula');
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const switchFeature = (feature: 'ai' | 'newtab' | 'split' | 'sync', bg: 'nebula' | 'cyber_grid' | 'hyper_space' | 'matrix') => {
    setIsLoading(true);
    setActiveFeature(feature);
    setActiveBg(bg);
  };

  const reloadBrowser = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Feature Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => switchFeature('ai', 'nebula')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeFeature === 'ai'
                ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                : 'card-glass text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-500" />
            <span>🤖 Live Autonomous AI Agent</span>
          </button>

          <button
            onClick={() => switchFeature('newtab', 'nebula')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeFeature === 'newtab'
                ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                : 'card-glass text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>✨ Live Start Page & Dashboard</span>
          </button>

          <button
            onClick={() => switchFeature('split', 'hyper_space')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeFeature === 'split'
                ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                : 'card-glass text-slate-400 hover:text-white'
            }`}
          >
            <FolderTree className="w-4 h-4 text-amber-400" />
            <span>⚡ Live Split Screen View</span>
          </button>

          <button
            onClick={() => switchFeature('sync', 'cyber_grid')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeFeature === 'sync'
                ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                : 'card-glass text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>🔒 Live Zero-Knowledge Sync</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reloadBrowser}
            className="card-glass hover:bg-white/10 text-slate-400 hover:text-white p-2 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset Browser State"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Real React App
          </span>
        </div>
      </div>

      {/* Real Nova Browser Embed Container */}
      <div className="rounded-3xl border border-white/15 bg-[#05070a] shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden relative h-[480px] sm:h-[600px] md:h-[700px] lg:h-[760px]">
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

        {/* Real Live Nova Browser React Application */}
        <iframe
          ref={iframeRef}
          key={`${activeFeature}-${activeBg}`}
          src={`/browser-demo/index.html?demo=true&feature=${activeFeature}&bg=${activeBg}&theme=dark`}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 pointer-events-auto bg-[#070a11]"
          title={`Nova Browser Live - ${activeFeature}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      {/* Interactive Helper Hint */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-3 px-2 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Interactive Sandbox: Click tabs, open new tabs, type in Omnibox, or chat with AI.</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Full Real React App (Chromium View Engine)</span>
        </div>
      </div>
    </div>
  );
};
