import { motion } from 'framer-motion';
import { Brain, ShieldCheck, LayoutPanelLeft, FolderTree } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

export const FeatureShowcase = () => {
  const { t } = useLang();

  // Define static styles/icons mapped to translation items
  const showcaseConfigs = [
    {
      icon: <Brain className="w-8 h-8 text-purple-500" />,
      color: 'from-purple-500/20 to-pink-500/20',
      accent: 'text-purple-500',
      border: 'border-purple-500/20',
      reverse: false,
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />,
      color: 'from-emerald-500/20 to-teal-500/20',
      accent: 'text-emerald-500',
      border: 'border-emerald-500/20',
      reverse: true,
    },
    {
      icon: <FolderTree className="w-8 h-8 text-blue-500" />,
      color: 'from-blue-500/20 to-indigo-500/20',
      accent: 'text-blue-500',
      border: 'border-blue-500/20',
      reverse: false,
    },
    {
      icon: <LayoutPanelLeft className="w-8 h-8 text-orange-500" />,
      color: 'from-orange-500/20 to-amber-500/20',
      accent: 'text-orange-500',
      border: 'border-orange-500/20',
      reverse: true,
    },
  ];

  return (
    <section id="design" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">{t.showcase.badge}</span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-3 mb-4">
            {t.showcase.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{t.showcase.titleAccent}</span>
          </h2>
          <p className="text-lg text-foreground/70">
            {t.showcase.sub}
          </p>
        </motion.div>

        <div className="flex flex-col gap-28">
          {t.showcase.items.map((item, index) => {
            const config = showcaseConfigs[index];
            if (!config) return null;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6 }}
                className={`flex flex-col ${config.reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`}
              >
                {/* Text Side */}
                <div className="flex-1 max-w-xl">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-5 bg-gradient-to-r ${config.color} border ${config.border}`}>
                    <span className={config.accent}>{config.icon}</span>
                    <span className={config.accent}>{item.badge}</span>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-5 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-foreground/70 text-lg leading-relaxed mb-8">
                    {item.desc}
                  </p>
                  <motion.ul
                    variants={listVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="space-y-3"
                  >
                    {item.highlights.map((h, i) => (
                      <motion.li key={i} variants={itemVariants} className="flex items-center gap-3 text-foreground/80">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${config.color} border ${config.border}`}>
                          <svg className={`w-3 h-3 ${config.accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        {h}
                      </motion.li>
                    ))}
                  </motion.ul>
                </div>

                {/* Visual Side */}
                <div className="flex-1 w-full max-w-lg">
                  <div className={`relative rounded-3xl bg-gradient-to-br ${config.color} p-1 border ${config.border} shadow-2xl`}>
                    <div className="rounded-[1.4rem] glass overflow-hidden p-8 flex flex-col items-center justify-center min-h-[260px] gap-4">
                      <div className="p-5 rounded-3xl bg-white dark:bg-foreground/10 shadow-lg">
                        {config.icon}
                      </div>
                      <span className="text-2xl font-bold text-foreground">{item.badge}</span>
                      <span className="text-sm text-foreground/50 text-center max-w-xs">{item.desc.split('.')[0]}.</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
