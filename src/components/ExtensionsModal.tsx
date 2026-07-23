import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, X, Trash2, Plus, AlertCircle, RefreshCw, Folder } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

interface Extension {
  id: string;
  name: string;
  version: string;
  description: string;
  path: string;
}

interface ExtensionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExtensionsModal: React.FC<ExtensionsModalProps> = React.memo(({ isOpen, onClose }) => {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useModalFocusTrap(isOpen, onClose, containerRef);

  const fetchExtensions = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await (window as any).electronAPI?.listExtensions();
      if (list) {
        setExtensions(list);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load extensions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExtensions();
    }
  }, [isOpen]);

  const handleLoadUnpacked = async () => {
    try {
      const res = await (window as any).electronAPI?.selectExtensionFolder();
      if (res?.canceled || !res?.folderPath) return;

      setError(null);
      const installRes = await (window as any).electronAPI?.installExtension(res.folderPath);
      if (installRes?.error) {
        setError(installRes.error);
      } else {
        await fetchExtensions();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to install extension');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const res = await (window as any).electronAPI?.removeExtension(id);
      if (res?.error) {
        setError(res.error);
      } else {
        await fetchExtensions();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove extension');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            ref={containerRef}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl h-[550px] flex flex-col overflow-hidden outline-none"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Puzzle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Extensions</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage your browser extensions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadUnpacked}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 rounded-lg text-sm font-medium transition-colors"
                >
                  <Folder className="w-4 h-4" />
                  Load Unpacked
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/20">
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-start gap-2 border border-red-100 dark:border-red-800/30">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Chrome Web Mağazası'ndan Yükle</h3>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const input = new FormData(e.currentTarget).get('url') as string;
                    if (!input) return;
                    try {
                      setLoading(true);
                      setError(null);
                      const res = await (window as any).electronAPI?.installFromWebStore(input);
                      if (res?.error) setError(res.error);
                      else await fetchExtensions();
                      (e.target as HTMLFormElement).reset();
                    } catch (err: any) {
                      setError(err.message || 'Yükleme başarısız');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input 
                    name="url"
                    type="url" 
                    placeholder="Eklenti URL'sini buraya yapıştırın..." 
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all dark:text-slate-200"
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Yükle
                  </button>
                </form>
              </div>

              {loading && extensions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-400" />
                  <p>Loading extensions...</p>
                </div>
              ) : extensions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <Puzzle className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">No extensions installed</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    You can install unpacked Chrome extensions by selecting their folder.
                  </p>
                  <button
                    onClick={handleLoadUnpacked}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Load Unpacked Extension
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {extensions.map((ext) => (
                    <div key={ext.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm flex items-start justify-between gap-4 group hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                      <div className="flex items-start gap-4 flex-1 overflow-hidden">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 rounded-lg flex items-center justify-center shrink-0">
                          <Puzzle className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{ext.name}</h3>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-medium rounded-full">
                              v{ext.version}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">
                            {ext.description || 'No description provided.'}
                          </p>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded inline-block max-w-full">
                            ID: {ext.id}
                          </div>
                        </div>
                      </div>
                      
                      <div className="shrink-0 pt-1">
                        <button
                          onClick={() => handleRemove(ext.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none"
                          title="Remove Extension"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
