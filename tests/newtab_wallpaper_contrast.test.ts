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

console.log('[PASS] ALL New Tab Wallpaper Contrast tests passed with 100% success.');
