import React, { useState } from 'react';
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
  Terminal
} from 'lucide-react';

export const InteractiveBrowserFrame: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ai' | 'newtab' | 'split' | 'sync'>('ai');
  const [syncCode, setSyncCode] = useState('nova-7b2a-89c1-4f12');
  const [isCopied, setIsCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
    }, 500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Interactive Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'ai'
              ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
              : 'card-glass text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4 text-cyan-500" />
          <span>🤖 Otonom AI & MCP Ajanı</span>
        </button>

        <button
          onClick={() => setActiveTab('newtab')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'newtab'
              ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
              : 'card-glass text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>✨ Başlangıç Paneli & Görevler</span>
        </button>

        <button
          onClick={() => setActiveTab('split')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'split'
              ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
              : 'card-glass text-slate-400 hover:text-white'
          }`}
        >
          <FolderTree className="w-4 h-4 text-amber-400" />
          <span>⚡ Çift Ekran (Split View)</span>
        </button>

        <button
          onClick={() => setActiveTab('sync')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'sync'
              ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
              : 'card-glass text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>🔒 Sıfır-Bilgi 1-Tık Eşleme</span>
        </button>
      </div>

      {/* Real Authentic Browser Window Frame */}
      <div className="rounded-3xl border border-white/15 bg-[#080b12] shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-[560px] md:h-[640px]">
        
        {/* Top Window Titlebar & Tab Strip */}
        <div className="h-10 bg-[#06080e] border-b border-white/10 flex items-center px-4 gap-3 shrink-0 select-none">
          {/* macOS Traffic Lights */}
          <div className="flex items-center gap-2 mr-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>

          {/* Active Tabs */}
          <div className="flex items-center gap-1.5 overflow-hidden flex-1">
            <div className="h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-2 bg-white/10 text-white border border-white/15 shadow-sm max-w-[200px]">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="truncate">
                {activeTab === 'ai' ? 'Nova AI Agent - Research' : activeTab === 'newtab' ? 'Nova - New Tab' : activeTab === 'split' ? 'React 19 Docs & Tailwind' : 'Device Pairing Chain'}
              </span>
            </div>
            <div className="h-7 px-3 rounded-lg text-xs font-medium flex items-center gap-2 text-slate-400 hover:bg-white/5 cursor-pointer max-w-[160px]">
              <span className="truncate">GitHub Repository</span>
            </div>
            <button className="w-6 h-6 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[10px] font-mono text-slate-400 font-bold hidden sm:block">
            NOVA BROWSER
          </div>
        </div>

        {/* Omnibar & Toolbar */}
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

          {/* Omnibox URL Bar */}
          <div className="flex-1 h-7.5 bg-black/40 rounded-xl border border-white/10 flex items-center px-3 gap-2 text-xs">
            <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-mono text-slate-300 truncate flex-1 text-[11px]">
              {activeTab === 'ai' ? 'https://arxiv.org/list/cs.AI/recent' : activeTab === 'newtab' ? 'nova://newtab' : activeTab === 'split' ? 'https://react.dev | https://tailwindcss.com' : 'nova://settings/sync'}
            </span>

            {/* Shield Badge */}
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield className="w-2.5 h-2.5" />
              <span>Shield Active</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Main Window Viewport */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Vertical Sidebar */}
          <div className="w-14 sm:w-48 bg-[#06080e] border-r border-white/10 p-3 flex flex-col justify-between shrink-0">
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

              <div className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="hidden sm:inline truncate">Research AI</span>
              </div>

              <div className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="hidden sm:inline truncate">GitHub Repo</span>
              </div>
            </div>

            <div className="hidden sm:flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-white/10">
              <span>0 Ads Blocked</span>
              <span>⌘1</span>
            </div>
          </div>

          {/* Dynamic Content Body according to activeTab */}
          <div className="flex-1 relative overflow-hidden bg-[#070a11]">
            <AnimatePresence mode="wait">
              
              {/* 1. Otonom AI & MCP View */}
              {activeTab === 'ai' && (
                <motion.div
                  key="view-ai"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex flex-col md:flex-row"
                >
                  {/* Left: Web Content with Glowing Agent Cursor */}
                  <div className="flex-1 p-6 relative flex flex-col justify-between overflow-y-auto border-r border-white/10">
                    {/* Simulated Glowing AI Cursor */}
                    <div className="absolute top-28 left-40 z-30 pointer-events-none flex items-center gap-2 animate-bounce">
                      <div className="w-5 h-5 rounded-full bg-cyan-400 shadow-[0_0_20px_#06b6d4] flex items-center justify-center">
                        <MousePointer className="w-3 h-3 text-black fill-black" />
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-cyan-500 text-black px-2 py-0.5 rounded-md shadow-lg">
                        Agent Clicking: Extract Papers
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                        <h3 className="text-base font-bold text-white font-mono">arXiv.org / Artificial Intelligence</h3>
                        <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                          Autonomous Mode
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-white/5 border border-cyan-500/40 relative">
                          <span className="text-xs font-bold text-cyan-300 block mb-1">
                            [cs.AI:2403.1189] Scalable Vision-Language Reasoning in Browser Environments
                          </span>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Evaluating autonomous agent policies for real-time web exploration with minimal DOM latency...
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 opacity-70">
                          <span className="text-xs font-bold text-slate-300 block mb-1">
                            [cs.LG:2403.1142] Zero-Knowledge Cryptographic Tab Synchronizations
                          </span>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            A decentralized protocol for multi-device browsing session synchronization without server knowledge...
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-white/10 font-mono text-[11px] text-slate-400">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>MCP Agent Execution Trace:</span>
                      </div>
                      <p className="text-slate-300">✓ Fetched 24 papers &gt; Parsed DOM nodes &gt; Generating Summary Vault Memo</p>
                    </div>
                  </div>

                  {/* Right: AI SidePanel Chat */}
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
                          <p className="text-slate-300">Summarize the top AI benchmark papers from this list.</p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                          <span className="text-cyan-300 font-bold block text-[11px] mb-1 flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5" /> Nova Agent:
                          </span>
                          <p className="text-slate-200 text-[11px] leading-tight">
                            I examined 24 papers on arXiv. The #1 highlight introduces Web-LLM real-time DOM action reasoning with 10x faster execution.
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

              {/* 2. Start Page Dashboard View */}
              {activeTab === 'newtab' && (
                <motion.div
                  key="view-newtab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex flex-col items-center justify-center p-6 text-center relative"
                  style={{
                    background: 'radial-gradient(ellipse at center, #0f172a 0%, #030712 100%)'
                  }}
                >
                  <div className="text-5xl font-extrabold tracking-tight text-white mb-2">12:45</div>
                  <div className="text-xs font-medium text-slate-400 mb-6">Good Afternoon, Creator</div>

                  {/* Start page omnibox */}
                  <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 shadow-2xl flex items-center gap-3 mb-8">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400" />
                    <span className="text-xs text-slate-300 font-mono text-left flex-1">Search with Google or enter URL...</span>
                    <div className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-500 text-black shadow-md">
                      ↵
                    </div>
                  </div>

                  {/* Clean Speed Dials Grid (Google, GitHub, YouTube, Reddit, Supabase, Vercel) */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 max-w-lg w-full">
                    {[
                      { name: 'Google', char: 'G', color: 'bg-blue-500' },
                      { name: 'GitHub', char: 'GH', color: 'bg-purple-600' },
                      { name: 'YouTube', char: 'YT', color: 'bg-red-500' },
                      { name: 'Reddit', char: 'R', color: 'bg-orange-500' },
                      { name: 'Supabase', char: 'S', color: 'bg-emerald-500' },
                      { name: 'Vercel', char: 'V', color: 'bg-slate-700' },
                    ].map((dial, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/15 transition-colors cursor-pointer">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-md ${dial.color}`}>
                          {dial.char}
                        </div>
                        <span className="text-[11px] font-medium text-slate-300">{dial.name}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 3. Split Screen View */}
              {activeTab === 'split' && (
                <motion.div
                  key="view-split"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex divide-x divide-white/15"
                >
                  <div className="w-1/2 p-6 flex flex-col justify-between bg-[#080d18]">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">Left: React 19 Docs</span>
                      </div>
                      <h4 className="text-base font-bold text-white mb-2">useActionState Hook</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        React 19 introduces automatic pending states, async transitions, and unified action primitives.
                      </p>
                      <div className="bg-slate-950 p-3 rounded-xl border border-white/10 font-mono text-[11px] text-cyan-300">
                        const [state, formAction] = useActionState(action, initial);
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">react.dev/reference</span>
                  </div>

                  <div className="w-1/2 p-6 flex flex-col justify-between bg-[#070b14]">
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

              {/* 4. Zero-Knowledge 1-Click Sync View */}
              {activeTab === 'sync' && (
                <motion.div
                  key="view-sync"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full p-6 sm:p-10 flex flex-col items-center justify-center text-center"
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
