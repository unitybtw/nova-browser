import React from 'react';
import { Surface } from '@webprodigies/flute';
import { BrowserDemo } from '../../components/BrowserDemo';

export default function FlagshipRevealScene() {
  return (
    <div className="relative w-full h-full bg-[#08090d] flex items-center justify-center overflow-hidden select-none font-sans">
      {/* Volumetric Studio Atmosphere */}
      <div 
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-[120px]" 
        aria-hidden="true" 
      />
      <div 
        className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] rounded-full bg-indigo-500/10 blur-[140px]" 
        aria-hidden="true" 
      />

      {/* Floating 3D Surface */}
      <Surface 
        id="browser-hero" 
        style={{ width: 1440, height: 920 }}
        className="relative flex flex-col items-center justify-center p-8"
      >
        {/* Cinematic Header Overlay */}
        <div className="w-full max-w-[1280px] mb-4 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-[#4338ca] text-white font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-indigo-400/30">
              N
            </div>
            <div>
              <div className="font-display font-bold text-sm tracking-wide text-white flex items-center gap-2">
                <span>NOVA BROWSER</span>
                <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  FLAGSHIP 3D
                </span>
              </div>
              <p className="font-mono text-[10px] text-neutral-400 tracking-wider uppercase">
                AI-Native · Local LLM · 120 FPS Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-neutral-900/80 border border-neutral-800/80 px-3.5 py-1.5 rounded-full backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-[11px] text-neutral-300 font-medium tracking-wide">
              Zero Telemetry · 100% Sovereign
            </span>
          </div>
        </div>

        {/* Live Interactive Browser Container */}
        <div className="relative w-full max-w-[1280px] h-[720px] rounded-2xl overflow-hidden border border-neutral-700/60 shadow-[0_25px_70px_rgba(0,0,0,0.65),0_0_40px_rgba(67,56,202,0.25)] bg-[#0d0f17]">
          {/* Subtle Glass Reflection Line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent z-30" />
          
          <div className="w-full h-full">
            <BrowserDemo />
          </div>
        </div>

        {/* Cinematic Lower Third / Callout */}
        <div className="w-full max-w-[1280px] mt-5 flex items-center justify-between px-2 text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="text-[#6366f1] font-bold">●</span>
            <span className="text-neutral-300 font-medium">Next-Generation Workspace with Split View & Autonomous Agents</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-white/80 font-medium">Download Free</span>
            <span className="text-neutral-600">|</span>
            <span className="text-indigo-400">nova-browser.org</span>
          </div>
        </div>
      </Surface>
    </div>
  );
}
