import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  RefreshCw,
  Search,
  X,
  ChevronUp,
} from 'lucide-react';
import { CHANGELOG_DATA, ChangelogItem, ReleaseVersion } from '../data/changelog';
import { fetchAutomatedChangelog, subscribeToRefresh } from '../services/changelogService';
import { useTranslation } from '../services/i18n';
import { ReleaseMedia } from './changelog/ReleaseMedia';
import { UpdateWalkthrough } from './changelog/UpdateWalkthrough';
import './changelog/changelog.css';

interface ChangelogPageProps {
  currentVersion?: string;
  onNavigate?: (url: string) => void;
}

type Category = 'all' | ChangelogItem['category'];
const categories: Category[] = ['all', 'feature', 'improvement', 'performance', 'fix', 'security'];
const categoryKeys = {
  feature: 'categoryFeature',
  improvement: 'categoryImprovement',
  performance: 'categoryPerformance',
  fix: 'categoryFix',
  security: 'categorySecurity',
};

export function ChangelogPage({ currentVersion = '1.5.2', onNavigate }: ChangelogPageProps) {
  const { t } = useTranslation();
  const [releases, setReleases] = useState<ReleaseVersion[]>(CHANGELOG_DATA);
  const [selected, setSelected] = useState(CHANGELOG_DATA[0]?.version || currentVersion);
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const requestId = useRef(0);
  const mounted = useRef(false);
  const content = useRef<HTMLElement>(null);
  const notes = useRef<HTMLElement>(null);

  const apply = useCallback((result: { releases: ReleaseVersion[]; isLive: boolean }) => {
    if (!mounted.current || !result.releases.length) return;
    setReleases(result.releases);
    setLive(result.isLive);
    setSelected(prev =>
      result.releases.some(release => release.version === prev) ? prev : result.releases[0].version
    );
  }, []);

  const refresh = useCallback(async (force = false) => {
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
  }, [apply]);

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

  const release = useMemo(
    () => releases.find(item => item.version === selected) || releases[0],
    [releases, selected]
  );

  // Category counts for quick metrics
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
        change =>
          (category === 'all' || change.category === category) &&
          change.text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
      ),
    [release, category, query]
  );

  const select = (version: string) => {
    setSelected(version);
    setCategory('all');
    setQuery('');
    setCopied(false);
    content.current?.scrollTo({ top: 0, behavior: 'instant' });
  };

  const copyNotesToClipboard = async () => {
    if (!release) return;
    const header = `Nova Browser v${release.version} - ${release.title}\nRelease Date: ${release.date}\n\n`;
    const lede = release.lede ? `${release.lede}\n\n` : '';
    const highlights = release.highlights.length
      ? `Highlights:\n${release.highlights.map(h => `• ${h}`).join('\n')}\n\n`
      : '';
    const changes = `Changes:\n${release.changes.map(c => `[${c.category.toUpperCase()}] ${c.text}`).join('\n')}`;
    const fullText = header + lede + highlights + changes;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = fullText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleScroll = () => {
    if (!content.current) return;
    setShowScrollTop(content.current.scrollTop > 500);
  };

  const scrollToTop = () => {
    content.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!release) return null;

  return (
    <div className="release-journal">
      <header className="journal-header">
        <div className="journal-brand">
          <img src="./logo.svg" alt="Nova" />
          <strong>{t('changelog.releaseNotes')}</strong>
        </div>
        <div className="journal-header-actions">
          <button
            type="button"
            className="journal-copy-notes-btn"
            onClick={copyNotesToClipboard}
            title={copied ? t('releaseJournal.notesCopied') : t('releaseJournal.copyNotes')}
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied ? t('releaseJournal.notesCopied') : t('releaseJournal.copyNotes')}</span>
          </button>
          <a
            href="https://github.com/unitybtw/nova-browser/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="journal-github-link"
          >
            GitHub
            <ArrowUpRight size={14} />
          </a>
        </div>
      </header>

      <div className="journal-layout">
        <aside className="journal-rail">
          <div className="journal-rail-title">
            <h2>{t('releaseJournal.versions')}</h2>
            <button
              onClick={() => void refresh(true)}
              disabled={loading}
              aria-label={t('changelog.syncNotes')}
              title={t('changelog.syncNotes')}
            >
              <RefreshCw size={15} className={loading ? 'journal-spin' : ''} />
            </button>
          </div>
          <nav aria-label={t('changelog.versionsTimeline')}>
            {releases.map((item, i) => (
              <button
                key={item.version}
                onClick={() => select(item.version)}
                aria-current={selected === item.version ? 'true' : undefined}
                className={selected === item.version ? 'active' : ''}
              >
                <span>
                  <strong>{item.version}</strong>
                  {item.version === currentVersion && (
                    <span className="journal-current-pill" title={t('changelog.current')}>
                      <Check size={12} aria-label={t('changelog.current')} />
                    </span>
                  )}
                </span>
                <small>{item.date}</small>
                {i === 0 && <em>{t('releaseJournal.latest')}</em>}
              </button>
            ))}
          </nav>
          <p className="journal-source">{live ? t('changelog.liveSync') : t('releaseJournal.bundledNotes')}</p>
          {loadError && <p className="journal-error-banner" role="alert">{t('releaseJournal.refreshError')}</p>}
        </aside>

        <main className="journal-content" ref={content} onScroll={handleScroll}>
          <section className="journal-opening">
            <div className="journal-opening-meta">
              <span>{release.date}</span>
              <div className="journal-opening-badges">
                {release.badge && <span className="journal-badge-feature">{release.badge}</span>}
                <span className="journal-version-badge">
                  {release.version === currentVersion ? t('changelog.current') : `v${release.version}`}
                </span>
              </div>
            </div>
            <h1>
              Nova {release.version}
              <span>{t('releaseJournal.title')}</span>
            </h1>
            <h2>{release.title}</h2>
            <p>{release.lede || t('changelog.subtitle')}</p>
            <div className="journal-opening-actions">
              <a
                href={`#journal-notes-${release.version}`}
                onClick={event => {
                  event.preventDefault();
                  notes.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {t('releaseJournal.readNotes')}
                <ArrowUpRight size={15} />
              </a>
              {onNavigate && (
                <button onClick={() => onNavigate('nova://newtab')}>
                  {t('changelog.startBrowsing')}
                  <ArrowUpRight size={15} />
                </button>
              )}
            </div>
          </section>

          <ReleaseMedia key={release.version} release={release} />

          {release.highlights.length > 0 && (
            <section className="journal-highlights">
              <h2>{t('releaseJournal.highlights')}</h2>
              <ol>
                {release.highlights.slice(0, 6).map((text, i) => (
                  <li key={i}>
                    <span>
                      <Check size={16} />
                    </span>
                    <p>{text}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <UpdateWalkthrough />

          <section ref={notes} className="journal-notes" id={`journal-notes-${release.version}`}>
            <div className="journal-notes-heading">
              <h2>{t('releaseJournal.allNotes')}</h2>
              <span className="journal-count-badge">
                {filtered.length} / {release.changes.length}
              </span>
            </div>

            <div className="journal-search">
              <Search size={18} />
              <input
                type="search"
                aria-label={t('changelog.searchPlaceholder')}
                placeholder={t('changelog.searchPlaceholder')}
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label={t('changelog.clearFilters')}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="journal-filters" role="group" aria-label={t('changelog.allChanges')}>
              {categories.map(item => {
                const count = categoryCounts[item] || 0;
                if (item !== 'all' && count === 0) return null;
                return (
                  <button
                    key={item}
                    onClick={() => setCategory(item)}
                    aria-pressed={category === item}
                  >
                    <span>{item === 'all' ? t('changelog.allChanges') : t(`changelog.${categoryKeys[item]}`)}</span>
                    <small>({count})</small>
                  </button>
                );
              })}
            </div>

            {filtered.length ? (
              <ul className="journal-change-list">
                {filtered.map((change, i) => (
                  <li key={`${change.category}-${i}`}>
                    <span className={`journal-category category-${change.category}`}>
                      {t(`changelog.${categoryKeys[change.category]}`)}
                    </span>
                    <p>{change.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="journal-empty">
                <h3>{t('releaseJournal.noResults')}</h3>
                <button
                  onClick={() => {
                    setQuery('');
                    setCategory('all');
                  }}
                >
                  {t('changelog.clearFilters')}
                </button>
              </div>
            )}
          </section>

          <footer className="journal-footer">
            <img src="./logo.svg" alt="" />
            <p>{t('releaseJournal.footer')}</p>
            <a
              href="https://github.com/unitybtw/nova-browser/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('releaseJournal.feedback')}
              <ArrowUpRight size={15} />
            </a>
          </footer>

          {showScrollTop && (
            <button
              type="button"
              className="journal-scroll-top-btn"
              onClick={scrollToTop}
              title="Scroll to top"
              aria-label="Scroll to top"
            >
              <ChevronUp size={18} />
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
