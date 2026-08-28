import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Download, Github } from 'lucide-react';
import BrowserDemo from './BrowserDemo';

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-28 md:pt-36 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#4338ca]/20 bg-[#4338ca]/5 font-mono text-[11px] font-semibold text-[#4338ca] uppercase tracking-wider mb-6"
      >
        <span className="w-2 h-2 rounded-full bg-[#4338ca]" />
        <span>Next-Generation Sovereign Web Browser</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        className="font-display font-black text-5xl sm:text-7xl lg:text-8xl tracking-tight text-[#171717] max-w-5xl leading-[1.05]"
      >
        Thought at the Speed of{' '}
        <span className="bg-gradient-to-r from-[#4338ca] to-cyan-500 bg-clip-text text-transparent">Thought.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 text-lg sm:text-xl text-[#525252] max-w-2xl font-sans font-normal leading-relaxed"
      >
        On-device WebGPU AI, Model Context Protocol server, native ad blocking, and sub-millisecond tab allocation built on Electron & Chromium.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 flex flex-wrap items-center justify-center gap-4 select-none"
      >
        <a
          href="#download"
          className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-[#171717] text-white font-mono text-sm uppercase tracking-wider font-semibold shadow-lg hover:bg-black hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <Download className="w-4 h-4" />
          <span>Download for macOS & Windows</span>
        </a>

        <a
          href="https://github.com/unitybtw/nova-browser"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white border border-[#e5e5e5] text-[#171717] font-mono text-sm uppercase tracking-wider font-semibold hover:border-black hover:bg-neutral-50 transition-all duration-200 shadow-sm"
        >
          <Github className="w-4 h-4" />
          <span>Star on GitHub</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#737373]" />
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.95, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-6xl mx-auto mt-14 text-left"
      >
        <BrowserDemo />
      </motion.div>
    </section>
  );
};

export default Hero;
