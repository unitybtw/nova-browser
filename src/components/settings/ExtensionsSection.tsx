import React, { useState, useEffect } from 'react';
import { Settings, Upload, ExternalLink, Puzzle, Play, Trash2 } from 'lucide-react';
import { showConfirm, showAlert } from '../../utils/confirmDialog';
import { getElectronAPI } from '../../utils/electronBridge';

export const ExtensionsSection: React.FC = () => {
  const [extensions, setExtensions] = useState<any[]>([]);

  useEffect(() => {
    const fetchExtensions = async () => {
      if (getElectronAPI()?.listExtensions) {
        setExtensions(await getElectronAPI()?.listExtensions() || []);
      }
    };
    fetchExtensions();

    let cleanupExt: (() => void) | void;
    if (getElectronAPI()?.onExtensionChanged) {
      cleanupExt = getElectronAPI()?.onExtensionChanged(async () => {
        if (getElectronAPI()?.listExtensions) {
          const list = await getElectronAPI()?.listExtensions();
          setExtensions(list || []);
        }
      });
    }
    return () => {
      if (typeof cleanupExt === 'function') cleanupExt();
    };
  }, []);

  const handleToggleExtension = async (extId: string, currentEnabled: boolean) => {
    try {
      const nextState = !currentEnabled;
      const api = getElectronAPI();
      if (!api?.toggleExtension) throw new Error('Extension controls are unavailable in this window.');
      const result = await api.toggleExtension(extId, nextState);
      if (result?.error) throw new Error(result.error);
      setExtensions(prev => prev.map(e => e.id === extId ? { ...e, enabled: nextState } : e));
    } catch (e) {
      console.error('Failed to toggle extension:', e);
      void showAlert({ title: 'Extensions', message: e instanceof Error ? e.message : 'The extension could not be updated.' });
    }
  };

  const handleRemoveExtension = async (ext: any) => {
    const confirmed = await showConfirm({
      title: 'Remove Extension',
      message: `Are you sure you want to remove "${ext.name}"?`,
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel'
    });
    if (confirmed) {
      try {
        const res = await getElectronAPI()?.removeExtension?.(ext.id);
        if (res?.error) {
          console.error('Failed to remove extension:', res.error);
          void showAlert({ title: 'Extensions', message: res.error });
          return;
        }
        setExtensions(prev => prev.filter(e => e.id !== ext.id));
      } catch (e) {
        console.error('Failed to remove extension:', e);
      }
    }
  };

  const handleLoadUnpacked = async () => {
    try {
      if (getElectronAPI()?.selectExtensionFolder && getElectronAPI()?.installExtension) {
        const result = await getElectronAPI()?.selectExtensionFolder();
        if (result && !result.canceled && result.folderPath) {
          const installRes = await getElectronAPI()?.installExtension(result.folderPath);
          if (installRes?.error) {
            void showAlert({ title: 'Extensions', message: 'Failed to load extension: ' + installRes.error });
          } else {
            const list = await getElectronAPI()?.listExtensions();
            setExtensions(list || []);
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      void showAlert({ title: 'Extensions', message: e?.message || 'Failed to load extension.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
            <div className="p-2 bg-accent/20 dark:bg-accent/20 text-accent-hover dark:text-accent rounded-xl shadow-inner">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Extensions</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full">
                  Beta
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage and configure your browser extensions.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadUnpacked}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Load Unpacked
            </button>
            <button
              onClick={() => {
                window.open('https://chromewebstore.google.com/', '_blank');
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Chrome Web Store
            </button>
          </div>
        </div>

        {/* Extension Management */}
        {(!extensions || extensions.length === 0) ? (
          <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400">
              <Puzzle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">No extensions installed</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">
                Install extensions from the Chrome Web Store or load an unpacked extension folder from your machine.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => window.open('https://chromewebstore.google.com/', '_blank')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-semibold hover:opacity-95 shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                Explore Chrome Web Store
              </button>
            </div>
          </div>
        ) : (
          <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {extensions.map((ext: any) => (
                <div key={ext.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/50 dark:border-white/5">
                      {ext.iconData ? (
                        <img src={ext.iconData} alt={ext.name} className="w-7 h-7 object-contain" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold uppercase">
                          {ext.name ? ext.name.charAt(0) : <Puzzle className="w-5 h-5" />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{ext.name}</span>
                        {ext.version && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono">
                            v{ext.version}
                          </span>
                        )}
                        {ext.enabled !== false ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20 font-medium">
                            Disabled
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{ext.description || 'No description available'}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 select-all">ID: {ext.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Toggle Extension Enable/Disable */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={ext.enabled !== false}
                      aria-label={ext.enabled !== false ? `Disable ${ext.name}` : `Enable ${ext.name}`}
                      onClick={() => handleToggleExtension(ext.id, ext.enabled !== false)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${ext.enabled !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                      title={ext.enabled !== false ? 'Disable Extension' : 'Enable Extension'}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${ext.enabled !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>

                    {ext.popupUrl && (
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const cleanPopup = ext.popupUrl.replace(/^\.?\//, '');
                          const url = `chrome-extension://${ext.id}/${cleanPopup}`;
                          if (getElectronAPI()?.openExtensionPopup) {
                            getElectronAPI()?.openExtensionPopup(url, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                        title="Open Extension Popup"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Popup</span>
                      </button>
                    )}
                    {ext.optionsUrl && (
                      <button
                        onClick={() => {
                          const cleanOptions = ext.optionsUrl.replace(/^\.?\//, '');
                          window.open(`chrome-extension://${ext.id}/${cleanOptions}`, '_blank');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                        title="Open Options"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Options</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveExtension(ext)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={`Remove ${ext.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
