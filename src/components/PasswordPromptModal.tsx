import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Check, X } from 'lucide-react';

interface PasswordPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  hostname: string;
  username: string;
}

export const PasswordPromptModal: React.FC<PasswordPromptModalProps> = ({ isOpen, onClose, onSave, hostname, username }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
          className="absolute top-16 right-4 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 z-[9999] overflow-hidden"
        >
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 flex items-center justify-center text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <KeyRound size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Save Password?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={hostname}>{hostname}</p>
              </div>
            </div>
            
            {username && (
              <div className="bg-slate-50/80 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Username / Email</p>
                <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold truncate mt-0.5">{username}</p>
              </div>
            )}
            
            <div className="flex gap-2 mt-1">
              <button
                onClick={onClose}
                className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 font-medium text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <X size={14} />
                <span>Not Now</span>
              </button>
              <button
                onClick={onSave}
                className="flex-1 py-1.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
