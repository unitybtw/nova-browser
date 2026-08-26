import React from 'react';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { HardDrive, Zap, ShieldCheck, Cpu } from 'lucide-react';

interface MetricBarProps {
  value: number;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  showToolTip?: boolean;
  tooltipText?: string;
  delay?: number;
}

const BarChart: React.FC<MetricBarProps> = ({
  value,
  label,
  sublabel,
  icon,
  className = '',
  showToolTip = false,
  tooltipText = 'OPTIMIZED',
  delay = 0,
}) => {
  return (
    <div className="group relative h-full w-full flex flex-col justify-end">
      {/* Candy pattern container */}
      <div className="candy-bg relative h-full w-full overflow-hidden rounded-[36px] border border-white/10 flex flex-col justify-end">
        <motion.div
          initial={{ opacity: 0, height: '0%' }}
          whileInView={{ opacity: 1, height: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, type: 'spring', damping: 20, delay }}
          className={cn(
            'absolute bottom-0 w-full rounded-[36px] bg-gradient-to-t from-indigo-900 to-indigo-600 p-4 text-white flex flex-col justify-between items-center shadow-xl',
            className
          )}
        >
          <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md mb-2">
            {React.createElement(icon, { className: 'w-4 h-4 text-white' })}
          </div>

          <div className="relative flex h-14 w-full items-center justify-center rounded-2xl bg-black/20 backdrop-blur-md font-mono font-bold text-xl sm:text-2xl tracking-tighter">
            <NumberFlow value={value} suffix="%" />
          </div>
        </motion.div>
      </div>

      {/* Floating Tooltip Indicator */}
      <motion.div
        initial={{ opacity: 0, height: '0%' }}
        whileInView={{ opacity: 1, height: `${value}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, type: 'spring', damping: 15, delay }}
        className="absolute bottom-0 w-full pointer-events-none"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: showToolTip ? 1 : 0, y: showToolTip ? 0 : 20 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, type: 'spring', damping: 15, delay: delay + 0.4 }}
          className={cn(
            'absolute -top-10 left-1/2 -translate-x-1/2 rounded-xl bg-indigo-500 px-3 py-1 text-white font-mono text-[10px] uppercase font-bold tracking-wider shadow-lg whitespace-nowrap',
            className.includes('bg-emerald') ? 'bg-emerald-500' : ''
          )}
        >
          <div
            className={cn(
              'absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rotate-45',
              className.includes('bg-emerald') ? 'bg-emerald-500' : ''
            )}
          />
          {tooltipText}
        </motion.div>
      </motion.div>

      {/* Labels below chart bar */}
      <div className="mt-4 text-center">
        <p className="font-mono text-xs font-bold text-white uppercase tracking-wider">{label}</p>
        <p className="font-body text-[11px] text-slate-400 mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
};

export const StatisticsBenchmark: React.FC = () => {
  const stats = [
    {
      value: 60,
      label: 'RAM Reduction',
      sublabel: 'vs Chrome / Arc',
      icon: HardDrive,
      className: 'from-slate-800 to-indigo-900',
      showToolTip: true,
      tooltipText: '-60% Memory',
      delay: 0.1,
    },
    {
      value: 94,
      label: 'Cold Start Speed',
      sublabel: '380ms to paint',
      icon: Zap,
      className: 'from-purple-950 to-purple-600',
      showToolTip: true,
      tooltipText: 'Instant Render',
      delay: 0.25,
    },
    {
      value: 99,
      label: 'Nova Efficiency',
      sublabel: 'Overall index score',
      icon: Cpu,
      className: 'from-indigo-900 to-indigo-500 border border-indigo-400/40',
      showToolTip: true,
      tooltipText: 'Top Benchmark',
      delay: 0.4,
    },
    {
      value: 99,
      label: 'Tracker Eradication',
      sublabel: '0ms network block',
      icon: ShieldCheck,
      className: 'from-emerald-950 to-emerald-600',
      showToolTip: true,
      tooltipText: 'Zero Leakage',
      delay: 0.55,
    },
  ];

  return (
    <section id="benchmarks" className="py-32 px-6 max-w-7xl mx-auto border-t border-white/10">
      <div className="mx-auto max-w-3xl text-center mb-16">
        <span className="font-mono text-xs uppercase tracking-widest text-indigo-400 font-semibold">
          EMPIRICAL PERFORMANCE BENCHMARKS
        </span>
        <h2 className="font-sans font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight mt-3">
          We Measure in <span className="text-indigo-400">Pure Milliseconds</span>.
        </h2>
        <p className="font-body text-slate-400 mt-4 text-base sm:text-lg leading-relaxed">
          Comprehensive hardware benchmarking performed on macOS Apple Silicon and Windows x64 systems.
        </p>
      </div>

      <div className="relative mx-auto mt-12 flex h-[440px] max-w-5xl items-center justify-center gap-4 sm:gap-6">
        {stats.map((props, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.6,
              delay: index * 0.15,
              type: 'spring',
              damping: 15,
            }}
            className="h-full w-full"
          >
            <BarChart {...props} />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default StatisticsBenchmark;
