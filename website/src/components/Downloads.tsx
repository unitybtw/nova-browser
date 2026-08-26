import React from 'react';
import { Download, CheckCircle2, Github, Monitor, Apple } from 'lucide-react';

export const Downloads: React.FC = () => {
  return (
    <section id="download" className="py-32 px-6 max-w-7xl mx-auto border-t border-[#e5e5e5]">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
          GET STARTED TODAY
        </span>
        <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#171717] tracking-tight mt-3">
          Download <span className="italic font-normal">Nova Browser</span>.
        </h2>
        <p className="font-sans text-neutral-600 mt-4 text-base sm:text-lg leading-relaxed">
          Free, open-source, and sovereign forever. Engineered for power users, developers, and researchers.
        </p>
      </div>

      {/* Download Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* macOS */}
        <div className="p-8 sm:p-10 rounded-2xl bg-white border border-[#e5e5e5] hover:shadow-xl hover:border-[#4338ca]/30 transition-all duration-500 hover:-translate-y-1 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[#171717] group-hover:bg-[#4338ca] group-hover:text-white transition-colors duration-300">
                <Apple className="w-6 h-6" />
              </div>
              <span className="font-mono text-[10px] font-bold text-neutral-400 tracking-wider uppercase bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                v1.0.7 // UNIVERSAL
              </span>
            </div>

            <h3 className="font-serif text-2xl font-bold mb-2 text-[#171717]">macOS</h3>
            <p className="font-sans text-xs text-neutral-600 mb-8 leading-relaxed">
              Optimized for Apple Silicon (M1/M2/M3/M4) and Intel Macs. Requires macOS 12 Monterey or newer.
            </p>
          </div>

          <a
            href="https://github.com/unitybtw/nova-browser/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-6 rounded-lg bg-[#171717] text-[#fcfbf9] font-mono text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 hover:bg-[#4338ca] transition-colors duration-300 shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Download DMG for Mac</span>
          </a>
        </div>

        {/* Windows */}
        <div className="p-8 sm:p-10 rounded-2xl bg-white border border-[#e5e5e5] hover:shadow-xl hover:border-[#4338ca]/30 transition-all duration-500 hover:-translate-y-1 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[#171717] group-hover:bg-[#4338ca] group-hover:text-white transition-colors duration-300">
                <Monitor className="w-6 h-6" />
              </div>
              <span className="font-mono text-[10px] font-bold text-neutral-400 tracking-wider uppercase bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                v1.0.7 // X64
              </span>
            </div>

            <h3 className="font-serif text-2xl font-bold mb-2 text-[#171717]">Windows</h3>
            <p className="font-sans text-xs text-neutral-600 mb-8 leading-relaxed">
              Native installer for Windows 10 & 11 (64-bit). Direct hardware WebGPU acceleration support.
            </p>
          </div>

          <a
            href="https://github.com/unitybtw/nova-browser/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-6 rounded-lg bg-[#171717] text-[#fcfbf9] font-mono text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 hover:bg-[#4338ca] transition-colors duration-300 shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Download Setup (.EXE)</span>
          </a>
        </div>
      </div>

      {/* Verification badges */}
      <div className="flex flex-wrap items-center justify-center gap-8 mt-14 pt-8 border-t border-[#e5e5e5] text-neutral-500 text-xs font-mono">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>100% OPEN SOURCE</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>NO TELEMETRY & NO TRACKING</span>
        </div>
        <div className="flex items-center gap-2">
          <Github className="w-4 h-4 text-[#4338ca]" />
          <span>GITHUB VERIFIED RELEASES</span>
        </div>
      </div>
    </section>
  );
};

export default Downloads;
