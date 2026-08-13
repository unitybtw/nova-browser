import React from 'react';
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
  return (
    <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
          {isWhitelisted ? <ShieldOff className="w-4 h-4 text-slate-400" /> : <Shield className="w-4 h-4 text-blue-500" />}
          <span>Ad Blocker</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col items-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${isWhitelisted ? 'bg-slate-100 dark:bg-slate-700 text-slate-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-500'}`}>
          <span className="text-2xl font-bold">{isWhitelisted ? '0' : blockedCount}</span>
        </div>
        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
          {isWhitelisted ? 'Ad Blocker Disabled' : 'Ads & Trackers Blocked'}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4">
          on this page
        </div>

        <div className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Block ads on this site</span>
            <span className="text-[11px] text-slate-500 truncate max-w-[140px]">{hostname || 'Not available'}</span>
          </div>
          <button
            onClick={onToggleWhitelist}
            disabled={!hostname}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${!hostname ? 'bg-slate-200 dark:bg-slate-700 opacity-50 cursor-not-allowed' : (!isWhitelisted ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600')}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${!hostname ? 'translate-x-1' : (!isWhitelisted ? 'translate-x-5' : 'translate-x-1')}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
