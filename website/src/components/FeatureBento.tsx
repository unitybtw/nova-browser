import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Lock, Columns, Shield, Terminal, ArrowUpRight } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';

const MODULES = [
  {
    id: 'agent',
    span: 'lg:col-span-8',
    title: 'Autonomous Local AI Agent',
    tag: 'WEBGPU NEURAL RUNTIME',
    description: 'On-device neural inference with Llama 3.2 3B & Phi 3.5 Vision. Deep DOM parsing and form execution with 0% cloud data transmission.',
    icon: Bot,
    stats: '60+ TOKENS / SEC',
  },
  {
    id: 'vault',
    span: 'lg:col-span-4',
    title: 'Zero-Knowledge Crypto Vault',
    tag: 'AES-256-GCM E2EE',
    description: 'Client-side PBKDF2 key derivation. Your open tabs, history, and passwords sync without servers having decryption keys.',
    icon: Lock,
    stats: 'END-TO-END',
  },
  {
    id: 'split',
    span: 'lg:col-span-4',
    title: 'Dual-View Split Screen',
    tag: 'PARALLEL TILING',
    description: 'Work simultaneously across two independent webview sessions with synchronized scrolling and frame dragging.',
    icon: Columns,
    stats: 'SYNCHRONIZED',
  },
  {
    id: 'privacy',
    span: 'lg:col-span-4',
    title: 'Sub-ms Privacy Shield',
    tag: 'RUST NETWORK ENGINE',
    description: 'Intercepts advertising beacons and tracking payloads at the network level before DOM parsing ever starts.',
    icon: Shield,
    stats: '0ms BLOCK RATE',
  },
  {
    id: 'mcp',
    span: 'lg:col-span-4',
    title: 'Local MCP Server Bridge',
    tag: 'PORT 3020 SSE',
    description: 'Built-in Model Context Protocol server running locally to bridge terminal commands, scripts, and local LLMs.',
    icon: Terminal,
    stats: 'LOCALHOST ONLY',
  },
];

export const FeatureBento: React.FC = () => {
  return (
    <section id="features" className="py-32 px-6 max-w-7xl mx-auto border-t border-[#e5e5e5]">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
            ARCHITECTURE MATRIX
          </span>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[#171717] tracking-tight mt-3">
            Engineered for <span className="text-[#4338ca]">Autonomy</span>.
          </h2>
        </div>
        <p className="font-sans text-neutral-600 max-w-md text-base leading-relaxed">
          Five modular architectural pillars built without compromise for sovereign computing.
        </p>
      </div>

      {/* Bento Grid with Dynamic Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {MODULES.map((mod, index) => (
          <motion.div
            key={mod.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className={mod.span}
          >
            <SpotlightCard className="h-full flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[#4338ca] group-hover:bg-[#4338ca] group-hover:text-white transition-colors duration-300">
                    {React.createElement(mod.icon, { className: 'w-5 h-5' })}
                  </div>
                  <span className="font-mono text-[10px] font-bold text-neutral-400 tracking-wider uppercase bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                    {mod.tag}
                  </span>
                </div>

                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#171717] mb-3 group-hover:text-[#4338ca] transition-colors">
                  {mod.title}
                </h3>
                <p className="font-sans text-sm text-neutral-600 leading-relaxed max-w-xl">
                  {mod.description}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-[#e5e5e5]/60 flex items-center justify-between font-mono text-xs">
                <span className="text-neutral-400 font-semibold">// {mod.stats}</span>
                <div className="flex items-center gap-1 text-[#4338ca] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>INSPECT</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeatureBento;
