import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Key,
  Cloud,
  RefreshCw,
  Check,
  AlertCircle,
  LogOut,
  ShieldCheck,
  Bookmark,
  Clock,
  Settings,
  FolderTree,
  Link2,
  Copy,
  Laptop,
  ArrowRight
} from 'lucide-react';
import { syncService, NovaSyncService, SyncStatus, SyncPreferences } from '../services/syncService';
import { copyTextToClipboard } from '../utils/clipboard';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { useSafeTimeout } from '../hooks/useSafeTimeout';
import { getLocale } from '../services/i18n';
import { showConfirm } from '../utils/confirmDialog';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPerformSync?: () => Promise<void>;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onPerformSync
}) => {
  const [inputSyncCode, setInputSyncCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const { setSafeTimeout } = useSafeTimeout();

  const containerRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(isOpen, onClose, containerRef);

  useEffect(() => {
    const unsubscribe = syncService.subscribe(status => {
      setSyncStatus(status);
      if (status.syncCode) {
        setGeneratedCode(status.syncCode);
      }
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setCopiedCode(false);
    }
  }, [isOpen]);

  const handleGenerateCode = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const rawB = localStorage.getItem('bookmarks');
      const rawF = localStorage.getItem('folders_session');
      const rawH = localStorage.getItem('browsing_history');
      const rawP = await (window as any).electronAPI?.secureStoreGet?.('passwords');
      const rawW = localStorage.getItem('workspaces_session');
      const rawS = localStorage.getItem('user_settings');

      const safeJsonParse = <T,>(val: string | null | undefined, fallback: T): T => {
        if (!val) return fallback;
        try {
          return JSON.parse(val);
        } catch {
          return fallback;
        }
      };

      const code = await syncService.generateSyncChainCode({
        bookmarks: safeJsonParse(rawB, []),
        folders: safeJsonParse(rawF, []),
        history: safeJsonParse(rawH, []),
        passwords: safeJsonParse(rawP, []),
        settings: safeJsonParse(rawS, {} as any),
        workspaces: safeJsonParse(rawW, [])
      });

      setGeneratedCode(code);
      setSuccessMessage('Sync Code created! Enter this code on your other devices.');
      setSafeTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate sync code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinChain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSyncCode.trim()) return;
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await syncService.joinSyncChain(inputSyncCode);
      setSuccessMessage('Device paired! Syncing all bookmarks, passwords, and data...');
      if (onPerformSync) await onPerformSync();
      setSafeTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired sync code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    setErrorMessage(null);
    if (!code) {
      setErrorMessage('No sync code available to copy yet.');
      return;
    }
    // A sync code is a secret, so never report success on an unconfirmed write:
    // navigator.clipboard rejects outright in an insecure context (http/file) and
    // the old fire-and-forget call still flipped the button to "Copied".
    const copied = await copyTextToClipboard(code);
    if (copied) {
      setCopiedCode(true);
      setSafeTimeout(() => setCopiedCode(false), 2500);
    } else {
      setErrorMessage(`Copy failed. Copy this code manually: ${code}`);
    }
  };

  const handleSignOut = async () => {
    const confirmed = await showConfirm({
      title: 'Sign out of Nova Cloud Sync?',
      message: 'Local bookmarks, passwords, and settings will remain on this device, but cloud sync will pause until you sign in again.',
      confirmLabel: 'Sign Out',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    setGeneratedCode(null);
    setInputSyncCode('');
    setErrorMessage(null);
    await syncService.logout();
  };

  const handleTogglePreference = (key: keyof SyncPreferences) => {
    if (!syncStatus.user) return;
    const current = syncStatus.user.syncPreferences[key];
    syncService.updatePreferences({ [key]: !current });
  };

  const handleManualSync = async () => {
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    try {
      if (onPerformSync) await onPerformSync();
      setSuccessMessage('Sync completed successfully!');
      setSafeTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Sync failed');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Just now';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff} seconds ago`;
    const locale = getLocale();
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none"
          onClick={onClose}
        >
          <motion.div
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="w-full max-w-lg bg-white dark:bg-[#141518] rounded-xl shadow-2xl border border-neutral-200/90 dark:border-white/[0.1] overflow-hidden flex flex-col outline-none"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-neutral-200/80 dark:border-white/[0.08] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-200 flex items-center justify-center shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-950 dark:text-neutral-100 flex items-center gap-2">
                    Nova Sync
                    {syncStatus.isLoggedIn && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        Active
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {syncStatus.isLoggedIn ? 'Your browser data is securely synced across devices' : 'Sign in with your Nova Cloud account to sync your browser data'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-white/[0.07] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{successMessage}</span>
                </div>
              )}

              {syncStatus.isLoggedIn ? (
                <div className="space-y-4">
                  {NovaSyncService.PAIRING_AVAILABLE && (
                  <div className="p-4 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.08] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-neutral-500" />
                        Your Device Sync Code
                      </span>
                      <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/12 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                        Encrypted Sync
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Enter this code on your other laptop or computer to sync instantly:
                    </p>

                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="flex-1 bg-white dark:bg-white/[0.05] border border-neutral-200/80 dark:border-white/[0.09] rounded-lg px-3 py-2 text-xs font-mono text-neutral-900 dark:text-neutral-100 select-all truncate">
                        {syncStatus.syncCode || generatedCode || 'Generating...'}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(syncStatus.syncCode || generatedCode || '')}
                        className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                  )}

                  {/* Sync Controls */}
                  <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.08] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 block">
                        Sync Status
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Last sync: {formatLastSync(syncStatus.lastSyncedAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleManualSync}
                        disabled={isManualSyncing || syncStatus.isSyncing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing || syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isManualSyncing || syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Sign Out of Sync"
                        aria-label="Sign Out of Sync"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Synced Categories */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                      Synced Data
                    </span>

                    <div className="rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.08] divide-y divide-neutral-200/80 dark:divide-white/[0.07] overflow-hidden">
                      {[
                        { key: 'syncBookmarks', label: 'Bookmarks & Folders', icon: Bookmark },
                        { key: 'syncPasswords', label: 'Saved Passwords (Encrypted)', icon: Key },
                        { key: 'syncHistory', label: 'Browsing History', icon: Clock },
                        { key: 'syncSettings', label: 'Settings & Themes', icon: Settings },
                        { key: 'syncWorkspaces', label: 'Workspaces', icon: FolderTree },
                      ].map((item) => {
                        const isEnabled = syncStatus.user?.syncPreferences[item.key as keyof SyncPreferences] ?? true;
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.key}
                            type="button"
                            role="switch"
                            aria-checked={isEnabled}
                            aria-label={item.label}
                            onClick={() => handleTogglePreference(item.key as keyof SyncPreferences)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-neutral-100/70 dark:hover:bg-white/[0.03] transition-colors cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                              <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{item.label}</span>
                            </div>

                            <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${isEnabled ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-white/[0.14]'}`}>
                              <div className={`h-3.5 w-3.5 rounded-full shadow-xs transition-transform duration-150 ${isEnabled ? 'translate-x-[18px] bg-white dark:bg-neutral-950' : 'translate-x-[3px] bg-white dark:bg-neutral-200'}`} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : NovaSyncService.PAIRING_AVAILABLE ? (
                <div className="space-y-4">
                  <form onSubmit={handleJoinChain} className="p-4 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.08] space-y-3">
                    <div className="flex items-center gap-2.5">
                      <Laptop className="w-4 h-4 text-neutral-500" />
                      <div>
                        <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">I have a Sync Code</h3>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Enter the code from your other device to connect instantly:</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={inputSyncCode}
                        onChange={(e) => setInputSyncCode(e.target.value)}
                        placeholder="nova-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
                        className="flex-1 bg-white dark:bg-white/[0.06] border border-neutral-200/90 dark:border-white/[0.09] rounded-lg px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-400 dark:focus:border-white/30 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !inputSyncCode.trim()}
                        className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 rounded-lg text-xs font-medium transition-colors disabled:opacity-45 cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <span>Connect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>

                  <div className="p-4 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.08] space-y-3">
                    <div className="flex items-center gap-2.5">
                      <Key className="w-4 h-4 text-neutral-500" />
                      <div>
                        <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">This is my primary device</h3>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Generate a pairing code to link other laptops or desktops:</p>
                      </div>
                    </div>

                    {generatedCode ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white dark:bg-white/[0.05] border border-neutral-200/80 dark:border-white/[0.09] rounded-lg px-3 py-2 text-xs font-mono text-neutral-900 dark:text-neutral-100 select-all truncate">
                            {generatedCode}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(generatedCode)}
                            className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          >
                            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Ready! Enter this code on your other computer.
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateCode}
                        disabled={isLoading}
                        className="w-full py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Generate Sync Code</span>
                      </button>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.08] flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      <strong className="font-semibold text-neutral-900 dark:text-neutral-100">Encrypted sync:</strong> Cloud sign-in uses email and password. Sync data is encrypted before upload; the authentication provider remains part of the trust boundary.
                    </p>
                  </div>
                </div>
              ) : (
                /* Pairing is not built yet: say so instead of offering a code
                   that can never be redeemed. */
                <div className="p-6 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.08] space-y-2.5 text-center">
                  <div className="flex justify-center">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08] text-neutral-500 dark:text-neutral-400 flex items-center justify-center">
                      <Laptop className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">
                    Sign in to sync this browser
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-sm mx-auto">
                    Your bookmarks, history, tabs and workspaces sync through your Nova Cloud
                    account. Pairing a second device with a sync code is not available yet.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
