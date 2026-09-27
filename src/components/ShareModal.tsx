import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, X, Copy, Check, QrCode, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { copyTextToClipboard } from '../utils/clipboard';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

/**
 * Encodes a share URL as a QR data URL, or null when the encoder rejects (a
 * payload past the QR capacity, an unsupported mode, ...). Module scope and
 * exported so the failure is driven by the real encoder in tests instead of a
 * re-implementation, and so the component only has to decide what to render.
 */
export async function generateQrDataUrl(url: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, { margin: 1, width: 180, errorCorrectionLevel: 'M' });
  } catch (err) {
    console.error('Failed to generate local QR code:', err);
    return null;
  }
}

export const ShareModal: React.FC<ShareModalProps> = React.memo(({
  isOpen,
  onClose,
  url,
  title
}) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useDialogA11y({ isOpen, onClose, containerRef });
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);
  useModalFocusTrap(isOpen, onClose, containerRef);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    setQrError(null);
    setQrCodeDataUrl('');
    generateQrDataUrl(url).then(dataUrl => {
      if (!isMounted) return;
      if (dataUrl) {
        setQrCodeDataUrl(dataUrl);
      } else {
        // The old code only logged the rejection, so the data URL stayed '' and
        // this modal showed the pulsing placeholder — captioned "Scan with
        // mobile phone" — forever.
        setQrError('QR code could not be generated for this page.');
      }
    });
    return () => { isMounted = false; };
  }, [url]);

  const handleCopy = async () => {
    const success = await copyTextToClipboard(url);
    if (success) {
      setCopyError(false);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } else {
      // Same reason as above: a silent failure here leaves the user believing
      // the link is on the clipboard when it is not.
      setCopyError(true);
    }
  };

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
            role="dialog"
            aria-modal="true"
            aria-label="Share Page"
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
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-40 h-40 rounded-lg object-contain" />
                ) : qrError ? (
                  <div className="w-40 h-40 rounded-lg flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{qrError}</span>
                  </div>
                ) : (
                  <div className="w-40 h-40 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                    <QrCode className="w-10 h-10 text-slate-300 dark:text-slate-600 animate-pulse" />
                  </div>
                )}
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <QrCode className="w-3 h-3 text-cyan-500" />
                  {qrError ? 'QR unavailable — use the link below' : 'Scan with mobile phone'}
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
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-xs transition-colors duration-200 ${
                  copied
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Page Link'}</span>
              </button>

              {copyError && (
                <p role="alert" className="text-[11px] text-red-500 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Copy failed — copy the link above manually.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
