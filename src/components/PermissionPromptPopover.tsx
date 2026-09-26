import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Mic, 
  MapPin, 
  Bell, 
  Clipboard, 
  MousePointer, 
  Maximize, 
  Tv, 
  Music, 
  ShieldAlert, 
  X, 
  Check, 
  Globe 
} from 'lucide-react';
import { PermissionRequest } from '../types/browser';
import { useTranslation } from '../services/i18n';

interface PermissionPromptPopoverProps {
  requests: PermissionRequest[];
  onRespond: (requestId: string, allow: boolean, remember: boolean) => void;
  onDismiss: (requestId: string) => void;
}

export const PermissionPromptPopover: React.FC<PermissionPromptPopoverProps> = ({
  requests,
  onRespond,
  onDismiss
}) => {
  const currentRequest = requests[0];
  const [remember, setRemember] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const allowButtonRef = useRef<HTMLButtonElement>(null);
  const { language } = useTranslation();
  const isTr = language === 'tr';

  useEffect(() => {
    setRemember(false);
  }, [currentRequest?.requestId]);

  useEffect(() => {
    if (!currentRequest) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss(currentRequest.requestId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => {
      allowButtonRef.current?.focus();
    });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentRequest?.requestId, onDismiss]);

  if (!currentRequest) return null;

  let domain = '';
  try {
    const parsed = new URL(currentRequest.url || currentRequest.origin);
    domain = parsed.hostname;
  } catch {
    domain = currentRequest.origin || currentRequest.url || (isTr ? 'Web Sitesi' : 'Website');
  }

  const getPermissionDetails = (perm: string, mediaTypes?: string[]) => {
    switch (perm) {
      case 'media': {
        const hasVideo = !mediaTypes || mediaTypes.includes('video');
        const hasAudio = !mediaTypes || mediaTypes.includes('audio');
        if (hasVideo && hasAudio) {
          return {
            title: isTr ? 'Kamera ve Mikrofon' : 'Camera & Microphone',
            desc: isTr ? 'Kameranızı ve mikrofonunuzu kullanmak istiyor' : 'Use your camera and microphone',
            icon: (
              <div className="flex items-center gap-1 text-blue-500">
                <Camera className="w-4 h-4" />
                <Mic className="w-4 h-4" />
              </div>
            ),
            bg: 'bg-blue-500/10 dark:bg-blue-500/20'
          };
        } else if (hasVideo) {
          return {
            title: isTr ? 'Kamera' : 'Camera',
            desc: isTr ? 'Kameranızı kullanmak istiyor' : 'Use your camera',
            icon: <Camera className="w-4 h-4 text-blue-500" />,
            bg: 'bg-blue-500/10 dark:bg-blue-500/20'
          };
        } else {
          return {
            title: isTr ? 'Mikrofon' : 'Microphone',
            desc: isTr ? 'Mikrofonunuzu kullanmak istiyor' : 'Use your microphone',
            icon: <Mic className="w-4 h-4 text-purple-500" />,
            bg: 'bg-purple-500/10 dark:bg-purple-500/20'
          };
        }
      }
      case 'geolocation':
        return {
          title: isTr ? 'Konum' : 'Location',
          desc: isTr ? 'Fiziksel konumunuza erişmek istiyor' : 'Access your physical location',
          icon: <MapPin className="w-4 h-4 text-emerald-500" />,
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/20'
        };
      case 'notifications':
        return {
          title: isTr ? 'Bildirimler' : 'Notifications',
          desc: isTr ? 'Size anlık bildirim göndermek istiyor' : 'Send you push notifications',
          icon: <Bell className="w-4 h-4 text-amber-500" />,
          bg: 'bg-amber-500/10 dark:bg-amber-500/20'
        };
      case 'clipboard-read':
        return {
          title: isTr ? 'Pano' : 'Clipboard',
          desc: isTr ? 'Panodaki metin ve görselleri okumak istiyor' : 'Read text and images from clipboard',
          icon: <Clipboard className="w-4 h-4 text-cyan-500" />,
          bg: 'bg-cyan-500/10 dark:bg-cyan-500/20'
        };
      case 'pointerLock':
        return {
          title: isTr ? 'İmleç Kilidi' : 'Pointer Lock',
          desc: isTr ? 'Fare imlecinizi kilitlemek ve hareketlerini takip etmek istiyor' : 'Lock and track mouse pointer movement',
          icon: <MousePointer className="w-4 h-4 text-indigo-500" />,
          bg: 'bg-indigo-500/10 dark:bg-indigo-500/20'
        };
      case 'fullscreen':
        return {
          title: isTr ? 'Tam Ekran' : 'Full Screen',
          desc: isTr ? 'Tam ekran moduna geçmek istiyor' : 'Enter full screen display mode',
          icon: <Maximize className="w-4 h-4 text-slate-500" />,
          bg: 'bg-slate-500/10 dark:bg-slate-500/20'
        };
      case 'display-capture':
        return {
          title: isTr ? 'Ekran Paylaşımı' : 'Screen Sharing',
          desc: isTr ? 'Ekranınızı veya pencerenizi paylaşmak istiyor' : 'Capture or share your screen/window',
          icon: <Tv className="w-4 h-4 text-rose-500" />,
          bg: 'bg-rose-500/10 dark:bg-rose-500/20'
        };
      case 'midi':
      case 'midiSysex':
        return {
          title: isTr ? 'MIDI Cihazları' : 'MIDI Devices',
          desc: isTr ? 'MIDI enstrümanlarına ve denetleyicilerine erişmek istiyor' : 'Access MIDI instruments and controllers',
          icon: <Music className="w-4 h-4 text-pink-500" />,
          bg: 'bg-pink-500/10 dark:bg-pink-500/20'
        };
      default:
        return {
          title: currentRequest.permissionName || perm,
          desc: isTr ? `${currentRequest.permissionName || perm} iznine erişmek istiyor` : `Access ${currentRequest.permissionName || perm} permission`,
          icon: <ShieldAlert className="w-4 h-4 text-amber-500" />,
          bg: 'bg-amber-500/10 dark:bg-amber-500/20'
        };
    }
  };

  const details = getPermissionDetails(currentRequest.permission, currentRequest.mediaTypes);

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        key={currentRequest.requestId}
        role="dialog"
        aria-modal="true"
        aria-label={details.title}
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="absolute top-11 left-2 z-[999999] w-88 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-2xl p-4 text-slate-800 dark:text-slate-100 select-none cursor-default"
        style={{
          boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-[13px] text-slate-900 dark:text-slate-100 truncate block">
                {domain}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block -mt-0.5">
                {isTr ? 'şunu istiyor:' : 'wants to:'}
              </span>
            </div>
          </div>

          <button
            onClick={() => onDismiss(currentRequest.requestId)}
            className="p-1 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={isTr ? 'Kapat' : 'Close'}
            title={isTr ? 'Kapat' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Permission Request Card */}
        <div className="flex items-center gap-3 p-3 my-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
          <div className={`p-2 rounded-xl shrink-0 ${details.bg}`}>
            {details.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {details.title}
            </div>
            <div className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-snug mt-0.5">
              {details.desc}
            </div>
          </div>
        </div>

        {/* Remember Checkbox */}
        <div className="flex items-center gap-2 pt-1 pb-3 px-0.5">
          <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500/20 border-slate-300 dark:border-slate-600 dark:bg-slate-800 cursor-pointer"
            />
            <span>{isTr ? 'Bu site için bu tercihi hatırla' : 'Remember this choice for this site'}</span>
          </label>
          {requests.length > 1 && (
            <span className="ml-auto text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full font-medium">
              +{requests.length - 1} {isTr ? 'daha' : 'more'}
            </span>
          )}
        </div>

        {/* Action Buttons (Chrome-Style) */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => onRespond(currentRequest.requestId, false, remember)}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            {isTr ? 'Engelle' : 'Block'}
          </button>
          <button
            ref={allowButtonRef}
            onClick={() => onRespond(currentRequest.requestId, true, remember)}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-xs shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            {isTr ? 'İzin Ver' : 'Allow'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
