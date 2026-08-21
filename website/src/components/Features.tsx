import { motion } from 'framer-motion';
import { ShieldCheck, LayoutPanelLeft, FolderTree, Bot, Lock, Puzzle, Volume2, Sparkles, ArrowRight } from 'lucide-react';

export const Features = () => {
  const bentoItems = [
    {
      span: 'lg:col-span-8',
      icon: <Bot className="w-7 h-7 text-cyan-400" />,
      tag: 'Autonomous AI Navigation',
      title: 'Built-in MCP Server & Visual AI Agents',
      desc: 'Connect Claude, OpenAI, or local Web-LLM models to control your browser natively with visual glowing cursor feedback and autonomous multi-step execution.',
      accent: 'from-cyan-500/20 via-blue-500/10 to-transparent',
      border: 'border-cyan-500/30',
      badge: 'MCP Protocol v1.0',
    },
    {
      span: 'lg:col-span-4',
      icon: <Lock className="w-7 h-7 text-emerald-400" />,
      tag: 'Zero-Knowledge Security',
      title: '1-Click Device Pairing',
      desc: 'No passwords or emails required. Instant AES-256 E2EE chain syncing across all your laptops.',
      accent: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      border: 'border-emerald-500/30',
      badge: 'AES-256 GCM',
    },
    {
      span: 'lg:col-span-4',
      icon: <Puzzle className="w-7 h-7 text-purple-400" />,
      tag: 'Ecosystem Parity',
      title: 'Chrome Web Store 1-Click',
      desc: 'Browse chromewebstore.google.com and install extensions directly with full manifest compatibility.',
      accent: 'from-purple-500/20 via-pink-500/10 to-transparent',
      border: 'border-purple-500/30',
      badge: 'CRX3 Direct Engine',
    },
    {
      span: 'lg:col-span-4',
      icon: <LayoutPanelLeft className="w-7 h-7 text-amber-400" />,
      tag: 'Productivity Matrix',
      title: 'Dual-View Split Screen',
      desc: 'Run two interactive browser windows side-by-side with independent zoom, session history, and scroll locks.',
      accent: 'from-amber-500/20 via-orange-500/10 to-transparent',
      border: 'border-amber-500/30',
      badge: 'Multi-Tasking',
    },
    {
      span: 'lg:col-span-4',
      icon: <ShieldCheck className="w-7 h-7 text-rose-400" />,
      tag: 'Privacy Architecture',
      title: 'Shield Ad & Tracker Blocker',
      desc: 'Hardware-accelerated ad and telemetry blocker blocks intrusive ads and tracking scripts with zero latency.',
      accent: 'from-rose-500/20 via-red-500/10 to-transparent',
      border: 'border-rose-500/30',
      badge: '0 Telemetry',
    },
    {
      span: 'lg:col-span-6',
      icon: <FolderTree className="w-7 h-7 text-blue-400" />,
      tag: 'Spatial Navigation',
      title: 'Vertical Workspaces & Folders',
      desc: 'Organize personal, work, and research contexts into separate isolated workspaces with color-coded nested tab folders.',
      accent: 'from-blue-500/20 via-indigo-500/10 to-transparent',
      border: 'border-blue-500/30',
      badge: 'Infinite Workspaces',
    },
    {
      span: 'lg:col-span-6',
      icon: <Volume2 className="w-7 h-7 text-teal-400" />,
      tag: 'Reader Studio',
      title: 'Distraction-Free Reader & High-Fidelity TTS',
      desc: 'Clean markdown typography extraction powered by Mozilla Readability paired with native OS text-to-speech audio narration.',
      accent: 'from-teal-500/20 via-cyan-500/10 to-transparent',
      border: 'border-teal-500/30',
      badge: 'Native Audio Synthesis',
    },
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-primary/30 text-primary font-semibold text-xs uppercase tracking-widest mb-4"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Architecture</span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 leading-tight"
          >
            Engineered for <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-primary to-accent">
              Unmatched Power & Privacy
            </span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-foreground/70 leading-relaxed"
          >
            Everything you need in a modern web browser: native autonomous AI intelligence, zero telemetry, lightning-fast rendering, and total visual customization.
          </motion.p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
          {bentoItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className={`${item.span} glass p-7 sm:p-8 rounded-3xl border ${item.border} relative overflow-hidden group hover:shadow-2xl transition-all duration-300 flex flex-col justify-between`}
            >
              {/* Card Ambient Glow */}
              <div className={`absolute top-0 right-0 w-80 h-80 bg-gradient-to-br ${item.accent} rounded-full blur-3xl opacity-40 group-hover:opacity-75 transition-opacity pointer-events-none`} />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-13 h-13 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/15 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-[11px] font-bold font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10 text-foreground/80">
                    {item.badge}
                  </span>
                </div>

                <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">
                  {item.tag}
                </span>

                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 leading-snug">
                  {item.title}
                </h3>

                <p className="text-foreground/70 text-sm leading-relaxed mb-6">
                  {item.desc}
                </p>
              </div>

              <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                <span>Explore capability</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
