import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Faq: React.FC = () => {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const prefersReducedMotion = useReducedMotion();

  const toggleItem = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="section-deferred mx-auto max-w-5xl border-t border-neutral-200/50 px-4 py-20 sm:px-6 sm:py-24">
      {/* Section Header */}
      <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-16">
        <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
          {t.faq.badge}
        </span>
        <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-[#171717] tracking-tight mt-3">
          {t.faq.headline} <span className="text-[#4338ca]">{t.faq.headlineAccent}</span>
        </h2>
        <p className="font-sans text-neutral-600 mt-4 text-sm sm:text-base leading-relaxed">
          {t.faq.subtitle}
        </p>
      </div>

      {/* Accordion List */}
      <div className="space-y-4">
        {t.faq.items.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={faq.question}
              className={`luxury-card rounded-2xl border transition-all duration-300 overflow-hidden bg-white ${
                isOpen ? 'border-[#4338ca]/40 shadow-sm' : 'border-neutral-200/60 hover:border-neutral-300'
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
                <div className="flex min-w-0 items-center gap-3">
                  <HelpCircle aria-hidden="true" className={`w-4 h-4 shrink-0 transition-colors ${isOpen ? 'text-[#4338ca]' : 'text-neutral-400'}`} />
                  <span className="min-w-0 font-display font-bold text-sm leading-snug text-[#171717] sm:text-base">
                    {faq.question}
                  </span>
                </div>
                <div className={`p-1.5 rounded-lg bg-neutral-100 shrink-0 ${prefersReducedMotion ? '' : 'transition-transform duration-300'} ${isOpen ? 'rotate-180 bg-indigo-50 text-[#4338ca]' : 'text-[#525252]'}`}>
                  <ChevronDown aria-hidden="true" className="w-4 h-4" />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`faq-panel-${idx}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${idx}`}
                    initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                    animate={prefersReducedMotion ? undefined : { height: 'auto', opacity: 1 }}
                    exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                    transition={prefersReducedMotion ? undefined : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
