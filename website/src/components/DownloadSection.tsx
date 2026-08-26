import React from 'react';
import { Download, CheckCircle2, Github, Monitor, Apple } from 'lucide-react';

export const DownloadSection: React.FC = () => {
  return (
    <section id="download" className="py-32 px-6 max-w-7xl mx-auto">
      <div className="relative rounded-[3rem] bg-[#171717] text-white p-10 sm:p-16 lg:p-20 overflow-hidden border border-white/10 shadow-2xl">
        {/* Subtle background radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/20 blur-[120px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-2xl mx-auto mb-16">
          <span className="font-mono-tracked text-[11px] text-indigo-400 font-semibold">
            GET STARTED TODAY
          </span>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight mt-3">
            Download <span className="italic font-normal">Nova Browser</span>.
          </h2>
          <p className="font-body text-neutral-400 mt-4 text-base sm:text-lg leading-relaxed">
            Free, open-source, and private forever. Built for builders, researchers, and creators.
          </p>
        </div>

        {/* Download Cards Grid */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* macOS Download Card */}
          <div className="p-8 rounded-3xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-2xl bg-white/10 text-white">
                  <Apple className="w-6 h-6" />
                </div>
                <span className="font-mono text-[10px] font-bold text-neutral-400 tracking-wider">
                  v1.0.7 // UNIVERSAL
                </span>
              </div>

              <h3 className="font-display text-2xl font-bold mb-2">macOS</h3>
              <p className="font-body text-xs text-neutral-400 mb-6 leading-relaxed">
                Optimized for Apple Silicon (M1/M2/M3/M4) and Intel Macs. Requires macOS 12 Monterey or newer.
              </p>
            </div>

            <div>
              <a
                href="https://github.com/unitybtw/nova-browser/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-6 rounded-full bg-white text-[#171717] font-mono text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 hover:bg-indigo-400 hover:text-white transition-colors duration-300 shadow-md group-hover:shadow-indigo-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Download DMG for Mac</span>
              </a>
            </div>
          </div>

          {/* Windows Download Card */}
          <div className="p-8 rounded-3xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-2xl bg-white/10 text-white">
                  <Monitor className="w-6 h-6" />
                </div>
                <span className="font-mono text-[10px] font-bold text-neutral-400 tracking-wider">
                  v1.0.7 // X64
                </span>
              </div>

              <h3 className="font-display text-2xl font-bold mb-2">Windows</h3>
              <p className="font-body text-xs text-neutral-400 mb-6 leading-relaxed">
                Native installer for Windows 10 & 11 (64-bit). Direct hardware WebGPU acceleration support.
              </p>
            </div>

            <div>
              <a
                href="https://github.com/unitybtw/nova-browser/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-6 rounded-full bg-white text-[#171717] font-mono text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 hover:bg-indigo-400 hover:text-white transition-colors duration-300 shadow-md group-hover:shadow-indigo-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Download Setup (.EXE)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Security & Verification Metadata */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-8 mt-14 pt-8 border-t border-white/10 text-neutral-400 text-xs font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>100% OPEN SOURCE</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>NO TELEMETRY & NO TRACKING</span>
          </div>
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-indigo-400" />
            <span>GITHUB VERIFIED RELEASES</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DownloadSection;
