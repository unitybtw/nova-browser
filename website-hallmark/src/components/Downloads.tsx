import React, { useState } from 'react';
import { Download, Monitor, Apple, Terminal, Copy, Check, CheckCircle2, Github, ShieldCheck } from 'lucide-react';

export const Downloads: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'brew' | 'winget' | 'linux' | 'source'>('brew');
  const [copied, setCopied] = useState(false);

  const CLI_COMMANDS = {
    brew: 'brew install --cask unitybtw/tap/nova-browser',
    winget: 'winget install NovaBrowser.Nova',
    linux: 'curl -fsSL https://raw.githubusercontent.com/unitybtw/nova-browser/main/install.sh | bash',
    source: 'git clone https://github.com/unitybtw/nova-browser.git && cd nova-browser && npm install && npm run dev',
  };

  const handleCopy = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <section id="download" className="py-24 px-4 sm:px-6 max-w-6xl mx-auto border-t border-[#24293d]">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="font-mono text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">
          GET STARTED TODAY
        </div>
        <h2 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight">
          Download <span className="text-indigo-400">Nova Browser</span>.
        </h2>
        <p className="font-sans text-sm sm:text-base text-slate-300 mt-4 leading-relaxed">
          Free, sovereign, and open source under MIT. No account required, no telemetry pings, no cloud subscriptions.
        </p>
      </div>

      {/* Platform Download Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* macOS */}
        <div className="tech-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-[#181c2a] border border-[#24293d] text-white">
                <Apple className="w-6 h-6" />
              </div>
              <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase">
                v1.1.0 // UNIVERSAL
              </span>
            </div>

            <h3 className="font-display text-2xl font-bold text-white mb-2">macOS</h3>
            <p className="font-sans text-xs text-slate-300 mb-6 leading-relaxed">
              Native binary optimized for Apple Silicon (M1/M2/M3/M4) and Intel x86 with Metal GPU compute acceleration.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-8 font-mono text-[10px]">
              <span className="px-2.5 py-1 rounded-lg bg-[#181c2a] border border-[#24293d] text-indigo-300 font-semibold">
                Apple Silicon (ARM64)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#181c2a] border border-[#24293d] text-slate-300">
                Intel (x64)
              </span>
            </div>
          </div>

          <div>
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="tech-button w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold gap-2 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>DOWNLOAD DMG</span>
            </a>
            <p className="font-mono text-[10px] text-slate-400 text-center mt-2.5">
              or <code className="text-indigo-300">brew install --cask nova-browser</code>
            </p>
          </div>
        </div>

        {/* Windows */}
        <div className="tech-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-[#181c2a] border border-[#24293d] text-white">
                <Monitor className="w-6 h-6" />
              </div>
              <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase">
                v1.1.0 // X64
              </span>
            </div>

            <h3 className="font-display text-2xl font-bold text-white mb-2">Windows</h3>
            <p className="font-sans text-xs text-slate-300 mb-6 leading-relaxed">
              Standalone installer for Windows 10 & 11 (64-bit) with Direct3D 12 and Vulkan WebGPU bindings.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-8 font-mono text-[10px]">
              <span className="px-2.5 py-1 rounded-lg bg-[#181c2a] border border-[#24293d] text-indigo-300 font-semibold">
                Windows 10 / 11 (64-bit)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#181c2a] border border-[#24293d] text-slate-300">
                DirectX 12 / Vulkan
              </span>
            </div>
          </div>

          <div>
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="tech-button w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold gap-2 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>DOWNLOAD SETUP (.EXE)</span>
            </a>
            <p className="font-mono text-[10px] text-slate-400 text-center mt-2.5">
              or <code className="text-indigo-300">winget install NovaBrowser.Nova</code>
            </p>
          </div>
        </div>

        {/* Linux */}
        <div className="tech-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 rounded-2xl bg-[#181c2a] border border-[#24293d] text-white">
                <Terminal className="w-6 h-6" />
              </div>
              <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase">
                v1.1.0 // LINUX
              </span>
            </div>

            <h3 className="font-display text-2xl font-bold text-white mb-2">Linux</h3>
            <p className="font-sans text-xs text-slate-300 mb-6 leading-relaxed">
              Universal AppImage, Debian/Ubuntu (.deb), and Arch AUR packages with native Wayland & Vulkan acceleration.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-8 font-mono text-[10px]">
              <span className="px-2.5 py-1 rounded-lg bg-[#181c2a] border border-[#24293d] text-indigo-300 font-semibold">
                AppImage / .deb
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#181c2a] border border-[#24293d] text-slate-300">
                Wayland & X11
              </span>
            </div>
          </div>

          <div>
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="tech-button w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold gap-2 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>DOWNLOAD APPIMAGE</span>
            </a>
            <p className="font-mono text-[10px] text-slate-400 text-center mt-2.5">
              AUR: <code className="text-indigo-300">yay -S nova-browser-bin</code>
            </p>
          </div>
        </div>
      </div>

      {/* Terminal Command Switcher */}
      <div className="rounded-3xl border border-[#24293d] bg-[#0e1017] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#24293d]">
          <div className="flex items-center gap-2 text-slate-300 font-mono text-xs font-bold">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>PACKAGE MANAGER & CLI INSTALLATION</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[#181c2a] rounded-xl font-mono text-xs">
            {(['brew', 'winget', 'linux', 'source'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === tab ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-[#08090d] border border-[#24293d]/60 flex items-center justify-between gap-4 font-mono text-xs text-emerald-400 overflow-x-auto">
          <span className="select-all min-w-0 truncate">$ {CLI_COMMANDS[activeTab]}</span>
          <button
            type="button"
            onClick={() => handleCopy(CLI_COMMANDS[activeTab])}
            className="shrink-0 px-3.5 py-1.5 rounded-lg bg-[#181c2a] hover:bg-[#24293d] text-slate-200 text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">COPIED</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>COPY</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Trust & Verification Badges */}
      <div className="flex flex-wrap items-center justify-center gap-8 mt-14 pt-8 border-t border-[#24293d] font-mono text-xs text-slate-400">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>100% OPEN SOURCE UNDER MIT</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>NO TELEMETRY & NO TRACKING</span>
        </div>
        <div className="flex items-center gap-2 text-indigo-400">
          <Github className="w-4 h-4" />
          <span>GITHUB VERIFIED CRYPTOGRAPHIC RELEASES</span>
        </div>
      </div>
    </section>
  );
};

export default Downloads;
