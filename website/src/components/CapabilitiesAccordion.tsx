import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';

interface Capability {
  id: string;
  num: string;
  title: string;
  tag: string;
  summary: string;
  specs: string[];
}

const CAPABILITIES: Capability[] = [
  {
    id: '01',
    num: '01',
    title: 'Autonomous Browser Agents',
    tag: '[On-Device AI Engine]',
    summary: 'Direct visual cursor control and deep DOM parsing powered by WebLLM with TVM WebGPU acceleration. The agent fills complex forms, navigates pages, and extracts data with zero server involvement.',
    specs: ['Llama 3.2 3B & Phi 3.5 Vision', 'DOM Scanning with [data-ai-id] tagging', '100% On-Device Privacy'],
  },
  {
    id: '02',
    num: '02',
    title: 'Zero-Knowledge Sync Matrix',
    tag: '[E2E Cryptography]',
    summary: 'AES-256-GCM symmetric encryption with PBKDF2 key derivation. Your open tabs, history, workspaces, and credentials synchronize across devices without anyone (including cloud servers) reading plaintext.',
    specs: ['Client-Side Key Derivation', '1-Click Pairing Protocol', 'Sub-second Sync Propagation'],
  },
  {
    id: '03',
    num: '03',
    title: 'Aggressive Tab Hibernation',
    tag: '[Memory Optimization]',
    summary: 'Intelligent lifecycle manager that suspends inactive background Webviews after a configurable timeout, reducing RAM footprint by up to 60% compared to traditional Chromium architectures.',
    specs: ['60% RAM Reduction vs Chrome', '0.1% Idle CPU Overhead', 'Instant State Restoration'],
  },
  {
    id: '04',
    num: '04',
    title: 'Local Model Context Protocol',
    tag: '[Local MCP Server]',
    summary: 'Built-in MCP Server running directly on port 3020 with token-authenticated SSE streaming. Connect your IDE, terminal tools, and local LLMs directly to browser actions via contextBridge.',
    specs: ['Port 3020 SSE Protocol', 'Dynamic Tool Sandboxing', 'Zero External Dependencies'],
  },
  {
    id: '05',
    num: '05',
    title: 'Instant 0ms Omnibox Cache',
    tag: '[Sub-millisecond Search]',
    summary: 'Predictive LRU in-memory cache coupled with 35ms staggered search provider fallbacks. Search suggestions and direct URL navigations render instantly with zero keystroke lag.',
    specs: ['0ms In-Memory LRU Cache', 'Brave & Google Fallbacks', 'Aborted In-Flight Requests'],
  },
];

export const CapabilitiesAccordion: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string>('01');

  return (
    <section id="capabilities" className="py-32 px-6 max-w-7xl mx-auto border-t border-[#e5e5e5]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Side: Sticky Header */}
        <div className="lg:col-span-5 lg:sticky lg:top-28 flex flex-col justify-between">
          <div>
            <span className="font-mono-tracked text-[11px] text-[#4338ca] font-semibold">
              SPECIFICATION INDEX
            </span>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#171717] mt-3">
              Core <br />
              <span className="italic font-normal">Capabilities</span>.
            </h2>
            <p className="font-body text-neutral-600 mt-6 text-base leading-relaxed max-w-md">
              A comprehensive breakdown of the low-level systems powering the Nova browsing experience.
            </p>
          </div>

          <div className="mt-12">
            <a
              href="https://github.com/unitybtw/nova-browser"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-mono-tracked text-xs text-[#171717] hover:text-[#4338ca] transition-colors py-2 border-b border-[#171717] hover:border-[#4338ca] group"
            >
              <span>INSPECT ARCHITECTURE ON GITHUB</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

        {/* Right Side: Interactive Vertical Accordion */}
        <div className="lg:col-span-7 flex flex-col divide-y divide-[#e5e5e5]">
          {CAPABILITIES.map((cap) => {
            const isOpen = expandedId === cap.id;
            return (
              <div key={cap.id} className="py-6 transition-colors">
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? '' : cap.id)}
                  className="w-full flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-baseline gap-6">
                    <span className="font-mono text-xs font-semibold text-neutral-400">
                      {cap.num}
                    </span>
                    <h3
                      className={`font-display text-2xl sm:text-3xl font-medium transition-colors duration-400 ${
                        isOpen ? 'text-[#171717]' : 'text-neutral-400 hover:text-[#171717]'
                      }`}
                    >
                      {cap.title}
                    </h3>
                  </div>

                  <div
                    className={`p-2 rounded-full border transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isOpen ? 'border-[#171717] bg-[#171717] text-white rotate-180' : 'border-[#e5e5e5] text-neutral-400 group-hover:text-[#171717]'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Expanding Content Reveal */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-6 pl-12 sm:pl-16 pr-4">
                        <div className="inline-block font-mono text-xs font-semibold text-[#4338ca] mb-3">
                          {cap.tag}
                        </div>
                        <p className="font-body text-neutral-700 text-sm sm:text-base leading-relaxed mb-6 font-normal">
                          {cap.summary}
                        </p>

                        {/* Monospace Bullet Specs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#e5e5e5]/80">
                          {cap.specs.map((spec, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4338ca]" />
                              <span className="font-mono text-[11px] text-neutral-600 font-medium">
                                {spec}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CapabilitiesAccordion;
