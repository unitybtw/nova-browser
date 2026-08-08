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
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="absolute top-16 right-4 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[9999] overflow-hidden"
        >
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Save Password?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-48">{hostname}</p>
              </div>
            </div>
            
            {username && (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md border border-slate-100 dark:border-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Username</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate">{username}</p>
              </div>
            )}
            
            <div className="flex gap-2 mt-2">
              <button
                onClick={onClose}
                className="flex-1 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-center gap-1.5"
              >
                <X size={16} />
                <span>Not Now</span>
              </button>
              <button
                onClick={onSave}
                className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Check size={16} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
