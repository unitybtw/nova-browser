import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
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
  Download,
  Github,
  Play,
  Cpu,
  Terminal,
  Search
} from "lucide-react";

export const Hero: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<"newtab" | "agent" | "split">("newtab");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAIMode, setIsAIMode] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [currentTime, setCurrentTime] = useState("13:22");

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const TABS = [
    {
      id: "newtab" as const,
      title: "New Tab",
      url: "nova://newtab",
      icon: "/nova-logo-tight.png",
      isCustomIcon: true,
    },
    {
      id: "agent" as const,
      title: "Deep Research Agent",
      url: "nova://agent/neural-synthesis",
      icon: Sparkles,
      isCustomIcon: false,
    },
    {
      id: "split" as const,
      title: "Split: Docs & Translate",
      url: "dual://developer.mozilla.org + github.com",
      icon: Columns,
      isCustomIcon: false,
    },
  ];

  const SPEED_DIALS = [
    { name: "GitHub", url: "github.com", category: "Code", icon: Github },
    { name: "Claude", url: "claude.ai", category: "AI", icon: Bot },
    { name: "ChatGPT", url: "chatgpt.com", category: "AI", icon: Sparkles },
    { name: "Gemini", url: "gemini.google.com", category: "AI", icon: Cpu },
    { name: "YouTube", url: "youtube.com", category: "Media", icon: Play },
    { name: "MCP Bridge", url: "localhost:3020", category: "Bridge", icon: Terminal },
  ];

  return (
    <section className="relative pt-28 md:pt-36 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
      {/* Product Tag Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#4338ca]/20 bg-[#4338ca]/5 font-mono text-[11px] font-semibold text-[#4338ca] uppercase tracking-wider mb-6"
      >
        <span className="w-2 h-2 rounded-full bg-[#4338ca]" />
        <span>Next-Generation Sovereign Web Browser</span>
      </motion.div>

      {/* Main Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        className="font-display font-black text-5xl sm:text-7xl lg:text-8xl tracking-tight text-[#171717] max-w-5xl leading-[1.05]"
      >
        Thought at the Speed of{" "}
        <span className="bg-gradient-to-r from-[#4338ca] to-cyan-500 bg-clip-text text-transparent">Thought.</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 text-lg sm:text-xl text-[#525252] max-w-2xl font-sans font-normal leading-relaxed"
      >
        On-device WebGPU AI, Model Context Protocol server, native ad blocking, and sub-millisecond tab allocation built on Electron & Chromium.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 flex flex-wrap items-center justify-center gap-4 select-none"
      >
        <a
          href="#download"
          className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-[#171717] text-white font-mono text-sm uppercase tracking-wider font-semibold shadow-lg hover:bg-black hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <Download className="w-4 h-4" />
          <span>Download for macOS & Windows</span>
        </a>

        <a
          href="https://github.com/unitybtw/nova-browser"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white border border-[#e5e5e5] text-[#171717] font-mono text-sm uppercase tracking-wider font-semibold hover:border-black hover:bg-neutral-50 transition-all duration-200 shadow-sm"
        >
          <Github className="w-4 h-4" />
          <span>Star on GitHub</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#737373]" />
        </a>
      </motion.div>

      {/* 1:1 AUTHENTIC NOVA BROWSER UI SHOWCASE (LIGHT THEME) */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.95, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-6xl mx-auto mt-14 text-left"
      >
        {/* Outer App Frame */}
        <div className="relative bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-[0_25px_70px_rgba(0,0,0,0.12)] flex flex-col min-h-[580px] md:min-h-[640px] z-10 font-sans">
          
          {/* ROW 1: TOP TAB BAR */}
          <div className="h-11 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-3 select-none">
            {/* macOS Window Controls */}
            <div className="flex items-center gap-2 pr-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-xs" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-xs" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-xs" />
            </div>

            {/* Workspace Indicator Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-slate-200/70 text-slate-700 mr-1">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              <span>Default</span>
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
                        ? "bg-white text-slate-900 border-t border-l border-r border-slate-200 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute -top-[1px] left-0 right-0 h-[2px] bg-blue-500 rounded-t-full shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
                    )}

                    {tab.isCustomIcon ? (
                      <img src={tab.icon as string} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                    ) : (
                      React.createElement(tab.icon as React.ElementType, {
                        className: `w-3.5 h-3.5 shrink-0 ${isActive ? "text-blue-600" : "text-slate-500"}`
                      })
                    )}

                    <span className="truncate flex-1 text-left text-[11px] font-medium">{tab.title}</span>

                    <span className="p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setActiveTabId("newtab")}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer"
                title="New Tab (⌘T)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ROW 2: OMNIBOX TOOLBAR */}
          <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3 text-slate-600 select-none">
            {/* History Nav */}
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Go back" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button type="button" aria-label="Go forward" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button type="button" aria-label="Reload page" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors">
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => setActiveTabId("newtab")} aria-label="Home page" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors ml-0.5">
                <Home className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Omnibox Address Input */}
            <div className="flex-1 bg-slate-100 rounded-xl h-8 px-3 flex items-center justify-between border border-slate-200/80 focus-within:border-blue-500 shadow-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1 text-slate-700 font-mono text-[11px]">
                <div className="flex items-center justify-center p-0.5 rounded bg-emerald-500/10 text-emerald-600">
                  <Lock className="w-3 h-3" />
                </div>
                <span className="truncate text-slate-800">
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
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white hover:bg-slate-200/80 text-slate-600 border border-slate-200"
                  }`}
                  title="Tek Tıkla Sayfa Çevirisi"
                >
                  <Languages className="w-3 h-3" />
                  <span>{translated ? "TR" : "EN"}</span>
                </button>

                <button className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800" title="Reader Mode">
                  <BookOpen className="w-3 h-3" />
                </button>

                <button className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-blue-600" title="Bookmark">
                  <Star className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Right Tools Bar */}
            <div className="flex items-center gap-1">
              {/* AI Copilot Pill */}
              <button 
                onClick={() => setActiveTabId("agent")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 border border-cyan-500/20 font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                title="Nova AI Copilot"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                <span>AI</span>
              </button>

              <div className="w-px h-4 bg-slate-200 mx-0.5" />

              {/* Privacy Shield Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 font-mono text-[10px]">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span className="hidden sm:inline font-semibold">Shield Active</span>
              </div>

              <button type="button" aria-label="Downloads" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button type="button" aria-label="Open extensions" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900">
                <Puzzle className="w-3.5 h-3.5" />
              </button>
              <button type="button" aria-label="Open settings" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* VIEWPORT CONTENT AREA */}
          <div className="flex-1 bg-gradient-to-b from-slate-50/80 via-white to-slate-100/60 relative overflow-hidden flex flex-col">
            
            {/* VIEW 1: AUTHENTIC NOVA NEW TAB PAGE IN LIGHT THEME */}
            {activeTabId === "newtab" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                {/* Background Subtle Cyber Grid */}
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

                {/* Nova Logo & Clock */}
                <div className="relative z-10 flex flex-col items-center text-center mb-8">
                  {/* Date Badge */}
                  <div className="flex items-center gap-1.5 mb-2 px-3.5 py-1 rounded-full bg-slate-900/5 backdrop-blur-xl border border-slate-900/10 text-xs font-semibold tracking-wider text-slate-700 shadow-xs">
                    <span>Friday, August 28</span>
                  </div>

                  <h2 className="text-6xl sm:text-7xl font-extralight tracking-tight text-slate-900 font-sans tabular-nums drop-shadow-xs">
                    {currentTime}
                  </h2>
                  <p className="text-xl text-slate-600 font-light tracking-wide mt-1">
                    Good Afternoon
                  </p>
                </div>

                {/* AI & Web Search Omnibar */}
                <div className="relative z-10 w-full max-w-xl mb-8">
                  <div className="relative flex items-center bg-white border border-slate-200/90 hover:border-blue-500/60 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
                    <Search className="w-4 h-4 text-cyan-500 mr-2 shrink-0" />

                    <button
                      onClick={() => setIsAIMode(!isAIMode)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold tracking-wider mr-2 cursor-pointer transition-colors ${
                        isAIMode
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>@ai</span>
                    </button>

                    <input
                      type="text"
                      aria-label={isAIMode ? "Ask Nova Agent" : "Search the web or enter a URL"}
                      placeholder={isAIMode ? "Ask Nova Agent anything or give instructions..." : "Search web or type a URL..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent flex-1 outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 font-sans"
                    />

                    <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px] bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                      <span>ENTER</span>
                      <span>↵</span>
                    </div>
                  </div>
                </div>

                {/* Speed Dials Grid */}
                <div className="relative z-10 grid grid-cols-3 sm:grid-cols-6 gap-3 w-full max-w-2xl">
                  {SPEED_DIALS.map((dial) => {
                    const Icon = dial.icon;
                    return (
                      <div
                        key={dial.name}
                        className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs hover:shadow-md cursor-pointer transition-all duration-200 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-50 transition-colors flex items-center justify-center">
                          <Icon className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 group-hover:text-blue-600 transition-colors truncate w-full text-center">
                          {dial.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* System Status Footer */}
                <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
            {activeTabId === "agent" && (
              <div className="flex-1 p-6 sm:p-8 flex flex-col font-mono text-xs text-slate-700 bg-white">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-blue-600 font-semibold">
                    <Bot className="w-4 h-4" />
                    <span>Nova Autonomous Agent // Multi-Step Synthesis</span>
                  </div>
                  <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-[10px] border border-blue-200 font-medium">
                    Llama 3.2 3B (Local WebGPU)
                  </span>
                </div>

                <div className="flex-1 bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-between shadow-xs">
                  <div className="space-y-3">
                    <p className="text-slate-600">// Prompt: "Deep analyze Rust WebAssembly vs C++ compile-time optimizations"</p>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-emerald-700 space-y-1.5 text-[11px] shadow-xs">
                      <p>&gt; [Step 1] Crawled 14 documentation pages on-device in 80ms.</p>
                      <p>&gt; [Step 2] Executed semantic vector similarity pass via WebGPU shaders.</p>
                      <p>&gt; [Step 3] Generated zero-knowledge executive briefing without cloud roundtrips.</p>
                    </div>

                    <div className="p-4 bg-white rounded-lg border border-slate-200 text-slate-800 text-xs font-sans leading-relaxed shadow-xs">
                      <h4 className="font-display text-sm font-bold text-slate-900 mb-1.5">Executive Findings:</h4>
                      <p className="text-slate-600 text-xs leading-relaxed">
                        Rust’s zero-cost abstraction model combined with LLVM backend optimization produces ~18% smaller WASM binaries with predictable GC-free memory layouts.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Inference Speed: 62 tokens/sec</span>
                    <span className="text-blue-600 font-semibold">Status: Autonomous Task Complete</span>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: DUAL SPLIT-VIEW & PAGE TRANSLATION */}
            {activeTabId === "split" && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white">
                {/* Left Split Pane: English Source */}
                <div className="p-6 flex flex-col justify-between bg-white">
                  <div>
                    <div className="flex items-center justify-between mb-3 text-[11px] font-mono text-slate-500">
                      <span>FRAME A: ORIGINAL ENGLISH</span>
                      <span className="text-slate-400 font-semibold">MDN Web Docs</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
                      WebGPU API Specifications
                    </h3>
                    <p className="font-sans text-xs text-slate-600 leading-relaxed">
                      WebGPU exposes modern graphics hardware capabilities to the web, enabling high-performance compute shaders and direct GPU memory buffer manipulation.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 text-[10px] font-mono text-slate-400">
                    Sync Scroll: ENABLED
                  </div>
                </div>

                {/* Right Split Pane: 1-Click Turkish Translation */}
                <div className="p-6 flex flex-col justify-between bg-blue-50/30">
                  <div>
                    <div className="flex items-center justify-between mb-3 text-[11px] font-mono text-blue-600 font-semibold">
                      <span>FRAME B: TEK TIKLA TÜRKÇE ÇEVİRİ</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px]">Aktif</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
                      WebGPU API Teknik Özellikleri
                    </h3>
                    <p className="font-sans text-xs text-slate-700 leading-relaxed">
                      WebGPU, modern grafik donanımı yeteneklerini web platformuna taşıyarak yüksek performanslı hesaplama gölgelendiricileri ve doğrudan GPU bellek manipülasyonu sağlar.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-blue-100 text-[10px] font-mono text-blue-600">
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
