import React from 'react';
import { Sparkles, Bot, Shield, Zap, Lock, Layers } from 'lucide-react';

export const ContinuousTicker: React.FC = () => {
  const tickerItems = [
    { type: 'text', content: 'In every tab' },
    {
      type: 'badge',
      label: 'WEBGPU ACCELERATED',
      icon: Sparkles,
      color: 'border-indigo-500/30 bg-indigo-950/50 text-indigo-300',
    },
    { type: 'text', content: 'discover the undeniable' },
    {
      type: 'highlight',
      content: 'Raw Power',
      color: 'from-indigo-400 via-purple-300 to-white',
    },
    { type: 'text', content: 'of on-device' },
    {
      type: 'badge',
      label: 'AUTONOMOUS AGENT',
      icon: Bot,
      color: 'border-purple-500/30 bg-purple-950/50 text-purple-300',
    },
    { type: 'text', content: 'that sets your' },
    {
      type: 'highlight',
      content: 'Web Navigation Free',
      color: 'from-emerald-400 via-teal-300 to-white',
    },
    {
      type: 'svg',
    },
    {
      type: 'badge',
      label: 'ZERO TELEMETRY',
      icon: Shield,
      color: 'border-emerald-500/30 bg-emerald-950/50 text-emerald-300',
    },
    { type: 'text', content: 'zero cloud data leakage' },
    {
      type: 'badge',
      label: 'AES-256-GCM E2EE',
      icon: Lock,
      color: 'border-blue-500/30 bg-blue-950/50 text-blue-300',
    },
    { type: 'text', content: 'with sub-millisecond execution' },
    {
      type: 'badge',
      label: '0ms CACHED OMNIBOX',
      icon: Zap,
      color: 'border-amber-500/30 bg-amber-950/50 text-amber-300',
    },
    { type: 'text', content: 'and parallel dual split-views' },
    {
      type: 'badge',
      label: 'TILING WORKSPACE',
      icon: Layers,
      color: 'border-cyan-500/30 bg-cyan-950/50 text-cyan-300',
    },
    { type: 'text', content: '100% open source sovereign computing' },
  ];

  return (
    <section id="ticker" className="relative w-full py-10 bg-[#060010] border-y border-white/10 overflow-hidden select-none">
      {/* Ambient Side Gradients for Smooth In/Out Fades */}
      <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-r from-[#060010] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-l from-[#060010] to-transparent z-10 pointer-events-none" />

      {/* Infinite Seamless Flex Container */}
      <div className="flex whitespace-nowrap animate-ticker items-center">
        {[0, 1].map((copyIndex) => (
          <div key={copyIndex} className="flex items-center gap-6 sm:gap-10 shrink-0 pr-6 sm:pr-10">
            {tickerItems.map((item, idx) => {
              if (item.type === 'text') {
                return (
                  <span
                    key={idx}
                    className="font-sans font-light text-2xl sm:text-3xl lg:text-4xl text-slate-300 tracking-tight"
                  >
                    {item.content}
                  </span>
                );
              }
              if (item.type === 'highlight') {
                return (
                  <span
                    key={idx}
                    className={`font-serif italic font-bold text-2xl sm:text-3xl lg:text-4xl bg-gradient-to-r ${item.color} bg-clip-text text-transparent px-1`}
                  >
                    {item.content}
                  </span>
                );
              }
              if (item.type === 'badge') {
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${item.color} text-xs font-mono font-semibold tracking-wider uppercase shadow-sm`}
                  >
                    {item.icon && React.createElement(item.icon, { className: 'w-3.5 h-3.5' })}
                    <span>{item.label}</span>
                  </span>
                );
              }
              if (item.type === 'svg') {
                return (
                  <svg
                    key={idx}
                    width="40"
                    height="16"
                    viewBox="0 0 40 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-indigo-400 shrink-0"
                  >
                    <path
                      d="M2 8C8 2 12 14 20 8C28 2 32 14 38 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>
    </section>
  );
};

export default ContinuousTicker;
