import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, Globe, MapPin, Plus, Trash2, Check, X } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { generateId } from '../utils/idGenerator';
import { isValidProxyUrl, SECURE_PROXY_ERROR } from '../utils/proxyValidation';
import { useTranslation } from '../services/i18n';
import { useDialogA11y } from '../hooks/useDialogA11y';

export interface VpnLocation {
  id: string;
  name: string;
  url: string;
  type: 'free' | 'custom';
}

interface VpnPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  selectedLocation: VpnLocation;
  locations: VpnLocation[];
  onSelectLocation: (loc: VpnLocation) => void;
  onAddLocation?: (loc: VpnLocation) => void;
  onRemoveLocation?: (id: string) => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
}

/** Display only hostname[:port]; mask embedded credentials, never leak them. */
const formatProxyDisplay = (url: string): string => {
  try {
    const u = new URL(url);
    const host = u.hostname + (u.port ? `:${u.port}` : '');
    if (!host) throw new Error('empty host');
    if (u.username || u.password) return `***@${host}`;
    return host;
  } catch {
    return url.replace(/^https?:\/\//, '');
  }
};

export const VpnPopover: React.FC<VpnPopoverProps> = ({
  isOpen,
  onClose,
  isEnabled,
  onToggle,
  selectedLocation,
  locations,
  onSelectLocation,
  onAddLocation,
  onRemoveLocation,
  anchorRef
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  useDialogA11y({ isOpen, onClose, containerRef });
  useModalFocusTrap(isOpen, onClose, containerRef);

  const [isAdding, setIsAdding] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [error, setError] = useState('');

  const rect = anchorRef?.current?.getBoundingClientRect();
  const top = rect ? rect.bottom + 10 : 50;
  const right = rect ? Math.max(10, window.innerWidth - rect.right - 10) : 80;

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      setError('Please provide a name');
      return;
    }
    let url = customUrl.trim();
    if (!url) {
      setError('Please provide a proxy URL');
      return;
    }
    if (!isValidProxyUrl(url)) {
      setError(SECURE_PROXY_ERROR);
      return;
    }

    const newLoc: VpnLocation = {
      id: generateId('custom'),
      name: customName.trim(),
      url,
      type: 'custom'
    };

    onAddLocation?.(newLoc);
    onSelectLocation(newLoc);
    setCustomName('');
    setCustomUrl('');
    setIsAdding(false);
    setError('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            ref={containerRef}
            style={{ top, right }}
            className="fixed w-80 bg-white/95 dark:bg-[#141518]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-neutral-200/90 dark:border-white/[0.1] z-50 overflow-hidden"
          >
            {/* Header / Status */}
            <div className="p-4 text-center border-b border-neutral-200/80 dark:border-white/[0.08]">
              <div className="flex justify-center mb-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    isEnabled
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-neutral-100 dark:bg-white/[0.06] text-neutral-500 dark:text-neutral-400 border-neutral-200/80 dark:border-white/[0.08]'
                  }`}
                >
                  {isEnabled ? <Shield className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                </div>
              </div>
              <h3 className="text-xs font-semibold text-neutral-950 dark:text-neutral-100 mb-0.5">
                {isEnabled ? t('vpn.active') : t('vpn.inactive')}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isEnabled ? t('vpn.routedVia', { name: selectedLocation?.name ?? '' }) : t('vpn.direct')}
              </p>

              <button
                type="button"
                onClick={() => onToggle(!isEnabled)}
                className={`mt-3 w-full py-2 rounded-lg font-medium text-xs transition-colors active:scale-[0.98] cursor-pointer ${
                  isEnabled
                    ? 'bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'
                    : 'bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950'
                }`}
              >
                {isEnabled ? t('vpn.disconnect') : t('vpn.connect')}
              </button>
            </div>

            {/* Server List */}
            <div className="p-2.5 max-h-56 overflow-y-auto">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  {t('vpn.serversTitle')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(!isAdding)}
                  className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t('vpn.customProxy')}</span>
                </button>
              </div>

              {/* Add Custom Proxy Form */}
              {isAdding && (
                <form onSubmit={handleAddCustom} className="p-2.5 mb-2 bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.08] rounded-lg space-y-2">
                  <input
                    type="text"
                    placeholder={t('vpn.namePlaceholder')}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-white/[0.06] border border-neutral-200/90 dark:border-white/[0.1] rounded-md text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-400 dark:focus:border-white/30"
                  />
                  <input
                    type="text"
                    placeholder={t('vpn.urlPlaceholder')}
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-white/[0.06] border border-neutral-200/90 dark:border-white/[0.1] rounded-md text-xs font-mono text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-400 dark:focus:border-white/30"
                  />
                  {error && <p className="text-[10px] text-red-500">{error}</p>}
                  <div className="flex items-center justify-end gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => { setIsAdding(false); setError(''); }}
                      className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-white/[0.07] rounded-md cursor-pointer"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-medium text-xs rounded-md cursor-pointer"
                    >
                      {t('vpn.saveProxy')}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-0.5 mt-1">
                {locations.length === 0 ? (
                  <div className="text-center py-4 px-2">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('vpn.noServers')}</p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">{t('vpn.noServersDesc')}</p>
                  </div>
                ) : (
                  locations.map((loc) => {
                    const selected = selectedLocation?.id === loc.id;
                    return (
                      <div
                        key={loc.id}
                        className={`w-full flex items-center justify-between p-2 px-2.5 rounded-lg transition-colors ${
                          selected
                            ? 'bg-neutral-100 dark:bg-white/[0.08] text-neutral-950 dark:text-white font-medium'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/70 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectLocation(loc)}
                          className="flex-1 flex items-center gap-2.5 text-left cursor-pointer min-w-0"
                        >
                          {loc.type === 'custom' ? (
                            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          ) : (
                            <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <p className="text-xs truncate">{loc.name}</p>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono truncate">{formatProxyDisplay(loc.url)}</p>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {selected && <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white" />}
                          {loc.type === 'custom' && onRemoveLocation && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveLocation(loc.id);
                              }}
                              className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors cursor-pointer"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer info */}
            <div className="p-2.5 bg-neutral-50/70 dark:bg-white/[0.02] border-t border-neutral-200/80 dark:border-white/[0.07] text-center">
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                {t('vpn.footerNote')}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
