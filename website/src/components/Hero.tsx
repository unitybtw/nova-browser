import { motion } from 'framer-motion';
import { Download, ChevronRight, Zap, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useEffect, useState } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { InteractiveMockup } from './InteractiveMockup';

export const Hero = () => {
  const { theme } = useTheme();
  const { t } = useLang();
  useEffect(() => {
    // Theme logic can be simplified or removed if Hero doesn't need to track isDark directly anymore.
    // The ThemeProvider already handles the 'dark' class on the HTML element.
  }, [theme]);

  const [os, setOs] = useState<'mac' | 'win' | 'other'>('mac');

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) {
      setOs('win');
    } else if (userAgent.includes('mac')) {
      setOs('mac');
    }
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 text-primary font-medium text-sm mb-8"
          >
            <Zap className="w-4 h-4 text-accent" />
            <span>{t.hero.badge}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-tight"
          >
            {t.hero.headline1} <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              {t.hero.headline2}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-foreground/70 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            {t.hero.sub}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col items-center justify-center gap-4 w-full sm:w-auto"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              {os === 'win' ? (
                <a href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-Setup.exe" className="w-full sm:w-auto bg-[#0078D7] hover:bg-[#005A9E] text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 group">
                  <Monitor className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                  {t.hero.downloadWin}
                </a>
              ) : os === 'mac' ? (
                <a href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-arm64.dmg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 group">
                  <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                  {t.hero.downloadMac}
                </a>
              ) : (
                <a href="https://github.com/unitybtw/nova-browser/releases/latest" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 group">
                  <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                  {t.nav.download}
                </a>
              )}
            </div>
            <a href="https://github.com/unitybtw/nova-browser" target="_blank" rel="noreferrer" className="w-full sm:w-auto glass hover:bg-foreground/10 text-foreground px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 group">

              {t.hero.viewSource}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        </div>

        {/* Browser Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 max-w-5xl mx-auto"
        >
          <div className="rounded-3xl glass p-2 shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden transform perspective-1000 rotate-x-2 hover:rotate-x-0 transition-transform duration-700">
            <InteractiveMockup />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
