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
  Check, 
  Terminal,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

export const RealBrowserSandbox: React.FC = () => {
  // Automated Self-Driving Browser Scene State
  // 0: AI Agent Navigation & Research
  // 1: Clean New Tab & Speed Dials
  // 2: Dual Split Screen Multitasking
  // 3: 1-Click Zero-Knowledge Sync
  const [scene, setScene] = useState(0);

  // Animated Cursor state for Scene 0
  const [cursorPos, setCursorPos] = useState({ x: 260, y: 150 });
  const [isClicking, setIsClicking] = useState(false);
  const [typedSearch, setTypedSearch] = useState('');

  // Automated Timeline Controller
  useEffect(() => {
    const sceneInterval = setInterval(() => {
      setScene((prev) => (prev + 1) % 4);
    }, 7000); // Transitions automatically every 7s

    return () => clearInterval(sceneInterval);
  }, []);

  // Internal AI Agent animation for Scene 0
  useEffect(() => {
    if (scene !== 0) return;

    // Reset
    setCursorPos({ x: 220, y: 140 });
    setIsClicking(false);

    const t1 = setTimeout(() => {
      setCursorPos({ x: 280, y: 190 });
    }, 1200);

    const t2 = setTimeout(() => {
      setIsClicking(true);
    }, 2200);

    const t3 = setTimeout(() => {
      setIsClicking(false);
      setCursorPos({ x: 380, y: 280 });
    }, 3800);

    const t4 = setTimeout(() => {
      setIsClicking(true);
    }, 4800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [scene]);

  // Automated typing effect for Scene 1 (New Tab)
  useEffect(() => {
    if (scene !== 1) {
      setTypedSearch('');
      return;
    }

    const query = 'Fast WebGPU autonomous agents 2026';
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i <= query.length) {
        setTypedSearch(query.slice(0, i));
        i++;
      } else {
        clearInterval(typeInterval);
      }
    }, 75);

    return () => clearInterval(typeInterval);
  }, [scene]);

  return (
    <div className="w-full max-w-5xl mx-auto select-none pointer-events-none">
      
      {/* Real Nova Browser Window Container */}
      <div className="rounded-3xl border border-white/15 bg-[#080b12] shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col h-[520px] sm:h-[600px] md:h-[660px] relative">
        
        {/* Top Window Bar with Horizontal Tabs */}
        <div className="h-10 bg-[#06080e] border-b border-white/10 flex items-center px-4 gap-3 shrink-0">
          {/* macOS Traffic Lights */}
          <div className="flex items-center gap-2 mr-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>

          {/* Horizontal Tabs */}
          <div className="flex items-center gap-1.5 overflow-hidden flex-1">
            <motion.div 
              layout
              className="h-7 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 bg-white/10 text-white border border-white/15 shadow-sm max-w-[220px]"
            >
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="truncate">
                {scene === 0 && 'arXiv: cs.AI Research'}
                {scene === 1 && 'Nova — Start Page'}
                {scene === 2 && 'React 19 & Tailwind Docs'}
                {scene === 3 && 'Device Pairing Chain'}
              </span>
            </motion.div>

            <div className="h-7 px-3 rounded-lg text-xs font-medium flex items-center gap-2 text-slate-400 bg-white/5 max-w-[160px] hidden sm:flex">
              <span className="truncate">GitHub: Nova</span>
            </div>

            <div className="w-6 h-6 rounded-lg text-slate-500 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 font-bold hidden sm:block">
            NOVA BROWSER
          </div>
        </div>

        {/* Omnibar & Navigation Bar */}
        <div className="h-11 bg-[#090d16] border-b border-white/10 flex items-center px-4 gap-3 shrink-0">
          <div className="flex items-center gap-1 text-slate-400">
            <div className="p-1 rounded opacity-60">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <div className="p-1 rounded opacity-30">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <div className="p-1 rounded opacity-60">
              <RotateCw className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Omnibox Address Field */}
          <div className="flex-1 h-7.5 bg-black/50 rounded-xl border border-white/10 flex items-center px-3 gap-2 text-xs shadow-inner">
            <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-mono text-slate-300 truncate flex-1 text-[11px]">
              {scene === 0 && 'https://arxiv.org/list/cs.AI/recent'}
              {scene === 1 && 'nova://newtab'}
              {scene === 2 && 'https://react.dev/reference | https://tailwindcss.com/docs'}
              {scene === 3 && 'nova://settings/sync'}
            </span>

            {/* Shield Badge */}
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield className="w-2.5 h-2.5" />
              <span>Shield Active</span>
            </div>
          </div>

          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Viewport Content with Automated Scene Cycles */}
        <div className="flex-1 relative overflow-hidden bg-[#070a11]">
          <AnimatePresence mode="wait">
            
            {/* SCENE 0: AUTONOMOUS AI AGENT */}
            {scene === 0 && (
              <motion.div
                key="scene-ai"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex flex-col md:flex-row relative"
              >
                {/* Glowing AI Virtual Cursor */}
                <motion.div
                  animate={{
                    x: cursorPos.x,
                    y: cursorPos.y,
                    scale: isClicking ? 0.85 : 1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 90,
                    damping: 14,
                  }}
                  className="absolute z-40 pointer-events-none flex items-center gap-2 drop-shadow-[0_0_15px_#06b6d4]"
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center text-black">
                    <MousePointer className="w-3 h-3 fill-black text-black" />
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-cyan-500 text-black px-2 py-0.5 rounded-md shadow-lg">
                    {isClicking ? 'AI Clicking Paper...' : 'AI Navigating'}
                  </span>
                </motion.div>

                {/* Main Page Area */}
                <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto border-r border-white/10">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white font-mono">arXiv / cs.AI Benchmark Index</h3>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                        Autonomous Navigation
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className={`p-3.5 rounded-xl border transition-all ${
                        isClicking ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]' : 'bg-white/5 border-white/10'
                      }`}>
                        <span className="text-xs font-bold text-cyan-300 block mb-1">
                          [cs.AI:2403.1189] Scalable Vision-Language Reasoning in Browser Environments
                        </span>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Evaluating autonomous agent policies for real-time web exploration with minimal token footprint...
                        </p>
                      </div>

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

                  {/* Terminal Log */}
                  <div className="mt-4 p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-slate-400">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>MCP Autonomous Execution Trace:</span>
                    </div>
                    <p className="text-slate-300">→ [MCP:dom_query] Scanning DOM &gt; [MCP:cursor_click] Extracted benchmark report (2.1s)</p>
                  </div>
                </div>

                {/* Right AI Sidepanel */}
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
                        <p className="text-slate-300">Summarize the top paper on this page.</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                        <span className="text-cyan-300 font-bold block text-[11px] mb-1 flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5" /> Nova Agent:
                        </span>
                        <p className="text-slate-200 text-[11px] leading-tight">
                          Analyzed paper [cs.AI:2403.1189]. It benchmarks real-time browser agents with 10x faster execution using native WebGPU DOM parsing.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 h-8 bg-white/5 border border-white/10 rounded-xl px-3 flex items-center justify-between text-xs text-slate-400">
                    <span>Ask AI something...</span>
                    <Send className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCENE 1: START PAGE & SPEED DIALS */}
            {scene === 1 && (
              <motion.div
                key="scene-newtab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex flex-col items-center justify-center p-6 text-center relative overflow-y-auto"
                style={{
                  background: 'radial-gradient(ellipse at center, #0f172a 0%, #030712 100%)'
                }}
              >
                <div className="text-5xl font-extrabold tracking-tight text-white mb-2 font-mono">12:45</div>
                <div className="text-xs font-medium text-slate-400 mb-6">Good Afternoon, Creator</div>

                {/* Animated typing search box */}
                <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-cyan-500/30 shadow-2xl flex items-center gap-3 mb-6">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400" />
                  <span className="text-xs text-white font-mono text-left flex-1 truncate">
                    {typedSearch}<span className="animate-pulse">|</span>
                  </span>
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
                    <div 
                      key={i} 
                      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/15 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-md ${dial.color}`}>
                        {dial.char}
                      </div>
                      <span className="text-[11px] font-medium text-slate-300">{dial.name}</span>
                    </div>
                  ))}
                </div>

                {/* Tasks widget */}
                <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-left">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2 font-mono">
                    Today's Tasks
                  </span>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded bg-cyan-500 flex items-center justify-center text-black">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="line-through text-slate-500">Benchmark WebGPU engine</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded border border-white/30" />
                      <span>Review autonomous MCP logs</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCENE 2: SPLIT SCREEN MULTITASKING */}
            {scene === 2 && (
              <motion.div
                key="scene-split"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex divide-x divide-white/15"
              >
                <div className="w-1/2 p-6 flex flex-col justify-between bg-[#080d18] overflow-y-auto">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">Left: React 19 Docs</span>
                    </div>
                    <h4 className="text-base font-bold text-white mb-2">useActionState Hook</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Automatic async transitions, pending flags, and optimistic state synchronization.
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
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">Right: Tailwind CSS v4</span>
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

            {/* SCENE 3: ZERO-KNOWLEDGE E2EE SYNC */}
            {scene === 3 && (
              <motion.div
                key="scene-sync"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
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
                    1-Click Pairing Code
                  </span>
                  <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="font-mono text-sm sm:text-base font-bold text-cyan-300 tracking-wider">
                      nova-7b2a-89c1-4f12
                    </span>
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> E2EE Active
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-md w-full text-left">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <Laptop className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-white block">Device 1 (MacBook)</span>
                      <span className="text-[10px] text-slate-400">Encrypted AES-256</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-white block">Device 2 (Windows PC)</span>
                      <span className="text-[10px] text-slate-400">Synced in 0.2s</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Bottom Subtle Progress Indicator */}
        <div className="h-1 bg-white/5 flex">
          {[0, 1, 2, 3].map((s) => (
            <div key={s} className="flex-1 h-full bg-white/5 relative overflow-hidden">
              {scene === s && (
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 7, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-cyan-400 to-purple-400"
                />
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
