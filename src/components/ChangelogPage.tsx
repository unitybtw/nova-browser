import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Bug, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink, 
  Calendar, 
  Search,
  Layers,
  RefreshCw,
  Globe
} from 'lucide-react';
import { CHANGELOG_DATA, ReleaseVersion, ChangelogItem } from '../data/changelog';
import { fetchAutomatedChangelog } from '../services/changelogService';

interface ChangelogPageProps {
  currentVersion?: string;
  onNavigate?: (url: string) => void;
}

type CategoryFilter = 'all' | 'feature' | 'fix' | 'security' | 'performance';

export const ChangelogPage: React.FC<ChangelogPageProps> = ({
  currentVersion = '1.4.7',
  onNavigate
}) => {
  const [releases, setReleases] = useState<ReleaseVersion[]>(CHANGELOG_DATA);
  const [selectedVersion, setSelectedVersion] = useState<string>(() => {
    return CHANGELOG_DATA[0]?.version || '1.4.7';
  });
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);

  const loadData = useCallback(async (force = false) => {
    setIsLoading(true);
    try {
      const result = await fetchAutomatedChangelog(force);
      if (result.releases && result.releases.length > 0) {
        setReleases(result.releases);
        setIsLive(result.isLive);
        // If current selected version doesn't exist in new list, select the latest
        if (!result.releases.some(r => r.version === selectedVersion)) {
          setSelectedVersion(result.releases[0].version);
        }
      }
    } catch (e) {
      console.warn('[ChangelogPage] Error loading changelog:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedVersion]);

  useEffect(() => {
    loadData(false);
  }, []);

  const currentRelease = useMemo(() => {
    return releases.find(r => r.version === selectedVersion) || releases[0] || CHANGELOG_DATA[0];
  }, [releases, selectedVersion]);

  const filteredChanges = useMemo(() => {
    if (!currentRelease) return [];
    return currentRelease.changes.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = !searchQuery.trim() || 
        item.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [currentRelease, activeCategory, searchQuery]);

  const getCategoryMeta = (cat: ChangelogItem['category']) => {
    switch (cat) {
      case 'feature':
        return {
          label: 'Feature',
          icon: Sparkles,
          className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
        };
      case 'security':
        return {
          label: 'Security',
          icon: ShieldCheck,
          className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        };
      case 'fix':
        return {
          label: 'Fix',
          icon: Bug,
          className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
        };
      case 'performance':
        return {
          label: 'Performance',
          icon: Zap,
          className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
        };
      case 'improvement':
      default:
        return {
          label: 'Improvement',
          icon: CheckCircle2,
          className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
        };
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none">
      {/* Top Banner & Header */}
      <div className="relative border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Release Notes
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold">
                v{currentVersion}
              </span>
              {isLive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  <span>GitHub Live Sync</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              What's New in Nova Browser
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Explore recent features, security enhancements, and performance fixes in your installed version.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => loadData(true)}
              disabled={isLoading}
              title="Check GitHub for latest release notes"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
              <span className="hidden sm:inline">{isLoading ? 'Syncing...' : 'Sync Notes'}</span>
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate('nova://newtab')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Start Browsing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>GitHub Releases</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: Version List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Versions Timeline
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {releases.length} releases
            </span>
          </div>

          <div className="space-y-2">
            {releases.map((release) => {
              const isSelected = release.version === selectedVersion;
              const isInstalled = release.version === currentVersion;
              return (
                <button
                  key={release.version}
                  onClick={() => setSelectedVersion(release.version)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 border-indigo-500/40 dark:border-indigo-500/40 shadow-sm ring-1 ring-indigo-500/20'
                      : 'bg-white/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 hover:bg-white dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold font-mono text-sm text-slate-900 dark:text-white">
                      v{release.version}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isInstalled && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Current
                        </span>
                      )}
                      {release.badge && !isInstalled && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {release.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-1">
                    {release.title}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{release.date}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content: Selected Version Details */}
        <div className="lg:col-span-8 space-y-6">
          {currentRelease && (
            <>
              {/* Release Header Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      v{currentRelease.version}
                    </h2>
                    {currentRelease.version === currentVersion && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Installed & Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{currentRelease.date}</span>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                  {currentRelease.title}
                </h3>

                {/* Highlights */}
                {currentRelease.highlights && currentRelease.highlights.length > 0 && (
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                    <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-2.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Key Highlights</span>
                    </div>
                    <ul className="space-y-1.5">
                      {currentRelease.highlights.map((highlight, idx) => (
                        <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Category Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-900/80 border border-slate-300/40 dark:border-slate-800/60 w-full sm:w-auto overflow-x-auto">
                  {(['all', 'feature', 'fix', 'security', 'performance'] as CategoryFilter[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                        activeCategory === cat
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? 'All Changes' : cat}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in changes..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {/* Changes List */}
              <div className="space-y-3">
                {filteredChanges.length > 0 ? (
                  filteredChanges.map((change, idx) => {
                    const meta = getCategoryMeta(change.category);
                    const IconComponent = meta.icon;
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 flex items-start gap-3.5 shadow-sm"
                      >
                        <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${meta.className}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${meta.className}`}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                            {change.text}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No changes found matching the selected filter.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
