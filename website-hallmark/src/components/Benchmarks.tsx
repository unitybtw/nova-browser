import React, { useState } from 'react';
import { Sliders, CheckCircle2 } from 'lucide-react';

export const Benchmarks: React.FC = () => {
  const [tabCount, setTabCount] = useState<number>(30);
  const [selectedMetric, setSelectedMetric] = useState<'memory' | 'speed' | 'privacy'>('memory');

  // Math for Dynamic Hibernation Calculator
  const novaRam = Math.round(180 + tabCount * 18);
  const chromeRam = Math.round(350 + tabCount * 65);
  const savedRam = Math.max(0, chromeRam - novaRam);
  const savedPercent = Math.round((savedRam / chromeRam) * 100);

  const METRICS = {
    memory: {
      title: '20 Active Tabs RAM Footprint',
      unit: 'MB (Lower is better)',
      highlight: '420 MB',
      sub: '-64% RAM reduction through DOM tree unmounting',
      bars: [
        { name: 'Nova Browser (Hibernation Engine)', value: 420, display: '420 MB', winner: true, percent: 100 },
        { name: 'Brave Browser', value: 920, display: '920 MB', winner: false, percent: 45 },
        { name: 'Google Chrome', value: 1180, display: '1,180 MB', winner: false, percent: 35 },
        { name: 'Arc Browser', value: 1450, display: '1,450 MB', winner: false, percent: 28 },
      ],
    },
    speed: {
      title: 'Speedometer 3.0 W3C Responsiveness',
      unit: 'Score (Higher is better)',
      highlight: '38.4 pts',
      sub: 'Direct hardware layout scheduler with zero telemetry overhead',
      bars: [
        { name: 'Nova Browser', value: 38.4, display: '38.4 pts', winner: true, percent: 100 },
        { name: 'Safari 18', value: 35.6, display: '35.6 pts', winner: false, percent: 92 },
        { name: 'Google Chrome', value: 32.1, display: '32.1 pts', winner: false, percent: 83 },
        { name: 'Arc Browser', value: 29.8, display: '29.8 pts', winner: false, percent: 77 },
      ],
    },
    privacy: {
      title: 'Network Filter Decision Latency',
      unit: 'ms (Lower is better)',
      highlight: '0.12 ms',
      sub: 'Rust kernel intercept evaluates filter rules before DOM initialization',
      bars: [
        { name: 'Nova (Rust Native Filter)', value: 0.12, display: '0.12 ms', winner: true, percent: 100 },
        { name: 'Brave Shield', value: 0.35, display: '0.35 ms', winner: false, percent: 40 },
        { name: 'Chrome + uBlock Origin', value: 4.8, display: '4.80 ms', winner: false, percent: 15 },
        { name: 'Chrome (Unfiltered)', value: 11.2, display: '11.20 ms', winner: false, percent: 5 },
      ],
    },
  };

  const current = METRICS[selectedMetric];

  return (
    <section id="benchmarks" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-[#24293d]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="font-mono text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">
            EMPIRICAL MEASUREMENTS
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white">
            Measured <span className="text-indigo-400">Efficiency</span>.
          </h2>
        </div>
        <p className="font-sans text-sm text-slate-300 max-w-md leading-relaxed">
          Standardized benchmarks verified under identical hardware conditions. Every millisecond and megabyte saved is returned to the user.
        </p>
      </div>

      {/* Metric Selector Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 font-mono text-xs">
        <button
          type="button"
          onClick={() => setSelectedMetric('memory')}
          className={`px-4 py-2 rounded-xl border font-semibold transition-all cursor-pointer ${
            selectedMetric === 'memory'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
              : 'bg-[#131620] border-[#24293d] text-slate-400 hover:text-white'
          }`}
        >
          RAM & Tab Hibernation
        </button>
        <button
          type="button"
          onClick={() => setSelectedMetric('speed')}
          className={`px-4 py-2 rounded-xl border font-semibold transition-all cursor-pointer ${
            selectedMetric === 'speed'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
              : 'bg-[#131620] border-[#24293d] text-slate-400 hover:text-white'
          }`}
        >
          Speedometer 3.0
        </button>
        <button
          type="button"
          onClick={() => setSelectedMetric('privacy')}
          className={`px-4 py-2 rounded-xl border font-semibold transition-all cursor-pointer ${
            selectedMetric === 'privacy'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
              : 'bg-[#131620] border-[#24293d] text-slate-400 hover:text-white'
          }`}
        >
          Filter Latency (ms)
        </button>
      </div>

      {/* Comparative Progress Bars Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
        <div className="tech-card lg:col-span-8 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-xl font-bold text-white">{current.title}</h3>
            <span className="font-mono text-[10px] text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
              {current.unit}
            </span>
          </div>
          <p className="font-sans text-xs text-slate-400 mb-6">{current.sub}</p>

          <div className="space-y-4">
            {current.bars.map((bar) => (
              <div key={bar.name} className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className={`font-semibold ${bar.winner ? 'text-white' : 'text-slate-400'}`}>
                    {bar.name}
                  </span>
                  <span className={`font-bold ${bar.winner ? 'text-indigo-400' : 'text-slate-400'}`}>
                    {bar.display}
                  </span>
                </div>
                <div className="w-full h-3 bg-[#0e1017] rounded-full overflow-hidden border border-[#24293d]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      bar.winner ? 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]' : 'bg-slate-700'
                    }`}
                    style={{ width: `${bar.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Big Stat Box */}
        <div className="tech-card lg:col-span-4 rounded-3xl p-6 sm:p-8 flex flex-col justify-between bg-gradient-to-br from-[#131620] to-[#1e1b4b]/30">
          <div>
            <span className="font-mono text-xs text-indigo-400 font-bold uppercase tracking-widest block mb-2">
              BEST IN CLASS
            </span>
            <div className="font-display font-extrabold text-5xl sm:text-6xl text-white tracking-tight">
              {current.highlight}
            </div>
            <p className="font-sans text-xs text-slate-300 mt-4 leading-relaxed">
              Nova suspends inactive rendering processes at the compositor level without losing back/forward tab state.
            </p>
          </div>
          <div className="pt-6 border-t border-[#24293d] mt-6 flex items-center gap-2 font-mono text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Audited Benchmark Baseline</span>
          </div>
        </div>
      </div>

      {/* Interactive RAM Savings Simulator */}
      <div className="tech-card rounded-3xl p-6 sm:p-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="lg:max-w-md space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Sliders className="w-4 h-4" />
              <span>Interactive Memory Simulator</span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Estimate Your Hardware Savings
            </h3>
            <p className="font-sans text-xs sm:text-sm text-slate-300 leading-relaxed">
              Adjust the open tab slider to observe how Nova’s automatic hibernation engine prevents workstation memory degradation.
            </p>

            <div className="pt-3">
              <div className="flex justify-between font-mono text-xs text-slate-300 mb-2">
                <span>Active Tabs: <strong className="text-white">{tabCount} Tabs</strong></span>
                <span className="text-indigo-400 font-bold">{tabCount >= 40 ? 'Heavy Multitasking' : 'Standard Session'}</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={tabCount}
                onChange={(e) => setTabCount(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-[#24293d] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between font-mono text-[10px] text-slate-400 mt-1">
                <span>5 Tabs</span>
                <span>50 Tabs</span>
                <span>100 Tabs</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:w-3/5">
            <div className="p-5 rounded-2xl bg-[#0e1017] border border-indigo-500/40">
              <span className="font-mono text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Nova Footprint</span>
              <div className="font-display font-extrabold text-3xl text-white my-1">
                ~{novaRam} <span className="text-xs font-mono font-normal text-slate-400">MB</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400">DOM Hibernated</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0e1017] border border-[#24293d]">
              <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chrome Baseline</span>
              <div className="font-display font-extrabold text-3xl text-slate-300 my-1">
                ~{(chromeRam / 1024).toFixed(1)} <span className="text-xs font-mono font-normal text-slate-500">GB</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500">({chromeRam} MB)</span>
            </div>

            <div className="p-5 rounded-2xl bg-indigo-950/60 border border-indigo-500/50">
              <span className="font-mono text-[10px] font-bold text-indigo-300 uppercase tracking-wider">RAM Saved</span>
              <div className="font-display font-extrabold text-3xl text-emerald-400 my-1">
                {savedPercent}%
              </div>
              <span className="font-mono text-[10px] text-indigo-300">~{(savedRam / 1024).toFixed(1)} GB Free RAM</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benchmarks;
