import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { StampTypeCard } from './stamptype/StampTypeCard';

export const ManifestoHero: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  const handleScrollDown = () => {
    const mainEl = document.getElementById('main-content');
    if (mainEl) {
      mainEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="manifesto"
      className="relative flex min-h-screen w-full flex-col items-center justify-between overflow-hidden bg-[#0d0d0f] px-4 py-8 text-white sm:px-6 sm:py-10"
    >
      {/* Ambient Radial Background Glow */}
      <div
        className="pointer-events-none absolute -top-48 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-[#4338ca]/25 blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#0078bf]/15 blur-[120px]"
        aria-hidden="true"
      />

      {/* Top Header Monospace Indicator */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="z-10 flex w-full max-w-5xl items-center justify-between border-b border-white/10 pb-4 text-xs font-mono tracking-widest text-neutral-400"
      >
        <span className="font-semibold text-white">NOVA // SOVEREIGN ENGINE</span>
        <span className="hidden sm:inline">00 MANIFESTO & LIVE TYPOGRAPHY</span>
        <span className="text-emerald-400">100% OFFLINE</span>
      </motion.div>

      {/* Main Large-Scale Kinetic Poster Display */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 my-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#171717] p-2 shadow-[0_30px_90px_rgba(0,0,0,0.8)] sm:p-4"
      >
        <StampTypeCard className="aspect-[1344/620] w-full rounded-2xl border-none shadow-none" />
      </motion.div>

      {/* Bottom Scroll Down Guide */}
      <motion.button
        type="button"
        onClick={handleScrollDown}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="z-10 group flex cursor-pointer flex-col items-center gap-2 pt-4 text-xs font-mono uppercase tracking-widest text-neutral-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] rounded-lg px-4 py-2"
        aria-label="Scroll down to explore Nova Browser"
      >
        <span className="flex items-center gap-2">
          <span>Scroll down to explore</span>
          <span className="text-neutral-600">•</span>
          <span className="text-neutral-500">Aşağı Kaydır</span>
        </span>
        <motion.div
          animate={
            prefersReducedMotion
              ? undefined
              : { y: [0, 6, 0] }
          }
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="rounded-full border border-white/20 p-1.5 transition-colors group-hover:border-white/60 group-hover:bg-white/10"
        >
          <ChevronDown className="h-4 w-4 text-white" />
        </motion.div>
      </motion.button>
    </section>
  );
};

export default ManifestoHero;
