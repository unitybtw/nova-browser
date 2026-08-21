import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, Sparkles, Moon, Sun, Monitor, Check, Shield, Layers, Layout, ArrowRight } from 'lucide-react';

export interface ThemeOption {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bgDark: string;
  bgLight: string;
  textDark: string;
  borderDark: string;
}

const ACCENT_PRESETS = [
  { id: 'cyan', name: 'Nova Cyan', hex: '#06b6d4', ring: 'ring-cyan-400', bg: 'bg-cyan-500', glow: 'rgba(6,182,212,0.4)' },
  { id: 'purple', name: 'Neon Purple', hex: '#8b5cf6', ring: 'ring-purple-400', bg: 'bg-purple-500', glow: 'rgba(139,92,246,0.4)' },
  { id: 'emerald', name: 'Matrix Green', hex: '#10b981', ring: 'ring-emerald-400', bg: 'bg-emerald-500', glow: 'rgba(16,185,129,0.4)' },
  { id: 'pink', name: 'Sunset Pink', hex: '#ec4899', ring: 'ring-pink-400', bg: 'bg-pink-500', glow: 'rgba(236,72,153,0.4)' },
  { id: 'amber', name: 'Solar Amber', hex: '#f59e0b', ring: 'ring-amber-400', bg: 'bg-amber-500', glow: 'rgba(245,158,11,0.4)' },
  { id: 'blue', name: 'Electric Blue', hex: '#3b82f6', ring: 'ring-blue-400', bg: 'bg-blue-500', glow: 'rgba(59,130,246,0.4)' },
];

const WALLPAPERS = [
  { id: 'nebula', name: 'Cosmic Nebula', gradient: 'radial-gradient(ellipse at top, #1e1b4b 0%, #030712 100%)', previewClass: 'from-indigo-950 to-slate-950' },
  { id: 'cyber', name: 'Cyber Grid', gradient: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)', previewClass: 'from-slate-900 to-black' },
  { id: 'aurora', name: 'Nordic Aurora', gradient: 'radial-gradient(ellipse at bottom, #064e3b 0%, #022c22 40%, #030712 100%)', previewClass: 'from-emerald-950 to-slate-950' },
  { id: 'oled', name: 'Pure OLED', gradient: '#000000', previewClass: 'bg-black' },
];

export const ThemeStudio: React.FC = () => {
  const [selectedAccent, setSelectedAccent] = useState(ACCENT_PRESETS[0]);
  const [selectedMode, setSelectedMode] = useState<'dark' | 'light'>('dark');
  const [selectedWallpaper, setSelectedWallpaper] = useState(WALLPAPERS[0]);
  const [sidebarStyle, setSidebarStyle] = useState<'vertical' | 'compact'>('vertical');
  const [activeTab, setActiveTab] = useState<'newtab' | 'ai' | 'split'>('newtab');

  return (
    <section id="theme-studio" className="py-24 relative overflow-hidden bg-gradient-to-b from-background via-background/90 to-background">
      {/* Dynamic Background Glow matching user selected accent */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] opacity-25 pointer-events-none transition-all duration-700"
        style={{ background: selectedAccent.hex }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-primary/20 text-sm font-semibold mb-4"
          >
            <Palette className="w-4 h-4" style={{ color: selectedAccent.hex }} />
            <span style={{ color: selectedAccent.hex }}>Nova Theme & Customizer Studio</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4"
          >
            Make Your Browser <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Uniquely Yours
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-foreground/70 leading-relaxed"
          >
            Customize accent colors, dynamic ambient backdrops, workspaces, and vertical tab layouts. Experience the live interactive browser preview below.
          </motion.p>
        </div>

        {/* Studio Grid: Controls on Left, Live Mockup on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl mx-auto">
          
          {/* Controls Column (4 cols) */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-4 flex flex-col gap-6"
          >
            {/* 1. Accent Colors */}
            <div className="glass rounded-3xl p-6 border border-white/10 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Accent Color
                </label>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-foreground/10 text-foreground/80">
                  {selectedAccent.name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {ACCENT_PRESETS.map((accent) => {
                  const isSelected = selectedAccent.id === accent.id;
                  return (
                    <button
                      key={accent.id}
                      onClick={() => setSelectedAccent(accent)}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'border-white/40 bg-white/10 shadow-lg scale-105' 
                          : 'border-transparent bg-foreground/5 hover:bg-foreground/10 hover:border-white/10'
                      }`}
                    >
                      <div 
                        className="w-5 h-5 rounded-full flex-shrink-0 shadow-inner flex items-center justify-center"
                        style={{ backgroundColor: accent.hex }}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </div>
                      <span className="text-xs font-medium text-foreground truncate">
                        {accent.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Theme Mode */}
            <div className="glass rounded-3xl p-6 border border-white/10 shadow-xl backdrop-blur-xl">
              <label className="text-sm font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-2 mb-4">
                <Monitor className="w-4 h-4 text-primary" /> Appearance Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedMode('dark')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border font-semibold text-sm transition-all cursor-pointer ${
                    selectedMode === 'dark'
                      ? 'border-primary/50 bg-slate-900 text-white shadow-lg shadow-primary/20'
                      : 'border-white/5 bg-foreground/5 text-foreground/70 hover:bg-foreground/10'
                  }`}
                >
                  <Moon className="w-4 h-4 text-cyan-400" />
                  <span>Dark OLED</span>
                </button>
                <button
                  onClick={() => setSelectedMode('light')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border font-semibold text-sm transition-all cursor-pointer ${
                    selectedMode === 'light'
                      ? 'border-primary/50 bg-white text-slate-900 shadow-lg'
                      : 'border-white/5 bg-foreground/5 text-foreground/70 hover:bg-foreground/10'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light Clean</span>
                </button>
              </div>
            </div>

            {/* 3. New Tab Ambient Wallpaper */}
            <div className="glass rounded-3xl p-6 border border-white/10 shadow-xl backdrop-blur-xl">
              <label className="text-sm font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-primary" /> Start Page Backdrop
              </label>
              <div className="grid grid-cols-2 gap-3">
                {WALLPAPERS.map((wp) => {
                  const isSelected = selectedWallpaper.id === wp.id;
                  return (
                    <button
                      key={wp.id}
                      onClick={() => setSelectedWallpaper(wp)}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-primary/60 bg-white/10 shadow-md' 
                          : 'border-transparent bg-foreground/5 hover:bg-foreground/10'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${wp.previewClass} border border-white/20 flex-shrink-0`} />
                      <span className="text-xs font-semibold text-foreground truncate">{wp.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Tab Layout */}
            <div className="glass rounded-3xl p-6 border border-white/10 shadow-xl backdrop-blur-xl">
              <label className="text-sm font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-2 mb-4">
                <Layout className="w-4 h-4 text-primary" /> Tab Layout
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSidebarStyle('vertical')}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                    sidebarStyle === 'vertical'
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-white/5 bg-foreground/5 text-foreground/70'
                  }`}
                >
                  Vertical Sidebar
                </button>
                <button
                  onClick={() => setSidebarStyle('compact')}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                    sidebarStyle === 'compact'
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-white/5 bg-foreground/5 text-foreground/70'
                  }`}
                >
                  Compact Mini
                </button>
              </div>
            </div>

          </motion.div>

          {/* Live Preview Column (8 cols) */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-8 flex flex-col gap-4"
          >
            {/* View Selector Tabs */}
            <div className="flex flex-wrap items-center justify-between bg-slate-900/60 p-2 rounded-2xl border border-white/10 backdrop-blur-md gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('newtab')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'newtab' 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Start Page Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'ai' 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  AI Assistant & MCP
                </button>
                <button
                  onClick={() => setActiveTab('split')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'split' 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Dual Split View
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/10 text-[11px] text-slate-300 font-mono">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: selectedAccent.hex }} />
                <span>Theme: {selectedAccent.name}</span>
              </div>
            </div>

            {/* Live Interactive Browser Frame */}
            <div 
              className={`rounded-3xl border transition-all duration-500 shadow-2xl overflow-hidden h-[540px] md:h-[620px] flex flex-col ${
                selectedMode === 'dark' 
                  ? 'bg-[#0a0f1d] border-white/15 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.8)]' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.15)]'
              }`}
              style={{
                boxShadow: `0 25px 50px -12px ${selectedAccent.glow}, 0 0 0 1px rgba(255,255,255,0.1) inset`
              }}
            >
              {/* Window Titlebar */}
              <div className={`h-11 px-4 flex items-center justify-between border-b ${
                selectedMode === 'dark' ? 'bg-[#080d1a] border-white/10' : 'bg-slate-100 border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  <span className="text-[11px] font-bold tracking-wider ml-2 opacity-60 font-mono">NOVA BROWSER</span>
                </div>

                {/* Omnibar Simulation */}
                <div className={`w-1/2 max-w-md h-7 rounded-lg flex items-center px-3 gap-2 border text-[11px] ${
                  selectedMode === 'dark' ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                }`}>
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span className="truncate font-mono">
                    {activeTab === 'newtab' ? 'nova://newtab' : activeTab === 'ai' ? 'https://github.com/unitybtw/nova-browser' : 'https://react.dev | https://tailwindcss.com'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedAccent.hex }} />
                  <span className="text-[10px] font-mono opacity-75">v1.0.7</span>
                </div>
              </div>

              {/* Main Content Body */}
              <div className="flex-1 flex overflow-hidden">
                {/* Vertical Sidebar */}
                <div className={`${sidebarStyle === 'vertical' ? 'w-48' : 'w-16'} border-r p-3 flex flex-col justify-between transition-all duration-300 ${
                  selectedMode === 'dark' ? 'bg-[#070b16] border-white/10' : 'bg-slate-100/70 border-slate-200'
                }`}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 px-2 py-1 mb-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md" style={{ backgroundColor: selectedAccent.hex }}>
                        N
                      </div>
                      {sidebarStyle === 'vertical' && <span className="text-xs font-bold">Personal</span>}
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                        activeTab === 'newtab' ? 'bg-white/15 text-white' : 'opacity-60 hover:opacity-100'
                      }`} style={activeTab === 'newtab' ? { borderLeft: `3px solid ${selectedAccent.hex}` } : {}}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedAccent.hex }} />
                        {sidebarStyle === 'vertical' && <span className="truncate">New Tab</span>}
                      </div>

                      <div className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                        activeTab === 'ai' ? 'bg-white/15 text-white' : 'opacity-60 hover:opacity-100'
                      }`} style={activeTab === 'ai' ? { borderLeft: `3px solid ${selectedAccent.hex}` } : {}}>
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                        {sidebarStyle === 'vertical' && <span className="truncate">GitHub - Nova</span>}
                      </div>

                      <div className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                        activeTab === 'split' ? 'bg-white/15 text-white' : 'opacity-60 hover:opacity-100'
                      }`} style={activeTab === 'split' ? { borderLeft: `3px solid ${selectedAccent.hex}` } : {}}>
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        {sidebarStyle === 'vertical' && <span className="truncate">Split Docs</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] opacity-60">
                    {sidebarStyle === 'vertical' ? <span>Workspace: Dev</span> : <span>⌘1</span>}
                  </div>
                </div>

                {/* Main View Area */}
                <div 
                  className="flex-1 relative flex overflow-hidden"
                  style={{ background: selectedWallpaper.gradient }}
                >
                  {activeTab === 'newtab' && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                      <div className="text-4xl font-bold tracking-tight mb-1">12:45</div>
                      <div className="text-xs font-medium opacity-70 mb-6">Good Afternoon, Creator</div>

                      <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 shadow-xl flex items-center gap-3 mb-8">
                        <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: selectedAccent.hex }} />
                        <span className="text-xs opacity-75 font-mono text-left flex-1">Search with Google or enter URL...</span>
                        <div className="px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-md" style={{ backgroundColor: selectedAccent.hex }}>
                          ↵
                        </div>
                      </div>

                      {/* Speed Dials */}
                      <div className="grid grid-cols-4 gap-4 max-w-sm w-full">
                        {['GitHub', 'Supabase', 'Vercel', 'Reddit'].map((name, i) => (
                          <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/15 transition-colors cursor-pointer">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-md" style={{ backgroundColor: selectedAccent.hex }}>
                              {name[0]}
                            </div>
                            <span className="text-[10px] font-medium text-slate-300">{name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'ai' && (
                    <div className="w-full h-full flex">
                      <div className="flex-1 p-6 flex flex-col justify-center items-center text-center opacity-90 border-r border-white/10">
                        <h4 className="text-lg font-bold mb-2">GitHub Repository View</h4>
                        <p className="text-xs opacity-70 max-w-xs mb-4">Live website render powered by Chromium with native MCP agents connected.</p>
                        <div className="px-3 py-1.5 rounded-full text-xs font-mono bg-white/10 border border-white/15">
                          unitybtw/nova-browser
                        </div>
                      </div>
                      
                      {/* AI Sidepanel */}
                      <div className="w-64 bg-slate-950/90 backdrop-blur-xl p-4 flex flex-col justify-between border-l border-white/15">
                        <div>
                          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10">
                            <Sparkles className="w-4 h-4" style={{ color: selectedAccent.hex }} />
                            <span className="text-xs font-bold text-white">Nova AI Assistant</span>
                          </div>
                          <div className="bg-white/5 rounded-xl p-2.5 text-[11px] mb-2 border border-white/10">
                            <p className="font-semibold text-slate-200 mb-1">You:</p>
                            <p className="text-slate-400">Summarize this page</p>
                          </div>
                          <div className="bg-primary/10 rounded-xl p-2.5 text-[11px] border border-primary/20">
                            <p className="font-semibold text-primary mb-1">Nova AI:</p>
                            <p className="text-slate-300 leading-tight">Nova is an open-source, AI-native browser with Zero-Knowledge sync.</p>
                          </div>
                        </div>
                        <div className="h-8 rounded-xl bg-white/10 border border-white/15 flex items-center px-3 text-[10px] text-slate-400 font-mono">
                          Ask something...
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'split' && (
                    <div className="w-full h-full flex divide-x divide-white/20">
                      <div className="w-1/2 p-6 flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-mono px-2 py-1 rounded bg-blue-500/20 text-blue-300 mb-2">Left View: React Docs</span>
                        <h5 className="text-sm font-bold">React 19 Documentation</h5>
                        <p className="text-[11px] opacity-70 mt-1">Concurrent features & Server Components</p>
                      </div>
                      <div className="w-1/2 p-6 flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-mono px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 mb-2">Right View: Tailwind CSS</span>
                        <h5 className="text-sm font-bold">Tailwind CSS v4</h5>
                        <p className="text-[11px] opacity-70 mt-1">Lightning fast engine & CSS variables</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Feature Note Footer */}
            <div className="flex flex-wrap items-center justify-between text-xs text-foreground/60 px-2 pt-1 gap-2">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> E2EE AES-256 GCM
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Instant 1-Click Code Sync
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Web-LLM Local Offline AI
                </span>
              </div>
              <a href="#download" className="font-bold text-primary hover:underline flex items-center gap-1">
                Download & Customize Nova <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
