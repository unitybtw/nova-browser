import { motion } from 'framer-motion';
import { Brain, ShieldCheck, LayoutPanelLeft, FolderTree } from 'lucide-react';

const showcaseItems = [
  {
    badge: 'AI Assistant',
    icon: <Brain className="w-8 h-8 text-purple-500" />,
    title: 'A browser that actually thinks for you',
    description:
      'Ask your browser anything. Nova\'s built-in AI agent can navigate pages, fill forms, summarize articles, and complete multi-step tasks — all locally on your device. No cloud, no data sharing.',
    highlights: [
      'Runs 100% locally via WebGPU (no API key needed)',
      'Can click, scroll, and interact with any page',
      'Persistent memory across sessions',
      'Reads pages aloud with text-to-speech',
    ],
    color: 'from-purple-500/20 to-pink-500/20',
    accent: 'text-purple-500',
    border: 'border-purple-500/20',
    reverse: false,
  },
  {
    badge: 'Privacy Shield',
    icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />,
    title: 'Private by default, not by option',
    description:
      'Nova blocks ads, trackers, and malicious scripts at the network level before they even load. No extensions needed. No toggles to remember. Just a cleaner, faster, safer web.',
    highlights: [
      'Blocks 95%+ of known ad networks',
      'Fingerprinting protection built-in',
      'Per-site whitelist control',
      'Zero telemetry — we see nothing',
    ],
    color: 'from-emerald-500/20 to-teal-500/20',
    accent: 'text-emerald-500',
    border: 'border-emerald-500/20',
    reverse: true,
  },
  {
    badge: 'Workspaces',
    icon: <FolderTree className="w-8 h-8 text-blue-500" />,
    title: 'Your whole context, one click away',
    description:
      'Switch between work, personal, and research browsing instantly. Each workspace has its own tabs, bookmarks, and history. No more hunting through 40 open tabs.',
    highlights: [
      'Color-coded workspace labels',
      'Independent tab sessions per workspace',
      'Drag-and-drop tab organization',
      'Sync-free — everything stays local',
    ],
    color: 'from-blue-500/20 to-indigo-500/20',
    accent: 'text-blue-500',
    border: 'border-blue-500/20',
    reverse: false,
  },
  {
    badge: 'Split Screen',
    icon: <LayoutPanelLeft className="w-8 h-8 text-orange-500" />,
    title: 'Two pages, zero windows',
    description:
      'View any two tabs side-by-side in a single window. Research while you write. Code while you read the docs. Compare products without Alt+Tab.',
    highlights: [
      'Native split view — no extensions',
      'Adjustable split ratio',
      'Works with any website',
      'Keyboard shortcut support',
    ],
    color: 'from-orange-500/20 to-amber-500/20',
    accent: 'text-orange-500',
    border: 'border-orange-500/20',
    reverse: true,
  },
];

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

export const FeatureShowcase = () => {
  return (
    <section id="design" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">Deep Dive</span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-3 mb-4">
            Built different, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">on purpose</span>
          </h2>
          <p className="text-lg text-foreground/70">
            Every feature in Nova is designed to get out of your way and let you focus on what matters.
          </p>
        </motion.div>

        <div className="flex flex-col gap-28">
          {showcaseItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
              className={`flex flex-col ${item.reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`}
            >
              {/* Text Side */}
              <div className="flex-1 max-w-xl">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-5 bg-gradient-to-r ${item.color} border ${item.border}`}>
                  {item.icon && <span className={item.accent}>{item.icon}</span>}
                  <span className={item.accent}>{item.badge}</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-5 leading-snug">
                  {item.title}
                </h3>
                <p className="text-foreground/70 text-lg leading-relaxed mb-8">
                  {item.description}
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
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${item.color} border ${item.border}`}>
                        <svg className={`w-3 h-3 ${item.accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
                <div className={`relative rounded-3xl bg-gradient-to-br ${item.color} p-1 border ${item.border} shadow-2xl`}>
                  <div className="rounded-[1.4rem] glass overflow-hidden p-8 flex flex-col items-center justify-center min-h-[260px] gap-4">
                    <div className={`p-5 rounded-3xl bg-white dark:bg-foreground/10 shadow-lg`}>
                      {item.icon}
                    </div>
                    <span className="text-2xl font-bold text-foreground">{item.badge}</span>
                    <span className="text-sm text-foreground/50 text-center max-w-xs">{item.description.split('.')[0]}.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
