import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Download, CheckCircle2, Github, Monitor, Apple, Terminal, Copy, Check } from 'lucide-react';

export const Downloads: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [activeCliTab, setActiveCliTab] = useState<'brew' | 'winget' | 'linux' | 'source'>('brew');

  const CLI_COMMANDS = {
    brew: 'brew install --cask unitybtw/tap/nova-browser',
    winget: 'winget install NovaBrowser.Nova',
    linux: 'curl -fsSL https://raw.githubusercontent.com/unitybtw/nova-browser/main/install.sh | bash',
    source: 'git clone https://github.com/unitybtw/nova-browser.git && cd nova-browser && npm install && npm run dev',
  };

  const handleCopy = async (tab: 'brew' | 'winget' | 'linux' | 'source') => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(CLI_COMMANDS[tab]);
      setCopiedTab(tab);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch {
      setCopyError('Copy failed. Select the command manually instead.');
      setTimeout(() => setCopyError(null), 4000);
    }
  };

  return (
    <section id="download" className="mx-auto max-w-7xl border-t border-[#e5e5e5] px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
      <div className="editorial-rail" aria-hidden="true"><span>05</span><i /></div>
      {/* Section Header */}
      <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-16">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
        {/* macOS Card */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="luxury-card group flex flex-col justify-between rounded-2xl border border-[#e5e5e5] bg-white/85 p-5 shadow-xs backdrop-blur-sm sm:p-7"
        >
          <div>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200/60 text-[#171717]">
                <Apple className="w-6 h-6" />
              </div>
              <span className="font-mono text-[10px] font-bold text-neutral-400 tracking-wider uppercase bg-neutral-100 px-2.5 py-1 rounded-full">
                v1.1.0 // UNIVERSAL
              </span>
            </div>

            <h3 className="font-display font-bold text-xl mb-2 text-[#171717]">macOS</h3>
            <p className="font-sans text-xs text-neutral-600 mb-6 leading-relaxed">
              Native binary optimized for Apple Silicon (M1/M2/M3/M4) and Intel x86 Macs with Metal GPU acceleration.
            </p>

            {/* Architecture Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mb-8">
              <span className="font-mono text-[10px] font-semibold bg-indigo-50 text-[#4338ca] border border-indigo-100 px-2 py-0.5 rounded-md">
                Apple Silicon (ARM64)
              </span>
              <span className="font-mono text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">
                Intel (x64)
              </span>
            </div>
          </div>

          <div>
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#171717] px-5 py-3 text-[#fcfbf9] font-mono text-xs font-bold uppercase tracking-wider shadow-sm transition-colors hover:bg-[#4338ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Download DMG</span>
            </a>
            <p className="font-mono text-[10px] text-neutral-500 text-center mt-2.5">
              or <code className="bg-neutral-100 text-[#171717] px-1 py-0.5 rounded text-[10px]">brew install --cask nova-browser</code>
            </p>
          </div>
        </motion.div>

        {/* Windows Card */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="luxury-card group flex flex-col justify-between rounded-2xl border border-[#e5e5e5] bg-white/85 p-5 shadow-xs backdrop-blur-sm sm:p-7"
        >
          <div>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200/60 text-[#171717]">
                <Monitor className="w-6 h-6" />
              </div>
              <span className="font-mono text-[10px] font-bold text-neutral-400 tracking-wider uppercase bg-neutral-100 px-2.5 py-1 rounded-full">
                v1.1.0 // X64
              </span>
            </div>

            <h3 className="font-display font-bold text-xl mb-2 text-[#171717]">Windows</h3>
            <p className="font-sans text-xs text-neutral-600 mb-6 leading-relaxed">
              Standalone installer for Windows 10 & 11 (64-bit) with direct DirectX 12 & WebGPU hardware bindings.
            </p>

            {/* Architecture Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mb-8">
              <span className="font-mono text-[10px] font-semibold bg-indigo-50 text-[#4338ca] border border-indigo-100 px-2 py-0.5 rounded-md">
                Windows 10 / 11 (64-bit)
              </span>
              <span className="font-mono text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">
                Vulkan / DX12
              </span>
            </div>
          </div>

          <div>
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#171717] px-5 py-3 text-[#fcfbf9] font-mono text-xs font-bold uppercase tracking-wider shadow-sm transition-colors hover:bg-[#4338ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Download Setup (.EXE)</span>
            </a>
            <p className="font-mono text-[10px] text-neutral-400 text-center mt-2.5">
              or <code className="bg-neutral-100 text-[#171717] px-1 py-0.5 rounded text-[10px]">winget install NovaBrowser.Nova</code>
            </p>
          </div>
        </motion.div>

        {/* Linux Card */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="luxury-card group flex flex-col justify-between rounded-2xl border border-[#e5e5e5] bg-white/85 p-5 shadow-xs backdrop-blur-sm sm:p-7"
        >
          <div>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200/60 text-[#171717]">
                <Terminal className="w-6 h-6" />
              </div>
              <span className="font-mono text-[10px] font-bold text-neutral-400 tracking-wider uppercase bg-neutral-100 px-2.5 py-1 rounded-full">
                v1.1.0 // LINUX
              </span>
            </div>

            <h3 className="font-display font-bold text-xl mb-2 text-[#171717]">Linux</h3>
            <p className="font-sans text-xs text-neutral-600 mb-6 leading-relaxed">
              Universal AppImage, Debian/Ubuntu (.deb), and Arch AUR builds with Wayland & Vulkan acceleration.
            </p>

            {/* Architecture Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mb-8">
              <span className="font-mono text-[10px] font-semibold bg-indigo-50 text-[#4338ca] border border-indigo-100 px-2 py-0.5 rounded-md">
                AppImage / .deb
              </span>
              <span className="font-mono text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">
                Wayland & X11
              </span>
            </div>
          </div>

          <div>
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#171717] px-5 py-3 text-[#fcfbf9] font-mono text-xs font-bold uppercase tracking-wider shadow-sm transition-colors hover:bg-[#4338ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Download AppImage / .deb</span>
            </a>
            <p className="font-mono text-[10px] text-neutral-400 text-center mt-2.5">
              AUR: <code className="bg-neutral-100 text-[#171717] px-1 py-0.5 rounded text-[10px]">yay -S nova-browser-bin</code>
            </p>
          </div>
        </motion.div>
      </div>

      {/* 1-CLICK TERMINAL CLI INSTALLER FOR DEVELOPERS */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={prefersReducedMotion ? undefined : { duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="luxury-card mx-auto max-w-4xl rounded-2xl border border-neutral-800 bg-gradient-to-br from-[#171717] via-[#171717] to-[#24213f] p-6 text-white shadow-md sm:p-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-neutral-300 font-mono text-xs font-semibold">
              <Terminal aria-hidden="true" className="w-4 h-4 text-cyan-400" />
              <span>TERMINAL PACKAGE MANAGER</span>
            </div>
            <p className="mt-1 max-w-md text-[11px] leading-relaxed text-neutral-500">Choose a package manager, then copy the exact command for your system.</p>
          </div>

          {/* CLI Tabs */}
          <div role="tablist" aria-label="Installation methods" className="flex items-center gap-1.5 p-1 bg-neutral-800 rounded-lg">
            {(['brew', 'winget', 'linux', 'source'] as const).map((tab) => (
              <button
                key={tab}
                id={`install-tab-${tab}`}
                role="tab"
                aria-controls="install-command-panel"
                aria-selected={activeCliTab === tab}
                tabIndex={activeCliTab === tab ? 0 : -1}
                type="button"
                onClick={() => setActiveCliTab(tab)}
                onKeyDown={(event) => {
                  const methods = ['brew', 'winget', 'linux', 'source'] as const;
                  const currentIndex = methods.indexOf(tab);
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActiveCliTab(tab);
                    return;
                  }
                  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const nextIndex = event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? methods.length - 1
                      : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + methods.length) % methods.length;
                  const nextMethod = methods[nextIndex];
                  setActiveCliTab(nextMethod);
                  window.requestAnimationFrame(() => document.getElementById(`install-tab-${nextMethod}`)?.focus());
                }}
                aria-label={`Show ${tab.toUpperCase()} installation command`}
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
        <div id="install-command-panel" role="tabpanel" aria-labelledby={`install-tab-${activeCliTab}`} className="flex items-center justify-between gap-4 p-3.5 bg-black/60 rounded-xl border border-neutral-800 font-mono text-xs text-emerald-400 overflow-x-auto">
          <span className="select-all">$ {CLI_COMMANDS[activeCliTab]}</span>
          <button
            type="button"
            onClick={() => handleCopy(activeCliTab)}
            aria-label={`Copy ${activeCliTab.toUpperCase()} installation command`}
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
        <p aria-live="polite" className="mt-3 min-h-4 text-center font-mono text-[10px] text-neutral-400">
          {copyError || (copiedTab === activeCliTab ? 'Command copied to clipboard.' : 'Select the command or copy it with one click.')}
        </p>
      </motion.div>

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
