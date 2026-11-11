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
  hasActiveWorkspaceOverride: boolean;
  openCustomizeMode: (initialScope?: CustomizeScope) => void;
  commit: () => void;
  discard: () => void;
  resetToDefault: () => void;
  switchScope: (scope: CustomizeScope) => void;
  applyStarterTemplate: (templateId: string) => void;
  clearWorkspaceOverride: () => void;
  importPack: (rawJson: string) => { success: boolean; error?: string; themeName?: string };
  exportPack: () => string;
  updateDraft: (
    updater: (prev: BrowserDesignProfile) => BrowserDesignProfile,
    options?: { coalesceKey?: string }
  ) => void;
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

function cloneWorkspacesMap(
  map: Record<string, BrowserDesignProfile>
): Record<string, BrowserDesignProfile> {
  const result: Record<string, BrowserDesignProfile> = {};
  for (const [k, v] of Object.entries(map)) {
    result[k] = deepCloneProfile(v);
  }
  return result;
}

interface CustomizeSnapshot {
  draftGlobal: BrowserDesignProfile;
  draftWorkspaces: Record<string, BrowserDesignProfile>;
  editingScope: CustomizeScope;
  pendingClearWorkspaceIds: string[];
  modifiedWorkspaceIds: string[];
  draftTabStyle: 'rounded' | 'square' | 'floating';
  draftTabAnimation: 'chrome' | 'smooth' | 'snappy' | 'none';
  timestamp: number;
  coalesceKey?: string;
}

export function useCustomizeManager({
  settings,
  activeWorkspaceId,
  workspaces = [],
  onUpdateSettings,
}: CustomizeManagerOptions): CustomizeContextValue {
  const [isCustomizeMode, setIsCustomizeMode] = useState(false);
  const [editingScope, setEditingScope] = useState<CustomizeScope>('global');

  const initialGlobalProfile = useMemo(() => {
    return settings.designProfile
      ? sanitizeDesignProfile(settings.designProfile)
      : createDefaultDesignProfile();
  }, [settings.designProfile]);

  const [draftGlobal, setDraftGlobal] = useState<BrowserDesignProfile>(initialGlobalProfile);
  const [draftWorkspaces, setDraftWorkspaces] = useState<Record<string, BrowserDesignProfile>>({});
  const [pendingClearWorkspaceIds, setPendingClearWorkspaceIds] = useState<string[]>([]);
  const [modifiedWorkspaceIds, setModifiedWorkspaceIds] = useState<string[]>([]);

  const [draftTabStyle, setDraftTabStyle] = useState<'rounded' | 'square' | 'floating'>(
    settings.tabStyle || 'floating'
  );
  const [draftTabAnimation, setDraftTabAnimation] = useState<'chrome' | 'smooth' | 'snappy' | 'none'>(
    settings.tabAnimation || 'chrome'
  );

  const [undoStack, setUndoStack] = useState<CustomizeSnapshot[]>([]);

  const draftGlobalRef = useRef(draftGlobal);
  draftGlobalRef.current = draftGlobal;

  const draftWorkspacesRef = useRef(draftWorkspaces);
  draftWorkspacesRef.current = draftWorkspaces;

  const editingScopeRef = useRef(editingScope);
  editingScopeRef.current = editingScope;

  const pendingClearWorkspaceIdsRef = useRef(pendingClearWorkspaceIds);
  pendingClearWorkspaceIdsRef.current = pendingClearWorkspaceIds;

  const modifiedWorkspaceIdsRef = useRef(modifiedWorkspaceIds);
  modifiedWorkspaceIdsRef.current = modifiedWorkspaceIds;

  const draftTabStyleRef = useRef(draftTabStyle);
  draftTabStyleRef.current = draftTabStyle;

  const draftTabAnimationRef = useRef(draftTabAnimation);
  draftTabAnimationRef.current = draftTabAnimation;

  const activeWorkspaceIdRef = useRef(activeWorkspaceId);
  activeWorkspaceIdRef.current = activeWorkspaceId;

  const activeWorkspaceName = useMemo(() => {
    if (!activeWorkspaceId) return undefined;
    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    return ws?.name || activeWorkspaceId;
  }, [workspaces, activeWorkspaceId]);

  const activeDraftProfile = useMemo(() => {
    if (editingScope === 'workspace' && activeWorkspaceId) {
      if (draftWorkspaces[activeWorkspaceId]) {
        return draftWorkspaces[activeWorkspaceId];
      }
      const wsOverride = settings.workspaceDesigns?.[activeWorkspaceId];
      if (
        wsOverride &&
        typeof wsOverride === 'object' &&
        !pendingClearWorkspaceIds.includes(activeWorkspaceId)
      ) {
        return sanitizeDesignProfile(resolveEffectiveDesign(settings, activeWorkspaceId, false));
      }
      return draftGlobal;
    }
    return draftGlobal;
  }, [editingScope, activeWorkspaceId, draftWorkspaces, settings, pendingClearWorkspaceIds, draftGlobal]);

  const draftProfileRef = useRef(activeDraftProfile);
  draftProfileRef.current = activeDraftProfile;

  const hasActiveWorkspaceOverride = useMemo(() => {
    if (!activeWorkspaceId) return false;
    if (pendingClearWorkspaceIds.includes(activeWorkspaceId)) return false;
    const hasSaved = Boolean(
      settings.workspaceDesigns &&
        Object.prototype.hasOwnProperty.call(settings.workspaceDesigns, activeWorkspaceId) &&
        settings.workspaceDesigns[activeWorkspaceId]
    );
    const hasDraftOverride = modifiedWorkspaceIds.includes(activeWorkspaceId);
    return hasSaved || hasDraftOverride;
  }, [activeWorkspaceId, pendingClearWorkspaceIds, settings.workspaceDesigns, modifiedWorkspaceIds]);

  const createSnapshot = useCallback((coalesceKey?: string): CustomizeSnapshot => {
    return {
      draftGlobal: deepCloneProfile(draftGlobalRef.current),
      draftWorkspaces: cloneWorkspacesMap(draftWorkspacesRef.current),
      editingScope: editingScopeRef.current,
      pendingClearWorkspaceIds: [...pendingClearWorkspaceIdsRef.current],
      modifiedWorkspaceIds: [...modifiedWorkspaceIdsRef.current],
      draftTabStyle: draftTabStyleRef.current,
      draftTabAnimation: draftTabAnimationRef.current,
      timestamp: Date.now(),
      coalesceKey,
    };
  }, []);

  const openCustomizeMode = useCallback(
    (initialScope?: CustomizeScope) => {
      const baseGlobal = settings.designProfile
        ? sanitizeDesignProfile(settings.designProfile)
        : createDefaultDesignProfile();
      setDraftGlobal(baseGlobal);

      const initialWsMap: Record<string, BrowserDesignProfile> = {};
      if (activeWorkspaceId) {
        const wsOverride = settings.workspaceDesigns?.[activeWorkspaceId];
        if (wsOverride && typeof wsOverride === 'object') {
          initialWsMap[activeWorkspaceId] = sanitizeDesignProfile(
            resolveEffectiveDesign(settings, activeWorkspaceId, false)
          );
        }
      }
      setDraftWorkspaces(initialWsMap);
      setPendingClearWorkspaceIds([]);
      setModifiedWorkspaceIds([]);

      const scopeToUse: CustomizeScope =
        initialScope ||
        (activeWorkspaceId && settings.workspaceDesigns?.[activeWorkspaceId]
          ? 'workspace'
          : 'global');

      setEditingScope(scopeToUse);
      setDraftTabStyle(settings.tabStyle || 'floating');
      setDraftTabAnimation(settings.tabAnimation || 'chrome');
      setUndoStack([]);
      setIsCustomizeMode(true);
    },
    [settings, activeWorkspaceId]
  );

  const switchScope = useCallback(
    (newScope: CustomizeScope) => {
      if (newScope === editingScopeRef.current) return;
      if (newScope === 'workspace' && activeWorkspaceId) {
        setDraftWorkspaces((prev) => {
          if (prev[activeWorkspaceId]) return prev;
          const wsOverride = settings.workspaceDesigns?.[activeWorkspaceId];
          const seeded =
            wsOverride &&
            typeof wsOverride === 'object' &&
            !pendingClearWorkspaceIdsRef.current.includes(activeWorkspaceId)
              ? sanitizeDesignProfile(resolveEffectiveDesign(settings, activeWorkspaceId, false))
              : deepCloneProfile(draftGlobalRef.current);
          return { ...prev, [activeWorkspaceId]: seeded };
        });
      }
      setEditingScope(newScope);
    },
    [activeWorkspaceId, settings]
  );

  const updateDraft = useCallback(
    (
      updater: (prev: BrowserDesignProfile) => BrowserDesignProfile,
      options?: { coalesceKey?: string }
    ) => {
      const now = Date.now();
      const coalesceKey = options?.coalesceKey;

      setUndoStack((prevStack) => {
        const top = prevStack[prevStack.length - 1];
        const shouldCoalesce =
          Boolean(coalesceKey) &&
          Boolean(top?.coalesceKey) &&
          top.coalesceKey === coalesceKey &&
          now - top.timestamp < 400;

        if (shouldCoalesce) {
          return prevStack;
        }

        const snap = createSnapshot(coalesceKey);
        return [...prevStack.slice(-(MAX_UNDO_STACK - 1)), snap];
      });

      if (editingScopeRef.current === 'workspace' && activeWorkspaceIdRef.current) {
        const wsId = activeWorkspaceIdRef.current;
        setDraftWorkspaces((prev) => {
          const currentWs =
            prev[wsId] ||
            (settings.workspaceDesigns?.[wsId] &&
            !pendingClearWorkspaceIdsRef.current.includes(wsId)
              ? sanitizeDesignProfile(resolveEffectiveDesign(settings, wsId, false))
              : deepCloneProfile(draftGlobalRef.current));
          const nextWs = sanitizeDesignProfile(updater(currentWs));
          return { ...prev, [wsId]: nextWs };
        });
        setModifiedWorkspaceIds((prev) => (prev.includes(wsId) ? prev : [...prev, wsId]));
        setPendingClearWorkspaceIds((prev) => prev.filter((id) => id !== wsId));
      } else {
        setDraftGlobal((current) => sanitizeDesignProfile(updater(current)));
      }
    },
    [createSnapshot, settings]
  );

  const undo = useCallback(() => {
    setUndoStack((prevStack) => {
      if (prevStack.length === 0) return prevStack;
      const nextStack = [...prevStack];
      const previous = nextStack.pop()!;
      setDraftGlobal(previous.draftGlobal);
      setDraftWorkspaces(previous.draftWorkspaces);
      setEditingScope(previous.editingScope);
      setPendingClearWorkspaceIds(previous.pendingClearWorkspaceIds);
      setModifiedWorkspaceIds(previous.modifiedWorkspaceIds);
      setDraftTabStyle(previous.draftTabStyle);
      setDraftTabAnimation(previous.draftTabAnimation);
      return nextStack;
    });
  }, []);

  const clearWorkspaceOverride = useCallback(() => {
    if (!activeWorkspaceId) return;

    // Buffer removal in draft: push current snapshot onto undo stack
    const snap = createSnapshot();
    setUndoStack((prev) => [...prev.slice(-(MAX_UNDO_STACK - 1)), snap]);

    // Mark pending clear
    setPendingClearWorkspaceIds((prev) =>
      prev.includes(activeWorkspaceId) ? prev : [...prev, activeWorkspaceId]
    );
    setModifiedWorkspaceIds((prev) => prev.filter((id) => id !== activeWorkspaceId));

    // Remove uncommitted workspace draft so scope switches cleanly to live draftGlobal
    setDraftWorkspaces((prev) => {
      if (!prev[activeWorkspaceId]) return prev;
      const next = { ...prev };
      delete next[activeWorkspaceId];
      return next;
    });

    // Cleanly switch scope back to global
    setEditingScope('global');
  }, [activeWorkspaceId, createSnapshot]);

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
    const currentGlobal = draftGlobalRef.current;
    const isVertical =
      currentGlobal.layout.chromeMode === 'vertical-left' ||
      currentGlobal.layout.chromeMode === 'vertical-right';
    const showTasks = Boolean(currentGlobal.newTabLayout.tasksWidget.visible);

    const updates: Partial<UserSettings> = {
      useVerticalTabs: isVertical,
      showTasksWidget: showTasks,
      tabStyle: draftTabStyleRef.current,
      tabAnimation: draftTabAnimationRef.current,
      designProfile: sanitizeDesignProfile(currentGlobal),
    };

    const existingWs: Record<string, any> = settings.workspaceDesigns
      ? { ...settings.workspaceDesigns }
      : {};

    // 1. Delete all workspace IDs marked as pending clear
    for (const clearedId of pendingClearWorkspaceIdsRef.current) {
      delete existingWs[clearedId];
    }

    // 2. Commit modified workspace drafts (never resurrecting cleared ones)
    for (const wsId of modifiedWorkspaceIdsRef.current) {
      if (
        !pendingClearWorkspaceIdsRef.current.includes(wsId) &&
        draftWorkspacesRef.current[wsId]
      ) {
        existingWs[wsId] = sanitizePartialDesignProfile(draftWorkspacesRef.current[wsId]);
      }
    }

    updates.workspaceDesigns = existingWs;

    onUpdateSettings(updates);
    setIsCustomizeMode(false);
    setUndoStack([]);
    setPendingClearWorkspaceIds([]);
    setModifiedWorkspaceIds([]);
  }, [settings.workspaceDesigns, onUpdateSettings]);

  const discard = useCallback(() => {
    setIsCustomizeMode(false);
    setUndoStack([]);
    setPendingClearWorkspaceIds([]);
    setModifiedWorkspaceIds([]);
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
    draftProfile: activeDraftProfile,
    draftTabStyle,
    draftTabAnimation,
    canUndo: undoStack.length > 0,
    undo,
    activeWorkspaceId,
    activeWorkspaceName,
    hasActiveWorkspaceOverride,
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