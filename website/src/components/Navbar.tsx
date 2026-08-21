import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, Apple, Monitor, Sparkles } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';
import { languageList } from '../i18n/translations';

const GithubIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const { lang, setLang } = useLang();
  const isTr = lang === 'tr';
  const langRef = useRef<HTMLDivElement>(null);

  const [os, setOs] = useState<'mac' | 'win' | 'other'>('mac');

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) {
      setOs('win');
    } else if (userAgent.includes('mac')) {
      setOs('mac');
    } else {
      setOs('other');
    }
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close lang menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentLang = languageList.find(l => l.code === lang) || languageList[0];

  return (
    <motion.header
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-2.5' : 'py-4'}`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between rounded-2xl px-5 py-2.5 transition-all duration-300 border ${
            scrolled
              ? 'bg-[#08090c]/90 border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl'
              : 'bg-transparent border-transparent'
          }`}
        >
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
              <img src="/browser-assets/nova-icon.png" alt="Nova Browser" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-white font-mono">NOVA</span>
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v1.0.7
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <a href="#ai-agent" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isTr ? 'Otonom AI' : 'AI Agent'}</span>
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              {isTr ? 'Özellikler' : 'Features'}
            </a>
            <a href="#theme-studio" className="hover:text-white transition-colors">
              {isTr ? 'Tema Stüdyosu' : 'Theme Studio'}
            </a>
            <a href="#sync" className="hover:text-white transition-colors">
              {isTr ? 'Sıfır-Bilgi Eşleme' : 'Sync'}
            </a>
            <a href="https://github.com/unitybtw/nova-browser" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
              <GithubIcon className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </nav>

          {/* Right Action Bar */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Dropdown */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 border border-white/5 transition-colors cursor-pointer"
                aria-label="Language selector"
              >
                <span>{currentLang.flag}</span>
                <span className="uppercase text-[11px] font-mono">{currentLang.code}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {langMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-36 rounded-xl bg-[#0d1117] border border-white/10 shadow-2xl p-1 z-50"
                  >
                    {languageList.map(l => (
                      <button
                        key={l.code}
                        onClick={() => { setLang(l.code); setLangMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                          lang === l.code ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span>{l.flag}</span>
                        <span>{l.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Direct Download Button */}
            {os === 'win' ? (
              <a
                href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-Setup.exe"
                className="bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)] flex items-center gap-1.5 cursor-pointer"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>{isTr ? 'İndir (.exe)' : 'Download (.exe)'}</span>
              </a>
            ) : (
              <a
                href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-arm64.dmg"
                className="bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)] flex items-center gap-1.5 cursor-pointer"
              >
                <Apple className="w-4 h-4" />
                <span>{isTr ? 'İndir (.dmg)' : 'Download (.dmg)'}</span>
              </a>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden mx-4 mt-2 p-4 rounded-2xl bg-[#090b10] border border-white/10 shadow-2xl flex flex-col gap-3"
          >
            <a href="#ai-agent" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-300 py-1.5">
              {isTr ? '🤖 Otonom AI Ajanı' : 'AI Agent'}
            </a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-300 py-1.5">
              {isTr ? '✨ Özellikler' : 'Features'}
            </a>
            <a href="#theme-studio" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-300 py-1.5">
              {isTr ? '🎨 Tema Stüdyosu' : 'Theme Studio'}
            </a>
            <a href="#sync" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-300 py-1.5">
              {isTr ? '🔒 Sıfır-Bilgi Eşleme' : 'Sync'}
            </a>
            <a href="https://github.com/unitybtw/nova-browser" target="_blank" rel="noreferrer" className="text-sm font-semibold text-slate-300 py-1.5">
              GitHub Repo
            </a>

            <div className="border-t border-white/10 pt-3 mt-1">
              <a
                href="https://github.com/unitybtw/nova-browser/releases/latest"
                className="w-full bg-white text-black py-2.5 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-2"
              >
                <Apple className="w-4 h-4" />
                <span>{isTr ? 'Nova Browser İndir' : 'Download Nova Browser'}</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};
