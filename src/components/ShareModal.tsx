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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#141518] border border-neutral-200/90 dark:border-white/[0.1] rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden outline-none"
            role="dialog"
            aria-modal="true"
            aria-label="Share Page"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200/80 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <h2 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Share Page</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col items-center gap-4 text-center">
              {/* QR Code Container */}
              <div className="p-3 bg-white border border-neutral-200/90 dark:border-white/[0.12] rounded-xl flex flex-col items-center gap-2">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-40 h-40 rounded-lg object-contain" />
                ) : qrError ? (
                  <div className="w-40 h-40 rounded-lg flex flex-col items-center justify-center gap-2 bg-neutral-50 dark:bg-neutral-900 px-3 text-center">
                    <AlertCircle className="w-7 h-7 text-red-500" />
                    <span className="text-[10px] font-medium text-neutral-500">{qrError}</span>
                  </div>
                ) : (
                  <div className="w-40 h-40 rounded-lg flex items-center justify-center bg-neutral-100">
                    <QrCode className="w-9 h-9 text-neutral-400" />
                  </div>
                )}
                <span className="text-[10px] text-neutral-500 font-medium flex items-center gap-1">
                  <QrCode className="w-3 h-3 text-neutral-600" />
                  {qrError ? 'QR unavailable — use the link below' : 'Scan with mobile phone'}
                </span>
              </div>

              {/* Title & URL */}
              <div className="w-full space-y-0.5">
                <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">{title}</p>
                <p className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 truncate">{url}</p>
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Page Link'}</span>
              </button>

              {copyError && (
                <p role="alert" className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Copy failed — copy the link above manually.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
