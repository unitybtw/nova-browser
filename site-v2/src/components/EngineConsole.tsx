import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

const SCENARIOS = [
  {
    id: 'ai-summary',
    title: 'Local Tab Intelligence',
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

export const EngineConsole = () => {
  const [selectedId, setSelectedId] = useState<string>('ai-summary');
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const current = SCENARIOS.find((s) => s.id === selectedId) || SCENARIOS[0];

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 250);
  };

  return (
    <section id="engine" className="py-24 px-4 sm:px-6 max-w-5xl mx-auto border-t border-[#252a3f]">
      <div className="mb-12">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          On-Device WebGPU Neural Engine
        </h2>
        <p className="mt-3 text-base text-slate-300">
          Nova executes quantized weights directly on your Metal/Vulkan compute shaders. Your data, prompts, and session history never travel across the internet.
        </p>
      </div>

      {/* Scenario Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6 font-mono text-xs">
        {SCENARIOS.map((scenario) => {
          const active = scenario.id === selectedId;
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => handleSelect(scenario.id)}
              className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                active
                  ? 'bg-[#1e2238] border-indigo-500 text-white'
                  : 'bg-[#141724] border-[#252a3f] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-[10px] text-indigo-400 font-bold uppercase mb-1">
                {scenario.badge}
              </div>
              <div className="font-semibold text-white truncate">{scenario.title}</div>
            </button>
          );
        })}
      </div>

      {/* Terminal Viewport */}
      <div className="surface-panel p-6 sm:p-8 font-mono text-xs text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-[#252a3f] text-slate-400 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            <span className="ml-2 font-semibold text-slate-300">nova://engine/webgpu-runtime</span>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="text-emerald-400 font-semibold">WebGPU Direct Attach</span>
            <span className="text-slate-500">Port 3020 Localhost</span>
          </div>
        </div>

        <div className="mt-6 space-y-4 font-sans">
          <div className="flex items-start gap-2.5 text-indigo-300 font-mono text-xs">
            <span className="text-slate-500 select-none">&gt;</span>
            <span className="font-semibold">{current.prompt}</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0d0f17] border border-[#252a3f] text-slate-200 text-sm leading-relaxed">
            {isRunning ? (
              <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs py-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing on-device WebGPU compute shaders...</span>
              </div>
            ) : (
              <p>{current.response}</p>
            )}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#252a3f] grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] font-mono">
          <div>
            <span className="text-slate-500 block">Throughput</span>
            <span className="font-bold text-white text-xs">{current.tokensPerSec}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Local VRAM</span>
            <span className="font-bold text-white text-xs">{current.vram}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Latency</span>
            <span className="font-bold text-emerald-400 text-xs">{current.latency}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Cloud Telemetry</span>
            <span className="font-bold text-indigo-400 text-xs">{current.telemetry}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EngineConsole;
