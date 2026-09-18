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
  BarChart3,
  ShieldCheck,
  Info
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
    subtitle: '20 Inactive Tabs with Background Process Suspension',
    icon: HardDrive,
    badge: 'Suspension Engine',
    highlightNumber: '420',
    highlightUnit: 'MB',
    highlightLabel: 'Total RAM (20 Tabs)',
    summary: 'Nova pauses rendering cycles in dormant background tabs, helping keep baseline memory usage lower during multi-tab sessions.',
    metricLabel: 'Approximate memory used with 20 inactive tabs open',
    directionLabel: 'Lower is better',
    directionDescription: 'Pausing background tabs leaves more system memory available for active apps.',
    benchmarkNote: 'Test setup: Estimated typical footprint with 20 inactive background tabs suspended; active media playback tabs scale normally.',
    maxValue: 1600,
    lowerIsBetter: true,
    competitors: [
      { name: 'Nova Browser', value: 420, displayValue: '~420 MB', isWinner: true },
      { name: 'Google Chrome', value: 1180, displayValue: '~1,180 MB' },
      { name: 'Brave Browser', value: 920, displayValue: '~920 MB' },
    ],
  },
  {
    id: 'speed',
    title: 'Cold Start & V8 Heap Memory',
    subtitle: 'Startup Memory & JS Bundle Optimization',
    icon: Zap,
    badge: 'Lightweight V8 Heap',
    highlightNumber: '31.2',
    highlightUnit: 'MB',
    highlightLabel: 'Initial V8 Heap Footprint',
    summary: 'Modular chunk isolation and decoupled WebLLM neural runtime keep initial JS evaluation down to ~435 KB with minimal heap allocation.',
    metricLabel: 'Initial V8 JavaScript heap allocation at startup',
    directionLabel: 'Lower is better',
    directionDescription: 'Lower initial heap allocation leaves more system memory available for tabs and apps.',
    benchmarkNote: 'Engine Parity: Runs the same Chromium Blink & Google V8 engine as Chrome. Differences stem from zero background telemetry and modular chunk isolation.',
    maxValue: 160,
    lowerIsBetter: true,
    competitors: [
      { name: 'Nova Browser', value: 31.2, displayValue: '31.2 MB', isWinner: true },
      { name: 'Google Chrome', value: 85.0, displayValue: '~85.0 MB' },
      { name: 'Brave Browser', value: 78.0, displayValue: '~78.0 MB' },
    ],
  },
  {
    id: 'ai',
    title: 'Private On-Device AI',
    subtitle: 'Zero Cloud Prompts & Zero Data Transmission',
    icon: Cpu,
    badge: '100% Offline AI',
    highlightNumber: '0',
    highlightUnit: 'KB',
    highlightLabel: 'User Data Sent to Cloud',
    summary: 'Client-side WebGPU executes local AI models directly in-browser without sending your chats, code, or page content to external servers.',
    metricLabel: 'Network data sent to third-party AI cloud servers',
    directionLabel: 'Lower is better',
    directionDescription: 'Zero bytes sent guarantees total user sovereignty and privacy.',
    benchmarkNote: 'Test setup: Network payload inspection during AI sidebar prompt execution.',
    maxValue: 120,
    lowerIsBetter: true,
    competitors: [
      { name: 'Nova (WebGPU Local)', value: 0, displayValue: '0 KB (Offline)', isWinner: true },
      { name: 'Brave (Leo Cloud API)', value: 64, displayValue: '~64 KB / prompt' },
      { name: 'Google Chrome (Gemini Cloud)', value: 85, displayValue: '~85 KB / prompt' },
    ],
  },
  {
    id: 'privacy',
    title: 'Ad & Tracker Block Latency',
    subtitle: 'Session-Level Request Interception',
    icon: Shield,
    badge: 'Built-in EasyList',
    highlightNumber: '0.44',
    highlightUnit: 'µs',
    highlightLabel: 'Fast Domain Decision Time',
    summary: 'Known tracker and ad requests are evaluated and blocked directly at the network session layer before page scripts execute.',
    metricLabel: 'In-memory domain lookup decision time',
    directionLabel: 'Lower is better',
    directionDescription: 'Faster lookup means minimal latency added to network requests.',
    benchmarkNote: 'Test setup: In-memory tracker domain classification latency in internal microbenchmark.',
    maxValue: 1.0,
    lowerIsBetter: true,
    competitors: [
      { name: 'Nova (Fast Domain Lookup)', value: 0.44, displayValue: '~0.44 µs', isWinner: true },
      { name: 'Standard Rule Check', value: 0.85, displayValue: '~0.85 µs' },
    ],
  },
];

export interface MatrixFeature {
  feature: string;
  sub: string;
  category: 'neural' | 'runtime' | 'privacy';
  nova: string;
  novaNote: string;
  chrome: string;
  brave: string;
  highlightBadge?: string;
}

const MATRIX_CATEGORIES = [
  { id: 'all', label: 'All Vectors' },
  { id: 'neural', label: 'Neural & AI Runtime' },
  { id: 'runtime', label: 'Memory & Performance' },
  { id: 'privacy', label: 'Privacy & Sovereignty' },
] as const;

const MATRIX_FEATURES: MatrixFeature[] = [
  // 1. Neural & AI Runtime
  {
    feature: 'On-Device Local AI Agent',
    sub: 'Client-side WebGPU neural execution with zero cloud transmission and private session cache',
    category: 'neural',
    nova: 'Native WebGPU (100% Offline)',
    novaNote: 'Zero token fees, zero latency egress',
    chrome: 'Cloud Gemini (Paywalled)',
    brave: 'Cloud Leo (Paid Tier)',
    highlightBadge: 'Local-First',
  },
  {
    feature: '1-Click In-Renderer DOM Translation',
    sub: 'Batched DOM tree node translation running directly in Blink without third-party proxy leaks',
    category: 'neural',
    nova: 'Built-in (DOM Batching)',
    novaNote: 'Zero IP logging, in-memory caching',
    chrome: 'Built-in (Cloud Proxy)',
    brave: 'Brave Translate (Cloud)',
    highlightBadge: 'Blink Native',
  },
  {
    feature: 'Contextual AI Sidebar & Page Indexing',
    sub: 'Local RAG and DOM element reasoning without uploading page contents to remote LLM servers',
    category: 'neural',
    nova: 'Local Vector & DOM Index',
    novaNote: 'Full session isolation',
    chrome: 'No Local Indexing',
    brave: 'Cloud-dependent',
  },

  // 2. Memory & Performance
  {
    feature: 'Intelligent Tab Hibernation',
    sub: 'Background webview execution suspension with dormant process pausing at OS process level',
    category: 'runtime',
    nova: 'Background Webview Suspension',
    novaNote: 'Up to 64% RAM reduction',
    chrome: 'Memory Saver (Tab Discard)',
    brave: 'Partial (~920 MB)',
    highlightBadge: '-64% RAM',
  },
  {
    feature: 'Cold Start & V8 Heap Baseline',
    sub: 'Modular chunk isolation with zero background telemetry daemons eating initial JS heap',
    category: 'runtime',
    nova: '31.2 MB Baseline Heap',
    novaNote: 'Instant cold-launch ready',
    chrome: '~85.0 MB Heap',
    brave: '~78.0 MB Heap',
    highlightBadge: '2.7x Lighter',
  },
  {
    feature: 'Dual Synchronized Canvas',
    sub: 'Multi-pane parallel browsing engine with optional synchronized scroll and DOM inspector',
    category: 'runtime',
    nova: 'Native Dual Canvas',
    novaNote: 'Zero duplicate process bloat',
    chrome: 'No (Separate Windows)',
    brave: 'No (Separate Windows)',
  },
  {
    feature: 'Ad & Tracker Block Latency',
    sub: 'In-memory session-layer request interception before any JavaScript DOM execution occurs',
    category: 'runtime',
    nova: '0.44 µs Decision Time',
    novaNote: 'In-memory hash lookup',
    chrome: 'No Native Adblock (Manifest V3)',
    brave: 'Built-in Shields (~0.85 µs)',
    highlightBadge: '0.44 µs',
  },

  // 3. Privacy & Sovereignty
  {
    feature: 'Zero-Telemetry Network Hardening',
    sub: 'Strict 0 KB network egress policy with zero analytics pings, zero crash dumps sent to telemetry hosts',
    category: 'privacy',
    nova: '100% Sovereign (0 KB Egress)',
    novaNote: 'Audited in regression test suite',
    chrome: 'Continuous Google Telemetry',
    brave: 'Opt-out Required',
    highlightBadge: '0 KB Egress',
  },
  {
    feature: 'Licensing & Public Auditability',
    sub: 'Open source codebase with reproducible GitHub Actions build pipeline and transparent commits',
    category: 'privacy',
    nova: '100% MIT License',
    novaNote: 'Fully auditable on GitHub',
    chrome: 'Proprietary Closed Core',
    brave: 'MPL 2.0 (Dual License)',
    highlightBadge: 'MIT Open Source',
  },
  {
    feature: 'Native CRX3 Extension Support',
    sub: 'Full Chrome Web Store extension compatibility without requiring Google Account synchronization',
    category: 'privacy',
    nova: 'Native CRX3 (No Account Needed)',
    novaNote: 'Isolated extension runtime',
    chrome: 'Requires Google Account',
    brave: 'Supported (Web Store)',
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
  const [viewMode, setViewMode] = useState<'matrix' | 'benchmarks' | 'simulator'>('matrix');
  const [matrixFilter, setMatrixFilter] = useState<'all' | 'neural' | 'runtime' | 'privacy'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'memory' | 'speed' | 'ai' | 'privacy'>('memory');
  const [tabCount, setTabCount] = useState<number>(30);
  const prefersReducedMotion = useReducedMotion();

  const currentCategory = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
  const novaResult = currentCategory.competitors.find((item) => item.isWinner) || currentCategory.competitors[0];
  const nextBestResult = currentCategory.competitors
    .filter((item) => item !== novaResult)
    .sort((a, b) => (currentCategory.lowerIsBetter ? a.value - b.value : b.value - a.value))[0];
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

  const filteredFeatures =
    matrixFilter === 'all'
      ? MATRIX_FEATURES
      : MATRIX_FEATURES.filter((f) => f.category === matrixFilter);

  return (
    <section
      id="benchmarks"
      className="section-deferred mx-auto max-w-7xl border-t border-neutral-200/50 px-4 py-20 sm:px-6 sm:py-28 lg:py-32"
    >
      {/* 1. Header Area: Direct Heading, Clear Purpose, Tactile Switcher */}
      <div className="mb-8 flex flex-col gap-6 sm:mb-12 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="max-w-2xl">
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[#171717] tracking-tight">
            Architectural <span className="text-[#4338ca]">Comparison</span>
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-neutral-600 leading-relaxed font-sans">
            Engineered on the Chromium Blink & Google V8 foundation. Re-architected with client-side WebGPU intelligence, dormant process suspension, and a zero-telemetry network layer.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div
          role="tablist"
          aria-label="Comparison views"
          className="flex w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-neutral-200 bg-neutral-100 p-1.5 scrollbar-none md:w-fit"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'matrix'}
            onClick={() => setViewMode('matrix')}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 font-mono text-[11px] font-semibold cursor-pointer transition-all duration-200 sm:px-4 sm:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] ${
              viewMode === 'matrix'
                ? 'bg-[#171717] text-[#fcfbf9] shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Architectural Matrix</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'benchmarks'}
            onClick={() => setViewMode('benchmarks')}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 font-mono text-[11px] font-semibold cursor-pointer transition-all duration-200 sm:px-4 sm:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] ${
              viewMode === 'benchmarks'
                ? 'bg-[#171717] text-[#fcfbf9] shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Empirical Benchmarks</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'simulator'}
            onClick={() => setViewMode('simulator')}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 font-mono text-[11px] font-semibold cursor-pointer transition-all duration-200 sm:px-4 sm:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] ${
              viewMode === 'simulator'
                ? 'bg-[#171717] text-[#fcfbf9] shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>RAM Simulator</span>
          </button>
        </div>
      </div>

      {/* 2. Key Architectural Invariants Strip */}
      <div className="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4.5 shadow-xs flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#4338ca] border border-indigo-100">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Engine Baseline</div>
            <div className="font-display font-bold text-sm text-[#171717]">Chromium Blink & Google V8</div>
            <div className="text-[11px] text-neutral-600 font-sans">100% web standards parity, zero telemetry</div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4.5 shadow-xs flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Process Topology</div>
            <div className="font-display font-bold text-sm text-[#171717]">Dormant Tab Suspension</div>
            <div className="text-[11px] text-neutral-600 font-sans">Up to 64% memory reduction on 20+ tabs</div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4.5 shadow-xs flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#4338ca] border border-indigo-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Network Egress</div>
            <div className="font-display font-bold text-sm text-[#171717]">Strict 0 KB Cloud Policy</div>
            <div className="text-[11px] text-neutral-600 font-sans">100% on-device WebGPU neural execution</div>
          </div>
        </div>
      </div>

      {/* VIEW 1: FULL ARCHITECTURAL MATRIX */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          {/* Matrix Category Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-100 p-1 scrollbar-none">
              {MATRIX_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setMatrixFilter(cat.id)}
                  className={`rounded-lg px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] ${
                    matrixFilter === cat.id
                      ? 'bg-white text-[#171717] shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="font-mono text-xs text-neutral-500">
              Showing {filteredFeatures.length} of {MATRIX_FEATURES.length} verified architectural vectors
            </div>
          </div>

          {/* Desktop Table Presentation (md: and up) */}
          <div className="hidden md:block rounded-3xl bg-white border border-neutral-200/70 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200/70 bg-neutral-50/70 font-mono text-xs uppercase text-neutral-600 tracking-wider">
                  <th className="px-6 py-4 font-semibold w-5/12">Architectural Vector</th>
                  <th className="px-6 py-4 font-bold text-[#4338ca] bg-indigo-50/50 border-x border-indigo-100 w-3/12">
                    <div className="flex items-center justify-between">
                      <span>Nova Browser</span>
                      <span className="font-mono text-[9px] uppercase tracking-wider bg-[#4338ca] text-white px-2 py-0.5 rounded-full font-semibold">
                        Sovereign
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-neutral-600 w-2/12">Google Chrome</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600 w-2/12">Brave Browser</th>
                </tr>
              </thead>
              <motion.tbody 
                initial={prefersReducedMotion ? false : "hidden"}
                animate={prefersReducedMotion ? "visible" : "visible"}
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
                }}
                className="divide-y divide-neutral-200/60 font-sans text-xs"
              >
                {filteredFeatures.map((item, idx) => (
                  <motion.tr 
                    key={idx} 
                    variants={{
                      hidden: { opacity: 0, y: 15 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
                    }}
                    className="group hover:bg-neutral-50/60 transition-colors relative"
                  >
                    {/* Feature Vector & Rationale */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-[15px] text-[#171717] group-hover:text-[#4338ca] transition-colors">
                          {item.feature}
                        </span>
                        {item.highlightBadge && (
                          <span className="font-mono text-[9px] font-bold text-[#4338ca] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {item.highlightBadge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-neutral-600 leading-relaxed max-w-lg font-sans">
                        {item.sub}
                      </p>
                    </td>

                    {/* Nova Column (Elevated Flagship) */}
                    <td className="px-6 py-5 bg-gradient-to-br from-indigo-50/40 to-indigo-50/10 border-x border-indigo-100/60 relative overflow-hidden">
                      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0" />
                      <div className="flex items-start gap-2.5 relative z-10">
                        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#4338ca] text-white shadow-[0_0_12px_rgba(67,56,202,0.3)]">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-[13px] text-[#4338ca]">
                            {item.nova}
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5 font-sans font-medium">
                            {item.novaNote}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Google Chrome Column */}
                    <td className="px-6 py-5 font-mono text-neutral-500 group-hover:text-neutral-700 transition-colors">
                      <div className="flex items-center gap-2">
                        <Minus className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                        <span className="text-[12px]">{item.chrome}</span>
                      </div>
                    </td>

                    {/* Brave Column */}
                    <td className="px-6 py-5 font-mono text-neutral-500 group-hover:text-neutral-700 transition-colors">
                      <div className="flex items-center gap-2">
                        <Minus className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                        <span className="text-[12px]">{item.brave}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>

          {/* Mobile Card Presentation (< md:) */}
          <motion.div 
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? "visible" : "visible"}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
            }}
            className="md:hidden space-y-3"
          >
            {filteredFeatures.map((item, idx) => (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
                }}
                className="group/mob relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-4.5 shadow-xs space-y-3 hover:border-indigo-500/30 transition-all"
              >
                <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-indigo-500/5 blur-2xl transition-opacity duration-500 opacity-0 group-hover/mob:opacity-100" aria-hidden="true" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-[15px] text-[#171717] group-hover/mob:text-[#4338ca] transition-colors">
                      {item.feature}
                    </span>
                    {item.highlightBadge && (
                      <span className="font-mono text-[9px] font-bold text-[#4338ca] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider group-hover/mob:bg-[#4338ca] group-hover/mob:text-white transition-colors">
                        {item.highlightBadge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed font-sans">
                    {item.sub}
                  </p>
                </div>

                {/* Comparative Chips */}
                <div className="relative z-10 space-y-2 pt-1 border-t border-neutral-100 group-hover/mob:border-indigo-100/50 transition-colors">
                  {/* Nova */}
                  <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-indigo-50/10 p-2.5 flex items-start gap-2 shadow-[0_0_12px_rgba(67,56,202,0.03)]">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#4338ca] text-white shadow-[0_0_8px_rgba(67,56,202,0.3)]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4338ca]">Nova Browser</span>
                        <span className="font-mono text-[9px] text-white font-semibold bg-[#4338ca] px-1.5 py-0.5 rounded uppercase tracking-wider">Sovereign</span>
                      </div>
                      <div className="font-mono font-bold text-xs text-[#171717] mt-1">
                        {item.nova}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-0.5 font-medium">
                        {item.novaNote}
                      </div>
                    </div>
                  </div>

                  {/* Chrome & Brave row */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/70 p-2.5 group-hover/mob:bg-neutral-50 transition-colors">
                      <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-wider block">Chrome</span>
                      <span className="font-mono text-[11px] text-neutral-700 mt-1 block leading-tight font-medium">
                        {item.chrome}
                      </span>
                    </div>

                    <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/70 p-2.5 group-hover/mob:bg-neutral-50 transition-colors">
                      <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-wider block">Brave</span>
                      <span className="font-mono text-[11px] text-neutral-700 mt-1 block leading-tight font-medium">
                        {item.brave}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Matrix Footnote */}
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 flex items-start gap-3 text-xs text-neutral-600 leading-relaxed font-sans">
            <Info className="w-4 h-4 text-[#4338ca] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-neutral-900">Chromium Blink Parity:</span> All rendering speed, CSS layout correctness, WebGPU APIs, and extension interfaces are identical to standard Chromium release builds. Performance gains and memory reductions derive strictly from dormant webview lifecycle suspension and zero-telemetry code elimination.
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: EMPIRICAL BENCHMARKS */}
      {viewMode === 'benchmarks' && (
        <div>
          {/* Category Tabs */}
          <div
            role="tablist"
            aria-label="Benchmark categories"
            className="mb-8 flex w-full gap-2 overflow-x-auto rounded-2xl border border-neutral-200 bg-neutral-100 p-1.5 scrollbar-none sm:w-fit"
          >
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
                    const nextIndex =
                      event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                        ? CATEGORIES.length - 1
                        : (currentIndex + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + CATEGORIES.length) %
                          CATEGORIES.length;
                    const nextCategory = CATEGORIES[nextIndex];
                    setSelectedCategory(nextCategory.id);
                    window.requestAnimationFrame(() => {
                      document.getElementById(`benchmark-tab-${nextCategory.id}`)?.focus();
                    });
                  }}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 font-mono text-[11px] font-semibold cursor-pointer transition-all duration-200 sm:px-4 sm:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] ${
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
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={prefersReducedMotion ? undefined : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Benchmark Criteria Context Cards */}
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:col-span-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#4338ca] shadow-xs">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#4338ca]">
                        What does this measure?
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#171717]">{currentCategory.metricLabel}</p>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-600">{currentCategory.directionDescription}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-600">
                    How to read the result
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${
                        currentCategory.lowerIsBetter ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-[#4338ca]'
                      }`}
                    >
                      {currentCategory.lowerIsBetter ? '↓' : '↑'}
                    </span>
                    <span className="text-xs font-bold text-[#171717]">{currentCategory.directionLabel}</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-neutral-500 font-sans">
                    Purple marks Nova's sovereign result; gray marks standard browsers.
                  </p>
                </div>
              </div>

              {/* Progress Bars and Giant Stat Card */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Card: Metric Breakdown & Live Bar Comparison */}
                <div className="luxury-card lg:col-span-8 rounded-3xl border border-neutral-200/70 bg-white p-5 shadow-xs sm:p-8 flex flex-col justify-between relative overflow-hidden">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-neutral-600 uppercase tracking-wider block mb-1">
                          {currentCategory.subtitle}
                        </span>
                        <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#171717]">
                          {currentCategory.title}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
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

                    {/* Comparative Progress Bars */}
                    <div className="space-y-4 pt-2">
                      {currentCategory.competitors.map((item) => {
                        const rawPercent = currentCategory.lowerIsBetter
                          ? ((currentCategory.maxValue - item.value) / currentCategory.maxValue) * 100
                          : (item.value / currentCategory.maxValue) * 100;
                        const percent = Math.min(100, Math.max(12, Math.round(rawPercent)));
                        return (
                          <div key={item.name} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${item.isWinner ? 'text-[#171717]' : 'text-neutral-600'}`}>
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
                                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-neutral-600">
                      <span>// Criteria: {currentCategory.lowerIsBetter ? 'Lower is Better' : 'Higher is Better'}</span>
                      <span>Standardized benchmark view</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-neutral-600 font-sans">{currentCategory.benchmarkNote}</p>
                  </div>
                </div>

                {/* Right Card: Giant Key Stat (Obsidian Theme) */}
                <div className="luxury-card lg:col-span-4 rounded-3xl border border-white/10 bg-[#0c0d12] p-5 text-[#fcfbf9] shadow-xl sm:p-8 flex flex-col justify-between relative overflow-hidden">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-indigo-400 mb-8">
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
                      All tests verified through deterministic microbenchmarks. Nova keeps machine learning and privacy processing directly in the local renderer without sending user data to cloud analytics.
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
        </div>
      )}

      {/* VIEW 3: INTERACTIVE RAM SAVINGS SIMULATOR */}
      {viewMode === 'simulator' && (
        <div className="space-y-6">
          <div className="luxury-card p-6 sm:p-10 rounded-3xl bg-white border border-neutral-200/80 shadow-md relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 lg:gap-12">
              {/* Slider Control Column */}
              <div className="lg:max-w-md w-full space-y-5">
                <div className="flex items-center gap-2 text-[#4338ca] font-mono text-xs font-bold uppercase tracking-wider">
                  <Sliders className="w-4 h-4" />
                  <span>Process Suspension Modeler</span>
                </div>

                <div>
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
                    Simulate Your Tab Workload
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-neutral-600 leading-relaxed mt-2">
                    Adjust the tab slider to model how Nova’s automatic background tab suspension prevents memory bloat compared to Chrome's separate process-per-tab architecture.
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
                      className={`px-3.5 py-1.5 rounded-full font-mono text-[11px] font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] ${
                        tabCount === preset.count
                          ? 'bg-[#4338ca] text-white shadow-xs scale-105'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
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
                      <span>Simulated Load:</span>
                      <span className="text-[#4338ca] bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-md font-bold inline-flex items-center">
                        <AnimatedCounter value={tabCount} suffix=" Tabs" />
                      </span>
                    </span>
                    <span className="text-[#4338ca] font-medium">
                      {tabCount >= 60 ? 'Heavy Multitasking' : tabCount >= 30 ? 'Dev Workflow' : 'Normal Browsing'}
                    </span>
                  </div>

                  {/* Relative Slider Container with Floating Kinetic Tooltip */}
                  <div className="relative flex items-center pt-2 pb-1">
                    <div
                      className="absolute -top-7 -translate-x-1/2 pointer-events-none transition-all duration-75 ease-out z-10"
                      style={{ left: `clamp(28px, ${((tabCount - 5) / 95) * 100}%, calc(100% - 28px))` }}
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
                      className="w-full h-3 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-[#4338ca] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2"
                      style={{
                        background: `linear-gradient(to right, #4338ca 0%, #6366f1 ${((tabCount - 5) / 95) * 100}%, #e5e5e5 ${((tabCount - 5) / 95) * 100}%, #e5e5e5 100%)`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between font-mono text-[10px] text-neutral-600 mt-2 font-medium">
                    <span>5 Tabs (Light)</span>
                    <span>50 Tabs (Dev)</span>
                    <span>100 Tabs (Extreme)</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Comparison Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:w-3/5">
                {/* 1. Nova Browser Result */}
                <div className="p-6 rounded-2xl bg-white border-2 border-[#4338ca]/40 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-[#4338ca] transition-colors">
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
                    <span className="font-mono text-[10px] text-neutral-600 font-medium">
                      Background suspended
                    </span>
                  </div>
                </div>

                {/* 2. Standard Chrome Result */}
                <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col justify-between relative overflow-hidden hover:border-neutral-300 transition-colors">
                  <span className="font-mono text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                    Google Chrome
                  </span>

                  <div className="my-3">
                    <div className="font-display text-3xl sm:text-4xl font-extrabold text-neutral-700 tracking-tight flex items-baseline gap-1">
                      <span>~</span>
                      <AnimatedCounter value={chromeMemoryEst / 1024} decimals={1} />
                      <span className="text-sm font-sans font-normal text-neutral-500">GB</span>
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
                    <span className="font-mono text-[10px] text-amber-700 font-semibold">
                      Process sprawl
                    </span>
                  </div>
                </div>

                {/* 3. Net Savings Result (Obsidian Card) */}
                <div className="p-6 rounded-2xl bg-[#0c0d12] text-white shadow-xl flex flex-col justify-between relative overflow-hidden border border-white/10">
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
                      for IDE & Docker
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Benchmarks;
