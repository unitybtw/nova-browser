import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../services/i18n';

export interface BlockedSiteAlertData {
  url: string;
  reason: string;
  timestamp: number;
}

export interface BlockedSiteModalProps {
  alert: BlockedSiteAlertData | null;
  onClose: () => void;
}

export const BlockedSiteModal: React.FC<BlockedSiteModalProps> = ({ alert, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { language } = useTranslation();
  const isTr = language === 'tr';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (alert) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [alert, onClose]);

  if (!alert) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="blocked-site-title"
        aria-describedby="blocked-site-desc"
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-[#141518] border border-red-500/30 rounded-xl shadow-2xl overflow-hidden text-neutral-100 p-5"
        >
          {/* Header */}
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-red-500/15 text-red-300 rounded-md border border-red-500/25">
                  {alert.reason === 'phishing'
                    ? (isTr ? 'Kimlik Avı Koruması' : 'Phishing Protection')
                    : (isTr ? 'Zararlı Bağlantı Engellendi' : 'Malicious Link Blocked')}
                </span>
              </div>
              <h2 id="blocked-site-title" className="text-base font-semibold text-white mt-1">
                {isTr ? 'Zararlı Web Sitesi Engellendi' : 'Malicious Website Blocked'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.07] transition-colors cursor-pointer"
              aria-label={isTr ? 'Kapat' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <div className="mt-4 space-y-3">
            <p id="blocked-site-desc" className="text-xs text-neutral-300 leading-relaxed">
              {isTr
                ? 'Nova Browser Güvenlik Kalkanı, kişisel verilerinizi ve şifrelerinizi korumak amacıyla bu web sitesine erişimi durdurdu.'
                : 'Nova Browser Security Shield blocked access to this website to protect your personal data and credentials.'}
            </p>

            <div className="p-3 bg-[#0e0f12] border border-white/[0.08] rounded-lg space-y-1">
              <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{isTr ? 'Engellenen Bağlantı:' : 'Blocked Link:'}</span>
              </div>
              <p className="text-xs font-mono text-red-300 break-all select-all">
                {alert.url}
              </p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors cursor-pointer"
            >
              {isTr ? 'Güvenli Sayfaya Dön' : 'Return to Safety'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
