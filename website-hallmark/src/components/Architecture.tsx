import React from 'react';
import { Cpu, ShieldCheck, Terminal, Lock, Columns } from 'lucide-react';

const MODULES = [
  {
    id: 'webgpu',
    span: 'lg:col-span-8',
    tag: 'WEBGPU NEURAL ACCELERATION',
    title: 'Client-Side Neural Compute Runtime',
    description:
      'Nova binds directly to Apple Metal, Vulkan, and DirectX 12 graphics pipelines. Local models execute on quantized WebGPU shaders without network latency, cloud API subscriptions, or user telemetry.',
    stat: '64.2 TOKENS / SEC',
    metric: 'Llama 3.2 3B Local Execution',
    icon: Cpu,
  },
  {
    id: 'privacy',
    span: 'lg:col-span-4',
    tag: 'RUST NETWORK ENGINE',
    title: 'Zero-Latency Request Interception',
    description:
      'Ad beacons, tracking telemetry, and fingerprinting scripts are terminated at the kernel socket layer before DOM layout initialization.',
    stat: '0.12ms LATENCY',
    metric: '48% Bandwidth Reduction',
    icon: ShieldCheck,
  },
  {
    id: 'mcp',
    span: 'lg:col-span-4',
    tag: 'PORT 3020 LOCALHOST',
    title: 'Model Context Protocol (MCP) Bridge',
    description:
      'Built-in server exposing browser context, page DOM inspection, and tab controls directly to local terminal agents via standard MCP JSON-RPC.',
    stat: 'PORT 3020',
    metric: 'Zero-Config Agent Integration',
    icon: Terminal,
  },
  {
    id: 'vault',
    span: 'lg:col-span-4',
    tag: 'AES-256-GCM E2EE',
    title: 'Zero-Knowledge Cryptographic Vault',
    description:
      'Passwords, session cookies, and workspace state are encrypted client-side using PBKDF2 key derivation and hardware-backed OS keychain primitives.',
    stat: '256-BIT KEYS',
    metric: 'Hardware Security Module',
    icon: Lock,
  },
  {
    id: 'split',
    span: 'lg:col-span-4',
    tag: 'PARALLEL WORKSPACES',
    title: 'Dual Split Canvas & Sync Engine',
    description:
      'Run two independent webview instances side by side with synchronized frame dragging, mirror scrolling, and independent cookie isolation.',
    stat: '2-WAY SYNC',
    metric: 'Independent Context Sandboxes',
    icon: Columns,
  },
];

export const Architecture: React.FC = () => {
  return (
    <section id="architecture" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-[#24293d]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="font-mono text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">
            MODULAR ENGINE SPECS
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white">
            Engineered for <span className="text-indigo-400">Absolute Autonomy</span>.
          </h2>
        </div>
        <p className="font-sans text-sm text-slate-300 max-w-md leading-relaxed">
          Five modular architectural foundations built from the ground up to guarantee speed, privacy, and sovereignty.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.id}
              className={`tech-card ${mod.span} rounded-3xl p-6 sm:p-8 flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 rounded-2xl bg-[#181c2a] border border-[#24293d] text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 tracking-wider uppercase bg-[#181c2a] px-3 py-1 rounded-full border border-[#24293d]">
                    {mod.tag}
                  </span>
                </div>

                <h3 className="font-display text-xl sm:text-2xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">
                  {mod.title}
                </h3>
                <p className="font-sans text-sm text-slate-300 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              <div className="mt-8 pt-5 border-t border-[#24293d] flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">{mod.metric}</span>
                <span className="font-bold text-indigo-400">{mod.stat}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Architecture;
