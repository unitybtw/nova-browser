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
      className="absolute top-full right-0 mt-2 w-72 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80 z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/80">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold text-xs">
          {isWhitelisted ? <ShieldOff className="w-4 h-4 text-slate-400" /> : <Shield className="w-4 h-4 text-blue-500" />}
          <span>Privacy & Ad Shield</span>
        </div>
        <button 
          onClick={onClose} 
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 flex flex-col items-center">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2.5 ${isWhitelisted ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-500 shadow-inner'}`}>
          <span className="text-xl font-bold font-mono">{isWhitelisted ? '0' : blockedCount}</span>
        </div>
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
          {isWhitelisted ? 'Ad Blocker Paused' : 'Ads & Trackers Neutralized'}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center mb-3">
          on this page
        </div>

        <div className="w-full flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Shield Protection</span>
            <span className="text-[10px] text-slate-500 font-mono truncate max-w-[130px]">{hostname || 'Current Domain'}</span>
          </div>
          <button
            onClick={onToggleWhitelist}
            disabled={!hostname}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${!hostname ? 'bg-slate-200 dark:bg-slate-700 opacity-50 cursor-not-allowed' : (!isWhitelisted ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600')}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${!hostname ? 'translate-x-1' : (!isWhitelisted ? 'translate-x-4.5' : 'translate-x-1')}`}
            />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
