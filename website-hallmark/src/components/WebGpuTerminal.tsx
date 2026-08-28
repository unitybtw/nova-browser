import React, { useState } from 'react';
import { Cpu, RefreshCw } from 'lucide-react';

interface Scenario {
  id: string;
  title: string;
  badge: string;
  prompt: string;
  response: string;
  tokensPerSec: string;
  vram: string;
  latency: string;
  telemetry: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'ai-summary',
    title: 'Local Page Intelligence',
    badge: 'Llama 3.2 3B Q4F16',
    prompt: '@nova summarize the technical differences between Chrome memory saver and Nova DOM tree hibernation',
    response:
      'Nova Browser isolates background webview pipelines at the native compositor level. While Chrome throttles background CPU timers, Nova unmounts the inactive DOM tree to compressed RAM while retaining the instant forward/backward cache in 0.04ms. This achieves a 64% RAM reduction across 20+ active tabs without cloud telemetry.',
    tokensPerSec: '64.4 tok/s',
    vram: '1.82 GB',
    latency: '14.2 ms (0.00s network)',
    telemetry: '0 KB (100% Private)',
  },
  {
    id: 'dom-schema',
    title: 'Offline Translation',
    badge: 'Local Neural Lexicon',
    prompt: '@nova translate technical documentation from Japanese to English offline',
    response:
      'DOM batch translation executed locally in WebAssembly sandbox. Concurrent dictionary lookup parsed 4,120 text nodes in 38ms with zero cloud transmission to translation APIs.',
    tokensPerSec: '72.1 tok/s',
    vram: '1.45 GB',
    latency: '11.0 ms (0.00s network)',
    telemetry: '0 KB (Local Sandbox)',
  },
  {
    id: 'tracker-audit',
    title: 'Rust Kernel Privacy Intercept',
    badge: 'Adblocker Engine',
    prompt: '@nova inspect network layer tracker blocking decision latency',
    response:
      'Terminated 42 third-party telemetry beacons (Google Analytics 4, Segment, Facebook Pixel, Criteo) at socket initialization prior to DOM parser creation. Network request execution overhead: 0.12ms.',
    tokensPerSec: 'Instantaneous',
    vram: '48 MB Filter Tree',
    latency: '0.12 ms',
    telemetry: '42 Blocked / 0 Sent',
  },
  {
    id: 'mcp-tools',
    title: 'Local MCP Tool Execution',
    badge: 'Port 3020 Server',
    prompt: '@nova execute terminal tool: list open tabs and capture markdown summary',
    response:
      'MCP Bridge Port 3020 authenticated. Received secure JSON-RPC payload from desktop agent. Extracted 3 tabs, read active context, emitted formatted Markdown artifact directly to local filesystem.',
    tokensPerSec: '58.9 tok/s',
    vram: '1.90 GB',
    latency: '18.4 ms',
    telemetry: 'Localhost Only',
  },
];

export const WebGpuTerminal: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('ai-summary');
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const current = SCENARIOS.find((s) => s.id === selectedId) || SCENARIOS[0];

  const handleSimulate = (id: string) => {
    setSelectedId(id);
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 350);
  };

  return (
    <section id="engine" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-[#24293d]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">
            <Cpu className="w-4 h-4" />
            <span>INTERACTIVE HARDWARE RUNTIME</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white">
            On-Device <span className="text-indigo-400">WebGPU Neural Engine</span>.
          </h2>
        </div>
        <p className="font-sans text-sm text-slate-300 max-w-md leading-relaxed">
          Nova executes quantized weights directly on your Metal/Vulkan compute shaders. Your data, prompts, and session history never travel across the internet.
        </p>
      </div>

      {/* Scenario Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {SCENARIOS.map((item) => {
          const isActive = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSimulate(item.id)}
              className={`p-3.5 rounded-2xl border text-left font-mono transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg'
                  : 'bg-[#131620] border-[#24293d] text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1">
                {item.badge}
              </div>
              <div className="text-xs font-semibold truncate text-white">{item.title}</div>
            </button>
          );
        })}
      </div>

      {/* Terminal Viewport */}
      <div className="rounded-3xl border border-[#24293d] bg-[#0e1017] p-5 sm:p-8 shadow-2xl font-mono text-xs text-slate-200 overflow-hidden">
        {/* Terminal Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#24293d] text-slate-400 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-slate-300 font-bold">nova://engine/webgpu-runtime</span>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              WEBGPU DIRECT ATTACH
            </span>
            <span className="text-slate-500">PORT 3020 LOCALHOST</span>
          </div>
        </div>

        {/* Terminal Content Body */}
        <div className="mt-6 space-y-4">
          {/* User Prompt */}
          <div className="flex items-start gap-2.5 text-indigo-300">
            <span className="text-slate-500 select-none">&gt;</span>
            <span className="font-semibold">{current.prompt}</span>
          </div>

          {/* Engine Output */}
          <div className="p-4 rounded-2xl bg-[#131620] border border-[#24293d]/80 text-slate-200 leading-relaxed font-sans text-sm sm:text-base">
            {isRunning ? (
              <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs py-4">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Streaming tensors from local WebGPU shaders...</span>
              </div>
            ) : (
              <p>{current.response}</p>
            )}
          </div>
        </div>

        {/* Telemetry Metrics Footer */}
        <div className="mt-6 pt-5 border-t border-[#24293d] grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
          <div>
            <span className="text-slate-500 block">THROUGHPUT</span>
            <span className="font-bold text-white text-xs">{current.tokensPerSec}</span>
          </div>
          <div>
            <span className="text-slate-500 block">LOCAL VRAM</span>
            <span className="font-bold text-white text-xs">{current.vram}</span>
          </div>
          <div>
            <span className="text-slate-500 block">INFERENCE LATENCY</span>
            <span className="font-bold text-emerald-400 text-xs">{current.latency}</span>
          </div>
          <div>
            <span className="text-slate-500 block">CLOUD TELEMETRY</span>
            <span className="font-bold text-indigo-400 text-xs">{current.telemetry}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WebGpuTerminal;
