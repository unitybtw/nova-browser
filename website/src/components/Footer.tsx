import React from 'react';
import { Github, ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full px-6 sm:px-12 py-16 bg-[#171717] text-[#fcfbf9] font-sans mt-24 rounded-t-3xl border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-white/10">
          {/* Brand / Manifesto Column */}
          <div className="col-span-1 md:col-span-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <img
                  src="/nova-icon-transparent.png"
                  alt="Nova Logo"
                  className="w-11 h-11 object-contain drop-shadow-[0_2px_10px_rgba(6,182,212,0.4)]"
                />
                <span className="font-serif italic text-3xl font-bold tracking-tight text-white">
                  Nova
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl text-neutral-200 mb-4 leading-snug">
                “The browser is no longer a window.<br />
                <span className="italic text-indigo-400">It is the engine.</span>”
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
          <div className="col-span-1 md:col-span-3">
            <h4 className="font-mono text-[11px] text-neutral-400 mb-6 tracking-widest uppercase font-semibold">
              ARCHITECTURE
            </h4>
            <ul className="space-y-3 font-mono text-xs text-neutral-300">
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

          {/* Specs Column */}
          <div className="col-span-1 md:col-span-3">
            <h4 className="font-mono text-[11px] text-neutral-400 mb-6 tracking-widest uppercase font-semibold">
              SYSTEM SPECS
            </h4>
            <div className="space-y-3 font-mono text-xs text-neutral-400">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Engine</span>
                <span className="text-white">Chromium 130 + React 19</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>AI Runtime</span>
                <span className="text-white">WebLLM / WebGPU</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Memory Base</span>
                <span className="text-white">~250MB Base</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Local Bridge</span>
                <span className="text-white">Port 3020 MCP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-neutral-400">
          <div>ALL RIGHTS RESERVED // SOVEREIGN COMPUTING</div>
          <button
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          >
            <span>BACK TO TOP</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
