import React, { useCallback, useId, useRef, useState } from 'react';
import {
  Paintbrush,
  X,
  MoveHorizontal,
  Layout,
  Palette,
  Type,
  Sparkles,
  Download,
  Upload,
  Plus,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  ChromeMode,
  NewTabLayoutConfig,
  SurfaceZoneId,
  SurfaceZoneStyle,
  ToolbarItemKind,
  UiDensity,
  UiFontFamily,
  WindowMaterial,
} from '../../types/browser';
import { SURFACE_ZONE_IDS } from '../../utils/designDefaults';
import { STARTER_DESIGN_TEMPLATES } from '../../utils/designTemplates';
import {
  getPaletteToolbarItems,
  insertToolbarItem,
  moveToolbarItemToIndex,
  removeToolbarItem,
  toggleToolbarItemVisibility,
} from '../../utils/toolbarSlots';
import { getToolbarItemMeta } from './toolbarRegistry';
import { isSafeSurfaceColor, sanitizeCustomCss } from '../../utils/designSecurity';
import { useCustomize } from './CustomizeContext';

type StudioTabId = 'templates' | 'layout' | 'zones' | 'typography' | 'newtab-css';

const SURFACE_ZONE_LABELS: Record<SurfaceZoneId, string> = {
  frame: 'Window Frame',
  tabBar: 'Tab Bar',
  activeTab: 'Active Tab',
  inactiveTab: 'Inactive Tab',
  toolbar: 'Toolbar',
  omnibox: 'Address Bar',
  sidebar: 'Sidebar',
  aiPanel: 'AI Assistant',
  popovers: 'Menus & Popovers',
};

export interface SafeColorTextInputProps {
  value?: string;
  placeholder?: string;
  onChange: (val?: string) => void;
  className?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

export const SafeColorTextInput: React.FC<SafeColorTextInputProps> = ({
  value,
  placeholder,
  onChange,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': testId,
}) => {
  const [text, setText] = useState<string>(value || '');
  const [isInvalid, setIsInvalid] = useState<boolean>(false);

  React.useEffect(() => {
    setText(value || '');
    setIsInvalid(false);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setIsInvalid(false);
      onChange(undefined);
    } else if (isSafeSurfaceColor(trimmed)) {
      setIsInvalid(false);
      onChange(trimmed);
    } else {
      setIsInvalid(true);
    }
  };

  const handleBlur = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setText('');
      setIsInvalid(false);
      onChange(undefined);
    } else if (isSafeSurfaceColor(trimmed)) {
      setText(trimmed);
      setIsInvalid(false);
      onChange(trimmed);
    } else {
      setText(value || '');
      setIsInvalid(false);
    }
  };

  return (
    <input
      type="text"
      value={text}
      placeholder={placeholder}
      onChange={handleChange}
      onBlur={handleBlur}
      aria-label={ariaLabel}
      aria-invalid={isInvalid ? 'true' : 'false'}
      data-testid={testId}
      className={`${className} ${
        isInvalid ? 'border-amber-500/80 focus:border-amber-500' : 'border-slate-700'
      }`}
    />
  );
};

export const DesignStudioDrawer: React.FC = () => {
  const {
    isCustomizeMode,
    editingScope,
    draftProfile,
    draftTabStyle,
    draftTabAnimation,
    activeWorkspaceId,
    activeWorkspaceName,
    hasActiveWorkspaceOverride,
    discard,
    switchScope,
    applyStarterTemplate,
    clearWorkspaceOverride,
    importPack,
    exportPack,
    updateDraft,
    updateDraftTabStyle,
    updateDraftTabAnimation,
  } = useCustomize();

  const [dockSide, setDockSide] = useState<'left' | 'right'>('right');
  const [activeTab, setActiveTab] = useState<StudioTabId>('templates');
  const [selectedZone, setSelectedZone] = useState<SurfaceZoneId>('frame');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputId = useId();

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const content = String(reader.result || '');
          const res = importPack(content);
          if (res.success) {
            setImportStatus({
              type: 'success',
              message: `Successfully imported theme "${res.themeName || 'Theme Pack'}"`,
            });
          } else {
            setImportStatus({
              type: 'error',
              message: res.error || 'Failed to import theme pack',
            });
          }
        } catch (err: any) {
          setImportStatus({
            type: 'error',
            message: err?.message || 'Invalid theme pack JSON',
          });
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [importPack]
  );

  if (!isCustomizeMode) {
    return null;
  }

  const paletteItems = getPaletteToolbarItems(draftProfile.layout.toolbarItems);
  const currentZoneStyle: SurfaceZoneStyle = draftProfile.surfaces[selectedZone] || {};
  const cssAnalysis = sanitizeCustomCss(draftProfile.customCss.css);

  const updateSelectedZone = (
    patch: Partial<SurfaceZoneStyle>,
    options?: { coalesceKey?: string }
  ) => {
    updateDraft(
      (prev) => ({
        ...prev,
        surfaces: {
          ...prev.surfaces,
          [selectedZone]: {
            ...prev.surfaces[selectedZone],
            ...patch,
          },
        },
      }),
      options
    );
  };

  const handleAddPaletteItem = (kind: ToolbarItemKind) => {
    updateDraft((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        toolbarItems: insertToolbarItem(prev.layout.toolbarItems, kind, prev.layout.toolbarItems.length),
      },
    }));
  };

  const handleDragStartPalette = (e: React.DragEvent, kind: ToolbarItemKind) => {
    e.dataTransfer.setData('application/x-nova-toolbar-kind', kind);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const isVerticalMode =
    draftProfile.layout.chromeMode === 'vertical-left' ||
    draftProfile.layout.chromeMode === 'vertical-right';
  const drawerTopClass =
    draftProfile.layout.chromeMode === 'classic-top' ? 'top-[94px]' : 'top-14';

  return (
    <div
      data-design-studio-drawer="true"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      className={`fixed ${drawerTopClass} bottom-[72px] ${
        dockSide === 'right'
          ? 'right-4 slide-in-from-right-4'
          : 'left-4 slide-in-from-left-4'
      } w-[380px] max-w-[calc(100vw-2rem)] z-[995] select-none pointer-events-auto no-drag flex flex-col rounded-2xl bg-slate-900/95 text-slate-100 border border-slate-700/80 shadow-2xl backdrop-blur-xl overflow-hidden font-sans text-xs animate-in fade-in duration-200`}
    >
      {/* Studio Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Paintbrush className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-100">Live Design Studio</h2>
            <p className="text-[10px] text-slate-400">
              {editingScope === 'workspace' ? `Workspace Override` : `Global Design`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDockSide((prev) => (prev === 'right' ? 'left' : 'right'))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title={`Dock to ${dockSide === 'right' ? 'Left' : 'Right'}`}
          >
            <MoveHorizontal className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={discard}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-slate-800 transition-colors"
            title="Close Design Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5 Tab Navigation Bar */}
      <div className="flex items-center border-b border-slate-800 bg-slate-950/60 p-1 gap-1 shrink-0">
        {[
          { id: 'templates', label: 'Templates', icon: Palette },
          { id: 'layout', label: 'Layout', icon: Layout },
          { id: 'zones', label: 'Surfaces', icon: Paintbrush },
          { id: 'typography', label: 'Typography', icon: Type },
          { id: 'newtab-css', label: 'New Tab', icon: Sparkles },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              data-studio-tab={t.id}
              onClick={() => setActiveTab(t.id as StudioTabId)}
              className={`flex-1 py-1.5 px-1 rounded-lg font-medium flex flex-col items-center gap-1 transition-all text-[11px] ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-300">
        {/* ================================================================= */}
        {/* TAB 1: Templates & Packs */}
        {/* ================================================================= */}
        {activeTab === 'templates' && (
          <div className="space-y-5">
            {/* Scope Selector */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <span className="text-[11px] font-semibold text-slate-300 block">Customization Scope</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => switchScope('global')}
                  className={`py-1.5 px-2.5 rounded-lg font-medium text-xs transition-all ${
                    editingScope === 'global'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Global Design
                </button>
                <button
                  type="button"
                  onClick={() => switchScope('workspace')}
                  className={`py-1.5 px-2.5 rounded-lg font-medium text-xs transition-all truncate ${
                    editingScope === 'workspace'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={activeWorkspaceName || 'This Workspace'}
                >
                  {activeWorkspaceName ? `Workspace: ${activeWorkspaceName}` : 'This Workspace'}
                </button>
              </div>

              {editingScope === 'workspace' && activeWorkspaceId && hasActiveWorkspaceOverride && (
                <button
                  type="button"
                  data-action="clear-workspace-override"
                  onClick={clearWorkspaceOverride}
                  className="w-full mt-2 py-1 px-2 rounded-lg bg-red-950/40 text-red-300 hover:bg-red-900/60 border border-red-800/50 text-[11px] font-medium transition-colors"
                >
                  Clear Workspace Override
                </button>
              )}
            </div>

            {/* Starter Templates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-300">Starter Templates</span>
                <span className="text-[10px] text-slate-400">6 Curated Themes</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {STARTER_DESIGN_TEMPLATES.map((tmpl) => {
                  const isSelected = draftProfile.meta.baseTemplateId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      data-template-card={tmpl.id}
                      onClick={() => applyStarterTemplate(tmpl.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                          : 'border-slate-700/60 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-slate-200">{tmpl.name}</div>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{tmpl.description}</p>
                      </div>

                      <div className="flex items-center gap-1 mt-1">
                        <div
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: tmpl.previewBg }}
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: tmpl.previewAccent }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme Pack Import / Export */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <span className="text-[11px] font-semibold text-slate-300 block">Theme Pack (.novatheme.json)</span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-action="export-theme-pack"
                  onClick={exportPack}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-medium text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  data-action="import-theme-pack"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-medium text-xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Import</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                data-control="import-theme-file"
                accept=".json,.novatheme.json"
                onChange={handleImportFile}
                className="hidden"
              />

              {importStatus && (
                <div
                  className={`p-2 rounded-lg text-[11px] flex items-start gap-1.5 border ${
                    importStatus.type === 'success'
                      ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800/60'
                      : 'bg-red-950/40 text-red-200 border-red-800/60'
                  }`}
                >
                  {importStatus.type === 'success' ? (
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                  )}
                  <span>{importStatus.message}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: Layout & Toolbar */}
        {/* ================================================================= */}
        {activeTab === 'layout' && (
          <div className="space-y-5">
            {/* Chrome Mode */}
            <div>
              <span className="text-[11px] font-semibold text-slate-300 block mb-2">Chrome Mode</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'classic-top', label: 'Classic Top', desc: 'Tabs above/below toolbar' },
                  { id: 'compact-single-row', label: 'Compact Single-Row', desc: 'Unified address & tabs' },
                  { id: 'vertical-left', label: 'Vertical Left', desc: 'Sidebar tabs on left' },
                  { id: 'vertical-right', label: 'Vertical Right', desc: 'Sidebar tabs on right' },
                ].map((mode) => {
                  const isSelected = draftProfile.layout.chromeMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      data-chrome-mode={mode.id}
                      onClick={() =>
                        updateDraft((prev) => ({
                          ...prev,
                          layout: { ...prev.layout, chromeMode: mode.id as ChromeMode },
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-slate-700/60 bg-slate-800/50 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <div className="font-semibold text-xs">{mode.label}</div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{mode.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Bar Position (only classic-top) */}
            {draftProfile.layout.chromeMode === 'classic-top' && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div>
                  <span className="text-xs font-medium text-slate-200">Tab Bar Position</span>
                  <p className="text-[10px] text-slate-400">Position tabs relative to address bar</p>
                </div>
                <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        layout: { ...prev.layout, tabBarPosition: 'above-toolbar' },
                      }))
                    }
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                      draftProfile.layout.tabBarPosition === 'above-toolbar'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Above
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        layout: { ...prev.layout, tabBarPosition: 'below-toolbar' },
                      }))
                    }
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                      draftProfile.layout.tabBarPosition === 'below-toolbar'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Below
                  </button>
                </div>
              </div>
            )}

            {/* Omnibox Max Width */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div>
                <span className="text-xs font-medium text-slate-200">Omnibox Max Width</span>
                <p className="text-[10px] text-slate-400">Constrain URL bar horizontal span</p>
              </div>
              <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
                {(['compact', 'balanced', 'full'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        layout: { ...prev.layout, omniboxMaxWidth: w },
                      }))
                    }
                    className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize ${
                      draftProfile.layout.omniboxMaxWidth === w
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Contextual notice when not in vertical sidebar mode */}
            {!isVerticalMode && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700/50 text-[11px] text-slate-400">
                <span>Sidebar options apply in Vertical Left / Right mode.</span>
                <button
                  type="button"
                  onClick={() =>
                    updateDraft((prev) => ({
                      ...prev,
                      layout: { ...prev.layout, chromeMode: 'vertical-left' },
                    }))
                  }
                  className="shrink-0 px-2 py-0.5 rounded-md bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 font-medium transition-colors cursor-pointer"
                >
                  Enable Vertical
                </button>
              </div>
            )}

            {/* Sidebar Width Slider */}
            <div className={`p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 transition-opacity ${!isVerticalMode ? 'opacity-65' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">Sidebar Width</span>
                <span className="text-xs font-mono text-blue-400">{draftProfile.layout.sidebarWidth}px</span>
              </div>
              <input
                type="range"
                data-control="sidebarWidth"
                min={200}
                max={360}
                step={2}
                value={draftProfile.layout.sidebarWidth}
                onChange={(e) =>
                  updateDraft(
                    (prev) => ({
                      ...prev,
                      layout: { ...prev.layout, sidebarWidth: Number(e.target.value) },
                    }),
                    { coalesceKey: 'sidebar-width' }
                  )
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Sidebar Sections */}
            <div className={`p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2.5 transition-opacity ${!isVerticalMode ? 'opacity-65' : ''}`}>
              <span className="text-xs font-medium text-slate-200 block">Sidebar Sections</span>
              {(
                [
                  { id: 'favorites', label: 'Favorites' },
                  { id: 'pinned', label: 'Pinned Tabs' },
                  { id: 'folders', label: 'Folders' },
                  { id: 'workspaces', label: 'Workspaces' },
                  { id: 'dockFooter', label: 'Footer Controls' },
                ] as const
              ).map((sec) => {
                const checked = draftProfile.layout.sidebarSections[sec.id];
                return (
                  <label
                    key={sec.id}
                    className="flex items-center justify-between text-xs text-slate-300 cursor-pointer"
                  >
                    <span>{sec.label}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          layout: {
                            ...prev.layout,
                            sidebarSections: {
                              ...prev.layout.sidebarSections,
                              [sec.id]: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>

            {/* Active Toolbar Items Manager (Quick Reorder / Visibility / Remove) */}
            <div data-active-toolbar-list="true">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-300">Active Toolbar Items</span>
                <span className="text-[10px] text-slate-400">
                  {draftProfile.layout.toolbarItems.length} slots
                </span>
              </div>

              <div className="space-y-1">
                {draftProfile.layout.toolbarItems.map((slot, idx) => {
                  const meta = getToolbarItemMeta(slot.kind);
                  const Icon = meta.icon;
                  const isCritical = Boolean(meta.isCritical);
                  const isFirst = idx === 0;
                  const isLast = idx === draftProfile.layout.toolbarItems.length - 1;
                  return (
                    <div
                      key={slot.id}
                      data-active-slot-id={slot.id}
                      data-active-slot-kind={slot.kind}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-800/50 border border-slate-700/60 transition-opacity ${
                        !slot.visible ? 'opacity-55' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded bg-slate-700/60 flex items-center justify-center text-slate-300 shrink-0">
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-medium text-slate-200 truncate">{meta.label}</span>
                        {!slot.visible && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 shrink-0">
                            Hidden
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          data-action="move-slot-up"
                          disabled={isFirst}
                          aria-label={`Move ${meta.label} earlier`}
                          title="Move earlier"
                          onClick={() =>
                            updateDraft((prev) => ({
                              ...prev,
                              layout: {
                                ...prev.layout,
                                toolbarItems: moveToolbarItemToIndex(prev.layout.toolbarItems, slot.id, idx - 1),
                              },
                            }))
                          }
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/70 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          data-action="move-slot-down"
                          disabled={isLast}
                          aria-label={`Move ${meta.label} later`}
                          title="Move later"
                          onClick={() =>
                            updateDraft((prev) => ({
                              ...prev,
                              layout: {
                                ...prev.layout,
                                toolbarItems: moveToolbarItemToIndex(prev.layout.toolbarItems, slot.id, idx + 1),
                              },
                            }))
                          }
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/70 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          data-action="toggle-slot-visibility"
                          disabled={isCritical}
                          aria-label={slot.visible ? `Toggle hide ${meta.label}` : `Toggle show ${meta.label}`}
                          title={
                            isCritical
                              ? `${meta.label} cannot be hidden`
                              : slot.visible
                              ? `Hide ${meta.label}`
                              : `Show ${meta.label}`
                          }
                          onClick={() =>
                            updateDraft((prev) => ({
                              ...prev,
                              layout: {
                                ...prev.layout,
                                toolbarItems: toggleToolbarItemVisibility(prev.layout.toolbarItems, slot.id),
                              },
                            }))
                          }
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/70 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          {slot.visible ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-amber-400" />
                          )}
                        </button>
                        {!isCritical && (
                          <button
                            type="button"
                            data-action="remove-slot"
                            aria-label={`Delete ${meta.label} from toolbar`}
                            title={`Remove ${meta.label}`}
                            onClick={() =>
                              updateDraft((prev) => ({
                                ...prev,
                                layout: {
                                  ...prev.layout,
                                  toolbarItems: removeToolbarItem(prev.layout.toolbarItems, slot.id),
                                },
                              }))
                            }
                            className="p-1 rounded text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 cursor-pointer transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Toolbar Item Palette */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-300">Toolbar Item Palette</span>
                <span className="text-[10px] text-slate-400">Drag or Click + Add</span>
              </div>

              <div className="space-y-1.5">
                {paletteItems.map((kind) => {
                  const meta = getToolbarItemMeta(kind);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={kind}
                      data-palette-item={kind}
                      draggable
                      onDragStart={(e) => handleDragStartPalette(e, kind)}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-slate-700/60 flex items-center justify-center text-slate-300">
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-medium text-slate-200">{meta.label}</span>
                      </div>

                      <button
                        type="button"
                        data-action="add-toolbar-item"
                        onClick={() => handleAddPaletteItem(kind)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: Zones & Surfaces */}
        {/* ================================================================= */}
        {activeTab === 'zones' && (
          <div className="space-y-4">
            {/* Zone Selector Pills */}
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
              {SURFACE_ZONE_IDS.map((zid) => {
                const isSelected = selectedZone === zid;
                const hasOverride = Boolean(draftProfile.surfaces[zid]);
                return (
                  <button
                    key={zid}
                    type="button"
                    data-zone-pill={zid}
                    onClick={() => setSelectedZone(zid)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{SURFACE_ZONE_LABELS[zid]}</span>
                    {hasOverride && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </button>
                );
              })}
            </div>

            {/* Zone Surface Style Controls */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                <span className="font-semibold text-xs text-slate-200">{SURFACE_ZONE_LABELS[selectedZone]}</span>
                <button
                  type="button"
                  data-action="reset-zone"
                  onClick={() =>
                    updateDraft((prev) => {
                      const copy = { ...prev.surfaces };
                      delete copy[selectedZone];
                      return { ...prev, surfaces: copy };
                    })
                  }
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Zone</span>
                </button>
              </div>

              {/* Background Color */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Background</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      currentZoneStyle.bg && /^#[0-9a-fA-F]{6}$/.test(currentZoneStyle.bg)
                        ? currentZoneStyle.bg
                        : '#1e293b'
                    }
                    onChange={(e) => updateSelectedZone({ bg: e.target.value })}
                    className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
                  />
                  <SafeColorTextInput
                    value={currentZoneStyle.bg}
                    placeholder="#1e293b or transparent"
                    onChange={(val) => updateSelectedZone({ bg: val })}
                    className="w-28 px-2 py-1 rounded bg-slate-900 border text-slate-200 text-xs font-mono"
                    aria-label="Zone background color"
                    data-testid="zone-bg-input"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Text Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      currentZoneStyle.textColor && /^#[0-9a-fA-F]{6}$/.test(currentZoneStyle.textColor)
                        ? currentZoneStyle.textColor
                        : '#f8fafc'
                    }
                    onChange={(e) => updateSelectedZone({ textColor: e.target.value })}
                    className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
                  />
                  <SafeColorTextInput
                    value={currentZoneStyle.textColor}
                    placeholder="#f8fafc"
                    onChange={(val) => updateSelectedZone({ textColor: val })}
                    className="w-28 px-2 py-1 rounded bg-slate-900 border text-slate-200 text-xs font-mono"
                    aria-label="Zone text color"
                    data-testid="zone-text-color-input"
                  />
                </div>
              </div>

              {/* Muted Color */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Muted Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      currentZoneStyle.mutedColor && /^#[0-9a-fA-F]{6}$/.test(currentZoneStyle.mutedColor)
                        ? currentZoneStyle.mutedColor
                        : '#94a3b8'
                    }
                    onChange={(e) => updateSelectedZone({ mutedColor: e.target.value })}
                    className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
                  />
                  <SafeColorTextInput
                    value={currentZoneStyle.mutedColor}
                    placeholder="#94a3b8"
                    onChange={(val) => updateSelectedZone({ mutedColor: val })}
                    className="w-28 px-2 py-1 rounded bg-slate-900 border text-slate-200 text-xs font-mono"
                    aria-label="Zone muted color"
                    data-testid="zone-muted-color-input"
                  />
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Opacity</span>
                  <span className="text-xs font-mono text-blue-400">
                    {Math.round((currentZoneStyle.opacity ?? 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={currentZoneStyle.opacity ?? 1}
                  onChange={(e) =>
                    updateSelectedZone({ opacity: Number(e.target.value) }, { coalesceKey: 'zone-opacity' })
                  }
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Blur Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Backdrop Blur</span>
                  <span className="text-xs font-mono text-blue-400">{currentZoneStyle.blur ?? 0}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={32}
                  step={2}
                  value={currentZoneStyle.blur ?? 0}
                  onChange={(e) =>
                    updateSelectedZone({ blur: Number(e.target.value) }, { coalesceKey: 'zone-blur' })
                  }
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Border Width & Color */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Border Width</span>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((bw) => (
                      <button
                        key={bw}
                        type="button"
                        onClick={() => updateSelectedZone({ borderWidth: bw as any })}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                          (currentZoneStyle.borderWidth ?? 1) === bw
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {bw}px
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Border Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={
                        currentZoneStyle.borderColor && /^#[0-9a-fA-F]{6}$/.test(currentZoneStyle.borderColor)
                          ? currentZoneStyle.borderColor
                          : '#334155'
                      }
                      onChange={(e) => updateSelectedZone({ borderColor: e.target.value })}
                      className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
                    />
                    <SafeColorTextInput
                      value={currentZoneStyle.borderColor}
                      placeholder="#334155"
                      onChange={(val) => updateSelectedZone({ borderColor: val })}
                      className="w-28 px-2 py-1 rounded bg-slate-900 border text-slate-200 text-xs font-mono"
                      aria-label="Zone border color"
                      data-testid="zone-border-color-input"
                    />
                  </div>
                </div>
              </div>

              {/* Corner Radius Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Corner Radius</span>
                  <span className="text-xs font-mono text-blue-400">{currentZoneStyle.radius ?? 8}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={1}
                  value={currentZoneStyle.radius ?? 8}
                  onChange={(e) =>
                    updateSelectedZone({ radius: Number(e.target.value) }, { coalesceKey: 'zone-radius' })
                  }
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Shadow Dropdown */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Shadow</span>
                <select
                  value={currentZoneStyle.shadow || 'none'}
                  onChange={(e) => updateSelectedZone({ shadow: e.target.value as any })}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                >
                  <option value="none">None</option>
                  <option value="soft">Soft</option>
                  <option value="elevated">Elevated</option>
                  <option value="glow">Glow</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: Typography & Effects */}
        {/* ================================================================= */}
        {activeTab === 'typography' && (
          <div className="space-y-4">
            {/* Font Family Cards */}
            <div>
              <span className="text-[11px] font-semibold text-slate-300 block mb-2">UI Font Family</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'system', name: 'System Default' },
                  { id: 'inter', name: 'Inter' },
                  { id: 'geist', name: 'Geist Sans' },
                  { id: 'mono', name: 'JetBrains Mono' },
                  { id: 'serif', name: 'Editorial Serif' },
                  { id: 'rounded', name: 'Comfort Rounded' },
                ].map((f) => {
                  const isSelected = draftProfile.typography.fontFamily === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      data-font-option={f.id}
                      onClick={() =>
                        updateDraft((prev) => ({
                          ...prev,
                          typography: { ...prev.typography, fontFamily: f.id as UiFontFamily },
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-slate-700/60 bg-slate-800/50 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <span className="font-semibold text-xs block">{f.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Aa Bb Gg 123</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* UI Scale & Icon Scale */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">UI Scale</span>
                  <span className="text-xs font-mono text-blue-400">
                    {Math.round(draftProfile.typography.uiScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.85}
                  max={1.25}
                  step={0.05}
                  value={draftProfile.typography.uiScale}
                  onChange={(e) =>
                    updateDraft(
                      (prev) => ({
                        ...prev,
                        typography: { ...prev.typography, uiScale: Number(e.target.value) },
                      }),
                      { coalesceKey: 'ui-scale' }
                    )
                  }
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Icon Scale</span>
                  <span className="text-xs font-mono text-blue-400">
                    {Math.round(draftProfile.typography.iconScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.85}
                  max={1.25}
                  step={0.05}
                  value={draftProfile.typography.iconScale}
                  onChange={(e) =>
                    updateDraft(
                      (prev) => ({
                        ...prev,
                        typography: { ...prev.typography, iconScale: Number(e.target.value) },
                      }),
                      { coalesceKey: 'icon-scale' }
                    )
                  }
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Density */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-xs text-slate-300">UI Density</span>
              <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
                {(['compact', 'normal', 'comfortable'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        density: d as UiDensity,
                      }))
                    }
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize ${
                      draftProfile.density === d ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Style & Tab Animation */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Tab Style</span>
                <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
                  {(['floating', 'rounded', 'square'] as const).map((ts) => (
                    <button
                      key={ts}
                      type="button"
                      onClick={() => updateDraftTabStyle(ts)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize ${
                        draftTabStyle === ts ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ts}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Tab Animation</span>
                <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
                  {(['chrome', 'smooth', 'snappy', 'none'] as const).map((ta) => (
                    <button
                      key={ta}
                      type="button"
                      onClick={() => updateDraftTabAnimation(ta)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize ${
                        draftTabAnimation === ta ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ta}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Native Window Material & Motion Reduction */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-200 block">Window Material</span>
                  <span className="text-[10px] text-slate-400">Desktop glass / vibrancy</span>
                </div>
                <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
                  {(['opaque', 'glass-vibrancy'] as const).map((mat) => (
                    <button
                      key={mat}
                      type="button"
                      onClick={() =>
                        updateDraft((prev) => ({
                          ...prev,
                          effects: { ...prev.effects, windowMaterial: mat as WindowMaterial },
                        }))
                      }
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                        draftProfile.effects.windowMaterial === mat
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mat === 'opaque' ? 'Opaque' : 'Glass'}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer pt-1 border-t border-slate-700/50">
                <span>Reduce Chrome Motion</span>
                <input
                  type="checkbox"
                  checked={draftProfile.effects.reduceChromeMotion}
                  onChange={(e) =>
                    updateDraft((prev) => ({
                      ...prev,
                      effects: { ...prev.effects, reduceChromeMotion: e.target.checked },
                    }))
                  }
                  className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: New Tab & CSS */}
        {/* ================================================================= */}
        {activeTab === 'newtab-css' && (
          <div className="space-y-4">
            {/* Widget Toggles */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <span className="text-xs font-semibold text-slate-200 block">New Tab Page Widgets</span>

              {/* Clock */}
              <div className="space-y-1.5 pb-2 border-b border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Clock</span>
                  <input
                    type="checkbox"
                    checked={draftProfile.newTabLayout.clock.visible}
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        newTabLayout: {
                          ...prev.newTabLayout,
                          clock: { ...prev.newTabLayout.clock, visible: e.target.checked },
                        },
                      }))
                    }
                    className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                {draftProfile.newTabLayout.clock.visible && (
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <select
                      value={draftProfile.newTabLayout.clock.format}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          newTabLayout: {
                            ...prev.newTabLayout,
                            clock: { ...prev.newTabLayout.clock, format: e.target.value as any },
                          },
                        }))
                      }
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                    >
                      <option value="24h">24-Hour</option>
                      <option value="12h">12-Hour</option>
                    </select>
                    <select
                      value={draftProfile.newTabLayout.clock.style}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          newTabLayout: {
                            ...prev.newTabLayout,
                            clock: { ...prev.newTabLayout.clock, style: e.target.value as any },
                          },
                        }))
                      }
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                    >
                      <option value="minimal">Minimal</option>
                      <option value="editorial">Editorial</option>
                      <option value="mono">Monospace</option>
                      <option value="pill">Pill</option>
                    </select>
                    <select
                      value={draftProfile.newTabLayout.clock.align}
                      data-testid="clock-align-select"
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          newTabLayout: {
                            ...prev.newTabLayout,
                            clock: { ...prev.newTabLayout.clock, align: e.target.value as any },
                          },
                        }))
                      }
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                    >
                      <option value="center">Center</option>
                      <option value="left">Left</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Greeting */}
              <div className="space-y-1.5 pb-2 border-b border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Greeting</span>
                  <input
                    type="checkbox"
                    checked={draftProfile.newTabLayout.greeting.visible}
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        newTabLayout: {
                          ...prev.newTabLayout,
                          greeting: { ...prev.newTabLayout.greeting, visible: e.target.checked },
                        },
                      }))
                    }
                    className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                {draftProfile.newTabLayout.greeting.visible && (
                  <input
                    type="text"
                    value={draftProfile.newTabLayout.greeting.customText || ''}
                    placeholder="Custom greeting message..."
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        newTabLayout: {
                          ...prev.newTabLayout,
                          greeting: { ...prev.newTabLayout.greeting, customText: e.target.value },
                        },
                      }))
                    }
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                  />
                )}
              </div>

              {/* Search Box */}
              <div className="space-y-1.5 pb-2 border-b border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Search Box</span>
                  <input
                    type="checkbox"
                    checked={draftProfile.newTabLayout.searchBox.visible}
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        newTabLayout: {
                          ...prev.newTabLayout,
                          searchBox: { ...prev.newTabLayout.searchBox, visible: e.target.checked },
                        },
                      }))
                    }
                    className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                {draftProfile.newTabLayout.searchBox.visible && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <select
                      value={draftProfile.newTabLayout.searchBox.style}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          newTabLayout: {
                            ...prev.newTabLayout,
                            searchBox: { ...prev.newTabLayout.searchBox, style: e.target.value as any },
                          },
                        }))
                      }
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                    >
                      <option value="glass">Glass</option>
                      <option value="solid">Solid</option>
                      <option value="minimal">Minimal</option>
                      <option value="pill">Pill</option>
                    </select>
                    <select
                      value={draftProfile.newTabLayout.searchBox.width}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          newTabLayout: {
                            ...prev.newTabLayout,
                            searchBox: { ...prev.newTabLayout.searchBox, width: e.target.value as any },
                          },
                        }))
                      }
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                    >
                      <option value="narrow">Narrow</option>
                      <option value="medium">Medium</option>
                      <option value="wide">Wide</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Shortcuts */}
              <div className="space-y-1.5 pb-2 border-b border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Shortcuts Grid</span>
                  <input
                    type="checkbox"
                    checked={draftProfile.newTabLayout.shortcuts.visible}
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        newTabLayout: {
                          ...prev.newTabLayout,
                          shortcuts: { ...prev.newTabLayout.shortcuts, visible: e.target.checked },
                        },
                      }))
                    }
                    className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                {draftProfile.newTabLayout.shortcuts.visible && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Cols:</span>
                      <select
                        value={draftProfile.newTabLayout.shortcuts.columns}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            newTabLayout: {
                              ...prev.newTabLayout,
                              shortcuts: {
                                ...prev.newTabLayout.shortcuts,
                                columns: Number(e.target.value) as any,
                              },
                            },
                          }))
                        }
                        className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                      >
                        {[4, 5, 6, 7, 8].map((c) => (
                          <option key={c} value={c}>
                            {c} columns
                          </option>
                        ))}
                      </select>
                    </div>
                    <select
                      value={draftProfile.newTabLayout.shortcuts.cardStyle}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          newTabLayout: {
                            ...prev.newTabLayout,
                            shortcuts: {
                              ...prev.newTabLayout.shortcuts,
                              cardStyle: e.target.value as any,
                            },
                          },
                        }))
                      }
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                    >
                      <option value="tile">Tile</option>
                      <option value="pill">Pill</option>
                      <option value="icon-only">Icon Only</option>
                      <option value="compact">Compact</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Tasks Widget */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Tasks Widget</span>
                  <input
                    type="checkbox"
                    checked={draftProfile.newTabLayout.tasksWidget.visible}
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        newTabLayout: {
                          ...prev.newTabLayout,
                          tasksWidget: { ...prev.newTabLayout.tasksWidget, visible: e.target.checked },
                        },
                      }))
                    }
                    className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                {draftProfile.newTabLayout.tasksWidget.visible && (
                  <select
                    value={draftProfile.newTabLayout.tasksWidget.placement}
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        newTabLayout: {
                          ...prev.newTabLayout,
                          tasksWidget: {
                            ...prev.newTabLayout.tasksWidget,
                            placement: e.target.value as any,
                          },
                        },
                      }))
                    }
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                  >
                    <option value="bottom">Bottom Horizontal</option>
                    <option value="left">Left Sidebar</option>
                    <option value="right">Right Docked</option>
                    <option value="floating">Floating Panel</option>
                  </select>
                )}
              </div>
            </div>

            {/* Custom CSS */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Custom CSS</span>
                  <span className="text-[10px] text-slate-400">Scoped user stylesheet overrides</span>
                </div>
                <input
                  type="checkbox"
                  checked={draftProfile.customCss.enabled}
                  onChange={(e) =>
                    updateDraft((prev) => ({
                      ...prev,
                      customCss: { ...prev.customCss, enabled: e.target.checked },
                    }))
                  }
                  className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <textarea
                data-control="custom-css"
                value={draftProfile.customCss.css}
                onChange={(e) =>
                  updateDraft((prev) => ({
                    ...prev,
                    customCss: { ...prev.customCss, css: e.target.value },
                  }))
                }
                rows={5}
                placeholder="/* Add custom CSS rules here (e.g. #nova-app { ... }) */"
                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono text-[11px] leading-relaxed resize-y focus:outline-none focus:border-blue-500"
              />

              {/* Warning Banner */}
              {cssAnalysis.warnings.length > 0 ? (
                <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-[10px] space-y-1">
                  <div className="font-semibold flex items-center gap-1 text-amber-300">
                    <AlertTriangle className="w-3 h-3" />
                    <span>CSS Warnings ({cssAnalysis.warnings.length}):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1">
                    {cssAnalysis.warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle className="w-3 h-3" />
                  <span>CSS rules verified safe.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
