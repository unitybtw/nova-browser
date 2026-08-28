import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Download, Github } from 'lucide-react';
import BrowserDemo from './BrowserDemo';

export const Hero: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative isolate mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 pt-28 text-center sm:px-6 sm:pb-20 sm:pt-32 md:pt-40">
      <motion.h1
        initial={prefersReducedMotion ? false : { opacity: 0, y: 25 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-5xl font-display text-[clamp(3rem,8vw,6rem)] font-black leading-[0.98] tracking-[-0.04em] text-[#171717]"
      >
        Thought at the Speed of{' '}
        <span className="text-[#4338ca]">Thought.</span>
      </motion.h1>

      <motion.p
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-[#525252] sm:text-lg md:text-xl"
      >
        A fast, private desktop browser with on-device AI, native tracker blocking, and developer-grade workspaces—without sending your thinking to the cloud.
      </motion.p>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="mt-9 flex w-full max-w-xl select-none flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4"
      >
        <a
          href="#download"
          className="luxury-button inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-[#171717] px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-wider text-white shadow-[0_12px_30px_rgba(23,23,23,0.18)] hover:bg-[#4338ca] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2 sm:text-sm"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>Download Nova</span>
        </a>

        <a
          href="https://github.com/unitybtw/nova-browser"
          target="_blank"
          rel="noopener noreferrer"
          className="luxury-button inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d9d9df] bg-white/80 px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#171717] shadow-sm hover:border-[#4338ca]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2 sm:text-sm"
        >
          <Github className="h-4 w-4" aria-hidden="true" />
          <span>Explore the source</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-[#737373]" aria-hidden="true" />
        </a>
      </motion.div>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.95, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-12 w-full max-w-6xl text-left"
      >
        <BrowserDemo />
      </motion.div>
    </section>
  );
};

export default Hero;
