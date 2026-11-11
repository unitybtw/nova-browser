import React, { useEffect, useRef, useState } from 'react';
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
  X, 
  Check, 
  Trash2,
  RotateCcw
} from 'lucide-react';
import { getUrlSecurityInfo } from '../utils/securityUtils';
import {
  isDomainWhitelisted,
  sanitizeAdblockWhitelist,
  ADBLOCK_WHITELIST_UPDATED_EVENT,
} from '../utils/adblockUtils';

interface SiteInfoPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  blockedAdsCount?: number;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

const PERMISSIONS_LIST = [
  { key: 'media:video', label: 'Camera', icon: Camera },
  { key: 'media:audio', label: 'Microphone', icon: Mic },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'geolocation', label: 'Location', icon: MapPin },
];

export const SiteInfoPopover: React.FC<SiteInfoPopoverProps> = ({
  isOpen,
  onClose,
  url,
  blockedAdsCount = 0,
  buttonRef
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [sitePerms, setSitePerms] = useState<Record<string, { allow: boolean; ts: number }>>({});
  const [adblockWhitelist, setAdblockWhitelist] = useState<string[]>([]);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isDataCleared, setIsDataCleared] = useState(false);

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

  const sec = getUrlSecurityInfo(url);
  let domain = '';
  let protocol = 'https:';
  let origin = '';
  try {
    const parsed = new URL(url);
    domain = parsed.hostname;
    protocol = parsed.protocol;
    origin = parsed.protocol === 'chrome-extension:' ? `chrome-extension://${parsed.hostname}` : parsed.origin;
  } catch {
    domain = url || 'New Tab';
  }

  const isDangerous = sec.level === 'dangerous';
  const isHttp = sec.level === 'http';
  const isFile = sec.level === 'file';
  const isInternal = sec.level === 'internal' || url.startsWith('nova://') || url.startsWith('about:');
  const isSecure = sec.level === 'secure' || (!isDangerous && !isHttp && !isInternal && !isFile && protocol === 'https:');

  useEffect(() => {
    setSitePerms({});
    if (!isOpen || isInternal || !domain) return;
    let isCancelled = false;
    const api = (window as any).electronAPI;
    if (api?.getSitePermissions) {
      api.getSitePermissions(origin).then((perms: any) => {
        if (!isCancelled && perms && typeof perms === 'object') {
          setSitePerms(perms);
        }
      }).catch(() => {
        if (!isCancelled) setSitePerms({});
      });
    }
    if (api?.storeGet) {
      api.storeGet('adblocker_whitelist').then((val: string | null) => {
        if (!isCancelled && val) {
          try {
            setAdblockWhitelist(sanitizeAdblockWhitelist(JSON.parse(val)));
          } catch (_) {}
        }
      }).catch(() => {});
    }

    const handleWhitelistEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ whitelist?: string[] }>)?.detail;
      if (!isCancelled && detail && Array.isArray(detail.whitelist)) {
        setAdblockWhitelist(sanitizeAdblockWhitelist(detail.whitelist));
      }
    };
    window.addEventListener(ADBLOCK_WHITELIST_UPDATED_EVENT, handleWhitelistEvent);

    return () => {
      isCancelled = true;
      window.removeEventListener(ADBLOCK_WHITELIST_UPDATED_EVENT, handleWhitelistEvent);
    };
  }, [isOpen, isInternal, origin, domain]);

  const isSiteWhitelisted = !isInternal && isDomainWhitelisted(url, adblockWhitelist);

  const getPermState = (key: string): 'allow' | 'block' | 'ask' => {
    const p = sitePerms[key];
    if (!p) return 'ask';
    return p.allow ? 'allow' : 'block';
  };

  const handleUpdatePerm = async (key: string, state: 'allow' | 'block' | 'ask') => {
    if (!origin) return;
    setSitePerms(prev => {
      const next = { ...prev };
      if (state === 'ask') {
        delete next[key];
      } else {
        next[key] = { allow: state === 'allow', ts: Date.now() };
      }
      return next;
    });

    const api = (window as any).electronAPI;
    if (api?.setSitePermission) {
      await api.setSitePermission(origin, key, state);
    }
  };

  const handleResetAllPermissions = async () => {
    if (!origin) return;
    setSitePerms({});
    const api = (window as any).electronAPI;
    if (api?.resetSitePermissions) {
      await api.resetSitePermissions(origin);
    }
  };

  const handleClearSiteData = async () => {
    if (!origin || isClearingData) return;
    setIsClearingData(true);
    const api = (window as any).electronAPI;
    try {
      if (api?.clearSiteData) {
        await api.clearSiteData(origin);
      }
      setIsDataCleared(true);
      setTimeout(() => setIsDataCleared(false), 2400);
    } catch (err) {
      console.error('[SiteInfo] Failed to clear site data:', err);
    } finally {
      setIsClearingData(false);
    }
  };

  const hasCustomPerms = Object.keys(sitePerms).length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-11 left-2 z-[99999] w-[356px] bg-white/95 dark:bg-[#16161f]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xl p-4 text-xs text-slate-700 dark:text-slate-200 select-none cursor-default"
        >
          {/* Header: Site Identity */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                isDangerous ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                isInternal ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500' :
                isSecure ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                'bg-amber-500/10 border-amber-500/20 text-amber-500'
              }`}>
                {isDangerous ? <ShieldAlert className="w-4 h-4 stroke-[2.2]" /> :
                 isInternal ? <ShieldCheck className="w-4 h-4 stroke-[2.2]" /> :
                 isSecure ? <Lock className="w-4 h-4 stroke-[2.2]" /> :
                 <Unlock className="w-4 h-4 stroke-[2.2]" />}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-slate-900 dark:text-white truncate tracking-tight" title={domain}>
                  {domain}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isDangerous ? 'bg-rose-500' :
                    isInternal ? 'bg-cyan-500' :
                    isSecure ? 'bg-emerald-500' :
                    'bg-amber-500'
                  }`} />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                    {isDangerous ? (sec.tooltip || 'Phishing or malicious site blocked') :
                     isInternal ? 'Internal Nova System Page' :
                     isFile ? 'Local Filesystem' :
                     isSecure ? 'Connection is secure (TLS)' :
                     'Connection is not secure (HTTP)'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              aria-label="Close"
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Grouped Security & Storage Card */}
          <div className="my-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.04] overflow-hidden">
            {/* Certificate Row */}
            <div className="p-2.5 flex items-center justify-between text-[11.5px]">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isDangerous ? 'text-rose-500' : isSecure ? 'text-emerald-500' : 'text-amber-500'}`} />
                <span className="font-medium">Certificate</span>
              </div>
              <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${
                isDangerous ? 'bg-rose-500/10 text-rose-500' :
                isInternal ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' :
                isSecure ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}>
                {isDangerous ? 'Blocked' : isInternal ? 'Built-in' : isFile ? 'Local' : isSecure ? 'Valid & Encrypted' : 'Unencrypted'}
              </span>
            </div>

            {/* Cookies & Site Data Row with Direct Action */}
            <div className="p-2.5 flex items-center justify-between text-[11.5px]">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 min-w-0">
                <Cookie className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium leading-tight">Cookies & Site Data</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                    {isInternal ? 'No persistent storage' : 'Protected in partition'}
                  </span>
                </div>
              </div>
              {!isInternal && (
                <button
                  type="button"
                  onClick={handleClearSiteData}
                  disabled={isClearingData}
                  className="px-2 py-1 rounded-md text-[11px] font-medium transition-all text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 hover:bg-rose-500/10 border border-slate-200/60 dark:border-white/10 hover:border-rose-500/20 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isDataCleared ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500 stroke-[2.5]" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Cleared</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3 text-slate-400" />
                      <span>Clear Data</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Trackers Row (if present) */}
            {(isSiteWhitelisted || blockedAdsCount > 0) && (
              <div className="p-2.5 flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${isSiteWhitelisted ? 'text-slate-400' : 'text-cyan-500'}`} />
                  <span className="font-medium">Tracker Protection</span>
                </div>
                {isSiteWhitelisted ? (
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-white/5 px-2 py-0.5 rounded-md">
                    Paused on this site
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">
                    {blockedAdsCount} blocked
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Real Interactive Permissions Section */}
          {!isInternal && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Permissions
                </span>
                {hasCustomPerms && (
                  <button
                    type="button"
                    onClick={handleResetAllPermissions}
                    className="text-[10.5px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Reset all permissions to Ask"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset all</span>
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {PERMISSIONS_LIST.map(item => {
                  const current = getPermState(item.key);
                  const IconComp = item.icon;

                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 hover:border-slate-200/80 dark:hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <IconComp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                          {item.label}
                        </span>
                      </div>

                      {/* 3-State Segmented Control: Ask | Allow | Block */}
                      <div className="flex items-center p-0.5 rounded-lg bg-slate-200/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdatePerm(item.key, 'ask')}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                            current === 'ask'
                              ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs font-semibold'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                        >
                          Ask
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdatePerm(item.key, 'allow')}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                            current === 'allow'
                              ? 'bg-emerald-500 text-white shadow-2xs font-semibold'
                              : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                          }`}
                        >
                          Allow
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdatePerm(item.key, 'block')}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                            current === 'block'
                              ? 'bg-rose-500 text-white shadow-2xs font-semibold'
                              : 'text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                          }`}
                        >
                          Block
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
