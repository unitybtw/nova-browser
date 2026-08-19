import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, X, Copy, Check, QrCode } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export const ShareModal: React.FC<ShareModalProps> = React.memo(({
  isOpen,
  onClose,
  url,
  title
}) => {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(isOpen, onClose, containerRef);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate Google Chart API QR Code image URL for sharing with mobile phone
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4" onClick={onClose}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden outline-none"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Share2 className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Share Page</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col items-center gap-4 text-center">
              {/* QR Code Container */}
              <div className="p-3 bg-white border border-slate-200/80 dark:border-white/20 rounded-2xl shadow-sm flex flex-col items-center gap-2">
                <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 rounded-lg object-contain" />
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <QrCode className="w-3 h-3 text-cyan-500" /> Scan with mobile phone
                </span>
              </div>

              {/* Title & URL */}
              <div className="w-full space-y-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{title}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{url}</p>
              </div>

              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 ${
                  copied 
                    ? 'bg-emerald-500 text-white shadow-sm' 
                    : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Page Link'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
