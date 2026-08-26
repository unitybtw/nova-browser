import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Cpu, Lock, Columns, ShieldCheck } from 'lucide-react';

interface ProjectCard {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  bgColor: string;
  orbColor: string;
  icon: React.ComponentType<{ className?: string }>;
  stats: string;
}

const CARDS: ProjectCard[] = [
  {
    id: '01',
    tag: 'ON-DEVICE INFERENCE',
    title: 'Autonomous Local Agent Engine',
    subtitle: 'Zero cloud latency. Browser actions executed locally via WebGPU neural engines without data leakage.',
    bgColor: 'bg-[#e0e7ff]',
    orbColor: 'from-indigo-500/40 to-blue-500/40',
    icon: Cpu,
    stats: '60+ TOKENS / SEC',
  },
  {
    id: '02',
    tag: 'CRYPTOGRAPHIC VAULT',
    title: 'Zero-Knowledge Multi-Device Sync',
    subtitle: 'AES-256-GCM client-side encryption. Passwords, tabs, and history paired seamlessly with 1 click.',
    bgColor: 'bg-[#ede9fe]',
    orbColor: 'from-purple-500/40 to-indigo-500/40',
    icon: Lock,
    stats: 'AES-256-GCM E2EE',
  },
  {
    id: '03',
    tag: 'WORKSPACE COMPOSITION',
    title: 'Dual-View Parallel Navigation',
    subtitle: 'Split-screen canvas with independent Webview sessions, synchronized scrolling, and custom tab groupings.',
    bgColor: 'bg-[#fae8ff]',
    orbColor: 'from-fuchsia-500/40 to-pink-500/40',
    icon: Columns,
    stats: 'PARALLEL RENDERING',
  },
  {
    id: '04',
    tag: 'SUB-MILLISECOND DEFENSE',
    title: 'Privacy Shield & Tracker Eradicator',
    subtitle: 'Rust & Electron network-level blocker stopping telemetry and malicious scripts before network payloads land.',
    bgColor: 'bg-[#e0f2fe]',
    orbColor: 'from-sky-500/40 to-indigo-500/40',
    icon: ShieldCheck,
    stats: '0ms TRACKER BLOCK',
  },
];

export const WorkGrid: React.FC = () => {
  return (
    <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
        <div>
          <span className="font-mono-tracked text-[11px] text-[#4338ca] font-semibold">
            ENGINEERING PILLARS
          </span>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#171717] mt-3">
            Core Architecture <span className="italic">Matrix</span>.
          </h2>
        </div>
        <p className="font-body text-neutral-600 max-w-md text-base leading-relaxed">
          Every layer of Nova is engineered from first principles for uncompromising autonomy, memory isolation, and speed.
        </p>
      </div>

      {/* 2-Column Staggered Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {CARDS.map((card, index) => {
          const isStaggered = index % 2 === 1;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: index * 0.1 }}
              className={`flex flex-col group cursor-pointer ${isStaggered ? 'lg:mt-16' : ''}`}
            >
              {/* Intelligent Hover Card Frame */}
              <div
                className={`relative aspect-[4/3] w-full rounded-2xl overflow-hidden ${card.bgColor} p-8 flex flex-col justify-between transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-4 group-hover:shadow-2xl border border-[#171717]/5`}
              >
                {/* Background Floating Color Orb */}
                <div
                  className={`absolute inset-0 m-auto w-64 h-64 rounded-full bg-gradient-to-tr ${card.orbColor} blur-3xl transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-125 opacity-70 pointer-events-none`}
                />

                {/* Top Card Meta */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-white/80 backdrop-blur-md shadow-sm text-[#171717]">
                    {React.createElement(card.icon, { className: 'w-5 h-5' })}
                  </div>
                  <span className="font-mono text-xs font-bold tracking-widest text-[#171717]/60">
                    // {card.stats}
                  </span>
                </div>

                {/* Center Abstract Graphic */}
                <div className="relative z-10 my-auto text-center">
                  <span className="font-display italic text-3xl sm:text-4xl text-[#171717]/90 font-medium tracking-tight">
                    {card.title}
                  </span>
                </div>

                {/* Bottom Card Area & Action Pill Reveal */}
                <div className="relative z-10 flex items-end justify-between mt-auto">
                  <span className="font-mono-tracked text-[10px] text-[#171717]/60 font-semibold">
                    MODULE [{card.id}]
                  </span>

                  {/* Action Pill: translates up on hover with 500ms premium ease */}
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#171717] text-[#fcfbf9] font-mono text-[10px] font-bold tracking-wider uppercase opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-lg">
                    <span>EXPLORE SPEC</span>
                    <ArrowUpRight className="w-3 h-3 text-indigo-400" />
                  </div>
                </div>
              </div>

              {/* Text Metadata Below Card with Drawing 1px Separator */}
              <div className="mt-6">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-display text-2xl font-bold text-[#171717] group-hover:text-[#4338ca] transition-colors duration-400">
                    {card.title}
                  </h3>
                  <span className="font-mono-tracked text-[10px] text-neutral-500 font-semibold">
                    {card.tag}
                  </span>
                </div>

                {/* 1px separator line that expands */}
                <div className="w-full h-[1px] bg-[#e5e5e5] relative overflow-hidden mb-3">
                  <div className="absolute inset-0 bg-[#4338ca] w-0 group-hover:w-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" />
                </div>

                <p className="font-body text-sm text-neutral-600 leading-relaxed">
                  {card.subtitle}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default WorkGrid;
