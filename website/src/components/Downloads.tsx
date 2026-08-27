import React, { useState } from 'react';
import { Download, CheckCircle2, Github, Monitor, Apple, Terminal, Copy, Check } from 'lucide-react';

export const Downloads: React.FC = () => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [activeCliTab, setActiveCliTab] = useState<'brew' | 'winget' | 'source'>('brew');

  const CLI_COMMANDS = {
    brew: 'brew install --cask unitybtw/tap/nova-browser',
    winget: 'winget install NovaBrowser.Nova',
    source: 'git clone https://github.com/unitybtw/nova-browser.git && cd nova-browser && npm install && npm run dev',
  };

  const handleCopy = (tab: 'brew' | 'winget' | 'source') => {
    navigator.clipboard.writeText(CLI_COMMANDS[tab]);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <section id="download" className="py-32 px-6 max-w-7xl mx-auto border-t border-[#e5e5e5]">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
          GET STARTED TODAY
        </span>
        <h2 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[#171717] tracking-tight mt-3">
          Download <span className="text-[#4338ca]">Nova Browser</span>.
        </h2>
        <p className="font-sans text-neutral-600 mt-4 text-base sm:text-lg leading-relaxed">
          Free, open-source, and sovereign forever. Engineered for power users, developers, and researchers.
        </p>
      </div>

      {/* Download Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
        {/* macOS Card */}
        <div className="p-8 sm:p-10 rounded-2xl bg-white border border-[#e5e5e5] shadow-xs hover:border-neutral-400 transition-colors flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200/60 text-[#171717]">
                <Apple className="w-6 h-6" />
              </div>
              <span className="font-mono text-[10px] font-bold text-neutral-400 tracking-wider uppercase bg-neutral-100 px-2.5 py-1 rounded-full">
                v1.1.0 // UNIVERSAL
              </span>
            </div>

            <h3 className="font-display font-bold text-2xl mb-2 text-[#171717]">macOS</h3>
            <p className="font-sans text-xs text-neutral-600 mb-6 leading-relaxed">
              Native binary optimized for Apple Silicon (M1/M2/M3/M4) and Intel x86 Macs. Available via Homebrew or direct DMG.
            </p>

            {/* Architecture Chips */}
            <div className="flex items-center gap-2 mb-8">
              <span className="font-mono text-[10px] font-semibold bg-indigo-50 text-[#4338ca] border border-indigo-100 px-2.5 py-1 rounded-lg">
                Apple Silicon (ARM64)
              </span>
              <span className="font-mono text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-lg">
                Intel (x64)
              </span>
            </div>
          </div>

          <div>
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-xl bg-[#171717] text-[#fcfbf9] font-mono text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 hover:bg-[#4338ca] transition-colors shadow-sm active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Download DMG for Mac</span>
            </a>
            <p className="font-mono text-[11px] text-neutral-500 text-center mt-3">
              or run <code className="bg-neutral-100 text-[#171717] px-1.5 py-0.5 rounded text-[10px]">brew install --cask unitybtw/tap/nova-browser</code>
            </p>
          </div>
        </div>

        {/* Windows Card */}
        <div className="p-8 sm:p-10 rounded-2xl bg-white border border-[#e5e5e5] shadow-xs hover:border-neutral-400 transition-colors flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200/60 text-[#171717]">
                <Monitor className="w-6 h-6" />
              </div>
              <span className="font-mono text-[10px] font-bold text-neutral-400 tracking-wider uppercase bg-neutral-100 px-2.5 py-1 rounded-full">
                v1.1.0 // X64
              </span>
            </div>

            <h3 className="font-display font-bold text-2xl mb-2 text-[#171717]">Windows</h3>
            <p className="font-sans text-xs text-neutral-600 mb-6 leading-relaxed">
              Standalone installer for Windows 10 & 11 (64-bit) with direct DirectX 12 & WebGPU hardware bindings.
            </p>

            {/* Architecture Chips */}
            <div className="flex items-center gap-2 mb-8">
              <span className="font-mono text-[10px] font-semibold bg-indigo-50 text-[#4338ca] border border-indigo-100 px-2.5 py-1 rounded-lg">
                Windows 10 / 11 (64-bit)
              </span>
              <span className="font-mono text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-lg">
                Vulkan / DX12
              </span>
            </div>
          </div>

          <div>
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-xl bg-[#171717] text-[#fcfbf9] font-mono text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 hover:bg-[#4338ca] transition-colors shadow-sm active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Download Setup (.EXE)</span>
            </a>
            <p className="font-mono text-[10px] text-neutral-400 text-center mt-2.5">
              Also available as standalone Portable .exe (no admin rights required)
            </p>
          </div>
        </div>
      </div>

      {/* 1-CLICK TERMINAL CLI INSTALLER FOR DEVELOPERS */}
      <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-2xl bg-neutral-900 text-white border border-neutral-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-neutral-300 font-mono text-xs font-semibold">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>TERMINAL PACKAGE MANAGER</span>
          </div>

          {/* CLI Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-800 rounded-lg">
            {(['brew', 'winget', 'source'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveCliTab(tab)}
                className={`px-3 py-1 rounded-md font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeCliTab === tab
                    ? 'bg-[#171717] text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Command Line Box */}
        <div className="flex items-center justify-between gap-4 p-3.5 bg-black/60 rounded-xl border border-neutral-800 font-mono text-xs text-emerald-400 overflow-x-auto">
          <span className="select-all">$ {CLI_COMMANDS[activeCliTab]}</span>
          <button
            onClick={() => handleCopy(activeCliTab)}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
          >
            {copiedTab === activeCliTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
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
