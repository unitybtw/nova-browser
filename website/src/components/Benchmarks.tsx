import React from 'react';
import { motion } from 'framer-motion';
import { HardDrive, Zap, Gauge } from 'lucide-react';

export const Benchmarks: React.FC = () => {
  return (
    <section id="benchmarks" className="py-32 px-6 max-w-7xl mx-auto border-t border-[#e5e5e5]">
      <div className="text-center max-w-3xl mx-auto mb-20">
        <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
          EMPIRICAL BENCHMARKS
        </span>
        <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#171717] tracking-tight mt-3">
          Measured <span className="italic">Efficiency</span>.
        </h2>
        <p className="font-sans text-neutral-600 mt-4 text-base sm:text-lg leading-relaxed">
          Rigorous memory and CPU utilization benchmarks conducted on macOS Apple Silicon systems.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Metric 1: RAM */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="p-8 rounded-2xl bg-white border border-[#e5e5e5] shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-[#4338ca]">
                <HardDrive className="w-5 h-5" />
              </div>
              <span className="font-mono text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                -60% Less RAM
              </span>
            </div>

            <span className="font-mono text-[10px] text-neutral-400 block mb-1 uppercase tracking-wider">
              20 TABS WITH HIBERNATION
            </span>
            <div className="font-serif text-4xl font-bold text-[#171717] mb-4">
              ~420 <span className="text-xl font-normal text-neutral-400 font-sans">MB</span>
            </div>

            <p className="font-sans text-xs text-neutral-600 leading-relaxed">
              Background Webviews are gracefully suspended and unmounted from RAM without losing history.
            </p>
          </div>

          <div className="mt-8 space-y-2 pt-6 border-t border-[#e5e5e5]/60">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-neutral-500 font-semibold">Nova Browser</span>
              <span className="text-[#4338ca] font-bold">420 MB</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="w-[30%] h-full bg-[#4338ca] rounded-full" />
            </div>

            <div className="flex justify-between text-xs font-mono pt-1">
              <span className="text-neutral-500">Google Chrome</span>
              <span className="text-neutral-600">1,100 MB</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="w-[85%] h-full bg-neutral-300 rounded-full" />
            </div>

            <div className="flex justify-between text-xs font-mono pt-1">
              <span className="text-neutral-500">Arc Browser</span>
              <span className="text-neutral-600">1,400 MB</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="w-[100%] h-full bg-neutral-300 rounded-full" />
            </div>
          </div>
        </motion.div>

        {/* Metric 2: Cold Startup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="p-8 rounded-2xl bg-white border border-[#e5e5e5] shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
                <Zap className="w-5 h-5" />
              </div>
              <span className="font-mono text-[10px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                Ultra-Fast Paint
              </span>
            </div>

            <span className="font-mono text-[10px] text-neutral-400 block mb-1 uppercase tracking-wider">
              COLD START TO FIRST PAINT
            </span>
            <div className="font-serif text-4xl font-bold text-[#171717] mb-4">
              ~380 <span className="text-xl font-normal text-neutral-400 font-sans">ms</span>
            </div>

            <p className="font-sans text-xs text-neutral-600 leading-relaxed">
              Non-blocking deferred CSS font loading and streamlined Electron initialization pipeline.
            </p>
          </div>

          <div className="mt-8 space-y-2 pt-6 border-t border-[#e5e5e5]/60">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-neutral-500 font-semibold">Nova Browser</span>
              <span className="text-purple-700 font-bold">380 ms</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="w-[45%] h-full bg-purple-700 rounded-full" />
            </div>

            <div className="flex justify-between text-xs font-mono pt-1">
              <span className="text-neutral-500">Google Chrome</span>
              <span className="text-neutral-600">450 ms</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="w-[55%] h-full bg-neutral-300 rounded-full" />
            </div>

            <div className="flex justify-between text-xs font-mono pt-1">
              <span className="text-neutral-500">Arc Browser</span>
              <span className="text-neutral-600">850 ms</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="w-[95%] h-full bg-neutral-300 rounded-full" />
            </div>
          </div>
        </motion.div>

        {/* Metric 3: Search Latency */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="p-8 rounded-2xl bg-white border border-[#e5e5e5] shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Gauge className="w-5 h-5" />
              </div>
              <span className="font-mono text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                0ms LRU Cache
              </span>
            </div>

            <span className="font-mono text-[10px] text-neutral-400 block mb-1 uppercase tracking-wider">
              OMNIBOX SUGGESTION LATENCY
            </span>
            <div className="font-serif text-4xl font-bold text-[#171717] mb-4">
              0 <span className="text-xl font-normal text-neutral-400 font-sans">ms / 35 ms</span>
            </div>

            <p className="font-sans text-xs text-neutral-600 leading-relaxed">
              Cached results render synchronously on keystroke; network queries use staggered fallback promises.
            </p>
          </div>

          <div className="mt-8 space-y-2 pt-6 border-t border-[#e5e5e5]/60">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-neutral-500 font-semibold">Nova Browser</span>
              <span className="text-blue-600 font-bold">0-35 ms</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="w-[20%] h-full bg-blue-600 rounded-full" />
            </div>

            <div className="flex justify-between text-xs font-mono pt-1">
              <span className="text-neutral-500">Google Chrome</span>
              <span className="text-neutral-600">65 ms</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="w-[60%] h-full bg-neutral-300 rounded-full" />
            </div>

            <div className="flex justify-between text-xs font-mono pt-1">
              <span className="text-neutral-500">Arc Browser</span>
              <span className="text-neutral-600">120 ms</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="w-[90%] h-full bg-neutral-300 rounded-full" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Benchmarks;
