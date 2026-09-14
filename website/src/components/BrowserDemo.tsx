import React, { useEffect, useRef, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Columns,
  Sparkles,
  Bot,
  Search,
  Github,
  Cpu,
  X,
  Plus,
  Zap,
  CheckCircle2
} from 'lucide-react';

const BASE_WIDTH = 960;
const BASE_HEIGHT = 600;

type TabId = 'workspace' | 'agent' | 'github' | 'split';

export const BrowserDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);

  const [activeTab, setActiveTab] = useState<TabId>('workspace');
  const [isSplit, setIsSplit] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [omniboxInput, setOmniboxInput] = useState('nova://hub');
  const [trackersBlocked, setTrackersBlocked] = useState(24);

  // Responsive scaling to fit mobile screens perfectly
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      if (width < BASE_WIDTH) {
        const s = width / BASE_WIDTH;
        setScale(s);
        setContainerHeight(Math.round(BASE_HEIGHT * s));
      } else {
        setScale(1);
        setContainerHeight(undefined);
      }
    };

    updateDimensions();
    const ro = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    window.addEventListener('resize', updateDimensions);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'split') {
      setIsSplit(true);
      setOmniboxInput('nova://split-view');
    } else {
      setIsSplit(false);
      if (tab === 'workspace') setOmniboxInput('nova://hub');
      if (tab === 'agent') setOmniboxInput('nova://ai-copilot');
      if (tab === 'github') setOmniboxInput('https://github.com/unitybtw/nova-browser');
    }
  };

  const toggleSplit = () => {
    const next = !isSplit;
    setIsSplit(next);
    if (next) {
      setActiveTab('split');
      setOmniboxInput('nova://split-view');
    } else {
      setActiveTab('workspace');
      setOmniboxInput('nova://hub');
    }
  };

  return (
    <div
      ref={containerRef}
      style={containerHeight ? { height: `${containerHeight}px` } : undefined}
      className={`browser-demo relative w-full overflow-hidden rounded-xl border border-neutral-800/80 bg-[#0d0f15] shadow-[0_24px_70px_rgba(0,0,0,0.55)] transition-all sm:rounded-[20px] ${
        scale === 1 ? 'aspect-[16/10] max-h-[760px] min-h-[520px]' : ''
      }`}
    >
      <div
        style={{
          width: scale < 1 ? `${BASE_WIDTH}px` : '100%',
          height: scale < 1 ? `${BASE_HEIGHT}px` : '100%',
          transform: scale < 1 ? `scale(${scale})` : 'scale(1)',
          transformOrigin: 'top left',
          isolation: 'isolate',
        }}
        className="relative flex h-full w-full flex-col select-none bg-[#0c0d12] text-neutral-200"
      >
        {/* 1. TOP TITLEBAR & TAB STRIP */}
        <div className="flex h-10 items-center justify-between border-b border-neutral-800/70 bg-[#12141c] px-3">
          {/* Window Traffic Lights */}
          <div className="flex items-center gap-2 pr-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56] opacity-90 transition-opacity hover:opacity-100 shadow-xs cursor-pointer" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e] opacity-90 transition-opacity hover:opacity-100 shadow-xs cursor-pointer" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f] opacity-90 transition-opacity hover:opacity-100 shadow-xs cursor-pointer" />
          </div>

          {/* Horizontal Tabs */}
          <div className="flex flex-1 items-center gap-1.5 overflow-hidden text-xs font-mono">
            {/* Tab 1: Nova Hub */}
            <button
              type="button"
              onClick={() => handleTabChange('workspace')}
              className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                activeTab === 'workspace' && !isSplit
                  ? 'bg-[#1b1e2a] text-white shadow-xs border border-neutral-700/60'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span className="truncate max-w-[120px]">Nova Hub</span>
              {activeTab === 'workspace' && !isSplit && (
                <X className="h-3 w-3 opacity-60 ml-1" />
              )}
            </button>

            {/* Tab 2: Local AI Agent */}
            <button
              type="button"
              onClick={() => handleTabChange('agent')}
              className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                activeTab === 'agent' && !isSplit
                  ? 'bg-[#1b1e2a] text-white shadow-xs border border-neutral-700/60'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              <Bot className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="truncate max-w-[130px]">WebGPU AI Copilot</span>
              {activeTab === 'agent' && !isSplit && (
                <X className="h-3 w-3 opacity-60 ml-1" />
              )}
            </button>

            {/* Tab 3: Split View */}
            <button
              type="button"
              onClick={() => handleTabChange('split')}
              className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                isSplit
                  ? 'bg-[#1b1e2a] text-white shadow-xs border border-neutral-700/60'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              <Columns className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <span className="truncate max-w-[120px]">Dual Split-View</span>
              {isSplit && (
                <X className="h-3 w-3 opacity-60 ml-1" />
              )}
            </button>

            {/* Tab 4: GitHub */}
            <button
              type="button"
              onClick={() => handleTabChange('github')}
              className={`group hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                activeTab === 'github' && !isSplit
                  ? 'bg-[#1b1e2a] text-white shadow-xs border border-neutral-700/60'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              <Github className="h-3.5 w-3.5 text-neutral-300 shrink-0" />
              <span className="truncate max-w-[140px]">GitHub — nova-browser</span>
            </button>

            {/* New Tab Button */}
            <button
              type="button"
              onClick={() => handleTabChange('workspace')}
              title="Open New Tab"
              className="p-1 rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Right Status Indicator */}
          <div className="flex items-center gap-2 pl-2 text-[10px] font-mono text-neutral-400">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Local WebGPU
            </span>
          </div>
        </div>

        {/* 2. OMNIBOX TOOLBAR */}
        <div className="flex h-11 items-center gap-2 border-b border-neutral-800/60 bg-[#161822] px-3">
          {/* Navigation Controls */}
          <div className="flex items-center gap-1 text-neutral-400">
            <button
              type="button"
              title="Back"
              className="p-1.5 rounded-md hover:bg-neutral-800/70 hover:text-white cursor-pointer transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Forward"
              className="p-1.5 rounded-md hover:bg-neutral-800/70 hover:text-white cursor-pointer transition-colors opacity-50"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Reload"
              onClick={() => setTrackersBlocked((c) => c + 1)}
              className="p-1.5 rounded-md hover:bg-neutral-800/70 hover:text-white cursor-pointer transition-colors"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Omnibox Address Field */}
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-neutral-700/60 bg-[#0e1017] px-3 py-1.5 text-xs font-mono transition-all focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/40">
            {/* Shield & Security Status */}
            <div
              className="flex items-center gap-1 text-emerald-400 bg-emerald-950/70 px-1.5 py-0.5 rounded text-[10px] cursor-pointer hover:bg-emerald-900/80"
              title="Nova Sovereign Shield active: 0 telemetry, sub-ms ad-blocking"
            >
              <ShieldCheck className="h-3 w-3" />
              <span>{trackersBlocked} Blocked</span>
            </div>

            <Lock className="h-3 w-3 text-neutral-400 shrink-0" />

            <input
              type="text"
              value={omniboxInput}
              onChange={(e) => setOmniboxInput(e.target.value)}
              className="flex-1 bg-transparent text-neutral-200 outline-none placeholder:text-neutral-500 text-xs"
              placeholder="Search or enter web address..."
            />

            <span className="hidden sm:inline-block text-[10px] text-neutral-500 px-1.5 py-0.5 rounded bg-neutral-800/60">
              ⌘K
            </span>
          </div>

          {/* Action Toolbar Icons */}
          <div className="flex items-center gap-1.5 text-neutral-400">
            {/* Split Screen Toggle */}
            <button
              type="button"
              onClick={toggleSplit}
              title={isSplit ? 'Close Split View' : 'Toggle Dual Split View'}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isSplit
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'hover:bg-neutral-800/70 hover:text-white'
              }`}
            >
              <Columns className="h-4 w-4" />
            </button>

            {/* AI Sidebar Toggle */}
            <button
              type="button"
              onClick={() => setIsAiSidebarOpen((prev) => !prev)}
              title={isAiSidebarOpen ? 'Hide AI Sidebar' : 'Show AI Sidebar'}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isAiSidebarOpen
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'hover:bg-neutral-800/70 hover:text-white'
              }`}
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 3. MAIN BROWSER VIEWPORT */}
        <div className="relative flex flex-1 overflow-hidden bg-[#0a0b10]">
          {/* CASE A: SPLIT SCREEN VIEW */}
          {isSplit ? (
            <div className="flex h-full w-full">
              {/* Left Split Pane */}
              <div className="flex h-full flex-1 flex-col border-r border-neutral-800/80 bg-[#0e1017]">
                {/* Native Split Pane Header */}
                <div className="flex h-8 items-center justify-between border-b border-neutral-800/80 bg-[#141620] px-3 font-mono text-[11px] text-neutral-300">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                    <span className="truncate font-semibold">nova://workspace</span>
                  </div>
                  <div className="flex items-center gap-1 text-neutral-400">
                    <span className="text-[10px] text-emerald-400">Active</span>
                  </div>
                </div>

                {/* Left Pane Body: Workspace Hub View */}
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h4 className="font-display font-bold text-base text-white">Parallel Tiling</h4>
                  <p className="font-sans text-xs text-neutral-400 max-w-xs mt-1 leading-relaxed">
                    Independent web sessions run side-by-side with zero cross-frame tracker leakage.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleTabChange('workspace')}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono cursor-pointer"
                    >
                      Focus Left
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Split Pane */}
              <div className="flex h-full flex-1 flex-col bg-[#0e1017]">
                {/* Native Split Pane Header */}
                <div className="flex h-8 items-center justify-between border-b border-neutral-800/80 bg-[#141620] px-3 font-mono text-[11px] text-neutral-300">
                  <div className="flex items-center gap-2">
                    <Bot className="h-3 w-3 text-emerald-400" />
                    <span className="truncate font-semibold">nova://ai-copilot</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSplit}
                    title="Close Split View"
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {/* Right Pane Body: Local AI Execution */}
                <div className="flex flex-1 flex-col justify-between p-4 font-mono text-xs">
                  <div className="space-y-3">
                    <div className="rounded-xl border border-neutral-800 bg-[#12141c] p-3 text-neutral-300">
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1.5">
                        <span className="text-emerald-400 font-bold">✓ ON-DEVICE WEBGPU</span>
                        <span>0b transmitted</span>
                      </div>
                      <p className="text-[11px] text-neutral-300 font-sans leading-relaxed">
                        "Document analysis complete. 18 memory allocations optimized, no cloud calls made."
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-neutral-800/70 bg-[#11131b] p-2 text-[10px] text-neutral-400 flex items-center justify-between">
                    <span>Hardware: Apple Metal / Vulkan</span>
                    <span className="text-indigo-400 font-bold">42.4 tok/s</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'agent' ? (
            /* CASE B: LOCAL AI COPILOT VIEW */
            <div className="flex h-full w-full">
              {/* Main Content Area */}
              <div className="flex-1 p-8 overflow-y-auto font-sans">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 font-mono text-xs text-indigo-400 mb-2">
                    <Zap className="h-3.5 w-3.5" />
                    <span>SOVEREIGN WEBGPU RUNTIME</span>
                  </div>
                  <h3 className="font-display font-black text-2xl text-white tracking-tight">
                    On-Device Neural Synthesis
                  </h3>
                  <p className="mt-3 text-neutral-400 text-sm leading-relaxed">
                    Nova embeds local language models (Llama 3.2 3B & Phi-3.5) directly into your browser using WebGPU compute shaders. All inference happens inside your GPU memory without cloud API requests.
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-4 font-mono text-xs">
                    <div className="p-3.5 rounded-xl border border-neutral-800 bg-[#12141d]">
                      <span className="text-neutral-400 text-[10px] block">CLOUD LATENCY</span>
                      <span className="text-emerald-400 font-bold text-lg">0 ms</span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-neutral-800 bg-[#12141d]">
                      <span className="text-neutral-400 text-[10px] block">PROMPT ENCRYPTION</span>
                      <span className="text-white font-bold text-lg">100% Local VRAM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible AI Copilot Sidebar */}
              {isAiSidebarOpen && (
                <div className="w-80 border-l border-neutral-800/80 bg-[#11131c] p-4 flex flex-col justify-between font-mono text-xs">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                      <div className="flex items-center gap-2 text-white font-semibold">
                        <Sparkles className="h-4 w-4 text-indigo-400" />
                        <span>Nova Copilot</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        Phi-3.5
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 font-sans text-xs">
                      <div className="p-3 rounded-xl bg-[#181a26] text-neutral-200 border border-neutral-700/40">
                        <p className="font-semibold text-[11px] text-indigo-300 font-mono mb-1">YOU</p>
                        <p>Summarize page context without sending packets to external cloud servers.</p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#141824] text-neutral-200 border border-indigo-500/30">
                        <p className="font-semibold text-[11px] text-emerald-400 font-mono mb-1">NOVA AGENT (WEBGPU)</p>
                        <p className="leading-relaxed">
                          Running entirely in local VRAM. Memory consumption is 1.4 GB. Zero telemetry or tokens transmitted over WAN.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-neutral-800 bg-[#0e1017] text-[10px] text-neutral-400 flex items-center justify-between">
                    <span>Speed: 44.8 tok/s</span>
                    <span className="text-emerald-400">Hardware: Metal/DirectX 12</span>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'github' ? (
            /* CASE C: GITHUB REPO VIEW */
            <div className="flex-1 p-8 overflow-y-auto font-mono text-xs bg-[#0d0f15]">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Github className="h-5 w-5 text-white" />
                    <span className="font-display text-lg font-bold text-white">unitybtw / nova-browser</span>
                    <span className="px-2 py-0.5 text-[10px] rounded-full border border-neutral-700 text-neutral-400">Public</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-[#171717] text-white border border-neutral-700 text-[11px]">
                      ★ Star 24
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-[#171717] text-neutral-300 border border-neutral-700 text-[11px]">
                      v1.4.7
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-[#12141c] p-5 space-y-3 font-sans text-xs">
                  <h4 className="font-display font-bold text-white text-sm">README.md</h4>
                  <p className="text-neutral-400 leading-relaxed">
                    Nova Browser is a sovereign desktop browser engineered with on-device WebGPU AI inference, native sub-ms tracker blocking, and zero-knowledge synchronization.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">MIT License</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">No Telemetry</span>
                    <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">Electron 34 + Chromium</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* CASE D: DEFAULT NOVA WORKSPACE / NEW TAB HUB */
            <div className="relative flex flex-1 flex-col items-center justify-between p-6 sm:p-10 font-sans">
              {/* Subtle ambient light radial in canvas */}
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(67,56,202,0.12),transparent_70%)]"
                aria-hidden="true"
              />

              {/* Center Hub Section */}
              <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center mt-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 font-mono text-[11px] text-indigo-400 mb-5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Sovereign Desktop Workspace Active</span>
                </div>

                <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                  Where would you like to explore?
                </h2>
                <p className="mt-2 text-neutral-400 text-xs sm:text-sm font-sans">
                  Private browsing, on-device AI synthesis, and zero cloud tracking.
                </p>

                {/* Central Quick Search Field */}
                <div className="relative mt-6 w-full max-w-xl">
                  <div className="flex items-center gap-3 rounded-2xl border border-neutral-700/80 bg-[#141622]/90 px-4 py-3.5 shadow-lg backdrop-blur-md transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30">
                    <Search className="h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search with DuckDuckGo or ask local Nova AI..."
                      className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 outline-none"
                    />
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-400">
                      <span className="rounded bg-neutral-800/80 px-2 py-1 text-neutral-300">
                        Tab to switch AI
                      </span>
                    </div>
                  </div>
                </div>

                {/* Speed Dials / Quick Shortcuts */}
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => handleTabChange('agent')}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-neutral-800/80 bg-[#12141c]/60 hover:bg-[#181b28] hover:border-indigo-500/40 transition-all cursor-pointer group text-center"
                  >
                    <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 group-hover:scale-105 transition-transform">
                      <Bot className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] text-neutral-300 font-medium">Local AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('github')}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-neutral-800/80 bg-[#12141c]/60 hover:bg-[#181b28] hover:border-neutral-600 transition-all cursor-pointer group text-center"
                  >
                    <div className="p-2 rounded-lg bg-neutral-800 text-neutral-200 group-hover:scale-105 transition-transform">
                      <Github className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] text-neutral-300 font-medium">Repository</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleSplit}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-neutral-800/80 bg-[#12141c]/60 hover:bg-[#181b28] hover:border-sky-500/40 transition-all cursor-pointer group text-center"
                  >
                    <div className="p-2 rounded-lg bg-sky-950/60 text-sky-400 group-hover:scale-105 transition-transform">
                      <Columns className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] text-neutral-300 font-medium">Split View</span>
                  </button>

                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-neutral-800/80 bg-[#12141c]/60 text-center">
                    <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] text-neutral-300 font-medium">WebGPU VRAM</span>
                  </div>
                </div>
              </div>

              {/* Bottom Live System Telemetry Bar */}
              <div className="relative z-10 w-full max-w-2xl mt-6 pt-4 border-t border-neutral-800/60 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-neutral-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>RAM: ~420 MB (Suspension Engine)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-indigo-400" />
                  <span>0 Cloud Telemetry Pings</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-300">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span>v1.4.7 Sovereign</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowserDemo;

