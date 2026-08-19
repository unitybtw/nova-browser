import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Puzzle, Power, Trash2, Settings, ExternalLink } from 'lucide-react';
import { Extension } from '../types/browser';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

interface ExtensionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  extensions: Extension[];
  onToggleExtension?: (id: string) => void;
  onRemoveExtension?: (id: string) => void;
  onManageExtensions?: () => void;
  onOpenUrl?: (url: string) => void;
}

export const ExtensionsModal: React.FC<ExtensionsModalProps> = ({
  isOpen,
  onClose,
  extensions,
  onToggleExtension,
  onRemoveExtension,
  onManageExtensions,
  onOpenUrl
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(isOpen, onClose, containerRef);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md" onClick={onClose}>
          <motion.div
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col outline-none"
          >
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md">
              <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Puzzle className="w-4 h-4" />
                </div>
                <h2 className="text-base font-semibold">Extensions</h2>
              </div>
              <button 
                onClick={onClose} 
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {extensions.length === 0 ? (
                <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-3">
                    <Puzzle className="w-7 h-7" />
                  </div>
                  <h3 className="text-slate-800 dark:text-slate-200 font-medium mb-1">No extensions installed</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">Enhance Nova Browser with extensions from Chrome Web Store.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {extensions.map(ext => (
                    <div key={ext.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100/70 dark:hover:bg-white/[0.04] group transition-colors">
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                          {ext.iconData ? (
                            <img src={ext.iconData} alt={ext.name} className="w-5 h-5 object-contain" />
                          ) : (
                            <Puzzle className="w-4 h-4 text-cyan-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{ext.name}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 truncate">{ext.description || 'No description available'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button 
                          onClick={() => onToggleExtension?.(ext.id)}
                          className={`p-1.5 rounded-lg transition-colors ${ext.enabled !== false ? 'text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-500/20' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                          title={ext.enabled !== false ? 'Disable' : 'Enable'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onRemoveExtension?.(ext.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30 flex gap-2">
              <button 
                onClick={() => {
                  if (onManageExtensions) onManageExtensions();
                  onClose();
                }}
                className="flex-1 py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Settings className="w-3.5 h-3.5" /> Manage
              </button>
              <button 
                onClick={() => {
                  if (onOpenUrl) onOpenUrl('https://chromewebstore.google.com/');
                  else window.open('https://chromewebstore.google.com/', '_blank');
                  onClose();
                }}
                className="flex-1 py-2 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Web Store
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
