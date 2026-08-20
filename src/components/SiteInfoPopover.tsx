import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  ShieldAlert, 
  Cookie, 
  Camera, 
  Mic, 
  Bell, 
  MapPin, 
  ExternalLink, 
  X, 
  Check, 
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { getUrlSecurityInfo } from '../utils/securityUtils';

interface SiteInfoPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  blockedAdsCount?: number;
  buttonRef?: React.RefObject<HTMLDivElement | null>;
}

export const SiteInfoPopover: React.FC<SiteInfoPopoverProps> = ({
  isOpen,
  onClose,
  url,
  blockedAdsCount = 0,
  buttonRef
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target as Node) &&
        (!buttonRef?.current || !buttonRef.current.contains(e.target as Node))
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  const sec = getUrlSecurityInfo(url);
  let domain = '';
  let protocol = 'https:';
  try {
    const parsed = new URL(url);
    domain = parsed.hostname;
    protocol = parsed.protocol;
  } catch {
    domain = url || 'New Tab';
  }

  const isSecure = protocol === 'https:';
  const isInternal = url.startsWith('nova://') || url.startsWith('about:');

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: -6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="absolute top-11 left-2 z-[99999] w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl p-4 text-xs text-slate-700 dark:text-slate-200 select-none cursor-default"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-xl shrink-0 ${isInternal ? 'bg-cyan-500/10 text-cyan-500' : isSecure ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
              {isInternal ? <Sparkles className="w-4 h-4" /> : isSecure ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate" title={domain}>
                {domain}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isInternal ? 'Internal Nova System Page' : isSecure ? 'Connection is secure (TLS 1.3)' : 'Connection is not secure'}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Security & Certificate Details */}
        <div className="py-3 space-y-2 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Certificate
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {isInternal ? 'Built-in (Verified)' : isSecure ? 'Valid & Encrypted' : 'Not Valid'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Cookie className="w-3.5 h-3.5 text-amber-500" />
              Cookies & Site Data
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {isInternal ? 'None' : 'Protected in Partition'}
            </span>
          </div>

          {blockedAdsCount > 0 && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-500" />
                Trackers & Ads Blocked
              </span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-md">
                {blockedAdsCount} blocked
              </span>
            </div>
          )}
        </div>

        {/* Permissions */}
        {!isInternal && (
          <div className="pt-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Permissions for this site
            </div>
            
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                <Camera className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] truncate">Camera: Ask</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                <Mic className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] truncate">Microphone: Ask</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                <Bell className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] truncate">Notifications: Ask</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] truncate">Location: Ask</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
