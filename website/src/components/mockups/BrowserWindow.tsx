import React from 'react';
import { Lock, Plus, ArrowLeft, ArrowRight, RotateCw, Shield, Sparkles } from 'lucide-react';

interface TabItem {
  title: string;
  url?: string;
  active?: boolean;
  favicon?: string;
  isMuted?: boolean;
}

interface BrowserWindowProps {
  url?: string;
  tabs?: TabItem[];
  isShieldActive?: boolean;
  isAiActive?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const BrowserWindow = ({ 
  url = 'nova://newtab', 
  tabs = [
    { title: 'New Tab', active: true }
  ],
  isShieldActive = true,
  isAiActive = false,
  children, 
  className = '' 
}: BrowserWindowProps) => {
  return (
    <div className={`flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#090d16] w-full h-full text-white/90 select-none ${className}`}>
      {/* Top Tab Bar & Window Controls */}
      <div className="h-10 bg-[#060911]/90 border-b border-white/5 flex items-center px-3 gap-3 flex-shrink-0">
        {/* macOS Traffic Lights */}
        <div className="flex gap-2 mr-1">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]/80 hover:bg-[#ef4444] transition-colors" />
          <div className="w-3 h-3 rounded-full bg-[#f59e0b]/80 hover:bg-[#f59e0b] transition-colors" />
          <div className="w-3 h-3 rounded-full bg-[#10b981]/80 hover:bg-[#10b981] transition-colors" />
        </div>

        {/* Tab Items */}
        <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
          {tabs.map((tab, idx) => (
            <div 
              key={idx}
              className={`h-7 px-3 rounded-lg text-xs font-medium flex items-center gap-2 max-w-[180px] transition-all border ${
                tab.active 
                  ? 'bg-white/10 text-white border-white/15 shadow-sm' 
                  : 'text-white/50 hover:bg-white/5 border-transparent'
              }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-blue-500/20 flex items-center justify-center text-[9px] text-blue-400 font-bold">
                {tab.title[0]}
              </div>
              <span className="truncate flex-1">{tab.title}</span>
              {tab.isMuted && <span className="text-[10px] opacity-60">🔇</span>}
            </div>
          ))}
          <button className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Toolbar & Omnibox */}
      <div className="h-11 bg-[#0b0f19] border-b border-white/5 flex items-center px-3 gap-2.5 flex-shrink-0">
        <div className="flex items-center gap-1 text-white/40">
          <button className="p-1.5 rounded-md hover:bg-white/5 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-md hover:bg-white/5 hover:text-white transition-colors opacity-40">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-md hover:bg-white/5 hover:text-white transition-colors">
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Omnibox */}
        <div className="flex-1 h-7.5 bg-white/5 hover:bg-white/[0.07] transition-colors rounded-lg border border-white/10 flex items-center px-3 text-xs text-white/80 gap-2">
          <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="truncate flex-1 font-mono text-[11px] text-white/70">{url}</span>
          {isShieldActive && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="w-2.5 h-2.5" />
              <span>Shield</span>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button className={`p-1.5 rounded-lg border transition-all ${isAiActive ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'hover:bg-white/5 text-white/50 border-transparent'}`}>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Viewport Content */}
      <div className="flex-1 relative overflow-hidden bg-[#070b13]">
        {children}
      </div>
    </div>
  );
};
