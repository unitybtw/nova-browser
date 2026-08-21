import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Apple, Monitor, ChevronRight, Bot, LayoutDashboard, Lock } from 'lucide-react';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

export const Hero: React.FC = () => {
  const [os, setOs] = useState<'mac' | 'win'>('mac');
  const [activeTab, setActiveTab] = useState<'ai' | 'newtab' | 'sync'>('ai');

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes('win')) setOs('win');
  }, []);

  return (
    <section className="relative pt-32 pb-20 overflow-hidden top-beam-cyan">
      <div className="absolute inset-0 linear-grid pointer-events-none opacity-40" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Announcement Header */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full card-glass text-xs font-mono text-cyan-400 mb-6 border border-cyan-500/20"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold">NOVA BROWSER 1.0</span>
            <span className="text-white/20">|</span>
            <span className="text-slate-300">Open-Source & AI-Native Browser</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]"
          >
            Built for speed. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-slate-400">
              Powered by intelligence.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16 }}
            className="text-base sm:text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            An AI-native desktop browser with autonomous Model Context Protocol (MCP) agents, zero-knowledge encrypted device pairing, and zero telemetry.
          </motion.p>

          {/* Download CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md sm:max-w-none mx-auto mb-14"
          >
            {os === 'win' ? (
              <a
                href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-Setup.exe"
                className="w-full sm:w-auto bg-white text-black hover:bg-slate-200 px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                <span>Download for Windows (.exe)</span>
              </a>
            ) : (
              <a
                href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-arm64.dmg"
                className="w-full sm:w-auto bg-white text-black hover:bg-slate-200 px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Apple className="w-4 h-4" />
                <span>Download for macOS (.dmg)</span>
              </a>
            )}

            <a
              href="https://github.com/unitybtw/nova-browser"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto card-glass text-slate-200 hover:text-white px-7 py-3.5 rounded-xl font-semibold text-sm transition-all border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <GithubIcon className="w-4 h-4" />
              <span>Star on GitHub</span>
            </a>
          </motion.div>
        </div>

        {/* Real High-Resolution Browser Screenshot Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-6xl mx-auto"
        >
          {/* Switcher Navigation Tabs */}
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
              <span>Autonomous AI & MCP Sidepanel</span>
            </button>

            <button
              onClick={() => setActiveTab('newtab')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'newtab'
                  ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                  : 'card-glass text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-purple-400" />
              <span>Start Page & Speed Dials</span>
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
              <span>Zero-Knowledge 1-Click Sync</span>
            </button>
          </div>

          {/* Genuine Screenshot Container */}
          <div className="rounded-2xl p-1.5 sm:p-2 bg-gradient-to-b from-white/15 via-white/5 to-transparent border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-[16/10] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {activeTab === 'ai' && (
                  <motion.img
                    key="ai-preview"
                    src="/assets/preview.png"
                    alt="Nova Browser Autonomous AI Agent and MCP Sidepanel"
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full object-contain"
                  />
                )}
                {activeTab === 'newtab' && (
                  <motion.img
                    key="newtab-preview"
                    src="/assets/newtab.png"
                    alt="Nova Browser Clean Start Page and Speed Dials"
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full object-contain"
                  />
                )}
                {activeTab === 'sync' && (
                  <motion.img
                    key="sync-preview"
                    src="/assets/sync.png"
                    alt="Nova Browser Zero-Knowledge Device Pairing Code"
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full object-contain"
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

        </motion.div>

      </div>
    </section>
  );
};
