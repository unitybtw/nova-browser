import { BrowserWindow } from './BrowserWindow';
import { Code2, Paintbrush } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export const SplitMockup = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <BrowserWindow
      url="https://react.dev | https://tailwindcss.com"
      tabs={[
        { title: 'React 19 Docs', active: true },
        { title: 'Tailwind CSS v4' }
      ]}
    >
      <div className="flex h-full w-full divide-x select-none transition-colors">
        {/* Left Pane: React Docs */}
        <div className={`flex-1 p-5 flex flex-col justify-between overflow-hidden ${
          isDark ? 'bg-[#0a0f1d] text-white' : 'bg-white text-slate-800'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold">React 19 API Reference</span>
            </div>
            <div className={`p-3 rounded-xl font-mono text-[11px] space-y-1 ${
              isDark ? 'bg-[#050811] text-cyan-300 border border-white/10' : 'bg-slate-50 text-cyan-700 border border-slate-200'
            }`}>
              <p className="text-white/40">// Server Component Action</p>
              <p><span className="text-purple-500 font-semibold">export async function</span> <span className="text-blue-500">saveData</span>() &#123;</p>
              <p className="pl-4"><span className="text-purple-500 font-semibold">await</span> db.sync();</p>
              <p>&#125;</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-500 font-semibold pt-2">
            <span>Left Viewport: 50%</span>
          </div>
        </div>

        {/* Right Pane: Tailwind CSS Docs */}
        <div className={`flex-1 p-5 flex flex-col justify-between overflow-hidden ${
          isDark ? 'bg-[#0b1120] text-white' : 'bg-slate-50/70 text-slate-800'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Paintbrush className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold">Tailwind Oxide Engine</span>
            </div>
            <div className={`p-3 rounded-xl font-mono text-[11px] space-y-1 ${
              isDark ? 'bg-[#060a14] text-sky-300 border border-white/10' : 'bg-white text-sky-700 border border-slate-200 shadow-xs'
            }`}>
              <p className="text-white/40">/* Direct utility compilation */</p>
              <p><span className="text-purple-500 font-semibold">@theme</span> &#123;</p>
              <p className="pl-4"><span className="text-blue-500">--color-nova</span>: <span className="text-emerald-500">#6366f1</span>;</p>
              <p>&#125;</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-sky-500 font-semibold pt-2">
            <span>Right Viewport: 50%</span>
          </div>
        </div>
      </div>
    </BrowserWindow>
  );
};
