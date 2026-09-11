import { 
  getDailyWallpaperIndex, 
  getLocalDateString, 
  CURATED_4K_WALLPAPERS, 
  STORAGE_KEYS, 
  getInitialActiveWallpaper,
  WallpaperPhoto
} from '../src/utils/unsplash';

console.log('--- Daily 4K Wallpaper & Synchronization Test Suite ---');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
}

// 1. Deterministic Daily Index Calculation
const testDates = ['2026-09-11', '2026-09-12', '2026-01-01', '2026-12-31'];
for (const d of testDates) {
  const idx1 = getDailyWallpaperIndex(d, 40);
  const idx2 = getDailyWallpaperIndex(d, 40);
  assert(idx1 === idx2, `Deterministic seed failed for date ${d}: ${idx1} !== ${idx2}`);
  assert(idx1 >= 0 && idx1 < 40, `Daily index out of bounds for date ${d}: ${idx1}`);
}
console.log('[PASS] [Wallpaper-Sync-1] Deterministic daily wallpaper calculation is 100% consistent across multiple invocations.');

// 2. Pool Size & UHD Resolution Guarantees
assert(CURATED_4K_WALLPAPERS.length >= 35, `Curated pool is too small: ${CURATED_4K_WALLPAPERS.length} (expected >= 35)`);
const invalidPhotos = CURATED_4K_WALLPAPERS.filter(p => !p.imageUrl.includes('3840') || !p.imageUrl.startsWith('https://'));
assert(invalidPhotos.length === 0, `Photos missing 4K resolution parameter or insecure URL: ${invalidPhotos.length}`);
console.log(`[PASS] [Wallpaper-Sync-2] Curated 4K UHD pool verified with ${CURATED_4K_WALLPAPERS.length} Ultra HD wallpapers.`);

// 3. Unique Identifiers Across All Wallpapers
const ids = new Set<string>();
for (const p of CURATED_4K_WALLPAPERS) {
  assert(!ids.has(p.id), `Duplicate wallpaper ID found: ${p.id}`);
  ids.add(p.id);
  assert(Boolean(p.title && p.author && p.thumbnailUrl), `Incomplete photo metadata for ID: ${p.id}`);
}
console.log('[PASS] [Wallpaper-Sync-3] All wallpaper IDs are unique and metadata is complete.');

// 4. Fallback when pool is empty or singleton
const singlePool: WallpaperPhoto[] = [{
  id: 'single-test',
  title: 'Test',
  author: 'Tester',
  imageUrl: 'https://example.com/test.jpg',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  source: 'Test',
  resolution: '3840x2160'
}];
const singleIdx = getDailyWallpaperIndex('2026-09-11', singlePool.length);
assert(singleIdx === 0, `Single pool index should be 0, got ${singleIdx}`);
console.log('[PASS] [Wallpaper-Sync-4] Boundary condition with single-item pool verified safely.');

// 5. Active Wallpaper Storage Keys Structure
assert(STORAGE_KEYS.ACTIVE_WALLPAPER_ID === 'nova_wallpaper_active_id', 'Storage key ACTIVE_WALLPAPER_ID mismatch');
assert(STORAGE_KEYS.ACTIVE_WALLPAPER_DATE === 'nova_wallpaper_active_date', 'Storage key ACTIVE_WALLPAPER_DATE mismatch');
assert(STORAGE_KEYS.USER_OVERRIDE === 'nova_wallpaper_user_override', 'Storage key USER_OVERRIDE mismatch');
assert(STORAGE_KEYS.CUSTOM_PHOTO === 'nova_wallpaper_custom_photo', 'Storage key CUSTOM_PHOTO mismatch');
console.log('[PASS] [Wallpaper-Sync-5] Persistent storage keys validated.');

// 6. Security URL Validation & Injection Defense
import { isValidWallpaperUrl, sanitizeWallpaperPhoto } from '../src/utils/unsplash';

assert(isValidWallpaperUrl('https://images.unsplash.com/photo-123?w=3840'), 'Valid HTTPS URL rejected');
assert(isValidWallpaperUrl('http://example.com/test.jpg'), 'Valid HTTP URL rejected');
assert(!isValidWallpaperUrl('javascript:alert(1)'), 'Dangerous javascript: scheme was not blocked');
assert(!isValidWallpaperUrl('data:text/html,<script>'), 'data: scheme was not blocked');
assert(!isValidWallpaperUrl("https://example.com/photo.jpg'); background: red;"), 'CSS breakout single quote not blocked');
assert(!isValidWallpaperUrl('https://example.com/photo.jpg"'), 'Double quote not blocked');
assert(!isValidWallpaperUrl('https://example.com/photo.jpg\\'), 'Backslash not blocked');
console.log('[PASS] [Wallpaper-Sync-6] Strict URL validation blocks CSS breakout and non-HTTP schemes.');

// 7. Sanitization Hygiene
const cleanPhoto = sanitizeWallpaperPhoto({
  id: 'safe_id_123',
  title: 'Clean Title \n with break',
  author: 'Author \r Name',
  imageUrl: 'https://images.unsplash.com/clean.jpg',
  thumbnailUrl: 'https://images.unsplash.com/thumb.jpg',
  source: 'Nature',
  resolution: '3840x2160'
});
assert(cleanPhoto !== null, 'Sanitization failed for valid input');
assert(!cleanPhoto?.title.includes('\n'), 'Title line break was not normalized');
assert(!cleanPhoto?.author.includes('\r'), 'Author carriage return was not normalized');
assert(sanitizeWallpaperPhoto(null) === null, 'Null object should return null');
assert(sanitizeWallpaperPhoto({ imageUrl: 'invalid' }) === null, 'Invalid imageUrl should return null');
console.log('[PASS] [Wallpaper-Sync-7] Wallpaper photo metadata sanitization and normalization verified.');


