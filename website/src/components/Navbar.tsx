import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Download, Sun, Moon, ChevronDown, Apple, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useLang } from '../i18n/LanguageContext';
import { languageList } from '../i18n/translations';

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLang();
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

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark');
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const currentLang = languageList.find(l => l.code === lang)!;

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-3' : 'py-5'}`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="flex items-center justify-between rounded-2xl px-6 py-3 transition-all duration-300"
          style={scrolled ? {
            background: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isDark
              ? '0 4px 24px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset'
              : '0 4px 24px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.8) inset',
          } : { background: 'transparent', boxShadow: 'none' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
              <img src="/browser-assets/nova-icon.png" alt="Nova Browser Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">Nova</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 font-medium text-foreground/80">
            <a href="#features" className="hover:text-primary transition-colors">{t.nav.features}</a>
            <a href="#privacy" className="hover:text-primary transition-colors">{t.nav.privacy}</a>
            <a href="#design" className="hover:text-primary transition-colors">{t.nav.design}</a>
            <a href="https://github.com/unitybtw/nova-browser" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">{t.nav.github}</a>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Switcher */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-foreground/70 hover:text-foreground hover:bg-foreground/8 transition-colors text-sm font-medium"
                aria-label="Change language"
              >
                <span className="text-base">{currentLang.flag}</span>
                <span className="hidden lg:block">{currentLang.name}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${langMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {langMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-44 rounded-2xl shadow-xl border border-border/60 overflow-hidden z-50"
                    style={{
                      background: isDark ? 'rgba(15, 23, 42, 0.97)' : 'rgba(255,255,255,0.97)',
                      backdropFilter: 'blur(16px)',
                    }}
                  >
                    {languageList.map(l => (
                      <button
                        key={l.code}
                        onClick={() => { setLang(l.code); setLangMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10 ${lang === l.code ? 'text-primary bg-primary/5' : 'text-foreground/80'}`}
                      >
                        <span className="text-base">{l.flag}</span>
                        {l.name}
                        {lang === l.code && <span className="ml-auto text-primary text-xs">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-foreground/80 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Download */}
            {os === 'win' ? (
              <a
                href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-Setup.exe"
                className="bg-[#0078D7] hover:bg-[#005A9E] text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                {t.hero.downloadWin}
              </a>
            ) : os === 'mac' ? (
              <a
                href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-arm64.dmg"
                className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <Apple className="w-4 h-4" />
                {t.hero.downloadMac}
              </a>
            ) : (
              <a
                href="https://github.com/unitybtw/nova-browser/releases/latest"
                target="_blank"
                rel="noreferrer"
                className="bg-foreground hover:bg-foreground/90 text-background px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t.nav.download}
              </a>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 text-foreground">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2 text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden absolute top-full left-4 right-4 mt-2 rounded-2xl p-4 flex flex-col gap-3 border border-border/40 shadow-xl"
            style={{
              background: isDark ? 'rgba(15, 23, 42, 0.97)' : 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <a href="#features" className="px-4 py-2 font-medium text-foreground/80" onClick={() => setMobileMenuOpen(false)}>{t.nav.features}</a>
            <a href="#privacy" className="px-4 py-2 font-medium text-foreground/80" onClick={() => setMobileMenuOpen(false)}>{t.nav.privacy}</a>
            <a href="#design" className="px-4 py-2 font-medium text-foreground/80" onClick={() => setMobileMenuOpen(false)}>{t.nav.design}</a>

            {/* Mobile Language Switcher */}
            <div className="border-t border-border/40 pt-3">
              <p className="text-xs text-foreground/40 px-4 mb-2 uppercase tracking-wider font-medium">Language</p>
              <div className="grid grid-cols-3 gap-2">
                {languageList.map(l => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setMobileMenuOpen(false); }}
                    className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-xs font-medium transition-colors ${lang === l.code ? 'bg-primary/10 text-primary' : 'text-foreground/60 hover:bg-foreground/5'}`}
                  >
                    <span className="text-xl">{l.flag}</span>
                    {l.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {os === 'win' ? (
              <a
                href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-Setup.exe"
                className="bg-[#0078D7] hover:bg-[#005A9E] text-white px-4 py-3 rounded-xl font-medium w-full mt-2 text-center transition-colors flex items-center justify-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                {t.hero.downloadWin}
              </a>
            ) : os === 'mac' ? (
              <a
                href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-arm64.dmg"
                className="bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl font-medium w-full mt-2 text-center transition-colors flex items-center justify-center gap-2"
              >
                <Apple className="w-4 h-4" />
                {t.hero.downloadMac}
              </a>
            ) : (
              <a
                href="https://github.com/unitybtw/nova-browser/releases/latest"
                target="_blank"
                rel="noreferrer"
                className="bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl font-medium w-full mt-2 text-center transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t.nav.download}
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};
