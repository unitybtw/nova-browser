import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Download, Github, Sparkles } from 'lucide-react';

const GITHUB_URL = 'https://github.com/unitybtw/nova-browser';
const RELEASES_URL = 'https://github.com/unitybtw/nova-browser/releases/latest';

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const stack: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EXPO } },
};

/* Product frame: rises with a slight perspective tilt that flattens on hover */
const frame: Variants = {
  hidden: { opacity: 0, y: 48, rotateX: 12 },
  visible: { opacity: 1, y: 0, rotateX: 6, transition: { duration: 0.6, ease: EXPO } },
};

export default function Hero() {
  const reduceMotion = !!useReducedMotion();
  const initialState = reduceMotion ? ('visible' as const) : ('hidden' as const);

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden pt-36 pb-20"
    >
      {/* Faint top glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% -10%, rgba(99, 102, 241, 0.14), transparent 70%)',
        }}
      />

      <motion.div
        variants={stack}
        initial={initialState}
        animate="visible"
        className="relative mx-auto max-w-6xl px-6 text-center"
      >
        {/* Status pill */}
        <motion.div
          variants={rise}
          className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-star"
        >
          <Sparkles size={14} aria-hidden />
          Free &amp; Open Source
        </motion.div>

        <motion.h1
          id="hero-heading"
          variants={rise}
          className="mx-auto mt-6 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
        >
          The browser that <span className="text-gradient">thinks with you.</span>
        </motion.h1>

        <motion.p
          variants={rise}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted md:text-xl"
        >
          On-device AI assistant, an autonomous agent that drives the browser for you,
          zero-knowledge encrypted sync and a built-in privacy shield — without sending your
          data anywhere.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={rise}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-nova px-7 py-3.5 font-semibold text-white shadow-[0_0_40px_rgba(99,102,241,0.35)] transition-all duration-200 hover:bg-nova-deep active:scale-[0.97]"
          >
            <Download size={18} aria-hidden />
            Download for macOS
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-semibold transition-all duration-200 hover:bg-white/[0.08] active:scale-[0.97]"
          >
            <Github size={18} aria-hidden />
            Star on GitHub
          </a>
        </motion.div>

        <motion.p variants={rise} className="mt-5 text-sm text-faint">
          Also available for Windows · electron + react · MIT licensed
        </motion.p>

        {/* Product visual */}
        <div className="relative mx-auto mt-16 max-w-5xl [perspective:1400px]">
          {/* Ambient light blobs */}
          <motion.div
            aria-hidden
            className="absolute -top-24 -left-28 h-80 w-80 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
            animate={reduceMotion ? undefined : { x: [0, 42, -18, 0], y: [0, 26, -12, 0] }}
            transition={
              reduceMotion ? undefined : { duration: 16, repeat: Infinity, ease: 'easeInOut' }
            }
          />
          <motion.div
            aria-hidden
            className="absolute -right-28 -bottom-28 h-80 w-80 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
            animate={reduceMotion ? undefined : { x: [0, -34, 22, 0], y: [0, -22, 16, 0] }}
            transition={
              reduceMotion ? undefined : { duration: 18, repeat: Infinity, ease: 'easeInOut' }
            }
          />

          <motion.div
            variants={frame}
            whileHover={reduceMotion ? undefined : { rotateX: 0, y: -6 }}
            className="glass relative overflow-hidden rounded-2xl p-2 shadow-2xl ring-1 ring-white/10"
          >
            <img
              src="/preview.png"
              width={2880}
              height={1800}
              alt="Nova Browser running on macOS with the on-device AI assistant panel open beside a web page"
              className="h-auto w-full rounded-xl object-cover"
            />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
