import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Check } from 'lucide-react';

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* Typing-style reveal: each transcript line fades in sequence */
const transcriptFlow: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.45, delayChildren: 0.4 } },
};

const lineReveal: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EXPO } },
};

const BULLETS = [
  'Step-by-step approval — nothing runs without your sign-off',
  'Local-first tool execution on your own machine',
  'Works with any MCP-compatible client',
];

const TRANSCRIPT = [
  { text: 'planning · 3 steps queued', bright: false },
  { text: 'step 1/3 — extracting page content', bright: false },
  { text: 'step 2/3 — generating summary', bright: false },
  { text: 'step 3/3 — saving to reading list', bright: false },
  { text: 'done — “Understanding WebLLM” saved to Reading List', bright: true },
];

export default function AgentSection() {
  const reduceMotion = !!useReducedMotion();

  return (
    <section id="agent" aria-labelledby="agent-heading" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        {/* Copy */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-nova-light">
            Model Context Protocol
          </p>
          <h2
            id="agent-heading"
            className="mt-3 text-3xl font-bold tracking-tight md:text-5xl"
          >
            An agent that browses for you.
          </h2>
          <p className="mt-5 leading-relaxed text-muted">
            Type what you want — “find the cheapest flights to Berlin and open the top three”
            — and the MCP-powered agent plans the steps, then executes clicks, tabs and forms
            on your behalf. You watch every move and approve each one.
          </p>
          <ul className="mt-7 space-y-3.5">
            {BULLETS.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <Check size={18} aria-hidden className="mt-0.5 shrink-0 text-star" />
                <span className="text-sm text-muted">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Terminal mock */}
        <motion.div
          variants={transcriptFlow}
          initial={reduceMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="glass overflow-hidden rounded-2xl shadow-2xl"
        >
          <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden />
            <span className="ml-2 font-mono text-xs text-faint">nova — agent session</span>
          </div>
          <div className="space-y-3 p-5 font-mono sm:p-6">
            <motion.p variants={lineReveal} className="text-sm text-star">
              &gt; summarize this page and save it to my reading list
            </motion.p>
            {TRANSCRIPT.map((entry) => (
              <motion.p
                key={entry.text}
                variants={lineReveal}
                className={entry.bright ? 'text-xs text-foreground' : 'text-xs text-muted'}
              >
                {entry.text}
              </motion.p>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
