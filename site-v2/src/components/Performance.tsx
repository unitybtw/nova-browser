import { useState } from 'react';
import { Sliders, CheckCircle2 } from 'lucide-react';

export const Performance = () => {
  const [tabCount, setTabCount] = useState<number>(30);
  const [metric, setMetric] = useState<'memory' | 'speed' | 'privacy'>('memory');

  const novaRam = Math.round(180 + tabCount * 18);
  const chromeRam = Math.round(350 + tabCount * 65);
  const savedRam = Math.max(0, chromeRam - novaRam);
  const savedPercent = Math.round((savedRam / chromeRam) * 100);

  const METRICS_DATA = {
    memory: {
      title: '20 Active Tabs RAM Footprint',
      unit: 'MB (Lower is better)',
      highlight: '420 MB',
      description: '-64% RAM reduction through native DOM tree hibernation and compositor suspension',
      bars: [
        { name: 'Nova Browser', value: '420 MB', percent: 100, winner: true },
        { name: 'Brave Browser', value: '920 MB', percent: 45, winner: false },
        { name: 'Google Chrome', value: '1,180 MB', percent: 35, winner: false },
        { name: 'Arc Browser', value: '1,450 MB', percent: 28, winner: false },
      ],
    },
    speed: {
      title: 'Speedometer 3.0 Responsiveness Score',
      unit: 'Score (Higher is better)',
      highlight: '38.4 pts',
      description: 'Direct GPU layout scheduler with zero telemetry overhead',
      bars: [
        { name: 'Nova Browser', value: '38.4 pts', percent: 100, winner: true },
        { name: 'Safari 18', value: '35.6 pts', percent: 92, winner: false },
        { name: 'Google Chrome', value: '32.1 pts', percent: 83, winner: false },
        { name: 'Arc Browser', value: '29.8 pts', percent: 77, winner: false },
      ],
    },
    privacy: {
      title: 'Network Filter Decision Latency',
      unit: 'ms (Lower is better)',
      highlight: '0.12 ms',
      description: 'Rust kernel intercept evaluates rules before DOM layout begins',
      bars: [
        { name: 'Nova (Rust Native Filter)', value: '0.12 ms', percent: 100, winner: true },
        { name: 'Brave Shield', value: '0.35 ms', percent: 40, winner: false },
        { name: 'Chrome + uBlock Origin', value: '4.80 ms', percent: 15, winner: false },
        { name: 'Chrome (Unfiltered)', value: '11.20 ms', percent: 5, winner: false },
      ],
    },
  };

  const current = METRICS_DATA[metric];

  return (
    <section id="performance" className="py-24 px-4 sm:px-6 max-w-5xl mx-auto border-t border-[#252a3f]">
      <div className="mb-12">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          Measured Hardware Efficiency
        </h2>
        <p className="mt-3 text-base text-slate-300">
          Standardized benchmarks verified under identical hardware conditions. Every megabyte saved remains available for your local AI models and compilation tasks.
        </p>
      </div>

      {/* Metric Switcher */}
      <div className="flex flex-wrap gap-2 mb-8 font-mono text-xs">
        <button
          type="button"
          onClick={() => setMetric('memory')}
          className={`px-4 py-2 rounded-xl border font-semibold transition-colors cursor-pointer ${
            metric === 'memory'
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-[#141724] border-[#252a3f] text-slate-300 hover:text-white'
          }`}
        >
          RAM & Hibernation
        </button>
        <button
          type="button"
          onClick={() => setMetric('speed')}
          className={`px-4 py-2 rounded-xl border font-semibold transition-colors cursor-pointer ${
            metric === 'speed'
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-[#141724] border-[#252a3f] text-slate-300 hover:text-white'
          }`}
        >
          Speedometer 3.0
        </button>
        <button
          type="button"
          onClick={() => setMetric('privacy')}
          className={`px-4 py-2 rounded-xl border font-semibold transition-colors cursor-pointer ${
            metric === 'privacy'
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-[#141724] border-[#252a3f] text-slate-300 hover:text-white'
          }`}
        >
          Filter Latency (ms)
        </button>
      </div>

      {/* Benchmark Progress Chart */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
        <div className="surface-panel md:col-span-8 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display text-xl font-bold text-white">{current.title}</h3>
            <span className="font-mono text-[10px] text-indigo-400 font-bold uppercase bg-[#1a1e2f] border border-[#252a3f] px-2 py-0.5 rounded">
              {current.unit}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-6">{current.description}</p>

          <div className="space-y-4">
            {current.bars.map((bar) => (
              <div key={bar.name} className="space-y-1 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className={bar.winner ? 'text-white font-semibold' : 'text-slate-400'}>
                    {bar.name}
                  </span>
                  <span className={bar.winner ? 'text-indigo-400 font-bold' : 'text-slate-400'}>
                    {bar.value}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#08090f] rounded-full overflow-hidden border border-[#252a3f]">
                  <div
                    className={`h-full rounded-full ${bar.winner ? 'bg-indigo-500' : 'bg-slate-700'}`}
                    style={{ width: `${bar.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel md:col-span-4 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <span className="font-mono text-xs text-indigo-400 font-bold uppercase block mb-1">
              Top Result
            </span>
            <div className="font-display font-extrabold text-5xl text-white">
              {current.highlight}
            </div>
            <p className="text-xs text-slate-300 mt-4 leading-relaxed">
              Nova releases background render handles without losing forward/backward tab state in 0.04ms.
            </p>
          </div>
          <div className="pt-6 border-t border-[#252a3f] mt-6 flex items-center gap-2 font-mono text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Empirical Baseline</span>
          </div>
        </div>
      </div>

      {/* RAM Savings Interactive Slider */}
      <div className="surface-panel p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="lg:max-w-md space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold uppercase">
              <Sliders className="w-4 h-4" />
              <span>Interactive Memory Simulator</span>
            </div>
            <h3 className="font-display text-2xl font-bold text-white">
              Estimate Your Workstation RAM Savings
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Slide to observe how Nova’s automatic DOM tree hibernation scales across heavy multitasking workflows.
            </p>

            <div className="pt-2">
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
                className="w-full h-2 bg-[#252a3f] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between font-mono text-[10px] text-slate-400 mt-1">
                <span>5 Tabs</span>
                <span>50 Tabs</span>
                <span>100 Tabs</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 lg:w-3/5">
            <div className="p-4 rounded-xl bg-[#0d0f17] border border-indigo-500/40">
              <span className="font-mono text-[10px] font-bold text-indigo-400 uppercase">Nova Footprint</span>
              <div className="font-display font-extrabold text-2xl text-white my-1">
                ~{novaRam} <span className="text-xs font-mono font-normal text-slate-400">MB</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400">DOM Hibernated</span>
            </div>

            <div className="p-4 rounded-xl bg-[#0d0f17] border border-[#252a3f]">
              <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">Chrome Baseline</span>
              <div className="font-display font-extrabold text-2xl text-slate-300 my-1">
                ~{(chromeRam / 1024).toFixed(1)} <span className="text-xs font-mono font-normal text-slate-500">GB</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500">({chromeRam} MB)</span>
            </div>

            <div className="p-4 rounded-xl bg-[#1e1b4b]/50 border border-indigo-500/50">
              <span className="font-mono text-[10px] font-bold text-indigo-300 uppercase">RAM Saved</span>
              <div className="font-display font-extrabold text-2xl text-emerald-400 my-1">
                {savedPercent}%
              </div>
              <span className="font-mono text-[10px] text-indigo-300">~{(savedRam / 1024).toFixed(1)} GB Free</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Performance;
