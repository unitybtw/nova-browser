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

  useEffect(() => {
    if (isOpen) {
      setCurrentImage(initialImageDataUrl);
      setCaptureMode('visible');
    }
  }, [isOpen, initialImageDataUrl]);

  useModalFocusTrap(isOpen, onClose, containerRef);

  if (!isOpen || (!initialImageDataUrl && !isCapturingFull)) return null;

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
      setTimeout(() => setCopied(false), 2000);
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
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            ref={containerRef}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden outline-none max-h-[85vh]"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Camera className="w-5 h-5 text-blue-500" />
                <h2 className="font-semibold text-base">Screenshot Captured</h2>
              </div>

              {/* Mode Toggle */}
              {onCaptureFullPage && (
                <div className="flex items-center p-1 bg-slate-200/50 dark:bg-slate-900 rounded-lg">
                  <button
                    onClick={() => handleToggleMode('visible')}
                    disabled={isCapturingFull}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${captureMode === 'visible' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    Visible Area
                  </button>
                  <button
                    onClick={() => handleToggleMode('full')}
                    disabled={isCapturingFull}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${captureMode === 'full' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    {isCapturingFull ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Expand className="w-3.5 h-3.5" />}
                    Full Page
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={isCapturingFull || !currentImage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  disabled={isCapturingFull || !currentImage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-xs disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save PNG</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ml-2"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Preview Container */}
            <div className="flex-1 overflow-y-auto bg-slate-100/50 dark:bg-slate-900/50 p-6 flex flex-col items-center min-h-[300px]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full shadow-xs border border-slate-200/60 dark:border-slate-700 truncate max-w-full">
                {pageTitle}
              </p>

              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-800 w-full flex justify-center">
                {isCapturingFull ? (
                  <div className="h-[50vh] flex flex-col items-center justify-center text-slate-400 gap-3 w-full">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="text-sm font-medium">Capturing full page...</span>
                  </div>
                ) : (
                  currentImage && <img src={currentImage} alt="Screenshot" className="max-w-full object-contain block max-h-[60vh]" />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
