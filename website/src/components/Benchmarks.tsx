import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  metricLabel: string;
  directionLabel: string;
  directionDescription: string;
  benchmarkNote: string;
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
    metricLabel: 'Memory used with 20 tabs open at the same time',
    directionLabel: 'Lower is better',
    directionDescription: 'Using less RAM leaves more room for tabs and smoother multitasking.',
    benchmarkNote: 'Test setup: 20 active tabs with the same content set; background tabs may be hibernated.',
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
    metricLabel: 'Web app responsiveness and render speed',
    directionLabel: 'Higher is better',
    directionDescription: 'A higher score means pages and interactions respond faster.',
    benchmarkNote: 'Test setup: Speedometer 3.0 responsiveness and render scenarios.',
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
    metricLabel: 'Tokens generated per second on the device',
    directionLabel: 'Higher is better',
    directionDescription: 'A higher tok/s rate means AI responses are generated faster.',
    benchmarkNote: 'Test setup: Llama 3.2 3B token generation through WebGPU; hardware affects results.',
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
    metricLabel: 'Time to filter an ad or tracker request',
    directionLabel: 'Lower is better',
    directionDescription: 'Lower latency means less extra processing while pages load.',
    benchmarkNote: 'Test setup: Average network-level filter decision time; results vary by page and hardware.',
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

// 120 FPS High-Performance Smooth Number Counter
const AnimatedCounter: React.FC<{
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}> = ({ value, decimals = 0, prefix = '', suffix = '', className = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    let start = displayValue;
    const end = value;
    if (Math.abs(start - end) < 0.01) return;

    const startTime = performance.now();
    const duration = 220; // ms

    let rafId: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplayValue(end);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, prefersReducedMotion]);

  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toString();

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
};

export const Benchmarks: React.FC = () => {
  const [viewMode, setViewMode] = useState<'benchmarks' | 'matrix'>('benchmarks');
  const [selectedCategory, setSelectedCategory] = useState<'memory' | 'speed' | 'ai' | 'privacy'>('memory');
  const [tabCount, setTabCount] = useState<number>(30);
  const prefersReducedMotion = useReducedMotion();

  const currentCategory = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
  const novaResult = currentCategory.competitors.find((item) => item.isWinner) || currentCategory.competitors[0];
  const nextBestResult = currentCategory.competitors
    .filter((item) => item !== novaResult)
    .sort((a, b) => currentCategory.lowerIsBetter ? a.value - b.value : b.value - a.value)[0];
  const advantagePercent = nextBestResult
    ? currentCategory.lowerIsBetter
      ? Math.round(((nextBestResult.value - novaResult.value) / nextBestResult.value) * 100)
      : Math.round(((novaResult.value - nextBestResult.value) / nextBestResult.value) * 100)
    : 0;

  // Dynamic RAM Calculator Math
  const novaMemoryEst = Math.round(180 + tabCount * 18);
  const chromeMemoryEst = Math.round(350 + tabCount * 65);
  const savedMemoryEst = Math.max(0, chromeMemoryEst - novaMemoryEst);
  const savedPercentage = Math.round((savedMemoryEst / chromeMemoryEst) * 100);

  return (
    <section id="benchmarks" className="mx-auto max-w-7xl border-t border-[#e5e5e5] px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
      {/* Section Header */}
      <div className="mb-8 flex flex-col gap-5 sm:mb-12 md:flex-row md:items-end md:justify-between md:gap-8">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
            EMPIRICAL VALIDATION & COMPARISON
          </span>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[#171717] tracking-tight mt-3">
            Measured <span className="text-[#4338ca]">Superiority</span>.
          </h2>
        </div>

        {/* View Mode Toggle Switcher */}
        <div className="flex w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-neutral-200 bg-neutral-100 p-1.5 scrollbar-none md:w-fit">
          <button
            type="button"
            onClick={() => setViewMode('benchmarks')}
            aria-pressed={viewMode === 'benchmarks'}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 font-mono text-[11px] font-semibold cursor-pointer transition-all duration-200 sm:px-4 sm:text-xs ${
              viewMode === 'benchmarks'
                ? 'bg-[#171717] text-[#fcfbf9] shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Interactive Benchmarks</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            aria-pressed={viewMode === 'matrix'}
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
          <p className="sr-only" role="status" aria-live="polite">
            {currentCategory.title}: {currentCategory.highlightNumber} {currentCategory.highlightUnit}. {currentCategory.directionLabel}.
          </p>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">1. Choose a metric</p>
              <p className="mt-1 text-xs text-neutral-500">Each category measures a different browser behavior.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-neutral-500 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#4338ca]" />
              <span>Nova's leading result is highlighted in purple</span>
            </div>
          </div>
          <div role="tablist" aria-label="Benchmark categories" className="mb-8 flex w-full gap-2 overflow-x-auto rounded-2xl border border-neutral-200 bg-neutral-100 p-1.5 scrollbar-none sm:w-fit">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  role="tab"
                  id={`benchmark-tab-${cat.id}`}
                  aria-controls="benchmark-results"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  onKeyDown={(event) => {
                    const navigationKeys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
                    if (!navigationKeys.includes(event.key)) return;
                    event.preventDefault();

                    const currentIndex = CATEGORIES.findIndex((category) => category.id === cat.id);
                    const nextIndex = event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? CATEGORIES.length - 1
                        : (currentIndex + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + CATEGORIES.length) % CATEGORIES.length;
                    const nextCategory = CATEGORIES[nextIndex];
                    setSelectedCategory(nextCategory.id);
                    window.requestAnimationFrame(() => {
                      document.getElementById(`benchmark-tab-${nextCategory.id}`)?.focus();
                    });
                  }}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 font-mono text-[11px] font-semibold cursor-pointer transition-all duration-200 sm:px-4 sm:text-xs ${
                    isActive
                      ? 'bg-[#171717] text-[#fcfbf9] shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-neutral-500'}`} aria-hidden="true" />
                  <span>{cat.title}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              id="benchmark-results"
              role="tabpanel"
              aria-labelledby={`benchmark-tab-${currentCategory.id}`}
              key={currentCategory.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={prefersReducedMotion ? undefined : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:col-span-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#4338ca] shadow-xs">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#4338ca]">What does this measure?</p>
                  <p className="mt-1 text-sm font-semibold text-[#171717]">{currentCategory.metricLabel}</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">{currentCategory.directionDescription}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">How to read the result</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${currentCategory.lowerIsBetter ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-[#4338ca]'}`}>
                  {currentCategory.lowerIsBetter ? '↓' : '↑'}
                </span>
                <span className="text-xs font-bold text-[#171717]"> {currentCategory.directionLabel}</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">Purple marks Nova's result; gray marks the other browsers.</p>
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">2. Compare the results</p>
              <p className="mt-1 text-xs text-neutral-500">For each metric, the better result is shown as the longer bar.</p>
            </div>
            <span className="font-mono text-[10px] text-neutral-400">Relative performance view</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
            {/* Left Card: Metric Breakdown & Live Bar Comparison */}
            <div className="luxury-card lg:col-span-8 rounded-3xl border border-[#e5e5e5] bg-white/90 p-5 shadow-xs sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden backdrop-blur-sm">
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

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                      {currentCategory.badge}
                    </span>
                    {nextBestResult && (
                      <span className="font-mono text-[10px] font-bold text-[#4338ca] bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
                        {advantagePercent}% {currentCategory.lowerIsBetter ? 'lower' : 'higher'} vs {nextBestResult.name}
                      </span>
                    )}
                  </div>
                </div>

                <p className="font-sans text-sm text-neutral-600 leading-relaxed mb-8 max-w-2xl">
                  {currentCategory.summary}
                </p>

                {/* COMPARATIVE PROGRESS BARS */}
                <div className="space-y-4 pt-2">
                  {currentCategory.competitors.map((item) => {
                    // Normalize the visual score so "lower is better" metrics still
                    // show the strongest result with the longest bar.
                    const rawPercent = currentCategory.lowerIsBetter
                      ? ((currentCategory.maxValue - item.value) / currentCategory.maxValue) * 100
                      : (item.value / currentCategory.maxValue) * 100;
                    const percent = Math.min(100, Math.max(12, Math.round(rawPercent)));
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
                        <div
                          className="w-full h-3.5 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200/60"
                          role="progressbar"
                          aria-label={`${item.name} relative performance`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={percent}
                        >
                          <motion.div
                            initial={prefersReducedMotion ? false : { width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
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

              <div className="mt-8 border-t border-neutral-100 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-neutral-400">
                  <span>// Criteria: {currentCategory.lowerIsBetter ? 'Lower is Better' : 'Higher is Better'}</span>
                  <span>Standardized benchmark view</span>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-neutral-400">{currentCategory.benchmarkNote}</p>
              </div>
            </div>

            {/* Right Card: Giant Key Stat */}
            <div className="luxury-card lg:col-span-4 rounded-3xl border border-neutral-800 bg-[#171717] p-5 text-[#fcfbf9] shadow-sm sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
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
                  Local test baselines vary by hardware, workload, and model. Nova keeps browser AI and privacy processing on-device instead of sending user context to analytics services.
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
          </motion.div>
          </AnimatePresence>

          {/* INTERACTIVE RAM SAVINGS SIMULATOR SLIDER */}
          <div className="mb-3 mt-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#4338ca]">3. Live Hibernation Simulator</p>
            <p className="mt-1 text-xs text-neutral-500">Benchmark your real-world browsing workload against traditional browser process architecture.</p>
          </div>

          <div className="luxury-card p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-white via-neutral-50/90 to-indigo-50/20 border border-[#e0e0e8] shadow-md backdrop-blur-sm relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 lg:gap-12">
              {/* Slider Control Column */}
              <div className="lg:max-w-md w-full space-y-5">
                <div className="flex items-center gap-2 text-[#4338ca] font-mono text-xs font-bold uppercase tracking-wider">
                  <Sliders className="w-4 h-4" />
                  <span>Interactive Memory Simulator</span>
                </div>

                <div>
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
                    Estimate Your RAM Savings
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-neutral-600 leading-relaxed mt-2">
                    Drag the slider to see how Nova’s automatic background DOM unmounting slashes memory pressure as your tab workload expands.
                  </p>
                </div>

                {/* Preset Quick-Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { count: 10, label: '10 Tabs' },
                    { count: 25, label: '25 Tabs' },
                    { count: 50, label: '50 Tabs' },
                    { count: 100, label: '100 Tabs' },
                  ].map((preset) => (
                    <button
                      key={preset.count}
                      type="button"
                      onClick={() => setTabCount(preset.count)}
                      className={`px-3 py-1.5 rounded-full font-mono text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                        tabCount === preset.count
                          ? 'bg-[#4338ca] text-white shadow-xs scale-105'
                          : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Interactive Slider Component */}
                <div className="pt-2">
                  <div className="flex justify-between font-mono text-xs font-bold text-neutral-800 mb-6">
                    <span className="flex items-center gap-2">
                      <span>Active Tab Load:</span>
                      <span className="text-[#4338ca] bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-md font-bold inline-flex items-center">
                        <AnimatedCounter value={tabCount} suffix=" Tabs" />
                      </span>
                    </span>
                    <span className="text-[#4338ca] font-medium">
                      {tabCount >= 60 ? 'Extreme Multitasking' : tabCount >= 30 ? 'Heavy Workflow' : 'Normal Browsing'}
                    </span>
                  </div>

                  {/* Relative Slider Container with Floating Kinetic Tooltip */}
                  <div className="relative flex items-center pt-2 pb-1">
                    {/* Floating Tooltip following slider position */}
                    <div
                      className="absolute -top-7 -translate-x-1/2 pointer-events-none transition-all duration-75 ease-out z-10"
                      style={{ left: `${((tabCount - 5) / 95) * 100}%` }}
                    >
                      <div className="bg-[#4338ca] text-white font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md whitespace-nowrap relative">
                        <AnimatedCounter value={tabCount} suffix=" Tabs" />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-[#4338ca]" />
                      </div>
                    </div>

                    <input
                      type="range"
                      aria-label="Number of open tabs"
                      min={5}
                      max={100}
                      step={5}
                      value={tabCount}
                      aria-valuetext={`${tabCount} open tabs; estimated Nova memory ${novaMemoryEst} megabytes versus Chrome ${chromeMemoryEst} megabytes`}
                      onChange={(e) => setTabCount(parseInt(e.target.value, 10))}
                      className="w-full h-3 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-[#4338ca] transition-all focus:outline-none focus:ring-2 focus:ring-[#4338ca]/30"
                      style={{
                        background: `linear-gradient(to right, #4338ca 0%, #6366f1 ${((tabCount - 5) / 95) * 100}%, #e5e5e5 ${((tabCount - 5) / 95) * 100}%, #e5e5e5 100%)`
                      }}
                    />
                  </div>

                  <div className="flex justify-between font-mono text-[10px] text-neutral-400 mt-2 font-medium">
                    <span>5 Tabs (Light)</span>
                    <span>50 Tabs (Dev)</span>
                    <span>100 Tabs (Extreme)</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Comparison Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:w-3/5">
                {/* 1. Nova Browser Result */}
                <div
                  className="p-6 rounded-2xl bg-white border-2 border-[#4338ca]/40 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-[#4338ca] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-[#4338ca] uppercase tracking-wider">
                      Nova Browser
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  <div className="my-3">
                    <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#4338ca] tracking-tight flex items-baseline gap-1">
                      <span>~</span>
                      <AnimatedCounter value={novaMemoryEst} />
                      <span className="text-sm font-sans font-normal text-neutral-500">MB</span>
                    </div>
                    {/* Visual Meter Bar */}
                    <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-[#4338ca] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (novaMemoryEst / chromeMemoryEst) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                      Hibernated
                    </span>
                    <span className="font-mono text-[10px] text-neutral-400">
                      DOM unmounted
                    </span>
                  </div>
                </div>

                {/* 2. Standard Chrome Result */}
                <div
                  className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col justify-between relative overflow-hidden hover:border-neutral-300 transition-colors"
                >
                  <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Google Chrome
                  </span>

                  <div className="my-3">
                    <div className="font-display text-3xl sm:text-4xl font-extrabold text-neutral-700 tracking-tight flex items-baseline gap-1">
                      <span>~</span>
                      <AnimatedCounter value={chromeMemoryEst / 1024} decimals={1} />
                      <span className="text-sm font-sans font-normal text-neutral-400">GB</span>
                    </div>
                    {/* Visual Meter Bar */}
                    <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all duration-300 w-full" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full font-medium">
                      (<AnimatedCounter value={chromeMemoryEst} suffix=" MB" />)
                    </span>
                    <span className="font-mono text-[10px] text-amber-600 font-semibold">
                      Full process load
                    </span>
                  </div>
                </div>

                {/* 3. Net Savings Result (Obsidian Card) */}
                <div
                  className="p-6 rounded-2xl bg-[#0c0d12] text-white shadow-xl flex flex-col justify-between relative overflow-hidden border border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      Net Memory Saved
                    </span>
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  </div>

                  <div className="my-3">
                    <div className="font-display text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight flex items-baseline gap-1">
                      <AnimatedCounter value={savedPercentage} suffix="%" />
                      <span className="text-xs font-mono font-normal text-neutral-400 uppercase">Less RAM</span>
                    </div>
                    {/* Visual Saving Meter */}
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${savedPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-emerald-300 font-bold flex items-center">
                      <span>~</span>
                      <AnimatedCounter value={savedMemoryEst / 1024} decimals={1} suffix=" GB Freed" />
                    </span>
                    <span className="text-neutral-400">
                      for IDE & Apps
                    </span>
                  </div>
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
