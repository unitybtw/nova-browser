import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Github, ArrowUp } from 'lucide-react';
import { DiaGradient } from './diagradient/DiaGradient';

export const Footer: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <footer className="relative w-full overflow-hidden bg-[#0c0d12] text-[#fcfbf9] font-sans mt-20 rounded-t-3xl border-t border-white/10 pt-16 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
      {/* Centered & Balanced Content Container */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 sm:px-10 lg:px-12">
        <div className="grid grid-cols-1 items-start gap-10 border-b border-white/10 pb-14 md:grid-cols-12 lg:gap-16">
          {/* Brand / Manifesto Column */}
          <div className="col-span-1 flex flex-col justify-between md:col-span-7 lg:col-span-7">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <img
                  src="/nova-logo-tight.png"
                  alt="Nova Logo"
                  className="h-9 w-9 object-contain"
                />
                <span className="font-display text-3xl font-extrabold tracking-tight text-white">
                  Nova
                </span>
              </div>
              <h2 className="mb-4 font-display text-2xl font-extrabold leading-snug tracking-tight text-neutral-200 sm:text-3xl">
                “The browser is no longer a window.<br />
                <span className="text-indigo-400">It is the engine.</span>”
              </h2>
              <p className="max-w-lg font-mono text-xs leading-relaxed text-neutral-400">
                Nova is built for a post-cloud web. Local inference, hardened network layer, absolute autonomy.
              </p>
            </div>
            <div className="mt-8 font-mono text-xs text-neutral-500">
              © {new Date().getFullYear()} Nova Browser. Open Source Under MIT.
            </div>
          </div>

          {/* Links Column */}
          <div className="col-span-1 flex flex-col justify-between md:col-span-5 md:items-end lg:col-span-5">
            <div className="w-full md:max-w-xs">
              <h4 className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                RESOURCES & REPOSITORY
              </h4>
              <ul className="space-y-3 font-mono text-xs text-neutral-300">
                <li>
                  <a
                    href="https://github.com/unitybtw/nova-browser"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center gap-2 rounded-md px-2 py-1 text-neutral-300 transition-colors hover:bg-white/5 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0d12]"
                  >
                    <Github className="h-4 w-4" />
                    <span>GitHub Repository</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/unitybtw/nova-browser/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center rounded-md px-2 py-1 text-neutral-300 transition-colors hover:bg-white/5 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0d12]"
                  >
                    Releases & Changelog
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/unitybtw/nova-browser/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center rounded-md px-2 py-1 text-neutral-300 transition-colors hover:bg-white/5 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0d12]"
                  >
                    Security Audit & Issues
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/unitybtw/nova-browser/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center rounded-md px-2 py-1 text-neutral-300 transition-colors hover:bg-white/5 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0d12]"
                  >
                    MIT License
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Row: Copyright & Navigation */}
        <div className="flex flex-col items-center justify-between gap-4 pt-6 pb-8 font-mono text-xs text-neutral-400 sm:flex-row">
          <div>ALL RIGHTS RESERVED // SOVEREIGN COMPUTING</div>
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Back to top"
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0d12]"
          >
            <span>BACK TO TOP</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 1. FULL-WIDTH EDGE-TO-EDGE GIANT NOVABROWSER WATERMARK */}
      <div className="relative w-full overflow-hidden select-none bg-[#0c0d12] pt-8 pb-2">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={prefersReducedMotion ? undefined : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="block w-full leading-none"
        >
          <svg
            viewBox="0 0 1000 115"
            className="block h-auto w-full select-none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="novaCleanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="48%" stopColor="#E0E7FF" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#C7D2FE" stopOpacity="0.60" />
              </linearGradient>
            </defs>
            <text
              x="500"
              y="94"
              textAnchor="middle"
              dominantBaseline="auto"
              fill="url(#novaCleanGradient)"
              fontSize="125"
              fontWeight="900"
              letterSpacing="-0.04em"
              style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
              textLength="1000"
              lengthAdjust="spacingAndGlyphs"
              className="select-none"
            >
              NOVABROWSER
            </text>
          </svg>
        </motion.div>
      </div>

      {/* 2. SILKY-SMOOTH LIVING CYBER-AURORA BEAM FLOOR (100% UNIFIED OBSIDIAN #0c0d12) */}
      <div className="relative h-28 w-full overflow-hidden pointer-events-none select-none bg-[#0c0d12] sm:h-40 md:h-52">
        <DiaGradient className="h-full w-full" />
      </div>
    </footer>
  );
};

export default Footer;
