import { BrowserWindow } from './BrowserWindow';
import { Folder, ChevronDown, ChevronRight, Volume2, Moon, Plus, Layers, Globe } from 'lucide-react';

export const TabsMockup = () => {
  return (
    <BrowserWindow 
      url="https://nextjs.org/docs/app"
      tabs={[
        { title: 'Next.js App Router', active: true }
      ]}
      isShieldActive={true}
    >
      <div className="w-full h-full flex overflow-hidden bg-[#070b13]">
        {/* Left: Vertical Sidebar */}
        <div className="w-[230px] bg-[#090d18] border-r border-white/5 flex flex-col h-full shrink-0 select-none">
          {/* Workspaces Selector */}
          <div className="p-2.5 border-b border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-white/40 font-semibold uppercase tracking-wider px-1">
              <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-blue-400" /> Workspaces</span>
              <Plus className="w-3 h-3 hover:text-white cursor-pointer" />
            </div>
            <div className="flex items-center gap-1.5">
              <button className="flex-1 py-1 px-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="truncate">Dev Project</span>
              </button>
              <button className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-[11px] font-medium">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              </button>
              <button className="py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-[11px] font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              </button>
            </div>
          </div>

          {/* Tab Tree & Folders */}
          <div className="flex-1 p-2 space-y-1 overflow-hidden text-xs">
            {/* Folder 1: Expanded */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 px-2 py-1 text-white/60 hover:text-white text-[11px] font-medium cursor-pointer rounded-md hover:bg-white/5">
                <ChevronDown className="w-3 h-3 text-white/40" />
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>Frontend Stack</span>
                <span className="ml-auto text-[9px] px-1 rounded bg-white/10 text-white/50">2</span>
              </div>

              {/* Nested Tabs */}
              <div className="pl-4 space-y-0.5 border-l border-white/5 ml-3">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white font-medium text-[11px] shadow-sm">
                  <div className="w-3.5 h-3.5 rounded bg-black flex items-center justify-center text-[8px] font-bold text-white">N</div>
                  <span className="truncate">Next.js App Router</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 text-[11px] cursor-pointer">
                  <div className="w-3.5 h-3.5 rounded bg-cyan-500/20 flex items-center justify-center text-[8px] text-cyan-400 font-bold">T</div>
                  <span className="truncate">Tailwind CSS v4</span>
                </div>
              </div>
            </div>

            {/* Folder 2: Collapsed */}
            <div className="flex items-center gap-1.5 px-2 py-1 text-white/60 hover:text-white text-[11px] font-medium cursor-pointer rounded-md hover:bg-white/5">
              <ChevronRight className="w-3 h-3 text-white/40" />
              <Folder className="w-3.5 h-3.5 text-indigo-400" />
              <span>Research & Papers</span>
              <span className="ml-auto text-[9px] px-1 rounded bg-white/10 text-white/50">4</span>
            </div>

            {/* Standalone Active Audio Tab */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/5 text-[11px] cursor-pointer">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate flex-1">Spotify Web</span>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            </div>
          </div>

          {/* Tab Hibernation Memory Badge */}
          <div className="p-2.5 border-t border-white/5 bg-white/[0.02] flex items-center gap-2 text-[10px] text-white/50">
            <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">3 Tabs Hibernated (420 MB Saved)</span>
          </div>
        </div>

        {/* Right: Web Content View */}
        <div className="flex-1 p-6 space-y-4 overflow-hidden select-none bg-[#090d16]/50">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="space-y-1">
              <div className="h-5 w-48 bg-white/20 rounded" />
              <div className="h-3 w-32 bg-white/10 rounded" />
            </div>
            <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/60">
              v15.2.0 • Stable
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-3 w-full bg-white/10 rounded" />
            <div className="h-3 w-5/6 bg-white/10 rounded" />
            <div className="h-3 w-4/6 bg-white/10 rounded" />
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 font-mono text-[11px] text-cyan-300/80">
            <p className="text-white/40">// app/page.tsx</p>
            <p><span className="text-purple-400">export default function</span> Page() &#123;</p>
            <p className="pl-4"><span className="text-purple-400">return</span> &lt;NovaWorkspace active=&#123;<span className="text-emerald-400">true</span>&#125; /&gt;;</p>
            <p>&#125;</p>
          </div>
        </div>
      </div>
    </BrowserWindow>
  );
};
