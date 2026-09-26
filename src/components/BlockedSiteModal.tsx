import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, AlertTriangle, ExternalLink } from 'lucide-react';

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
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-zinc-900 border border-red-500/40 rounded-xl shadow-2xl overflow-hidden text-zinc-100 p-6"
        >
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 shrink-0">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-red-500/20 text-red-300 rounded border border-red-500/30">
                  {alert.reason === 'phishing' ? 'Kimlik Avı Koruması' : 'Zararlı Bağlantı Engellendi'}
                </span>
              </div>
              <h2 id="blocked-site-title" className="text-xl font-bold text-white mt-1">
                Zararlı Web Sitesi Engellendi
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Description */}
          <div className="mt-4 space-y-3">
            <p id="blocked-site-desc" className="text-sm text-zinc-300 leading-relaxed">
              Nova Browser Güvenlik Kalkanı, kişisel verilerinizi ve şifrelerinizi korumak amacıyla bu web sitesine erişimi durdurdu.
            </p>

            <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg space-y-1">
              <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Engellenen Bağlantı:</span>
              </div>
              <p className="text-xs font-mono text-red-300 break-all select-all">
                {alert.url}
              </p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-lg transition-colors shadow-lg shadow-red-950/40"
            >
              Güvenli Sayfaya Dön
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
