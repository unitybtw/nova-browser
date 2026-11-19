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
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className={`${containerPositionClass} bg-white/95 dark:bg-[#141518]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-neutral-200/90 dark:border-white/[0.1] z-50 overflow-hidden select-none`}
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-neutral-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-semibold text-xs">
          <span className={isActiveOnSite ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}>
            {isActiveOnSite ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
          </span>
          <span>Privacy & Ad Shield</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-white/[0.07] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3.5 flex flex-col items-center">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 transition-colors border ${
            isActiveOnSite
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
              : 'bg-neutral-100 dark:bg-white/[0.06] text-neutral-400 border-neutral-200/80 dark:border-white/[0.08]'
          }`}
        >
          <span className="text-base font-semibold font-mono tabular-nums">{displayedCount}</span>
        </div>
        <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-0.5 text-center">
          {statusTitle}
        </div>
        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center mb-3">
          {statusSubtitle}
        </div>

        <div className="w-full rounded-xl bg-neutral-50/80 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.08] divide-y divide-neutral-200/80 dark:divide-white/[0.07] overflow-hidden">
          <div className="w-full flex items-center justify-between px-3 py-2.5">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Site Protection</span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono truncate">
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
                  ? 'bg-neutral-200 dark:bg-white/[0.1] opacity-45 cursor-not-allowed'
                  : !isWhitelisted
                    ? 'bg-neutral-900 dark:bg-white cursor-pointer'
                    : 'bg-neutral-200 dark:bg-white/[0.14] cursor-pointer'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full shadow-xs transition-transform duration-150 ${
                  canToggleSite && !isWhitelisted
                    ? 'translate-x-[18px] bg-white dark:bg-neutral-950'
                    : 'translate-x-[3px] bg-white dark:bg-neutral-200'
                }`}
              />
            </button>
          </div>

          {onTogglePrivacyShield && (
            <div className="w-full flex items-center justify-between px-3 py-2.5">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Global Shield</span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
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
                    ? 'bg-neutral-900 dark:bg-white'
                    : 'bg-neutral-200 dark:bg-white/[0.14]'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full shadow-xs transition-transform duration-150 ${
                    privacyShieldEnabled
                      ? 'translate-x-[18px] bg-white dark:bg-neutral-950'
                      : 'translate-x-[3px] bg-white dark:bg-neutral-200'
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
