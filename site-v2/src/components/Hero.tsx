import { useEffect, useState } from 'react';
import { Download, Terminal, Github, Copy, Check, ShieldCheck, Cpu, HardDrive, Lock } from 'lucide-react';

export const Hero = () => {
  const [os, setOs] = useState<'mac' | 'windows' | 'linux'>('mac');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) setOs('windows');
    else if (ua.includes('linux')) setOs('linux');
    else setOs('mac');
  }, []);

  const downloadData = {
    mac: {
      name: 'macOS',
      arch: 'Apple Silicon & Intel',
      cmd: 'brew install --cask unitybtw/tap/nova-browser',
      url: 'https://github.com/unitybtw/nova-browser/releases',
    },
    windows: {
      name: 'Windows',
      arch: 'Windows 10 / 11 (64-bit)',
      cmd: 'winget install NovaBrowser.Nova',
      url: 'https://github.com/unitybtw/nova-browser/releases',
    },
    linux: {
      name: 'Linux',
      arch: 'AppImage / .deb / Arch AUR',
      cmd: 'curl -fsSL https://raw.githubusercontent.com/unitybtw/nova-browser/main/install.sh | bash',
      url: 'https://github.com/unitybtw/nova-browser/releases',
    },
  };

  const current = downloadData[os];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current.cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <section className="pt-32 sm:pt-40 pb-20 px-4 sm:px-6 max-w-5xl mx-auto flex flex-col items-center text-center">
      {/* Title */}
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white leading-[1.06] tracking-[-0.035em]">
        The Sovereign Desktop Browser.
      </h1>

      {/* Subtitle */}
      <p className="mt-6 text-base sm:text-xl text-slate-300 leading-relaxed font-sans">
        An open-source desktop browser executing quantized WebGPU neural models directly on your hardware. Sub-millisecond tracker interception, synchronized split workspaces, and zero cloud telemetry.
      </p>

      {/* Primary Action Box */}
      <div className="mt-10 w-full max-w-lg flex flex-col items-center gap-3.5">
        <div className="w-full flex flex-col sm:flex-row items-stretch justify-center gap-3">
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="action-btn-primary flex-1 gap-2 text-center"
          >
            <Download className="w-4 h-4" />
            <span>Download for {current.name} (v1.1.0)</span>
          </a>

          <a
            href="https://github.com/unitybtw/nova-browser"
            target="_blank"
            rel="noopener noreferrer"
            className="action-btn-secondary gap-2"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </a>
        </div>

        <div className="text-xs text-slate-400 font-sans flex items-center gap-2">
          <span>{current.arch}</span>
          <span>·</span>
          <span>SHA-256 Verified</span>
          <span>·</span>
          <a href="#downloads" className="text-indigo-400 hover:underline">
            All Platforms
          </a>
        </div>

        {/* Terminal Package Manager Box */}
        <div className="w-full mt-2 p-3 rounded-xl bg-[#08090f] border border-[#252a3f] flex items-center justify-between gap-3 text-left font-mono text-xs text-emerald-400">
          <div className="flex items-center gap-2 select-all min-w-0">
            <Terminal className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">$ {current.cmd}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy installation command"
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#1a1e2f] hover:bg-[#252a3f] text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
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

      {/* Signal Metrics Grid */}
      <div className="mt-16 pt-10 border-t border-[#252a3f] w-full grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
        <div className="surface-panel p-5">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Cpu className="w-4 h-4" />
            <span className="font-mono text-[11px] font-semibold uppercase">Local WebGPU</span>
          </div>
          <div className="font-display font-extrabold text-2xl text-white">64.2 tok/s</div>
          <p className="text-xs text-slate-400 mt-1">Llama 3.2 3B on-device</p>
        </div>

        <div className="surface-panel p-5">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-mono text-[11px] font-semibold uppercase">Privacy Shield</span>
          </div>
          <div className="font-display font-extrabold text-2xl text-white">0.12 ms</div>
          <p className="text-xs text-slate-400 mt-1">Kernel socket intercept</p>
        </div>

        <div className="surface-panel p-5">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <HardDrive className="w-4 h-4" />
            <span className="font-mono text-[11px] font-semibold uppercase">Hibernation</span>
          </div>
          <div className="font-display font-extrabold text-2xl text-white">420 MB RAM</div>
          <p className="text-xs text-slate-400 mt-1">20 active web tabs</p>
        </div>

        <div className="surface-panel p-5">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Lock className="w-4 h-4" />
            <span className="font-mono text-[11px] font-semibold uppercase">Zero Telemetry</span>
          </div>
          <div className="font-display font-extrabold text-2xl text-white">0 KB Sent</div>
          <p className="text-xs text-slate-400 mt-1">100% private computing</p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
