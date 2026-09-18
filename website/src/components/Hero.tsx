import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { BezierDefinition } from 'framer-motion';
import { ArrowUpRight, Download, Github } from 'lucide-react';
import BrowserDemo from './BrowserDemo';

const EASE: BezierDefinition = [0.16, 1, 0.3, 1];

export const Hero: React.FC = React.memo(() => {
  const prefersReducedMotion = useReducedMotion();

  const fadeUp = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 28 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.75, delay, ease: EASE },
        };

  return (
    <section className="relative isolate mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24 md:pt-28">
      {/* Ambient Radial Bloom */}
      <div
        className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 h-[520px] w-full max-w-5xl -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(67,56,202,0.12),rgba(56,189,248,0.05)_45%,transparent_75%)]"
        aria-hidden="true"
      />

      {/* 2. Kinetic Headline with Shimmering Indigo Accent */}
      <motion.h1
        {...fadeUp(0.08)}
        className="max-w-5xl font-display text-[clamp(3rem,7.5vw,5.75rem)] font-black leading-[0.98] tracking-[-0.04em] text-[#171717]"
      >
        Thought at the Speed of{' '}
        <span className="relative inline-block text-[#4338ca]">
          Thought.
        </span>
      </motion.h1>

      {/* 3. Subtitle with refined typography */}
      <motion.p
        {...fadeUp(0.16)}
        className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-[#525252] sm:text-lg md:text-xl"
      >
        A fast, private desktop browser with on-device AI, native tracker blocking, and developer-grade workspaces—without sending your thinking to the cloud.
      </motion.p>

      {/* 4. Call to Action Buttons */}
      <motion.div
        {...fadeUp(0.22)}
        className="mt-9 flex w-full max-w-xl select-none flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4"
      >
        <a
          href="#download"
          className="luxury-button group relative inline-flex min-h-12 items-center justify-center gap-2.5 overflow-hidden rounded-full bg-[#171717] px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-wider text-white shadow-[0_12px_30px_rgba(23,23,23,0.18)] hover:bg-[#4338ca] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2 sm:text-sm"
        >
          <Download className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
          <span>Download Nova</span>
        </a>

        <a
          href="https://github.com/unitybtw/nova-browser"
          target="_blank"
          rel="noopener noreferrer"
          className="luxury-button group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d9d9df] bg-white/90 px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#171717] shadow-sm hover:border-[#4338ca]/40 hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2 sm:text-sm"
        >
          <Github className="h-4 w-4 transition-transform duration-200 group-hover:rotate-6" aria-hidden="true" />
          <span>Explore the source</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-[#737373] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
        </a>
      </motion.div>

      {/* 6. Interactive Browser Demo with Ambient Backlight Glow */}
      <motion.div
        {...fadeUp(0.32)}
        className="relative mt-12 w-full max-w-6xl text-left"
        style={{ transform: 'translateZ(0)' }}
      >
        {/* Soft Ambient Halo behind Mockup */}
        <div
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-b from-indigo-500/40 via-cyan-500/20 to-transparent blur-3xl opacity-60 animate-glow-pulse transition-opacity duration-700"
          aria-hidden="true"
        />

        <BrowserDemo />
      </motion.div>
    </section>
  );
});

export default Hero;
