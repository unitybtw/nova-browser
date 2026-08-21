import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  User, 
  Mail, 
  Lock, 
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
  Eye,
  EyeOff,
  Sparkles,
  Zap
} from 'lucide-react';
import { syncService, NovaUser, SyncStatus, SyncPreferences } from '../services/syncService';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

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
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
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
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await syncService.login(email, password);
      setSuccessMessage('Logged in successfully!');
      if (onPerformSync) {
        await onPerformSync();
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await syncService.register(email, password, displayName);
      setSuccessMessage('Account created and cloud sync enabled!');
      if (onPerformSync) {
        await onPerformSync();
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    syncService.logout();
    setEmail('');
    setPassword('');
    setDisplayName('');
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
      if (onPerformSync) {
        await onPerformSync();
      }
      setSuccessMessage('Sync completed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Sync failed');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col outline-none"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/40 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/20">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    Nova Account & Sync
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {syncStatus.isLoggedIn ? 'Cloud synchronization active' : 'Sync your data across all devices'}
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
              {/* Alert Feedback Messages */}
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

              {syncStatus.isLoggedIn && syncStatus.user ? (
                /* LOGGED IN VIEW */
                <div className="space-y-6">
                  {/* User Profile Card */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold text-base flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0 uppercase">
                        {syncStatus.user.displayName ? syncStatus.user.displayName.charAt(0) : 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                            {syncStatus.user.displayName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> E2EE Active
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {syncStatus.user.email}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
                      title="Log Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sync Control & Status */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/15 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                          Cloud Sync Status
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {syncStatus.backend === 'supabase' ? '⚡ Supabase Realtime' : '📁 Local Vault'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Last sync: {formatLastSync(syncStatus.lastSyncedAt)}
                      </span>
                    </div>

                    <button
                      onClick={handleManualSync}
                      disabled={isManualSyncing || syncStatus.isSyncing}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-600 text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing || syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isManualSyncing || syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                  </div>

                  {/* Sync Items Checklist */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                      Synced Data Categories
                    </span>

                    <div className="space-y-1.5">
                      {[
                        { key: 'syncBookmarks', label: 'Bookmarks & Folders', icon: Bookmark, desc: 'Your saved bookmarks and toolbar folders' },
                        { key: 'syncPasswords', label: 'Saved Passwords (E2EE)', icon: Key, desc: 'Zero-knowledge AES-GCM encrypted' },
                        { key: 'syncHistory', label: 'Browsing History', icon: Clock, desc: 'Your visited page history across devices' },
                        { key: 'syncSettings', label: 'Settings & Appearance', icon: Settings, desc: 'Theme colors, search engine, shortcuts' },
                        { key: 'syncWorkspaces', label: 'Workspaces', icon: FolderTree, desc: 'Custom tab workspaces and icons' },
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
                              <div>
                                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.label}</h4>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">{item.desc}</p>
                              </div>
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
                /* AUTH MODE (SIGN IN / REGISTER) */
                <div className="space-y-5">
                  {/* Auth Switcher */}
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
                    <button
                      onClick={() => { setAuthTab('login'); setErrorMessage(null); }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                        authTab === 'login' 
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => { setAuthTab('register'); setErrorMessage(null); }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                        authTab === 'register' 
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={authTab === 'login' ? handleLogin : handleRegister} className="space-y-4">
                    {authTab === 'register' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Display Name
                        </label>
                        <div className="relative flex items-center">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="e.g. Alex"
                            className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-cyan-500 transition-colors"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Email Address
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-cyan-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Master Password
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-cyan-500 transition-colors font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Security Guarantee Notice */}
                    <div className="p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/15 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        <strong className="font-semibold text-cyan-600 dark:text-cyan-400">Zero-Knowledge E2EE:</strong> Your passwords and data are encrypted with your master password before leaving your device.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 rounded-2xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>{authTab === 'login' ? 'Sign In to Nova Sync' : 'Create Nova Account & Sync'}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
