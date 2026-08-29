import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Zap, Shield, Cpu } from 'lucide-react';
import { LoudBurstCard } from './loud-burst/LoudBurstCard';

export const KineticShowcase: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="mx-auto max-w-7xl border-t border-[#e5e5e5] px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
      <div className="editorial-rail" aria-hidden="true"><span>03</span><i /></div>
      
      {/* Section Header */}
      <div className="mb-10 flex flex-col gap-4 sm:mb-12 md:flex-row md:items-end md:justify-between md:gap-8">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#4338ca]">
            SOVEREIGN PHILOSOPHY & REACTIVITY
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#171717] sm:text-4xl lg:text-5xl">
            Engineered with <span className="text-[#4338ca]">Intent</span>.
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-neutral-600 sm:text-right">
          A kinetic canvas built on pure 2D canvas execution. Zero dependencies, 30fps deterministic physics, and instant on-device reactivity.
        </p>
      </div>

      {/* Kinetic Typography Canvas Showcase Card */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="luxury-card relative overflow-hidden rounded-3xl border border-[#e5e5e5] bg-white p-4 shadow-xs sm:p-6 lg:p-8 backdrop-blur-sm"
      >
        <LoudBurstCard />

        {/* Feature Pills under the kinetic card */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 border-t border-neutral-100 pt-5 text-xs font-mono text-neutral-600">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#4338ca] shrink-0" />
            <span>34 FPS Deterministic Frame Loop</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#0078bf] shrink-0" />
            <span>DPR-Capped Canvas 2D Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Zero Telemetry & 100% Offline</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default KineticShowcase;
