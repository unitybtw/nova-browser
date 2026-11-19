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
    const neutralBg = 'bg-neutral-100 dark:bg-white/[0.07] border border-neutral-200/80 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-200';
    switch (perm) {
      case 'media': {
        const hasVideo = !mediaTypes || mediaTypes.includes('video');
        const hasAudio = !mediaTypes || mediaTypes.includes('audio');
        if (hasVideo && hasAudio) {
          return {
            title: isTr ? 'Kamera ve Mikrofon' : 'Camera & Microphone',
            desc: isTr ? 'Kameranızı ve mikrofonunuzu kullanmak istiyor' : 'Use your camera and microphone',
            icon: (
              <div className="flex items-center gap-1">
                <Camera className="w-4 h-4" />
                <Mic className="w-4 h-4" />
              </div>
            ),
            bg: neutralBg,
          };
        } else if (hasVideo) {
          return {
            title: isTr ? 'Kamera' : 'Camera',
            desc: isTr ? 'Kameranızı kullanmak istiyor' : 'Use your camera',
            icon: <Camera className="w-4 h-4" />,
            bg: neutralBg,
          };
        } else {
          return {
            title: isTr ? 'Mikrofon' : 'Microphone',
            desc: isTr ? 'Mikrofonunuzu kullanmak istiyor' : 'Use your microphone',
            icon: <Mic className="w-4 h-4" />,
            bg: neutralBg,
          };
        }
      }
      case 'geolocation':
        return {
          title: isTr ? 'Konum' : 'Location',
          desc: isTr ? 'Fiziksel konumunuza erişmek istiyor' : 'Access your physical location',
          icon: <MapPin className="w-4 h-4" />,
          bg: neutralBg,
        };
      case 'notifications':
        return {
          title: isTr ? 'Bildirimler' : 'Notifications',
          desc: isTr ? 'Size anlık bildirim göndermek istiyor' : 'Send you push notifications',
          icon: <Bell className="w-4 h-4" />,
          bg: neutralBg,
        };
      case 'clipboard-read':
        return {
          title: isTr ? 'Pano' : 'Clipboard',
          desc: isTr ? 'Panodaki metin ve görselleri okumak istiyor' : 'Read text and images from clipboard',
          icon: <Clipboard className="w-4 h-4" />,
          bg: neutralBg,
        };
      case 'pointerLock':
        return {
          title: isTr ? 'İmleç Kilidi' : 'Pointer Lock',
          desc: isTr ? 'Fare imlecinizi kilitlemek ve hareketlerini takip etmek istiyor' : 'Lock and track mouse pointer movement',
          icon: <MousePointer className="w-4 h-4" />,
          bg: neutralBg,
        };
      case 'fullscreen':
        return {
          title: isTr ? 'Tam Ekran' : 'Full Screen',
          desc: isTr ? 'Tam ekran moduna geçmek istiyor' : 'Enter full screen display mode',
          icon: <Maximize className="w-4 h-4" />,
          bg: neutralBg,
        };
      case 'display-capture':
        return {
          title: isTr ? 'Ekran Paylaşımı' : 'Screen Sharing',
          desc: isTr ? 'Ekranınızı veya pencerenizi paylaşmak istiyor' : 'Capture or share your screen/window',
          icon: <Tv className="w-4 h-4" />,
          bg: neutralBg,
        };
      case 'midi':
      case 'midiSysex':
        return {
          title: isTr ? 'MIDI Cihazları' : 'MIDI Devices',
          desc: isTr ? 'MIDI enstrümanlarına ve denetleyicilerine erişmek istiyor' : 'Access MIDI instruments and controllers',
          icon: <Music className="w-4 h-4" />,
          bg: neutralBg,
        };
      default:
        return {
          title: currentRequest.permissionName || perm,
          desc: isTr ? `${currentRequest.permissionName || perm} iznine erişmek istiyor` : `Access ${currentRequest.permissionName || perm} permission`,
          icon: <ShieldAlert className="w-4 h-4 text-amber-500" />,
          bg: neutralBg,
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
        initial={{ opacity: 0, y: -6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.96 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-11 left-2 z-[999999] w-88 bg-white/95 dark:bg-[#141518]/95 backdrop-blur-xl border border-neutral-200/90 dark:border-white/[0.1] rounded-xl shadow-2xl p-4 text-neutral-800 dark:text-neutral-100 select-none cursor-default"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0">
              <Globe className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-[13px] text-neutral-950 dark:text-neutral-100 truncate block">
                {domain}
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block -mt-0.5">
                {isTr ? 'şunu istiyor:' : 'wants to:'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(currentRequest.requestId)}
            className="p-1 -mr-1 -mt-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
            aria-label={isTr ? 'Kapat' : 'Close'}
            title={isTr ? 'Kapat' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Permission Request Card */}
        <div className="flex items-center gap-3 p-3 my-2 rounded-lg bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.08]">
          <div className={`p-2 rounded-lg shrink-0 ${details.bg}`}>
            {details.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              {details.title}
            </div>
            <div className="text-[11.5px] text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5">
              {details.desc}
            </div>
          </div>
        </div>

        {/* Remember Checkbox */}
        <div className="flex items-center gap-2 pt-1 pb-3 px-0.5">
          <label className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-neutral-900 dark:accent-white cursor-pointer"
            />
            <span>{isTr ? 'Bu site için bu tercihi hatırla' : 'Remember this choice for this site'}</span>
          </label>
          {requests.length > 1 && (
            <span className="ml-auto text-[10px] bg-neutral-100 dark:bg-white/[0.07] text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded-md font-medium">
              +{requests.length - 1} {isTr ? 'daha' : 'more'}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-neutral-200/80 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => onRespond(currentRequest.requestId, false, remember)}
            className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-neutral-200/80 dark:border-white/[0.08] rounded-lg transition-colors cursor-pointer"
          >
            {isTr ? 'Engelle' : 'Block'}
          </button>
          <button
            type="button"
            ref={allowButtonRef}
            onClick={() => onRespond(currentRequest.requestId, true, remember)}
            className="px-3.5 py-1.5 text-xs font-medium text-white dark:text-neutral-950 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            {isTr ? 'İzin Ver' : 'Allow'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
