import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Copy, Check, Cpu, Code } from "lucide-react";

interface TerminalTab {
  id: string;
  label: string;
  icon: React.ElementType;
  command: string;
  output: string[];
}

const TABS: TerminalTab[] = [
  {
    id: "brew",
    label: "Homebrew Install",
    icon: Terminal,
    command: "brew tap unitybtw/tap && brew install --cask nova-browser",
    output: [
      "==> Tapping unitybtw/tap",
      "Cloning into \"/opt/homebrew/Library/Taps/unitybtw/homebrew-tap\"...",
      "Tapped 1 cask (1.1.0).",
      "==> Fetching nova-browser (1.1.0)",
      "==> Downloading https://github.com/unitybtw/nova-browser/releases/download/v1.1.0/Nova-Browser-arm64.dmg",
      "######################################################################## 100.0%",
      "==> Verifying SHA-256 checksum for Cask \"nova-browser\" [MATCHED]",
      "==> Installing Cask nova-browser",
      "==> Moving App \"Nova Browser.app\" to \"/Applications/Nova Browser.app\"",
      "✔︎  nova-browser was successfully installed (0.84s)!"
    ]
  },
  {
    id: "mcp",
    label: "MCP Server (Port 3020)",
    icon: Code,
    command: "curl -X POST http://localhost:3020/mcp -H 'Content-Type: application/json' -d '{\"method\":\"browser_read_page\"}'",
    output: [
      "// Model Context Protocol Bridge initialized on ws://localhost:3020/events",
      "[MCP Server] Client authenticated: Claude Desktop / Cursor IDE",
      "[MCP Request] -> method: \"browser_read_page\", args: { includeLinks: true }",
      "[MCP Execution] DOM Tree sanitized in 1.2ms (Zero Cloud Latency)",
      "{",
      "  \"title\": \"Quantum Computing Research Paper — arXiv:2608.019\",",
      "  \"wordCount\": 4820,",
      "  \"cleanMarkdown\": \"# Topological Quantum Error Correction...\",",
      "  \"outgoingLinks\": 42",
      "}",
      "✔︎  Response stream completed with 100% on-device privacy."
    ]
  },
  {
    id: "webgpu",
    label: "WebGPU Local Tensor Engine",
    icon: Cpu,
    command: "nova --run-model llama-3.2-3b --backend metal-webgpu",
    output: [
      "[Hardware Init] Detected Apple Silicon M-Series GPU (Unified Memory: 16 GB)",
      "[Shader Pipeline] WebGPU Compute Pipeline compiled in 42ms (Metal API)",
      "[Model Loader] Initializing Llama-3.2-3B-Instruct (GGUF 4-bit Quantized)",
      "[Tensor Allocation] Loaded 1,840 MB weights into GPU VRAM cache",
      "[Inference Benchmark] Prompt: \"Summarize this dense 20-page research paper\"",
      "Generating tokens: [████████████████████████████████] 100%",
      "Speed: 64.2 tokens/sec | First Token Latency: 18ms | Cloud Transmission: 0 KB",
      "✔︎  Execution completed 100% offline."
    ]
  }
];

export const TerminalPlayground: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("brew");
  const [copied, setCopied] = useState<boolean>(false);

  const current = TABS.find((t) => t.id === activeTab) || TABS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="developer" className="py-24 px-6 max-w-7xl mx-auto border-t border-[#e5e5e5]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
            DEVELOPER PROTOCOLS & CLI
          </span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#171717] tracking-tight mt-2">
            Built for Hackers, AI Engineers & Power Users.
          </h2>
        </div>
        <p className="font-sans text-neutral-600 max-w-md text-sm leading-relaxed">
          Interact with Nova via native Homebrew package manager, built-in Model Context Protocol (MCP), or local WebGPU compute pipelines.
        </p>
      </div>

      {/* Terminal Container */}
      <div className="relative rounded-2xl bg-[#0a0d14] border border-slate-800 shadow-2xl overflow-hidden font-mono text-xs md:text-sm text-slate-200">
        {/* Top bar with Tabs & Controls */}
        <div className="h-12 bg-[#0e1320] border-b border-slate-800/80 px-4 flex items-center justify-between select-none">
          {/* Traffic Lights */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block" />
          </div>

          {/* Terminal Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-800 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Copy Command Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs cursor-pointer border border-slate-700/60"
            title="Copy command to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        {/* Terminal Body */}
        <div className="p-6 md:p-8 space-y-4 overflow-x-auto min-h-[280px]">
          {/* Prompt line */}
          <div className="flex items-start gap-2.5 text-slate-100">
            <span className="text-cyan-400 font-bold select-none">$</span>
            <span className="font-semibold text-emerald-400 select-all">{current.command}</span>
          </div>

          {/* Output lines with smooth transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-1.5 text-slate-400 leading-relaxed font-mono text-xs md:text-[13px]"
            >
              {current.output.map((line, idx) => (
                <div
                  key={idx}
                  className={`${
                    line.includes("✔︎")
                      ? "text-emerald-400 font-bold pt-2"
                      : line.includes("Speed:") || line.includes("100.0%")
                      ? "text-cyan-300 font-semibold"
                      : line.includes("//") || line.includes("/*")
                      ? "text-slate-500 italic"
                      : "text-slate-300"
                  }`}
                >
                  {line}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default TerminalPlayground;
