import { motion } from 'framer-motion';
import { Shield, Code, Heart, Lock } from 'lucide-react';

const badges = [
  {
    icon: <Code className="w-6 h-6 text-blue-500" />,
    title: '100% Open Source',
    desc: 'MIT License — read every line on GitHub',
    color: 'from-blue-500/10 to-blue-500/5',
    border: 'border-blue-500/20',
  },
  {
    icon: <Shield className="w-6 h-6 text-emerald-500" />,
    title: 'Zero Telemetry',
    desc: 'No analytics, no crash reports, nothing',
    color: 'from-emerald-500/10 to-emerald-500/5',
    border: 'border-emerald-500/20',
  },
  {
    icon: <Lock className="w-6 h-6 text-purple-500" />,
    title: 'No Account Needed',
    desc: 'Download and run. No sign-up ever.',
    color: 'from-purple-500/10 to-purple-500/5',
    border: 'border-purple-500/20',
  },
  {
    icon: <Heart className="w-6 h-6 text-rose-500" />,
    title: 'Community Built',
    desc: 'Shaped by users, for users',
    color: 'from-rose-500/10 to-rose-500/5',
    border: 'border-rose-500/20',
  },
];

const changelog = [
  {
    version: 'v1.2.0',
    date: 'July 2025',
    tag: 'Latest',
    tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    items: [
      'Added horizontal tab scrolling with arrow controls',
      'AI agent: sliding window memory to prevent crashes',
      'Private tab redesign with dark glass UI',
      'Animation polish across all components',
    ],
  },
  {
    version: 'v1.1.0',
    date: 'June 2025',
    tag: 'Stable',
    tagColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    items: [
      'Built-in AI assistant powered by WebGPU',
      'Split screen view for any two tabs',
      'Tab workspaces with color labels',
      'Reader mode with TTS support',
    ],
  },
  {
    version: 'v1.0.0',
    date: 'May 2025',
    tag: 'Launch',
    tagColor: 'bg-primary/10 text-primary',
    items: [
      'Initial public release',
      'Native ad blocker built-in',
      'Bookmark manager with folders',
      'Dark / Light / System theme',
    ],
  },
];

export const TrustAndChangelog = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">Open & Honest</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-2">
            You can trust us — and verify it
          </h2>
          <p className="text-foreground/60">Because trust without transparency is just a marketing claim.</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-24">
          {badges.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl bg-gradient-to-br ${b.color} border ${b.border} p-6 flex flex-col items-center text-center gap-3`}
            >
              <div className="p-3 rounded-xl bg-white/60 dark:bg-foreground/10 shadow-sm">
                {b.icon}
              </div>
              <div className="font-bold text-foreground text-sm">{b.title}</div>
              <div className="text-foreground/60 text-xs leading-relaxed">{b.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* Changelog */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">Changelog</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-2">
            Always improving
          </h2>
          <p className="text-foreground/60">We ship fast and often. Here's what's been landing.</p>
        </motion.div>

        <div className="max-w-2xl mx-auto relative">
          {/* Timeline line */}
          <div className="absolute left-[22px] top-4 bottom-4 w-px bg-border/60 hidden sm:block" />

          <div className="flex flex-col gap-8">
            {changelog.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="sm:pl-14 relative"
              >
                {/* Dot */}
                <div className="absolute left-0 top-1.5 w-[46px] h-[46px] rounded-full bg-white dark:bg-slate-800 border-2 border-primary flex items-center justify-center text-[10px] font-bold text-primary hidden sm:flex">
                  {entry.version.replace('v', '')}
                </div>

                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className="font-bold text-foreground">{entry.version}</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${entry.tagColor}`}>
                      {entry.tag}
                    </span>
                    <span className="text-xs text-foreground/40 ml-auto">{entry.date}</span>
                  </div>
                  <ul className="space-y-2">
                    {entry.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-foreground/70">
                        <span className="text-primary mt-0.5 flex-shrink-0">›</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline font-medium"
            >
              View full release history on GitHub →
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
