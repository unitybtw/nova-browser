import { Cpu, ShieldCheck, Terminal, Lock, Columns } from 'lucide-react';

const MODULES = [
  {
    id: 'webgpu',
    span: 'md:col-span-8',
    tag: 'WebGPU Compute',
    title: 'Client-Side Neural Compute Runtime',
    description:
      'Nova binds directly to Apple Metal, Vulkan, and DirectX 12 graphics pipelines. Local models execute on quantized WebGPU shaders without network latency, cloud API subscriptions, or user telemetry.',
    stat: '64.2 tok/s',
    metric: 'Llama 3.2 3B Quantized',
    icon: Cpu,
  },
  {
    id: 'privacy',
    span: 'md:col-span-4',
    tag: 'Rust Engine',
    title: 'Zero-Latency Request Interception',
    description:
      'Ad beacons, tracking telemetry, and fingerprinting scripts are terminated at the kernel socket layer before DOM layout initialization.',
    stat: '0.12 ms',
    metric: 'Network Decision Latency',
    icon: ShieldCheck,
  },
  {
    id: 'mcp',
    span: 'md:col-span-4',
    tag: 'Localhost SSE',
    title: 'Model Context Protocol Bridge',
    description:
      'Built-in server exposing browser context, page DOM inspection, and tab controls directly to local terminal agents via standard MCP JSON-RPC.',
    stat: 'Port 3020',
    metric: 'Local Agent Bridge',
    icon: Terminal,
  },
  {
    id: 'vault',
    span: 'md:col-span-4',
    tag: 'AES-256-GCM',
    title: 'Zero-Knowledge Cryptographic Vault',
    description:
      'Passwords, session cookies, and workspace state are encrypted client-side using PBKDF2 key derivation and hardware-backed OS keychain primitives.',
    stat: '256-Bit Keys',
    metric: 'Hardware Security Module',
    icon: Lock,
  },
  {
    id: 'split',
    span: 'md:col-span-4',
    tag: 'Tiling Canvas',
    title: 'Dual Split Canvas & Sync Engine',
    description:
      'Run two independent webview instances side by side with synchronized frame dragging, mirror scrolling, and independent cookie isolation.',
    stat: '2-Way Sync',
    metric: 'Isolated Context Sandboxes',
    icon: Columns,
  },
];

export const Blueprint = () => {
  return (
    <section id="architecture" className="py-24 px-4 sm:px-6 max-w-5xl mx-auto border-t border-[#252a3f]">
      <div className="mb-12">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          Engineered for Absolute Autonomy
        </h2>
        <p className="mt-3 text-base text-slate-300">
          Five modular architectural pillars built without compromise for high-performance sovereign computing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.id}
              className={`surface-panel ${mod.span} p-6 sm:p-7 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="p-2.5 rounded-xl bg-[#1a1e2f] border border-[#252a3f] text-indigo-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 uppercase bg-[#1a1e2f] px-2.5 py-1 rounded border border-[#252a3f]">
                    {mod.tag}
                  </span>
                </div>

                <h3 className="font-display text-xl font-bold text-white mb-2">
                  {mod.title}
                </h3>
                <p className="font-sans text-sm text-slate-300 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#252a3f] flex items-center justify-between font-mono text-xs">
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

export default Blueprint;
