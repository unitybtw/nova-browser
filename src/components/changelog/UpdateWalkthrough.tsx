import { useId, useState } from 'react';
import { Check, Download, RefreshCw, ArrowRight, Monitor } from 'lucide-react';
import { useTranslation } from '../../services/i18n';
import { UpdateWidget } from '../settings/UpdateWidget';

export function UpdateWalkthrough() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const titleId = useId();
  const icons = [RefreshCw, Download, Check];
  const Icon = icons[step];
  return <section className="journal-updates" aria-labelledby={titleId}>
    <div className="journal-update-intro"><h2 id={titleId}>{t('releaseJournal.updateTitle')}</h2><p>{t('releaseJournal.updateIntro')}</p></div>
    <div className="journal-update-grid">
      <div>
        <div className="journal-step-tabs" role="group" aria-label={t('releaseJournal.walkthrough')}>
          {icons.map((StepIcon, i) => <button key={i} aria-pressed={step === i} onClick={() => setStep(i)}><StepIcon size={17} />{t(`releaseJournal.step${i}Title`)}</button>)}
        </div>
        <div className="journal-step-detail">
          <div className="journal-step-art" aria-hidden="true"><img src="./logo.svg" alt="" /><span><Icon size={26} /></span></div>
          <div><h3>{t(`releaseJournal.step${step}Heading`)}</h3><p>{t(`releaseJournal.step${step}Body`)}</p><button className="journal-text-button" onClick={() => setStep((step + 1) % 3)}>{t('releaseJournal.nextStep')}<ArrowRight size={16} /></button></div>
        </div>
        <p className="journal-demo-note">{t('releaseJournal.illustration')}</p>
      </div>
      <aside className="journal-update-live"><div className="journal-update-live-heading"><Monitor size={18} /><h3>{t('releaseJournal.thisDevice')}</h3></div>
        {window.electronAPI?.checkForUpdates ? <div className="journal-device-widget"><UpdateWidget /></div> : <><p>{t('releaseJournal.desktopOnly')}</p><a href="https://github.com/unitybtw/nova-browser/releases" target="_blank" rel="noopener noreferrer">{t('changelog.githubReleases')}<ArrowRight size={16} /></a></>}
      </aside>
    </div>
  </section>;
}
