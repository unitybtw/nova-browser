import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, ArrowRight, ShieldCheck, ShieldAlert, Plus, X, Edit2, Check, CheckSquare, Square, Trash2, ListTodo, VenetianMask, Camera, Shuffle, Compass, Eye, EyeOff } from 'lucide-react';
import { formatSearchUrl, getSearchEngineName, getSearchLocale, getSearchLanguage } from '../utils/searchEngine';
import { isSafeNavigationUrl } from '../utils/safeNavigation';
import { useLiveUnsplashPhoto } from '../utils/unsplash';
import { NewTabLayoutConfig, UserSettings } from '../types/browser';
import { DEFAULT_DESIGN_PROFILE } from '../utils/designDefaults';
import { getClientCachedSuggestions, setClientCachedSuggestions } from '../utils/suggestionCache';
import { generateId } from '../utils/idGenerator';
import { useTranslation, getLocale } from '../services/i18n';
import { SpeedDialIcon, getCleanDomain, normalizeNavigationUrl } from './SpeedDialIcon';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { useSharedLocalStorageState } from '../hooks/useSharedLocalStorage';
import { logger } from '../utils/logger';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

/** Recover individual tasks without trusting stored row shapes or booleans. */
export function parseTodos(raw: string): Todo[] | null {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return null;
  const seen = new Set<string>();
  return parsed.flatMap((entry): Todo[] => {
    if (!entry || typeof entry !== 'object' || typeof entry.text !== 'string' || !entry.text.trim()) return [];
    const id = typeof entry.id === 'string' && entry.id ? entry.id : generateId('todo');
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ id, text: entry.text, completed: entry.completed === true }];
  });
}

export interface NewTabPageProps {
  onNavigate: (url: string) => void;
  onNewTab?: (url?: string) => void;
  searchEngine?: UserSettings['searchEngine'];
  privacyShield?: boolean;
  newTabBackground?: string;
  backgroundCustomUrl?: string;
  showTasksWidget?: boolean;
  isIncognito?: boolean;
  theme?: UserSettings['theme'];
  isActive?: boolean;
  energySaverMode?: boolean;
  browserColor?: UserSettings['browserColor'];
  customBrowserColor?: string;
  isDemo?: boolean;
  onExitIncognito?: () => void;
  newTabLayout?: NewTabLayoutConfig;
  isCustomizeMode?: boolean;
  onUpdateNewTabLayout?: (next: NewTabLayoutConfig) => void;
}

export const CLOCK_STYLES = ['minimal', 'editorial', 'mono', 'pill'] as const;
export const SEARCH_STYLES = ['glass', 'solid', 'minimal', 'pill'] as const;
export const SEARCH_WIDTHS = ['narrow', 'medium', 'wide'] as const;
export const SHORTCUT_CARD_STYLES = ['tile', 'pill', 'icon-only', 'compact'] as const;
export const SHORTCUT_COLUMN_OPTIONS = [4, 5, 6, 7, 8] as const;
export const TASKS_PLACEMENTS = ['bottom', 'left', 'right', 'floating'] as const;

export const SEARCH_WIDTH_CLASSES: Record<NewTabLayoutConfig['searchBox']['width'], string> = {
  narrow: 'max-w-[440px]',
  medium: 'max-w-[560px]',
  wide: 'max-w-[740px]',
};

// Explicit static Tailwind grid-cols-* mappings so Tailwind v4 static extraction preserves every column count.
export const SHORTCUT_COLUMN_CLASSES: Record<4 | 5 | 6 | 7 | 8, string> = {
  4: 'grid-cols-4',
  5: 'grid-cols-3 sm:grid-cols-5',
  6: 'grid-cols-3 sm:grid-cols-6',
  7: 'grid-cols-4 sm:grid-cols-7',
  8: 'grid-cols-4 sm:grid-cols-8',
};

export const SHORTCUT_CONTAINER_WIDTH_CLASSES: Record<4 | 5 | 6 | 7 | 8, string> = {
  4: 'max-w-[460px]',
  5: 'max-w-[560px]',
  6: 'max-w-[660px]',
  7: 'max-w-[760px]',
  8: 'max-w-[840px]',
};

export const SHORTCUT_PILL_WIDTH_CLASSES: Record<4 | 5 | 6 | 7 | 8, string> = {
  4: 'max-w-[620px]',
  5: 'max-w-[700px]',
  6: 'max-w-[780px]',
  7: 'max-w-[860px]',
  8: 'max-w-[920px]',
};

export const TASKS_PLACEMENT_CLASSES: Record<NewTabLayoutConfig['tasksWidget']['placement'], string> = {
  bottom: 'nova-tasks-bottom mt-8 mx-auto',
  left: 'nova-tasks-left mt-8 mx-auto',
  right: 'nova-tasks-right mt-8 mx-auto',
  floating: 'nova-tasks-floating mt-8 mx-auto shadow-xl',
};

export function cycleWidgetOption<T extends string | number>(current: T, options: readonly T[]): T {
  const index = options.indexOf(current);
  if (index === -1) return options[0];
  return options[(index + 1) % options.length];
}

export function clampShortcutColumns(columns: unknown, fallback: 4 | 5 | 6 | 7 | 8 = 4): 4 | 5 | 6 | 7 | 8 {
  if (typeof columns !== 'number' || !Number.isFinite(columns)) return fallback;
  const clamped = Math.min(8, Math.max(4, Math.round(columns)));
  return clamped as 4 | 5 | 6 | 7 | 8;
}

/**
 * Resolves the effective modular New Tab widget layout.
 * When `newTabLayout` is omitted, defaults to `DEFAULT_DESIGN_PROFILE.newTabLayout`
 * while preserving the legacy `showTasksWidget` visibility flag.
 */
export function resolveNewTabLayout(
  newTabLayout?: Partial<NewTabLayoutConfig> | NewTabLayoutConfig,
  showTasksWidget = false
): NewTabLayoutConfig {
  const base = DEFAULT_DESIGN_PROFILE.newTabLayout;
  if (!newTabLayout) {
    return {
      clock: { ...base.clock },
      greeting: { ...base.greeting },
      searchBox: { ...base.searchBox },
      shortcuts: { ...base.shortcuts },
      tasksWidget: {
        ...base.tasksWidget,
        visible: Boolean(showTasksWidget),
      },
    };
  }

  const clock = newTabLayout.clock;
  const greeting = newTabLayout.greeting;
  const searchBox = newTabLayout.searchBox;
  const shortcuts = newTabLayout.shortcuts;
  const tasksWidget = newTabLayout.tasksWidget;

  return {
    clock: {
      visible: typeof clock?.visible === 'boolean' ? clock.visible : base.clock.visible,
      format: clock?.format === '12h' || clock?.format === '24h' ? clock.format : base.clock.format,
      style: clock?.style && (CLOCK_STYLES as readonly string[]).includes(clock.style)
        ? clock.style
        : base.clock.style,
      align: clock?.align === 'left' || clock?.align === 'center' ? clock.align : base.clock.align,
    },
    greeting: {
      visible: typeof greeting?.visible === 'boolean' ? greeting.visible : base.greeting.visible,
      customText: typeof greeting?.customText === 'string' ? greeting.customText.slice(0, 80) : base.greeting.customText,
    },
    searchBox: {
      visible: typeof searchBox?.visible === 'boolean' ? searchBox.visible : base.searchBox.visible,
      style: searchBox?.style && (SEARCH_STYLES as readonly string[]).includes(searchBox.style)
        ? searchBox.style
        : base.searchBox.style,
      width: searchBox?.width && (SEARCH_WIDTHS as readonly string[]).includes(searchBox.width)
        ? searchBox.width
        : base.searchBox.width,
    },
    shortcuts: {
      visible: typeof shortcuts?.visible === 'boolean' ? shortcuts.visible : base.shortcuts.visible,
      columns: clampShortcutColumns(shortcuts?.columns, base.shortcuts.columns),
      cardStyle: shortcuts?.cardStyle && (SHORTCUT_CARD_STYLES as readonly string[]).includes(shortcuts.cardStyle)
        ? shortcuts.cardStyle
        : base.shortcuts.cardStyle,
    },
    tasksWidget: {
      visible: typeof tasksWidget?.visible === 'boolean' ? tasksWidget.visible : Boolean(showTasksWidget),
      placement: tasksWidget?.placement && (TASKS_PLACEMENTS as readonly string[]).includes(tasksWidget.placement)
        ? tasksWidget.placement
        : base.tasksWidget.placement,
    },
  };
}

export function formatClockTime(date: Date, locale: string, format: '12h' | '24h'): string {
  if (format === '12h') {
    return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23' });
}

export function resolveGreetingText(
  customText: string | undefined,
  hour: number,
  t: (key: string) => string
): string {
  const trimmed = typeof customText === 'string' ? customText.trim().slice(0, 80) : '';
  return trimmed || t(getGreetingKey(hour));
}

export function getClockClasses(
  style: NewTabLayoutConfig['clock']['style'],
  align: NewTabLayoutConfig['clock']['align'],
  useDarkCanvasStyle: boolean
) {
  const alignClass = align === 'left' ? 'items-start text-left' : 'items-center text-center';
  const textTone = useDarkCanvasStyle ? 'text-white' : 'text-slate-900';
  const dateTone = useDarkCanvasStyle ? 'text-white/75' : 'text-slate-500';

  switch (style) {
    case 'editorial':
      return {
        containerClass: `nova-clock w-full flex flex-col justify-center select-none ${alignClass}`,
        dateClass: `mb-3 text-xs uppercase tracking-[0.22em] font-medium ${dateTone}`,
        timeWrapperClass: '',
        timeClass: `text-7xl md:text-8xl font-serif font-normal tracking-tight transition-colors duration-300 ${textTone}`,
      };
    case 'mono':
      return {
        containerClass: `nova-clock w-full flex flex-col justify-center select-none ${alignClass}`,
        dateClass: `mb-2.5 text-xs font-mono uppercase tracking-widest ${dateTone}`,
        timeWrapperClass: '',
        timeClass: `text-6xl md:text-7xl font-mono font-semibold tracking-tight tabular-nums transition-colors duration-300 ${textTone}`,
      };
    case 'pill':
      return {
        containerClass: `nova-clock w-full flex flex-col justify-center select-none ${alignClass}`,
        dateClass: `mb-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium tracking-wide border transition-colors ${
          useDarkCanvasStyle
            ? 'bg-black/30 text-white/90 border-white/15 backdrop-blur-md'
            : 'bg-slate-900/5 text-slate-700 border-slate-900/10 backdrop-blur-sm'
        }`,
        timeWrapperClass: `inline-flex items-center justify-center px-8 py-3.5 rounded-full border backdrop-blur-xl shadow-lg transition-colors duration-300 ${
          useDarkCanvasStyle
            ? 'bg-black/35 border-white/20'
            : 'bg-white/80 border-slate-200/90'
        }`,
        timeClass: `text-5xl md:text-6xl font-medium tracking-tight font-sans tabular-nums transition-colors duration-300 ${textTone}`,
      };
    case 'minimal':
    default:
      return {
        containerClass: `nova-clock w-full flex flex-col justify-center select-none ${alignClass}`,
        dateClass: `mb-2.5 text-sm ${dateTone}`,
        timeWrapperClass: '',
        timeClass: `text-7xl md:text-8xl font-light tracking-tight font-sans tabular-nums transition-colors duration-300 ${textTone}`,
      };
  }
}

export function getSearchBoxClasses(
  style: NewTabLayoutConfig['searchBox']['style'],
  useDarkCanvasStyle: boolean
) {
  switch (style) {
    case 'solid':
      return {
        formClass: 'w-full relative group rounded-xl',
        inputClass: 'w-full py-4 ps-12 pe-24 text-base rounded-xl outline-none transition-colors duration-200 shadow-md border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-accent/25',
        submitBtnClass: 'p-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors cursor-pointer',
      };
    case 'minimal':
      return {
        formClass: 'w-full relative group rounded-none',
        inputClass: `w-full py-3.5 ps-11 pe-22 text-base rounded-none outline-none transition-colors duration-200 border-0 border-b-2 bg-transparent focus:ring-0 ${
          useDarkCanvasStyle
            ? 'border-white/30 text-white placeholder-white/55 focus:border-white'
            : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-900'
        }`,
        submitBtnClass: `p-2 rounded-lg bg-transparent transition-colors cursor-pointer ${
          useDarkCanvasStyle
            ? 'text-white/85 hover:text-white hover:bg-white/10'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/5'
        }`,
      };
    case 'pill':
      return {
        formClass: 'nova-newtab-glass w-full relative group rounded-full',
        inputClass: 'w-full py-4 ps-12 pe-24 text-base rounded-full outline-none transition-colors duration-200 shadow-sm border bg-white/85 dark:bg-slate-900/70 border-slate-200/80 dark:border-white/15 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900/90 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-accent/25',
        submitBtnClass: 'p-2 rounded-full bg-accent hover:bg-accent-hover text-white transition-colors cursor-pointer',
      };
    case 'glass':
    default:
      return {
        formClass: 'nova-newtab-glass w-full relative group rounded-xl',
        inputClass: 'w-full py-4 ps-12 pe-24 text-base rounded-xl outline-none transition-colors duration-200 shadow-sm border bg-white/85 dark:bg-slate-900/70 border-slate-200/80 dark:border-white/15 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900/90 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-accent/25',
        submitBtnClass: 'p-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors cursor-pointer',
      };
  }
}

export function getShortcutsContainerWidthClass(
  columns: 4 | 5 | 6 | 7 | 8,
  cardStyle: NewTabLayoutConfig['shortcuts']['cardStyle']
): string {
  const safeCols = clampShortcutColumns(columns);
  return cardStyle === 'pill'
    ? SHORTCUT_PILL_WIDTH_CLASSES[safeCols]
    : SHORTCUT_CONTAINER_WIDTH_CLASSES[safeCols];
}

export function getShortcutCardClasses(
  cardStyle: NewTabLayoutConfig['shortcuts']['cardStyle'],
  hasWallpaper: boolean
) {
  const surfaceClass = hasWallpaper ? 'nova-wallpaper-surface' : 'hover:bg-slate-100 dark:hover:bg-white/5';
  const addSurfaceClass = hasWallpaper
    ? 'nova-wallpaper-surface text-white'
    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-accent';

  switch (cardStyle) {
    case 'pill':
      return {
        buttonClass: `nova-shortcut w-full h-12 rounded-full flex flex-row items-center justify-start px-3 py-2 gap-2.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer group select-none ${surfaceClass}`,
        addButtonClass: `nova-shortcut w-full h-12 rounded-full flex flex-row items-center justify-start px-3 py-2 gap-2.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer ${addSurfaceClass}`,
        iconWrapClass: 'w-7 h-7 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden p-1.5 shrink-0 border border-slate-200 dark:border-white/10',
        labelClass: `text-xs font-medium truncate flex-1 text-left ${hasWallpaper ? 'text-white [text-shadow:0_1px_4px_#000]' : 'text-slate-700 dark:text-slate-300'}`,
        addLabelClass: 'text-xs font-semibold truncate',
        addIconClass: 'w-4 h-4 shrink-0',
        actionsPosClass: 'top-1/2 -translate-y-1/2 right-1.5',
        showLabel: true,
      };
    case 'icon-only':
      return {
        buttonClass: `nova-shortcut w-full aspect-square rounded-2xl flex items-center justify-center p-2.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer group select-none ${surfaceClass}`,
        addButtonClass: `nova-shortcut w-full aspect-square rounded-2xl flex items-center justify-center p-2.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer ${addSurfaceClass}`,
        iconWrapClass: 'w-11 h-11 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden p-2 shrink-0 border border-slate-200 dark:border-white/10',
        labelClass: '',
        addLabelClass: '',
        addIconClass: 'w-6 h-6',
        actionsPosClass: 'top-1.5 right-1.5',
        showLabel: false,
      };
    case 'compact':
      return {
        buttonClass: `nova-shortcut w-full rounded-xl flex flex-col items-center justify-center px-2 py-2.5 gap-1.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer group select-none ${surfaceClass}`,
        addButtonClass: `nova-shortcut w-full rounded-xl flex flex-col items-center justify-center px-2 py-2.5 gap-1.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer ${addSurfaceClass}`,
        iconWrapClass: 'w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden p-1.5 shrink-0 border border-slate-200 dark:border-white/10',
        labelClass: `text-[11px] font-medium truncate max-w-full ${hasWallpaper ? 'text-white [text-shadow:0_1px_4px_#000]' : 'text-slate-700 dark:text-slate-300'}`,
        addLabelClass: 'text-[11px] font-semibold truncate max-w-full',
        addIconClass: 'w-4 h-4',
        actionsPosClass: 'top-1 right-1',
        showLabel: true,
      };
    case 'tile':
    default:
      return {
        buttonClass: `nova-shortcut w-full aspect-square rounded-xl flex flex-col items-center justify-center p-3 gap-2.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer group select-none ${surfaceClass}`,
        addButtonClass: `nova-shortcut w-full aspect-square rounded-xl flex flex-col items-center justify-center p-3 gap-2.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer ${addSurfaceClass}`,
        iconWrapClass: 'w-11 h-11 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden p-2 shrink-0 border border-slate-200 dark:border-white/10',
        labelClass: `text-xs font-medium truncate max-w-full ${hasWallpaper ? 'text-white [text-shadow:0_1px_4px_#000]' : 'text-slate-700 dark:text-slate-300'}`,
        addLabelClass: 'text-xs font-semibold truncate max-w-full',
        addIconClass: 'w-6 h-6',
        actionsPosClass: 'top-1.5 right-1.5',
        showLabel: true,
      };
  }
}

interface ClockProps {
  variants?: any;
  isActive?: boolean;
  hasWallpaper?: boolean;
  isDarkTheme?: boolean;
  format?: NewTabLayoutConfig['clock']['format'];
  style?: NewTabLayoutConfig['clock']['style'];
  align?: NewTabLayoutConfig['clock']['align'];
}

const getGreetingKey = (hour: number): string => {
  if (hour < 12) return 'newtab.goodMorning';
  if (hour < 18) return 'newtab.goodAfternoon';
  return 'newtab.goodEvening';
};

function useMinuteClock(enabled: boolean): Date {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return;
    const updateTime = () => setCurrentTime(new Date());
    updateTime();
    // Minute precision avoids unnecessary 1s re-renders and locale formatting work.
    const now = new Date();
    const delayToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    let interval: ReturnType<typeof setInterval> | undefined;
    const firstTick = setTimeout(() => {
      updateTime();
      interval = setInterval(updateTime, 60_000);
    }, Math.max(250, delayToNextMinute));
    return () => {
      clearTimeout(firstTick);
      if (interval) clearInterval(interval);
    };
  }, [enabled]);

  return currentTime;
}

export const Clock: React.FC<ClockProps> = React.memo(({
  variants,
  isActive = true,
  hasWallpaper = false,
  isDarkTheme = true,
  format = '24h',
  style = 'minimal',
  align = 'center',
}) => {
  const { language } = useTranslation();
  const currentTime = useMinuteClock(isActive);

  const locale = getLocale(language);
  const timeStr = useMemo(() => formatClockTime(currentTime, locale, format), [currentTime, locale, format]);

  const dateStr = useMemo(() => {
    return currentTime.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
  }, [currentTime, locale]);

  // When a wallpaper is active or dark theme is enabled, use light text for contrast
  const useDarkCanvasStyle = hasWallpaper || isDarkTheme;
  const classes = getClockClasses(style, align, useDarkCanvasStyle);
  const timeEl = (
    <h1
      className={classes.timeClass}
      style={hasWallpaper ? { textShadow: '0 2px 12px rgba(0, 0, 0, 0.4)' } : undefined}
    >
      {timeStr}
    </h1>
  );

  return (
    <motion.div
      variants={variants}
      data-widget="clock"
      data-clock-style={style}
      data-clock-format={format}
      data-clock-align={align}
      className={classes.containerClass}
    >
      <p
        className={classes.dateClass}
        style={hasWallpaper ? { textShadow: '0 1px 6px rgba(0, 0, 0, 0.4)' } : undefined}
      >
        {dateStr}
      </p>

      {classes.timeWrapperClass ? (
        <div className={classes.timeWrapperClass}>{timeEl}</div>
      ) : (
        timeEl
      )}
    </motion.div>
  );
});

interface GreetingWidgetProps {
  variants?: any;
  isActive?: boolean;
  hasWallpaper?: boolean;
  isDarkTheme?: boolean;
  customText?: string;
  align?: NewTabLayoutConfig['clock']['align'];
  clockStyle?: NewTabLayoutConfig['clock']['style'];
}

const GreetingWidget: React.FC<GreetingWidgetProps> = React.memo(({
  variants,
  isActive = true,
  hasWallpaper = false,
  isDarkTheme = true,
  customText,
  align = 'center',
  clockStyle = 'minimal',
}) => {
  const { t, language } = useTranslation();
  const hasCustom = Boolean(typeof customText === 'string' && customText.trim());
  const currentTime = useMinuteClock(isActive && !hasCustom);
  const hour = currentTime.getHours();

  const greetingText = useMemo(
    () => resolveGreetingText(customText, hour, t),
    [customText, hour, t, language]
  );

  const useDarkCanvasStyle = hasWallpaper || isDarkTheme;
  const styleTypography =
    clockStyle === 'editorial'
      ? 'font-serif italic text-lg'
      : clockStyle === 'mono'
        ? 'font-mono text-sm tracking-wide'
        : 'text-base font-normal';

  return (
    <motion.p
      variants={variants}
      data-widget="greeting"
      data-greeting-custom={hasCustom ? 'true' : 'false'}
      className={`w-full transition-colors duration-300 select-none ${styleTypography} ${
        align === 'left' ? 'text-left' : 'text-center'
      } ${useDarkCanvasStyle ? 'text-white/80' : 'text-slate-600'}`}
      style={hasWallpaper ? { textShadow: '0 1px 6px rgba(0, 0, 0, 0.4)' } : undefined}
    >
      {greetingText}
    </motion.p>
  );
});

interface CustomizePillButtonProps {
  ariaLabel: string;
  useDarkCanvasStyle: boolean;
  onClick: () => void;
  capitalize?: boolean;
  children: React.ReactNode;
}

const CustomizePillButton: React.FC<CustomizePillButtonProps> = ({
  ariaLabel,
  useDarkCanvasStyle,
  onClick,
  capitalize = false,
  children,
}) => (
  <button
    type="button"
    aria-label={ariaLabel}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
      capitalize ? 'capitalize' : ''
    } ${
      useDarkCanvasStyle
        ? 'bg-slate-900/85 hover:bg-slate-800 text-white/90 border border-white/15'
        : 'bg-white/95 hover:bg-slate-100 text-slate-800 border border-slate-300/80 shadow-xs'
    }`}
  >
    {children}
  </button>
);

interface WidgetCustomizeFrameProps {
  widgetId: keyof NewTabLayoutConfig;
  label: string;
  isCustomizeMode: boolean;
  useDarkCanvasStyle: boolean;
  controls?: React.ReactNode;
  onHide: () => void;
  hideAriaLabel: string;
  className?: string;
  children: React.ReactNode;
}

const WidgetCustomizeFrame: React.FC<WidgetCustomizeFrameProps> = ({
  widgetId,
  label,
  isCustomizeMode,
  useDarkCanvasStyle,
  controls,
  onHide,
  hideAriaLabel,
  className = '',
  children,
}) => {
  if (!isCustomizeMode) {
    return <>{children}</>;
  }

  return (
    <div
      data-customize-widget={widgetId}
      className={`relative group/widget rounded-2xl p-2.5 transition-colors ring-1 ring-dashed ${
        useDarkCanvasStyle
          ? 'ring-cyan-400/60 hover:ring-cyan-300 bg-slate-950/20'
          : 'ring-accent/60 hover:ring-accent bg-white/45'
      } ${className}`}
    >
      <div
        data-widget-controls={widgetId}
        className="flex flex-wrap items-center justify-between gap-1.5 mb-2 text-[10px] font-medium"
      >
        <span
          className={`px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
            useDarkCanvasStyle
              ? 'bg-slate-900/80 text-cyan-300 border border-white/15'
              : 'bg-white/95 text-slate-700 border border-slate-300/80 shadow-xs'
          }`}
        >
          {label}
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {controls}
          <CustomizePillButton
            ariaLabel={hideAriaLabel}
            useDarkCanvasStyle={useDarkCanvasStyle}
            onClick={onHide}
          >
            <EyeOff className="w-3 h-3" />
            <span>Hide</span>
          </CustomizePillButton>
        </div>
      </div>
      {children}
    </div>
  );
};

const DEFAULT_SPEED_DIALS: SpeedDial[] = [
  { id: 'dial_google', name: 'Google', url: 'https://www.google.com', domain: 'google.com' },
  { id: 'dial_github', name: 'GitHub', url: 'https://github.com', domain: 'github.com' },
  { id: 'dial_youtube', name: 'YouTube', url: 'https://www.youtube.com', domain: 'youtube.com' },
  { id: 'dial_reddit', name: 'Reddit', url: 'https://www.reddit.com', domain: 'reddit.com' },
  { id: 'dial_wikipedia', name: 'Wikipedia', url: 'https://www.wikipedia.org', domain: 'wikipedia.org' }
];

export interface SpeedDial {
  /** Stable across reorder and across every tab; see {@link updateSpeedDial}. */
  id: string;
  name: string;
  url: string;
  domain: string;
}

/**
 * Reads a persisted speed-dial list.
 *
 * Three things make this more than a `JSON.parse`:
 *
 * - Rows written before dials had ids are given a fresh one here, so an edit
 *   opened against a legacy list still resolves a row by identity.
 * - A row can be a hole. The old positional editor did
 *   `updated[editingDial.index] = …`; after two deletes in another tab that
 *   assigns past the end of a one-element array, producing a sparse array that
 *   `JSON.stringify` writes out as `null`. `null` is not `undefined`, so the
 *   `.filter(d => d && typeof d.url === 'string')` guard that used to be here
 *   is what drops them — before the next Add spread the array, the iterator
 *   yielded a real `undefined`, and `title={dial.name}` threw into the
 *   full-screen ErrorBoundary.
 * - Unknown stored keys are dropped rather than spread into state.
 */
export function parseSpeedDials(raw: string): SpeedDial[] | null {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return null;
  const dials: SpeedDial[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object' || typeof entry.url !== 'string') continue;
    const url = normalizeNavigationUrl(entry.url);
    if (!isSafeNavigationUrl(url)) continue;
    dials.push({
      id: typeof entry.id === 'string' && entry.id ? entry.id : generateId('dial'),
      name: typeof entry.name === 'string' ? entry.name : '',
      url,
      domain: typeof entry.domain === 'string' && entry.domain ? entry.domain : getCleanDomain(url)
    });
  }
  return dials;
}

/**
 * Last line of defence for the grid.
 *
 * `parseSpeedDials` sanitises the persistent list, but an incognito/demo tab
 * seeds a private store straight from `DEFAULT_SPEED_DIALS`, and any future
 * writer could skip the parser. One unusable row must not take the whole new tab
 * down with it, so the grid renders only rows that carry the three fields it
 * dereferences.
 */
export function isRenderableSpeedDial(dial: unknown): dial is SpeedDial {
  if (!dial || typeof dial !== 'object') return false;
  const candidate = dial as Partial<SpeedDial>;
  return (
    typeof candidate.id === 'string' && candidate.id.length > 0 &&
    typeof candidate.name === 'string' &&
    typeof candidate.url === 'string' && candidate.url.length > 0
  );
}

/**
 * Applies the open editor to the row it is actually holding.
 *
 * The editor is per-`NewTabPage` instance and is NOT reset on a tab switch —
 * `App.tsx` keeps every `BrowserView` mounted and hides the inactive ones — while
 * the list is shared by every new tab in the window through
 * `useSharedLocalStorageState`. So the row can be deleted out from under the
 * open modal. Resolving by id at save time is what makes that safe: writing the
 * position the modal was opened with over a shortened array appends a phantom
 * third shortcut and loses the edit, and writing past the end builds the sparse
 * array described in {@link parseSpeedDials}.
 *
 * Returns `null` when the row is gone, so the caller can say so instead of
 * silently persisting nothing.
 */
export function updateSpeedDial(
  dials: SpeedDial[],
  targetId: string,
  next: Omit<SpeedDial, 'id'>
): SpeedDial[] | null {
  const index = dials.findIndex(dial => dial.id === targetId);
  if (index === -1) return null;
  const updated = [...dials];
  updated[index] = { ...next, id: targetId };
  return updated;
}

export function removeSpeedDial(dials: SpeedDial[], targetId: string): SpeedDial[] {
  return dials.filter(dial => dial.id !== targetId);
}

export function addSpeedDial(dials: SpeedDial[], dial: Omit<SpeedDial, 'id'>): SpeedDial[] {
  return [...dials, { ...dial, id: generateId('dial') }];
}

/**
 * Minimal credit line for the daily wallpaper pill.
 *
 * Unsplash titles are decorated for search ("4K Desktop Wallpaper (anime) …
 * 4K UHD") and the pill has room for a category, not for the query. The daily
 * wallpaper suite previously kept its own verbatim copies of these two
 * functions, which is how the production copy and the asserted copy could drift
 * without anything noticing.
 */
export function formatWallpaperCreditTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/^4k\s*(desktop\s*)?(wallpaper)?\s*(\((.*?)\))?/i, (_, _d, _w, _p, cat) => cat ? (cat.charAt(0).toUpperCase() + cat.slice(1)) : '')
    .replace(/\s*4k\s*(uhd)?$/i, '')
    .trim() || title;
}

export function formatWallpaperCreditAuthor(author: string): string {
  if (!author) return '';
  return author
    .replace(/\s*4k\s*curated$/i, '')
    .trim() || author;
}

/**
 * Suggests a clean display name for a website given its domain or hostname.
 */
export function getSuggestedSiteName(domain: string): string {
  if (!domain) return '';
  const clean = domain.toLowerCase().replace(/^(?:https?:\/\/)?(?:www\.)?/, '').split('/')[0].split(':')[0];
  const POPULAR_NAMES: Record<string, string> = {
    'google.com': 'Google',
    'youtube.com': 'YouTube',
    'github.com': 'GitHub',
    'reddit.com': 'Reddit',
    'wikipedia.org': 'Wikipedia',
    'twitter.com': 'Twitter',
    'x.com': 'X',
    'twitch.tv': 'Twitch',
    'linkedin.com': 'LinkedIn',
    'instagram.com': 'Instagram',
    'facebook.com': 'Facebook',
    'discord.com': 'Discord',
    'netflix.com': 'Netflix',
    'spotify.com': 'Spotify',
    'amazon.com': 'Amazon',
    'chatgpt.com': 'ChatGPT',
    'openai.com': 'OpenAI',
    'claude.ai': 'Claude',
    'stackoverflow.com': 'Stack Overflow',
  };
  if (POPULAR_NAMES[clean]) {
    return POPULAR_NAMES[clean];
  }
  const parts = clean.split('.');
  if (parts.length >= 2) {
    const namePart = parts[0];
    if (namePart) {
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
  }
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : '';
}

export const POPULAR_SHORTCUT_PRESETS = [
  { name: 'YouTube', url: 'https://youtube.com' },
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'Reddit', url: 'https://reddit.com' },
  { name: 'Wikipedia', url: 'https://wikipedia.org' },
  { name: 'X', url: 'https://x.com' },
  { name: 'Twitch', url: 'https://twitch.tv' },
];

// Session-level flag: only run the entrance animation once on initial application launch
let hasAnimatedInitialLaunch = false;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.01 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
  }
};

export const NewTabPage: React.FC<NewTabPageProps> = React.memo(({
  onNavigate,
  onNewTab,
  searchEngine = 'google',
  privacyShield = true,
  newTabBackground = 'default',
  backgroundCustomUrl = '',
  showTasksWidget = true,
  isIncognito = false,
  theme = 'dark',
  isActive = true,
  energySaverMode = false,
  browserColor = 'default',
  customBrowserColor = '',
  isDemo = false,
  onExitIncognito,
  newTabLayout,
  isCustomizeMode = false,
  onUpdateNewTabLayout,
}) => {
  const { t, language } = useTranslation();
  // Only animate on the first app launch, all subsequent new tabs open instantly
  const [shouldAnimate] = useState(() => {
    if (!hasAnimatedInitialLaunch) {
      hasAnimatedInitialLaunch = true;
      return true;
    }
    return false;
  });

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const suggestionRequestIdRef = useRef<number>(0);

  // Shared across every new tab in the window: a per-instance copy plus a
  // write-back effect meant the last tab to touch the list overwrote the rest.
  const [speedDials, setSpeedDials] = useSharedLocalStorageState<SpeedDial[]>(
    'nova_speed_dials',
    parseSpeedDials,
    () => DEFAULT_SPEED_DIALS,
    !isIncognito && !isDemo
  );

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // The open editor is identified by dial id, never by position: it survives a
  // tab switch, and the shared list can shrink underneath it. See
  // {@link updateSpeedDial}.
  const [editingDial, setEditingDial] = useState<{name: string, url: string, id: string | null}>({ name: '', url: '', id: null });
  const [urlError, setUrlError] = useState('');
  const editModalRef = useRef<HTMLDivElement>(null);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingDial({ name: '', url: '', id: null });
    setUrlError('');
  }, []);

  useModalFocusTrap(isEditModalOpen, handleCloseEditModal, editModalRef);

  const previewUrl = useMemo(() => {
    const raw = (editingDial.url || '').trim();
    if (!raw) return '';
    return normalizeNavigationUrl(raw);
  }, [editingDial.url]);

  const previewDomain = useMemo(() => {
    if (!previewUrl) return '';
    return getCleanDomain(previewUrl) || '';
  }, [previewUrl]);

  const previewName = useMemo(() => {
    if (editingDial.name.trim()) return editingDial.name.trim();
    if (previewDomain) {
      return getSuggestedSiteName(previewDomain);
    }
    return editingDial.id !== null
      ? (language === 'tr' ? 'Kısayol' : 'Shortcut')
      : (language === 'tr' ? 'Yeni Kısayol' : 'New Shortcut');
  }, [editingDial.name, previewDomain, editingDial.id, language]);

  const handleUrlChange = useCallback((newUrl: string) => {
    if (urlError) setUrlError('');
    const trimmed = newUrl.trim();
    const normalized = trimmed ? normalizeNavigationUrl(trimmed) : '';
    const newDomain = normalized ? getCleanDomain(normalized) : '';
    const newSuggested = newDomain ? getSuggestedSiteName(newDomain) : '';

    setEditingDial(prev => {
      const prevDomain = prev.url ? getCleanDomain(normalizeNavigationUrl(prev.url.trim())) : '';
      const prevSuggested = prevDomain ? getSuggestedSiteName(prevDomain) : '';
      const isUntouchedOrAuto = !prev.name.trim() || prev.name.trim() === prevSuggested;

      return {
        ...prev,
        url: newUrl,
        name: isUntouchedOrAuto && newSuggested ? newSuggested : prev.name,
      };
    });
  }, [urlError]);

  const [todos, setTodos] = useSharedLocalStorageState<Todo[]>(
    'nova_todos',
    parseTodos,
    () => [],
    !isIncognito && !isDemo
  );
  const [newTodo, setNewTodo] = useState('');

  // Resolved Daily 4K Ultra HD Wallpaper (only loads if wallpaper mode is active)
  const { photo: unsplashPhoto, photoUrl: unsplashUrl, shuffleNext: shuffleWallpaper } = useLiveUnsplashPhoto(newTabBackground === 'unsplash');

  // Refined wallpaper metadata for minimal premium pill display
  const formattedWallpaperTitle = useMemo(
    () => formatWallpaperCreditTitle(unsplashPhoto?.title || ''),
    [unsplashPhoto?.title]
  );

  const formattedWallpaperAuthor = useMemo(
    () => formatWallpaperCreditAuthor(unsplashPhoto?.author || ''),
    [unsplashPhoto?.author]
  );

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions
  useEffect(() => {
    const trimmed = (typeof query === 'string' ? query : '').trim();
    if (!isFocused || !trimmed || trimmed.includes('://')) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // 1. Instant 0ms cache lookup
    const clientLocale = getSearchLocale();
    const cacheKey = `${trimmed}_${searchEngine}`;
    const cached = getClientCachedSuggestions(cacheKey, clientLocale);
    if (cached) {
      setSuggestions(cached.slice(0, 6));
      setShowSuggestions(cached.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const currentReqId = ++suggestionRequestIdRef.current;

    const timer = setTimeout(async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getSuggestions) {
          const results = await (window as any).electronAPI.getSuggestions(trimmed, searchEngine, clientLocale);
          if (!abortController.signal.aborted && suggestionRequestIdRef.current === currentReqId) {
            if (Array.isArray(results)) {
              setClientCachedSuggestions(cacheKey, results, clientLocale);
              setSuggestions(results.slice(0, 6));
              setShowSuggestions(results.length > 0);
            } else {
              setSuggestions([]);
              setShowSuggestions(false);
            }
          }
          return;
        }

        // Without electron IPC, do not leak user typing to external domains from renderer
        setSuggestions([]);
        setShowSuggestions(false);
      } catch (err) {
        // ignore aborted or network errors
      }
    }, 35);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [query, isFocused, searchEngine, language]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    const todo = { id: generateId('todo'), text: newTodo.trim(), completed: false };
    setTodos(current => [...current, todo]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(current => current.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: string) => {
    setTodos(current => current.filter(t => t.id !== id));
  };

  const clearCompletedTodos = () => {
    setTodos(current => current.filter(t => !t.completed));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && selectedIndex >= 0 && selectedIndex < suggestions.length) {
      e.preventDefault();
      setQuery(suggestions[selectedIndex]);
      setSelectedIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    let target = query.trim();
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      target = suggestions[selectedIndex];
    }
    if (!target) return;
    setShowSuggestions(false);
    onNavigate(formatSearchUrl(target, searchEngine, getSearchLanguage()));
  };

  const handleAddSpeedDial = () => {
    const rawUrl = (editingDial.url || '').trim();
    if (!rawUrl) {
      setUrlError(language === 'tr' ? 'Lütfen bir web adresi girin.' : 'Please enter a web address.');
      return;
    }
    const url = normalizeNavigationUrl(rawUrl);
    if (!isSafeNavigationUrl(url)) {
      setUrlError(language === 'tr' ? 'Geçerli ve güvenli bir web adresi girin.' : 'Please enter a valid, safe URL.');
      return;
    }
    try {
      const domain = getCleanDomain(url);
      if (!domain) {
        setUrlError(language === 'tr' ? 'Geçerli bir alan adı bulunamadı.' : 'Could not determine a valid domain.');
        return;
      }
      const rawName = (editingDial.name || '').trim();
      const name = rawName || getSuggestedSiteName(domain);
      if (editingDial.id !== null) {
        const updated = updateSpeedDial(speedDials, editingDial.id, { name, url, domain });
        if (!updated) {
          // Another tab deleted the row while this editor was open. Say so
          // rather than appending a phantom shortcut under a stale position.
          setUrlError(language === 'tr'
            ? 'Bu kısayol başka bir sekmede silindi.'
            : 'This shortcut was deleted in another tab.');
          return;
        }
        setSpeedDials(updated);
      } else {
        setSpeedDials(addSpeedDial(speedDials, { name, url, domain }));
      }
    } catch (e) {
      setUrlError(language === 'tr' ? 'Adres işlenirken bir hata oluştu.' : 'Failed to process address.');
      return;
    }

    handleCloseEditModal();
  };

  const handleSpeedDialClick = (e: React.MouseEvent, rawUrl: string) => {
    const url = normalizeNavigationUrl(rawUrl);
    if (!url) return;
    if (e.metaKey || e.ctrlKey || e.button === 1) {
      e.preventDefault();
      if (onNewTab) {
        onNewTab(url);
        return;
      }
    }
    onNavigate(url);
  };

  const handleDeleteSpeedDial = (id: string) => {
    setSpeedDials(removeSpeedDial(speedDials, id));
  };


  // Memoize particle arrays to prevent jitter/regeneration on keystrokes
  const starParticles = React.useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      size: (i % 3 === 0 ? 2.5 : i % 2 === 0 ? 2 : 1.5),
      top: `${(i * 17 + 7) % 96}%`,
      left: `${(i * 23 + 13) % 98}%`,
      duration: 3 + (i % 4) * 1.5,
      delay: (i % 5) * 0.8,
    }));
  }, []);

  const fireflyParticles = React.useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: 3 + (i % 3) * 1.5,
      top: `${(i * 19 + 5) % 92}%`,
      left: `${(i * 29 + 11) % 94}%`,
      driftX: ((i % 5) - 2) * 20,
      driftY: -35 - (i % 4) * 15,
      duration: 5 + (i % 4) * 2,
      delay: (i % 6) * 0.7,
    }));
  }, []);

  const matrixColumns = React.useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: `${(i / 24) * 100 + 1}%`,
      height: `${30 + (i % 5) * 10}%`,
      speed: 2.2 + (i % 4) * 0.8,
      delay: (i % 7) * 0.4,
      opacity: 0.35 + (i % 3) * 0.25,
    }));
  }, []);

  const isDarkTheme = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const hasWallpaper = useMemo(() => {
    return newTabBackground === 'unsplash' ||
           newTabBackground === 'custom_url' ||
           ['matrix', 'nebula', 'hyper_space', 'fireflies', 'cyber_grid', 'aurora_waves', 'mesh', 'glass'].includes(newTabBackground);
  }, [newTabBackground]);

  const isCleanBackground = newTabBackground === 'default' || newTabBackground === 'plain';

  // The grid dereferences `dial.id`, `dial.name` and `dial.url` on every row, so
  // one unusable entry would render the whole new tab into the ErrorBoundary.
  const renderableSpeedDials = useMemo(
    () => speedDials.filter(isRenderableSpeedDial),
    [speedDials]
  );

  const shouldAnimateBg = isActive && !energySaverMode;

  const getBackgroundStyle = () => {
    if (hasWallpaper) {
      return 'text-white';
    }
    if (!isDarkTheme) {
      return 'text-slate-900';
    }
    switch (newTabBackground) {
      case 'gradient':
        return 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white';
      case 'mesh':
      case 'aurora_waves':
      case 'cyber_grid':
      case 'hyper_space':
      case 'fireflies':
      case 'nebula':
      case 'matrix':
        return 'text-white';
      case 'glass':
        return 'text-white backdrop-blur-xl';
      default:
        return 'text-slate-100';
    }
  };

  const isSafeBgUrl = useMemo(() => {
    if (!backgroundCustomUrl || typeof backgroundCustomUrl !== 'string') return false;
    const trimmed = backgroundCustomUrl.trim();
    if (!isSafeNavigationUrl(trimmed)) return false;
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' || (parsed.protocol === 'data:' && trimmed.startsWith('data:image/'));
    } catch {
      return false;
    }
  }, [backgroundCustomUrl]);

  const safeBgCssUrl = useMemo(() => {
    if (!isSafeBgUrl || !backgroundCustomUrl) return '';
    return backgroundCustomUrl.replace(/["'\\]/g, '');
  }, [isSafeBgUrl, backgroundCustomUrl]);

  const isVideoBg = newTabBackground === 'custom_url' && isSafeBgUrl && backgroundCustomUrl && (backgroundCustomUrl.toLowerCase().endsWith('.mp4') || backgroundCustomUrl.toLowerCase().endsWith('.webm'));

  const layout = useMemo(
    () => resolveNewTabLayout(newTabLayout, showTasksWidget),
    [newTabLayout, showTasksWidget]
  );

  const [isEditingGreeting, setIsEditingGreeting] = useState(false);
  useEffect(() => {
    if (!isCustomizeMode) setIsEditingGreeting(false);
  }, [isCustomizeMode]);

  const emitLayoutUpdate = useCallback(
    (patch: Partial<NewTabLayoutConfig>) => {
      if (!onUpdateNewTabLayout) return;
      onUpdateNewTabLayout({
        ...layout,
        ...patch,
      });
    },
    [layout, onUpdateNewTabLayout]
  );

  const hiddenWidgets = useMemo(() => {
    const items: Array<{ key: keyof NewTabLayoutConfig; label: string }> = [];
    if (!layout.clock.visible) items.push({ key: 'clock', label: 'Clock' });
    if (!layout.greeting.visible) items.push({ key: 'greeting', label: 'Greeting' });
    if (!layout.searchBox.visible) items.push({ key: 'searchBox', label: 'Search' });
    if (!layout.shortcuts.visible) items.push({ key: 'shortcuts', label: 'Shortcuts' });
    if (!layout.tasksWidget.visible) items.push({ key: 'tasksWidget', label: 'Tasks' });
    return items;
  }, [layout]);

  const useDarkCanvasStyle = hasWallpaper || isDarkTheme;
  const searchBoxClasses = useMemo(
    () => getSearchBoxClasses(layout.searchBox.style, useDarkCanvasStyle),
    [layout.searchBox.style, useDarkCanvasStyle]
  );
  const shortcutCardClasses = useMemo(
    () => getShortcutCardClasses(layout.shortcuts.cardStyle, hasWallpaper),
    [layout.shortcuts.cardStyle, hasWallpaper]
  );
  const shortcutsGridColsClass = SHORTCUT_COLUMN_CLASSES[layout.shortcuts.columns];
  const shortcutsContainerWidthClass = getShortcutsContainerWidthClass(
    layout.shortcuts.columns,
    layout.shortcuts.cardStyle
  );

  if (isIncognito) {
    return (
      <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center p-6 select-none bg-slate-950 text-slate-100">
        <motion.div
          variants={shouldAnimate ? containerVariants : undefined}
          initial={shouldAnimate ? "hidden" : false}
          animate="visible"
          className="w-full max-w-[560px] my-auto flex flex-col items-center gap-10 z-10 transition-[max-width,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        >
          <motion.div variants={shouldAnimate ? itemVariants : undefined} className="flex flex-col items-center text-center">
            <div className="w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center mb-8 border border-slate-800 shadow-sm">
              <VenetianMask className="w-16 h-16 text-slate-300" strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-4">{t('newtab.incognitoTitle')}</h1>
            <p className="text-lg text-slate-400 max-w-lg">
              {t('newtab.incognitoDesc')}
            </p>
          </motion.div>

          <motion.div variants={shouldAnimate ? itemVariants : undefined} className="w-full relative group">
            <form onSubmit={handleSearch} className="w-full">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('newtab.incognitoPlaceholder')}
                className="w-full block pl-14 pr-12 py-4.5 bg-slate-900/50 border border-slate-800 rounded-xl text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:bg-slate-900 focus:border-slate-700 transition-colors duration-200 shadow-sm"
              />
              <button
                type="submit"
                aria-label={t('newtab.search')}
                className="absolute inset-y-0 right-2 flex items-center justify-center w-10 my-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          </motion.div>

          {onExitIncognito && (
            <motion.div variants={shouldAnimate ? itemVariants : undefined}>
              <button
                type="button"
                onClick={onExitIncognito}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors duration-200 text-sm font-medium shadow-xs cursor-pointer"
              >
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>{language === 'tr' ? 'Normal Sekmeye Geç' : 'Switch to Normal Tab'}</span>
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={shouldAnimate ? { duration: 0.2, ease: 'easeOut' } : { duration: 0 }}
      style={{
        // A dark fallback keeps glass surfaces readable while a photo loads.
        backgroundColor: hasWallpaper ? '#101820' : 'var(--nova-frame-bg)'
      }}
      className={`nova-newtab ${isCleanBackground ? "nova-newtab-clean" : ""} w-full h-full relative overflow-x-hidden overflow-y-auto p-4 sm:p-6 select-none ${getBackgroundStyle()} ${isDarkTheme ? 'dark' : ''}`}
    >

      {/* Unsplash Background */}
      {newTabBackground === 'unsplash' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            key={unsplashUrl}
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 animate-in fade-in duration-1000"
            style={{
              backgroundImage: `url('${(unsplashUrl || '').replace(/["'\r\n\\]/g, '')}')`
            }}
          />
          <div className="absolute inset-0 bg-black/25"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/45"></div>

          {/* Daily Wallpaper Credit & Shuffle Button */}
          {unsplashPhoto && (
            <div className="nova-newtab-glass absolute bottom-4 left-6 z-20 flex items-center gap-2.5 bg-black/35 hover:bg-black/50 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 shadow-sm transition-colors duration-200 pointer-events-auto group select-none">
              <span className="text-[11px] font-medium text-white/85 group-hover:text-white max-w-[200px] truncate tracking-tight transition-colors">
                {formattedWallpaperTitle}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
              <span className="text-[11px] text-white/50 group-hover:text-white/75 max-w-[150px] truncate transition-colors font-normal">
                {formattedWallpaperAuthor}
              </span>
              <button
                type="button"
                onClick={shuffleWallpaper}
                className="ml-0.5 p-1 -mr-0.5 rounded-full text-white/40 hover:text-white hover:bg-white/15 active:scale-95 transition-colors duration-200 flex items-center justify-center focus:outline-none group/btn"
                title={t('newtab.shuffleWallpaper')}
              >
                <Shuffle className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom URL Background */}
      {newTabBackground === 'custom_url' && isSafeBgUrl && safeBgCssUrl && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {isVideoBg ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              src={backgroundCustomUrl}
            />
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-105"
              style={{ backgroundImage: `url('${safeBgCssUrl}')` }}
            />
          )}
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/50"></div>
        </div>
      )}

      {/* Default Clean Minimalist Background (Pure, pristine canvas with zero distractions) */}
      {newTabBackground === 'default' && null}

      {/* Vibrant Gradient Background.
          PERF: the drift animation must run on the COMPOSITOR (transform) —
          the previous backgroundPosition keyframes repainted this entire
          oversized blurred layer every frame. The extra full-screen
          backdrop-blur-[50px] overlay was also removed: the element's own
          blur-3xl filter already provides the soft look, and stacking a
          backdrop filter over an animated layer doubles GPU cost per frame. */}
      {newTabBackground === 'gradient' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={shouldAnimateBg ? {
              x: ['0%', '25%', '0%'],
            } : false}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-[50%] blur-3xl opacity-80"
            style={{
              backgroundImage: isDarkTheme
                ? 'linear-gradient(120deg, #1e1b4b, #0f172a, #3b0764, #022c22, #1e1b4b)'
                : 'linear-gradient(120deg, #dbeafe, #fce7f3, #e0e7ff, #ccfbf1, #dbeafe)',
              backgroundSize: '300% 300%',
              willChange: 'transform',
            }}
          />
          <div className={`absolute inset-0 ${isDarkTheme ? 'bg-slate-950/60' : 'bg-white/50'}`}></div>
        </div>
      )}

      {/* Glass Prism Background */}
      {newTabBackground === 'glass' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0" style={{ backgroundColor: 'var(--nova-frame-bg)' }} />
          <div className="absolute -top-[30%] left-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-600/15 blur-[120px]" />
          <div className="absolute -bottom-[30%] right-[10%] w-[60vw] h-[60vw] rounded-full bg-violet-600/15 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className={`absolute inset-0 backdrop-blur-2xl ${isDarkTheme ? 'bg-black/30' : 'bg-white/30'}`} />
        </div>
      )}

      {/* Fluid Mesh Aurora */}
      {newTabBackground === 'mesh' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={shouldAnimateBg ? { x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.08, 1] } : false}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-[15%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/20 blur-[60px]"
            style={{ willChange: 'transform', transform: 'translateZ(0)' }}
          />
          <motion.div
            animate={shouldAnimateBg ? { x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.1, 1] } : false}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute -bottom-[15%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/20 blur-[60px]"
            style={{ willChange: 'transform', transform: 'translateZ(0)' }}
          />
          <motion.div
            animate={shouldAnimateBg ? { scale: [1, 1.15, 1], opacity: [0.15, 0.28, 0.15] } : false}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute top-[25%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-teal-500/15 blur-[50px]"
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
          />
        </div>
      )}

      {/* Aurora Waves */}
      {newTabBackground === 'aurora_waves' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ backgroundColor: 'var(--nova-frame-bg)' }}>
          <motion.div
            animate={shouldAnimateBg ? {
              x: ['0%', '-33.33%', '0%'],
            } : false}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            className={`absolute top-[-30%] bottom-[-30%] left-0 w-[300%] blur-[48px] ${isDarkTheme ? 'opacity-60' : 'opacity-30'}`}
            style={{
              background: isDarkTheme
                ? 'linear-gradient(-45deg, #4338ca, #ec4899, #7c3aed, #06b6d4, #4338ca)'
                : 'linear-gradient(-45deg, #818cf8, #f472b6, #a855f7, #38bdf8, #818cf8)',
              willChange: 'transform',
              transform: 'translateZ(0)'
            }}
          />
          <div className={`absolute inset-0 ${isDarkTheme ? 'bg-[#080b12]/40' : 'bg-white/30'}`}></div>
        </div>
      )}

      {/* 3D Cyber Neon Grid */}
      {newTabBackground === 'cyber_grid' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ backgroundColor: 'var(--nova-frame-bg)' }}>
          {/* Horizon Glow Sun */}
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-gradient-to-b from-cyan-500/20 via-purple-500/15 to-transparent blur-[60px]" />

          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              perspective: '500px',
              perspectiveOrigin: '50% 50%',
            }}
          >
            <motion.div
              animate={shouldAnimateBg ? {
                y: ['0px', '48px'],
              } : false}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
              className="absolute bottom-0 left-[-50%] right-[-50%] h-[85vh]"
              style={{
                backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.4) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(6, 182, 212, 0.4) 1.5px, transparent 1.5px)',
                backgroundSize: '48px 48px',
                transform: 'rotateX(68deg) scale(2.4) translateZ(0)',
                transformOrigin: '50% 100%',
                willChange: 'transform',
              }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#04060a]/75 to-[#04060a]"></div>
        </div>
      )}

      {/* Hyper Space (Stable Stars) */}
      {newTabBackground === 'hyper_space' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ backgroundColor: 'var(--nova-frame-bg)' }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,58,138,0.25)_0%,rgba(5,7,14,1)_70%)]" />
          {starParticles.map((star) => (
            <motion.div
              key={`star-${star.id}`}
              className="absolute rounded-full bg-white"
              style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                top: star.top,
                left: star.left,
                boxShadow: '0 0 6px 1px rgba(255,255,255,0.6)',
                willChange: 'transform, opacity',
                transform: 'translateZ(0)'
              }}
              animate={shouldAnimateBg ? {
                scale: [0.7, 1.4, 0.7],
                opacity: [0.2, 0.95, 0.2],
              } : false}
              transition={{
                duration: star.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: star.delay
              }}
            />
          ))}
        </div>
      )}

      {/* Fireflies (Stable Particles) */}
      {newTabBackground === 'fireflies' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ backgroundColor: 'var(--nova-frame-bg)' }}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(30,64,175,0.25)_0%,rgba(10,15,29,1)_75%)]" />
          {fireflyParticles.map((fly) => (
            <motion.div
              key={`firefly-${fly.id}`}
              className="absolute bg-amber-400 rounded-full"
              style={{
                width: `${fly.size}px`,
                height: `${fly.size}px`,
                top: fly.top,
                left: fly.left,
                boxShadow: '0 0 10px 2px rgba(251, 191, 36, 0.45)',
                willChange: 'transform, opacity',
                transform: 'translateZ(0)'
              }}
              animate={shouldAnimateBg ? {
                y: [0, fly.driftY, 0],
                x: [0, fly.driftX, 0],
                opacity: [0.15, 0.9, 0.35, 0.9, 0.15],
                scale: [0.85, 1.25, 0.85]
              } : false}
              transition={{
                duration: fly.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: fly.delay
              }}
            />
          ))}
        </div>
      )}

      {/* Nebula Flow */}
      {newTabBackground === 'nebula' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ backgroundColor: 'var(--nova-frame-bg)' }}>
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.3)_0%,rgba(7,7,11,1)_70%)]" />
          <motion.div
            animate={shouldAnimateBg ? {
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            } : false}
            transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-[50%] blur-[56px] opacity-50"
            style={{
              background: 'conic-gradient(from 0deg at 50% 50%, #4338ca, #d946ef, #7c3aed, #06b6d4, #4338ca)',
              willChange: 'transform',
              transform: 'translateZ(0)'
            }}
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
      )}

      {/* Digital Rain / Matrix (Stable Streams) */}
      {newTabBackground === 'matrix' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ backgroundColor: 'var(--nova-frame-bg)' }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,78,59,0.2)_0%,rgba(2,5,3,1)_80%)]" />
          {matrixColumns.map((col) => (
            <motion.div
              key={`rain-${col.id}`}
              className="absolute w-[2px] bg-gradient-to-b from-transparent via-emerald-400 to-emerald-200"
              style={{
                left: col.left,
                height: col.height,
                top: '-40%',
                opacity: col.opacity,
                boxShadow: '0 0 8px 1.5px rgba(16, 185, 129, 0.4)',
                willChange: 'transform',
                transform: 'translateZ(0)'
              }}
              animate={shouldAnimateBg ? {
                y: ['0vh', '140vh'],
              } : false}
              transition={{
                duration: col.speed,
                repeat: Infinity,
                ease: "linear",
                delay: col.delay
              }}
            />
          ))}
        </div>
      )}

      <div
        className="nova-newtab-layout"
        data-tasks-visible={layout.tasksWidget.visible ? 'true' : 'false'}
        data-tasks-placement={layout.tasksWidget.placement}
      >
      {/* Hidden Widgets Restore Bar (Customize Mode) */}
      {isCustomizeMode && hiddenWidgets.length > 0 && (
        <div
          data-customize-hidden-widgets="true"
          className={`mb-6 z-40 flex flex-wrap items-center justify-center gap-1.5 px-3.5 py-2 rounded-full border backdrop-blur-md shadow-lg ${
            useDarkCanvasStyle
              ? 'bg-slate-900/85 border-white/15 text-white'
              : 'bg-white/95 border-slate-300/80 text-slate-800'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70 mr-1">
            Hidden:
          </span>
          {hiddenWidgets.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-label={`Show ${item.label}`}
              onClick={() => {
                emitLayoutUpdate({
                  [item.key]: {
                    ...layout[item.key],
                    visible: true,
                  },
                } as Partial<NewTabLayoutConfig>);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                useDarkCanvasStyle
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              <Eye className="w-3 h-3 text-accent" />
              <span>+ {item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <motion.div
        variants={shouldAnimate ? containerVariants : undefined}
        initial={shouldAnimate ? "hidden" : false}
        animate="visible"
        className="w-full max-w-[920px] my-auto flex flex-col items-center gap-8 z-10 transition-[max-width,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      >
        {/* Clock & Greeting Hero Block */}
        {(layout.clock.visible || layout.greeting.visible) && (
          <div
            className={`w-full max-w-[680px] mx-auto flex flex-col gap-3 ${
              layout.clock.align === 'left' ? 'items-start text-left' : 'items-center text-center'
            }`}
          >
            {layout.clock.visible && (
              <WidgetCustomizeFrame
                widgetId="clock"
                label="Clock"
                isCustomizeMode={isCustomizeMode}
                useDarkCanvasStyle={useDarkCanvasStyle}
                className="w-full"
                hideAriaLabel="Hide clock"
                onHide={() => emitLayoutUpdate({ clock: { ...layout.clock, visible: false } })}
                controls={
                  <>
                    <CustomizePillButton
                      ariaLabel="Cycle clock style"
                      useDarkCanvasStyle={useDarkCanvasStyle}
                      capitalize
                      onClick={() =>
                        emitLayoutUpdate({
                          clock: { ...layout.clock, style: cycleWidgetOption(layout.clock.style, CLOCK_STYLES) },
                        })
                      }
                    >
                      {layout.clock.style}
                    </CustomizePillButton>
                    <CustomizePillButton
                      ariaLabel="Toggle clock format"
                      useDarkCanvasStyle={useDarkCanvasStyle}
                      onClick={() =>
                        emitLayoutUpdate({
                          clock: { ...layout.clock, format: layout.clock.format === '24h' ? '12h' : '24h' },
                        })
                      }
                    >
                      {layout.clock.format}
                    </CustomizePillButton>
                    <CustomizePillButton
                      ariaLabel="Toggle clock alignment"
                      useDarkCanvasStyle={useDarkCanvasStyle}
                      capitalize
                      onClick={() =>
                        emitLayoutUpdate({
                          clock: { ...layout.clock, align: layout.clock.align === 'center' ? 'left' : 'center' },
                        })
                      }
                    >
                      {layout.clock.align}
                    </CustomizePillButton>
                  </>
                }
              >
                <Clock
                  variants={shouldAnimate ? itemVariants : undefined}
                  isActive={isActive}
                  hasWallpaper={hasWallpaper}
                  isDarkTheme={isDarkTheme}
                  format={layout.clock.format}
                  style={layout.clock.style}
                  align={layout.clock.align}
                />
              </WidgetCustomizeFrame>
            )}

            {layout.greeting.visible && (
              <WidgetCustomizeFrame
                widgetId="greeting"
                label="Greeting"
                isCustomizeMode={isCustomizeMode}
                useDarkCanvasStyle={useDarkCanvasStyle}
                className="w-full"
                hideAriaLabel="Hide greeting"
                onHide={() => emitLayoutUpdate({ greeting: { ...layout.greeting, visible: false } })}
                controls={
                  <CustomizePillButton
                    ariaLabel="Edit greeting text"
                    useDarkCanvasStyle={useDarkCanvasStyle}
                    onClick={() => setIsEditingGreeting((prev) => !prev)}
                  >
                    {isEditingGreeting ? 'Done' : 'Edit'}
                  </CustomizePillButton>
                }
              >
                {isCustomizeMode && isEditingGreeting ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      maxLength={80}
                      value={layout.greeting.customText ?? ''}
                      onChange={(e) =>
                        emitLayoutUpdate({
                          greeting: { ...layout.greeting, customText: e.target.value.slice(0, 80) },
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') {
                          e.preventDefault();
                          setIsEditingGreeting(false);
                        }
                      }}
                      placeholder="Auto time-of-day greeting..."
                      aria-label="Custom greeting text"
                      className={`w-full px-3 py-1.5 rounded-lg text-sm outline-none border ${
                        useDarkCanvasStyle
                          ? 'bg-slate-900/80 border-white/20 text-white placeholder-white/50'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                ) : (
                  <GreetingWidget
                    variants={shouldAnimate ? itemVariants : undefined}
                    isActive={isActive}
                    hasWallpaper={hasWallpaper}
                    isDarkTheme={isDarkTheme}
                    customText={layout.greeting.customText}
                    align={layout.clock.align}
                    clockStyle={layout.clock.style}
                  />
                )}
              </WidgetCustomizeFrame>
            )}
          </div>
        )}

        {/* Omnibox / Search Form */}
        {layout.searchBox.visible && (
        <motion.div
          variants={shouldAnimate ? itemVariants : undefined}
          data-widget="searchBox"
          data-search-style={layout.searchBox.style}
          data-search-width={layout.searchBox.width}
          className={`w-full ${SEARCH_WIDTH_CLASSES[layout.searchBox.width]} mx-auto relative z-30 transition-[max-width,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`}
          ref={searchContainerRef}
        >
          <WidgetCustomizeFrame
            widgetId="searchBox"
            label="Search"
            isCustomizeMode={isCustomizeMode}
            useDarkCanvasStyle={useDarkCanvasStyle}
            hideAriaLabel="Hide search box"
            onHide={() => emitLayoutUpdate({ searchBox: { ...layout.searchBox, visible: false } })}
            controls={
              <>
                <CustomizePillButton
                  ariaLabel="Cycle search style"
                  useDarkCanvasStyle={useDarkCanvasStyle}
                  capitalize
                  onClick={() =>
                    emitLayoutUpdate({
                      searchBox: {
                        ...layout.searchBox,
                        style: cycleWidgetOption(layout.searchBox.style, SEARCH_STYLES),
                      },
                    })
                  }
                >
                  {layout.searchBox.style}
                </CustomizePillButton>
                <CustomizePillButton
                  ariaLabel="Cycle search width"
                  useDarkCanvasStyle={useDarkCanvasStyle}
                  capitalize
                  onClick={() =>
                    emitLayoutUpdate({
                      searchBox: {
                        ...layout.searchBox,
                        width: cycleWidgetOption(layout.searchBox.width, SEARCH_WIDTHS),
                      },
                    })
                  }
                >
                  {layout.searchBox.width}
                </CustomizePillButton>
              </>
            }
          >
          <form onSubmit={handleSearch} className={searchBoxClasses.formClass}>
            <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none z-10 text-slate-400 group-focus-within:text-cyan-500 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                setIsFocused(true);
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('nav.searchPlaceholder', { engine: getSearchEngineName(searchEngine) })}
              aria-label={t('nav.newTab')}
              className={searchBoxClasses.inputClass}
            />

            <div className="absolute end-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {query && (
                <button
                  type="button"
                  aria-label={t('newtab.clearSearch')}
                  onClick={() => {
                    setQuery('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setSelectedIndex(-1);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                aria-label={t('newtab.search')}
                className={searchBoxClasses.submitBtnClass}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Search Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl shadow-lg overflow-hidden z-50 py-1.5 divide-y divide-slate-100 dark:divide-white/5"
              >
                {suggestions.map((s, idx) => (
                  <button
                    key={`${s}-${idx}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowSuggestions(false);
                      onNavigate(formatSearchUrl(s, searchEngine, getSearchLanguage()));
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-start text-sm transition-colors cursor-pointer ${
                      idx === selectedIndex
                        ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-semibold border-s-2 border-cyan-500'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 font-normal'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Search className={`w-4 h-4 shrink-0 ${idx === selectedIndex ? 'text-cyan-500' : 'text-slate-400'}`} />
                      <span className="truncate">{s}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Privacy & Engine Indicator */}
          <div className={`flex items-center justify-between px-3 mt-2 text-[11px] font-medium transition-colors ${
            hasWallpaper || isDarkTheme
              ? 'text-white/60'
              : 'text-slate-400 dark:text-slate-500'
          }`}>
            <div className="flex items-center gap-1.5">
              {privacyShield ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
                  <span>{t('newtab.shieldActive')}</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500/80" />
                  <span>{t('newtab.shieldDisabled')}</span>
                </>
              )}
            </div>
            <span>{t('newtab.searchEngine', { engine: getSearchEngineName(searchEngine) })}</span>
          </div>
          </WidgetCustomizeFrame>
        </motion.div>
        )}

        {/* Speed Dials */}
        {layout.shortcuts.visible && (
        <motion.div
          variants={shouldAnimate ? itemVariants : undefined}
          data-widget="shortcuts"
          className={`w-full ${shortcutsContainerWidthClass} mx-auto transition-[max-width,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`}
        >
          <WidgetCustomizeFrame
            widgetId="shortcuts"
            label="Shortcuts"
            isCustomizeMode={isCustomizeMode}
            useDarkCanvasStyle={useDarkCanvasStyle}
            hideAriaLabel="Hide shortcuts"
            onHide={() => emitLayoutUpdate({ shortcuts: { ...layout.shortcuts, visible: false } })}
            controls={
              <>
                <CustomizePillButton
                  ariaLabel="Cycle shortcuts style"
                  useDarkCanvasStyle={useDarkCanvasStyle}
                  capitalize
                  onClick={() =>
                    emitLayoutUpdate({
                      shortcuts: {
                        ...layout.shortcuts,
                        cardStyle: cycleWidgetOption(layout.shortcuts.cardStyle, SHORTCUT_CARD_STYLES),
                      },
                    })
                  }
                >
                  {layout.shortcuts.cardStyle}
                </CustomizePillButton>
                <CustomizePillButton
                  ariaLabel="Cycle shortcuts columns"
                  useDarkCanvasStyle={useDarkCanvasStyle}
                  onClick={() =>
                    emitLayoutUpdate({
                      shortcuts: {
                        ...layout.shortcuts,
                        columns: cycleWidgetOption(layout.shortcuts.columns, SHORTCUT_COLUMN_OPTIONS),
                      },
                    })
                  }
                >
                  {layout.shortcuts.columns} cols
                </CustomizePillButton>
              </>
            }
          >
          <div
            data-widget="shortcuts-grid"
            data-columns={layout.shortcuts.columns}
            data-card-style={layout.shortcuts.cardStyle}
            className={`grid ${shortcutsGridColsClass} gap-2.5 sm:gap-3 px-1 w-full`}
          >
            {renderableSpeedDials.map((dial) => (
              <motion.div
                key={dial.id}
                className="relative group min-w-0 w-full"
              >
                <button
                  onClick={(e) => handleSpeedDialClick(e, dial.url)}
                  onAuxClick={(e) => { if (e.button === 1) handleSpeedDialClick(e, dial.url); }}
                  className={shortcutCardClasses.buttonClass}
                  title={dial.name}
                  aria-label={dial.name}
                >
                  <div className={shortcutCardClasses.iconWrapClass}>
                    <SpeedDialIcon name={dial.name} url={dial.url} domain={dial.domain} />
                  </div>
                  {shortcutCardClasses.showLabel && (
                    <span className={shortcutCardClasses.labelClass}>{dial.name}</span>
                  )}
                </button>
                {/* group-hover alone hid these from keyboard users entirely: the
                    buttons were focusable but stayed at opacity 0, so the controls
                    existed and could not be seen. group-focus-within reveals the
                    group as soon as focus lands inside it. */}
                <div className={`absolute ${shortcutCardClasses.actionsPosClass} opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity flex gap-0.5 bg-slate-900/80 backdrop-blur-xs rounded-md p-0.5 border border-white/10 z-10`}>
                  <button
                    type="button"
                    aria-label={t('newtab.editSpeedDial', { name: dial.name })}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDial({ name: dial.name, url: dial.url, id: dial.id });
                      setUrlError('');
                      setIsEditModalOpen(true);
                    }}
                    className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    aria-label={t('newtab.removeSpeedDial', { name: dial.name })}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSpeedDial(dial.id);
                    }}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-white/10 rounded transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}

            {renderableSpeedDials.length < 10 && (
              <motion.div
                className="relative group min-w-0 w-full"
              >
                <button
                  onClick={() => {
                    setEditingDial({ name: '', url: '', id: null });
                    setUrlError('');
                    setIsEditModalOpen(true);
                  }}
                  aria-label={t('nav.addShortcut')}
                  title={t('nav.addShortcut')}
                  className={shortcutCardClasses.addButtonClass}
                  style={hasWallpaper ? { color: "white", textShadow: "0 1px 4px #000" } : undefined}
                >
                  <Plus className={shortcutCardClasses.addIconClass} />
                  {shortcutCardClasses.showLabel && (
                    <span className={shortcutCardClasses.addLabelClass}>{t('nav.addShortcut')}</span>
                  )}
                </button>
              </motion.div>
            )}
          </div>
          </WidgetCustomizeFrame>
        </motion.div>
        )}
      </motion.div>

      {/* ToDo / Tasks Widget */}
      {layout.tasksWidget.visible && (
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 15 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldAnimate ? { duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.1 } : { duration: 0 }}
        data-widget="tasksWidget"
        data-placement={layout.tasksWidget.placement}
        className={`nova-tasks-widget ${TASKS_PLACEMENT_CLASSES[layout.tasksWidget.placement]} relative z-20 w-full max-w-72 justify-self-center`}
      >
        <WidgetCustomizeFrame
          widgetId="tasksWidget"
          label="Tasks"
          isCustomizeMode={isCustomizeMode}
          useDarkCanvasStyle={useDarkCanvasStyle}
          hideAriaLabel="Hide tasks widget"
          onHide={() => emitLayoutUpdate({ tasksWidget: { ...layout.tasksWidget, visible: false } })}
          controls={
            <CustomizePillButton
              ariaLabel="Cycle tasks placement"
              useDarkCanvasStyle={useDarkCanvasStyle}
              capitalize
              onClick={() =>
                emitLayoutUpdate({
                  tasksWidget: {
                    ...layout.tasksWidget,
                    placement: cycleWidgetOption(layout.tasksWidget.placement, TASKS_PLACEMENTS),
                  },
                })
              }
            >
              {layout.tasksWidget.placement}
            </CustomizePillButton>
          }
        >
        <div
          className="w-full rounded-xl overflow-hidden flex flex-col shadow-sm border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200/90 dark:border-slate-700/60"
          style={{ maxHeight: '380px' }}
        >
        <div className="px-5 py-3.5 border-b font-semibold text-sm flex justify-between items-center border-slate-200/80 dark:border-slate-700/50 text-slate-800 dark:text-white">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-accent" />
            <span>{t('newtab.tasks')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium opacity-60 bg-slate-500/10 px-2 py-0.5 rounded-full">
              {t('newtab.tasksLeft', { count: todos.filter(t => !t.completed).length })}
            </span>
            {todos.some(t => t.completed) && (
              <button
                onClick={clearCompletedTodos}
                className="text-xs font-semibold text-red-500 hover:text-red-400 transition-colors opacity-80 hover:opacity-100 ml-1 cursor-pointer"
                title={t('newtab.clearTasksTitle')}
              >
                {t('newtab.clearCompletedTasks')}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-hide">
          <AnimatePresence initial={false}>
            {todos.map(todo => (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                onClick={() => toggleTodo(todo.id)}
                role="checkbox"
                aria-checked={todo.completed}
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.target as Element).closest('button')) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleTodo(todo.id);
                  }
                }}
                className={`flex items-center justify-between gap-3 p-2.5 rounded-xl group cursor-pointer transition-colors ${
                  todo.completed ? 'opacity-60 bg-slate-500/5' : 'hover:bg-slate-100/80 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                    todo.completed
                      ? 'bg-accent text-white shadow-xs shadow-accent/30'
                      : 'border-2 border-slate-300 dark:border-slate-600 group-hover:border-accent'
                  }`}>
                    {todo.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className={`text-sm truncate select-none transition-colors text-slate-800 dark:text-slate-100 ${
                    todo.completed ? 'line-through opacity-70' : ''
                  }`}>
                    {todo.text}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTodo(todo.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors shrink-0 cursor-pointer"
                  title={t('newtab.deleteTask')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {todos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <CheckSquare className="w-6 h-6 stroke-[1.5] text-accent" />
              <span>{t('newtab.noTasks')}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleAddTodo} className="p-3 border-t border-slate-200/80 dark:border-slate-700/50">
          <div className="relative flex items-center">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder={t('newtab.addTaskPlaceholder')}
              className="w-full bg-slate-500/10 px-3 py-2 pr-8 rounded-xl text-sm outline-none placeholder-opacity-50 transition-colors focus:ring-2 focus:ring-accent/40 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
            />
            {newTodo.trim() && (
              <button
                type="submit"
                aria-label={t('newtab.addTask')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
        </div>
        </WidgetCustomizeFrame>
      </motion.div>
      )}

      </div>

      {/* Edit/Add Modal */}
      <AnimatePresence>
      {isEditModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-4 select-auto"
          onClick={handleCloseEditModal}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            ref={editModalRef}
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcut-modal-title"
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-slate-100 select-auto outline-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="shortcut-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                    {editingDial.id !== null ? t('newtab.editShortcutTitle') : t('newtab.addShortcutTitle')}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {editingDial.id !== null
                      ? (language === 'tr' ? 'Kısayol bilgilerini güncelleyin' : 'Update shortcut details')
                      : (language === 'tr' ? 'Hızlı erişim için yeni bir web sitesi ekleyin' : 'Add a new website for quick access')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                aria-label={t('common.close')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Visual Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 mb-4 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center p-2 shadow-xs border border-slate-200/80 dark:border-white/10 shrink-0">
                {previewDomain || previewUrl ? (
                  <SpeedDialIcon name={previewName} url={previewUrl} domain={previewDomain} />
                ) : (
                  <Globe className="w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-xs font-semibold truncate ${
                  previewDomain || editingDial.name.trim()
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {previewName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono mt-0.5">
                  {previewDomain || (language === 'tr' ? 'Önizleme için URL girin' : 'Enter URL to preview')}
                </div>
              </div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-3.5">
              <div>
                <label htmlFor="shortcut-name-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  {t('newtab.shortcutName')}
                </label>
                <input
                  id="shortcut-name-input"
                  type="text"
                  value={editingDial.name}
                  onChange={(e) => {
                    setEditingDial({ ...editingDial, name: e.target.value });
                    if (urlError) setUrlError('');
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddSpeedDial(); }}
                  placeholder={language === 'tr' ? 'Örn. YouTube, GitHub...' : 'e.g. YouTube, GitHub...'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20 transition-all"
                />
              </div>
              <div>
                <label htmlFor="shortcut-url-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  {t('newtab.shortcutUrl')}
                </label>
                <input
                  id="shortcut-url-input"
                  type="text"
                  value={editingDial.url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddSpeedDial(); }}
                  placeholder={language === 'tr' ? 'Örn. https://youtube.com veya youtube.com' : 'e.g. https://youtube.com or youtube.com'}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all ${
                    urlError
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700/80 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20'
                  }`}
                />
                {urlError && (
                  <p className="text-xs text-rose-500 dark:text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
                    {urlError}
                  </p>
                )}
              </div>

              {editingDial.id === null && (
                <div className="pt-0.5">
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    {language === 'tr' ? 'Hızlı öneriler:' : 'Quick suggestions:'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SHORTCUT_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setEditingDial({
                            id: null,
                            name: preset.name,
                            url: preset.url,
                          });
                          if (urlError) setUrlError('');
                        }}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-white/10">
              {editingDial.id !== null ? (
                <button
                  type="button"
                  onClick={() => {
                    if (editingDial.id !== null) {
                      handleDeleteSpeedDial(editingDial.id);
                      handleCloseEditModal();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('common.delete')}</span>
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleAddSpeedDial}
                  disabled={!editingDial.url.trim()}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-xs ${
                    !editingDial.url.trim()
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                      : 'bg-accent hover:bg-accent-hover text-white cursor-pointer active:scale-[0.98]'
                  }`}
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

    </motion.div>
  );
});
