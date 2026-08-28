import React, { useState } from 'react';
import { Code2, Copy, Check, Server, ArrowUpRight, Cpu, Layers } from 'lucide-react';

export const McpProtocol: React.FC = () => {
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
    <section id="mcp" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-[#24293d]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="font-mono text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-2">
            AGENTIC PROTOCOL
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white">
            Built-in <span className="text-cyan-400">MCP Server</span> on Port 3020.
          </h2>
        </div>
        <p className="font-sans text-sm text-slate-300 max-w-md leading-relaxed">
          Nova exposes native browser context, page accessibility trees, and tab controls directly to your local AI agents via the standard Model Context Protocol.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Technical Highlights */}
        <div className="lg:col-span-5 space-y-4">
          <div className="tech-card rounded-2xl p-5 border-l-4 border-l-cyan-500">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-white mb-1">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Localhost JSON-RPC 2.0 Bridge</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              No cloud middleman. External CLI agents and coding assistants connect over local Server-Sent Events (SSE) on port 3020.
            </p>
          </div>

          <div className="tech-card rounded-2xl p-5 border-l-4 border-l-indigo-500">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-white mb-1">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Safe DOM Context Extraction</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Agents inspect active tab accessibility nodes, execute safe form inputs, and capture rendered page markdown with user authorization.
            </p>
          </div>

          <div className="tech-card rounded-2xl p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-white mb-1">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Zero Configuration Required</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Nova launches its local MCP bridge automatically on system startup when developer mode is enabled in settings.
            </p>
          </div>
        </div>

        {/* Right Column: Code Snippet & Setup Box */}
        <div className="lg:col-span-7 rounded-3xl border border-[#24293d] bg-[#0e1017] p-6 shadow-2xl font-mono text-xs text-slate-200">
          <div className="flex items-center justify-between pb-4 border-b border-[#24293d]">
            <div className="flex items-center gap-2 text-slate-400">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span>claude_desktop_config.json / mcp.json</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-[#181c2a] hover:bg-[#24293d] text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY CONFIG</span>
                </>
              )}
            </button>
          </div>

          <pre className="mt-4 p-4 rounded-xl bg-[#08090d] border border-[#24293d]/60 text-slate-300 overflow-x-auto leading-relaxed code-scroll">
            <code>{mcpConfigCode}</code>
          </pre>

          <div className="mt-4 pt-4 border-t border-[#24293d] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>Protocol: MCP 2024-11-05 Spec</span>
            <a
              href="https://github.com/unitybtw/nova-browser"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>View MCP Tool Implementation</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default McpProtocol;
