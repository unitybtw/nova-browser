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
            className="absolute top-12 right-24 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden"
          >
            {/* Header / Status */}
            <div className={`p-6 text-center transition-colors ${isEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200'}`}>
              <div className="flex justify-center mb-4">
                <div className={`p-4 rounded-full ${isEnabled ? 'bg-emerald-400/50 animate-pulse' : 'bg-slate-200 dark:bg-slate-800'}`}>
                  {isEnabled ? <Shield className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8 opacity-50" />}
                </div>
              </div>
          <h3 className="text-lg font-semibold mb-1">{isEnabled ? 'VPN Connected' : 'VPN Disconnected'}</h3>
          <p className={`text-sm ${isEnabled ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
            {isEnabled ? `Secured via ${selectedLocation.name}` : 'Your traffic is unprotected'}
          </p>
          
          <button
            onClick={() => onToggle(!isEnabled)}
            className={`mt-6 w-full py-3 rounded-xl font-medium transition-transform active:scale-95 ${
              isEnabled 
                ? 'bg-white text-emerald-600 hover:bg-emerald-50' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isEnabled ? 'Disconnect' : 'Connect'}
          </button>
        </div>

        {/* Server List */}
        <div className="p-2 max-h-60 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Locations
          </div>
          <div className="space-y-1">
            {locations.map(loc => (
              <button
                key={loc.id}
                onClick={() => onSelectLocation(loc)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                  selectedLocation.id === loc.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {loc.type === 'custom' ? <MapPin className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  <span className="text-sm font-medium">{loc.name}</span>
                </div>
                {selectedLocation.id === loc.id && (
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-center">
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
