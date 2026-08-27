import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Plus,
  X,
  Sparkles,
  Shield,
  Languages,
  BookOpen,
  Star,
  Puzzle,
  Settings,
  Columns,
  Bot,
  ArrowUpRight,
} from 'lucide-react';

export const Hero: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<'newtab' | 'agent' | 'split'>('newtab');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAIMode, setIsAIMode] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [currentTime, setCurrentTime] = useState('13:22');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const TABS = [
    {
      id: 'newtab' as const,
      title: 'New Tab',
      url: 'nova://newtab',
      icon: '/nova-icon-transparent.png',
      isCustomIcon: true,
    },
    {
      id: 'agent' as const,
      title: 'Deep Research Agent',
      url: 'nova://agent/neural-synthesis',
      icon: Sparkles,
      isCustomIcon: false,
    },
    {
      id: 'split' as const,
      title: 'Split: Docs & Translate',
      url: 'dual://developer.mozilla.org + github.com',
      icon: Columns,
      isCustomIcon: false,
    },
  ];

  const SPEED_DIALS = [
    { name: 'GitHub', url: 'github.com', category: 'Code', icon: '⚡' },
    { name: 'Claude', url: 'claude.ai', category: 'AI', icon: '✦' },
    { name: 'ChatGPT', url: 'chatgpt.com', category: 'AI', icon: '🤖' },
    { name: 'Gemini', url: 'gemini.google.com', category: 'AI', icon: '✨' },
    { name: 'YouTube', url: 'youtube.com', category: 'Media', icon: '▶' },
    { name: 'X / Twitter', url: 'x.com', category: 'Social', icon: '𝕏' },
  ];

  return (
    <section className="relative pt-28 md:pt-36 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
      {/* Ambient Glows */}
      <div className="ambient-glow-primary -top-20 left-[-10%]" />
      <div className="ambient-glow-primary top-[35%] right-[-10%]" />

      {/* Product Tag Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#4338ca]/20 bg-[#4338ca]/5 font-mono text-[11px] font-semibold text-[#4338ca] uppercase tracking-wider mb-6"
      >
        <span className="w-2 h-2 rounded-full bg-[#4338ca] animate-pulse" />
        <span>Next-Generation Sovereign Web Browser</span>
      </motion.div>

      {/* Main Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        className="font-serif text-5xl sm:text-7xl lg:text-8xl tracking-tight text-[#171717] max-w-5xl leading-[1.08]"
      >
        Thought at the Speed of{' '}
        <span className="italic font-normal text-[#4338ca]">Thought.</span>
      </motion.h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="font-sans text-base sm:text-lg md:text-xl text-neutral-600 max-w-2xl mt-6 leading-relaxed"
      >
        Embedded autonomous local AI agent, native 1-click page translation, zero-knowledge privacy vault, and real-time WebGPU shaders. Uncompromised speed. Unprecedented sovereignty.
      </motion.p>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="pt-8 flex gap-4 flex-wrap justify-center font-mono text-xs uppercase tracking-wider"
      >
        <a
          href="#download"
          className="px-8 py-4 bg-[#171717] text-[#fcfbf9] font-semibold rounded-xl hover:bg-[#4338ca] transition-all shadow-xl hover:shadow-indigo-500/20 active:scale-[0.98]"
        >
          Download for macOS & Windows
        </a>
        <a
          href="https://github.com/unitybtw/nova-browser"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-4 bg-white border border-[#e5e5e5] text-[#171717] font-semibold rounded-xl hover:bg-neutral-50 transition-colors inline-flex items-center gap-2"
        >
          <span>Star on GitHub</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500" />
        </a>
      </motion.div>

      {/* AUTHENTIC NOVA BROWSER LIVE UI CENTERPIECE */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.95, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-6xl mx-auto mt-14 text-left"
      >
        {/* Glow Behind Mockup */}
        <div className="absolute inset-0 bg-[#4338ca] opacity-15 blur-3xl rounded-3xl pointer-events-none" />

        {/* Outer App Frame */}
        <div className="relative bg-[#090d16] rounded-2xl overflow-hidden border border-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.6)] flex flex-col min-h-[580px] md:min-h-[640px] z-10 font-sans">
          
          {/* TOP TAB BAR */}
          <div className="h-11 bg-[#0d1322] border-b border-slate-800/80 flex items-center px-4 gap-3 select-none">
            {/* macOS Window Controls */}
            <div className="flex items-center gap-2 pr-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-xs" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-xs" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-xs" />
            </div>

            {/* Browser Tabs */}
            <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar pt-1">
              {TABS.map((tab) => {
                const isActive = activeTabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`group relative h-8 px-3.5 rounded-t-xl flex items-center gap-2 text-xs font-medium cursor-pointer transition-all duration-200 min-w-[140px] max-w-[200px] ${
                      isActive
                        ? 'bg-[#121a2f] text-slate-100 border-t border-l border-r border-slate-700/80 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute -top-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-cyan-400 rounded-t-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                    )}

                    {tab.isCustomIcon ? (
                      <img src={tab.icon as string} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                    ) : (
                      React.createElement(tab.icon as React.ElementType, {
                        className: `w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`
                      })
                    )}

                    <span className="truncate flex-1 text-left text-[11px] font-medium">{tab.title}</span>

                    <span className="p-0.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setActiveTabId('newtab')}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
                title="New Tab"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* OMNIBOX TOOLBAR */}
          <div className="h-12 bg-[#121a2f] border-b border-slate-800 flex items-center px-4 gap-3 text-slate-400 select-none">
            {/* History Nav */}
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Omnibox Address Input */}
            <div className="flex-1 bg-[#090d16] rounded-xl h-8 px-3 flex items-center justify-between border border-slate-700/80 focus-within:border-cyan-500 shadow-inner">
              <div className="flex items-center gap-2 min-w-0 flex-1 text-slate-300 font-mono text-[11px]">
                <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate text-slate-200">
                  {TABS.find((t) => t.id === activeTabId)?.url}
                </span>
              </div>

              {/* Action Icons in URL Bar */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* 1-Click Page Translation Badge */}
                <button
                  onClick={() => setTranslated(!translated)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono transition-all cursor-pointer ${
                    translated
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                      : 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Tek Tıkla Sayfa Çevirisi"
                >
                  <Languages className="w-3 h-3" />
                  <span>{translated ? 'TR' : 'EN'}</span>
                </button>

                <button className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200" title="Reader Mode">
                  <BookOpen className="w-3 h-3" />
                </button>

                <button className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-cyan-400" title="Bookmark">
                  <Star className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Right Tools Bar */}
            <div className="flex items-center gap-1">
              {/* Privacy Shield Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                <Shield className="w-3 h-3" />
                <span className="hidden sm:inline">Shield Active</span>
              </div>

              <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200">
                <Puzzle className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* VIEWPORT CONTENT AREA */}
          <div className="flex-1 bg-[#090d16] relative overflow-hidden flex flex-col">
            
            {/* VIEW 1: AUTHENTIC NOVA NEW TAB PAGE */}
            {activeTabId === 'newtab' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                {/* Background Cyber Grid */}
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

                {/* Nova Logo & Clock */}
                <div className="relative z-10 flex flex-col items-center text-center mb-8">
                  <div className="relative w-16 h-16 mb-4 group cursor-pointer">
                    <div className="absolute inset-0 bg-cyan-500/20 rounded-2xl blur-xl group-hover:bg-cyan-500/40 transition-all" />
                    <img
                      src="/nova-icon-transparent.png"
                      alt="Nova Logo"
                      className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <h2 className="font-mono text-4xl sm:text-5xl font-bold text-white tracking-tight">
                    {currentTime}
                  </h2>
                  <p className="font-mono text-[11px] text-slate-400 uppercase tracking-widest mt-1">
                    Autonomous Intelligence Active
                  </p>
                </div>

                {/* AI & Web Search Omnibar */}
                <div className="relative z-10 w-full max-w-xl mb-8">
                  <div className="relative flex items-center bg-[#121a2f]/90 backdrop-blur-xl border border-slate-700/80 hover:border-cyan-500/60 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 rounded-2xl px-4 py-3 shadow-2xl transition-all">
                    <button
                      onClick={() => setIsAIMode(!isAIMode)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold tracking-wider mr-2 cursor-pointer transition-colors ${
                        isAIMode
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>@ai</span>
                    </button>

                    <input
                      type="text"
                      placeholder={isAIMode ? "Ask Nova Agent anything or give instructions..." : "Search web or type a URL..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent flex-1 outline-none text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-sans"
                    />

                    <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px] bg-slate-800/80 px-2 py-1 rounded-lg">
                      <span>ENTER</span>
                      <span>↵</span>
                    </div>
                  </div>
                </div>

                {/* Speed Dials Grid */}
                <div className="relative z-10 grid grid-cols-3 sm:grid-cols-6 gap-3 w-full max-w-2xl">
                  {SPEED_DIALS.map((dial) => (
                    <div
                      key={dial.name}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#121a2f]/60 hover:bg-[#121a2f] border border-slate-800 hover:border-slate-700 cursor-pointer transition-all duration-300 group hover:-translate-y-0.5"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-sm font-semibold group-hover:scale-105 transition-transform text-slate-200">
                        {dial.icon}
                      </div>
                      <span className="text-[11px] font-medium text-slate-300 group-hover:text-cyan-400 transition-colors truncate w-full text-center">
                        {dial.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* System Status Footer */}
                <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>MCP Bridge: Port 3020 (Online)</span>
                  </span>
                  <span>•</span>
                  <span>WebGPU Acceleration: ON</span>
                  <span>•</span>
                  <span>Privacy Shield: 0 Trackers</span>
                </div>
              </div>
            )}

            {/* VIEW 2: AUTONOMOUS DEEP RESEARCH AGENT */}
            {activeTabId === 'agent' && (
              <div className="flex-1 p-6 sm:p-8 flex flex-col font-mono text-xs text-slate-300">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                    <Bot className="w-4 h-4" />
                    <span>Nova Autonomous Agent // Multi-Step Synthesis</span>
                  </div>
                  <span className="bg-cyan-500/10 text-cyan-400 px-2.5 py-0.5 rounded-full text-[10px] border border-cyan-500/20">
                    Llama 3.2 3B (Local WebGPU)
                  </span>
                </div>

                <div className="flex-1 bg-[#121a2f]/80 rounded-xl p-5 border border-slate-800 flex flex-col justify-between shadow-inner">
                  <div className="space-y-3">
                    <p className="text-slate-400">// Prompt: "Deep analyze Rust WebAssembly vs C++ compile-time optimizations"</p>
                    <div className="p-3 bg-[#090d16] rounded-lg border border-slate-800 text-emerald-400 space-y-1.5 text-[11px]">
                      <p>&gt; [Step 1] Crawled 14 documentation pages on-device in 80ms.</p>
                      <p>&gt; [Step 2] Executed semantic vector similarity pass via WebGPU shaders.</p>
                      <p>&gt; [Step 3] Generated zero-knowledge executive briefing without cloud roundtrips.</p>
                    </div>

                    <div className="p-4 bg-[#090d16]/90 rounded-lg border border-slate-800/80 text-slate-200 text-xs font-sans leading-relaxed">
                      <h4 className="font-serif text-sm font-bold text-white mb-1.5">Executive Findings:</h4>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        Rust’s zero-cost abstraction model combined with LLVM backend optimization produces ~18% smaller WASM binaries with predictable GC-free memory layouts.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Inference Speed: 62 tokens/sec</span>
                    <span className="text-cyan-400 font-semibold">Status: Autonomous Task Complete</span>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: DUAL SPLIT-VIEW & PAGE TRANSLATION */}
            {activeTabId === 'split' && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                {/* Left Split Pane: English Source */}
                <div className="p-6 flex flex-col justify-between bg-[#090d16]">
                  <div>
                    <div className="flex items-center justify-between mb-3 text-[11px] font-mono text-slate-400">
                      <span>FRAME A: ORIGINAL ENGLISH</span>
                      <span className="text-slate-500">MDN Web Docs</span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-white mb-2">
                      WebGPU API Specifications
                    </h3>
                    <p className="font-sans text-xs text-slate-400 leading-relaxed">
                      WebGPU exposes modern graphics hardware capabilities to the web, enabling high-performance compute shaders and direct GPU memory buffer manipulation.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 text-[10px] font-mono text-slate-500">
                    Sync Scroll: ENABLED
                  </div>
                </div>

                {/* Right Split Pane: 1-Click Turkish Translation */}
                <div className="p-6 flex flex-col justify-between bg-[#121a2f]/40">
                  <div>
                    <div className="flex items-center justify-between mb-3 text-[11px] font-mono text-cyan-400">
                      <span>FRAME B: TEK TIKLA TÜRKÇE ÇEVİRİ</span>
                      <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded text-[10px]">Aktif</span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-cyan-200 mb-2">
                      WebGPU API Teknik Özellikleri
                    </h3>
                    <p className="font-sans text-xs text-slate-300 leading-relaxed">
                      WebGPU, modern grafik donanımı yeteneklerini web platformuna taşıyarak yüksek performanslı hesaplama gölgelendiricileri ve doğrudan GPU bellek manipülasyonu sağlar.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 text-[10px] font-mono text-cyan-400/80">
                    Gecikme: 120ms // DOM Bütünlüğü Korundu
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;

