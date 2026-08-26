import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Terminal, ArrowDown, Sparkles, Cpu, Shield, Zap } from 'lucide-react';

export interface ParallaxStarsHeroProps {
  speed?: number;
}

const generateBoxShadows = (n: number) => {
  let value = `${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px #FFF`;
  for (let i = 2; i <= n; i++) {
    value += `, ${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px #FFF`;
  }
  return value;
};

export const ParallaxStarsHero: React.FC<ParallaxStarsHeroProps> = ({ speed = 1 }) => {
  const shadowsSmall = useMemo(() => generateBoxShadows(700), []);
  const shadowsMedium = useMemo(() => generateBoxShadows(200), []);
  const shadowsBig = useMemo(() => generateBoxShadows(100), []);

  return (
    <section className="relative w-full min-h-screen overflow-hidden bg-[#090A0F] flex flex-col justify-between pt-32 pb-16">
      {/* Background Radial Atmosphere */}
      <div className="absolute inset-0 bg-radial-space z-0 pointer-events-none" />

      {/* Stars Layer 1 (Small) */}
      <div
        className="absolute left-0 top-0 w-[1px] h-[1px] bg-transparent z-10 animate-[animStar_50s_linear_infinite] pointer-events-none"
        style={{
          boxShadow: shadowsSmall,
          animationDuration: `${50 / speed}s`,
        }}
      >
        <div
          className="absolute top-[2000px] w-[1px] h-[1px] bg-transparent"
          style={{ boxShadow: shadowsSmall }}
        />
      </div>

      {/* Stars Layer 2 (Medium) */}
      <div
        className="absolute left-0 top-0 w-[2px] h-[2px] bg-transparent z-10 animate-[animStar_100s_linear_infinite] pointer-events-none"
        style={{
          boxShadow: shadowsMedium,
          animationDuration: `${100 / speed}s`,
        }}
      >
        <div
          className="absolute top-[2000px] w-[2px] h-[2px] bg-transparent"
          style={{ boxShadow: shadowsMedium }}
        />
      </div>

      {/* Stars Layer 3 (Big) */}
      <div
        className="absolute left-0 top-0 w-[3px] h-[3px] bg-transparent z-10 animate-[animStar_150s_linear_infinite] pointer-events-none"
        style={{
          boxShadow: shadowsBig,
          animationDuration: `${150 / speed}s`,
        }}
      >
        <div
          className="absolute top-[2000px] w-[3px] h-[3px] bg-transparent"
          style={{ boxShadow: shadowsBig }}
        />
      </div>

      {/* Ambient Purple Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[150px] pointer-events-none z-10" />

      {/* Central Content */}
      <div className="relative z-20 max-w-6xl mx-auto px-6 text-center my-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-950/40 backdrop-blur-md mb-8"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono text-[10px] tracking-widest uppercase text-indigo-200">
            Next-Gen Autonomous Browser Architecture
          </span>
        </motion.div>

        {/* Grand Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="font-sans font-extrabold text-5xl sm:text-7xl lg:text-8xl tracking-tight text-white leading-tight uppercase select-none"
        >
          <span className="text-gradient-clip block">PURE INTELLIGENCE</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-indigo-500">
            ON-DEVICE AUTONOMY
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
          className="font-body text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mt-8 font-normal leading-relaxed"
        >
          Nova is an open-source, sovereign web browser powered by local WebGPU neural agents, zero-knowledge encryption, and a sub-millisecond privacy defense matrix.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4 mt-10"
        >
          <a
            href="#download"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white text-[#090A0F] font-bold text-xs uppercase tracking-widest hover:bg-indigo-400 hover:text-white transition-all duration-300 shadow-xl shadow-indigo-500/10 cursor-pointer"
          >
            <Terminal className="w-4 h-4" />
            <span>Download Nova Browser</span>
          </a>
          <a
            href="#simulator"
            className="inline-flex items-center gap-2 px-7 py-4 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Launch Live Simulation</span>
            <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
          </a>
        </motion.div>

        {/* Meta Feature Chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.55 }}
          className="flex flex-wrap items-center justify-center gap-6 mt-14 text-slate-400 text-xs font-mono"
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>LOCAL WEBGPU 3B LLM</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>AES-256-GCM E2EE SYNC</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>0ms PREDICTIVE OMNIBOX</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom Subtle Scroll Indicator */}
      <div className="relative z-20 text-center flex flex-col items-center">
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-2">
          EXPLORE THE PLATFORM
        </span>
        <div className="w-5 h-9 rounded-full border border-white/20 flex items-start justify-center p-1">
          <motion.div
            animate={{ y: [0, 14, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full bg-indigo-400"
          />
        </div>
      </div>
    </section>
  );
};

export default ParallaxStarsHero;
