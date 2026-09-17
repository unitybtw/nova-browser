import React, { useState } from 'react';
import { Loader2, Check, Zap, Download, Upload } from 'lucide-react';
import { UserSettings } from '../../types/browser';

interface AdvancedSettingsProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onExportData?: () => void;
  onImportData?: (file: File) => void;
  onPurgeMemory?: () => Promise<void> | void;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  settings,
  onUpdateSettings,
  onExportData,
  onImportData,
  onPurgeMemory
}) => {
  const [isPurgingMemory, setIsPurgingMemory] = useState(false);
  const [purgedFeedback, setPurgedFeedback] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">AI Features</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50 mb-8">
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">AI Link Preview (Hover Summaries)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automatically reads and summarizes links when you hover over them. (Uses local WebLLM)</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ aiLinkPreviewEnabled: !settings.aiLinkPreviewEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${settings.aiLinkPreviewEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.aiLinkPreviewEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Password Manager */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Password Manager</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Offer to save and autofill passwords on websites. Credentials are encrypted on this device.</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ passwordManagerEnabled: !settings.passwordManagerEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${settings.passwordManagerEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.passwordManagerEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Memory & Performance</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50 mb-8">
          {/* Automatic Tab Hibernation */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Automatic Tab Hibernation (Memory Saver)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Unloads inactive background tabs from RAM to keep the browser lightning fast</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ tabHibernationEnabled: !(settings.tabHibernationEnabled ?? true) })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${(settings.tabHibernationEnabled ?? true) ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${(settings.tabHibernationEnabled ?? true) ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {(settings.tabHibernationEnabled ?? true) && (
            <div className="p-5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hibernation Inactivity Timeout</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Time after which unused tabs are suspended to save RAM</div>
              </div>
              <select
                value={settings.hibernationTimeoutMinutes ?? 10}
                onChange={(e) => onUpdateSettings({ hibernationTimeoutMinutes: Number(e.target.value) })}
                className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
          )}

          {/* Energy Saver Mode */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Energy Saver Mode (Battery & CPU)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Throttles heavy background canvas shaders and limits particle effects to extend laptop battery life</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ energySaverMode: !(settings.energySaverMode ?? false) })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${settings.energySaverMode ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.energySaverMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Link Preload & DNS Prefetching */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">DNS Prefetching & Link Pre-warming (Speed Booster)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pre-resolves domain names and opens anticipatory sockets on link hover for instant page loads</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ preloadDnsEnabled: !(settings.preloadDnsEnabled ?? true) })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${(settings.preloadDnsEnabled ?? true) ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${(settings.preloadDnsEnabled ?? true) ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Smooth Scrolling Engine */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hardware-Accelerated Smooth Scrolling</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Interpolates page scrolling with GPU composited physics for high refresh rate monitors</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ smoothScrollingEnabled: !(settings.smoothScrollingEnabled ?? true) })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${(settings.smoothScrollingEnabled ?? true) ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${(settings.smoothScrollingEnabled ?? true) ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Instant Memory Purge Action */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Instant RAM & Cache Purge</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Immediately hibernates all background tabs, clears thumbnail cache, and triggers V8 garbage collection</div>
            </div>
            <button
              onClick={async () => {
                setIsPurgingMemory(true);
                try {
                  if (onPurgeMemory) await onPurgeMemory();
                } catch (_) {}
                setTimeout(() => {
                  setIsPurgingMemory(false);
                  setPurgedFeedback(true);
                  setTimeout(() => setPurgedFeedback(false), 3000);
                }, 500);
              }}
              disabled={isPurgingMemory}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            >
              {isPurgingMemory ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  <span>Purging RAM...</span>
                </>
              ) : purgedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">RAM Purged!</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Purge RAM Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">System & Developer</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Use hardware acceleration</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Use GPU to render web pages faster (requires restart)</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ hardwareAcceleration: !settings.hardwareAcceleration })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${settings.hardwareAcceleration ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.hardwareAcceleration ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Developer Mode</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enable "Inspect Element" in right-click menu and advanced tools</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ developerMode: !settings.developerMode })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${settings.developerMode ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.developerMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Backup & Restore</h2>
        <div className="flex gap-4">
          <button
            onClick={onExportData}
            className="flex-1 bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex flex-col items-center justify-center gap-3 group cursor-pointer"
          >
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <Download className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-800 dark:text-slate-100">Export Backup</p>
              <p className="text-xs text-slate-500 mt-1">Save bookmarks & settings to a JSON file</p>
            </div>
          </button>

          <label className="flex-1 bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors flex flex-col items-center justify-center gap-3 group cursor-pointer">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-800 dark:text-slate-100">Import Backup</p>
              <p className="text-xs text-slate-500 mt-1">Restore from a JSON backup file</p>
            </div>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onImportData) onImportData(file);
              }}
            />
          </label>
        </div>
      </section>
    </div>
  );
};
