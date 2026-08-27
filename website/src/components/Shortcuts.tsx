import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Command, Sparkles, Split, Globe, Moon, Terminal } from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  title: string;
  description: string;
  category: string;
  icon: React.ElementType;
}

const SHORTCUTS: ShortcutItem[] = [
  {
    keys: ['⌘', 'K'],
    title: 'Neural Omnibar & AI Dispatch',
    description: 'Instantly summon the command palette to search, navigate, or delegate autonomous agent workflows.',
    category: 'INTELLIGENCE',
    icon: Sparkles,
  },
  {
    keys: ['⌘', '\\'],
    title: 'Instant Dual Split Canvas',
    description: 'Split the active workspace into two synchronized live webviews side-by-side.',
    category: 'WORKFLOW',
    icon: Split,
  },
  {
    keys: ['⌘', 'D'],
    title: 'Zero-Latency Page Translation',
    description: 'Translate the active page into your target language in-place via local batch dictionaries.',
    category: 'ENGINE',
    icon: Globe,
  },
  {
    keys: ['⌘', '⇧', 'H'],
    title: 'Deep Tab Hibernation',
    description: 'Instantly purge dormant tab render processes from memory without closing your tabs.',
    category: 'PERFORMANCE',
    icon: Moon,
  },
  {
    keys: ['⌘', 'T'],
    title: 'New Neural Research Tab',
    description: 'Open a clean, zero-telemetry new tab with integrated local AI synthesis.',
    category: 'NAVIGATION',
    icon: Command,
  },
  {
    keys: ['⌘', '⇧', 'M'],
    title: 'Local MCP Agent Bridge',
    description: 'Access connected Model Context Protocol local servers and development tools.',
    category: 'DEVELOPER',
    icon: Terminal,
  },
];

export const Shortcuts: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const categories = ['ALL', 'INTELLIGENCE', 'WORKFLOW', 'ENGINE', 'PERFORMANCE', 'DEVELOPER'];

  const filteredShortcuts = activeCategory === 'ALL'
    ? SHORTCUTS
    : SHORTCUTS.filter((s) => s.category === activeCategory);

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto border-t border-[#e5e5e5]">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
            POWER-USER WORKFLOW
          </span>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-[#171717] tracking-tight mt-3">
            Engineered for <span className="text-[#4338ca]">Velocity</span>.
          </h2>
        </div>
        <p className="font-sans text-neutral-600 max-w-md text-sm leading-relaxed">
          Fluid keyboard-first navigation designed to keep your hands on the home row without context switching.
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-semibold cursor-pointer transition-all duration-200 ${
              activeCategory === cat
                ? 'bg-[#171717] text-[#fcfbf9]'
                : 'bg-white border border-[#e5e5e5] text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Shortcuts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredShortcuts.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className="p-6 rounded-2xl bg-white border border-[#e5e5e5] shadow-xs flex flex-col justify-between hover:border-neutral-400 transition-colors"
            >
              <div>
                {/* Keys Row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    {item.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-300/80 font-mono text-xs font-bold text-neutral-800 shadow-xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                  <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-[#4338ca] shrink-0" />
                  <h3 className="font-display font-bold text-base text-[#171717]">
                    {item.title}
                  </h3>
                </div>

                <p className="font-sans text-xs text-neutral-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default Shortcuts;
