import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  Bot,
  Brain,
  Columns2,
  Lock,
  Puzzle,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

const gridVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'backOut' } },
};

type Feature = {
  icon: LucideIcon;
  title: string;
  copy: string;
  /** Icon chip accent classes */
  accent: string;
  className?: string;
  image?: { src: string; alt: string };
};

const FEATURES: Feature[] = [
  {
    icon: Brain,
    title: 'On-device AI Assistant',
    copy: 'Powered by WebLLM, the assistant runs entirely on your machine. Chat with any page, summarize long articles and draft replies — with zero cloud calls and zero data leaving your device.',
    accent: 'bg-nova/15 text-nova-light',
    className: 'md:col-span-2 md:row-span-2',
    image: {
      src: '/newtab.png',
      alt: 'Nova Browser new tab dashboard with quick links and the AI assistant panel',
    },
  },
  {
    icon: Bot,
    title: 'Autonomous MCP Agent',
    copy: 'Give a natural-language command and watch it execute multi-step browsing — navigating, clicking and filling forms on your behalf.',
    accent: 'bg-star/10 text-star',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy Shield',
    copy: 'Adblocking, tracker blocking and phishing protection enforced at the network layer — no extensions required.',
    accent: 'bg-nova/15 text-nova-light',
  },
  {
    icon: Lock,
    title: 'Zero-Knowledge Sync',
    copy: 'End-to-end encrypted across your devices. Keys are derived on-device and never leave it.',
    accent: 'bg-nova/15 text-nova-light',
  },
  {
    icon: Puzzle,
    title: 'Chrome Extensions',
    copy: 'Install CRX extensions straight from the Chrome Web Store — your favorite tools just work.',
    accent: 'bg-star/10 text-star',
  },
  {
    icon: Columns2,
    title: 'Workspaces & Split View',
    copy: 'Separate workspaces for every context, side-by-side browsing and tab hibernation to stay fast.',
    accent: 'bg-nova/15 text-nova-light',
  },
];

export default function FeaturesBento() {
  const reduceMotion = !!useReducedMotion();

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-24 px-6 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-nova-light">
            Features
          </p>
          <h2
            id="features-heading"
            className="mt-3 text-3xl font-bold tracking-tight md:text-5xl"
          >
            Everything a modern browser should do. Built in.
          </h2>
          <p className="mt-4 text-muted">
            No extension scavenger hunt, no privacy add-ons — the essentials ship in the box.
          </p>
        </header>

        <motion.div
          variants={gridVariants}
          initial={reduceMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-14 grid grid-cols-1 auto-rows-[minmax(180px,auto)] gap-4 md:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <motion.article
              key={feature.title}
              variants={cardVariants}
              className={`glass flex flex-col rounded-2xl p-6 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] ${
                feature.className ?? ''
              }`}
            >
              <div className={`flex h-fit w-fit rounded-xl p-3 ${feature.accent}`}>
                <feature.icon size={22} aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{feature.copy}</p>
              {feature.image && (
                <img
                  src={feature.image.src}
                  alt={feature.image.alt}
                  loading="lazy"
                  className="mt-6 aspect-[16/10] w-full rounded-xl object-cover object-top ring-1 ring-white/10"
                />
              )}
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
