import React, { useState, useEffect } from 'react';
import { ShieldCheck, ExternalLink, Trash2, Cpu } from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { showConfirm } from '../../utils/confirmDialog';
import { getElectronAPI } from '../../utils/electronBridge';
import { aiAgent } from '../../services/aiAgent';
import { ToggleSwitch } from './ToggleSwitch';

export interface PrivacySectionProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

export const PrivacySection: React.FC<PrivacySectionProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [aiVramTimeout, setAiVramTimeout] = useState<number>(() => aiAgent.getAutoParkTimeoutMinutes());
  const [aiEngineLoaded, setAiEngineLoaded] = useState<boolean>(() => aiAgent.isEngineLoaded());
  const [rememberedPermCount, setRememberedPermCount] = useState<number>(0);
  const [resettingPerms, setResettingPerms] = useState(false);
  const [resetPermsSuccess, setResetPermsSuccess] = useState(false);
  const [aiCacheStatus, setAiCacheStatus] = useState<string>('');
  const [isClearingCache, setIsClearingCache] = useState<boolean>(false);

  useEffect(() => {
    if (getElectronAPI()?.getRememberedPermissionsCount) {
      getElectronAPI()!.getRememberedPermissionsCount().then((count: number) => {
        setRememberedPermCount(count || 0);
      }).catch(() => {});
    }
  }, []);

  const handleResetRememberedPermissions = async () => {
    if (!getElectronAPI()?.resetRememberedPermissions) return;
    setResettingPerms(true);
    try {
      await getElectronAPI()!.resetRememberedPermissions();
      setRememberedPermCount(0);
      setResetPermsSuccess(true);
      setTimeout(() => setResetPermsSuccess(false), 3000);
    } catch (_) {}
    setResettingPerms(false);
  };

  useEffect(() => {
    return aiAgent.onStatus(() => {
      setAiEngineLoaded(aiAgent.isEngineLoaded());
    });
  }, []);

  const handleClearAiCache = async () => {
    const confirmed = await showConfirm({
      title: 'Clear AI Cache',
      message: 'Clear all downloaded local AI model files and temporary cache?',
      confirmLabel: 'Clear Cache',
      cancelLabel: 'Cancel'
    });
    if (!confirmed) return;
    setIsClearingCache(true);
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await window.caches.keys();
        for (const k of keys) {
          await window.caches.delete(k);
        }
      }
      if (getElectronAPI()?.clearAiModelsCache) {
        await getElectronAPI()!.clearAiModelsCache();
      }
      setAiCacheStatus('AI model cache cleared successfully!');
      setTimeout(() => setAiCacheStatus(''), 4000);
    } catch (e: any) {
      setAiCacheStatus('Failed to clear cache: ' + (e?.message || String(e)));
    } finally {
      setIsClearingCache(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
          <div className="p-6 flex items-start gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Ad & Tracker Blocking</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6 max-w-lg">
                Nova's Privacy Shield blocks malicious scripts, tracking cookies, and intrusive ads across all websites. It uses Ghostery and Cliqz blocklists to keep your browsing fast and secure.
              </p>

              <button
                onClick={() => onUpdateSettings({ privacyShield: !settings.privacyShield })}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  settings.privacyShield
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {settings.privacyShield ? 'Shield is Active' : 'Enable Shield'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Tracking & Cookies</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Send a "Do Not Track" request</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Request that your browsing traffic is not tracked</div>
            </div>
            <ToggleSwitch
              checked={settings.doNotTrack}
              onToggle={() => onUpdateSettings({ doNotTrack: !settings.doNotTrack })}
            />
          </div>

          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Clear cookies on exit</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Clear cookies and site data when you close all windows</div>
            </div>
            <ToggleSwitch
              checked={settings.clearOnExit}
              onToggle={() => onUpdateSettings({ clearOnExit: !settings.clearOnExit })}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Binary Integrity</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>SHA-256 Checksum Verification</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                REPRODUCIBLE CI
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Every release publishes a <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">SHA256SUMS.txt</code> file. Run <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">sha256sum -c SHA256SUMS.txt</code> to verify your download before installing.
            </div>
          </div>
          <a
            href="https://github.com/unitybtw/nova-browser/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-xs font-semibold shrink-0 transition-colors"
          >
            <span>View Checksums</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Site Permissions</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Remembered Authorizations</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Permissions granted to websites (camera, microphone, notifications, location) automatically expire after 30 days. You can revoke all remembered permissions immediately.
            </div>
            {rememberedPermCount > 0 && (
              <div className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                Active permissions remembered for <span className="font-semibold text-blue-500">{rememberedPermCount}</span> origin{rememberedPermCount > 1 ? 's' : ''}.
              </div>
            )}
          </div>
          <button
            onClick={handleResetRememberedPermissions}
            disabled={resettingPerms}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/30 rounded-xl text-xs font-semibold transition-colors shrink-0"
          >
            {resetPermsSuccess ? 'Permissions Cleared!' : resettingPerms ? 'Resetting...' : 'Reset All Permissions'}
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">AI Storage & Model Cache</h2>
        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Purge AI Model Cache</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Delete downloaded local WebLLM neural network weights to free up disk space</div>
            {aiCacheStatus && (
              <div className={`text-xs mt-2 font-medium ${aiCacheStatus.includes('successfully') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {aiCacheStatus}
              </div>
            )}
          </div>
          <button
            onClick={handleClearAiCache}
            disabled={isClearingCache}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isClearingCache ? 'Clearing...' : 'Clear AI Cache'}
          </button>
        </div>

        <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>GPU VRAM & Anti-Jank Engine Management</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md">
                Auto-parks the resident 3B model from VRAM when idle to eliminate scroll jank and keep GPU memory available for heavy web browsing.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium border ${
                aiEngineLoaded
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}>
                {aiEngineLoaded ? `VRAM: ~${aiAgent.getVramEstimate()} MB` : 'VRAM: 0 MB (Parked)'}
              </span>
              {aiEngineLoaded && (
                <button
                  onClick={async () => {
                    await aiAgent.parkModel();
                    setAiEngineLoaded(false);
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Park Now
                </button>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Inactivity Auto-Park Timeout</div>
              <div className="text-[11px] text-slate-400">Duration before resident WebLLM weights are automatically released from VRAM.</div>
            </div>
            <select
              value={aiVramTimeout}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setAiVramTimeout(val);
                aiAgent.setAutoParkTimeoutMinutes(val);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value={1}>1 minute</option>
              <option value={3}>3 minutes (Recommended)</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={0}>Disabled (Always Resident)</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
};
