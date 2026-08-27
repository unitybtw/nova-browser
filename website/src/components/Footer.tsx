import React from 'react';
import { motion } from 'framer-motion';
import { Github, ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full px-6 sm:px-12 pt-16 pb-6 bg-[#0c0d12] text-[#fcfbf9] font-sans mt-24 rounded-t-3xl border-t border-white/10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-white/10">
          {/* Brand / Manifesto Column */}
          <div className="col-span-1 md:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <img
                  src="/nova-logo-tight.png"
                  alt="Nova Logo"
                  className="w-9 h-9 object-contain"
                />
                <span className="font-display text-3xl font-extrabold tracking-tight text-white">
                  Nova
                </span>
              </div>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-200 mb-4 leading-snug tracking-tight">
                “The browser is no longer a window.<br />
                <span className="text-indigo-400">It is the engine.</span>”
              </h2>
              <p className="font-mono text-xs text-neutral-400 max-w-md leading-relaxed">
                Nova is built for a post-cloud web. Local inference, hardened network layer, absolute autonomy.
              </p>
            </div>
            <div className="mt-10 font-mono text-xs text-neutral-500">
              © {new Date().getFullYear()} Nova Browser. Open Source Under MIT.
            </div>
          </div>

          {/* Links Column */}
          <div className="col-span-1 md:col-span-5 flex flex-col justify-between">
            <div>
              <h4 className="font-mono text-[11px] text-neutral-400 mb-6 tracking-widest uppercase font-semibold">
                RESOURCES & REPOSITORY
              </h4>
              <ul className="space-y-3.5 font-mono text-xs text-neutral-300">
                <li>
                  <a
                    href="https://github.com/unitybtw/nova-browser"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-indigo-300 transition-colors flex items-center gap-1.5"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>GitHub Repository</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/unitybtw/nova-browser/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-indigo-300 transition-colors"
                  >
                    Releases & Changelog
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/unitybtw/nova-browser/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-indigo-300 transition-colors"
                  >
                    Security Audit & Issues
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/unitybtw/nova-browser/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-indigo-300 transition-colors"
                  >
                    MIT License
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Row: Copyright & Navigation */}
        <div className="pt-8 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-neutral-400">
          <div>ALL RIGHTS RESERVED // SOVEREIGN COMPUTING</div>
          <button
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          >
            <span>BACK TO TOP</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* MAMMOTH ANIMATED FOOTER WORDMARK */}
        <div className="relative pt-10 sm:pt-16 pb-4 overflow-hidden flex flex-col items-center justify-center select-none border-t border-white/10">
          {/* Ambient Cyber Aura / Spotlight */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-44 bg-gradient-to-r from-indigo-600/25 via-cyan-500/30 to-purple-600/25 blur-[110px] pointer-events-none rounded-full" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-6xl mx-auto relative group cursor-default"
          >
            <svg
              viewBox="0 0 1200 160"
              className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="novaTextGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="50%" stopColor="#D1D5DB" />
                  <stop offset="100%" stopColor="#374151" stopOpacity="0.5" />
                </linearGradient>
                <linearGradient id="novaHoverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
              <text
                x="50%"
                y="65%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-display font-black transition-all duration-700 select-none group-hover:fill-[url(#novaHoverGradient)]"
                fill="url(#novaTextGradient)"
                fontSize="150"
                fontWeight="900"
                letterSpacing="-0.045em"
              >
                NOVABROWSER
              </text>
            </svg>

            {/* Glowing Accent Shimmer on Hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-2xl" />
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
