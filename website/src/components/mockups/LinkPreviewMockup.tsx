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
            <span className="w-5 h-5 rounded bg-orange-500 text-white font-bold text-[10px] flex items-center justify-center">Y</span>
            <span className="text-xs font-bold">Hacker News Daily Digest</span>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <p className="text-xs font-medium">1. Show HN: Nova Browser — Next generation local AI web browser</p>
            <div className="flex items-center gap-2 text-[11px] text-blue-500 font-semibold underline cursor-pointer">
              <span>https://github.com/unitybtw/nova-browser</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Hovering Floating Link Preview Tooltip */}
        <div className={`absolute bottom-6 right-6 w-80 rounded-2xl border shadow-2xl p-4 transition-all duration-300 ${
          isDark 
            ? 'bg-[#0f1422]/95 border-blue-500/30 text-white shadow-blue-500/10' 
            : 'bg-white/95 border-blue-200 text-slate-800 shadow-xl'
        }`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-bold">Live Link Preview</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>Safe 100%</span>
            </div>
          </div>

          <div className={`h-24 rounded-lg overflow-hidden border mb-2 flex items-center justify-center font-mono text-[10px] ${
            isDark ? 'bg-[#080d1a] border-white/10 text-white/50' : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}>
            <div className="text-center">
              <Sparkles className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <span>unitybtw / nova-browser (Preview)</span>
            </div>
          </div>

          <p className={`text-[11px] ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
            Zero-telemetry open source browser with local LLMs and WebGPU acceleration.
          </p>
        </div>
      </div>
    </BrowserWindow>
  );
};
