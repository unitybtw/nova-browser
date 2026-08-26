import React from 'react';
import { Github, ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#060010] text-white pt-24 pb-12 px-6 sm:px-12 rounded-t-[4rem] overflow-hidden border-t border-white/10 mt-12">
      {/* Subtle radial indigo glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/15 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Large Quote */}
        <div className="mb-20 text-center max-w-4xl mx-auto">
          <blockquote className="font-serif italic font-normal text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white leading-snug">
            “The future of personal computing is local, private, and{' '}
            <span className="text-indigo-400 not-italic font-sans font-bold">organically intelligent</span>.”
          </blockquote>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mt-6">
            — NOVA CORE MANIFESTO // 2026
          </p>
        </div>

        {/* 3-Column Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 py-16 border-t border-b border-white/10 text-sm">
          {/* Col 1: Project Identity */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src="/nova-icon-transparent.png"
                alt="Nova Logo"
                className="w-6 h-6 object-contain"
              />
              <span className="font-sans text-xl font-bold">Nova Browser</span>
            </div>
            <p className="font-body text-xs text-slate-400 leading-relaxed max-w-xs mb-4">
              An open-source AI-native web browser engineered with React, Electron, and on-device WebLLM neural inference.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-emerald-400 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>STABLE RELEASE v1.0.7</span>
            </div>
          </div>

          {/* Col 2: Specifications & Architecture */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-slate-300 font-semibold mb-4">
              ARCHITECTURE SPEC
            </h4>
            <ul className="space-y-2.5 font-body text-xs text-slate-400">
              <li>
                <span className="text-slate-200">Engine:</span> Chromium 130 + Electron + React 19
              </li>
              <li>
                <span className="text-slate-200">AI Runtime:</span> WebLLM (TVM WebGPU Acceleration)
              </li>
              <li>
                <span className="text-slate-200">Cryptography:</span> AES-256-GCM + PBKDF2
              </li>
              <li>
                <span className="text-slate-200">Local Bridge:</span> Model Context Protocol (Port 3020)
              </li>
              <li>
                <span className="text-slate-200">License:</span> MIT Open Source
              </li>
            </ul>
          </div>

          {/* Col 3: Links & Resources */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-slate-300 font-semibold mb-4">
              SOURCE & COMMUNITY
            </h4>
            <ul className="space-y-2.5 font-body text-xs text-slate-400">
              <li>
                <a
                  href="https://github.com/unitybtw/nova-browser"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center gap-1.5"
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
                  className="hover:text-white transition-colors"
                >
                  Releases & Changelog
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/unitybtw/nova-browser/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Report an Issue
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/unitybtw/nova-browser/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  MIT License
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Minimalist Monospace Bottom Row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-slate-400">
          <div>
            © {new Date().getFullYear()} NOVA BROWSER // ALL RIGHTS RESERVED.
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              <span>BACK TO TOP</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
