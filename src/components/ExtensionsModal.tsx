import React from 'react';
import { motion } from 'framer-motion';
import { X, Puzzle, Power, Trash2, Settings } from 'lucide-react';
import { Extension } from '../types/browser';

interface ExtensionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  extensions: Extension[];
  onToggleExtension?: (id: string) => void;
  onRemoveExtension?: (id: string) => void;
  onManageExtensions?: () => void;
}

export const ExtensionsModal: React.FC<ExtensionsModalProps> = ({
  isOpen,
  onClose,
  extensions,
  onToggleExtension,
  onRemoveExtension,
  onManageExtensions
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
            <Puzzle className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold">Extensions</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {extensions.length === 0 ? (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Puzzle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-slate-800 dark:text-slate-200 font-medium mb-1">No extensions installed</h3>
              <p className="text-sm text-slate-500">Extensions you install will appear here.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {extensions.map(ext => (
                <div key={ext.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 group transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {ext.iconData ? (
                        <img src={ext.iconData} alt={ext.name} className="w-6 h-6 object-contain" />
                      ) : (
                        <Puzzle className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">{ext.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{ext.description || 'No description available'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onToggleExtension?.(ext.id)}
                      className={`p-1.5 rounded-lg transition-colors ${ext.enabled !== false ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                      title={ext.enabled !== false ? 'Disable' : 'Enable'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onRemoveExtension?.(ext.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <button 
            onClick={() => {
              if (onManageExtensions) onManageExtensions();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Settings className="w-4 h-4" /> Manage Extensions
          </button>
        </div>
      </motion.div>
    </div>
  );
};
