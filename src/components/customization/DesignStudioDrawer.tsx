import React, { useCallback, useId, useRef, useState } from 'react';
import {
  X,
  PanelLeft,
  PanelRight,
  Download,
  Upload,
  Plus,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Check,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Undo2,
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
import {
  clearActiveToolbarDragPayload,
  getActiveToolbarDragPayload,
  getToolbarItemMeta,
  setActiveToolbarDragPayload,
} from './toolbarRegistry';
import { isSafeSurfaceColor, sanitizeCustomCss } from '../../utils/designSecurity';
import { useCustomize } from './CustomizeContext';
import { ChromeMiniPreview } from './ChromeMiniPreview';

type StudioTabId = 'templates' | 'layout' | 'zones' | 'newtab-css';

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

const SURFACE_ZONE_HINTS: Record<SurfaceZoneId, string> = {
  toolbar: 'Main navigation bar, icons and bookmarks strip',
  tabBar: 'Top or bottom browser tab strip background',
  activeTab: 'Currently focused tab surface',
  inactiveTab: 'Background tabs in the strip',
  omnibox: 'URL and search input bar',
  sidebar: 'Vertical tabs sidebar panel (Left or Right)',
  aiPanel: 'Side Nova AI chat panel',
  popovers: 'Menus, downloads, shield and omnibox dropdowns',
  frame: 'Outer window backdrop behind pages without wallpaper',
};

interface QuickSurfacePreset {
  id: string;
  label: string;
  subtitle: string;
  swatchA: string;
  swatchB: string;
  windowMaterial?: WindowMaterial;
  surfaces: Partial<Record<SurfaceZoneId, SurfaceZoneStyle>>;
}

const QUICK_SURFACE_PRESETS: QuickSurfacePreset[] = [
  {
    id: 'reset-clean',
    label: 'Theme Default',
    subtitle: 'Inherit base palette',
    swatchA: '#18191c',
    swatchB: '#737373',
    surfaces: {},
  },
  {
    id: 'midnight-ink',
    label: 'Midnight Ink',
    subtitle: 'Deep obsidian contrast',
    swatchA: '#090d16',
    swatchB: '#151923',
    windowMaterial: 'opaque',
    surfaces: {
      tabBar: { bg: '#070b13', textColor: '#f8fafc', borderColor: '#1e293b', borderWidth: 1 },
      toolbar: { bg: '#0d1322', textColor: '#f8fafc', borderColor: '#1e293b', borderWidth: 1 },
      activeTab: { bg: '#172033', textColor: '#ffffff', radius: 10 },
      omnibox: { bg: '#070b13', textColor: '#f8fafc', borderColor: '#263248', radius: 12 },
      sidebar: { bg: '#090d16', textColor: '#e2e8f0', borderColor: '#1e293b' },
    },
  },
  {
    id: 'frosted-glass',
    label: 'Frosted Glass',
    subtitle: 'Translucent vibrancy',
    swatchA: '#e0f2fe',
    swatchB: '#38bdf8',
    windowMaterial: 'glass-vibrancy',
    surfaces: {
      tabBar: { bg: '#0f172a', textColor: '#f8fafc', mutedColor: '#94a3b8', opacity: 0.72, blur: 18, borderColor: 'rgba(255,255,255,0.12)' },
      toolbar: { bg: '#1e293b', textColor: '#f8fafc', mutedColor: '#94a3b8', opacity: 0.76, blur: 18, borderColor: 'rgba(255,255,255,0.12)' },
      activeTab: { bg: '#334155', textColor: '#ffffff', opacity: 0.85, blur: 12, radius: 10 },
      omnibox: { bg: '#0f172a', textColor: '#f8fafc', mutedColor: '#94a3b8', opacity: 0.78, blur: 14, borderColor: 'rgba(255,255,255,0.16)', radius: 14 },
      popovers: { bg: '#0f172a', textColor: '#f8fafc', mutedColor: '#94a3b8', opacity: 0.88, blur: 20, shadow: 'elevated' },
    },
  },
  {
    id: 'nordic-light',
    label: 'Soft Paper',
    subtitle: 'Clean studio light',
    swatchA: '#f1f5f9',
    swatchB: '#ffffff',
    windowMaterial: 'opaque',
    surfaces: {
      tabBar: { bg: '#e8edf3', textColor: '#0f172a', mutedColor: '#475569', borderColor: '#cbd5e1' },
      toolbar: { bg: '#ffffff', textColor: '#0f172a', mutedColor: '#475569', borderColor: '#cbd5e1' },
      activeTab: { bg: '#ffffff', textColor: '#0f172a', borderColor: '#cbd5e1', radius: 10 },
      omnibox: { bg: '#f1f5f9', textColor: '#0f172a', borderColor: '#cbd5e1', radius: 12 },
      sidebar: { bg: '#f8fafc', textColor: '#0f172a', mutedColor: '#64748b', borderColor: '#e2e8f0' },
    },
  },
];

const FROSTED_LIGHT_SURFACES: Partial<Record<SurfaceZoneId, SurfaceZoneStyle>> = {
  tabBar: { bg: '#e2e8f0', textColor: '#0f172a', mutedColor: '#475569', opacity: 0.74, blur: 18, borderColor: 'rgba(15,23,42,0.1)' },
  toolbar: { bg: '#ffffff', textColor: '#0f172a', mutedColor: '#475569', opacity: 0.8, blur: 18, borderColor: 'rgba(15,23,42,0.1)' },
  activeTab: { bg: '#ffffff', textColor: '#0f172a', opacity: 0.92, blur: 12, radius: 10 },
  omnibox: { bg: '#f1f5f9', textColor: '#0f172a', mutedColor: '#475569', opacity: 0.82, blur: 14, borderColor: 'rgba(15,23,42,0.14)', radius: 14 },
  popovers: { bg: '#ffffff', textColor: '#0f172a', mutedColor: '#475569', opacity: 0.9, blur: 20, shadow: 'elevated' },
};

const FONT_PREVIEW_STYLES: Record<UiFontFamily, string> = {
  system: 'system-ui, -apple-system, sans-serif',
  inter: '"Inter", system-ui, sans-serif',
  geist: '"Geist", "Inter", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  serif: '"Newsreader", Georgia, serif',
  rounded: '"SF Pro Rounded", "Quicksand", system-ui, sans-serif',
};

const SELECT_CLS =
  'px-2 py-1 rounded-md bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.09] text-[11px] text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-neutral-400 dark:focus:border-white/30';

const SEGMENT_TRACK_CLS =
  'inline-flex rounded-md bg-neutral-100 dark:bg-white/[0.06] p-0.5 border border-neutral-200/80 dark:border-white/[0.07]';

const segmentBtnCls = (active: boolean) =>
  `px-2 py-1 rounded-[5px] text-[11px] font-medium transition-colors cursor-pointer ${
    active
      ? 'bg-white dark:bg-white/[0.14] text-neutral-950 dark:text-white shadow-xs'
      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
  }`;

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
  'data-testid': dataTestId,
}) => {
  const [localText, setLocalText] = useState<string>(value || '');
  const [isInvalid, setIsInvalid] = useState<boolean>(false);
  const [lastPropValue, setLastPropValue] = useState<string | undefined>(value);

  if (value !== lastPropValue) {
    setLastPropValue(value);
    setLocalText(value || '');
    setIsInvalid(false);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalText(raw);
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
    const trimmed = localText.trim();
    if (!trimmed) {
      setLocalText('');
      setIsInvalid(false);
      onChange(undefined);
    } else if (isSafeSurfaceColor(trimmed)) {
      setLocalText(trimmed);
      setIsInvalid(false);
      onChange(trimmed);
    } else {
      setLocalText(value || '');
      setIsInvalid(false);
    }
  };

  return (
    <input
      type="text"
      value={localText}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={isInvalid}
      data-testid={dataTestId}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`${className} ${
        isInvalid
          ? 'border-amber-500/80 focus:border-amber-500'
          : 'border-neutral-200 dark:border-white/[0.1] focus:border-neutral-400 dark:focus:border-white/30'
      }`}
    />
  );
};

export const DesignStudioDrawer: React.FC = () => {
  const {
    isCustomizeMode,
    editingScope,
    canUndo,
    draftProfile,
    draftTabStyle,
    draftTabAnimation,
    activeWorkspaceId,
    activeWorkspaceName,
    hasActiveWorkspaceOverride,
    undo,
    resetToDefault,
    discard,
    commit,
    switchScope,
    applyStarterTemplate,
    clearWorkspaceOverride,
    importPack,
    exportPack,
    updateDraft,
    updateDraftTabStyle,
    updateDraftTabAnimation,
    drawerDockSide: dockSide,
    setDrawerDockSide: setDockSide,
  } = useCustomize();

  const [activeTab, setActiveTab] = useState<StudioTabId>('templates');
  const [selectedZone, setSelectedZone] = useState<SurfaceZoneId>('toolbar');
  const [isAdvancedSurfacesOpen, setIsAdvancedSurfacesOpen] = useState<boolean>(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(true);
  const [isCustomCssOpen, setIsCustomCssOpen] = useState<boolean>(
    () => Boolean(draftProfile.customCss.enabled || draftProfile.customCss.css.trim())
  );
  const [listDragOverIndex, setListDragOverIndex] = useState<number | null>(null);
  const [listDraggingSlotId, setListDraggingSlotId] = useState<string | null>(null);
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
              message: `Imported "${res.themeName || 'Theme Pack'}"`,
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
      reader.onerror = () => {
        setImportStatus({
          type: 'error',
          message: 'Failed to read theme pack file from disk',
        });
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
  const customizedZonesCount = Object.keys(draftProfile.surfaces || {}).length;

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

  const applyQuickSurfacePreset = (preset: QuickSurfacePreset) => {
    const isDark =
      typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const resolvedSurfaces =
      preset.id === 'frosted-glass' && !isDark ? FROSTED_LIGHT_SURFACES : preset.surfaces;
    updateDraft((prev) => ({
      ...prev,
      effects: preset.windowMaterial
        ? { ...prev.effects, windowMaterial: preset.windowMaterial }
        : prev.effects,
      surfaces: JSON.parse(JSON.stringify(resolvedSurfaces)),
    }));
  };

  const handleAddPaletteItem = (kind: ToolbarItemKind, atIndex?: number) => {
    updateDraft((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        toolbarItems: insertToolbarItem(
          prev.layout.toolbarItems,
          kind,
          typeof atIndex === 'number' ? atIndex : prev.layout.toolbarItems.length
        ),
      },
    }));
  };

  const handleDragStartPalette = (e: React.DragEvent, kind: ToolbarItemKind) => {
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('application/x-nova-toolbar-kind', kind);
    setActiveToolbarDragPayload({ type: 'kind', kind });
  };

  const handleDragEndAny = () => {
    setListDragOverIndex(null);
    setListDraggingSlotId(null);
    clearActiveToolbarDragPayload();
  };

  const handleListRowDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const shared = getActiveToolbarDragPayload();
    const draggedSlotId =
      e.dataTransfer?.getData('application/x-nova-toolbar-slot') ||
      (shared?.type === 'slot' ? shared.draggedId : '');
    const draggedKind =
      (e.dataTransfer?.getData('application/x-nova-toolbar-kind') as ToolbarItemKind | '') ||
      (shared?.type === 'kind' ? shared.kind : '');

    setListDragOverIndex(null);
    setListDraggingSlotId(null);
    clearActiveToolbarDragPayload();

    if (draggedSlotId) {
      updateDraft((prev) => ({
        ...prev,
        layout: {
          ...prev.layout,
          toolbarItems: moveToolbarItemToIndex(prev.layout.toolbarItems, draggedSlotId, targetIndex),
        },
      }));
    } else if (draggedKind) {
      handleAddPaletteItem(draggedKind, targetIndex);
    }
  };

  const isVerticalMode =
    draftProfile.layout.chromeMode === 'vertical-left' ||
    draftProfile.layout.chromeMode === 'vertical-right';
  const drawerTopClass =
    draftProfile.layout.chromeMode === 'classic-top' ? 'top-[94px]' : 'top-14';

  const tabs: Array<{ id: StudioTabId; label: string }> = [
    { id: 'templates', label: 'Themes' },
    { id: 'layout', label: 'Layout' },
    { id: 'zones', label: 'Style' },
    { id: 'newtab-css', label: 'New Tab' },
  ];

  const scopeBadgeLabel =
    editingScope === 'workspace'
      ? activeWorkspaceName || activeWorkspaceId || 'Workspace'
      : 'Global';

  return (
    <aside
      data-design-studio-drawer="true"
      aria-label="Design Studio Inspector"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      className={`fixed ${drawerTopClass} bottom-0 ${
        dockSide === 'right'
          ? 'right-0 border-l slide-in-from-right-4'
          : 'left-0 border-r slide-in-from-left-4'
      } w-[348px] max-w-[100vw] z-[995] select-none pointer-events-auto no-drag flex flex-col bg-white/95 dark:bg-[#111214]/96 text-neutral-900 dark:text-neutral-100 border-t border-neutral-200 dark:border-white/[0.08] shadow-2xl backdrop-blur-xl font-sans text-xs animate-in fade-in duration-150`}
    >
      {/* Inspector Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-neutral-200/90 dark:border-white/[0.07] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-semibold text-[13px] tracking-[-0.01em] text-neutral-950 dark:text-neutral-100 truncate">
            Design Studio
          </h2>
          <button
            type="button"
            data-scope-pill="true"
            onClick={() => switchScope(editingScope === 'global' ? 'workspace' : 'global')}
            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.07] dark:hover:bg-white/[0.12] text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer truncate max-w-[120px]"
            title="Switch between Global Design and current Workspace"
          >
            {scopeBadgeLabel}
          </button>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setDockSide(dockSide === 'right' ? 'left' : 'right')}
            className="p-1.5 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
            title={`Dock to ${dockSide === 'right' ? 'Left' : 'Right'}`}
            aria-label={`Dock Studio to ${dockSide === 'right' ? 'Left' : 'Right'}`}
          >
            {dockSide === 'right' ? (
              <PanelLeft className="w-3.5 h-3.5" />
            ) : (
              <PanelRight className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={discard}
            className="p-1.5 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
            title="Discard changes and close"
            aria-label="Close Design Studio"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Linear-Style Underline Tab Bar */}
      <div
        role="tablist"
        aria-label="Design Studio sections"
        className="grid grid-cols-4 border-b border-neutral-200/90 dark:border-white/[0.07] px-2 shrink-0"
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-studio-tab={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`relative py-2.5 text-[12px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'text-neutral-950 dark:text-white'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <span>{t.label}</span>
              {isActive && (
                <span className="absolute inset-x-2 bottom-0 h-[2px] bg-neutral-950 dark:bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Scrollable Hairline-Divided Inspector Body */}
      <div className="flex-1 overflow-y-auto text-neutral-700 dark:text-neutral-300">
        {/* ================================================================= */}
        {/* TAB 1: Themes & Scope */}
        {/* ================================================================= */}
        {activeTab === 'templates' && (
          <div className="divide-y divide-neutral-200/80 dark:divide-white/[0.07]">
            {/* Scope */}
            <section className="px-4 py-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Editing Scope
                </span>
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                  {editingScope === 'global' ? 'All workspaces' : 'Active workspace only'}
                </span>
              </div>

              <div className={`grid grid-cols-2 w-full ${SEGMENT_TRACK_CLS}`}>
                <button
                  type="button"
                  onClick={() => switchScope('global')}
                  className={segmentBtnCls(editingScope === 'global')}
                >
                  Global Design
                </button>
                <button
                  type="button"
                  onClick={() => switchScope('workspace')}
                  className={`${segmentBtnCls(editingScope === 'workspace')} truncate`}
                  title={activeWorkspaceName || 'This Workspace'}
                >
                  {activeWorkspaceName || 'This Workspace'}
                </button>
              </div>

              {editingScope === 'workspace' && activeWorkspaceId && hasActiveWorkspaceOverride && (
                <button
                  type="button"
                  data-action="clear-workspace-override"
                  onClick={clearWorkspaceOverride}
                  className="w-full py-1.5 px-2.5 rounded-md text-[11px] font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer"
                >
                  Clear Workspace Override
                </button>
              )}
            </section>

            {/* Starter Themes with Real Mini-Browser Previews */}
            <section className="px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Starter Themes
                </span>
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                  {STARTER_DESIGN_TEMPLATES.length} presets
                </span>
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
                      className={`group p-2 rounded-lg border text-left transition-colors flex flex-col gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-neutral-900 dark:border-white/75 bg-neutral-50 dark:bg-white/[0.05]'
                          : 'border-neutral-200/90 dark:border-white/[0.08] bg-transparent hover:border-neutral-300 dark:hover:border-white/[0.18] hover:bg-neutral-50/70 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <ChromeMiniPreview
                        mode={tmpl.profile.layout.chromeMode}
                        tabBarPosition={tmpl.profile.layout.tabBarPosition}
                        selected={isSelected}
                        surfaceBg={tmpl.previewBg}
                        accentColor={tmpl.previewAccent}
                        compact
                      />
                      <div className="flex items-center justify-between gap-1 px-0.5">
                        <span className="font-medium text-[11px] text-neutral-900 dark:text-neutral-100 truncate">
                          {tmpl.name}
                        </span>
                        {isSelected && (
                          <Check className="w-3 h-3 text-neutral-900 dark:text-white shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Theme Pack Import / Export */}
            <section className="px-4 py-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Theme Pack
                </span>
                <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                  .novatheme.json
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-action="export-theme-pack"
                  onClick={exportPack}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-white/[0.08] font-medium text-[11px] transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  data-action="import-theme-pack"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-white/[0.08] font-medium text-[11px] transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
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
                  className={`px-2.5 py-2 rounded-md text-[11px] flex items-start gap-1.5 border ${
                    importStatus.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
                  }`}
                >
                  {importStatus.type === 'success' ? (
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  )}
                  <span>{importStatus.message}</span>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: Layout & Draggable Toolbar Builder */}
        {/* ================================================================= */}
        {activeTab === 'layout' && (
          <div className="divide-y divide-neutral-200/80 dark:divide-white/[0.07]">
            {/* Browser Shell Layout */}
            <section className="px-4 py-4 space-y-3">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                Browser Shell
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    { id: 'classic-top', label: 'Classic Top', desc: 'Tabs above bar' },
                    { id: 'compact-single-row', label: 'Compact Row', desc: 'Unified strip' },
                    { id: 'vertical-left', label: 'Vertical Left', desc: 'Left sidebar' },
                    { id: 'vertical-right', label: 'Vertical Right', desc: 'Right sidebar' },
                  ] as const
                ).map((mode) => {
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
                      className={`p-2 rounded-lg border text-left transition-colors space-y-2 cursor-pointer ${
                        isSelected
                          ? 'border-neutral-900 dark:border-white/75 bg-neutral-50 dark:bg-white/[0.05] text-neutral-950 dark:text-white'
                          : 'border-neutral-200/90 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/[0.18] hover:bg-neutral-50/70 dark:hover:bg-white/[0.03] text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <ChromeMiniPreview
                        mode={mode.id}
                        tabBarPosition={mode.id === 'classic-top' ? draftProfile.layout.tabBarPosition : 'above-toolbar'}
                        selected={isSelected}
                        compact
                      />
                      <div className="px-0.5">
                        <div className="font-medium text-[11px] leading-tight">{mode.label}</div>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{mode.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Bar Geometry Rows */}
            <section className="px-4 py-3.5 space-y-3">
              {draftProfile.layout.chromeMode === 'classic-top' && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-neutral-700 dark:text-neutral-300">Tab Strip</span>
                  <div className={SEGMENT_TRACK_CLS}>
                    {(['above-toolbar', 'below-toolbar'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          updateDraft((prev) => ({
                            ...prev,
                            layout: { ...prev.layout, tabBarPosition: pos },
                          }))
                        }
                        className={segmentBtnCls(draftProfile.layout.tabBarPosition === pos)}
                      >
                        {pos === 'above-toolbar' ? 'Above' : 'Below'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-neutral-700 dark:text-neutral-300">Address Bar</span>
                <div className={SEGMENT_TRACK_CLS}>
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
                      className={`${segmentBtnCls(draftProfile.layout.omniboxMaxWidth === w)} capitalize`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Vertical Sidebar Controls */}
            <section className="px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Vertical Sidebar
                </span>
                {!isVerticalMode && (
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        layout: { ...prev.layout, chromeMode: 'vertical-left' },
                      }))
                    }
                    className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white underline underline-offset-2 cursor-pointer"
                  >
                    Enable
                  </button>
                )}
              </div>

              <div className={`space-y-3 transition-opacity ${!isVerticalMode ? 'opacity-50' : ''}`}>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-neutral-700 dark:text-neutral-300">Width</span>
                    <span className="text-[11px] font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                      {draftProfile.layout.sidebarWidth}px
                    </span>
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
                    className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {(
                    [
                      { id: 'favorites', label: 'Favorites' },
                      { id: 'pinned', label: 'Pinned Tabs' },
                      { id: 'folders', label: 'Folders' },
                      { id: 'workspaces', label: 'Workspaces' },
                      { id: 'dockFooter', label: 'Footer Dock' },
                    ] as const
                  ).map((sec) => {
                    const checked = draftProfile.layout.sidebarSections[sec.id];
                    return (
                      <label
                        key={sec.id}
                        className="flex items-center justify-between py-0.5 text-[11px] text-neutral-700 dark:text-neutral-300 cursor-pointer"
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
                          className="rounded accent-neutral-900 dark:accent-neutral-100 w-3.5 h-3.5 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Active Toolbar Items */}
            <section data-active-toolbar-list="true" className="px-4 py-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                    Toolbar Controls
                  </span>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    Drag rows here or directly on the top bar
                  </span>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-neutral-400 dark:text-neutral-500">
                  {draftProfile.layout.toolbarItems.length}
                </span>
              </div>

              <div className="divide-y divide-neutral-200/70 dark:divide-white/[0.05] border-y border-neutral-200/80 dark:border-white/[0.07]">
                {draftProfile.layout.toolbarItems.map((slot, idx) => {
                  const meta = getToolbarItemMeta(slot.kind);
                  const Icon = meta.icon;
                  const isCritical = Boolean(meta.isCritical);
                  const isFirst = idx === 0;
                  const isLast = idx === draftProfile.layout.toolbarItems.length - 1;
                  const isDropTarget = listDragOverIndex === idx;
                  const isBeingDragged = listDraggingSlotId === slot.id;
                  return (
                    <div
                      key={slot.id}
                      draggable
                      data-active-slot-id={slot.id}
                      data-active-slot-kind={slot.kind}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'copyMove';
                        e.dataTransfer.setData('application/x-nova-toolbar-slot', slot.id);
                        e.dataTransfer.setData('application/x-nova-toolbar-kind', slot.kind);
                        setActiveToolbarDragPayload({ type: 'slot', draggedId: slot.id, kind: slot.kind });
                        setListDraggingSlotId(slot.id);
                      }}
                      onDragOver={(e) => {
                        const types = Array.from(e.dataTransfer?.types || []);
                        if (
                          types.includes('application/x-nova-toolbar-slot') ||
                          types.includes('application/x-nova-toolbar-kind') ||
                          getActiveToolbarDragPayload() !== null
                        ) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (listDragOverIndex !== idx) {
                            setListDragOverIndex(idx);
                          }
                        }
                      }}
                      onDragLeave={() => {
                        if (listDragOverIndex === idx) {
                          setListDragOverIndex(null);
                        }
                      }}
                      onDragEnd={handleDragEndAny}
                      onDrop={(e) => handleListRowDrop(e, idx)}
                      className={`flex items-center justify-between py-1.5 px-1 transition-colors cursor-grab active:cursor-grabbing ${
                        isDropTarget
                          ? 'bg-neutral-200/70 dark:bg-white/[0.1]'
                          : 'hover:bg-neutral-100/80 dark:hover:bg-white/[0.04]'
                      } ${!slot.visible ? 'opacity-50' : ''} ${isBeingDragged ? 'opacity-30' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="w-3 h-3 text-neutral-400 dark:text-neutral-500 shrink-0" />
                        <Icon className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
                        <span className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 truncate">
                          {meta.label}
                        </span>
                        {!slot.visible && (
                          <span className="text-[9px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 shrink-0">
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
                          className="p-1 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
                          className="p-1 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
                          className="p-1 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          {slot.visible ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
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
                            className="p-1 rounded text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Controls Palette */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsPaletteOpen((p) => !p)}
                  className="w-full flex items-center justify-between text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white py-1 cursor-pointer"
                >
                  <span>Add Controls Palette ({paletteItems.length})</span>
                  {isPaletteOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>

                {isPaletteOpen && (
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {paletteItems.map((kind) => {
                      const meta = getToolbarItemMeta(kind);
                      const Icon = meta.icon;
                      return (
                        <div
                          key={kind}
                          data-palette-item={kind}
                          draggable
                          onDragStart={(e) => handleDragStartPalette(e, kind)}
                          onDragEnd={handleDragEndAny}
                          className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-md bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/[0.07] hover:border-neutral-300 dark:hover:border-white/[0.16] transition-colors cursor-grab active:cursor-grabbing"
                          title={`Drag onto toolbar or click + to add ${meta.label}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Icon className="w-3 h-3 text-neutral-500 dark:text-neutral-400 shrink-0" />
                            <span className="text-[11px] text-neutral-800 dark:text-neutral-200 truncate">
                              {meta.label}
                            </span>
                          </div>
                          <button
                            type="button"
                            data-action="add-toolbar-item"
                            onClick={() => handleAddPaletteItem(kind)}
                            className="p-0.5 rounded bg-neutral-200/80 hover:bg-neutral-900 hover:text-white dark:bg-white/[0.09] dark:hover:bg-white dark:hover:text-neutral-950 text-neutral-700 dark:text-neutral-200 shrink-0 cursor-pointer transition-colors"
                            aria-label={`Add ${meta.label}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: Style (Surface Presets + Typography + Chrome Feel + Inspector) */}
        {/* ================================================================= */}
        {activeTab === 'zones' && (
          <div className="divide-y divide-neutral-200/80 dark:divide-white/[0.07]">
            {/* Surface Presets */}
            <section className="px-4 py-4 space-y-2.5">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                Surface Presets
              </span>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_SURFACE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    data-surface-preset={preset.id}
                    onClick={() => applyQuickSurfacePreset(preset)}
                    className="p-2 rounded-lg border border-neutral-200/90 dark:border-white/[0.08] hover:border-neutral-400 dark:hover:border-white/[0.22] hover:bg-neutral-50 dark:hover:bg-white/[0.04] text-left transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-[5px] overflow-hidden flex border border-neutral-300/80 dark:border-white/[0.12] shrink-0">
                      <span className="w-3 h-full" style={{ backgroundColor: preset.swatchA }} />
                      <span className="w-3 h-full" style={{ backgroundColor: preset.swatchB }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {preset.label}
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                        {preset.subtitle}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Typography */}
            <section className="px-4 py-4 space-y-3">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                Typography
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'system', name: 'System' },
                    { id: 'inter', name: 'Inter' },
                    { id: 'geist', name: 'Geist Sans' },
                    { id: 'mono', name: 'JetBrains Mono' },
                    { id: 'serif', name: 'Editorial Serif' },
                    { id: 'rounded', name: 'Rounded' },
                  ] as const
                ).map((f) => {
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
                      style={{ fontFamily: FONT_PREVIEW_STYLES[f.id] }}
                      className={`px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-neutral-900 dark:border-white/75 bg-neutral-50 dark:bg-white/[0.05] text-neutral-950 dark:text-white'
                          : 'border-neutral-200/90 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/[0.18] text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <span className="font-medium text-[11px] block truncate">{f.name}</span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Aa Bb Gg 123</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-600 dark:text-neutral-400">UI Scale</span>
                    <span className="font-mono tabular-nums text-neutral-900 dark:text-neutral-200">
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
                    className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-600 dark:text-neutral-400">Icons</span>
                    <span className="font-mono tabular-nums text-neutral-900 dark:text-neutral-200">
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
                    className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
                  />
                </div>
              </div>
            </section>

            {/* Chrome Feel */}
            <section className="px-4 py-4 space-y-3">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                Chrome Feel
              </span>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-neutral-700 dark:text-neutral-300">Density</span>
                <div className={SEGMENT_TRACK_CLS}>
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
                      className={`${segmentBtnCls(draftProfile.density === d)} capitalize`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-neutral-700 dark:text-neutral-300">Tab Shape</span>
                <div className={SEGMENT_TRACK_CLS}>
                  {(['floating', 'rounded', 'square'] as const).map((ts) => (
                    <button
                      key={ts}
                      type="button"
                      onClick={() => updateDraftTabStyle(ts)}
                      className={`${segmentBtnCls(draftTabStyle === ts)} capitalize`}
                    >
                      {ts}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-neutral-700 dark:text-neutral-300">Tab Motion</span>
                <div className={SEGMENT_TRACK_CLS}>
                  {(['chrome', 'smooth', 'snappy', 'none'] as const).map((ta) => (
                    <button
                      key={ta}
                      type="button"
                      onClick={() => updateDraftTabAnimation(ta)}
                      className={`${segmentBtnCls(draftTabAnimation === ta)} capitalize`}
                    >
                      {ta}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-neutral-700 dark:text-neutral-300">Material</span>
                <div className={SEGMENT_TRACK_CLS}>
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
                      className={segmentBtnCls(draftProfile.effects.windowMaterial === mat)}
                    >
                      {mat === 'opaque' ? 'Opaque' : 'Glass'}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between text-[12px] text-neutral-700 dark:text-neutral-300 cursor-pointer pt-1">
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
                  className="rounded accent-neutral-900 dark:accent-neutral-100 w-3.5 h-3.5 cursor-pointer"
                />
              </label>
            </section>

            {/* Collapsible Advanced Surface Inspector */}
            <section>
              <button
                type="button"
                data-action="toggle-advanced-surfaces"
                onClick={() => setIsAdvancedSurfacesOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-200">
                    Surface Inspector
                  </span>
                  {customizedZonesCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-neutral-200/80 dark:bg-white/[0.09] text-neutral-700 dark:text-neutral-300 text-[10px] font-mono tabular-nums">
                      {customizedZonesCount}
                    </span>
                  )}
                </div>
                {isAdvancedSurfacesOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                )}
              </button>

              {isAdvancedSurfacesOpen && (
                <div className="px-4 pb-4 space-y-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    {SURFACE_ZONE_IDS.map((zid) => {
                      const isSelected = selectedZone === zid;
                      const hasOverride = Boolean(draftProfile.surfaces[zid]);
                      return (
                        <button
                          key={zid}
                          type="button"
                          data-zone-pill={zid}
                          onClick={() => setSelectedZone(zid)}
                          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer border ${
                            isSelected
                              ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white'
                              : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/[0.16]'
                          }`}
                        >
                          <span>{SURFACE_ZONE_LABELS[zid]}</span>
                          {hasOverride && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-emerald-400 dark:bg-emerald-600' : 'bg-emerald-500'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-neutral-200/80 dark:border-white/[0.07] space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-medium text-[12px] text-neutral-900 dark:text-neutral-100 block">
                          {SURFACE_ZONE_LABELS[selectedZone]}
                        </span>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                          {SURFACE_ZONE_HINTS[selectedZone]}
                        </span>
                      </div>
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
                        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </div>

                    {/* Background Color */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-neutral-600 dark:text-neutral-400">Background</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={
                            currentZoneStyle.bg && /^#[0-9a-fA-F]{6}$/.test(currentZoneStyle.bg)
                              ? currentZoneStyle.bg
                              : '#18191c'
                          }
                          onChange={(e) => updateSelectedZone({ bg: e.target.value })}
                          className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
                        />
                        <SafeColorTextInput
                          value={currentZoneStyle.bg}
                          placeholder="#18191c"
                          onChange={(val) => updateSelectedZone({ bg: val })}
                          className="w-28 px-2 py-1 rounded-md bg-neutral-100 dark:bg-white/[0.06] border text-neutral-800 dark:text-neutral-200 text-[11px] font-mono"
                          aria-label="Zone background color"
                          data-testid="zone-bg-input"
                        />
                      </div>
                    </div>

                    {/* Text Color */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-neutral-600 dark:text-neutral-400">Text</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={
                            currentZoneStyle.textColor && /^#[0-9a-fA-F]{6}$/.test(currentZoneStyle.textColor)
                              ? currentZoneStyle.textColor
                              : '#f5f5f7'
                          }
                          onChange={(e) => updateSelectedZone({ textColor: e.target.value })}
                          className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
                        />
                        <SafeColorTextInput
                          value={currentZoneStyle.textColor}
                          placeholder="#f5f5f7"
                          onChange={(val) => updateSelectedZone({ textColor: val })}
                          className="w-28 px-2 py-1 rounded-md bg-neutral-100 dark:bg-white/[0.06] border text-neutral-800 dark:text-neutral-200 text-[11px] font-mono"
                          aria-label="Zone text color"
                          data-testid="zone-text-color-input"
                        />
                      </div>
                    </div>

                    {/* Muted Color */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-neutral-600 dark:text-neutral-400">Muted</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={
                            currentZoneStyle.mutedColor && /^#[0-9a-fA-F]{6}$/.test(currentZoneStyle.mutedColor)
                              ? currentZoneStyle.mutedColor
                              : '#9ca3af'
                          }
                          onChange={(e) => updateSelectedZone({ mutedColor: e.target.value })}
                          className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
                        />
                        <SafeColorTextInput
                          value={currentZoneStyle.mutedColor}
                          placeholder="#9ca3af"
                          onChange={(val) => updateSelectedZone({ mutedColor: val })}
                          className="w-28 px-2 py-1 rounded-md bg-neutral-100 dark:bg-white/[0.06] border text-neutral-800 dark:text-neutral-200 text-[11px] font-mono"
                          aria-label="Zone muted color"
                          data-testid="zone-muted-color-input"
                        />
                      </div>
                    </div>

                    {/* Opacity */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-600 dark:text-neutral-400">Opacity</span>
                        <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
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
                        className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
                      />
                    </div>

                    {selectedZone !== 'frame' && (
                      <>
                        {/* Blur */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-neutral-600 dark:text-neutral-400">Backdrop Blur</span>
                            <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
                              {currentZoneStyle.blur ?? 0}px
                            </span>
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
                            className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
                          />
                        </div>

                        {/* Border Width */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-neutral-600 dark:text-neutral-400">Border</span>
                          <div className={SEGMENT_TRACK_CLS}>
                            {[0, 1, 2].map((bw) => (
                              <button
                                key={bw}
                                type="button"
                                onClick={() => updateSelectedZone({ borderWidth: bw as any })}
                                className={`${segmentBtnCls((currentZoneStyle.borderWidth ?? 1) === bw)} font-mono`}
                              >
                                {bw}px
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Border Color */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-neutral-600 dark:text-neutral-400">Border Color</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={
                                currentZoneStyle.borderColor && /^#[0-9a-fA-F]{6}$/.test(currentZoneStyle.borderColor)
                                  ? currentZoneStyle.borderColor
                                  : '#334155'
                              }
                              onChange={(e) => updateSelectedZone({ borderColor: e.target.value })}
                              className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
                            />
                            <SafeColorTextInput
                              value={currentZoneStyle.borderColor}
                              placeholder="#334155"
                              onChange={(val) => updateSelectedZone({ borderColor: val })}
                              className="w-28 px-2 py-1 rounded-md bg-neutral-100 dark:bg-white/[0.06] border text-neutral-800 dark:text-neutral-200 text-[11px] font-mono"
                              aria-label="Zone border color"
                              data-testid="zone-border-color-input"
                            />
                          </div>
                        </div>

                        {/* Corner Radius */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-neutral-600 dark:text-neutral-400">Corner Radius</span>
                            <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
                              {currentZoneStyle.radius ?? 8}px
                            </span>
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
                            className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
                          />
                        </div>

                        {/* Shadow */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-neutral-600 dark:text-neutral-400">Shadow</span>
                          <select
                            value={currentZoneStyle.shadow || 'none'}
                            onChange={(e) => updateSelectedZone({ shadow: e.target.value as any })}
                            className={SELECT_CLS}
                          >
                            <option value="none">None</option>
                            <option value="soft">Soft</option>
                            <option value="elevated">Elevated</option>
                            <option value="glow">Glow</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: New Tab Widgets & Collapsible Custom CSS */}
        {/* ================================================================= */}
        {activeTab === 'newtab-css' && (
          <div className="divide-y divide-neutral-200/80 dark:divide-white/[0.07]">
            {/* Clock */}
            <section className="px-4 py-3.5 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-200">Clock</span>
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
                  className="rounded accent-neutral-900 dark:accent-neutral-100 w-3.5 h-3.5 cursor-pointer"
                />
              </label>
              {draftProfile.newTabLayout.clock.visible && (
                <div className="grid grid-cols-3 gap-1.5">
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
                    className={SELECT_CLS}
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
                    className={SELECT_CLS}
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
                    className={SELECT_CLS}
                  >
                    <option value="center">Center</option>
                    <option value="left">Left</option>
                  </select>
                </div>
              )}
            </section>

            {/* Greeting */}
            <section className="px-4 py-3.5 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-200">Greeting</span>
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
                  className="rounded accent-neutral-900 dark:accent-neutral-100 w-3.5 h-3.5 cursor-pointer"
                />
              </label>
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
                  className="w-full px-2.5 py-1.5 rounded-md bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.09] text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 text-[11px] focus:outline-none focus:border-neutral-400 dark:focus:border-white/30"
                />
              )}
            </section>

            {/* Search Box */}
            <section className="px-4 py-3.5 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-200">Search Box</span>
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
                  className="rounded accent-neutral-900 dark:accent-neutral-100 w-3.5 h-3.5 cursor-pointer"
                />
              </label>
              {draftProfile.newTabLayout.searchBox.visible && (
                <div className="grid grid-cols-2 gap-1.5">
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
                    className={SELECT_CLS}
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
                    className={SELECT_CLS}
                  >
                    <option value="narrow">Narrow</option>
                    <option value="medium">Medium</option>
                    <option value="wide">Wide</option>
                  </select>
                </div>
              )}
            </section>

            {/* Shortcuts Grid */}
            <section className="px-4 py-3.5 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-200">Shortcuts Grid</span>
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
                  className="rounded accent-neutral-900 dark:accent-neutral-100 w-3.5 h-3.5 cursor-pointer"
                />
              </label>
              {draftProfile.newTabLayout.shortcuts.visible && (
                <div className="grid grid-cols-2 gap-1.5">
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
                    className={SELECT_CLS}
                  >
                    {[4, 5, 6, 7, 8].map((c) => (
                      <option key={c} value={c}>
                        {c} columns
                      </option>
                    ))}
                  </select>
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
                    className={SELECT_CLS}
                  >
                    <option value="tile">Tile</option>
                    <option value="pill">Pill</option>
                    <option value="icon-only">Icon Only</option>
                    <option value="compact">Compact</option>
                  </select>
                </div>
              )}
            </section>

            {/* Tasks Widget */}
            <section className="px-4 py-3.5 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-200">Tasks Widget</span>
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
                  className="rounded accent-neutral-900 dark:accent-neutral-100 w-3.5 h-3.5 cursor-pointer"
                />
              </label>
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
                  className={`w-full ${SELECT_CLS}`}
                >
                  <option value="bottom">Bottom Horizontal</option>
                  <option value="left">Left Sidebar</option>
                  <option value="right">Right Docked</option>
                  <option value="floating">Floating Panel</option>
                </select>
              )}
            </section>

            {/* Collapsible Custom CSS */}
            <section>
              <button
                type="button"
                data-action="toggle-advanced-css"
                onClick={() => setIsCustomCssOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-200">
                    Custom CSS
                  </span>
                  {draftProfile.customCss.enabled && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">
                      On
                    </span>
                  )}
                </div>
                {isCustomCssOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                )}
              </button>

              {isCustomCssOpen && (
                <div className="px-4 pb-4 space-y-2.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
                      Enable scoped stylesheet
                    </span>
                    <input
                      type="checkbox"
                      checked={draftProfile.customCss.enabled}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          customCss: { ...prev.customCss, enabled: e.target.checked },
                        }))
                      }
                      className="rounded accent-neutral-900 dark:accent-neutral-100 w-3.5 h-3.5 cursor-pointer"
                    />
                  </label>

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
                    placeholder="/* Scoped CSS rules (e.g. #nova-app { ... }) */"
                    className="w-full p-2.5 rounded-md bg-neutral-100 dark:bg-[#0b0c0e] border border-neutral-200 dark:border-white/[0.09] text-neutral-800 dark:text-neutral-200 font-mono text-[11px] leading-relaxed resize-y focus:outline-none focus:border-neutral-400 dark:focus:border-white/30"
                  />

                  {cssAnalysis.warnings.length > 0 ? (
                    <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] space-y-1">
                      <div className="font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>CSS Warnings ({cssAnalysis.warnings.length})</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 pl-1 opacity-90">
                        {cssAnalysis.warnings.map((warn, i) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>CSS rules verified safe.</span>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Integrated Sticky Footer Action Bar */}
      <div
        data-studio-footer="true"
        className="px-3.5 py-2.5 border-t border-neutral-200/90 dark:border-white/[0.08] bg-neutral-50/90 dark:bg-[#141518] flex items-center justify-between gap-2 shrink-0"
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-action="undo"
            onClick={undo}
            disabled={!canUndo}
            title="Undo last change"
            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
              canUndo
                ? 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-white/[0.08] cursor-pointer'
                : 'text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            data-action="reset"
            onClick={resetToDefault}
            title="Reset to default design"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-action="cancel"
            onClick={discard}
            title="Discard unsaved changes"
            className="px-2.5 py-1.5 rounded-md text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            data-action="save"
            onClick={commit}
            title="Save and exit Design Studio"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 text-[11px] font-semibold transition-colors cursor-pointer active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
