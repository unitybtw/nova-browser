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

export const PasswordPromptModal: React.FC<PasswordPromptModalProps> = ({
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
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 26, stiffness: 420 }}
          className="absolute top-14 right-4 w-88 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 z-[9999] overflow-hidden select-none"
        >
          <div className="p-4 flex flex-col gap-3.5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-500 dark:text-cyan-400 border border-cyan-500/25 shrink-0 shadow-xs">
                <KeyRound size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  {isUpdate ? 'Şifre Güncellensin mi?' : 'Şifre Kaydedilsin mi?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5" title={hostname}>
                  <Globe size={11} className="opacity-70 shrink-0" />
                  <span className="truncate">{hostname}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Kapat"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Credential Fields */}
            <div className="space-y-2">
              {/* Username Input */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200/70 dark:border-white/5 flex items-center gap-2">
                <User size={14} className="text-slate-400 dark:text-slate-500 shrink-0 ml-1" />
                <div className="flex-1 min-w-0">
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Kullanıcı Adı / E-Posta
                  </label>
                  <input
                    type="text"
                    value={editedUsername}
                    onChange={(e) => setEditedUsername(e.target.value)}
                    placeholder="kullanici@ornek.com"
                    className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password Input */}
              {initialPassword && (
                <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200/70 dark:border-white/5 flex items-center gap-2">
                  <Lock size={14} className="text-slate-400 dark:text-slate-500 shrink-0 ml-1" />
                  <div className="flex-1 min-w-0">
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Şifre
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={editedPassword}
                      onChange={(e) => setEditedPassword(e.target.value)}
                      className="w-full bg-transparent text-xs font-mono font-medium text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? "Şifreyi Gizle" : "Şifreyi Göster"}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 mt-0.5">
              <button
                onClick={onClose}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-medium text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Şimdi Değil</span>
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check size={14} />
                <span>{isUpdate ? 'Güncelle' : 'Kaydet'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
