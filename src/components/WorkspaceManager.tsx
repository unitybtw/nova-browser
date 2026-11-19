import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Check, LayoutGrid, Briefcase, User, Code, Star, Gamepad2, Folder, GraduationCap, DollarSign, ShoppingCart } from 'lucide-react';
import { Workspace } from '../types/browser';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { generateId } from '../utils/idGenerator';
import { useDialogA11y } from '../hooks/useDialogA11y';

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
  { id: 'Sparkles', component: Star },
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
  const [draftWorkspace, setDraftWorkspace] = useState<Workspace | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('slate');
  const [editIcon, setEditIcon] = useState('LayoutGrid');
  const containerRef = useRef<HTMLDivElement>(null);

  useDialogA11y({ isOpen, onClose, containerRef });
  useModalFocusTrap(isOpen, onClose, containerRef);

  // A closed manager must not release a scroll lock owned by another dialog.
  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setDraftWorkspace(null);
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  useEffect(() => {
    const handleOpenWithDetail = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: string }>;
      if (customEvent.detail?.mode === 'create') {
        handleAddWorkspace();
      }
    };
    window.addEventListener('open-workspace-manager', handleOpenWithDetail);
    return () => {
      window.removeEventListener('open-workspace-manager', handleOpenWithDetail);
    };
  }, []);

  const cancelEdit = () => {
    setEditingId(null);
    setDraftWorkspace(null);
  };

  const handleAddWorkspace = () => {
    const newWorkspace: Workspace = {
      id: generateId('ws'),
      name: 'New Workspace',
      color: 'blue',
      icon: 'Folder'
    };
    setDraftWorkspace(newWorkspace);
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
    const name = editName.trim().slice(0, 100);
    if (draftWorkspace?.id === id) {
      onUpdateWorkspaces([...workspaces, { ...draftWorkspace, name, color: editColor, icon: editIcon }]);
    } else {
      onUpdateWorkspaces(workspaces.map(w =>
        w.id === id ? { ...w, name, color: editColor, icon: editIcon } : w
      ));
    }
    cancelEdit();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" onClick={onClose}>
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Workspaces"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={`relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] outline-none ${
              isIncognito
                ? 'bg-[#141518] border border-white/[0.1] text-neutral-100'
                : 'bg-white dark:bg-[#141518] border border-neutral-200/90 dark:border-white/[0.1] text-neutral-900 dark:text-neutral-100'
            }`}
          >
            <div className={`flex items-center justify-between px-4 py-3.5 border-b ${isIncognito ? 'border-white/[0.08]' : 'border-neutral-200/80 dark:border-white/[0.08]'}`}>
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <h2 className="text-sm font-semibold tracking-[-0.01em]">Manage Workspaces</h2>
              </div>
              <button
                type="button"
                aria-label="Close workspaces"
                onClick={onClose}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
              {(draftWorkspace ? [...workspaces, draftWorkspace] : workspaces).map((workspace) => {
                const isEditing = editingId === workspace.id;

                if (isEditing) {
                  return (
                    <div
                      key={workspace.id}
                      className={`p-3.5 rounded-xl border ${
                        isIncognito
                          ? 'bg-white/[0.03] border-white/[0.08]'
                          : 'bg-neutral-50/80 border-neutral-200/80 dark:bg-white/[0.03] dark:border-white/[0.08]'
                      }`}
                    >
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium mb-3 outline-none transition-colors border ${
                          isIncognito
                            ? 'bg-white/[0.06] border-white/[0.1] text-white focus:border-white/30'
                            : 'bg-white border-neutral-200/90 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white focus:border-neutral-400 dark:focus:border-white/30'
                        }`}
                        placeholder="Workspace Name"
                        aria-label="Workspace name"
                        maxLength={100}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(workspace.id)}
                      />
                      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                        {COLORS.map((c) => (
                          <button
                            key={c.id}
                            aria-label={`${c.id} workspace color`}
                            aria-pressed={editColor === c.id}
                            type="button"
                            onClick={() => setEditColor(c.id)}
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-110 shrink-0 cursor-pointer ${
                              editColor === c.id ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#141518] ring-neutral-900 dark:ring-white' : ''
                            }`}
                            style={{ backgroundColor: c.hex }}
                          >
                            {editColor === c.id && <Check className="w-3 h-3 text-white" />}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 mb-3.5 overflow-x-auto pb-1 no-scrollbar">
                        {ICONS.map((iconObj) => {
                          const IconComp = iconObj.component;
                          const isSelected = editIcon === iconObj.id;
                          return (
                            <button
                              key={iconObj.id}
                              aria-label={`${iconObj.id} workspace icon`}
                              aria-pressed={isSelected}
                              type="button"
                              onClick={() => setEditIcon(iconObj.id)}
                              className={`p-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                                isSelected
                                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-transparent'
                                  : isIncognito
                                    ? 'bg-white/[0.04] border-white/[0.08] text-neutral-400 hover:text-white'
                                    : 'bg-white border-neutral-200/80 text-neutral-500 hover:text-neutral-900 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-neutral-400 dark:hover:text-white'
                              }`}
                            >
                              <IconComp className="w-3.5 h-3.5" />
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(workspace.id)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 transition-colors cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                }

                const IconComp = ICONS.find((i) => i.id === workspace.icon)?.component || LayoutGrid;
                const isActive = activeWorkspaceId === workspace.id;

                return (
                  <div
                    key={workspace.id}
                    className={`group flex items-center justify-between p-2.5 px-3 rounded-xl border transition-colors ${
                      isActive
                        ? 'border-neutral-900 dark:border-white bg-neutral-100/70 dark:bg-white/[0.06]'
                        : isIncognito
                          ? 'border-white/[0.08] hover:bg-white/[0.04]'
                          : 'border-neutral-200/80 hover:bg-neutral-50 dark:border-white/[0.08] dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: COLORS.find((c) => c.id === workspace.color)?.hex || '#64748b' }}
                      >
                        <IconComp className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-xs text-neutral-900 dark:text-neutral-100 truncate">
                          {workspace.name}
                        </div>
                        {isActive && (
                          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                            Active
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        aria-label={`Edit ${workspace.name} workspace`}
                        onClick={() => {
                          setDraftWorkspace(null);
                          setEditingId(workspace.id);
                          setEditName(workspace.name);
                          setEditColor(workspace.color);
                          setEditIcon(workspace.icon || 'LayoutGrid');
                        }}
                        className="p-1.5 rounded-md hover:bg-neutral-200/80 dark:hover:bg-white/[0.08] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {workspaces.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Delete ${workspace.name} workspace`}
                          onClick={() => handleDelete(workspace.id)}
                          className="p-1.5 rounded-md text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`p-3.5 border-t ${isIncognito ? 'border-white/[0.08]' : 'border-neutral-200/80 dark:border-white/[0.08]'}`}>
              <button
                type="button"
                onClick={handleAddWorkspace}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-neutral-200/80 dark:border-white/[0.08] transition-colors font-medium text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Workspace
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
