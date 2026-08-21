import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Download, Copy, Check, Expand, LayoutTemplate, Loader2 } from 'lucide-react';
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
  const [isCapturingFull, setIsCapturingFull] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(initialImageDataUrl);
  const [captureMode, setCaptureMode] = useState<'visible' | 'full'>('visible');
  const containerRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
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
    try {
      const base64Data = currentImage.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy screenshot to clipboard:', err);
    }
  };

  const handleToggleMode = async (mode: 'visible' | 'full') => {
    if (mode === captureMode || isCapturingFull) return;
    
    if (mode === 'full' && onCaptureFullPage) {
      setIsCapturingFull(true);
      const fullPageDataUrl = await onCaptureFullPage();
      if (fullPageDataUrl) {
        setCurrentImage(fullPageDataUrl);
        setCaptureMode('full');
      }
      setIsCapturingFull(false);
    } else if (mode === 'visible') {
      setCurrentImage(initialImageDataUrl);
      setCaptureMode('visible');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden outline-none max-h-[85vh]"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md">
              <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Camera className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-sm">Screenshot Preview</h2>
              </div>

              {/* Mode Toggle */}
              {onCaptureFullPage && (
                <div className="flex items-center p-1 bg-slate-200/50 dark:bg-slate-800 rounded-xl">
                  <button
                    onClick={() => handleToggleMode('visible')}
                    disabled={isCapturingFull}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${captureMode === 'visible' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    Visible Area
                  </button>
                  <button
                    onClick={() => handleToggleMode('full')}
                    disabled={isCapturingFull}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${captureMode === 'full' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    {isCapturingFull ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" /> : <Expand className="w-3.5 h-3.5" />}
                    Full Page
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={isCapturingFull || !currentImage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  disabled={isCapturingFull || !currentImage}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-600 text-white transition-colors shadow-xs disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save PNG</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image Preview Container */}
            <div className="flex-1 overflow-y-auto bg-slate-100/50 dark:bg-slate-950/50 p-6 flex flex-col items-center min-h-[300px]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-full shadow-xs border border-slate-200/60 dark:border-white/10 truncate max-w-full">
                {pageTitle}
              </p>

              <div className="rounded-xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-md bg-white dark:bg-slate-900 w-full flex justify-center p-2">
                {isCapturingFull ? (
                  <div className="h-[50vh] flex flex-col items-center justify-center text-slate-400 gap-3 w-full">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                    <span className="text-sm font-medium">Capturing full page...</span>
                  </div>
                ) : (
                  currentImage && <img src={currentImage} alt="Screenshot" className="max-w-full object-contain block max-h-[60vh] rounded-lg shadow-sm" />
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
