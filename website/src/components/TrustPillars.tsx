import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Cpu, Code2 } from 'lucide-react';

const PILLARS = [
  {
    icon: ShieldCheck,
    tag: 'PRIVACY AUDIT',
    title: 'Zero Telemetry & Offline Core',
    description:
      'Zero background pings, analytics trackers, or user telemetry. All network traffic originates strictly from user requests.',
    stat: '0 KB Sent',
  },
  {
    icon: Cpu,
    tag: 'LOCAL HARDWARE',
    title: 'On-Device WebGPU Inference',
    description:
      'Autonomous intelligence agents run locally via client-side WebGPU compute shaders without transmitting prompts to external servers.',
    stat: '100% On-Device',
  },
  {
    icon: Code2,
    tag: 'OPEN ARCHITECTURE',
    title: 'MIT Licensed & Auditable',
    description:
      'Every line of Electron, Chromium, and IPC handler code is publicly accessible, auditable, and forkable on GitHub.',
    stat: 'Open Source',
  },
  {
    icon: Lock,
    tag: 'SECURE SANDBOX',
    title: 'Zero-Knowledge Key Vault',
    description:
      'Passwords, cookies, and local database records are encrypted with AES-256-GCM using hardware-backed OS keychain primitives.',
    stat: 'AES-256-GCM',
  },
];

export const TrustPillars: React.FC = () => {
  return (
    <section className="mx-auto max-w-7xl border-t border-[#e5e5e5] px-4 py-20 sm:px-6 lg:py-24">
      <div className="mb-10 flex flex-col gap-3 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#4338ca]">Built on your side</span>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-extrabold tracking-tight text-[#171717] sm:text-4xl">Privacy is the product.</h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-neutral-600 sm:text-right">A browser should make your device more capable—not make your personal context someone else’s dataset.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col justify-between rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-xs transition-colors hover:border-neutral-400 sm:p-7"
            >
              <div>
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 mb-5">
                  <div className="p-2.5 rounded-xl bg-neutral-100 text-[#4338ca] border border-neutral-200/60">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="max-w-[58%] text-right font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {item.tag}
                  </span>
                </div>

                <h3 className="font-display font-bold text-lg text-[#171717] mb-2 leading-snug">
                  {item.title}
                </h3>
                <p className="font-sans text-xs text-neutral-600 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between font-mono text-[11px]">
                <span className="text-neutral-400">Standard:</span>
                <span className="text-[#4338ca] font-bold">{item.stat}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default TrustPillars;
