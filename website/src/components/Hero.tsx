import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Sparkles, Terminal } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen w-full flex flex-col justify-between items-center overflow-hidden bg-[#171717] text-[#fcfbf9] pt-28 pb-0">
      {/* 30s Ambient Mesh Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="animate-mesh absolute top-[-20%] left-[-10%] w-[120vw] h-[120vw] rounded-full bg-gradient-to-tr from-indigo-900/40 via-purple-900/30 to-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-gradient-to-br from-indigo-700/30 via-indigo-950/20 to-purple-800/30 blur-[140px]" />
      </div>

      {/* Grid line overlay for technical depth */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Main Hero Copy Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center flex-1 flex flex-col justify-center items-center my-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono-tracked text-[10px] text-indigo-200">
            Organic Intelligence Architecture
          </span>
        </motion.div>

        {/* 11vw - 14vw Grand Display Serif Headline with Leading [0.85] */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="font-display font-normal text-[11vw] sm:text-[10vw] lg:text-[8.5vw] tracking-[-0.03em] leading-[0.88] max-w-6xl text-white select-none"
        >
          Thought at the <br />
          <span className="italic font-normal bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            Speed of Thought.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
          className="font-body text-base sm:text-lg md:text-xl text-neutral-400 max-w-2xl mt-8 font-normal leading-relaxed"
        >
          Nova is an editorial-grade, open-source browser engineered with on-device autonomous AI agents, zero-knowledge sync, and zero-compromise privacy.
        </motion.p>

        {/* Meta badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
          className="flex flex-wrap items-center justify-center gap-6 mt-8 text-neutral-400 text-xs font-mono"
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>LOCAL WEBGPU MODELS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>AES-256-GCM ZERO-KNOWLEDGE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>SUB-MS ADBLOCK ENGINE</span>
          </div>
        </motion.div>
      </div>

      {/* Signature Concave Wave Bridge Container */}
      <div className="relative w-full h-[26vh] min-h-[160px] overflow-hidden flex justify-center items-end mt-12">
        {/* Concave Curve Div */}
        <div
          className="absolute w-[140%] sm:w-[125%] h-[240%] bg-[#fcfbf9] left-[-20%] sm:left-[-12.5%] bottom-[-140%] shadow-2xl transition-all duration-700"
          style={{
            borderRadius: '50% 50% 0 0',
          }}
        />

        {/* Primary Action Button placed right at the Crest */}
        <div className="relative z-20 mb-8 sm:mb-12 flex flex-col items-center">
          <a
            href="#download"
            className="animate-button-pulse inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#171717] text-[#fcfbf9] font-medium text-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#4338ca] shadow-xl group cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors" />
            <span className="font-mono-tracked text-xs font-bold tracking-widest">
              INITIALIZE NOVA
            </span>
            <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
