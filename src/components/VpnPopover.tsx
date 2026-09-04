import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, Globe, MapPin, Plus, Trash2, Check, X } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { generateId } from '../utils/idGenerator';
import { isValidProxyUrl, SECURE_PROXY_ERROR } from '../utils/proxyValidation';
import { useTranslation } from '../services/i18n';

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
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            ref={containerRef}
            style={{ top, right }}
            className="fixed w-84 bg-white/95 dark:bg-[#121620]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 z-50 overflow-hidden"
          >
            {/* Header / Status */}
            <div className={`p-5 text-center transition-colors ${isEnabled ? 'bg-emerald-500/90 text-white backdrop-blur-md' : 'bg-slate-50/80 dark:bg-white/5 text-slate-800 dark:text-slate-100 backdrop-blur-md'}`}>
              <div className="flex justify-center mb-2.5">
                <div className={`p-3 rounded-2xl ${isEnabled ? 'bg-white/20 text-white animate-pulse' : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'}`}>
                  {isEnabled ? <Shield className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                </div>
              </div>
              <h3 className="text-sm font-bold mb-0.5">{isEnabled ? t('vpn.active') : t('vpn.inactive')}</h3>
              <p className={`text-[11px] ${isEnabled ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {isEnabled ? t('vpn.routedVia', { name: selectedLocation?.name ?? '' }) : t('vpn.direct')}
              </p>
              
              <button
                onClick={() => onToggle(!isEnabled)}
                className={`mt-3.5 w-full py-2 rounded-xl font-semibold text-xs transition-transform active:scale-95 shadow-xs cursor-pointer ${
                  isEnabled 
                    ? 'bg-white text-emerald-600 hover:bg-emerald-50 shadow-sm' 
                    : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                }`}
              >
                {isEnabled ? t('vpn.disconnect') : t('vpn.connect')}
              </button>
            </div>

            {/* Server List */}
            <div className="p-2.5 max-h-56 overflow-y-auto">
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {t('vpn.serversTitle')}
                </span>
                <button
                  onClick={() => setIsAdding(!isAdding)}
                  className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t('vpn.customProxy')}</span>
                </button>
              </div>

              {/* Add Custom Proxy Form */}
              {isAdding && (
                <form onSubmit={handleAddCustom} className="p-2.5 mb-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl space-y-2">
                  <input
                    type="text"
                    placeholder={t('vpn.namePlaceholder')}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder={t('vpn.urlPlaceholder')}
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                  {error && <p className="text-[10px] text-rose-500">{error}</p>}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => { setIsAdding(false); setError(''); }}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg cursor-pointer"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-cyan-500 text-white font-medium text-xs rounded-lg hover:bg-cyan-600 cursor-pointer"
                    >
                      {t('vpn.saveProxy')}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-1">
                {locations.length === 0 ? (
                  <div className="text-center py-4 px-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('vpn.noServers')}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{t('vpn.noServersDesc')}</p>
                  </div>
                ) : (
                  locations.map(loc => (
                    <div
                      key={loc.id}
                      className={`w-full flex items-center justify-between p-2 px-2.5 rounded-xl transition-colors ${
                        selectedLocation?.id === loc.id
                          ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-semibold border border-cyan-500/30'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-medium'
                      }`}
                    >
                      <button
                        onClick={() => onSelectLocation(loc)}
                        className="flex-1 flex items-center gap-2.5 text-left cursor-pointer"
                      >
                        {loc.type === 'custom' ? <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" /> : <Globe className="w-3.5 h-3.5 text-cyan-500 shrink-0" />}
                        <div className="truncate">
                          <p className="text-xs truncate">{loc.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{formatProxyDisplay(loc.url)}</p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {selectedLocation?.id === loc.id && (
                          <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-xs" />
                        )}
                        {loc.type === 'custom' && onRemoveLocation && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveLocation(loc.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors cursor-pointer"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Footer info */}
            <div className="p-2.5 bg-slate-50/80 dark:bg-black/30 border-t border-slate-100 dark:border-white/5 text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {t('vpn.footerNote')}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
