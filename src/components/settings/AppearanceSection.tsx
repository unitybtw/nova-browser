import React, { useRef, useState } from 'react';
import { RotateCcw, Shuffle, Check, Images, Sparkles, Paintbrush, Download, Upload, Layers, AlertCircle } from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { useLiveUnsplashPhoto } from '../../utils/unsplash';
import { TabAnimationPreviewBox } from './TabAnimationPreviewBox';
import { ToggleSwitch } from './ToggleSwitch';
import { SmoothCollapse } from './SmoothCollapse';
import { BackgroundPreviewCard, BACKGROUND_OPTIONS } from './BackgroundPreviewCard';
import { STARTER_DESIGN_TEMPLATES, getStarterTemplateById } from '../../utils/designTemplates';
import { createDefaultDesignProfile } from '../../utils/designDefaults';
import { exportThemePack, importThemePack, sanitizeDesignProfile } from '../../utils/designSecurity';

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
    resetToDaily 
  } = useLiveUnsplashPhoto();

  return (
    <div className="mt-6 p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-5 animate-in fade-in slide-in-from-top-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Daily 4K Wallpaper
            </h3>
            {isUserOverride && (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-500 rounded-md border border-amber-500/20">
                Custom Choice
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automatically updates daily with curated 4K photography. Synchronized across all tabs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SmoothCollapse isOpen={Boolean(isUserOverride)} className="inline-grid">
            {isUserOverride && (
              <button
                type="button"
                onClick={resetToDaily}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm cursor-pointer"
                title="Reset to today's official wallpaper"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Today</span>
              </button>
            )}
          </SmoothCollapse>
          <button
            type="button"
            onClick={shuffleNext}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-sm border border-blue-200/50 dark:border-blue-700/50"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle Next</span>
          </button>
        </div>
      </div>

      {currentPhoto && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="w-full aspect-video max-h-[340px] rounded-xl overflow-hidden bg-slate-900 border border-slate-700 relative group shadow-sm">
            <img 
              src={currentPhoto.imageUrl} 
              alt={currentPhoto.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-4">
              <div className="text-white flex items-center justify-between w-full">
                <div className="max-w-[70%]">
                  <p className="text-sm font-bold truncate">{currentPhoto.title}</p>
                  <p className="text-xs text-white/70 truncate">{currentPhoto.author} · {currentPhoto.source} {currentPhoto.resolution ? `(${currentPhoto.resolution})` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-medium flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Active on New Tab
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4K Curated Gallery Grid */}
      {photos && photos.length > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Images className="w-3.5 h-3.5 text-blue-500" />
              4K Wallpaper Gallery ({photos.length} photos)
            </span>
            <span className="text-[11px] text-slate-400">
              Click any photo to set it immediately across all tabs
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
            {photos.map((p) => {
              const isActive = p.id === currentPhoto?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPhoto(p.id)}
                  className={`group relative aspect-video rounded-lg overflow-hidden border text-left transition-colors ${
                    isActive 
                      ? 'ring-2 ring-blue-500 border-blue-500 shadow-xs' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 opacity-85 hover:opacity-100'
                  }`}
                  title={`${p.title} - ${p.author}`}
                >
                  <img
                    src={p.thumbnailUrl}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity flex flex-col justify-end p-1.5">
                    <p className="text-[10px] text-white font-medium truncate">{p.title}</p>
                    <p className="text-[9px] text-white/70 truncate">{p.author}</p>
                  </div>
                  {isActive && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold flex items-center gap-0.5 shadow">
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* LIVE DESIGN STUDIO HERO CARD */}
      <section className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-purple-900/30 border border-blue-500/30 shadow-lg relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Live Studio
              </span>
              {hasWsOverride && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-400/30 rounded-full flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Workspace Override
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Paintbrush className="w-5 h-5 text-blue-500" />
              Live Design Studio
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Real-time interactive chrome customizer with 5 tabs, modular toolbar slots, 9 UI surface zones,
              desktop window vibrancy, typography scaling, and starter templates. Shortcut:{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[11px] font-mono border border-slate-300 dark:border-slate-700">
                Cmd/Ctrl+Shift+E
              </kbd>
            </p>
          </div>

          <button
            type="button"
            data-action="launch-design-studio"
            onClick={handleLaunchStudio}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Open Live Design Studio</span>
          </button>
        </div>

        {/* Quick Starter Templates */}
        <div className="pt-4 border-t border-blue-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Quick Starter Templates</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Click to apply instantly</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {STARTER_DESIGN_TEMPLATES.map((tmpl) => {
              const isSelected = settings.designProfile?.meta.baseTemplateId === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl.id)}
                  className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/20 text-blue-100 shadow-sm'
                      : 'border-slate-300 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/60 hover:border-blue-400 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="font-semibold text-[11px] truncate block">{tmpl.name}</span>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: tmpl.previewBg }}
                    />
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: tmpl.previewAccent }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme Pack Controls & Reset */}
        <div className="pt-3 border-t border-blue-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportThemePack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors font-medium cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>Export Theme Pack</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors font-medium cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
              <span>Import Theme Pack</span>
            </button>

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
              <button
                type="button"
                onClick={() => {
                  if (activeWorkspaceId && settings.workspaceDesigns) {
                    const next = { ...settings.workspaceDesigns };
                    delete next[activeWorkspaceId];
                    onUpdateSettings({ workspaceDesigns: next });
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors font-medium cursor-pointer"
              >
                <span>Clear Workspace Override</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetAllCustomizations}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Customizations</span>
            </button>
          </div>
        </div>

        {themePackMsg && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
              themePackMsg.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{themePackMsg.text}</span>
          </div>
        )}
      </section>
              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Theme Mode</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 flex gap-2">
                  {[
                    { id: 'light', label: 'Light' },
                    { id: 'dark', label: 'Dark' },
                    { id: 'system', label: 'System Default' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => onUpdateSettings({ theme: opt.id as any })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                        settings.theme === opt.id || (!settings.theme && opt.id === 'system')
                          ? 'bg-slate-900 text-white shadow-md dark:bg-blue-600 dark:text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Tab Style</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'floating', name: 'Floating', desc: 'Modern & Detached' },
                    { id: 'rounded', name: 'Rounded', desc: 'Classic Chrome Style' },
                    { id: 'square', name: 'Square', desc: 'Compact & Sharp' }
                  ].map(ts => (
                    <button
                      key={ts.id}
                      onClick={() => onUpdateSettings({ tabStyle: ts.id as any })}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                        settings.tabStyle === ts.id || (!settings.tabStyle && ts.id === 'floating')
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-900 dark:text-blue-100'
                          : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="w-full h-8 bg-slate-100 dark:bg-slate-800 rounded-md relative flex items-end justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                        {ts.id === 'floating' && <div className="w-16 h-5 bg-white dark:bg-slate-700 rounded-md mb-1 shadow-sm" />}
                        {ts.id === 'rounded' && <div className="w-16 h-6 bg-white dark:bg-slate-700 rounded-t-lg" />}
                        {ts.id === 'square' && <div className="w-16 h-6 bg-white dark:bg-slate-700" />}
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm">{ts.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ts.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tab Animation</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select a tab opening physics preset and preview its motion</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'chrome', name: 'Chrome (Native)', desc: 'Smooth horizontal width expansion & collapse', badge: 'Default' },
                    { id: 'smooth', name: 'Fluid Spring', desc: 'Soft floating lift with cushioned spring physics' },
                    { id: 'snappy', name: 'Snappy', desc: 'Crisp, high-velocity responsive motion' },
                    { id: 'none', name: 'Instant (No Motion)', desc: 'Immediate tab opening for maximum speed' }
                  ].map(ta => {
                    const isSelected = (settings.tabAnimation ?? 'chrome') === ta.id;
                    return (
                      <button
                        key={ta.id}
                        onClick={() => onUpdateSettings({ tabAnimation: ta.id as any })}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-start justify-between gap-3 text-left ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-900 dark:text-blue-100 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50'
                        }`}
                      >
                        {/* Live Animation Preview Box */}
                        <TabAnimationPreviewBox preset={ta.id as any} isActive={isSelected} />

                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{ta.name}</span>
                          {ta.badge && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/20">
                              {ta.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ta.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Browser Color (Full UI Theme)</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Customize the entire browser chrome, frame, navigation bar, and tab surfaces</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {[
                    { id: 'default', name: 'Classic Slate', desc: 'Default Nova aesthetic', darkPreview: '#151122', lightPreview: '#f1f5f9', badge: 'Default' },
                    { id: 'midnight', name: 'Midnight Navy', desc: 'Deep galactic space blue', darkPreview: '#0a0f1d', lightPreview: '#eef3f9' },
                    { id: 'cyberpunk', name: 'Cyberpunk Violet', desc: 'Futuristic neon purple tone', darkPreview: '#0d071a', lightPreview: '#f7f2fe' },
                    { id: 'forest', name: 'Emerald Forest', desc: 'Rich organic botanical green', darkPreview: '#04140e', lightPreview: '#f0f7f4' },
                    { id: 'crimson', name: 'Crimson Ruby', desc: 'Velvet burgundy wine red', darkPreview: '#160509', lightPreview: '#fcf1f3' },
                    { id: 'warm', name: 'Warm Mocha', desc: 'Cozy espresso coffee tone', darkPreview: '#140e0b', lightPreview: '#f8f4f0' },
                    { id: 'ocean', name: 'Deep Ocean', desc: 'Calm abyssal teal & cyan', darkPreview: '#041217', lightPreview: '#eef7f9' },
                    { id: 'sunset', name: 'Sunset Amber', desc: 'Warm dusk twilight glow', darkPreview: '#170b03', lightPreview: '#faf3ec' },
                    { id: 'custom', name: 'Custom Color', desc: 'Choose your own hex color', darkPreview: settings.customBrowserColor || '#6366f1', lightPreview: settings.customBrowserColor || '#6366f1' }
                  ].map(bc => {
                    const isSelected = (settings.browserColor ?? 'default') === bc.id;
                    return (
                      <button
                        key={bc.id}
                        onClick={() => onUpdateSettings({ browserColor: bc.id as any })}
                        className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col gap-3 text-left relative overflow-hidden ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-500/10 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                        }`}
                      >
                        {/* Mini browser mockup preview */}
                        <div 
                          className="w-full h-16 rounded-xl border border-black/10 dark:border-white/10 p-1.5 flex flex-col gap-1 overflow-hidden shadow-xs relative"
                          style={{ backgroundColor: settings.theme === 'light' ? bc.lightPreview : bc.darkPreview }}
                        >
                          {/* Topbar mini header */}
                          <div className="flex items-center gap-1 w-full h-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400/80" />
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                            <div className="ml-1.5 w-14 h-2.5 rounded-t bg-white/20 dark:bg-white/15" />
                          </div>
                          {/* Mini omnibox & content */}
                          <div className="flex items-center gap-1 w-full h-3 px-1 rounded bg-black/10 dark:bg-white/10">
                            <div className="w-2 h-1.5 rounded-xs bg-current opacity-30" />
                            <div className="w-12 h-1 rounded-full bg-current opacity-20" />
                          </div>
                          <div className="flex-1 rounded bg-white/40 dark:bg-black/20" />
                        </div>

                        <div className="flex items-center justify-between w-full">
                          <div>
                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{bc.name}</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{bc.desc}</p>
                          </div>
                          {bc.badge && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/20 shrink-0">
                              {bc.badge}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {settings.browserColor === 'custom' && (
                  <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom Browser Color Picker:</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={settings.customBrowserColor || '#6366f1'}
                        onChange={(e) => onUpdateSettings({ customBrowserColor: e.target.value })}
                        className="w-10 h-10 rounded-xl cursor-pointer border-none p-0 bg-transparent"
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
                        className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        placeholder="#6366f1"
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      The browser automatically calculates frame, toolbar, and tab surfaces with optimal contrast.
                    </span>
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Accent Color</h2>
                <div className="flex gap-4 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                  {[
                    { id: 'blue', color: 'bg-[#3b82f6]' },
                    { id: 'emerald', color: 'bg-[#10b981]' },
                    { id: 'purple', color: 'bg-[#a855f7]' },
                    { id: 'rose', color: 'bg-[#f43f5e]' },
                    { id: 'amber', color: 'bg-[#f59e0b]' },
                    { id: 'custom', color: 'bg-slate-200 dark:bg-slate-700' }
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => onUpdateSettings({ accentColor: c.id as any })}
                      className={`w-12 h-12 rounded-full ${c.color} shadow-lg transition-transform hover:scale-110 flex items-center justify-center relative`}
                    >
                      {c.id === 'custom' && (
                        <div 
                          className="absolute inset-0 rounded-full flex items-center justify-center" 
                          style={{ backgroundColor: settings.customAccentColor || '#3b82f6' }} 
                        />
                      )}
                      {settings.accentColor === c.id && <div className="w-4 h-4 bg-white rounded-full opacity-90 z-10" />}
                    </button>
                  ))}
                </div>
                {settings.accentColor === 'custom' && (
                  <div className="mt-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom Color Picker:</label>
                    <input 
                      type="color" 
                      value={settings.customAccentColor || '#3b82f6'}
                      onChange={(e) => onUpdateSettings({ customAccentColor: e.target.value })}
                      className="w-12 h-12 rounded cursor-pointer border-none p-0 bg-transparent"
                    />
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">New Tab Background</h2>

                <div className="grid grid-cols-2 gap-4">
                  {BACKGROUND_OPTIONS.map(bg => (
                    <BackgroundPreviewCard
                      key={bg.id}
                      bg={bg}
                      isSelected={settings.newTabBackground === bg.id || (!settings.newTabBackground && bg.id === 'default')}
                      onSelect={() => onUpdateSettings({ newTabBackground: bg.id as any })}
                    />
                  ))}
                </div>

                {settings.newTabBackground === 'unsplash' && (
                  <DailyWallpaperSection />
                )}
                {settings.newTabBackground === 'custom_url' && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Video / Image URL:</label>
                    <input 
                      type="text" 
                      value={settings.backgroundCustomUrl || ''}
                      onChange={(e) => onUpdateSettings({ backgroundCustomUrl: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500"
                      placeholder="e.g. https://example.com/video.mp4"
                    />
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Layout & Navigation</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Bookmarks Bar</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Show favorite sites below address bar</div>
                    </div>
                    <ToggleSwitch
                      ariaLabel="Toggle bookmarks bar"
                      checked={settings.showBookmarksBar}
                      onToggle={() => onUpdateSettings({ showBookmarksBar: !settings.showBookmarksBar })}
                    />
                  </div>
                  
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Vertical Tabs</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full">
                          Beta
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Display tabs on the left sidebar instead of the top</div>
                    </div>
                    <ToggleSwitch
                      ariaLabel="Toggle vertical tabs"
                      checked={settings.useVerticalTabs}
                      onToggle={() => {
                        const nextVertical = !settings.useVerticalTabs;
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
                        onUpdateSettings({
                          useVerticalTabs: nextVertical,
                          designProfile: {
                            ...base,
                            layout: {
                              ...base.layout,
                              chromeMode: nextChromeMode,
                            },
                          },
                        });
                      }}
                    />
                  </div>
                  
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tasks Widget</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Show tasks and to-do list on the New Tab Page</div>
                    </div>
                    <ToggleSwitch
                      ariaLabel="Toggle tasks widget"
                      checked={Boolean(settings.showTasksWidget)}
                      onToggle={() => {
                        const nextTasks = !settings.showTasksWidget;
                        const base = settings.designProfile || createDefaultDesignProfile();
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
                        });
                      }}
                    />
                  </div>
                </div>
              </section>
            </div>
  );
};
