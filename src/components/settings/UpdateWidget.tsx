import React from 'react';
import { Check, Download, RefreshCw, ExternalLink, X } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseDate: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export const UpdateWidget = () => {
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
  const [isRestarting, setIsRestarting] = React.useState(false);
  const [showNotesModal, setShowNotesModal] = React.useState(false);

  React.useEffect(() => {
    let unsubs: (() => void)[] = [];
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
      }));
      if (api.onUpdateError) unsubs.push(api.onUpdateError((_: any, err: string) => {
        setStatus('error');
        setErrorMsg(typeof err === 'string' ? err : 'Unknown error');
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
    window.open(url, '_blank');
  };

  if (status === 'downloaded') {
    return (
      <div className="flex flex-col gap-1.5 items-end">
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
            <Check className="w-4 h-4" /> v{updateVersion || 'new'} ready to install
          </span>
          <button
            onClick={install}
            disabled={isRestarting}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isRestarting ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {isRestarting ? 'Updating & Restarting...' : 'Restart & Update'}
          </button>
          {downloadedFilePath && (
            <button
              onClick={showInFolder}
              className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Show downloaded package in folder"
            >
              Show file
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Nova Browser will close, apply update, and automatically restart.
        </p>
      </div>
    );
  }

  if (status === 'downloading') {
    return (
      <div className="flex flex-col gap-1.5 w-full max-w-xs">
        <div className="flex justify-between text-xs">
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            Downloading{updateVersion ? ` v${updateVersion}` : ''}...
          </span>
          <span className="text-slate-600 dark:text-slate-300 font-mono font-medium">
            {progress}% {speed > 0 ? `(${formatBytes(speed)}/s)` : ''}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {total > 0 && (
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>{formatBytes(transferred)} transferred</span>
            <span>{formatBytes(total)} total</span>
          </div>
        )}
      </div>
    );
  }

  if (status === 'available') {
    return (
      <>
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            v{updateVersion || 'new'} available
          </span>
          <button
            onClick={handleDownload}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Download & Install
          </button>
          {releaseNotes && (
            <button
              onClick={() => setShowNotesModal(true)}
              className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              What's New
            </button>
          )}
          <button
            onClick={() => openDownload(downloadUrl || `https://github.com/unitybtw/nova-browser/releases/tag/v${updateVersion || 'latest'}`)}
            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            title="View release notes on GitHub"
          >
            <ExternalLink className="w-3 h-3" /> GitHub
          </button>
          <button
            onClick={check}
            className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Check again
          </button>
        </div>

        {showNotesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">
                    {releaseName || `Nova Browser v${updateVersion}`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Release Notes</p>
                </div>
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                {releaseNotes || 'No release notes provided.'}
              </div>
              <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    handleDownload();
                  }}
                  className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download & Install
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (status === 'up-to-date') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
          <Check className="w-4 h-4" /> Up to date (v{updateVersion || '?'})
        </span>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-changelog'))}
          className="px-3 py-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg font-medium transition-colors cursor-pointer"
        >
          View Changelog
        </button>
        <button onClick={check} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
          Check again
        </button>
      </div>
    );
  }

  if (status === 'error') {
    const isZipError = errorMsg.includes('ZIP file not provided');
    return (
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-red-500 max-w-[240px] truncate" title={errorMsg}>
          {isZipError ? 'Update ready via GitHub' : `Failed: ${errorMsg.substring(0, 45)}`}
        </span>
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Download
        </button>
        <button onClick={check} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors text-xs cursor-pointer">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={check} disabled={status === 'checking'} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-xl font-medium transition-colors text-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer">
        {status === 'checking' ? <div className="w-4 h-4 rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        {status === 'checking' ? 'Checking...' : 'Check for Updates'}
      </button>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-changelog'))}
        className="px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors cursor-pointer"
      >
        View Changelog
      </button>
    </div>
  );
};
