import React from 'react';
import { Check, RotateCcw, Undo2, X } from 'lucide-react';
import { useCustomize } from './CustomizeContext';

/**
 * Legacy standalone banner retained for backwards compatibility.
 * Primary customize controls now live in the docked DesignStudioDrawer footer.
 */
export const CustomizeTopBanner: React.FC = () => {
  const {
    isCustomizeMode,
    editingScope,
    canUndo,
    activeWorkspaceName,
    activeWorkspaceId,
    undo,
    resetToDefault,
    discard,
    commit,
    switchScope,
  } = useCustomize();

  if (!isCustomizeMode) {
    return null;
  }

  const scopeLabel =
    editingScope === 'workspace'
      ? `Workspace: ${activeWorkspaceName || activeWorkspaceId || 'Active'}`
      : 'Global Design';

  return (
    <div
      data-customize-banner="true"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[996] max-w-[calc(100vw-2rem)] select-none pointer-events-auto no-drag animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 dark:bg-[#141518]/96 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-white/[0.09] shadow-xl backdrop-blur-xl text-xs font-sans">
        <button
          type="button"
          data-scope-pill="true"
          onClick={() => switchScope(editingScope === 'global' ? 'workspace' : 'global')}
          className="px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.07] dark:hover:bg-white/[0.12] text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer"
          title="Toggle between Global Design and Workspace Override"
        >
          {scopeLabel}
        </button>

        <div className="w-[1px] h-4 bg-neutral-200 dark:bg-white/[0.08]" />

        <button
          type="button"
          data-action="undo"
          onClick={undo}
          disabled={!canUndo}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors ${
            canUndo
              ? 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.08] cursor-pointer'
              : 'text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
          }`}
          title="Undo last change"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          type="button"
          data-action="reset"
          onClick={resetToDefault}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.08] font-medium transition-colors cursor-pointer"
          title="Reset to default design"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        <button
          type="button"
          data-action="cancel"
          onClick={discard}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.08] font-medium transition-colors cursor-pointer"
          title="Discard unsaved changes and exit"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>

        <button
          type="button"
          data-action="save"
          onClick={commit}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 font-semibold transition-colors cursor-pointer"
          title="Save customizations and apply"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
};
