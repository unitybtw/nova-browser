import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Download, Copy, Check, Expand, LayoutTemplate, Loader2, AlertCircle } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

interface ScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageDataUrl: string | null;
  pageTitle: string;
  onCaptureFullPage?: () => Promise<string | null>;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = React.memo(({
  isOpen,
  onClose,
  imageDataUrl: initialImageDataUrl,
  pageTitle,
  onCaptureFullPage
}) => {
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCapturingFull, setIsCapturingFull] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(initialImageDataUrl);
  const [captureMode, setCaptureMode] = useState<'visible' | 'full'>('visible');
  const containerRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const previewVersionRef = useRef(0);
  const clipboardVersionRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      previewVersionRef.current++;
      clipboardVersionRef.current++;
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    previewVersionRef.current++;
    clipboardVersionRef.current++;
    setIsCapturingFull(false);
    setCopied(false);
    setActionError(null);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    if (isOpen) {
      setCurrentImage(initialImageDataUrl);
      setCaptureMode('visible');
    }
  }, [isOpen, initialImageDataUrl]);

  useModalFocusTrap(isOpen, onClose, containerRef);

  const handleDownload = () => {
    if (!currentImage) return;
    const a = document.createElement('a');
    a.href = currentImage;
    a.download = `screenshot_${(pageTitle || 'page').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${captureMode}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = async () => {
    if (!currentImage) return;
    const version = clipboardVersionRef.current;
    setActionError(null);
    try {
      const base64Data = currentImage.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      // A PNG cannot go through copyTextToClipboard (that helper is text only),
      // so the image write stays here — but its rejection must be visible.
      // It used to be console.error only, so a denied clipboard permission or a
      // non-image payload left the user with no signal at all.
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      if (!isMountedRef.current || version !== clipboardVersionRef.current) return;
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy screenshot to clipboard:', err);
      if (isMountedRef.current && version === clipboardVersionRef.current) {
        setActionError('Clipboard unavailable — use "Save PNG" instead.');
      }
    }
  };

  const handleToggleMode = async (mode: 'visible' | 'full') => {
    if (mode === captureMode || isCapturingFull) return;
    clipboardVersionRef.current++;
    setCopied(false);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);

    if (mode === 'full' && onCaptureFullPage) {
      const version = previewVersionRef.current;
      setIsCapturingFull(true);
      setActionError(null);
      // Every control below is gated on isCapturingFull, so a rejected capture
      // that skipped the reset left the whole dialog disabled until it was
      // closed and reopened. The finally is what guarantees the flag clears.
      try {
        const fullPageDataUrl = await onCaptureFullPage();
        if (!isMountedRef.current || version !== previewVersionRef.current) return;
        if (fullPageDataUrl) {
          setCurrentImage(fullPageDataUrl);
          setCaptureMode('full');
        } else {
          setActionError('Full-page capture failed. Please try again.');
        }
      } catch (err) {
        console.error('Full page capture failed:', err);
        if (isMountedRef.current && version === previewVersionRef.current) {
          setActionError('Full-page capture failed. Please try again.');
        }
      } finally {
        if (isMountedRef.current && version === previewVersionRef.current) setIsCapturingFull(false);
      }
    } else if (mode === 'visible') {
      setCurrentImage(initialImageDataUrl);
      setCaptureMode('visible');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#141518] border border-neutral-200/90 dark:border-white/[0.1] rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden outline-none max-h-[85vh]"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200/80 dark:border-white/[0.08]">
              <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                <Camera className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <h2 className="font-semibold text-xs">Screenshot Preview</h2>
              </div>

              {/* Mode Toggle */}
              {onCaptureFullPage && (
                <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.07] rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleToggleMode('visible')}
                    disabled={isCapturingFull}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      captureMode === 'visible'
                        ? 'bg-white dark:bg-white/[0.14] shadow-xs text-neutral-950 dark:text-white'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    Visible Area
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleMode('full')}
                    disabled={isCapturingFull}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      captureMode === 'full'
                        ? 'bg-white dark:bg-white/[0.14] shadow-xs text-neutral-950 dark:text-white'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    {isCapturingFull ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Expand className="w-3.5 h-3.5" />}
                    Full Page
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={isCapturingFull || !currentImage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-neutral-200/80 dark:border-white/[0.08] text-neutral-800 dark:text-neutral-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isCapturingFull || !currentImage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save PNG</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors ml-0.5 cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image Preview Container */}
            <div className="flex-1 overflow-y-auto bg-[#fbfbfc] dark:bg-[#0e0f12] p-5 flex flex-col items-center min-h-[300px]">
              {actionError && (
                <p role="alert" className="w-full max-w-2xl mb-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {actionError}
                </p>
              )}
              <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-3 bg-white dark:bg-[#141518] px-3 py-1 rounded-md border border-neutral-200/80 dark:border-white/[0.08] truncate max-w-full">
                {pageTitle}
              </p>

              <div className="rounded-xl overflow-hidden border border-neutral-200/90 dark:border-white/[0.08] bg-white dark:bg-[#141518] w-full flex justify-center p-2">
                {isCapturingFull ? (
                  <div className="h-[50vh] flex flex-col items-center justify-center text-neutral-400 gap-2.5 w-full">
                    <Loader2 className="w-6 h-6 animate-spin text-neutral-500 dark:text-neutral-400" />
                    <span className="text-xs font-medium">Capturing full page...</span>
                  </div>
                ) : (
                  currentImage && <img src={currentImage} alt="Screenshot" className="max-w-full object-contain block max-h-[60vh] rounded-lg" />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
