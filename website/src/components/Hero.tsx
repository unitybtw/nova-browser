import { motion } from 'framer-motion';
import { Download, ChevronRight, Zap, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useEffect, useState } from 'react';

export const Hero = () => {
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (theme === 'dark') setIsDark(true);
    else if (theme === 'light') setIsDark(false);
    else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

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
            <span>Nova Browser 1.0 is now available</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-tight"
          >
            The internet, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              reimagined for you.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-foreground/70 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            A productivity-first browser with built-in AI, native ad-blocking, and seamless split-screen workspaces. Fast, beautiful, and completely open source.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col items-center justify-center gap-4"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="https://github.com/unitybtw/nova-browser/releases" target="_blank" rel="noreferrer" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 group">
                <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                Download for Mac
              </a>
              <a href="https://github.com/unitybtw/nova-browser/releases" target="_blank" rel="noreferrer" className="w-full sm:w-auto bg-[#0078D7] hover:bg-[#005A9E] text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 group">
                <Monitor className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                Download for Windows
              </a>
            </div>
            <a href="https://github.com/unitybtw/nova-browser" target="_blank" rel="noreferrer" className="w-full sm:w-auto glass hover:bg-foreground/10 text-foreground px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 group">
              View Source
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
            <div className="w-full relative rounded-2xl overflow-hidden shadow-inner">
              <img src={isDark ? "/browser-assets/preview-dark.png" : "/browser-assets/preview-light.png"} alt="Nova Browser Screenshot" className="w-full h-auto rounded-2xl object-cover block" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
