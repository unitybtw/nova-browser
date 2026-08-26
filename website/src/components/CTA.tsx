import { motion, useReducedMotion } from 'framer-motion';
import { Download, Github } from 'lucide-react';

const GITHUB_URL = 'https://github.com/unitybtw/nova-browser';
const RELEASES_URL = 'https://github.com/unitybtw/nova-browser/releases/latest';

export default function CTA() {
  const reduceMotion = !!useReducedMotion();

  return (
    <section aria-labelledby="cta-heading" className="scroll-mt-24 px-6 py-28">
      <div className="glass relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-16 text-center md:py-20">
        {/* Soft interior blobs */}
        <motion.div
          aria-hidden
          className="absolute -top-24 -left-24 h-96 w-96 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
          animate={reduceMotion ? undefined : { x: [0, 36, -20, 0], y: [0, 22, -14, 0] }}
          transition={
            reduceMotion ? undefined : { duration: 15, repeat: Infinity, ease: 'easeInOut' }
          }
        />
        <motion.div
          aria-hidden
          className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
          animate={reduceMotion ? undefined : { x: [0, -28, 18, 0], y: [0, -20, 14, 0] }}
          transition={
            reduceMotion ? undefined : { duration: 18, repeat: Infinity, ease: 'easeInOut' }
          }
        />

        <div className="relative">
          <h2
            id="cta-heading"
            className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl"
          >
            Ready to browse <span className="text-gradient">at light speed?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            Free and open source, forever. Grab a release — or clone the repo and build it
            yourself.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-nova px-7 py-3.5 font-semibold text-white shadow-[0_0_40px_rgba(99,102,241,0.35)] transition-all duration-200 hover:bg-nova-deep active:scale-[0.97]"
            >
              <Download size={18} aria-hidden />
              Download Latest Release
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-semibold transition-all duration-200 hover:bg-white/[0.08] active:scale-[0.97]"
            >
              <Github size={18} aria-hidden />
              View Source on GitHub
            </a>
          </div>

          <p className="mt-6 text-sm text-faint">macOS (Apple Silicon &amp; Intel) · Windows x64</p>
        </div>
      </div>
    </section>
  );
}
