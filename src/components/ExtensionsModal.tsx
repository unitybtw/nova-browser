import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Puzzle, Power, Trash2, Settings, ExternalLink, FolderOpen, Play, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Extension, Tab } from '../types/browser';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { showAlert } from '../utils/confirmDialog';

interface ExtensionPermission {
  name: string;
  description: string;
  isHostPermission: boolean;
}

interface ExtensionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  extensions: Extension[];
  activeTab?: Tab | null;
  onToggleExtension?: (id: string) => void;
  onRemoveExtension?: (id: string) => void;
  onManageExtensions?: () => void;
  onOpenUrl?: (url: string) => void;
  // Permission review dialog
  pendingPermissionReview?: {
    extensionId: string;
    extensionName: string;
    permissions: ExtensionPermission[];
  } | null;
  onPermissionReviewResponse?: (allowed: boolean) => void;
}

export const ExtensionsModal: React.FC<ExtensionsModalProps> = ({
  isOpen,
  onClose,
  extensions,
  activeTab,
  onToggleExtension,
  onRemoveExtension,
  onManageExtensions,
  onOpenUrl,
  pendingPermissionReview,
  onPermissionReviewResponse
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(isOpen, onClose, containerRef);

  const handleLaunchExtension = (ext: Extension, e?: React.MouseEvent) => {
    if (ext.popupUrl) {
      const cleanPopup = ext.popupUrl.replace(/^\.?\//, '');
      const url = `chrome-extension://${ext.id}/${cleanPopup}`;
      if ((window as any).electronAPI?.openExtensionPopup) {
        let bounds: any = undefined;
        if (e) {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          bounds = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        }
        (window as any).electronAPI.openExtensionPopup(
          url, 
          bounds,
          activeTab ? {
            id: activeTab.id,
            url: activeTab.url,
            title: activeTab.title,
            favIconUrl: activeTab.favicon,
            webContentsId: activeTab.webContentsId
          } : undefined
        );
        onClose();
      } else if (onOpenUrl) {
        onOpenUrl(url);
        onClose();
      }
    } else if (ext.optionsUrl) {
      const cleanOptions = ext.optionsUrl.replace(/^\.?\//, '');
      const url = `chrome-extension://${ext.id}/${cleanOptions}`;
      if (onOpenUrl) {
        onOpenUrl(url);
        onClose();
      }
    }
  };

  const handleLoadUnpacked = async () => {
    try {
      if ((window as any).electronAPI?.selectExtensionFolder && (window as any).electronAPI?.installExtension) {
        const result = await (window as any).electronAPI.selectExtensionFolder();
        if (!result.canceled && result.folderPath) {
          const installRes = await (window as any).electronAPI.installExtension(result.folderPath);
          if (installRes.error) {
            void showAlert({ title: 'Extensions', message: 'Extension load error: ' + installRes.error });
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load unpacked extension:', err);
    }
  };

  // Permission Review Dialog Component
  const PermissionReviewDialog: React.FC<{
    extensionId: string;
    extensionName: string;
    permissions: ExtensionPermission[];
    onConfirm: (allowed: boolean) => void;
  }> = ({ extensionId, extensionName, permissions, onConfirm }) => {
    const [rememberDecision, setRememberDecision] = useState(false);

    const handleConfirm = useCallback((allowed: boolean) => {
      onConfirm(allowed);
    }, [onConfirm]);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col outline-none"
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-amber-50/80 dark:bg-amber-900/30 backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Review Permissions</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Extension requests access to the following</p>
            </div>
          </div>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 mb-2">
              <Puzzle className="w-4 h-4 text-cyan-500" />
              <span className="font-medium">{extensionName}</span>
              <span className="text-[10px] text-slate-400 font-mono">({extensionId})</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This extension is requesting permission to access certain data and features. 
              Please review the permissions below before installing.
            </p>
          </div>

          <div className="space-y-2">
            {permissions.map((perm, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100/50 dark:border-white/5"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mt-0.5">
                  {perm.isHostPermission ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {perm.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {perm.description}
                  </p>
                  {perm.isHostPermission && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                      Host Permission
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {permissions.length === 0 && (
            <div className="py-8 px-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-slate-800 dark:text-slate-200 font-medium mb-1">No special permissions required</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                This extension doesn't request any additional permissions beyond basic functionality.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberDecision}
              onChange={(e) => setRememberDecision(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Remember this decision for future installations
            </span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleConfirm(false)}
              className="flex-1 py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={() => handleConfirm(true)}
              className="flex-1 py-2 px-3 bg-cyan-500 hover:bg-cyan-600 text-white border border-cyan-500 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Allow & Install
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md" onClick={onClose}>
          {pendingPermissionReview && onPermissionReviewResponse ? (
            // Permission Review Dialog
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-full max-w-lg"
            >
              <PermissionReviewDialog
                extensionId={pendingPermissionReview.extensionId}
                extensionName={pendingPermissionReview.extensionName}
                permissions={pendingPermissionReview.permissions}
                onConfirm={onPermissionReviewResponse}
              />
            </motion.div>
          ) : (
            // Regular Extensions Modal
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
                <div>
                  <h2 className="text-base font-semibold">Extensions</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Chrome Web Store extensions & tools</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">Enhance Nova Browser with extensions from the Chrome Web Store or load unpacked folders.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {extensions.map(ext => (
                    <div 
                      key={ext.id} 
                      onClick={(e) => handleLaunchExtension(ext, e)}
                      className={`flex items-center justify-between p-3 rounded-xl hover:bg-slate-100/70 dark:hover:bg-white/[0.04] group transition-colors ${ext.popupUrl || ext.optionsUrl ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                          {ext.iconData ? (
                            <img src={ext.iconData} alt={ext.name} className="w-5 h-5 object-contain" />
                          ) : (
                            <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold uppercase">
                              {ext.name ? ext.name.charAt(0) : <Puzzle className="w-4 h-4" />}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{ext.name}</h4>
                            {ext.version && (
                              <span className="text-[10px] text-slate-400 font-mono">v{ext.version}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 truncate">{ext.description || 'No description available'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                        {(ext.popupUrl || ext.optionsUrl) && (
                          <button 
                            onClick={(e) => handleLaunchExtension(ext, e)}
                            className="p-1.5 rounded-lg text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 transition-colors cursor-pointer"
                            title={ext.popupUrl ? 'Open Popup' : 'Open Options'}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                        <button 
                          onClick={() => onToggleExtension?.(ext.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${ext.enabled !== false ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/20' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                          title={ext.enabled !== false ? 'Disable' : 'Enable'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onRemoveExtension?.(ext.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors cursor-pointer"
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
                onClick={handleLoadUnpacked}
                className="py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                title="Load unpacked extension folder"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" /> Load Folder
              </button>
              <button 
                onClick={() => {
                  if (onManageExtensions) onManageExtensions();
                  onClose();
                }}
                className="flex-1 py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" /> Manage
              </button>
              <button 
                onClick={() => {
                  if (onOpenUrl) onOpenUrl('https://chromewebstore.google.com/');
                  else window.open('https://chromewebstore.google.com/', '_blank');
                  onClose();
                }}
                className="flex-1 py-2 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Web Store
              </button>
            </div>
          </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};
