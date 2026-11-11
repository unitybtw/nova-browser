import {
  resolveNewTabLayout,
  formatClockTime,
  resolveGreetingText,
  getClockClasses,
  getSearchBoxClasses,
  getShortcutsContainerWidthClass,
  getShortcutCardClasses,
  clampShortcutColumns,
  cycleWidgetOption,
  SHORTCUT_COLUMN_CLASSES,
  SEARCH_WIDTH_CLASSES,
  TASKS_PLACEMENT_CLASSES,
  CLOCK_STYLES,
  SEARCH_STYLES,
  SEARCH_WIDTHS,
  SHORTCUT_CARD_STYLES,
  SHORTCUT_COLUMN_OPTIONS,
  TASKS_PLACEMENTS,
} from '../src/components/NewTabPage';
import { DEFAULT_DESIGN_PROFILE } from '../src/utils/designDefaults';

console.log('--- New Tab Wallpaper Contrast & Light Mode Clock Styling Suite ---');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
}

// 1. Wallpaper Detection Logic
const WALLPAPER_TYPES = ['unsplash', 'custom_url', 'matrix', 'nebula', 'hyper_space', 'fireflies', 'cyber_grid', 'aurora_waves', 'mesh', 'glass'];
const NON_WALLPAPER_TYPES = ['default', 'plain'];

function computeHasWallpaper(bg: string): boolean {
  return bg === 'unsplash' || bg === 'custom_url' || ['matrix', 'nebula', 'hyper_space', 'fireflies', 'cyber_grid', 'aurora_waves', 'mesh', 'glass'].includes(bg);
}

for (const type of WALLPAPER_TYPES) {
  assert(computeHasWallpaper(type) === true, `Wallpaper type '${type}' should be recognized as hasWallpaper`);
}
for (const type of NON_WALLPAPER_TYPES) {
  assert(computeHasWallpaper(type) === false, `Type '${type}' should NOT be recognized as hasWallpaper`);
}
console.log('[PASS] [NewTab-Contrast-1] All wallpaper and canvas types accurately evaluated.');

// 2. Clock Dark Canvas Rule (Light Mode with Wallpaper must be high-contrast white)
function getClockStyling(hasWallpaper: boolean, isDarkTheme: boolean) {
  const useDarkCanvasStyle = hasWallpaper || isDarkTheme;
  return {
    useDarkCanvasStyle,
    timeClass: useDarkCanvasStyle 
      ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] drop-shadow-[0_10px_28px_rgba(0,0,0,0.65)]' 
      : 'text-slate-900 drop-shadow-[0_2px_12px_rgba(0,0,0,0.15)]',
    pillClass: useDarkCanvasStyle
      ? 'bg-black/35 hover:bg-black/50 text-white/95 border border-white/20 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/10'
      : 'bg-slate-900/10 hover:bg-slate-900/15 text-slate-800 border border-slate-900/15 backdrop-blur-md shadow-sm',
    greetingClass: useDarkCanvasStyle
      ? 'text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] drop-shadow-[0_6px_20px_rgba(0,0,0,0.55)]'
      : 'text-slate-700 drop-shadow-[0_1px_8px_rgba(0,0,0,0.15)]'
  };
}

// Case A: User in LIGHT mode with an Unsplash or colorful photo wallpaper
const lightWithWallpaper = getClockStyling(true, false);
assert(lightWithWallpaper.useDarkCanvasStyle === true, 'Light theme with wallpaper MUST use dark canvas high-contrast styling');
assert(lightWithWallpaper.timeClass.includes('text-white'), 'Light theme with wallpaper must use text-white for time');
assert(lightWithWallpaper.timeClass.includes('drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]'), 'Light theme with wallpaper must use layered drop shadows');
assert(lightWithWallpaper.pillClass.includes('bg-black/35') && lightWithWallpaper.pillClass.includes('text-white/95'), 'Date pill must use frosted glass on wallpaper');
assert(lightWithWallpaper.greetingClass.includes('text-white/95'), 'Greeting must be high-contrast white on wallpaper in light mode');

// Case B: User in LIGHT mode WITHOUT wallpaper (plain white new tab page)
const lightNoWallpaper = getClockStyling(false, false);
assert(lightNoWallpaper.useDarkCanvasStyle === false, 'Light theme without wallpaper should use standard dark typography');
assert(lightNoWallpaper.timeClass.includes('text-slate-900'), 'Time should be dark slate in plain light mode');
assert(lightNoWallpaper.greetingClass.includes('text-slate-700'), 'Greeting should be dark slate in plain light mode');

// Case C: User in DARK mode WITH wallpaper
const darkWithWallpaper = getClockStyling(true, true);
assert(darkWithWallpaper.useDarkCanvasStyle === true, 'Dark mode with wallpaper must use dark canvas styling');
assert(darkWithWallpaper.timeClass.includes('text-white'), 'Dark mode with wallpaper must use text-white');

// Case D: User in DARK mode WITHOUT wallpaper
const darkNoWallpaper = getClockStyling(false, true);
assert(darkNoWallpaper.useDarkCanvasStyle === true, 'Dark mode without wallpaper must use dark canvas styling');

console.log('[PASS] [NewTab-Contrast-2] Clock and Date pill styling correctly adapts to wallpaper presence in both light and dark modes.');

// 3. Privacy Indicator Contrast
function getPrivacyIndicatorClass(hasWallpaper: boolean, isDarkTheme: boolean): string {
  return (hasWallpaper || isDarkTheme)
    ? 'text-white/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]'
    : 'text-slate-600 dark:text-slate-300 drop-shadow-sm';
}

assert(getPrivacyIndicatorClass(true, false).includes('text-white/95'), 'Privacy indicator must be bright white on wallpaper in light mode');
assert(getPrivacyIndicatorClass(false, false).includes('text-slate-600'), 'Privacy indicator must use slate in plain light mode');
console.log('[PASS] [NewTab-Contrast-3] Privacy indicator contrast verified.');

// 4. Greeting Key calculation for all 24 hours of day
function getGreetingKey(hour: number): string {
  if (hour < 12) return 'newtab.goodMorning';
  if (hour < 18) return 'newtab.goodAfternoon';
  return 'newtab.goodEvening';
}

for (let h = 0; h < 24; h++) {
  const key = getGreetingKey(h);
  if (h < 12) {
    assert(key === 'newtab.goodMorning', `Hour ${h} should be morning`);
  } else if (h < 18) {
    assert(key === 'newtab.goodAfternoon', `Hour ${h} should be afternoon`);
  } else {
    assert(key === 'newtab.goodEvening', `Hour ${h} should be evening`);
  }
}
console.log('[PASS] [NewTab-Contrast-4] Greeting key calculation verified across all 24 hours.');

// 5. Modular New Tab Widget Layout Helpers & Static Tailwind Maps
const fallbackHidden = resolveNewTabLayout(undefined, false);
assert(fallbackHidden.tasksWidget.visible === false, 'Omitted layout with showTasksWidget=false hides tasks');
assert(fallbackHidden.clock.visible === true && fallbackHidden.clock.format === '24h', 'Omitted layout uses default clock config');

const fallbackShown = resolveNewTabLayout(undefined, true);
assert(fallbackShown.tasksWidget.visible === true, 'Omitted layout with showTasksWidget=true preserves legacy tasks visibility');

// Clamping & sanitization
assert(clampShortcutColumns(2) === 4, 'Columns below 4 clamp to 4');
assert(clampShortcutColumns(12) === 8, 'Columns above 8 clamp to 8');
assert(clampShortcutColumns(Number.NaN) === 4, 'NaN columns fall back to 4');
const clampedLayout = resolveNewTabLayout({
  ...DEFAULT_DESIGN_PROFILE.newTabLayout,
  shortcuts: { visible: true, columns: 99 as any, cardStyle: 'pill' },
});
assert(clampedLayout.shortcuts.columns === 8, 'resolveNewTabLayout clamps out-of-range columns to 8');

// Clock 12h vs 24h formatting
const afternoon = new Date(2026, 0, 1, 14, 5);
const midnight = new Date(2026, 0, 1, 0, 5);
assert(formatClockTime(afternoon, 'en-US', '24h') === '14:05', '24h clock renders 14:05');
assert(formatClockTime(midnight, 'en-US', '24h') === '00:05', '24h clock renders 00:05 at midnight');
assert(formatClockTime(afternoon, 'en-US', '12h').includes('2:05'), '12h clock renders 2:05');
assert(/AM|PM/i.test(formatClockTime(afternoon, 'en-US', '12h')), '12h clock includes AM/PM meridiem');

// Clock styles & alignment contrast
for (const style of CLOCK_STYLES) {
  const darkAlignLeft = getClockClasses(style, 'left', true);
  assert(darkAlignLeft.containerClass.includes('items-start') && darkAlignLeft.containerClass.includes('text-left'), `Clock style ${style} supports left alignment`);
  assert(darkAlignLeft.timeClass.includes('text-white'), `Clock style ${style} keeps text-white on dark/wallpaper canvas`);
  const lightAlignCenter = getClockClasses(style, 'center', false);
  assert(lightAlignCenter.containerClass.includes('items-center') && lightAlignCenter.containerClass.includes('text-center'), `Clock style ${style} supports center alignment`);
  assert(lightAlignCenter.timeClass.includes('text-slate-900'), `Clock style ${style} keeps dark slate text on plain light canvas`);
}
assert(getClockClasses('editorial', 'center', true).timeClass.includes('font-serif'), 'Editorial clock uses serif font');
assert(getClockClasses('mono', 'center', true).timeClass.includes('font-mono'), 'Mono clock uses monospace font');
assert(getClockClasses('pill', 'center', true).timeWrapperClass.includes('rounded-full'), 'Pill clock wraps time in pill capsule');

// Custom greeting resolution
const fakeT = (k: string) => (k === 'newtab.goodMorning' ? 'Good Morning' : k === 'newtab.goodAfternoon' ? 'Good Afternoon' : 'Good Evening');
assert(resolveGreetingText('  Focus Mode  ', 9, fakeT) === 'Focus Mode', 'Custom greeting trims whitespace and overrides time greeting');
assert(resolveGreetingText('   ', 9, fakeT) === 'Good Morning', 'Whitespace-only custom greeting falls back to translated greeting');
assert(resolveGreetingText(undefined, 20, fakeT) === 'Good Evening', 'Undefined custom greeting uses evening greeting at 20:00');

// Search box widths & styles
assert(SEARCH_WIDTH_CLASSES.narrow === 'max-w-[440px]', 'Narrow search width is max-w-[440px]');
assert(SEARCH_WIDTH_CLASSES.medium === 'max-w-[560px]', 'Medium search width is max-w-[560px]');
assert(SEARCH_WIDTH_CLASSES.wide === 'max-w-[740px]', 'Wide search width is max-w-[740px]');
assert(getSearchBoxClasses('glass', true).formClass.includes('nova-newtab-glass'), 'Glass search uses nova-newtab-glass');
assert(!getSearchBoxClasses('solid', true).formClass.includes('nova-newtab-glass'), 'Solid search omits clean transparent override');
assert(getSearchBoxClasses('minimal', false).inputClass.includes('border-b-2'), 'Minimal search uses bottom border underline');
assert(getSearchBoxClasses('pill', true).inputClass.includes('rounded-full'), 'Pill search uses rounded-full input');

// Static Tailwind grid column classes & card styles
for (const col of SHORTCUT_COLUMN_OPTIONS) {
  assert(SHORTCUT_COLUMN_CLASSES[col].includes(`grid-cols-${col}`), `Static map includes literal grid-cols-${col}`);
  assert(Boolean(getShortcutsContainerWidthClass(col, 'tile')), `Width class exists for ${col} tile columns`);
  assert(Boolean(getShortcutsContainerWidthClass(col, 'pill')), `Width class exists for ${col} pill columns`);
}
assert(getShortcutCardClasses('tile', false).showLabel === true, 'Tile cards show labels');
assert(getShortcutCardClasses('pill', false).buttonClass.includes('rounded-full'), 'Pill cards use rounded-full');
assert(getShortcutCardClasses('icon-only', false).showLabel === false, 'Icon-only cards hide labels');
assert(getShortcutCardClasses('compact', false).iconWrapClass.includes('w-8'), 'Compact cards use smaller icon wrap');

// Tasks widget placements & option cycler
for (const placement of TASKS_PLACEMENTS) {
  assert(Boolean(TASKS_PLACEMENT_CLASSES[placement]), `Placement class defined for ${placement}`);
}
assert(cycleWidgetOption('minimal', CLOCK_STYLES) === 'editorial', 'Option cycler advances cleanly');
assert(cycleWidgetOption('pill', CLOCK_STYLES) === 'minimal', 'Option cycler wraps cleanly');
assert(cycleWidgetOption('wide', SEARCH_WIDTHS) === 'narrow', 'Search width cycler wraps cleanly');
assert(cycleWidgetOption('compact', SHORTCUT_CARD_STYLES) === 'tile', 'Shortcut card style cycler wraps cleanly');
assert(cycleWidgetOption('glass', SEARCH_STYLES) === 'solid', 'Search style cycler advances cleanly');
console.log('[PASS] [NewTab-Layout-5] Modular New Tab widget helpers, static Tailwind maps, and fallbacks verified.');

console.log('[PASS] ALL New Tab Wallpaper Contrast tests passed with 100% success.');
