import { BrowserWindow } from './BrowserWindow';
import { ShieldCheck, Zap, Lock, Activity, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export const ShieldMockup = () => {
  return (
    <BrowserWindow 
      url="https://techinsider.io/future-of-ai"
      tabs={[
        { title: 'Tech News & Reviews', active: true },
        { title: 'Privacy Benchmark 2026', active: false }
      ]}
      isShieldActive={true}
    >
      <div className="w-full h-full relative overflow-hidden bg-[#0a0e1a] p-6 flex flex-col justify-between">
        {/* Background Web Content with Blocked Ads */}
        <div className="w-full max-w-lg space-y-4 opacity-40 select-none">
          <div className="h-6 w-3/4 bg-white/20 rounded-md" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-white/10 rounded" />
            <div className="h-3 w-5/6 bg-white/10 rounded" />
            <div className="h-3 w-4/6 bg-white/10 rounded" />
          </div>

          {/* Blocked Ad Banner Placeholder */}
          <div className="w-full h-20 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-950/20 flex items-center justify-center gap-2 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Ad Banner Blocked by Nova Shield</span>
          </div>

          <div className="space-y-2">
            <div className="h-3 w-full bg-white/10 rounded" />
            <div className="h-3 w-4/5 bg-white/10 rounded" />
          </div>
        </div>

        {/* Floating Privacy Shield Popover Overlay */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute top-4 right-4 w-[320px] bg-[#0c1222]/95 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-white space-y-3.5 z-20"
        >
          {/* Shield Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shadow-inner">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight">Privacy Shield Active</h4>
                <p className="text-[10px] text-white/50">uBlock Origin Engine v2.0</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
              PROTECTED
            </span>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 p-2 rounded-xl text-center border border-white/5">
              <div className="text-base font-bold text-emerald-400">148</div>
              <div className="text-[9px] text-white/50">Trackers Blocked</div>
            </div>
            <div className="bg-white/5 p-2 rounded-xl text-center border border-white/5">
              <div className="text-base font-bold text-blue-400">2.8 MB</div>
              <div className="text-[9px] text-white/50">Data Saved</div>
            </div>
            <div className="bg-white/5 p-2 rounded-xl text-center border border-white/5">
              <div className="text-base font-bold text-purple-400">+64%</div>
              <div className="text-[9px] text-white/50">Faster Load</div>
            </div>
          </div>

          {/* Protection Toggles */}
          <div className="space-y-2 text-xs pt-1">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.03]">
              <div className="flex items-center gap-2 text-[11px] text-white/80">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Aggressive AdBlock</span>
              </div>
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.03]">
              <div className="flex items-center gap-2 text-[11px] text-white/80">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Anti-Fingerprinting</span>
              </div>
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.03]">
              <div className="flex items-center gap-2 text-[11px] text-white/80">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>Do-Not-Track & Sec-GPC</span>
              </div>
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </BrowserWindow>
  );
};
