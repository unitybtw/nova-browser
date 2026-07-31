import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'Is Nova Browser really free?',
    a: 'Yes, completely. Nova is open source under the MIT license. There are no premium tiers, subscriptions, or hidden costs. You can even fork and build your own version.',
  },
  {
    q: 'Is it based on Chromium?',
    a: 'Nova is built on Electron, which uses Chromium under the hood. This means full compatibility with modern web standards and great performance. However, unlike Chrome, we strip out all Google tracking and telemetry.',
  },
  {
    q: 'Does Nova collect any data about me?',
    a: 'Absolutely not. Nova has zero telemetry. We don\'t collect crash reports, usage analytics, or any personal data. Everything stays on your machine. You can verify this by reading our open source code.',
  },
  {
    q: 'How does the built-in AI work?',
    a: 'Nova\'s AI runs entirely locally on your device using WebGPU. It downloads the model once and then operates completely offline. No API keys, no cloud processing, no data sent anywhere.',
  },
  {
    q: 'Can I import my bookmarks and history from Chrome or Firefox?',
    a: 'Yes! Nova supports importing bookmarks from any browser that can export a standard HTML bookmarks file. Go to Settings → Import to get started.',
  },
  {
    q: 'Does Nova support Chrome extensions?',
    a: 'Nova has basic extension support. Since it\'s built on Electron/Chromium, many Chrome extensions can be loaded manually. Native extension store support is on our roadmap.',
  },
  {
    q: 'What platforms does Nova support?',
    a: 'Currently macOS (Apple Silicon & Intel) and Windows. Linux support is planned for a future release.',
  },
  {
    q: 'How do I contribute or report a bug?',
    a: 'Head over to our GitHub repository at github.com/unitybtw/nova-browser. We welcome pull requests, bug reports, and feature suggestions. Check the CONTRIBUTING.md file to get started.',
  },
];

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      className="border border-border/60 rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 text-left gap-4 hover:bg-foreground/5 transition-colors"
      >
        <span className="font-semibold text-foreground">{faq.q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="flex-shrink-0 text-foreground/50"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="px-6 pb-6 text-foreground/70 leading-relaxed text-sm border-t border-border/40 pt-4">
              {faq.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const FAQ = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">FAQ</span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-3 mb-4">
            Frequently asked questions
          </h2>
          <p className="text-lg text-foreground/70">
            Everything you need to know before switching. Can't find the answer? Ask us on{' '}
            <a href="https://github.com/unitybtw/nova-browser/discussions" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              GitHub Discussions
            </a>.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};
