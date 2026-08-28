import { useState } from 'react';
import { Code2, Copy, Check, Server, ArrowUpRight, Cpu, Layers } from 'lucide-react';

export const McpBridge = () => {
  const [copied, setCopied] = useState(false);

  const mcpConfigCode = `{
  "mcpServers": {
    "nova-browser": {
      "command": "npx",
      "args": ["-y", "@nova/mcp-server", "--port", "3020"],
      "env": {
        "NOVA_ENDPOINT": "http://127.0.0.1:3020"
      }
    }
  }
}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mcpConfigCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <section id="mcp" className="py-24 px-4 sm:px-6 max-w-5xl mx-auto border-t border-[#252a3f]">
      <div className="mb-12">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          Built-in MCP Server on Port 3020
        </h2>
        <p className="mt-3 text-base text-slate-300">
          Nova exposes native browser context, page accessibility trees, and tab controls directly to your local AI agents via the open Model Context Protocol.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Features Column */}
        <div className="md:col-span-5 space-y-3.5">
          <div className="surface-panel p-5">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-white mb-1.5">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Localhost JSON-RPC 2.0 Bridge</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              No cloud middleman. External CLI agents and coding assistants connect over local Server-Sent Events (SSE) on port 3020.
            </p>
          </div>

          <div className="surface-panel p-5">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-white mb-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Safe DOM Context Extraction</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Agents inspect active tab accessibility nodes, execute safe form inputs, and capture rendered page markdown with user authorization.
            </p>
          </div>

          <div className="surface-panel p-5">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-white mb-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Zero Configuration Required</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Nova launches its local MCP bridge automatically on system startup when developer mode is enabled in settings.
            </p>
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="md:col-span-7 surface-panel p-6 font-mono text-xs text-slate-200">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#252a3f]">
            <div className="flex items-center gap-2 text-slate-400">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span>claude_desktop_config.json / mcp.json</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1 rounded bg-[#1a1e2f] hover:bg-[#252a3f] text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <pre className="mt-4 p-4 rounded-lg bg-[#08090f] border border-[#252a3f] text-slate-300 overflow-x-auto leading-relaxed">
            <code>{mcpConfigCode}</code>
          </pre>

          <div className="mt-4 pt-3.5 border-t border-[#252a3f] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>Protocol: MCP 2024-11-05 Specification</span>
            <a
              href="https://github.com/unitybtw/nova-browser"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>View Source</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default McpBridge;
