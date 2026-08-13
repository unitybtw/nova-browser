import React from 'react';
import { Lock, Plus, ArrowLeft, ArrowRight, RotateCw, Shield, Sparkles } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

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
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className={`flex flex-col rounded-2xl overflow-hidden border shadow-2xl w-full h-full select-none transition-colors duration-500 ${
      isDark 
        ? 'border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] bg-[#090d16] text-white/90' 
        : 'border-slate-200/90 shadow-[0_15px_35px_rgba(0,0,0,0.06)] bg-white text-slate-800'
    } ${className}`}>
      {/* Top Tab Bar & Window Controls */}
      <div className={`h-10 border-b flex items-center px-3 gap-3 flex-shrink-0 transition-colors duration-500 ${
        isDark ? 'bg-[#060911]/90 border-white/5' : 'bg-slate-100/90 border-slate-200/80'
      }`}>
        {/* macOS Traffic Lights */}
        <div className="flex gap-2 mr-1">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]/90 hover:opacity-100 transition-opacity" />
          <div className="w-3 h-3 rounded-full bg-[#f59e0b]/90 hover:opacity-100 transition-opacity" />
          <div className="w-3 h-3 rounded-full bg-[#10b981]/90 hover:opacity-100 transition-opacity" />
        </div>

        {/* Tab Items */}
        <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
          {tabs.map((tab, idx) => (
            <div 
              key={idx}
              className={`h-7 px-3 rounded-lg text-xs font-medium flex items-center gap-2 max-w-[180px] transition-all border ${
                tab.active 
                  ? isDark 
                    ? 'bg-white/10 text-white border-white/15 shadow-sm' 
                    : 'bg-white text-slate-900 border-slate-300/80 shadow-xs'
                  : isDark 
                    ? 'text-white/50 hover:bg-white/5 border-transparent' 
                    : 'text-slate-500 hover:bg-slate-200/60 border-transparent'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
              }`}>
                {tab.title[0]}
              </div>
              <span className="truncate flex-1">{tab.title}</span>
              {tab.isMuted && <span className="text-[10px] opacity-60">🔇</span>}
            </div>
          ))}
          <button className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
            isDark ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
          }`}>
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Toolbar & Omnibox */}
      <div className={`h-11 border-b flex items-center px-3 gap-2.5 flex-shrink-0 transition-colors duration-500 ${
        isDark ? 'bg-[#0b0f19] border-white/5' : 'bg-slate-50 border-slate-200/80'
      }`}>
        <div className={`flex items-center gap-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
          <button className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-slate-200 hover:text-slate-800'}`}>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-md opacity-40">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-slate-200 hover:text-slate-800'}`}>
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Omnibox */}
        <div className={`flex-1 h-7.5 transition-colors rounded-lg border flex items-center px-3 text-xs gap-2 ${
          isDark 
            ? 'bg-white/5 hover:bg-white/[0.07] border-white/10 text-white/80' 
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
        }`}>
          <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
          <span className={`truncate flex-1 font-mono text-[11px] ${isDark ? 'text-white/70' : 'text-slate-600'}`}>{url}</span>
          {isShieldActive && (
            <div className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
              isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}>
              <Shield className="w-2.5 h-2.5" />
              <span>Shield</span>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button className={`p-1.5 rounded-lg border transition-all ${
            isAiActive 
              ? isDark 
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                : 'bg-purple-50 text-purple-600 border-purple-200' 
              : isDark 
                ? 'hover:bg-white/5 text-white/50 border-transparent' 
                : 'hover:bg-slate-200 text-slate-400 border-transparent'
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Viewport Content */}
      <div className={`flex-1 relative overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#070b13]' : 'bg-slate-50/50'}`}>
        {children}
      </div>
    </div>
  );
};
