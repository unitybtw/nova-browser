import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Bot,
  Columns,
  Sparkles,
  Lock,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Plus,
  X,
  CheckCircle2,
  MousePointer2,
} from 'lucide-react';

type TabId = 'agent' | 'split' | 'privacy';

export const InteractiveAppShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('agent');
  const [isSplitActive, setIsSplitActive] = useState(false);
  const [agentStep, setAgentStep] = useState<number>(0);
  const [promptText, setPromptText] = useState('Analyze page structure and extract key data points');
  const [streamingOutput, setStreamingOutput] = useState('');
  const [adBlockedCount, setAdBlockedCount] = useState(42);

  // Mouse tilt tracking for 3D realism
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 6, y: -y * 6 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Simulated AI agent typewriter lifecycle
  useEffect(() => {
    if (activeTab !== 'agent') return;
    let timer: NodeJS.Timeout;
    const fullText =
      'Extracted 3 primary components and 1 data table from current DOM. High-frequency memory allocations mapped. No external analytics beacons detected.';

    setStreamingOutput('');
    setAgentStep(0);

    const step1 = setTimeout(() => setAgentStep(1), 600); // DOM SCAN
    const step2 = setTimeout(() => setAgentStep(2), 1400); // THINKING
    const step3 = setTimeout(() => {
      setAgentStep(3); // STREAMING
      let index = 0;
      timer = setInterval(() => {
        if (index <= fullText.length) {
          setStreamingOutput(fullText.slice(0, index));
          index++;
        } else {
          clearInterval(timer);
          setAgentStep(4); // COMPLETED
        }
      }, 18);
    }, 2200);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
      clearInterval(timer);
    };
  }, [activeTab, promptText]);

  // Live ad blocking counter increment simulation
  useEffect(() => {
    if (activeTab !== 'privacy') return;
    const interval = setInterval(() => {
      setAdBlockedCount((prev) => prev + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      {/* Editorial Section Headline */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="font-mono-tracked text-[11px] text-[#4338ca] font-semibold">
          TACTILE INTERACTION SIMULATION
        </span>
        <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#171717] mt-3">
          Experience the <span className="italic font-normal">Living Interface</span>.
        </h2>
        <p className="font-body text-neutral-600 mt-4 text-base sm:text-lg leading-relaxed">
          Click tabs, inspect the autonomous agent, or toggle split workspaces directly in this live simulated client.
        </p>
      </div>

      {/* Interactive Desktop Software Canvas */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1200px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
          transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className="relative rounded-[2rem] bg-[#0f172a] text-slate-100 shadow-2xl border border-[#e5e5e5]/30 overflow-hidden"
      >
        {/* Ambient Window Glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-indigo-500/10 blur-[100px] pointer-events-none" />

        {/* --- NATIVE OS WINDOW TITLEBAR & TABS --- */}
        <div className="bg-[#090d16] px-4 pt-3 pb-0 border-b border-white/10 select-none flex items-center justify-between gap-4">
          {/* Traffic Lights + Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-sm" />
            </div>
            <span className="hidden sm:inline font-display italic text-xs font-semibold text-slate-400 ml-2">
              Nova
            </span>
          </div>

          {/* Clickable Realistic Native Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 max-w-2xl px-2">
            {[
              { id: 'agent', title: 'Autonomous Agent', icon: Bot, url: 'nova://agent' },
              { id: 'split', title: 'Dual Split-View', icon: Columns, url: 'nova://split-view' },
              { id: 'privacy', title: 'Privacy Shield', icon: Shield, url: 'nova://privacy' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-medium transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-[#0f172a] text-white border-t border-x border-white/10 shadow-lg'
                      : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  {React.createElement(tab.icon, {
                    className: `w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`,
                  })}
                  <span className="truncate max-w-[130px]">{tab.title}</span>
                  <X className="w-3 h-3 opacity-40 hover:opacity-100 transition-opacity ml-1" />
                </button>
              );
            })}
            <button
              onClick={() => {
                const next: TabId =
                  activeTab === 'agent' ? 'split' : activeTab === 'split' ? 'privacy' : 'agent';
                setActiveTab(next);
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
              title="New Tab"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Status Pill */}
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>WEBGPU READY</span>
          </div>
        </div>

        {/* --- NATIVE OMNIBOX & NAVIGATION CONTROLS --- */}
        <div className="bg-[#0f172a] px-4 py-2.5 border-b border-white/10 flex items-center justify-between gap-3 text-slate-400">
          {/* Back/Forward/Reload */}
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Omnibox Bar */}
          <div className="flex-1 max-w-2xl relative flex items-center">
            <div className="w-full bg-[#1e293b]/90 border border-white/10 rounded-xl py-1.5 pl-3 pr-24 text-xs font-mono text-slate-200 flex items-center gap-2 shadow-inner">
              <Lock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-400">
                {activeTab === 'agent'
                  ? 'https://nova.sh/research/quantum-computing'
                  : activeTab === 'split'
                  ? 'dual://docs.rs + github.com'
                  : 'nova://settings/privacy-shield'}
              </span>
            </div>
            <div className="absolute right-2 flex items-center gap-1.5 text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/20">
              <span>0ms CACHED</span>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSplitActive(!isSplitActive)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isSplitActive ? 'bg-indigo-600 text-white' : 'hover:bg-white/10 text-slate-400'
              }`}
              title="Toggle Dual Split Screen"
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('agent')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'agent' ? 'bg-indigo-600 text-white' : 'hover:bg-white/10 text-slate-400'
              }`}
              title="Nova AI SidePanel"
            >
              <Bot className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* --- SIMULATED CLIENT VIEWPORT --- */}
        <div className="relative min-h-[460px] sm:min-h-[520px] bg-[#020617] flex overflow-hidden">
          {/* TAB 1: AUTONOMOUS AGENT SIMULATION */}
          {activeTab === 'agent' && (
            <div className="w-full flex flex-col lg:flex-row h-full">
              {/* Left: Web Content Simulation with Autonomous Cursor */}
              <div className="flex-1 p-6 sm:p-8 bg-[#0b1120] border-r border-white/10 relative overflow-hidden flex flex-col justify-between">
                {/* Simulated Webpage Article */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                      DOCUMENT DOM
                    </span>
                    <span className="text-xs text-slate-500">ID: [data-ai-id="doc-702"]</span>
                  </div>

                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mb-4">
                    Quantum Annealing in Distributed Networks
                  </h3>

                  <div className="space-y-3 text-slate-300 text-xs sm:text-sm leading-relaxed font-body">
                    <p
                      className={`p-2 rounded-lg transition-colors ${
                        agentStep >= 1 ? 'bg-indigo-500/15 border border-indigo-500/30' : ''
                      }`}
                    >
                      Topological fault-tolerant logic gates enable near-zero thermal dissipation across multi-qubit registers.
                    </p>
                    <p
                      className={`p-2 rounded-lg transition-colors ${
                        agentStep >= 2 ? 'bg-indigo-500/15 border border-indigo-500/30' : ''
                      }`}
                    >
                      Throughput benchmarks demonstrate a 14.2x efficiency improvement over classical matrix multiplication algorithms.
                    </p>
                  </div>
                </div>

                {/* Simulated Floating Autonomous AI Cursor */}
                <motion.div
                  animate={{
                    x: agentStep === 0 ? 30 : agentStep === 1 ? 160 : agentStep === 2 ? 80 : 220,
                    y: agentStep === 0 ? 40 : agentStep === 1 ? 110 : agentStep === 2 ? 180 : 130,
                  }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute pointer-events-none z-30 flex items-center gap-1.5"
                >
                  <MousePointer2 className="w-5 h-5 text-indigo-400 fill-indigo-400 drop-shadow-md" />
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-mono shadow-lg">
                    NOVA AGENT
                  </span>
                </motion.div>

                {/* Bottom DOM Tree Scanner Tag */}
                <div className="pt-4 mt-6 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>PARSED 1,248 DOM NODES</span>
                  </span>
                  <span className="text-slate-500">GPU TIME: 1.4ms</span>
                </div>
              </div>

              {/* Right: Simulated Nova AI SidePanel */}
              <div className="w-full lg:w-[380px] bg-[#0f172a] p-6 flex flex-col justify-between border-t lg:border-t-0 border-white/10">
                <div>
                  {/* SidePanel Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="font-display font-semibold text-sm text-white">Nova Assistant</span>
                    </div>

                    {/* Dynamic Status Pill */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-indigo-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                      <span>
                        {agentStep === 0
                          ? 'INITIALIZING'
                          : agentStep === 1
                          ? 'DOM SCANNING'
                          : agentStep === 2
                          ? 'THINKING'
                          : agentStep === 3
                          ? 'STREAMING'
                          : 'STANDBY'}
                      </span>
                    </div>
                  </div>

                  {/* Simulated Chat Bubble */}
                  <div className="space-y-4 text-xs font-mono">
                    {/* User Prompt */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-200">
                      <span className="text-indigo-400 block text-[10px] mb-1">// USER PROMPT</span>
                      {promptText}
                    </div>

                    {/* Agent Response Stream */}
                    <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-slate-100 min-h-[100px] leading-relaxed">
                      <span className="text-emerald-400 block text-[10px] mb-1 font-semibold">
                        // ON-DEVICE LLAMA 3.2 3B
                      </span>
                      {streamingOutput}
                      {agentStep === 3 && (
                        <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Action Prompt Chips */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <span className="text-[10px] font-mono text-slate-400 block mb-2">
                    TRY INTERACTIVE ACTIONS:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Extract Data Points',
                      'Summarize Executive View',
                      'Audit Memory Leaks',
                    ].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => setPromptText(chip)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-indigo-600 hover:text-white border border-white/10 text-[10px] font-mono text-slate-300 transition-colors cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DUAL SPLIT-VIEW SIMULATION */}
          {activeTab === 'split' && (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 h-full p-6 sm:p-8 gap-6">
              {/* Left Pane: Documentation */}
              <div className="p-5 rounded-2xl bg-[#0b1120] border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 text-xs font-mono text-slate-400">
                    <span>FRAME A: DOCS.RS</span>
                    <span className="text-emerald-400">SYNCED SCROLL ACTIVE</span>
                  </div>
                  <h4 className="font-display font-semibold text-lg text-white mb-2">
                    Nova Engine Architecture
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-body">
                    Modular Electron subroutines isolate network requests, session cookies, and WebGPU compute shaders into sandboxed worker threads.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 font-mono text-[11px] text-indigo-300 mt-4">
                  $ cargo test --package nova-core
                </div>
              </div>

              {/* Right Pane: Live Web Preview */}
              <div className="p-5 rounded-2xl bg-[#0b1120] border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 text-xs font-mono text-slate-400">
                    <span>FRAME B: GITHUB REPO</span>
                    <span className="text-indigo-400">PARALLEL RENDER</span>
                  </div>
                  <h4 className="font-display font-semibold text-lg text-white mb-2">
                    unitybtw / nova-browser
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-body">
                    Open-source repository with 29 comprehensive test suites, automated CI pipelines, and zero third-party telemetry dependencies.
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-4 text-xs font-mono text-slate-300">
                  <span className="px-2.5 py-1 rounded bg-white/10">v1.0.7 STABLE</span>
                  <span className="text-emerald-400">100% PASS RATE</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACY SHIELD SIMULATION */}
          {activeTab === 'privacy' && (
            <div className="w-full p-8 sm:p-12 flex flex-col justify-between max-w-3xl mx-auto">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold text-white">
                      Zero-Knowledge Privacy Shield
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Sub-millisecond Rust & Electron network interception layer.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8">
                  <div className="p-4 rounded-2xl bg-[#0b1120] border border-white/10 text-center">
                    <span className="text-[10px] font-mono text-slate-400 block mb-1">
                      TRACKERS ERADICATED
                    </span>
                    <span className="font-display text-3xl font-bold text-emerald-400">
                      {adBlockedCount}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#0b1120] border border-white/10 text-center">
                    <span className="text-[10px] font-mono text-slate-400 block mb-1">
                      ENCRYPTION PROTOCOL
                    </span>
                    <span className="font-display text-2xl font-bold text-indigo-400">
                      AES-256-GCM
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#0b1120] border border-white/10 text-center">
                    <span className="text-[10px] font-mono text-slate-400 block mb-1">
                      DATA HARVESTING
                    </span>
                    <span className="font-display text-3xl font-bold text-white">0%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ALL OUTBOUND TELEMETRY PAYLOADS NULLIFIED</span>
                </span>
                <span>PROTECTION ACTIVE</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default InteractiveAppShowcase;
