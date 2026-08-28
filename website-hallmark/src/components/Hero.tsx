import React, { useEffect, useState } from 'react';
import { Download, Terminal, Github, ArrowUpRight, Copy, Check, ShieldCheck, Cpu, HardDrive, Lock } from 'lucide-react';

export const Hero: React.FC = () => {
  const [os, setOs] = useState<'mac' | 'windows' | 'linux'>('mac');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) setOs('windows');
    else if (ua.includes('linux')) setOs('linux');
    else setOs('mac');
  }, []);

  const downloadLinks = {
    mac: {
      name: 'macOS',
      file: 'Nova-1.1.0-universal.dmg',
      tag: 'Apple Silicon & Intel (Universal)',
      cmd: 'brew install --cask unitybtw/tap/nova-browser',
      url: 'https://github.com/unitybtw/nova-browser/releases',
    },
    windows: {
      name: 'Windows',
      file: 'Nova-Setup-1.1.0.exe',
      tag: 'Windows 10 / 11 (64-bit Direct3D 12)',
      cmd: 'winget install NovaBrowser.Nova',
      url: 'https://github.com/unitybtw/nova-browser/releases',
    },
    linux: {
      name: 'Linux',
      file: 'Nova-1.1.0.AppImage',
      tag: 'AppImage / .deb / Arch AUR (Wayland & X11)',
      cmd: 'curl -fsSL https://raw.githubusercontent.com/unitybtw/nova-browser/main/install.sh | bash',
      url: 'https://github.com/unitybtw/nova-browser/releases',
    },
  };

  const current = downloadLinks[os];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current.cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <section className="relative pt-32 sm:pt-40 pb-20 px-4 sm:px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
      {/* Top Architecture Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131620] border border-[#24293d] shadow-sm font-mono text-[11px] font-semibold text-indigo-400 mb-8">
        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
        <span>SOVEREIGN DESKTOP BROWSER // LOCAL-FIRST WEBGPU</span>
      </div>

      {/* Main Specimen Heading */}
      <h1 className="max-w-5xl font-display font-extrabold text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.02] tracking-[-0.04em] text-white">
        Thought at the Speed of{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-300 to-cyan-400">
          Hardware.
        </span>
      </h1>

      {/* Subtitle */}
      <p className="mt-6 max-w-2xl text-base sm:text-lg md:text-xl text-slate-300 font-sans leading-relaxed">
        An open-source desktop browser executing quantized neural models directly on your GPU. Kernel-level tracker blocking, synchronized workspaces, and zero cloud telemetry.
      </p>

      {/* Download Action Hub */}
      <div className="mt-10 w-full max-w-xl flex flex-col items-center gap-4">
        {/* Main 1-Click Download Button */}
        <div className="w-full flex flex-col sm:flex-row items-stretch justify-center gap-3">
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="tech-button flex-1 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs sm:text-sm font-bold tracking-wider shadow-[0_10px_30px_rgba(79,70,229,0.35)] border border-indigo-400/30 gap-2.5"
          >
            <Download className="w-5 h-5" />
            <span>DOWNLOAD FOR {current.name.toUpperCase()} (V1.1.0)</span>
          </a>

          <a
            href="https://github.com/unitybtw/nova-browser"
            target="_blank"
            rel="noopener noreferrer"
            className="tech-button px-6 py-4 rounded-2xl bg-[#131620] hover:bg-[#181c2a] text-slate-200 hover:text-white font-mono text-xs sm:text-sm font-bold tracking-wider border border-[#24293d] gap-2"
          >
            <Github className="w-5 h-5" />
            <span>GITHUB</span>
            <ArrowUpRight className="w-4 h-4 text-slate-500" />
          </a>
        </div>

        {/* Detected OS Metadata Badge */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[11px] text-slate-400">
          <span className="text-slate-300 font-semibold">{current.tag}</span>
          <span>·</span>
          <span>SHA-256 Verified</span>
          <span>·</span>
          <a href="#download" className="text-indigo-400 hover:underline">
            All Platforms (Win/Mac/Linux)
          </a>
        </div>

        {/* 1-Click Terminal Package Manager Copy Box */}
        <div className="w-full mt-3 p-3 rounded-2xl bg-[#0e1017] border border-[#24293d] flex items-center justify-between gap-3 text-left font-mono text-xs text-emerald-400 overflow-x-auto">
          <div className="flex items-center gap-2 select-all min-w-0">
            <Terminal className="w-4 h-4 shrink-0 text-slate-500" />
            <span className="truncate">$ {current.cmd}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy terminal installation command"
            className="shrink-0 px-3 py-1.5 rounded-xl bg-[#181c2a] hover:bg-[#24293d] text-slate-200 hover:text-white text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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

      {/* Verified System Proof Badges */}
      <div className="mt-14 pt-8 border-t border-[#24293d]/80 w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
        <div className="p-4 rounded-2xl bg-[#131620]/60 border border-[#24293d]/60">
          <div className="flex items-center gap-2 text-indigo-400 mb-1">
            <Cpu className="w-4 h-4" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">LOCAL WEBGPU</span>
          </div>
          <div className="font-display font-bold text-lg text-white">64.2 tok/s</div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">Zero cloud latency</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#131620]/60 border border-[#24293d]/60">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">PRIVACY SHIELD</span>
          </div>
          <div className="font-display font-bold text-lg text-white">0ms Overhead</div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">Rust kernel intercept</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#131620]/60 border border-[#24293d]/60">
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <HardDrive className="w-4 h-4" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">HIBERNATION</span>
          </div>
          <div className="font-display font-bold text-lg text-white">420 MB RAM</div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">20 active tabs</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#131620]/60 border border-[#24293d]/60">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Lock className="w-4 h-4" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">SOVEREIGNTY</span>
          </div>
          <div className="font-display font-bold text-lg text-white">0 KB Sent</div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">Zero telemetry pings</p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
