import React, { useState, useEffect } from 'react';
import { ShieldCheck, ExternalLink, Trash2, Cpu, Plus, X, Globe } from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { showConfirm } from '../../utils/confirmDialog';
import { getElectronAPI } from '../../utils/electronBridge';
import { aiAgent } from '../../services/aiAgent';
import { ToggleSwitch } from './ToggleSwitch';
import { SmoothCollapse } from './SmoothCollapse';
import { useSafeTimeout } from '../../hooks/useSafeTimeout';
import {
  normalizeAdblockDomain,
  sanitizeAdblockWhitelist,
  ADBLOCK_WHITELIST_UPDATED_EVENT,
  notifyAdblockWhitelistUpdated,
} from '../../utils/adblockUtils';
import {
  SETTINGS_INPUT_CLS,
  SETTINGS_SELECT_CLS,
  SettingsBadge,
  SettingsButton,
  SettingsGroup,
  SettingsPageHeader,
  SettingsRow,
} from './SettingsPrimitives';

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
  const [whitelistedDomains, setWhitelistedDomains] = useState<string[]>([]);
  const [newWhitelistDomain, setNewWhitelistDomain] = useState<string>('');
  const [whitelistError, setWhitelistError] = useState<string>('');
  const { setSafeTimeout } = useSafeTimeout();

  useEffect(() => {
    const fetchWhitelist = async () => {
      try {
        const api = getElectronAPI();
        if (api?.storeGet) {
          const raw = await api.storeGet('adblocker_whitelist');
          if (raw) {
            setWhitelistedDomains(sanitizeAdblockWhitelist(JSON.parse(raw)));
          }
        }
      } catch (_) {}
    };
    fetchWhitelist();

    const handleWhitelistEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ whitelist?: string[] }>)?.detail;
      if (detail && Array.isArray(detail.whitelist)) {
        setWhitelistedDomains(sanitizeAdblockWhitelist(detail.whitelist));
      } else {
        fetchWhitelist();
      }
    };
    window.addEventListener(ADBLOCK_WHITELIST_UPDATED_EVENT, handleWhitelistEvent);
    return () => {
      window.removeEventListener(ADBLOCK_WHITELIST_UPDATED_EVENT, handleWhitelistEvent);
    };
  }, []);

  const persistWhitelist = async (nextList: string[]) => {
    const sanitized = sanitizeAdblockWhitelist(nextList);
    setWhitelistedDomains(sanitized);
    notifyAdblockWhitelistUpdated(sanitized);
    try {
      const api = getElectronAPI();
      if (api?.storeSet) {
        await api.storeSet('adblocker_whitelist', JSON.stringify(sanitized));
      }
    } catch (_) {}
  };

  const handleAddWhitelistDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeAdblockDomain(newWhitelistDomain);
    if (!normalized) {
      setWhitelistError('Enter a valid domain (e.g. example.com)');
      return;
    }
    setWhitelistError('');
    setNewWhitelistDomain('');
    if (!whitelistedDomains.includes(normalized)) {
      await persistWhitelist([...whitelistedDomains, normalized]);
    }
  };

  const handleRemoveWhitelistDomain = async (domain: string) => {
    await persistWhitelist(whitelistedDomains.filter((d) => d !== domain));
  };

  useEffect(() => {
    if (getElectronAPI()?.getRememberedPermissionsCount) {
      getElectronAPI()!
        .getRememberedPermissionsCount()
        .then((count: number) => {
          setRememberedPermCount(count || 0);
        })
        .catch(() => {});
    }
  }, []);

  const handleResetRememberedPermissions = async () => {
    if (!getElectronAPI()?.resetRememberedPermissions) return;
    setResettingPerms(true);
    try {
      await getElectronAPI()!.resetRememberedPermissions();
      setRememberedPermCount(0);
      setResetPermsSuccess(true);
      setSafeTimeout(() => setResetPermsSuccess(false), 3000);
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
      cancelLabel: 'Cancel',
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
      setSafeTimeout(() => setAiCacheStatus(''), 4000);
    } catch (e: any) {
      setAiCacheStatus('Failed to clear cache: ' + (e?.message || String(e)));
    } finally {
      setIsClearingCache(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Privacy & Security"
        description="Control ad and tracker blocking, site permissions, binary verification, and local AI cache."
      />

      {/* Privacy Shield & Whitelist */}
      <SettingsGroup title="Ad & Tracker Blocking">
        <SettingsRow
          icon={<ShieldCheck className="w-4 h-4" />}
          title="Nova Privacy Shield"
          badge={
            <SettingsBadge tone={settings.privacyShield ? 'success' : 'neutral'}>
              {settings.privacyShield ? 'Active' : 'Paused'}
            </SettingsBadge>
          }
          description="Blocks malicious scripts, tracking cookies, and intrusive ads using Ghostery and Cliqz blocklists."
        >
          <ToggleSwitch
            ariaLabel="Toggle Privacy Shield"
            checked={settings.privacyShield}
            onToggle={() => onUpdateSettings({ privacyShield: !settings.privacyShield })}
          />
        </SettingsRow>

        <div className="px-4 sm:px-5 py-3.5 space-y-3 bg-neutral-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                Allowed Sites (Whitelist)
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Websites listed here bypass Ad & Tracker Blocking across all tabs.
              </p>
            </div>
            {whitelistedDomains.length > 0 && (
              <SettingsButton variant="ghost" onClick={() => persistWhitelist([])}>
                Clear All ({whitelistedDomains.length})
              </SettingsButton>
            )}
          </div>

          <form onSubmit={handleAddWhitelistDomain} className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              value={newWhitelistDomain}
              onChange={(e) => {
                setNewWhitelistDomain(e.target.value);
                if (whitelistError) setWhitelistError('');
              }}
              placeholder="example.com"
              className={`${SETTINGS_INPUT_CLS} flex-1 font-mono`}
            />
            <SettingsButton type="submit" variant="primary" className="shrink-0">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Site</span>
            </SettingsButton>
          </form>

          <SmoothCollapse isOpen={Boolean(whitelistError)}>
            {whitelistError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{whitelistError}</p>
            )}
          </SmoothCollapse>

          {whitelistedDomains.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {whitelistedDomains.map((domain) => (
                <span
                  key={domain}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-white dark:bg-[#141518] border border-neutral-200/90 dark:border-white/[0.09] text-xs font-mono text-neutral-700 dark:text-neutral-200"
                >
                  <Globe className="w-3 h-3 text-neutral-400 shrink-0" />
                  <span>{domain}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveWhitelistDomain(domain)}
                    aria-label={`Remove ${domain} from whitelist`}
                    className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-white/[0.08] text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              No websites are currently whitelisted.
            </p>
          )}
        </div>
      </SettingsGroup>

      {/* Tracking & Cookies */}
      <SettingsGroup title="Tracking & Cookies">
        <SettingsRow
          title='Send a "Do Not Track" request'
          description="Request that websites do not track your browsing traffic."
        >
          <ToggleSwitch
            ariaLabel="Toggle Do Not Track request"
            checked={settings.doNotTrack}
            onToggle={() => onUpdateSettings({ doNotTrack: !settings.doNotTrack })}
          />
        </SettingsRow>

        <SettingsRow
          title="Clear cookies on exit"
          description="Automatically clear cookies and site data when you close all windows."
        >
          <ToggleSwitch
            ariaLabel="Toggle clear cookies on exit"
            checked={settings.clearOnExit}
            onToggle={() => onUpdateSettings({ clearOnExit: !settings.clearOnExit })}
          />
        </SettingsRow>
      </SettingsGroup>

      {/* Site Permissions */}
      <SettingsGroup title="Site Permissions">
        <SettingsRow
          title="Remembered Authorizations"
          badge={
            rememberedPermCount > 0 ? (
              <SettingsBadge>
                {rememberedPermCount} origin{rememberedPermCount > 1 ? 's' : ''}
              </SettingsBadge>
            ) : undefined
          }
          description="Permissions granted to websites (camera, microphone, notifications, location) automatically expire after 30 days."
        >
          <SettingsButton
            variant="danger"
            onClick={handleResetRememberedPermissions}
            disabled={resettingPerms}
          >
            {resetPermsSuccess ? 'Permissions Cleared!' : resettingPerms ? 'Resetting...' : 'Reset All Permissions'}
          </SettingsButton>
        </SettingsRow>
      </SettingsGroup>

      {/* Binary Integrity */}
      <SettingsGroup title="Binary Integrity">
        <SettingsRow
          icon={<ShieldCheck className="w-4 h-4" />}
          title="SHA-256 Checksum Verification"
          description={
            <>
              Every release publishes a{' '}
              <code className="font-mono bg-neutral-100 dark:bg-white/[0.07] px-1 py-0.5 rounded text-[11px]">
                SHA256SUMS.txt
              </code>{' '}
              file. Run{' '}
              <code className="font-mono bg-neutral-100 dark:bg-white/[0.07] px-1 py-0.5 rounded text-[11px]">
                sha256sum -c SHA256SUMS.txt
              </code>{' '}
              to verify your download.
            </>
          }
        >
          <a
            href="https://github.com/unitybtw/nova-browser/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-white/[0.08] text-xs font-medium shrink-0 transition-colors"
          >
            <span>View Checksums</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </SettingsRow>
      </SettingsGroup>

      {/* AI Storage & Model Cache */}
      <SettingsGroup title="AI Storage & VRAM">
        <SettingsRow
          title="Purge AI Model Cache"
          description={
            <div className="space-y-1.5">
              <span>Delete downloaded local WebLLM neural network weights to free up disk space.</span>
              <SmoothCollapse isOpen={Boolean(aiCacheStatus)}>
                {aiCacheStatus && (
                  <div
                    className={`text-xs font-medium ${
                      aiCacheStatus.includes('successfully')
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {aiCacheStatus}
                  </div>
                )}
              </SmoothCollapse>
            </div>
          }
        >
          <SettingsButton
            variant="danger"
            onClick={handleClearAiCache}
            disabled={isClearingCache}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isClearingCache ? 'Clearing...' : 'Clear AI Cache'}
          </SettingsButton>
        </SettingsRow>

        <SettingsRow
          icon={<Cpu className="w-4 h-4" />}
          title="GPU VRAM & Anti-Jank Engine"
          badge={
            <SettingsBadge tone={aiEngineLoaded ? 'success' : 'neutral'} className="font-mono">
              {aiEngineLoaded ? `VRAM: ~${aiAgent.getVramEstimate()} MB` : 'VRAM: 0 MB (Parked)'}
            </SettingsBadge>
          }
          description="Auto-parks the resident local model from VRAM when idle to prevent scroll jank."
        >
          {aiEngineLoaded && (
            <SettingsButton
              variant="secondary"
              onClick={async () => {
                await aiAgent.parkModel();
                setAiEngineLoaded(false);
              }}
            >
              Park Now
            </SettingsButton>
          )}
        </SettingsRow>

        <SettingsRow
          title="Inactivity Auto-Park Timeout"
          description="Duration before resident WebLLM weights are automatically released from VRAM."
        >
          <select
            value={aiVramTimeout}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setAiVramTimeout(val);
              aiAgent.setAutoParkTimeoutMinutes(val);
            }}
            className={SETTINGS_SELECT_CLS}
          >
            <option value={1}>1 minute</option>
            <option value={3}>3 minutes (Recommended)</option>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={0}>Disabled (Always Resident)</option>
          </select>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
};
