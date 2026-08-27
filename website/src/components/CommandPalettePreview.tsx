import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, ArrowRight, Shield, BookOpen, Layers, Terminal, Check } from "lucide-react";

interface ActionItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  shortcut: string;
  icon: React.ElementType;
}

const ACTIONS: ActionItem[] = [
  {
    id: "ai-summarize",
    category: "AI Agent",
    title: "Summarize Webpage via WebGPU",
    subtitle: "Runs Llama 3.2 on local hardware without sending tokens to cloud",
    shortcut: "⌘ + Shift + S",
    icon: Sparkles
  },
  {
    id: "split-view",
    category: "Navigation",
    title: "Split Screen with Active Document",
    subtitle: "Tile two independent browser sessions side-by-side",
    shortcut: "⌘ + Option + \\",
    icon: Layers
  },
  {
    id: "mcp-connect",
    category: "Developer",
    title: "Pair Model Context Protocol (MCP)",
    subtitle: "Expose secure DOM inspection server to Claude / Cursor IDE on port 3020",
    shortcut: "⌘ + Shift + M",
    icon: Terminal
  },
  {
    id: "reader-mode",
    category: "Reading",
    title: "Toggle Clean Typography Reader",
    subtitle: "Strip ads, tracking scripts, and formatting clutter",
    shortcut: "⌘ + Shift + R",
    icon: BookOpen
  },
  {
    id: "purge-memory",
    category: "Performance",
    title: "Purge Dormant Tab Memory",
    subtitle: "Instantly reclaim 600MB+ V8 heap without losing tab state",
    shortcut: "⌘ + Shift + P",
    icon: Shield
  }
];

export const CommandPalettePreview: React.FC = () => {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string>("ai-summarize");
  const [executed, setExecuted] = useState<string | null>(null);

  const filtered = ACTIONS.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase()) ||
      a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const handleExecute = (item: ActionItem) => {
    setActiveId(item.id);
    setExecuted(`Executed: ${item.title}`);
    setTimeout(() => setExecuted(null), 2500);
  };

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto border-t border-[#e5e5e5]">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
            KEYBOARD-DRIVEN POWER
          </span>
          <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-[#171717] tracking-tight mt-3">
            Spotlight Omnibox & Command Palette
          </h2>
        </div>
        <p className="font-sans text-neutral-600 max-w-md text-sm leading-relaxed">
          Navigate your entire digital workspace at the speed of thought with instant fuzzy search and zero UI friction.
        </p>
      </div>

      {/* Interactive Command Palette Frame */}
      <div className="max-w-4xl mx-auto rounded-2xl bg-[#0b0f19] border border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.4)] overflow-hidden font-sans">
        {/* Search Bar Input */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center gap-3.5 bg-[#0f1422]">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            placeholder="Type a command or search tabs (e.g. summarize, split, mcp)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none text-sm md:text-base text-white placeholder-slate-500 focus:outline-none"
          />
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 font-mono text-[11px] text-slate-400">
            <span>ESC to close</span>
          </div>
        </div>

        {/* Feedback Alert if executed */}
        <AnimatePresence>
          {executed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 flex items-center justify-between text-xs font-mono text-emerald-400"
            >
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5" />
                <span>{executed}</span>
              </div>
              <span className="text-[10px] text-emerald-500">Latency: 0.4ms</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action List */}
        <div className="p-3 max-h-[380px] overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              No matching actions found for "{query}".
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = activeId === item.id;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleExecute(item)}
                  onMouseEnter={() => setActiveId(item.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-600/20 border border-indigo-500/40 text-white shadow-xs"
                      : "text-slate-300 hover:bg-slate-800/40 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`p-2 rounded-lg ${isSelected ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-slate-100">{item.title}</span>
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-xl">{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 shrink-0">
                    <span className="hidden sm:inline-block px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60">
                      {item.shortcut}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? "translate-x-1 text-indigo-400" : "opacity-0"}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

export default CommandPalettePreview;
