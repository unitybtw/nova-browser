import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Sparkles,
  Lock,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Plus,
  X,
  Bot,
  Zap,
  Cpu,
  Layers,
  ExternalLink,
  Code2,
  Terminal,
  Bookmark
} from 'lucide-react';

interface MockTab {
  id: string;
  title: string;
  url: string;
  icon: string;
  badge?: string;
}

const INITIAL_TABS: MockTab[] = [
  {
    id: 'tab-newtab',
    title: 'New Tab — Nova AI',
    url: 'nova://newtab',
    icon: 'nova',
    badge: 'Local AI'
  },
  {
    id: 'tab-github',
    title: 'unitybtw/nova-browser',
    url: 'https://github.com/unitybtw/nova-browser',
    icon: 'github',
    badge: 'Open Source'
  },
  {
    id: 'tab-arxiv',
    title: 'On-Device LLM Benchmarks',
    url: 'https://arxiv.org/abs/2403.07691',
    icon: 'arxiv',
    badge: 'Research'
  }
];

export const BrowserDemo: React.FC = React.memo(() => {
  const [tabs, setTabs] = useState<MockTab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('tab-newtab');
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
  const [promptText, setPromptText] = useState('');
  const [activePromptPreset, setActivePromptPreset] = useState<string | null>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const remaining = tabs.filter(t => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[0].id);
    }
  };

  const handleNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: MockTab = {
      id: newId,
      title: 'New Tab',
      url: 'nova://newtab',
      icon: 'nova'
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  return (
    <div
      className="browser-demo relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d14] text-slate-100 shadow-[0_24px_80px_rgba(0,0,0,0.65)] select-none transition-all duration-300"
      style={{ isolation: 'isolate' }}
      role="region"
      aria-label="Interactive Nova Browser Live Demo"
    >
      {/* 1. Window Chrome & Horizontal Tab Bar */}
      <div className="flex h-11 items-center border-b border-white/[0.08] bg-[#090a10]/90 px-3.5 backdrop-blur-md">
        {/* macOS Traffic Lights */}
        <div className="flex items-center gap-2 pr-3.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56]/90 border border-[#e0443e]/40 shadow-xs" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]/90 border border-[#dea123]/40 shadow-xs" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f]/90 border border-[#1aab29]/40 shadow-xs" />
        </div>

        {/* Tab Strip */}
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                role="tab"
                tabIndex={0}
                aria-selected={isActive}
                onClick={() => setActiveTabId(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTabId(tab.id);
                  }
                }}
                className={`group relative flex h-8 max-w-[220px] min-w-[140px] items-center gap-2 rounded-lg px-3 text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#151724] text-white shadow-sm border border-white/10'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                }`}
              >
                {/* Active Tab Indicator Bar */}
                {isActive && (
                  <span className="absolute -top-[1px] left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" />
                )}

                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px]">
                  {tab.icon === 'nova' ? (
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  ) : tab.icon === 'github' ? (
                    <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                  ) : (
                    <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </div>

                <span className="flex-1 truncate text-[11px] font-sans font-medium tracking-tight">
                  {tab.title}
                </span>

                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    aria-label={`Close tab ${tab.title}`}
                    className="h-4 w-4 rounded opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100 flex items-center justify-center cursor-pointer text-slate-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleNewTab}
            aria-label="New tab"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 pl-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SHIELD ACTIVE
          </span>
        </div>
      </div>

      {/* 2. Navigation Bar & Omnibox */}
      <div className="flex h-11 items-center gap-2 border-b border-white/[0.06] bg-[#0e101a] px-3.5">
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            aria-label="Back"
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Forward"
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/[0.06] hover:text-white transition-colors opacity-50"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Reload"
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Omnibox URL Input Bar */}
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#141724] px-3 py-1.5 shadow-inner transition-colors focus-within:border-cyan-500/50">
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-xs">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider hidden md:inline">
              SECURE
            </span>
          </div>
          <span className="text-white/20">|</span>
          <span className="font-mono text-xs text-slate-200 truncate flex-1">
            {activeTab.url}
          </span>
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-slate-400 hidden sm:inline">
            E2EE
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
            aria-label={isAiPanelOpen ? 'Collapse AI Co-Pilot' : 'Open AI Co-Pilot'}
            className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 font-sans text-xs font-semibold transition-all duration-150 cursor-pointer ${
              isAiPanelOpen
                ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-sm'
                : 'text-slate-300 hover:bg-white/[0.08]'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Nova AI</span>
          </button>
          <button
            type="button"
            aria-label="Bookmark"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <Bookmark className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Browser Viewport Area (Split Screen with AI SidePanel) */}
      <div className="relative flex h-[500px] w-full overflow-hidden bg-[#0c0d16]">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center justify-center relative">
          {/* Subtle Ambient Canvas Background */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />

          {activeTab.id === 'tab-newtab' ? (
            /* New Tab Dashboard */
            <div className="relative z-10 w-full max-w-2xl text-center space-y-6">
              {/* Nova Emblem */}
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
                <Sparkles className="h-8 w-8 text-cyan-400" />
              </div>

              <div>
                <h3 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Sovereign Autonomous Browsing
                </h3>
                <p className="mt-1 font-sans text-xs md:text-sm text-slate-400 max-w-md mx-auto">
                  Local on-device AI reasoning • Zero telemetry • Zero third-party ad surveillance.
                </p>
              </div>

              {/* Omnibox Search / AI Prompt Input */}
              <div className="relative mx-auto max-w-lg">
                <div className="relative flex items-center rounded-xl border border-white/15 bg-white/[0.04] p-1.5 shadow-lg backdrop-blur-md focus-within:border-cyan-400">
                  <Search className="ml-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Search or ask on-device AI (e.g. summarize quantum paper)..."
                    className="w-full bg-transparent px-3 py-2 text-xs md:text-sm text-white placeholder-slate-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!promptText) setPromptText('Explain memory safety in Rust vs C++');
                      setIsAiPanelOpen(true);
                    }}
                    className="rounded-lg bg-indigo-500/80 hover:bg-indigo-500 px-3 py-1.5 font-mono text-[11px] font-semibold text-white transition-colors cursor-pointer"
                  >
                    Execute
                  </button>
                </div>

                {/* Prompt Suggestions */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                  {[
                    'Summarize active tab',
                    'Audit privacy trackers',
                    'Extract code snippets',
                    'Zero-telemetry audit'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setPromptText(preset);
                        setActivePromptPreset(preset);
                        setIsAiPanelOpen(true);
                      }}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[10px] text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Launch Dials */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md mx-auto pt-2">
                {[
                  { name: 'GitHub Repo', tag: 'v1.4.8', icon: Code2, color: 'text-indigo-400' },
                  { name: 'MLC-LLM Core', tag: 'WebGPU', icon: Cpu, color: 'text-cyan-400' },
                  { name: 'AdBlocker', tag: '100% Rust', icon: ShieldCheck, color: 'text-emerald-400' },
                  { name: 'Cloud Sync', tag: 'E2EE AES', icon: Zap, color: 'text-amber-400' }
                ].map((item) => (
                  <div
                    key={item.name}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left hover:border-white/15 hover:bg-white/[0.05] transition-all cursor-pointer"
                  >
                    <item.icon className={`h-4 w-4 mb-2 ${item.color}`} />
                    <div className="font-sans text-xs font-semibold text-white truncate">
                      {item.name}
                    </div>
                    <div className="font-mono text-[9px] text-slate-500">{item.tag}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab.id === 'tab-github' ? (
            /* Mockup GitHub Page */
            <div className="relative z-10 w-full max-w-2xl text-left space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/10">
                    <Code2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-white">
                      unitybtw / nova-browser
                    </h3>
                    <p className="font-mono text-xs text-slate-400">
                      Public • Fast, Private, AI-Native Desktop Browser
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-indigo-500/20 px-3 py-1 font-mono text-xs text-indigo-300 font-semibold border border-indigo-500/30">
                  Release v1.4.8
                </span>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 font-mono text-xs space-y-2 text-slate-300">
                <div className="text-emerald-400 font-bold">$ git clone https://github.com/unitybtw/nova-browser</div>
                <div className="text-slate-400">Cloning into 'nova-browser'...</div>
                <div className="text-cyan-400">Architecture: Electron 39 • React 19 • MLC-LLM Local AI • 0 Telemetry</div>
                <div className="text-slate-500">All tests passing: 60/60 unit & E2E suites verified.</div>
              </div>
            </div>
          ) : (
            /* ArXiv Benchmark View */
            <div className="relative z-10 w-full max-w-2xl text-left space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    arXiv:2403.07691 [cs.AI]
                  </h3>
                  <p className="font-sans text-xs text-slate-400">
                    Client-Side Hardware-Accelerated Local Inference in Modern Desktop Web Engines
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs font-sans text-slate-300 leading-relaxed">
                <strong className="text-white block mb-1">Abstract:</strong>
                Nova Browser executes quantized Qwen and Llama models directly inside the client process via WebGPU compute shaders. Zero network packets leave the device, guaranteeing cryptographic privacy and 45 tok/sec execution speeds on Apple Silicon and modern discrete GPUs.
              </div>
            </div>
          )}
        </div>

        {/* 4. Interactive Nova AI SidePanel */}
        {isAiPanelOpen && (
          <aside
            className="w-72 md:w-80 border-l border-white/[0.08] bg-[#0d0f1a]/95 backdrop-blur-xl flex flex-col justify-between p-4 shadow-2xl transition-all duration-300"
            aria-label="Nova AI Copilot Panel"
          >
            <div className="space-y-4">
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="font-display text-xs font-bold text-white">
                      Nova AI Co-Pilot
                    </h4>
                    <span className="font-mono text-[9px] text-emerald-400 block">
                      Local WebGPU • Offline
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiPanelOpen(false)}
                  aria-label="Close AI Co-Pilot"
                  className="rounded p-1 text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Chat Thread */}
              <div className="space-y-3 font-sans text-xs">
                {/* User Message */}
                <div className="rounded-xl bg-white/[0.06] p-3 text-slate-200 border border-white/[0.04]">
                  <span className="font-mono text-[10px] text-cyan-400 block mb-0.5 font-semibold">You:</span>
                  {promptText || activePromptPreset || 'Summarize active webpage and verify privacy trackers.'}
                </div>

                {/* AI Response */}
                <div className="rounded-xl bg-indigo-950/40 p-3 text-slate-200 border border-indigo-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] font-bold">
                    <Sparkles className="h-3 w-3" />
                    <span>Nova Local Assistant</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Verified current session: <strong>0 third-party cookies</strong>, <strong>0 analytic pings</strong>. Page structure parsed cleanly with 45 tok/sec on-device reasoning.
                  </p>
                  <div className="pt-1 flex items-center gap-1 font-mono text-[9px] text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Memory clean • SafeStorage encrypted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Prompt Quick Bar */}
            <div className="pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] p-1.5">
                <input
                  type="text"
                  placeholder="Ask local model..."
                  className="w-full bg-transparent px-2 text-xs text-white placeholder-slate-500 outline-none font-sans"
                />
                <button
                  type="button"
                  className="h-6 w-6 rounded bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center text-black font-bold"
                  aria-label="Send query"
                >
                  <Sparkles className="h-3 w-3" />
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* 5. Minimalist Bottom Info Bar */}
      <div className="flex h-7 items-center justify-between border-t border-white/[0.06] bg-[#090a12] px-3.5 font-mono text-[10px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            100% Client-Side
          </span>
          <span className="hidden sm:inline">Engine: WebGPU / MLC-LLM</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Latency: 0.2ms</span>
          <span className="text-cyan-400">v1.4.8 Release</span>
        </div>
      </div>
    </div>
  );
});

export default BrowserDemo;
