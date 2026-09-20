import React from 'react';
import { Surface } from '@webprodigies/flute';
import { BrowserDemo } from '../../components/BrowserDemo';

export default function FlagshipRevealScene() {
  return (
    <Surface 
      id="browser-hero" 
      style={{ width: 1200, height: 750 }}
      className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_35px_100px_rgba(0,0,0,0.85),0_0_60px_rgba(99,102,241,0.25)] border border-slate-700/60 bg-[#151122]"
    >
      <div className="w-full h-full">
        <BrowserDemo />
      </div>
    </Surface>
  );
}
