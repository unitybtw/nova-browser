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
        <div className="relative pt-8 sm:pt-14 pb-2 overflow-hidden flex flex-col items-center justify-center select-none border-t border-white/5">
          {/* Ambient Cyber Aura / Spotlight */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-36 bg-gradient-to-r from-indigo-600/20 via-cyan-500/25 to-purple-600/20 blur-[100px] pointer-events-none rounded-full" />

          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="w-full text-center relative group cursor-default"
          >
            <span className="font-display font-black text-[12.5vw] uppercase tracking-[-0.055em] leading-[0.82] block w-full whitespace-nowrap bg-gradient-to-b from-white via-neutral-300 to-neutral-700/30 bg-clip-text text-transparent transition-all duration-700 group-hover:from-cyan-300 group-hover:via-indigo-200 group-hover:to-cyan-900 drop-shadow-[0_15px_40px_rgba(0,0,0,0.9)]">
              NOVABROWSER
            </span>

            {/* Glowing Accent Shimmer on Hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-2xl" />
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
