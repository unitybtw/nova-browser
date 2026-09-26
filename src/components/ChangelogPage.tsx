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
  Calendar,
  Search,
  RefreshCw,
  Globe,
  Sparkles,
} from 'lucide-react';
import { CHANGELOG_DATA, ReleaseVersion, ChangelogItem } from '../data/changelog';
import { fetchAutomatedChangelog } from '../services/changelogService';
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

export const ChangelogPage: React.FC<ChangelogPageProps> = ({
  currentVersion = '1.4.8',
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
  }, [loadData]);

  const currentRelease = useMemo(
    () =>
      releases.find(r => r.version === selectedVersion) ||
      releases[0] ||
      CHANGELOG_DATA[0],
    [releases, selectedVersion]
  );

  const isCurrentRelease = currentRelease?.version === currentVersion;

  const counts = useMemo(() => {
    const map = new Map<ChangelogItem['category'], number>();
    for (const item of currentRelease?.changes ?? []) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return map;
  }, [currentRelease]);

  const query = searchQuery.trim().toLowerCase();

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

  const categoryMeta = useCallback(
    (category: ChangelogItem['category']) => {
      switch (category) {
        case 'feature':
          return {
            label: t('changelog.categoryFeature'),
            icon: Sparkles,
            accent: 'text-sky-600 dark:text-sky-400',
            dot: 'bg-sky-500',
            ring: 'ring-sky-500/20',
          };
        case 'security':
          return {
            label: t('changelog.categorySecurity'),
            icon: ShieldCheck,
            accent: 'text-emerald-600 dark:text-emerald-400',
            dot: 'bg-emerald-500',
            ring: 'ring-emerald-500/20',
          };
        case 'fix':
          return {
            label: t('changelog.categoryFix'),
            icon: Bug,
            accent: 'text-orange-600 dark:text-orange-400',
            dot: 'bg-orange-500',
            ring: 'ring-orange-500/20',
          };
        case 'performance':
          return {
            label: t('changelog.categoryPerformance'),
            icon: Zap,
            accent: 'text-violet-600 dark:text-violet-400',
            dot: 'bg-violet-500',
            ring: 'ring-violet-500/20',
          };
        case 'improvement':
        default:
          return {
            label: t('changelog.categoryImprovement'),
            icon: CheckCircle2,
            accent: 'text-slate-500 dark:text-slate-400',
            dot: 'bg-slate-400',
            ring: 'ring-slate-400/20',
          };
      }
    },
    [t]
  );

  // Motion presets — one place to respect the reduced-motion preference.
  const fade = reduceMotion
    ? { duration: 0 }
    : { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const };
  const rise = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
      };
  const listItem = reduceMotion
    ? { duration: 0 }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
      };

  if (!currentRelease) return null;

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-slate-200/70 dark:border-slate-800/70">
        {/* Ambient aurora — pure decoration, never intercepts pointer events. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-40 left-1/2 h-80 w-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--nova-accent,theme(colors.sky.500)/0.16),transparent)] blur-2xl"
            animate={
              reduceMotion
                ? { opacity: 0.5 }
                : { opacity: [0.35, 0.6, 0.35], scale: [1, 1.08, 1] }
            }
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-10 sm:pt-16 sm:pb-12">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2.5"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              {t('changelog.releaseNotes')}
            </span>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <Globe className="h-2.5 w-2.5" />
                {t('changelog.liveSync')}
              </span>
            )}
          </motion.div>

          {/* Version as the centerpiece. */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2"
          >
            <h1 className="font-mono text-5xl sm:text-6xl font-semibold tracking-tighter leading-none text-slate-900 dark:text-white">
              v{currentRelease.version}
            </h1>
            <span className="mb-1.5 inline-flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              {currentRelease.date}
            </span>
          </motion.div>

          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-xl sm:text-2xl font-semibold leading-snug tracking-tight text-slate-800 dark:text-slate-100"
          >
            {currentRelease.title}
          </motion.h2>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-2.5 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400"
          >
            {t('changelog.subtitle')}
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 flex flex-wrap items-center gap-2"
          >
            {onNavigate && (
              <motion.button
                onClick={() => onNavigate('nova://newtab')}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
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
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
              />
              {isLoading ? t('changelog.syncing') : t('changelog.syncNotes')}
            </motion.button>
            <a
              href="https://github.com/unitybtw/nova-browser/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              {t('changelog.githubReleases')}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </div>
      </div>

      {/* ── Version rail ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/85">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t('changelog.versionsTimeline')}
            </span>
            {releases.map(release => {
              const active = release.version === selectedVersion;
              const installed = release.version === currentVersion;
              return (
                <button
                  key={release.version}
                  onClick={() => setSelectedVersion(release.version)}
                  aria-current={active ? 'true' : undefined}
                  className={`relative shrink-0 cursor-pointer rounded-full border px-3 py-1.5 font-mono text-[12px] font-semibold transition-all duration-200 ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100'
                  }`}
                >
                  {release.version}
                  {installed && (
                    <span
                      aria-hidden="true"
                      className="ml-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-emerald-500 align-middle"
                    />
                  )}
                </button>
              );
            })}
            <span className="ml-auto shrink-0 pl-3 text-[11px] text-slate-400 dark:text-slate-500">
              {t('changelog.releasesCount', { count: releases.length })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentRelease.version}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={fade}
            className="space-y-10"
          >
            {/* Highlights */}
            {currentRelease.highlights?.length > 0 && (
              <section>
                <SectionHeading>
                  {t('changelog.keyHighlights')}
                </SectionHeading>
                <ul className="mt-4 space-y-2.5">
                  {currentRelease.highlights.map((highlight, idx) => (
                    <motion.li
                      key={highlight}
                      {...listItem}
                      transition={{ ...listItem.transition, delay: idx * 0.05 }}
                      className="flex items-start gap-2.5 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{highlight}</span>
                    </motion.li>
                  ))}
                </ul>
              </section>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('changelog.searchPlaceholder')}
                  aria-label={t('changelog.searchPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/15 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-white/15"
                />
              </div>
            </div>

            {/* Change groups */}
            {visibleGroups.length > 0 ? (
              <div className="space-y-8">
                {visibleGroups.map((bucket, groupIdx) => {
                  const meta = categoryMeta(bucket.category);
                  const Icon = meta.icon;
                  return (
                    <motion.section
                      key={bucket.category}
                      {...rise}
                      transition={{
                        duration: 0.4,
                        delay: groupIdx * 0.06,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${meta.ring} bg-white dark:bg-slate-900 ${meta.accent}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-700 dark:text-slate-200">
                          {meta.label}
                        </h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                          {bucket.items.length}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`h-px flex-1 ${meta.dot} opacity-20`}
                        />
                      </div>

                      <ul className="mt-3 space-y-0.5">
                        {bucket.items.map((item, idx) => (
                          <motion.li
                            key={item.text}
                            {...listItem}
                            transition={{
                              ...listItem.transition,
                              delay: Math.min(idx * 0.035, 0.4),
                            }}
                            className="group flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white dark:hover:bg-slate-900/60"
                          >
                            <span
                              aria-hidden="true"
                              className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`}
                            />
                            <span className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                              {item.text}
                            </span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.section>
                  );
                })}
              </div>
            ) : (
              <motion.div
                {...rise}
                className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center dark:border-slate-800"
              >
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  {t('changelog.noChanges')}
                </p>
                {(query || activeCategory !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('all');
                    }}
                    className="mt-3 cursor-pointer text-[12px] font-semibold text-slate-900 underline underline-offset-4 dark:text-slate-100"
                  >
                    {t('changelog.allChanges')}
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Installed-version marker: the page is opened right after an update. */}
        {isCurrentRelease && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-12 flex items-center justify-center gap-2 border-t border-slate-200/70 pt-6 text-[12px] text-slate-400 dark:border-slate-800/70 dark:text-slate-500"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t('changelog.current')} · v{currentVersion}
          </motion.div>
        )}
      </div>
    </div>
  );
};

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
    {children}
  </h3>
);
