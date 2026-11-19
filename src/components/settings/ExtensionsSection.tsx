import React, { useState } from 'react';
import { Settings, Upload, ExternalLink, Puzzle, Play, Trash2, Download } from 'lucide-react';
import { showAlert } from '../../utils/confirmDialog';
import { useExtensions } from '../../hooks/useExtensions';
import { installUnpackedExtension, installWebStoreExtension, launchExtensionPopup } from '../../services/extensionActions';
import { ToggleSwitch } from './ToggleSwitch';
import {
  SETTINGS_INPUT_CLS,
  SettingsBadge,
  SettingsButton,
  SettingsGroup,
  SettingsPageHeader,
} from './SettingsPrimitives';

export const ExtensionsSection: React.FC = () => {
  const { extensions, pendingExtensionIds, refreshExtensions, handleToggleExtension, handleRemoveExtension } = useExtensions();
  const [webstoreUrlOrId, setWebstoreUrlOrId] = useState('');
  const [isInstallingWebstore, setIsInstallingWebstore] = useState(false);

  const handleLoadUnpacked = async () => {
    try {
      if (await installUnpackedExtension()) await refreshExtensions();
    } catch (e: any) {
      console.error(e);
      void showAlert({ title: 'Extensions', message: e?.message || 'Failed to load extension.' });
    }
  };

  const handleInstallFromWebStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webstoreUrlOrId.trim() || isInstallingWebstore) return;
    setIsInstallingWebstore(true);
    try {
      if (await installWebStoreExtension(webstoreUrlOrId)) {
        setWebstoreUrlOrId('');
        await refreshExtensions();
      }
    } catch (err: any) {
      console.error(err);
      void showAlert({ title: 'Extensions', message: err?.message || 'Failed to install extension from Chrome Web Store.' });
    } finally {
      setIsInstallingWebstore(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Extensions"
        description="Install Chrome Web Store extensions or load unpacked folders from your computer."
        action={
          <div className="flex items-center gap-2">
            <SettingsButton variant="secondary" onClick={handleLoadUnpacked}>
              <Upload className="w-3.5 h-3.5" />
              Load Unpacked
            </SettingsButton>
            <SettingsButton
              variant="secondary"
              onClick={() => {
                window.open('https://chromewebstore.google.com/', '_blank');
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Chrome Web Store
            </SettingsButton>
          </div>
        }
      />

      <SettingsGroup
        title="Install from Web Store"
        description="Paste a Chrome Web Store link or 32-character extension ID to fetch and unpack CRX3."
        noDivide
      >
        <form
          onSubmit={handleInstallFromWebStore}
          className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <input
            type="text"
            value={webstoreUrlOrId}
            onChange={(e) => setWebstoreUrlOrId(e.target.value)}
            placeholder="Paste Chrome Web Store URL or 32-character Extension ID..."
            disabled={isInstallingWebstore}
            className={`${SETTINGS_INPUT_CLS} flex-1 min-w-0 font-mono`}
          />
          <SettingsButton
            type="submit"
            variant="primary"
            disabled={!webstoreUrlOrId.trim() || isInstallingWebstore}
            className="shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isInstallingWebstore ? 'Installing...' : 'Install from Web Store'}</span>
          </SettingsButton>
        </form>
      </SettingsGroup>

      <SettingsGroup
        title="Installed Extensions"
        right={
          <SettingsBadge>
            {extensions?.length || 0} installed
          </SettingsBadge>
        }
        noDivide={!extensions || extensions.length === 0}
      >
        {!extensions || extensions.length === 0 ? (
          <div className="px-5 py-10 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center text-neutral-400 dark:text-neutral-500">
              <Puzzle className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                No extensions installed
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Install extensions from the Chrome Web Store or load an unpacked extension folder from your machine.
              </p>
            </div>
            <div className="pt-1">
              <SettingsButton
                variant="primary"
                onClick={() => window.open('https://chromewebstore.google.com/', '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Explore Chrome Web Store
              </SettingsButton>
            </div>
          </div>
        ) : (
          extensions.map((ext) => {
            const isEnabled = ext.enabled !== false;
            const isPending = pendingExtensionIds.has(ext.id);
            return (
              <div
                key={ext.id}
                className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/70 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                    {ext.iconData ? (
                      <img src={ext.iconData} alt={ext.name} className="w-6 h-6 object-contain" />
                    ) : (
                      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase">
                        {ext.name ? ext.name.charAt(0) : <Puzzle className="w-4 h-4" />}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {ext.name}
                      </span>
                      {ext.version && (
                        <SettingsBadge className="font-mono">
                          v{ext.version}
                        </SettingsBadge>
                      )}
                      <SettingsBadge tone={isEnabled ? 'success' : 'neutral'}>
                        {isEnabled ? 'Active' : 'Disabled'}
                      </SettingsBadge>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {ext.description || 'No description available'}
                    </p>
                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono mt-0.5 select-all truncate">
                      ID: {ext.id}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <ToggleSwitch
                    checked={isEnabled}
                    onToggle={() => handleToggleExtension(ext.id)}
                    ariaLabel={isEnabled ? `Disable ${ext.name}` : `Enable ${ext.name}`}
                    disabled={isPending}
                    ariaBusy={isPending}
                    title={isEnabled ? 'Disable Extension' : 'Enable Extension'}
                  />

                  {ext.popupUrl && (
                    <SettingsButton
                      variant="secondary"
                      onClick={(e) => {
                        if (!ext.popupUrl) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const cleanPopup = ext.popupUrl.replace(/^\.?\//, '');
                        const url = `chrome-extension://${ext.id}/${cleanPopup}`;
                        void launchExtensionPopup(url, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
                      }}
                      title="Open Extension Popup"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Popup</span>
                    </SettingsButton>
                  )}

                  {ext.optionsUrl && (
                    <SettingsButton
                      variant="secondary"
                      onClick={() => {
                        if (!ext.optionsUrl) return;
                        const cleanOptions = ext.optionsUrl.replace(/^\.?\//, '');
                        // Routed through the main process, which checks that the
                        // extension is installed and confines the path. window.open
                        // would create an unmanaged BrowserWindow instead.
                        void launchExtensionPopup(`chrome-extension://${ext.id}/${cleanOptions}`);
                      }}
                      title="Open Options"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Options</span>
                    </SettingsButton>
                  )}

                  <SettingsButton
                    variant="danger"
                    disabled={isPending}
                    aria-busy={isPending}
                    onClick={() => handleRemoveExtension(ext.id)}
                    title={`Remove ${ext.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </SettingsButton>
                </div>
              </div>
            );
          })
        )}
      </SettingsGroup>
    </div>
  );
};
