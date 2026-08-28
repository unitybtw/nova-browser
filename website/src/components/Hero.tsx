import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Download, Github } from 'lucide-react';
import BrowserDemo from './BrowserDemo';

export const Hero: React.FC = () => {
  return (
    <section className="relative isolate pt-28 sm:pt-32 md:pt-40 pb-16 sm:pb-20 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true">
        <div className="hero-orb absolute left-1/2 top-[-280px] h-[620px] w-[min(900px,90vw)] -translate-x-1/2 rounded-full bg-indigo-200/35 blur-3xl" />
        <div className="absolute left-[12%] top-40 h-32 w-32 animate-glow-pulse rounded-full bg-cyan-200/25 blur-3xl" />
        <div className="absolute right-[10%] top-56 h-24 w-24 animate-glow-pulse rounded-full bg-fuchsia-200/20 blur-3xl [animation-delay:1.5s]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-2 rounded-full border border-[#4338ca]/20 bg-white/75 px-3.5 py-1.5 font-mono text-[10px] sm:text-[11px] font-semibold text-[#4338ca] uppercase tracking-wider shadow-sm backdrop-blur"
      >
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4338ca]/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4338ca]" />
        </span>
        <span>Open-source browser for the local-first web</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        className="mt-7 max-w-5xl font-display text-[clamp(3rem,8vw,7.5rem)] font-black leading-[0.98] tracking-[-0.055em] text-[#171717]"
      >
        Thought at the Speed of{' '}
        <span className="bg-gradient-to-r from-[#4338ca] via-indigo-500 to-cyan-500 bg-clip-text text-transparent gradient-text-shimmer">Thought.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 max-w-2xl text-base sm:text-lg md:text-xl text-[#525252] font-sans leading-relaxed"
      >
        A fast, private desktop browser with on-device AI, native tracker blocking, and developer-grade workspaces—without sending your thinking to the cloud.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="mt-9 flex w-full max-w-xl flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4 select-none"
      >
        <a
          href="#download"
          className="luxury-button inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-[#171717] px-7 py-3.5 text-white font-mono text-xs sm:text-sm uppercase tracking-wider font-semibold shadow-[0_12px_30px_rgba(23,23,23,0.18)] hover:bg-[#4338ca] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>Download Nova</span>
        </a>

        <a
          href="https://github.com/unitybtw/nova-browser"
          target="_blank"
          rel="noopener noreferrer"
          className="luxury-button inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d9d9df] bg-white/80 px-6 py-3.5 text-[#171717] font-mono text-xs sm:text-sm uppercase tracking-wider font-semibold shadow-sm hover:border-[#4338ca]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2"
        >
          <Github className="w-4 h-4" aria-hidden="true" />
          <span>Explore the source</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#737373]" aria-hidden="true" />
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-neutral-500"
      >
        <span>MIT licensed</span>
        <span className="h-1 w-1 rounded-full bg-neutral-300" aria-hidden="true" />
        <span>No telemetry</span>
        <span className="h-1 w-1 rounded-full bg-neutral-300" aria-hidden="true" />
        <span>Runs locally</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.95, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-12 w-full max-w-6xl mx-auto text-left"
      >
        <BrowserDemo />
      </motion.div>
    </section>
  );
};

export default Hero;
