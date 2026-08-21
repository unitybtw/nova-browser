import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, Globe, MapPin, Search } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

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
  anchorRef: React.RefObject<HTMLButtonElement>;
}

export const VpnPopover: React.FC<VpnPopoverProps> = ({
  isOpen,
  onClose,
  isEnabled,
  onToggle,
  selectedLocation,
  locations,
  onSelectLocation,
  anchorRef
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useModalFocusTrap(isOpen, onClose, containerRef);

  const rect = anchorRef?.current?.getBoundingClientRect();
  const top = rect ? rect.bottom + 10 : 50;
  const right = rect ? Math.max(10, window.innerWidth - rect.right - 10) : 80;

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
            className="fixed w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 z-50 overflow-hidden"
          >
            {/* Header / Status */}
            <div className={`p-6 text-center transition-colors ${isEnabled ? 'bg-emerald-500/90 text-white backdrop-blur-md' : 'bg-slate-50/80 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 backdrop-blur-md'}`}>
              <div className="flex justify-center mb-3">
                <div className={`p-3.5 rounded-2xl ${isEnabled ? 'bg-white/20 text-white animate-pulse' : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'}`}>
                  {isEnabled ? <Shield className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
                </div>
              </div>
              <h3 className="text-base font-bold mb-1">{isEnabled ? 'VPN Connected' : 'VPN Disconnected'}</h3>
              <p className={`text-xs ${isEnabled ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {isEnabled ? `Secured via ${selectedLocation.name}` : 'Your traffic is unprotected'}
              </p>
              
              <button
                onClick={() => onToggle(!isEnabled)}
                className={`mt-5 w-full py-2.5 rounded-xl font-semibold text-xs transition-transform active:scale-95 shadow-xs ${
                  isEnabled 
                    ? 'bg-white text-emerald-600 hover:bg-emerald-50 shadow-sm' 
                    : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                }`}
              >
                {isEnabled ? 'Disconnect' : 'Connect'}
              </button>
            </div>

            {/* Server List */}
            <div className="p-2 max-h-60 overflow-y-auto">
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Locations
              </div>
              <div className="space-y-1">
                {locations.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => onSelectLocation(loc)}
                    className={`w-full flex items-center justify-between p-2.5 px-3 rounded-xl transition-colors ${
                      selectedLocation.id === loc.id
                        ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-semibold border border-cyan-500/30'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {loc.type === 'custom' ? <MapPin className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5 text-cyan-500" />}
                      <span className="text-xs">{loc.name}</span>
                    </div>
                    {selectedLocation.id === loc.id && (
                      <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-xs" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Footer info */}
            <div className="p-3 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-100 dark:border-white/5 text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Free proxies may affect browsing speed. Add custom proxies in Settings.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
