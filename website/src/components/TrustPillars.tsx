import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, Lock, Cpu, Code2 } from 'lucide-react';
import { BlurRevealCard } from './blurreveal/BlurRevealCard';
import { useLanguage } from '../context/LanguageContext';

const PILLAR_ICONS = [ShieldCheck, Cpu, Code2, Lock];

export const TrustPillars: React.FC = React.memo(() => {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="section-deferred mx-auto max-w-7xl border-t border-neutral-200/50 px-4 py-20 sm:px-6 lg:py-24">
      <div className="mb-10 flex flex-col gap-3 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#4338ca]">{t.trustPillars.badge}</span>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-extrabold tracking-tight text-[#171717] sm:text-4xl">
            {t.trustPillars.headline}{' '}
            <span className="text-[#4338ca]">{t.trustPillars.headlineAccent}</span>
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-neutral-600 sm:text-right">{t.trustPillars.subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {t.trustPillars.items.map((item, idx) => {
          const Icon = PILLAR_ICONS[idx % PILLAR_ICONS.length];
          return (
            <motion.div
              key={item.title}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={prefersReducedMotion ? undefined : { duration: 0.6, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="luxury-card group/card relative flex flex-col justify-between rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-xs hover:border-indigo-500/30 hover:shadow-indigo-500/5 sm:p-7 overflow-hidden"
            >
              {/* Subtle hover gradient flare */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl transition-opacity duration-500 opacity-0 group-hover/card:opacity-100" aria-hidden="true" />
              
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div>
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 mb-5">
                    <div className="p-2.5 rounded-xl bg-neutral-100 text-[#4338ca] border border-neutral-200/60 transition-colors duration-300 group-hover/card:bg-[#4338ca] group-hover/card:text-white">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="max-w-[58%] text-right font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-600 transition-colors duration-300 group-hover/card:text-[#4338ca]">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-[#171717] mb-2 leading-snug transition-colors duration-300 group-hover/card:text-[#4338ca]">
                    {item.title}
                  </h3>
                  <p className="font-sans text-xs text-neutral-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between font-mono text-[11px] transition-colors duration-300 group-hover/card:border-indigo-100">
                  <span className="text-neutral-600 font-medium">{t.trustPillars.standardLabel}</span>
                  <span className="text-[#4338ca] font-bold">{item.stat}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Sovereign Manifesto Blur-Reveal Showcase */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 25 }}
        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={prefersReducedMotion ? undefined : { duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 sm:mt-10 w-full overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#0d0f15] shadow-2xl"
      >
        <BlurRevealCard className="aspect-[16/5] sm:aspect-[21/6] w-full" />
      </motion.div>
    </section>
  );
});

export default TrustPillars;
