import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { showConfirm } from '../../utils/confirmDialog';
import { getElectronAPI } from '../../utils/electronBridge';
import { UpdateWidget } from './UpdateWidget';

export interface GeneralSectionProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onClearHistory?: () => void;
}

export const GeneralSection: React.FC<GeneralSectionProps> = ({
  settings,
  onUpdateSettings,
  onClearHistory,
}) => {
  const [appVersion, setAppVersion] = useState<string>(() => {
    return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.4.8';
  });
  const [systemVersions, setSystemVersions] = useState<{
    app: string;
    electron: string;
    chrome: string;
    node: string;
    v8: string;
    platform: string;
    arch: string;
  } | null>(null);

  useEffect(() => {
    if (getElectronAPI()?.getAppVersion) {
      getElectronAPI()?.getAppVersion().then(ver => {
        if (ver) setAppVersion(ver);
      }).catch(() => {});
    }
    if (getElectronAPI()?.getSystemVersions) {
      getElectronAPI()?.getSystemVersions().then(ver => {
        if (ver) setSystemVersions(ver);
      }).catch(() => {});
    }
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">About Nova</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Nova Browser</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Version {appVersion} (Open Source Edition)</p>
          </div>
          <UpdateWidget />
        </div>

        {systemVersions && (
          <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Engine & Security Patch Transparency</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Chromium</div>
                <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">{systemVersions.chrome || '134.0.6998'}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Electron</div>
                <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">{systemVersions.electron}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">V8 Engine</div>
                <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">{systemVersions.v8}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Architecture</div>
                <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">{systemVersions.platform} ({systemVersions.arch})</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 leading-relaxed">
              Patch gap tracking active: Automated CI/CD builds release Chromium security patches with verified platform binaries.
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Language & Layout</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Application Language</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select interface language. Arabic automatically switches UI to RTL layout.</p>
            </div>
            <select
              value={settings.language || 'en'}
              onChange={(e) => onUpdateSettings({ language: e.target.value as any })}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English (LTR)</option>
              <option value="tr">Türkçe (LTR)</option>
              <option value="ar">العربية (RTL)</option>
              <option value="de">Deutsch (LTR)</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">On Startup</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col sm:flex-row gap-2">
          {[
            { id: 'newTab', label: 'Open New Tab Page' },
            { id: 'continue', label: 'Continue where you left off' },
            { id: 'specificPages', label: 'Open a specific page' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => onUpdateSettings({ startupBehavior: opt.id as any })}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                settings.startupBehavior === opt.id || (!settings.startupBehavior && opt.id === 'newTab')
                  ? 'bg-slate-900 text-white shadow-md dark:bg-blue-600 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Search Engine</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
            {[
              { id: 'google', name: 'Google', desc: 'Fast & Accurate' },
              { id: 'duckduckgo', name: 'DuckDuckGo', desc: 'Privacy focused' },
              { id: 'brave', name: 'Brave Search', desc: 'Independent index' },
              { id: 'bing', name: 'Bing', desc: 'AI powered' },
              { id: 'ecosia', name: 'Ecosia', desc: 'Plant trees' },
              { id: 'yahoo', name: 'Yahoo', desc: 'Classic search' }
            ].map(engine => (
              <button
                key={engine.id}
                onClick={() => onUpdateSettings({ searchEngine: engine.id as any })}
                className={`p-4 rounded-xl text-left transition-all ${
                  settings.searchEngine === engine.id
                    ? 'bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-500 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <p className="font-semibold">{engine.name}</p>
                <p className={`text-xs mt-1 ${settings.searchEngine === engine.id ? 'text-blue-700/70 dark:text-blue-400/70' : 'text-slate-500 dark:text-slate-400'}`}>{engine.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Page Translation</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Default Target Language</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Foreign web pages will be translated to this language in 1-click.</p>
            </div>
            <select
              value={settings.defaultTranslationLanguage || 'en'}
              onChange={(e) => onUpdateSettings({ defaultTranslationLanguage: e.target.value })}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="en">English</option>
              <option value="tr">Turkish (Türkçe)</option>
              <option value="de">German (Deutsch)</option>
              <option value="fr">French (Français)</option>
              <option value="es">Spanish (Español)</option>
              <option value="it">Italian (Italiano)</option>
              <option value="ru">Russian (Русский)</option>
              <option value="ar">Arabic (العربية)</option>
              <option value="ja">Japanese (日本語)</option>
              <option value="zh">Chinese (中文)</option>
              <option value="az">Azərbaycan (Azerbaycan)</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Font Size</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 flex gap-2">
          {(['small', 'medium', 'large'] as const).map(size => (
            <button
              key={size}
              onClick={() => onUpdateSettings({ fontSize: size })}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium capitalize transition-all ${
                settings.fontSize === size
                  ? 'bg-slate-900 text-white shadow-md dark:bg-blue-600 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Clear Browsing Data</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Clear History & Cache</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Clear your browsing history, cookies, cache, and more.</p>
          </div>
          <button
            onClick={async () => {
              const confirmed = await showConfirm({
                title: 'Clear Browsing History',
                message: 'Are you sure you want to clear your browsing history?',
                confirmLabel: 'Clear History',
                cancelLabel: 'Cancel'
              });
              if (confirmed) {
                if (onClearHistory) {
                  onClearHistory();
                } else {
                  localStorage.removeItem('browsing_history');
                }
              }
            }}
            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-xl font-medium transition-colors text-sm"
          >
            Clear Data
          </button>
        </div>
      </section>
    </div>
  );
};
