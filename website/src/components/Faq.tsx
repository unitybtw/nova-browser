import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'Is Nova Browser really 100% free and open-source?',
    answer:
      'Yes. Nova is completely free and licensed under the permissive MIT Open Source License. There are no paywalls, premium tiers, or hidden subscriptions. The entire codebase is auditable on GitHub.',
    category: 'LICENSING',
  },
  {
    question: 'Does Nova send any of my browsing data or AI queries to the cloud?',
    answer:
      'No. Nova operates under a zero-telemetry architecture. All autonomous AI synthesis, deep research agents, and page translations execute client-side using local WebGPU shaders and hardware-backed storage. Zero background pings are sent to any analytics servers.',
    category: 'PRIVACY',
  },
  {
    question: 'Can I import my bookmarks and Chrome extensions?',
    answer:
      'Yes. Because Nova is built on modern Chromium and Electron, standard Chromium extensions (Manifest V3) and standard HTML bookmark files can be imported directly into your workspace.',
    category: 'ECOSYSTEM',
  },
  {
    question: 'What are the system requirements for on-device AI?',
    answer:
      'Nova runs smoothly on any Apple Silicon Mac (M1/M2/M3/M4) and modern Windows 10/11 PCs with 8GB+ RAM and DirectX 12 / Vulkan compatible GPUs. For systems without dedicated WebGPU acceleration, lightweight fallback CPU pipelines are supported.',
    category: 'HARDWARE',
  },
  {
    question: 'How does 1-click page translation work without external cloud latency?',
    answer:
      'Nova packages extracted DOM elements into concurrent batch payloads processed through native localized dictionary bridges. Full-page translation completes in milliseconds without leaving the browser sandbox.',
    category: 'ENGINE',
  },
  {
    question: 'How does tab hibernation save memory compared to Chrome?',
    answer:
      'When background tabs become inactive, Nova suspends their rendering pipeline and unmounts dormant DOM trees from RAM while retaining full navigation history. Clicking a hibernated tab restores it in ~30ms.',
    category: 'PERFORMANCE',
  },
];

export const Faq: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="mx-auto max-w-5xl border-t border-[#e5e5e5] px-4 py-20 sm:px-6 sm:py-24">
      {/* Section Header */}
      <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-16">
        <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
          TRANSPARENCY & FREQUENTLY ASKED QUESTIONS
        </span>
        <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-[#171717] tracking-tight mt-3">
          Clear <span className="text-[#4338ca]">Answers</span>.
        </h2>
        <p className="font-sans text-neutral-600 mt-4 text-sm sm:text-base leading-relaxed">
          Everything you need to know about Nova Browser’s security model, local runtime, and architecture.
        </p>
      </div>

      {/* Accordion List */}
      <div className="space-y-4">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={faq.question}
              className={`luxury-card rounded-2xl border transition-all duration-300 overflow-hidden bg-white/85 backdrop-blur-sm ${
                isOpen ? 'border-[#4338ca]/40 shadow-sm' : 'border-[#e5e5e5] hover:border-neutral-300'
              }`}
            >
              <button
                type="button"
                id={`faq-trigger-${idx}`}
                onClick={() => toggleItem(idx)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${idx}`}
                className="flex w-full items-center justify-between gap-3 p-4 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] sm:gap-4 sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className={`w-4 h-4 shrink-0 transition-colors ${isOpen ? 'text-[#4338ca]' : 'text-neutral-400'}`} />
                  <span className="font-display font-bold text-sm leading-snug text-[#171717] sm:text-base">
                    {faq.question}
                  </span>
                </div>
                <div className={`p-1.5 rounded-lg bg-neutral-100 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 bg-indigo-50 text-[#4338ca]' : 'text-neutral-500'}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`faq-panel-${idx}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${idx}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="px-6 pb-6 pt-0 font-sans text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 mt-2">
                      <p className="pt-4">{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Faq;
