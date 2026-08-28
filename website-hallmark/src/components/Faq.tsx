import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  category: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    category: 'HARDWARE & WEBGPU',
    question: 'How does on-device WebGPU AI inference work in Nova?',
    answer:
      'Nova bundles quantized WebLLM neural weights (Llama 3.2 3B, Phi 3.5) directly into the client process. Compute shaders compile directly to Apple Metal, Vulkan, or DirectX 12. Inference executes at over 60 tokens/second on modern graphics cards with zero network API requests or server fees.',
  },
  {
    category: 'PRIVACY & SECURITY',
    question: 'What does "Zero Telemetry" actually mean in practice?',
    answer:
      'Nova contains zero analytics SDKs, crash report beacons, or user tracking pings. All outbound network requests originate strictly from user-initiated tab navigation. Advertising and tracker requests are intercepted at the Rust socket layer before the DOM parser ever initializes.',
  },
  {
    category: 'MEMORY & PERFORMANCE',
    question: 'How does Nova’s DOM hibernation reduce RAM by 64%?',
    answer:
      'When tabs remain dormant in the background, Nova unmounts their DOM trees and releases render process handles to compressed RAM while retaining the instant back/forward cache state in 0.04ms. This allows having 50+ tabs open while keeping total browser RAM under 1GB.',
  },
  {
    category: 'EXTENSIONS & COMPATIBILITY',
    question: 'Can I install Chrome Web Store extensions and userscripts?',
    answer:
      'Yes. Nova is built on modern Chromium and Electron foundations with full support for Chrome extensions, devtools, standard web APIs, and WebGPU compute shaders.',
  },
  {
    category: 'DEVELOPER & MCP',
    question: 'How do I use the built-in MCP server on Port 3020?',
    answer:
      'Enable Developer Mode in Settings. Nova will launch a local Model Context Protocol SSE server on http://localhost:3020. You can point Claude Desktop, Antigravity, Cursor, or your custom terminal scripts to this port to let agents inspect tab contexts safely.',
  },
  {
    category: 'LICENSING & SOURCE',
    question: 'Is Nova Browser completely free and open source?',
    answer:
      'Yes. Nova Browser is 100% open source under the MIT license. There are no paid tiers, paywalled features, or proprietary closed-source tracking blobs.',
  },
];

export const Faq: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto border-t border-[#24293d]">
      <div className="text-center mb-14">
        <div className="font-mono text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">
          SPECIFICATIONS & ARCHITECTURE
        </div>
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white">
          Frequently Asked Questions.
        </h2>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={faq.question}
              className="tech-card rounded-2xl border border-[#24293d] overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <HelpCircle className={`w-4 h-4 shrink-0 ${isOpen ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className="font-display font-bold text-sm sm:text-base text-white">
                    {faq.question}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline font-mono text-[9px] text-slate-400 font-bold px-2 py-0.5 rounded bg-[#181c2a] border border-[#24293d]">
                    {faq.category}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-indigo-400' : ''
                    }`}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="px-6 pb-6 pt-0 font-sans text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-[#24293d]/60 mt-1 pt-4">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Faq;
