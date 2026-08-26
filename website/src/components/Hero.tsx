import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Cpu,
  MousePointer2,
  Shield,
  Columns,
  Bot,
} from 'lucide-react';

export const Hero: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'agent' | 'split' | 'privacy'>('agent');
  const [typedText, setTypedText] = useState('');
  const fullText =
    'The shift towards local-first AI architecture fundamentally alters the web landscape. Privacy is no longer a feature, but a cryptographic guarantee.';

  useEffect(() => {
    let index = 0;
    setTypedText('');
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 25);
    return () => clearInterval(timer);
  }, [activeTab]);

  return (
    <section className="relative pt-32 md:pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
      {/* Ambient background glows */}
      <div className="ambient-glow-primary -top-20 left-[-10%]" />
      <div className="ambient-glow-primary top-[30%] right-[-10%]" />

      {/* Main Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
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
        The world’s first browser with an embedded autonomous AI agent, a zero-knowledge privacy vault, and native WebGPU processing. Uncompromised speed. Unprecedented control.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="pt-8 flex gap-4 flex-wrap justify-center font-mono text-xs uppercase tracking-wider"
      >
        <a
          href="#download"
          className="px-8 py-4 bg-[#171717] text-[#fcfbf9] font-semibold rounded-lg hover:bg-[#4338ca] transition-colors shadow-lg"
        >
          Download for macOS & Windows
        </a>
        <a
          href="#features"
          className="px-8 py-4 bg-transparent border border-[#e5e5e5] text-[#171717] rounded-lg hover:bg-white transition-colors"
        >
          View Architecture
        </a>
      </motion.div>

      {/* BROWSER MOCKUP CENTERPIECE */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-6xl mx-auto mt-16 text-left"
      >
        {/* Glow behind mockup */}
        <div className="absolute inset-0 bg-[#4338ca] opacity-10 blur-3xl rounded-2xl pointer-events-none" />

        <div className="relative bg-[#0f172a] rounded-2xl overflow-hidden border border-[#1e293b] shadow-2xl flex flex-col min-h-[560px] md:min-h-[640px] z-10">
          {/* Chrome Titlebar */}
          <div className="h-12 bg-[#1e293b] border-b border-[#334155] flex items-center px-4 gap-4 select-none">
            {/* Mac traffic lights */}
            <div className="flex gap-2">
              <span className="mac-btn mac-close" />
              <span className="mac-btn mac-min" />
              <span className="mac-btn mac-max" />
            </div>

            {/* Clickable Tabs */}
            <div className="flex gap-1 ml-4 h-full pt-2">
              {[
                { id: 'agent', label: 'Autonomous Agent', icon: Bot },
                { id: 'split', label: 'Dual Split-View', icon: Columns },
                { id: 'privacy', label: 'Privacy Shield', icon: Shield },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'agent' | 'split' | 'privacy')}
                    className={`px-4 py-2 font-mono text-xs rounded-t-lg flex items-center gap-2 cursor-pointer transition-colors relative ${
                      isActive
                        ? 'bg-[#0f172a] text-slate-100 border-t border-l border-r border-[#334155]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'
                    }`}
                  >
                    {React.createElement(tab.icon, { className: 'w-3.5 h-3.5 text-[#818cf8]' })}
                    <span>{tab.label}</span>
                    {isActive && (
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-[#4338ca] rounded-t-lg" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Omnibox Bar */}
          <div className="h-14 bg-[#0f172a] border-b border-[#1e293b] flex items-center px-4 gap-4 text-slate-400">
            <div className="flex gap-2">
              <ArrowLeft className="w-4 h-4 cursor-pointer hover:text-white" />
              <ArrowRight className="w-4 h-4 cursor-pointer hover:text-white" />
              <RotateCw className="w-4 h-4 cursor-pointer hover:text-white" />
            </div>

            <div className="flex-1 bg-[#1e293b] rounded-lg h-9 px-3 flex items-center justify-between border border-[#334155]">
              <div className="flex items-center gap-2 text-slate-300 font-mono text-xs">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {activeTab === 'agent'
                    ? 'local://agent/analyze-dom'
                    : activeTab === 'split'
                    ? 'dual://docs.rs + github.com'
                    : 'nova://settings/privacy-shield'}
                </span>
              </div>
              <div className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-emerald-500/20">
                0ms CACHED
              </div>
            </div>
          </div>

          {/* Viewport Content */}
          <div className="flex-1 bg-[#0f172a] p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between">
            {activeTab === 'agent' && (
              <div className="relative z-10 w-full max-w-4xl mx-auto h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#4338ca]/20 flex items-center justify-center border border-[#4338ca]/50 text-[#818cf8]">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h3 className="font-mono text-xs font-semibold text-slate-300 tracking-wider uppercase">
                    Llama 3.2 3B Local Node Active
                  </h3>
                </div>

                <div className="bg-[#1e293b]/90 backdrop-blur-md rounded-xl p-6 border border-[#334155] flex-1 font-mono text-xs sm:text-sm text-slate-300 shadow-2xl relative overflow-hidden">
                  {/* Scanning line */}
                  <div className="absolute left-0 w-full h-[2px] bg-[#4338ca] shadow-[0_0_12px_3px_rgba(67,56,202,0.8)] animate-scan" />

                  <p className="text-slate-500 mb-3">// Analyzing DOM structure securely on-device...</p>
                  <div className="space-y-2 text-emerald-400 font-mono text-xs sm:text-sm">
                    <p>&gt; Found 18 semantic tags. Extracted main document payload.</p>
                    <p>&gt; Bypassed tracking pixels (Blocked 4 requests automatically).</p>
                    <p>&gt; Synthesizing article executive summary...</p>
                  </div>

                  <div className="mt-6 p-4 bg-[#0f172a] rounded-lg border border-[#334155] text-indigo-200 leading-relaxed font-mono">
                    <p>{typedText}</p>
                    <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse" />
                  </div>

                  {/* Floating AI Cursor */}
                  <motion.div
                    animate={{ y: [0, -8, 0], x: [0, 6, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    className="absolute bottom-6 right-8 flex items-center gap-1.5 pointer-events-none"
                  >
                    <MousePointer2 className="w-5 h-5 text-[#818cf8] fill-[#818cf8]" />
                    <span className="bg-[#4338ca] text-white text-[10px] px-2 py-0.5 rounded font-mono shadow-lg">
                      Agent Cursor
                    </span>
                  </motion.div>
                </div>
              </div>
            )}

            {activeTab === 'split' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full font-mono text-xs text-slate-300">
                <div className="p-6 rounded-xl bg-[#1e293b]/70 border border-[#334155] flex flex-col justify-between">
                  <div>
                    <span className="text-emerald-400 block mb-2">// FRAME A: DOCUMENTATION</span>
                    <h4 className="font-serif text-lg font-bold text-white mb-2">
                      Local-First Architecture
                    </h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      Zero reliance on remote server execution. WebGPU shaders accelerate inference directly on consumer GPUs.
                    </p>
                  </div>
                  <div className="text-slate-500 text-[11px] pt-4 border-t border-white/5">
                    Synced scroll active
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-[#1e293b]/70 border border-[#334155] flex flex-col justify-between">
                  <div>
                    <span className="text-indigo-400 block mb-2">// FRAME B: LIVE REPOSITORY</span>
                    <h4 className="font-serif text-lg font-bold text-white mb-2">
                      unitybtw/nova-browser
                    </h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      Complete source code open for security audits, forks, and local developer extensions.
                    </p>
                  </div>
                  <div className="text-slate-500 text-[11px] pt-4 border-t border-white/5">
                    Port 3020 connected
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="p-6 sm:p-8 rounded-xl bg-[#1e293b]/70 border border-[#334155] max-w-2xl mx-auto my-auto text-center font-mono">
                <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="font-serif text-2xl font-bold text-white mb-2">
                  Zero-Knowledge Cryptographic Shield
                </h3>
                <p className="text-slate-400 text-xs font-sans max-w-md mx-auto mb-6">
                  All browsing data is encrypted client-side using AES-256-GCM before ever syncing.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>42 Trackers Eradicated in Current Session</span>
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
