import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  BrowserDesignProfile,
  UserSettings,
  Workspace,
} from '../../types/browser';
import { createDefaultDesignProfile } from '../../utils/designDefaults';
import {
  exportThemePack,
  importThemePack,
  sanitizeDesignProfile,
  sanitizePartialDesignProfile,
} from '../../utils/designSecurity';
import { resolveEffectiveDesign } from '../../utils/designEngine';
import { getStarterTemplateById } from '../../utils/designTemplates';

export type CustomizeScope = 'global' | 'workspace';

export interface CustomizeContextValue {
  isCustomizeMode: boolean;
  editingScope: CustomizeScope;
  draftProfile: BrowserDesignProfile;
  draftTabStyle: 'rounded' | 'square' | 'floating';
  draftTabAnimation: 'chrome' | 'smooth' | 'snappy' | 'none';
  canUndo: boolean;
  undo: () => void;
  activeWorkspaceId?: string;
  activeWorkspaceName?: string;
  openCustomizeMode: (initialScope?: CustomizeScope) => void;
  commit: () => void;
  discard: () => void;
  resetToDefault: () => void;
  switchScope: (scope: CustomizeScope) => void;
  applyStarterTemplate: (templateId: string) => void;
  clearWorkspaceOverride: () => void;
  importPack: (rawJson: string) => { success: boolean; error?: string; themeName?: string };
  exportPack: () => string;
  updateDraft: (updater: (prev: BrowserDesignProfile) => BrowserDesignProfile) => void;
  updateDraftTabStyle: (tabStyle: 'rounded' | 'square' | 'floating') => void;
  updateDraftTabAnimation: (tabAnimation: 'chrome' | 'smooth' | 'snappy' | 'none') => void;
}

export interface CustomizeManagerOptions {
  settings: UserSettings;
  activeWorkspaceId?: string;
  workspaces?: Workspace[];
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

export const CustomizeContext = createContext<CustomizeContextValue | null>(null);

const MAX_UNDO_STACK = 30;

function deepCloneProfile(profile: BrowserDesignProfile): BrowserDesignProfile {
  return JSON.parse(JSON.stringify(profile));
}

export function useCustomizeManager({
  settings,
  activeWorkspaceId,
  workspaces = [],
  onUpdateSettings,
}: CustomizeManagerOptions): CustomizeContextValue {
  const [isCustomizeMode, setIsCustomizeMode] = useState(false);
  const [editingScope, setEditingScope] = useState<CustomizeScope>('global');

  const initialProfile = useMemo(() => {
    return settings.designProfile
      ? sanitizeDesignProfile(settings.designProfile)
      : createDefaultDesignProfile();
  }, [settings.designProfile]);

  const [draftProfile, setDraftProfile] = useState<BrowserDesignProfile>(initialProfile);
  const [draftTabStyle, setDraftTabStyle] = useState<'rounded' | 'square' | 'floating'>(
    settings.tabStyle || 'floating'
  );
  const [draftTabAnimation, setDraftTabAnimation] = useState<'chrome' | 'smooth' | 'snappy' | 'none'>(
    settings.tabAnimation || 'chrome'
  );

  const [undoStack, setUndoStack] = useState<BrowserDesignProfile[]>([]);
  const draftProfileRef = useRef(draftProfile);
  draftProfileRef.current = draftProfile;

  const activeWorkspaceName = useMemo(() => {
    if (!activeWorkspaceId) return undefined;
    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    return ws?.name || activeWorkspaceId;
  }, [workspaces, activeWorkspaceId]);

  const seedProfileForScope = useCallback(
    (scope: CustomizeScope): BrowserDesignProfile => {
      if (scope === 'workspace' && activeWorkspaceId) {
        const wsOverride = settings.workspaceDesigns?.[activeWorkspaceId];
        if (wsOverride && typeof wsOverride === 'object') {
          const resolved = resolveEffectiveDesign(settings, activeWorkspaceId, false);
          return sanitizeDesignProfile(resolved);
        }
      }
      return settings.designProfile
        ? sanitizeDesignProfile(settings.designProfile)
        : createDefaultDesignProfile();
    },
    [settings, activeWorkspaceId]
  );

  const openCustomizeMode = useCallback(
    (initialScope?: CustomizeScope) => {
      const scopeToUse: CustomizeScope =
        initialScope ||
        (activeWorkspaceId && settings.workspaceDesigns?.[activeWorkspaceId]
          ? 'workspace'
          : 'global');

      setEditingScope(scopeToUse);
      setDraftProfile(seedProfileForScope(scopeToUse));
      setDraftTabStyle(settings.tabStyle || 'floating');
      setDraftTabAnimation(settings.tabAnimation || 'chrome');
      setUndoStack([]);
      setIsCustomizeMode(true);
    },
    [seedProfileForScope, settings.tabStyle, settings.tabAnimation, activeWorkspaceId, settings.workspaceDesigns]
  );

  const updateDraft = useCallback(
    (updater: (prev: BrowserDesignProfile) => BrowserDesignProfile) => {
      setDraftProfile((current) => {
        const next = sanitizeDesignProfile(updater(current));
        setUndoStack((prevStack) => [...prevStack.slice(-(MAX_UNDO_STACK - 1)), deepCloneProfile(current)]);
        return next;
      });
    },
    []
  );

  const undo = useCallback(() => {
    setUndoStack((prevStack) => {
      if (prevStack.length === 0) return prevStack;
      const nextStack = [...prevStack];
      const previous = nextStack.pop()!;
      setDraftProfile(previous);
      return nextStack;
    });
  }, []);

  const switchScope = useCallback(
    (newScope: CustomizeScope) => {
      if (newScope === editingScope) return;
      setEditingScope(newScope);
      setDraftProfile(seedProfileForScope(newScope));
      setUndoStack([]);
    },
    [editingScope, seedProfileForScope]
  );

  const applyStarterTemplate = useCallback(
    (templateId: string) => {
      const template = getStarterTemplateById(templateId);
      if (!template) return;
      updateDraft(() =>
        sanitizeDesignProfile({
          ...template.profile,
          meta: {
            ...template.profile.meta,
            baseTemplateId: template.id,
          },
        })
      );
    },
    [updateDraft]
  );

  const resetToDefault = useCallback(() => {
    updateDraft(() => createDefaultDesignProfile());
  }, [updateDraft]);

  const clearWorkspaceOverride = useCallback(() => {
    if (!activeWorkspaceId) return;
    if (settings.workspaceDesigns && Object.prototype.hasOwnProperty.call(settings.workspaceDesigns, activeWorkspaceId)) {
      const nextDesigns = { ...settings.workspaceDesigns };
      delete nextDesigns[activeWorkspaceId];
      onUpdateSettings({ workspaceDesigns: nextDesigns });
    }
    const globalBase = settings.designProfile
      ? sanitizeDesignProfile(settings.designProfile)
      : createDefaultDesignProfile();
    updateDraft(() => globalBase);
  }, [activeWorkspaceId, settings.workspaceDesigns, settings.designProfile, onUpdateSettings, updateDraft]);

  const importPack = useCallback(
    (rawJson: string) => {
      const result = importThemePack(rawJson);
      if (!result.ok) {
        return { success: false, error: result.error || 'Failed to import theme pack' };
      }
      updateDraft(() => result.profile);
      return { success: true, themeName: result.profile.meta.name };
    },
    [updateDraft]
  );

  const exportPack = useCallback(() => {
    const json = exportThemePack(draftProfileRef.current);
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const slug =
          (draftProfileRef.current.meta.name || 'theme')
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
    return json;
  }, []);

  const commit = useCallback(() => {
    const current = draftProfileRef.current;
    const isVertical =
      current.layout.chromeMode === 'vertical-left' ||
      current.layout.chromeMode === 'vertical-right';
    const showTasks = Boolean(current.newTabLayout.tasksWidget.visible);

    const updates: Partial<UserSettings> = {
      useVerticalTabs: isVertical,
      showTasksWidget: showTasks,
      tabStyle: draftTabStyle,
      tabAnimation: draftTabAnimation,
    };

    if (editingScope === 'workspace' && activeWorkspaceId) {
      const existing = settings.workspaceDesigns || {};
      updates.workspaceDesigns = {
        ...existing,
        [activeWorkspaceId]: sanitizePartialDesignProfile(current),
      };
    } else {
      updates.designProfile = sanitizeDesignProfile(current);
    }

    onUpdateSettings(updates);
    setIsCustomizeMode(false);
    setUndoStack([]);
  }, [editingScope, activeWorkspaceId, settings.workspaceDesigns, draftTabStyle, draftTabAnimation, onUpdateSettings]);

  const discard = useCallback(() => {
    setIsCustomizeMode(false);
    setUndoStack([]);
  }, []);

  const updateDraftTabStyle = useCallback((style: 'rounded' | 'square' | 'floating') => {
    setDraftTabStyle(style);
  }, []);

  const updateDraftTabAnimation = useCallback((anim: 'chrome' | 'smooth' | 'snappy' | 'none') => {
    setDraftTabAnimation(anim);
  }, []);

  // Listen for CustomEvent 'nova-open-customize-mode'
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ scope?: CustomizeScope }>;
      openCustomizeMode(customEvent.detail?.scope);
    };
    window.addEventListener('nova-open-customize-mode', handleOpen);
    return () => window.removeEventListener('nova-open-customize-mode', handleOpen);
  }, [openCustomizeMode]);

  return {
    isCustomizeMode,
    editingScope,
    draftProfile,
    draftTabStyle,
    draftTabAnimation,
    canUndo: undoStack.length > 0,
    undo,
    activeWorkspaceId,
    activeWorkspaceName,
    openCustomizeMode,
    commit,
    discard,
    resetToDefault,
    switchScope,
    applyStarterTemplate,
    clearWorkspaceOverride,
    importPack,
    exportPack,
    updateDraft,
    updateDraftTabStyle,
    updateDraftTabAnimation,
  };
}

export interface CustomizeProviderProps extends CustomizeManagerOptions {
  children: React.ReactNode;
}

export const CustomizeProvider: React.FC<CustomizeProviderProps> = ({
  settings,
  activeWorkspaceId,
  workspaces,
  onUpdateSettings,
  children,
}) => {
  const value = useCustomizeManager({
    settings,
    activeWorkspaceId,
    workspaces,
    onUpdateSettings,
  });

  return <CustomizeContext.Provider value={value}>{children}</CustomizeContext.Provider>;
};

export function useCustomize(): CustomizeContextValue {
  const ctx = useContext(CustomizeContext);
  if (!ctx) {
    throw new Error('useCustomize must be used within a CustomizeProvider');
  }
  return ctx;
}
