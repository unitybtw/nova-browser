import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldOff, X } from 'lucide-react';

interface AdBlockerPopoverProps {
  blockedCount: number;
  isWhitelisted: boolean;
  onToggleWhitelist: () => void;
  onClose: () => void;
  hostname: string;
}

export const AdBlockerPopover: React.FC<AdBlockerPopoverProps> = ({
  blockedCount,
  isWhitelisted,
  onToggleWhitelist,
  onClose,
  hostname
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, y: -6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
      className="absolute top-full right-0 mt-2 w-76 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold text-xs">
          <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            {isWhitelisted ? <ShieldOff className="w-4 h-4 text-slate-400" /> : <Shield className="w-4 h-4 text-cyan-500" />}
          </div>
          <span>Privacy & Ad Shield</span>
        </div>
        <button 
          onClick={onClose} 
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 flex flex-col items-center">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all ${isWhitelisted ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-inner'}`}>
          <span className="text-xl font-bold font-mono">{isWhitelisted ? '0' : blockedCount}</span>
        </div>
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
          {isWhitelisted ? 'Ad Shield Paused' : 'Ads & Trackers Neutralized'}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center mb-3.5">
          {isWhitelisted ? 'Protection disabled for this site' : 'Protection active on this page'}
        </div>

        <div className="w-full flex items-center justify-between p-3 bg-slate-50/80 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/5">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Shield Protection</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">{hostname || 'Current Domain'}</span>
          </div>
          <button
            onClick={onToggleWhitelist}
            disabled={!hostname}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${!hostname ? 'bg-slate-200 dark:bg-slate-700 opacity-50 cursor-not-allowed' : (!isWhitelisted ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700')}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${!hostname ? 'translate-x-1' : (!isWhitelisted ? 'translate-x-4.5' : 'translate-x-1')}`}
            />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
