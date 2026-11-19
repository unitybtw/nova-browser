import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Check, X, Eye, EyeOff, User, Lock, Globe } from 'lucide-react';

interface PasswordPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (username?: string, password?: string) => void;
  hostname: string;
  username: string;
  password?: string;
  isUpdate?: boolean;
}

export const PasswordPromptModal: React.FC<PasswordPromptModalProps> = React.memo(({
  isOpen,
  onClose,
  onSave,
  hostname,
  username: initialUsername,
  password: initialPassword,
  isUpdate = false
}) => {
  const [editedUsername, setEditedUsername] = useState(initialUsername || '');
  const [editedPassword, setEditedPassword] = useState(initialPassword || '');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setEditedUsername(initialUsername || '');
  }, [initialUsername]);

  useEffect(() => {
    setEditedPassword(initialPassword || '');
  }, [initialPassword]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
        onSave(editedUsername.trim() || initialUsername, editedPassword || initialPassword);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editedUsername, editedPassword, initialUsername, initialPassword, onClose, onSave]);

  const handleSave = () => {
    onSave(editedUsername.trim() || initialUsername, editedPassword || initialPassword);
  };

  return (
    <AnimatePresence>
      {isOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-prompt-title"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute top-14 right-4 w-88 bg-white/95 dark:bg-[#141518]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-neutral-200/90 dark:border-white/[0.1] z-[9999] overflow-hidden select-none"
          >
            <div className="p-4 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-white/[0.06] flex items-center justify-center text-neutral-700 dark:text-neutral-200 border border-neutral-200/80 dark:border-white/[0.08] shrink-0">
                  <KeyRound size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="password-prompt-title" className="font-semibold text-xs text-neutral-950 dark:text-neutral-100">
                    {isUpdate ? 'Update Password?' : 'Save Password?'}
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1 mt-0.5" title={hostname}>
                    <Globe size={11} className="opacity-70 shrink-0" />
                    <span className="truncate">{hostname}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
                  title="Close"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Credential Fields */}
              <div className="space-y-2">
                <div className="bg-neutral-100/80 dark:bg-white/[0.04] p-2 rounded-lg border border-neutral-200/80 dark:border-white/[0.08] flex items-center gap-2">
                  <User size={13} className="text-neutral-400 shrink-0 ml-1" />
                  <div className="flex-1 min-w-0">
                    <label htmlFor="password-prompt-username" className="block text-[9px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                      Username / Email
                    </label>
                    <input
                      id="password-prompt-username"
                      type="text"
                      value={editedUsername}
                      onChange={(e) => setEditedUsername(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full bg-transparent text-xs font-medium text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                {initialPassword && (
                  <div className="bg-neutral-100/80 dark:bg-white/[0.04] p-2 rounded-lg border border-neutral-200/80 dark:border-white/[0.08] flex items-center gap-2">
                    <Lock size={13} className="text-neutral-400 shrink-0 ml-1" />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="password-prompt-password" className="block text-[9px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        Password
                      </label>
                      <input
                        id="password-prompt-password"
                        type={showPassword ? 'text' : 'password'}
                        value={editedPassword}
                        onChange={(e) => setEditedPassword(e.target.value)}
                        className="w-full bg-transparent text-xs font-mono font-medium text-neutral-900 dark:text-neutral-100 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide Password' : 'Show Password'}
                      aria-label={showPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-0.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-3 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-neutral-200/80 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Not Now</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                >
                  <Check size={14} />
                  <span>{isUpdate ? 'Update' : 'Save'}</span>
                </button>
              </div>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
