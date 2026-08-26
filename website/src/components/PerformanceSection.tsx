import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Gauge, Moon, Zap, type LucideIcon } from 'lucide-react';

const gridVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'backOut' } },
};

const CARDS: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: Moon,
    title: 'Tab Hibernation',
    copy: 'Inactive tabs fall asleep and hand their memory back to the system — waking instantly the moment you return.',
  },
  {
    icon: Zap,
    title: 'Lazy Everything',
    copy: 'The AI model, reader mode and heavy panels load only on demand. You never pay for what you don’t use.',
  },
  {
    icon: Gauge,
    title: 'GPU-Accelerated',
    copy: 'Hardware-accelerated rendering through Chromium and Electron keeps scrolling and video buttery smooth.',
  },
];

export default function PerformanceSection() {
  const reduceMotion = !!useReducedMotion();

  return (
    <section
      id="performance"
      aria-labelledby="performance-heading"
      className="scroll-mt-24 px-6 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-nova-light">
            Engineered to stay light
          </p>
          <h2
            id="performance-heading"
            className="mt-3 text-3xl font-bold tracking-tight md:text-5xl"
          >
            Fast by design, not by benchmarks.
          </h2>
          <p className="mt-4 text-muted">
            Architecture choices that keep Nova quick — measured by how it feels, not by
            marketing charts.
          </p>
        </header>

        <motion.div
          variants={gridVariants}
          initial={reduceMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-14 grid gap-4 md:grid-cols-3"
        >
          {CARDS.map((card) => (
            <motion.article
              key={card.title}
              variants={cardVariants}
              className="glass rounded-2xl p-6 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="flex h-fit w-fit rounded-xl bg-nova/15 p-3 text-nova-light">
                <card.icon size={22} aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{card.copy}</p>
            </motion.article>
          ))}
        </motion.div>

        {/* Memory strip — live illustration of hibernation freeing memory */}
        <div className="glass mt-4 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-faint">
              Memory footprint
            </span>
            <span className="text-xs text-muted sm:text-sm">idle tabs hibernated</span>
          </div>
          <div
            className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-white/5"
            aria-hidden
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-nova-deep via-nova-light to-nova-deep bg-[length:200%_100%]"
              style={{ width: '62%' }}
              animate={
                reduceMotion
                  ? undefined
                  : {
                      width: ['90%', '35%', '90%'],
                      backgroundPosition: ['0% 0%', '200% 0%', '0% 0%'],
                    }
              }
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
              }
            />
          </div>
          <p className="mt-3 text-xs text-faint">
            Live illustration — hibernation hands memory back to the system until you need
            those tabs again.
          </p>
        </div>
      </div>
    </section>
  );
}
