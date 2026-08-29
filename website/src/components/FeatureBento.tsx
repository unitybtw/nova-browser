import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bot, Lock, Columns, Shield, Terminal, Sparkles } from 'lucide-react';
import { CodeTrailCard } from './codetrail/CodeTrailCard';
import { TextRevealCard } from './textreveal/TextRevealCard';

const MODULES = [
  {
    id: 'agent',
    span: 'lg:col-span-8',
    title: 'Autonomous Local AI Agent',
    tag: 'WEBGPU NEURAL RUNTIME',
    description: 'On-device neural inference with Llama 3.2 3B & Phi 3.5 Vision. Deep DOM parsing, shader execution, and intelligent code synthesis with 0% cloud transmission.',
    icon: Bot,
    stats: '60+ TOKENS / SEC',
    hasVisual: true,
    visualType: 'codetrail',
  },
  {
    id: 'vault',
    span: 'lg:col-span-4',
    title: 'Zero-Knowledge Crypto Vault',
    tag: 'AES-256-GCM E2EE',
    description: 'Client-side PBKDF2 key derivation. Your open tabs, history, and passwords sync without servers having decryption keys.',
    icon: Lock,
    stats: 'END-TO-END',
    hasVisual: false,
  },
  {
    id: 'split',
    span: 'lg:col-span-4',
    title: 'Dual-View Split Screen',
    tag: 'PARALLEL TILING',
    description: 'Work simultaneously across two independent webview sessions with synchronized scrolling and frame dragging.',
    icon: Columns,
    stats: 'SYNCHRONIZED',
    hasVisual: false,
  },
  {
    id: 'privacy',
    span: 'lg:col-span-4',
    title: 'Sub-ms Privacy Shield',
    tag: 'RUST NETWORK ENGINE',
    description: 'Intercepts advertising beacons and tracking payloads at the network level before DOM parsing ever starts.',
    icon: Shield,
    stats: '0ms BLOCK RATE',
    hasVisual: false,
  },
  {
    id: 'mcp',
    span: 'lg:col-span-4',
    title: 'Local MCP Server Bridge',
    tag: 'PORT 3020 SSE',
    description: 'Built-in Model Context Protocol server running locally to bridge terminal commands, scripts, and local LLMs.',
    icon: Terminal,
    stats: 'LOCALHOST ONLY',
    hasVisual: false,
  },
  {
    id: 'typography',
    span: 'lg:col-span-12',
    title: 'Reactive Surface & Ambient Shaders',
    tag: 'DYNAMIC FRACTAL BLOOM',
    description: 'Corner typography blooming through GPU noise fields with cursor parallax and multi-tap un-blurring.',
    icon: Sparkles,
    stats: '60 FPS WEBGPU',
    hasVisual: true,
    visualType: 'textreveal',
  },
];

export const FeatureBento: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="features" className="mx-auto max-w-7xl border-t border-[#e5e5e5] px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
      {/* Section Header */}
      <div className="mb-12 flex flex-col gap-5 sm:mb-16 md:flex-row md:items-end md:justify-between md:gap-8">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
            ARCHITECTURE MATRIX
          </span>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[#171717] tracking-tight mt-3">
            Engineered for <span className="text-[#4338ca]">Autonomy</span>.
          </h2>
        </div>
        <p className="font-sans text-neutral-600 max-w-md text-base leading-relaxed">
          Modular architectural pillars built without compromise for sovereign computing.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {MODULES.map((mod, index) => (
          <motion.div
            key={mod.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={prefersReducedMotion ? undefined : { duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={`luxury-card ${mod.span} rounded-2xl bg-white/85 border border-[#e5e5e5] p-8 sm:p-10 flex flex-col justify-between group relative overflow-hidden backdrop-blur-sm`}
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[#4338ca] transition-colors duration-200 group-hover:border-[#4338ca]/20 group-hover:bg-[#4338ca] group-hover:text-white">
                  {React.createElement(mod.icon, { className: 'w-5 h-5' })}
                </div>
                <span className="font-mono text-[10px] font-bold text-neutral-400 tracking-wider uppercase bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                  {mod.tag}
                </span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#171717] mb-3 group-hover:text-[#4338ca] transition-colors">
                {mod.title}
              </h3>
              <p className="font-sans text-sm text-neutral-600 leading-relaxed max-w-2xl">
                {mod.description}
              </p>

              {mod.hasVisual && mod.visualType === 'codetrail' && (
                <div className="mt-6 w-full overflow-hidden rounded-xl border border-neutral-800/80 bg-[#0d0f15] shadow-lg">
                  <CodeTrailCard className="aspect-[16/8] sm:aspect-[21/9] w-full" />
                </div>
              )}

              {mod.hasVisual && mod.visualType === 'textreveal' && (
                <div className="mt-6 w-full overflow-hidden rounded-xl border border-[#e5e5e5] bg-[#fcfbf9] shadow-sm">
                  <TextRevealCard className="aspect-[16/7] sm:aspect-[21/8] w-full" />
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-[#e5e5e5]/60 pt-6 font-mono text-xs">
              <span className="font-semibold text-neutral-400">// SOVEREIGN ARCHITECTURE</span>
              <div className="flex items-center gap-1 text-[#4338ca] font-bold">
                <span>{mod.stats}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeatureBento;
