import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronRight, Zap, Monitor, Apple, LayoutDashboard, Bot, Lock, Code2, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { InteractiveMockup } from './InteractiveMockup';

export const Hero = () => {
  const { t } = useLang();
  const [os, setOs] = useState<'mac' | 'win' | 'other'>('mac');
  const [activeHeroView, setActiveHeroView] = useState<'newtab' | 'ai' | 'sync' | 'interactive'>('ai');

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) {
      setOs('win');
    } else if (userAgent.includes('mac')) {
      setOs('mac');
    }
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-28 pb-20 overflow-hidden">
      {/* Background Orbs (Hardware-Accelerated Glow) */}
      <div className="absolute top-1/4 left-1/4 w-80 md:w-96 h-80 md:h-96 bg-primary/20 rounded-full filter blur-3xl opacity-60 pointer-events-none animate-glow-1 transform-gpu will-change-transform" />
      <div className="absolute top-1/3 right-1/4 w-80 md:w-96 h-80 md:h-96 bg-accent/20 rounded-full filter blur-3xl opacity-60 pointer-events-none animate-glow-2 transform-gpu will-change-transform" />
      <div className="absolute bottom-1/4 left-1/2 w-80 md:w-96 h-80 md:h-96 bg-secondary/20 rounded-full filter blur-3xl opacity-50 pointer-events-none animate-glow-3 transform-gpu will-change-transform" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 text-primary font-medium text-sm mb-8 shadow-lg shadow-primary/10"
          >
            <Zap className="w-4 h-4 text-accent animate-pulse" />
            <span>{t.hero.badge}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-tight"
          >
            {t.hero.headline1} <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-primary to-accent">
              {t.hero.headline2}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-foreground/75 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            {t.hero.sub}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md sm:max-w-none mx-auto"
          >
            {os === 'win' ? (
              <a 
                href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-Setup.exe" 
                className="w-full sm:w-auto bg-[#0078D7] hover:bg-[#005A9E] text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Monitor className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                {t.hero.downloadWin}
              </a>
            ) : os === 'mac' ? (
              <a 
                href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-arm64.dmg" 
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Apple className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                {t.hero.downloadMac}
              </a>
            ) : (
              <a 
                href="https://github.com/unitybtw/nova-browser/releases/latest" 
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                {t.nav.download}
              </a>
            )}
            <a 
              href="https://github.com/unitybtw/nova-browser" 
              target="_blank" 
              rel="noreferrer" 
              className="w-full sm:w-auto glass hover:bg-foreground/10 text-foreground px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Code2 className="w-5 h-5 text-primary" />
              {t.hero.viewSource}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        </div>

        {/* Multi-View Screenshot & Interactive Sandbox Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-14 w-full max-w-6xl mx-auto block px-2 sm:px-0"
        >
          {/* Top Switcher Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setActiveHeroView('ai')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeHeroView === 'ai'
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105 border border-white/20'
                  : 'glass text-foreground/70 hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <Bot className="w-4 h-4 text-cyan-300" />
              <span>AI Assistant & MCP Sidepanel</span>
            </button>

            <button
              onClick={() => setActiveHeroView('newtab')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeHeroView === 'newtab'
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105 border border-white/20'
                  : 'glass text-foreground/70 hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-purple-300" />
              <span>Start Page & Speed Dials</span>
            </button>

            <button
              onClick={() => setActiveHeroView('sync')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeHeroView === 'sync'
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105 border border-white/20'
                  : 'glass text-foreground/70 hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <Lock className="w-4 h-4 text-emerald-300" />
              <span>Zero-Knowledge 1-Click Sync</span>
            </button>

            <button
              onClick={() => setActiveHeroView('interactive')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeHeroView === 'interactive'
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105 border border-white/20'
                  : 'glass text-foreground/70 hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <Globe className="w-4 h-4 text-amber-300" />
              <span>Interactive Live Sandbox</span>
            </button>
          </div>

          {/* Browser Display Frame */}
          <div className="rounded-3xl glass p-2 sm:p-3 shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden transition-all duration-300">
            {activeHeroView === 'interactive' ? (
              <div className="h-[380px] sm:h-[480px] md:h-[600px] lg:h-[680px] rounded-2xl overflow-hidden">
                <InteractiveMockup bg="nebula" feature="default" />
              </div>
            ) : (
              <div className="relative w-full rounded-2xl overflow-hidden shadow-inner bg-black flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {activeHeroView === 'ai' && (
                    <motion.img
                      key="preview"
                      src="/assets/preview.png"
                      alt="Nova Browser AI Assistant and MCP Agent live preview"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-auto object-cover rounded-2xl"
                    />
                  )}
                  {activeHeroView === 'newtab' && (
                    <motion.img
                      key="newtab"
                      src="/assets/newtab.png"
                      alt="Nova Browser Clean Start Page and Widget Dashboard"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-auto object-cover rounded-2xl"
                    />
                  )}
                  {activeHeroView === 'sync' && (
                    <motion.img
                      key="sync"
                      src="/assets/sync.png"
                      alt="Nova Browser Zero-Knowledge Device Sync"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-auto object-cover rounded-2xl"
                    />
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
