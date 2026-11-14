import React, { useCallback, useId, useRef, useState } from 'react';
import {
  Paintbrush,
  X,
  MoveHorizontal,
  Layout,
  Palette,
  Sparkles,
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
  Code2,
  Sliders,
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
  toolbar: 'Main navigation bar, icons & bookmarks strip',
  tabBar: 'Top or bottom browser tab strip background',
  activeTab: 'Currently focused tab pill/surface',
  inactiveTab: 'Background tabs in the strip',
  omnibox: 'URL & search input bar pill',
  sidebar: 'Vertical tabs sidebar panel (Vertical Left/Right)',
  aiPanel: 'Right/side Nova AI chat drawer',
  popovers: 'Menus, downloads, shield & omnibox dropdowns',
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
    swatchA: '#1e293b',
    swatchB: '#3b82f6',
    surfaces: {},
  },
  {
    id: 'midnight-ink',
    label: 'Midnight Ink',
    subtitle: 'Deep obsidian contrast',
    swatchA: '#090d16',
    swatchB: '#111827',
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
    subtitle: 'Translucent blur',
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
        isInvalid ? 'border-amber-500/80 focus:border-amber-500' : 'border-slate-300 dark:border-slate-700'
      }`}
    />
  );
};

const ChromeModeWireframe: React.FC<{ mode: ChromeMode; selected: boolean }> = ({ mode, selected }) => {
  const barCls = selected ? 'bg-blue-500/60 dark:bg-blue-400/50' : 'bg-slate-400/70 dark:bg-slate-600/60';
  const subCls = selected ? 'bg-blue-400/40 dark:bg-blue-300/30' : 'bg-slate-300 dark:bg-slate-700/60';
  if (mode === 'compact-single-row') {
    return (
      <div className="w-full h-9 rounded-lg bg-slate-200/80 dark:bg-slate-950/70 border border-slate-300/80 dark:border-white/10 p-1 flex flex-col gap-1">
        <div className={`h-2.5 w-full rounded ${barCls}`} />
        <div className="flex-1 rounded bg-white/90 dark:bg-slate-900/80" />
      </div>
    );
  }
  if (mode === 'vertical-left') {
    return (
      <div className="w-full h-9 rounded-lg bg-slate-200/80 dark:bg-slate-950/70 border border-slate-300/80 dark:border-white/10 p-1 flex gap-1">
        <div className={`w-3.5 h-full rounded ${barCls}`} />
        <div className="flex-1 flex flex-col gap-1">
          <div className={`h-2 w-full rounded ${subCls}`} />
          <div className="flex-1 rounded bg-white/90 dark:bg-slate-900/80" />
        </div>
      </div>
    );
  }
  if (mode === 'vertical-right') {
    return (
      <div className="w-full h-9 rounded-lg bg-slate-200/80 dark:bg-slate-950/70 border border-slate-300/80 dark:border-white/10 p-1 flex gap-1">
        <div className="flex-1 flex flex-col gap-1">
          <div className={`h-2 w-full rounded ${subCls}`} />
          <div className="flex-1 rounded bg-white/90 dark:bg-slate-900/80" />
        </div>
        <div className={`w-3.5 h-full rounded ${barCls}`} />
      </div>
    );
  }
  return (
    <div className="w-full h-9 rounded-lg bg-slate-200/80 dark:bg-slate-950/70 border border-slate-300/80 dark:border-white/10 p-1 flex flex-col gap-1">
      <div className={`h-1.5 w-full rounded ${barCls}`} />
      <div className={`h-2 w-full rounded ${subCls}`} />
      <div className="flex-1 rounded bg-white/90 dark:bg-slate-900/80" />
    </div>
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

  const tabs: Array<{ id: StudioTabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'templates', label: 'Themes', icon: Palette },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'zones', label: 'Style', icon: Paintbrush },
    { id: 'newtab-css', label: 'New Tab', icon: Sparkles },
  ];

  return (
    <div
      data-design-studio-drawer="true"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      className={`fixed ${drawerTopClass} bottom-[72px] ${
        dockSide === 'right'
          ? 'right-3 slide-in-from-right-4'
          : 'left-3 slide-in-from-left-4'
      } w-[356px] max-w-[calc(100vw-1.5rem)] z-[995] select-none pointer-events-auto no-drag flex flex-col rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 border border-slate-200/90 dark:border-white/15 shadow-2xl backdrop-blur-xl overflow-hidden font-sans text-xs animate-in fade-in duration-200`}
    >
      {/* Studio Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/90 dark:bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/25 dark:border-blue-500/30">
            <Paintbrush className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="font-semibold text-[13px] text-slate-900 dark:text-slate-100 leading-tight">Live Design Studio</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {editingScope === 'workspace'
                ? `Workspace: ${activeWorkspaceName || 'Active'}`
                : 'Global Browser Theme'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDockSide(dockSide === 'right' ? 'left' : 'right')}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title={`Dock to ${dockSide === 'right' ? 'Left' : 'Right'}`}
            aria-label={`Dock Studio to ${dockSide === 'right' ? 'Left' : 'Right'}`}
          >
            <MoveHorizontal className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={discard}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-500/10 dark:hover:bg-red-500/15 transition-colors cursor-pointer"
            title="Discard changes & exit"
            aria-label="Close Design Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4-Tab Segmented Navigation */}
      <div className="grid grid-cols-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-100/75 dark:bg-slate-950/75 p-1.5 gap-1 shrink-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              data-studio-tab={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-1.5 px-1 rounded-xl font-medium flex flex-col items-center gap-0.5 transition-all text-[11px] cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 dark:shadow-blue-900/40'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/70 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-slate-700 dark:text-slate-300">
        {/* ================================================================= */}
        {/* TAB 1: Themes & Scope */}
        {/* ================================================================= */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            {/* Scope Selector */}
            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Editing Scope</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {editingScope === 'global' ? 'Applies everywhere' : 'This workspace only'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-950/75 border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => switchScope('global')}
                  className={`py-1.5 px-2 rounded-md font-medium text-xs transition-all cursor-pointer ${
                    editingScope === 'global'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
                  }`}
                >
                  Global Design
                </button>
                <button
                  type="button"
                  onClick={() => switchScope('workspace')}
                  className={`py-1.5 px-2 rounded-md font-medium text-xs transition-all truncate cursor-pointer ${
                    editingScope === 'workspace'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
                  }`}
                  title={activeWorkspaceName || 'This Workspace'}
                >
                  {activeWorkspaceName ? `${activeWorkspaceName}` : 'This Workspace'}
                </button>
              </div>

              {editingScope === 'workspace' && activeWorkspaceId && hasActiveWorkspaceOverride && (
                <button
                  type="button"
                  data-action="clear-workspace-override"
                  onClick={clearWorkspaceOverride}
                  className="w-full py-1.5 px-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60 dark:border-red-800/50 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Clear Workspace Override
                </button>
              )}
            </div>

            {/* Starter Templates */}
            <div>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Starter Themes</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{STARTER_DESIGN_TEMPLATES.length} presets</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                          ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/12 shadow-sm ring-1 ring-blue-500/40'
                          : 'border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">{tmpl.name}</div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-snug">
                            {tmpl.description}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      <div className="h-2 w-full rounded-full overflow-hidden flex border border-slate-200 dark:border-white/10">
                        <div className="flex-1 h-full" style={{ backgroundColor: tmpl.previewBg }} />
                        <div className="w-6 h-full" style={{ backgroundColor: tmpl.previewAccent }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme Pack Import / Export */}
            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Share Theme Pack</span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">.novatheme.json</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-action="export-theme-pack"
                  onClick={exportPack}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 font-medium text-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  data-action="import-theme-pack"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 font-medium text-xs transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/60'
                      : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800/60'
                  }`}
                >
                  {importStatus.type === 'success' ? (
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  )}
                  <span>{importStatus.message}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: Layout & Draggable Toolbar Builder */}
        {/* ================================================================= */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            {/* Chrome Mode */}
            <div>
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 block mb-2 px-0.5">Browser Shell Layout</span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'classic-top', label: 'Classic Top', desc: 'Tabs & bar stacked' },
                    { id: 'compact-single-row', label: 'Compact Row', desc: 'Single unified strip' },
                    { id: 'vertical-left', label: 'Vertical Left', desc: 'Sidebar on left' },
                    { id: 'vertical-right', label: 'Vertical Right', desc: 'Sidebar on right' },
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
                      className={`p-2.5 rounded-xl border text-left transition-all space-y-2 cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/12 text-slate-900 dark:text-white ring-1 ring-blue-500/40'
                          : 'border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <ChromeModeWireframe mode={mode.id} selected={isSelected} />
                      <div>
                        <div className="font-semibold text-xs leading-tight">{mode.label}</div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{mode.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Bar Position (only classic-top) */}
            {draftProfile.layout.chromeMode === 'classic-top' && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10">
                <div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Tab Strip Position</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Relative to address bar</p>
                </div>
                <div className="flex rounded-lg bg-slate-200/80 dark:bg-slate-950/75 p-0.5 border border-slate-200 dark:border-white/10">
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
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
                        draftProfile.layout.tabBarPosition === pos
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {pos === 'above-toolbar' ? 'Above' : 'Below'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Omnibox Max Width */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10">
              <div>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Address Bar Width</span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">URL bar horizontal span</p>
              </div>
              <div className="flex rounded-lg bg-slate-200/80 dark:bg-slate-950/75 p-0.5 border border-slate-200 dark:border-white/10">
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
                    className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize cursor-pointer transition-colors ${
                      draftProfile.layout.omniboxMaxWidth === w
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Sidebar Options */}
            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Vertical Sidebar</span>
                {!isVerticalMode && (
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        layout: { ...prev.layout, chromeMode: 'vertical-left' },
                      }))
                    }
                    className="px-2 py-0.5 rounded-md bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:bg-blue-600/20 dark:hover:bg-blue-600/35 dark:text-blue-300 text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    Enable Vertical
                  </button>
                )}
              </div>

              <div className={`space-y-2 transition-opacity ${!isVerticalMode ? 'opacity-55' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 dark:text-slate-300">Sidebar Width</span>
                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{draftProfile.layout.sidebarWidth}px</span>
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

                <div className="grid grid-cols-2 gap-1.5 pt-1">
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
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
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
                          className="rounded accent-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Active Toolbar Items (Draggable & Interactive List) */}
            <div data-active-toolbar-list="true" className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Toolbar Buttons</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Drag rows here or directly on the top bar</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-950/75 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                  {draftProfile.layout.toolbarItems.length}
                </span>
              </div>

              <div className="space-y-1">
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
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950/70 border transition-all cursor-grab active:cursor-grabbing ${
                        isDropTarget
                          ? 'border-blue-500 ring-1 ring-blue-500/50 bg-blue-50 dark:bg-blue-500/10'
                          : 'border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15'
                      } ${!slot.visible ? 'opacity-55' : ''} ${isBeingDragged ? 'opacity-35 scale-[0.98]' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <GripVertical className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                        <div className="w-5 h-5 rounded bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">{meta.label}</span>
                        {!slot.visible && (
                          <span className="text-[9px] uppercase tracking-wider px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 shrink-0">
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
                          className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
                          className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
                          className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          {slot.visible ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-amber-500 dark:text-amber-400" />
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
                            className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/20 cursor-pointer transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Palette Drawer inside Toolbar Card */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPaletteOpen((p) => !p)}
                  className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1 cursor-pointer"
                >
                  <span>Add Controls Palette ({paletteItems.length})</span>
                  {isPaletteOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {isPaletteOpen && (
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
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
                          className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-400/50 transition-colors cursor-grab active:cursor-grabbing"
                          title={`Drag onto toolbar or click + to add ${meta.label}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Icon className="w-3 h-3 text-slate-600 dark:text-slate-300 shrink-0" />
                            <span className="text-[11px] text-slate-800 dark:text-slate-200 truncate">{meta.label}</span>
                          </div>
                          <button
                            type="button"
                            data-action="add-toolbar-item"
                            onClick={() => handleAddPaletteItem(kind)}
                            className="p-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white shrink-0 cursor-pointer transition-colors"
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
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: Style (Quick Presets + Typography + Advanced Surfaces) */}
        {/* ================================================================= */}
        {activeTab === 'zones' && (
          <div className="space-y-4">
            {/* Quick Surface & Material Presets */}
            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Quick Style Presets</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">1-click glass &amp; colors</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_SURFACE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    data-surface-preset={preset.id}
                    onClick={() => applyQuickSurfacePreset(preset)}
                    className="p-2 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-950/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-400/50 text-left transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-md overflow-hidden flex border border-slate-300/80 dark:border-white/15 shrink-0">
                      <span className="w-3 h-full" style={{ backgroundColor: preset.swatchA }} />
                      <span className="w-3 h-full" style={{ backgroundColor: preset.swatchB }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">{preset.label}</div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">{preset.subtitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Typography & Font Family */}
            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 space-y-3">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Typography</span>
              <div className="grid grid-cols-2 gap-1.5">
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
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/12 dark:bg-blue-500/15 text-slate-900 dark:text-white ring-1 ring-blue-500/30'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="font-semibold text-xs block truncate">{f.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Aa Bb Gg 123</span>
                    </button>
                  );
                })}
              </div>

              {/* Scale Sliders */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-700 dark:text-slate-300">UI Scale</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">
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
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-700 dark:text-slate-300">Icons</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">
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
            </div>

            {/* Chrome Feel: Density, Tabs, Window Material */}
            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 dark:text-slate-300">UI Density</span>
                <div className="flex rounded-lg bg-slate-200/80 dark:bg-slate-950/75 p-0.5 border border-slate-200 dark:border-white/10">
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
                      className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize cursor-pointer ${
                        draftProfile.density === d
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 dark:text-slate-300">Tab Shape</span>
                <div className="flex rounded-lg bg-slate-200/80 dark:bg-slate-950/75 p-0.5 border border-slate-200 dark:border-white/10">
                  {(['floating', 'rounded', 'square'] as const).map((ts) => (
                    <button
                      key={ts}
                      type="button"
                      onClick={() => updateDraftTabStyle(ts)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize cursor-pointer ${
                        draftTabStyle === ts
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {ts}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 dark:text-slate-300">Tab Motion</span>
                <div className="flex rounded-lg bg-slate-200/80 dark:bg-slate-950/75 p-0.5 border border-slate-200 dark:border-white/10">
                  {(['chrome', 'smooth', 'snappy', 'none'] as const).map((ta) => (
                    <button
                      key={ta}
                      type="button"
                      onClick={() => updateDraftTabAnimation(ta)}
                      className={`px-1.5 py-1 rounded-md text-[11px] font-medium capitalize cursor-pointer ${
                        draftTabAnimation === ta
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {ta}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 dark:border-white/10">
                <span className="text-xs text-slate-700 dark:text-slate-300">Window Material</span>
                <div className="flex rounded-lg bg-slate-200/80 dark:bg-slate-950/75 p-0.5 border border-slate-200 dark:border-white/10">
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
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                        draftProfile.effects.windowMaterial === mat
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {mat === 'opaque' ? 'Opaque' : 'Glass'}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
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

            {/* Collapsible Advanced Surface Inspector */}
            <div className="rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 overflow-hidden">
              <button
                type="button"
                data-action="toggle-advanced-surfaces"
                onClick={() => setIsAdvancedSurfacesOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Advanced Surface Inspector</span>
                  {customizedZonesCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-medium">
                      {customizedZonesCount}
                    </span>
                  )}
                </div>
                {isAdvancedSurfacesOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                )}
              </button>

              {isAdvancedSurfacesOpen && (
                <div className="p-3 pt-1 border-t border-slate-200/80 dark:border-white/10 space-y-3">
                  {/* Zone Selector Pills */}
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
                          className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-950/75 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5'
                          }`}
                        >
                          <span>{SURFACE_ZONE_LABELS[zid]}</span>
                          {hasOverride && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Zone Controls */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 space-y-3">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 dark:border-white/10 pb-2">
                      <div>
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
                          {SURFACE_ZONE_LABELS[selectedZone]}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{SURFACE_ZONE_HINTS[selectedZone]}</span>
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
                        className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </div>

                    {/* Background Color */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-700 dark:text-slate-300">Background</span>
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
                          placeholder="#1e293b"
                          onChange={(val) => updateSelectedZone({ bg: val })}
                          className="w-32 px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border text-slate-800 dark:text-slate-200 text-xs font-mono"
                          aria-label="Zone background color"
                          data-testid="zone-bg-input"
                        />
                      </div>
                    </div>

                    {/* Text Color */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-700 dark:text-slate-300">Text Color</span>
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
                          className="w-32 px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border text-slate-800 dark:text-slate-200 text-xs font-mono"
                          aria-label="Zone text color"
                          data-testid="zone-text-color-input"
                        />
                      </div>
                    </div>

                    {/* Muted Color */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-700 dark:text-slate-300">Muted Color</span>
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
                          className="w-32 px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border text-slate-800 dark:text-slate-200 text-xs font-mono"
                          aria-label="Zone muted color"
                          data-testid="zone-muted-color-input"
                        />
                      </div>
                    </div>

                    {/* Opacity Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-700 dark:text-slate-300">Opacity</span>
                        <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
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

                    {selectedZone !== 'frame' && (
                      <>
                        {/* Blur Slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-700 dark:text-slate-300">Backdrop Blur</span>
                            <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{currentZoneStyle.blur ?? 0}px</span>
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
                            <span className="text-xs text-slate-700 dark:text-slate-300">Border Width</span>
                            <div className="flex gap-1">
                              {[0, 1, 2].map((bw) => (
                                <button
                                  key={bw}
                                  type="button"
                                  onClick={() => updateSelectedZone({ borderWidth: bw as any })}
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                                    (currentZoneStyle.borderWidth ?? 1) === bw
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-transparent'
                                  }`}
                                >
                                  {bw}px
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-700 dark:text-slate-300">Border Color</span>
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
                                className="w-32 px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border text-slate-800 dark:text-slate-200 text-xs font-mono"
                                aria-label="Zone border color"
                                data-testid="zone-border-color-input"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Corner Radius Slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-700 dark:text-slate-300">Corner Radius</span>
                            <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{currentZoneStyle.radius ?? 8}px</span>
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
                          <span className="text-xs text-slate-700 dark:text-slate-300">Shadow</span>
                          <select
                            value={currentZoneStyle.shadow || 'none'}
                            onChange={(e) => updateSelectedZone({ shadow: e.target.value as any })}
                            className="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs"
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
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: New Tab Widgets & Collapsible Custom CSS */}
        {/* ================================================================= */}
        {activeTab === 'newtab-css' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 space-y-3">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">New Tab Page Widgets</span>

              {/* Clock */}
              <div className="space-y-1.5 pb-2.5 border-b border-slate-200/80 dark:border-white/10">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-800 dark:text-slate-200">Clock</span>
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
                </label>
                {draftProfile.newTabLayout.clock.visible && (
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
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
                      className="px-2 py-1 rounded-md bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-[11px] text-slate-800 dark:text-slate-200"
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
                      className="px-2 py-1 rounded-md bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-[11px] text-slate-800 dark:text-slate-200"
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
                      className="px-2 py-1 rounded-md bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-[11px] text-slate-800 dark:text-slate-200"
                    >
                      <option value="center">Center</option>
                      <option value="left">Left</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Greeting */}
              <div className="space-y-1.5 pb-2.5 border-b border-slate-200/80 dark:border-white/10">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-800 dark:text-slate-200">Greeting</span>
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
                    className="w-full px-2.5 py-1 rounded-md bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 text-xs"
                  />
                )}
              </div>

              {/* Search Box */}
              <div className="space-y-1.5 pb-2.5 border-b border-slate-200/80 dark:border-white/10">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-800 dark:text-slate-200">Search Box</span>
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
                </label>
                {draftProfile.newTabLayout.searchBox.visible && (
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
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
                      className="px-2 py-1 rounded-md bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-[11px] text-slate-800 dark:text-slate-200"
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
                      className="px-2 py-1 rounded-md bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-[11px] text-slate-800 dark:text-slate-200"
                    >
                      <option value="narrow">Narrow</option>
                      <option value="medium">Medium</option>
                      <option value="wide">Wide</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Shortcuts */}
              <div className="space-y-1.5 pb-2.5 border-b border-slate-200/80 dark:border-white/10">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-800 dark:text-slate-200">Shortcuts Grid</span>
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
                </label>
                {draftProfile.newTabLayout.shortcuts.visible && (
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
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
                      className="px-2 py-1 rounded-md bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-[11px] text-slate-800 dark:text-slate-200"
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
                      className="px-2 py-1 rounded-md bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-[11px] text-slate-800 dark:text-slate-200"
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
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-800 dark:text-slate-200">Tasks Widget</span>
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
                    className="w-full px-2 py-1 rounded-md bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-[11px] text-slate-800 dark:text-slate-200"
                  >
                    <option value="bottom">Bottom Horizontal</option>
                    <option value="left">Left Sidebar</option>
                    <option value="right">Right Docked</option>
                    <option value="floating">Floating Panel</option>
                  </select>
                )}
              </div>
            </div>

            {/* Collapsible Advanced: Custom CSS */}
            <div className="rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 overflow-hidden">
              <button
                type="button"
                data-action="toggle-advanced-css"
                onClick={() => setIsCustomCssOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Advanced: Custom CSS</span>
                  {draftProfile.customCss.enabled && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">
                      Active
                    </span>
                  )}
                </div>
                {isCustomCssOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                )}
              </button>

              {isCustomCssOpen && (
                <div className="p-3 pt-2 border-t border-slate-200/80 dark:border-white/10 space-y-2.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">Enable Custom Stylesheet</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Scoped user CSS overrides</span>
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
                    placeholder="/* Add custom CSS rules here (e.g. #nova-app { ... }) */"
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] leading-relaxed resize-y focus:outline-none focus:border-blue-500"
                  />

                  {cssAnalysis.warnings.length > 0 ? (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-200 text-[10px] space-y-1">
                      <div className="font-semibold flex items-center gap-1 text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-3 h-3" />
                        <span>CSS Warnings ({cssAnalysis.warnings.length}):</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-700/90 dark:text-amber-200/90 pl-1">
                        {cssAnalysis.warnings.map((warn, i) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle className="w-3 h-3" />
                      <span>CSS rules verified safe.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
