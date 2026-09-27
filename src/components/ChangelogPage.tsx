import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from 'framer-motion';
import {
  ShieldCheck,
  Bug,
  Zap,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Search,
  RefreshCw,
  Globe,
  Sparkles,
  SearchX,
} from 'lucide-react';
import {
  CHANGELOG_DATA,
  ReleaseVersion,
  ChangelogItem,
  ReleaseSection,
} from '../data/changelog';
import { fetchAutomatedChangelog, subscribeToRefresh } from '../services/changelogService';
import { useTranslation } from '../services/i18n';

interface ChangelogPageProps {
  currentVersion?: string;
  onNavigate?: (url: string) => void;
}

type CategoryFilter = 'all' | ChangelogItem['category'];

const CATEGORY_ORDER: ChangelogItem['category'][] = [
  'feature',
  'improvement',
  'performance',
  'fix',
  'security',
];

const EASE = [0.16, 1, 0.3, 1] as const;

export const ChangelogPage: React.FC<ChangelogPageProps> = ({
  currentVersion = '1.4.9',
  onNavigate,
}) => {
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation();

  const [releases, setReleases] = useState<ReleaseVersion[]>(CHANGELOG_DATA);
  const [selectedVersion, setSelectedVersion] = useState<string>(
    () => CHANGELOG_DATA[0]?.version || currentVersion
  );
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // Guards against a slow fetch resolving after a newer one, and against
  // applying a stale `selectedVersion` from a closed-over render.
  const requestIdRef = useRef(0);
  const selectedVersionRef = useRef(selectedVersion);
  selectedVersionRef.current = selectedVersion;

  const loadData = useCallback(async (force = false) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const result = await fetchAutomatedChangelog(force);
      if (requestId !== requestIdRef.current) return;
      if (result.releases && result.releases.length > 0) {
        setReleases(result.releases);
        setIsLive(result.isLive);
        setSelectedVersion(prev =>
          result.releases.some(r => r.version === prev)
            ? prev
            : result.releases[0].version
        );
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      console.warn('[ChangelogPage] Error loading changelog:', e);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);

    // The service refreshes the cache in the background, after this page has
    // already rendered from it. Apply that result in place so a new release is
    // visible without navigating away and back.
    const unsubscribe = subscribeToRefresh(result => {
      if (result.releases.length === 0) return;
      setReleases(result.releases);
      setIsLive(result.isLive);
      setSelectedVersion(prev =>
        result.releases.some(r => r.version === prev) ? prev : result.releases[0].version
      );
    });

    // Only the listener is dropped on unmount. The scheduled refresh belongs to
    // the subscriber set and is cleared by the *last* unsubscribe, so closing
    // this tab can no longer cancel the refresh another tab is waiting for.
    return unsubscribe;
  }, [loadData]);

  const currentRelease = useMemo(
    () =>
      releases.find(r => r.version === selectedVersion) ||
      releases[0] ||
      CHANGELOG_DATA[0],
    [releases, selectedVersion]
  );

  const isCurrentRelease = currentRelease?.version === currentVersion;

  const query = searchQuery.trim().toLowerCase();

  // Bundled releases ship curated editorial chapters. Releases fetched live
  // from GitHub only have highlights/changes, so we derive chapters from them
  // rather than rendering an empty story.
  const sections = useMemo(
    () => resolveSections(currentRelease),
    [currentRelease]
  );

  const counts = useMemo(() => {
    const map = new Map<ChangelogItem['category'], number>();
    for (const item of currentRelease?.changes ?? []) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return map;
  }, [currentRelease]);

  const grouped = useMemo(() => {
    const buckets = CATEGORY_ORDER.map(category => ({
      category,
      items: (currentRelease?.changes ?? []).filter(
        item =>
          item.category === category &&
          (!query || item.text.toLowerCase().includes(query))
      ),
    })).filter(bucket => bucket.items.length > 0);
    return buckets;
  }, [currentRelease, query]);

  const totalMatches = useMemo(
    () => grouped.reduce((sum, bucket) => sum + bucket.items.length, 0),
    [grouped]
  );

  const visibleGroups = useMemo(
    () =>
      activeCategory === 'all'
        ? grouped
        : grouped.filter(bucket => bucket.category === activeCategory),
    [grouped, activeCategory]
  );

  // A release change or a filter activation both mean "show me the list".
  const isFiltering = query.length > 0 || activeCategory !== 'all';
  const showEditorial = !isFiltering;

  // When the story collapses, keep the reader where the answer is.
  const listRef = useRef<HTMLElement | null>(null);
  const wasFilteringRef = useRef(isFiltering);
  useEffect(() => {
    if (isFiltering && !wasFilteringRef.current) {
      listRef.current?.scrollIntoView({ block: 'start' });
    }
    wasFilteringRef.current = isFiltering;
  }, [isFiltering]);

  const categoryMeta = useCallback(
    (category: ChangelogItem['category']) => {
      switch (category) {
        case 'feature':
          return {
            label: t('changelog.categoryFeature'),
            icon: Sparkles,
            accent: 'text-sky-600 dark:text-sky-400',
            dot: 'bg-sky-500',
          };
        case 'security':
          return {
            label: t('changelog.categorySecurity'),
            icon: ShieldCheck,
            accent: 'text-emerald-600 dark:text-emerald-400',
            dot: 'bg-emerald-500',
          };
        case 'fix':
          return {
            label: t('changelog.categoryFix'),
            icon: Bug,
            accent: 'text-orange-600 dark:text-orange-400',
            dot: 'bg-orange-500',
          };
        case 'performance':
          return {
            label: t('changelog.categoryPerformance'),
            icon: Zap,
            accent: 'text-violet-600 dark:text-violet-400',
            dot: 'bg-violet-500',
          };
        case 'improvement':
        default:
          return {
            label: t('changelog.categoryImprovement'),
            icon: CheckCircle2,
            accent: 'text-slate-500 dark:text-slate-400',
            dot: 'bg-slate-400',
          };
      }
    },
    [t]
  );

  if (!currentRelease) return null;

  return (
    <div className="w-full h-full overflow-y-auto bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ── Sticky rail: identity, versions, search ─────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-5 sm:px-8">
          <div className="flex shrink-0 items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {t('changelog.releaseNotes')}
            </span>
            {isLive && (
              <span
                title={t('changelog.liveSync')}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
              >
                <Globe className="h-2.5 w-2.5" />
                <span className="hidden sm:inline">{t('changelog.liveSync')}</span>
              </span>
            )}
          </div>

          <nav
            aria-label={t('changelog.versionsTimeline')}
            className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex items-center gap-1.5">
              {releases.map(release => {
                const active = release.version === selectedVersion;
                const installed = release.version === currentVersion;
                return (
                  <button
                    key={release.version}
                    onClick={() => setSelectedVersion(release.version)}
                    aria-current={active ? 'true' : undefined}
                    className={`relative shrink-0 cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold transition-all duration-200 ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100'
                    }`}
                  >
                    {release.version}
                    {installed && (
                      <span
                        aria-hidden="true"
                        className={`ml-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full align-middle ${
                          active ? 'bg-emerald-400' : 'bg-emerald-500'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="relative hidden w-44 shrink-0 sm:block lg:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('changelog.searchPlaceholder')}
              aria-label={t('changelog.searchPlaceholder')}
              className="w-full rounded-full border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-3 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-700 dark:focus:bg-slate-900"
            />
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-200/70 dark:border-slate-800/70">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-56 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--nova-accent,theme(colors.sky.500)/0.14),transparent)] blur-3xl"
            animate={
              reduceMotion
                ? { opacity: 0.5 }
                : { opacity: [0.3, 0.55, 0.3], scale: [1, 1.06, 1] }
            }
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`hero-${currentRelease.version}`}
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="relative mx-auto max-w-6xl px-5 pb-14 pt-16 sm:px-8 sm:pb-20 sm:pt-24"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-mono text-[12px] font-semibold tracking-tight text-slate-900 dark:text-white">
                v{currentRelease.version}
              </span>
              <span aria-hidden="true" className="h-px w-6 bg-slate-300 dark:bg-slate-700" />
              <span className="text-[12px] text-slate-500 dark:text-slate-400">
                {currentRelease.date}
              </span>
              {currentRelease.badge && (
                <span className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                  {currentRelease.badge}
                </span>
              )}
              {isCurrentRelease && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {t('changelog.current')}
                </span>
              )}
            </div>

            <h1 className="mt-6 max-w-4xl text-[2.1rem] font-light leading-[1.08] tracking-[-0.03em] text-slate-900 sm:text-5xl lg:text-[3.4rem] dark:text-white">
              {currentRelease.title}
            </h1>

            <p className="mt-6 max-w-2xl font-serif text-[17px] italic leading-relaxed text-slate-500 dark:text-slate-400">
              {currentRelease.lede || t('changelog.subtitle')}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-2">
              {onNavigate && (
                <motion.button
                  onClick={() => onNavigate('nova://newtab')}
                  whileHover={reduceMotion ? undefined : { y: -1 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {t('changelog.startBrowsing')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </motion.button>
              )}
              <motion.button
                onClick={() => loadData(true)}
                disabled={isLoading}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-slate-100"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? t('changelog.syncing') : t('changelog.syncNotes')}
              </motion.button>
              <a
                href="https://github.com/unitybtw/nova-browser/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {t('changelog.githubReleases')}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ── Editorial chapters ──────────────────────────────────────── */}
      <AnimatePresence mode="wait" initial={false}>
        {showEditorial ? (
          <motion.div
            key={`story-${currentRelease.version}`}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {currentRelease.hero && (
              <div className="border-b border-slate-200/70 px-5 pb-16 sm:px-8 sm:pb-24 dark:border-slate-800/70">
                <div className="mx-auto max-w-6xl">
                  <Figure
                    media={currentRelease.hero}
                    reduceMotion={!!reduceMotion}
                    priority
                  />
                </div>
              </div>
            )}

            {sections.map((section, idx) => (
              <Chapter
                key={`${currentRelease.version}-${idx}`}
                section={section}
                index={idx}
                reduceMotion={!!reduceMotion}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={`filter-${currentRelease.version}-${activeCategory}`}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16"
          >
            <p className="font-serif text-[17px] italic text-slate-500 dark:text-slate-400">
              {t('changelog.resultsCount', {
                count: totalMatches,
                total: currentRelease.changes.length,
              })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Every change, line by line ──────────────────────────────── */}
      <section
        ref={listRef}
        className="scroll-mt-14 border-t border-slate-200/70 bg-slate-50/60 dark:border-slate-800/70 dark:bg-slate-900/30"
      >
        <div className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              v{currentRelease.version}
            </span>
            <h2 className="text-2xl font-light tracking-[-0.02em] text-slate-900 sm:text-3xl dark:text-white">
              {t('changelog.everythingElse')}
            </h2>
          </div>

          {/* Filters: on narrow layouts the search field from the rail moves here */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label={t('changelog.allChanges')}
              className="flex flex-wrap items-center gap-1.5"
            >
              {(['all', ...CATEGORY_ORDER] as CategoryFilter[])
                .filter(cat => cat === 'all' || counts.get(cat as ChangelogItem['category']))
                .map(cat => {
                  const meta =
                    cat === 'all'
                      ? null
                      : categoryMeta(cat as ChangelogItem['category']);
                  const Icon = meta?.icon;
                  const active = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveCategory(cat)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100'
                      }`}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      {cat === 'all'
                        ? t('changelog.allChanges')
                        : categoryMeta(cat as ChangelogItem['category']).label}
                    </button>
                  );
                })}
              {isFiltering && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-slate-500 underline underline-offset-4 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  {t('changelog.clearFilters')}
                </button>
              )}
            </div>

            <div className="relative w-full sm:hidden">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('changelog.searchPlaceholder')}
                aria-label={t('changelog.searchPlaceholder')}
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {visibleGroups.length > 0 ? (
            <div className="mt-10 space-y-9">
              {visibleGroups.map(bucket => {
                const meta = categoryMeta(bucket.category);
                const Icon = meta.icon;
                return (
                  <section key={bucket.category}>
                    <div className="flex items-center gap-2.5">
                      <span className={`inline-flex h-6 w-6 items-center justify-center ${meta.accent}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        {meta.label}
                      </h3>
                      <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                        {bucket.items.length}
                      </span>
                      <span aria-hidden="true" className={`h-px flex-1 ${meta.dot} opacity-20`} />
                    </div>

                    <ul className="mt-3.5 space-y-0.5">
                      {bucket.items.map(item => (
                        <li
                          key={item.text}
                          className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white dark:hover:bg-slate-900/60"
                        >
                          <span
                            aria-hidden="true"
                            className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`}
                          />
                          <span className="text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                            {item.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-800">
              <SearchX className="h-5 w-5 text-slate-300 dark:text-slate-600" />
              <p className="text-[13px] text-slate-500 dark:text-slate-400">
                {t('changelog.noChanges')}
              </p>
              {(query || activeCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="cursor-pointer text-[12px] font-semibold text-slate-900 underline underline-offset-4 dark:text-slate-100"
                >
                  {t('changelog.clearFilters')}
                </button>
              )}
            </div>
          )}

          <div className="mt-14 flex items-center justify-center gap-2 border-t border-slate-200/70 pt-6 text-[12px] text-slate-400 dark:border-slate-800/70 dark:text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t('changelog.current')} · v{currentVersion}
          </div>
        </div>
      </section>
    </div>
  );
};

/* ── One editorial chapter: text on one side, screenshot on the other ── */

const Chapter: React.FC<{
  section: ReleaseSection;
  index: number;
  reduceMotion: boolean;
}> = ({ section, index, reduceMotion }) => {
  const flipped = index % 2 === 1;
  const hasMedia = !!section.media;

  const reveal = reduceMotion
    ? { initial: { opacity: 0 }, whileInView: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 28 },
        whileInView: { opacity: 1, y: 0 },
      };

  return (
    <section className="border-b border-slate-200/70 last:border-b-0 dark:border-slate-800/70">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <motion.div
          {...reveal}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease: EASE }}
          className={`grid items-center gap-10 lg:gap-16 ${
            hasMedia ? 'lg:grid-cols-12' : ''
          }`}
        >
          <div className={hasMedia ? 'lg:col-span-5' : 'lg:col-span-8'}>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] font-semibold text-slate-300 dark:text-slate-600">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span aria-hidden="true" className="h-px w-8 bg-slate-200 dark:bg-slate-800" />
              <span className="font-serif text-[13px] italic text-slate-500 dark:text-slate-400">
                {section.eyebrow}
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-light leading-[1.15] tracking-[-0.02em] text-slate-900 sm:text-[2rem] dark:text-white">
              {section.title}
            </h2>

            <p className="mt-5 max-w-xl text-[15px] leading-[1.75] text-slate-600 dark:text-slate-400">
              {section.body}
            </p>

            {section.points && section.points.length > 0 && (
              <ul className="mt-7 space-y-3">
                {section.points.map(point => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300"
                  >
                    <CheckCircle2 className="mt-[3px] h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {section.stats && section.stats.length > 0 && (
              <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-5 border-t border-slate-200 pt-6 dark:border-slate-800">
                {section.stats.map(stat => (
                  <div key={`${stat.value}-${stat.label}`}>
                    {/* A `div` group inside `dl` accepts dt/dd only, so the label
                        lives in the `dd` (which permits flow content) rather than
                        in a trailing `<p>`, and there is no sr-only `<dt>`: it
                        would announce the label twice, once as the term and once
                        as its own visible definition. */}
                    <dd className="text-2xl font-light tracking-tight text-slate-900 dark:text-white">
                      {stat.value}
                      <span className="mt-1 block max-w-[15rem] text-[12px] font-normal leading-snug tracking-normal text-slate-500 dark:text-slate-500">
                        {stat.label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {section.media && (
            <div className={flipped ? 'lg:col-span-7 lg:order-first' : 'lg:col-span-7'}>
              <Figure media={section.media} reduceMotion={reduceMotion} />
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

/* ── Screenshot presentation: the real product, unretouched ──────────── */

const Figure: React.FC<{
  media: { src: string; alt: string; caption?: string };
  reduceMotion: boolean;
  priority?: boolean;
}> = ({ media, reduceMotion, priority }) => (
  <figure>
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: EASE }}
      className="group overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]"
    >
      <img
        src={media.src}
        alt={media.alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`block w-full ${
          reduceMotion
            ? ''
            : 'transition-transform duration-[1.2s] ease-out group-hover:scale-[1.015]'
        }`}
      />
    </motion.div>
    {media.caption && (
      <figcaption className="mt-4 text-[12px] leading-relaxed text-slate-400 dark:text-slate-500">
        {media.caption}
      </figcaption>
    )}
  </figure>
);

/**
 * Curated chapters for bundled releases; for live GitHub releases we build a
 * single narrative chapter from whatever highlights exist.
 */
function resolveSections(release: ReleaseVersion | undefined): ReleaseSection[] {
  if (!release) return [];
  if (release.sections && release.sections.length > 0) return release.sections;

  const highlights = release.highlights ?? [];
  if (highlights.length > 0) {
    return [
      {
        eyebrow: release.date,
        title: release.title,
        body: highlights[0],
        points: highlights.slice(1),
      },
    ];
  }

  return [];
}
