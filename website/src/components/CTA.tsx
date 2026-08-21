import { motion } from 'framer-motion';
import { Monitor, Apple, Sparkles } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';
import { useEffect, useState } from 'react';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

export const CTA = () => {
  const { lang } = useLang();
  const isTr = lang === 'tr';
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
    <section id="download" className="py-24 relative overflow-hidden bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="linear-card rounded-3xl p-10 md:p-16 text-center relative overflow-hidden border border-white/15 shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
        >
          {/* Subtle top light reflection */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gradient-to-b from-cyan-500/10 to-transparent blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cyan-400 mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isTr ? 'ÜCRETSİZ & AÇIK KAYNAK' : 'FREE & OPEN SOURCE'}</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4 leading-tight">
              {isTr ? 'Geleceğin Tarayıcısını Şimdi Deneyimleyin.' : 'Experience the Future of Web Browsing.'}
            </h2>

            <p className="text-base sm:text-lg text-foreground/70 mb-10 max-w-xl mx-auto leading-relaxed">
              {isTr 
                ? 'Hesap veya kredi kartı gerekmez. macOS ve Windows için hemen indirin ve otonom yapay zeka hızına geçin.'
                : 'No account or credit card required. Download for macOS or Windows and experience autonomous AI-native browsing.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full">
              {os === 'win' ? (
                <a
                  href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-Setup.exe"
                  className="w-full sm:w-auto bg-white text-black hover:bg-slate-200 px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Monitor className="w-4 h-4" />
                  <span>{isTr ? 'Windows İçin İndir (.exe)' : 'Download for Windows'}</span>
                </a>
              ) : (
                <a
                  href="https://github.com/unitybtw/nova-browser/releases/latest/download/Nova-Browser-arm64.dmg"
                  className="w-full sm:w-auto bg-white text-black hover:bg-slate-200 px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Apple className="w-4 h-4" />
                  <span>{isTr ? 'macOS İçin İndir (.dmg)' : 'Download for macOS'}</span>
                </a>
              )}

              <a
                href="https://github.com/unitybtw/nova-browser"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto linear-card hover:bg-white/10 text-foreground px-8 py-3.5 rounded-xl font-semibold text-sm transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <GithubIcon className="w-4 h-4" />
                <span>{isTr ? 'GitHub\'da İncele' : 'Star on GitHub'}</span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
