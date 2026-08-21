import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  RotateCw, 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Bot, 
  Sparkles, 
  Send, 
  MousePointer, 
  Laptop, 
  Smartphone, 
  Copy, 
  Check, 
  RefreshCw,
  FolderTree,
  Terminal,
  LayoutDashboard,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export const LiveAnimatedBrowser: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ai' | 'newtab' | 'split' | 'sync'>('ai');
  const [cursorPos, setCursorPos] = useState({ x: 180, y: 140 });
  const [isClicking, setIsClicking] = useState(false);
  const [typedUrl, setTypedUrl] = useState('https://arxiv.org/list/cs.AI/recent');
  const [aiResponseIndex, setAiResponseIndex] = useState(0);
  const [syncCode, setSyncCode] = useState('nova-7b2a-89c1-4f12');
  const [isCopied, setIsCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Todo tasks state for New Tab
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Review autonomous agent benchmarks', done: true },
    { id: 2, text: 'Pair MacBook with Windows workstation', done: false },
    { id: 3, text: 'Test Chrome Web Store CRX3 extension', done: false },
  ]);

  // AI Agent Animation Loop
  useEffect(() => {
    if (activeTab !== 'ai') return;

    const interval = setInterval(() => {
      // Step 1: Move cursor to card 1
      setCursorPos({ x: 160, y: 130 });
      setIsClicking(false);

      setTimeout(() => {
        setIsClicking(true); // Click
        setAiResponseIndex((prev) => (prev + 1) % 3);
      }, 1200);

      setTimeout(() => {
        // Step 2: Move cursor to card 2
        setCursorPos({ x: 220, y: 220 });
        setIsClicking(false);
      }, 2500);

      setTimeout(() => {
        setIsClicking(true); // Click
      }, 3500);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const copySync = () => {
    navigator.clipboard?.writeText(syncCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const regenerateSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const p1 = Math.random().toString(16).substring(2, 6);
      const p2 = Math.random().toString(16).substring(2, 6);
      const p3 = Math.random().toString(16).substring(2, 6);
      setSyncCode(`nova-${p1}-${p2}-${p3}`);
      setIsSyncing(false);
    }, 400);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Interactive Mode Switcher */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
        <button
          onClick={() => { setActiveTab('ai'); setTypedUrl('https://arxiv.org/list/cs.AI/recent'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'ai'
              ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
              : 'card-glass text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4 text-cyan-500" />
          <span>🤖 Autonomous AI & MCP Agent</span>
        </button>

        <button
          onClick={() => { setActiveTab('newtab'); setTypedUrl('nova://newtab'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'newtab'
              ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
              : 'card-glass text-slate-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-purple-400" />
          <span>✨ Start Page & Tasks Dashboard</span>
        </button>

        <button
          onClick={() => { setActiveTab('split'); setTypedUrl('https://react.dev | https://tailwindcss.com'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'split'
              ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
              : 'card-glass text-slate-400 hover:text-white'
          }`}
        >
          <FolderTree className="w-4 h-4 text-amber-400" />
          <span>⚡ Dual-View Split Screen</span>
        </button>

        <button
          onClick={() => { setActiveTab('sync'); setTypedUrl('nova://settings/sync'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'sync'
              ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
              : 'card-glass text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>🔒 Zero-Knowledge 1-Click Sync</span>
        </button>
      </div>

      {/* Realistic Animated Browser Window Shell */}
      <div className="rounded-3xl border border-white/15 bg-[#080b12] shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col h-[560px] md:h-[650px] relative transition-all duration-300">
        
        {/* Top Titlebar & Tab Strip */}
        <div className="h-10 bg-[#06080e] border-b border-white/10 flex items-center px-4 gap-3 shrink-0 select-none">
          {/* Traffic Lights */}
          <div className="flex items-center gap-2 mr-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] hover:opacity-80 transition-opacity cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:opacity-80 transition-opacity cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] hover:opacity-80 transition-opacity cursor-pointer" />
          </div>

          {/* Active & Background Tabs */}
          <div className="flex items-center gap-1.5 overflow-hidden flex-1">
            <motion.div 
              layout
              className="h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-2 bg-white/10 text-white border border-white/15 shadow-sm max-w-[210px]"
            >
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="truncate">
                {activeTab === 'ai' ? 'arXiv: cs.AI Research' : activeTab === 'newtab' ? 'Nova — New Tab' : activeTab === 'split' ? 'React 19 & Tailwind Docs' : 'Device Pairing Chain'}
              </span>
            </motion.div>

            <div className="h-7 px-3 rounded-lg text-xs font-medium flex items-center gap-2 text-slate-400 hover:bg-white/5 cursor-pointer max-w-[160px] transition-colors hidden sm:flex">
              <span className="truncate">GitHub: Nova</span>
            </div>

            <button className="w-6 h-6 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[10px] font-mono text-slate-500 font-bold hidden sm:block">
            NOVA v1.0.7
          </div>
        </div>

        {/* Omnibar & Action Bar */}
        <div className="h-11 bg-[#090d16] border-b border-white/10 flex items-center px-4 gap-3 shrink-0">
          <div className="flex items-center gap-1 text-slate-400">
            <button className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors opacity-40">
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors">
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Omnibox URL */}
          <div className="flex-1 h-7.5 bg-black/50 rounded-xl border border-white/10 flex items-center px-3 gap-2 text-xs shadow-inner">
            <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-mono text-slate-300 truncate flex-1 text-[11px]">
              {typedUrl}
            </span>

            {/* Live Shield Indicator */}
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield className="w-2.5 h-2.5" />
              <span>Shield Active</span>
            </div>
          </div>

          {/* AI Action Icon */}
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Viewport Content */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Vertical Sidebar Tabs */}
          <div className="w-14 sm:w-48 bg-[#06080e] border-r border-white/10 p-3 flex flex-col justify-between shrink-0 select-none">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 px-2 py-1 mb-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-500 flex items-center justify-center text-black font-bold text-xs shadow-md">
                  N
                </div>
                <span className="text-xs font-bold text-slate-200 hidden sm:inline font-mono">Workspace</span>
              </div>

              <div className="px-2.5 py-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold flex items-center gap-2 border-l-2 border-cyan-400">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="hidden sm:inline truncate">Active Tab</span>
              </div>

              <div className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="hidden sm:inline truncate">Research AI</span>
              </div>

              <div className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="hidden sm:inline truncate">GitHub Repo</span>
              </div>
            </div>

            <div className="hidden sm:flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-white/10">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 0 Trackers
              </span>
              <span>⌘1</span>
            </div>
          </div>

          {/* Dynamic Interactive Stage */}
          <div className="flex-1 relative overflow-hidden bg-[#070a11]">
            <AnimatePresence mode="wait">
              
              {/* 1. ANIMATED AUTONOMOUS AI AGENT */}
              {activeTab === 'ai' && (
                <motion.div
                  key="live-ai"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex flex-col md:flex-row relative"
                >
                  {/* Glowing Virtual AI Cursor */}
                  <motion.div
                    animate={{
                      x: cursorPos.x,
                      y: cursorPos.y,
                      scale: isClicking ? 0.85 : 1,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 80,
                      damping: 15,
                    }}
                    className="absolute z-40 pointer-events-none flex items-center gap-2 drop-shadow-[0_0_15px_#06b6d4]"
                  >
                    <div className="w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center text-black">
                      <MousePointer className="w-3 h-3 fill-black text-black" />
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-cyan-500 text-black px-2 py-0.5 rounded-md shadow-lg">
                      {isClicking ? 'Agent Clicking...' : 'Agent Navigating'}
                    </span>
                  </motion.div>

                  {/* Left Web View */}
                  <div className="flex-1 p-6 relative flex flex-col justify-between overflow-y-auto border-r border-white/10">
                    <div>
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white font-mono">arXiv / cs.AI Benchmark Index</h3>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                          Live DOM Inspection
                        </span>
                      </div>

                      <div className="space-y-3">
                        <motion.div 
                          whileHover={{ scale: 1.01 }}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isClicking ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <span className="text-xs font-bold text-cyan-300 block mb-1">
                            [cs.AI:2403.1189] Scalable Vision-Language Reasoning in Browser Environments
                          </span>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Evaluating autonomous agent policies for real-time web exploration with minimal DOM latency and token footprint...
                          </p>
                        </motion.div>

                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 opacity-75">
                          <span className="text-xs font-bold text-slate-300 block mb-1">
                            [cs.LG:2403.1142] Zero-Knowledge Cryptographic Tab Synchronizations
                          </span>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            A decentralized protocol for multi-device browsing session synchronization with client-side AES-256...
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Agent Live Terminal Output */}
                    <div className="mt-4 p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-slate-400">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>MCP Runtime Log:</span>
                      </div>
                      <p className="text-slate-300">
                        {aiResponseIndex === 0 && '→ [MCP:dom_query] Scanning 24 paper titles on active page...'}
                        {aiResponseIndex === 1 && '→ [MCP:cursor_click] Selected paper [cs.AI:2403.1189], extracting evaluation tables...'}
                        {aiResponseIndex === 2 && '✓ [SUCCESS] Extracted key metrics. Markdown report saved to Memory Vault.'}
                      </p>
                    </div>
                  </div>

                  {/* Right SidePanel AI Chat */}
                  <div className="w-full md:w-72 bg-[#05070c] p-4 flex flex-col justify-between shrink-0 border-t md:border-t-0 border-white/10">
                    <div>
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-bold text-white">Nova AI Sidepanel</span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                          Web-LLM
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                          <span className="text-cyan-400 font-bold block text-[11px] mb-1">You:</span>
                          <p className="text-slate-300">Analyze the top paper on this page and summarize results.</p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                          <span className="text-cyan-300 font-bold block text-[11px] mb-1 flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5" /> Nova Agent:
                          </span>
                          <p className="text-slate-200 text-[11px] leading-tight">
                            I clicked and analyzed paper [cs.AI:2403.1189]. It benchmarks real-time browser agents with 10x faster execution using native WebGPU DOM parsing.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 h-8 bg-white/5 border border-white/10 rounded-xl px-3 flex items-center justify-between text-xs text-slate-400">
                      <span>Ask AI something...</span>
                      <Send className="w-3.5 h-3.5 text-cyan-400 cursor-pointer" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 2. ANIMATED START PAGE DASHBOARD */}
              {activeTab === 'newtab' && (
                <motion.div
                  key="live-newtab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex flex-col items-center justify-center p-6 text-center relative overflow-y-auto"
                  style={{
                    background: 'radial-gradient(ellipse at center, #0f172a 0%, #030712 100%)'
                  }}
                >
                  <div className="text-5xl font-extrabold tracking-tight text-white mb-2 font-mono">12:45</div>
                  <div className="text-xs font-medium text-slate-400 mb-6">Good Afternoon, Creator</div>

                  {/* Start page omnibox */}
                  <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 shadow-2xl flex items-center gap-3 mb-6">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400" />
                    <span className="text-xs text-slate-300 font-mono text-left flex-1">Search with Google or enter URL...</span>
                    <div className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-500 text-black shadow-md">
                      ↵
                    </div>
                  </div>

                  {/* Speed Dials Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 max-w-lg w-full mb-6">
                    {[
                      { name: 'Google', char: 'G', color: 'bg-blue-500' },
                      { name: 'GitHub', char: 'GH', color: 'bg-purple-600' },
                      { name: 'YouTube', char: 'YT', color: 'bg-red-500' },
                      { name: 'Reddit', char: 'R', color: 'bg-orange-500' },
                      { name: 'Supabase', char: 'S', color: 'bg-emerald-500' },
                      { name: 'Vercel', char: 'V', color: 'bg-slate-700' },
                    ].map((dial, i) => (
                      <motion.div 
                        key={i} 
                        whileHover={{ y: -3, scale: 1.05 }}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/15 transition-colors cursor-pointer"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-md ${dial.color}`}>
                          {dial.char}
                        </div>
                        <span className="text-[11px] font-medium text-slate-300">{dial.name}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Interactive Quick Tasks Card */}
                  <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-left">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2 font-mono">
                      Quick Tasks & Notes
                    </span>
                    <div className="space-y-1.5">
                      {tasks.map(t => (
                        <div 
                          key={t.id} 
                          onClick={() => toggleTask(t.id)}
                          className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none"
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${t.done ? 'bg-cyan-500 border-cyan-500 text-black' : 'border-white/30'}`}>
                            {t.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className={t.done ? 'line-through text-slate-500' : ''}>{t.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 3. ANIMATED DUAL SPLIT VIEW */}
              {activeTab === 'split' && (
                <motion.div
                  key="live-split"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex divide-x divide-white/15"
                >
                  <div className="w-1/2 p-6 flex flex-col justify-between bg-[#080d18] overflow-y-auto">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">Left Pane: React 19 Docs</span>
                      </div>
                      <h4 className="text-base font-bold text-white mb-2">useActionState Hook</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        React 19 introduces automatic pending states, async transitions, and unified action primitives for high performance.
                      </p>
                      <div className="bg-slate-950 p-3 rounded-xl border border-white/10 font-mono text-[11px] text-cyan-300">
                        const [state, formAction] = useActionState(updateName, initial);
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">react.dev/reference</span>
                  </div>

                  <div className="w-1/2 p-6 flex flex-col justify-between bg-[#070b14] overflow-y-auto">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">Right Pane: Tailwind CSS v4</span>
                      </div>
                      <h4 className="text-base font-bold text-white mb-2">Oxide High-Speed Engine</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        10x faster compile times written in Rust with direct CSS variable theme integration.
                      </p>
                      <div className="bg-slate-950 p-3 rounded-xl border border-white/10 font-mono text-[11px] text-purple-300">
                        @import "tailwindcss";
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">tailwindcss.com/docs</span>
                  </div>
                </motion.div>
              )}

              {/* 4. ANIMATED ZERO-KNOWLEDGE 1-CLICK SYNC */}
              {activeTab === 'sync' && (
                <motion.div
                  key="live-sync"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full p-6 sm:p-10 flex flex-col items-center justify-center text-center overflow-y-auto"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/20">
                    <Lock className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Zero-Knowledge Device Pairing</h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6">
                    Pair any second laptop or desktop instantly without emails or passwords. Fully encrypted with AES-256 GCM.
                  </p>

                  <div className="w-full max-w-md bg-slate-950 rounded-2xl p-4 border border-white/10 mb-6">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                      Your 1-Click Pairing Code
                    </span>
                    <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                      <span className="font-mono text-sm sm:text-base font-bold text-cyan-300 tracking-wider select-all">
                        {syncCode}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={copySync}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                          title="Copy Pairing Code"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={regenerateSync}
                          disabled={isSyncing}
                          className="p-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 transition-colors cursor-pointer disabled:opacity-50"
                          title="Regenerate Pairing Code"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-md w-full text-left">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                      <Laptop className="w-5 h-5 text-cyan-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-white block">Device 1 (MacBook)</span>
                        <span className="text-[10px] text-slate-400">Encrypts & Generates Key</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-white block">Device 2 (Windows PC)</span>
                        <span className="text-[10px] text-slate-400">Decrypts & Syncs in 0.2s</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>

      </div>
    </div>
  );
};
