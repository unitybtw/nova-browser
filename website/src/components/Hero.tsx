import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Download, Github } from 'lucide-react';
import BrowserDemo from './BrowserDemo';

const HERO_CAPABILITIES = [
  { label: 'On-device AI', detail: 'Local inference, no cloud hop', color: 'bg-indigo-500' },
  { label: 'Native privacy shield', detail: 'Trackers blocked before DOM load', color: 'bg-emerald-500' },
  { label: 'Workspace engine', detail: 'Split views, vertical tabs, instant focus', color: 'bg-cyan-500' },
  { label: 'Open architecture', detail: 'MIT licensed and auditable', color: 'bg-amber-500' },
];

export const Hero: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative isolate pt-28 sm:pt-32 md:pt-40 pb-16 sm:pb-20 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true">
        <div className="absolute left-1/2 top-[-240px] h-[500px] w-[min(800px,85vw)] -translate-x-1/2 rounded-full bg-indigo-100/40 blur-3xl" />
      </div>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-2 rounded-full border border-[#4338ca]/20 bg-white/75 px-3.5 py-1.5 font-mono text-[10px] sm:text-[11px] font-semibold text-[#4338ca] uppercase tracking-wider shadow-sm backdrop-blur"
      >
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4338ca]" />
        </span>
        <span>Open-source browser for the local-first web</span>
      </motion.div>

      <motion.h1
        initial={prefersReducedMotion ? false : { opacity: 0, y: 25 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        className="mt-7 max-w-5xl font-display text-[clamp(3rem,8vw,7.5rem)] font-black leading-[0.98] tracking-[-0.055em] text-[#171717]"
      >
        Thought at the Speed of{' '}
        <span className="text-[#4338ca]">Thought.</span>
      </motion.h1>

      <motion.p
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 max-w-2xl text-base sm:text-lg md:text-xl text-[#525252] font-sans leading-relaxed"
      >
        A fast, private desktop browser with on-device AI, native tracker blocking, and developer-grade workspaces—without sending your thinking to the cloud.
      </motion.p>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
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
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mt-7 flex flex-wrap items-center justify-center gap-2.5 sm:mt-6 select-none"
      >
        {HERO_CAPABILITIES.map((item) => (
          <div
            key={item.label}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white/70 px-3.5 py-1.5 shadow-xs backdrop-blur-sm"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${item.color}`} aria-hidden="true" />
            <span className="font-display text-xs font-bold text-[#171717]">{item.label}</span>
            <span className="font-mono text-[10px] text-neutral-400">· {item.detail}</span>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.95, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-12 w-full max-w-6xl mx-auto text-left"
      >
        <BrowserDemo />
      </motion.div>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.05 }}
        className="mt-8 flex items-center gap-3 text-neutral-400"
      >
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em]">Scroll to explore</span>
        <span className="hero-scroll-line relative h-8 w-px overflow-hidden bg-neutral-200" aria-hidden="true">
          <span className="absolute left-0 top-0 h-3/5 w-full bg-gradient-to-b from-[#4338ca] to-cyan-400" />
        </span>
      </motion.div>
    </section>
  );
};

export default Hero;
