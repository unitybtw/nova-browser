import { motion, useReducedMotion } from 'framer-motion';
import { EyeOff, Lock, ShieldCheck, type LucideIcon } from 'lucide-react';

const ROWS: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: Lock,
    title: 'Zero-knowledge vault',
    copy: 'Servers store ciphertext only — reading your data is mathematically impossible for them.',
  },
  {
    icon: EyeOff,
    title: 'No telemetry, no tracking',
    copy: 'Nova never phones home. No analytics, no behavioral profiles, nothing.',
  },
  {
    icon: ShieldCheck,
    title: 'Phishing domain blocking',
    copy: 'Known malicious domains are blocked before a page ever loads.',
  },
];

export default function SecuritySection() {
  const reduceMotion = !!useReducedMotion();

  return (
    <section
      id="security"
      aria-labelledby="security-heading"
      className="scroll-mt-24 px-6 py-24"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        {/* Visual (mirrored: left on desktop, after copy on mobile) */}
        <div className="relative lg:order-1">
          <motion.div
            aria-hidden
            className="absolute -top-16 -left-16 h-72 w-72 rounded-full opacity-15 blur-3xl"
            style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
            animate={reduceMotion ? undefined : { x: [0, 24, -14, 0], y: [0, -18, 12, 0] }}
            transition={
              reduceMotion ? undefined : { duration: 14, repeat: Infinity, ease: 'easeInOut' }
            }
          />
          <motion.div
            aria-hidden
            className="absolute -right-16 -bottom-16 h-72 w-72 rounded-full opacity-15 blur-3xl"
            style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
            animate={reduceMotion ? undefined : { x: [0, -20, 16, 0], y: [0, 16, -12, 0] }}
            transition={
              reduceMotion ? undefined : { duration: 17, repeat: Infinity, ease: 'easeInOut' }
            }
          />
          <div className="glass relative rounded-2xl p-2 shadow-2xl ring-1 ring-white/10">
            <img
              src="/sync.png"
              width={2880}
              height={1800}
              loading="lazy"
              alt="Nova Sync diagram showing end-to-end encrypted payloads traveling between devices"
              className="h-auto w-full rounded-xl object-cover"
            />
          </div>
        </div>

        {/* Copy */}
        <div className="lg:order-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-nova-light">
            Privacy by architecture
          </p>
          <h2
            id="security-heading"
            className="mt-3 text-3xl font-bold tracking-tight md:text-5xl"
          >
            Your data never leaves your device.
          </h2>
          <p className="mt-5 leading-relaxed text-muted">
            Sync payloads are sealed with AES-GCM envelope encryption before they ever touch a
            server. Your key is derived from your password on-device with PBKDF2 — it never
            leaves your machine, so nobody else can ever hold it.
          </p>
          <ul className="mt-8 space-y-5">
            {ROWS.map((row) => (
              <li key={row.title} className="flex items-start gap-4">
                <div className="flex h-fit w-fit shrink-0 rounded-xl bg-nova/15 p-2.5 text-nova-light">
                  <row.icon size={18} aria-hidden />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight">{row.title}</h3>
                  <p className="mt-1 text-sm text-muted">{row.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
