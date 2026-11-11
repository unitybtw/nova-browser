import React from 'react';
import { Check, RotateCcw, RotateCw, X, Layers } from 'lucide-react';
import { useCustomize } from './CustomizeContext';

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
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[996] select-none pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/95 text-slate-100 border border-slate-700/80 shadow-2xl backdrop-blur-xl text-xs font-sans">
        {/* Scope Pill */}
        <button
          type="button"
          data-scope-pill="true"
          onClick={() => switchScope(editingScope === 'global' ? 'workspace' : 'global')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors border border-slate-700/60"
          title="Click to toggle between Global Design and Workspace Override"
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>{scopeLabel}</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-700/70" />

        {/* Undo Button */}
        <button
          type="button"
          data-action="undo"
          onClick={undo}
          disabled={!canUndo}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
            canUndo
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer border border-slate-700/60'
              : 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-transparent'
          }`}
          title="Undo last change"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        {/* Reset to Default */}
        <button
          type="button"
          data-action="reset"
          onClick={resetToDefault}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors border border-slate-700/60 cursor-pointer"
          title="Reset to default design"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        {/* Cancel / Discard */}
        <button
          type="button"
          data-action="cancel"
          onClick={discard}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-red-900/40 text-slate-300 hover:text-red-200 font-medium transition-colors border border-slate-700/60 cursor-pointer"
          title="Discard unsaved changes and exit"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>

        {/* Save & Exit CTA */}
        <button
          type="button"
          data-action="save"
          onClick={commit}
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-md shadow-blue-900/30 cursor-pointer active:scale-95"
          title="Save customizations and apply"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Save &amp; Exit</span>
        </button>
      </div>
    </div>
  );
};
