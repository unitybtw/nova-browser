import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bot, Lock, Columns, Shield, Terminal } from 'lucide-react';
import { CodeTrailCard } from './codetrail/CodeTrailCard';
import { TextRevealCard } from './textreveal/TextRevealCard';
import { useLanguage } from '../context/LanguageContext';

export const FeatureBento: React.FC = React.memo(() => {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();

  const modules = useMemo(() => [
    {
      id: 'agent',
      span: 'lg:col-span-8',
      title: t.features.agentTitle,
      tag: t.features.agentTag,
      description: t.features.agentDesc,
      icon: Bot,
      stats: t.features.agentStat,
      hasVisual: true,
    },
    {
      id: 'vault',
      span: 'lg:col-span-4',
      title: t.features.vaultTitle,
      tag: t.features.vaultTag,
      description: t.features.vaultDesc,
      icon: Lock,
      stats: t.features.vaultStat,
      hasVisual: false,
    },
    {
      id: 'split',
      span: 'lg:col-span-4',
      title: t.features.splitTitle,
      tag: t.features.splitTag,
      description: t.features.splitDesc,
      icon: Columns,
      stats: t.features.splitStat,
      hasVisual: false,
    },
    {
      id: 'privacy',
      span: 'lg:col-span-4',
      title: t.features.privacyTitle,
      tag: t.features.privacyTag,
      description: t.features.privacyDesc,
      icon: Shield,
      stats: t.features.privacyStat,
      hasVisual: false,
    },
    {
      id: 'mcp',
      span: 'lg:col-span-4',
      title: t.features.mcpTitle,
      tag: t.features.mcpTag,
      description: t.features.mcpDesc,
      icon: Terminal,
      stats: t.features.mcpStat,
      hasVisual: false,
    },
  ], [t]);

  return (
    <section id="features" className="section-deferred mx-auto max-w-7xl border-t border-neutral-200/50 px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
      {/* Section Header */}
      <div className="mb-12 flex flex-col gap-5 sm:mb-16 md:flex-row md:items-end md:justify-between md:gap-8">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
            {t.features.badge}
          </span>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[#171717] tracking-tight mt-3">
            {t.features.headline} <span className="text-[#4338ca]">{t.features.headlineAccent}</span>
          </h2>
        </div>
        <p className="font-sans text-neutral-600 max-w-md text-base leading-relaxed">
          {t.features.subtitle}
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {modules.map((mod) => (
          <motion.div
            key={mod.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`luxury-card ${mod.span} rounded-2xl bg-white border border-neutral-200/60 p-8 sm:p-10 flex flex-col justify-between group/bento relative overflow-hidden shadow-xs hover:border-indigo-500/30`}
          >
            {/* Subtle hover gradient flare */}
            <div className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl transition-opacity duration-700 opacity-0 group-hover/bento:opacity-100" aria-hidden="true" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[#4338ca] transition-colors duration-300 group-hover/bento:border-[#4338ca]/20 group-hover/bento:bg-[#4338ca] group-hover/bento:text-white">
                  {React.createElement(mod.icon, { className: 'w-5 h-5' })}
                </div>
                <span className="font-mono text-[10px] font-bold text-[#171717] tracking-wider uppercase bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 transition-colors duration-300 group-hover/bento:bg-indigo-50 group-hover/bento:text-[#4338ca] group-hover/bento:border-indigo-100">
                  {mod.tag}
                </span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#171717] mb-3 group-hover:text-[#4338ca] transition-colors">
                {mod.title}
              </h3>
              <p className="font-sans text-sm text-neutral-600 leading-relaxed max-w-2xl">
                {mod.description}
              </p>

              {mod.hasVisual && (
                <div className="mt-6 w-full overflow-hidden rounded-xl border border-neutral-800/80 bg-[#0d0f15] shadow-lg">
                  <CodeTrailCard className="aspect-[16/8] sm:aspect-[21/9] w-full" />
                </div>
              )}
            </div>

            <div className="relative z-10 mt-8 flex items-center justify-between border-t border-neutral-200/50 pt-6 font-mono text-xs transition-colors duration-300 group-hover/bento:border-indigo-100">
              <span className="font-semibold text-neutral-600">// SOVEREIGN ARCHITECTURE</span>
              <div className="flex items-center gap-1 text-[#4338ca] font-bold">
                <span>{mod.stats}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Standalone Sovereign Reactive Typography Showcase */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={prefersReducedMotion ? undefined : { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 w-full"
      >
        <TextRevealCard className="aspect-[16/7] sm:aspect-[21/8] w-full" />
      </motion.div>
    </section>
  );
});

export default FeatureBento;
