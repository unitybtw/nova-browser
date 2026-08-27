import React, { useState } from "react";
import { motion } from "framer-motion";
import { Cloud, Cpu, Check, X } from "lucide-react";

export const ArchitectureComparison: React.FC = () => {
  const [activeModel, setActiveModel] = useState<"nova" | "cloud">("nova");

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto border-t border-[#e5e5e5]">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
          PARADIGM SHIFT
        </span>
        <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-[#171717] tracking-tight mt-3">
          On-Device WebGPU vs. Cloud AI
        </h2>
        <p className="font-sans text-neutral-600 mt-4 text-base leading-relaxed">
          Why sending your full browsing history and prompt tokens to third-party datacenters is obsolete.
        </p>

        {/* Toggle Switch */}
        <div className="mt-8 inline-flex items-center p-1.5 rounded-full bg-neutral-200/80 border border-neutral-300">
          <button
            onClick={() => setActiveModel("nova")}
            className={`px-6 py-2 rounded-full font-mono text-xs font-bold transition-all cursor-pointer ${
              activeModel === "nova"
                ? "bg-[#171717] text-white shadow-md"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            Nova Architecture (Sovereign)
          </button>
          <button
            onClick={() => setActiveModel("cloud")}
            className={`px-6 py-2 rounded-full font-mono text-xs font-bold transition-all cursor-pointer ${
              activeModel === "cloud"
                ? "bg-[#171717] text-white shadow-md"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            Legacy Cloud Browsers
          </button>
        </div>
      </div>

      {/* Interactive Visual Architecture Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Nova Sovereign Card */}
        <motion.div
          animate={{ scale: activeModel === "nova" ? 1.02 : 0.98, opacity: activeModel === "nova" ? 1 : 0.6 }}
          transition={{ duration: 0.3 }}
          className={`p-8 sm:p-10 rounded-2xl border transition-all ${
            activeModel === "nova"
              ? "bg-[#090d16] text-white border-indigo-500/50 shadow-2xl ring-2 ring-indigo-500/20"
              : "bg-white text-slate-900 border-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-display text-xl font-bold ${activeModel === "nova" ? "text-white" : "text-slate-900"}`}>
                  Nova On-Device Silicon
                </h3>
                <span className="font-mono text-xs text-emerald-400 font-semibold">WebGPU Compute Shaders</span>
              </div>
            </div>
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
              0ms Cloud Latency
            </span>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3" />
              </div>
              <p className={`text-xs sm:text-sm ${activeModel === "nova" ? "text-slate-300" : "text-neutral-600"}`}>
                <strong>Direct Silicon Execution:</strong> Multi-model LLMs execute directly on Apple Metal or DirectX 12 hardware with zero data packets leaving your machine.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3" />
              </div>
              <p className={`text-xs sm:text-sm ${activeModel === "nova" ? "text-slate-300" : "text-neutral-600"}`}>
                <strong>100% Offline Capability:</strong> Read, summarize, and query dense documents anywhere on airplanes or off-grid without WiFi.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3" />
              </div>
              <p className={`text-xs sm:text-sm ${activeModel === "nova" ? "text-slate-300" : "text-neutral-600"}`}>
                <strong>No Token Subscriptions:</strong> Forever free and open-source under the MIT license with zero artificial rate limits.
              </p>
            </div>
          </div>

          <div className={`p-4 rounded-xl font-mono text-xs flex items-center justify-between border ${
            activeModel === "nova" ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-300" : "bg-neutral-100 border-neutral-200 text-neutral-700"
          }`}>
            <span>Security Model:</span>
            <span className="font-bold text-emerald-400">Air-Gapped Privacy</span>
          </div>
        </motion.div>

        {/* Cloud AI Legacy Card */}
        <motion.div
          animate={{ scale: activeModel === "cloud" ? 1.02 : 0.98, opacity: activeModel === "cloud" ? 1 : 0.6 }}
          transition={{ duration: 0.3 }}
          className={`p-8 sm:p-10 rounded-2xl border transition-all ${
            activeModel === "cloud"
              ? "bg-[#090d16] text-white border-amber-500/50 shadow-2xl ring-2 ring-amber-500/20"
              : "bg-white text-slate-900 border-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-display text-xl font-bold ${activeModel === "cloud" ? "text-white" : "text-slate-900"}`}>
                  Legacy Cloud Browsers
                </h3>
                <span className="font-mono text-xs text-amber-500 font-semibold">Remote API Subscriptions</span>
              </div>
            </div>
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold">
              2,500ms+ Network RTT
            </span>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                <X className="w-3 h-3" />
              </div>
              <p className={`text-xs sm:text-sm ${activeModel === "cloud" ? "text-slate-300" : "text-neutral-600"}`}>
                <strong>Data Logging Risks:</strong> Webpage content and prompts are sent over public networks to third-party LLM cloud providers.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                <X className="w-3 h-3" />
              </div>
              <p className={`text-xs sm:text-sm ${activeModel === "cloud" ? "text-slate-300" : "text-neutral-600"}`}>
                <strong>Network Dependency:</strong> If your internet drops or remote servers experience downtime, all AI assistant features fail immediately.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                <X className="w-3 h-3" />
              </div>
              <p className={`text-xs sm:text-sm ${activeModel === "cloud" ? "text-slate-300" : "text-neutral-600"}`}>
                <strong>Recurring Monthly Fees:</strong> Requires $20/month subscriptions or arbitrary daily prompt limits.
              </p>
            </div>
          </div>

          <div className={`p-4 rounded-xl font-mono text-xs flex items-center justify-between border ${
            activeModel === "cloud" ? "bg-amber-950/40 border-amber-500/30 text-amber-300" : "bg-neutral-100 border-neutral-200 text-neutral-700"
          }`}>
            <span>Security Model:</span>
            <span className="font-bold text-amber-500">Third-Party Centralized</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ArchitectureComparison;
