import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import {
  Github,
  Star,
  GitFork,
  Activity,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

interface RepoData {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  updatedAt: string;
}

type RepoStatus = 'loading' | 'live' | 'error';

export const GithubStats: React.FC = () => {
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [repoStatus, setRepoStatus] = useState<RepoStatus>('loading');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('30d');
  const [hoveredPoint, setHoveredPoint] = useState<{ date: string; stars: number; index: number } | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isSectionInView = useInView(sectionRef, { once: true, amount: 0.12 });

  const fetchRepo = useCallback(async () => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setRepoStatus('loading');
    try {
      const res = await fetch('https://api.github.com/repos/unitybtw/nova-browser', {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
      const json = await res.json();
      if (controller.signal.aborted) return;
      setRepoData({
        stars: json.stargazers_count ?? 0,
        forks: json.forks_count ?? 0,
        watchers: json.subscribers_count ?? 0,
        openIssues: json.open_issues_count ?? 0,
        updatedAt: json.updated_at ? new Date(json.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown',
      });
      setRepoStatus('live');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (!controller.signal.aborted) {
        setRepoData(null);
        setRepoStatus('error');
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    void fetchRepo();
    return () => {
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
    };
  }, [fetchRepo]);

  // Simulated Star Growth Trajectory Data based on selected timeframe
  const CHART_DATA = {
    '7d': [
      { date: 'Day 1', stars: Math.max(1, (repoData?.stars ?? 0) - 6) },
      { date: 'Day 2', stars: Math.max(1, (repoData?.stars ?? 0) - 5) },
      { date: 'Day 3', stars: Math.max(1, (repoData?.stars ?? 0) - 4) },
      { date: 'Day 4', stars: Math.max(1, (repoData?.stars ?? 0) - 3) },
      { date: 'Day 5', stars: Math.max(1, (repoData?.stars ?? 0) - 2) },
      { date: 'Day 6', stars: Math.max(1, (repoData?.stars ?? 0) - 1) },
      { date: 'Today', stars: repoData?.stars ?? 0 },
    ],
    '30d': [
      { date: 'Week 1', stars: Math.max(1, Math.floor((repoData?.stars ?? 0) * 0.2)) },
      { date: 'Week 2', stars: Math.max(1, Math.floor((repoData?.stars ?? 0) * 0.45)) },
      { date: 'Week 3', stars: Math.max(1, Math.floor((repoData?.stars ?? 0) * 0.75)) },
      { date: 'Week 4', stars: repoData?.stars ?? 0 },
    ],
    'all': [
      { date: 'Jul 2026', stars: 1 },
      { date: 'Aug 2026 (v1.0.0)', stars: Math.max(1, Math.floor((repoData?.stars ?? 0) * 0.5)) },
      { date: 'Current', stars: repoData?.stars ?? 0 },
    ],
  };

  const points = CHART_DATA[timeframe];
  const maxStars = Math.max(...points.map((p) => p.stars), 10);
  const minStars = Math.min(...points.map((p) => p.stars), 0);

  // SVG Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const getCoordinates = (index: number, value: number) => {
    const x = paddingX + (index / (points.length - 1)) * (svgWidth - paddingX * 2);
    const range = maxStars - minStars || 1;
    const y = svgHeight - paddingY - ((value - minStars) / range) * (svgHeight - paddingY * 2);
    return { x, y };
  };

  const polylinePoints = points
    .map((p, i) => {
      const { x, y } = getCoordinates(i, p.stars);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPath = `M ${getCoordinates(0, points[0].stars).x},${getCoordinates(0, points[0].stars).y} ` +
    points.map((p, i) => `L ${getCoordinates(i, p.stars).x},${getCoordinates(i, p.stars).y}`).join(' ') +
    ` L ${getCoordinates(points.length - 1, points[points.length - 1].stars).x},${svgHeight - paddingY}` +
    ` L ${getCoordinates(0, points[0].stars).x},${svgHeight - paddingY} Z`;

  return (
    <section
      ref={sectionRef}
      id="community"
      className={`community-section mx-auto max-w-7xl border-t border-[#e5e5e5] px-4 py-20 sm:px-6 sm:py-24${isSectionInView ? ' is-visible' : ''}`}
    >
      <div className="editorial-rail" aria-hidden="true"><span>03</span><i /></div>
      {/* Section Header */}
      <div className="mb-10 flex flex-col gap-5 sm:mb-12 md:flex-row md:items-end md:justify-between md:gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`h-2 w-2 rounded-full ${repoStatus === 'live' ? 'bg-emerald-500 animate-ping' : repoStatus === 'loading' ? 'bg-amber-400 animate-pulse' : 'bg-neutral-300'}`} aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
              {repoStatus === 'live' ? 'LIVE PUBLIC REPOSITORY DATA' : repoStatus === 'loading' ? 'CONNECTING TO PUBLIC API' : 'PUBLIC API UNAVAILABLE'}
            </span>
          </div>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-[#171717] tracking-tight">
            Open Source <span className="text-[#4338ca]">Velocity</span>.
          </h2>
        </div>
        <p className="font-sans text-neutral-600 max-w-md text-sm leading-relaxed">
          {repoStatus === 'live'
            ? 'Live repository metrics are read from the public GitHub API. The trend line is an illustrative view based on the current star count, not a historical audit log.'
            : repoStatus === 'loading'
              ? 'Connecting to the public GitHub API. Metrics will appear here when the repository responds.'
              : 'Public GitHub metrics are temporarily unavailable. Open the repository below to view the latest information.'}
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        <div className="luxury-card flex flex-col justify-between rounded-2xl border border-[#e5e5e5] bg-white/85 p-4 shadow-xs backdrop-blur-sm sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              STARS
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div>
            <div className="font-display font-black text-3xl sm:text-4xl text-[#171717]">
              {repoData?.stars ?? '—'}
            </div>
            <span className={`font-mono text-[10px] font-semibold mt-1 inline-block ${repoStatus === 'live' ? 'text-emerald-600' : 'text-neutral-400'}`}>
              {repoStatus === 'live' ? 'Public API synchronized' : repoStatus === 'loading' ? 'Loading public data…' : 'Data unavailable'}
            </span>
          </div>
        </div>

        {/* Metric 2: Forks */}
        <div className="luxury-card flex flex-col justify-between rounded-2xl border border-[#e5e5e5] bg-white/85 p-4 shadow-xs backdrop-blur-sm sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              FORKS
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-[#4338ca]">
              <GitFork className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-display font-black text-3xl sm:text-4xl text-[#171717]">
              {repoData?.forks ?? '—'}
            </div>
            <span className="font-mono text-[10px] text-neutral-400 mt-1 inline-block">
              Community Forks
            </span>
          </div>
        </div>

        {/* Metric 3: License */}
        <div className="luxury-card flex flex-col justify-between rounded-2xl border border-[#e5e5e5] bg-white/85 p-4 shadow-xs backdrop-blur-sm sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              LICENSE
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-display font-black text-2xl sm:text-3xl text-[#171717]">
              MIT
            </div>
            <span className="font-mono text-[10px] text-neutral-400 mt-1 inline-block">
              100% Permissive
            </span>
          </div>
        </div>

        {/* Metric 4: Latest Sync */}
        <div className="luxury-card flex flex-col justify-between rounded-2xl border border-[#e5e5e5] bg-white/85 p-4 shadow-xs backdrop-blur-sm sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              LAST UPDATE
            </span>
            <div className="p-2 rounded-xl bg-neutral-100 text-neutral-700">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-display font-bold text-lg sm:text-xl text-[#171717] truncate">
              {repoData?.updatedAt ?? '—'}
            </div>
            <span className="font-mono text-[10px] text-neutral-400 mt-1 inline-block">
              Active Commits
            </span>
          </div>
        </div>
      </div>

      {repoStatus === 'live' ? (
        /* LIVE INTERACTIVE STAR GROWTH CHART */
        <div className="luxury-card mb-8 rounded-3xl border border-[#e5e5e5] bg-white/90 p-6 shadow-xs backdrop-blur-sm sm:p-8">
        {/* Chart Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2 text-[#4338ca] font-mono text-xs font-bold uppercase tracking-wider mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Star velocity overview</span>
            </div>
            <h3 className="font-display font-bold text-xl text-[#171717]">
              Star Velocity & Milestone Curve
            </h3>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-neutral-500">
              An illustrative trend based on the repository's current public star count—not a historical audit log.
            </p>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl w-fit" role="group" aria-label="Chart timeframe">
            {(['7d', '30d', 'all'] as const).map((t) => {
              const timeframeLabel = t === '7d' ? '7 days' : t === '30d' ? '30 days' : 'All time';
              return (
              <button
                key={t}
                type="button"
                aria-label={`Show ${timeframeLabel}`}
                aria-pressed={timeframe === t}
                onClick={() => {
                  setTimeframe(t);
                  setHoveredPoint(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-semibold cursor-pointer transition-colors ${
                  timeframe === t
                    ? 'bg-[#171717] text-[#fcfbf9] shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {timeframeLabel}
              </button>
              );
            })}
          </div>
        </div>

        {/* SVG Area & Line Chart */}
        <div className="relative w-full overflow-hidden">
          {/* Tooltip Overlay */}
          {hoveredPoint && (
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-[#171717] text-[#fcfbf9] font-mono text-xs shadow-lg flex items-center gap-2 pointer-events-none z-20"
            >
              <span className="text-neutral-400">{hoveredPoint.date}:</span>
              <span className="text-amber-400 font-bold">{hoveredPoint.stars} Stars</span>
            </div>
          )}
          <p aria-live="polite" className="sr-only">
            {hoveredPoint ? `${hoveredPoint.date}: ${hoveredPoint.stars} stars` : ''}
          </p>

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-48 sm:h-64 block select-none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4338ca" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#4338ca" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {[0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = paddingY + (1 - ratio) * (svgHeight - paddingY * 2);
              return (
                <line
                  key={ratio}
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Gradient Area Fill */}
            <path d={areaPath} fill="url(#chartGradient)" />

            {/* Main Sparkline Stroke */}
            <polyline
              fill="none"
              stroke="#4338ca"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
            />

            {/* Interactive Data Points */}
            {points.map((p, idx) => {
              const { x, y } = getCoordinates(idx, p.stars);
              const isHovered = hoveredPoint?.index === idx;
              const selectPoint = () => setHoveredPoint({ date: p.date, stars: p.stars, index: idx });
              return (
                <g
                  key={idx}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`${p.date}: ${p.stars} stars`}
                  onMouseEnter={selectPoint}
                  onFocus={selectPoint}
                  onBlur={() => setHoveredPoint(null)}
                  onPointerDown={selectPoint}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectPoint();
                    }
                  }}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : 4}
                    className="fill-white stroke-[#4338ca] stroke-2 transition-all"
                  />
                  {/* Larger hit area for pointer and touch users */}
                  <circle
                    cx={x}
                    cy={y}
                    r={18}
                    className="fill-transparent"
                    aria-hidden="true"
                  />
                </g>
              );
            })}
          </svg>

          {/* X-Axis Labels */}
          <div className="flex justify-between px-6 pt-2 font-mono text-[11px] text-neutral-400">
            {points.map((p, idx) => (
              <span key={idx}>{p.date}</span>
            ))}
          </div>
        </div>
      </div>
      ) : (
        <div className="mb-8 flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[#4338ca]">
            <Activity className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="font-display text-xl font-bold text-[#171717]">
            {repoStatus === 'loading' ? 'Loading public repository data…' : 'Repository data is unavailable'}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
            {repoStatus === 'loading'
              ? 'Fetching the latest public metrics from GitHub.'
              : 'GitHub could not be reached right now. The live chart is hidden so we do not show estimated history as verified data.'}
          </p>
          {repoStatus === 'error' && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void fetchRepo()}
                className="inline-flex min-h-10 items-center rounded-xl bg-[#171717] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#4338ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2"
              >
                Try again
              </button>
              <a
                href="https://github.com/unitybtw/nova-browser"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center rounded-xl border border-neutral-300 bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[#171717] transition-colors hover:border-[#4338ca] hover:text-[#4338ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2"
              >
                Open repository
              </a>
            </div>
          )}
        </div>
      )}

      <div className="luxury-card relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#171717] via-[#171717] to-[#24213f] p-6 text-[#fcfbf9] sm:flex-row sm:p-8">
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-2">
            <Github aria-hidden="true" className="h-5 w-5 text-white" />
            <h4 className="font-display text-lg font-bold text-white">
              unitybtw/nova-browser
            </h4>
          </div>
          <p className="max-w-xl font-sans text-xs text-neutral-400">
            Star the repository on GitHub to follow latest releases and support autonomous browser computing.
          </p>
        </div>

        <div className="relative z-10 flex w-full items-center gap-3 sm:w-auto">
          <a
            href="https://github.com/unitybtw/nova-browser"
            target="_blank"
            rel="noopener noreferrer"
            className="luxury-button inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#171717] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717] sm:flex-initial"
          >
            <Star aria-hidden="true" className="h-4 w-4 fill-amber-500 text-amber-500" />
            <span>Star on GitHub</span>
          </a>

          <a
            href="https://github.com/unitybtw/nova-browser/fork"
            target="_blank"
            rel="noopener noreferrer"
            className="luxury-button inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-neutral-200 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717] sm:flex-initial"
          >
            <GitFork aria-hidden="true" className="h-4 w-4" />
            <span>Fork</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default GithubStats;
