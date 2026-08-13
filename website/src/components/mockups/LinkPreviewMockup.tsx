import { motion } from 'framer-motion';
import { BrowserWindow } from './BrowserWindow';
import { ExternalLink, ShieldCheck, Sparkles, Globe } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export const LinkPreviewMockup = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <BrowserWindow
      url="https://news.ycombinator.com"
      tabs={[
        { title: 'Hacker News', active: true },
        { title: 'New Tab' }
      ]}
    >
      <div className={`flex flex-col h-full p-6 select-none relative transition-colors ${
        isDark ? 'bg-[#060a12] text-white' : 'bg-slate-50 text-slate-800'
      }`}>
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-orange-500 text-white font-bold text-[10px] flex items-center justify-center shadow-sm">Y</span>
            <span className="text-xs font-bold">Hacker News Daily Digest</span>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 relative overflow-hidden ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <p className="text-xs font-medium">1. Show HN: Nova Browser — Next generation local AI web browser</p>
            <div className="flex items-center gap-2 text-[11px] text-blue-500 font-semibold underline cursor-pointer">
              <span>https://github.com/unitybtw/nova-browser</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Hovering Floating Link Preview Tooltip with Smooth Float Motion */}
        <motion.div 
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute bottom-6 right-6 w-80 rounded-2xl border shadow-2xl p-4 transition-colors z-20 ${
            isDark 
              ? 'bg-[#0f1422]/95 border-blue-500/40 text-white shadow-[0_10px_30px_rgba(59,130,246,0.15)]' 
              : 'bg-white/95 border-blue-300 text-slate-800 shadow-xl'
          }`}
        >
          <div className={`flex items-center justify-between pb-2 mb-2 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-bold">Live Sandbox Preview</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>Safe 100% Verified</span>
            </div>
          </div>

          <div className={`h-24 rounded-lg overflow-hidden border mb-2 flex items-center justify-center font-mono text-[10px] relative ${
            isDark ? 'bg-[#080d1a] border-white/10 text-white/70' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            {/* Animated Laser Scanline Effect */}
            <motion.div 
              animate={{ y: ['-100%', '200%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
              className="absolute left-0 right-0 h-4 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent pointer-events-none"
            />
            <div className="text-center relative z-10">
              <Sparkles className="w-4 h-4 text-blue-500 mx-auto mb-1 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="font-semibold">unitybtw / nova-browser</span>
              <p className="text-[9px] opacity-50 mt-0.5">TLS 1.3 • AES-256 Encrypted</p>
            </div>
          </div>

          <p className={`text-[11px] leading-relaxed ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
            Zero-telemetry open source browser with local LLMs and WebGPU acceleration.
          </p>
        </motion.div>
      </div>
    </BrowserWindow>
  );
};
