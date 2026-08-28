import React, { useState } from 'react';
import App, { BrowserDemoOptions } from '@/App';
import { 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Lock, 
  Cpu 
} from 'lucide-react';

const WEBSITE_DEMO_OPTIONS: BrowserDemoOptions = {
  isDemo: true,
  feature: 'website',
  theme: 'dark',
  tabs: 'horizontal',
  showTasksWidget: false,
};

type MobileTab = 'ai' | 'shield' | 'workspaces';

export const BrowserDemo: React.FC = () => {
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('ai');

  return (
    <div className="w-full">
      {/* Desktop View (>= 768px): Full Interactive Browser Application */}
      <div className="hidden md:block">
        <div className="browser-demo aspect-[16/10] max-h-[760px] min-h-[520px] w-full overflow-hidden rounded-[18px] border border-slate-700/80 bg-[#151122] shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
          <App demo={WEBSITE_DEMO_OPTIONS} />
        </div>
      </div>

      {/* Mobile View (< 768px): Responsive Native Nova Mobile Showcase */}
      <div className="block md:hidden">
        <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#0f0d18] text-slate-200 shadow-2xl">
          {/* Mobile Window Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#171424] px-3.5 py-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-center px-2">
              <div className="flex w-full max-w-[260px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-mono text-slate-300">
                <Lock className="h-3 w-3 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {activeMobileTab === 'ai' ? 'nova://copilot' : activeMobileTab === 'shield' ? 'nova://privacy-shield' : 'nova://workspaces'}
                </span>
                <span className="ml-auto rounded bg-cyan-500/20 px-1.5 py-0.2 text-[9px] font-bold text-cyan-300">
                  LOCAL
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
          </div>

          {/* Mobile Tab Selector */}
          <div className="flex border-b border-slate-800 bg-[#120f1f] p-1.5 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveMobileTab('ai')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-medium transition-all ${
                activeMobileTab === 'ai'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>AI Copilot</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMobileTab('shield')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-medium transition-all ${
                activeMobileTab === 'shield'
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
              <span>Shield</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMobileTab('workspaces')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-medium transition-all ${
                activeMobileTab === 'workspaces'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
              <span>Spaces</span>
            </button>
          </div>

          {/* Mobile Content Panels */}
          <div className="p-4 bg-gradient-to-b from-[#0f0d18] to-[#151122]">
            {activeMobileTab === 'ai' && (
              <div className="space-y-3.5 text-left">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-mono text-[11px] font-bold">
                    <Cpu className="h-3.5 w-3.5" />
                    <span>Llama-3.2-3B // WebGPU Metal</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                    64.2 tok/s
                  </span>
                </div>

                <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs leading-relaxed text-slate-300">
                  <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    User Prompt
                  </div>
                  "Summarize key benchmarks and DOM hibernation advantages."
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-slate-300 space-y-2">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-purple-400">
                    <Sparkles className="h-3 w-3" />
                    <span>Nova On-Device Response (0.00s Network Delay)</span>
                  </div>
                  <p className="text-[12px] text-slate-300">
                    Nova processes WebLLM neural weights directly in shader memory. Arka plan sekmeleri 0.05ms içinde askıya alınarak %64 RAM tasarrufu sağlanır ve veriler asla buluta aktarılmaz.
                  </p>
                </div>
              </div>
            )}

            {activeMobileTab === 'shield' && (
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] font-bold text-purple-300">
                    Kernel Socket Filter
                  </span>
                  <span className="font-mono text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    0.007 µs / req
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-950/20 p-2.5 text-xs text-red-300">
                    <span className="truncate pr-2 font-mono text-[11px]">google-analytics.com/collect</span>
                    <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold">BLOCKED</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-950/20 p-2.5 text-xs text-red-300">
                    <span className="truncate pr-2 font-mono text-[11px]">facebook.net/fbevents.js</span>
                    <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold">BLOCKED</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5 text-xs text-emerald-300">
                    <span className="truncate pr-2 font-mono text-[11px]">github.com/unitybtw/nova-browser</span>
                    <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold">ALLOWED</span>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-center font-mono text-[10px] text-slate-400">
                  Total Trackers Intercepted: <strong className="text-white">14 requests (100% telemetry blocked)</strong>
                </div>
              </div>
            )}

            {activeMobileTab === 'workspaces' && (
              <div className="space-y-2.5 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] font-bold text-emerald-300">
                    Isolated Cookie & Tab Contexts
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                    AES-256
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-300">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      <span>Engineering</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">6 active tabs, Localhost 3020 MCP, GitHub</p>
                  </div>

                  <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-purple-300">
                      <span className="h-2 w-2 rounded-full bg-purple-400" />
                      <span>Personal</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">4 tabs, Reader mode, Encrypted bookmarks</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-300">
                  <span>Fast Workspace Switch</span>
                  <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                    ⌥ + 1 / 2
                  </kbd>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Footer Hardware Specs */}
          <div className="grid grid-cols-3 border-t border-slate-800/80 bg-[#100d1b] px-3 py-2.5 text-center font-mono text-[10px] text-slate-400">
            <div>
              <span className="block font-bold text-slate-200">0.00s</span>
              <span>Network Lag</span>
            </div>
            <div className="border-x border-slate-800">
              <span className="block font-bold text-emerald-400">64% Less</span>
              <span>RAM Used</span>
            </div>
            <div>
              <span className="block font-bold text-cyan-300">WebGPU</span>
              <span>On-Device</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowserDemo;
