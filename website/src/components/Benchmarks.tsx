import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HardDrive,
  Zap,
  Cpu,
  Shield,
  Sliders,
  CheckCircle2,
  Activity,
  Check,
  Minus,
  Layers,
  BarChart3
} from 'lucide-react';

interface BenchmarkCategory {
  id: 'memory' | 'speed' | 'ai' | 'privacy';
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge: string;
  highlightNumber: string;
  highlightUnit: string;
  highlightLabel: string;
  summary: string;
  competitors: {
    name: string;
    value: number;
    displayValue: string;
    isWinner?: boolean;
  }[];
  maxValue: number;
  lowerIsBetter: boolean;
}

const CATEGORIES: BenchmarkCategory[] = [
  {
    id: 'memory',
    title: 'Memory & Tab Hibernation',
    subtitle: '20 Active Tabs with Intelligent DOM Unmounting',
    icon: HardDrive,
    badge: '64% RAM Reduction',
    highlightNumber: '420',
    highlightUnit: 'MB',
    highlightLabel: 'Total RAM (20 Tabs)',
    summary: 'Nova suspends dormant webview rendering pipelines while retaining instant back-forward state, keeping memory below 500MB.',
    maxValue: 1600,
    lowerIsBetter: true,
    competitors: [
      { name: 'Nova Browser', value: 420, displayValue: '420 MB', isWinner: true },
      { name: 'Google Chrome', value: 1180, displayValue: '1,180 MB' },
      { name: 'Arc Browser', value: 1450, displayValue: '1,450 MB' },
      { name: 'Brave Browser', value: 920, displayValue: '920 MB' },
    ],
  },
  {
    id: 'speed',
    title: 'Speedometer 3.0 & Cold Start',
    subtitle: 'W3C Browser Responsiveness & Render Benchmark',
    icon: Zap,
    badge: 'Top Tier Responsiveness',
    highlightNumber: '38.4',
    highlightUnit: 'Score',
    highlightLabel: 'Speedometer 3.0 Score',
    summary: 'Direct hardware-accelerated Blink layout scheduler and zero-latency local caching deliver blistering UI reactivity.',
    maxValue: 45,
    lowerIsBetter: false,
    competitors: [
      { name: 'Nova Browser', value: 38.4, displayValue: '38.4 pts', isWinner: true },
      { name: 'Safari 18', value: 35.6, displayValue: '35.6 pts' },
      { name: 'Google Chrome', value: 32.1, displayValue: '32.1 pts' },
      { name: 'Arc Browser', value: 29.8, displayValue: '29.8 pts' },
    ],
  },
  {
    id: 'ai',
    title: 'On-Device AI Inference',
    subtitle: 'Llama 3.2 3B Token Generation via WebGPU',
    icon: Cpu,
    badge: '3.4x Faster vs CPU',
    highlightNumber: '64',
    highlightUnit: 'tok/s',
    highlightLabel: 'WebGPU Inference Speed',
    summary: 'Native WebGPU shaders bypass cloud network hops entirely, executing local models with zero latency and 100% privacy.',
    maxValue: 75,
    lowerIsBetter: false,
    competitors: [
      { name: 'Nova (WebGPU Shaders)', value: 64, displayValue: '64 tok/s', isWinner: true },
      { name: 'Chrome (WebGPU Polyfill)', value: 41, displayValue: '41 tok/s' },
      { name: 'Cloud API (Network Roundtrip)', value: 18, displayValue: '~18 tok/s' },
    ],
  },
  {
    id: 'privacy',
    title: 'Ad & Tracker Block Latency',
    subtitle: 'Network-Level Rust Filter Engine',
    icon: Shield,
    badge: '0ms Overhead',
    highlightNumber: '0.1',
    highlightUnit: 'ms',
    highlightLabel: 'Filter Decision Time',
    summary: 'Ad and tracker requests are terminated in kernel-space before DOM creation, saving up to 48% bandwidth per page load.',
    maxValue: 12,
    lowerIsBetter: true,
    competitors: [
      { name: 'Nova (Rust Native Engine)', value: 0.1, displayValue: '0.12 ms', isWinner: true },
      { name: 'Brave Shield', value: 0.35, displayValue: '0.35 ms' },
      { name: 'Chrome + uBlock Extension', value: 4.8, displayValue: '4.80 ms' },
      { name: 'Standard Chrome (Unfiltered)', value: 11.2, displayValue: '11.20 ms' },
    ],
  },
];

const MATRIX_FEATURES = [
  {
    feature: 'On-Device Local AI Agent',
    sub: 'Client-side WebGPU neural execution with zero cloud transmission',
    nova: 'Native WebGPU (64 tok/s)',
    chrome: 'Cloud Gemini (Paywalled)',
    arc: 'Cloud OpenAI (Telemetry)',
    brave: 'Cloud Leo (Paid Tier)',
    isNovaLeader: true,
  },
  {
    feature: '1-Click Offline DOM Translation',
    sub: 'Localized concurrent batch dictionary parser',
    nova: 'Native 0ms Sandbox',
    chrome: 'Google Cloud API',
    arc: 'Extension Only',
    brave: 'External Engine',
    isNovaLeader: true,
  },
  {
    feature: 'Intelligent Tab Hibernation',
    sub: 'Background DOM tree unmounting with instant restore',
    nova: '-64% RAM Active Drop',
    chrome: 'Memory Saver (~20%)',
    arc: 'Heavy (~1,450 MB)',
    brave: 'Partial (~920 MB)',
    isNovaLeader: true,
  },
  {
    feature: 'Dual Split Synchronized Canvas',
    sub: 'Multi-pane parallel browsing with synchronized scrolling',
    nova: 'Native Split Engine',
    chrome: 'No (Separate Windows)',
    arc: 'Basic Split',
    brave: 'No (Separate Windows)',
    isNovaLeader: true,
  },
  {
    feature: 'Zero-Telemetry Network Hardening',
    sub: 'Zero analytics pings, zero remote identifier logs',
    nova: '100% Sovereign (0 KB)',
    chrome: 'Extensive Telemetry',
    arc: 'Usage Analytics',
    brave: 'Opt-out Required',
    isNovaLeader: true,
  },
  {
    feature: 'Licensing & Public Auditability',
    sub: 'Open source codebase with reproducible build pipeline',
    nova: '100% MIT License',
    chrome: 'Proprietary Core',
    arc: 'Closed Source',
    brave: 'MPL 2.0',
    isNovaLeader: true,
  },
];

export const Benchmarks: React.FC = () => {
  const [viewMode, setViewMode] = useState<'benchmarks' | 'matrix'>('benchmarks');
  const [selectedCategory, setSelectedCategory] = useState<'memory' | 'speed' | 'ai' | 'privacy'>('memory');
  const [tabCount, setTabCount] = useState<number>(30);

  const currentCategory = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  // Dynamic RAM Calculator Math
  const novaMemoryEst = Math.round(180 + tabCount * 18);
  const chromeMemoryEst = Math.round(350 + tabCount * 65);
  const savedMemoryEst = Math.max(0, chromeMemoryEst - novaMemoryEst);
  const savedPercentage = Math.round((savedMemoryEst / chromeMemoryEst) * 100);

  return (
    <section id="benchmarks" className="py-32 px-6 max-w-7xl mx-auto border-t border-[#e5e5e5]">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
            EMPIRICAL VALIDATION & COMPARISON
          </span>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[#171717] tracking-tight mt-3">
            Measured <span className="text-[#4338ca]">Superiority</span>.
          </h2>
        </div>

        {/* View Mode Toggle Switcher */}
        <div className="flex items-center gap-1.5 p-1.5 bg-neutral-100 rounded-2xl border border-neutral-200 w-fit">
          <button
            onClick={() => setViewMode('benchmarks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-semibold cursor-pointer transition-all duration-200 ${
              viewMode === 'benchmarks'
                ? 'bg-[#171717] text-[#fcfbf9] shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Interactive Benchmarks</span>
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-semibold cursor-pointer transition-all duration-200 ${
              viewMode === 'matrix'
                ? 'bg-[#171717] text-[#fcfbf9] shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Feature Matrix</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE BENCHMARKS & SLIDER */}
      {viewMode === 'benchmarks' && (
        <div>
          {/* CATEGORY SWITCHER TABS */}
          <div className="flex flex-wrap gap-2 mb-10 p-1.5 bg-neutral-100 rounded-2xl border border-neutral-200 w-fit">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-semibold cursor-pointer transition-all duration-200 ${
                    isActive
                      ? 'bg-[#171717] text-[#fcfbf9] shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-neutral-500'}`} />
                  <span>{cat.title}</span>
                </button>
              );
            })}
          </div>

          {/* MAIN BENCHMARK VISUALIZER STAGE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
            {/* Left Card: Metric Breakdown & Live Bar Comparison */}
            <div className="lg:col-span-8 p-8 sm:p-10 rounded-3xl bg-white border border-[#e5e5e5] shadow-xs flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                      {currentCategory.subtitle}
                    </span>
                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#171717]">
                      {currentCategory.title}
                    </h3>
                  </div>

                  <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                    {currentCategory.badge}
                  </span>
                </div>

                <p className="font-sans text-sm text-neutral-600 leading-relaxed mb-8 max-w-2xl">
                  {currentCategory.summary}
                </p>

                {/* COMPARATIVE PROGRESS BARS */}
                <div className="space-y-4 pt-2">
                  {currentCategory.competitors.map((item) => {
                    const percent = Math.min(100, Math.max(12, Math.round((item.value / currentCategory.maxValue) * 100)));
                    return (
                      <div key={item.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${item.isWinner ? 'text-[#171717]' : 'text-neutral-500'}`}>
                              {item.name}
                            </span>
                            {item.isWinner && (
                              <span className="bg-[#4338ca] text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                LEADER
                              </span>
                            )}
                          </div>
                          <span className={`font-bold ${item.isWinner ? 'text-[#4338ca]' : 'text-neutral-600'}`}>
                            {item.displayValue}
                          </span>
                        </div>

                        {/* Bar Track */}
                        <div className="w-full h-3.5 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200/60">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className={`h-full rounded-full transition-all ${
                              item.isWinner ? 'bg-[#4338ca]' : 'bg-neutral-300'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-neutral-100 flex items-center justify-between text-xs font-mono text-neutral-400">
                <span>// Criteria: {currentCategory.lowerIsBetter ? 'Lower is Better' : 'Higher is Better'}</span>
                <span>Standardized W3C Suite</span>
              </div>
            </div>

            {/* Right Card: Giant Key Stat */}
            <div className="lg:col-span-4 p-8 sm:p-10 rounded-3xl bg-[#171717] text-[#fcfbf9] flex flex-col justify-between relative overflow-hidden shadow-sm border border-neutral-800">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 mb-8">
                  <Activity className="w-6 h-6" />
                </div>

                <span className="font-mono text-xs text-neutral-400 uppercase tracking-widest block mb-2 font-medium">
                  {currentCategory.highlightLabel}
                </span>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="font-display text-6xl sm:text-7xl font-extrabold tracking-tight text-white">
                    {currentCategory.highlightNumber}
                  </span>
                  <span className="font-sans text-2xl font-light text-neutral-400">
                    {currentCategory.highlightUnit}
                  </span>
                </div>

                <p className="font-sans text-xs text-neutral-300 leading-relaxed">
                  Measured baseline under isolated test suites. 0% telemetry transmission ensures raw CPU cycles remain dedicated to execution.
                </p>
              </div>

              <div className="pt-6 border-t border-white/10 mt-8">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Certified Sovereign Architecture</span>
                </div>
              </div>
            </div>
          </div>

          {/* INTERACTIVE RAM SAVINGS SIMULATOR SLIDER */}
          <div className="p-8 sm:p-10 rounded-3xl bg-neutral-50 border border-[#e5e5e5] shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              {/* Slider Control Column */}
              <div className="lg:max-w-md space-y-4">
                <div className="flex items-center gap-2 text-[#4338ca] font-mono text-xs font-bold uppercase tracking-wider">
                  <Sliders className="w-4 h-4" />
                  <span>Interactive Memory Simulator</span>
                </div>

                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#171717]">
                  Estimate Your RAM Savings
                </h3>

                <p className="font-sans text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Adjust the slider to see how Nova’s automatic hibernation engine cuts RAM footprint as your active tab count grows.
                </p>

                <div className="pt-2">
                  <div className="flex justify-between font-mono text-xs font-bold text-neutral-700 mb-2">
                    <span>Tab Load: {tabCount} Open Tabs</span>
                    <span className="text-[#4338ca]">{tabCount >= 50 ? 'Heavy Multitasking' : 'Normal Browsing'}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={tabCount}
                    onChange={(e) => setTabCount(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#4338ca]"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-neutral-400 mt-1">
                    <span>5 Tabs</span>
                    <span>50 Tabs</span>
                    <span>100 Tabs</span>
                  </div>
                </div>
              </div>

              {/* Results Comparison Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:w-3/5">
                {/* Nova Result */}
                <div className="p-6 rounded-2xl bg-white border border-[#4338ca]/30 shadow-xs flex flex-col justify-between">
                  <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Nova Browser
                  </span>
                  <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#4338ca] my-2">
                    ~{novaMemoryEst} <span className="text-sm font-sans font-normal text-neutral-500">MB</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded w-fit">
                    Hibernated
                  </span>
                </div>

                {/* Standard Chrome Result */}
                <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col justify-between">
                  <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Google Chrome
                  </span>
                  <div className="font-display text-3xl sm:text-4xl font-extrabold text-neutral-700 my-2">
                    ~{(chromeMemoryEst / 1024).toFixed(1)} <span className="text-sm font-sans font-normal text-neutral-400">GB</span>
                  </div>
                  <span className="font-mono text-[10px] text-neutral-400">
                    ({chromeMemoryEst} MB)
                  </span>
                </div>

                {/* Net Savings Result */}
                <div className="p-6 rounded-2xl bg-[#171717] text-white shadow-md flex flex-col justify-between">
                  <span className="font-mono text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                    Net Memory Saved
                  </span>
                  <div className="font-display text-3xl sm:text-4xl font-extrabold text-emerald-400 my-2">
                    {savedPercentage}%
                  </div>
                  <span className="font-mono text-[10px] text-neutral-300">
                    ~{(savedMemoryEst / 1024).toFixed(1)} GB Free RAM
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FULL CAPABILITY & HEAD-TO-HEAD MATRIX */}
      {viewMode === 'matrix' && (
        <div className="rounded-3xl bg-white border border-[#e5e5e5] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-neutral-50/70 font-mono text-xs uppercase text-neutral-500 tracking-wider">
                  <th className="p-6 font-semibold w-1/3">Capability & Architecture</th>
                  <th className="p-6 font-bold text-[#4338ca] bg-indigo-50/50">Nova Browser</th>
                  <th className="p-6 font-semibold">Google Chrome</th>
                  <th className="p-6 font-semibold">Arc Browser</th>
                  <th className="p-6 font-semibold">Brave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] font-sans text-xs">
                {MATRIX_FEATURES.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-6">
                      <div className="font-display font-bold text-sm text-[#171717] mb-1">
                        {item.feature}
                      </div>
                      <div className="text-neutral-500 leading-relaxed max-w-sm font-sans">
                        {item.sub}
                      </div>
                    </td>

                    {/* Nova Column */}
                    <td className="p-6 bg-indigo-50/30 font-mono font-bold text-[#4338ca]">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{item.nova}</span>
                      </div>
                    </td>

                    {/* Chrome Column */}
                    <td className="p-6 font-mono text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <Minus className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{item.chrome}</span>
                      </div>
                    </td>

                    {/* Arc Column */}
                    <td className="p-6 font-mono text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <Minus className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{item.arc}</span>
                      </div>
                    </td>

                    {/* Brave Column */}
                    <td className="p-6 font-mono text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <Minus className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{item.brave}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default Benchmarks;
