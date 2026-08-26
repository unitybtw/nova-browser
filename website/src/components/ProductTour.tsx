import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Bot, Shield, Layers } from 'lucide-react';

interface Chapter {
  id: string;
  label: string;
  time: number;
  caption: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CHAPTERS: Chapter[] = [
  {
    id: 'ai-agent',
    label: 'AUTONOMOUS AGENT',
    time: 0,
    caption: 'On-Device AI Agent & Visual Cursor',
    description: 'Direct browser execution through local WebGPU inference. Complete workflows across tabs without cloud dependency.',
    icon: Bot,
  },
  {
    id: 'dual-view',
    label: 'DUAL-VIEW WORKSPACE',
    time: 8,
    caption: 'Parallel Tiling & Split-Screen',
    description: 'Work simultaneously across two independent webviews with instant synchronization and drag-and-drop support.',
    icon: Layers,
  },
  {
    id: 'privacy-shield',
    label: 'PRIVACY SHIELD',
    time: 16,
    caption: 'Zero-Knowledge Crypto & Tracker Defense',
    description: 'Native Rust/Electron network-level ad blocking combined with client-side AES-256-GCM encrypted cloud sync.',
    icon: Shield,
  },
];

export const ProductTour: React.FC = () => {
  const [activeChapter, setActiveChapter] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleSelectChapter = (index: number) => {
    setActiveChapter(index);
    if (videoRef.current) {
      videoRef.current.currentTime = CHAPTERS[index].time;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="font-mono-tracked text-[11px] text-[#4338ca] font-semibold">
          LIVE DEMO EXPERIENCE
        </span>
        <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#171717] mt-3">
          Architecture in <span className="italic">Motion</span>.
        </h2>
        <p className="font-body text-neutral-600 mt-4 text-base sm:text-lg leading-relaxed">
          Single uninterrupted take captured directly from the production application build.
        </p>
      </div>

      {/* Video Browser Frame Container */}
      <div className="relative rounded-[2rem] bg-[#171717] p-2 sm:p-4 shadow-2xl border border-[#e5e5e5]/40 overflow-hidden">
        {/* Browser Top Bar Decoration */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
            <span className="ml-3 font-mono text-[11px] text-neutral-400 hidden sm:inline">
              nova://system-tour — verified on-device playback
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs font-mono flex items-center gap-1.5"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
          </div>
        </div>

        {/* Video Canvas */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            src="/demo/tour.webm"
            poster="/demo/tour.poster.jpg"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Overlaid Narration Pill */}
          <div className="absolute bottom-6 left-6 right-6 sm:right-auto sm:max-w-md z-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeChapter}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="glass-dark rounded-2xl p-5 text-white shadow-2xl backdrop-blur-xl border border-white/15"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-300">
                    {React.createElement(CHAPTERS[activeChapter].icon, { className: 'w-4 h-4' })}
                  </div>
                  <h4 className="font-display font-semibold text-base text-white">
                    {CHAPTERS[activeChapter].caption}
                  </h4>
                </div>
                <p className="font-body text-xs text-neutral-300 leading-relaxed font-normal">
                  {CHAPTERS[activeChapter].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Chapter Selection Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 pt-2 border-t border-white/5">
          {CHAPTERS.map((ch, idx) => {
            const isCurrent = activeChapter === idx;
            return (
              <button
                key={ch.id}
                onClick={() => handleSelectChapter(idx)}
                className={`p-3 rounded-xl text-left transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-between cursor-pointer ${
                  isCurrent ? 'bg-white/10 text-white shadow-inner' : 'hover:bg-white/5 text-neutral-400'
                }`}
              >
                <div>
                  <span className="font-mono-tracked text-[9px] block text-indigo-400 font-semibold">
                    0{idx + 1} // {ch.label}
                  </span>
                  <span className="font-body text-xs font-medium text-white truncate block mt-0.5">
                    {ch.caption}
                  </span>
                </div>
                <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-indigo-400' : 'bg-transparent'}`} />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProductTour;
