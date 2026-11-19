import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronUp,
  Copy,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { CHANGELOG_DATA, ChangelogItem, ReleaseVersion } from '../data/changelog';
import { fetchAutomatedChangelog, subscribeToRefresh } from '../services/changelogService';
import { useTranslation } from '../services/i18n';
import { ReleaseMedia } from './changelog/ReleaseMedia';
import { UpdateWalkthrough } from './changelog/UpdateWalkthrough';
import { EASE_OUT } from '../utils/motion';

interface ChangelogPageProps {
  currentVersion?: string;
  onNavigate?: (url: string) => void;
}

type Category = 'all' | ChangelogItem['category'];
type SearchScope = 'current' | 'all';

const categories: Category[] = ['all', 'feature', 'improvement', 'performance', 'fix', 'security'];

const categoryKeys: Record<ChangelogItem['category'], string> = {
  feature: 'categoryFeature',
  improvement: 'categoryImprovement',
  performance: 'categoryPerformance',
  fix: 'categoryFix',
  security: 'categorySecurity',
};

const categoryDotColors: Record<ChangelogItem['category'], string> = {
  feature: 'bg-emerald-500',
  performance: 'bg-amber-500',
  security: 'bg-red-500',
  improvement: 'bg-neutral-400 dark:bg-neutral-500',
  fix: 'bg-sky-500',
};

/** Escapes special regex metacharacters cleanly before highlighting search matches. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Pure JSX substring highlighter (never uses dangerouslySetInnerHTML). */
function renderHighlightedText(text: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const regex = new RegExp(`(${escapeRegExp(trimmed)})`, 'ig');
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <mark
        key={idx}
        className="bg-amber-300/40 dark:bg-amber-400/25 text-inherit rounded-xs px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/** Compares dotted numeric release tags strictly descending (`candidate > current`). */
function isVersionNewer(candidate: string, current: string): boolean {
  const pa = candidate.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = current.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na > nb;
  }
  return false;
}

/** Swiss / Linear Editorial Release Ledger for nova://changelog. */
export function ChangelogPage({ currentVersion = '1.5.2', onNavigate }: ChangelogPageProps) {
  const { t } = useTranslation();
  const [releases, setReleases] = useState<ReleaseVersion[]>(CHANGELOG_DATA);
  const [selected, setSelected] = useState(CHANGELOG_DATA[0]?.version || currentVersion);
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('current');
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const requestId = useRef(0);
  const mounted = useRef(false);
  const contentRef = useRef<HTMLElement>(null);
  const notesRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const timelineNavRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ container: contentRef });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 320,
    damping: 36,
    restDelta: 0.001,
  });

  const apply = useCallback((result: { releases: ReleaseVersion[]; isLive: boolean }) => {
    if (!mounted.current || !result.releases.length) return;
    setReleases(result.releases);
    setLive(result.isLive);
    setSelected((prev) =>
      result.releases.some((release) => release.version === prev)
        ? prev
        : result.releases[0].version
    );
  }, []);

  const refresh = useCallback(
    async (force = false) => {
      const id = ++requestId.current;
      setLoading(true);
      setLoadError(false);
      try {
        const result = await fetchAutomatedChangelog(force);
        if (mounted.current && id === requestId.current) apply(result);
      } catch {
        if (mounted.current && id === requestId.current) setLoadError(true);
      } finally {
        if (mounted.current && id === requestId.current) setLoading(false);
      }
    },
    [apply]
  );

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const stop = subscribeToRefresh(apply);
    return () => {
      mounted.current = false;
      requestId.current++;
      stop();
    };
  }, [refresh, apply]);

  const releaseIndex = useMemo(() => {
    const idx = releases.findIndex((item) => item.version === selected);
    return idx >= 0 ? idx : 0;
  }, [releases, selected]);

  const release = releases[releaseIndex] || releases[0];
  const newerRelease = releaseIndex > 0 ? releases[releaseIndex - 1] : null;
  const olderRelease = releaseIndex < releases.length - 1 ? releases[releaseIndex + 1] : null;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: release?.changes.length || 0 };
    for (const change of release?.changes || []) {
      counts[change.category] = (counts[change.category] || 0) + 1;
    }
    return counts;
  }, [release]);

  const filtered = useMemo(
    () =>
      (release?.changes || []).filter(
        (change) =>
          (category === 'all' || change.category === category) &&
          change.text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
      ),
    [release, category, query]
  );

  const globalMatches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (searchScope !== 'all' || !q) return [];
    return releases
      .map((item) => {
        const matchedHighlights = item.highlights.filter((h) => h.toLocaleLowerCase().includes(q));
        const matchedChanges = item.changes.filter((c) => c.text.toLocaleLowerCase().includes(q));
        const matchedPoints = (item.sections || []).flatMap((sec) =>
          (sec.points || [])
            .filter((p) => p.toLocaleLowerCase().includes(q))
            .map((p) => ({ sectionTitle: sec.title, text: p }))
        );
        const headerMatch =
          item.version.toLocaleLowerCase().includes(q) ||
          item.title.toLocaleLowerCase().includes(q) ||
          (item.lede || '').toLocaleLowerCase().includes(q);
        const matchCount =
          matchedHighlights.length +
          matchedChanges.length +
          matchedPoints.length +
          (headerMatch ? 1 : 0);
        return {
          release: item,
          matchedHighlights,
          matchedChanges,
          matchedPoints,
          matchCount,
        };
      })
      .filter((entry) => entry.matchCount > 0);
  }, [releases, searchScope, query]);

  const totalGlobalHits = useMemo(
    () => globalMatches.reduce((acc, m) => acc + m.matchCount, 0),
    [globalMatches]
  );

  const selectRelease = useCallback((version: string, preserveQuery = false) => {
    setSelected(version);
    setCategory('all');
    if (!preserveQuery) {
      setQuery('');
    }
    setSearchScope('current');
    setCopied(false);
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    const navBtn = timelineNavRef.current?.querySelector(
      `[data-version="${CSS.escape(version)}"]`
    ) as HTMLElement | null;
    navBtn?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  // Keyboard shortcuts: ArrowUp/k, ArrowDown/j, / to focus search, Escape to clear/blur
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('[role="dialog"]')) return;

      const active = document.activeElement as HTMLElement | null;
      if (active === searchInputRef.current && e.key === 'Escape') {
        e.preventDefault();
        if (query) {
          setQuery('');
        } else {
          searchInputRef.current?.blur();
        }
        return;
      }

      const isTypingTarget =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          active.isContentEditable);
      if (isTypingTarget) return;

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if ((e.key === 'ArrowDown' || e.key === 'j') && releases.length > 0) {
        e.preventDefault();
        const nextIdx = Math.min(releaseIndex + 1, releases.length - 1);
        if (nextIdx !== releaseIndex) {
          selectRelease(releases[nextIdx].version);
        }
      } else if ((e.key === 'ArrowUp' || e.key === 'k') && releases.length > 0) {
        e.preventDefault();
        const prevIdx = Math.max(releaseIndex - 1, 0);
        if (prevIdx !== releaseIndex) {
          selectRelease(releases[prevIdx].version);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [releases, releaseIndex, query, selectRelease]);

  const copyNotesToClipboard = async () => {
    if (!release) return;
    const parts: string[] = [
      `# Nova Browser v${release.version} — ${release.title}`,
      `Released: ${release.date}`,
    ];
    if (release.lede) parts.push('', release.lede);
    if (release.highlights.length > 0) {
      parts.push('', '## Highlights', ...release.highlights.map((h) => `- ${h}`));
    }
    if (release.sections && release.sections.length > 0) {
      for (const sec of release.sections) {
        parts.push('', `## ${sec.title}`, sec.body);
        if (sec.points?.length) {
          parts.push(...sec.points.map((p) => `- ${p}`));
        }
      }
    }
    if (release.changes.length > 0) {
      parts.push(
        '',
        '## All Changes',
        ...release.changes.map((c) => `- **[${c.category.toUpperCase()}]** ${c.text}`)
      );
    }
    const markdown = parts.join('\n');

    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = markdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScroll = () => {
    if (!contentRef.current) return;
    setShowScrollTop(contentRef.current.scrollTop > 420);
  };

  const scrollToTop = () => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!release) return null;

  const showScopeSwitcher = searchFocused || query.trim().length > 0;

  return (
    <div className="h-full w-full flex flex-col bg-[#fcfcfd] dark:bg-[#0b0c0e] text-neutral-900 dark:text-neutral-100 overflow-hidden select-text font-sans">
      {/* Whisper-Quiet Sticky Header + 1px Reading Progress Hairline */}
      <header className="h-12 shrink-0 relative border-b border-neutral-200/70 dark:border-white/[0.06] bg-[#fcfcfd]/85 dark:bg-[#0b0c0e]/85 backdrop-blur-md px-5 sm:px-8 flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="./logo.svg" alt="Nova" className="w-[18px] h-[18px] shrink-0" />
          <strong className="text-[13px] font-medium tracking-[-0.01em] text-neutral-900 dark:text-neutral-100 truncate">
            {t('changelog.releaseNotes')}
          </strong>
          {live && (
            <span
              title={t('changelog.liveSync')}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500 pl-1"
            >
              <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Live</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Quiet Borderless Search */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-neutral-100/80 dark:hover:bg-white/[0.04] focus-within:bg-neutral-100/90 dark:focus-within:bg-white/[0.06] transition-colors">
            <Search className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              aria-label={t('changelog.searchPlaceholder')}
              placeholder={t('changelog.searchPlaceholder')}
              value={query}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onChange={(e) => setQuery(e.target.value)}
              className="w-36 focus:w-52 transition-[width] duration-200 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('changelog.clearFilters')}
                className="p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {showScopeSwitcher && (
              <div
                role="group"
                aria-label="Search scope"
                onMouseDown={(e) => e.preventDefault()}
                className="flex items-center gap-1 border-l border-neutral-200/80 dark:border-white/[0.08] pl-2 ml-0.5 text-[11px]"
              >
                <button
                  type="button"
                  aria-pressed={searchScope === 'current'}
                  onClick={() => setSearchScope('current')}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    searchScope === 'current'
                      ? 'text-neutral-950 dark:text-white font-medium bg-white dark:bg-white/[0.1] shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`}
                >
                  v{release.version}
                </button>
                <button
                  type="button"
                  aria-pressed={searchScope === 'all'}
                  onClick={() => setSearchScope('all')}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    searchScope === 'all'
                      ? 'text-neutral-950 dark:text-white font-medium bg-white dark:bg-white/[0.1] shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`}
                >
                  All
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={copyNotesToClipboard}
            title={copied ? t('releaseJournal.notesCopied') : t('releaseJournal.copyNotes')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            {copied ? (
              <Check size={13} className="text-emerald-500" />
            ) : (
              <Copy size={13} />
            )}
            <span className="hidden md:inline">
              {copied ? t('releaseJournal.notesCopied') : 'Copy'}
            </span>
          </button>

          <a
            href="https://github.com/unitybtw/nova-browser/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
          >
            <span>GitHub</span>
            <ArrowUpRight size={13} />
          </a>
        </div>

        {/* 1px Scroll-Linked Reading Progress */}
        <motion.div
          aria-hidden="true"
          style={{ scaleX: smoothProgress }}
          className="absolute inset-x-0 bottom-0 h-px origin-left bg-neutral-900 dark:bg-white pointer-events-none"
        />
      </header>

      {/* Unified Canvas Split Layout */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Minimal Left Version Index */}
        <aside className="w-full md:w-[176px] lg:w-[196px] shrink-0 border-b md:border-b-0 md:border-r border-neutral-200/60 dark:border-white/[0.06] flex flex-col min-h-0">
          <nav
            ref={timelineNavRef}
            aria-label={t('changelog.versionsTimeline')}
            className="flex md:flex-col gap-1 md:gap-0.5 px-4 py-2.5 md:px-5 md:py-10 overflow-x-auto md:overflow-y-auto md:flex-1"
          >
            {releases.map((item) => {
              const isSelected = selected === item.version && !(searchScope === 'all' && query.trim());
              const isCurrent = item.version === currentVersion;
              const isNewUpdate = isVersionNewer(item.version, currentVersion);
              return (
                <button
                  key={item.version}
                  type="button"
                  data-version={item.version}
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => selectRelease(item.version)}
                  className={`relative text-left px-2.5 py-2 md:pl-3.5 md:pr-2 cursor-pointer shrink-0 transition-colors ${
                    isSelected
                      ? 'text-neutral-950 dark:text-white'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  {isSelected && (
                    <>
                      <motion.span
                        layoutId="active-release-rail"
                        aria-hidden="true"
                        transition={{ type: 'spring', stiffness: 520, damping: 40, mass: 0.6 }}
                        className="hidden md:block absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-neutral-950 dark:bg-white"
                      />
                      <span
                        aria-hidden="true"
                        className="md:hidden absolute inset-x-2 bottom-0 h-[1.5px] rounded-full bg-neutral-950 dark:bg-white"
                      />
                    </>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-mono text-[13px] tabular-nums ${
                        isSelected ? 'font-semibold' : 'font-medium'
                      }`}
                    >
                      {item.version}
                    </span>
                    {isCurrent && (
                      <span
                        title={t('changelog.current')}
                        aria-label={t('changelog.current')}
                        className="w-[5px] h-[5px] rounded-full bg-emerald-500 shrink-0"
                      />
                    )}
                    {!isCurrent && isNewUpdate && (
                      <span
                        title="New release available"
                        aria-label="New release available"
                        className="w-[5px] h-[5px] rounded-full bg-sky-500 shrink-0"
                      />
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 whitespace-nowrap">
                    {item.date}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Quiet Bottom Sync Trigger */}
          <div className="hidden md:flex flex-col gap-1.5 px-6 py-4 shrink-0">
            {loadError && (
              <p role="alert" className="text-[11px] text-amber-600 dark:text-amber-400">
                {t('releaseJournal.refreshError')}
              </p>
            )}
            <button
              type="button"
              onClick={() => void refresh(true)}
              disabled={loading}
              aria-label={t('changelog.syncNotes')}
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200 disabled:opacity-40 transition-colors cursor-pointer w-fit"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? t('changelog.syncing') : t('changelog.syncNotes')}</span>
            </button>
          </div>
        </aside>

        {/* Main Editorial Column */}
        <main
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 min-w-0 overflow-y-auto nova-smooth-scroll relative"
        >
          {searchScope === 'all' && query.trim().length > 0 ? (
            /* Pure Typographic Global Cross-Release Search View */
            <div className="max-w-[780px] mx-auto px-6 sm:px-12 py-10 sm:py-14 space-y-8">
              <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6 border-b border-neutral-200/70 dark:border-white/[0.07]">
                <div>
                  <h1 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">
                    Search across all releases
                  </h1>
                  <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">
                    {totalGlobalHits} match{totalGlobalHits === 1 ? '' : 'es'} across{' '}
                    {globalMatches.length} release{globalMatches.length === 1 ? '' : 's'} for
                    &ldquo;{query.trim()}&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setSearchScope('current')}
                    className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Filter v{release.version} only
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setSearchScope('current');
                    }}
                    className="text-neutral-900 dark:text-white underline underline-offset-4 cursor-pointer"
                  >
                    {t('changelog.clearFilters')}
                  </button>
                </div>
              </div>

              {globalMatches.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {t('releaseJournal.noResults')}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setSearchScope('current');
                    }}
                    className="text-xs font-medium text-neutral-900 dark:text-white underline underline-offset-4 cursor-pointer"
                  >
                    {t('changelog.clearFilters')}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200/70 dark:divide-white/[0.07]">
                  {globalMatches.map((entry) => (
                    <section key={entry.release.version} className="py-7 first:pt-0 space-y-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5 text-xs font-mono text-neutral-500 dark:text-neutral-400">
                            <span className="font-semibold text-neutral-950 dark:text-white">
                              v{entry.release.version}
                            </span>
                            <span>{entry.release.date}</span>
                          </div>
                          <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-neutral-900 dark:text-neutral-100 mt-1">
                            {renderHighlightedText(entry.release.title, query)}
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => selectRelease(entry.release.version, true)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                        >
                          <span>Open v{entry.release.version}</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>

                      <ul className="space-y-2.5">
                        {entry.matchedHighlights.map((h, i) => (
                          <li
                            key={`h-${i}`}
                            className="grid grid-cols-1 sm:grid-cols-[118px_1fr] gap-1 sm:gap-6 items-baseline text-[13.5px]"
                          >
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">
                              Highlight
                            </span>
                            <span className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                              {renderHighlightedText(h, query)}
                            </span>
                          </li>
                        ))}
                        {entry.matchedPoints.map((pt, i) => (
                          <li
                            key={`p-${i}`}
                            className="grid grid-cols-1 sm:grid-cols-[118px_1fr] gap-1 sm:gap-6 items-baseline text-[13.5px]"
                          >
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">
                              Chapter
                            </span>
                            <span className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                              {renderHighlightedText(pt.text, query)}
                            </span>
                          </li>
                        ))}
                        {entry.matchedChanges.map((c, i) => (
                          <li
                            key={`c-${i}`}
                            className="grid grid-cols-1 sm:grid-cols-[118px_1fr] gap-1 sm:gap-6 items-baseline text-[13.5px]"
                          >
                            <span className="inline-flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                              <span
                                aria-hidden="true"
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${categoryDotColors[c.category]}`}
                              />
                              <span>{t(`changelog.${categoryKeys[c.category]}`)}</span>
                            </span>
                            <span className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                              {renderHighlightedText(c.text, query)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Authored Editorial Release Journal */
            <AnimatePresence mode="wait" initial={false}>
              <motion.article
                key={release.version}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="max-w-[780px] mx-auto px-6 sm:px-12 py-10 sm:py-14 space-y-12"
              >
                {/* 1. Quiet Editorial Opening */}
                <header className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-neutral-500 dark:text-neutral-400">
                    <span className="text-neutral-900 dark:text-neutral-200 font-medium">
                      Nova {release.version}
                    </span>
                    <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
                      ·
                    </span>
                    <span>{release.date}</span>
                    {release.version === currentVersion && (
                      <>
                        <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-sans text-emerald-700 dark:text-emerald-400">
                          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{t('changelog.current')}</span>
                        </span>
                      </>
                    )}
                    {release.version !== currentVersion && isVersionNewer(release.version, currentVersion) && (
                      <>
                        <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-sans text-sky-600 dark:text-sky-400">
                          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          <span>New release available</span>
                        </span>
                      </>
                    )}
                  </div>

                  <h1 className="text-[28px] sm:text-[38px] font-semibold tracking-[-0.03em] leading-[1.12] text-neutral-950 dark:text-white">
                    {release.title}
                  </h1>

                  <p className="text-[15.5px] sm:text-[16px] leading-[1.68] text-neutral-600 dark:text-neutral-400 max-w-[64ch]">
                    {release.lede || t('changelog.subtitle')}
                  </p>
                </header>

                {/* 2. Immediate Full-Bleed Product Showcase */}
                <ReleaseMedia key={release.version} release={release} />

                {/* 3. Editorial Deep-Dive Chapters (Direct Canvas 2-Col Grid) */}
                {release.sections && release.sections.length > 0 && (
                  <div className="space-y-10">
                    {release.sections.map((section, sIdx) => (
                      <section
                        key={`${section.eyebrow}-${sIdx}`}
                        className="border-t border-neutral-200/70 dark:border-white/[0.07] pt-9 grid grid-cols-1 md:grid-cols-[164px_1fr] gap-3 md:gap-8"
                      >
                        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400 dark:text-neutral-500 md:pt-1.5">
                          {section.eyebrow}
                        </div>

                        <div className="space-y-4 min-w-0">
                          <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white leading-snug">
                            {section.title}
                          </h2>
                          <p className="text-[14.5px] leading-[1.7] text-neutral-600 dark:text-neutral-400">
                            {section.body}
                          </p>

                          {section.stats && section.stats.length > 0 && (
                            <dl className="flex flex-wrap gap-x-10 gap-y-4 pt-2">
                              {section.stats.map((stat, stIdx) => (
                                <div key={stIdx}>
                                  <dt className="text-xs text-neutral-500 dark:text-neutral-400">
                                    {stat.label}
                                  </dt>
                                  <dd className="font-mono text-[24px] font-semibold tracking-tight text-neutral-950 dark:text-white tabular-nums mt-0.5">
                                    {stat.value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          )}

                          {section.points && section.points.length > 0 && (
                            <ul className="space-y-2.5 pt-1">
                              {section.points.map((point, pIdx) => (
                                <li
                                  key={pIdx}
                                  className="flex items-start gap-3 text-[14px] leading-[1.65] text-neutral-700 dark:text-neutral-300"
                                >
                                  <span
                                    aria-hidden="true"
                                    className="text-neutral-300 dark:text-neutral-600 select-none shrink-0"
                                  >
                                    —
                                  </span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </section>
                    ))}
                  </div>
                )}

                {/* 4. Key Highlights (Unboxed Editorial Index) */}
                {release.highlights.length > 0 && (
                  <section className="border-t border-neutral-200/70 dark:border-white/[0.07] pt-9 grid grid-cols-1 md:grid-cols-[164px_1fr] gap-3 md:gap-8">
                    <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400 dark:text-neutral-500 md:pt-1">
                      {t('releaseJournal.highlights')}
                    </h2>

                    <ul className="divide-y divide-neutral-200/60 dark:divide-white/[0.06]">
                      {release.highlights.slice(0, 6).map((text, i) => (
                        <li
                          key={i}
                          className="py-3 first:pt-0 last:pb-0 text-[14px] leading-[1.65] text-neutral-700 dark:text-neutral-300"
                        >
                          {text}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* 5. Swiss Tabular Change Log Ledger */}
                <section
                  ref={notesRef}
                  id={`journal-notes-${release.version}`}
                  className="border-t border-neutral-200/70 dark:border-white/[0.07] pt-10 space-y-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white">
                      {t('releaseJournal.allNotes')}
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                      {filtered.length} / {release.changes.length}
                    </span>
                  </div>

                  {/* Mobile Search Input */}
                  <div className="sm:hidden relative flex items-center border-b border-neutral-200 dark:border-white/[0.08] py-2">
                    <Search className="w-4 h-4 text-neutral-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      aria-label={t('changelog.searchPlaceholder')}
                      placeholder={t('changelog.searchPlaceholder')}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        aria-label={t('changelog.clearFilters')}
                        className="p-0.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Clean Underline Filter Tabs */}
                  <div
                    role="group"
                    aria-label={t('changelog.allChanges')}
                    className="border-b border-neutral-200/70 dark:border-white/[0.07] flex flex-wrap items-center gap-5"
                  >
                    {categories.map((item) => {
                      const count = categoryCounts[item] || 0;
                      if (item !== 'all' && count === 0) return null;
                      const isActive = category === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setCategory(item)}
                          className={`relative pb-2.5 text-[12.5px] font-medium transition-colors cursor-pointer inline-flex items-baseline gap-1.5 ${
                            isActive
                              ? 'text-neutral-950 dark:text-white'
                              : 'text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200'
                          }`}
                        >
                          <span>
                            {item === 'all'
                              ? t('changelog.allChanges')
                              : t(`changelog.${categoryKeys[item]}`)}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums opacity-65">
                            {count}
                          </span>
                          {isActive && (
                            <motion.span
                              layoutId={`cat-underline-${release.version}`}
                              aria-hidden="true"
                              transition={{
                                type: 'spring',
                                stiffness: 520,
                                damping: 40,
                                mass: 0.6,
                              }}
                              className="absolute inset-x-0 -bottom-px h-[1.5px] bg-neutral-950 dark:bg-white"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {filtered.length > 0 ? (
                    <ul className="divide-y divide-neutral-200/60 dark:divide-white/[0.06]">
                      {filtered.map((change, i) => (
                        <motion.li
                          key={`${change.category}-${i}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.16,
                            delay: Math.min(i * 0.02, 0.18),
                            ease: EASE_OUT,
                          }}
                          className="py-3.5 grid grid-cols-1 sm:grid-cols-[118px_1fr] gap-1 sm:gap-6 items-baseline"
                        >
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 shrink-0">
                            <span
                              aria-hidden="true"
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${categoryDotColors[change.category]}`}
                            />
                            <span>{t(`changelog.${categoryKeys[change.category]}`)}</span>
                          </span>
                          <p className="text-[14px] leading-[1.65] text-neutral-800 dark:text-neutral-200">
                            {renderHighlightedText(change.text, query)}
                          </p>
                        </motion.li>
                      ))}
                    </ul>
                  ) : (
                    <div className="py-10 text-center space-y-2.5">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {t('releaseJournal.noResults')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('');
                          setCategory('all');
                        }}
                        className="text-xs font-medium text-neutral-900 dark:text-white underline underline-offset-4 cursor-pointer"
                      >
                        {t('changelog.clearFilters')}
                      </button>
                    </div>
                  )}
                </section>

                {/* 6. Quiet Canvas Update Strip */}
                <UpdateWalkthrough />

                {/* 7. Plain Typographic Adjacent Release Pager */}
                {(newerRelease || olderRelease) && (
                  <nav
                    aria-label="Adjacent releases"
                    className="border-t border-neutral-200/70 dark:border-white/[0.07] pt-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {newerRelease ? (
                      <button
                        type="button"
                        onClick={() => selectRelease(newerRelease.version)}
                        className="text-left group cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                          <ArrowLeft
                            size={12}
                            className="transition-transform group-hover:-translate-x-0.5"
                          />
                          <span>Newer release</span>
                        </span>
                        <span className="block text-[13.5px] font-medium text-neutral-800 group-hover:text-neutral-950 dark:text-neutral-200 dark:group-hover:text-white mt-0.5">
                          v{newerRelease.version}
                        </span>
                      </button>
                    ) : (
                      <div />
                    )}

                    {olderRelease && (
                      <button
                        type="button"
                        onClick={() => selectRelease(olderRelease.version)}
                        className="text-left sm:text-right group cursor-pointer"
                      >
                        <span className="inline-flex items-center sm:justify-end gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                          <span>Previous release</span>
                          <ArrowRight
                            size={12}
                            className="transition-transform group-hover:translate-x-0.5"
                          />
                        </span>
                        <span className="block text-[13.5px] font-medium text-neutral-800 group-hover:text-neutral-950 dark:text-neutral-200 dark:group-hover:text-white mt-0.5">
                          v{olderRelease.version}
                        </span>
                      </button>
                    )}
                  </nav>
                )}

                {/* 8. Minimal Editorial Footer */}
                <footer className="pt-6 pb-8 border-t border-neutral-200/60 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-400 dark:text-neutral-500">
                  <div className="flex items-center gap-2.5">
                    <img src="./logo.svg" alt="" className="w-4 h-4 opacity-75" />
                    <p>{t('releaseJournal.footer')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('nova://newtab')}
                        className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {t('changelog.startBrowsing')}
                      </button>
                    )}
                    <a
                      href="https://github.com/unitybtw/nova-browser/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                      <span>{t('releaseJournal.feedback')}</span>
                      <ArrowUpRight size={12} />
                    </a>
                  </div>
                </footer>
              </motion.article>
            </AnimatePresence>
          )}

          {/* Subtle Scroll-to-Top Control */}
          <AnimatePresence>
            {showScrollTop && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.92, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 6 }}
                transition={{ duration: 0.16, ease: EASE_OUT }}
                onClick={scrollToTop}
                title="Scroll to top"
                aria-label="Scroll to top"
                className="fixed bottom-6 right-6 z-30 p-2 rounded-full bg-white/90 hover:bg-white dark:bg-[#18191e]/90 dark:hover:bg-[#1e2026] text-neutral-700 dark:text-neutral-200 shadow-md ring-1 ring-black/[0.08] dark:ring-white/[0.1] backdrop-blur-md cursor-pointer"
              >
                <ChevronUp size={15} />
              </motion.button>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
