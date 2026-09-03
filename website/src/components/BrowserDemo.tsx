import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  RotateCw, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Plus, 
  X, 
  LayoutGrid, 
  Zap, 
  Bot, 
  Columns, 
  Search,
  ExternalLink
} from 'lucide-react';

interface DemoTab {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
}

export const BrowserDemo: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState('1');
  const [isAiOpen, setIsAiOpen] = useState(true);

  const tabs: DemoTab[] = [
    { id: '1', title: 'Nova Intelligence', url: 'nova://intelligence', isActive: activeTabId === '1' },
    { id: '2', title: 'Local AI Copilot', url: 'https://docs.novabrowser.dev/ai', isActive: activeTabId === '2' },
    { id: '3', title: 'Privacy Shield', url: 'https://benchmark.novabrowser.dev', isActive: activeTabId === '3' },
  ];

  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  return (
    <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl border border-slate-700/80 bg-[#0f0c1b] text-slate-200 shadow-2xl transition-all">
      {/* Top Window Chrome Bar */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[#151122]/90 px-4 py-2.5 backdrop-blur-md select-none">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-rose-500/80" />
          <div className="h-3 w-3 rounded-full bg-amber-500/80" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
        </div>

        {/* Tabs strip */}
        <div className="flex flex-1 items-center gap-1.5 px-4 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                tab.id === activeTabId
                  ? 'bg-white/10 text-white shadow-xs'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span className="truncate max-w-[130px]">{tab.title}</span>
              <X className="h-3 w-3 opacity-0 group-hover:opacity-60 hover:opacity-100" />
            </button>
          ))}
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="New tab"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <button 
            type="button" 
            onClick={() => setIsAiOpen(!isAiOpen)} 
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              isAiOpen ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'hover:bg-white/5'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">AI Sidebar</span>
          </button>
        </div>
      </div>

      {/* Navigation / Omnibox Bar */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-[#120e1f] px-3 py-2">
        <div className="flex items-center gap-1 text-slate-400">
          <button type="button" className="rounded p-1 hover:bg-white/5 hover:text-white" aria-label="Go back">
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="rounded p-1 hover:bg-white/5 hover:text-white" aria-label="Go forward">
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="rounded p-1 hover:bg-white/5 hover:text-white" aria-label="Reload">
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Omnibox */}
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-black/40 px-3 py-1.5 text-xs text-slate-300 border border-white/5 focus-within:border-cyan-500/50">
          <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <Lock className="h-3 w-3 text-slate-500 shrink-0" />
          <span className="flex-1 font-mono text-slate-300 select-all truncate">{currentTab.url}</span>
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
            Adblock Active
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button type="button" className="rounded p-1 hover:bg-white/5 hover:text-white" title="Split Screen">
            <Columns className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Viewport + AI SidePanel */}
      <div className="flex min-h-[460px] sm:min-h-[540px]">
        {/* Browser Content Area */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#120e1f] via-[#0f0c1b] to-[#181128]">
          <div className="max-w-xl mx-auto w-full space-y-6 pt-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Nova Intelligence Hub
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                100% on-device WebGPU machine learning. Zero telemetry.
              </p>
            </div>

            {/* Quick search input */}
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                readOnly
                value="Search web or ask on-device AI..."
                className="w-full rounded-xl bg-white/5 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-300 border border-white/10 focus:outline-none"
              />
            </div>

            {/* Dashboard Speed Dials */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="h-9 w-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">Local AI</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">Privacy</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">Zero-Lag</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">Workspaces</span>
              </div>
            </div>
          </div>

          {/* Bottom Live Telemetry Footer */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Physical Memory: 59.7 MB RSS
              </span>
              <span>100 Tabs: 0.14 ms</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span>WebLLM Llama 3.2 1B</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          </div>
        </div>

        {/* AI SidePanel (Collapsible Mock) */}
        {isAiOpen && (
          <div className="w-72 sm:w-80 border-l border-white/5 bg-[#140f24] p-4 flex flex-col justify-between hidden md:flex">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-white">Nova Assistant</span>
                </div>
                <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded">Local WebGPU</span>
              </div>

              <div className="space-y-2.5">
                <div className="rounded-lg bg-white/5 p-2.5 text-xs text-slate-300">
                  <p className="font-medium text-cyan-300 mb-1">Page Analysis</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    This page has 0 external trackers. All models run in private VRAM without cloud API calls.
                  </p>
                </div>
                <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2.5 text-xs text-slate-200">
                  <p className="font-medium text-cyan-300 mb-1">Live Suggestion</p>
                  <p className="text-[11px] text-slate-300">
                    Press <kbd className="font-mono bg-black/40 px-1 py-0.5 rounded text-[10px]">Cmd+K</kbd> to launch Spotlight search anytime.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                readOnly
                value="Ask Nova AI anything..."
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-xs text-slate-400 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowserDemo;
