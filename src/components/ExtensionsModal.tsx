import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Puzzle, Power, Trash2, Settings, ExternalLink, FolderOpen, Play, Shield, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { Extension, Tab } from '../types/browser';
import { showAlert } from '../utils/confirmDialog';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { installUnpackedExtension, installWebStoreExtension, launchExtensionPopup } from '../services/extensionActions';

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
  pendingExtensionIds?: ReadonlySet<string>;
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

interface PermissionReviewDialogProps {
  extensionId: string;
  extensionName: string;
  permissions: ExtensionPermission[];
  onConfirm: (allowed: boolean) => void;
}

const PermissionReviewDialog: React.FC<PermissionReviewDialogProps> = ({
  extensionId,
  extensionName,
  permissions,
  onConfirm,
}) => {
  const [rememberDecision, setRememberDecision] = useState(false);

  const handleConfirm = useCallback((allowed: boolean) => {
    onConfirm(allowed);
  }, [onConfirm]);

  return (
    <motion.div
      onClick={(e) => e.stopPropagation()}
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="w-full max-w-lg bg-white dark:bg-[#141518] rounded-xl shadow-2xl border border-neutral-200/90 dark:border-white/[0.1] overflow-hidden flex flex-col outline-none"
    >
      <div className="px-4 py-3.5 border-b border-neutral-200/80 dark:border-white/[0.08] flex justify-between items-center bg-amber-500/[0.06]">
        <div className="flex items-center gap-2.5 text-neutral-900 dark:text-neutral-100">
          <div className="p-1.5 rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Review Permissions</h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Extension requests access to the following</p>
          </div>
        </div>
      </div>

      <div className="p-4 max-h-[60vh] overflow-y-auto">
        <div className="mb-3.5 p-3 bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-2 text-xs text-neutral-900 dark:text-neutral-100 mb-1.5">
            <Puzzle className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span className="font-semibold">{extensionName}</span>
            <span className="text-[10px] text-neutral-400 font-mono">({extensionId})</span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            This extension is requesting permission to access certain data and features.
            Please review the permissions below before installing.
          </p>
        </div>

        <div className="space-y-1.5">
          {permissions.map((perm) => (
            <div
              key={perm.name}
              className="flex items-start gap-2.5 p-2.5 rounded-lg bg-neutral-50/80 dark:bg-white/[0.02] border border-neutral-200/80 dark:border-white/[0.07]"
            >
              <div className="shrink-0 w-7 h-7 rounded-lg bg-neutral-100 dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-300 flex items-center justify-center mt-0.5">
                {perm.isHostPermission ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                  {perm.name}
                </h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {perm.description}
                </p>
                {perm.isHostPermission && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/12 border border-amber-500/20 rounded-md">
                    Host Permission
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {permissions.length === 0 && (
          <div className="py-8 px-6 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2.5">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="text-neutral-900 dark:text-neutral-100 text-xs font-medium mb-1">No special permissions required</h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs">
              This extension doesn&apos;t request any additional permissions beyond basic functionality.
            </p>
          </div>
        )}
      </div>

      <div className="p-3.5 border-t border-neutral-200/80 dark:border-white/[0.08] bg-neutral-50/70 dark:bg-white/[0.02] flex flex-col gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberDecision}
            onChange={(e) => setRememberDecision(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-neutral-900 dark:accent-white"
          />
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            Remember this decision for future installations
          </span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleConfirm(false);
            }}
            className="flex-1 py-2 px-3 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-neutral-200/80 dark:border-white/[0.08] rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleConfirm(true);
            }}
            className="flex-1 py-2 px-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Allow & Install
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const ExtensionsModal: React.FC<ExtensionsModalProps> = ({
  isOpen,
  onClose,
  extensions,
  activeTab,
  onToggleExtension,
  onRemoveExtension,
  pendingExtensionIds,
  onManageExtensions,
  onOpenUrl,
  pendingPermissionReview,
  onPermissionReviewResponse
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webstoreInput, setWebstoreInput] = useState('');
  const [isInstallingWebstore, setIsInstallingWebstore] = useState(false);
  useDialogA11y({ isOpen, onClose, containerRef });

  const handleLaunchExtension = async (ext: Extension, e?: React.MouseEvent, targetPage?: string) => {
    const page = targetPage || ext.popupUrl || ext.optionsUrl;
    if (!page || ext.enabled === false) return;
    const url = `chrome-extension://${ext.id}/${page.replace(/^\.?\//, '')}`;
    const rect = e?.currentTarget.getBoundingClientRect();
    const opened = await launchExtensionPopup(url, rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : undefined,
      activeTab ? { id: activeTab.id, url: activeTab.url, title: activeTab.title, favIconUrl: activeTab.favicon, webContentsId: activeTab.webContentsId, isIncognito: Boolean(activeTab.isIncognito) } : undefined);
    if (opened) onClose();
  };

  const handleInstallFromWebstoreInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webstoreInput.trim() || isInstallingWebstore) return;
    setIsInstallingWebstore(true);
    try {
      await installWebStoreExtension(webstoreInput);
      setWebstoreInput('');
    } catch (err: any) {
      console.error('Failed to install Web Store extension:', err);
      void showAlert({ title: 'Extensions', message: err?.message || 'Could not install extension from Chrome Web Store.' });
    } finally {
      setIsInstallingWebstore(false);
    }
  };

  const handleLoadUnpacked = async () => {
    try {
      await installUnpackedExtension();
    } catch (err: any) {
      console.error('Failed to load unpacked extension:', err);
      void showAlert({ title: 'Extensions', message: err?.message || 'Failed to load extension.' });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" onClick={onClose}>
          {pendingPermissionReview && onPermissionReviewResponse ? (
            <PermissionReviewDialog
              extensionId={pendingPermissionReview.extensionId}
              extensionName={pendingPermissionReview.extensionName}
              permissions={pendingPermissionReview.permissions}
              onConfirm={onPermissionReviewResponse}
            />
          ) : (
            <motion.div
              ref={containerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Extensions"
              onClick={(e) => e.stopPropagation()}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="w-full max-w-md bg-white dark:bg-[#141518] rounded-xl shadow-2xl border border-neutral-200/90 dark:border-white/[0.1] overflow-hidden flex flex-col outline-none"
            >
            <div className="px-4 py-3.5 border-b border-neutral-200/80 dark:border-white/[0.08] flex justify-between items-center">
              <div className="flex items-center gap-2.5 text-neutral-900 dark:text-neutral-100">
                <Puzzle className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <div>
                  <h2 className="text-sm font-semibold leading-tight">Extensions</h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Chrome extensions; compatibility depends on APIs used.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-white/[0.07] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInstallFromWebstoreInput} className="px-3.5 py-2.5 border-b border-neutral-200/80 dark:border-white/[0.08] flex gap-2">
              <input
                type="text"
                value={webstoreInput}
                onChange={(e) => setWebstoreInput(e.target.value)}
                placeholder="Paste Chrome Web Store URL or Extension ID..."
                disabled={isInstallingWebstore}
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-neutral-100/90 dark:bg-white/[0.06] border border-neutral-200/90 dark:border-white/[0.09] text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-white/30"
              />
              <button
                type="submit"
                disabled={!webstoreInput.trim() || isInstallingWebstore}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 disabled:opacity-45 text-white dark:text-neutral-950 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isInstallingWebstore ? 'Installing...' : 'Install'}</span>
              </button>
            </form>

            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {extensions.length === 0 ? (
                <div className="py-10 px-6 flex flex-col items-center justify-center text-center">
                  <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] text-neutral-400 flex items-center justify-center mb-3">
                    <Puzzle className="w-5 h-5" />
                  </div>
                  <h3 className="text-neutral-900 dark:text-neutral-100 text-xs font-medium mb-1">No extensions installed</h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs">Enhance Nova Browser with extensions from the Chrome Web Store or load unpacked folders.</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {extensions.map((ext) => (
                    <div
                      key={ext.id}
                      onClick={(e) => handleLaunchExtension(ext, e)}
                      className={`flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-100/80 dark:hover:bg-white/[0.04] group transition-colors ${ext.popupUrl || ext.optionsUrl ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                          {ext.iconData ? (
                            <img src={ext.iconData} alt={ext.name} className="w-5 h-5 object-contain" />
                          ) : (
                            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase">
                              {ext.name ? ext.name.charAt(0) : <Puzzle className="w-4 h-4" />}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">{ext.name}</h4>
                            {ext.version && (
                              <span className="text-[10px] text-neutral-400 font-mono">v{ext.version}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 truncate">{ext.description || 'No description available'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                        {(ext.popupUrl || ext.optionsUrl) && (
                          <button
                            type="button"
                            onClick={(e) => handleLaunchExtension(ext, e)}
                            className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                            title={ext.popupUrl ? 'Open Popup' : 'Open Options'}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                        {ext.popupUrl && ext.optionsUrl && (
                          <button
                            type="button"
                            onClick={(e) => handleLaunchExtension(ext, e, ext.optionsUrl)}
                            className="p-1.5 rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                            title="Open Options"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onToggleExtension?.(ext.id)}
                          disabled={pendingExtensionIds?.has(ext.id)}
                          aria-busy={pendingExtensionIds?.has(ext.id)}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${ext.enabled !== false ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10' : 'text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-white/[0.08]'}`}
                          title={ext.enabled !== false ? 'Disable' : 'Enable'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveExtension?.(ext.id)}
                          disabled={pendingExtensionIds?.has(ext.id)}
                          aria-busy={pendingExtensionIds?.has(ext.id)}
                          className="p-1.5 rounded-md text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
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

            <div className="p-3 border-t border-neutral-200/80 dark:border-white/[0.08] bg-neutral-50/70 dark:bg-white/[0.02] flex gap-2">
              <button
                type="button"
                onClick={handleLoadUnpacked}
                className="py-1.5 px-3 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-neutral-200/80 dark:border-white/[0.08] rounded-lg text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Load unpacked extension folder"
              >
                <FolderOpen className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" /> Load Folder
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onManageExtensions) onManageExtensions();
                  onClose();
                }}
                className="flex-1 py-1.5 px-3 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-neutral-200/80 dark:border-white/[0.08] rounded-lg text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" /> Manage
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onOpenUrl) onOpenUrl('https://chromewebstore.google.com/');
                  else window.open('https://chromewebstore.google.com/', '_blank');
                  onClose();
                }}
                className="flex-1 py-1.5 px-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Web Store
              </button>
            </div>
          </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
