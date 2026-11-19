import { useId } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from '../../services/i18n';
import { getElectronAPI } from '../../utils/electronBridge';
import { UpdateWidget } from '../settings/UpdateWidget';

/** Quiet canvas-level update control row anchored below the changelog ledger. */
export function UpdateWalkthrough() {
  const { t } = useTranslation();
  const titleId = useId();
  const canCheckUpdates = Boolean(getElectronAPI()?.checkForUpdates);

  return (
    <section
      aria-labelledby={titleId}
      className="border-t border-neutral-200/70 dark:border-white/[0.07] py-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="min-w-0">
        <h2
          id={titleId}
          className="text-[14px] font-medium text-neutral-900 dark:text-neutral-100 tracking-[-0.01em]"
        >
          {t('releaseJournal.updateTitle')}
        </h2>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
          {t('releaseJournal.updateIntro')}
        </p>
      </div>

      <div className="shrink-0 flex items-center">
        {canCheckUpdates ? (
          <UpdateWidget hideChangelogButton />
        ) : (
          <a
            href="https://github.com/unitybtw/nova-browser/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white transition-colors"
          >
            <span>{t('changelog.githubReleases')}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
          </a>
        )}
      </div>
    </section>
  );
}
