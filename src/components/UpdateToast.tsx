import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Rocket, X } from 'lucide-react';

export const UpdateToast: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [version, setVersion] = useState('');
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    const api = (window as any).electronAPI;
    
    if (api) {
      if (api.onUpdateAvailable) {
        unsubs.push(api.onUpdateAvailable((_: any, info: any) => {
          setVersion(info?.version || 'new');
          setIsDownloaded(false);
          setIsVisible(true);
        }));
      }
      
      if (api.onUpdateDownloaded) {
        unsubs.push(api.onUpdateDownloaded((_: any, info: any) => {
          setVersion(info?.version || 'new');
          setIsDownloaded(true);
          setIsVisible(true);
        }));
      }
    }
    
    return () => unsubs.forEach(u => u());
  }, []);

  const handleInstall = () => {
    const api = (window as any).electronAPI;
    if (api?.installUpdate) {
      api.installUpdate();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-6 right-6 z-[9999] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 p-4 rounded-2xl shadow-2xl flex items-start gap-3.5 max-w-sm w-full"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Rocket className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          
          <div className="flex-1 pt-0.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
              {isDownloaded ? 'Update Ready to Install' : 'Update Available'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              {isDownloaded 
                ? `Version ${version} has been downloaded and is ready to install.` 
                : `Version ${version} is available and downloading in the background...`}
            </p>
            
            <div className="flex items-center gap-2">
              {isDownloaded && (
                <button 
                  onClick={handleInstall}
                  className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Restart & Install
                </button>
              )}
              <button 
                onClick={() => setIsVisible(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
