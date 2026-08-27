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
    <section className="py-20 px-6 max-w-7xl mx-auto border-t border-[#e5e5e5]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PILLARS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="p-6 sm:p-7 rounded-2xl bg-white border border-[#e5e5e5] shadow-xs flex flex-col justify-between hover:border-neutral-400 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="p-2.5 rounded-xl bg-neutral-100 text-[#4338ca] border border-neutral-200/60">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
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
