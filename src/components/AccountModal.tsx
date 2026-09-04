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
  Sparkles,
  Link2,
  Copy,
  Laptop,
  ArrowRight
} from 'lucide-react';
import { syncService, SyncStatus, SyncPreferences } from '../services/syncService';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { getLocale } from '../services/i18n';

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

      const code = await syncService.generateSyncChainCode({
        bookmarks: rawB ? JSON.parse(rawB) : [],
        folders: rawF ? JSON.parse(rawF) : [],
        history: rawH ? JSON.parse(rawH) : [],
        passwords: rawP ? JSON.parse(rawP) : [],
        settings: rawS ? JSON.parse(rawS) : ({} as any),
        workspaces: rawW ? JSON.parse(rawW) : []
      });

      setGeneratedCode(code);
      setSuccessMessage('Sync Code created! Enter this code on your other devices.');
      setTimeout(() => setSuccessMessage(null), 3000);
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
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired sync code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleLeaveChain = () => {
    syncService.logout();
    setGeneratedCode(null);
    setInputSyncCode('');
    setSuccessMessage('Left sync chain');
    setTimeout(() => setSuccessMessage(null), 2000);
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
      setTimeout(() => setSuccessMessage(null), 3000);
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md select-none"
          onClick={onClose}
        >
          <motion.div
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col outline-none"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/40 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/20">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    Nova Sync
                    {syncStatus.isLoggedIn && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        ● Active
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {syncStatus.isLoggedIn ? 'Your browser data is securely synced across devices' : 'Pair and sync your browser with a 1-click code'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Alert Messages */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2.5">
                  <Check className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{successMessage}</span>
                </div>
              )}

              {syncStatus.isLoggedIn ? (
                /* ACTIVE SYNC CHAIN VIEW */
                <div className="space-y-5">
                  {/* Sync Code Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Link2 className="w-4 h-4 text-cyan-500" />
                        Your Device Sync Code
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        E2EE Active
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Enter this code on your other laptop or computer to sync instantly:
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-600 dark:text-cyan-400 select-all font-semibold truncate">
                        {syncStatus.syncCode || generatedCode || 'Generating...'}
                      </div>
                      <button
                        onClick={() => handleCopyCode(syncStatus.syncCode || generatedCode || '')}
                        className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Sync Controls */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        Sync Status
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Last sync: {formatLastSync(syncStatus.lastSyncedAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleManualSync}
                        disabled={isManualSyncing || syncStatus.isSyncing}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-600 text-white transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing || syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isManualSyncing || syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                      </button>

                      <button
                        onClick={handleLeaveChain}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Leave Sync Chain"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Synced Categories Checklist */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                      Synced Data
                    </span>

                    <div className="space-y-1.5">
                      {[
                        { key: 'syncBookmarks', label: 'Bookmarks & Folders', icon: Bookmark },
                        { key: 'syncPasswords', label: 'Saved Passwords (E2EE)', icon: Key },
                        { key: 'syncHistory', label: 'Browsing History', icon: Clock },
                        { key: 'syncSettings', label: 'Settings & Themes', icon: Settings },
                        { key: 'syncWorkspaces', label: 'Workspaces', icon: FolderTree },
                      ].map(item => {
                        const isEnabled = syncStatus.user?.syncPreferences[item.key as keyof SyncPreferences] ?? true;
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.key}
                            onClick={() => handleTogglePreference(item.key as keyof SyncPreferences)}
                            className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 dark:bg-white/[0.02] hover:bg-slate-100/80 dark:hover:bg-white/[0.05] border border-slate-200/60 dark:border-white/5 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
                            </div>

                            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${isEnabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* PAIRING SETUP (NO EMAIL / NO PASSWORD NEEDED) */
                <div className="space-y-5">
                  {/* Option 1: Enter Code from another device */}
                  <form onSubmit={handleJoinChain} className="p-5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">I have a Sync Code</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Enter the code from your other device to connect instantly:</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        required
                        value={inputSyncCode}
                        onChange={(e) => setInputSyncCode(e.target.value)}
                        placeholder="nova-xxxx-xxxx-xxxx-xxxx"
                        className="flex-1 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-cyan-500 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !inputSyncCode.trim()}
                        className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <span>Connect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>

                  {/* Option 2: Generate Code on this device */}
                  <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">This is my primary device</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Generate a 1-click sync code to pair other laptops or desktops:</p>
                      </div>
                    </div>

                    {generatedCode ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-600 dark:text-cyan-400 select-all truncate font-semibold">
                            {generatedCode}
                          </div>
                          <button
                            onClick={() => handleCopyCode(generatedCode)}
                            className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
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
                        className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 dark:text-cyan-600" />
                        <span>Generate Sync Code</span>
                      </button>
                    )}
                  </div>

                  {/* Security Note */}
                  <div className="p-3.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/15 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      <strong className="font-semibold text-cyan-600 dark:text-cyan-400">Zero-Knowledge Security:</strong> No email or password needed. All passwords and bookmarks are encrypted client-side using 256-bit AES-GCM.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
