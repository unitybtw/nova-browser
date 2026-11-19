import React, { useRef, useState } from 'react';
import { RotateCcw, Shuffle, Check, Images, SlidersHorizontal, Download, Upload, AlertCircle } from 'lucide-react';
import { ChromeMode, UserSettings } from '../../types/browser';
import { useLiveUnsplashPhoto } from '../../utils/unsplash';
import { TabAnimationPreviewBox } from './TabAnimationPreviewBox';
import { ToggleSwitch } from './ToggleSwitch';
import { SmoothCollapse } from './SmoothCollapse';
import { BackgroundPreviewCard, BACKGROUND_OPTIONS } from './BackgroundPreviewCard';
import { STARTER_DESIGN_TEMPLATES, getStarterTemplateById } from '../../utils/designTemplates';
import { createDefaultDesignProfile } from '../../utils/designDefaults';
import { resolveEffectiveDesign } from '../../utils/designEngine';
import { exportThemePack, importThemePack, sanitizeDesignProfile } from '../../utils/designSecurity';
import {
  SETTINGS_INPUT_CLS,
  SettingsBadge,
  SettingsButton,
  SettingsGroup,
  SettingsPageHeader,
  SettingsRow,
  SettingsSegment,
} from './SettingsPrimitives';
import { ChromeMiniPreview } from '../customization/ChromeMiniPreview';

export interface AppearanceSectionProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  activeWorkspaceId?: string;
  onOpenCustomizeMode?: () => void;
}

const DailyWallpaperSection = () => {
  const {
    photo: currentPhoto,
    photos,
    isUserOverride,
    shuffleNext,
    selectPhoto,
    resetToDaily,
  } = useLiveUnsplashPhoto();

  return (
    <div className="mt-4 p-4 bg-neutral-50/70 dark:bg-white/[0.02] rounded-xl border border-neutral-200/80 dark:border-white/[0.08] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
              Daily 4K Wallpaper
            </h3>
            {isUserOverride && (
              <SettingsBadge tone="warning">Custom Choice</SettingsBadge>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Automatically updates daily with curated 4K photography. Synchronized across all tabs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SmoothCollapse isOpen={Boolean(isUserOverride)} className="inline-grid">
            {isUserOverride && (
              <SettingsButton
                variant="secondary"
                onClick={resetToDaily}
                title="Reset to today's official wallpaper"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Today</span>
              </SettingsButton>
            )}
          </SmoothCollapse>
          <SettingsButton variant="secondary" onClick={shuffleNext}>
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle Next</span>
          </SettingsButton>
        </div>
      </div>

      {currentPhoto && (
        <div className="w-full aspect-video max-h-[300px] rounded-xl overflow-hidden bg-neutral-950 border border-neutral-200/80 dark:border-white/[0.08] relative">
          <img
            src={currentPhoto.imageUrl}
            alt={currentPhoto.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end p-4">
            <div className="text-white flex items-center justify-between w-full gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{currentPhoto.title}</p>
                <p className="text-[11px] text-white/70 truncate">
                  {currentPhoto.author} · {currentPhoto.source}{' '}
                  {currentPhoto.resolution ? `(${currentPhoto.resolution})` : ''}
                </p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/50 border border-white/20 text-white font-medium flex items-center gap-1 shrink-0">
                <Check className="w-3 h-3" /> Active
              </span>
            </div>
          </div>
        </div>
      )}

      {photos && photos.length > 0 && (
        <div className="pt-3 border-t border-neutral-200/80 dark:border-white/[0.07] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Images className="w-3.5 h-3.5 text-neutral-500" />
              4K Wallpaper Gallery ({photos.length} photos)
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
              Click any photo to apply immediately
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[280px] overflow-y-auto pr-1">
            {photos.map((p) => {
              const isActive = p.id === currentPhoto?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPhoto(p.id)}
                  className={`group relative aspect-video rounded-lg overflow-hidden border text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'ring-2 ring-neutral-900 dark:ring-white border-neutral-900 dark:border-white'
                      : 'border-neutral-200/80 dark:border-white/[0.08] hover:border-neutral-400 dark:hover:border-white/30 opacity-85 hover:opacity-100'
                  }`}
                  title={`${p.title} - ${p.author}`}
                >
                  <img
                    src={p.thumbnailUrl}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex flex-col justify-end p-1.5">
                    <p className="text-[10px] text-white font-medium truncate">{p.title}</p>
                    <p className="text-[9px] text-white/70 truncate">{p.author}</p>
                  </div>
                  {isActive && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-neutral-950/90 text-white text-[9px] font-semibold flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" />
                      <span>Active</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  settings,
  onUpdateSettings,
  activeWorkspaceId,
  onOpenCustomizeMode,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [themePackMsg, setThemePackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLaunchStudio = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nova-open-customize-mode'));
    }
    onOpenCustomizeMode?.();
  };

  const handleApplyTemplate = (tmplId: string) => {
    const tmpl = getStarterTemplateById(tmplId);
    if (!tmpl) return;
    const isVertical =
      tmpl.profile.layout.chromeMode === 'vertical-left' ||
      tmpl.profile.layout.chromeMode === 'vertical-right';
    onUpdateSettings({
      designProfile: sanitizeDesignProfile({
        ...tmpl.profile,
        meta: { ...tmpl.profile.meta, baseTemplateId: tmpl.id },
      }),
      useVerticalTabs: isVertical,
      showTasksWidget: tmpl.profile.newTabLayout.tasksWidget.visible,
    });
  };

  const handleExportThemePack = () => {
    const profile = settings.designProfile || createDefaultDesignProfile();
    const json = exportThemePack(profile);
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const slug =
          (profile.meta.name || 'theme')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'nova-theme';
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}.novatheme.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (_) {}
    }
  };

  const handleImportThemePack = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const res = importThemePack(text);
        if (res.ok) {
          const isVertical =
            res.profile.layout.chromeMode === 'vertical-left' ||
            res.profile.layout.chromeMode === 'vertical-right';
          onUpdateSettings({
            designProfile: sanitizeDesignProfile(res.profile),
            useVerticalTabs: isVertical,
            showTasksWidget: res.profile.newTabLayout.tasksWidget.visible,
          });
          setThemePackMsg({ type: 'success', text: `Imported theme "${res.profile.meta.name}"` });
        } else {
          setThemePackMsg({ type: 'error', text: res.error || 'Failed to import theme pack' });
        }
      } catch (err: any) {
        setThemePackMsg({ type: 'error', text: err?.message || 'Invalid theme file' });
      }
    };
    reader.onerror = () => {
      setThemePackMsg({ type: 'error', text: 'Failed to read theme file from disk' });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetAllCustomizations = () => {
    onUpdateSettings({
      designProfile: undefined,
      workspaceDesigns: undefined,
      browserColor: 'default',
      accentColor: 'blue',
      tabStyle: 'floating',
      tabAnimation: 'chrome',
      useVerticalTabs: false,
      showTasksWidget: true,
    });
  };

  const hasWsOverride = Boolean(
    activeWorkspaceId &&
      settings.workspaceDesigns &&
      Object.prototype.hasOwnProperty.call(settings.workspaceDesigns, activeWorkspaceId) &&
      settings.workspaceDesigns[activeWorkspaceId]
  );
  const resolved = resolveEffectiveDesign(settings, activeWorkspaceId, false);
  const chromeModeLabels: Record<ChromeMode, string> = {
    'classic-top': resolved.layout.tabBarPosition === 'below-toolbar' ? 'Tabs Below Bar' : 'Classic Top',
    'compact-single-row': 'Compact Row',
    'vertical-left': 'Vertical Left',
    'vertical-right': 'Vertical Right',
  };
  const activeTemplateName =
    getStarterTemplateById(resolved.meta.baseTemplateId || '')?.name ||
    resolved.meta.name ||
    'Nova Default';

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <SettingsPageHeader
        title="Appearance"
        description="Browser layout, starter themes, color surfaces, tab physics, and New Tab wallpaper."
      />

      {/* DESIGN STUDIO NATIVE SETTINGS BLOCK */}
      <SettingsGroup
        title="Design Studio"
        right={
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span>
              {activeTemplateName} · {chromeModeLabels[resolved.layout.chromeMode]}
            </span>
            {hasWsOverride && <SettingsBadge>Workspace Override</SettingsBadge>}
          </div>
        }
      >
        {/* Row 1: Launcher */}
        <SettingsRow
          title="Customize Browser Layout & Surfaces"
          description="Adjust tab geometry, reorder toolbar controls, style surfaces, and configure New Tab widgets live."
        >
          <SettingsButton
            variant="primary"
            size="md"
            data-action="launch-design-studio"
            onClick={handleLaunchStudio}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Customize Browser</span>
            <kbd className="hidden sm:inline-block ml-0.5 px-1.5 py-0.5 rounded bg-white/15 dark:bg-black/10 text-[10px] font-mono opacity-80">
              ⇧⌘E
            </kbd>
          </SettingsButton>
        </SettingsRow>

        {/* Row 2: Visual Starter Layouts */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Starter Layouts
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
              Click any layout to apply
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {STARTER_DESIGN_TEMPLATES.map((tmpl) => {
              const isSelected = settings.designProfile?.meta.baseTemplateId === tmpl.id;
              const layoutTag =
                tmpl.profile.layout.chromeMode === 'compact-single-row'
                  ? 'Compact Row'
                  : tmpl.profile.layout.chromeMode === 'vertical-left'
                  ? 'Vertical Left'
                  : tmpl.profile.layout.chromeMode === 'vertical-right'
                  ? 'Vertical Right'
                  : tmpl.profile.layout.tabBarPosition === 'below-toolbar'
                  ? 'Tabs Below'
                  : tmpl.profile.effects.windowMaterial === 'glass-vibrancy'
                  ? 'Glass Vibrancy'
                  : 'Classic Top';

              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl.id)}
                  className={`p-2.5 rounded-lg border text-left transition-colors flex flex-col gap-2 cursor-pointer ${
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
                  />
                  <div className="flex items-center justify-between gap-1.5 px-0.5">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {tmpl.name}
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                        {layoutTag}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Theme Pack & Reset Utility Bar */}
        <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs bg-neutral-50/60 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <SettingsButton variant="secondary" onClick={handleExportThemePack}>
              <Download className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>Export Theme Pack</span>
            </SettingsButton>

            <SettingsButton variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>Import Theme Pack</span>
            </SettingsButton>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.novatheme.json"
              onChange={handleImportThemePack}
              className="hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            {hasWsOverride && (
              <SettingsButton
                variant="ghost"
                onClick={() => {
                  if (activeWorkspaceId && settings.workspaceDesigns) {
                    const next = { ...settings.workspaceDesigns };
                    delete next[activeWorkspaceId];
                    onUpdateSettings({ workspaceDesigns: next });
                  }
                }}
              >
                Clear Workspace Override
              </SettingsButton>
            )}

            <SettingsButton variant="ghost" onClick={handleResetAllCustomizations} className="hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </SettingsButton>
          </div>
        </div>

        {themePackMsg && (
          <div className="px-4 sm:px-5 py-3">
            <div
              className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 border ${
                themePackMsg.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{themePackMsg.text}</span>
            </div>
          </div>
        )}
      </SettingsGroup>

      {/* Theme Mode & Accent */}
      <SettingsGroup title="Theme & Color">
        <SettingsRow title="Appearance Mode" description="Switch between Light, Dark, or follow your operating system.">
          <SettingsSegment
            value={(settings.theme || 'system') as 'light' | 'dark' | 'system'}
            onChange={(val) => onUpdateSettings({ theme: val })}
            options={[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
              { id: 'system', label: 'System' },
            ]}
          />
        </SettingsRow>

        <SettingsRow title="Accent Color" description="Highlight tint used for active indicators and focus rings.">
          <div className="flex items-center gap-2">
            {[
              { id: 'blue', hex: '#3b82f6' },
              { id: 'emerald', hex: '#10b981' },
              { id: 'purple', hex: '#a855f7' },
              { id: 'rose', hex: '#f43f5e' },
              { id: 'amber', hex: '#f59e0b' },
              { id: 'custom', hex: settings.customAccentColor || '#3b82f6' },
            ].map((c) => {
              const active = settings.accentColor === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onUpdateSettings({ accentColor: c.id as any })}
                  style={{ backgroundColor: c.hex }}
                  title={c.id === 'custom' ? 'Custom accent color' : c.id}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center cursor-pointer ${
                    active ? 'ring-2 ring-offset-2 ring-neutral-900 dark:ring-white dark:ring-offset-[#141518]' : ''
                  }`}
                >
                  {active && <span className="w-2 h-2 rounded-full bg-white" />}
                </button>
              );
            })}
            {settings.accentColor === 'custom' && (
              <input
                type="color"
                aria-label="Custom accent color"
                value={settings.customAccentColor || '#3b82f6'}
                onChange={(e) => onUpdateSettings({ customAccentColor: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border-none bg-transparent ml-1"
              />
            )}
          </div>
        </SettingsRow>
      </SettingsGroup>

      {/* Tabs & Motion */}
      <SettingsGroup title="Tabs & Motion">
        <div className="p-4 sm:p-5 space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">Tab Style</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'floating', name: 'Floating', desc: 'Detached pill' },
                { id: 'rounded', name: 'Rounded', desc: 'Classic attached' },
                { id: 'square', name: 'Square', desc: 'Compact sharp' },
              ].map((ts) => {
                const active = settings.tabStyle === ts.id || (!settings.tabStyle && ts.id === 'floating');
                return (
                  <button
                    key={ts.id}
                    type="button"
                    onClick={() => onUpdateSettings({ tabStyle: ts.id as any })}
                    className={`p-3 rounded-lg border transition-colors flex flex-col gap-2 text-left cursor-pointer ${
                      active
                        ? 'border-neutral-900 dark:border-white/75 bg-neutral-50 dark:bg-white/[0.05]'
                        : 'border-neutral-200/90 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/[0.16]'
                    }`}
                  >
                    <div className="w-full h-7 bg-neutral-100 dark:bg-[#191b1f] rounded-md flex items-end justify-center overflow-hidden border border-neutral-200/80 dark:border-white/[0.07]">
                      {ts.id === 'floating' && <div className="w-16 h-4 bg-white dark:bg-white/[0.16] rounded mb-1 shadow-xs" />}
                      {ts.id === 'rounded' && <div className="w-16 h-5 bg-white dark:bg-white/[0.16] rounded-t-md" />}
                      {ts.id === 'square' && <div className="w-16 h-5 bg-white dark:bg-white/[0.16]" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-xs text-neutral-900 dark:text-neutral-100">{ts.name}</p>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{ts.desc}</p>
                      </div>
                      {active && <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-200/80 dark:border-white/[0.07]">
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">Tab Animation</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { id: 'chrome', name: 'Chrome', desc: 'Native width expansion', badge: 'Default' },
                { id: 'smooth', name: 'Fluid Spring', desc: 'Cushioned spring lift' },
                { id: 'snappy', name: 'Snappy', desc: 'High-velocity response' },
                { id: 'none', name: 'Instant', desc: 'Zero motion' },
              ].map((ta) => {
                const isSelected = (settings.tabAnimation ?? 'chrome') === ta.id;
                return (
                  <button
                    key={ta.id}
                    type="button"
                    onClick={() => onUpdateSettings({ tabAnimation: ta.id as any })}
                    className={`p-3 rounded-lg border transition-colors flex flex-col items-start justify-between gap-2.5 text-left cursor-pointer ${
                      isSelected
                        ? 'border-neutral-900 dark:border-white/75 bg-neutral-50 dark:bg-white/[0.05]'
                        : 'border-neutral-200/90 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/[0.16]'
                    }`}
                  >
                    <TabAnimationPreviewBox preset={ta.id as any} isActive={isSelected} />
                    <div className="w-full">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-xs text-neutral-900 dark:text-neutral-100">{ta.name}</span>
                        {ta.badge && <SettingsBadge>{ta.badge}</SettingsBadge>}
                      </div>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{ta.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SettingsGroup>

      {/* Browser Surface Theme */}
      <SettingsGroup
        title="Browser Surface Palette"
        description="Tint the window chrome, frame, navigation bar, and tab surfaces."
      >
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[
              { id: 'default', name: 'Classic Slate', desc: 'Default Nova tone', darkPreview: '#151122', lightPreview: '#f1f5f9', badge: 'Default' },
              { id: 'midnight', name: 'Midnight Navy', desc: 'Deep navy slate', darkPreview: '#0a0f1d', lightPreview: '#eef3f9' },
              { id: 'cyberpunk', name: 'Violet Dusk', desc: 'Deep indigo tint', darkPreview: '#0d071a', lightPreview: '#f7f2fe' },
              { id: 'forest', name: 'Emerald Forest', desc: 'Dark botanical green', darkPreview: '#04140e', lightPreview: '#f0f7f4' },
              { id: 'crimson', name: 'Crimson Ruby', desc: 'Muted burgundy tone', darkPreview: '#160509', lightPreview: '#fcf1f3' },
              { id: 'warm', name: 'Warm Mocha', desc: 'Espresso neutral', darkPreview: '#140e0b', lightPreview: '#f8f4f0' },
              { id: 'ocean', name: 'Deep Ocean', desc: 'Calm abyssal teal', darkPreview: '#041217', lightPreview: '#eef7f9' },
              { id: 'sunset', name: 'Sunset Amber', desc: 'Warm twilight hue', darkPreview: '#170b03', lightPreview: '#faf3ec' },
              { id: 'custom', name: 'Custom Color', desc: 'Pick any hex tint', darkPreview: settings.customBrowserColor || '#6366f1', lightPreview: settings.customBrowserColor || '#6366f1' },
            ].map((bc) => {
              const isSelected = (settings.browserColor ?? 'default') === bc.id;
              return (
                <button
                  key={bc.id}
                  type="button"
                  onClick={() => onUpdateSettings({ browserColor: bc.id as any })}
                  className={`p-2.5 rounded-lg border transition-colors flex flex-col gap-2 text-left cursor-pointer ${
                    isSelected
                      ? 'border-neutral-900 dark:border-white/75 bg-neutral-50 dark:bg-white/[0.05]'
                      : 'border-neutral-200/90 dark:border-white/[0.08] hover:border-neutral-300 dark:hover:border-white/[0.16]'
                  }`}
                >
                  <div
                    className="w-full h-11 rounded-md border border-black/10 dark:border-white/10 p-1.5 flex flex-col gap-1 overflow-hidden"
                    style={{ backgroundColor: settings.theme === 'light' ? bc.lightPreview : bc.darkPreview }}
                  >
                    <div className="flex items-center gap-1 h-2">
                      <div className="w-8 h-1.5 rounded-[2px] bg-white/30" />
                      <div className="w-6 h-1.5 rounded-[2px] bg-white/15" />
                    </div>
                    <div className="flex-1 rounded-[3px] bg-white/25 dark:bg-black/25" />
                  </div>

                  <div className="flex items-center justify-between gap-1 px-0.5">
                    <div className="min-w-0">
                      <span className="font-medium text-xs text-neutral-900 dark:text-neutral-100 block truncate">{bc.name}</span>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">{bc.desc}</p>
                    </div>
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white shrink-0" />
                    ) : bc.badge ? (
                      <SettingsBadge>{bc.badge}</SettingsBadge>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {settings.browserColor === 'custom' && (
            <div className="pt-3 border-t border-neutral-200/80 dark:border-white/[0.07] flex flex-wrap items-center gap-3">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Custom Hex:</label>
              <input
                type="color"
                value={settings.customBrowserColor || '#6366f1'}
                onChange={(e) => onUpdateSettings({ customBrowserColor: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border-none bg-transparent"
              />
              <input
                type="text"
                value={settings.customBrowserColor || '#6366f1'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9a-fA-F]{0,8}$/.test(val)) {
                    onUpdateSettings({ customBrowserColor: val });
                  }
                }}
                className="w-28 px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.09] text-xs font-mono text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-400"
                placeholder="#6366f1"
              />
            </div>
          )}
        </div>
      </SettingsGroup>

      {/* New Tab Background */}
      <SettingsGroup title="New Tab Background">
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {BACKGROUND_OPTIONS.map((bg) => (
              <BackgroundPreviewCard
                key={bg.id}
                bg={bg}
                isSelected={settings.newTabBackground === bg.id || (!settings.newTabBackground && bg.id === 'default')}
                onSelect={() => onUpdateSettings({ newTabBackground: bg.id as any })}
              />
            ))}
          </div>

          {settings.newTabBackground === 'unsplash' && <DailyWallpaperSection />}

          {settings.newTabBackground === 'custom_url' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Video or Image URL
              </label>
              <input
                type="text"
                value={settings.backgroundCustomUrl || ''}
                onChange={(e) => onUpdateSettings({ backgroundCustomUrl: e.target.value })}
                className={SETTINGS_INPUT_CLS}
                placeholder="https://example.com/wallpaper.jpg"
              />
            </div>
          )}
        </div>
      </SettingsGroup>

      {/* Layout & Navigation Toggles */}
      <SettingsGroup title="Layout & Navigation">
        <SettingsRow title="Bookmarks Bar" description="Show saved bookmarks directly below the address bar.">
          <ToggleSwitch
            ariaLabel="Toggle bookmarks bar"
            checked={settings.showBookmarksBar}
            onToggle={() => onUpdateSettings({ showBookmarksBar: !settings.showBookmarksBar })}
          />
        </SettingsRow>

        <SettingsRow
          title="Vertical Tabs"
          description="Display tabs, workspaces, and folders inside a collapsible side rail."
        >
          <ToggleSwitch
            ariaLabel="Toggle vertical tabs"
            checked={
              resolved.layout.chromeMode === 'vertical-left' ||
              resolved.layout.chromeMode === 'vertical-right'
            }
            onToggle={() => {
              const isCurrentlyVertical =
                resolved.layout.chromeMode === 'vertical-left' ||
                resolved.layout.chromeMode === 'vertical-right';
              const nextVertical = !isCurrentlyVertical;
              const base = settings.designProfile || createDefaultDesignProfile();
              let nextChromeMode = base.layout.chromeMode;
              if (nextVertical) {
                if (nextChromeMode !== 'vertical-left' && nextChromeMode !== 'vertical-right') {
                  nextChromeMode = 'vertical-left';
                }
              } else {
                if (nextChromeMode === 'vertical-left' || nextChromeMode === 'vertical-right') {
                  nextChromeMode = 'classic-top';
                }
              }
              const existingWs =
                hasWsOverride && activeWorkspaceId
                  ? settings.workspaceDesigns?.[activeWorkspaceId]
                  : undefined;
              onUpdateSettings({
                useVerticalTabs: nextVertical,
                designProfile: {
                  ...base,
                  layout: {
                    ...base.layout,
                    chromeMode: nextChromeMode,
                  },
                },
                ...(existingWs && activeWorkspaceId
                  ? {
                      workspaceDesigns: {
                        ...settings.workspaceDesigns,
                        [activeWorkspaceId]: {
                          ...existingWs,
                          layout: {
                            ...(existingWs.layout || {}),
                            chromeMode: nextVertical
                              ? existingWs.layout?.chromeMode === 'vertical-right'
                                ? 'vertical-right'
                                : 'vertical-left'
                              : 'classic-top',
                          },
                        },
                      },
                    }
                  : {}),
              });
            }}
          />
        </SettingsRow>

        <SettingsRow title="Tasks Widget" description="Show the tasks checklist widget on the New Tab page.">
          <ToggleSwitch
            ariaLabel="Toggle tasks widget"
            checked={Boolean(resolved.newTabLayout.tasksWidget.visible)}
            onToggle={() => {
              const nextTasks = !resolved.newTabLayout.tasksWidget.visible;
              const base = settings.designProfile || createDefaultDesignProfile();
              const existingWs =
                hasWsOverride && activeWorkspaceId
                  ? settings.workspaceDesigns?.[activeWorkspaceId]
                  : undefined;
              onUpdateSettings({
                showTasksWidget: nextTasks,
                designProfile: {
                  ...base,
                  newTabLayout: {
                    ...base.newTabLayout,
                    tasksWidget: {
                      ...base.newTabLayout.tasksWidget,
                      visible: nextTasks,
                    },
                  },
                },
                ...(existingWs && activeWorkspaceId
                  ? {
                      workspaceDesigns: {
                        ...settings.workspaceDesigns,
                        [activeWorkspaceId]: {
                          ...existingWs,
                          newTabLayout: {
                            ...base.newTabLayout,
                            ...(existingWs.newTabLayout || {}),
                            tasksWidget: {
                              ...base.newTabLayout.tasksWidget,
                              ...(existingWs.newTabLayout?.tasksWidget || {}),
                              visible: nextTasks,
                            },
                          },
                        },
                      },
                    }
                  : {}),
              });
            }}
          />
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
};
