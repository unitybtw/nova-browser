import { BrowserWindow } from './BrowserWindow';
import { Folder, Volume2, Globe } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export const TabsMockup = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <BrowserWindow
      url="https://react.dev"
      tabs={[
        { title: 'React 19 Docs', active: true },
        { title: 'Tailwind CSS v4' },
        { title: 'Spotify Web', isMuted: false }
      ]}
    >
      <div className="flex h-full w-full select-none">
        {/* Vertical Tabs Sidebar */}
        <div className={`w-56 border-r flex flex-col p-3 flex-shrink-0 transition-colors ${
          isDark ? 'bg-[#0a0e1a] border-white/10 text-white' : 'bg-slate-100/80 border-slate-200 text-slate-800'
        }`}>
          {/* Workspace Switcher */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
              isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              Personal
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Work</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Research</span>
          </div>

          {/* Folder Group */}
          <div className="mb-2">
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold mb-1 px-1.5 py-1 rounded ${
              isDark ? 'text-blue-400 bg-blue-500/10' : 'text-blue-700 bg-blue-50'
            }`}>
              <Folder className="w-3.5 h-3.5" />
              <span>Frontend Stack</span>
            </div>
            <div className="pl-3 space-y-1">
              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium border ${
                isDark ? 'bg-white/10 text-white border-white/15' : 'bg-white text-slate-900 border-slate-300 shadow-xs'
              }`}>
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="truncate flex-1">React 19 Docs</span>
              </div>
              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                isDark ? 'text-white/60 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-200/60'
              }`}>
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="truncate flex-1">Tailwind CSS v4</span>
              </div>
            </div>
          </div>

          {/* Other Tabs */}
          <div className="space-y-1 mt-2">
            <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs ${
              isDark ? 'text-white/70 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-200/60'
            }`}>
              <div className="flex items-center gap-2 truncate">
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                <span className="truncate">Spotify Web</span>
              </div>
              <Volume2 className="w-3 h-3 text-emerald-500 animate-pulse" />
            </div>
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
              isDark ? 'text-white/40' : 'text-slate-400'
            }`}>
              <Globe className="w-3.5 h-3.5" />
              <span className="truncate">ArXiv AI Papers</span>
            </div>
          </div>
        </div>

        {/* Web Content Preview */}
        <div className={`flex-1 p-6 overflow-hidden select-none transition-colors ${
          isDark ? 'bg-[#0f1420] text-white' : 'bg-white text-slate-900'
        }`}>
          <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">⚛️</div>
            <div>
              <h2 className="text-base font-bold">React 19 Documentation</h2>
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-400'}`}>Concurrent Compiler Engine</p>
            </div>
          </div>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
            Organize complex multi-project workflows with native vertical tab grouping, custom workspaces, and low-latency tab hibernation.
          </p>
        </div>
      </div>
    </BrowserWindow>
  );
};
