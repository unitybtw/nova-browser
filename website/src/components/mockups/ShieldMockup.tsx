import { BrowserWindow } from './BrowserWindow';
import { ShieldCheck, EyeOff, Zap, Activity } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export const ShieldMockup = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <BrowserWindow
      url="https://techinsider.io/ai-revolution"
      tabs={[
        { title: 'TechInsider - AI Revolution', active: true },
        { title: 'New Tab' }
      ]}
      isShieldActive={true}
    >
      <div className={`flex flex-col h-full p-6 overflow-hidden select-none transition-colors ${
        isDark ? 'bg-[#070b13] text-white' : 'bg-slate-50 text-slate-800'
      }`}>
        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className={`p-3 rounded-xl border flex flex-col gap-1 transition-colors ${
            isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200 shadow-xs'
          }`}>
            <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Trackers Blocked</span>
            </div>
            <div className="text-xl font-black text-emerald-500">1,482</div>
          </div>

          <div className={`p-3 rounded-xl border flex flex-col gap-1 transition-colors ${
            isDark ? 'bg-blue-950/20 border-blue-500/30' : 'bg-blue-50 border-blue-200 shadow-xs'
          }`}>
            <div className="flex items-center gap-1.5 text-blue-500 text-[10px] font-bold">
              <EyeOff className="w-3.5 h-3.5" />
              <span>Ads Blocked</span>
            </div>
            <div className="text-xl font-black text-blue-500">42</div>
          </div>

          <div className={`p-3 rounded-xl border flex flex-col gap-1 transition-colors ${
            isDark ? 'bg-purple-950/20 border-purple-500/30' : 'bg-purple-50 border-purple-200 shadow-xs'
          }`}>
            <div className="flex items-center gap-1.5 text-purple-500 text-[10px] font-bold">
              <Activity className="w-3.5 h-3.5" />
              <span>Data Saved</span>
            </div>
            <div className="text-xl font-black text-purple-500">64 MB</div>
          </div>

          <div className={`p-3 rounded-xl border flex flex-col gap-1 transition-colors ${
            isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200 shadow-xs'
          }`}>
            <div className="flex items-center gap-1.5 text-amber-500 text-[10px] font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>Speed Boost</span>
            </div>
            <div className="text-xl font-black text-amber-500">+340%</div>
          </div>
        </div>

        {/* Blocked Ad Banner Placeholder */}
        <div className={`w-full py-3.5 px-4 rounded-xl border border-dashed flex items-center justify-center gap-2.5 mb-5 ${
          isDark 
            ? 'border-emerald-500/40 bg-emerald-950/10 text-emerald-400' 
            : 'border-emerald-500/50 bg-emerald-50 text-emerald-700'
        }`}>
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-semibold">
            Targeted Ad & Fingerprinting Script Blocked by Nova Privacy Shield
          </span>
        </div>

        {/* Article Body */}
        <div className="space-y-3 flex-1 overflow-hidden">
          <h2 className="text-lg font-bold tracking-tight">
            How Zero-Telemetry Browsers Prevent Surveillance Capitalism
          </h2>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
            Unlike conventional browsers that monetize your behavioral identity, Nova strips third-party cookies, fingerprint hashes, and ad beacons before any HTTP socket connection is established.
          </p>
        </div>
      </div>
    </BrowserWindow>
  );
};
