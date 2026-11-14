import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  LayoutGrid,
  Search,
  Sparkles,
  Shield,
  Download,
  Puzzle,
  Star,
  Columns2,
  PictureInPicture2,
  Camera,
  User,
  SlidersHorizontal,
  Menu,
  MoveHorizontal,
  SeparatorVertical,
  Eye,
  EyeOff,
  X,
  GripVertical,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ToolbarItemKind, ToolbarSlotItem } from '../../types/browser';

export type ToolbarItemCategory = 'navigation' | 'address' | 'actions' | 'layout';

export interface ToolbarItemSpec {
  kind: ToolbarItemKind;
  label: string;
  category: ToolbarItemCategory;
  icon: LucideIcon | React.ComponentType<{ size?: number | string; className?: string }>;
  isCritical?: boolean;
}

export const TOOLBAR_ITEM_META: Record<ToolbarItemKind, ToolbarItemSpec> = {
  back: {
    kind: 'back',
    label: 'Back',
    category: 'navigation',
    icon: ArrowLeft,
    isCritical: false,
  },
  forward: {
    kind: 'forward',
    label: 'Forward',
    category: 'navigation',
    icon: ArrowRight,
    isCritical: false,
  },
  reload: {
    kind: 'reload',
    label: 'Reload',
    category: 'navigation',
    icon: RotateCw,
    isCritical: false,
  },
  home: {
    kind: 'home',
    label: 'Home',
    category: 'navigation',
    icon: Home,
    isCritical: false,
  },
  workspaces: {
    kind: 'workspaces',
    label: 'Workspaces',
    category: 'navigation',
    icon: LayoutGrid,
    isCritical: false,
  },
  omnibox: {
    kind: 'omnibox',
    label: 'Address & Search Bar',
    category: 'address',
    icon: Search,
    isCritical: true,
  },
  ai: {
    kind: 'ai',
    label: 'Nova AI Assistant',
    category: 'actions',
    icon: Sparkles,
    isCritical: false,
  },
  shield: {
    kind: 'shield',
    label: 'Privacy Shield',
    category: 'actions',
    icon: Shield,
    isCritical: false,
  },
  downloads: {
    kind: 'downloads',
    label: 'Downloads',
    category: 'actions',
    icon: Download,
    isCritical: false,
  },
  extensions: {
    kind: 'extensions',
    label: 'Extensions',
    category: 'actions',
    icon: Puzzle,
    isCritical: false,
  },
  bookmarksToggle: {
    kind: 'bookmarksToggle',
    label: 'Bookmarks',
    category: 'actions',
    icon: Star,
    isCritical: false,
  },
  splitView: {
    kind: 'splitView',
    label: 'Split View',
    category: 'layout',
    icon: Columns2,
    isCritical: false,
  },
  pip: {
    kind: 'pip',
    label: 'Picture in Picture',
    category: 'actions',
    icon: PictureInPicture2,
    isCritical: false,
  },
  screenshot: {
    kind: 'screenshot',
    label: 'Take Screenshot',
    category: 'actions',
    icon: Camera,
    isCritical: false,
  },
  account: {
    kind: 'account',
    label: 'Account & Sync',
    category: 'actions',
    icon: User,
    isCritical: false,
  },
  customize: {
    kind: 'customize',
    label: 'Customize Browser',
    category: 'actions',
    icon: SlidersHorizontal,
    isCritical: false,
  },
  menu: {
    kind: 'menu',
    label: 'More Menu',
    category: 'actions',
    icon: Menu,
    isCritical: false,
  },
  spacer: {
    kind: 'spacer',
    label: 'Flexible Space',
    category: 'layout',
    icon: MoveHorizontal,
    isCritical: false,
  },
  divider: {
    kind: 'divider',
    label: 'Separator',
    category: 'layout',
    icon: SeparatorVertical,
    isCritical: false,
  },
};

export function getToolbarItemMeta(kind: ToolbarItemKind): ToolbarItemSpec {
  return (
    TOOLBAR_ITEM_META[kind] ?? {
      kind,
      label: kind,
      category: 'actions',
      icon: SlidersHorizontal,
      isCritical: false,
    }
  );
}

export type ActiveToolbarDragPayload =
  | { type: 'slot'; draggedId: string; kind: ToolbarItemKind }
  | { type: 'kind'; kind: ToolbarItemKind }
  | null;

let activeToolbarDragPayload: ActiveToolbarDragPayload = null;

export function setActiveToolbarDragPayload(payload: ActiveToolbarDragPayload): void {
  activeToolbarDragPayload = payload;
}

export function getActiveToolbarDragPayload(): ActiveToolbarDragPayload {
  return activeToolbarDragPayload;
}

export function clearActiveToolbarDragPayload(): void {
  activeToolbarDragPayload = null;
}

export interface CustomizeSlotWrapperProps {
  item: ToolbarSlotItem;
  isCustomizeMode?: boolean;
  isDragging?: boolean;
  dropSide?: 'before' | 'after' | null;
  controlsAlign?: 'center' | 'right';
  onToggleVisibility?: (id: string) => void;
  onRemove?: (id: string) => void;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>, item: ToolbarSlotItem) => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>, item: ToolbarSlotItem) => void;
  onDragLeave?: (event: React.DragEvent<HTMLDivElement>, item: ToolbarSlotItem) => void;
  onDragEnd?: (event: React.DragEvent<HTMLDivElement>, item: ToolbarSlotItem) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>, item: ToolbarSlotItem) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CustomizeSlotWrapper: React.FC<CustomizeSlotWrapperProps> = ({
  item,
  isCustomizeMode = false,
  isDragging = false,
  dropSide = null,
  controlsAlign = 'center',
  onToggleVisibility,
  onRemove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  children,
  className = '',
  style,
}) => {
  if (!isCustomizeMode) {
    if (!item.visible) return null;
    return className || style ? (
      <div className={className} style={style}>
        {children}
      </div>
    ) : (
      <>{children}</>
    );
  }

  const spec = getToolbarItemMeta(item.kind);
  const isCritical = Boolean(spec.isCritical);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.setData('application/x-nova-toolbar-slot', item.id);
    e.dataTransfer.setData('application/x-nova-toolbar-kind', item.kind);
    setActiveToolbarDragPayload({ type: 'slot', draggedId: item.id, kind: item.kind });
    onDragStart?.(e, item);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    const types = Array.from(e.dataTransfer?.types || []);
    if (
      types.includes('application/x-nova-toolbar-slot') ||
      types.includes('application/x-nova-toolbar-kind') ||
      activeToolbarDragPayload !== null
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
    onDragOver?.(e, item);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    onDragLeave?.(e, item);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    clearActiveToolbarDragPayload();
    onDragEnd?.(e, item);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    clearActiveToolbarDragPayload();
    onDrop?.(e, item);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!isCritical) {
        e.preventDefault();
        onRemove?.(item.id);
      }
    } else if (e.key === ' ' || e.key === 'Enter') {
      if (!isCritical) {
        e.preventDefault();
        onToggleVisibility?.(item.id);
      }
    }
  };

  return (
    <div
      role="region"
      aria-label={`Toolbar slot: ${spec.label}`}
      tabIndex={0}
      draggable={isCustomizeMode}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      className={`relative group/slot inline-flex items-center transition-all duration-150 rounded-md select-none no-drag cursor-grab active:cursor-grabbing outline-none ring-1 ring-dashed ring-[var(--nova-accent,#3b82f6)]/50 hover:ring-2 hover:ring-[var(--nova-accent,#3b82f6)] focus-visible:ring-2 focus-visible:ring-[var(--nova-accent,#3b82f6)] bg-[var(--nova-accent,#3b82f6)]/[0.04] hover:bg-[var(--nova-accent,#3b82f6)]/[0.08] ${
        !item.visible ? 'opacity-45 grayscale-[50%]' : ''
      } ${isDragging ? 'opacity-35 scale-95 ring-blue-400' : ''} ${className}`}
      style={{
        WebkitAppRegion: 'no-drag',
        ...style,
      } as React.CSSProperties}
    >
      {dropSide === 'before' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0.5 -left-1.5 w-0.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.95)] z-40"
        />
      )}
      {dropSide === 'after' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0.5 -right-1.5 w-0.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.95)] z-40"
        />
      )}
      {/* Chrome Pills Overlay: Drag Handle, Eye, Remove (revealed on hover/focus below slot to avoid adjacent collisions & top-edge clipping) */}
      <div
        className={`absolute top-full mt-1.5 ${
          controlsAlign === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'
        } z-30 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shadow-md text-[10px] bg-neutral-900/95 text-neutral-100 dark:bg-neutral-800/95 dark:text-neutral-200 border border-neutral-700/70 opacity-0 pointer-events-none group-hover/slot:opacity-100 group-hover/slot:pointer-events-auto group-focus-within/slot:opacity-100 group-focus-within/slot:pointer-events-auto transition-opacity duration-150 whitespace-nowrap before:content-[''] before:absolute before:-top-2 before:inset-x-0 before:h-2`}
        role="toolbar"
        aria-label={`Slot controls for ${spec.label}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle indicator */}
        <span
          aria-hidden="true"
          title={`Drag to reorder ${spec.label}`}
          className="p-0.5 text-neutral-300 select-none cursor-grab active:cursor-grabbing flex items-center justify-center"
        >
          <GripVertical className="w-2.5 h-2.5" />
        </span>

        {/* Visibility Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!isCritical) {
              onToggleVisibility?.(item.id);
            }
          }}
          aria-label={item.visible ? `Hide ${spec.label}` : `Show ${spec.label}`}
          title={
            isCritical
              ? `${spec.label} cannot be hidden`
              : item.visible
              ? `Hide ${spec.label}`
              : `Show ${spec.label}`
          }
          disabled={isCritical}
          className="p-0.5 rounded hover:bg-white/20 active:bg-white/30 text-neutral-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {item.visible ? (
            <Eye className="w-2.5 h-2.5" />
          ) : (
            <EyeOff className="w-2.5 h-2.5 text-amber-400" />
          )}
        </button>

        {/* Remove Button */}
        {!isCritical && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(item.id);
            }}
            aria-label={`Remove ${spec.label}`}
            title={`Remove ${spec.label}`}
            className="p-0.5 rounded hover:bg-rose-600/80 active:bg-rose-600 text-neutral-300 hover:text-white transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Children wrapped so internal click events don't trigger in customize mode */}
      <div className="pointer-events-none w-full h-full flex items-center justify-center">
        {children ? (
          children
        ) : item.kind === 'spacer' ? (
          <span className="px-3 py-1 text-[11px] text-neutral-400 dark:text-neutral-500 italic select-none">
            Space
          </span>
        ) : item.kind === 'divider' ? (
          <div className="w-[1px] h-4 bg-neutral-400 dark:bg-neutral-600 mx-1" />
        ) : null}
      </div>
    </div>
  );
};

export default CustomizeSlotWrapper;
