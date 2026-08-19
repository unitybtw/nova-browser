import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Check, LayoutGrid, Briefcase, User, Code, Sparkles, Gamepad2, Folder, GraduationCap, DollarSign, ShoppingCart } from 'lucide-react';
import { Workspace } from '../types/browser';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

interface WorkspaceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  onUpdateWorkspaces: (workspaces: Workspace[]) => void;
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  isIncognito?: boolean;
}

const COLORS = [
  { id: 'slate', hex: '#64748b' },
  { id: 'blue', hex: '#3b82f6' },
  { id: 'emerald', hex: '#10b981' },
  { id: 'purple', hex: '#a855f7' },
  { id: 'rose', hex: '#f43f5e' },
  { id: 'amber', hex: '#f59e0b' }
];

const ICONS = [
  { id: 'LayoutGrid', component: LayoutGrid },
  { id: 'Briefcase', component: Briefcase },
  { id: 'User', component: User },
  { id: 'Code', component: Code },
  { id: 'Sparkles', component: Sparkles },
  { id: 'Gamepad2', component: Gamepad2 },
  { id: 'GraduationCap', component: GraduationCap },
  { id: 'DollarSign', component: DollarSign },
  { id: 'ShoppingCart', component: ShoppingCart },
  { id: 'Folder', component: Folder },
];

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
  isOpen,
  onClose,
  workspaces,
  onUpdateWorkspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  isIncognito
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('slate');
  const [editIcon, setEditIcon] = useState('LayoutGrid');
  const containerRef = useRef<HTMLDivElement>(null);

  useModalFocusTrap(isOpen, onClose, containerRef);

  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleAddWorkspace = () => {
    const newWorkspace: Workspace = {
      id: 'ws_' + Date.now().toString(36),
      name: 'New Workspace',
      color: 'blue',
      icon: 'Folder'
    };
    onUpdateWorkspaces([...workspaces, newWorkspace]);
    setEditingId(newWorkspace.id);
    setEditName(newWorkspace.name);
    setEditColor(newWorkspace.color);
    setEditIcon(newWorkspace.icon || 'Folder');
  };

  const handleDelete = (id: string) => {
    if (workspaces.length <= 1) return; // Cannot delete last workspace
    const newWorkspaces = workspaces.filter(w => w.id !== id);
    onUpdateWorkspaces(newWorkspaces);
    if (activeWorkspaceId === id) {
      onSelectWorkspace(newWorkspaces[0].id);
    }
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    const newWorkspaces = workspaces.map(w => 
      w.id === id ? { ...w, name: editName.trim(), color: editColor, icon: editIcon } : w
    );
    onUpdateWorkspaces(newWorkspaces);
    setEditingId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md" onClick={onClose}>
          <motion.div 
            ref={containerRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] outline-none backdrop-blur-2xl ${
              isIncognito 
                ? 'bg-slate-900/95 border border-slate-700 text-slate-100' 
                : 'bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-slate-100'
            }`}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isIncognito ? 'border-slate-800' : 'border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <h2 className="text-base font-semibold">Manage Workspaces</h2>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {workspaces.map(workspace => {
                const isEditing = editingId === workspace.id;
                
                if (isEditing) {
                  return (
                    <div key={workspace.id} className={`p-4 rounded-xl border ${isIncognito ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/80 border-slate-200 dark:bg-slate-800/50 dark:border-white/10'}`}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-semibold mb-3 outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                          isIncognito ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-white'
                        } border`}
                        placeholder="Workspace Name"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(workspace.id)}
                      />
                      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                        {COLORS.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setEditColor(c.id)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 shrink-0 ${editColor === c.id ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-current' : ''}`}
                            style={{ backgroundColor: c.hex, color: c.hex }}
                          >
                            {editColor === c.id && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
                        {ICONS.map(iconObj => {
                          const IconComp = iconObj.component;
                          const isSelected = editIcon === iconObj.id;
                          return (
                            <button
                              key={iconObj.id}
                              type="button"
                              onClick={() => setEditIcon(iconObj.id)}
                              className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                                isSelected
                                  ? 'bg-cyan-500 text-white border-cyan-500 shadow-xs'
                                  : isIncognito
                                    ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
                              }`}
                            >
                              <IconComp className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingId(null)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isIncognito ? 'hover:bg-slate-700' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'}`}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleSaveEdit(workspace.id)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-white hover:bg-cyan-600 shadow-xs transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                }

                const IconComp = ICONS.find(i => i.id === workspace.icon)?.component || LayoutGrid;

                return (
                  <div key={workspace.id} className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${activeWorkspaceId === workspace.id ? 'border-cyan-500/80 bg-cyan-500/10 dark:bg-cyan-500/15' : isIncognito ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.03]'}`}>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                        style={{ backgroundColor: COLORS.find(c => c.id === workspace.color)?.hex || '#64748b' }}
                      >
                        <IconComp className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-xs text-slate-800 dark:text-slate-200">{workspace.name}</div>
                        {activeWorkspaceId === workspace.id && <div className="text-[9px] text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">Active</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingId(workspace.id);
                          setEditName(workspace.name);
                          setEditColor(workspace.color);
                          setEditIcon(workspace.icon || 'LayoutGrid');
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {workspaces.length > 1 && (
                        <button 
                          onClick={() => handleDelete(workspace.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className={`p-4 border-t ${isIncognito ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/30'}`}>
              <button 
                onClick={handleAddWorkspace}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 hover:text-cyan-500 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10 transition-all font-medium text-xs text-slate-500 dark:text-slate-400"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Workspace
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
