import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldOff, X } from 'lucide-react';

interface AdBlockerPopoverProps {
  blockedCount: number;
  isWhitelisted: boolean;
  onToggleWhitelist: () => void;
  onClose: () => void;
  hostname: string;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  privacyShieldEnabled?: boolean;
  onTogglePrivacyShield?: () => void;
  variant?: 'default' | 'sidebar';
}

export const AdBlockerPopover: React.FC<AdBlockerPopoverProps> = ({
  blockedCount,
  isWhitelisted,
  onToggleWhitelist,
  onClose,
  hostname,
  buttonRef,
  privacyShieldEnabled = true,
  onTogglePrivacyShield,
  variant = 'default',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        (!buttonRef?.current || !buttonRef.current.contains(e.target as Node))
      ) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, buttonRef]);

  const isActiveOnSite = Boolean(privacyShieldEnabled) && !isWhitelisted;
  const canToggleSite = Boolean(hostname) && Boolean(privacyShieldEnabled);
  const displayedCount = isActiveOnSite ? blockedCount : 0;

  const statusTitle = !privacyShieldEnabled
    ? 'Privacy Shield Disabled'
    : isWhitelisted
      ? 'Ad Shield Paused'
      : 'Ads & Trackers Neutralized';

  const statusSubtitle = !privacyShieldEnabled
    ? 'Global ad & tracker blocking is turned off'
    : isWhitelisted
      ? 'Protection disabled for this site'
      : hostname
        ? 'Protection active on this page'
        : 'Protection active across web pages';

  const containerPositionClass =
    variant === 'sidebar'
      ? 'absolute top-11 left-3 right-3'
      : 'absolute top-full right-0 mt-2 w-76';

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, y: -6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`${containerPositionClass} bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/80 dark:border-white/10 z-50 overflow-hidden select-none`}
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold text-xs">
          <div className={`p-1 rounded-md ${isActiveOnSite ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : 'bg-slate-200/70 dark:bg-slate-800 text-slate-400'}`}>
            {isActiveOnSite ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
          </div>
          <span>Privacy & Ad Shield</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3.5 flex flex-col items-center">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2.5 transition-colors ${
            isActiveOnSite
              ? 'bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/60 dark:border-white/5'
          }`}
        >
          <span className="text-lg font-bold font-mono">{displayedCount}</span>
        </div>
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0.5 text-center">
          {statusTitle}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center mb-3">
          {statusSubtitle}
        </div>

        <div className="w-full space-y-2">
          <div className="w-full flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-white/5">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Site Protection</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {hostname || 'Internal Browser Page'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={canToggleSite ? !isWhitelisted : false}
              aria-label={!isWhitelisted ? 'Disable ad blocking on this domain' : 'Enable ad blocking on this domain'}
              onClick={onToggleWhitelist}
              disabled={!canToggleSite}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                !canToggleSite
                  ? 'bg-slate-200 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                  : !isWhitelisted
                    ? 'bg-cyan-600 dark:bg-cyan-500 cursor-pointer'
                    : 'bg-slate-300 dark:bg-slate-700 cursor-pointer'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
                  canToggleSite && !isWhitelisted ? 'translate-x-4.5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {onTogglePrivacyShield && (
            <div className="w-full flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-white/5">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Global Shield</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {privacyShieldEnabled ? 'Enabled across all tabs' : 'Disabled globally'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(privacyShieldEnabled)}
                aria-label={privacyShieldEnabled ? 'Disable global Privacy Shield' : 'Enable global Privacy Shield'}
                onClick={onTogglePrivacyShield}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  privacyShieldEnabled
                    ? 'bg-emerald-600 dark:bg-emerald-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
                    privacyShieldEnabled ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
