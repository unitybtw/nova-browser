import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Apple, Monitor, ChevronRight } from 'lucide-react';
import { LiveAnimatedBrowser } from './LiveAnimatedBrowser';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

export const Hero: React.FC = () => {
  const [os, setOs] = useState<'mac' | 'win'>('mac');

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

        {/* Live Animated Authentic Browser Component */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <LiveAnimatedBrowser />
        </motion.div>

      </div>
    </section>
  );
};
