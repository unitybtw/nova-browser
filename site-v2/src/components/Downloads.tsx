import { useState } from 'react';
import { Download, Monitor, Apple, Terminal, Copy, Check, CheckCircle2, ShieldCheck, Github } from 'lucide-react';

export const Downloads = () => {
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
    <section id="downloads" className="py-24 px-4 sm:px-6 max-w-5xl mx-auto border-t border-[#252a3f]">
      <div className="mb-12 text-center max-w-xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          Download Nova Browser
        </h2>
        <p className="mt-3 text-base text-slate-300">
          Free, sovereign, and open source under MIT. No account required, no telemetry pings, no cloud subscriptions.
        </p>
      </div>

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* macOS */}
        <div className="surface-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="p-2.5 rounded-xl bg-[#1a1e2f] border border-[#252a3f] text-white">
                <Apple className="w-5 h-5" />
              </div>
              <span className="font-mono text-[10px] font-bold text-indigo-400 bg-[#1a1e2f] border border-[#252a3f] px-2 py-0.5 rounded uppercase">
                v1.1.0 // Universal
              </span>
            </div>

            <h3 className="font-display text-xl font-bold text-white mb-2">macOS</h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Native binary optimized for Apple Silicon (M1/M2/M3/M4) and Intel x86 with Metal GPU compute acceleration.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-8 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-[#1a1e2f] border border-[#252a3f] text-indigo-300 font-semibold">
                Apple Silicon (ARM64)
              </span>
              <span className="px-2 py-0.5 rounded bg-[#1a1e2f] border border-[#252a3f] text-slate-300">
                Intel (x64)
              </span>
            </div>
          </div>

          <div>
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn-primary w-full gap-2 !text-xs !min-h-[42px]"
            >
              <Download className="w-4 h-4" />
              <span>Download DMG</span>
            </a>
            <p className="font-mono text-[10px] text-slate-400 text-center mt-2">
              or <code className="text-indigo-300">brew install --cask nova-browser</code>
            </p>
          </div>
        </div>

        {/* Windows */}
        <div className="surface-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="p-2.5 rounded-xl bg-[#1a1e2f] border border-[#252a3f] text-white">
                <Monitor className="w-5 h-5" />
              </div>
              <span className="font-mono text-[10px] font-bold text-indigo-400 bg-[#1a1e2f] border border-[#252a3f] px-2 py-0.5 rounded uppercase">
                v1.1.0 // x64
              </span>
            </div>

            <h3 className="font-display text-xl font-bold text-white mb-2">Windows</h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Standalone installer for Windows 10 & 11 (64-bit) with Direct3D 12 and Vulkan WebGPU bindings.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-8 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-[#1a1e2f] border border-[#252a3f] text-indigo-300 font-semibold">
                Windows 10 / 11 (64-bit)
              </span>
              <span className="px-2 py-0.5 rounded bg-[#1a1e2f] border border-[#252a3f] text-slate-300">
                DirectX 12 / Vulkan
              </span>
            </div>
          </div>

          <div>
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn-primary w-full gap-2 !text-xs !min-h-[42px]"
            >
              <Download className="w-4 h-4" />
              <span>Download Setup (.EXE)</span>
            </a>
            <p className="font-mono text-[10px] text-slate-400 text-center mt-2">
              or <code className="text-indigo-300">winget install NovaBrowser.Nova</code>
            </p>
          </div>
        </div>

        {/* Linux */}
        <div className="surface-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="p-2.5 rounded-xl bg-[#1a1e2f] border border-[#252a3f] text-white">
                <Terminal className="w-5 h-5" />
              </div>
              <span className="font-mono text-[10px] font-bold text-indigo-400 bg-[#1a1e2f] border border-[#252a3f] px-2 py-0.5 rounded uppercase">
                v1.1.0 // Linux
              </span>
            </div>

            <h3 className="font-display text-xl font-bold text-white mb-2">Linux</h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Universal AppImage, Debian/Ubuntu (.deb), and Arch AUR packages with native Wayland & Vulkan acceleration.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-8 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-[#1a1e2f] border border-[#252a3f] text-indigo-300 font-semibold">
                AppImage / .deb
              </span>
              <span className="px-2 py-0.5 rounded bg-[#1a1e2f] border border-[#252a3f] text-slate-300">
                Wayland & X11
              </span>
            </div>
          </div>

          <div>
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn-primary w-full gap-2 !text-xs !min-h-[42px]"
            >
              <Download className="w-4 h-4" />
              <span>Download AppImage</span>
            </a>
            <p className="font-mono text-[10px] text-slate-400 text-center mt-2">
              AUR: <code className="text-indigo-300">yay -S nova-browser-bin</code>
            </p>
          </div>
        </div>
      </div>

      {/* Terminal Command Box */}
      <div className="surface-panel p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#252a3f]">
          <div className="flex items-center gap-2 text-slate-300 font-mono text-xs font-semibold">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Package Manager Installation</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[#1a1e2f] rounded-lg font-mono text-xs">
            {(['brew', 'winget', 'linux', 'source'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white'
                    : 'bg-transparent text-slate-300 hover:text-white'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-lg bg-[#08090f] border border-[#252a3f] flex items-center justify-between gap-4 font-mono text-xs text-emerald-400 overflow-x-auto">
          <span className="select-all min-w-0 truncate">$ {CLI_COMMANDS[activeTab]}</span>
          <button
            type="button"
            onClick={() => handleCopy(CLI_COMMANDS[activeTab])}
            className="shrink-0 px-3 py-1 rounded bg-[#1a1e2f] hover:bg-[#252a3f] text-slate-200 text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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

      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-8 mt-12 pt-8 border-t border-[#252a3f] font-mono text-xs text-slate-400">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>100% Open Source under MIT</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>No Telemetry & No Tracking</span>
        </div>
        <div className="flex items-center gap-2 text-indigo-400">
          <Github className="w-4 h-4" />
          <span>GitHub Cryptographically Signed Releases</span>
        </div>
      </div>
    </section>
  );
};

export default Downloads;
