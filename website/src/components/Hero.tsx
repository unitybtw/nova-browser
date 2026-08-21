import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Monitor, Apple, LayoutDashboard, Bot, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLang } from '../i18n/LanguageContext';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

export const Hero = () => {
  const { lang } = useLang();
  const isTr = lang === 'tr';
  const [os, setOs] = useState<'mac' | 'win' | 'other'>('mac');
  const [activeTab, setActiveTab] = useState<'ai' | 'newtab' | 'sync'>('ai');

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) {
      setOs('win');
    } else if (userAgent.includes('mac')) {
      setOs('mac');
    }
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-32 pb-20 overflow-hidden bg-background glow-top-beam">
      {/* Linear subtle grid background */}
      <div className="absolute inset-0 linear-grid pointer-events-none opacity-40" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Announcement Badge */}
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full linear-card text-xs font-medium text-foreground/80 mb-8 border border-white/10 hover:border-white/20 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-cyan-400 font-bold">NOVA 1.0</span>
            <span className="text-foreground/30">|</span>
            <span>{isTr ? 'Açık Kaynak & Otonom AI Tarayıcısı' : 'Open-Source & AI-Native Browser'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-foreground/40" />
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.1] text-balance"
          >
            {isTr ? 'Hız için inşa edildi.' : 'Built for speed.'} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
              {isTr ? 'Yapay zeka ile güçlendirildi.' : 'Powered by intelligence.'}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16 }}
            className="text-base sm:text-lg md:text-xl text-foreground/65 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            {isTr
              ? 'Otonom MCP AI ajanları, sıfır-bilgi şifreli cihaz eşleme ve sıfır telemetri gizliliğine sahip yeni nesil masaüstü web tarayıcısı.'
              : 'The desktop browser with autonomous MCP AI agents, zero-knowledge encrypted device sync, and hardware-accelerated privacy.'}
          </motion.p>

          {/* CTA Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md sm:max-w-none mx-auto mb-16"
          >
            {os === 'win' ? (
              <a
                href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-Setup.exe"
                className="w-full sm:w-auto bg-white text-black hover:bg-slate-200 px-7 py-3.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                <span>{isTr ? 'Windows İçin İndir (64-bit)' : 'Download for Windows (.exe)'}</span>
              </a>
            ) : (
              <a
                href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-arm64.dmg"
                className="w-full sm:w-auto bg-white text-black hover:bg-slate-200 px-7 py-3.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Apple className="w-4 h-4" />
                <span>{isTr ? 'macOS İçin İndir (Apple Silicon)' : 'Download for macOS (.dmg)'}</span>
              </a>
            )}

            <a
              href="https://github.com/unitybtw/nova-browser"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto linear-card text-foreground/90 hover:text-white px-7 py-3.5 rounded-xl font-semibold text-sm transition-all border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <GithubIcon className="w-4 h-4" />
              <span>{isTr ? 'GitHub Kaynak Kodu' : 'Star on GitHub'}</span>
            </a>
          </motion.div>
        </div>

        {/* High-Resolution Screenshot Vitrini with Switcher Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-6xl mx-auto"
        >
          {/* Switcher Navigation Pill */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                  : 'linear-card text-foreground/60 hover:text-foreground border border-white/5'
              }`}
            >
              <Bot className="w-4 h-4 text-cyan-500" />
              <span>{isTr ? '🤖 Otonom AI & MCP Yan Paneli' : 'Autonomous AI & MCP Agent'}</span>
            </button>

            <button
              onClick={() => setActiveTab('newtab')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'newtab'
                  ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                  : 'linear-card text-foreground/60 hover:text-foreground border border-white/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-purple-500" />
              <span>{isTr ? '✨ Başlangıç Paneli & Görevler' : 'Start Page & Speed Dials'}</span>
            </button>

            <button
              onClick={() => setActiveTab('sync')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'sync'
                  ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                  : 'linear-card text-foreground/60 hover:text-foreground border border-white/5'
              }`}
            >
              <Lock className="w-4 h-4 text-emerald-500" />
              <span>{isTr ? '🔒 1-Tık Sıfır-Bilgi Eşleme' : 'Zero-Knowledge 1-Click Sync'}</span>
            </button>
          </div>

          {/* Screenshot Container Frame */}
          <div className="rounded-2xl p-1.5 sm:p-2 bg-gradient-to-b from-white/15 via-white/5 to-transparent border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden">
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
