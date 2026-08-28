import { Github, ArrowUp, ArrowUpRight } from 'lucide-react';

export const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full pt-16 pb-0 bg-[#08090f] text-slate-300 font-sans border-t border-[#252a3f] mt-24 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-14 border-b border-[#252a3f]">
          {/* Brand & Manifesto */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <img src="/nova-logo-tight.png" alt="Nova" className="w-7 h-7 object-contain" />
                <span className="font-display font-extrabold text-xl tracking-tight text-white">Nova Browser</span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-white mb-3">
                “The browser is no longer a window. It is the engine.”
              </p>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Nova is engineered for local-first computing. Client-side WebGPU neural execution, kernel-level zero-latency tracker blocking, and 100% auditable open architecture.
              </p>
            </div>
            <div className="mt-8 font-mono text-xs text-slate-500">
              © {new Date().getFullYear()} Nova Browser Open Source Team. MIT Licensed.
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-5 flex flex-col justify-between">
            <div>
              <div className="font-mono text-[11px] text-slate-400 mb-4 uppercase tracking-wider font-semibold">
                Resources & Repository
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

        {/* Bottom Bar */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-slate-500">
          <div>Sovereign Computing // Zero Telemetry</div>
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <span>Back to Top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Vector Wordmark */}
      <div className="w-full pt-3 pb-0 overflow-hidden select-none border-t border-[#252a3f]/50 opacity-70">
        <svg viewBox="0 0 1000 115" className="w-full h-auto block select-none" preserveAspectRatio="none">
          <defs>
            <linearGradient id="v2WordmarkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#818CF8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <text
            x="500"
            y="94"
            textAnchor="middle"
            fill="url(#v2WordmarkGradient)"
            fontSize="125"
            fontWeight="900"
            letterSpacing="-0.04em"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
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
