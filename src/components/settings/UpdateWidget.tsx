import React from 'react';
import { Check, Download, RefreshCw, ExternalLink, X, AlertTriangle } from 'lucide-react';
import { SettingsButton } from './SettingsPrimitives';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export const UpdateWidget = ({ hideChangelogButton = false }: { hideChangelogButton?: boolean } = {}) => {
  const [status, setStatus] = React.useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [progress, setProgress] = React.useState(0);
  const [speed, setSpeed] = React.useState(0);
  const [transferred, setTransferred] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [updateVersion, setUpdateVersion] = React.useState('');
  const [releaseName, setReleaseName] = React.useState('');
  const [releaseNotes, setReleaseNotes] = React.useState('');
  const [downloadUrl, setDownloadUrl] = React.useState('');
  const [downloadedFilePath, setDownloadedFilePath] = React.useState('');
  const [integrityVerified, setIntegrityVerified] = React.useState<boolean | null>(null);
  const [isRestarting, setIsRestarting] = React.useState(false);
  const [showNotesModal, setShowNotesModal] = React.useState(false);

  React.useEffect(() => {
    const unsubs: (() => void)[] = [];
    const api = (window as any).electronAPI;
    if (api) {
      if (api.getUpdateInfo) {
        api.getUpdateInfo().then((info: any) => {
          if (info && info.version) {
            setStatus('available');
            setUpdateVersion(info.version);
            setDownloadUrl(info.downloadUrl || '');
            setReleaseNotes(info.releaseNotes || '');
            setReleaseName(info.releaseName || '');
          }
        }).catch(() => {});
      }
      if (api.onUpdateChecking) unsubs.push(api.onUpdateChecking(() => setStatus('checking')));
      if (api.onUpdateAvailable) unsubs.push(api.onUpdateAvailable((_: any, info: any) => {
        setStatus('available');
        setUpdateVersion(info?.version || '');
        setDownloadUrl(info?.downloadUrl || '');
        setReleaseNotes(info?.releaseNotes || '');
        setReleaseName(info?.releaseName || '');
      }));
      if (api.onUpdateNotAvailable) unsubs.push(api.onUpdateNotAvailable((_: any, info: any) => {
        setStatus('up-to-date');
        setUpdateVersion(info?.version || '');
      }));
      if (api.onUpdateDownloadProgress) unsubs.push(api.onUpdateDownloadProgress((_: any, p: any) => {
        setStatus('downloading');
        setProgress(Math.round(p?.percent || 0));
        if (typeof p?.transferred === 'number') setTransferred(p.transferred);
        if (typeof p?.total === 'number') setTotal(p.total);
        if (typeof p?.bytesPerSecond === 'number') setSpeed(p.bytesPerSecond);
      }));
      if (api.onUpdateDownloaded) unsubs.push(api.onUpdateDownloaded((_: any, info: any) => {
        setStatus('downloaded');
        setUpdateVersion(info?.version || '');
        if (info?.filePath) setDownloadedFilePath(info.filePath);
        if (info?.releaseNotes) setReleaseNotes(info.releaseNotes);
        setIntegrityVerified(info?.integrityVerified !== false);
      }));
      if (api.onUpdateError) unsubs.push(api.onUpdateError((_: any, err: unknown) => {
        setStatus('error');
        const msg = typeof err === 'string'
          ? err
          : (err && typeof err === 'object' && typeof (err as any).message === 'string')
            ? (err as any).message
            : 'Unknown error';
        setErrorMsg(msg);
      }));
    }
    return () => unsubs.forEach(u => u());
  }, []);

  const check = async () => {
    setStatus('checking');
    setErrorMsg('');
    const api = (window as any).electronAPI;
    if (api?.checkForUpdates) {
      try {
        const res = await api.checkForUpdates();
        if (res?.isAvailable && res?.version) {
          setStatus('available');
          setUpdateVersion(res.version);
        }
      } catch {
        setStatus('error');
        setErrorMsg('Could not check for updates');
      }
    } else {
      setStatus('error');
      setErrorMsg('Update API not available');
    }
  };

  const handleDownload = async () => {
    setStatus('downloading');
    setProgress(0);
    setTransferred(0);
    setTotal(0);
    setSpeed(0);
    setErrorMsg('');
    const api = (window as any).electronAPI;
    if (api?.downloadUpdate) {
      try {
        const res = await api.downloadUpdate(downloadUrl);
        if (res?.success) {
          setStatus('downloaded');
          if (res?.filePath) setDownloadedFilePath(res.filePath);
          if (res?.version) setUpdateVersion(res.version);
          return;
        }
        setStatus('error');
        setErrorMsg(res?.error || 'Download failed');
        await openDownload(downloadUrl || 'https://github.com/unitybtw/nova-browser/releases/latest');
      } catch (err: any) {
        console.error('Download update error:', err);
        setStatus('error');
        setErrorMsg(err?.message || 'Download failed');
        await openDownload(downloadUrl || 'https://github.com/unitybtw/nova-browser/releases/latest');
      }
    } else {
      setStatus('idle');
      await openDownload(downloadUrl || 'https://github.com/unitybtw/nova-browser/releases/latest');
    }
  };

  const install = async () => {
    setIsRestarting(true);
    const api = (window as any).electronAPI;
    if (api?.installUpdate) {
      try {
        await api.installUpdate();
      } catch (err) {
        console.error('Install update failed:', err);
        setIsRestarting(false);
      }
    }
  };

  const showInFolder = () => {
    const api = (window as any).electronAPI;
    if (downloadedFilePath && api?.showDownloadInFolder) {
      api.showDownloadInFolder(downloadedFilePath);
    }
  };

  const openDownload = async (url: string) => {
    const api = (window as any).electronAPI;
    if (api?.openExternal) {
      try {
        const ok = await api.openExternal(url);
        if (ok) return;
      } catch (_) {}
    }
    setErrorMsg(`Could not open the download automatically. Open it manually: ${url}`);
  };

  if (status === 'downloaded') {
    return (
      <div className="flex flex-col gap-1.5 items-end">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> v{updateVersion || 'new'} ready
          </span>
          <SettingsButton variant="primary" onClick={install} disabled={isRestarting}>
            {isRestarting ? (
              <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>{isRestarting ? 'Restarting...' : 'Restart & Update'}</span>
          </SettingsButton>
          {downloadedFilePath && (
            <SettingsButton variant="ghost" onClick={showInFolder}>
              Show file
            </SettingsButton>
          )}
        </div>
        {integrityVerified === false && (
          <div className="flex items-start gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-snug text-amber-700 dark:text-amber-300 max-w-sm">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              This release published no checksum, so the package could not be integrity-checked.
            </span>
          </div>
        )}
      </div>
    );
  }

  if (status === 'downloading') {
    return (
      <div className="flex flex-col gap-1.5 w-56">
        <div className="flex justify-between text-[11px]">
          <span className="text-neutral-700 dark:text-neutral-300 font-medium">
            Downloading{updateVersion ? ` v${updateVersion}` : ''}...
          </span>
          <span className="text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
            {progress}%{speed > 0 ? ` · ${formatBytes(speed)}/s` : ''}
          </span>
        </div>
        <div className="w-full h-1.5 bg-neutral-200 dark:bg-white/[0.1] rounded-full overflow-hidden">
          <div
            className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {total > 0 && (
          <div className="flex justify-between text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
            <span>{formatBytes(transferred)}</span>
            <span>{formatBytes(total)}</span>
          </div>
        )}
      </div>
    );
  }

  if (status === 'available') {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-300">
            v{updateVersion || 'new'} available
          </span>
          <SettingsButton variant="primary" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </SettingsButton>
          {releaseNotes && (
            <SettingsButton variant="secondary" onClick={() => setShowNotesModal(true)}>
              Notes
            </SettingsButton>
          )}
          <SettingsButton
            variant="ghost"
            onClick={() => openDownload(downloadUrl || `https://github.com/unitybtw/nova-browser/releases/tag/v${updateVersion || 'latest'}`)}
            title="View release on GitHub"
          >
            <ExternalLink className="w-3 h-3" />
          </SettingsButton>
        </div>

        {showNotesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-[#141518] rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-white/[0.09] overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-200 dark:border-white/[0.08] flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                    {releaseName || `Nova Browser v${updateVersion}`}
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Release Notes</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotesModal(false)}
                  className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-white/[0.08] text-neutral-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap font-sans leading-relaxed">
                {releaseNotes || 'No release notes provided.'}
              </div>
              <div className="px-5 py-3 border-t border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.02] flex justify-end gap-2">
                <SettingsButton variant="ghost" onClick={() => setShowNotesModal(false)}>
                  Close
                </SettingsButton>
                <SettingsButton
                  variant="primary"
                  onClick={() => {
                    setShowNotesModal(false);
                    handleDownload();
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download &amp; Install</span>
                </SettingsButton>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (status === 'up-to-date') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> Up to date
        </span>
        {!hideChangelogButton && (
          <SettingsButton
            variant="secondary"
            onClick={() => window.dispatchEvent(new CustomEvent('open-changelog'))}
          >
            Changelog
          </SettingsButton>
        )}
        <SettingsButton variant="ghost" onClick={check}>
          Check again
        </SettingsButton>
      </div>
    );
  }

  if (status === 'error') {
    const isZipError = errorMsg.includes('ZIP file not provided');
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-red-600 dark:text-red-400 max-w-[200px] truncate" title={errorMsg}>
          {isZipError ? 'Update ready via GitHub' : errorMsg.substring(0, 40)}
        </span>
        <SettingsButton variant="primary" onClick={handleDownload}>
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </SettingsButton>
        <SettingsButton variant="secondary" onClick={check}>
          Retry
        </SettingsButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SettingsButton variant="secondary" onClick={check} disabled={status === 'checking'}>
        {status === 'checking' ? (
          <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        <span>{status === 'checking' ? 'Checking...' : 'Check for Updates'}</span>
      </SettingsButton>
      {!hideChangelogButton && (
        <SettingsButton
          variant="ghost"
          onClick={() => window.dispatchEvent(new CustomEvent('open-changelog'))}
        >
          Changelog
        </SettingsButton>
      )}
    </div>
  );
};
