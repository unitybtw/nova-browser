import React from 'react';
import { Github, ArrowUp, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full pt-16 pb-0 bg-[#08090d] text-slate-300 font-sans border-t border-[#24293d] mt-24 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-16 border-b border-[#24293d]">
          {/* Brand & Manifesto */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <img src="/nova-logo-tight.png" alt="Nova Logo" className="w-8 h-8 object-contain" />
                <span className="font-display font-black text-2xl tracking-tight text-white">Nova</span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 font-mono text-[9px] font-bold text-indigo-400">
                  SOVEREIGN BROWSER
                </span>
              </div>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white mb-3 tracking-tight">
                “The browser is no longer a window.<br />
                <span className="text-indigo-400">It is the engine.</span>”
              </h2>
              <p className="font-sans text-xs text-slate-400 max-w-md leading-relaxed">
                Nova is engineered for local-first computing. Client-side WebGPU neural execution, kernel-level zero-latency tracker blocking, and 100% auditable open architecture.
              </p>
            </div>
            <div className="mt-8 font-mono text-xs text-slate-500">
              © {new Date().getFullYear()} Nova Browser Open Source Team. MIT Licensed.
            </div>
          </div>

          {/* Links Column */}
          <div className="md:col-span-5 flex flex-col justify-between">
            <div>
              <div className="font-mono text-[11px] text-slate-400 mb-4 uppercase tracking-widest font-bold">
                RESOURCES & REPOSITORY
              </div>
              <ul className="space-y-2.5 font-mono text-xs">
                <li>
                  <a
                    href="https://github.com/unitybtw/nova-browser"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>GitHub Repository</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/unitybtw/nova-browser/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
                  >
                    <span>Releases & Changelog</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/unitybtw/nova-browser/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
                  >
                    <span>Security Audit & Issues</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/unitybtw/nova-browser/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
                  >
                    <span>MIT License</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="py-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-slate-500">
          <div>ALL RIGHTS RESERVED // ZERO TELEMETRY RUNTIME</div>
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <span>BACK TO TOP</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Full-width Giant Vector Wordmark */}
      <div className="w-full pt-4 pb-0 overflow-hidden select-none border-t border-[#24293d]/60 opacity-85">
        <svg viewBox="0 0 1000 115" className="w-full h-auto block select-none" preserveAspectRatio="none">
          <defs>
            <linearGradient id="hallmarkWordmarkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#818CF8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <text
            x="500"
            y="94"
            textAnchor="middle"
            fill="url(#hallmarkWordmarkGradient)"
            fontSize="125"
            fontWeight="900"
            letterSpacing="-0.04em"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            textLength="1000"
            lengthAdjust="spacingAndGlyphs"
            className="select-none"
          >
            NOVABROWSER
          </text>
        </svg>
      </div>
    </footer>
  );
};

export default Footer;
